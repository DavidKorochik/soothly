// Tuning + fixed seeds for the paper atmosphere. Kept in one place so SSR and CSR render
// identically (no Math.random at runtime → no hydration mismatch) and the look is tunable here.

export const GRAIN_OPACITY = 0.04;

// Static fiber-grain: fractal noise tinted toward ink, tiled. Built via encodeURIComponent so the
// `#` in url(#g) and the spaces encode correctly without hand-escaping.
const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0.106  0 0 0 0 0.102  0 0 0 0 0.090  0.6 0.6 0.6 0 0'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>`;
export const GRAIN_DATA_URI = `data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}`;

export type Mote = {
  size: number; // px
  startX: string; // logical inline-start offset
  startY: string; // bottom offset
  dur: string;
  delay: string; // negative → loads mid-journey, never a synchronized burst
  dx: string; // lateral drift over a cycle
  peak: number; // peak opacity (gold-as-light, kept faint)
  hue: string;
};

// Five warm specks. Faint and slow (≈0.5vh/s) — atmosphere, never ornament.
export const MOTES: readonly Mote[] = [
  { size: 3, startX: "16%", startY: "6%", dur: "52s", delay: "-8s", dx: "2vw", peak: 0.17, hue: "var(--color-gold-line)" },
  { size: 2.2, startX: "38%", startY: "14%", dur: "44s", delay: "-26s", dx: "-2vw", peak: 0.15, hue: "var(--color-gold)" },
  { size: 3.5, startX: "62%", startY: "4%", dur: "58s", delay: "-15s", dx: "3vw", peak: 0.19, hue: "var(--color-gold-line)" },
  { size: 2.4, startX: "78%", startY: "20%", dur: "40s", delay: "-34s", dx: "-2.5vw", peak: 0.14, hue: "var(--color-gold)" },
  { size: 2, startX: "88%", startY: "10%", dur: "48s", delay: "-20s", dx: "1.5vw", peak: 0.16, hue: "var(--color-gold-line)" },
];
