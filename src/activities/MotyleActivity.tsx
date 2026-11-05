import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { pickOne } from '../utils/rand';

// ── Flight and timing (unchanged from child-page/js/motyle.js) ───────────────────
const OMEGA = 2.2;
const TURN = 0.55;
const SWAY_MS = 2200;
const SWAY_AMP = 7;
const IDLE_MIN = 10;
const IDLE_MAX = 15;

// ── Decorative only: never fed back into the flight, sway or idle timing ─────────
const LIFT_TAU = 0.35; // seconds for the altitude cue to settle
const TRAIL_EVERY = 0.07; // seconds between pollen trail particles
const POOL = 24; // fixed particle pool

interface FlowerLayout {
  x: number;
  y: number;
  n: number;
}

// Flower layout: petal count (n) differs per flower, so shapes stay distinguishable whatever the colours are.
const FLOWERS: readonly FlowerLayout[] = [
  { x: 0.22, y: 0.24, n: 6 },
  { x: 0.74, y: 0.22, n: 8 },
  { x: 0.48, y: 0.5, n: 5 },
  { x: 0.22, y: 0.7, n: 7 },
  { x: 0.76, y: 0.68, n: 6 },
];

type FlowerColorPair = readonly [string, string];
type FlowerSet = readonly [
  FlowerColorPair,
  FlowerColorPair,
  FlowerColorPair,
  FlowerColorPair,
  FlowerColorPair,
];

const FLOWER_SETS: readonly FlowerSet[] = [
  [
    ['#f7a8c9', '#ffe9a8'],
    ['#ffd98a', '#f2b7a0'],
    ['#c9b8f2', '#fff3c4'],
    ['#ffb7a5', '#ffe9a8'],
    ['#a8d8f0', '#fff3c4'],
  ],
  [
    ['#ffd98a', '#f2b7a0'],
    ['#a8d8f0', '#fff3c4'],
    ['#f7a8c9', '#ffe9a8'],
    ['#c9b8f2', '#fff3c4'],
    ['#ffb7a5', '#ffe9a8'],
  ],
  [
    ['#ffb7a5', '#fff3c4'],
    ['#ffb7a5', '#ffe9a8'],
    ['#ffd98a', '#f2b7a0'],
    ['#ffd98a', '#c9b8f2'],
    ['#f7a8c9', '#ffe9a8'],
  ],
  [
    ['#a8d8f0', '#ffe9a8'],
    ['#c9b8f2', '#fff3c4'],
    ['#a8d8f0', '#f7a8c9'],
    ['#c9b8f2', '#ffe9a8'],
    ['#b7e4c7', '#fff3c4'],
  ],
  [
    ['#b7e4c7', '#ffe9a8'],
    ['#ffd98a', '#f7a8c9'],
    ['#b7e4c7', '#f2b7a0'],
    ['#a8d8f0', '#ffe9a8'],
    ['#ffb7a5', '#fff3c4'],
  ],
  [
    ['#fff3c4', '#f2b7a0'],
    ['#f7a8c9', '#fff3c4'],
    ['#fff3c4', '#c9b8f2'],
    ['#ffd98a', '#f7a8c9'],
    ['#c9b8f2', '#ffe9a8'],
  ],
];

type ButterflySet = readonly [string, string];

// Butterfly sets: [upper (fore) wing, lower (hind) wing]
const BUTTERFLY_SETS: readonly ButterflySet[] = [
  ['#f7a8c9', '#c9b8f2'],
  ['#ffd98a', '#f2a07a'],
  ['#a8d8f0', '#7fb8e8'],
  ['#b7e4c7', '#f7e08a'],
  ['#ffb7a5', '#f7a8c9'],
  ['#c9b8f2', '#a8d8f0'],
];

function randomIdleLimit(): number {
  return IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN);
}

function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const base = (value >> shift) & 255;
    return Math.max(0, Math.min(255, Math.round(base + 255 * amount)));
  };
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

// ── Flowers ──────────────────────────────────────────────────────────────────────

// One petal shape per flower position, pointing up from the core at 50,50 (rotated n times).
// The petal count stays the main non-colour cue; the shape is a second one (the two 6-petal flowers now differ).
interface PetalStyle {
  petal: string;
  vein: string;
}

const PETAL_STYLES: readonly PetalStyle[] = [
  // flower 1 (6): wide rounded petals
  { petal: 'M50 45C37 41 33 14 50 6C67 14 63 41 50 45Z', vein: 'M50 41Q49 26 50 13' },
  // flower 2 (8): slim daisy petals
  { petal: 'M50 45C44 37 42.5 11 50 4C57.5 11 56 37 50 45Z', vein: 'M50 41Q50 24 50 10' },
  // flower 3 (5): notched heart petals
  {
    petal: 'M50 45C34 39 29 15 40 8.5C45.5 5.5 49 8.5 50 12.5C51 8.5 54.5 5.5 60 8.5C71 15 66 39 50 45Z',
    vein: 'M50 41Q49.5 28 50 16',
  },
  // flower 4 (7): pointed star petals
  { petal: 'M50 45C40 37 40.5 19 50 3C59.5 19 60 37 50 45Z', vein: 'M50 41Q50 24 50 9' },
  // flower 5 (6): spoon petals
  { petal: 'M50 45C46.5 35 38 23 39.5 13C41 4.5 59 4.5 60.5 13C62 23 53.5 35 50 45Z', vein: 'M50 41Q50 27 50 14' },
];

const STAMENS = Array.from({ length: 10 }, (_, k) => {
  const a = (k / 10) * Math.PI * 2;
  return { x: (50 + Math.cos(a) * 8.6).toFixed(2), y: (50 + Math.sin(a) * 8.6).toFixed(2) };
});

function FlowerArt({
  index,
  n,
  petal,
  core,
  uid,
}: {
  index: number;
  n: number;
  petal: string;
  core: string;
  uid: string;
}) {
  const style = PETAL_STYLES[index % PETAL_STYLES.length];
  const gid = `${uid}-f${index}`;
  const angles = Array.from({ length: n }, (_, k) => Math.round((360 / n) * k));

  return (
    <>
      <defs>
        <linearGradient id={`${gid}-petal`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={shade(petal, -0.07)} />
          <stop offset="0.55" stopColor={petal} />
          <stop offset="1" stopColor={shade(petal, 0.13)} />
        </linearGradient>
        <radialGradient id={`${gid}-core`} cx="0.38" cy="0.34" r="0.78">
          <stop offset="0" stopColor="#fffdf2" />
          <stop offset="0.5" stopColor={core} />
          <stop offset="1" stopColor={shade(core, -0.17)} />
        </radialGradient>
        <linearGradient id={`${gid}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c3eab0" />
          <stop offset="0.6" stopColor="#8fcf94" />
          <stop offset="1" stopColor="#66ae7c" />
        </linearGradient>
      </defs>

      {/* Stem, leaves and a grass tuft at the base, so every flower is planted in the meadow. */}
      <ellipse className="m-ground-shadow" cx="50" cy="151" rx="17" ry="3.6" />
      <path className="m-stem" d="M50 56C48 90 53 120 50 150" />
      <path className="m-stem-shine" d="M48.9 60C47.4 92 51.6 120 49 146" />
      <path d="M50 118C38 105 26 109 21 117C29 126 42 126 50 118Z" fill={`url(#${gid}-leaf)`} />
      <path d="M50.5 102C62 89 74 93 79 101C71 110 58 110 50.5 102Z" fill={`url(#${gid}-leaf)`} />
      <path className="m-leaf-vein" d="M48 117.5Q35 114.5 24 117M52.5 101.5Q65 98.5 76 101" />
      <path
        className="m-tuft"
        d="M41 151Q43 141 39 133M50 152Q51.5 139 48.5 129M59 151Q57 142 61.5 134M45.5 151.5Q44 145 42 141M55 151.5Q56.5 145 59 142"
      />

      {/* Petals: a soft drop shadow drawn as geometry, gradient petals with a darker outline, white centre veins. */}
      <g className="m-petal-shadow" transform="translate(1.6 2.8)">
        {angles.map((deg) => (
          <path key={deg} d={style.petal} transform={`rotate(${deg} 50 50)`} />
        ))}
      </g>
      <g
        fill={`url(#${gid}-petal)`}
        stroke={shade(petal, -0.24)}
        strokeWidth="1.4"
        strokeLinejoin="round"
      >
        {angles.map((deg) => (
          <path key={deg} d={style.petal} transform={`rotate(${deg} 50 50)`} />
        ))}
      </g>
      <g className="m-petal-vein">
        {angles.map((deg) => (
          <path key={deg} d={style.vein} transform={`rotate(${deg} 50 50)`} />
        ))}
      </g>

      <circle cx="50" cy="50" r="14" fill={`url(#${gid}-core)`} stroke={shade(core, -0.28)} strokeWidth="1.2" />
      <g fill={shade(core, -0.34)} opacity="0.62">
        {STAMENS.map((st, k) => (
          <circle key={k} cx={st.x} cy={st.y} r="1.25" />
        ))}
      </g>
      <ellipse cx="45.5" cy="45" rx="4.2" ry="2.6" fill="#ffffff" opacity="0.6" transform="rotate(-24 45.5 45)" />
    </>
  );
}

// ── Butterfly ────────────────────────────────────────────────────────────────────

// Left wings in the -50..50 x -40..40 box, hinged at the body axis (x = 0) so the JS flap scale folds them inwards.
const FORE_WING = 'M-3 -8C-14 -28 -34 -38 -44 -31C-50 -26 -47 -12 -39 -6C-28 1 -12 1 -3 -1Z';
const HIND_WING = 'M-3 0C-16 0 -32 2 -34 12C-36 22 -28 32 -18 30C-9 28 -4 18 -3 8Z';

function WingArt({ uid, upper }: { uid: string; upper: string }) {
  return (
    <>
      <path className="m-wing-edge" d={HIND_WING} />
      <path className="m-wing-edge" d={FORE_WING} />
      <path className="m-wing-fill" d={HIND_WING} fill={`url(#${uid}-hind)`} />
      <circle cx="-21" cy="17" r="5.8" fill={upper} stroke="#ffffff" strokeWidth="1.3" />
      <circle cx="-21" cy="17" r="2.2" fill="#fffaf0" />
      <circle cx="-29" cy="10" r="1.7" fill="#fffaf0" opacity="0.85" />
      <path className="m-wing-fill" d={FORE_WING} fill={`url(#${uid}-fore)`} />
      <path
        className="m-wing-vein"
        d="M-5 -5Q-20 -16 -37 -26M-5 -3Q-18 -8 -37 -13M-5 -2Q-15 -1 -29 -2"
        stroke={shade(upper, -0.32)}
      />
      <circle cx="-37" cy="-26" r="2.9" fill="#fffaf0" />
      <circle cx="-42" cy="-17" r="2.2" fill="#fffaf0" />
      <circle cx="-31" cy="-29.5" r="1.8" fill="#fffaf0" opacity="0.9" />
      <path className="m-wing-shine" d="M-12 -21Q-22 -30 -32 -31" />
    </>
  );
}

// ── Scenery (generated once per launch, never stored) ────────────────────────────

interface SeedSpec {
  id: number;
  top: string;
  size: string;
  dur: string;
  delay: string;
}

interface TuftSpec {
  id: number;
  y: number;
  d: string;
  width: string;
  color: string;
}

interface SpeckSpec {
  id: number;
  x: string;
  y: string;
  r: string;
  color: string;
}

interface CloverSpec {
  id: number;
  transform: string;
}

interface PebbleSpec {
  id: number;
  x: number;
  y: number;
  rx: number;
  ry: number;
}

interface Scenery {
  seeds: SeedSpec[];
  tufts: TuftSpec[];
  specks: SpeckSpec[];
  clovers: CloverSpec[];
  pebbles: PebbleSpec[];
}

const TUFT_COLORS = ['#7cbf74', '#8ccb80', '#6fb169'] as const;
const SPECK_COLORS = ['#ffffff', '#fff3b0', '#ffd9e6'] as const;

// The meadow-detail SVG spans the play square from 60% left of it to 60% right of it, and from the horizon
// (36% of the square) to 10% below it, at 1000 units per square width.
const meadowX = (bx: number) => (bx + 0.6) * 1000;
const meadowY = (by: number) => (by - 0.36) * 1000;

function createScenery(): Scenery {
  const tufts: TuftSpec[] = [];
  for (let i = 0; i < 34; i++) {
    const by = 0.39 + Math.pow(Math.random(), 0.85) * 0.68;
    const x = meadowX(-0.55 + Math.random() * 2.1);
    const y = meadowY(by);
    const s = 22 + 46 * Math.min(1, (by - 0.36) / 0.72);
    const blade = (dx: number, h: number, lean: number) =>
      `M${(x + dx).toFixed(1)} ${y.toFixed(1)}Q${(x + dx + lean * 0.3).toFixed(1)} ${(y - h * 0.55).toFixed(1)} ${(x + dx + lean).toFixed(1)} ${(y - h).toFixed(1)}`;
    tufts.push({
      id: i,
      y,
      d:
        blade(-s * 0.14, s * 0.74, -s * 0.34) +
        blade(0, s, s * 0.05) +
        blade(s * 0.14, s * 0.8, s * 0.36) +
        (i % 2 === 0 ? blade(s * 0.06, s * 0.56, s * 0.52) : ''),
      width: (s * 0.09).toFixed(2),
      color: TUFT_COLORS[i % TUFT_COLORS.length],
    });
  }
  // Farther tufts first, so nearer ones are drawn on top.
  tufts.sort((a, b) => a.y - b.y);

  const specks: SpeckSpec[] = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: meadowX(-0.5 + Math.random() * 2).toFixed(1),
    y: meadowY(0.375 + Math.random() * 0.095).toFixed(1),
    r: (5 + Math.random() * 3).toFixed(1),
    color: SPECK_COLORS[i % SPECK_COLORS.length],
  }));

  const clovers: CloverSpec[] = Array.from({ length: 6 }, (_, i) => {
    const by = 0.62 + Math.random() * 0.42;
    const k = 1.6 + 1.3 * Math.min(1, (by - 0.36) / 0.72);
    return {
      id: i,
      transform: `translate(${meadowX(-0.45 + Math.random() * 1.9).toFixed(1)} ${meadowY(by).toFixed(1)}) rotate(${(-20 + Math.random() * 40).toFixed(1)}) scale(${k.toFixed(2)})`,
    };
  });

  const pebbles: PebbleSpec[] = Array.from({ length: 4 }, (_, i) => {
    const rx = 9 + Math.random() * 6;
    return {
      id: i,
      x: meadowX(-0.4 + Math.random() * 1.8),
      y: meadowY(0.72 + Math.random() * 0.34),
      rx,
      ry: rx * (0.55 + Math.random() * 0.15),
    };
  });

  const seeds: SeedSpec[] = Array.from({ length: 6 }, (_, i) => {
    const dur = 22 + Math.random() * 10;
    return {
      id: i,
      top: `${(10 + Math.random() * 22).toFixed(1)}%`,
      size: `${(10 + Math.random() * 5).toFixed(1)}px`,
      dur: `${dur.toFixed(1)}s`,
      delay: `-${(Math.random() * dur).toFixed(1)}s`,
    };
  });

  return { seeds, tufts, specks, clovers, pebbles };
}

const CLOUDS = [
  { top: '7%', width: 'clamp(104px, 24vmin, 232px)', x0: '8vw', dur: '170s', delay: '-26s' },
  { top: '16%', width: 'clamp(80px, 17vmin, 168px)', x0: '58vw', dur: '210s', delay: '-128s' },
  { top: '3%', width: 'clamp(70px, 14vmin, 140px)', x0: '36vw', dur: '240s', delay: '-80s' },
] as const;

// Hills: 4000 x 200 units = four play-square widths by 20% of a square, so the scale is always uniform.
const FAR_TOP =
  'M0 122C200 92 380 76 560 88C760 102 900 70 1080 64C1280 58 1420 92 1600 96C1780 100 1900 66 2080 60' +
  'C2280 54 2420 86 2600 92C2780 98 2920 70 3100 66C3300 62 3480 90 3660 96C3800 100 3920 88 4000 84';
const NEAR_TOP =
  'M0 168C220 152 420 146 620 156C820 166 980 148 1180 144C1380 140 1540 160 1740 162C1940 164 2080 146 2280 142' +
  'C2480 138 2640 158 2840 160C3040 162 3200 146 3400 144C3600 142 3800 156 4000 160';
const TO_BOTTOM = 'V200H0Z';
// [x, base y, crown radius] on the far hill; the central cluster sits above the middle flower.
const TREES: readonly (readonly [number, number, number])[] = [
  [1001, 71, 15],
  [1072, 67, 12],
  [1893, 78, 11],
  [1955, 72, 16],
  [2028, 65, 13],
  [2166, 62, 12],
  [3021, 72, 14],
  [3098, 69, 11],
];

const HEART_LEAF = 'M0 0C-5 -3 -9.5 -8.5 -6.5 -12.5C-4 -15.5 -0.5 -14 0 -11C0.5 -14 4 -15.5 6.5 -12.5C9.5 -8.5 5 -3 0 0Z';

function makeGrass(phase: number, scale: number): string {
  const base = 82;
  let d = `M0 100V${base}`;
  let x = 0;
  let i = phase;
  while (x < 1000) {
    const w = 14 + (i % 4) * 5;
    const h = (20 + ((i * 7) % 6) * 7) * scale;
    const tip = x + w / 2 + ((i % 3) - 1) * 3;
    d += `Q${(x + w * 0.3).toFixed(1)} ${(base - h * 0.4).toFixed(1)} ${tip.toFixed(1)} ${(base - h).toFixed(1)}`;
    d += `Q${(x + w * 0.7).toFixed(1)} ${(base - h * 0.4).toFixed(1)} ${(x + w).toFixed(1)} ${base}`;
    x += w;
    i++;
  }
  return `${d}V100Z`;
}

const GRASS_BACK = makeGrass(1, 1.15);
const GRASS_FRONT = makeGrass(0, 0.85);

function SunArt({ uid }: { uid: string }) {
  return (
    <>
      <span className="m-sun-spin">
        <svg viewBox="0 0 100 100" focusable="false">
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              className={i % 2 === 0 ? 'm-ray' : 'm-ray m-ray-short'}
              d={i % 2 === 0 ? 'M50 7V24' : 'M50 12V24'}
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
        </svg>
      </span>
      <svg className="m-sun-disc" viewBox="0 0 100 100" focusable="false">
        <defs>
          <radialGradient id={`${uid}-sunhalo`}>
            <stop offset="0.4" stopColor="#fff3b8" stopOpacity="0.6" />
            <stop offset="1" stopColor="#fff3b8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-sundisc`} cx="0.38" cy="0.34" r="0.8">
            <stop offset="0" stopColor="#fffbe0" />
            <stop offset="0.6" stopColor="#ffe48a" />
            <stop offset="1" stopColor="#ffc861" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill={`url(#${uid}-sunhalo)`} />
        <circle cx="50" cy="50" r="30" fill={`url(#${uid}-sundisc)`} />
        <path
          d="M33 42a19 19 0 0 1 12-13"
          fill="none"
          stroke="#fffdf0"
          strokeOpacity="0.8"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    </>
  );
}

const CLOUD_PUFFS = (
  <>
    <ellipse cx="70" cy="48" rx="55" ry="17" />
    <circle cx="45" cy="38" r="23" />
    <circle cx="76" cy="29" r="29" />
    <circle cx="106" cy="41" r="18" />
  </>
);

function CloudArt() {
  return (
    <svg viewBox="0 0 140 76" focusable="false">
      <g className="m-cloud-shadow" transform="translate(0 5)">
        {CLOUD_PUFFS}
      </g>
      <g className="m-cloud-body">{CLOUD_PUFFS}</g>
      <path className="m-cloud-under" d="M20 49q23 13 48 6t52-1q-8 15-49 15T20 49Z" />
    </svg>
  );
}

function SeedArt() {
  return (
    <svg viewBox="-10 -10 20 20" focusable="false">
      <path className="m-seed-stalk" d="M0 2V9.5" />
      <g className="m-seed-fluff">
        {Array.from({ length: 8 }, (_, k) => (
          <path key={k} d="M0 0V-8" transform={`rotate(${k * 45})`} />
        ))}
      </g>
      <circle className="m-seed-core" cx="0" cy="1.5" r="1.4" />
    </svg>
  );
}

function Hills() {
  return (
    <svg className="m-hills" viewBox="0 0 4000 200" preserveAspectRatio="none" focusable="false">
      <path className="m-hill-far" d={`${FAR_TOP}${TO_BOTTOM}`} />
      <path className="m-hill-rim" d={FAR_TOP} />
      <g className="m-far-trees">
        {TREES.map(([x, base, r]) => (
          <g key={x}>
            <rect x={x - 2.6} y={base - r * 0.8} width="5.2" height={r * 0.85} rx="2" />
            <circle cx={x} cy={base - r * 1.2} r={r} />
            <circle className="m-tree-shade" cx={x + r * 0.3} cy={base - r * 0.95} r={r * 0.62} />
          </g>
        ))}
      </g>
      <path className="m-hill-near" d={`${NEAR_TOP}${TO_BOTTOM}`} />
      <path className="m-hill-rim m-hill-rim-near" d={NEAR_TOP} />
    </svg>
  );
}

function MeadowArt({ scenery }: { scenery: Scenery }) {
  return (
    <svg className="m-meadow-art" viewBox="0 0 2200 740" preserveAspectRatio="none" focusable="false">
      <g className="m-specks">
        {scenery.specks.map((sp) => (
          <circle key={sp.id} cx={sp.x} cy={sp.y} r={sp.r} fill={sp.color} />
        ))}
      </g>
      {scenery.tufts.map((t) => (
        <path key={t.id} className="m-meadow-tuft" d={t.d} stroke={t.color} strokeWidth={t.width} />
      ))}
      <g className="m-pebbles">
        {scenery.pebbles.map((p) => (
          <g key={p.id}>
            <ellipse cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} rx={p.rx.toFixed(1)} ry={p.ry.toFixed(1)} />
            <ellipse
              className="m-pebble-shine"
              cx={(p.x - p.rx * 0.3).toFixed(1)}
              cy={(p.y - p.ry * 0.35).toFixed(1)}
              rx={(p.rx * 0.38).toFixed(1)}
              ry={(p.ry * 0.3).toFixed(1)}
            />
          </g>
        ))}
      </g>
      {scenery.clovers.map((c) => (
        <g key={c.id} className="m-clover" transform={c.transform}>
          <path className="m-clover-stem" d="M0 0Q2.5 7 0.5 13" />
          {[0, 120, 240].map((a) => (
            <path key={a} d={HEART_LEAF} transform={`rotate(${a})`} />
          ))}
        </g>
      ))}
    </svg>
  );
}

// ── Activity ────────────────────────────────────────────────────────────────────

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  r: number;
}

export default function MotyleActivity() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [palette] = useState(() => ({
    flowerSet: pickOne(FLOWER_SETS, 'motyle-flowers'),
    butterflySet: pickOne(BUTTERFLY_SETS, 'motyle-butterfly'),
  }));
  const [scenery] = useState<Scenery>(createScenery);

  const sceneRef = useRef<HTMLDivElement>(null);
  const butterflyRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const leftWingRef = useRef<SVGGElement>(null);
  const rightWingRef = useRef<SVGGElement>(null);
  const flowerSvgRefs = useRef<(SVGSVGElement | null)[]>([]);
  const flowerBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const particleRefs = useRef<(SVGCircleElement | null)[]>([]);

  const stateRef = useRef({
    rest: 0, // the butterfly always starts on flower 1
    px: FLOWERS[0].x,
    py: FLOWERS[0].y,
    vx: 0,
    vy: 0,
    flying: false,
    dir: 1,
    flapPhase: 0,
    idle: 0,
    idleLimit: randomIdleLimit(),
    swayTimes: FLOWERS.map(() => -1),
    lift: 0, // decorative altitude cue, 0 = resting, 1 = flying
  });

  const triggerFlower = useCallback((index: number) => {
    const s = stateRef.current;
    s.swayTimes[index] = 0;
    s.idle = 0;
    s.idleLimit = randomIdleLimit();
    if (index === s.rest) return; // never "land" on the flower it is already on / heading to
    s.rest = index;
    s.flying = true;
    s.dir = -s.dir;
  }, []);

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const particles: Particle[] = Array.from({ length: POOL }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      life: 1,
      r: 1,
    }));
    let raf = 0;
    let last = 0;
    let trailAcc = 0;
    let hostIdx = -2; // -2 = not yet shown, -1 = butterfly in flight

    const spawn = (x: number, y: number, vx: number, vy: number, life: number, r: number, gold: boolean) => {
      let idx = particles.findIndex((p) => !p.active);
      if (idx < 0) {
        let oldest = -1;
        particles.forEach((p, i) => {
          const k = p.age / p.life;
          if (k > oldest) {
            oldest = k;
            idx = i;
          }
        });
      }
      const p = particles[idx];
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.age = 0;
      p.life = life;
      p.r = r;
      particleRefs.current[idx]?.setAttribute('fill', `url(#${uid}-${gold ? 'pollen' : 'tint'})`);
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05); // a long gap must not make the butterfly jump
      last = now;
      const s = stateRef.current;

      // ── Flight model (unchanged): critically damped spring with a rotated pull ──
      if (s.flying) {
        const target = FLOWERS[s.rest];
        const dx = target.x - s.px;
        const dy = target.y - s.py;
        const angle = TURN * s.dir;
        const c = Math.cos(angle);
        const sn = Math.sin(angle);
        const w2 = OMEGA * OMEGA;
        const ax = w2 * (dx * c - dy * sn) - 2 * OMEGA * s.vx;
        const ay = w2 * (dx * sn + dy * c) - 2 * OMEGA * s.vy;
        s.vx += ax * dt;
        s.vy += ay * dt;
        s.px += s.vx * dt;
        s.py += s.vy * dt;
        if (Math.hypot(dx, dy) < 0.006 && Math.hypot(s.vx, s.vy) < 0.03) {
          s.px = target.x;
          s.py = target.y;
          s.vx = 0;
          s.vy = 0;
          s.flying = false;
          s.idle = 0;
          s.idleLimit = randomIdleLimit();
        }
      } else {
        s.idle += dt; // dt is capped and the loop stops while the tab is hidden, so hidden time never counts
        if (s.idle >= s.idleLimit) {
          const others: number[] = [];
          for (let i = 0; i < FLOWERS.length; i++) {
            if (i !== s.rest) others.push(i);
          }
          s.rest = others[Math.floor(Math.random() * others.length)];
          s.flying = true;
          s.dir = -s.dir;
          s.idle = 0;
          s.idleLimit = randomIdleLimit();
        }
      }

      // Slow, calm flapping; the scale folds both wings toward the body axis.
      s.flapPhase += dt * (s.flying ? 4.5 : 1.8) * Math.PI;
      const wingScale = (0.6 + 0.4 * Math.cos(s.flapPhase)).toFixed(3);
      leftWingRef.current?.setAttribute('transform', `scale(${wingScale} 1)`);
      rightWingRef.current?.setAttribute('transform', `scale(${wingScale} 1)`);
      const tilt = Math.max(-15, Math.min(15, s.vx * 120));

      // ── Decorative altitude cue: slightly larger butterfly and a farther, softer shadow in flight ──
      s.lift += ((s.flying ? 1 : 0) - s.lift) * (1 - Math.exp(-dt / LIFT_TAU));
      const left = `${(s.px * 100).toFixed(3)}%`;
      const top = `${(s.py * 100).toFixed(3)}%`;
      const fly = butterflyRef.current;
      if (fly) {
        fly.style.left = left;
        fly.style.top = top;
        fly.style.transform = `translate(-50%,-50%) rotate(${tilt.toFixed(1)}deg) scale(${(1 + 0.08 * s.lift).toFixed(3)})`;
      }
      const sh = shadowRef.current;
      if (sh) {
        sh.style.left = left;
        sh.style.top = top;
        sh.style.transform = `translate(-50%,-50%) translate(${(8 + 10 * s.lift).toFixed(1)}%,${(16 + 48 * s.lift).toFixed(1)}%) scale(${(0.86 + 0.26 * s.lift).toFixed(3)})`;
        sh.style.opacity = (0.36 - 0.18 * s.lift).toFixed(3);
      }

      // ── Flower sway (unchanged): two damped oscillations around a point below the flower ──
      for (let i = 0; i < FLOWERS.length; i++) {
        if (s.swayTimes[i] < 0) continue;
        s.swayTimes[i] += dt * 1000;
        const svgEl = flowerSvgRefs.current[i];
        if (!svgEl) continue;
        if (s.swayTimes[i] >= SWAY_MS) {
          s.swayTimes[i] = -1;
          svgEl.style.transform = '';
        } else {
          const u = s.swayTimes[i] / SWAY_MS;
          const deg = Math.sin(u * Math.PI * 4) * SWAY_AMP * (1 - u);
          svgEl.style.transform = `rotate(${deg.toFixed(2)}deg)`;
        }
      }

      // ── Host halo, and a pollen puff when the butterfly lands ──
      const host = s.flying ? -1 : s.rest;
      if (host !== hostIdx) {
        flowerBtnRefs.current.forEach((btn, i) => btn?.classList.toggle('host', i === host));
        if (host >= 0 && hostIdx === -1 && !reduced) {
          const f = FLOWERS[host];
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2 + Math.random() * 0.4;
            const sp = 0.05 + Math.random() * 0.035;
            spawn(f.x, f.y, Math.cos(a) * sp, Math.sin(a) * sp - 0.01, 0.8 + Math.random() * 0.3, 0.9 + Math.random() * 0.5, true);
          }
        }
        hostIdx = host;
      }

      // ── Pollen trail while flying ──
      if (s.flying && !reduced) {
        trailAcc += dt;
        const speed = Math.hypot(s.vx, s.vy) || 1;
        while (trailAcc >= TRAIL_EVERY) {
          trailAcc -= TRAIL_EVERY;
          spawn(
            s.px - (s.vx / speed) * 0.025 + (Math.random() - 0.5) * 0.02,
            s.py - (s.vy / speed) * 0.025 + (Math.random() - 0.5) * 0.02 + 0.01,
            (Math.random() - 0.5) * 0.03,
            0.01 + Math.random() * 0.02,
            0.9 + Math.random() * 0.45,
            0.8 + Math.random() * 0.6,
            Math.random() < 0.6,
          );
        }
      } else {
        trailAcc = 0;
      }

      // ── Particles (fixed pool, positions in fractions of the play square) ──
      const damp = Math.pow(0.35, dt);
      for (let i = 0; i < POOL; i++) {
        const p = particles[i];
        if (!p.active) continue;
        const el = particleRefs.current[i];
        p.age += dt;
        if (p.age >= p.life) {
          p.active = false;
          el?.setAttribute('opacity', '0');
          continue;
        }
        p.vx *= damp;
        p.vy = p.vy * damp + 0.012 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (el) {
          const k = 1 - p.age / p.life;
          el.setAttribute('cx', (p.x * 100).toFixed(2));
          el.setAttribute('cy', (p.y * 100).toFixed(2));
          el.setAttribute('r', (p.r * (0.55 + 0.45 * k)).toFixed(2));
          el.setAttribute('opacity', (Math.min(1, p.age / 0.12) * k * 0.95).toFixed(3));
        }
      }

      if (!document.hidden) {
        raf = requestAnimationFrame(frame);
      }
    };

    const start = () => {
      if (raf || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      sceneRef.current?.classList.toggle('paused', document.hidden);
      if (document.hidden) {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      } else {
        start();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();

    return () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [uid]);

  const handlePointerDown = (index: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    triggerFlower(index);
  };

  const handleClick = (index: number, event: ReactMouseEvent<HTMLButtonElement>) => {
    // keyboard activation (Enter/Space) fires click with detail 0; pointer input is handled in pointerdown
    if (event.detail === 0) {
      triggerFlower(index);
    }
  };

  const { flowerSet, butterflySet } = palette;
  const [upper, lower] = butterflySet;

  return (
    <div className="act-stage stage">
      <div ref={sceneRef} className="m-scene">
        {/* Screen-anchored sky decoration: sun below the hourglass, drifting clouds and dandelion seeds. */}
        <div className="m-sky-decor" aria-hidden="true">
          <div className="m-sun">
            <SunArt uid={uid} />
          </div>
          {CLOUDS.map((cloud, i) => (
            <i
              key={i}
              className="m-cloud"
              style={
                {
                  top: cloud.top,
                  width: cloud.width,
                  '--x0': cloud.x0,
                  '--dur': cloud.dur,
                  '--delay': cloud.delay,
                } as CSSProperties
              }
            >
              <CloudArt />
            </i>
          ))}
          {scenery.seeds.map((seed) => (
            <i
              key={seed.id}
              className="m-seed"
              style={
                { top: seed.top, width: seed.size, '--dur': seed.dur, '--delay': seed.delay } as CSSProperties
              }
            >
              <SeedArt />
            </i>
          ))}
        </div>

        <div className="m-box">
          {/* Meadow anchored to the play square: the horizon always sits at 36% of the square. */}
          <div className="m-land" aria-hidden="true">
            <div className="m-meadow" />
            <Hills />
            <MeadowArt scenery={scenery} />
          </div>

          {FLOWERS.map((fl, i) => {
            const [petalColor, coreColor] = flowerSet[i];
            return (
              <button
                key={i}
                ref={(el) => {
                  flowerBtnRefs.current[i] = el;
                }}
                type="button"
                className="m-flower"
                aria-label={`Kwiatek ${i + 1}`}
                style={{ left: `${fl.x * 100}%`, top: `${fl.y * 100}%` }}
                onPointerDown={(e) => handlePointerDown(i, e)}
                onClick={(e) => handleClick(i, e)}
              >
                <span className="m-halo" aria-hidden="true" />
                <svg
                  ref={(el) => {
                    flowerSvgRefs.current[i] = el;
                  }}
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                  focusable="false"
                >
                  <FlowerArt index={i} n={fl.n} petal={petalColor} core={coreColor} uid={uid} />
                </svg>
              </button>
            );
          })}

          <div
            ref={shadowRef}
            className="m-bshadow"
            aria-hidden="true"
            style={{
              left: `${FLOWERS[0].x * 100}%`,
              top: `${FLOWERS[0].y * 100}%`,
              transform: 'translate(-50%,-50%) translate(8%,16%) scale(0.86)',
              opacity: 0.36,
            }}
          />

          <svg className="m-fx" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <defs>
              <radialGradient id={`${uid}-pollen`}>
                <stop offset="0" stopColor="#fffdf0" />
                <stop offset="0.42" stopColor="#ffe9a0" stopOpacity="0.95" />
                <stop offset="1" stopColor="#ffd970" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`${uid}-tint`}>
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.42" stopColor={shade(lower, 0.12)} stopOpacity="0.95" />
                <stop offset="1" stopColor={lower} stopOpacity="0" />
              </radialGradient>
            </defs>
            {Array.from({ length: POOL }, (_, i) => (
              <circle
                key={i}
                ref={(el) => {
                  particleRefs.current[i] = el;
                }}
                cx="-10"
                cy="-10"
                r="1"
                opacity="0"
                fill={`url(#${uid}-pollen)`}
              />
            ))}
          </svg>

          <div
            ref={butterflyRef}
            className="m-butterfly"
            aria-hidden="true"
            style={{
              left: `${FLOWERS[0].x * 100}%`,
              top: `${FLOWERS[0].y * 100}%`,
              transform: 'translate(-50%,-50%) rotate(0deg)',
            }}
          >
            <svg viewBox="-50 -40 100 80" aria-hidden="true" focusable="false">
              <defs>
                <radialGradient id={`${uid}-fore`} cx="0.92" cy="0.78" r="1">
                  <stop offset="0" stopColor={shade(upper, 0.2)} />
                  <stop offset="0.55" stopColor={upper} />
                  <stop offset="1" stopColor={shade(upper, -0.16)} />
                </radialGradient>
                <radialGradient id={`${uid}-hind`} cx="0.9" cy="0.15" r="1">
                  <stop offset="0" stopColor={shade(lower, 0.2)} />
                  <stop offset="0.55" stopColor={lower} />
                  <stop offset="1" stopColor={shade(lower, -0.16)} />
                </radialGradient>
              </defs>
              <g ref={leftWingRef} className="m-wl">
                <WingArt uid={uid} upper={upper} />
              </g>
              <g ref={rightWingRef} className="m-wr">
                <g transform="scale(-1 1)">
                  <WingArt uid={uid} upper={upper} />
                </g>
              </g>
              <g className="m-body">
                <g className="m-antennae">
                  <path d="M-1.6 -22Q-5 -31 -10.5 -35.5M1.6 -22Q5 -31 10.5 -35.5" />
                  <circle cx="-10.8" cy="-35.8" r="2" />
                  <circle cx="10.8" cy="-35.8" r="2" />
                </g>
                <ellipse cx="0" cy="6.5" rx="4.6" ry="16.6" fill="#ffffff" opacity="0.9" />
                <ellipse cx="0" cy="-8" rx="5.7" ry="7.3" fill="#ffffff" opacity="0.9" />
                <circle cx="0" cy="-17.5" r="7.3" fill="#ffffff" opacity="0.9" />
                <ellipse cx="0" cy="6.5" rx="3.5" ry="15.5" fill="#5b5675" />
                <path
                  d="M-3.2 1.5h6.4M-3.4 6.5h6.8M-3.2 11.5h6.4M-2.6 16.5h5.2"
                  stroke="#78729a"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <path
                  d="M-1.6 -3Q-2.2 8 -1.2 19"
                  fill="none"
                  stroke="#8f8ab0"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  opacity="0.75"
                />
                <ellipse cx="0" cy="-8" rx="4.6" ry="6.2" fill="#4f4a69" />
                <circle cx="0" cy="-17.5" r="6.2" fill="#5b5675" />
                <circle cx="-2.4" cy="-18.2" r="1.7" fill="#ffffff" />
                <circle cx="2.4" cy="-18.2" r="1.7" fill="#ffffff" />
                <circle cx="-2.1" cy="-18" r="0.95" fill="#2f2b45" />
                <circle cx="2.7" cy="-18" r="0.95" fill="#2f2b45" />
                <circle cx="-4.2" cy="-15" r="1.2" fill="#f7a8c9" opacity="0.7" />
                <circle cx="4.2" cy="-15" r="1.2" fill="#f7a8c9" opacity="0.7" />
                <path
                  d="M-1.6 -14.6Q0 -13.2 1.6 -14.6"
                  fill="none"
                  stroke="#f3eef8"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </div>
        </div>

        <svg
          className="m-front"
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path className="m-front-back" d={GRASS_BACK} />
          <path className="m-front-front" d={GRASS_FRONT} />
        </svg>
      </div>
    </div>
  );
}
