import type { CSSProperties } from "react";

// A stroke-only botanical-engraving almond bough (שקדיה — the first tree to bloom in the Israeli winter,
// the symbol of renewal), pressed faintly into the page margin. Tonal: gold wood, gold-line twigs and
// blossoms, desaturated sage leaves. Varied stroke weight + stamen/vein detail is what reads as a real
// engraving rather than clip-art. All geometry is deterministic, so SSR and CSR render identically.

const GOLD = "var(--color-gold)";
const GOLDLINE = "var(--color-gold-line)";
const SAGE = "var(--color-sage)";

const f = (x: number) => x.toFixed(1);

// Teardrop blade from base (x1,y1) to tip (x2,y2) with half-width w — the shape of every leaf and petal.
function blade(x1: number, y1: number, x2: number, y2: number, w: number): string {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const base = 0.28, tip = 0.18;
  const c1x = x1 + ux * len * base + px * w, c1y = y1 + uy * len * base + py * w;
  const c2x = x2 - ux * len * tip + px * w * 0.5, c2y = y2 - uy * len * tip + py * w * 0.5;
  const c3x = x2 - ux * len * tip - px * w * 0.5, c3y = y2 - uy * len * tip - py * w * 0.5;
  const c4x = x1 + ux * len * base - px * w, c4y = y1 + uy * len * base - py * w;
  return `M${f(x1)} ${f(y1)} C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(x2)} ${f(y2)} C${f(c3x)} ${f(c3y)} ${f(c4x)} ${f(c4y)} ${f(x1)} ${f(y1)} Z`;
}

function Leaf({ x1, y1, x2, y2, w }: { x1: number; y1: number; x2: number; y2: number; w: number }) {
  return (
    <>
      <path d={blade(x1, y1, x2, y2, w)} fill="none" stroke={SAGE} strokeWidth={1.1} />
      <path d={`M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`} stroke={SAGE} strokeWidth={0.7} opacity={0.8} />
    </>
  );
}

const PETAL_ANGLES = [90, 162, 234, 306, 18];
const STAMEN_ANGLES = [60, 110, 160, 250, 300];

// Five teardrop petals, plus stamens tipped with anther dots — the detail that separates a botanical
// study from a flat flower glyph.
function Blossom({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return (
    <g>
      {PETAL_ANGLES.map((deg) => {
        const a = (deg * Math.PI) / 180;
        const tx = cx + Math.cos(a) * 10 * s, ty = cy - Math.sin(a) * 10 * s;
        return <path key={`p${deg}`} d={blade(cx, cy, tx, ty, 4.6 * s)} fill="none" stroke={GOLDLINE} strokeWidth={0.8} />;
      })}
      {STAMEN_ANGLES.map((deg) => {
        const a = (deg * Math.PI) / 180;
        const ex = cx + Math.cos(a) * 5 * s, ey = cy - Math.sin(a) * 5 * s;
        return (
          <g key={`s${deg}`}>
            <path d={`M${f(cx)} ${f(cy)} L${f(ex)} ${f(ey)}`} stroke={GOLD} strokeWidth={0.6} />
            <circle cx={ex} cy={ey} r={0.9 * s} fill={GOLD} />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={1.4 * s} fill="none" stroke={GOLD} strokeWidth={0.7} />
    </g>
  );
}

function Bud({ cx, cy, ang, s }: { cx: number; cy: number; ang: number; s: number }) {
  const a = (ang * Math.PI) / 180;
  const tx = cx + Math.cos(a) * 7 * s, ty = cy - Math.sin(a) * 7 * s;
  return <path d={blade(cx, cy, tx, ty, 3 * s)} fill="none" stroke={GOLDLINE} strokeWidth={0.8} />;
}

const TWIGS = ["M150 126 C163 112 183 108 200 92", "M134 92 C120 78 100 76 82 62", "M112 56 C104 44 90 38 76 30"];
const LEAVES = [
  { x1: 176, y1: 110, x2: 200, y2: 120, w: 6 },
  { x1: 168, y1: 120, x2: 188, y2: 138, w: 5.5 },
  { x1: 150, y1: 126, x2: 132, y2: 146, w: 6 },
  { x1: 96, y1: 62, x2: 78, y2: 50, w: 5 },
  { x1: 92, y1: 66, x2: 74, y2: 82, w: 5 },
  { x1: 120, y1: 80, x2: 138, y2: 64, w: 5.5 },
];
const BLOSSOMS = [
  { cx: 94, cy: 34, s: 1.3 },
  { cx: 200, cy: 92, s: 0.95 },
  { cx: 76, cy: 30, s: 1.0 },
  { cx: 150, cy: 126, s: 0.85 },
];

function Bough() {
  return (
    <g>
      <path d="M206 206 C176 180 162 156 150 126 C138 96 120 62 94 34" fill="none" stroke={GOLD} strokeWidth={2.4} strokeLinecap="round" />
      {TWIGS.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={GOLDLINE} strokeWidth={1.3} strokeLinecap="round" />
      ))}
      {LEAVES.map((l, i) => (
        <Leaf key={i} {...l} />
      ))}
      <Bud cx={60} cy={48} ang={120} s={0.9} />
      <Bud cx={196} cy={118} ang={30} s={0.85} />
      {BLOSSOMS.map((b, i) => (
        <Blossom key={i} {...b} />
      ))}
    </g>
  );
}

// A smaller, different sprig (not a mirror of the bough) for the opposite corner.
function Accent() {
  return (
    <g>
      <path d="M8 96 C24 78 30 54 28 26" fill="none" stroke={GOLDLINE} strokeWidth={1.4} strokeLinecap="round" />
      <Leaf x1={24} y1={64} x2={6} y2={52} w={4.5} />
      <Leaf x1={26} y1={48} x2={46} y2={38} w={4.5} />
      <Blossom cx={28} cy={22} s={0.8} />
    </g>
  );
}

export function BotanicalSprig({
  variant = "bough",
  className,
  style,
}: {
  variant?: "bough" | "accent";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} fill="none" strokeLinejoin="round" aria-hidden>
      {variant === "bough" ? <Bough /> : <Accent />}
    </svg>
  );
}
