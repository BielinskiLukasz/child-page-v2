// Pure in-memory randomisation helper for activity variety (port of js/random.js).
// Stores nothing in localStorage; "last pick" memory lasts only for the current page session.

const lastPicked = new Map<string, unknown>();

/** Returns a new shuffled copy (Fisher-Yates); the input array is not mutated. */
export function shuffle<T>(list: readonly T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/** Returns `n` unique items from `list`; `n >= list.length` returns the whole pool shuffled. */
export function pick<T>(list: readonly T[], n: number): T[] {
  const count = Math.floor(n);
  if (!(count >= 0)) return [];
  const shuffled = shuffle(list);
  return count < shuffled.length ? shuffled.slice(0, count) : shuffled;
}

/**
 * Picks one item from `list`, never repeating the item returned last time for the same `key`
 * (when the pool has at least 2 distinct items).
 */
export function pickOne<T>(list: readonly T[], key = ''): T {
  if (list.length === 0) {
    throw new Error('pickOne called with an empty list');
  }
  let pool: readonly T[] = list;
  if (list.length > 1 && lastPicked.has(key)) {
    const prev = lastPicked.get(key);
    const filtered = list.filter((item) => item !== prev);
    if (filtered.length > 0) {
      pool = filtered;
    }
  }
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  lastPicked.set(key, chosen);
  return chosen;
}

export const Rand = {
  shuffle,
  pick,
  pickOne,
};
