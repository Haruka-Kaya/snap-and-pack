/**
 * AI vision proxy for the Snap & Pack mobile app.
 *
 * Faithful port of flutter-app/lib/api.dart (VisionApi): same prompts, same
 * provider order (Gemini primary → Claude fallback), same models, same
 * response parsing. Keys stay server-side (GEMINI_API_KEY / ANTHROPIC_API_KEY);
 * when none are configured the endpoints answer 503 and the app falls back to
 * its offline quick check.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import {
  VisionInspectBody,
  VisionInspectResponse,
  VisionStatusResponse,
  VisionSuggestBody,
  VisionSuggestResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
/** Flutter parity: Dio receiveTimeout 15s per provider. */
const PROVIDER_TIMEOUT_MS = 15_000;

// ---- Abuse controls -------------------------------------------------------
// These endpoints proxy paid AI providers with server-held keys, so requests
// are bounded well beyond what the app ever sends (app: ≤3 shots @1280px q60,
// refs @900px q55) and rate limited per client IP.
const MAX_PHOTOS = 3;
const MAX_ITEMS = 60;
const MAX_REFS = 12;
const MAX_LENIENT = 200;
const MAX_CANDIDATES = 80;
const MAX_PHOTO_B64_CHARS = 4 * 1024 * 1024; // ~3MB binary per belongings shot
const MAX_REF_B64_CHARS = 1_500_000; // ~1.1MB binary per reference photo
const MAX_TEXT_LEN = 200;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function isValidB64(s: string, maxChars: number): boolean {
  return s.length > 0 && s.length <= maxChars && BASE64_RE.test(s);
}

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 20; // per IP per minute across both vision POSTs
const rateHits = new Map<string, { count: number; windowStart: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, h] of rateHits) {
    if (now - h.windowStart > RATE_WINDOW_MS * 2) rateHits.delete(ip);
  }
}, 5 * 60_000).unref();

/** Returns true (and answers 429) when the client is over the limit. */
function rateLimit(req: Request, res: Response): boolean {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const h = rateHits.get(ip);
  if (!h || now - h.windowStart >= RATE_WINDOW_MS) {
    rateHits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  h.count++;
  if (h.count > RATE_MAX_REQUESTS) {
    res.status(429).json({ error: "rate_limited" });
    return true;
  }
  return false;
}

const geminiKey = () => process.env.GEMINI_API_KEY ?? "";
const claudeKey = () => process.env.ANTHROPIC_API_KEY ?? "";

interface RefPhoto {
  id: string;
  data: string;
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`provider status ${res.status}`);
  }
  return res.json();
}

/** コードフェンスや前置きが混ざっても配列部分だけ拾う (api.dart _parse) */
function parseIdArray(text: string, ids: Set<string>): string[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  const decoded = JSON.parse(text.slice(start, end + 1)) as unknown[];
  return decoded.map((e) => String(e)).filter((e) => ids.has(e));
}

async function geminiGenerate(parts: unknown[]): Promise<string> {
  const data = await postJson(`${GEMINI_URL}?key=${encodeURIComponent(geminiKey())}`, {}, {
    contents: [{ parts }],
    generationConfig: { response_mime_type: "application/json" },
  });
  return data.candidates[0].content.parts[0].text as string;
}

async function claudeMessages(content: unknown, maxTokens: number): Promise<string> {
  const data = await postJson(
    CLAUDE_URL,
    { "x-api-key": claudeKey(), "anthropic-version": "2023-06-01" },
    {
      model: "claude-sonnet-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
    },
  );
  return data.content[0].text as string;
}

/** api.dart _gemini のパーツ構成 (prompt → refs → 区切り → belongings) */
function geminiParts(prompt: string, refs: RefPhoto[], photos: string[]): unknown[] {
  const parts: unknown[] = [{ text: prompt }];
  for (const r of refs) {
    parts.push({ text: `Reference photo of item id="${r.id}":` });
    parts.push({ inline_data: { mime_type: "image/jpeg", data: r.data } });
  }
  if (refs.length > 0) {
    parts.push({ text: "Now the belongings photos to inspect:" });
  }
  for (const b64 of photos) {
    parts.push({ inline_data: { mime_type: "image/jpeg", data: b64 } });
  }
  return parts;
}

/** api.dart _claude のコンテンツ構成 */
function claudeContent(prompt: string, refs: RefPhoto[], photos: string[]): unknown[] {
  const content: unknown[] = [{ type: "text", text: prompt }];
  for (const r of refs) {
    content.push({ type: "text", text: `Reference photo of item id="${r.id}":` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: r.data },
    });
  }
  if (refs.length > 0) {
    content.push({ type: "text", text: "Now the belongings photos to inspect:" });
  }
  for (const b64 of photos) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: b64 },
    });
  }
  return content;
}

router.get("/vision/status", (_req, res) => {
  const data = VisionStatusResponse.parse({
    hasKeys: geminiKey().length > 0 || claudeKey().length > 0,
  });
  res.json(data);
});

router.post("/vision/inspect", async (req, res) => {
  if (rateLimit(req, res)) return;
  const parsed = VisionInspectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  const { photos, items } = parsed.data;
  const allRefs: RefPhoto[] = parsed.data.refs ?? [];
  const lenientAll: string[] = parsed.data.lenient ?? [];

  if (
    photos.length > MAX_PHOTOS ||
    items.length > MAX_ITEMS ||
    allRefs.length > MAX_REFS ||
    lenientAll.length > MAX_LENIENT ||
    !photos.every((p) => isValidB64(p, MAX_PHOTO_B64_CHARS)) ||
    !allRefs.every((r) => isValidB64(r.data, MAX_REF_B64_CHARS)) ||
    !items.every((e) => e.id.length <= MAX_TEXT_LEN && e.name.length <= MAX_TEXT_LEN) ||
    !lenientAll.every((id) => id.length <= MAX_TEXT_LEN)
  ) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  if (geminiKey().length === 0 && claudeKey().length === 0) {
    res.status(503).json({ error: "no_api_keys" });
    return;
  }

  // Only reference photos of checklist items make sense (Flutter parity:
  // refs are derived from the checklist), and lenient ids outside the
  // checklist are inert — drop both.
  const itemIds = new Set(items.map((e) => e.id));
  const refs = allRefs.filter((r) => itemIds.has(r.id));
  const lenient = lenientAll.filter((id) => itemIds.has(id));

  // ---- api.dart findMissing のプロンプトをそのまま移植 ----
  const list = JSON.stringify(items.map((e) => ({ id: e.id, name: e.name })));
  const lenientNote =
    lenient.length === 0
      ? ""
      : "IMPORTANT: The user has confirmed they were actually carrying these " +
        "items when previously judged missing: " +
        `${JSON.stringify(lenient)}. Give these items strong benefit ` +
        "of the doubt — if anything could plausibly be them, count them as " +
        "present. ";
  const refNote =
    refs.length === 0
      ? ""
      : `First you will see ${refs.length} REFERENCE photo(s) of the user's ` +
        "own specific items (labeled by id). Use them to recognize those " +
        "exact items in the belongings photos. ";
  const prompt =
    `Here is a packing checklist as JSON: ${list}. ${refNote}` +
    `You are given ${photos.length} photo(s) of the same belongings from ` +
    `different angles (the LAST ${photos.length} image(s)). ` +
    "An item counts as PRESENT if it is visible in AT LEAST ONE belongings " +
    "photo, even partially hidden behind other objects. Be lenient: if " +
    "something similar to the item is visible, count it as present. " +
    `${lenientNote}` +
    "Return ONLY a JSON array containing the ids of checklist items that are " +
    "NOT visible in ANY of the belongings photos. If all items are present, " +
    "return []. No explanation, no markdown, JSON array only.";
  const ids = new Set(items.map((e) => e.id));

  if (geminiKey().length > 0) {
    try {
      const text = await geminiGenerate(geminiParts(prompt, refs, photos));
      res.json(VisionInspectResponse.parse({ missing: parseIdArray(text, ids) }));
      return;
    } catch (err) {
      req.log.warn({ err }, "gemini inspect failed");
    }
  }
  if (claudeKey().length > 0) {
    try {
      const text = await claudeMessages(claudeContent(prompt, refs, photos), 300);
      res.json(VisionInspectResponse.parse({ missing: parseIdArray(text, ids) }));
      return;
    } catch (err) {
      req.log.warn({ err }, "claude inspect failed");
    }
  }
  res.status(502).json({ error: "providers_failed" });
});

router.post("/vision/suggest", async (req, res) => {
  if (rateLimit(req, res)) return;
  const parsed = VisionSuggestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  const { title, time, location, candidates } = parsed.data;

  if (
    title.length > MAX_TEXT_LEN ||
    (time?.length ?? 0) > MAX_TEXT_LEN ||
    (location?.length ?? 0) > MAX_TEXT_LEN ||
    candidates.length > MAX_CANDIDATES ||
    !candidates.every(
      (e) => e.id.length <= MAX_TEXT_LEN && e.name.length <= MAX_TEXT_LEN,
    )
  ) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  if (geminiKey().length === 0 && claudeKey().length === 0) {
    res.status(503).json({ error: "no_api_keys" });
    return;
  }

  // ---- api.dart suggestItems のプロンプトをそのまま移植 ----
  const list = JSON.stringify(candidates.map((e) => ({ id: e.id, name: e.name })));
  const prompt =
    `You are a packing assistant. Today's calendar event: "${title}"` +
    `${time != null ? ` at ${time}` : ""}` +
    `${location != null && location.length > 0 ? ` (location: ${location})` : ""}. ` +
    `Here are the user's available items as JSON: ${list}. ` +
    "Pick the item ids genuinely needed for this event (typically 3-7). " +
    "Additionally you may suggest up to 3 common items NOT in the list, " +
    'each as {"name": <short name in Japanese>, "emoji": <one emoji>}. ' +
    'Return ONLY JSON: {"ids": [...], "extra": [...]}. No explanation.';
  const ids = new Set(candidates.map((e) => e.id));

  const parseSuggest = (text: string) => {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const m = JSON.parse(text.slice(start, end + 1)) as {
      ids?: unknown[];
      extra?: unknown[];
    };
    const picked = (m.ids ?? [])
      .map((e) => String(e))
      .filter((e) => ids.has(e));
    const extra: { name: string; emoji: string }[] = [];
    for (const x of (m.extra ?? []).slice(0, 3)) {
      const xm = x as Record<string, unknown>;
      const name = String(xm.name ?? "").trim();
      if (name.length > 0) {
        extra.push({ name, emoji: String(xm.emoji ?? "🎒") });
      }
    }
    return { ids: picked, extra };
  };

  if (geminiKey().length > 0) {
    try {
      const text = await geminiGenerate([{ text: prompt }]);
      res.json(VisionSuggestResponse.parse(parseSuggest(text)));
      return;
    } catch (err) {
      req.log.warn({ err }, "gemini suggest failed");
    }
  }
  if (claudeKey().length > 0) {
    try {
      const text = await claudeMessages(prompt, 500);
      res.json(VisionSuggestResponse.parse(parseSuggest(text)));
      return;
    } catch (err) {
      req.log.warn({ err }, "claude suggest failed");
    }
  }
  res.status(502).json({ error: "providers_failed" });
});

export default router;
