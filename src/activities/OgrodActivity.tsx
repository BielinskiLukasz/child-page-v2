import {
  useCallback,
  useEffect,
  useId,
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

interface GrassSpec {
  id: number;
  left: string;
  top: string;
  width: string;
  rotate: string;
  opacity: string;
}

interface DewSpec {
  id: number;
  left: string;
  top: string;
  size: string;
  delay: string;
}

interface PuddleSpec {
  id: number;
  left: string;
  top: string;
  width: string;
  delay: string;
}

interface SeedSpec {
  id: number;
  top: string;
  delay: string;
  duration: string;
}

interface MistSpec {
  id: number;
  left: string;
  top: string;
  width: string;
  delay: string;
}

interface SceneEnvironment {
  combo: WeatherCombo;
  stars: StarSpec[];
  drops: DropSpec[];
  fireflies: FireflySpec[];
  grass: GrassSpec[];
  dew: DewSpec[];
  puddles: PuddleSpec[];
  seeds: SeedSpec[];
  mist: MistSpec[];
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

  const grass: GrassSpec[] = [];
  for (let i = 0; i < 42; i++) {
    grass.push({
      id: i,
      left: `${(2 + Math.random() * 96).toFixed(1)}%`,
      top: `${(59 + Math.random() * 38).toFixed(1)}%`,
      width: `${(13 + Math.random() * 16).toFixed(1)}px`,
      rotate: `${(-15 + Math.random() * 30).toFixed(1)}deg`,
      opacity: (0.34 + Math.random() * 0.42).toFixed(2),
    });
  }

  const dew: DewSpec[] = [];
  if (combo.t === 'day' && (combo.w === 'sunny' || combo.w === 'breeze')) {
    for (let i = 0; i < 14; i++) {
      dew.push({
        id: i,
        left: `${(4 + Math.random() * 92).toFixed(1)}%`,
        top: `${(61 + Math.random() * 33).toFixed(1)}%`,
        size: `${(2.5 + Math.random() * 3).toFixed(1)}px`,
        delay: `-${(Math.random() * 5).toFixed(2)}s`,
      });
    }
  }

  const puddles: PuddleSpec[] = [];
  if (combo.w === 'rain') {
    const positions = [
      [23, 76, 20],
      [68, 87, 25],
      [84, 65, 14],
    ];
    positions.forEach(([left, top, width], id) => {
      puddles.push({
        id,
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        delay: `-${(id * 1.4).toFixed(1)}s`,
      });
    });
  }

  const seeds: SeedSpec[] = [];
  if (combo.w === 'breeze') {
    for (let i = 0; i < 7; i++) {
      seeds.push({
        id: i,
        top: `${(49 + Math.random() * 37).toFixed(1)}%`,
        delay: `-${(Math.random() * 9).toFixed(2)}s`,
        duration: `${(8 + Math.random() * 5).toFixed(2)}s`,
      });
    }
  }

  const mist: MistSpec[] = [];
  if (combo.t === 'night') {
    for (let i = 0; i < 3; i++) {
      mist.push({
        id: i,
        left: `${(-12 + i * 24).toFixed(1)}%`,
        top: `${(58 + i * 11).toFixed(1)}%`,
        width: `${(48 + Math.random() * 24).toFixed(1)}%`,
        delay: `-${(i * 4).toFixed(1)}s`,
      });
    }
  }

  return { combo, stars, drops, fireflies, grass, dew, puddles, seeds, mist };
}

function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const base = (value >> shift) & 255;
    return Math.max(0, Math.min(255, Math.round(base + 255 * amount)));
  };
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

function CloudArt() {
  return (
    <svg viewBox="0 0 140 76" aria-hidden="true" focusable="false">
      <g className="g-cloud-shadow" transform="translate(0 5)">
        <ellipse cx="70" cy="50" rx="55" ry="17" />
        <circle cx="45" cy="40" r="23" />
        <circle cx="76" cy="31" r="29" />
        <circle cx="106" cy="43" r="18" />
      </g>
      <g className="g-cloud-body">
        <ellipse cx="70" cy="48" rx="55" ry="17" />
        <circle cx="45" cy="38" r="23" />
        <circle cx="76" cy="29" r="29" />
        <circle cx="106" cy="41" r="18" />
      </g>
      <ellipse className="g-cloud-shine" cx="66" cy="17" rx="17" ry="8" transform="rotate(-18 66 17)" />
      <path className="g-cloud-under" d="M20 49q23 14 48 6t52-1q-8 16-49 16T20 49Z" />
    </svg>
  );
}

function OrbArt({ night }: { night: boolean }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <circle className="g-orb-halo" cx="60" cy="60" r="51" />
      {!night && (
        <g className="g-orb-rays">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M60 4v13" transform={`rotate(${i * 30} 60 60)`} />
          ))}
        </g>
      )}
      <circle className="g-orb-disc" cx="60" cy="60" r={night ? 32 : 29} />
      <ellipse className="g-orb-shine" cx="49" cy="47" rx="11" ry="7" transform="rotate(-28 49 47)" />
      {night && (
        <g className="g-moon-craters">
          <circle cx="48" cy="69" r="6" />
          <circle cx="72" cy="45" r="4.5" />
          <circle cx="75" cy="72" r="3" />
        </g>
      )}
    </svg>
  );
}

function GardenLandscape({ id, night }: { id: string; night: boolean }) {
  return (
    <svg
      className="g-landscape"
      viewBox="0 0 1000 600"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-far`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#4c6680' : '#a9d5b3'} />
          <stop offset="1" stopColor={night ? '#3c596b' : '#8fc29b'} />
        </linearGradient>
        <linearGradient id={`${id}-mid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#477763' : '#9fd39b'} />
          <stop offset="1" stopColor={night ? '#386252' : '#82bd84'} />
        </linearGradient>
        <linearGradient id={`${id}-near`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#579076' : '#b9e4a7'} />
          <stop offset="0.55" stopColor={night ? '#4b816b' : '#a2d696'} />
          <stop offset="1" stopColor={night ? '#3f705e' : '#8bc57e'} />
        </linearGradient>
        <radialGradient id={`${id}-meadow-light`} cx="0.24" cy="0.05" r="0.95">
          <stop offset="0" stopColor={night ? '#b8e8df' : '#fff8c9'} stopOpacity={night ? 0.15 : 0.34} />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path
        className="g-far-hill"
        d="M0 326Q105 255 226 306T466 296T710 285T1000 316V600H0Z"
        fill={`url(#${id}-far)`}
      />
      <path
        className="g-far-snow"
        d="M188 289q22-14 38 17l-14-4-9 7-8-9-12 5 5-16Zm471-19q28-12 51 15l-18-3-11 8-10-10-13 4 1-14Z"
      />

      <g className="g-distant-trees">
        <g transform="translate(104 294)">
          <path d="M0 34V11" />
          <circle cx="0" cy="4" r="17" />
          <circle cx="-11" cy="13" r="12" />
          <circle cx="12" cy="13" r="13" />
        </g>
        <g transform="translate(828 284) scale(.8)">
          <path d="M0 42V5" />
          <path d="M0-26-20 16h40Z" />
          <path d="M0-8-24 30h48Z" />
        </g>
        <g transform="translate(890 296) scale(.62)">
          <path d="M0 34V11" />
          <circle cx="0" cy="4" r="17" />
          <circle cx="-11" cy="13" r="12" />
          <circle cx="12" cy="13" r="13" />
        </g>
      </g>

      <path
        className="g-mid-hill"
        d="M0 364Q146 296 302 349T602 340T1000 348V600H0Z"
        fill={`url(#${id}-mid)`}
      />
      <path
        className="g-near-hill"
        d="M0 389Q173 331 362 373T706 364T1000 382V600H0Z"
        fill={`url(#${id}-near)`}
      />
      <path
        className="g-meadow-light"
        d="M0 389Q173 331 362 373T706 364T1000 382V600H0Z"
        fill={`url(#${id}-meadow-light)`}
      />
      <path
        className="g-hill-contour"
        d="M0 389Q173 331 362 373T706 364T1000 382"
      />
    </svg>
  );
}

function FlowerStemAndLeaves({ uid }: { uid: string }) {
  return (
    <>
      <g className="g-stem">
        <path
          d="M30 100C28 83 32 62 30 42"
          stroke={`url(#${uid}-stem)`}
          strokeWidth={5.5}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M28.8 96C29.4 79 31.2 61 30 46"
          stroke="#e2f5d5"
          strokeOpacity=".48"
          strokeWidth={1.2}
          strokeLinecap="round"
          fill="none"
        />
      </g>
      <g className="g-leaves">
        <path d="M29 80C18 83 9 77 10 68c11-2 19 3 19 12Z" fill={`url(#${uid}-leaf)`} />
        <path d="M30 68c7-12 18-14 23-8-2 10-12 14-23 8Z" fill={`url(#${uid}-leaf)`} />
        <path d="M12 70q8 4 16 9M50 62q-10 3-18 6" className="g-leaf-vein" />
        <path d="M18 72q2-3 5-1" className="g-leaf-shine" />
      </g>
    </>
  );
}

function MushroomBase({ uid }: { uid: string }) {
  return (
    <>
      <g className="g-stem">
        <path
          d="M24 60q-1 20-3 36 9 5 18 0-2-17-3-36Z"
          fill={`url(#${uid}-mush-stem)`}
        />
        <path d="M27 64q-1 17-2 29" className="g-mush-stem-shine" />
      </g>
      <g className="g-leaves">
        <path d="M22 98q-13-1-17-8 12-2 19 6M38 98q12-2 16-9-12-1-18 7" fill={`url(#${uid}-leaf)`} />
        <path d="M8 91q7 1 13 6M51 91q-6 1-11 6" className="g-leaf-vein" />
      </g>
    </>
  );
}

function PlantGraphic({ kind, color, uid }: { kind: number; color: string; uid: string }) {
  const light = shade(color, 0.2);
  const dark = shade(color, -0.14);
  const petal = `url(#${uid}-petal)`;

  return (
    <svg viewBox="0 0 60 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${uid}-stem`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4f9f6c" />
          <stop offset="0.48" stopColor="#91cf8b" />
          <stop offset="1" stopColor="#5da875" />
        </linearGradient>
        <linearGradient id={`${uid}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9e6a4" />
          <stop offset="0.55" stopColor="#83c68a" />
          <stop offset="1" stopColor="#5da579" />
        </linearGradient>
        <radialGradient id={`${uid}-petal`} cx="0.28" cy="0.2" r="0.9">
          <stop offset="0" stopColor={light} />
          <stop offset="0.58" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`${uid}-core`} cx="0.34" cy="0.28" r="0.8">
          <stop offset="0" stopColor="#fff8c9" />
          <stop offset="0.6" stopColor="#ffdf83" />
          <stop offset="1" stopColor="#e6ae58" />
        </radialGradient>
        <linearGradient id={`${uid}-mush-stem`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#dbc8aa" />
          <stop offset="0.42" stopColor="#fff6e7" />
          <stop offset="1" stopColor="#d5bfa2" />
        </linearGradient>
      </defs>

      <ellipse className="g-contact-shadow" cx="30" cy="97" rx="21" ry="4.2" />

      <g className="g-seed">
        <ellipse cx="30" cy="96" rx="10" ry="4.5" fill="#9a7552" />
        <ellipse cx="30" cy="94.5" rx="7" ry="3.2" fill="#b99268" />
        <ellipse cx="29" cy="92.5" rx="4.8" ry="3.4" fill="#7e5e45" />
        <ellipse cx="27.5" cy="91.5" rx="1.5" ry="0.8" fill="#d4b28a" />
        <circle cx="20" cy="95" r="1.2" fill="#c5a075" />
        <circle cx="40" cy="96" r="1" fill="#c5a075" />
      </g>

      {kind < 4 && <FlowerStemAndLeaves uid={uid} />}
      {kind >= 4 && <MushroomBase uid={uid} />}

      {kind === 0 && (
        <g className="g-bloom">
          <g transform="translate(30 39)">
            <ellipse cx="0" cy="-14" rx="10" ry="15" fill={petal} transform="rotate(-5)" />
            <ellipse cx="14" cy="0" rx="15" ry="10" fill={petal} transform="rotate(5 14 0)" />
            <ellipse cx="0" cy="14" rx="10" ry="15" fill={petal} transform="rotate(5)" />
            <ellipse cx="-14" cy="0" rx="15" ry="10" fill={petal} transform="rotate(-5 -14 0)" />
            <circle r="10.5" fill={`url(#${uid}-core)`} />
            <g className="g-pollen">
              <circle cx="-3" cy="-2" r="1.3" />
              <circle cx="3" cy="-3" r="1.2" />
              <circle cx="4" cy="3" r="1.1" />
              <circle cx="-3" cy="4" r="1" />
              <circle cx="0" cy="0" r="1.2" />
            </g>
            <path d="M-18-13q4-8 10-9" className="g-petal-shine" />
          </g>
        </g>
      )}

      {kind === 1 && (
        <g className="g-bloom">
          <path d="M15 22q-1 29 15 29t15-29l-8 7-7-14-7 14Z" fill={petal} />
          <path d="M30 15q-13 7-11 28 3 8 11 8Z" fill={light} opacity=".72" />
          <path d="M30 15q13 7 11 28-3 8-11 8Z" fill={dark} opacity=".34" />
          <path d="M30 17q-5 12-3 31" className="g-petal-shine" />
          <path d="M17 24q-1 18 6 23" className="g-petal-vein" />
        </g>
      )}

      {kind === 2 && (
        <g className="g-bloom">
          <g transform="translate(30 39)">
            {Array.from({ length: 12 }, (_, i) => (
              <ellipse
                key={i}
                cx="0"
                cy="-15"
                rx="4.1"
                ry="13"
                fill={petal}
                transform={`rotate(${i * 30})`}
              />
            ))}
            <circle r="8.5" fill={`url(#${uid}-core)`} />
            <g className="g-pollen">
              <circle cx="-3" cy="-2" r="1.1" />
              <circle cx="2" cy="-3" r="1.1" />
              <circle cx="3" cy="2" r="1.2" />
              <circle cx="-2" cy="3" r="1" />
              <circle cx="0" cy="0" r="1" />
            </g>
          </g>
        </g>
      )}

      {kind === 3 && (
        <g className="g-bloom">
          <g transform="translate(30 39)">
            <circle cx="0" cy="-12" r="11" fill={petal} />
            <circle cx="11" cy="-6" r="11" fill={petal} />
            <circle cx="12" cy="7" r="11" fill={petal} />
            <circle cx="0" cy="13" r="11" fill={petal} />
            <circle cx="-12" cy="7" r="11" fill={petal} />
            <circle cx="-11" cy="-6" r="11" fill={petal} />
            <circle r="13" fill={petal} />
            <ellipse cx="-5" cy="-8" rx="6" ry="4" fill="#ffffff" opacity=".25" transform="rotate(-25 -5 -8)" />
            <g className="g-pollen">
              <circle cx="-3" cy="-1" r="1.2" />
              <circle cx="3" cy="-3" r="1.1" />
              <circle cx="4" cy="3" r="1.2" />
              <circle cx="-2" cy="4" r="1" />
            </g>
          </g>
        </g>
      )}

      {kind === 4 && (
        <g className="g-bloom">
          <path d="M5 64a25 25 0 0 1 50 0Z" fill={petal} />
          <path d="M8 63q22 7 44 0-3 8-22 8T8 63Z" fill="#e8d7c1" opacity=".8" />
          <path d="M15 65l4 5M24 66l1 5M35 66l-1 5M44 65l-3 5" className="g-mush-gills" />
          <g className="g-mush-spots">
            <ellipse cx="18" cy="53" rx="4" ry="3.3" />
            <ellipse cx="32" cy="44" rx="3.5" ry="3" />
            <ellipse cx="43" cy="55" rx="3" ry="2.5" />
            <ellipse cx="27" cy="58" rx="2" ry="1.7" />
          </g>
          <path d="M12 52q4-12 14-15" className="g-cap-shine" />
        </g>
      )}

      {kind === 5 && (
        <g className="g-bloom">
          <path d="M2 64a28 18 0 0 1 56 0Z" fill={petal} />
          <path d="M4 63q26 8 52 0-4 8-26 8T4 63Z" fill="#e8d7c1" opacity=".78" />
          <path d="M13 65l5 4M25 66l2 5M38 66l-2 5M49 65l-4 4" className="g-mush-gills" />
          <g className="g-mush-spots">
            <ellipse cx="17" cy="57" rx="3" ry="2.4" />
            <ellipse cx="33" cy="51" rx="3.5" ry="2.8" />
            <ellipse cx="45" cy="58" rx="2.4" ry="2" />
          </g>
          <path d="M10 57q8-12 22-13" className="g-cap-shine" />
        </g>
      )}

      {kind === 6 && (
        <g className="g-bloom">
          <path d="M10 65q0-35 20-50 20 15 20 50Z" fill={petal} />
          <path d="M12 64q18 8 36 0-3 8-18 8t-18-8Z" fill="#e8d7c1" opacity=".78" />
          <path d="M19 66l3 5M29 67v5M40 66l-3 5" className="g-mush-gills" />
          <g className="g-mush-spots">
            <ellipse cx="25" cy="45" rx="3" ry="2.6" />
            <ellipse cx="35" cy="33" rx="2.5" ry="2.2" />
            <ellipse cx="38" cy="54" rx="2.6" ry="2.2" />
          </g>
          <path d="M17 52q2-19 12-30" className="g-cap-shine" />
        </g>
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
  const [clearPulse, setClearPulse] = useState(false);
  const sceneId = useId().replace(/[^a-zA-Z0-9]/g, '');

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
    setClearPulse(true);

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
    }

    commitPlants(next);
    scheduleRemoveIds(toFadeIds);
    scheduleLater(() => {
      lockedRef.current = false;
      setClearPulse(false);
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

  const { combo, stars, drops, fireflies, grass, dew, puddles, seeds, mist } = env;
  const night = combo.t === 'night';

  return (
    <div className="act-stage stage">
      <div
        ref={gardenRef}
        className={`garden wx-${combo.w} tod-${combo.t}${paused ? ' paused' : ''}`}
        role="group"
        aria-label="Ogród z kwiatami"
      >
        <div className="g-sky" />
        <GardenLandscape id={sceneId} night={night} />

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

          {(combo.w === 'sunny' || combo.w === 'breeze') && (
            <i className="g-orb">
              <OrbArt night={night} />
            </i>
          )}

          {(combo.w === 'cloudy' || combo.w === 'rain') && (
            <>
              <i className="g-bank g-bank1">
                <CloudArt />
              </i>
              <i className="g-bank g-bank2">
                <CloudArt />
              </i>
            </>
          )}

          {!night && combo.w !== 'rain' && (
            <>
              <i className="g-bird g-bird1">
                <svg viewBox="0 0 40 22">
                  <path d="M2 14Q10 3 20 14Q30 3 38 14" />
                </svg>
              </i>
              <i className="g-bird g-bird2">
                <svg viewBox="0 0 40 22">
                  <path d="M2 14Q10 3 20 14Q30 3 38 14" />
                </svg>
              </i>
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

          {seeds.map((seed) => (
            <i
              key={seed.id}
              className="g-seed-drift"
              style={{
                top: seed.top,
                animationDelay: seed.delay,
                animationDuration: seed.duration,
              }}
            />
          ))}

          {mist.map((cloud) => (
            <i
              key={cloud.id}
              className="g-mist"
              style={{
                left: cloud.left,
                top: cloud.top,
                width: cloud.width,
                animationDelay: cloud.delay,
              }}
            />
          ))}

          {fireflies.map((fly, idx) => (
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
        </div>

        {puddles.length > 0 && (
          <div className="g-puddles" aria-hidden="true">
            {puddles.map((puddle) => (
              <i
                key={puddle.id}
                className="g-puddle"
                style={{ left: puddle.left, top: puddle.top, width: puddle.width }}
              >
                <i className="g-puddle-ring" style={{ animationDelay: puddle.delay }} />
              </i>
            ))}
          </div>
        )}

        <div className="g-tufts" aria-hidden="true">
          {grass.map((tuft) => (
            <i
              key={tuft.id}
              className="g-tuft"
              style={{
                left: tuft.left,
                top: tuft.top,
                width: tuft.width,
                opacity: tuft.opacity,
                transform: `translate(-50%, -100%) rotate(${tuft.rotate})`,
              }}
            >
              <svg viewBox="0 0 26 32">
                <path d="M13 31Q10 17 3 8M13 31Q14 14 13 2M13 31Q17 17 24 9" />
                <path d="M13 31Q7 22 2 21M13 31Q20 24 25 22" className="g-tuft-light" />
              </svg>
            </i>
          ))}
        </div>

        {dew.length > 0 && (
          <div className="g-dew-layer" aria-hidden="true">
            {dew.map((drop) => (
              <i
                key={drop.id}
                className="g-dew"
                style={{
                  left: drop.left,
                  top: drop.top,
                  width: drop.size,
                  height: drop.size,
                  animationDelay: drop.delay,
                }}
              />
            ))}
          </div>
        )}

        <div
          className="g-lawn"
          role="button"
          tabIndex={0}
          aria-label="Trawnik – posadź roślinę"
          onPointerDown={handleLawnPointerDown}
          onKeyDown={handleLawnKeyDown}
        />

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
              <PlantGraphic kind={plant.kind} color={plant.color} uid={`p${plant.id}`} />
            </div>
          ))}
        </div>

        <svg
          className="g-front-grass"
          viewBox="0 0 1000 180"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M0 180V124q18-46 24 2 15-77 29-4 19-52 27 5 18-29 25 3 15-61 29-1 17-38 27 5 20-25 28 4 17-55 28-2 18-38 29 5v45Zm1000 0V124q-18-46-24 2-15-77-29-4-19-52-27 5-18-29-25 3-15-61-29-1-17-38-27 5-20-25-28 4-17-55-28-2-18-38-29 5v45Z" />
          <path d="M0 180q220-27 425-9t575-2v11Z" className="g-front-soil" />
        </svg>

        {clearPulse && <i className="g-clear-ring" aria-hidden="true" />}

        <div
          className="g-cloud"
          role="button"
          tabIndex={0}
          aria-label="Chmurka – wyczyść ogród"
          onPointerDown={handleCloudPointerDown}
          onKeyDown={handleCloudKeyDown}
        >
          <CloudArt />
        </div>
      </div>
    </div>
  );
}
