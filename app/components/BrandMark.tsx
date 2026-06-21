// The Soothly mark: a spoken waveform (brand terracotta) resolving into written lines (ink) —
// the product itself, voice becoming a book. Colors are theme tokens so it stays of-a-piece with
// the paper UI; decorative by default since the page <h1> already carries the title.
export default function BrandMark({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="19.5 31.5 65 37"
      fill="none"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {label && <title>{label}</title>}
      <g stroke="var(--color-brand)" strokeWidth={5} strokeLinecap="round">
        <path d="M22,41 L22,59" />
        <path d="M30,34 L30,66" />
        <path d="M38,43 L38,57" />
        <path d="M46,37 L46,63" />
      </g>
      <g stroke="var(--color-ink)" strokeWidth={5} strokeLinecap="round">
        <path d="M58,43 L80,43" />
        <path d="M58,51 L75,51" />
        <path d="M58,59 L82,59" />
      </g>
    </svg>
  );
}
