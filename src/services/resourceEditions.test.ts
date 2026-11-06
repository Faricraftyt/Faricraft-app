import test from "node:test";
import assert from "node:assert/strict";
import { resource, validate, validateDraft } from "./schema";
import { isBook, resourceForLanguage } from "./resourceEditions";
import fs from "node:fs";
const base = () => resource.parse({ id: "book", title: "Mi libro", category: "otros", image: "", date: "2026-11-06", tags: [], format: "PDF", size: "2 MB", url: "https://example.com/es.pdf", published: true, order: 0 });
const data = () => Object.fromEntries(["resources", "categories", "bio", "settings", "videos"].map(key => [key, JSON.parse(fs.readFileSync(new URL("../../public/data/" + key + ".json", import.meta.url), "utf8"))]));
test("descriptions are optional and old resources remain compatible", () => {
  const original = base();
  assert.equal(original.description, "");
  assert.equal(resourceForLanguage(original, "pt").url, original.url);
});
test("editions switch title, description, file and online reader together", () => {
  const original = { ...base(), description: "Resumen", viewUrl: "https://fliphtml5.com/es", editions: { en: { title: "My book", description: "Summary", url: "https://example.com/en.pdf", viewUrl: "https://fliphtml5.com/en", size: "3 MB" } } };
  const english = resourceForLanguage(original, "en");
  assert.equal(english.title, "My book");
  assert.equal(english.description, "Summary");
  assert.equal(english.url, "https://example.com/en.pdf");
  assert.equal(english.viewUrl, "https://fliphtml5.com/en");
  assert.equal(english.size, "3 MB");
  assert.equal(resourceForLanguage(original, "pt").url, original.url);
});
test("translated files never inherit the wrong reader or size", () => {
  const original = { ...base(), viewUrl: "https://fliphtml5.com/es", editions: { pt: { url: "https://example.com/pt.pdf" } } };
  const translated = resourceForLanguage(original, "pt");
  assert.equal(translated.viewUrl, "");
  assert.equal(translated.size, "");
});
test("text-only translations share the main file and reader; empty description is allowed", () => {
  const original = { ...base(), description: "Resumen", viewUrl: "https://fliphtml5.com/es", editions: { en: { title: "My book", description: "" } } };
  assert.equal(resourceForLanguage(original, "en").url, original.url);
  assert.equal(resourceForLanguage(original, "en").viewUrl, original.viewUrl);
  assert.equal(resourceForLanguage(original, "en").description, "");
});
test("books use the category name, including the existing custom ID", () => {
  assert.equal(isBook("otros", [{ id: "otros", name: "Libros" }]), true);
  assert.equal(isBook("otros", [{ id: "otros", name: "Otros" }]), false);
  assert.equal(isBook("missing", []), false);
});
test("edition metadata survives validation, draft persistence and JSON publication", () => {
  const source = data();
  source.resources = [{ ...base(), editions: { pt: { description: "Resumo", url: "https://example.com/pt.pdf", viewUrl: "https://fliphtml5.com/pt" } } }];
  const validated = validate(source);
  const restored = validate(JSON.parse(JSON.stringify(validateDraft(validated))));
  assert.deepEqual(restored.resources[0].editions, validated.resources[0].editions);
  source.resources[0].editions.pt.viewUrl = "javascript:alert(1)";
  assert.throws(() => validate(source));
  source.resources[0].editions.pt.viewUrl = "https://fliphtml5.com/pt";
  source.resources[0].editions.pt.url = "javascript:alert(1)";
  assert.throws(() => validate(source));
});
test("pasted reader and edition URLs are trimmed and upgraded to HTTPS", () => {
  const saved = resource.parse({ ...base(), viewUrl: " http://fliphtml5.com/es ", editions: { en: { url: " https://example.com/en.pdf\n", viewUrl: " http://fliphtml5.com/en " } } });
  assert.equal(saved.viewUrl, "https://fliphtml5.com/es");
  assert.equal(resourceForLanguage(saved, "en").viewUrl, "https://fliphtml5.com/en");
  assert.equal(resourceForLanguage(saved, "en").url, "https://example.com/en.pdf");
  assert.throws(() => resource.parse({ ...base(), editions: { en: { viewUrl: "javascript:alert(1)" } } }));
});
