import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { getNativeActivity } from '../activities';
import { Analytics, onAnalyticsEvent } from '../utils/analytics';
import {
  getPlaytimeProgress,
  getStageOpacity,
  isPlaytimeExpired,
  loadPlaytime,
  tickPlaytime,
} from '../utils/playtime';

interface Props {
  activityId: string;
  title: string;
  origin?: { x: number; y: number } | null;
  onClose: () => void;
}

function sandPoints(y1: number, y2: number, hw1: number, hw2: number): string {
  return `${12 - hw1},${y1} ${12 + hw1},${y1} ${12 + hw2},${y2} ${12 - hw2},${y2}`;
}

function HourglassIndicator({ progress, offsetLeft }: { progress: number; offsetLeft: boolean }) {
  const rem = Math.max(0, Math.min(1, 1 - progress));
  const p = Math.max(0, Math.min(1, progress));
  const k = 7.2 / 13;
  const yt = 16 - rem * 13;
  const topPts = rem <= 0 ? '' : sandPoints(yt, 16, 8 - (yt - 3) * k, 0.8);
  const yb = 29 - p * 13;
  const botPts = p <= 0 ? '' : sandPoints(yb, 29, 0.8 + (yb - 16) * k, 8);

  return (
    <div
      className={`player-hourglass hourglass${offsetLeft ? ' offset-left' : ''}`}
      role="img"
      aria-label="Klepsydra pokazuje, ile czasu zostało"
    >
      <svg viewBox="0 0 24 32" aria-hidden="true" focusable="false">
        {topPts && <polygon fill="#f2c879" points={topPts} />}
        {botPts && <polygon fill="#f2c879" points={botPts} />}
        <path
          d="M4 3h16M4 29h16M5 3l6.2 13L5 29M19 3l-6.2 13L19 29"
          fill="none"
          stroke="#5b5675"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function SleepingMoonScreen() {
  return (
    <div className="later-screen">
      <div>
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <circle cx="32" cy="32" r="30" fill="#b9b3e0" />
          <path d="M36 12a20 20 0 1 0 16 32A17 17 0 0 1 36 12z" fill="#ffe9a8" />
          <path
            d="M22 34q3 3 6 0"
            fill="none"
            stroke="#5b5675"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <text x="44" y="22" fontSize="8" fill="#fff">
            z
          </text>
        </svg>
        <h2>Na dziś już wystarczy.</h2>
        <p>Do zobaczenia!</p>
      </div>
    </div>
  );
}

export default function Player({ activityId, title, origin, onClose }: Props) {
  const NativeActivity = getNativeActivity(activityId);
  const backRef = useRef<HTMLButtonElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const [hint, setHint] = useState(false);
  const sparkleHostRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  // A gentle pulsing hint appears after a short idle so a toddler knows the screen is touchable.
  useEffect(() => {
    const timer = window.setTimeout(() => setHint(true), 3200);
    const hide = () => setHint(false);
    document.addEventListener('pointerdown', hide, { capture: true, once: true });
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', hide, { capture: true });
    };
  }, []);

  const spawnSparkles = useCallback(() => {
    const host = sparkleHostRef.current;
    if (!host || host.childElementCount > 40) return;
    const origin =
      lastTouchRef.current ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const rect = host.getBoundingClientRect();
    const ox = origin.x - rect.left;
    const oy = origin.y - rect.top;
    for (let i = 0; i < 14; i++) {
      const el = document.createElement('span');
      el.className = 'win-spark';
      const ang = Math.random() * Math.PI * 2;
      const dist = 55 + Math.random() * 95;
      el.style.setProperty('--dx', `${(Math.cos(ang) * dist).toFixed(1)}px`);
      el.style.setProperty('--dy', `${(Math.sin(ang) * dist - 42).toFixed(1)}px`);
      el.style.setProperty('--s', `${(7 + Math.random() * 8).toFixed(1)}px`);
      el.style.setProperty('--d', `${(0.7 + Math.random() * 0.45).toFixed(2)}s`);
      el.style.left = `${ox.toFixed(1)}px`;
      el.style.top = `${oy.toFixed(1)}px`;
      host.appendChild(el);
      window.setTimeout(() => el.remove(), 1250);
    }
  }, []);

  // Every game reports completion through Analytics; answer with a soft sparkle burst.
  useEffect(
    () =>
      onAnalyticsEvent((type) => {
        if (type === 'activity_complete' || type === 'level_complete') {
          spawnSparkles();
        }
      }),
    [spawnSparkles],
  );

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(onClose, 500);
  }, [onClose]);

  const [playState, setPlayState] = useState(() => loadPlaytime());
  const [expired, setExpired] = useState(() => isPlaytimeExpired());

  useEffect(() => {
    const initial = loadPlaytime();
    const alreadyExpired = isPlaytimeExpired(initial);
    setPlayState(initial);
    setExpired(alreadyExpired);

    if (!alreadyExpired) {
      Analytics.activityStart(activityId);
    }

    let last = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      const next = tickPlaytime(dt);
      setPlayState(next);
      if (isPlaytimeExpired(next)) {
        setExpired((wasExpired) => {
          if (!wasExpired) {
            Analytics.activityEnd();
          }
          return true;
        });
      }
    }, 1000);

    const onVisibility = () => {
      last = Date.now();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      Analytics.activityEnd();
    };
  }, [activityId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) {
        requestClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    backRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [requestClose]);

  const unlimited = playState.limit === null;
  const progress = expired ? 1 : getPlaytimeProgress(playState);
  const stageOpacity = expired ? 1 : getStageOpacity(progress, unlimited);

  return (
    <section
      className={`player-${closing ? 'close' : 'reveal'} fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden bg-[#f3eefb]${closing ? ' pointer-events-none' : ''}`}
      style={
        {
          '--ox': origin ? `${origin.x}px` : '50%',
          '--oy': origin ? `${origin.y}px` : '50%',
        } as CSSProperties
      }
      aria-label={title}
    >
      <button
        ref={backRef}
        type="button"
        onClick={requestClose}
        className="player-back back transition-transform active:scale-95"
        aria-label="Powrót do menu"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M15 5l-7 7 7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {!unlimited && (
        <HourglassIndicator progress={progress} offsetLeft={activityId === 'naklejki'} />
      )}

      {expired ? (
        <SleepingMoonScreen />
      ) : (
        <div
          ref={stageWrapRef}
          className="relative h-full w-full"
          style={{ opacity: stageOpacity }}
          onPointerDownCapture={(event) => {
            Analytics.recordStageTouch();
            lastTouchRef.current = { x: event.clientX, y: event.clientY };
            if ('vibrate' in navigator) {
              try {
                navigator.vibrate(8);
              } catch {
                /* haptics unsupported */
              }
            }
            const host = stageWrapRef.current;
            if (!host) return;
            if (host.querySelectorAll('.stage-ripple').length > 10) return;
            const rect = host.getBoundingClientRect();
            const el = document.createElement('span');
            el.className = 'stage-ripple';
            el.style.left = `${event.clientX - rect.left}px`;
            el.style.top = `${event.clientY - rect.top}px`;
            host.appendChild(el);
            window.setTimeout(() => el.remove(), 620);
          }}
          onKeyDownCapture={() => Analytics.recordStageTouch()}
        >
          {NativeActivity ? <NativeActivity key={activityId} /> : null}

          <div ref={sparkleHostRef} className="pointer-events-none absolute inset-0 z-[46]" aria-hidden="true" />

          {hint && (
            <span
              className="pointer-events-none absolute inset-0 z-[45] grid place-items-center"
              aria-hidden="true"
            >
              <span className="act-hint-badge">
                <svg viewBox="0 0 48 48" className="h-12 w-12">
                  <circle cx="24" cy="24" r="7.5" fill="#8f7fd1" />
                  <path
                    d="M24 7a17 17 0 0 1 17 17"
                    stroke="#8f7fd1"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.55"
                  />
                  <path
                    d="M24 41A17 17 0 0 1 7 24"
                    stroke="#8f7fd1"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.55"
                  />
                </svg>
              </span>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
