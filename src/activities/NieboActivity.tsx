import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { shuffle } from '../utils/rand';

const FADE_MS = 800;
const TRACE_DASH = 4;

type Point = readonly [number, number];

interface ConstellationShape {
  name: string;
  ring: number;
  extra: readonly (readonly [number, number])[];
  pts: readonly Point[];
}

// Original constellation data (child-page/js/niebo.js): star coordinates in a 0..100 square,
// the first `ring` stars form a closed outline and `extra` adds more edges.
const SHAPES: readonly ConstellationShape[] = [
  {
    name: 'samochód',
    ring: 10,
    extra: [],
    pts: [
      [12, 62],
      [12, 50],
      [30, 48],
      [40, 34],
      [65, 34],
      [78, 48],
      [90, 50],
      [90, 62],
      [72, 74],
      [28, 74],
    ],
  },
  {
    name: 'miś',
    ring: 7,
    extra: [
      [7, 5],
      [7, 4],
    ],
    pts: [
      [26, 20],
      [50, 34],
      [74, 20],
      [82, 48],
      [66, 76],
      [34, 76],
      [18, 48],
      [50, 58],
    ],
  },
  {
    name: 'domek',
    ring: 7,
    extra: [],
    pts: [
      [12, 52],
      [50, 20],
      [88, 52],
      [78, 52],
      [78, 84],
      [22, 84],
      [22, 52],
    ],
  },
  {
    name: 'kot',
    ring: 8,
    extra: [],
    pts: [
      [24, 16],
      [40, 32],
      [60, 32],
      [76, 16],
      [82, 50],
      [68, 80],
      [32, 80],
      [18, 50],
    ],
  },
  {
    name: 'ryba',
    ring: 9,
    extra: [],
    pts: [
      [12, 50],
      [32, 28],
      [58, 28],
      [80, 42],
      [92, 24],
      [92, 76],
      [80, 58],
      [58, 72],
      [32, 72],
    ],
  },
  {
    name: 'drzewo',
    ring: 11,
    extra: [],
    pts: [
      [50, 8],
      [76, 36],
      [62, 36],
      [86, 62],
      [58, 62],
      [58, 88],
      [42, 88],
      [42, 62],
      [14, 62],
      [38, 36],
      [24, 36],
    ],
  },
  {
    name: 'serce',
    ring: 8,
    extra: [],
    pts: [
      [50, 30],
      [34, 14],
      [14, 26],
      [14, 48],
      [50, 86],
      [86, 48],
      [86, 26],
      [66, 14],
    ],
  },
  {
    name: 'łódka',
    ring: 4,
    extra: [
      [4, 5],
      [5, 6],
      [6, 4],
    ],
    pts: [
      [10, 60],
      [90, 60],
      [74, 84],
      [26, 84],
      [50, 10],
      [50, 44],
      [78, 44],
    ],
  },
  {
    name: 'gwiazda',
    ring: 10,
    extra: [],
    pts: [
      [50, 10],
      [61, 35],
      [88, 38],
      [68, 57],
      [74, 82],
      [50, 68],
      [26, 82],
      [32, 57],
      [12, 38],
      [39, 35],
    ],
  },
  {
    name: 'latawiec',
    ring: 4,
    extra: [
      [2, 4],
      [4, 5],
    ],
    pts: [
      [50, 8],
      [80, 36],
      [50, 78],
      [20, 36],
      [66, 90],
      [84, 80],
    ],
  },
];

function createOrder(lastShape?: ConstellationShape): ConstellationShape[] {
  const next = shuffle(SHAPES);
  if (lastShape && next.length > 1 && next[0] === lastShape) {
    const first = next.shift()!;
    next.push(first);
  }
  return next;
}

// ── Decorative backdrop data (generated once per launch, never stored) ──────────

interface BackdropStar {
  x: number;
  y: number;
  r: number;
  o: number;
}

interface AccentStar {
  left: string;
  top: string;
  size: string;
  color: string;
  delay: string;
}

interface Backdrop {
  twinkle: BackdropStar[][];
  dust: BackdropStar[];
  accents: AccentStar[];
}

// Accent sparkles sit outside the play square in both portrait (above it) and landscape (beside it).
const ACCENT_SPOTS: readonly Point[] = [
  [7, 14],
  [16, 24],
  [22, 11],
  [78, 25],
  [90, 27],
];
const ACCENT_COLORS = ['#fff3c4', '#cfe0ff', '#ffd1dc', '#d9f2ff', '#e6dcff'] as const;

const VILLAGE_LIGHTS = [
  { left: '6%', bottom: '61.5%' },
  { left: '27%', bottom: '62%' },
  { left: '63%', bottom: '64%' },
  { left: '93%', bottom: '66.5%' },
] as const;

const FAR_HILL = 'M0 92C80 70 170 64 260 78C350 92 440 62 540 66C640 70 700 90 790 84C880 78 940 62 1000 68';
const NEAR_HILL =
  'M0 124C70 104 130 100 190 106C250 112 320 98 390 98C470 98 530 114 610 114C690 114 740 96 820 94C890 92 950 104 1000 108';

function createBackdrop(): Backdrop {
  const twinkle: BackdropStar[][] = [[], [], []];
  for (let i = 0; i < 111; i++) {
    twinkle[i % 3].push({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      r: 0.55 + Math.random() * 0.95,
      o: 0.25 + Math.random() * 0.55,
    });
  }

  // Fine specks clustered along the Milky Way band (same -22° angle as the CSS band).
  const dust: BackdropStar[] = [];
  const angle = (-22 * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let i = 0; i < 72; i++) {
    const along = (Math.random() * 2 - 1) * 760;
    const spread = (Math.random() + Math.random() + Math.random() - 1.5) * 120;
    dust.push({
      x: 500 + along * cos - spread * sin,
      y: 500 + along * sin + spread * cos,
      r: 0.35 + Math.random() * 0.6,
      o: 0.18 + Math.random() * 0.35,
    });
  }

  const accents = ACCENT_SPOTS.map(([x, y], i) => ({
    left: `${(x + (Math.random() - 0.5) * 3).toFixed(1)}%`,
    top: `${(y + (Math.random() - 0.5) * 3).toFixed(1)}%`,
    size: `${(9 + Math.random() * 6).toFixed(1)}px`,
    color: ACCENT_COLORS[i % ACCENT_COLORS.length],
    delay: `-${(Math.random() * 6).toFixed(2)}s`,
  }));

  return { twinkle, dust, accents };
}

// ── Small shared drawings ────────────────────────────────────────────────────────

function starPath(outer: number, inner: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + i * 36) * Math.PI) / 180;
    const radius = i % 2 === 0 ? outer : inner;
    d += `${i === 0 ? 'M' : 'L'}${(Math.cos(a) * radius).toFixed(2)} ${(Math.sin(a) * radius).toFixed(2)}`;
  }
  return `${d}Z`;
}

const STAR_PATH = starPath(8, 3.5);
const SPARKLE_PATH =
  'M0 -6C0.7 -1.4 1.4 -0.7 6 0C1.4 0.7 0.7 1.4 0 6C-0.7 1.4 -1.4 0.7 -6 0C-1.4 -0.7 -0.7 -1.4 0 -6Z';
const BURST_ANGLES = [0, 60, 120, 180, 240, 300] as const;

// Completion sparkles: deterministic directions, distances in "percent of the sky".
const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const a = ((i * 36 + (i % 2 === 0 ? -8 : 10)) * Math.PI) / 180;
  const distance = 18 + (i % 3) * 6;
  return {
    dx: (Math.cos(a) * distance).toFixed(1),
    dy: (Math.sin(a) * distance - 5).toFixed(1),
    size: `${8 + (i % 3) * 3}px`,
    delay: `${((i % 4) * 0.09).toFixed(2)}s`,
  };
});

function SparkleIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="-7 -7 14 14" aria-hidden="true" focusable="false">
      <path d={SPARKLE_PATH} />
    </svg>
  );
}

function StarGlyph() {
  return (
    <svg className="n-star-svg" viewBox="-20 -20 40 40" aria-hidden="true" focusable="false">
      <circle className="n-star-invite" r="11" />
      <g className="n-star-burst">
        {BURST_ANGLES.map((deg) => (
          <path key={deg} d="M0 -12.5V-17" transform={`rotate(${deg})`} />
        ))}
      </g>
      <path className="n-star-spikes" d="M0 -17V17M-17 0H17" />
      <path className="n-star-shape" d={STAR_PATH} />
      <circle className="n-star-glint" cx="-2.4" cy="-2.8" r="1.3" />
    </svg>
  );
}

function MoonArt({ uid }: { uid: string }) {
  const glowId = `${uid}-moon-glow`;
  const maskId = `${uid}-moon-mask`;
  return (
    <svg viewBox="0 0 100 100" focusable="false">
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0.3" stopColor="#fff6d8" stopOpacity="0.4" />
          <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
        </radialGradient>
        <mask id={maskId}>
          <rect width="100" height="100" fill="#ffffff" />
          <circle cx="63" cy="42" r="25" fill="#000000" />
        </mask>
      </defs>
      <circle className="n-moon-glow" cx="50" cy="50" r="49" fill={`url(#${glowId})`} />
      <g mask={`url(#${maskId})`}>
        <circle cx="50" cy="50" r="29" fill="#f6f2da" />
        <circle cx="38" cy="63" r="5" fill="#e4ddbb" />
        <circle cx="31" cy="42" r="3" fill="#e4ddbb" />
        <circle cx="47" cy="73" r="2.2" fill="#e4ddbb" />
      </g>
      <path d="M30 53q3.5 3 7 0" fill="none" stroke="#b9b096" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="29" cy="58" r="2.6" fill="#f7a8c9" fillOpacity="0.35" />
    </svg>
  );
}

function NightHorizon() {
  return (
    <div className="n-horizon">
      <svg className="n-hills" viewBox="0 0 1000 200" preserveAspectRatio="none" focusable="false">
        <path className="n-hill-far" d={`${FAR_HILL}V200H0Z`} />
        <path className="n-hill-rim" d={FAR_HILL} />
        <path className="n-hill-near" d={`${NEAR_HILL}V200H0Z`} />
        <path className="n-hill-rim n-hill-rim-near" d={NEAR_HILL} />
      </svg>

      {VILLAGE_LIGHTS.map((light) => (
        <i key={light.left} className="n-village" style={{ left: light.left, bottom: light.bottom }} />
      ))}

      <svg className="n-hz n-hz-house" viewBox="0 0 64 56" focusable="false">
        <rect x="41" y="7" width="7" height="14" fill="currentColor" />
        <path d="M5 29L32 6L59 29Z" fill="currentColor" />
        <rect x="11" y="27" width="42" height="30" fill="currentColor" />
        <circle className="n-hz-glow" cx="24" cy="39" r="12" fill="#ffd98a" />
        <rect x="19" y="34" width="10" height="10" rx="1.2" fill="#ffd98a" />
        <path d="M24 34V44M19 39H29" stroke="#b98a4e" strokeWidth="1.2" />
        <rect x="37" y="41" width="9" height="16" rx="1.6" fill="#1d2654" />
        <path d="M5 29L32 6L59 29" fill="none" stroke="rgba(176, 188, 240, 0.28)" strokeWidth="1" />
      </svg>

      <svg className="n-hz n-hz-trees" viewBox="0 0 90 70" focusable="false">
        <path d="M20 70V56" stroke="currentColor" strokeWidth="4" />
        <path d="M20 6L33 31H26.5L37 50H3L13.5 31H7Z" fill="currentColor" />
        <path d="M52 70V48" stroke="currentColor" strokeWidth="5" />
        <circle cx="52" cy="34" r="16" fill="currentColor" />
        <circle cx="42" cy="42" r="10" fill="currentColor" />
        <circle cx="63" cy="42" r="11" fill="currentColor" />
        <path d="M79 70V58" stroke="currentColor" strokeWidth="3" />
        <path d="M79 26L88 44H83.5L90 58H68L74.5 44H70Z" fill="currentColor" />
        <path
          d="M20 6L33 31M52 18a16 16 0 0 1 15 10M79 26L88 44"
          fill="none"
          stroke="rgba(176, 188, 240, 0.22)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>

      <svg className="n-hz n-hz-scope" viewBox="0 0 60 60" focusable="false">
        <path
          d="M30 34L18 60M30 34L42 60M30 34V60"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <g transform="rotate(38 30 32)">
          <rect x="14" y="26.5" width="33" height="11" rx="3" fill="currentColor" />
          <rect x="9" y="24.5" width="8" height="15" rx="2" fill="currentColor" />
          <rect x="45" y="29" width="8" height="6" rx="1.5" fill="currentColor" />
          <path d="M16 28H45" stroke="rgba(176, 188, 240, 0.35)" strokeWidth="1" />
        </g>
        <circle className="n-hz-glint" cx="13.5" cy="19.1" r="1.7" fill="#fff3c4" />
      </svg>
    </div>
  );
}

function NightBackdrop({ backdrop, uid }: { backdrop: Backdrop; uid: string }) {
  return (
    <div className="n-backdrop" aria-hidden="true">
      <div className="n-milkyway" />

      <svg className="n-starfield" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" focusable="false">
        {backdrop.dust.map((s, i) => (
          <circle
            key={i}
            className="n-dust"
            cx={s.x.toFixed(1)}
            cy={s.y.toFixed(1)}
            r={s.r.toFixed(2)}
            opacity={s.o.toFixed(2)}
          />
        ))}
      </svg>

      {/* Each twinkle layer is its own SVG so the browser can animate its opacity as one layer. */}
      {backdrop.twinkle.map((group, gi) => (
        <svg
          key={gi}
          className={`n-starfield n-tw n-tw${gi + 1}`}
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
        >
          {group.map((s, i) => (
            <circle
              key={i}
              cx={s.x.toFixed(1)}
              cy={s.y.toFixed(1)}
              r={s.r.toFixed(2)}
              opacity={s.o.toFixed(2)}
            />
          ))}
        </svg>
      ))}

      {backdrop.accents.map((accent, i) => (
        <i
          key={i}
          className="n-accent"
          style={{
            left: accent.left,
            top: accent.top,
            width: accent.size,
            height: accent.size,
            color: accent.color,
            animationDelay: accent.delay,
          }}
        >
          <svg viewBox="-7 -7 14 14" focusable="false">
            <path d={SPARKLE_PATH} />
          </svg>
        </i>
      ))}

      <i className="n-meteor n-meteor1" />
      <i className="n-meteor n-meteor2" />

      <div className="n-moon">
        <MoonArt uid={uid} />
      </div>

      <NightHorizon />
    </div>
  );
}

// ── Completion illustrations, drawn in the same 0..100 space as the stars ─────────

function ConstellationFigure({ name }: { name: string }) {
  switch (name) {
    case 'samochód':
      return (
        <g>
          <polygon
            points="12,62 12,50 30,48 40,34 65,34 78,48 90,50 90,62 72,74 28,74"
            fill="#f7a8c9"
            fillOpacity="0.42"
          />
          <polygon points="34,47 42,37 52,37 52,47" fill="#d6ecff" fillOpacity="0.62" />
          <polygon points="56,47 56,37 63,37 72,47" fill="#d6ecff" fillOpacity="0.62" />
          <path
            d="M44 44l4-4M59 44l3-3"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.7"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <path d="M54 49V66" fill="none" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="0.8" />
          <circle cx="30" cy="72" r="7.5" fill="#4a4f7a" fillOpacity="0.9" />
          <circle cx="72" cy="72" r="7.5" fill="#4a4f7a" fillOpacity="0.9" />
          <circle cx="30" cy="72" r="3" fill="#e9e6ff" fillOpacity="0.82" />
          <circle cx="72" cy="72" r="3" fill="#e9e6ff" fillOpacity="0.82" />
          <circle cx="87" cy="55" r="2.4" fill="#fff3b0" />
          <circle cx="14.5" cy="55" r="1.8" fill="#ffb7a5" fillOpacity="0.9" />
        </g>
      );
    case 'miś':
      return (
        <g>
          <circle cx="27" cy="22" r="9" fill="#d9a77a" fillOpacity="0.5" />
          <circle cx="73" cy="22" r="9" fill="#d9a77a" fillOpacity="0.5" />
          <circle cx="27" cy="22" r="4.5" fill="#f3c9a8" fillOpacity="0.6" />
          <circle cx="73" cy="22" r="4.5" fill="#f3c9a8" fillOpacity="0.6" />
          <ellipse cx="50" cy="51" rx="31" ry="27" fill="#d9a77a" fillOpacity="0.45" />
          <ellipse cx="50" cy="62" rx="12" ry="8.5" fill="#f3dcc4" fillOpacity="0.6" />
          <ellipse cx="50" cy="56.5" rx="4.2" ry="3.2" fill="#4a4560" fillOpacity="0.9" />
          <circle cx="39" cy="45" r="2.8" fill="#3d3a55" />
          <circle cx="61" cy="45" r="2.8" fill="#3d3a55" />
          <circle cx="38.1" cy="44.1" r="0.9" fill="#ffffff" />
          <circle cx="60.1" cy="44.1" r="0.9" fill="#ffffff" />
          <path
            d="M45 65Q50 69.5 55 65"
            fill="none"
            stroke="#6b5a73"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="31" cy="57" r="4" fill="#f7a8c9" fillOpacity="0.38" />
          <circle cx="69" cy="57" r="4" fill="#f7a8c9" fillOpacity="0.38" />
        </g>
      );
    case 'domek':
      return (
        <g>
          <circle cx="68" cy="20" r="2.4" fill="#e8e3f5" fillOpacity="0.25" />
          <circle cx="72" cy="14.5" r="3.2" fill="#e8e3f5" fillOpacity="0.18" />
          <rect x="64" y="25" width="7" height="12" fill="#b98fb3" fillOpacity="0.5" />
          <rect x="22" y="52" width="56" height="32" fill="#f6dcc8" fillOpacity="0.42" />
          <polygon points="12,52 50,20 88,52" fill="#c9a0c0" fillOpacity="0.55" />
          <path d="M18 50L50 24L82 50" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1" />
          <circle cx="33" cy="64" r="9" fill="#ffd98a" fillOpacity="0.18" />
          <circle cx="67" cy="64" r="9" fill="#ffd98a" fillOpacity="0.18" />
          <rect x="27.5" y="58.5" width="11" height="11" rx="1.5" fill="#ffe9a8" fillOpacity="0.9" />
          <rect x="61.5" y="58.5" width="11" height="11" rx="1.5" fill="#ffe9a8" fillOpacity="0.9" />
          <path
            d="M33 58.5V69.5M27.5 64H38.5M67 58.5V69.5M61.5 64H72.5"
            fill="none"
            stroke="#b98963"
            strokeOpacity="0.55"
            strokeWidth="0.8"
          />
          <path d="M44 84V71a6 6 0 0 1 12 0V84Z" fill="#8d6847" fillOpacity="0.75" />
          <circle cx="53.4" cy="78" r="0.9" fill="#ffe08a" />
        </g>
      );
    case 'kot':
      return (
        <g>
          <polygon points="24,16 41,31 21,42" fill="#f2c48d" fillOpacity="0.5" />
          <polygon points="76,16 59,31 79,42" fill="#f2c48d" fillOpacity="0.5" />
          <polygon points="26,22 36,31 25,37" fill="#f7c9d6" fillOpacity="0.6" />
          <polygon points="74,22 64,31 75,37" fill="#f7c9d6" fillOpacity="0.6" />
          <ellipse cx="50" cy="56" rx="31" ry="25" fill="#f2c48d" fillOpacity="0.45" />
          <ellipse cx="40" cy="51" rx="4" ry="5" fill="#bfe6b4" fillOpacity="0.9" />
          <ellipse cx="60" cy="51" rx="4" ry="5" fill="#bfe6b4" fillOpacity="0.9" />
          <ellipse cx="40" cy="51" rx="1.3" ry="4" fill="#3d3a55" />
          <ellipse cx="60" cy="51" rx="1.3" ry="4" fill="#3d3a55" />
          <path d="M47 60h6l-3 3.6z" fill="#e99bb5" />
          <path
            d="M50 63.6q-2.6 3.6-6.5 1.8M50 63.6q2.6 3.6 6.5 1.8"
            fill="none"
            stroke="#6b5a73"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <path
            d="M38 62L22 59M38 65L23 67M62 62L78 59M62 65L77 67"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.55"
            strokeWidth="0.7"
            strokeLinecap="round"
          />
        </g>
      );
    case 'ryba':
      return (
        <g>
          <path d="M40 28Q48 16 58 28Z" fill="#c9b8f2" fillOpacity="0.5" />
          <path d="M44 72Q50 82 58 72Z" fill="#c9b8f2" fillOpacity="0.42" />
          <polygon points="80,42 92,24 92,76 80,58" fill="#f7a8c9" fillOpacity="0.5" />
          <path
            d="M83.5 40L90 30M83.5 50H91M83.5 60L90 70"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.4"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
          <path
            d="M12 50C20 34 36 27 56 28C68 29 76 36 80 42L80 58C76 64 68 71 56 72C36 73 20 66 12 50Z"
            fill="#a8d8f0"
            fillOpacity="0.45"
          />
          <path d="M38 37Q45 50 38 63" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1" />
          <g fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="0.8">
            <path d="M50 42q3.5 4 0 8" />
            <path d="M58 38q3.5 4 0 8" />
            <path d="M58 52q3.5 4 0 8" />
            <path d="M66 45q3.5 4 0 8" />
          </g>
          <circle cx="25" cy="45" r="3.6" fill="#ffffff" fillOpacity="0.9" />
          <circle cx="25.8" cy="45" r="1.9" fill="#3d3a55" />
          <path d="M15 53q3 2 6 0" fill="none" stroke="#5b5675" strokeWidth="0.9" strokeLinecap="round" />
          <circle cx="7" cy="40" r="2" fill="none" stroke="#d6ecff" strokeOpacity="0.6" strokeWidth="0.7" />
          <circle cx="4.5" cy="32" r="1.3" fill="none" stroke="#d6ecff" strokeOpacity="0.5" strokeWidth="0.6" />
        </g>
      );
    case 'drzewo':
      return (
        <g>
          <ellipse cx="50" cy="89" rx="17" ry="2.6" fill="#8fd19e" fillOpacity="0.3" />
          <rect x="42" y="62" width="16" height="26" rx="2" fill="#b98963" fillOpacity="0.6" />
          <path d="M46 66V85" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1" />
          <polygon points="38,36 62,36 86,62 14,62" fill="#7fc49a" fillOpacity="0.5" />
          <polygon points="50,8 76,36 24,36" fill="#9fd9a8" fillOpacity="0.5" />
          <path
            d="M30 33Q50 40 70 33M21 59Q50 67 79 59"
            fill="none"
            stroke="#f7e6a8"
            strokeOpacity="0.4"
            strokeWidth="1"
            strokeDasharray="0.1 2.6"
            strokeLinecap="round"
          />
          <circle cx="40" cy="28" r="2.4" fill="#f7a8c9" />
          <circle cx="58" cy="30" r="2.1" fill="#ffd98a" />
          <circle cx="31" cy="53" r="2.4" fill="#a8d8f0" />
          <circle cx="51" cy="48" r="2.2" fill="#f7a8c9" />
          <circle cx="69" cy="55" r="2.4" fill="#ffd98a" />
        </g>
      );
    case 'serce':
      return (
        <g>
          <path
            d="M50 30C42 12 14 12 14 36C14 56 38 72 50 86C62 72 86 56 86 36C86 12 58 12 50 30Z"
            fill="#f48ab0"
            fillOpacity="0.45"
          />
          <path
            d="M23 31Q26 21 35 20"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.65"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="68" cy="58" r="2" fill="#ffffff" fillOpacity="0.4" />
        </g>
      );
    case 'łódka':
      return (
        <g>
          <path
            d="M2 90q6-4 12 0t12 0t12 0t12 0t12 0t12 0t12 0t12 0"
            fill="none"
            stroke="#a8d8f0"
            strokeOpacity="0.6"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M-4 95q6-3 12 0t12 0t12 0t12 0t12 0t12 0t12 0t12 0"
            fill="none"
            stroke="#a8d8f0"
            strokeOpacity="0.35"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path d="M50 44V60" fill="none" stroke="#c9a77a" strokeOpacity="0.8" strokeWidth="1.4" />
          <polygon points="50,10 50,44 78,44" fill="#fdfbff" fillOpacity="0.55" />
          <polygon points="47,18 47,44 28,44" fill="#ffe9a8" fillOpacity="0.38" />
          <path d="M50 10L58 13L50 16Z" fill="#f7a8c9" />
          <polygon points="10,60 90,60 74,84 26,84" fill="#f2a98f" fillOpacity="0.55" />
          <path d="M15 67H85" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.4" />
          <circle cx="36" cy="73" r="2.4" fill="#d6ecff" fillOpacity="0.75" />
          <circle cx="50" cy="73" r="2.4" fill="#d6ecff" fillOpacity="0.75" />
          <circle cx="64" cy="73" r="2.4" fill="#d6ecff" fillOpacity="0.75" />
        </g>
      );
    case 'gwiazda':
      return (
        <g>
          <polygon
            points="50,10 61,35 88,38 68,57 74,82 50,68 26,82 32,57 12,38 39,35"
            fill="#ffe08a"
            fillOpacity="0.5"
            stroke="#ffe08a"
            strokeOpacity="0.5"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="44" cy="47" r="2.5" fill="#5b5675" />
          <circle cx="56" cy="47" r="2.5" fill="#5b5675" />
          <circle cx="43.2" cy="46.2" r="0.8" fill="#ffffff" />
          <circle cx="55.2" cy="46.2" r="0.8" fill="#ffffff" />
          <path
            d="M45.5 54Q50 58.5 54.5 54"
            fill="none"
            stroke="#5b5675"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="39.5" cy="53" r="2.8" fill="#f7a8c9" fillOpacity="0.5" />
          <circle cx="60.5" cy="53" r="2.8" fill="#f7a8c9" fillOpacity="0.5" />
        </g>
      );
    case 'latawiec':
      return (
        <g>
          <polygon points="50,8 80,36 50,36" fill="#f7a8c9" fillOpacity="0.55" />
          <polygon points="50,8 50,36 20,36" fill="#ffd98a" fillOpacity="0.55" />
          <polygon points="20,36 50,36 50,78" fill="#a8d8f0" fillOpacity="0.55" />
          <polygon points="50,36 80,36 50,78" fill="#c9b8f2" fillOpacity="0.55" />
          <path d="M50 8V78M20 36H80" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.9" />
          <path d="M58 84l-3.6-2.6v5.2zM58 84l3.6-2.6v5.2z" fill="#f7a8c9" fillOpacity="0.85" />
          <path d="M75 85l-3.6-2.6v5.2zM75 85l3.6-2.6v5.2z" fill="#ffd98a" fillOpacity="0.85" />
        </g>
      );
    default:
      return null;
  }
}

// ── Activity ────────────────────────────────────────────────────────────────────

export default function NieboActivity() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [backdrop] = useState<Backdrop>(createBackdrop);
  const [deck, setDeck] = useState<{
    order: ConstellationShape[];
    index: number;
    round: number;
  }>(() => ({ order: createOrder(), index: 0, round: 0 }));

  const shape = deck.order[deck.index];

  const [active, setActive] = useState<boolean[]>(() => shape.pts.map(() => false));
  const [fading, setFading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);

  const busyRef = useRef(false);
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

  const geometry = useMemo(() => {
    const pairs: [number, number][] = [];
    for (let i = 0; i < shape.ring; i++) {
      pairs.push([i, (i + 1) % shape.ring]);
    }
    for (const extraPair of shape.extra) {
      pairs.push([extraPair[0], extraPair[1]]);
    }

    const ringPts = shape.pts.slice(0, shape.ring);
    const polygonPoints = ringPts.map((p) => `${p[0]},${p[1]}`).join(' ');
    const ringPath = `M${ringPts.map((p) => `${p[0]} ${p[1]}`).join('L')}Z`;

    let perimeter = 0;
    for (let i = 0; i < ringPts.length; i++) {
      const a = ringPts[i];
      const b = ringPts[(i + 1) % ringPts.length];
      perimeter += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }

    const cx = shape.pts.reduce((sum, p) => sum + p[0], 0) / shape.pts.length;
    const cy = shape.pts.reduce((sum, p) => sum + p[1], 0) / shape.pts.length;

    const edges = pairs.map(([aIdx, bIdx]) => {
      const a = shape.pts[aIdx];
      const b = shape.pts[bIdx];
      return {
        a: aIdx,
        b: bIdx,
        d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`,
        len: Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(2),
      };
    });

    return { polygonPoints, ringPath, perimeter, cx, cy, edges };
  }, [shape]);

  const done = active.length === shape.pts.length && active.every(Boolean);

  const activateStar = (starIndex: number) => {
    if (busyRef.current || active[starIndex]) return;
    setActive((prev) => {
      if (prev[starIndex]) return prev;
      const copy = [...prev];
      copy[starIndex] = true;
      return copy;
    });
  };

  const handleNext = () => {
    if (busyRef.current || !done) return;
    busyRef.current = true;
    setBusy(true);
    setFading(true);

    scheduleLater(() => {
      let nextOrder = deck.order;
      let nextIndex = deck.index + 1;
      let nextRound = deck.round;
      if (nextIndex >= nextOrder.length) {
        nextOrder = createOrder(nextOrder[nextOrder.length - 1]);
        nextIndex = 0;
        nextRound += 1;
      }
      const nextShape = nextOrder[nextIndex];
      setDeck({ order: nextOrder, index: nextIndex, round: nextRound });
      setActive(nextShape.pts.map(() => false));
      setFading(false);

      scheduleLater(() => {
        busyRef.current = false;
        setBusy(false);
      }, FADE_MS);
    }, FADE_MS);
  };

  const constellationKey = `${deck.round}-${deck.index}`;
  const displayName = shape.name.charAt(0).toUpperCase() + shape.name.slice(1);
  const traceStyle = {
    '--dash': String(TRACE_DASH),
    '--gap': Math.max(1, geometry.perimeter - TRACE_DASH).toFixed(2),
    '--cyc': geometry.perimeter.toFixed(2),
  } as CSSProperties;

  return (
    <div className="act-stage stage">
      <div className={`night${done ? ' done' : ''}${paused ? ' paused' : ''}`}>
        <NightBackdrop backdrop={backdrop} uid={uid} />

        <div className={`n-sky${fading ? ' fade' : ''}`}>
          <div className="n-lens" aria-hidden="true" />

          {/* Reward layer: nebula fill and the illustrated figure, revealed on completion. */}
          <svg
            key={`${constellationKey}-art`}
            className="n-figure-layer"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <radialGradient id={`${uid}-nebula`} cx="50%" cy="46%" r="62%">
                <stop offset="0" stopColor="#fff1c2" stopOpacity="0.4" />
                <stop offset="0.55" stopColor="#ffd98a" stopOpacity="0.16" />
                <stop offset="1" stopColor="#c9b8f2" stopOpacity="0.04" />
              </radialGradient>
            </defs>
            <polygon className="n-nebula" points={geometry.polygonPoints} fill={`url(#${uid}-nebula)`} />
            <g className="n-figure">
              <ConstellationFigure name={shape.name} />
            </g>
          </svg>

          <svg
            key={constellationKey}
            className="n-lines"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            {geometry.edges.map((edge, idx) => {
              const isLit = Boolean(active[edge.a] && active[edge.b]);
              const lenStyle = { '--len': edge.len } as CSSProperties;
              return (
                <g key={idx}>
                  <path className={`n-ghost${isLit ? ' on' : ''}`} d={edge.d} />
                  <path className={`n-halo${isLit ? ' on' : ''}`} d={edge.d} style={lenStyle} />
                  <path className={`n-line${isLit ? ' on' : ''}`} d={edge.d} style={lenStyle} />
                </g>
              );
            })}
            <path className="n-trace-halo" d={geometry.ringPath} style={traceStyle} />
            <path className="n-trace" d={geometry.ringPath} style={traceStyle} />
          </svg>

          {shape.pts.map((pt, idx) => {
            const isLit = Boolean(active[idx]);
            return (
              <button
                key={`${constellationKey}-star-${idx}`}
                type="button"
                className={`n-star${isLit ? ' on' : ''}`}
                aria-label="Gwiazdka"
                aria-pressed={isLit}
                style={
                  {
                    left: `${pt[0]}%`,
                    top: `${pt[1]}%`,
                    '--d': `-${((idx * 0.43) % 3.2).toFixed(2)}s`,
                  } as CSSProperties
                }
                onClick={() => activateStar(idx)}
              >
                <StarGlyph />
              </button>
            );
          })}

          <div
            key={`${constellationKey}-sparks`}
            className="n-sparks"
            aria-hidden="true"
            style={{ left: `${geometry.cx.toFixed(1)}%`, top: `${geometry.cy.toFixed(1)}%` }}
          >
            {SPARKS.map((spark, idx) => (
              <i
                key={idx}
                className="n-spark"
                style={
                  {
                    '--dx': spark.dx,
                    '--dy': spark.dy,
                    '--s': spark.size,
                    '--delay': spark.delay,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>

        <div className={`n-msg${done && !fading ? ' show' : ''}`} aria-live="polite">
          <p className="n-bravo">
            <SparkleIcon className="n-bravo-spark" />
            <span>Brawo, Artur!</span>
            <span className="n-bravo-name">{displayName}</span>
            <SparkleIcon className="n-bravo-spark" />
          </p>
          <button type="button" className="n-next" disabled={!done || busy} onClick={handleNext}>
            <span>Dalej</span>
            <svg className="n-next-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
