import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { shuffle } from '../utils/rand';

const FADE_MS = 800;

interface ConstellationShape {
  name: string;
  ring: number;
  extra: readonly (readonly [number, number])[];
  pts: readonly (readonly [number, number])[];
}

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

export default function NieboActivity() {
  const [deck, setDeck] = useState<{
    order: ConstellationShape[];
    index: number;
    round: number;
  }>(() => {
    const order = createOrder();
    return { order, index: 0, round: 0 };
  });

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

    const polygonPoints = shape.pts
      .slice(0, shape.ring)
      .map((p) => `${p[0]},${p[1]}`)
      .join(' ');

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

    return { polygonPoints, edges };
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

  return (
    <div className="act-stage stage">
      <div className={`night${done ? ' done' : ''}${paused ? ' paused' : ''}`}>
        <div className={`n-sky${fading ? ' fade' : ''}`}>
          <i className="n-shoot n-shoot1" aria-hidden="true" />
          <i className="n-shoot n-shoot2" aria-hidden="true" />
          <svg
            key={constellationKey}
            className="n-lines"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <polygon className="n-fill" points={geometry.polygonPoints} />
            {geometry.edges.map((edge, idx) => {
              const isLit = Boolean(active[edge.a] && active[edge.b]);
              return (
                <g key={idx}>
                  <path className="n-ghost" d={edge.d} />
                  <path
                    className={`n-line${isLit ? ' on' : ''}`}
                    d={edge.d}
                    style={{ '--len': edge.len } as CSSProperties}
                  />
                </g>
              );
            })}
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
                style={{ left: `${pt[0]}%`, top: `${pt[1]}%` }}
                onClick={() => activateStar(idx)}
              />
            );
          })}
        </div>

        <div className={`n-msg${done && !fading ? ' show' : ''}`} aria-live="polite">
          <p className="n-bravo">
            Brawo, Artur!{' '}
            <span className="n-bravo-name">
              {shape.name.charAt(0).toUpperCase() + shape.name.slice(1)}
            </span>
          </p>
          <button
            type="button"
            className="n-next"
            disabled={!done || busy}
            onClick={handleNext}
          >
            Dalej
          </button>
        </div>
      </div>
    </div>
  );
}
