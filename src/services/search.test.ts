import test from "node:test";
import assert from "node:assert/strict";
import { isLivestream, matches, normalize } from "./search";
import { _test, isNew } from "./newness";

test("normalize ignores accents and case", () => {
  assert.equal(normalize("  Creé mi APP "), "cree mi app");
});

test("matches requires every word, in any field", () => {
  assert.ok(matches("sector fuga", "Fuga del Sector 42", ""));
  assert.ok(matches("libro", "Fuga", "pdf libro"));
  assert.ok(!matches("sector minecraft", "Fuga del Sector 42"));
  assert.ok(matches("", "anything"));
});

test("isLivestream detects stream titles in every language", () => {
  assert.ok(isLivestream("Directo 🔴-- MINECRAFT DUNGEONS II #4"));
  assert.ok(isLivestream("Live -- MINECRAFT"));
  assert.ok(isLivestream("Ao vivo -- Minecraft"));
  assert.ok(!isLivestream("Creé mi propia APP..."));
});

test("isNew compares against the previous visit and never flags first visits", () => {
  assert.equal(isNew("2026-11-15T00:00:00Z", 0), false);
  assert.equal(isNew("2026-11-15T00:00:00Z", Date.parse("2026-11-10")), true);
  assert.equal(isNew("2026-11-05", Date.parse("2026-11-10")), false);
});

test("previous visit survives reloads within the same visit", () => {
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  assert.equal(_test.readPrevious(storage, 1_000_000_000), 0);
  const later = 1_000_000_000 + 2 * 60 * 60 * 1000;
  assert.equal(_test.readPrevious(storage, later), 1_000_000_000);
  assert.equal(_test.readPrevious(storage, later + 60_000), 1_000_000_000);
});
