// Parent menu configuration & settings backup (TypeScript port of js/menu-config.js & js/settings-io.js).

import { ACTIVITIES, type Activity } from '../data/activities';
import { loadPlaytime, setPlaytimeLimit } from './playtime';

const MENU_KEY = 'swa.menu';
const LEGACY_FAV_KEY = 'artur.favourites';
const DEFAULT_OFF = new Set(['wiatraczki', 'pizza']);

export interface MenuEntry {
  id: string;
  on: boolean;
  fav: boolean;
}

export function defaultMenuEntries(includeAllOn = true): MenuEntry[] {
  let legacyFavs = new Set<string>();
  try {
    const raw = window.localStorage.getItem(LEGACY_FAV_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        legacyFavs = new Set(parsed.filter((x): x is string => typeof x === 'string'));
      }
    }
  } catch {
    /* ignore */
  }

  return ACTIVITIES.map((a) => ({
    id: a.id,
    on: includeAllOn ? true : !DEFAULT_OFF.has(a.id),
    fav: legacyFavs.has(a.id),
  }));
}

export function normalizeMenuEntries(rawList: unknown): MenuEntry[] {
  const known = new Map<string, Activity>();
  for (const a of ACTIVITIES) known.set(a.id, a);

  const seen = new Set<string>();
  const out: MenuEntry[] = [];

  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const id = typeof obj.id === 'string' ? obj.id : '';
      if (!id || !known.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        on: typeof obj.on === 'boolean' ? obj.on : true,
        fav: typeof obj.fav === 'boolean' ? obj.fav : false,
      });
    }
  }

  for (const a of ACTIVITIES) {
    if (!seen.has(a.id)) {
      out.push({ id: a.id, on: true, fav: false });
    }
  }

  if (!out.some((e) => e.on) && out.length > 0) {
    out[0].on = true;
  }

  return out;
}

export function loadMenuConfig(): MenuEntry[] {
  try {
    const raw = window.localStorage.getItem(MENU_KEY);
    if (!raw) return defaultMenuEntries(true);
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return normalizeMenuEntries(parsed);
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)) {
      return normalizeMenuEntries((parsed as { items: unknown }).items);
    }
  } catch {
    /* fallback to defaults */
  }
  return defaultMenuEntries(true);
}

export function saveMenuConfig(entries: MenuEntry[]) {
  const normalized = normalizeMenuEntries(entries);
  try {
    window.localStorage.setItem(MENU_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore storage errors */
  }
}

export interface SettingsBackupPayload {
  format: 'swa-settings';
  version: 1;
  limit: number | null;
  activities: MenuEntry[];
}

export function exportSettingsBackup(entries: MenuEntry[]): string {
  const payload: SettingsBackupPayload = {
    format: 'swa-settings',
    version: 1,
    limit: loadPlaytime().limit,
    activities: normalizeMenuEntries(entries),
  };
  return JSON.stringify(payload, null, 2);
}

export function parseSettingsBackup(
  text: string,
): { ok: true; entries: MenuEntry[]; limit: number | null } | { ok: false; error: string } {
  if (!text || text.length > 100_000) {
    return { ok: false, error: 'Plik ustawień jest pusty lub za duży (maks. 100 KB).' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'To nie jest poprawny plik JSON.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Nieprawidłowy format ustawień.' };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.format !== 'swa-settings') {
    return { ok: false, error: 'Nieznany format kopii ustawień.' };
  }
  if (!Array.isArray(obj.activities)) {
    return { ok: false, error: 'Brak listy zabaw w kopii ustawień.' };
  }

  const rawActs = obj.activities as unknown[];
  const anyEnabled = rawActs.some(
    (x) => x && typeof x === 'object' && (x as Record<string, unknown>).on !== false,
  );
  if (rawActs.length > 0 && !anyEnabled) {
    return { ok: false, error: 'Co najmniej jedna zabawa musi pozostać włączona.' };
  }

  let limit: number | null = loadPlaytime().limit;
  if (obj.limit === null) {
    limit = null;
  } else if (
    typeof obj.limit === 'number' &&
    Number.isFinite(obj.limit) &&
    obj.limit > 0 &&
    obj.limit <= 1440
  ) {
    limit = obj.limit;
  }

  const entries = normalizeMenuEntries(rawActs);
  return { ok: true, entries, limit };
}

export function applySettingsBackup(entries: MenuEntry[], limit: number | null) {
  saveMenuConfig(entries);
  setPlaytimeLimit(limit);
}
