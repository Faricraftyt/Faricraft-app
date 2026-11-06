import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { keys, validate } from "./schema";
const original = () =>
  Object.fromEntries(
    keys.map((k) => [
      k,
      JSON.parse(
        fs.readFileSync(
          new URL("../../public/data/" + k + ".json", import.meta.url),
          "utf8",
        ),
      ),
    ]),
  );
test("published content passes validation", () => {
  const content = original();
  assert.equal(validate(content).resources.length, content.resources.length);
});
test("rejects corrupt types and dangerous links", () => {
  const d = original();
  d.settings.channelUrl = "javascript:alert(1)";
  assert.throws(() => validate(d));
  d.settings.channelUrl = "https://youtube.com";
  d.resources = "broken";
  assert.throws(() => validate(d));
});
test("published resource requires link and known category", () => {
  const d = original();
  d.resources = [
    {
      id: "test",
      title: "Test",
      description: "",
      category: "wallpapers",
      image: "",
      date: "2026-11-05",
      tags: [],
      format: "PNG",
      size: "1 MB",
      url: "",
      published: true,
      order: 0,
    },
  ];
  assert.throws(() => validate(d));
  d.resources[0].url = "https://example.com/test.png";
  assert.equal(validate(d).resources.length, 1);
  d.resources[0].category = "missing";
  assert.throws(() => validate(d));
});
test("rejects duplicate IDs, data URIs and traversal", () => {
  const d = original();
  d.categories.push({ ...d.categories[0] });
  assert.throws(() => validate(d));
  d.categories.pop();
  d.bio.avatar = "data:image/png;base64,abc";
  assert.throws(() => validate(d));
  d.bio.avatar = "../private";
  assert.throws(() => validate(d));
});

test("unfinished drafts survive but cannot be exported", async () => {
  const { validateDraft } = await import("./schema");
  const d = original();
  d.bio.links = [{ label: "Canal", url: "" }];
  assert.equal(validateDraft(d).bio.links.length, 1);
  assert.throws(() => validate(d));
});
test("JSON round trip preserves content", () => {
  const d = validate(original());
  assert.deepEqual(validate(JSON.parse(JSON.stringify(d))), d);
});
