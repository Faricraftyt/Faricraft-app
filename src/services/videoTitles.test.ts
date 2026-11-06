import test from "node:test";
import assert from "node:assert/strict";
import { videoTitle } from "./videoTitles";
test("video titles follow the selected language", () => {
  const video = { title: "Original", titles: { es: "Español", en: "English", pt: "Português" } };
  assert.equal(videoTitle(video, "es"), "Español");
  assert.equal(videoTitle(video, "en"), "English");
  assert.equal(videoTitle(video, "pt"), "Português");
});
test("missing translations and older catalogs fall back to Spanish", () => {
  assert.equal(videoTitle({ title: "Original", titles: { es: "Español", pt: " " } }, "pt"), "Español");
  assert.equal(videoTitle({ title: "Original" }, "en"), "Original");
});
