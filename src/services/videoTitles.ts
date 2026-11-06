import type { Language } from "./i18n";
export function videoTitle(video: { title: string; titles?: Partial<Record<Language, string>> }, language: Language): string {
  return video.titles?.[language]?.trim() || video.titles?.es?.trim() || video.title;
}
