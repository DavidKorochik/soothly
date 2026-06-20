"use client";

import { useState } from "react";

type Result =
  | { status: "ok"; url: string; title: string; chapters: number }
  | { status: "flagged"; message: string }
  | { status: "error"; message: string };

export default function SynthesizePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          gender: form.get("gender"),
          age: form.get("age"),
          answers: form.get("answers"),
        }),
      });
      setResult(await res.json());
    } catch {
      setResult({ status: "error", message: "החיבור נכשל, נסו שוב." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-sans text-xs tracking-[0.28em] text-muted">כלי פנימי · בדיקה</p>
      <h1 className="mt-3 mb-8 font-serif text-3xl">יצירת ספר מתוך תמלול</h1>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="שם">
            <input name="name" required className={inputClass} />
          </Field>
          <Field label="מין">
            <select name="gender" required defaultValue="female" className={inputClass}>
              <option value="female">נקבה</option>
              <option value="male">זכר</option>
            </select>
          </Field>
          <Field label="גיל">
            <input name="age" type="number" min={1} max={120} required className={inputClass} />
          </Field>
        </div>

        <Field label="התשובות (תמלול גולמי)">
          <textarea
            name="answers"
            required
            rows={16}
            placeholder="הדביקו כאן את כל התשובות…"
            className={`${inputClass} resize-y font-sans leading-relaxed`}
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-ink px-7 py-3 font-sans text-sm text-paper transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "כותבים את הספר…" : "צור ספר"}
        </button>
      </form>

      {result && <ResultView result={result} />}
    </main>
  );
}

function ResultView({ result }: { result: Result }) {
  if (result.status === "ok") {
    return (
      <div className="mt-10 rounded-2xl border border-rule bg-white/40 p-6">
        <p className="font-serif text-xl">{result.title}</p>
        <p className="mt-1 font-sans text-sm text-muted">{result.chapters} פרקים</p>
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block font-sans text-sm text-gold underline underline-offset-4"
        >
          פתחו את הספר (PDF) ↗
        </a>
      </div>
    );
  }
  if (result.status === "flagged") {
    return (
      <div className="mt-10 rounded-2xl border border-gold-line bg-[rgba(168,124,79,0.06)] p-6">
        <p className="whitespace-pre-line font-sans leading-relaxed text-ink-soft">{result.message}</p>
      </div>
    );
  }
  return <p className="mt-10 font-sans text-sm text-ink-soft">{result.message}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-rule bg-white/50 px-4 py-2.5 font-sans text-ink outline-none focus:border-gold-line";
