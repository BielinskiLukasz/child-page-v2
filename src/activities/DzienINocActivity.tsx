import { useEffect, useId, useMemo, useRef } from 'react';

const MAX_CLOUDS = 7;
const AMBIENT = 3;
const TRANSITION_MS = 3500;
const REDUCED_MS = 1200;

const BIRD_SECONDS = 20;
const LOOP_SECONDS = 2.6;

const STAR_ADD_MIN = 15;
const STAR_ADD_MAX = 30;
const STAR_GROW_SECONDS = 8;
const STAR_CAP = 160;

const FLY_MIN = 20;
const FLY_MAX = 45;
const SAT_SECONDS = 18;
const PLANE_SECONDS = 12;
const BLINK_SECONDS = 0.7;

// ── Imperatively created artwork (clouds, birds and night flyers are DOM nodes driven by the rAF loop) ──

const CLOUD_PUFFS =
  '<circle cx="35" cy="38" r="20"/><circle cx="60" cy="28" r="26"/><circle cx="88" cy="38" r="20"/>' +
  '<rect x="35" y="38" width="53" height="20" rx="10"/>';

// Layers: soft shadow, white body, moonlit tint (opacity follows --p), sunset underside (follows --dusk), highlight.
const CLOUD_SVG =
  '<svg viewBox="0 0 120 64" aria-hidden="true" focusable="false">' +
  `<g class="dn-cloud-shadow" transform="translate(0 4)">${CLOUD_PUFFS}</g>` +
  `<g class="dn-cloud-body">${CLOUD_PUFFS}</g>` +
  `<g class="dn-cloud-night">${CLOUD_PUFFS}</g>` +
  '<path class="dn-cloud-dusk" d="M17 46q4 12 18 12h53q14 0 18-12q-9 6-20 4-9 6-24 3-13 5-24-1-11 3-21-6z"/>' +
  '<ellipse class="dn-cloud-shine" cx="52" cy="13" rx="13" ry="5.5" transform="rotate(-14 52 13)"/>' +
  '</svg>';

// The wings stay in one `.dn-wing` group hinged at 0,0 so the JS flap (scale on y) works as before.
const BIRD_SVG =
  '<svg viewBox="-30 -20 60 40" aria-hidden="true" focusable="false">' +
  '<path class="dn-bird-tail" d="M-8 2L-19 -3L-16.5 6.5Z"/>' +
  '<g class="dn-wing">' +
  '<path class="dn-bird-wing" d="M0 0Q-14 -16 -28 -6Q-14 -6 0 4z"/>' +
  '<path class="dn-bird-tip" d="M-20 -9.5Q-25 -9 -28 -6Q-23 -6.4 -18.5 -6.8z"/>' +
  '<path class="dn-bird-wing" d="M0 0Q14 -16 28 -6Q14 -6 0 4z"/>' +
  '<path class="dn-bird-tip" d="M20 -9.5Q25 -9 28 -6Q23 -6.4 18.5 -6.8z"/>' +
  '</g>' +
  '<ellipse class="dn-bird-body" cx="0" cy="3" rx="10" ry="5.6"/>' +
  '<ellipse class="dn-bird-belly" cx="2.5" cy="5.4" rx="6.2" ry="3"/>' +
  '<circle class="dn-bird-body" cx="8" cy="0" r="4.6"/>' +
  '<path class="dn-bird-beak" d="M11.6 -1.2l5.6 1.6-5.6 1.5z"/>' +
  '<circle class="dn-bird-eye" cx="9.4" cy="-1.1" r="1.25"/>' +
  '<circle class="dn-bird-glint" cx="9.85" cy="-1.55" r="0.42"/>' +
  '<circle class="dn-bird-cheek" cx="7.6" cy="1.9" r="1.4"/>' +
  '</svg>';

const BIRD_COLORS = [
  { body: '#8fb8e8', belly: '#fde6cf', wing: '#6c98d4', tip: '#4f7fc2' },
  { body: '#b9a294', belly: '#f7ab8b', wing: '#957d70', tip: '#7a6357' },
  { body: '#ffd97a', belly: '#fff3c9', wing: '#f1bb4f', tip: '#d99a2e' },
  { body: '#bba8e8', belly: '#f6eeff', wing: '#9b88d6', tip: '#7e6abf' },
] as const;

// A small plane silhouette (faces right) whose red tail light follows --pulse, and a satellite with solar panels.
const PLANE_SVG =
  '<svg viewBox="-12 -6 24 12" aria-hidden="true" focusable="false">' +
  '<path class="dn-fly-body" d="M-1 -1.2L-5.2 -5.4H-2.8L3 -1.2ZM-1 1.2L-5.2 5.4H-2.8L3 1.2ZM-8.4 -1.1L-10.6 -4.4H-9L-6.2 -1.1Z"/>' +
  '<path class="dn-fly-body" d="M-10 0.4Q-10 -1.4 -7 -1.4H6.2Q9.8 -1.4 11 0Q9.8 1.4 6.2 1.4H-7Q-10 1.4 -10 0.4Z"/>' +
  '<path class="dn-fly-window" d="M5.4 -0.9H8.2Q9.3 -0.6 9.6 0H5.4Z"/>' +
  '<circle class="dn-fly-glow" cx="-9.8" cy="-4" r="2.8"/>' +
  '<circle class="dn-fly-light" cx="-9.8" cy="-4" r="1.05"/>' +
  '<circle class="dn-fly-white" cx="-4.6" cy="5" r="0.75"/>' +
  '</svg>';

const SAT_SVG =
  '<svg viewBox="-10 -6 20 12" aria-hidden="true" focusable="false">' +
  '<path class="dn-sat-line" d="M-3.6 0H3.6"/>' +
  '<rect class="dn-sat-panel" x="-9.6" y="-2.4" width="6" height="4.8" rx="0.6"/>' +
  '<rect class="dn-sat-panel" x="3.6" y="-2.4" width="6" height="4.8" rx="0.6"/>' +
  '<path class="dn-sat-grid" d="M-6.6 -2.4V2.4M6.6 -2.4V2.4M-9.6 0H-3.6M3.6 0H9.6"/>' +
  '<rect class="dn-sat-body" x="-2.2" y="-3" width="4.4" height="6" rx="1.2"/>' +
  '<circle class="dn-sat-glint" cx="0" cy="-1.2" r="0.9"/>' +
  '</svg>';

// ── Stars ────────────────────────────────────────────────────────────────────────

interface StarPoint {
  key: number;
  left: string;
  top: string;
  size: string;
  opacity: string;
  bright: boolean;
}

// ~100 stars from a fixed seed, in the same draw order as the original (bright, x, y, size, opacity),
// so the sky looks the same on every visit.
function makeInitialStars(): StarPoint[] {
  const out: StarPoint[] = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  while (out.length < 100) {
    const bright = rnd() < 0.1;
    const x = 2 + rnd() * 96;
    const y = 2 + rnd() * 94;
    const sz = bright ? 3 + rnd() : 1.4 + rnd() * 1.3;
    const op = bright ? 0.9 : 0.4 + rnd() * 0.4;
    out.push({
      key: out.length,
      left: `${x.toFixed(1)}%`,
      top: `${y.toFixed(1)}%`,
      size: `${sz.toFixed(1)}px`,
      opacity: op.toFixed(2),
      bright,
    });
  }
  return out;
}

// ── Landscape (two copies, day and night, cross-faded by --p) ─────────────────────

interface LandPalette {
  far: string;
  farRim: string;
  mid: string;
  nearTop: string;
  nearBottom: string;
  rim: string;
  pondTop: string;
  pondBottom: string;
  pondRim: string;
  lily: string;
  reed: string;
  reedHead: string;
  grass: string;
  wall: string;
  wallShade: string;
  roof: string;
  roofShade: string;
  chimney: string;
  door: string;
  knob: string;
  window: string;
  frame: string;
  step: string;
  box: string;
  crown: string;
  crownShade: string;
  apple: string;
  pine: string;
  pineShade: string;
  trunk: string;
  fence: string;
  fenceLine: string;
  stem: string;
  leaf: string;
  bud: string;
  edge: string;
}

const DAY_LAND: LandPalette = {
  far: '#b5dbc0',
  farRim: 'rgba(240, 250, 236, 0.75)',
  mid: '#9fd09b',
  nearTop: '#bae4a5',
  nearBottom: '#8cc67f',
  rim: 'rgba(236, 250, 214, 0.9)',
  pondTop: '#c3e7f7',
  pondBottom: '#8ccbea',
  pondRim: 'rgba(240, 250, 255, 0.95)',
  lily: '#7cc38a',
  reed: '#6aa66d',
  reedHead: '#b0835c',
  grass: '#7bbd74',
  wall: '#fbe9d6',
  wallShade: '#efd3b9',
  roof: '#ef9f9a',
  roofShade: '#d8827f',
  chimney: '#dd918c',
  door: '#c08d64',
  knob: '#f6d48a',
  window: '#cdeaf9',
  frame: '#ffffff',
  step: '#e3caae',
  box: '#c99a76',
  crown: '#8bcb8f',
  crownShade: '#6db582',
  apple: '#f28b82',
  pine: '#78bd8f',
  pineShade: '#5fa77b',
  trunk: '#b0835c',
  fence: '#fff6ea',
  fenceLine: '#e2ceb4',
  stem: '#6fae6f',
  leaf: '#82c58a',
  bud: '#c9b8f2',
  edge: 'rgba(255, 255, 255, 0.45)',
};

const NIGHT_LAND: LandPalette = {
  far: '#2d3e6f',
  farRim: 'rgba(188, 200, 255, 0.34)',
  mid: '#26396a',
  nearTop: '#22385f',
  nearBottom: '#192b4c',
  rim: 'rgba(172, 188, 255, 0.28)',
  pondTop: '#3b5c94',
  pondBottom: '#243f6e',
  pondRim: 'rgba(200, 214, 255, 0.42)',
  lily: '#2e5559',
  reed: '#29485a',
  reedHead: '#4a4568',
  grass: '#16294a',
  wall: '#57638f',
  wallShade: '#4b5681',
  roof: '#614f87',
  roofShade: '#523f78',
  chimney: '#4f4878',
  door: '#333a62',
  knob: '#ffd98a',
  window: '#ffdf8f',
  frame: '#c9a868',
  step: '#3e4671',
  box: '#3f3a60',
  crown: '#204353',
  crownShade: '#183849',
  apple: '#5a4466',
  pine: '#1c3e4e',
  pineShade: '#153344',
  trunk: '#3a3552',
  fence: '#6c76a1',
  fenceLine: '#58618c',
  stem: '#2a4b52',
  leaf: '#284c55',
  bud: '#706b9f',
  edge: 'rgba(176, 192, 255, 0.4)',
};

const FAR_LINE = 'M0 92C90 68 180 60 280 74C380 88 450 62 560 64C670 66 740 88 840 80C910 74 960 62 1000 68';
const MID_LINE = 'M0 128C80 108 170 102 260 112C350 122 420 98 520 102C620 106 690 122 790 116C880 110 950 102 1000 108';
const NEAR_LINE =
  'M0 150C110 128 230 124 340 136C430 146 470 142 520 141C600 140 660 128 760 130C860 132 940 144 1000 150';
const TO_BOTTOM = 'V220H0Z';
const REEDS = 'M376 188Q371 170 379 152M386 190Q387 175 395 164M624 188Q629 170 621 152M614 190Q612 176 605 166';

function makeFrontGrass(): string {
  let d = 'M0 220V206';
  let x = 0;
  let i = 0;
  while (x < 1000) {
    const w = 16 + (i % 3) * 6;
    const h = 12 + ((i * 7) % 5) * 4;
    const tip = x + w / 2;
    d += `Q${(x + w * 0.3).toFixed(1)} ${(206 - h * 0.45).toFixed(1)} ${tip.toFixed(1)} ${206 - h}`;
    d += `Q${(x + w * 0.7).toFixed(1)} ${(206 - h * 0.45).toFixed(1)} ${x + w} 206`;
    x += w;
    i++;
  }
  return `${d}V220Z`;
}

const FRONT_GRASS = makeFrontGrass();
const PICKETS = [4, 26, 48, 70, 92, 114, 136] as const;
const FLOWER_CLUSTERS = ['dn-flowers1', 'dn-flowers2', 'dn-flowers3'] as const;
const TULIP_COLORS: readonly (readonly string[])[] = [
  ['#f7a8c9', '#ffd98a', '#c9b8f2'],
  ['#ffd98a', '#c9b8f2', '#ffb7a5'],
  ['#c9b8f2', '#f7a8c9', '#ffd98a'],
];
const TULIP_HEADS: readonly (readonly [number, number])[] = [
  [16, 34],
  [30, 26],
  [44, 38],
];
const FIREFLIES = [
  { left: '23%', top: '52%', dur: '6.2s', delay: '-1.1s' },
  { left: '41%', top: '64%', dur: '7.4s', delay: '-3.6s' },
  { left: '57%', top: '48%', dur: '5.6s', delay: '-2.2s' },
  { left: '74%', top: '61%', dur: '6.8s', delay: '-4.8s' },
  { left: '95%', top: '54%', dur: '7.9s', delay: '-0.4s' },
] as const;

function HouseArt({ c, night }: { c: LandPalette; night: boolean }) {
  return (
    <svg viewBox="0 0 120 100" focusable="false">
      {night && (
        <g className="dn-window-glow">
          <circle cx="37" cy="64" r="17" />
          <circle cx="83" cy="64" r="17" />
          <circle cx="60" cy="32" r="12" />
        </g>
      )}
      <rect x="78" y="16" width="10" height="22" fill={c.chimney} />
      <rect x="76" y="12.5" width="14" height="5" rx="1.5" fill={c.roofShade} />
      <rect x="18" y="44" width="84" height="52" rx="3" fill={c.wall} />
      <rect x="18" y="86" width="84" height="10" fill={c.wallShade} />
      <path d="M8 47L60 12L112 47Z" fill={c.roof} stroke={c.roof} strokeWidth="5" strokeLinejoin="round" />
      <path d="M60 12L112 47H98L60 21Z" fill={c.roofShade} />
      <path d="M8 47L60 12" fill="none" stroke={c.edge} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="60" cy="32" r="6.5" fill={c.window} stroke={c.frame} strokeWidth="1.8" />
      <rect x="28" y="56" width="18" height="16" rx="2" fill={c.window} stroke={c.frame} strokeWidth="2" />
      <rect x="74" y="56" width="18" height="16" rx="2" fill={c.window} stroke={c.frame} strokeWidth="2" />
      <path
        d="M37 56V72M28 64H46M83 56V72M74 64H92M60 25.5V38.5M53.5 32H66.5"
        fill="none"
        stroke={c.frame}
        strokeWidth="1.4"
      />
      {!night && (
        <path
          d="M30.5 69.5L35 58.5M76.5 69.5L81 58.5"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.7"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
      <rect x="26" y="73" width="22" height="4.5" rx="1.6" fill={c.box} />
      <g fill={night ? c.bud : '#f7a8c9'}>
        <circle cx="30" cy="72" r="2.2" />
        <circle cx="41.5" cy="71.5" r="2.2" />
      </g>
      <circle cx="36" cy="71" r="2.2" fill={night ? c.bud : '#ffd98a'} />
      <path d="M53 96V73a7 7 0 0 1 14 0V96Z" fill={c.door} />
      <circle cx="63.4" cy="85" r="1.3" fill={c.knob} />
      <rect x="49" y="95" width="22" height="4" rx="1.2" fill={c.step} />
    </svg>
  );
}

function FenceArt({ c }: { c: LandPalette }) {
  return (
    <svg viewBox="0 0 160 40" focusable="false">
      <g fill={c.fence} stroke={c.fenceLine} strokeWidth="1">
        <rect x="0" y="15" width="160" height="4" rx="2" />
        <rect x="0" y="27" width="160" height="4" rx="2" />
        {PICKETS.map((x) => (
          <path key={x} d={`M${x} 40V11l5-6 5 6V40Z`} />
        ))}
      </g>
    </svg>
  );
}

function TreesArt({ c }: { c: LandPalette }) {
  return (
    <svg viewBox="0 0 140 120" focusable="false">
      <path d="M36 120V76q0-5 5-5q5 0 5 5v44Z" fill={c.trunk} />
      <circle cx="41" cy="46" r="24" fill={c.crown} />
      <circle cx="23" cy="61" r="16" fill={c.crown} />
      <circle cx="59" cy="59" r="18" fill={c.crown} />
      <circle cx="50" cy="66" r="14" fill={c.crownShade} />
      <path d="M21 50a24 24 0 0 1 18-27" fill="none" stroke={c.edge} strokeWidth="2" strokeLinecap="round" />
      <g fill={c.apple}>
        <circle cx="30" cy="52" r="3" />
        <circle cx="48" cy="38" r="2.8" />
        <circle cx="57" cy="60" r="3" />
        <circle cx="35" cy="66" r="2.6" />
      </g>
      <rect x="100" y="94" width="7" height="26" rx="2" fill={c.trunk} />
      <path d="M103.5 14L124 52H83Z" fill={c.pine} />
      <path d="M103.5 34L128 76H79Z" fill={c.pine} />
      <path d="M103.5 56L131 98H76Z" fill={c.pine} />
      <path d="M103.5 14L124 52H103.5ZM103.5 34L128 76H103.5ZM103.5 56L131 98H103.5Z" fill={c.pineShade} />
      <path
        d="M103.5 14L83 52M103.5 34L79 76M103.5 56L76 98"
        fill="none"
        stroke={c.edge}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Tulips are open in the day copy and closed buds in the night copy, so the cross-fade "closes" them.
function FlowersArt({ c, night, colors }: { c: LandPalette; night: boolean; colors: readonly string[] }) {
  return (
    <svg viewBox="0 0 60 60" focusable="false">
      <path
        d="M16 60Q15 47 16 35M30 60Q31 43 30 27M44 60Q43 49 44 39"
        fill="none"
        stroke={c.stem}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M16 53q-8-2-10-8q7 0 10 6zM30 49q8-3 10-9q-7 0-10 7zM44 55q-7-1-9-7q6 0 9 5z" fill={c.leaf} />
      {TULIP_HEADS.map(([x, y], i) =>
        night ? (
          <ellipse key={i} cx={x} cy={y} rx="3.3" ry="5.8" fill={c.bud} />
        ) : (
          <path
            key={i}
            d={`M${x - 6.5} ${y - 4}q0 10 6.5 10t6.5-10l-3.2 3.2-3.3-6.4-3.3 6.4z`}
            fill={colors[i]}
          />
        ),
      )}
    </svg>
  );
}

function Landscape({ night, uid }: { night: boolean; uid: string }) {
  const c = night ? NIGHT_LAND : DAY_LAND;
  const gid = `${uid}-${night ? 'n' : 'd'}`;
  return (
    <div className={`dn-land-layer ${night ? 'dn-land-night' : 'dn-land-day'}`}>
      <svg className="dn-hills" viewBox="0 0 1000 220" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id={`${gid}-near`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.nearTop} />
            <stop offset="1" stopColor={c.nearBottom} />
          </linearGradient>
          <linearGradient id={`${gid}-pond`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.pondTop} />
            <stop offset="1" stopColor={c.pondBottom} />
          </linearGradient>
        </defs>
        <path d={`${FAR_LINE}${TO_BOTTOM}`} fill={c.far} />
        <path d={FAR_LINE} className="dn-rim" stroke={c.farRim} />
        <path d={`${MID_LINE}${TO_BOTTOM}`} fill={c.mid} />
        <path d={`${NEAR_LINE}${TO_BOTTOM}`} fill={`url(#${gid}-near)`} />
        <path d={NEAR_LINE} className="dn-rim" stroke={c.rim} />
        {!night && <path className="dn-land-warm" d={`${FAR_LINE}${TO_BOTTOM}`} />}
        <ellipse cx="500" cy="180" rx="120" ry="20" fill={`url(#${gid}-pond)`} />
        <ellipse cx="500" cy="180" rx="120" ry="20" className="dn-rim" stroke={c.pondRim} />
        <ellipse cx="456" cy="186" rx="16" ry="3.6" fill={c.lily} />
        <ellipse cx="552" cy="177" rx="12" ry="3" fill={c.lily} />
        <path d={REEDS} className="dn-reeds" stroke={c.reed} />
        <ellipse cx="379" cy="156" rx="2.6" ry="7" fill={c.reedHead} />
        <ellipse cx="621" cy="156" rx="2.6" ry="7" fill={c.reedHead} />
        <path d={FRONT_GRASS} fill={c.grass} />
      </svg>

      <i className={`dn-glitter ${night ? 'dn-glitter-night' : 'dn-glitter-day'}`} />

      <div className="dn-land-obj dn-house">
        <HouseArt c={c} night={night} />
        {night && (
          <>
            <i className="dn-smoke dn-smoke1" />
            <i className="dn-smoke dn-smoke2" />
            <i className="dn-smoke dn-smoke3" />
          </>
        )}
      </div>
      <div className="dn-land-obj dn-fence">
        <FenceArt c={c} />
      </div>
      <div className="dn-land-obj dn-trees">
        <TreesArt c={c} />
      </div>
      {FLOWER_CLUSTERS.map((cls, i) => (
        <div key={cls} className={`dn-land-obj dn-flowers ${cls}`}>
          <FlowersArt c={c} night={night} colors={TULIP_COLORS[i]} />
        </div>
      ))}
      {night &&
        FIREFLIES.map((f, i) => (
          <i
            key={i}
            className="dn-firefly"
            style={{ left: f.left, top: f.top, animationDuration: f.dur, animationDelay: f.delay }}
          />
        ))}
    </div>
  );
}

// ── Sun and moon (one button; the art drifts inside it, the hit area never moves) ──

const SUN_RAYS = Array.from({ length: 12 }, (_, i) => ({
  d: i % 2 === 0 ? 'M50 3.5L53.4 15H46.6Z' : 'M50 8.5L52.4 16.5H47.6Z',
  rotate: i * 30,
  long: i % 2 === 0,
}));

const Z_PATH = 'M2.2 2.4h5.6L2.2 7.6h5.6';

function SunMoonArt({ uid }: { uid: string }) {
  return (
    <svg className="dn-body-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${uid}-sunhalo`}>
          <stop offset="0.45" stopColor="#fff2b0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff2b0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-sundisc`} cx="0.38" cy="0.32" r="0.78">
          <stop offset="0" stopColor="#fff9d6" />
          <stop offset="0.55" stopColor="#ffe07a" />
          <stop offset="1" stopColor="#ffbf52" />
        </radialGradient>
        <radialGradient id={`${uid}-moonhalo`}>
          <stop offset="0.5" stopColor="#e6ecff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#e6ecff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-moondisc`} cx="0.36" cy="0.3" r="0.82">
          <stop offset="0" stopColor="#fffef6" />
          <stop offset="0.6" stopColor="#f3efd6" />
          <stop offset="1" stopColor="#d9d1ad" />
        </radialGradient>
      </defs>

      <g className="dn-sun">
        <circle cx="50" cy="50" r="48" fill={`url(#${uid}-sunhalo)`} />
        <circle cx="50" cy="50" r="27" fill={`url(#${uid}-sundisc)`} />
        <circle className="dn-sun-dusk" cx="50" cy="50" r="27" />
        <path
          d="M32.5 42a19 19 0 0 1 13-14"
          fill="none"
          stroke="#fffbe8"
          strokeOpacity="0.75"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="41" cy="47" r="2.7" fill="#8c5a3c" />
        <circle cx="59" cy="47" r="2.7" fill="#8c5a3c" />
        <circle cx="41.9" cy="46.1" r="0.9" fill="#ffffff" />
        <circle cx="59.9" cy="46.1" r="0.9" fill="#ffffff" />
        <path d="M42 55.5q8 7 16 0" fill="none" stroke="#b8673f" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="35.5" cy="55" r="4.2" fill="#ff9b84" fillOpacity="0.45" />
        <circle cx="64.5" cy="55" r="4.2" fill="#ff9b84" fillOpacity="0.45" />
      </g>

      <g className="dn-moon">
        <circle cx="50" cy="50" r="47" fill={`url(#${uid}-moonhalo)`} />
        <circle cx="50" cy="50" r="30" fill={`url(#${uid}-moondisc)`} />
        <g className="dn-craters">
          <circle cx="38" cy="66" r="4.5" />
          <circle cx="64" cy="36" r="4.2" />
          <circle cx="69" cy="64" r="2.8" />
          <circle cx="33" cy="37" r="2.4" />
        </g>
        <path
          d="M29.5 41a22 22 0 0 1 15-15.5"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.6"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M36 48q5 5 10 0M54 48q5 5 10 0"
          fill="none"
          stroke="#8a84a8"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <path d="M44 60q6 4 12 0" fill="none" stroke="#8a84a8" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx="35" cy="55.5" r="3.6" fill="#f7a8c9" fillOpacity="0.4" />
        <circle cx="65" cy="55.5" r="3.6" fill="#f7a8c9" fillOpacity="0.4" />
      </g>
    </svg>
  );
}

// ── Simulation types ─────────────────────────────────────────────────────────────

interface CloudEntity {
  node: HTMLDivElement;
  x: number;
  speed: number;
  tapped: boolean;
  scale: number;
}

interface BirdEntity {
  node: HTMLButtonElement;
  wing: SVGGElement | null;
  u: number;
  ltr: boolean;
  lane: number;
  secs: number;
  ph: number;
  loop: number;
}

interface GrowingStar {
  node: HTMLElement;
  t: number;
  target: number;
}

interface NightFlyer {
  node: HTMLDivElement;
  plane: boolean;
  u: number;
  t: number;
  ltr: boolean;
  y: number;
  slope: number;
}

function easeSmoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export default function DzienINocActivity() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sceneRef = useRef<HTMLDivElement>(null);
  const starBoxRef = useRef<HTMLDivElement>(null);
  const twinkleRef = useRef<HTMLDivElement>(null);
  const cloudBoxRef = useRef<HTMLDivElement>(null);
  const bodyBtnRef = useRef<HTMLButtonElement>(null);

  // Three twinkle layers, each animated as one composited layer.
  const starGroups = useMemo(() => {
    const stars = makeInitialStars();
    return [0, 1, 2].map((g) => stars.filter((_, i) => i % 3 === g));
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const starBox = starBoxRef.current;
    const cloudBox = cloudBoxRef.current;
    const bodyBtn = bodyBtnRef.current;
    if (!scene || !starBox || !cloudBox || !bodyBtn) return;
    const starLayer: HTMLElement = twinkleRef.current ?? starBox;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let progress = 0;
    let target = 0;
    let stepFrom = 0;
    let stepT = 0;
    let busy = false;
    let stepRaf = 0;
    let stepLast = 0;
    let hidden = document.hidden;

    const clouds: CloudEntity[] = [];
    const birds: BirdEntity[] = [];
    const timers: number[] = [];
    const addedStars: HTMLElement[] = [];

    const renderProgress = () => {
      scene.style.setProperty('--p', progress.toFixed(3));
      // Sunset strength: 0 at full day and full night, 1 in the middle of the transition.
      scene.style.setProperty('--dusk', Math.sin(Math.min(1, Math.max(0, progress)) * Math.PI).toFixed(3));
      const isNight = progress >= 0.5;
      bodyBtn.setAttribute('aria-label', isNight ? 'Księżyc' : 'Słońce');
    };

    const stepTransition = (now: number) => {
      stepRaf = 0;
      const dt = Math.min(now - stepLast, 100);
      stepLast = now;
      const dur = reduced ? REDUCED_MS : TRANSITION_MS;
      stepT = Math.min(stepT + dt / dur, 1);
      progress = stepFrom + (target - stepFrom) * easeSmoothstep(stepT);
      renderProgress();
      if (stepT >= 1) {
        progress = target;
        busy = false;
        renderProgress();
        return;
      }
      stepRaf = requestAnimationFrame(stepTransition);
    };

    const toggleDayNight = () => {
      busy = true;
      stepFrom = progress;
      stepT = 0;
      target = progress < 0.5 ? 1 : 0;
      stepLast = performance.now();
      if (!hidden && !stepRaf) {
        stepRaf = requestAnimationFrame(stepTransition);
      }
    };

    // ── Clouds ──────────────────────────────────────────────────
    const placeCloud = (c: CloudEntity) => {
      c.node.style.transform = `translateX(${c.x.toFixed(2)}vw) scale(${c.scale.toFixed(3)})`;
    };

    const removeCloud = (c: CloudEntity) => {
      const idx = clouds.indexOf(c);
      if (idx >= 0) clouds.splice(idx, 1);
      c.node.remove();
    };

    const addCloud = (x: number, y: number, speed: number, tapped: boolean): CloudEntity => {
      while (clouds.length >= MAX_CLOUDS) {
        removeCloud(clouds[0]);
      }
      const node = document.createElement('div');
      node.className = 'dn-cloud';
      node.innerHTML = CLOUD_SVG;
      node.style.top = `${y}%`;
      // Parallax: wider clouds are "nearer" - they scale up, move faster and are more opaque.
      const width = 18 + Math.random() * 12;
      const w01 = (width - 18) / 12;
      const scale = 0.78 + w01 * 0.42;
      const depthSpeed = 0.7 + w01 * 0.6;
      node.style.setProperty('--w', `${width.toFixed(2)}vmin`);
      node.style.setProperty('--depth', (0.8 + w01 * 0.2).toFixed(2));
      cloudBox.appendChild(node);
      const entity: CloudEntity = { node, x, speed: speed * depthSpeed, tapped, scale };
      clouds.push(entity);
      placeCloud(entity);
      return entity;
    };

    const ensureAmbientClouds = () => {
      let ambientCount = clouds.filter((c) => !c.tapped).length;
      while (ambientCount < AMBIENT) {
        addCloud(
          ambientCount === 0 && clouds.length === 0 ? 10 : -25 - Math.random() * 20,
          8 + Math.random() * 40,
          1.6 + Math.random() * 0.8,
          false,
        );
        ambientCount++;
      }
    };

    [8, 42, 70].forEach((x, idx) => {
      addCloud(x, 10 + idx * 14, 1.6 + idx * 0.4, false);
    });

    // ── Birds ───────────────────────────────────────────────────
    const flockSize = 2 + Math.floor(Math.random() * 2);
    let respawnTimers: number[] = [];
    let flockOn = false;

    const removeBird = (b: BirdEntity) => {
      const idx = birds.indexOf(b);
      if (idx >= 0) birds.splice(idx, 1);
      b.node.remove();
    };

    const laneY = (b: BirdEntity, w: number, h: number, bh: number) => {
      const size = Math.min(Math.max(150, Math.min(w, h) * 0.38), 320);
      const top = h * 0.42 - size / 2;
      const bottom = h * 0.42 + size / 2;
      const R = Math.min(w, h) * 0.07;
      const m = h * 0.02 + 4;
      const t0 = m + R;
      const t1 = top - bh - m;
      const b0 = bottom + m;
      const b1 = h - bh - m - R;
      const lt = Math.max(t1 - t0, 0);
      const lb = Math.max(b1 - b0, 0);
      const tot = lt + lb;
      if (tot <= 0) return { y: Math.max(t0, 0), dir: 0 };
      const d = b.lane * tot;
      return d < lt ? { y: t0 + d, dir: -1 } : { y: b0 + (d - lt), dir: 1 };
    };

    const placeBird = (b: BirdEntity, dt: number) => {
      const w = scene.clientWidth;
      const h = scene.clientHeight;
      const bw = b.node.offsetWidth || 56;
      const bh = Math.max(b.node.offsetHeight || 56, 56);
      b.u += dt / b.secs;
      b.ph += dt * 2.4 * Math.PI;

      const ly = laneY(b, w, h, bh);
      let x = -bw + b.u * (w + 2 * bw);
      let y = ly.y + Math.sin(b.u * 5 + b.lane * 6) * h * 0.02;
      const R = Math.min(w, h) * 0.07;

      if (!b.ltr) {
        x = w - x - bw;
      }

      if (b.loop >= 0) {
        b.loop += dt / LOOP_SECONDS;
        if (b.loop >= 1) {
          b.loop = -1;
        } else {
          const a = b.loop * 2 * Math.PI;
          const env = Math.sin(b.loop * Math.PI);
          x += (b.ltr ? 1 : -1) * R * Math.sin(a) * env;
          y += (ly.dir || -1) * R * (1 - Math.cos(a)) * 0.5 * env;
        }
      }

      const flap = 0.55 + 0.45 * Math.cos(b.ph);
      b.wing?.setAttribute('transform', `scale(1 ${flap.toFixed(3)})`);
      b.node.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${b.ltr ? 1 : -1},1)`;
    };

    const spawnBird = (initialU: number) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'dn-bird';
      node.setAttribute('aria-label', 'Ptaszek');
      node.innerHTML = BIRD_SVG;
      const colors = BIRD_COLORS[Math.floor(Math.random() * BIRD_COLORS.length)];
      node.style.setProperty('--bird-body', colors.body);
      node.style.setProperty('--bird-belly', colors.belly);
      node.style.setProperty('--bird-wing', colors.wing);
      node.style.setProperty('--bird-tip', colors.tip);
      scene.appendChild(node);

      const entity: BirdEntity = {
        node,
        wing: node.querySelector('.dn-wing'),
        u: initialU,
        ltr: Math.random() < 0.5,
        lane: Math.random(),
        secs: BIRD_SECONDS * (0.85 + Math.random() * 0.4),
        ph: Math.random() * 6.28,
        loop: -1,
      };
      birds.push(entity);
      placeBird(entity, 0);
    };

    const clearFlock = () => {
      birds.slice().forEach(removeBird);
      respawnTimers = [];
      flockOn = false;
    };

    const birdTick = (dt: number) => {
      if (progress >= 0.5) {
        if (birds.length > 0 || flockOn) clearFlock();
        return;
      }
      if (!flockOn) {
        if (!(progress < 0.05 && target === 0)) return;
        flockOn = true;
        for (let i = 0; i < flockSize; i++) {
          spawnBird(((i + Math.random() * 0.6) / flockSize) * 0.9);
        }
        return;
      }

      birds.slice().forEach((b) => {
        if (b.u >= 1) {
          removeBird(b);
          respawnTimers.push(Math.random() * 1.5);
        } else {
          placeBird(b, dt);
        }
      });

      respawnTimers = respawnTimers
        .map((t) => t - dt)
        .filter((t) => {
          if (t > 0 || birds.length >= flockSize) return t > 0;
          spawnBird(0);
          return false;
        });
    };

    const touchBird = (birdNode: Element) => {
      const found = birds.find((b) => b.node === birdNode);
      if (found && found.loop < 0) {
        found.loop = 0;
      }
    };

    // ── Slowly growing night stars ──────────────────────────────
    let starCount = 100;
    let starWait = STAR_ADD_MIN + Math.random() * (STAR_ADD_MAX - STAR_ADD_MIN);
    let growing: GrowingStar[] = [];

    const addNewStar = () => {
      const r = Math.random();
      const bright = r < 0.1;
      const targetSize = bright ? 3 + Math.random() : r < 0.35 ? 1 : 1.4 + Math.random() * 1.3;
      const node = document.createElement('i');
      if (bright) node.className = 'dn-star-bright';
      const opacity = (bright ? 0.9 : 0.4 + Math.random() * 0.4).toFixed(2);
      node.style.cssText = `left:${(2 + Math.random() * 96).toFixed(1)}%;top:${(2 + Math.random() * 94).toFixed(1)}%;width:1px;height:1px;transform:translate(-50%,-50%);opacity:${opacity}`;
      starLayer.appendChild(node);
      addedStars.push(node);
      starCount++;
      if (targetSize > 1) {
        growing.push({ node, t: 0, target: targetSize });
      }
    };

    const starTick = (dt: number) => {
      if (starCount < STAR_CAP) {
        starWait -= dt;
        if (starWait <= 0) {
          starWait = STAR_ADD_MIN + Math.random() * (STAR_ADD_MAX - STAR_ADD_MIN);
          addNewStar();
        }
      }
      growing = growing.filter((g) => {
        g.t = Math.min(g.t + dt / STAR_GROW_SECONDS, 1);
        const px = `${(1 + (g.target - 1) * easeSmoothstep(g.t)).toFixed(2)}px`;
        g.node.style.width = px;
        g.node.style.height = px;
        return g.t < 1;
      });
    };

    // ── Night flyer (satellite or plane) ────────────────────────
    let flyer: NightFlyer | null = null;
    let flyWait = FLY_MIN + Math.random() * (FLY_MAX - FLY_MIN);

    const removeFlyer = () => {
      flyer?.node.remove();
      flyer = null;
    };

    const placeFlyer = (dt: number) => {
      if (!flyer) return;
      flyer.u += dt / (flyer.plane ? PLANE_SECONDS : SAT_SECONDS);
      flyer.t += dt;
      const x = flyer.ltr ? -2 + flyer.u * 104 : 102 - flyer.u * 104;
      flyer.node.style.left = `${x.toFixed(2)}%`;
      flyer.node.style.top = `${(flyer.y + flyer.u * flyer.slope).toFixed(2)}%`;
      if (flyer.plane) {
        const pulse = 0.5 - 0.5 * Math.cos((2 * Math.PI * flyer.t) / BLINK_SECONDS);
        flyer.node.style.setProperty('--pulse', pulse.toFixed(3));
      }
    };

    const flyerTick = (dt: number) => {
      if (flyer) {
        if (progress < 0.5 || flyer.u >= 1) {
          removeFlyer();
        } else {
          placeFlyer(dt);
        }
      } else if (progress >= 0.95 && target === 1) {
        flyWait -= dt;
        if (flyWait <= 0) {
          flyWait = FLY_MIN + Math.random() * (FLY_MAX - FLY_MIN);
          const node = document.createElement('div');
          const plane = Math.random() < 0.5;
          const ltr = Math.random() < 0.5;
          node.className = `dn-fly ${plane ? 'plane' : 'sat'}${ltr ? '' : ' rtl'}`;
          node.innerHTML = plane ? PLANE_SVG : SAT_SVG;
          starBox.appendChild(node);
          flyer = {
            node,
            plane,
            u: 0,
            t: 0,
            ltr,
            y: 4 + Math.random() * 40,
            slope: (Math.random() - 0.5) * 12,
          };
          placeFlyer(0);
        }
      }
    };

    // ── Continuous ambient loop ─────────────────────────────────
    let ambientLast = performance.now();
    let ambientRaf = 0;

    const ambientTick = (now: number) => {
      ambientRaf = 0;
      const dt = Math.min(now - ambientLast, 100) / 1000;
      ambientLast = now;

      birdTick(dt);
      flyerTick(dt);
      starTick(dt);

      if (!reduced) {
        clouds.slice().forEach((c) => {
          c.x += c.speed * dt;
          if (c.x > 105) {
            removeCloud(c);
          } else {
            placeCloud(c);
          }
        });
        ensureAmbientClouds();
      }

      if (!hidden) {
        ambientRaf = requestAnimationFrame(ambientTick);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      const targetEl = event.target as Element | null;
      const birdNode = targetEl?.closest('.dn-bird');
      if (birdNode) {
        touchBird(birdNode);
        return;
      }
      if (busy) return;
      if (targetEl?.closest('.dn-body')) {
        toggleDayNight();
        return;
      }

      const rect = scene.getBoundingClientRect();
      const h = Math.max(rect.height, 1);
      const w = Math.max(rect.width, 1);
      const relY = ((event.clientY - rect.top) / h) * 100;
      const relX = ((event.clientX - rect.left) / w) * 100;
      const y = Math.min(Math.max(relY - 8, 2), 70);

      if (reduced) {
        const c = addCloud(Math.min(Math.max(relX - 12, 0), 75), y, 0, true);
        const timerId = window.setTimeout(() => {
          const i = timers.indexOf(timerId);
          if (i >= 0) timers.splice(i, 1);
          removeCloud(c);
        }, 6000);
        timers.push(timerId);
      } else {
        addCloud(-30, y, 3.2, true);
      }
    };

    const onClick = (event: MouseEvent) => {
      if (event.detail !== 0) return;
      const targetEl = event.target as Element | null;
      const birdNode = targetEl?.closest('.dn-bird');
      if (birdNode) {
        touchBird(birdNode);
        return;
      }
      if (busy || !targetEl?.closest('.dn-body')) return;
      toggleDayNight();
    };

    const onVisibility = () => {
      hidden = document.hidden;
      scene.classList.toggle('paused', hidden);
      if (!hidden) {
        stepLast = ambientLast = performance.now();
        if (busy && !stepRaf) {
          stepRaf = requestAnimationFrame(stepTransition);
        }
        if (!ambientRaf) {
          ambientRaf = requestAnimationFrame(ambientTick);
        }
      }
    };

    scene.addEventListener('pointerdown', onPointerDown);
    scene.addEventListener('click', onClick);
    document.addEventListener('visibilitychange', onVisibility);
    renderProgress();
    ambientRaf = requestAnimationFrame(ambientTick);

    return () => {
      if (stepRaf) cancelAnimationFrame(stepRaf);
      if (ambientRaf) cancelAnimationFrame(ambientRaf);
      timers.forEach((id) => window.clearTimeout(id));
      scene.removeEventListener('pointerdown', onPointerDown);
      scene.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
      clouds.slice().forEach(removeCloud);
      clearFlock();
      removeFlyer();
      addedStars.forEach((el) => el.remove());
    };
  }, []);

  return (
    <div className="act-stage stage">
      <div ref={sceneRef} className="dn">
        <div className="dn-glow-day" aria-hidden="true" />
        <div className="dn-night" aria-hidden="true" />
        <div className="dn-milkyway" aria-hidden="true" />
        <div className="dn-glow-night" aria-hidden="true" />
        <div className="dn-dusk" aria-hidden="true" />

        <div ref={starBoxRef} className="dn-stars" aria-hidden="true">
          {starGroups.map((group, gi) => (
            <div key={gi} ref={gi === 1 ? twinkleRef : undefined} className={`dn-tw dn-tw${gi + 1}`}>
              {group.map((s) => (
                <i
                  key={s.key}
                  className={s.bright ? 'dn-star-bright' : undefined}
                  style={{
                    left: s.left,
                    top: s.top,
                    width: s.size,
                    height: s.size,
                    opacity: s.opacity,
                  }}
                />
              ))}
            </div>
          ))}
          <div className="dn-meteor" />
        </div>

        <div ref={cloudBoxRef} className="dn-clouds" aria-hidden="true" />

        <div className="dn-land" aria-hidden="true">
          <Landscape night={false} uid={uid} />
          <Landscape night uid={uid} />
        </div>

        <button ref={bodyBtnRef} className="dn-body" type="button" aria-label="Słońce">
          <span className="dn-sun-rays" aria-hidden="true">
            <span className="dn-sun-spin">
              <svg viewBox="0 0 100 100" focusable="false">
                {SUN_RAYS.map((ray) => (
                  <path
                    key={ray.rotate}
                    className={ray.long ? 'dn-ray' : 'dn-ray dn-ray-short'}
                    d={ray.d}
                    transform={`rotate(${ray.rotate} 50 50)`}
                  />
                ))}
              </svg>
            </span>
          </span>
          <SunMoonArt uid={uid} />
          <span className="dn-zs" aria-hidden="true">
            <i className="dn-z dn-z1">
              <svg viewBox="0 0 10 10" focusable="false">
                <path d={Z_PATH} />
              </svg>
            </i>
            <i className="dn-z dn-z2">
              <svg viewBox="0 0 10 10" focusable="false">
                <path d={Z_PATH} />
              </svg>
            </i>
          </span>
        </button>
      </div>
    </div>
  );
}
