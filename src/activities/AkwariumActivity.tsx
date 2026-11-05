import { useEffect, useRef } from 'react';
import { pick } from '../utils/rand';

const MAX_FOOD = 10;
const MAX_BUBBLES = 30;
const FOOD_FALL = 28;
const FOOD_REST_MS = 6000;
const FOOD_MAX_MS = 25000;

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

const MIN_FISH = 2;
const MAX_FISH = 8;

interface FoodPellet {
  x: number;
  y: number;
  age: number;
  rest: number;
  eaten: boolean;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  ph: number;
  v: number;
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
  nudge: number;
  nudgeT: number;
  target: FoodPellet | null;
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
      nudge: 0,
      nudgeT: 0,
      target: null,
    };
  });
}

function wrapAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function AkwariumActivity() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slow = reduced ? 0.6 : 1;

    let W = 0;
    let H = 0;
    let raf = 0;
    let last = 0;
    let time = 0;
    let initialized = false;

    let food: FoodPellet[] = [];
    let bubbles: Bubble[] = [];
    let fish: Fish[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      if (W <= 0 || H <= 0) return;

      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!initialized) {
        fish = makeFish(W, H);
        initialized = true;
      } else {
        for (const f of fish) {
          f.x = clamp(f.x, 0, W);
          f.y = clamp(f.y, 0, H);
        }
      }
    };

    resize();

    const getSpeed = () => Math.max(24, W / 14) * slow;

    const addBubble = (x: number, y: number) => {
      if (bubbles.length >= MAX_BUBBLES) {
        bubbles.shift();
      }
      bubbles.push({
        x,
        y,
        r: 3 + Math.random() * 4,
        ph: Math.random() * 6,
        v: 18 + Math.random() * 14,
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

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
        return;
      }

      if (food.length >= MAX_FOOD) {
        food.shift();
      }
      food.push({ x, y, age: 0, rest: 0, eaten: false });
    };

    const update = (dt: number) => {
      if (W <= 0 || H <= 0) return;
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
        if (f.nudgeT > 0) {
          f.nudgeT -= dt;
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
        }
      }

      const floor = H - 36;
      food = food.filter((fd) => {
        if (fd.eaten) return false;
        fd.age += dt * 1000;
        if (fd.y < floor) {
          fd.y = Math.min(floor, fd.y + FOOD_FALL * slow * dt);
        } else {
          fd.rest += dt * 1000;
        }
        return fd.rest < FOOD_REST_MS && fd.age < FOOD_MAX_MS;
      });

      bubbles = bubbles.filter((b) => {
        b.y -= b.v * slow * dt;
        b.x += Math.sin(time * 1.5 + b.ph) * 8 * dt;
        return b.y > -b.r;
      });
    };

    const drawPlant = (x: number, height: number, color: string, phase: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      const sway = reduced ? 0 : Math.sin(time * 0.6 + phase) * 8;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.quadraticCurveTo(x + sway, H - height * 0.5, x + sway * 1.5, H - height);
      ctx.stroke();
    };

    const draw = () => {
      if (W <= 0 || H <= 0) return;

      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, '#d6eefb');
      gradient.addColorStop(1, '#b5dcf2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#f3e6c8';
      ctx.fillRect(0, H - 22, W, 22);

      drawPlant(W * 0.1, 130, '#9bd3ac', 0);
      drawPlant(W * 0.14, 90, '#b4e0bd', 1.5);
      drawPlant(W * 0.55, 110, '#9bd3ac', 3);
      drawPlant(W * 0.88, 150, '#b4e0bd', 4.5);
      drawPlant(W * 0.92, 95, '#9bd3ac', 2);

      for (const fd of food) {
        ctx.fillStyle = '#d9a35f';
        ctx.beginPath();
        ctx.arc(fd.x, fd.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const f of fish) {
        ctx.save();
        ctx.translate(f.x, f.y);
        const left = Math.cos(f.a) < 0;
        ctx.scale(left ? -1 : 1, 1);
        ctx.rotate(left ? Math.PI - f.a : f.a);

        const s = f.size;
        const wag = reduced ? 0 : Math.sin(time * 3 + f.size) * s * 0.12;
        ctx.fillStyle = f.color;
        ctx.beginPath();

        if (f.shape === 'round') {
          ctx.ellipse(0, 0, s * 0.85, s * 0.85, 0, 0, Math.PI * 2);
        } else if (f.shape === 'slim') {
          ctx.ellipse(0, 0, s * 1.05, s * 0.38, 0, 0, Math.PI * 2);
        } else if (f.shape === 'flat') {
          ctx.ellipse(0, 0, s * 0.8, s * 0.8, 0, 0, Math.PI * 2);
          ctx.moveTo(-s * 0.3, -s * 0.6);
          ctx.lineTo(0, -s * 1.1);
          ctx.lineTo(s * 0.3, -s * 0.6);
          ctx.moveTo(-s * 0.3, s * 0.6);
          ctx.lineTo(0, s * 1.1);
          ctx.lineTo(s * 0.3, s * 0.6);
        } else if (f.shape === 'diamond') {
          ctx.moveTo(s, 0);
          ctx.lineTo(0, -s * 0.7);
          ctx.lineTo(-s * 0.85, 0);
          ctx.lineTo(0, s * 0.7);
          ctx.closePath();
        } else {
          ctx.ellipse(0, 0, s, s * 0.62, 0, 0, Math.PI * 2);
        }
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.moveTo(-s * 0.8, 0);
        ctx.lineTo(-s * 1.5, -s * 0.5 + wag);
        ctx.lineTo(-s * 1.5, s * 0.5 + wag);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = '#5b5675';
        ctx.beginPath();
        ctx.arc(s * 0.5, -s * 0.12, s * 0.09, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      for (const b of bubbles) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      time += dt;
      update(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

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
        aria-label="Akwarium z rybkami"
      />
    </div>
  );
}
