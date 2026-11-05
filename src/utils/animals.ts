// Shared animal family (TypeScript port of js/animals.js).
// Round-head style (r = 16, centred on 0,0) used across animal activities.

import { shuffle } from './rand';

const DARK = '#5b5675';

export type AnimalId =
  | 'bear'
  | 'rabbit'
  | 'cat'
  | 'dog'
  | 'mouse'
  | 'pig'
  | 'fox'
  | 'lion'
  | 'elephant'
  | 'panda'
  | 'frog'
  | 'owl'
  | 'koala';

export interface AnimalInfo {
  id: AnimalId;
  name: string;
  fur: string;
  sil: string;
  top: number;
}

export interface AnimalHeadOptions {
  noEyes?: boolean;
  bare?: boolean;
  body?: boolean;
  eyesClass?: string;
  shadow?: string;
}

export interface AnimalPickOptions {
  ids?: readonly AnimalId[];
  distinct?: boolean;
}

interface AnimalDef {
  name: string;
  fur: string;
  sil: string;
  top: number;
  side?: number;
  body?: string;
  back: (fur: string) => string;
  face: (fur: string) => string;
  nose: (fur: string) => string;
  eyes: readonly (readonly [number, number])[];
  eyeColor?: string;
}

function circ(x: number, y: number, r: number, c: string): string {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
}

function ell(x: number, y: number, rx: number, ry: number, c: string, extra = ''): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}"${extra}/>`;
}

function path(d: string, c: string): string {
  return `<path d="${d}" fill="${c}"/>`;
}

const DEFS: Record<AnimalId, AnimalDef> = {
  bear: {
    name: 'Miś',
    fur: '#d2a67f',
    sil: 'round',
    top: 19,
    body: '#d2a67f',
    back: (f) => circ(-13, -13, 6, f) + circ(13, -13, 6, f),
    face: (f) => circ(0, 0, 16, f) + ell(0, 5, 6, 4.5, '#f3dcc4'),
    nose: () => circ(0, 3.5, 2, '#6b5a73'),
    eyes: [[-6, -3], [6, -3]],
  },
  rabbit: {
    name: 'Króliczek',
    fur: '#f3ecf7',
    sil: 'long',
    top: 38,
    back: (f) =>
      ell(-8, -26, 4.5, 12, f) +
      ell(8, -26, 4.5, 12, f) +
      ell(-8, -26, 2, 8, '#f7b7cf') +
      ell(8, -26, 2, 8, '#f7b7cf'),
    face: (f) => circ(0, 0, 16, f),
    nose: () => circ(0, 4, 2, '#e99bb5'),
    eyes: [[-6, -3], [6, -3]],
  },
  cat: {
    name: 'Kotek',
    fur: '#f2c48d',
    sil: 'point',
    top: 25,
    back: (f) =>
      path('M-15 -8l3-17 11 9z', f) +
      path('M15 -8l-3-17-11 9z', f) +
      path('M-12 -12l1.5-8 5 4z', '#f7c9d6') +
      path('M12 -12l-1.5-8-5 4z', '#f7c9d6'),
    face: (f) => circ(0, 0, 16, f),
    nose: () => circ(0, 4, 2, '#e99bb5'),
    eyes: [[-6, -3], [6, -3]],
  },
  dog: {
    name: 'Piesek',
    fur: '#dcb88e',
    sil: 'floppy',
    top: 17,
    side: 21,
    back: () =>
      '<ellipse cx="-14" cy="-1" rx="5.5" ry="11" fill="#b58a62" transform="rotate(14 -14 -1)"/>' +
      '<ellipse cx="14" cy="-1" rx="5.5" ry="11" fill="#b58a62" transform="rotate(-14 14 -1)"/>',
    face: (f) => circ(0, 0, 16, f) + ell(0, 6, 7, 5, '#f6e6d2'),
    nose: () => ell(0, 3.5, 3, 2, DARK),
    eyes: [[-6, -3], [6, -3]],
  },
  mouse: {
    name: 'Myszka',
    fur: '#cfcad8',
    sil: 'bigear',
    top: 20,
    back: (f) =>
      circ(-12, -12, 8, f) +
      circ(12, -12, 8, f) +
      circ(-12, -12, 5, '#f7c9d6') +
      circ(12, -12, 5, '#f7c9d6'),
    face: (f) => circ(0, 0, 16, f),
    nose: () =>
      circ(0, 4, 1.8, '#e99bb5') +
      `<path d="M-5 6l-8-1M-5 8l-8 2M5 6l8-1M5 8l8 2" stroke="${DARK}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".55"/>`,
    eyes: [[-6, -3], [6, -3]],
  },
  pig: {
    name: 'Świnka',
    fur: '#f7b9c8',
    sil: 'folded',
    top: 22,
    back: (f) => path('M-14 -7L-18 -21 -4 -14z', f) + path('M14 -7L18 -21 4 -14z', f),
    face: (f) => circ(0, 0, 16, f) + ell(0, 5, 7, 5, '#ef93aa'),
    nose: () => circ(-2.6, 5, 1.2, '#b0607a') + circ(2.6, 5, 1.2, '#b0607a'),
    eyes: [[-6, -3], [6, -3]],
  },
  fox: {
    name: 'Lisek',
    fur: '#f2a45b',
    sil: 'point',
    top: 30,
    back: (f) =>
      path('M-15 -6L-13 -30 -2 -13z', f) +
      path('M15 -6L13 -30 2 -13z', f) +
      path('M-12 -12l1-10 4 6z', '#5b4a55') +
      path('M12 -12l-1-10-4 6z', '#5b4a55'),
    face: (f) => circ(0, 0, 16, f) + ell(0, 8, 11, 8, '#fff4e6'),
    nose: () => circ(0, 5.5, 2, DARK),
    eyes: [[-6, -3], [6, -3]],
  },
  lion: {
    name: 'Lew',
    fur: '#f0c36b',
    sil: 'mane',
    top: 22,
    side: 22,
    back: (f) => circ(0, 0, 22, '#d9964a') + circ(-11, -14, 4.5, f) + circ(11, -14, 4.5, f),
    face: (f) => circ(0, 0, 16, f) + ell(0, 6, 6, 4.5, '#fbe3b8'),
    nose: () => circ(0, 4, 2, '#8a5a44'),
    eyes: [[-6, -3], [6, -3]],
  },
  elephant: {
    name: 'Słoń',
    fur: '#b9c9dc',
    sil: 'trunk',
    top: 17,
    side: 27,
    back: (f) =>
      circ(-17, 0, 10, f) +
      circ(17, 0, 10, f) +
      circ(-17, 0, 6, '#d6b8c8') +
      circ(17, 0, 6, '#d6b8c8'),
    face: (f) => circ(0, 0, 16, f) + `<rect x="-4" y="3" width="8" height="22" rx="4" fill="${f}"/>`,
    nose: () => '<path d="M-3 12h6M-3 17h6" stroke="#8fa3bb" stroke-width="1.4" stroke-linecap="round"/>',
    eyes: [[-6, -3], [6, -3]],
  },
  panda: {
    name: 'Panda',
    fur: '#fbfbfd',
    sil: 'round',
    top: 19,
    back: () => circ(-12, -13, 6, '#4a4560') + circ(12, -13, 6, '#4a4560'),
    face: (f) =>
      circ(0, 0, 16, f) +
      '<ellipse cx="-6" cy="-2" rx="4.5" ry="5.5" fill="#4a4560" transform="rotate(20 -6 -2)"/>' +
      '<ellipse cx="6" cy="-2" rx="4.5" ry="5.5" fill="#4a4560" transform="rotate(-20 6 -2)"/>',
    nose: () => ell(0, 4.5, 2.4, 1.8, '#4a4560'),
    eyes: [[-6, -3], [6, -3]],
    eyeColor: '#fff',
  },
  frog: {
    name: 'Żabka',
    fur: '#9fd48f',
    sil: 'bulb',
    top: 19,
    back: (f) => circ(-9, -13, 6, f) + circ(9, -13, 6, f),
    face: (f) => circ(0, 0, 16, f) + circ(-9, -13, 4.4, '#fff') + circ(9, -13, 4.4, '#fff'),
    nose: () =>
      '<path d="M-8 5q8 6 16 0" fill="none" stroke="#5b7a52" stroke-width="1.8" stroke-linecap="round"/>',
    eyes: [[-9, -13], [9, -13]],
  },
  owl: {
    name: 'Sowa',
    fur: '#b89a7c',
    sil: 'tuft',
    top: 22,
    back: (f) => path('M-14 -8L-13 -22 -4 -13z', f) + path('M14 -8L13 -22 4 -13z', f),
    face: (f) => circ(0, 0, 16, f) + circ(-6.5, -3, 6, '#f3e4cf') + circ(6.5, -3, 6, '#f3e4cf'),
    nose: () => path('M-2.5 3h5l-2.5 5z', '#f2b84b'),
    eyes: [[-6.5, -3], [6.5, -3]],
  },
  koala: {
    name: 'Koala',
    fur: '#aeb4bf',
    sil: 'round',
    top: 20,
    side: 22,
    back: (f) =>
      circ(-14, -12, 8.5, f) +
      circ(14, -12, 8.5, f) +
      circ(-14, -12, 5, '#f0e6ee') +
      circ(14, -12, 5, '#f0e6ee'),
    face: (f) => circ(0, 0, 16, f),
    nose: () => ell(0, 3, 4.2, 5.5, '#4a4560'),
    eyes: [[-7, -4], [7, -4]],
  },
};

const ORDER: readonly AnimalId[] = [
  'bear',
  'rabbit',
  'cat',
  'dog',
  'mouse',
  'pig',
  'fox',
  'lion',
  'elephant',
  'panda',
  'frog',
  'owl',
  'koala',
];

export const LIST: readonly AnimalInfo[] = ORDER.map((id) => {
  const d = DEFS[id];
  return { id, name: d.name, fur: d.fur, sil: d.sil, top: d.top };
});

const BY_ID: Record<string, AnimalInfo> = {};
for (const entry of LIST) {
  BY_ID[entry.id] = entry;
}

export function byId(id: string): AnimalInfo {
  return BY_ID[id] || LIST[0];
}

export function head(id: string, opts: AnimalHeadOptions = {}): string {
  const d = (DEFS as Record<string, AnimalDef | undefined>)[id];
  if (!d) return '';
  const f = opts.shadow || d.fur;
  let s = d.back(f);
  if (opts.body) {
    s += ell(0, 27, 18, 12, f);
  }
  const face = d.face(f);
  if (opts.shadow) {
    const all = s + face;
    return all.replace(/fill="#[0-9a-fA-F]{3,6}"/g, `fill="${opts.shadow}"`);
  }
  s += face;
  if (opts.bare) return s;
  if (!opts.noEyes) {
    let dots = '';
    const ec = d.eyeColor || DARK;
    for (const p of d.eyes) {
      dots += circ(p[0], p[1], 2, ec);
    }
    s += opts.eyesClass ? `<g class="${opts.eyesClass}">${dots}</g>` : dots;
  }
  return s + d.nose(f);
}

export function eyes(id: string): readonly (readonly [number, number])[] {
  const d = (DEFS as Record<string, AnimalDef | undefined>)[id];
  return d ? d.eyes : [];
}

export function eyeColor(id: string): string {
  const d = (DEFS as Record<string, AnimalDef | undefined>)[id];
  return (d && d.eyeColor) || DARK;
}

export function pick(n: number, opts: AnimalPickOptions = {}): AnimalInfo[] {
  const ids = opts.ids || ORDER;
  const pool = ids.map((id) => BY_ID[id]).filter((a): a is AnimalInfo => Boolean(a));
  const shuffled = shuffle(pool);
  if (!opts.distinct) {
    return shuffled.slice(0, n);
  }
  const out: AnimalInfo[] = [];
  const seen = new Set<string>();
  for (const a of shuffled) {
    if (out.length < n && !seen.has(a.sil)) {
      seen.add(a.sil);
      out.push(a);
    }
  }
  for (const a of shuffled) {
    if (out.length < n && !out.includes(a)) {
      out.push(a);
    }
  }
  return out;
}

export const Animals = {
  LIST,
  byId,
  head,
  eyes,
  eyeColor,
  pick,
};
