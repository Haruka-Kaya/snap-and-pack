/**
 * Persistent store, ported from flutter-app/lib/store.dart.
 *
 * Same keys and semantics as the Flutter SharedPreferences store:
 * - `mods_<presetId>`: user changes to a preset ({added: [], removed: []})
 * - `my_items`: personal item catalog (with optional reference photo)
 * - `sg_<eventKey>`: cached AI suggestion (item ids) per calendar event+day
 * - `lenient_ids`: items previously confirmed as false-missing
 *
 * Init loads everything into memory (like Store.init() in Dart); reads are
 * synchronous afterwards, writes update memory first then persist.
 */

import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { baseItemPool, type Item, type Preset } from './items';

interface AddedEntry {
  id: string;
  name: string;
  emoji: string;
}

interface Mods {
  added: AddedEntry[];
  removed: string[];
}

let cache = new Map<string, string>();
let ready = false;
let version = 0;
const listeners = new Set<() => void>();

function emit(): void {
  version++;
  listeners.forEach((l) => l());
}

function persist(key: string, value: string): void {
  cache.set(key, value);
  emit();
  AsyncStorage.setItem(key, value).catch(() => {});
}

function readJson<T>(key: string, fallback: T): T {
  const raw = cache.get(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function modsKey(presetId: string): string {
  return `mods_${presetId}`;
}

function getMods(presetId: string): Mods {
  const m = readJson<Partial<Mods>>(modsKey(presetId), {});
  return { added: m.added ?? [], removed: m.removed ?? [] };
}

function saveMods(presetId: string, mods: Mods): void {
  persist(modsKey(presetId), JSON.stringify(mods));
}

function saveMyItems(items: Item[]): void {
  persist(
    'my_items',
    JSON.stringify(
      items.map((e) => ({
        id: e.id,
        name: e.ja,
        emoji: e.emoji,
        ...(e.photo ? { photo: e.photo } : {}),
      })),
    ),
  );
}

function newCustomId(): string {
  return `c_${Date.now()}`;
}

export const Store = {
  async init(): Promise<void> {
    if (ready) return;
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length > 0) {
        const pairs = await AsyncStorage.multiGet(keys);
        cache = new Map(
          pairs.filter(([, v]) => v != null) as [string, string][],
        );
      }
    } catch {
      // Start with an empty store when storage is unavailable.
    }
    ready = true;
    emit();
  },

  isReady(): boolean {
    return ready;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getVersion(): number {
    return version;
  },

  /** デフォルト品 − 削除済み + ユーザー追加、の実効リスト。 */
  effectiveItems(preset: Preset): Item[] {
    const mods = getMods(preset.id);
    const removed = new Set(mods.removed);
    const items = preset.items.filter((e) => !removed.has(e.id));
    const photos = new Map(Store.myItems().map((m) => [m.id, m.photo]));
    for (const a of mods.added) {
      items.push({
        id: a.id,
        ja: a.name,
        en: a.name,
        emoji: a.emoji,
        photo: photos.get(a.id),
      });
    }
    return items;
  },

  // ---- マイアイテム(所持品カタログ、全予定共通) ----

  myItems(): Item[] {
    const raw = readJson<{ id: string; name: string; emoji: string; photo?: string }[]>(
      'my_items',
      [],
    );
    return raw.map((m) => ({
      id: m.id,
      ja: m.name,
      en: m.name,
      emoji: m.emoji,
      photo: m.photo,
    }));
  },

  /** 同名は重複登録しない(flutter parity)。 */
  addMyItem(name: string, emoji: string): Item {
    const items = Store.myItems();
    const existing = items.find((e) => e.ja === name);
    if (existing) return existing;
    const item: Item = { id: newCustomId(), ja: name, en: name, emoji };
    items.push(item);
    saveMyItems(items);
    return item;
  },

  removeMyItem(itemId: string): void {
    saveMyItems(Store.myItems().filter((e) => e.id !== itemId));
  },

  /** マイアイテムに実物の参照写真(データURI)を紐付ける */
  setMyItemPhoto(itemId: string, dataUri: string): void {
    const items = Store.myItems();
    const i = items.findIndex((e) => e.id === itemId);
    if (i < 0) return;
    items[i] = { ...items[i], photo: dataUri };
    saveMyItems(items);
  },

  // ---- プリセットへの変更 ----

  /** マイアイテムを予定のリストへ追加(既にあれば何もしない) */
  addItemToPreset(presetId: string, item: Item): void {
    const mods = getMods(presetId);
    if (mods.added.some((a) => a.id === item.id)) return;
    mods.added.push({ id: item.id, name: item.ja, emoji: item.emoji });
    // 過去に削除済みなら復活させる
    mods.removed = mods.removed.filter((id) => id !== item.id);
    saveMods(presetId, mods);
  },

  removeItem(presetId: string, itemId: string): void {
    const mods = getMods(presetId);
    const before = mods.added.length;
    mods.added = mods.added.filter((a) => a.id !== itemId);
    if (mods.added.length === before) {
      // デフォルト品 → removed リストへ
      if (!mods.removed.includes(itemId)) mods.removed.push(itemId);
    }
    saveMods(presetId, mods);
  },

  // ---- カレンダー予定への AI 提案キャッシュ ----

  /** 提案の全候補(マイアイテム + 基本プール。id 重複はマイアイテム優先) */
  suggestionCandidates(): Item[] {
    const mine = Store.myItems();
    const mineIds = new Set(mine.map((e) => e.id));
    return [...mine, ...baseItemPool.filter((e) => !mineIds.has(e.id))];
  },

  /** キャッシュ済み提案を Item 解決して返す(無ければ null) */
  cachedSuggestion(eventKey: string): Item[] | null {
    const ids = readJson<string[]>(`sg_${eventKey}`, []);
    if (ids.length === 0) return null;
    const byId = new Map(Store.suggestionCandidates().map((e) => [e.id, e]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((e): e is Item => e != null);
    return items.length === 0 ? null : items;
  },

  saveSuggestion(eventKey: string, ids: string[]): void {
    persist(`sg_${eventKey}`, JSON.stringify(ids));
  },

  // ---- 誤判定フィードバック(「実はあった」)----

  /** 「欠品と判定されたが実はあった」を記録 → 次回から甘め判定に使う */
  markFalseMissing(itemId: string): void {
    const ids = new Set(Store.lenientIds());
    ids.add(itemId);
    persist('lenient_ids', JSON.stringify([...ids]));
  },

  lenientIds(): string[] {
    return readJson<string[]>('lenient_ids', []);
  },
};

/**
 * Re-render subscription — returns a version number that bumps on every
 * store write so screens recompute derived lists.
 */
export function useStoreVersion(): number {
  return useSyncExternalStore(Store.subscribe, Store.getVersion, Store.getVersion);
}
