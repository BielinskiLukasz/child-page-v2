// Time-of-day mood for the page and activity scenes. Stored locally on the device only.

const KEY = 'artur.mood';

export type Mood = 'poranek' | 'dzien' | 'wieczor';

export const MOODS: readonly Mood[] = ['poranek', 'dzien', 'wieczor'];

export const MOOD_LABELS: Record<Mood, string> = {
  poranek: 'Poranek',
  dzien: 'Popołudnie',
  wieczor: 'Wieczór',
};

export function loadMood(): Mood {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === 'poranek' || raw === 'dzien' || raw === 'wieczor') return raw;
  } catch {
    /* storage unavailable */
  }
  return 'dzien';
}

export function saveMood(mood: Mood) {
  try {
    window.localStorage.setItem(KEY, mood);
  } catch {
    /* keep in memory only */
  }
}

export function applyMood(mood: Mood) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.mood = mood;
  }
}
