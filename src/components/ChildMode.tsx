import { useEffect, useRef, useState } from 'react';
import type { Activity } from '../data/activities';
import { ACTIVITY_ICONS } from '../data/activityIcons';
import ActivityIcon from './ActivityIcon';

interface Props {
  activities: Activity[];
  onPlay: (activity: Activity, origin?: { x: number; y: number }) => void;
  onExit: () => void;
}

const HOLD_MS = 1200;

export default function ChildMode({ activities, onPlay, onExit }: Props) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<number | null>(null);

  const cancelHold = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
  };

  const startHold = () => {
    if (timerRef.current !== null) return;
    setHolding(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setHolding(false);
      onExit();
    }, HOLD_MS);
  };

  useEffect(() => cancelHold, []);

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-gradient-to-b from-[#f3eefb] via-[#fdf4ea] to-[#e5f3eb]"
      role="region"
      aria-label="Wybierz zabawę"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 p-4 pt-6 pb-28 sm:grid-cols-3 sm:gap-6 sm:p-8 sm:pb-28 lg:grid-cols-4">
        {activities.map((activity) => {
          const tint = ACTIVITY_ICONS[activity.id]?.bg ?? '#f3eefb';
          return (
            <button
              key={activity.id}
              type="button"
              aria-label={activity.name}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                onPlay(activity, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
              }}
              style={{
                background: `linear-gradient(160deg, #ffffff 30%, color-mix(in srgb, ${tint} 55%, #ffffff))`,
              }}
              className="group grid aspect-square min-h-[7.5rem] cursor-pointer place-items-center rounded-[2rem] border-4 border-white p-3 shadow-[0_14px_30px_-18px_rgba(91,70,130,0.55)] transition-transform duration-200 active:scale-95"
            >
              <ActivityIcon id={activity.id} className="h-full max-h-40 w-full max-w-40" />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Przytrzymaj, aby wyjść z trybu dziecka"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
            event.preventDefault();
            startHold();
          }
        }}
        onKeyUp={cancelHold}
        onBlur={cancelHold}
        onContextMenu={(event) => event.preventDefault()}
        className="fixed right-4 bottom-4 z-[91] grid h-14 w-14 cursor-pointer place-items-center overflow-hidden rounded-full border border-white bg-white/80 text-[#a094b8] shadow-md backdrop-blur-sm select-none"
        style={{ touchAction: 'none' }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 bg-violet-200/80"
          style={{
            height: holding ? '100%' : '0%',
            transition: holding ? `height ${HOLD_MS}ms linear` : 'height 0.2s ease-out',
          }}
        />
        <svg
          viewBox="0 0 24 24"
          className="relative h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="10" width="16" height="11" rx="2.5" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </button>
    </div>
  );
}
