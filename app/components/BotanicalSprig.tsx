import type { CSSProperties } from "react";

// A delicate, stroke-only flowering sprig — fine line-art in the gold-line tone, like a botanical
// engraving pressed faintly into the page. Grows from the lower-right of its box toward the upper-left.
export function BotanicalSprig({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={style}
      fill="none"
      stroke="var(--color-gold-line)"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* main stem + one side branch */}
      <path d="M188 196 C160 166 150 138 140 116 S118 70 92 40" />
      <path d="M150 132 C160 114 178 106 192 88" />
      {/* leaves */}
      <path d="M148 128 Q162 114 186 116 Q166 128 148 128 Z" />
      <path d="M134 104 Q116 88 100 92 Q120 100 134 104 Z" />
      <path d="M120 76 Q138 60 156 66 Q138 76 120 76 Z" />
      {/* blossom 1 */}
      <Blossom cx={88} cy={38} r={8.5} petal={3.6} center={1.6} />
      {/* blossom 2 (smaller, on the side branch) */}
      <Blossom cx={192} cy={88} r={6.5} petal={2.8} center={1.2} />
    </svg>
  );
}

function Blossom({ cx, cy, r, petal, center }: { cx: number; cy: number; r: number; petal: number; center: number }) {
  const petals = [90, 162, 234, 306, 18].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
  });
  return (
    <g>
      {petals.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={petal} />
      ))}
      <circle cx={cx} cy={cy} r={center} />
    </g>
  );
}
