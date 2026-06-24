"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { START, type EngineState } from "@/lib/interview/engine";
import { buildAnswers, SKIP_MARKER } from "@/lib/interview/answers";
import { addBook, parseBooks, type SavedBook } from "@/lib/interview/books";
import { chapterLabel, chapterFills, progress } from "@/lib/interview/chapters";
import { MicButton, VoiceStatusLine, type VoiceUiState } from "./MicButton";
import { isRecordingSupported } from "./recorderMime";
import PaperField from "@/app/components/PaperField";
import BrandMark from "@/app/components/BrandMark";

// Layout effect on the client so the textarea is resized before paint (no flicker); a plain
// effect on the server, where useLayoutEffect would only warn and there is nothing to measure.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Dictation augments typed text rather than replacing it: append after a space, or a new line
// when the existing text already closes a sentence (Hebrew has no capitals to mark the seam).
function appendDictation(prev: string, text: string): string {
  const a = prev.trim();
  if (!a) return text;
  return /[.!?…]$/.test(a) ? `${a}\n${text}` : `${a} ${text}`;
}

// Mimic spoken cadence: hold the reveal briefly after a punctuation mark that marks a verbal stop -
// longer at a sentence end or line break than at a mid-sentence comma.
function speechPauseMs(ch: string): number {
  if (ch === "\n") return 260;
  if (".!?…".includes(ch)) return 150;
  if (",;:".includes(ch)) return 90;
  return 0;
}

type Gender = "male" | "female";
type Intake = { name: string; gender: Gender; age: string };
type Msg = { role: "assistant" | "user"; content: string; error?: boolean };
type Step = "welcome" | "talking" | "done";
type Saved = { intake: Intake; sessionId: string; engine: EngineState; messages: Msg[] };
type BookState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "ready"; url: string }
  | { status: "flagged"; message: string }
  | { status: "error" };

const STORAGE_KEY = "soothly_interview_v2";
const BOOKS_STORAGE_KEY = "soothly_books_v1";

export default function InterviewPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [intake, setIntake] = useState<Intake>({ name: "", gender: "female", age: "" });
  const [sessionId, setSessionId] = useState("");
  const [engine, setEngine] = useState<EngineState>(START);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [resumable, setResumable] = useState<Saved | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voice, setVoice] = useState<VoiceUiState>({ status: "idle", errorMessage: null, seconds: 0 });
  const [book, setBook] = useState<BookState>({ status: "idle" });
  const [books, setBooks] = useState<SavedBook[]>([]);
  const bookStartedRef = useRef(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setVoiceSupported(isRecordingSupported()), []);

  useEffect(() => {
    // The user's library of finished books, surfaced on the welcome screen so a refresh never loses a
    // download link and they can open a past book or start a new one. (book_key is persisted
    // server-side too, but there's no lookup route yet.)
    setBooks(parseBooks(localStorage.getItem(BOOKS_STORAGE_KEY)));

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw) as Saved;
      if (s?.messages?.length) setResumable(s);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (step === "talking" && messages.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ intake, sessionId, engine, messages }));
    }
    if (step === "done") localStorage.removeItem(STORAGE_KEY);
  }, [step, intake, sessionId, engine, messages]);

  // Once the interview completes, synthesize the book and reveal a download link on the done screen.
  // The ref guard fires it exactly once; messages/sessionId/intake are final by the time step is "done".
  useEffect(() => {
    if (step !== "done" || bookStartedRef.current) return;
    bookStartedRef.current = true;
    void makeBook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Grow the answer box to fit its content on every change - typing, paste, dictation, or reset -
  // so the whole answer stays visible instead of scrolling one line at a time inside a short box.
  useIsoLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  async function streamTurn(url: string, body: object) {
    setBusy(true);
    setThinking(true);

    // A stalled turn (server hung before the first byte, or a proxy that holds the socket open with
    // no data) must never freeze the UI. Abort if no NETWORK byte arrives for STALL_MS - generous
    // enough to cover the legit pre-stream work (answer scoring + the model's first token), tight
    // enough to rescue a real hang. Byte-based, never reveal-based, so the slow typewriter can't trip it.
    const STALL_MS = 25000;
    const ac = new AbortController();
    let lastByteAt = performance.now();
    const watchdog = setInterval(() => {
      if (performance.now() - lastByteAt > STALL_MS) ac.abort();
    }, 2000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error("turn failed");
      const nextEngine = JSON.parse(res.headers.get("X-Engine") || "null") as EngineState;
      const done = res.headers.get("X-Done") === "1";
      const sid = res.headers.get("X-Session") || undefined;

      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let received = "";
      let shown = 0;
      let streamDone = false;
      let firstShown = false;
      let pumpError: unknown = null;
      lastByteAt = performance.now();

      // Pump the network in the background; reveal it on a steady cadence below so the question reads
      // like someone typing to you, not like uneven network bursts.
      const pump = (async () => {
        try {
          for (;;) {
            const { done: rdone, value } = await reader.read();
            if (rdone) break;
            received += decoder.decode(value, { stream: true });
            lastByteAt = performance.now();
          }
        } catch (e) {
          pumpError = e;
        } finally {
          // Always release the reveal loop below, even on a mid-stream drop, so the UI surfaces the
          // error instead of hanging forever with the input disabled.
          streamDone = true;
        }
      })();

      await new Promise<void>((resolve) => {
        // A CONSTANT pace is the point: a gap-proportional catch-up dumps each network burst then
        // stalls until the next one (the "fast then stuck" feel). One steady rate for the whole
        // reveal - the same after the model finishes as during - so the cadence never shifts under
        // the reader.
        const REVEAL_CPS = 20;
        let last = performance.now();
        let pausedUntil = 0;
        // A backgrounded tab pauses requestAnimationFrame, so a turn that finishes while the user is
        // away can't keep painting. Snap to the full text on hide so they return to the finished
        // question, not a half-typed one; resync the clock on show to avoid a dt spike.
        const onVisibility = () => {
          if (document.hidden) shown = received.length;
          else last = performance.now();
        };
        document.addEventListener("visibilitychange", onVisibility);
        const finish = () => {
          document.removeEventListener("visibilitychange", onVisibility);
          resolve();
        };
        const tick = (now: number) => {
          const dt = (now - last) / 1000;
          last = now;
          if (now >= pausedUntil && shown < received.length) {
            const before = Math.floor(shown);
            // Accumulate fractional progress: a per-frame floor of 1 char would pin the reveal to the
            // refresh rate (~60-120 cps) and make REVEAL_CPS below that a no-op.
            shown = Math.min(received.length, shown + REVEAL_CPS * dt);
            const after = Math.floor(shown);
            if (!firstShown) {
              setThinking(false);
              // Advance the chapter title + progress as the new question starts to appear, so they
              // track the question on screen instead of snapping a beat late once it finishes typing.
              if (nextEngine) setEngine(nextEngine);
              firstShown = true;
            }
            const text = received.slice(0, after);
            setMessages((m) => {
              const c = m.slice();
              c[c.length - 1] = { role: "assistant", content: text };
              return c;
            });
            // Breathe after a just-revealed stop so the cadence feels spoken, not mechanical.
            if (after > before) pausedUntil = now + speechPauseMs(received[after - 1]);
          }
          if (streamDone && shown >= received.length) {
            finish();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });

      await pump;
      // A failed turn shows up two ways: the AI SDK swallows a model error into a 200 with an empty
      // body (empty stream), and a dropped/aborted read rejects (pumpError). Either way the turn
      // failed - surface it via the caller's catch instead of rendering a blank or hanging.
      if (pumpError) throw pumpError;
      if (!received.trim()) throw new Error("empty stream");
      return { done, sessionId: sid };
    } finally {
      // Re-enable the input on every exit - success, error, or abort - so a failed fetch can never
      // leave the controls stuck disabled.
      clearInterval(watchdog);
      setBusy(false);
      setThinking(false);
    }
  }

  async function begin() {
    if (!intake.name.trim() || !intake.age) return;
    setResumable(null);
    setMessages([]);
    setEngine(START);
    setStep("talking");
    try {
      const r = await streamTurn("/api/interview/start", {
        name: intake.name.trim(),
        gender: intake.gender,
        age: intake.age,
      });
      if (r.sessionId) setSessionId(r.sessionId);
    } catch {
      setMessages([{ role: "assistant", content: "משהו השתבש. אפשר לרענן ולהתחיל שוב. אם זה ממשיך, הצוות שלנו יחזור אליך במייל.", error: true }]);
    }
  }

  async function makeBook() {
    setBook({ status: "generating" });
    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          name: intake.name.trim(),
          gender: intake.gender,
          age: intake.age,
          answers: buildAnswers(messages),
        }),
      });
      const data = await res.json();
      if (data?.status === "ok" && typeof data.url === "string") {
        const entry: SavedBook = {
          name: intake.name,
          url: data.url,
          title: typeof data.title === "string" ? data.title : undefined,
          age: intake.age || undefined,
          createdAt: Date.now(),
        };
        const next = addBook(books, entry);
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(next));
        setBooks(next);
        setBook({ status: "ready", url: data.url });
      } else if (data?.status === "flagged" && typeof data.message === "string") {
        setBook({ status: "flagged", message: data.message });
      } else {
        setBook({ status: "error" });
      }
    } catch {
      setBook({ status: "error" });
    }
  }

  function resume() {
    if (!resumable) return;
    setIntake(resumable.intake);
    setSessionId(resumable.sessionId);
    setEngine(resumable.engine);
    setMessages(resumable.messages);
    setResumable(null);
    setStep("talking");
  }

  // Leave the done screen for a fresh interview without touching the saved library, so a person can
  // make a book for another phase of life (or another subject) and keep the ones they already made.
  function startNew() {
    setBook({ status: "idle" });
    bookStartedRef.current = false;
    setMessages([]);
    setSessionId("");
    setEngine(START);
    setInput("");
    setResumable(null);
    setStep("welcome");
  }

  async function send(skip = false) {
    if (busy) return;
    const answer = skip ? SKIP_MARKER : input.trim();
    if (!skip && !answer) return;
    const convo: Msg[] = [...messages, { role: "user", content: answer }];
    setMessages(convo);
    setInput("");
    try {
      const r = await streamTurn("/api/interview/turn", {
        sessionId,
        name: intake.name.trim(),
        gender: intake.gender,
        messages: convo,
        engine,
        skip,
      });
      if (r.done) setStep("done");
    } catch {
      // The title advances optimistically once the new question starts streaming; on a failed turn
      // roll it back so a refresh-resume can't land a question ahead of where they actually are.
      setEngine(engine);
      // Drop the empty assistant placeholder streamTurn added before the failure so it does not
      // linger in state (and localStorage) ahead of the error message.
      setMessages((m) => {
        const last = m[m.length - 1];
        const base = last?.role === "assistant" && !last.content.trim() ? m.slice(0, -1) : m;
        return [...base, { role: "assistant", content: "משהו השתבש בשליחה. אפשר לנסות שוב. אם זה ממשיך, הצוות שלנו יחזור אליך במייל.", error: true }];
      });
    }
  }

  if (step === "welcome") {
    return <Welcome intake={intake} setIntake={setIntake} onBegin={begin} resumable={resumable} onResume={resume} onFresh={() => { localStorage.removeItem(STORAGE_KEY); setResumable(null); }} books={books} />;
  }

  const current = messages[messages.length - 1];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const assistantText = current?.role === "assistant" ? current.content : "";

  if (step === "done") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <PaperField surface="full" />
        <div className="paper-content soothly-fade max-w-prose text-center">
          <BrandMark className="mx-auto mb-7 h-9 w-auto" />
          <p className="font-sans text-xs tracking-[0.3em] text-muted">הספר שלך</p>
          <h1 className="mt-4 font-display font-bold text-4xl leading-[1.1] sm:text-5xl">הספר של <bdi>{intake.name}</bdi></h1>
          <div className="mx-auto my-7 h-px w-10 bg-gold-line" />
          {assistantText && (
            <p className="whitespace-pre-line font-serif text-lg leading-loose text-ink-soft">{assistantText}</p>
          )}
          <BookPanel book={book} onRetry={() => void makeBook()} />
          {book.status !== "generating" && (
            <button
              onClick={startNew}
              className="mt-10 font-sans text-sm text-muted underline-offset-4 transition-colors hover:text-ink-soft hover:underline"
            >
              ליצור ספר חדש
            </button>
          )}
        </div>
      </main>
    );
  }

  const fills = chapterFills(engine);
  const label = chapterLabel(engine);
  const nearGoal = progress(engine) >= 0.8;
  const voiceActive = voice.status === "requesting" || voice.status === "recording" || voice.status === "transcribing";

  function onVoiceTranscript(text: string) {
    setInput((prev) => appendDictation(prev, text));
    // The layout effect resizes the box; this only restores focus and drops the caret at the end.
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (el) {
        el.focus();
        const end = el.value.length;
        el.setSelectionRange(end, end);
      }
    });
  }

  return (
    <main className="soothly-fade relative isolate flex min-h-dvh flex-col">
      <PaperField surface="focused" />
      <div className="fixed inset-x-0 top-0 z-10 bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-6 pb-3 pt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span key={label} className="soothly-fade font-sans text-sm tracking-[0.04em] text-ink-soft">{label}</span>
            <span className="font-sans text-[11px] text-muted/70">{nearGoal ? "כמעט סיימנו" : !busy ? "נשמר ✓" : ""}</span>
          </div>
          <div className="flex gap-1.5">
            {fills.map((f, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-rule/50">
                <div
                  className="h-full rounded-full bg-gold-line transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.round(f * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-24">
        {lastUser && (
          <p className="soothly-fade mb-8 border-r-2 border-rule pr-4 font-serif text-base leading-relaxed text-muted/80">
            {lastUser.content}
          </p>
        )}

        {thinking && !assistantText ? (
          <div className="my-6 h-3 w-3 rounded-full bg-gold soothly-breathe" aria-label="קוראים את מה שסיפרת" />
        ) : (
          <h2 key={messages.length} className="soothly-rise font-serif text-2xl leading-relaxed text-ink sm:text-[28px] sm:leading-relaxed">
            {assistantText}
          </h2>
        )}

        <div className="mt-8">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={busy || voiceActive}
            rows={1}
            placeholder="כמה שבא לך לכתוב - גם שורה אחת מספיקה"
            className="block max-h-[45vh] w-full resize-none overflow-y-auto border-b border-rule bg-transparent pb-3 font-sans text-lg leading-relaxed text-ink outline-none transition-colors duration-300 placeholder:text-muted/55 focus:border-gold-line disabled:opacity-50"
            style={{ minHeight: "2.5rem" }}
            autoFocus
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void send(true)}
              disabled={busy || voiceActive}
              className="font-sans text-sm text-muted underline-offset-4 transition-colors hover:text-ink-soft hover:underline disabled:opacity-40"
            >
              אפשר לדלג על השאלה
            </button>
            <div className="flex shrink-0 items-center gap-3">
              {voiceSupported && (
                <MicButton sessionId={sessionId} disabled={busy} onTranscript={onVoiceTranscript} onState={setVoice} />
              )}
              <button
                onClick={() => void send()}
                disabled={busy || voiceActive || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-paper transition hover:opacity-90 disabled:opacity-30"
                aria-label="המשך"
              >
                <span className="text-lg leading-none">←</span>
              </button>
            </div>
          </div>
          {voiceSupported && <VoiceStatusLine {...voice} />}
        </div>
      </div>
    </main>
  );
}

function BookPanel({ book, onRetry }: { book: BookState; onRetry: () => void }) {
  if (book.status === "ready") {
    return (
      <div className="mt-8">
        <p className="font-sans text-sm text-muted">הספר שלך מוכן.</p>
        <a
          href={book.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-full bg-ink px-7 py-3 font-sans text-sm text-paper transition hover:opacity-90"
        >
          לפתוח את הספר (PDF) ↗
        </a>
      </div>
    );
  }
  if (book.status === "flagged") {
    return <p className="mt-8 whitespace-pre-line font-sans text-sm leading-relaxed text-ink-soft">{book.message}</p>;
  }
  if (book.status === "error") {
    return (
      <div className="mt-8">
        <p className="font-sans text-sm text-ink-soft">משהו השתבש ביצירת הספר. הדברים שסיפרת שמורים.</p>
        <button
          onClick={onRetry}
          className="mt-4 rounded-full border border-rule px-6 py-2.5 font-sans text-sm text-ink-soft transition hover:border-gold-line"
        >
          לנסות שוב
        </button>
      </div>
    );
  }
  return (
    <div className="mt-8 flex flex-col items-center gap-4">
      <div className="h-3 w-3 rounded-full bg-gold soothly-breathe" aria-label="כותבים את הספר" />
      <p className="font-sans text-sm text-muted">כותבים עכשיו את הספר שלך מהדברים שסיפרת. זה ייקח דקה או שתיים.</p>
    </div>
  );
}

function Welcome({
  intake,
  setIntake,
  onBegin,
  resumable,
  onResume,
  onFresh,
  books,
}: {
  intake: Intake;
  setIntake: (i: Intake) => void;
  onBegin: () => void;
  resumable: Saved | null;
  onResume: () => void;
  onFresh: () => void;
  books: SavedBook[];
}) {
  const [leaving, setLeaving] = useState(false);

  // Mirror the landing CTA: the welcome card rises away before we hand off to the first question.
  // Reduced-motion (and a missing field) fall straight through with no animation.
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!intake.name.trim() || !intake.age || leaving) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onBegin();
      return;
    }
    setLeaving(true);
    window.setTimeout(onBegin, 420);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <PaperField surface="full" />
      <div className={`paper-content w-full max-w-md ${leaving ? "soothly-leave" : "soothly-rise"}`}>
        <BrandMark className="mb-9 block h-9 w-auto" />
        {resumable && (
          <div className="mb-10 rounded-2xl border border-gold-line bg-[rgba(168,124,79,0.06)] p-5 text-center">
            <p className="font-serif text-lg text-ink">הספר שלך מחכה לך.</p>
            <p className="mt-1 font-sans text-sm text-muted">הפסקת באמצע, אבל שמרנו כל מילה שכתבת.</p>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={onResume} className="rounded-full bg-ink px-6 py-2.5 font-sans text-sm text-paper hover:opacity-90">
                להמשיך
              </button>
              <button onClick={onFresh} className="rounded-full px-4 py-2.5 font-sans text-sm text-muted hover:underline">
                להתחיל מחדש
              </button>
            </div>
          </div>
        )}

        {books.length > 0 && (
          <div className="mb-10">
            <p className="mb-3 font-sans text-sm text-muted">הספרים שלך</p>
            <ul className="space-y-2.5">
              {books.map((b) => (
                <li key={b.url}>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-serif text-base text-ink underline-offset-4 transition-colors hover:text-gold hover:underline"
                  >
                    {b.title || `הספר של ${b.name}`}{b.age ? ` · גיל ${b.age}` : ""} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="font-sans text-xs tracking-[0.3em] text-muted">ספר אישי</p>
        <h1 className="mt-4 font-display font-bold text-4xl leading-[1.1]">ספר החיים שלך, בקולך</h1>
        <p className="mt-5 font-sans leading-relaxed text-ink-soft">
          הסיפורים שלך נשארים שלך. ההחלטה עם מי לחלוק - רק שלך.
        </p>
        <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
          בערך 20 דקות, שאלה אחת בכל פעם. אין תשובות נכונות, ואפשר לדלג על כל שאלה.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-6">
          <label className="block">
            <span className="mb-2 block font-sans text-sm text-muted">איך קוראים לך?</span>
            <input
              value={intake.name}
              onChange={(e) => setIntake({ ...intake, name: e.target.value })}
              required
              className="w-full border-b border-rule bg-transparent pb-2 font-serif text-xl text-ink outline-none focus:border-gold-line"
            />
          </label>

          <div>
            <span className="mb-2 block font-sans text-sm text-muted">איך לפנות אליך?</span>
            <div className="flex gap-3">
              {([["female", "נקבה"], ["male", "זכר"]] as const).map(([g, label]) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setIntake({ ...intake, gender: g })}
                  className={`flex-1 rounded-full border px-4 py-2.5 font-sans text-sm transition ${
                    intake.gender === g
                      ? "border-gold-line bg-[rgba(168,124,79,0.1)] text-ink"
                      : "border-rule text-muted hover:border-gold-line"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block font-sans text-sm text-muted">מה הגיל שלך?</span>
            <input
              type="number"
              min={1}
              max={120}
              value={intake.age}
              onChange={(e) => setIntake({ ...intake, age: e.target.value })}
              required
              className="w-28 border-b border-rule bg-transparent pb-2 font-serif text-xl text-ink outline-none focus:border-gold-line"
            />
          </label>

          <button
            type="submit"
            disabled={leaving}
            className="mt-2 rounded-full bg-ink px-8 py-3.5 font-sans text-paper transition hover:opacity-90 disabled:opacity-90"
          >
            מתחילים
          </button>
        </form>
      </div>
    </main>
  );
}
