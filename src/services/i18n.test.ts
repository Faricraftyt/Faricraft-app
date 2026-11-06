import test from "node:test";
import assert from "node:assert/strict";
import { setLanguage, t, validLanguage, localeFor } from "./i18n";
import { translations } from "./translations";
test("Spanish is the default and unsupported preferences fall back to it", () => {
  assert.equal(validLanguage("fr"), "es");
  setLanguage("es");
  assert.equal(t("Descargas"), "Descargas");
});
test("language switching translates UI and keeps authored titles intact", () => {
  setLanguage("en");
  assert.equal(t("Descargas"), "Downloads");
  assert.equal(t("Fuga del Sector 42"), "Fuga del Sector 42");
  setLanguage("pt");
  assert.equal(t("Videos"), "Vídeos");
  assert.equal(localeFor("pt"), "pt-BR");
  setLanguage("es");
});
test("every catalog entry contains both translations", () => {
  for (const [source, translation] of Object.entries(translations)) {
    assert.ok(translation.en.trim(), source);
    assert.ok(translation.pt.trim(), source);
  }
});
