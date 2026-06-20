import type { SessionStatus } from "@/lib/db/funnel";

const STYLES: Record<SessionStatus, string> = {
  in_progress: "border-rule text-muted",
  completed: "border-gold-line text-gold",
  flagged: "border-gold-line bg-[rgba(168,124,79,0.12)] text-ink",
  synthesized: "border-ink bg-ink text-paper",
};

const LABELS: Record<SessionStatus, string> = {
  in_progress: "in progress",
  completed: "completed",
  flagged: "flagged",
  synthesized: "synthesized",
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 font-sans text-xs ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
