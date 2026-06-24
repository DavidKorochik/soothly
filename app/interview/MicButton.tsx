"use client";

import { useEffect } from "react";
import { MAX_RECORD_SECONDS, useRecorder, type RecorderStatus } from "./useRecorder";

export type VoiceUiState = { status: RecorderStatus; errorMessage: string | null; seconds: number };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function MicGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0" strokeLinecap="round" />
      <path d="M12 17v3" strokeLinecap="round" />
    </svg>
  );
}

export function MicButton({
  sessionId,
  disabled,
  onTranscript,
  onState,
}: {
  sessionId?: string;
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onState: (state: VoiceUiState) => void;
}) {
  const rec = useRecorder({ sessionId, onTranscript });

  useEffect(() => {
    onState({ status: rec.status, errorMessage: rec.errorMessage, seconds: rec.seconds });
  }, [rec.status, rec.errorMessage, rec.seconds, onState]);

  const recording = rec.status === "recording";
  const busy = rec.status === "requesting" || rec.status === "transcribing";
  const ariaLabel = recording ? "עצירת ההקלטה" : rec.status === "transcribing" ? "מתמללים, רגע" : "הקלטת תשובה בקול";

  return (
    <button
      type="button"
      onClick={() => (recording ? rec.stop() : rec.start())}
      disabled={disabled || busy}
      aria-label={ariaLabel}
      aria-pressed={recording}
      aria-busy={busy}
      className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition disabled:opacity-40 ${
        recording ? "border-gold-line bg-gold text-paper" : "border-rule text-ink-soft hover:border-gold-line"
      }`}
    >
      {busy ? (
        <span className="h-2.5 w-2.5 rounded-full bg-gold soothly-breathe" aria-hidden />
      ) : recording ? (
        <>
          <span className="pointer-events-none absolute -inset-1 rounded-full border border-gold-line soothly-breathe" aria-hidden />
          <span className="h-3 w-3 rounded-sm bg-paper" aria-hidden />
        </>
      ) : (
        <MicGlyph />
      )}
    </button>
  );
}

// A one-time nudge above the mic on the very first question: writing can be tiring, so you can
// just talk instead. The downward tail points at the mic; the parent clears it the moment the
// person types, records, or closes it.
export function MicHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="soothly-fade pointer-events-none absolute bottom-full left-0 z-20 mb-3 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-gold-line bg-paper py-3 pl-6 pr-4 text-right shadow-[0_10px_30px_rgba(27,26,23,0.12)]"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="סגירה"
        className="pointer-events-auto absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-muted transition-colors hover:text-ink-soft"
      >
        <span className="text-base leading-none">×</span>
      </button>
      <p className="font-sans text-xs leading-relaxed text-ink-soft">
        <span className="mb-0.5 block font-medium text-ink">אין כוח לכתוב?</span>
        אפשר פשוט לספר בקול.
      </p>
      <span
        aria-hidden
        className="absolute -bottom-1.5 left-5 h-3 w-3 rotate-45 border-b border-r border-gold-line bg-paper"
      />
    </div>
  );
}

// Lives below the controls row, full width. One calm line: privacy when idle, a timer while
// listening, "מתמללים" while transcribing, and a warm gold (never red) line on error.
export function VoiceStatusLine({ status, errorMessage, seconds }: VoiceUiState) {
  if (status === "error" && errorMessage) {
    return (
      <p aria-live="assertive" className="mt-6 font-sans text-xs leading-relaxed text-gold">
        {errorMessage}
      </p>
    );
  }
  if (status === "requesting") {
    return <p aria-live="polite" className="mt-6 font-sans text-xs text-muted">רגע, פותחים את המיקרופון</p>;
  }
  if (status === "recording") {
    return (
      <p aria-live="polite" className="mt-6 font-sans text-xs leading-relaxed text-muted">
        <span className="tabular-nums text-ink-soft">{fmt(seconds)}</span> · מקשיבים. אפשר לדבר כמה שבא לך.
        {seconds >= MAX_RECORD_SECONDS - 30 && (
          <span className="mt-1 block text-gold">אפשר לעצור ולהמשיך בכתב, או להקליט עוד רגע.</span>
        )}
      </p>
    );
  }
  if (status === "transcribing") {
    return <p aria-live="polite" className="mt-6 font-sans text-xs text-muted">מתמללים</p>;
  }
  return (
    <p className="mt-6 font-sans text-xs leading-relaxed text-muted">
      אפשר גם לדבר במקום לכתוב. ההקלטה נשלחת לתמלול בלבד ונמחקת מיד אחרי - הסיפורים שלך נשארים שלך.
    </p>
  );
}
