// Daily playtime limit helper (TypeScript port of js/playtime.js).
// Stores locally only { limit, used, day } under 'swa.playtime'.

const KEY = 'swa.playtime';
export const DEFAULT_LIMIT_MINUTES = 20;
export const DIM_FROM = 0.8;
export const MIN_OPACITY = 0.3;
const MAX_TICK = 2000;

export interface PlaytimeState {
  limit: number | null; // minutes, or null for unlimited
  used: number; // milliseconds used today
  day: string;
}

let storageOk = true;
let mem: PlaytimeState | null = null;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function loadPlaytime(): PlaytimeState {
  const s: PlaytimeState = {
    limit: DEFAULT_LIMIT_MINUTES,
    used: 0,
    day: todayKey(),
  };
  if (!storageOk && mem) {
    s.limit = mem.limit;
    if (mem.day === s.day) s.used = mem.used;
    return s;
  }
  try {
    const rawStr = window.localStorage.getItem(KEY);
    if (rawStr) {
      const raw = JSON.parse(rawStr) as Record<string, unknown>;
      if (raw && typeof raw === 'object') {
        if (
          raw.limit === null ||
          (typeof raw.limit === 'number' && raw.limit > 0 && Number.isFinite(raw.limit))
        ) {
          s.limit = raw.limit;
        }
        if (
          typeof raw.used === 'number' &&
          raw.used >= 0 &&
          Number.isFinite(raw.used) &&
          raw.day === s.day
        ) {
          s.used = raw.used;
        }
      }
    }
  } catch {
    /* storage unavailable or corrupt: defaults */
  }
  return s;
}

export function savePlaytime(state: PlaytimeState) {
  mem = { limit: state.limit, used: state.used, day: state.day };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

export function getLimitMs(state: PlaytimeState): number {
  return state.limit === null ? Infinity : state.limit * 60000;
}

export function isPlaytimeExpired(state = loadPlaytime()): boolean {
  return state.used >= getLimitMs(state);
}

export function getPlaytimeProgress(state = loadPlaytime()): number {
  return state.limit === null ? 0 : Math.min(1, state.used / getLimitMs(state));
}

export function getStageOpacity(progress: number, unlimited: boolean): number {
  if (unlimited || progress <= DIM_FROM) return 1;
  if (progress >= 1) return MIN_OPACITY;
  return 1 - (1 - MIN_OPACITY) * ((progress - DIM_FROM) / (1 - DIM_FROM));
}

export function tickPlaytime(dtMs: number): PlaytimeState {
  const clamped = Math.max(0, Math.min(MAX_TICK, dtMs));
  const state = loadPlaytime();
  if (document.visibilityState === 'visible' && state.limit !== null) {
    state.used += clamped;
    savePlaytime(state);
  }
  return state;
}

export function setPlaytimeLimit(minutes: number | null): boolean {
  if (
    minutes !== null &&
    !(typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0 && minutes <= 1440)
  ) {
    return false;
  }
  const state = loadPlaytime();
  state.limit = minutes;
  savePlaytime(state);
  return true;
}

export function resetPlaytimeUsed(): PlaytimeState {
  const state = loadPlaytime();
  state.used = 0;
  savePlaytime(state);
  return state;
}
