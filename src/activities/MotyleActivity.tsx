import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { pickOne } from '../utils/rand';

const OMEGA = 2.2;
const TURN = 0.55;
const SWAY_MS = 2200;
const SWAY_AMP = 7;
const IDLE_MIN = 10;
const IDLE_MAX = 15;

interface FlowerLayout {
  x: number;
  y: number;
  n: number;
}

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

export default function MotyleActivity() {
  const [palette] = useState(() => ({
    flowerSet: pickOne(FLOWER_SETS, 'motyle-flowers'),
    butterflySet: pickOne(BUTTERFLY_SETS, 'motyle-butterfly'),
  }));

  const butterflyRef = useRef<HTMLDivElement>(null);
  const leftWingRef = useRef<SVGGElement>(null);
  const rightWingRef = useRef<SVGGElement>(null);
  const flowerSvgRefs = useRef<(SVGSVGElement | null)[]>([]);

  const stateRef = useRef({
    rest: 0,
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
  });

  const triggerFlower = useCallback((index: number) => {
    const s = stateRef.current;
    s.swayTimes[index] = 0;
    s.idle = 0;
    s.idleLimit = randomIdleLimit();
    if (index === s.rest) return;
    s.rest = index;
    s.flying = true;
    s.dir = -s.dir;
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = stateRef.current;

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
        s.idle += dt;
        if (s.idle >= s.idleLimit) {
          const others: number[] = [];
          for (let i = 0; i < FLOWERS.length; i++) {
            if (i !== s.rest) others.push(i);
          }
          const pickIdx = others[Math.floor(Math.random() * others.length)];
          s.rest = pickIdx;
          s.flying = true;
          s.dir = -s.dir;
          s.idle = 0;
          s.idleLimit = randomIdleLimit();
        }
      }

      s.flapPhase += dt * (s.flying ? 4.5 : 1.8) * Math.PI;
      const wingScale = (0.6 + 0.4 * Math.cos(s.flapPhase)).toFixed(3);
      leftWingRef.current?.setAttribute('transform', `scale(${wingScale} 1)`);
      rightWingRef.current?.setAttribute('transform', `scale(${wingScale} 1)`);

      const tilt = Math.max(-15, Math.min(15, s.vx * 120));
      if (butterflyRef.current) {
        butterflyRef.current.style.left = `${(s.px * 100).toFixed(3)}%`;
        butterflyRef.current.style.top = `${(s.py * 100).toFixed(3)}%`;
        butterflyRef.current.style.transform = `translate(-50%,-50%) rotate(${tilt.toFixed(1)}deg)`;
      }

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
    start();

    return () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handlePointerDown = (index: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    triggerFlower(index);
  };

  const handleClick = (index: number, event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) {
      triggerFlower(index);
    }
  };

  const { flowerSet, butterflySet } = palette;

  return (
    <div className="act-stage stage">
      <div className="m-scene">
        <div className="m-box">
          {FLOWERS.map((fl, i) => {
            const [petalColor, coreColor] = flowerSet[i];
            const angles = Array.from({ length: fl.n }, (_, k) =>
              Math.round((360 / fl.n) * k),
            );
            return (
              <button
                key={i}
                type="button"
                className="m-flower"
                aria-label={`Kwiatek ${i + 1}`}
                style={{ left: `${fl.x * 100}%`, top: `${fl.y * 100}%` }}
                onPointerDown={(e) => handlePointerDown(i, e)}
                onClick={(e) => handleClick(i, e)}
              >
                <svg
                  ref={(el) => {
                    flowerSvgRefs.current[i] = el;
                  }}
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M50 50V150"
                    stroke="#8fcf9f"
                    strokeWidth={6}
                    strokeLinecap="round"
                    fill="none"
                  />
                  <ellipse
                    cx="36"
                    cy="118"
                    rx="14"
                    ry="6"
                    fill="#a9dcb4"
                    transform="rotate(-30 36 118)"
                  />
                  {angles.map((deg) => (
                    <ellipse
                      key={deg}
                      cx="50"
                      cy="24"
                      rx="11"
                      ry="22"
                      fill={petalColor}
                      transform={`rotate(${deg} 50 50)`}
                    />
                  ))}
                  <circle cx="50" cy="50" r="14" fill={coreColor} />
                </svg>
              </button>
            );
          })}

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
              <g ref={leftWingRef} className="m-wl">
                <ellipse
                  cx="-20"
                  cy="-12"
                  rx="20"
                  ry="22"
                  fill={butterflySet[0]}
                  stroke="#fff"
                  strokeWidth={3}
                />
                <ellipse
                  cx="-16"
                  cy="14"
                  rx="13"
                  ry="14"
                  fill={butterflySet[1]}
                  stroke="#fff"
                  strokeWidth={3}
                />
              </g>
              <g ref={rightWingRef} className="m-wr">
                <ellipse
                  cx="20"
                  cy="-12"
                  rx="20"
                  ry="22"
                  fill={butterflySet[0]}
                  stroke="#fff"
                  strokeWidth={3}
                />
                <ellipse
                  cx="16"
                  cy="14"
                  rx="13"
                  ry="14"
                  fill={butterflySet[1]}
                  stroke="#fff"
                  strokeWidth={3}
                />
              </g>
              <rect
                x="-3"
                y="-24"
                width="6"
                height="48"
                rx="3"
                fill="#5b5675"
                stroke="#fff"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
