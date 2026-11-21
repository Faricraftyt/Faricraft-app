// Marks videos and downloads published since the visitor's previous visit.
const key = "faricraft-last-visit";
const gapMs = 30 * 60 * 1000; // A new "visit" starts after 30 minutes away.

function readPrevious(storage: Pick<Storage, "getItem" | "setItem"> | undefined, now: number): number {
  if (!storage) return 0;
  try {
    const raw = JSON.parse(storage.getItem(key) || "null") as { previous?: number; last?: number } | null;
    const last = raw?.last ?? 0;
    // Within the same visit keep the old baseline so badges don't vanish on reload.
    const previous = last && now - last < gapMs ? raw?.previous ?? 0 : last;
    storage.setItem(key, JSON.stringify({ previous, last: now }));
    return previous;
  } catch {
    return 0;
  }
}

let storage: Storage | undefined;
try { storage = typeof window === "undefined" ? undefined : window.localStorage; } catch { storage = undefined; }
const previousVisit = readPrevious(storage, Date.now());

/** True when the item is newer than the previous visit (never on a first visit). */
export function isNew(date: string, previous = previousVisit): boolean {
  if (!previous || !date) return false;
  const time = Date.parse(date);
  return Number.isFinite(time) && time > previous;
}

export const _test = { readPrevious };
