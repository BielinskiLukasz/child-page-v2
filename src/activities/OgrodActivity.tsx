import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { pickOne } from '../utils/rand';

const MAX_PLANTS = 20;
const MAX_FADING = 6;
const FADE_MS = 900;

const PASTELS = ['#f7a8c9', '#ffd98a', '#c9b8f2', '#ffb7a5', '#a8d8f0', '#b9e3c0'] as const;
const CAPS = ['#f08a8a', '#e8c39e', '#c9b8f2', '#f2b7a0', '#a8d8f0'] as const;

type WeatherType = 'sunny' | 'cloudy' | 'rain' | 'breeze';
type TimeOfDay = 'day' | 'night';

interface WeatherCombo {
  w: WeatherType;
  t: TimeOfDay;
}

const WEATHERS: WeatherType[] = ['sunny', 'cloudy', 'rain', 'breeze'];
const TIMES: TimeOfDay[] = ['day', 'night'];
const COMBOS: WeatherCombo[] = WEATHERS.flatMap((w) => TIMES.map((t) => ({ w, t })));

interface StarSpec {
  left: string;
  top: string;
  size: string;
  opacity: string;
  delay: string;
}

interface DropSpec {
  left: string;
  duration: string;
  delay: string;
}

interface FireflySpec {
  left: string;
  top: string;
  duration: string;
  delay: string;
}

interface SceneEnvironment {
  combo: WeatherCombo;
  stars: StarSpec[];
  drops: DropSpec[];
  fireflies: FireflySpec[];
}

interface PlantItem {
  id: number;
  kind: number;
  color: string;
  x: number;
  y: number;
  scale: number;
  fading: boolean;
}

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createEnvironment(): SceneEnvironment {
  const combo = pickOne(COMBOS, 'ogrod-weather');
  const stars: StarSpec[] = [];
  if (combo.t === 'night') {
    for (let s = 0; s < 40; s++) {
      const bright = Math.random() < 0.1;
      const sz = bright ? 3 + Math.random() : 1.4 + Math.random() * 1.3;
      stars.push({
        left: `${(2 + Math.random() * 96).toFixed(1)}%`,
        top: `${(2 + Math.random() * 46).toFixed(1)}%`,
        size: `${sz.toFixed(1)}px`,
        opacity: (bright ? 0.9 : 0.4 + Math.random() * 0.4).toFixed(2),
        delay: `-${(Math.random() * 4).toFixed(2)}s`,
      });
    }
  }

  const drops: DropSpec[] = [];
  if (combo.w === 'rain') {
    for (let d = 0; d < 30; d++) {
      const dur = 0.9 + Math.random() * 0.5;
      drops.push({
        left: `${(Math.random() * 100).toFixed(1)}%`,
        duration: `${dur.toFixed(2)}s`,
        delay: `-${(Math.random() * dur).toFixed(2)}s`,
      });
    }
  }

  const fireflies: FireflySpec[] = [];
  if (combo.t === 'night') {
    for (let f = 0; f < 5; f++) {
      fireflies.push({
        left: `${(8 + Math.random() * 84).toFixed(1)}%`,
        top: `${(58 + Math.random() * 30).toFixed(1)}%`,
        duration: `${(4.5 + Math.random() * 3).toFixed(2)}s`,
        delay: `-${(Math.random() * 4).toFixed(2)}s`,
      });
    }
  }

  return { combo, stars, drops, fireflies };
}

const DAISY_ANGLES = Array.from({ length: 10 }, (_, i) => i * 36);

function FlowerStemAndLeaves() {
  return (
    <>
      <g className="g-stem">
        <path d="M30 100V44" stroke="#7fbf8f" strokeWidth={5} strokeLinecap="round" />
      </g>
      <g className="g-leaves">
        <ellipse cx="20" cy="74" rx="10" ry="5" fill="#8fcf9f" transform="rotate(-30 20 74)" />
        <ellipse cx="40" cy="64" rx="10" ry="5" fill="#8fcf9f" transform="rotate(30 40 64)" />
      </g>
    </>
  );
}

function MushroomBase({ stemX, stemWidth }: { stemX: number; stemWidth: number }) {
  return (
    <>
      <g className="g-stem">
        <rect x={stemX} y={60} width={stemWidth} height={40} rx={6} fill="#fdf3e3" />
      </g>
      <g className="g-leaves">
        <ellipse cx="14" cy="98" rx="9" ry="4" fill="#8fcf9f" />
        <ellipse cx="46" cy="98" rx="9" ry="4" fill="#8fcf9f" />
      </g>
    </>
  );
}

function PlantGraphic({ kind, color }: { kind: number; color: string }) {
  return (
    <svg viewBox="0 0 60 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <g className="g-seed">
        <ellipse cx="30" cy="96" rx="6" ry="4" fill="#9b7653" />
      </g>

      {kind === 0 && (
        <>
          <FlowerStemAndLeaves />
          <g className="g-bloom">
            <g fill={color}>
              <circle cx="30" cy="28" r="9" />
              <circle cx="30" cy="52" r="9" />
              <circle cx="18" cy="40" r="9" />
              <circle cx="42" cy="40" r="9" />
            </g>
            <circle cx="30" cy="40" r="8" fill="#ffe9a8" />
          </g>
        </>
      )}

      {kind === 1 && (
        <>
          <FlowerStemAndLeaves />
          <g className="g-bloom">
            <path d="M17 24q0 24 13 24t13-24l-7 7-6-12-6 12z" fill={color} />
          </g>
        </>
      )}

      {kind === 2 && (
        <>
          <FlowerStemAndLeaves />
          <g className="g-bloom">
            <g fill={color}>
              {DAISY_ANGLES.map((deg) => (
                <ellipse
                  key={deg}
                  cx="30"
                  cy="25"
                  rx="3.6"
                  ry="11"
                  transform={`rotate(${deg} 30 40)`}
                />
              ))}
            </g>
            <circle cx="30" cy="40" r="6.5" fill="#ffd98a" />
          </g>
        </>
      )}

      {kind === 3 && (
        <>
          <FlowerStemAndLeaves />
          <g className="g-bloom">
            <g fill={color}>
              <circle cx="30" cy="38" r="15" />
              <circle cx="20" cy="30" r="8" />
              <circle cx="40" cy="30" r="8" />
              <circle cx="22" cy="46" r="8" />
              <circle cx="38" cy="46" r="8" />
            </g>
          </g>
        </>
      )}

      {kind === 4 && (
        <>
          <MushroomBase stemX={24} stemWidth={12} />
          <g className="g-bloom">
            <path d="M6 64a24 24 0 0 1 48 0z" fill={color} />
            <circle cx="20" cy="54" r="3.5" fill="#fff" />
            <circle cx="34" cy="48" r="3" fill="#fff" />
            <circle cx="42" cy="58" r="2.5" fill="#fff" />
          </g>
        </>
      )}

      {kind === 5 && (
        <>
          <MushroomBase stemX={26} stemWidth={8} />
          <g className="g-bloom">
            <path d="M2 66a28 16 0 0 1 56 0z" fill={color} />
            <circle cx="18" cy="60" r="2.5" fill="#fff" />
            <circle cx="32" cy="56" r="3" fill="#fff" />
            <circle cx="46" cy="61" r="2.5" fill="#fff" />
          </g>
        </>
      )}

      {kind === 6 && (
        <>
          <MushroomBase stemX={25} stemWidth={10} />
          <g className="g-bloom">
            <path d="M10 66q0-34 20-48 20 14 20 48z" fill={color} />
            <circle cx="26" cy="46" r="3" fill="#fff" />
            <circle cx="36" cy="36" r="2.5" fill="#fff" />
            <circle cx="38" cy="54" r="2.5" fill="#fff" />
          </g>
        </>
      )}
    </svg>
  );
}

function isActivateKey(event: ReactKeyboardEvent) {
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
}

export default function OgrodActivity() {
  const [env] = useState<SceneEnvironment>(createEnvironment);
  const [plants, setPlants] = useState<PlantItem[]>([]);
  const [paused, setPaused] = useState(false);

  const gardenRef = useRef<HTMLDivElement>(null);
  const plantsRef = useRef<PlantItem[]>([]);
  const lockedRef = useRef(false);
  const nextIdRef = useRef(1);
  const timersRef = useRef<number[]>([]);

  const scheduleLater = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
  }, []);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      for (const id of timersRef.current) {
        window.clearTimeout(id);
      }
      timersRef.current = [];
    };
  }, []);

  const commitPlants = useCallback((next: PlantItem[]) => {
    plantsRef.current = next;
    setPlants(next);
  }, []);

  const scheduleRemoveIds = useCallback(
    (ids: number[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      scheduleLater(() => {
        commitPlants(plantsRef.current.filter((p) => !idSet.has(p.id)));
      }, FADE_MS);
    },
    [commitPlants, scheduleLater],
  );

  const plantAt = useCallback(
    (xPct: number, yPct: number) => {
      if (lockedRef.current) return;

      const current = plantsRef.current;
      const live = current.filter((p) => !p.fading);
      const alreadyFading = current.filter((p) => p.fading);

      let fadingCount = alreadyFading.length;
      const toFadeIds: number[] = [];
      const toDropIds = new Set<number>();

      while (live.length >= MAX_PLANTS) {
        const oldest = live.shift()!;
        if (fadingCount < MAX_FADING) {
          fadingCount++;
          toFadeIds.push(oldest.id);
        } else {
          toDropIds.add(oldest.id);
        }
      }

      const fadeSet = new Set(toFadeIds);
      const kind = Math.floor(Math.random() * 7);
      const palette = kind < 4 ? PASTELS : CAPS;
      const newPlant: PlantItem = {
        id: nextIdRef.current++,
        kind,
        color: randomFrom(palette),
        x: xPct,
        y: yPct,
        scale: 0.8 + Math.random() * 0.4,
        fading: false,
      };

      const updated = current
        .filter((p) => !toDropIds.has(p.id))
        .map((p) => (fadeSet.has(p.id) ? { ...p, fading: true } : p));
      updated.push(newPlant);

      commitPlants(updated);
      scheduleRemoveIds(toFadeIds);
    },
    [commitPlants, scheduleRemoveIds],
  );

  const clearGarden = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;

    const current = plantsRef.current;
    let fadingCount = current.filter((p) => p.fading).length;
    const toFadeIds: number[] = [];
    const next: PlantItem[] = [];

    for (const item of current) {
      if (item.fading) {
        next.push(item);
      } else if (fadingCount < MAX_FADING) {
        fadingCount++;
        toFadeIds.push(item.id);
        next.push({ ...item, fading: true });
      }
      // Excess live plants beyond MAX_FADING are omitted immediately
    }

    commitPlants(next);
    scheduleRemoveIds(toFadeIds);
    scheduleLater(() => {
      lockedRef.current = false;
    }, FADE_MS);
  }, [commitPlants, scheduleLater, scheduleRemoveIds]);

  const handleLawnPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (lockedRef.current || !gardenRef.current) return;
    const rect = gardenRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPct = ((event.clientX - rect.left) / rect.width) * 100;
    const yPct = ((event.clientY - rect.top) / rect.height) * 100;
    plantAt(xPct, yPct);
  };

  const handleLawnKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isActivateKey(event)) return;
    event.preventDefault();
    plantAt(10 + Math.random() * 80, 60 + Math.random() * 36);
  };

  const handleCloudPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    clearGarden();
  };

  const handleCloudKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isActivateKey(event)) return;
    event.preventDefault();
    event.stopPropagation();
    clearGarden();
  };

  const { combo, stars, drops, fireflies } = env;

  return (
    <div className="act-stage stage">
      <div
        ref={gardenRef}
        className={`garden wx-${combo.w} tod-${combo.t}${paused ? ' paused' : ''}`}
        role="group"
        aria-label="Ogród z kwiatami"
      >
        <div className="g-sky" />

        {/* Decorative weather layer */}
        <div className="g-wx" aria-hidden="true">
          {stars.map((star, idx) => (
            <i
              key={idx}
              className="g-star"
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
                animationDelay: star.delay,
              }}
            />
          ))}

          {(combo.w === 'sunny' || combo.w === 'breeze') && <i className="g-orb" />}

          {(combo.w === 'cloudy' || combo.w === 'rain') && (
            <>
              <i className="g-bank g-bank1" />
              <i className="g-bank g-bank2" />
            </>
          )}

          {drops.map((drop, idx) => (
            <i
              key={idx}
              className="g-drop"
              style={{
                left: drop.left,
                animationDuration: drop.duration,
                animationDelay: drop.delay,
              }}
            />
          ))}

          {fireflies.length > 0 &&
            fireflies.map((fly, idx) => (
              <i
                key={idx}
                className="g-firefly"
                style={{
                  left: fly.left,
                  top: fly.top,
                  animationDuration: fly.duration,
                  animationDelay: fly.delay,
                }}
              />
            ))}

          {combo.w === 'breeze' &&
            [0, 1, 2, 3].map((k) => (
              <i
                key={k}
                className="g-wind"
                style={{
                  top: `${14 + k * 11}%`,
                  animationDelay: `-${(k * 1.7).toFixed(1)}s`,
                }}
              />
            ))}
        </div>

        {/* Interactive lawn */}
        <div
          className="g-lawn"
          role="button"
          tabIndex={0}
          aria-label="Trawnik – posadź roślinę"
          onPointerDown={handleLawnPointerDown}
          onKeyDown={handleLawnKeyDown}
        />

        {/* Planted flowers & mushrooms */}
        <div className="g-plants" aria-hidden="true">
          {plants.map((plant) => (
            <div
              key={plant.id}
              className={`g-plant${plant.fading ? ' fading' : ''}`}
              style={
                {
                  left: `${plant.x.toFixed(2)}%`,
                  top: `${plant.y.toFixed(2)}%`,
                  '--s': plant.scale.toFixed(2),
                } as CSSProperties
              }
            >
              <PlantGraphic kind={plant.kind} color={plant.color} />
            </div>
          ))}
        </div>

        {/* Drifting reset cloud */}
        <div
          className="g-cloud"
          role="button"
          tabIndex={0}
          aria-label="Chmurka – wyczyść ogród"
          onPointerDown={handleCloudPointerDown}
          onKeyDown={handleCloudKeyDown}
        >
          <svg viewBox="0 0 120 60" aria-hidden="true" focusable="false">
            <g fill="#fff">
              <ellipse cx="60" cy="38" rx="48" ry="16" />
              <circle cx="42" cy="30" r="18" />
              <circle cx="70" cy="24" r="22" />
              <circle cx="92" cy="34" r="14" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
