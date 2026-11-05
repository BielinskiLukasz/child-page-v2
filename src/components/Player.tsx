import { useEffect, useRef, useState } from 'react';
import { getNativeActivity } from '../activities';
import { Analytics } from '../utils/analytics';
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
  emoji?: string;
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

export default function Player({ activityId, title, emoji = '🧸', onClose }: Props) {
  const NativeActivity = getNativeActivity(activityId);
  const backRef = useRef<HTMLButtonElement>(null);

  const [playState, setPlayState] = useState(() => loadPlaytime());
  const [expired, setExpired] = useState(() => isPlaytimeExpired());
  const [titleVisible, setTitleVisible] = useState(true);
  const [sceneKey, setSceneKey] = useState(0);

  const restartScene = () => {
    Analytics.track('activity_restart');
    setSceneKey((key) => key + 1);
    setTitleVisible(true);
    window.setTimeout(() => setTitleVisible(false), 2600);
  };

  useEffect(() => {
    setTitleVisible(true);
    const timer = window.setTimeout(() => setTitleVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, [activityId]);

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
        onClose();
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
  }, [onClose]);

  const unlimited = playState.limit === null;
  const progress = expired ? 1 : getPlaytimeProgress(playState);
  const stageOpacity = expired ? 1 : getStageOpacity(progress, unlimited);

  return (
    <section
      className="scene-frame fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden bg-[#f3eefb]"
      aria-label={title}
    >
      {!expired && (
        <div className={`scene-title-pill${titleVisible ? '' : ' fade-away'}`} aria-hidden="true">
          <span className="scene-emoji">{emoji}</span>
          <span className="truncate">{title}</span>
        </div>
      )}

      <button
        ref={backRef}
        type="button"
        onClick={onClose}
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

      {!expired && (
        <button
          type="button"
          onClick={restartScene}
          className="scene-restart"
          style={{
            right: `calc(var(--safe-r) + ${
              activityId === 'naklejki' ? (!unlimited ? 138 : 10) : !unlimited ? 74 : 10
            }px)`,
          }}
          aria-label="Nowa scena – wylosuj od nowa"
          title="Nowa scena"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {expired ? (
        <SleepingMoonScreen />
      ) : (
        <div
          className="animate-scene-in h-full w-full origin-center"
          style={{ opacity: stageOpacity }}
          onPointerDownCapture={() => Analytics.recordStageTouch()}
          onKeyDownCapture={() => Analytics.recordStageTouch()}
        >
          {NativeActivity ? <NativeActivity key={`${activityId}-${sceneKey}`} /> : null}
        </div>
      )}
    </section>
  );
}
