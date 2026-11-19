// Accent- and case-insensitive matching shared by every search box in the app.
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Every word of the query must appear somewhere in the haystack. */
export function matches(query: string, ...fields: string[]): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = normalize(fields.join(" "));
  return words.every((w) => hay.includes(w));
}

/** Livestreams are titled "Directo 🔴 …" / "Live 🔴 …" by the feed. */
export function isLivestream(title: string): boolean {
  return /🔴|\bdirecto\b|\blive(stream)?\b|\bao vivo\b/i.test(title);
}
