import { Fragment } from "react";
import Link from "next/link";
import { getAdminOverview } from "@/lib/db/admin";
import { StatusBadge } from "./_components/StatusBadge";
import { ageDisplay, formatDuration, genderLabel, pct, round1, WEAK_DEPTH, weakTimeThreshold } from "./_lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const { counts, scorecard, sessions, voice } = await getAdminOverview();
  const finished = counts.completed + counts.synthesized;
  const answeredTotal = scorecard.reduce((sum, r) => sum + r.answered, 0);

  // Worst quit-here = the first row achieving the max drop-off (only when anyone actually quit).
  const maxDropped = scorecard.reduce((m, r) => Math.max(m, r.droppedHere), 0);
  const worstKey = maxDropped > 0 ? scorecard.find((r) => r.droppedHere === maxDropped)?.key : undefined;
  const weakTime = weakTimeThreshold(scorecard.map((r) => r.avgTimeSec));

  // Group the scorecard by chapter, preserving spine order.
  const groups: { chapter: string; rows: typeof scorecard }[] = [];
  for (const row of scorecard) {
    const last = groups[groups.length - 1];
    if (last && last.chapter === row.chapter) last.rows.push(row);
    else groups.push({ chapter: row.chapter, rows: [row] });
  }

  return (
    <>
      <p className="font-sans text-xs tracking-[0.28em] text-muted">SESSION MICROSCOPE</p>
      <h1 className="mt-2 mb-8 font-serif text-3xl text-ink">Soothly admin</h1>

      <div className="mb-12 flex flex-wrap gap-x-10 gap-y-4 border-y border-rule py-5">
        <Stat label="Started" value={String(counts.started)} />
        <Stat label="Completed" value={String(counts.completed)} />
        <Stat label="Completion" value={pct(finished, counts.started)} />
        <Stat label="Flagged" value={String(counts.flagged)} />
        <Stat label="Synthesized" value={String(counts.synthesized)} />
        <Stat label="Feedback" value={String(counts.feedbackCount)} />
        <Stat label='Avg "felt like me"' value={round1(counts.avgFeltLikeMe)} />
      </div>

      {(voice.dictations > 0 || voice.failures > 0) && (
        <>
          <h2 className="mb-3 font-serif text-xl text-ink">Voice and transcription</h2>
          <div className="mb-12 flex flex-wrap gap-x-10 gap-y-4 border-y border-rule py-5">
            <Stat label="Sessions using voice" value={`${voice.sessionsUsingVoice} (${pct(voice.sessionsUsingVoice, counts.started)})`} />
            <Stat label="Answers dictated" value={`${voice.dictatedAnswers} (${pct(voice.dictatedAnswers, answeredTotal)})`} />
            <Stat label="Transcribe failures" value={`${voice.failures} (${pct(voice.failures, voice.dictations + voice.failures)})`} />
            {voice.failuresByCode.map((c) => (
              <Stat key={c.code} label={`fail: ${c.code}`} value={String(c.count)} />
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 font-serif text-xl text-ink">Question scorecard</h2>
      <table className="mb-14 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-4 font-normal">Question</th>
            <th className="px-3 py-2 text-right font-normal">Reached</th>
            <th className="px-3 py-2 text-right font-normal">Answered</th>
            <th className="px-3 py-2 text-right font-normal">Skipped</th>
            <th className="px-3 py-2 text-right font-normal">Quit here</th>
            <th className="px-3 py-2 text-right font-normal">Avg depth</th>
            <th className="px-3 py-2 text-right font-normal">Avg time</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.chapter || "—"}>
              <tr>
                <td
                  colSpan={7}
                  dir="rtl"
                  className="border-b border-rule bg-paper pt-6 pb-1 text-right font-serif text-ink"
                >
                  {g.chapter || "—"}
                </td>
              </tr>
              {g.rows.map((r) => {
                const isWorst = r.key === worstKey;
                const weakDepth = r.avgDepth != null && r.avgDepth < WEAK_DEPTH;
                const slow = r.avgTimeSec != null && weakTime != null && r.avgTimeSec > weakTime;
                return (
                  <tr key={r.key} className={`border-b border-rule/60 ${isWorst ? "bg-[rgba(168,124,79,0.10)]" : ""}`}>
                    <td dir="rtl" className="max-w-md py-2 pr-4 text-right text-ink">{r.label}</td>
                    <td className="px-3 py-2 text-right text-ink-soft">{r.reached}</td>
                    <td className="px-3 py-2 text-right text-ink-soft">{r.answered}</td>
                    <td className="px-3 py-2 text-right text-ink-soft">{r.skipped}</td>
                    <td className={`px-3 py-2 text-right ${isWorst ? "font-medium text-ink" : "text-ink-soft"}`}>
                      {r.droppedHere}
                    </td>
                    <td className={`px-3 py-2 text-right ${weakDepth ? "font-medium text-gold" : "text-ink-soft"}`}>
                      {round1(r.avgDepth)}
                      {weakDepth ? " •" : ""}
                    </td>
                    <td className={`px-3 py-2 text-right ${slow ? "font-medium text-gold" : "text-ink-soft"}`}>
                      {formatDuration(r.avgTimeSec)}
                      {slow ? " •" : ""}
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>

      <h2 className="mb-3 font-serif text-xl text-ink">Sessions</h2>
      {sessions.length === 0 ? (
        <p className="font-sans text-sm text-ink-soft">No sessions yet.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-4 font-normal">Name</th>
              <th className="px-3 py-2 text-right font-normal">Age</th>
              <th className="px-3 py-2 text-right font-normal">Gender</th>
              <th className="px-3 py-2 font-normal">Status</th>
              <th className="px-3 py-2 text-right font-normal">Answers</th>
              <th className="px-3 py-2 font-normal">Furthest</th>
              <th className="px-3 py-2 text-right font-normal">Duration</th>
              <th className="px-3 py-2 text-right font-normal">Felt like me</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-rule/60 hover:bg-paper">
                <td className="py-2 pr-4">
                  <Link href={`/admin/${s.id}`} dir="rtl" className="block text-gold underline-offset-4 hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right text-ink-soft">{ageDisplay(s.age)}</td>
                <td className="px-3 py-2 text-right text-ink-soft">{genderLabel(s.gender)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-3 py-2 text-right text-ink-soft">{s.answerCount}</td>
                <td dir="rtl" className="px-3 py-2 text-right text-ink-soft">{s.furthestLabel || "—"}</td>
                <td className="px-3 py-2 text-right text-ink-soft">{formatDuration(s.durationSec)}</td>
                <td className="px-3 py-2 text-right text-ink-soft">{s.feltLikeMe ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-serif text-2xl text-ink">{value}</div>
      <div className="mt-0.5 font-sans text-xs text-muted">{label}</div>
    </div>
  );
}
