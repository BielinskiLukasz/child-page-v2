import { useEffect, useRef, useState } from 'react';
import { CATEGORY_ARTWORK } from '../data/artwork';
import type { Activity } from '../data/activities';
import { CATEGORY_STYLES } from '../data/activities';
import { CATEGORY_ICONS, SparkleIcon } from './ArtIcons';
import ActivityAccent from './ActivityAccent';

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
      className="h-[17px] w-[17px]"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.8l5.9-.9z" />
    </svg>
  );
}

/** Stable tiny variation per activity so repeated category art never looks cloned. */
function variation(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const hue = ((Math.abs(hash) % 5) - 2) * 5;
  const position = 40 + (Math.abs(hash >> 3) % 21);
  return { hue, position };
}

export default function ActivityCard({
  activity,
  isFavourite,
  onPlay,
  onToggleFavourite,
}: Props) {
  const style = CATEGORY_STYLES[activity.category];
  const { hue, position } = variation(activity.id);
  const cover = CATEGORY_ARTWORK[activity.category];
  const CategoryIcon = CATEGORY_ICONS[activity.category];

  const [burst, setBurst] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const handleFavourite = () => {
    onToggleFavourite(activity.id);
    setBurst(false);
    window.requestAnimationFrame(() => setBurst(true));
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setBurst(false), 750);
  };

  return (
    <article className="art-card press-bounce group relative flex flex-col overflow-hidden rounded-[1.4rem] border border-white bg-white/90 p-2 card-shadow backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-white hover:shadow-[0_28px_50px_-24px_rgba(91,70,130,0.55)]">
      <button
        type="button"
        onClick={() => onPlay(activity)}
        aria-label={`Zagraj: ${activity.name}`}
        className="absolute inset-0 z-[1] cursor-pointer rounded-[1.4rem] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      />

      {/* Illustrated cover */}
      <div className="pointer-events-none relative z-0 aspect-[16/10] w-full overflow-hidden rounded-[1.05rem] bg-[#f3eefb]">
        <img
          src={cover}
          alt={`Ilustracja kategorii: ${style.label}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.09]"
          style={{
            filter: `hue-rotate(${hue}deg) saturate(1.02)`,
            objectPosition: `50% ${position}%`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2f2547]/25 via-transparent to-white/10" />
        <ActivityAccent id={activity.id} />

        {/* Category icon watermark */}
        <CategoryIcon className="absolute right-2 bottom-2 h-9 w-9 text-white/55 drop-shadow-[0_2px_3px_rgba(50,35,80,0.35)]" />

        {/* Emoji medallion */}
        <span
          className={`absolute bottom-1.5 left-1.5 grid h-10 w-10 place-items-center rounded-[0.85rem] border-2 border-white/90 text-xl shadow-md shadow-black/10 sm:h-11 sm:w-11 sm:text-[1.35rem] ${style.tile}`}
          aria-hidden="true"
        >
          {activity.emoji}
        </span>

        {/* Category ribbon */}
        <span
          className={`absolute top-1.5 left-1.5 hidden rounded-full border border-white/70 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.09em] shadow-sm backdrop-blur-sm sm:inline-block ${style.pill}`}
        >
          {style.label}
        </span>
      </div>

      {/* Copy */}
      <div className="pointer-events-none relative z-0 flex flex-1 flex-col px-2 pt-2.5 pb-1.5">
        <h3 className="font-display text-[0.98rem] leading-snug font-semibold text-[#463d59] sm:text-[1.05rem]">
          {activity.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[#8a82a0] sm:text-[12.5px]">
          {activity.description}
        </p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2.5 text-[11px] font-extrabold tracking-wide text-[#a79bc0] uppercase transition-colors group-hover:text-[#7c5bd6] sm:text-xs">
          Zagraj
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>

      {/* Favourite + sparkle burst */}
      <span className="pointer-events-none absolute top-3.5 right-3.5 z-[3] h-8 w-8">
        {burst && (
          <>
            <SparkleIcon className="sparkle-burst sparkle-a absolute inset-0 h-8 w-8 text-amber-400" />
            <SparkleIcon className="sparkle-burst sparkle-b absolute inset-0 h-6 w-6 text-fuchsia-400" />
          </>
        )}
      </span>
      <button
        type="button"
        onClick={handleFavourite}
        aria-label={
          isFavourite
            ? `Usuń z ulubionych: ${activity.name}`
            : `Dodaj do ulubionych: ${activity.name}`
        }
        aria-pressed={isFavourite}
        className={`absolute top-3.5 right-3.5 z-[2] grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-white/80 shadow-md backdrop-blur-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
          isFavourite
            ? 'bg-amber-300 text-amber-800'
            : 'bg-white/85 text-[#b6aac9] hover:bg-amber-50 hover:text-amber-500'
        }`}
      >
        <StarIcon filled={isFavourite} />
      </button>
    </article>
  );
}
