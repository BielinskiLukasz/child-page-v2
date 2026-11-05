import { useEffect } from 'react';
import { ARTWORK } from '../data/artwork';
import { LearningIcon, MascotIcon, MoonIcon, SparkleIcon, SunIcon } from './ArtIcons';

interface Props {
  onClose: () => void;
  onOpenSettings: () => void;
}

const tiles = [
  {
    Icon: SunIcon,
    tint: 'bg-[#fdf0d5] text-[#d59a3e]',
    title: 'Dzienny limit czasu',
    text: 'Domyślnie 20 minut. Liczy się tylko czas, gdy zabawa jest widoczna. Gdy czas minie, pojawia się spokojny ekran księżyca.',
  },
  {
    Icon: LearningIcon,
    tint: 'bg-[#eee8fb] text-[#8f7fd1]',
    title: 'Menu dla dziecka',
    text: 'Ukryj zabawy, które nie są jeszcze odpowiednie, zmień ich kolejność i dodaj ulubione — wszystko za prostą bramką matematyczną.',
  },
  {
    Icon: SparkleIcon,
    tint: 'bg-[#fde8ee] text-[#d77d9d]',
    title: 'Statystyki na urządzeniu',
    text: 'Anonimowe podsumowania dzienne: czas, uruchomienia i ukończenia. Możesz je wyeksportować lub wyzerować. Nic nie jest wysyłane.',
  },
  {
    Icon: MoonIcon,
    tint: 'bg-[#e3f0fb] text-[#6f9bc4]',
    title: 'Prywatność i spokój',
    text: 'Bez reklam, kont, ciasteczek i śledzenia. Bez dźwięku, punktów i porażek. Po pierwszym uruchomieniu aplikacja działa offline.',
  },
];

export default function ParentDialog({ onClose, onOpenSettings }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-[#3b2f52]/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="parent-title"
        onClick={(event) => event.stopPropagation()}
        className="animate-rise max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] border border-white bg-[#fbf8f2] p-6 shadow-2xl sm:rounded-[2rem] sm:p-8"
      >
        {/* Illustrated banner */}
        <div className="relative mb-5 h-28 overflow-hidden rounded-[1.4rem] border-2 border-white shadow-sm sm:h-32">
          <img src={ARTWORK.hero} alt="" className="h-full w-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-r from-white/45 via-transparent to-white/10" />
          <span className="absolute top-2 right-3 grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-white/90 shadow-md">
            <MascotIcon className="h-9 w-9" />
          </span>
          <SparkleIcon className="absolute bottom-2 left-3 h-5 w-5 text-amber-400 drop-shadow" />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-extrabold tracking-wide text-violet-700 uppercase">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="10" width="16" height="11" rx="2.5" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Dla rodziców
            </span>
            <h2 id="parent-title" className="font-display mt-3 text-2xl font-semibold text-[#43395a] sm:text-[1.7rem]">
              Spokojny ekran pod opieką dorosłego
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#817794]">
              Świat Artura to 68 cichych, dotykowych zabaw dla dzieci w wieku około 2–5 lat.
              Najlepiej sprawdza się w tablecie lub telefonie, w spokojnym momencie dnia.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij okno"
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-[#8a7fa3] shadow-sm transition hover:bg-violet-50 hover:text-violet-600"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {tiles.map((tile) => (
            <div key={tile.title} className="rounded-2xl border border-[#eee6f3] bg-white/80 p-3.5">
              <div className="flex items-center gap-2.5">
                <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' + tile.tint}>
                  <tile.Icon className="h-6 w-6" />
                </span>
                <h3 className="font-display text-sm font-semibold text-[#4c4263]">{tile.title}</h3>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#8a809c]">{tile.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-3.5">
          <p className="text-xs leading-relaxed text-amber-800/90">
            <strong>Wskazówka:</strong> aby włączyć dzienny limit, ukryć zabawy albo zobaczyć
            statystyki, otwórz menu aplikacji i wybierz ikonę zębatki w prawym górnym rogu.
            Bramka poprosi o wynik prostego dodawania.
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-full border border-[#e6ddf0] bg-white px-5 py-3 text-sm font-extrabold text-[#7c6c98] transition hover:bg-[#f7f2fd] active:scale-[0.98]"
          >
            Wróć do zabaw
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-200/70 transition hover:from-violet-600 hover:to-fuchsia-600 active:scale-[0.98]"
          >
            <span aria-hidden="true">⚙️</span>
            Ustawienia aplikacji
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-[#a99fbb]">
          Wersja 1.0.0 · projekt open source, bez zbierania danych osobowych
        </p>
      </div>
    </div>
  );
}
