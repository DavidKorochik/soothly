# Soothly

A Hebrew-first (RTL) web app that turns a person's own life into a personalized book. The user answers deep questions in a guided AI interview (voice or text); the system synthesizes the answers into a designed book of patterns, lessons, and insights, and delivers it as a print-quality PDF. Works as a self-purchase and as a gift (the subject always does the interview). Hebrew first, English later; any adult life stage.

Linear project: https://linear.app/davidk-os/project/soothly-bc83d773b558

## Stack

- **Next.js 16** (App Router, TypeScript, React 19) — server components by default
- **Tailwind v4** — CSS-first, theme tokens in `app/globals.css`
- **Drizzle ORM** + **Neon** (serverless Postgres over HTTP, `neon-http` driver)
- **Anthropic Claude** via the Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) — **Opus 4.8** synthesizes the book, **Sonnet 4.6** runs the safety check and the whole interview (interviewer + turn planner), **Haiku 4.5** judges Hebrew quality
- **OpenAI** `gpt-4o-transcribe` — Hebrew speech-to-text for optional voice dictation in the interview (the second model provider)
- **Puppeteer** for PDF rendering — full `puppeteer` locally, `puppeteer-core` + `@sparticuz/chromium` in prod
- **Resend** for the transactional review-link email; **zod** for boundary validation, **@vercel/blob** (private) for PDF storage

## Commands

```bash
npm run dev          # Next dev server (localhost:3000)
npm run build        # Production build (typecheck + bundle)
npm test             # node --test over the lib/*.test.ts unit suites (fast, no DB/network)
npm run db:generate  # Generate a Drizzle migration from schema.ts
npm run db:push      # Apply migrations to Neon
npm run db:studio    # Browse data in Drizzle Studio
```

## Where things live

The product is a pipeline: **interview → transcript → safety check → synthesis (+ Hebrew quality gate) → PDF → private storage → email delivery**. Each stage is its own focused module under `lib/`. Two shape notes that the names hide: `api/synthesize/route.ts` orchestrates only the *back half* (safety → storage) from a pre-assembled `answers` string — the interview front half is a separate live streaming system under `app/api/interview/`; and `lib/email` is built but **not yet wired** into any route.

- `app/` — routes + UI. **Pages:** `page.tsx` (landing), `interview/` (the live guided interview — `welcome → talking → done` state machine, voice via `MicButton`/`useRecorder`/`recorderMime`, localStorage resume, typewriter streaming with a byte-idle stall watchdog), `synthesize/` (internal test UI). **API routes** (all `runtime = "nodejs"`, `dynamic = "force-dynamic"`): `api/synthesize` (safety → synthesis → PDF → storage; `maxDuration = 300`), `api/interview/{start,turn,transcribe}` (the live interview; engine state rides in `X-Engine`/`X-Session`/`X-Done` headers; `maxDuration = 60`), `api/status`, `api/book/[key]` (serves a private book PDF by capability key). **Components** (`app/components/`): the shared paper-atmosphere layer — `PaperField`, `BotanicalSprig`, `BrandMark`, `LandingHero`, `ServiceStatusBanner` (+ `paperFieldData.ts` seeds). `layout.tsx` sets `<html dir="rtl" lang="he">`, loads the three fonts, and mounts the status banner; `manifest.ts` + file-convention icons/social cards are the PWA/brand assets.
- `lib/interview/` — the responsive interview engine; the pipeline's first stage, producing the answers everything downstream consumes. `spine.ts` is the question bank as code (16 `THEMES`, 6 Hebrew `CHAPTER_LABELS`, and `reachableThemes()`/`nextCoverage()` that hold the warm → tender → closing arc); `planner.ts` `planTurn()` reads one answer on Sonnet (depth, what was volunteered, deepen?, next theme); `engine.ts` is a pure, import-free `decideNext()` (deepen / advance / complete, bounded by `MAX_FOLLOWUPS` and `MAX_TOTAL_DEEPENS`); `prompt.ts` turns a decision into the interviewer's Hebrew directive; `chapters.ts` derives the progress bar. **Fail-open**: a planner error or timeout advances cleanly, never traps the interview. The transcript `questionKey` is engine-derived, so it's safe from model drift.
- `lib/transcription/` — voice-to-text for the interview (OpenAI `gpt-4o-transcribe`, `language=he`). `transcribeAudio()` validates the uploaded Blob at the boundary (size, MIME) then posts it; `errors.ts` maps each failure to an HTTP status + Hebrew message that offers the type-instead fallback. Needs `OPENAI_API_KEY` (missing key → 503); the client keeps the textarea live, so any failure soft-falls to typing.
- `lib/safety/` — `runSafetyCheck()` classifies crisis signals (Sonnet 4.6, zod-validated); `decide()` blocks only on `crisis || severity === "high"` and returns the Hebrew `SUPPORT_MESSAGE`. **Fail-closed**: a classifier error blocks generation, never auto-generates unscreened.
- `lib/synthesis/` — `buildSynthesisPrompt()`/`buildRepairPrompt()` fill `docs/synthesis_prompt_v2.md`; `synthesizeBook()` streams the book on Opus 4.8 (time-bounded), then runs the Hebrew quality gate and **one bounded, fail-open repair pass** (any judge/repair error keeps the original valid book); `parseBook()` turns the `[MARKER]` output into a `Book`. Logs only `error.name`/`message`, never the raw error, to keep the subject's stories out of logs.
- `lib/quality/` — the Hebrew quality gate. `runQualityCheck()` judges synthesized Hebrew on Haiku 4.5 against `docs/hebrew_quality_prompt.md`; `decide()` passes only on score ≥ 4 with no high-severity violation. **Fail-open** (the deliberate inverse of `lib/safety`): a judge error never discards an already-valid book. Called *inside* `synthesizeBook`, not the route.
- `lib/pdf/` — `buildHtml()` assembles the RTL document and reuses the designer's `book_template.html` `<head>`, **base64-inlining the self-hosted `docs/fonts/*.woff2`** into it (no Google CDN — prod serverless Chromium ships no system fonts); `renderPdf()` prints via Puppeteer after `document.fonts.ready`; `browser.ts` `getBrowser()` resolves the right Chromium per environment (`puppeteer-core` + `@sparticuz/chromium` on Vercel/Lambda, full `puppeteer` locally). Font inlining is fail-loud — a missing or non-`.woff2` file throws at render.
- `lib/storage/blob.ts` — `storePdf()` uploads the PDF to **private** Vercel Blob (prefix `books/`); `readPdf()` streams it back. No token (local dev) falls back to disk at `.books/` (never `public/`); on Vercel a missing `BLOB_READ_WRITE_TOKEN` throws rather than silently using ephemeral disk. Served only via the `api/book/[key]` capability route (UUID-keyed, regex-validated against path traversal, `private, no-store` — no auth yet; real auth lands with accounts).
- `lib/status/` — `getServiceStatus()` reports each provider as `operational | degraded | down`, polling the Anthropic (`status.claude.com`) and OpenAI (`status.openai.com`) Statuspage feeds and keying off the specific components our calls hit (`api.anthropic.com`, OpenAI `Audio`), not the page-wide indicator. Split across `check.ts` (fetch + orchestration), the pure `deriveHealth()` reducer in `health.ts`, `constants.ts`, and `types.ts`. **Fail-safe**: a feed/parse error reads as operational (never a false alarm); a zero-match stale matcher logs a warning rather than going dark. Served by `app/api/status/route.ts`; surfaced by the global `ServiceStatusBanner`.
- `lib/email/` — `sendReviewLink()` emails the finished-book link via Resend (Hebrew/RTL template). Validates the link is http/https and HTML-escapes inputs at the boundary. **Fail-closed**: throws if `RESEND_API_KEY` is unset. **Built but not yet wired** into the pipeline; still sends from the `onboarding@resend.dev` sandbox sender pending a verified domain.
- `lib/db/` — `schema.ts` (tables `sessions`, `transcripts`, `feedback`, `funnelEvents`; enums `gender`, `session_status` = `in_progress|completed|flagged|synthesized`), `index.ts` (singleton `db` over Neon `neon-http`; throws if `DATABASE_URL` unset), and `queries.ts` (the write API: `createSession`, `saveTranscript`, `logFunnel`, `completeSession`). **Graceful degradation**: with no `DATABASE_URL`, `queries.ts` returns a synthetic session id and no-ops writes, so the interview runs end-to-end in dev without Neon. Single migration in `drizzle/`.
- `docs/` — **core IP, not throwaway docs.** Five prompts are read at runtime via `fs.readFileSync`, so editing them changes behavior without code changes: `synthesis_prompt_v2.md`, `safety_check_prompt.md`, `hebrew_quality_prompt.md`, `interview_system_prompt.md`, `interview_planner_prompt.md`. `book_template.html` is the single design source — `lib/pdf/template.ts` pulls its `<head>` and inlines the self-hosted `docs/fonts/*.woff2`. The rest are **reference specs, not loaded at runtime**: `hebrew_voice.md` (brand-voice law), `questions_universal.md` (the 31-question form — note the *live* interview spine is hardcoded in `lib/interview/spine.ts`, not this file), `voice_agent_spec.md`, `ux_direction.md`.

**Failure posture is deliberate and per-stage.** Safety fails *closed* (blocks generation); the quality gate, interview planner, and status feed fail *open/safe* (proceed as if fine); email fails *closed* (throws); storage and the DB fall back gracefully in local dev. When you touch a stage, match its existing polarity — don't quietly flip a fail-closed gate open.

When adding a stage, follow this shape: one focused module under `lib/`, a small set of named exports, prompts/templates kept in `docs/` and loaded at runtime.

## Conventions

- **Immutability** — return new objects, never mutate inputs.
- **Validate at the boundary** — zod-parse every request body and external response before use. Never trust API output or user input.
- **Small, focused files** — organize by domain (`lib/<stage>`), not by type. Extract when a file grows past a few hundred lines.
- **Imports** — use the `@/` alias (mapped to repo root), e.g. `import { db } from "@/lib/db"`.
- **Hebrew + RTL is the default** — `<html dir="rtl" lang="he">`. All user-facing strings (labels, buttons, errors) are Hebrew. Keep it that way unless a string is internal. Copy quality matters — see [Hebrew copy](#hebrew-copy).
- **Tailwind tokens** — style with the theme tokens defined in `app/globals.css`, not raw hex. Colors: `paper`, `ink`, `ink-soft`, `muted`, `gold`, `gold-line`, `brand`, `sage`, `rule`. Fonts: `font-serif` (Frank Ruhl Libre), `font-sans` (Heebo), `font-display` (David Libre 700).
- **Client components are the exception** — mark `"use client"` only when a component needs interactivity; everything else stays a server component.
- **API routes run on the Node runtime** — every route sets `runtime = "nodejs"` and `dynamic = "force-dynamic"` (Puppeteer, `fs`-loaded prompts, and the streaming model calls all can't run on edge). PDF and long model calls also raise `maxDuration` (synthesize `300`, interview/transcribe `60`).
- **Single design source** — `docs/book_template.html` is the one source of truth for book styling; the PDF renderer reuses its `<head>` and inlines the `docs/fonts/*.woff2` referenced there. Don't fork the styles or relink fonts to a CDN.

## Hebrew copy

User-facing Hebrew is product surface, not a translation dump. Write it like a warm Israeli human wrote it — never like an AI-translated form. Specifics:

**Research before you write.** Before drafting any user-facing Hebrew, read [`docs/hebrew_voice.md`](docs/hebrew_voice.md) — the research-grounded brand-voice guide: native-vs-translationese tells, modern Israeli microcopy patterns, the gender-neutral static-copy toolkit, and a pre-ship cringe checklist. The bullets below are the short version; the guide is the full law.

- **No slash-gender forms.** `את/ה`, `כתוב/י`, `תחליט/י`, `בן/בת` read as bureaucratic and cringe. For **static** copy (the welcome/landing screens, before gender is known), phrase gender-neutrally instead: infinitives (`לחלוק`, `לכתוב`), impersonal `אפשר` (`אפשר לדלג`), and nominal phrases (`ההחלטה ... רק שלך`, `מה הגיל שלך?`). Unvocalized 2nd-person past is already gender-neutral in writing (`השארת`, `סיפרת`) — those are fine. **Dynamic** interview copy may use the real gender from intake, since it's known by then.
- **Plain hyphen `-` only — never em/en dash (`—` `–`).** Author UI strings with `-` from the start. The book pipeline auto-strips `[—–]` → `-` from synthesized copy (`lib/pdf/template.ts`), but hardcoded UI strings skip that, so don't introduce them.
- **Warm and premium, not clinical.** Avoid label-speak kickers like the old `ספר הדפוסים`; prefer warm, human phrasing - or no kicker at all. No filler, no marketing gloss.

## Working practices

- **Settings** go in `.claude/settings.json` only. Never create or modify `settings.local.json`.
- **Errors are explicit** — handle them at every level, user-friendly message in UI code, detailed context server-side. Never silently swallow.
- **Secrets** — never hardcode. Everything sensitive comes from env vars (see `.env.example`): `DATABASE_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`.

## Comments

Most code needs no comment — good names carry the meaning. Write one only when it earns its place.

- Comment a **complex** function with one short, plain-English sentence — non-trivial logic, multiple steps, or non-obvious behavior. Nothing else gets a comment.
- **Never write redundant comments.** No comment that restates the code, the signature, or an already-clear name (`// loop over users` above a loop over users). If the comment and the line say the same thing, the comment is noise — delete it.
- Comment the *why*, not the *what* — a workaround, a constraint, a deliberate shortcut. The code already shows what it does.
- Keep every comment to one sentence. No multi-paragraph docstrings, no annotating every field.

## Verifying runtime claims

Reason from first principles, then back every behavioral claim with evidence — a test you ran, a log the user shared, or source you actually read. Reading code produces hypotheses, not conclusions. When evidence conflicts (code vs. observed behavior), surface both, find the cause, and prefer writing a test to settle it. User-observed behavior is the stronger signal. If you can't get evidence, say so and stop.

## Code review — steel-man every finding

Before reporting a bug or concern, construct the strongest counter-argument against your own finding. Drop it if the counter-argument wins; report it only after you've tried and failed to refute it. When two findings rest on contradictory premises, at most one is correct — reconcile first. If a concern and its counter-argument stay balanced, report it as low-confidence with both sides laid out and defer the call — don't bury the uncertainty under "probably."

## Before you're done

Run this every time, before claiming work complete:

- [ ] `npm run build` passes — typecheck clean, no errors
- [ ] `npm test` passes — the `lib/*.test.ts` unit suites (synthesis parse, safety decide, pdf template, interview engine, transcription, status, quality)
- [ ] Ran the code path you actually changed — show it works, don't assert it
- [ ] Every behavioral claim has evidence (see *Verifying runtime claims*)
- [ ] No leftover debug logs, dead code, or redundant comments

**For big or important changes** — a new pipeline stage, a schema change or migration, anything touching the safety / synthesis / quality / interview / PDF / storage paths, or anything handling user input or secrets — don't self-review. Fan out parallel review subagents with the `superpowers:dispatching-parallel-agents` skill, dispatching the reviewers that match the change:

- `everything-claude-code:typescript-reviewer` — type safety, async correctness, idioms (default for any TS change)
- `everything-claude-code:security-reviewer` — input validation, secrets, the synthesize / PDF / storage paths
- `everything-claude-code:silent-failure-hunter` — swallowed errors and bad fallbacks (matters given fail-closed safety)
- `everything-claude-code:database-reviewer` — Drizzle schema, migrations, and queries

**Use the skills, don't reinvent them.** Reach for `ponytail` to cut over-engineering before you finish, `/simplify` to tighten the diff, and `/code-review` for a correctness pass. If a skill already covers what you're doing, invoke it instead of hand-rolling.
