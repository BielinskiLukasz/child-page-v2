import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NATIVE_COUNT } from './activities';
import { AllIcon, CATEGORY_ICONS, MascotIcon, StarIcon } from './components/ArtIcons';
import MoodSwitcher from './components/MoodSwitcher';
import ActivityCard from './components/ActivityCard';
import ParentDialog from './components/ParentDialog';
import ParentSettingsModal from './components/ParentSettingsModal';
import Player from './components/Player';
import { ARTWORK, CATEGORY_ARTWORK, FEATURED_ARTWORK } from './data/artwork';
import {
  ACTIVITIES,
  CATEGORIES,
  type Activity,
  type CategoryId,
} from './data/activities';
import {
  applyMood,
  loadMood,
  saveMood,
  MOOD_LABELS,
  type Mood,
} from './utils/theme';
import {
  loadMenuConfig,
  saveMenuConfig,
  type MenuEntry,
} from './utils/menuConfig';

function plural(count: number, one: string, few: string, many: string) {
  if (count === 1) return one;
  const rest = count % 100;
  const last = count % 10;
  if (last >= 2 && last <= 4 && !(rest >= 12 && rest <= 14)) return few;
  return many;
}

export default function App() {
  const [menuEntries, setMenuEntries] = useState<MenuEntry[]>(loadMenuConfig);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId>('wszystkie');
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [parentsOpen, setParentsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mood, setMood] = useState<Mood>(loadMood);

  useEffect(() => {
    applyMood(mood);
  }, [mood]);

  const handleMoodChange = useCallback((next: Mood) => {
    setMood(next);
    saveMood(next);
  }, []);
  const searchRef = useRef<HTMLInputElement>(null);
  const pushedHashRef = useRef(false);

  const activityById = useMemo(
    () => new Map(ACTIVITIES.map((activity) => [activity.id, activity])),
    [],
  );

  const handleMenuChange = useCallback((next: MenuEntry[]) => {
    setMenuEntries(next);
    saveMenuConfig(next);
  }, []);

  const enabledActivities = useMemo(() => {
    const out: Activity[] = [];
    for (const entry of menuEntries) {
      if (!entry.on) continue;
      const act = activityById.get(entry.id);
      if (act) out.push(act);
    }
    return out;
  }, [activityById, menuEntries]);

  const favouriteSet = useMemo(() => {
    const set = new Set<string>();
    for (const entry of menuEntries) {
      if (entry.fav && entry.on) set.add(entry.id);
    }
    return set;
  }, [menuEntries]);

  // Sync URL #hash with open activity so browser Back works naturally
  useEffect(() => {
    const syncFromHash = () => {
      const id = window.location.hash.replace(/^#\/?/, '');
      if (!id) {
        setActiveActivityId(null);
        pushedHashRef.current = false;
        return;
      }
      const entry = menuEntries.find((e) => e.id === id && e.on);
      if (entry && activityById.has(id)) {
        setActiveActivityId(id);
      } else {
        setActiveActivityId(null);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [activityById, menuEntries]);

  const openActivity = useCallback((activity: Activity) => {
    setActiveActivityId(activity.id);
    if (window.location.hash !== `#${activity.id}`) {
      pushedHashRef.current = true;
      window.location.hash = activity.id;
    }
  }, []);

  const closeActivity = useCallback(() => {
    setActiveActivityId(null);
    if (window.location.hash) {
      if (pushedHashRef.current) {
        pushedHashRef.current = false;
        window.history.back();
      } else {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search,
        );
      }
    }
  }, []);

  const toggleFavourite = useCallback(
    (id: string) => {
      handleMenuChange(
        menuEntries.map((entry) =>
          entry.id === id ? { ...entry, fav: !entry.fav } : entry,
        ),
      );
    },
    [handleMenuChange, menuEntries],
  );

  const counts = useMemo(() => {
    const map = new Map<CategoryId, number>();
    map.set('wszystkie', enabledActivities.length);
    for (const entry of CATEGORIES) {
      if (entry.id === 'wszystkie') continue;
      map.set(
        entry.id,
        enabledActivities.filter((activity) => activity.category === entry.id).length,
      );
    }
    return map;
  }, [enabledActivities]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pl');
    return enabledActivities.filter((activity) => {
      if (category !== 'wszystkie' && activity.category !== category) return false;
      if (favouritesOnly && !favouriteSet.has(activity.id)) return false;
      if (!needle) return true;
      return `${activity.name} ${activity.description}`.toLocaleLowerCase('pl').includes(needle);
    });
  }, [category, enabledActivities, favouriteSet, favouritesOnly, query]);

  const featuredActivities = useMemo(
    () =>
      ['akwarium', 'rakieta', 'pizza']
        .map((id) => enabledActivities.find((a) => a.id === id))
        .filter((a): a is Activity => Boolean(a)),
    [enabledActivities],
  );

  const scrollToLibrary = () => {
    document.getElementById('zabawy')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const playRandom = (pool: Activity[] = filtered.length ? filtered : enabledActivities) => {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) openActivity(pick);
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('wszystkie');
    setFavouritesOnly(false);
  };

  const filtersActive = query.trim() !== '' || category !== 'wszystkie' || favouritesOnly;
  const activeActivity = activeActivityId ? activityById.get(activeActivityId) ?? null : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--page-bg)] text-[#40394f] transition-colors duration-500">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="site-header sticky top-0 z-40 border-b border-[#efe6dc]/80 bg-[var(--header-bg)] backdrop-blur-lg transition-colors duration-500">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex cursor-pointer items-center gap-2.5 rounded-full text-left"
            aria-label="Spokojny Świat Artura — początek strony"
          >
            <span className="grid h-10 w-10 place-items-center rounded-[0.9rem] bg-gradient-to-br from-violet-300 via-fuchsia-200 to-amber-200 shadow-md shadow-violet-200/70 ring-2 ring-white/70">
              <MascotIcon className="h-8 w-8" />
            </span>
            <span className="leading-tight">
              <span className="font-display block text-[15px] font-semibold text-[#453a5e] sm:text-base">
                <span className="sm:hidden">Świat Artura</span>
                <span className="hidden sm:inline">Spokojny Świat Artura</span>
              </span>
              <span className="hidden text-[10px] font-bold tracking-[0.16em] text-[#a99fbb] uppercase sm:block">
                {NATIVE_COUNT} natywnych zabaw
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Nawigacja główna">
            <button
              type="button"
              onClick={scrollToLibrary}
              className="cursor-pointer rounded-full px-4 py-2 text-sm font-bold text-[#7a6d91] transition hover:bg-white hover:text-[#5a4a80]"
            >
              Wszystkie zabawy
            </button>
            <button
              type="button"
              onClick={() => setParentsOpen(true)}
              className="cursor-pointer rounded-full px-4 py-2 text-sm font-bold text-[#7a6d91] transition hover:bg-white hover:text-[#5a4a80]"
            >
              Dla rodziców
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="cursor-pointer rounded-full px-4 py-2 text-sm font-bold text-[#7a6d91] transition hover:bg-white hover:text-[#5a4a80]"
            >
              Ustawienia
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Ustawienia dla rodzica"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-[#eae1f3] bg-white/80 text-[#8b7da6] transition hover:border-violet-200 hover:text-violet-600"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.11A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.54 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.11A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.54a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.11A1.7 1.7 0 0 0 15.1 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.46 9c.16.62.7 1.04 1.34 1.04H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1.03z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => playRandom()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-violet-200/60 transition hover:from-violet-600 hover:to-fuchsia-600 active:scale-95 sm:px-5"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
                <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
                <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" />
                <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" />
              </svg>
              <span className="hidden sm:inline">Losowa zabawa</span>
              <span className="sm:hidden">Losuj</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="paper-grain relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="hero-blob-1 animate-drift absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl" />
          <div className="hero-blob-2 animate-drift absolute top-10 right-[-6rem] h-96 w-96 rounded-full blur-3xl [animation-delay:2s]" />
          <div className="hero-blob-3 absolute bottom-[-4rem] left-1/3 h-64 w-64 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-[1240px] items-center gap-8 px-4 pt-10 pb-10 sm:px-6 sm:pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:px-8 lg:pt-16 lg:pb-16">
          <div className="max-w-[620px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#eadff5] bg-white/70 px-3.5 py-1.5 text-[11px] font-extrabold tracking-[0.13em] text-[#8b78aa] uppercase shadow-sm backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b99ae8]" aria-hidden="true" />
              Ciche zabawy dla dzieci 2–5 lat
            </span>

            <h1 className="font-display mt-5 text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.01em] text-[#423756] sm:text-6xl lg:text-[4.1rem]">
              Mały świat
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-400 bg-clip-text text-transparent">
                wielkich odkryć.
              </span>
            </h1>

            <p className="mt-5 max-w-[520px] text-[15px] leading-relaxed text-[#7f7492] sm:text-[16.5px]">
              Delikatne, dotykowe zabawy dla Artura — bez dźwięku, reklam i pośpiechu.
              Wszystkie {NATIVE_COUNT} zabaw działają bezpośrednio jako natywne komponenty React.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={scrollToLibrary}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-3.5 text-[15px] font-extrabold text-white shadow-xl shadow-violet-300/40 transition hover:from-violet-700 hover:to-fuchsia-600 active:scale-[0.98]"
              >
                Wybierz zabawę
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M6 13l6 6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => playRandom()}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-[#e6dbef] bg-white/85 px-6 py-3.5 text-[15px] font-extrabold text-[#6f5f8f] shadow-sm backdrop-blur-sm transition hover:border-violet-200 hover:bg-white hover:text-[#5b4689] active:scale-[0.98]"
              >
                <span aria-hidden="true">🎲</span>
                Zaskocz mnie
              </button>
            </div>

            <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-bold text-[#958aa8]">
              {[
                ['🔇', 'Bez dźwięku'],
                ['🚫', 'Bez reklam'],
                ['⚛️', '100% React + TS'],
                ['💜', 'Bez porażek'],
              ].map(([icon, label]) => (
                <li key={label} className="flex items-center gap-1.5">
                  <span aria-hidden="true">{icon}</span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero artwork */}
          <div className="relative mx-auto mt-2 w-full max-w-[420px] sm:mt-0 sm:max-w-[500px] lg:max-w-[540px]">
            {/* soft decorative halo */}
            <div className="pointer-events-none absolute -inset-5 rounded-[3.4rem] bg-gradient-to-br from-violet-200/50 via-pink-100/40 to-emerald-100/50 blur-2xl" aria-hidden="true" />

            <div className="relative overflow-hidden rounded-[2rem] border-[5px] border-white bg-white shadow-[0_35px_70px_-34px_rgba(90,63,130,0.65)] sm:rounded-[2.4rem] sm:border-[7px]">
              <img
                src={ARTWORK.hero}
                alt="Ilustracja: miś, rybki, pociąg, rakieta i motyle w spokojnej pastelowej krainie"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="block aspect-[4/3] w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#3a2c59]/30 via-transparent to-white/5" />

              {/* Interactive hotspot */}
              <button
                type="button"
                onClick={() => {
                  const first = enabledActivities.find((a) => a.id === 'akwarium') ?? enabledActivities[0];
                  if (first) openActivity(first);
                }}
                className="absolute bottom-3 left-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3.5 py-2 text-xs font-extrabold text-[#5b4a80] shadow-lg backdrop-blur-md transition hover:scale-105 active:scale-95 sm:bottom-4 sm:left-4 sm:px-4 sm:py-2.5 sm:text-sm"
              >
                <span aria-hidden="true" className="text-base">🐠</span>
                Zacznij od akwarium
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>

            {/* Floating sticker chips */}
            <span className="animate-float absolute -top-4 -left-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white bg-white/95 px-3 py-1.5 text-[10px] font-extrabold text-[#8a7aa4] shadow-lg [--tilt:-6deg] sm:text-[11px]">
              <span aria-hidden="true">🤫</span> tylko spokój
            </span>
            <span
              className="animate-float absolute -right-3 top-[38%] z-10 inline-flex items-center gap-1 rounded-full border border-white bg-white/95 px-2.5 py-1.5 text-[10px] font-extrabold text-amber-700 shadow-lg [--tilt:6deg] sm:text-[11px]"
              style={{ animationDelay: '1.2s' }}
            >
              <span aria-hidden="true">✨</span> {NATIVE_COUNT} zabaw
            </span>
            <span
              className="animate-float absolute -bottom-3 right-8 z-10 inline-flex items-center gap-1.5 rounded-full border border-white bg-white/95 px-3 py-1.5 text-[10px] font-extrabold text-emerald-700 shadow-lg [--tilt:-3deg] sm:text-[11px]"
              style={{ animationDelay: '2.1s' }}
            >
              <span aria-hidden="true">💜</span> bez porażek
            </span>

            {/* Doodle sparkles */}
            <svg className="pointer-events-none absolute -top-3 right-10 h-8 w-8 text-[#f6c96f] opacity-90" viewBox="0 0 40 40" aria-hidden="true">
              <path d="M20 2l3.4 11.6L35 17l-11.6 3.4L20 32l-3.4-11.6L5 17l11.6-3.4z" fill="currentColor" />
            </svg>
            <svg className="pointer-events-none absolute -bottom-4 left-6 h-6 w-6 text-[#c7b0ee] opacity-90" viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r="8" fill="currentColor" />
              <circle cx="7" cy="8" r="3" fill="currentColor" />
              <circle cx="33" cy="9" r="2.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="relative mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-3 px-4 pb-8 sm:px-6 lg:px-8">
          <span className="text-[11px] font-bold text-[#9a8fad]">Dostosuj światło do pory dnia</span>
          <MoodSwitcher mood={mood} onChange={handleMoodChange} />
          <span className="hidden text-[11px] text-[#b0a5c1] sm:inline">· {MOOD_LABELS[mood]}</span>
        </div>
      </section>

      {/* ── Illustrated worlds ─────────────────────────────── */}
      <div className="art-wave" aria-hidden="true" />

      <section className="relative px-4 pb-2 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1240px] py-6 sm:py-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#ac9fc2] uppercase">
                Sześć małych światów
              </p>
              <h2 className="font-display mt-1 text-xl font-semibold text-[#453a5c] sm:text-2xl">
                <span className="art-underline">Wybierz krainę</span>
              </h2>
            </div>
            <p className="max-w-xs text-[12px] leading-relaxed text-[#9a8fad]">
              Każda kraina kryje inne, spokojne zabawy. Dotknij obrazka, aby je zobaczyć.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            {CATEGORIES.filter((entry) => entry.id !== 'wszystkie').map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setCategory(entry.id);
                  setFavouritesOnly(false);
                  scrollToLibrary();
                }}
                className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-[1.3rem] border-[3px] border-white bg-white shadow-[0_18px_35px_-24px_rgba(91,70,130,0.6)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_25px_45px_-22px_rgba(91,70,130,0.6)] active:scale-[0.98] sm:rounded-[1.5rem]"
                aria-label={`Pokaż zabawy z kategorii ${entry.label}`}
              >
                <img
                  src={CATEGORY_ARTWORK[entry.id]}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-[#33264f]/85 via-[#33264f]/20 to-transparent" />
                {(() => {
                  const Icon = CATEGORY_ICONS[entry.id as keyof typeof CATEGORY_ICONS];
                  return (
                    <span className="absolute top-2 left-2 grid h-9 w-9 place-items-center rounded-full border border-white/90 bg-white/90 shadow-sm backdrop-blur-sm">
                      {Icon ? <Icon className="h-6 w-6" /> : <span>{entry.emoji}</span>}
                    </span>
                  );
                })()}
                <span className="font-display absolute bottom-2 left-2.5 right-2.5 text-left text-[13px] font-semibold text-white drop-shadow-[0_2px_4px_rgba(40,25,70,0.8)] sm:text-sm">
                  {entry.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured today ─────────────────────────────────── */}
      {featuredActivities.length > 0 && (
        <section className="px-4 pb-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1240px] pb-4 sm:pb-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#ac9fc2] uppercase">
                  Wyróżnione dziś
                </p>
                <h2 className="font-display mt-1 text-xl font-semibold text-[#453a5c] sm:text-2xl">
                  <span className="art-underline">Trzy małe przygody</span>
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#eadff5] bg-white/80 px-3 py-1.5 text-[11px] font-extrabold text-[#8b78aa] shadow-sm">
                <span aria-hidden="true" className="animate-heart">💜</span> wybrane dla Artura
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {featuredActivities.map((activity) => (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => openActivity(activity)}
                  className="featured-card group relative aspect-[16/9] cursor-pointer overflow-hidden rounded-[1.6rem] border-[4px] border-white bg-white text-left shadow-[0_22px_45px_-28px_rgba(91,70,130,0.65)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_55px_-26px_rgba(91,70,130,0.7)] active:scale-[0.99]"
                  aria-label={`Zagraj: ${activity.name}`}
                >
                  <img
                    src={FEATURED_ARTWORK[activity.id]}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.08]"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#2d2149]/90 via-[#2d2149]/35 to-transparent" />
                  <span className="absolute top-3 left-3 grid h-10 w-10 place-items-center rounded-[0.9rem] border-2 border-white/90 bg-white/90 text-xl shadow-md">
                    {activity.emoji}
                  </span>
                  <span className="font-display absolute right-3 bottom-3 left-3 flex items-end justify-between gap-2">
                    <span className="block text-[17px] font-semibold text-white drop-shadow-[0_2px_5px_rgba(30,20,60,0.8)] sm:text-lg">
                      {activity.name}
                    </span>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/70 bg-white/90 text-[#6b5394] shadow-md transition-transform group-hover:translate-x-1">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h13M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Library ────────────────────────────────────────── */}
      <section id="zabawy" className="relative scroll-mt-24 px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1240px]">
          <div className="rounded-[1.8rem] border border-white/90 bg-white/60 p-4 shadow-[0_30px_70px_-50px_rgba(91,70,130,0.5)] backdrop-blur-sm sm:rounded-[2.2rem] sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#ac9fc2] uppercase">
                  Biblioteka zabaw
                </p>
                <h2 className="font-display mt-1.5 text-2xl font-semibold text-[#453a5c] sm:text-[1.9rem]">
                  <span className="art-underline">Co dziś odkrywamy?</span>
                </h2>
                <p className="mt-1 text-sm text-[#8c819f]">
                  {filtered.length}{' '}
                  {plural(filtered.length, 'zabawa', 'zabawy', 'zabaw')}
                  {favouritesOnly
                    ? ' w ulubionych'
                    : category !== 'wszystkie'
                      ? ' w tej kategorii'
                      : ' do wyboru'}
                  {query.trim() ? ` dla „${query.trim()}”` : ''}.
                </p>
              </div>

              <div className="relative w-full lg:w-[310px]">
                <label htmlFor="activity-search" className="sr-only">
                  Szukaj zabawy
                </label>
                <svg
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-[#b2a7c4]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.6-3.6" />
                </svg>
                <input
                  ref={searchRef}
                  id="activity-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Szukaj, np. piesek, pizza…"
                  className="w-full rounded-full border border-[#eae1f1] bg-white/90 py-2.5 pr-10 pl-10 text-sm font-semibold text-[#5b4f70] placeholder:font-medium placeholder:text-[#b9aec9] focus:border-violet-300 focus:ring-4 focus:ring-violet-100 focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      searchRef.current?.focus();
                    }}
                    aria-label="Wyczyść wyszukiwanie"
                    className="absolute top-1/2 right-2.5 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-[#b2a7c4] transition hover:bg-[#f3edfa] hover:text-violet-500"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="no-scrollbar mt-5 flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtruj zabawy według kategorii">
              <button
                type="button"
                onClick={() => {
                  setFavouritesOnly(false);
                  setCategory('wszystkie');
                }}
                aria-pressed={category === 'wszystkie' && !favouritesOnly}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-extrabold transition ${
                  category === 'wszystkie' && !favouritesOnly
                    ? 'border-transparent bg-[#4e3c71] text-white shadow-md shadow-violet-200'
                    : 'border-[#e9e0f0] bg-white/80 text-[#887a9f] hover:border-violet-200 hover:text-[#6a568d]'
                }`}
              >
                <AllIcon className="h-[17px] w-[17px]" aria-hidden="true" />
                Wszystkie
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${category === 'wszystkie' && !favouritesOnly ? 'bg-white/20 text-white' : 'bg-[#f3edfa] text-[#a293ba]'}`}>
                  {enabledActivities.length}
                </span>
              </button>

              {favouriteSet.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFavouritesOnly((prev) => !prev);
                    setCategory('wszystkie');
                  }}
                  aria-pressed={favouritesOnly}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-extrabold transition ${
                    favouritesOnly
                      ? 'border-transparent bg-amber-400 text-white shadow-md shadow-amber-200'
                      : 'border-amber-200/80 bg-amber-50/80 text-amber-700 hover:border-amber-300'
                  }`}
                >
                  <StarIcon className="h-[17px] w-[17px]" aria-hidden="true" />
                  Ulubione
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${favouritesOnly ? 'bg-white/25' : 'bg-amber-100 text-amber-700'}`}>
                    {favouriteSet.size}
                  </span>
                </button>
              )}

              <span className="mx-1 h-6 w-px shrink-0 bg-[#ece3f2]" aria-hidden="true" />

              {CATEGORIES.filter((entry) => entry.id !== 'wszystkie').map((entry) => {
                const selected = category === entry.id && !favouritesOnly;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setCategory(entry.id);
                      setFavouritesOnly(false);
                    }}
                    aria-pressed={selected}
                    className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-extrabold transition ${
                      selected
                        ? 'border-transparent bg-[#4e3c71] text-white shadow-md shadow-violet-200'
                        : 'border-[#e9e0f0] bg-white/80 text-[#887a9f] hover:border-violet-200 hover:text-[#6a568d]'
                    }`}
                  >
                    {(() => {
                      const Icon = CATEGORY_ICONS[entry.id as keyof typeof CATEGORY_ICONS];
                      return Icon ? <Icon className="h-[17px] w-[17px]" aria-hidden="true" /> : <span aria-hidden="true">{entry.emoji}</span>;
                    })()}
                    {entry.label}
                    <span className={`text-[10px] font-extrabold ${selected ? 'text-white/60' : 'text-[#c0b4d2]'}`}>
                      {counts.get(entry.id)}
                    </span>
                  </button>
                );
              })}
            </div>

            {filtered.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {filtered.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    isFavourite={favouriteSet.has(activity.id)}
                    onPlay={openActivity}
                    onToggleFavourite={toggleFavourite}
                  />
                ))}
              </div>
            ) : (
              <div className="relative mt-10 mb-6 flex flex-col items-center overflow-hidden rounded-3xl border border-dashed border-[#e3d8ee] bg-white/50 px-6 py-12 text-center">
                <img
                  src={ARTWORK.przyroda}
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.14]"
                />
                <div className="relative z-10 flex flex-col items-center">
                <span className="text-5xl" aria-hidden="true">
                  🔭
                </span>
                <h3 className="font-display mt-3 text-xl font-semibold text-[#4f4367]">
                  Tu jeszcze nic nie ma
                </h3>
                <p className="mt-1 max-w-sm text-sm text-[#9286a6]">
                  Spróbuj innej nazwy albo pokaż wszystkie zabawy. Na pewno znajdziemy coś miłego.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 cursor-pointer rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-violet-200/70 transition hover:from-violet-600 hover:to-fuchsia-600 active:scale-95"
                >
                  Pokaż wszystkie zabawy
                </button>
                </div>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#efe6f5] pt-5">
                <p className="text-[12px] font-semibold text-[#a094b3]">
                  Kliknij kartę, aby uruchomić zabawę. Gwiazdka zapisuje ją w ulubionych.
                </p>
                <div className="flex items-center gap-2">
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="cursor-pointer rounded-full border border-[#e9e0f0] bg-white px-4 py-2 text-xs font-extrabold text-[#887a9f] transition hover:border-violet-200 hover:text-violet-600"
                    >
                      Wyczyść filtry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => playRandom(filtered)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#f3edfa] px-4 py-2 text-xs font-extrabold text-[#6d59a0] transition hover:bg-[#e9def8] active:scale-95"
                  >
                    <span aria-hidden="true">🎲</span> Losuj z tej listy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Parent quick access */}
          <div className="mt-5 flex flex-col items-start gap-4 rounded-[1.6rem] border border-[#ece2d5] bg-[#f7f1e7]/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-xl shadow-sm" aria-hidden="true">
                🔒
              </span>
              <div>
                <h3 className="font-display text-[15px] font-semibold text-[#574a43]">
                  Dla rodziców: limit czasu, statystyki i ukrywanie zabaw
                </h3>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#96887a]">
                  Ustawienia i statystyki są za bramką dla dorosłych. Wszystko zostaje na tym urządzeniu.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setParentsOpen(true)}
                className="cursor-pointer rounded-full border border-[#e3d6c6] bg-white px-4 py-2.5 text-xs font-extrabold text-[#8a7663] transition hover:bg-[#fdfaf5] active:scale-95"
              >
                Dowiedz się więcej
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#57466f] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#463758] active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3.2" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.11A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.54 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.11A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.54a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.11A1.7 1.7 0 0 0 15.1 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.46 9c.16.62.7 1.04 1.34 1.04H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1.03z" />
                </svg>
                Ustawienia
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-[#efe6dc] bg-[var(--footer-bg)] transition-colors duration-500">
        <div className="mx-auto max-w-[1240px] px-4 py-9 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
            <div className="max-w-md">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-300 via-fuchsia-200 to-amber-200 shadow-sm ring-2 ring-white/70" aria-hidden="true">
                  <MascotIcon className="h-7 w-7" />
                </span>
                <span className="font-display text-[15px] font-semibold text-[#544766]">
                  Spokojny Świat Artura
                </span>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-[#948879]">
                Cicha aplikacja dla małych odkrywców. Bez reklam, dźwięku, punktów i porażek.
                Wszystkie {NATIVE_COUNT} zabaw zostały w pełni przeniesione do React + TypeScript z projektu{' '}
                <a
                  href="https://github.com/BielinskiLukasz/child-page"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#7a6396] underline decoration-[#d8c9e6] underline-offset-2 hover:text-[#5f4a7c]"
                >
                  child-page
                </a>{' '}
                i działają lokalnie na urządzeniu.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-[12px] font-extrabold">
              <button
                type="button"
                onClick={() => setParentsOpen(true)}
                className="cursor-pointer rounded-full border border-[#e3d6c6] bg-white px-4 py-2 text-[#8a7663] transition hover:bg-[#fdfaf5]"
              >
                Dla rodziców
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="cursor-pointer rounded-full border border-[#e3d6c6] bg-white px-4 py-2 text-[#8a7663] transition hover:bg-[#fdfaf5]"
              >
                Ustawienia i statystyki
              </button>
              <a
                href="https://github.com/BielinskiLukasz/child-page"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[#e3d6c6] bg-white px-4 py-2 text-[#8a7663] transition hover:bg-[#fdfaf5]"
              >
                GitHub ↗
              </a>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-[#e9dfd3] pt-4 text-[11px] font-semibold text-[#aa9d8e] sm:flex-row sm:items-center sm:justify-between">
            <p>Wersja 1.0.0 · 68 natywnych zabaw React · bez zbierania danych osobowych · bez dźwięku</p>
            <p className="flex items-center gap-1.5">
              Zrobione z myślą o małych odkrywcach <span aria-hidden="true">💜</span>
            </p>
          </div>
        </div>
      </footer>

      {/* ── Overlays ───────────────────────────────────────── */}
      {activeActivity && (
        <Player
          activityId={activeActivity.id}
          title={activeActivity.name}
          emoji={activeActivity.emoji}
          onClose={closeActivity}
        />
      )}

      {settingsOpen && (
        <ParentSettingsModal
          menuEntries={menuEntries}
          onChangeMenu={handleMenuChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {parentsOpen && (
        <ParentDialog
          onClose={() => setParentsOpen(false)}
          onOpenSettings={() => {
            setParentsOpen(false);
            setSettingsOpen(true);
          }}
        />
      )}
    </div>
  );
}
