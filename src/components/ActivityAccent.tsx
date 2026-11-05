/** A tiny deterministic "sticker constellation" that makes every card unique. */

const PALETTE = [
  '#fff3c4',
  '#f7b6d2',
  '#bfe6b4',
  '#c9b8f2',
  '#a8d8f0',
  '#ffd0a8',
  '#ffffff',
];

function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Shape {
  kind: 'dot' | 'ring' | 'star' | 'leaf' | 'triangle';
  x: number;
  y: number;
  size: number;
  color: string;
  rotate: number;
  opacity: number;
}

function buildShapes(id: string): Shape[] {
  const rand = rng(hashOf(id));
  const kinds: Shape['kind'][] = ['dot', 'ring', 'star', 'leaf', 'triangle'];
  const out: Shape[] = [];
  const count = 4 + Math.floor(rand() * 3); // 4–6 stickers

  for (let i = 0; i < count; i++) {
    out.push({
      kind: kinds[Math.floor(rand() * kinds.length)],
      x: 8 + rand() * 84,
      y: 10 + rand() * 80,
      size: 3 + rand() * 6,
      color: PALETTE[Math.floor(rand() * PALETTE.length)],
      rotate: Math.round(rand() * 90 - 45),
      opacity: 0.45 + rand() * 0.35,
    });
  }
  return out;
}

function ShapeMark({ shape }: { shape: Shape }) {
  const { x, y, size: s, color, opacity, rotate } = shape;
  const transform = `rotate(${rotate} ${x} ${y})`;

  switch (shape.kind) {
    case 'dot':
      return <circle cx={x} cy={y} r={s * 0.55} fill={color} opacity={opacity} />;
    case 'ring':
      return (
        <circle
          cx={x}
          cy={y}
          r={s * 0.7}
          fill="none"
          stroke={color}
          strokeWidth={1.6}
          opacity={opacity}
        />
      );
    case 'star':
      return (
        <path
          d={`M${x} ${y - s} Q${x + s * 0.25} ${y - s * 0.25} ${x + s} ${y} Q${x + s * 0.25} ${y + s * 0.25} ${x} ${y + s} Q${x - s * 0.25} ${y + s * 0.25} ${x - s} ${y} Q${x - s * 0.25} ${y - s * 0.25} ${x} ${y - s} Z`}
          fill={color}
          opacity={opacity}
          transform={transform}
        />
      );
    case 'leaf':
      return (
        <path
          d={`M${x - s} ${y} Q${x} ${y - s * 1.4} ${x + s} ${y} Q${x} ${y + s * 1.4} ${x - s} ${y} Z`}
          fill={color}
          opacity={opacity}
          transform={transform}
        />
      );
    case 'triangle':
      return (
        <path
          d={`M${x} ${y - s} L${x + s} ${y + s * 0.7} L${x - s} ${y + s * 0.7} Z`}
          fill={color}
          opacity={opacity}
          transform={transform}
        />
      );
  }
}

export default function ActivityAccent({ id }: { id: string }) {
  const shapes = buildShapes(id);
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {shapes.map((shape, index) => (
        <ShapeMark key={index} shape={shape} />
      ))}
    </svg>
  );
}
