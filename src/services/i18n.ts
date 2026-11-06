import { useSyncExternalStore } from "react";
import { translations } from "./translations";

export type Language = "es" | "en" | "pt";
export function validLanguage(value: unknown): Language {
  return value === "en" || value === "pt" ? value : "es";
}
function readPreference(): Language {
  try { return validLanguage(localStorage.getItem("faricraft-language")); }
  catch { return "es"; }
}
let language: Language = typeof window === "undefined" ? "es" : readPreference();
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function setLanguage(next: Language) {
  language = validLanguage(next);
  if (typeof document !== "undefined") document.documentElement.lang = language;
  try { localStorage.setItem("faricraft-language", language); } catch { /* Still works without storage. */ }
  listeners.forEach(listener => listener());
}
if (typeof document !== "undefined") document.documentElement.lang = language;
if (typeof window !== "undefined") window.addEventListener("storage", event => {
  if (event.key === "faricraft-language") {
    language = validLanguage(event.newValue);
    document.documentElement.lang = language;
    listeners.forEach(listener => listener());
  }
});
export function useLanguage() {
  return useSyncExternalStore(subscribe, () => language, () => "es" as Language);
}
export function t(text: string): string {
  return language === "es" ? text : translations[text]?.[language] ?? text;
}
export function localeFor(value: Language) {
  return { es: "es-AR", en: "en-US", pt: "pt-BR" }[value];
}
