/**
 * Endpoint tests for the AI vision proxy: input bounds, key routing
 * (BYO keys must never fall back to server keys), per-client rate limit,
 * and the global server-key spend budget.
 *
 * Run: pnpm --filter @workspace/api-server test
 */

import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

// Environment must be set before the app (and its logger) is imported.
process.env.LOG_LEVEL = "silent";
process.env.GEMINI_API_KEY = "server-gemini-key-0001";
process.env.ANTHROPIC_API_KEY = "server-anthropic-key-0001";
process.env.VISION_RATE_PER_MIN = "1000";
process.env.VISION_GLOBAL_PER_MIN = "1000";
process.env.VISION_GLOBAL_PER_DAY = "100000";

const { default: app } = await import("../app");
const { __resetVisionRateState } = await import("./vision");

const server = createServer(app);
const realFetch = globalThis.fetch;

interface ProviderCall {
  url: string;
  headers: Record<string, string>;
}
let providerCalls: ProviderCall[] = [];
let providerResponder: (url: string) => Response = () =>
  new Response("boom", { status: 500 });

// Intercept outbound provider calls only; local test traffic passes through.
globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("127.0.0.1") || url.includes("localhost")) {
    return realFetch(input, init);
  }
  const headers: Record<string, string> = {};
  new Headers(init?.headers ?? {}).forEach((v, k) => {
    headers[k] = v;
  });
  providerCalls.push({ url, headers });
  return providerResponder(url);
}) as typeof fetch;

before(
  () =>
    new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    }),
);
after(() => {
  server.close();
  globalThis.fetch = realFetch;
});

beforeEach(() => {
  providerCalls = [];
  providerResponder = () => new Response("boom", { status: 500 });
  process.env.GEMINI_API_KEY = "server-gemini-key-0001";
  process.env.ANTHROPIC_API_KEY = "server-anthropic-key-0001";
  process.env.VISION_RATE_PER_MIN = "1000";
  process.env.VISION_GLOBAL_PER_MIN = "1000";
  process.env.VISION_GLOBAL_PER_DAY = "100000";
  __resetVisionRateState();
});

function base(): string {
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}/api`;
}

async function post(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return realFetch(`${base()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const geminiText = (text: string) =>
  new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

const inspectBody = (over: Record<string, unknown> = {}) => ({
  photos: ["dGVzdA=="],
  items: [
    { id: "wallet", name: "Wallet" },
    { id: "laptop", name: "Laptop" },
  ],
  ...over,
});

const suggestBody = (over: Record<string, unknown> = {}) => ({
  title: "meeting",
  candidates: [{ id: "wallet", name: "wallet" }],
  ...over,
});

test("rejects out-of-bounds payloads (too many photos)", async () => {
  const res = await post(
    "/vision/inspect",
    inspectBody({ photos: ["dGVzdA==", "dGVzdA==", "dGVzdA==", "dGVzdA=="] }),
  );
  assert.equal(res.status, 400);
  assert.equal(providerCalls.length, 0);
});

test("rejects malformed BYO keys", async () => {
  const res = await post(
    "/vision/suggest",
    suggestBody({ geminiKey: "bad key with spaces" }),
  );
  assert.equal(res.status, 400);
  assert.equal(providerCalls.length, 0);
});

test("answers 503 when no keys exist anywhere", async () => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const res = await post("/vision/inspect", inspectBody());
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: "no_api_keys" });
  assert.equal(providerCalls.length, 0);
});

test("uses server keys when the request carries none", async () => {
  providerResponder = () => geminiText('["wallet"]');
  const res = await post("/vision/inspect", inspectBody());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { missing: ["wallet"] });
  assert.equal(providerCalls.length, 1);
  assert.ok(providerCalls[0].url.includes("server-gemini-key-0001"));
});

test("BYO keys are used exclusively — never falls back to server keys", async () => {
  // Both providers fail; with user keys present the server keys must never
  // be tried, so the request ends 502 after exactly two provider attempts.
  const res = await post(
    "/vision/inspect",
    inspectBody({
      geminiKey: "user-gemini-key-0001",
      anthropicKey: "user-anthropic-key-0001",
    }),
  );
  assert.equal(res.status, 502);
  assert.equal(providerCalls.length, 2);
  const [gemini, claude] = providerCalls;
  assert.ok(gemini.url.includes("user-gemini-key-0001"));
  assert.equal(claude.headers["x-api-key"], "user-anthropic-key-0001");
  for (const call of providerCalls) {
    const dump = call.url + JSON.stringify(call.headers);
    assert.ok(!dump.includes("server-gemini-key-0001"));
    assert.ok(!dump.includes("server-anthropic-key-0001"));
  }
});

test("per-client limit answers 429 and is keyed by client, not shared", async () => {
  process.env.VISION_RATE_PER_MIN = "2";
  providerResponder = () => geminiText('{"ids":["wallet"],"extra":[]}');
  const h = { "x-forwarded-for": "203.0.113.9" };
  assert.equal((await post("/vision/suggest", suggestBody(), h)).status, 200);
  assert.equal((await post("/vision/suggest", suggestBody(), h)).status, 200);
  assert.equal((await post("/vision/suggest", suggestBody(), h)).status, 429);
  // A different client still gets through.
  const other = { "x-forwarded-for": "198.51.100.7" };
  assert.equal(
    (await post("/vision/suggest", suggestBody(), other)).status,
    200,
  );
});

test("global server-key budget caps spend across clients; BYO is exempt", async () => {
  process.env.VISION_GLOBAL_PER_MIN = "1";
  providerResponder = () => geminiText('{"ids":["wallet"],"extra":[]}');
  const first = await post("/vision/suggest", suggestBody(), {
    "x-forwarded-for": "203.0.113.1",
  });
  assert.equal(first.status, 200);
  // Different spoofed client — still blocked: the budget is global.
  const second = await post("/vision/suggest", suggestBody(), {
    "x-forwarded-for": "203.0.113.2",
  });
  assert.equal(second.status, 429);
  // BYO keys do not touch the server-key budget (they spend the user's own
  // keys) — provider fails => 502, but not 429.
  providerResponder = () => new Response("boom", { status: 500 });
  const byo = await post(
    "/vision/suggest",
    suggestBody({ geminiKey: "user-gemini-key-0001" }),
    { "x-forwarded-for": "203.0.113.3" },
  );
  assert.equal(byo.status, 502);
});
