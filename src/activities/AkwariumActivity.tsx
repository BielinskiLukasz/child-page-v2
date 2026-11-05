import { useEffect, useRef } from 'react';
import { pick } from '../utils/rand';

const MAX_FOOD = 10;
const MAX_BUBBLES = 30;
const FOOD_FALL = 28;
const FOOD_REST_MS = 6000;
const FOOD_MAX_MS = 25000;
const MAX_RIPPLES = 10;
const MAX_PUFFS = 60;

const MIN_FISH = 2;
const MAX_FISH = 8;

const COLORS = [
  '#ffb7a5',
  '#ffd98a',
  '#f7a8c9',
  '#a8d8f0',
  '#b9e4b0',
  '#cbb8f0',
  '#ffc78f',
  '#f2f0a0',
  '#8fd9d0',
] as const;

const SHAPES = ['oval', 'round', 'slim', 'diamond', 'flat'] as const;
type FishShape = (typeof SHAPES)[number];

const PATTERNS = ['stripes', 'spots', 'belly', 'plain'] as const;
type FishPattern = (typeof PATTERNS)[number];

interface FoodPellet {
  x: number;
  y: number;
  age: number;
  rest: number;
  eaten: boolean;
  ph: number;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  ph: number;
  v: number;
  pop: number;
}

interface Ripple {
  x: number;
  y: number;
  r: number;
  a: number;
}

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  r: number;
  color: string;
}

interface Fish {
  x: number;
  y: number;
  a: number;
  wander: number;
  wanderT: number;
  size: number;
  color: string;
  shape: FishShape;
  pattern: FishPattern;
  nudge: number;
  nudgeT: number;
  target: FoodPellet | null;
  finPhase: number;
  blinkT: number;
  blinkDur: number;
  blushT: number;
  chompT: number;
  bubbleT: number;
  shimmer: number;
}

interface Plant {
  x: number;
  h: number;
  w: number;
  phase: number;
  layer: 0 | 1 | 2;
  color: string;
}

interface Plankton {
  x: number;
  y: number;
  r: number;
  v: number;
  ph: number;
  a: number;
}

interface Coral {
  x: number;
  y: number;
  h: number;
  branches: number;
  color: string;
  phase: number;
}

interface Anemone {
  x: number;
  y: number;
  tentacles: number;
  h: number;
  color: string;
  phase: number;
}

interface Starfish {
  x: number;
  y: number;
  r: number;
  rot: number;
  phase: number;
  color: string;
}

interface Crab {
  x: number;
  dir: number;
  speed: number;
  pauseT: number;
  legPhase: number;
  chompT: number;
  target: FoodPellet | null;
}

interface Jelly {
  x: number;
  y: number;
  r: number;
  phase: number;
  vx: number;
  vy: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amount)));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function wrapAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function makeFish(width: number, height: number): Fish[] {
  const count = MIN_FISH + Math.floor(Math.random() * (MAX_FISH - MIN_FISH + 1));
  const combos: { shape: FishShape; color: string }[] = [];
  for (const shape of SHAPES) {
    for (const color of COLORS) {
      combos.push({ shape, color });
    }
  }
  return pick(combos, count).map((combo, index) => {
    const facingLeft = Math.random() < 0.5;
    return {
      x: width * (0.1 + 0.8 * Math.random()),
      y: height * (0.15 + 0.55 * Math.random()),
      a: facingLeft ? Math.PI : 0,
      wander: 0,
      wanderT: index * 0.3,
      size: 26 + Math.floor(Math.random() * 3) * 4,
      color: combo.color,
      shape: combo.shape,
      pattern: PATTERNS[(index * 3 + SHAPES.indexOf(combo.shape)) % PATTERNS.length],
      nudge: 0,
      nudgeT: 0,
      target: null,
      finPhase: Math.random() * Math.PI * 2,
      blinkT: 2 + Math.random() * 6,
      blinkDur: 0,
      blushT: 0,
      chompT: 0,
      bubbleT: 4 + Math.random() * 10,
      shimmer: Math.random() * Math.PI * 2,
    };
  });
}

export default function AkwariumActivity() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context2d = canvasEl.getContext('2d');
    if (!context2d) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = context2d;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slow = reduced ? 0.6 : 1;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let S = 1;
    let sandTop = 0;
    let raf = 0;
    let last = 0;
    let time = 0;
    let initialized = false;
    let bg: HTMLCanvasElement | null = null;

    let food: FoodPellet[] = [];
    let bubbles: Bubble[] = [];
    let fish: Fish[] = [];
    let ripples: Ripple[] = [];
    let puffs: Puff[] = [];
    let plankton: Plankton[] = [];
    let plants: Plant[] = [];
    let corals: Coral[] = [];
    let anemones: Anemone[] = [];
    let starfish: Starfish | null = null;
    let crab: Crab | null = null;
    let jelly: Jelly | null = null;

    // ── Static backdrop (re-rendered only on resize) ────────────────
    function paintBackground() {
      const layer = document.createElement('canvas');
      layer.width = Math.max(1, Math.round(W * dpr));
      layer.height = Math.max(1, Math.round(H * dpr));
      const bctx = layer.getContext('2d');
      if (!bctx) {
        bg = null;
        return;
      }
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Water column: bright surface, teal middle, deep blue floor
      const water = bctx.createLinearGradient(0, 0, 0, H);
      water.addColorStop(0, '#e2f4fc');
      water.addColorStop(0.22, '#b6e0f3');
      water.addColorStop(0.55, '#84c4e4');
      water.addColorStop(0.82, '#5aa2cb');
      water.addColorStop(1, '#3f86b3');
      bctx.fillStyle = water;
      bctx.fillRect(0, 0, W, H);

      // Distant rock silhouettes, far behind everything
      bctx.fillStyle = 'rgba(52, 96, 132, 0.22)';
      const rocks = [
        { x: 0.12, w: 0.3, h: 0.3 },
        { x: 0.62, w: 0.42, h: 0.24 },
        { x: 0.88, w: 0.26, h: 0.34 },
      ];
      for (const rock of rocks) {
        const rx = rock.x * W;
        const rw = rock.w * W;
        const rh = rock.h * (sandTop - 20);
        bctx.beginPath();
        bctx.moveTo(rx - rw / 2, sandTop);
        bctx.quadraticCurveTo(rx - rw * 0.25, sandTop - rh * 1.15, rx + rw * 0.1, sandTop - rh);
        bctx.quadraticCurveTo(rx + rw * 0.4, sandTop - rh * 0.6, rx + rw / 2, sandTop);
        bctx.closePath();
        bctx.fill();
      }

      // Faded far corals for depth
      bctx.strokeStyle = 'rgba(120, 170, 195, 0.3)';
      bctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const cx = W * (0.08 + i * 0.21);
        const ch = (sandTop - 20) * (0.16 + ((i * 37) % 11) / 60);
        bctx.lineWidth = 5 * S;
        for (let k = -1; k <= 1; k++) {
          bctx.beginPath();
          bctx.moveTo(cx, sandTop - 4);
          bctx.quadraticCurveTo(cx + k * ch * 0.35, sandTop - ch * 0.7, cx + k * ch * 0.55, sandTop - ch);
          bctx.stroke();
        }
      }

      // Sand with a soft wavy edge
      const sand = bctx.createLinearGradient(0, sandTop - 10, 0, H);
      sand.addColorStop(0, '#f8ecd0');
      sand.addColorStop(0.45, '#eddcb4');
      sand.addColorStop(1, '#d3bd90');
      bctx.fillStyle = sand;
      bctx.beginPath();
      bctx.moveTo(0, H);
      bctx.lineTo(0, sandTop + 6);
      const step = Math.max(8, W / 60);
      for (let x = 0; x <= W; x += step) {
        bctx.lineTo(x, sandTop + Math.sin(x * 0.017 + 1.1) * 4 + Math.sin(x * 0.05) * 1.6);
      }
      bctx.lineTo(W, H);
      bctx.closePath();
      bctx.fill();

      // Sand ripples
      bctx.strokeStyle = 'rgba(178, 152, 108, 0.3)';
      bctx.lineWidth = 2 * S;
      for (let i = 0; i < 7; i++) {
        const y = sandTop + 12 + i * ((H - sandTop) / 8);
        bctx.beginPath();
        for (let x = -20; x <= W + 20; x += 16) {
          const yy = y + Math.sin(x * 0.03 + i * 1.7) * 2.4;
          if (x === -20) bctx.moveTo(x, yy);
          else bctx.lineTo(x, yy);
        }
        bctx.stroke();
      }

      // Pebbles and shells scattered on the floor
      const floorH = Math.max(12, H - sandTop);
      for (let i = 0; i < 16; i++) {
        const px = ((i * 137.5) % 100) * W * 0.01;
        const py = sandTop + 8 + ((i * 53) % 100) * floorH * 0.007;
        const pr = (2.4 + ((i * 29) % 5)) * S;
        bctx.fillStyle = i % 3 === 0 ? 'rgba(196, 176, 140, 0.85)' : 'rgba(168, 150, 118, 0.7)';
        bctx.beginPath();
        bctx.ellipse(px, py, pr, pr * 0.72, (i % 5) * 0.6, 0, Math.PI * 2);
        bctx.fill();
        bctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        bctx.beginPath();
        bctx.ellipse(px - pr * 0.3, py - pr * 0.28, pr * 0.34, pr * 0.2, 0, 0, Math.PI * 2);
        bctx.fill();
      }

      for (let i = 0; i < 3; i++) {
        const sx = W * (0.18 + i * 0.33);
        const sy = sandTop + 14 + i * 5;
        const sr = 9 * S;
        bctx.save();
        bctx.translate(sx, sy);
        bctx.rotate(i * 0.5 - 0.4);
        bctx.fillStyle = '#fbeadd';
        bctx.strokeStyle = 'rgba(196, 160, 140, 0.75)';
        bctx.lineWidth = 1.4 * S;
        bctx.beginPath();
        bctx.arc(0, 0, sr, Math.PI, 0);
        bctx.closePath();
        bctx.fill();
        bctx.stroke();
        for (let k = -2; k <= 2; k++) {
          bctx.beginPath();
          bctx.moveTo(k * sr * 0.3, 0);
          bctx.lineTo(k * sr * 0.52, -sr * 0.86);
          bctx.stroke();
        }
        bctx.restore();
      }

      bg = layer;
    }

    // ── Living decorations (rebuilt on resize) ──────────────────────
    function buildDecorations() {
      const floorH = Math.max(12, H - sandTop);

      plants = [];
      // Layer 0 sits far back (faded), layer 1 mid-water, layer 2 in front of the glass
      const plantColors: [string, 0 | 1 | 2][] = [
        ['#7fc4a4', 0],
        ['#8fd3ac', 0],
        ['#9bd3ac', 1],
        ['#b4e0bd', 1],
        ['#79c39b', 2],
        ['#a5dcb2', 2],
        ['#6fb98f', 2],
      ];
      const xs = [0.06, 0.12, 0.2, 0.42, 0.55, 0.66, 0.8, 0.88, 0.95];
      for (let i = 0; i < xs.length; i++) {
        const entry = plantColors[i % plantColors.length];
        plants.push({
          x: W * xs[i] + (i % 2 === 0 ? -8 : 10),
          h: (72 + ((i * 41) % 90)) * clamp(H / 520, 0.72, 1.5),
          w: (9 + ((i * 13) % 6)) * S,
          phase: i * 1.3,
          layer: entry[1],
          color: entry[0],
        });
      }
      corals = [];
      const coralColors = ['#f2a9b8', '#f6c48a', '#cbb8f0', '#8fd9d0'];
      for (let i = 0; i < 4; i++) {
        corals.push({
          x: W * (0.24 + i * 0.19),
          y: sandTop + 4,
          h: (34 + ((i * 23) % 26)) * S,
          branches: 4 + (i % 3),
          color: coralColors[i % coralColors.length],
          phase: i * 0.9,
        });
      }

      anemones = [];
      for (let i = 0; i < 2; i++) {
        anemones.push({
          x: W * (0.34 + i * 0.34),
          y: sandTop + 6,
          tentacles: 11,
          h: (26 + i * 7) * S,
          color: i === 0 ? '#f7b0c8' : '#b9e4b0',
          phase: i * 2.1,
        });
      }

      starfish = {
        x: W * 0.72,
        y: sandTop + floorH * 0.36,
        r: 15 * S,
        rot: 0.4,
        phase: 0,
        color: '#f6a98c',
      };

      crab = {
        x: W * 0.3,
        dir: Math.random() < 0.5 ? -1 : 1,
        speed: 11 * slow,
        pauseT: 1 + Math.random() * 2,
        legPhase: 0,
        chompT: 0,
        target: null,
      };

      jelly = {
        x: W * 0.5,
        y: H * 0.3,
        r: 26 * S,
        phase: 0,
        vx: 5 * slow,
        vy: -4 * slow,
      };

      plankton = [];
      for (let i = 0; i < 46; i++) {
        plankton.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 0.8 + Math.random() * 1.7,
          v: (4 + Math.random() * 9) * slow,
          ph: Math.random() * Math.PI * 2,
          a: 0.16 + Math.random() * 0.34,
        });
      }
    }

    function resize() {
      dpr = window.devicePixelRatio || 1;
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      if (W <= 0 || H <= 0) return;

      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      S = clamp(Math.min(W, H) / 520, 0.68, 1.4);
      sandTop = H - Math.max(30, H * 0.085);

      paintBackground();
      buildDecorations();

      if (!initialized) {
        fish = makeFish(W, H);
        initialized = true;
      } else {
        for (const f of fish) {
          f.x = clamp(f.x, 0, W);
          f.y = clamp(f.y, 0, H);
        }
      }
    }

    resize();

    const getSpeed = () => Math.max(24, W / 14) * slow;

    function addBubble(x: number, y: number, small = false) {
      if (bubbles.length >= MAX_BUBBLES) bubbles.shift();
      bubbles.push({
        x,
        y,
        r: small ? 2 + Math.random() * 2.4 : 3 + Math.random() * 4,
        ph: Math.random() * 6,
        v: (18 + Math.random() * 14) * slow,
        pop: 0,
      });
    }

    function addPuff(x: number, y: number, color: string, count: number) {
      for (let i = 0; i < count; i++) {
        if (puffs.length >= MAX_PUFFS) puffs.shift();
        const ang = Math.random() * Math.PI * 2;
        const sp = 8 + Math.random() * 20;
        puffs.push({
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 12,
          age: 0,
          life: 0.5 + Math.random() * 0.5,
          r: 1.2 + Math.random() * 2,
          color,
        });
      }
    }

    function addRipple(x: number, y: number) {
      if (ripples.length >= MAX_RIPPLES) ripples.shift();
      ripples.push({ x, y, r: 4, a: 0.55 });
    }

    // ── Input ───────────────────────────────────────────────────────
    function onPointerDown(event: PointerEvent) {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      addRipple(x, y);

      let hit: Fish | null = null;
      let bestDist = Infinity;
      for (const f of fish) {
        const dist = Math.hypot(f.x - x, f.y - y);
        if (dist < f.size * 1.8 && dist < bestDist) {
          bestDist = dist;
          hit = f;
        }
      }

      if (hit) {
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          addBubble(
            hit.x + Math.cos(hit.a) * hit.size + (Math.random() - 0.5) * 10,
            hit.y - 4 - i * 9,
          );
        }
        hit.nudge = (Math.random() < 0.5 ? -1 : 1) * 0.8;
        hit.nudgeT = 3;
        hit.blushT = 1.5;
        return;
      }

      if (food.length >= MAX_FOOD) food.shift();
      food.push({ x, y, age: 0, rest: 0, eaten: false, ph: Math.random() * 6 });
    }

    // ── Simulation ──────────────────────────────────────────────────
    function updateFish(dt: number) {
      const sp = getSpeed();

      for (const f of fish) {
        let best: FoodPellet | null = null;
        let bestDist = Infinity;
        for (const fd of food) {
          if (fd.eaten) continue;
          const dist = Math.hypot(f.x - fd.x, f.y - fd.y);
          if (dist < bestDist) {
            bestDist = dist;
            best = fd;
          }
        }
        f.target = best;
      }

      for (const f of fish) {
        let desired: number;
        let maxPitch = 0.45;
        const turn = 0.7 * slow;

        f.wanderT -= dt;
        if (f.wanderT <= 0) {
          f.wander = (Math.random() - 0.5) * 0.7;
          f.wanderT = 3 + Math.random() * 4;
        }
        if (f.nudgeT > 0) f.nudgeT -= dt;
        if (f.blushT > 0) f.blushT -= dt;
        if (f.chompT > 0) f.chompT -= dt;

        f.finPhase += dt * (f.target ? 7 : 3.4);

        f.blinkT -= dt;
        if (f.blinkDur > 0) {
          f.blinkDur -= dt;
        } else if (f.blinkT <= 0) {
          f.blinkDur = 0.14;
          f.blinkT = 3 + Math.random() * 6;
        }

        f.bubbleT -= dt;
        if (f.bubbleT <= 0) {
          f.bubbleT = 7 + Math.random() * 9;
          addBubble(f.x + Math.cos(f.a) * f.size * 0.9, f.y - f.size * 0.2, true);
        }

        if (f.target) {
          desired = Math.atan2(f.target.y - f.y, f.target.x - f.x);
          maxPitch = 1.0;
        } else {
          let dir = Math.cos(f.a) >= 0 ? 0 : Math.PI;
          const margin = Math.max(70, (1.6 * sp) / turn);
          if (f.x < margin) dir = 0;
          else if (f.x > W - margin) dir = Math.PI;

          const k = dir === 0 ? 1 : -1;
          desired = dir + k * (f.wander + (f.nudgeT > 0 ? f.nudge * 0.5 : 0));
          if (f.y < 50) desired += 0.3 * k;
          else if (f.y > H - 90) desired -= 0.3 * k;
        }

        const clampedSin = clamp(Math.sin(desired), -Math.sin(maxPitch), Math.sin(maxPitch));
        desired = Math.atan2(clampedSin, Math.cos(desired));
        f.a = wrapAngle(f.a + clamp(wrapAngle(desired - f.a), -turn * dt, turn * dt));
        f.x = clamp(f.x + Math.cos(f.a) * sp * dt, 0, W);
        f.y = clamp(f.y + Math.sin(f.a) * sp * dt, 30, Math.max(30, H - 50));

        if (
          f.target &&
          Math.hypot(f.target.x - f.x - Math.cos(f.a) * f.size, f.target.y - f.y) < f.size * 0.9
        ) {
          f.target.eaten = true;
          f.chompT = 0.45;
          addPuff(f.target.x, f.target.y, '#f0dfb6', 5);
        }
      }
    }

    function updateCrab(dt: number) {
      if (!crab) return;
      const c = crab;

      if (c.chompT > 0) c.chompT -= dt;

      // Look for a pellet resting near the floor
      if (!c.target || c.target.eaten) {
        c.target = null;
        let bestDist = 230;
        for (const fd of food) {
          if (fd.eaten || fd.y < sandTop - 26) continue;
          const d = Math.abs(fd.x - c.x);
          if (d < bestDist) {
            bestDist = d;
            c.target = fd;
          }
        }
      }

      if (c.pauseT > 0) {
        c.pauseT -= dt;
        c.legPhase += dt * 1.2;
      } else if (c.target) {
        const dirX = Math.sign(c.target.x - c.x) || c.dir;
        c.dir = dirX;
        c.x += dirX * c.speed * 1.5 * dt;
        c.legPhase += dt * 9;
        if (Math.abs(c.target.x - c.x) < 13) {
          c.target.eaten = true;
          c.chompT = 0.55;
          addPuff(c.target.x, sandTop + 4, '#f0dfb6', 4);
          c.target = null;
          c.pauseT = 1.4 + Math.random() * 2;
        }
      } else {
        c.x += c.dir * c.speed * dt;
        c.legPhase += dt * 5;
        if (c.x < W * 0.06) c.dir = 1;
        else if (c.x > W * 0.94) c.dir = -1;
        if (Math.random() < dt * 0.22) c.pauseT = 0.8 + Math.random() * 2.2;
      }

      c.x = clamp(c.x, W * 0.04, W * 0.96);
    }

    function update(dt: number) {
      if (W <= 0 || H <= 0) return;

      updateFish(dt);
      updateCrab(dt);

      // Jellyfish drifts and bobs, turning at the edges
      if (jelly) {
        jelly.phase += dt * 1.5 * slow;
        jelly.x += jelly.vx * dt;
        jelly.y += Math.sin(jelly.phase * 0.6) * 7 * dt + jelly.vy * dt * 0.35;
        if (jelly.x < W * 0.12 || jelly.x > W * 0.88) jelly.vx *= -1;
        if (jelly.y < H * 0.14 || jelly.y > sandTop - 60) jelly.vy *= -1;
      }

      // Plankton drifts upward with a lazy sway
      for (const p of plankton) {
        p.y -= p.v * dt;
        p.x += Math.sin(time * 0.6 + p.ph) * 5 * dt;
        if (p.y < -4) {
          p.y = H + 4;
          p.x = Math.random() * W;
        }
      }

      if (starfish) starfish.phase += dt;

      const floor = H - 36;
      food = food.filter((fd) => {
        if (fd.eaten) return false;
        fd.age += dt * 1000;
        if (fd.y < floor) {
          fd.y = Math.min(floor, fd.y + FOOD_FALL * slow * dt);
          fd.x += Math.sin(time * 2 + fd.ph) * 3 * dt;
        } else {
          fd.rest += dt * 1000;
        }
        return fd.rest < FOOD_REST_MS && fd.age < FOOD_MAX_MS;
      });

      bubbles = bubbles.filter((b) => {
        if (b.pop > 0) {
          b.pop += dt * 5;
          return b.pop < 1;
        }
        b.y -= b.v * dt;
        b.x += Math.sin(time * 1.5 + b.ph) * 8 * dt;
        if (b.y < 26) {
          b.pop = 0.001;
        }
        return b.y > -b.r;
      });

      ripples = ripples.filter((r) => {
        r.r += 96 * dt;
        r.a -= dt * 0.95;
        return r.a > 0;
      });

      puffs = puffs.filter((p) => {
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 6 * dt;
        p.vx *= 0.96;
        return p.age < p.life;
      });
    }

    // ── Rendering helpers ───────────────────────────────────────────
    function drawShafts() {
      if (reduced) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const baseX = W * (0.14 + i * 0.24);
        const drift = Math.sin(time * 0.16 + i * 1.9) * W * 0.05;
        const topX = baseX + drift;
        const bottomX = topX + W * 0.13;
        const width = W * (0.05 + 0.02 * Math.sin(time * 0.4 + i));
        const alpha = 0.05 + 0.035 * Math.sin(time * 0.5 + i * 2.2);
        const g = ctx.createLinearGradient(topX, 0, bottomX, H * 0.85);
        g.addColorStop(0, `rgba(255, 252, 232, ${Math.max(0, alpha).toFixed(3)})`);
        g.addColorStop(1, 'rgba(255, 252, 232, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(topX - width, 0);
        ctx.lineTo(topX + width, 0);
        ctx.lineTo(bottomX + width * 2.4, H * 0.9);
        ctx.lineTo(bottomX - width * 1.1, H * 0.9);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    function drawSurface() {
      const band = Math.max(14, H * 0.035);
      ctx.save();
      const g = ctx.createLinearGradient(0, 0, 0, band);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, band);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 2 * S;
      for (let layer = 0; layer < 2; layer++) {
        ctx.beginPath();
        for (let x = -10; x <= W + 10; x += 12) {
          const y =
            5 +
            layer * 5 +
            Math.sin(x * 0.021 + time * (0.9 + layer * 0.4)) * (3 + layer * 1.4) +
            Math.sin(x * 0.05 - time * 0.6) * 1.4;
          if (x === -10) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawPlant(p: Plant) {
      const alpha = p.layer === 0 ? 0.42 : p.layer === 1 ? 0.72 : 1;
      const segs = 9;
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const sway = reduced
          ? 0
          : Math.sin(time * (0.55 + p.layer * 0.12) + p.phase + t * 2.1) *
            (7 + p.h * 0.055) *
            t *
            t;
        pts.push([p.x + sway, sandTop + 6 - p.h * t, (p.w * (1 - t * 0.78)) / 2]);
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(0, sandTop, 0, sandTop - p.h);
      g.addColorStop(0, shade(p.color, -0.14));
      g.addColorStop(1, shade(p.color, 0.14));
      ctx.fillStyle = g;

      ctx.beginPath();
      ctx.moveTo(pts[0][0] - pts[0][2], pts[0][1]);
      for (let i = 1; i <= segs; i++) {
        const prev = pts[i - 1];
        const cur = pts[i];
        ctx.quadraticCurveTo(
          prev[0] - prev[2],
          (prev[1] + cur[1]) / 2,
          cur[0] - cur[2],
          cur[1],
        );
      }
      for (let i = segs; i >= 0; i--) {
        const cur = pts[i];
        const next = pts[Math.max(0, i - 1)];
        ctx.quadraticCurveTo(
          cur[0] + cur[2],
          (cur[1] + next[1]) / 2,
          next[0] + next[2],
          next[1],
        );
      }
      ctx.closePath();
      ctx.fill();

      // Small leaves along the blade
      ctx.fillStyle = shade(p.color, 0.2);
      for (let i = 2; i < segs; i += 2) {
        const pt = pts[i];
        const side = i % 4 === 0 ? 1 : -1;
        ctx.beginPath();
        ctx.ellipse(
          pt[0] + side * pt[2] * 2.1,
          pt[1],
          pt[2] * 1.9,
          pt[2] * 0.75,
          side * 0.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.restore();
    }

    function drawCoral(c: Coral) {
      const sway = reduced ? 0 : Math.sin(time * 0.7 + c.phase) * 3;
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < c.branches; i++) {
        const t = c.branches === 1 ? 0 : i / (c.branches - 1) - 0.5;
        const tipX = c.x + t * c.h * 1.5 + sway * (0.4 + Math.abs(t));
        const tipY = c.y - c.h * (0.72 + Math.abs(t) * -0.35 + 0.28);
        ctx.strokeStyle = shade(c.color, -0.06);
        ctx.lineWidth = 6.5 * S;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.quadraticCurveTo(c.x + t * c.h * 0.6, c.y - c.h * 0.55, tipX, tipY);
        ctx.stroke();
        ctx.fillStyle = shade(c.color, 0.16);
        ctx.beginPath();
        ctx.arc(tipX, tipY, 3.6 * S, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawAnemone(a: Anemone) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < a.tentacles; i++) {
        const t = i / (a.tentacles - 1) - 0.5;
        const sway = reduced ? 0 : Math.sin(time * 1.1 + a.phase + i * 0.55) * 6;
        const tipX = a.x + t * a.h * 1.7 + sway;
        const tipY = a.y - a.h * (0.95 - Math.abs(t) * 0.35);
        ctx.strokeStyle = rgba(a.color, 0.92);
        ctx.lineWidth = 3.4 * S;
        ctx.beginPath();
        ctx.moveTo(a.x + t * a.h * 0.4, a.y);
        ctx.quadraticCurveTo(a.x + t * a.h * 0.9 + sway * 0.4, a.y - a.h * 0.6, tipX, tipY);
        ctx.stroke();
        ctx.fillStyle = shade(a.color, 0.22);
        ctx.beginPath();
        ctx.arc(tipX, tipY, 2.4 * S, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = shade(a.color, -0.18);
      ctx.beginPath();
      ctx.ellipse(a.x, a.y + 1, a.h * 0.5, a.h * 0.2, 0, Math.PI, 0);
      ctx.fill();
      ctx.restore();
    }

    function drawStarfish(st: Starfish) {
      const pulse = reduced ? 1 : 1 + Math.sin(st.phase * 1.4) * 0.045;
      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.rotate(st.rot);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = st.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const nextAng = ang + Math.PI / 5;
        ctx.lineTo(Math.cos(ang) * st.r, Math.sin(ang) * st.r);
        ctx.lineTo(Math.cos(nextAng) * st.r * 0.42, Math.sin(nextAng) * st.r * 0.42);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * st.r * 0.55, Math.sin(ang) * st.r * 0.55, 1.5 * S, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawCrab() {
      if (!crab) return;
      const c = crab;
      const y = sandTop + 10;
      const bodyW = 15 * S;
      const bodyH = 10 * S;
      const step = Math.sin(c.legPhase) * 3 * S;

      ctx.save();
      ctx.translate(c.x, y);
      ctx.scale(c.dir, 1);

      // Legs
      ctx.strokeStyle = '#d9694f';
      ctx.lineWidth = 2.2 * S;
      ctx.lineCap = 'round';
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i++) {
          const lx = -bodyW * 0.55 + i * bodyW * 0.55;
          const lift = Math.sin(c.legPhase + i * 1.4 + (side > 0 ? 0 : Math.PI)) * 2 * S;
          ctx.beginPath();
          ctx.moveTo(lx, -1);
          ctx.quadraticCurveTo(lx + side * 4 * S, 2 + lift, lx + side * 8 * S, 5 + lift * 0.4);
          ctx.stroke();
        }
      }

      // Claws
      const chomp = c.chompT > 0 ? Math.sin(c.chompT * 22) * 0.35 : 0;
      for (let i = 0; i < 2; i++) {
        const cy = -bodyH * 0.35 + i * bodyH * 0.5;
        ctx.fillStyle = '#e2785c';
        ctx.beginPath();
        ctx.ellipse(bodyW * 0.95, cy, 5.4 * S, 4 * S, 0.2 + chomp * (i === 0 ? 1 : -1), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c25b45';
        ctx.lineWidth = 1.4 * S;
        ctx.beginPath();
        ctx.moveTo(bodyW * 0.95, cy);
        ctx.lineTo(bodyW * 1.4, cy - 2 * S + chomp * 4 * S);
        ctx.stroke();
      }

      // Body
      const g = ctx.createLinearGradient(0, -bodyH, 0, bodyH * 0.4);
      g.addColorStop(0, '#ef8a68');
      g.addColorStop(1, '#d9614a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyW, bodyH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      ctx.ellipse(-bodyW * 0.2, -bodyH * 0.42, bodyW * 0.5, bodyH * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye stalks
      ctx.strokeStyle = '#d9614a';
      ctx.lineWidth = 2 * S;
      for (let i = -1; i <= 1; i += 2) {
        const ex = bodyW * 0.28 + i * bodyW * 0.22;
        const ey = -bodyH * 0.95 + step * 0.08;
        ctx.beginPath();
        ctx.moveTo(ex, -bodyH * 0.5);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.fillStyle = '#fffaf2';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5 * S, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a4560';
        ctx.beginPath();
        ctx.arc(ex + 0.7 * S, ey, 1.2 * S, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawJelly() {
      if (!jelly) return;
      const pulse = reduced ? 1 : 1 + Math.sin(jelly.phase * 1.8) * 0.12;
      const r = jelly.r;
      ctx.save();
      ctx.translate(jelly.x, jelly.y);
      ctx.globalAlpha = 0.4;

      // Trailing tentacles
      ctx.strokeStyle = 'rgba(232, 214, 250, 0.85)';
      ctx.lineWidth = 2 * S;
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const tx = (i - 3) * r * 0.26;
        const sway = reduced ? 0 : Math.sin(jelly.phase * 1.6 + i * 0.7) * r * 0.22;
        ctx.beginPath();
        ctx.moveTo(tx, r * 0.2);
        ctx.quadraticCurveTo(tx + sway * 0.5, r * 1.2, tx + sway, r * (1.9 + (i % 3) * 0.3));
        ctx.stroke();
      }

      // Bell
      const g = ctx.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r * 1.15);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      g.addColorStop(0.6, 'rgba(214, 196, 240, 0.6)');
      g.addColorStop(1, 'rgba(186, 168, 224, 0.2)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * pulse, r * 0.82 / pulse, 0, Math.PI, 0);
      ctx.quadraticCurveTo(r * 0.5, r * 0.34, 0, r * 0.24);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.34, -r * pulse, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function bodyPath(s: number, shape: FishShape) {
      ctx.beginPath();
      if (shape === 'round') {
        ctx.ellipse(0, 0, s * 0.82, s * 0.82, 0, 0, Math.PI * 2);
      } else if (shape === 'slim') {
        ctx.ellipse(0, 0, s * 1.08, s * 0.36, 0, 0, Math.PI * 2);
      } else if (shape === 'flat') {
        ctx.ellipse(0, 0, s * 0.76, s * 0.76, 0, 0, Math.PI * 2);
      } else if (shape === 'diamond') {
        ctx.moveTo(s * 0.96, 0);
        ctx.quadraticCurveTo(0, -s * 0.74, -s * 0.86, 0);
        ctx.quadraticCurveTo(0, s * 0.74, s * 0.96, 0);
        ctx.closePath();
      } else {
        ctx.ellipse(0, 0, s, s * 0.6, 0, 0, Math.PI * 2);
      }
    }

    function drawFish(f: Fish) {
      const s = f.size;
      const left = Math.cos(f.a) < 0;
      const wag = reduced ? 0 : Math.sin(time * 3.6 + f.shimmer) * 0.3;
      const chomp = f.chompT > 0 ? Math.sin(f.chompT * 26) * 0.5 + 0.5 : 0;

      // Shadow on the sand, stronger near the floor
      const closeness = clamp(1 - f.y / H, 0, 1);
      ctx.fillStyle = `rgba(72, 64, 104, ${(0.05 + 0.12 * closeness).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(f.x, sandTop + 12, s * 0.92, s * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(left ? -1 : 1, 1);
      ctx.rotate(left ? Math.PI - f.a : f.a);

      const dark = shade(f.color, -0.2);
      const light = shade(f.color, 0.2);
      const finColor = shade(f.color, 0.05);

      // Tail, hinged at the caudal peduncle
      ctx.save();
      ctx.translate(-s * 0.78, 0);
      ctx.rotate(wag);
      const tailG = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.6);
      tailG.addColorStop(0, rgba(finColor, 0.95));
      tailG.addColorStop(1, rgba(shade(f.color, -0.08), 0.95));
      ctx.fillStyle = tailG;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-s * 0.5, -s * 0.62, -s * 0.82, -s * 0.52);
      ctx.quadraticCurveTo(-s * 0.52, -s * 0.12, -s * 0.5, 0);
      ctx.quadraticCurveTo(-s * 0.52, s * 0.12, -s * 0.82, s * 0.52);
      ctx.quadraticCurveTo(-s * 0.5, s * 0.62, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(dark, 0.35);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Dorsal fin (tall sails for the "flat" angelfish shape)
      ctx.fillStyle = rgba(finColor, 0.92);
      ctx.beginPath();
      if (f.shape === 'flat') {
        ctx.moveTo(-s * 0.34, -s * 0.52);
        ctx.quadraticCurveTo(-s * 0.1, -s * 1.42, s * 0.3, -s * 0.5);
      } else {
        ctx.moveTo(-s * 0.4, -s * 0.34);
        ctx.quadraticCurveTo(-s * 0.05, -s * 0.94, s * 0.34, -s * 0.3);
      }
      ctx.closePath();
      ctx.fill();

      // Pelvic fin
      ctx.beginPath();
      if (f.shape === 'flat') {
        ctx.moveTo(-s * 0.3, s * 0.5);
        ctx.quadraticCurveTo(-s * 0.05, s * 1.3, s * 0.26, s * 0.48);
      } else {
        ctx.moveTo(-s * 0.24, s * 0.3);
        ctx.quadraticCurveTo(0, s * 0.74, s * 0.24, s * 0.28);
      }
      ctx.closePath();
      ctx.fill();

      // Body with a top-to-belly gradient
      bodyPath(s, f.shape);
      const bodyG = ctx.createLinearGradient(0, -s, 0, s);
      bodyG.addColorStop(0, shade(f.color, -0.07));
      bodyG.addColorStop(0.55, f.color);
      bodyG.addColorStop(1, shade(f.color, 0.2));
      ctx.fillStyle = bodyG;
      ctx.fill();

      // Patterns clipped to the body
      ctx.save();
      bodyPath(s, f.shape);
      ctx.clip();
      if (f.pattern === 'stripes') {
        ctx.fillStyle = rgba('#ffffff', 0.34);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(-s * 0.28 + i * s * 0.36, 0, s * 0.085, s * 1.1, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (f.pattern === 'spots') {
        ctx.fillStyle = rgba('#ffffff', 0.4);
        const spots: [number, number, number][] = [
          [-0.3, -0.24, 0.13],
          [0.05, 0.2, 0.1],
          [0.32, -0.16, 0.09],
          [-0.02, -0.4, 0.07],
          [0.5, 0.16, 0.06],
        ];
        for (const sp of spots) {
          ctx.beginPath();
          ctx.arc(sp[0] * s, sp[1] * s, sp[2] * s, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (f.pattern === 'belly') {
        ctx.fillStyle = rgba('#fffaf0', 0.5);
        ctx.beginPath();
        ctx.ellipse(0, s * 0.42, s * 0.92, s * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Moving scale shimmer
      if (!reduced) {
        const shimmerX = ((Math.sin(time * 0.8 + f.shimmer) + 1) / 2) * s * 1.8 - s * 0.9;
        const shim = ctx.createLinearGradient(shimmerX - s * 0.3, 0, shimmerX + s * 0.3, 0);
        shim.addColorStop(0, 'rgba(255, 255, 255, 0)');
        shim.addColorStop(0.5, 'rgba(255, 255, 255, 0.26)');
        shim.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shim;
        ctx.fillRect(-s * 1.2, -s * 1.4, s * 2.4, s * 2.8);
      }
      ctx.restore();

      // Outline
      bodyPath(s, f.shape);
      ctx.strokeStyle = rgba(dark, 0.45);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Pectoral fin, flapping in its own joint
      ctx.save();
      ctx.translate(s * 0.16, s * 0.16);
      ctx.rotate(Math.sin(f.finPhase) * 0.45);
      ctx.fillStyle = rgba(light, 0.85);
      ctx.beginPath();
      ctx.ellipse(0, s * 0.16, s * 0.26, s * 0.13, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(dark, 0.28);
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.restore();

      // Gill
      ctx.strokeStyle = rgba(dark, 0.4);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(s * 0.3, 0, s * 0.4, -0.9, 0.9);
      ctx.stroke();

      // Blush after a touch
      if (f.blushT > 0) {
        ctx.fillStyle = `rgba(247, 138, 168, ${(Math.min(1, f.blushT) * 0.45).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(s * 0.42, s * 0.16, s * 0.2, s * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eye with a blink
      const eyeX = s * 0.55;
      const eyeY = -s * 0.13;
      if (f.blinkDur > 0) {
        ctx.strokeStyle = '#4a4560';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, s * 0.1, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#fffdf7';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, s * 0.145, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a4560';
        ctx.beginPath();
        ctx.arc(eyeX + s * 0.025, eyeY, s * 0.082, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(eyeX - s * 0.015, eyeY - s * 0.045, s * 0.032, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mouth, opening while eating
      ctx.strokeStyle = rgba(dark, 0.6);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (chomp > 0.05) {
        ctx.ellipse(s * 0.92, s * 0.06, s * 0.1 * chomp + s * 0.03, s * 0.09 * chomp + s * 0.02, 0, 0, Math.PI * 2);
        ctx.fillStyle = rgba(dark, 0.5);
        ctx.fill();
      } else {
        ctx.arc(s * 0.86, s * 0.02, s * 0.12, 0.4, 1.5);
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawFood(fd: FoodPellet) {
      const g = ctx.createRadialGradient(fd.x - 1.4, fd.y - 1.4, 0.4, fd.x, fd.y, 5.4);
      g.addColorStop(0, '#f0c079');
      g.addColorStop(1, '#c98f4d');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fd.x, fd.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(fd.x - 1.6, fd.y - 1.7, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawBubble(b: Bubble) {
      if (b.pop > 0) {
        const k = 1 - b.pop;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.7 * k).toFixed(3)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * (1 + b.pop * 0.9), 0, Math.PI * 2);
        ctx.stroke();
        return;
      }
      const g = ctx.createRadialGradient(
        b.x - b.r * 0.35,
        b.y - b.r * 0.35,
        b.r * 0.1,
        b.x,
        b.y,
        b.r,
      );
      g.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      g.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
      g.addColorStop(1, 'rgba(255, 255, 255, 0.34)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.34, b.y - b.r * 0.36, Math.max(0.7, b.r * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }

    function drawRipples() {
      ctx.save();
      for (const r of ripples) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, r.a).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawPuffs() {
      for (const p of puffs) {
        const k = 1 - p.age / p.life;
        ctx.fillStyle = rgba(p.color, Math.max(0, k * 0.75));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.6 + k * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawPlankton() {
      ctx.save();
      for (const p of plankton) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function draw() {
      if (W <= 0 || H <= 0) return;

      if (bg) {
        ctx.drawImage(bg, 0, 0, W, H);
      } else {
        ctx.fillStyle = '#b5dcf2';
        ctx.fillRect(0, 0, W, H);
      }

      drawShafts();

      // Back layer of seaweed
      for (const p of plants) {
        if (p.layer === 0) drawPlant(p);
      }

      drawJelly();
      drawPlankton();

      // Coral, anemones and starfish on the floor
      for (const c of corals) drawCoral(c);
      for (const a of anemones) drawAnemone(a);
      if (starfish) drawStarfish(starfish);
      drawCrab();

      // Mid layer of seaweed
      for (const p of plants) {
        if (p.layer === 1) drawPlant(p);
      }

      for (const fd of food) drawFood(fd);
      for (const f of fish) drawFish(f);
      for (const b of bubbles) drawBubble(b);
      drawPuffs();

      // Front layer of seaweed, closest to the glass
      for (const p of plants) {
        if (p.layer === 2) drawPlant(p);
      }

      drawRipples();
      drawSurface();
    }

    function frame(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      time += dt;
      update(dt);
      draw();
      raf = requestAnimationFrame(frame);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    }

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
    observer?.observe(canvas);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    canvas.addEventListener('pointerdown', onPointerDown);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  return (
    <div className="act-stage stage">
      <canvas
        ref={canvasRef}
        className="aquarium-canvas"
        role="img"
        aria-label="Akwarium z rybkami, roślinami, koralowcami i krabem"
      />
    </div>
  );
}
