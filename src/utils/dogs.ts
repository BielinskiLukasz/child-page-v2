// Shared dog family (TypeScript port of js/dogs.js).
// Side-view style (dog faces right, feet on y = 92 in a 120 x 100 viewBox).

const DARK = '#5b5675';
const MOUTH = '#9a8794';

export type DogSize = 'small' | 'medium' | 'large';
export type DogId =
  | 'labrador'
  | 'jamnik'
  | 'husky'
  | 'pudel'
  | 'owczarek'
  | 'buldog'
  | 'corgi'
  | 'dalmatynczyk';

export interface DogInfo {
  id: DogId;
  name: string;
  size: DogSize;
}

export interface DogDrawOptions {
  scale?: number;
}

export interface DogMouthPoint {
  x: number;
  y: number;
  px: number;
  py: number;
}

interface DogDef {
  name: string;
  size: DogSize;
  len: number;
  h: number;
  leg: number;
  hr: number;
  snout: number;
  fur: string;
  fur2: string;
  ear: string;
  ears: 'floppy' | 'point' | 'fold' | 'puff';
  tail: 'thick' | 'curl' | 'pom' | 'stub' | 'bushy';
  deco: 'spots' | 'mask' | 'saddle' | 'none';
}

export const SCALE: Record<DogSize, number> = {
  small: 0.78,
  medium: 0.89,
  large: 1,
};

const DEFS: Record<DogId, DogDef> = {
  labrador: {
    name: 'Labrador',
    size: 'medium',
    len: 52,
    h: 28,
    leg: 22,
    hr: 13,
    snout: 8,
    fur: '#e8c27a',
    fur2: '#f3dcab',
    ear: '#c9a05a',
    ears: 'floppy',
    tail: 'thick',
    deco: 'none',
  },
  jamnik: {
    name: 'Jamnik',
    size: 'small',
    len: 66,
    h: 20,
    leg: 10,
    hr: 11,
    snout: 9,
    fur: '#a8683f',
    fur2: '#c58d62',
    ear: '#7d4a2b',
    ears: 'floppy',
    tail: 'thick',
    deco: 'none',
  },
  husky: {
    name: 'Husky',
    size: 'medium',
    len: 50,
    h: 28,
    leg: 24,
    hr: 13,
    snout: 7,
    fur: '#8f98aa',
    fur2: '#f6f4fa',
    ear: '#6f788c',
    ears: 'point',
    tail: 'curl',
    deco: 'mask',
  },
  pudel: {
    name: 'Pudel',
    size: 'small',
    len: 42,
    h: 26,
    leg: 22,
    hr: 12,
    snout: 7,
    fur: '#f1e6d6',
    fur2: '#fbf4ea',
    ear: '#e6d6bf',
    ears: 'puff',
    tail: 'pom',
    deco: 'none',
  },
  owczarek: {
    name: 'Owczarek',
    size: 'large',
    len: 58,
    h: 30,
    leg: 26,
    hr: 14,
    snout: 9,
    fur: '#c98f55',
    fur2: '#e2b98a',
    ear: '#8a5a33',
    ears: 'point',
    tail: 'bushy',
    deco: 'saddle',
  },
  buldog: {
    name: 'Buldog',
    size: 'medium',
    len: 42,
    h: 30,
    leg: 14,
    hr: 15,
    snout: 6,
    fur: '#e3b98c',
    fur2: '#fbf1e4',
    ear: '#c08f63',
    ears: 'fold',
    tail: 'stub',
    deco: 'none',
  },
  corgi: {
    name: 'Corgi',
    size: 'small',
    len: 54,
    h: 24,
    leg: 11,
    hr: 12,
    snout: 8,
    fur: '#f0a560',
    fur2: '#fdf6ec',
    ear: '#e08e45',
    ears: 'point',
    tail: 'stub',
    deco: 'none',
  },
  dalmatynczyk: {
    name: 'Dalmatyńczyk',
    size: 'large',
    len: 56,
    h: 28,
    leg: 28,
    hr: 13,
    snout: 9,
    fur: '#fbfbfd',
    fur2: '#ffffff',
    ear: '#4f4a66',
    ears: 'floppy',
    tail: 'thick',
    deco: 'spots',
  },
};

const ORDER: readonly DogId[] = [
  'labrador',
  'jamnik',
  'husky',
  'pudel',
  'owczarek',
  'buldog',
  'corgi',
  'dalmatynczyk',
];

export const LIST: readonly DogInfo[] = ORDER.map((id) => ({
  id,
  name: DEFS[id].name,
  size: DEFS[id].size,
}));

export function byId(id: string): DogInfo {
  for (const entry of LIST) {
    if (entry.id === id) return entry;
  }
  return LIST[0];
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

function circ(x: number, y: number, r: number, c: string): string {
  return `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${c}"/>`;
}

function ell(x: number, y: number, rx: number, ry: number, c: string, extra = ''): string {
  return `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${c}"${extra}/>`;
}

function mouths(mx: number, ny: number, sn: number): string {
  const xl = mx - sn * 0.3;
  const xr = mx + sn * 0.55;
  const xm = (xl + xr) / 2;
  const y0 = ny + 1.2;
  return (
    `<path class="dg-calm" d="M${r1(xl)} ${r1(y0 + 0.4)}Q${r1(xm)} ${r1(y0 + 2.4)} ${r1(xr)} ${r1(y0 + 0.4)}" fill="none" stroke="${MOUTH}" stroke-width="0.9" stroke-linecap="round"/>` +
    `<g class="dg-happy" display="none"><path d="M${r1(xl)} ${r1(y0)}Q${r1(xm)} ${r1(y0 + 7)} ${r1(xr)} ${r1(y0)}Z" fill="#8a4a5e"/>` +
    `${ell(xm, y0 + 2.1, (xr - xl) * 0.2, 1.2, '#f48aa8')}</g>`
  );
}

function tailShape(b: DogDef): string {
  switch (b.tail) {
    case 'curl':
      return (
        `<path d="M0 0Q-13 -3 -11 -15Q-9 -22 -3 -17" fill="none" stroke="${b.fur}" stroke-width="6" stroke-linecap="round"/>` +
        `<path d="M-10 -12Q-9 -20 -3 -17" fill="none" stroke="${b.fur2}" stroke-width="3.5" stroke-linecap="round"/>`
      );
    case 'pom':
      return (
        `<path d="M0 0L-8 -9" stroke="${b.fur}" stroke-width="3" stroke-linecap="round"/>` +
        circ(-10, -12, 6.5, b.fur2)
      );
    case 'stub':
      return circ(-2, -2, 3.8, b.fur);
    case 'bushy':
      return (
        ell(-11, 3, 14, 5.5, b.fur, ' transform="rotate(18 -11 3)"') +
        ell(-15, 5, 8, 3, '#5b4a45', ' transform="rotate(18 -11 3)" opacity=".55"')
      );
    default:
      return ell(-9, -3, 11, 4, b.fur, ' transform="rotate(-20 -9 -3)"');
  }
}

function earShape(b: DogDef): string {
  switch (b.ears) {
    case 'point':
      return `<path d="M-7 0L-3 -19L6 -2Z" fill="${b.ear}"/><path d="M-4 -2L-2.6 -13L2.6 -3Z" fill="#f7c9d6"/>`;
    case 'fold':
      return ell(-1, -2, 6, 4.5, b.ear, ' transform="rotate(-20 -1 -2)"');
    case 'puff':
      return circ(0, -4, 6, b.ear) + ell(-3, 8, 6.5, 10, b.ear);
    default:
      return ell(-3, 8, 5.5, 10.5, b.ear, ' transform="rotate(8 -3 8)"');
  }
}

function deco(b: DogDef, x0: number, top: number, bot: number): string {
  let s = '';
  const c = '#4f4a66';
  if (b.deco === 'spots') {
    const sp: readonly (readonly [number, number, number])[] = [
      [0.15, 0.3, 3.2],
      [0.3, 0.7, 2.6],
      [0.45, 0.35, 3.6],
      [0.6, 0.75, 2.8],
      [0.75, 0.3, 3],
      [0.88, 0.6, 2.6],
      [0.55, 0.12, 2.2],
    ];
    for (const item of sp) {
      s += circ(x0 + item[0] * b.len, top + item[1] * (bot - top), item[2], c);
    }
  } else if (b.deco === 'saddle') {
    s =
      `<path d="M${r1(x0 + 6)} ${r1(top + 2)}Q${r1(x0 + b.len * 0.5)} ${r1(top - 1)} ${r1(x0 + b.len - 6)} ${r1(top + 3)}` +
      `Q${r1(x0 + b.len * 0.55)} ${r1(top + b.h * 0.6)} ${r1(x0 + 8)} ${r1(top + b.h * 0.5)}Z" fill="#4a3f45" opacity=".85"/>`;
  }
  return s;
}

export function draw(id: string, opts?: DogDrawOptions): string {
  const b = DEFS[byId(id).id];
  const sc = opts && opts.scale != null ? opts.scale : SCALE[b.size];
  const x0 = 14;
  const x1 = x0 + b.len;
  const bot = 92 - b.leg;
  const top = bot - b.h;
  const hx = x1 + 5;
  const hy = top + 3;
  const hr = b.hr;
  const sn = b.snout;

  let legs = '';
  const legX = [x0 + 3, x0 + 13, x1 - 21, x1 - 11];
  for (let i = 0; i < 4; i++) {
    legs +=
      `<rect x="${legX[i]}" y="${r1(bot - 4)}" width="8" height="${b.leg + 4}" rx="4" fill="${b.fur}"/>` +
      ell(legX[i] + 4, 91.5, 5, 2.6, b.fur2);
  }

  const tailPx = x0 + 2;
  const tailPy = top + 7;
  const earPx = hx - hr * 0.3;
  const earPy = hy - hr * 0.7;
  const headDark = b.deco === 'mask';

  const body =
    `<g class="dg-body"><rect x="${x0}" y="${r1(top)}" width="${b.len}" height="${b.h}" rx="${b.h / 2}" fill="${b.fur}"/>` +
    ell(x1 - 14, bot - 4, 11, 5, b.fur2) +
    deco(b, x0, top, bot) +
    '</g>';
  const tail =
    `<g class="dg-tail" data-px="${tailPx}" data-py="${r1(tailPy)}"><g transform="translate(${tailPx} ${r1(tailPy)})">${tailShape(b)}</g></g>`;
  const ears =
    `<g class="dg-ears" data-px="${r1(earPx)}" data-py="${r1(earPy)}"><g transform="translate(${r1(earPx)} ${r1(earPy)})">${earShape(b)}</g></g>`;

  const nx = hr * 0.7 + sn - 3;
  const ny = hy + hr * 0.3;
  const head =
    `<g class="dg-head">` +
    circ(hx, hy, hr, headDark ? '#7b8498' : b.fur) +
    (b.deco === 'spots' ? circ(hx + 2, hy - hr * 0.6, 2.4, '#4f4a66') : '') +
    ell(hx + hr * 0.7, ny, sn, hr * 0.5, headDark ? '#f6f4fa' : b.fur2) +
    (headDark ? ell(hx + 1, hy + 3, hr * 0.7, hr * 0.7, '#f6f4fa') : '') +
    ell(hx + nx + 3, ny - hr * 0.2, 3, 2.2, DARK) +
    circ(hx + hr * 0.3, hy - hr * 0.2, 2, DARK) +
    circ(hx + hr * 0.3 + 0.7, hy - hr * 0.2 - 0.7, 0.7, '#fff') +
    mouths(hx + hr * 0.7, ny, sn) +
    '</g>';

  const inner = `${tail}<g class="dg-legs">${legs}</g>${body}${head}${ears}`;
  const tf = `translate(60 92) scale(${sc}) translate(-60 -92)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" class="dg-svg" aria-hidden="true"><g transform="${tf}">${inner}</g></svg>`;
}

export function mouthPoint(id: string, deg = 0): DogMouthPoint {
  const b = DEFS[byId(id).id];
  const sc = SCALE[b.size];
  const hx = 14 + b.len + 5;
  const hy = 92 - b.leg - b.h + 3;
  const ny = hy + b.hr * 0.3;
  const px = hx - b.hr * 0.4;
  const py = hy + b.hr * 0.6;
  const x = hx + b.hr * 0.7 + b.snout * 0.85;
  const y = ny + 2;
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const rx = px + (x - px) * c - (y - py) * s;
  const ry = py + (x - px) * s + (y - py) * c;
  return {
    x: 60 + (rx - 60) * sc,
    y: 92 + (ry - 92) * sc,
    px: r1(px),
    py: r1(py),
  };
}

export const Dogs = {
  LIST,
  SCALE,
  byId,
  draw,
  mouthPoint,
};
