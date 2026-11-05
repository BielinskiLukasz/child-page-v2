import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ACTIVITIES } from '../data/activities';
import ActivityIcon from './ActivityIcon';
import {
  Analytics,
  type AnalyticsPeriod,
} from '../utils/analytics';
import {
  applySettingsBackup,
  defaultMenuEntries,
  exportSettingsBackup,
  parseSettingsBackup,
  type MenuEntry,
} from '../utils/menuConfig';
import {
  loadPlaytime,
  resetPlaytimeUsed,
  setPlaytimeLimit,
} from '../utils/playtime';

interface Props {
  menuEntries: MenuEntry[];
  onChangeMenu: (entries: MenuEntry[]) => void;
  onClose: () => void;
}

type Pane = 'gate' | 'settings' | 'stats';

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: 'session', label: 'Ta sesja' },
  { id: 'today', label: 'Dzisiaj' },
  { id: '7d', label: '7 dni' },
  { id: '30d', label: '30 dni' },
  { id: 'all', label: 'Od początku' },
];

function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min < 60) return remSec ? `${min} min ${remSec} s` : `${min} min`;
  const hrs = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hrs} godz. ${remMin} min`;
}

function downloadJson(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ParentSettingsModal({ menuEntries, onChangeMenu, onClose }: Props) {
  const [pane, setPane] = useState<Pane>('gate');

  // Math gate state
  const [sumPair, setSumPair] = useState<[number, number]>(() => [
    1 + Math.floor(Math.random() * 9),
    1 + Math.floor(Math.random() * 9),
  ]);
  const [gateInput, setGateInput] = useState('');
  const [gateError, setGateError] = useState('');
  const gateInputRef = useRef<HTMLInputElement>(null);

  // Playtime state
  const [playState, setPlayState] = useState(() => loadPlaytime());
  const [noLimit, setNoLimit] = useState(() => loadPlaytime().limit === null);
  const [limitText, setLimitText] = useState(() => {
    const l = loadPlaytime().limit;
    return l === null ? '20' : String(l);
  });
  const [limitMsg, setLimitMsg] = useState('');

  // Menu list state
  const [actMsg, setActMsg] = useState('');
  const [confirmResetMenu, setConfirmResetMenu] = useState(false);

  // Backup state
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [pendingBackup, setPendingBackup] = useState<{
    entries: MenuEntry[];
    limit: number | null;
  } | null>(null);
  const [backupMsg, setBackupMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statistics state
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d');
  const [statsVersion, setStatsVersion] = useState(0);
  const [statsMsg, setStatsMsg] = useState('');
  const [confirmResetStats, setConfirmResetStats] = useState(false);

  const activityById = useMemo(() => {
    const map = new Map(ACTIVITIES.map((a) => [a.id, a]));
    return map;
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    gateInputRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const rollNewSum = () => {
    setSumPair([1 + Math.floor(Math.random() * 9), 1 + Math.floor(Math.random() * 9)]);
    setGateInput('');
  };

  const handleGateSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (gateInput.trim() !== '' && Number(gateInput.trim()) === sumPair[0] + sumPair[1]) {
      const latest = loadPlaytime();
      setPlayState(latest);
      setNoLimit(latest.limit === null);
      setLimitText(latest.limit === null ? '20' : String(latest.limit));
      setPane('settings');
      return;
    }
    setGateError('Spróbuj jeszcze raz.');
    rollNewSum();
    gateInputRef.current?.focus();
  };

  const handleLimitSave = (event: FormEvent) => {
    event.preventDefault();
    if (noLimit) {
      setPlaytimeLimit(null);
      setPlayState(loadPlaytime());
      setLimitMsg('Zapisano: bez dziennego limitu.');
      return;
    }
    const num = Number(limitText.trim().replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0 || num > 1440) {
      setLimitMsg('Wpisz liczbę minut większą od zera (1–1440).');
      return;
    }
    setPlaytimeLimit(num);
    setPlayState(loadPlaytime());
    setLimitMsg('Zapisano limit czasu.');
  };

  const handleResetTimer = () => {
    const next = resetPlaytimeUsed();
    setPlayState(next);
    setLimitMsg('Dzisiejszy czas został wyzerowany.');
  };

  const toggleEnabled = (id: string) => {
    const enabledCount = menuEntries.filter((e) => e.on).length;
    const target = menuEntries.find((e) => e.id === id);
    if (!target) return;
    if (target.on && enabledCount <= 1) {
      setActMsg('Co najmniej jedna zabawa musi pozostać włączona.');
      return;
    }
    setActMsg('');
    onChangeMenu(menuEntries.map((e) => (e.id === id ? { ...e, on: !e.on } : e)));
  };

  const toggleFav = (id: string) => {
    setActMsg('');
    onChangeMenu(menuEntries.map((e) => (e.id === id ? { ...e, fav: !e.fav } : e)));
  };

  const moveItem = (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= menuEntries.length) return;
    const next = [...menuEntries];
    const [item] = next.splice(index, 1);
    next.splice(targetIdx, 0, item);
    onChangeMenu(next);
  };

  const handleRestoreDefaults = () => {
    const defaults = defaultMenuEntries(true).map((e) => ({ ...e, fav: false }));
    onChangeMenu(defaults);
    setConfirmResetMenu(false);
    setActMsg('Przywrócono domyślną listę wszystkich 68 zabaw.');
  };

  const handleExportSettings = () => {
    downloadJson('ustawienia-swiat-artura.json', exportSettingsBackup(menuEntries));
    setBackupMsg('Zapisano plik ustawień.');
  };

  const handleCopySettings = async () => {
    try {
      await navigator.clipboard.writeText(exportSettingsBackup(menuEntries));
      setBackupMsg('Skopiowano ustawienia do schowka.');
    } catch {
      setBackupMsg('Nie udało się skopiować do schowka.');
    }
  };

  const stageImportText = (raw: string) => {
    const result = parseSettingsBackup(raw);
    if (!result.ok) {
      setBackupMsg(result.error);
      setPendingBackup(null);
      return;
    }
    setBackupMsg('');
    setPendingBackup({ entries: result.entries, limit: result.limit });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        stageImportText(reader.result);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const confirmImport = () => {
    if (!pendingBackup) return;
    applySettingsBackup(pendingBackup.entries, pendingBackup.limit);
    onChangeMenu(pendingBackup.entries);
    const latest = loadPlaytime();
    setPlayState(latest);
    setNoLimit(latest.limit === null);
    setLimitText(latest.limit === null ? '20' : String(latest.limit));
    setPendingBackup(null);
    setImportOpen(false);
    setImportText('');
    setBackupMsg('Wczytano ustawienia.');
  };

  const statsData = useMemo(() => {
    void statsVersion;
    return {
      rank: Analytics.ranking(period),
      sec: Analytics.secondary(period),
    };
  }, [period, statsVersion]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#3b2f52]/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ustawienia dla rodzica"
        onClick={(e) => e.stopPropagation()}
        className="animate-rise max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-white bg-[#fbf8f2] p-6 shadow-2xl sm:rounded-[2rem] sm:p-8"
      >
        {pane === 'gate' && (
          <div className="mx-auto max-w-sm text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-extrabold tracking-wide text-violet-700 uppercase">
              🔒 Tylko dla rodzica
            </span>
            <h2 className="font-display mt-3 text-2xl font-semibold text-[#43395a]">
              Rozwiąż krótkie działanie
            </h2>
            <p className="mt-1 text-sm text-[#817794]">
              Bramka chroni ustawienia przed przypadkową zmianą przez dziecko.
            </p>

            <form onSubmit={handleGateSubmit} className="mt-6 space-y-4">
              <p className="font-display text-4xl font-semibold text-[#4e3c71]">
                {sumPair[0]} + {sumPair[1]} = ?
              </p>
              <div>
                <label htmlFor="parent-gate-input" className="sr-only">
                  Wynik
                </label>
                <input
                  ref={gateInputRef}
                  id="parent-gate-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={2}
                  value={gateInput}
                  onChange={(e) => setGateInput(e.target.value)}
                  placeholder="Wynik"
                  className="w-36 rounded-2xl border-2 border-[#d8cce8] bg-white px-4 py-3 text-center text-2xl font-extrabold text-[#43395a] focus:border-violet-400 focus:outline-none"
                />
              </div>
              {gateError && (
                <p role="status" className="text-sm font-bold text-rose-600">
                  {gateError}
                </p>
              )}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 cursor-pointer rounded-full border border-[#e6ddf0] bg-white px-5 py-3 text-sm font-extrabold text-[#7c6c98] transition hover:bg-[#f7f2fd]"
                >
                  Zamknij
                </button>
                <button
                  type="submit"
                  className="flex-1 cursor-pointer rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-200/70 transition hover:from-violet-600 hover:to-fuchsia-600"
                >
                  Dalej
                </button>
              </div>
            </form>
          </div>
        )}

        {pane === 'settings' && (
          <div className="space-y-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-extrabold tracking-wide text-violet-700 uppercase">
                  ⚙️ Panel rodzica
                </span>
                <h2 className="font-display mt-2 text-2xl font-semibold text-[#43395a]">
                  Ustawienia aplikacji
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPane('stats')}
                  className="cursor-pointer rounded-full bg-violet-100 px-4 py-2 text-xs font-extrabold text-violet-700 transition hover:bg-violet-200"
                >
                  📊 Statystyki
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Zamknij ustawienia"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white text-[#8a7fa3] shadow-sm transition hover:bg-violet-50 hover:text-violet-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Playtime limit */}
            <section className="rounded-2xl border border-[#ece3f4] bg-white/85 p-5">
              <h3 className="font-display text-lg font-semibold text-[#453a5c]">
                ⏳ Dzienny limit zabawy
              </h3>
              <form onSubmit={handleLimitSave} className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="limit-minutes" className="text-sm font-bold text-[#6e6385]">
                    Minuty dziennie:
                  </label>
                  <input
                    id="limit-minutes"
                    type="text"
                    inputMode="decimal"
                    disabled={noLimit}
                    value={limitText}
                    onChange={(e) => setLimitText(e.target.value)}
                    className="w-24 rounded-xl border border-[#d8cce8] bg-white px-3 py-2 text-center text-base font-extrabold text-[#43395a] disabled:opacity-45"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-[#6e6385]">
                    <input
                      type="checkbox"
                      checked={noLimit}
                      onChange={(e) => setNoLimit(e.target.checked)}
                      className="h-5 w-5 accent-violet-600"
                    />
                    Bez limitu
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="text-xs font-bold text-[#8c819f]">
                    Dzisiaj wykorzystano: {Math.floor(playState.used / 60000)} min
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleResetTimer}
                      className="cursor-pointer rounded-full border border-[#e6ddf0] bg-[#fbf8f2] px-4 py-2 text-xs font-extrabold text-[#7c6c98] transition hover:bg-violet-50"
                    >
                      Zeruj czas
                    </button>
                    <button
                      type="submit"
                      className="cursor-pointer rounded-full bg-[#4e3c71] px-5 py-2 text-xs font-extrabold text-white transition hover:bg-[#3f2f5e]"
                    >
                      Zapisz limit
                    </button>
                  </div>
                </div>
                {limitMsg && (
                  <p role="status" className="text-xs font-bold text-emerald-700">
                    {limitMsg}
                  </p>
                )}
              </form>
            </section>

            {/* Menu activities */}
            <section className="rounded-2xl border border-[#ece3f4] bg-white/85 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#453a5c]">
                    🧩 Zabawy w bibliotece ({menuEntries.filter((e) => e.on).length}/{menuEntries.length})
                  </h3>
                  <p className="text-xs text-[#8c819f]">
                    Włącz/wyłącz zabawy, oznacz ulubione (★) lub zmień ich kolejność.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmResetMenu(true)}
                  className="cursor-pointer rounded-full border border-[#e6ddf0] bg-[#fbf8f2] px-3.5 py-1.5 text-xs font-extrabold text-[#7c6c98] transition hover:bg-violet-50"
                >
                  Przywróć domyślne
                </button>
              </div>

              {confirmResetMenu && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
                  <span>Przywrócić wszystkie 68 zabaw w pierwotnej kolejności?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRestoreDefaults}
                      className="cursor-pointer rounded-full bg-amber-500 px-3.5 py-1.5 text-white"
                    >
                      Tak
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetMenu(false)}
                      className="cursor-pointer rounded-full bg-white px-3.5 py-1.5 text-amber-800"
                    >
                      Nie
                    </button>
                  </div>
                </div>
              )}

              {actMsg && (
                <p role="status" className="mt-2 text-xs font-bold text-amber-700">
                  {actMsg}
                </p>
              )}

              <ul className="mt-3 max-h-72 divide-y divide-[#f2ebf8] overflow-y-auto pr-1">
                {menuEntries.map((entry, idx) => {
                  const act = activityById.get(entry.id);
                  if (!act) return null;
                  return (
                    <li key={entry.id} className="flex items-center gap-2 py-2">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={entry.on}
                          onChange={() => toggleEnabled(entry.id)}
                          className="h-5 w-5 shrink-0 accent-violet-600"
                        />
                        <ActivityIcon id={act.id} fallback={act.emoji} className="h-8 w-8" />
                        <span
                          className={`truncate text-sm font-bold ${
                            entry.on ? 'text-[#463d59]' : 'text-[#b2a8c4] line-through'
                          }`}
                        >
                          {act.name}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => toggleFav(entry.id)}
                        aria-label={entry.fav ? `Usuń z ulubionych: ${act.name}` : `Dodaj do ulubionych: ${act.name}`}
                        aria-pressed={entry.fav}
                        className={`grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-base transition ${
                          entry.fav
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-[#f6f2fb] text-[#b8aecb] hover:text-amber-500'
                        }`}
                      >
                        {entry.fav ? '★' : '☆'}
                      </button>

                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, -1)}
                        aria-label={`Przesuń wyżej: ${act.name}`}
                        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-[#f6f2fb] text-xs font-extrabold text-[#6e6385] disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={idx === menuEntries.length - 1}
                        onClick={() => moveItem(idx, 1)}
                        aria-label={`Przesuń niżej: ${act.name}`}
                        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-[#f6f2fb] text-xs font-extrabold text-[#6e6385] disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Settings backup */}
            <section className="rounded-2xl border border-[#ece3f4] bg-white/85 p-5">
              <h3 className="font-display text-lg font-semibold text-[#453a5c]">
                💾 Kopia ustawień
              </h3>
              <p className="mt-1 text-xs text-[#8c819f]">
                Menu, ulubione i dzienny limit czasu. Plik zostaje wyłącznie na tym urządzeniu.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExportSettings}
                  className="cursor-pointer rounded-full border border-[#e6ddf0] bg-[#fbf8f2] px-4 py-2 text-xs font-extrabold text-[#6b5d8f] transition hover:bg-violet-50"
                >
                  Zapisz ustawienia (JSON)
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopySettings()}
                  className="cursor-pointer rounded-full border border-[#e6ddf0] bg-[#fbf8f2] px-4 py-2 text-xs font-extrabold text-[#6b5d8f] transition hover:bg-violet-50"
                >
                  Skopiuj ustawienia
                </button>
                <button
                  type="button"
                  onClick={() => setImportOpen((o) => !o)}
                  aria-expanded={importOpen}
                  className="cursor-pointer rounded-full border border-[#e6ddf0] bg-[#fbf8f2] px-4 py-2 text-xs font-extrabold text-[#6b5d8f] transition hover:bg-violet-50"
                >
                  Wczytaj ustawienia
                </button>
              </div>

              {importOpen && (
                <div className="mt-3 space-y-2.5 rounded-xl border border-[#ece3f4] bg-[#fbf8f2] p-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer rounded-full bg-white px-4 py-1.5 text-xs font-extrabold text-[#5b4d7a] shadow-sm"
                    >
                      Wybierz plik JSON
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json,text/plain"
                      onChange={handleFileChange}
                      hidden
                    />
                  </div>
                  <label htmlFor="backup-textarea" className="block text-xs font-bold text-[#7c6c98]">
                    Albo wklej tekst ustawień:
                  </label>
                  <textarea
                    id="backup-textarea"
                    rows={3}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    spellCheck={false}
                    className="w-full rounded-xl border border-[#d8cce8] bg-white p-2.5 font-mono text-xs text-[#43395a]"
                  />
                  <button
                    type="button"
                    onClick={() => stageImportText(importText)}
                    className="cursor-pointer rounded-full bg-[#4e3c71] px-4 py-1.5 text-xs font-extrabold text-white"
                  >
                    Sprawdź i wczytaj z tekstu
                  </button>
                </div>
              )}

              {pendingBackup && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
                  <span>Zastąpić obecne ustawienia wczytaną kopią?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={confirmImport}
                      className="cursor-pointer rounded-full bg-amber-500 px-3.5 py-1.5 text-white"
                    >
                      Tak, zastąp
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingBackup(null)}
                      className="cursor-pointer rounded-full bg-white px-3.5 py-1.5 text-amber-800"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              )}

              {backupMsg && (
                <p role="status" className="mt-2 text-xs font-bold text-violet-700">
                  {backupMsg}
                </p>
              )}
            </section>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-[#a59ab8]">
                Wersja 1.0.0 · 68 natywnych zabaw React
              </span>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-2.5 text-sm font-extrabold text-white shadow-md"
              >
                Gotowe
              </button>
            </div>
          </div>
        )}

        {pane === 'stats' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <button
                  type="button"
                  onClick={() => setPane('settings')}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-extrabold text-violet-700 hover:underline"
                >
                  ← Wróć do ustawień
                </button>
                <h2 className="font-display mt-1 text-2xl font-semibold text-[#43395a]">
                  Statystyki użycia
                </h2>
                <p className="text-xs text-[#8c819f]">
                  Zapisane wyłącznie na tym urządzeniu, anonimowo. Nic nie jest nigdzie wysyłane.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Zamknij"
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white text-[#8a7fa3] shadow-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Okres statystyk">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  aria-pressed={period === p.id}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                    period === p.id
                      ? 'bg-[#4e3c71] text-white'
                      : 'border border-[#e6ddf0] bg-white text-[#7c6c98]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-2xl border border-[#ece3f4] bg-white p-3.5">
                <span className="block text-[11px] font-bold text-[#9b90b0]">Czas aktywny</span>
                <span className="font-display mt-1 block text-lg font-semibold text-[#453a5c]">
                  {formatDuration(statsData.rank.app.act)}
                </span>
              </div>
              <div className="rounded-2xl border border-[#ece3f4] bg-white p-3.5">
                <span className="block text-[11px] font-bold text-[#9b90b0]">Sesje</span>
                <span className="font-display mt-1 block text-lg font-semibold text-[#453a5c]">
                  {statsData.rank.app.s}
                </span>
              </div>
              <div className="rounded-2xl border border-[#ece3f4] bg-white p-3.5">
                <span className="block text-[11px] font-bold text-[#9b90b0]">Otwarte zabawy</span>
                <span className="font-display mt-1 block text-lg font-semibold text-[#453a5c]">
                  {statsData.rank.app.op}
                </span>
              </div>
              <div className="rounded-2xl border border-[#ece3f4] bg-white p-3.5">
                <span className="block text-[11px] font-bold text-[#9b90b0]">Dni z zabawą</span>
                <span className="font-display mt-1 block text-lg font-semibold text-[#453a5c]">
                  {statsData.rank.days}
                </span>
              </div>
            </div>

            <section className="rounded-2xl border border-[#ece3f4] bg-white/85 p-4">
              <h3 className="font-display text-base font-semibold text-[#453a5c]">
                Ranking zabaw (czas aktywny)
              </h3>
              {statsData.rank.rows.length === 0 ? (
                <p className="mt-2 text-xs text-[#9b90b0]">
                  Brak zapisanych aktywności w wybranym okresie.
                </p>
              ) : (
                <ol className="mt-2.5 max-h-64 divide-y divide-[#f2ebf8] overflow-y-auto text-xs">
                  {statsData.rank.rows.map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="font-bold text-[#463d59]">
                        {row.rank}. {row.name}
                      </span>
                      <span className="shrink-0 text-[#7c6c98]">
                        {formatDuration(row.act)} · {row.st}× otw.
                        {row.cmp > 0 ? ` · ${row.cmp}× uk.` : ''}
                        {row.lv > 0 ? ` · poz. ${row.lv}` : ''}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  downloadJson(
                    'statystyki-swiat-artura.json',
                    JSON.stringify(Analytics.exportData(), null, 2),
                  );
                  setStatsMsg('Pobrano plik JSON ze statystykami.');
                }}
                className="cursor-pointer rounded-full border border-[#e6ddf0] bg-white px-4 py-2 text-xs font-extrabold text-[#6b5d8f]"
              >
                Pobierz dane (JSON)
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      JSON.stringify(Analytics.exportData(), null, 2),
                    );
                    setStatsMsg('Skopiowano statystyki JSON do schowka.');
                  } catch {
                    setStatsMsg('Nie udało się skopiować danych.');
                  }
                }}
                className="cursor-pointer rounded-full border border-[#e6ddf0] bg-white px-4 py-2 text-xs font-extrabold text-[#6b5d8f]"
              >
                Skopiuj dane (JSON)
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetStats(true)}
                className="cursor-pointer rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-extrabold text-rose-700"
              >
                Wyzeruj statystyki
              </button>
            </div>

            {confirmResetStats && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-900">
                <span>Usunąć wszystkie zapisane statystyki?</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      Analytics.reset();
                      setStatsVersion((v) => v + 1);
                      setConfirmResetStats(false);
                      setStatsMsg('Statystyki zostały wyzerowane.');
                    }}
                    className="cursor-pointer rounded-full bg-rose-600 px-3.5 py-1.5 text-white"
                  >
                    Tak, usuń
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetStats(false)}
                    className="cursor-pointer rounded-full bg-white px-3.5 py-1.5 text-rose-800"
                  >
                    Nie
                  </button>
                </div>
              </div>
            )}

            {statsMsg && (
              <p role="status" className="text-xs font-bold text-violet-700">
                {statsMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
