import type { Activity } from '../data/activities';
import { CATEGORY_STYLES } from '../data/activities';
import ActivityIcon from './ActivityIcon';

interface Props {
  activity: Activity;
  isFavourite: boolean;
  onPlay: (activity: Activity) => void;
  onToggleFavourite: (id: string) => void;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.8l5.9-.9z" />
    </svg>
  );
}

export default function ActivityCard({
  activity,
  isFavourite,
  onPlay,
  onToggleFavourite,
}: Props) {
  const style = CATEGORY_STYLES[activity.category];

  return (
    <article className="group relative flex flex-col rounded-[1.35rem] border border-white/90 bg-white/80 p-3.5 card-shadow backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white hover:bg-white hover:shadow-[0_22px_45px_-26px_rgba(91,70,130,0.55)] sm:p-4">
      <button
        type="button"
        onClick={() => onPlay(activity)}
        aria-label={`Zagraj: ${activity.name}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-[1.35rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      />

      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-1.5">
        <ActivityIcon
          id={activity.id}
          fallback={activity.emoji}
          className="card-icon h-[4.25rem] w-[4.25rem] sm:h-[4.75rem] sm:w-[4.75rem]"
        />
        <span
          className={`mr-7 hidden rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide sm:inline-block ${style.pill}`}
        >
          {style.label}
        </span>
      </div>

      <div className="pointer-events-none relative z-10 mt-3 flex flex-1 flex-col">
        <h3 className="font-display text-[1.02rem] leading-snug font-semibold text-[#463d59]">
          {activity.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-[#8a82a0]">
          {activity.description}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#9a8fb5] transition-colors group-hover:text-[#7c5bd6]">
          Zagraj
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>

      <button
        type="button"
        onClick={() => onToggleFavourite(activity.id)}
        aria-label={
          isFavourite
            ? `Usuń z ulubionych: ${activity.name}`
            : `Dodaj do ulubionych: ${activity.name}`
        }
        aria-pressed={isFavourite}
        className={`absolute top-2.5 right-2.5 z-20 grid h-8 w-8 cursor-pointer place-items-center rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
          isFavourite
            ? 'bg-amber-100 text-amber-500'
            : 'bg-transparent text-[#c9c1d9] hover:bg-amber-50 hover:text-amber-400'
        }`}
      >
        <StarIcon filled={isFavourite} />
      </button>
    </article>
  );
}
