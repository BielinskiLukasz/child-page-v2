import { MoonIcon, SunIcon, SunsetIcon } from './ArtIcons';
import { MOOD_LABELS, MOODS, type Mood } from '../utils/theme';

interface Props {
  mood: Mood;
  onChange: (mood: Mood) => void;
}

const ICONS: Record<Mood, typeof SunIcon> = {
  poranek: SunIcon,
  dzien: SunsetIcon,
  wieczor: MoonIcon,
};

const COLORS: Record<Mood, string> = {
  poranek: 'text-[#e9a94f]',
  dzien: 'text-[#e38b74]',
  wieczor: 'text-[#8f7fd1]',
};

export default function MoodSwitcher({ mood, onChange }: Props) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-white/90 bg-white/80 px-2 py-1.5 shadow-[0_10px_25px_-18px_rgba(91,70,130,0.7)] backdrop-blur-md"
      role="group"
      aria-label="Pora dnia – wygląd strony"
    >
      <span className="hidden pl-1 text-[10px] font-extrabold tracking-[0.12em] text-[#a195b8] uppercase sm:inline">
        Pora dnia
      </span>
      {MOODS.map((item) => {
        const Icon = ICONS[item];
        const active = mood === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-label={`Motyw: ${MOOD_LABELS[item]}`}
            aria-pressed={active}
            title={MOOD_LABELS[item]}
            className={`grid h-8 w-8 cursor-pointer place-items-center rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
              active
                ? 'bg-[#4e3c71] text-white shadow-md'
                : `bg-white/70 ${COLORS[item]} hover:bg-[#f3eefb]`
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        );
      })}
    </div>
  );
}
