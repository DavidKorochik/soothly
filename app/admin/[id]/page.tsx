import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionDetail } from "@/lib/db/admin";
import { StatusBadge } from "../_components/StatusBadge";
import { ageDisplay, formatDuration, formatTimestamp, genderLabel } from "../_lib/format";

export const dynamic = "force-dynamic";

export default async function SessionMicroscopePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getSessionDetail(id);
  if (!detail) notFound();

  const { session, blocks, feedback } = detail;
  const dictatedAnswers = new Set(blocks.filter((b) => b.dictated && !b.skipped).map((b) => b.questionKey)).size;

  return (
    <>
      <Link href="/admin" className="font-sans text-sm text-gold underline-offset-4 hover:underline">
        ← All sessions
      </Link>
      <h1 dir="rtl" className="mt-3 font-serif text-3xl text-ink">{session.name}</h1>

      <div className="mt-4 mb-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-rule py-4 text-sm text-ink-soft">
        <span>Age {ageDisplay(session.age)}</span>
        <span>Gender {genderLabel(session.gender)}</span>
        <StatusBadge status={session.status} />
        <span>Started {formatTimestamp(session.createdAt)}</span>
        <span className="font-medium text-ink">Duration {formatDuration(session.totalDurationSec)}</span>
        {dictatedAnswers > 0 && <span>Voice {dictatedAnswers}</span>}
      </div>

      {blocks.length === 0 ? (
        <p className="font-sans text-sm text-ink-soft">No answers recorded.</p>
      ) : (
        <div className="space-y-8">
          {blocks.map((b, i) => (
            <section key={`${b.questionKey}-${i}`} className="border-b border-rule pb-7">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {b.chapter && (
                  <span dir="rtl" className="font-sans text-xs text-muted">{b.chapter}</span>
                )}
                {b.skipped && (
                  <span className="rounded-full border border-gold-line px-2 py-0.5 font-sans text-xs text-gold">
                    SKIPPED
                  </span>
                )}
                {b.dictated && (
                  <span className="rounded-full border border-rule px-2 py-0.5 font-sans text-xs text-ink-soft">
                    voice
                  </span>
                )}
                {b.followupRound != null && b.followupRound > 0 && (
                  <span className="font-sans text-xs text-muted">follow-up {b.followupRound}</span>
                )}
                <span className="ml-auto font-sans text-xs text-muted">{formatDuration(b.timeOnQuestionSec)}</span>
              </div>
              <p dir="rtl" className="mt-1 font-serif text-lg text-ink">{b.questionText}</p>
              <div dir="rtl" className="mt-3 whitespace-pre-line font-sans leading-relaxed text-ink">{b.answer}</div>
              {b.eval && (
                <div className="mt-3 flex gap-4 font-sans text-xs text-muted">
                  <span>depth {b.eval.depth}/5</span>
                  <span>scene {b.eval.hasScene ? "yes" : "no"}</span>
                  <span>feeling {b.eval.hasFeeling ? "yes" : "no"}</span>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <div className="mt-12">
        <h2 className="mb-3 font-serif text-xl text-ink">Feedback</h2>
        {feedback ? (
          <div className="space-y-2 rounded-2xl border border-rule bg-white/40 p-6 text-sm">
            <p className="text-ink-soft">
              Felt like me: <span className="text-ink">{feedback.feltLikeMe ?? "—"}/5</span>
            </p>
            {feedback.hardestLine && (
              <p dir="rtl" className="text-ink"><span className="text-muted">Hardest line: </span>{feedback.hardestLine}</p>
            )}
            {feedback.feltGeneric && (
              <p dir="rtl" className="text-ink"><span className="text-muted">Felt generic: </span>{feedback.feltGeneric}</p>
            )}
            {feedback.note && (
              <p dir="rtl" className="text-ink"><span className="text-muted">Note: </span>{feedback.note}</p>
            )}
          </div>
        ) : (
          <p className="font-sans text-sm text-ink-soft">No feedback yet.</p>
        )}
      </div>
    </>
  );
}
