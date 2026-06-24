import type { CSSProperties } from "react";
import { BotanicalSprig } from "./BotanicalSprig";
import { GRAIN_DATA_URI, GRAIN_OPACITY, MOTES } from "./paperFieldData";

// The ambient "paper" layer: a fixed, aria-hidden, non-interactive field behind all content.
// Both surfaces carry the grain, the light wash, and the botanical sprigs, so the flowers are
// always in the background. `full` (landing / welcome / done) gets the brighter wash + drifting
// motes; `focused` (the talking interview screen) dims the wash and the sprigs and drops anything
// that moves, so the flowers stay present without competing with the question being asked.
export default function PaperField({ surface = "full" }: { surface?: "full" | "focused" }) {
  const full = surface === "full";
  const sprig = `paper-sprig${full ? "" : " paper-sprig--focused"}`;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ backgroundImage: `url("${GRAIN_DATA_URI}")`, opacity: GRAIN_OPACITY }} />
      <div className={`absolute inset-0 paper-wash${full ? "" : " paper-wash--focused"}`} />

      <BotanicalSprig
        variant="bough"
        className={`${sprig} absolute h-[230px] w-[230px] sm:h-[400px] sm:w-[400px]`}
        style={{ bottom: -32, insetInlineEnd: -28 }}
      />
      <BotanicalSprig
        variant="accent"
        className={`${sprig} absolute h-[112px] w-[112px] sm:h-[150px] sm:w-[150px]`}
        style={{ top: -8, insetInlineStart: -10 }}
      />

      {full &&
        MOTES.map((m, i) => (
          <span
            key={i}
            className={`paper-mote${i >= 3 ? " paper-mote--hide-sm" : ""}`}
            style={
              {
                insetInlineStart: m.startX,
                bottom: m.startY,
                width: m.size,
                height: m.size,
                background: m.hue,
                "--mote-dur": m.dur,
                "--mote-delay": m.delay,
                "--mote-dx": m.dx,
                "--mote-peak": String(m.peak),
              } as CSSProperties
            }
          />
        ))}
    </div>
  );
}
