"use client";

import { useEffect, useRef, useState } from "react";
import { START, type EngineState } from "@/lib/interview/engine";
import { chapterLabel, progress } from "@/lib/interview/chapters";
import { MicButton, VoiceStatusLine, type VoiceUiState } from "./MicButton";
import { isRecordingSupported } from "./recorderMime";

// Dictation augments typed text rather than replacing it: append after a space, or a new line
// when the existing text already closes a sentence (Hebrew has no capitals to mark the seam).
function appendDictation(prev: string, text: string): string {
  const a = prev.trim();
  if (!a) return text;
  return /[.!?…]$/.test(a) ? `${a}\n${text}` : `${a} ${text}`;
}

type Gender = "male" | "female";
type Intake = { name: string; gender: Gender; age: string };
type Msg = { role: "assistant" | "user"; content: string };
type Step = "welcome" | "talking" | "done";
type Saved = { intake: Intake; sessionId: string; engine: EngineState; messages: Msg[] };

const STORAGE_KEY = "soothly_interview_v1";

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
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setVoiceSupported(isRecordingSupported()), []);

  useEffect(() => {
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

  function growInput() {
    const el = taRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }

  async function streamTurn(url: string, body: object) {
    setBusy(true);
    setThinking(true);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      setBusy(false);
      setThinking(false);
      throw new Error("turn failed");
    }
    const nextEngine = JSON.parse(res.headers.get("X-Engine") || "null") as EngineState;
    const done = res.headers.get("X-Done") === "1";
    const sid = res.headers.get("X-Session") || undefined;

    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let first = true;
    for (;;) {
      const { done: rdone, value } = await reader.read();
      if (rdone) break;
      if (first) {
        setThinking(false);
        first = false;
      }
      text += decoder.decode(value, { stream: true });
      setMessages((m) => {
        const c = m.slice();
        c[c.length - 1] = { role: "assistant", content: text };
        return c;
      });
    }
    setBusy(false);
    setThinking(false);
    return { engine: nextEngine, done, sessionId: sid };
  }

  async function begin(e: React.FormEvent) {
    e.preventDefault();
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
      setEngine(r.engine);
    } catch {
      setMessages([{ role: "assistant", content: "משהו השתבש בהתחלה. נסו לרענן ולהתחיל שוב." }]);
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

  async function send(skip = false) {
    if (busy) return;
    const answer = skip ? "(דילגתי על השאלה)" : input.trim();
    if (!skip && !answer) return;
    const convo: Msg[] = [...messages, { role: "user", content: answer }];
    setMessages(convo);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    try {
      const r = await streamTurn("/api/interview/turn", {
        sessionId,
        name: intake.name.trim(),
        gender: intake.gender,
        messages: convo,
        engine,
        skip,
      });
      setEngine(r.engine);
      if (r.done) setStep("done");
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "החיבור נקטע. נסו לשלוח שוב." }]);
    }
  }

  if (step === "welcome") {
    return <Welcome intake={intake} setIntake={setIntake} onBegin={begin} resumable={resumable} onResume={resume} onFresh={() => { localStorage.removeItem(STORAGE_KEY); setResumable(null); }} />;
  }

  const current = messages[messages.length - 1];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const assistantText = current?.role === "assistant" ? current.content : "";

  if (step === "done") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <div className="soothly-fade max-w-prose text-center">
          <p className="font-sans text-xs tracking-[0.3em] text-muted">הספר שלך</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">הספר של {intake.name}</h1>
          <div className="mx-auto my-7 h-px w-10 bg-gold-line" />
          <p className="whitespace-pre-line font-serif text-lg leading-loose text-ink-soft">{assistantText}</p>
          <p className="mt-8 font-sans text-sm text-muted">הספר שלך נכתב עכשיו מהדברים שסיפרת. נשלח לך אותו ברגע שיהיה מוכן.</p>
        </div>
      </main>
    );
  }

  const pct = Math.round(progress(engine.phase, engine.index) * 100);
  const voiceActive = voice.status === "requesting" || voice.status === "recording" || voice.status === "transcribing";

  function onVoiceTranscript(text: string) {
    setInput((prev) => appendDictation(prev, text));
    requestAnimationFrame(() => {
      growInput();
      const el = taRef.current;
      if (el) {
        el.focus();
        const end = el.value.length;
        el.setSelectionRange(end, end);
      }
    });
  }

  return (
    <main className="relative flex min-h-dvh flex-col">
      <div className="fixed inset-x-0 top-0 z-10">
        <div className="h-[3px] w-full bg-rule/40">
          <div
            className="h-full bg-gold-line transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-5 pt-3">
          <span className="font-sans text-[11px] tracking-[0.2em] text-muted">{chapterLabel(engine.phase, engine.index)}</span>
          {!busy && <span className="font-sans text-[11px] text-muted/70">נשמר ✓</span>}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-24">
        {lastUser && (
          <p className="soothly-fade mb-8 border-r-2 border-rule pr-4 font-serif text-base leading-relaxed text-muted/80">
            {lastUser.content}
          </p>
        )}

        {thinking && !assistantText ? (
          <div className="my-6 h-3 w-3 rounded-full bg-gold soothly-breathe" aria-label="חושב על מה שסיפרת" />
        ) : (
          <h2 key={messages.length} className="soothly-rise font-serif text-2xl leading-relaxed text-ink sm:text-[28px] sm:leading-relaxed">
            {assistantText}
          </h2>
        )}

        <div className="mt-8">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              growInput();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={busy || voiceActive}
            rows={1}
            placeholder="כתוב/י כמה שבא לך, גם שורה אחת מספיקה…"
            className="w-full resize-none bg-transparent font-sans text-lg leading-relaxed text-ink outline-none placeholder:text-muted/60 disabled:opacity-50"
            style={{ minHeight: "2rem" }}
            autoFocus
          />
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => void send(true)}
              disabled={busy || voiceActive}
              className="font-sans text-sm text-muted underline-offset-4 hover:underline disabled:opacity-40"
            >
              אפשר לדלג על השאלה
            </button>
            <div className="flex items-center gap-3">
              {voiceSupported && (
                <MicButton sessionId={sessionId} disabled={busy} onTranscript={onVoiceTranscript} onState={setVoice} />
              )}
              <button
                onClick={() => void send()}
                disabled={busy || voiceActive || !input.trim()}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper transition hover:opacity-90 disabled:opacity-30"
                aria-label="המשך"
              >
                <span className="text-xl leading-none">←</span>
              </button>
            </div>
          </div>
          {voiceSupported && <VoiceStatusLine {...voice} />}
        </div>
      </div>
    </main>
  );
}

function Welcome({
  intake,
  setIntake,
  onBegin,
  resumable,
  onResume,
  onFresh,
}: {
  intake: Intake;
  setIntake: (i: Intake) => void;
  onBegin: (e: React.FormEvent) => void;
  resumable: Saved | null;
  onResume: () => void;
  onFresh: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="soothly-fade w-full max-w-md">
        {resumable && (
          <div className="mb-10 rounded-2xl border border-gold-line bg-[rgba(168,124,79,0.06)] p-5 text-center">
            <p className="font-serif text-lg text-ink">הספר שלך מחכה לך.</p>
            <p className="mt-1 font-sans text-sm text-muted">השארת באמצע - אפשר להמשיך בדיוק מאיפה שעצרת.</p>
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

        <p className="font-sans text-xs tracking-[0.3em] text-muted">ספר הדפוסים</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight">ספר החיים שלך, בקולך</h1>
        <p className="mt-5 font-sans leading-relaxed text-ink-soft">
          הסיפורים שלך נשארים שלך - רק את/ה תחליט/י עם מי לחלוק את הספר.
        </p>
        <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
          בערך 20 דקות, שאלה אחת בכל פעם. אין תשובות נכונות, ואפשר לדלג על כל שאלה.
        </p>

        <form onSubmit={onBegin} className="mt-10 space-y-6">
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
            <span className="mb-2 block font-sans text-sm text-muted">לשון פנייה</span>
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
            <span className="mb-2 block font-sans text-sm text-muted">בן/בת כמה את/ה?</span>
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
            className="mt-2 rounded-full bg-ink px-8 py-3.5 font-sans text-paper transition hover:opacity-90"
          >
            מתחילים
          </button>
        </form>
      </div>
    </main>
  );
}
