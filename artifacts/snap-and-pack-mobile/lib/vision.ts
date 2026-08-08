/**
 * AI vision client — mirrors the call sites of flutter-app/lib/api.dart.
 *
 * The prompt building, Gemini-primary/Claude-fallback order, and JSON
 * parsing live server-side (artifacts/api-server routes /api/vision/*) so
 * API keys never ship in the client bundle. Both findMissing and
 * suggestItems return null when the server or every provider fails —
 * callers fall back exactly like the Flutter app.
 */

import { visionInspect, visionSuggest } from '@workspace/api-client-react';

import type { Item } from './items';
import { dataUriToBase64 } from './photos';
import { Store } from './store';

/**
 * 端末に保存された自分のキー(配布版で各自入力)。設定されているときは
 * サーバー側のキーの代わりに、このキーだけが使われる。
 */
function ownKeys(): { geminiKey?: string; anthropicKey?: string } {
  const geminiKey = Store.userGeminiKey();
  const anthropicKey = Store.userAnthropicKey();
  return {
    ...(geminiKey ? { geminiKey } : {}),
    ...(anthropicKey ? { anthropicKey } : {}),
  };
}

/**
 * 写真(1〜複数枚)のどれにも写っていない持ち物の id リストを返す。
 * 失敗時は null(呼び出し側がローカル簡易判定にフォールバック)。
 */
export async function findMissing(
  photosB64: string[],
  items: Item[],
  lenient: string[],
): Promise<string[] | null> {
  try {
    const refs = items
      .filter((e): e is Item & { photo: string } => !!e.photo)
      .map((e) => ({ id: e.id, data: dataUriToBase64(e.photo) }));
    const res = await visionInspect({
      photos: photosB64,
      items: items.map((e) => ({ id: e.id, name: e.en })),
      refs,
      lenient,
      ...ownKeys(),
    });
    return res.missing;
  } catch {
    return null;
  }
}

export interface SuggestResult {
  ids: string[];
  extra: { name: string; emoji: string }[];
}

/**
 * 予定の内容から必要な持ち物を AI が算出する。
 * 失敗時は null(呼び出し側でフォールバック)。
 */
export async function suggestItems(params: {
  title: string;
  time?: string | null;
  location?: string | null;
  candidates: Item[];
}): Promise<SuggestResult | null> {
  try {
    const res = await visionSuggest({
      title: params.title,
      ...(params.time ? { time: params.time } : {}),
      ...(params.location ? { location: params.location } : {}),
      candidates: params.candidates.map((e) => ({ id: e.id, name: e.ja })),
      ...ownKeys(),
    });
    return { ids: res.ids, extra: res.extra };
  } catch {
    return null;
  }
}
