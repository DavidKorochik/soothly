# Soothly

A Hebrew-first (RTL) web app that turns a person's own life into a personalized book. The user answers deep questions in a guided AI interview (voice or text); the system synthesizes the answers into a designed book of patterns, lessons, and insights, and delivers it as a print-quality PDF. Works as a self-purchase and as a gift (the subject always does the interview). Hebrew first, English later; any adult life stage.

Linear project: https://linear.app/davidk-os/project/soothly-bc83d773b558

## Stack

- **Next.js 16** (App Router, TypeScript, React 19) — server components by default
- **Tailwind v4** — CSS-first, theme tokens in `app/globals.css`
- **Drizzle ORM** + **Neon** (serverless Postgres over HTTP)
- **Anthropic Claude** via the Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) — Opus for synthesis, Sonnet for the safety check
- **Puppeteer** for PDF rendering — full `puppeteer` locally, `puppeteer-core` + `@sparticuz/chromium` in prod
- **zod** for boundary validation, **@vercel/blob** for storage

## Commands

```bash
npm run dev          # Next dev server (localhost:3000)
npm run build        # Production build
npm run db:generate  # Generate a Drizzle migration from schema.ts
npm run db:push      # Apply migrations to Neon
npm run db:studio    # Browse data in Drizzle Studio
```

## Where things live

The product is a pipeline: **interview answers → safety check → synthesis → PDF → storage**. Each stage is its own module under `lib/`.

- `app/` — routes. `api/synthesize/route.ts` orchestrates the full pipeline; `synthesize/` is the test UI.
- `lib/db/` — `schema.ts` (tables: `sessions`, `transcripts`, `feedback`, `funnelEvents`) and the singleton `db` client.
- `lib/safety/` — `runSafetyCheck()` classifies crisis signals; `decide()` returns proceed/block. **Fail-closed**: a classifier error blocks generation, never auto-generates unscreened.
- `lib/synthesis/` — `buildSynthesisPrompt()` fills the template, `synthesizeBook()` calls Claude, `parseBook()` turns marker output into a `Book`.
- `lib/pdf/` — `buildHtml()` builds the document, `renderPdf()` prints it, `browser.ts` resolves the right Chromium per environment.
- `lib/storage/` — `storePdf()` uploads to Vercel Blob, falls back to local disk when the token is absent.
- `docs/` — **core IP, not throwaway docs.** The prompts (`synthesis_prompt_v2.md`, `safety_check_prompt.md`) and the designer's `book_template.html` are loaded at runtime, so editing them changes behavior without code changes. The interview question bank and voice-agent spec also live here.

When adding a stage, follow this shape: one focused module under `lib/`, a small set of named exports, prompts/templates kept in `docs/` and loaded at runtime.

## Conventions

- **Immutability** — return new objects, never mutate inputs.
- **Validate at the boundary** — zod-parse every request body and external response before use. Never trust API output or user input.
- **Small, focused files** — organize by domain (`lib/<stage>`), not by type. Extract when a file grows past a few hundred lines.
- **Imports** — use the `@/` alias (mapped to repo root), e.g. `import { db } from "@/lib/db"`.
- **Hebrew + RTL is the default** — `<html dir="rtl" lang="he">`. All user-facing strings (labels, buttons, errors) are Hebrew. Keep it that way unless a string is internal.
- **Tailwind tokens** — style with the theme tokens defined in `app/globals.css` (`bg-paper`, `text-ink`, `text-gold`, `font-serif`, …), not raw hex values.
- **Client components are the exception** — mark `"use client"` only when a component needs interactivity; everything else stays a server component.
- **Routes that render PDFs** need `runtime = "nodejs"`, `dynamic = "force-dynamic"`, and a raised `maxDuration` — Puppeteer can't run on the edge runtime.
- **Single design source** — `docs/book_template.html` is the one source of truth for book styling; the PDF renderer reuses its `<head>`. Don't fork the styles.

## Working practices

- **Settings** go in `.claude/settings.json` only. Never create or modify `settings.local.json`.
- **Errors are explicit** — handle them at every level, user-friendly message in UI code, detailed context server-side. Never silently swallow.
- **Secrets** — never hardcode. Everything sensitive comes from env vars (see `.env.example`): `DATABASE_URL`, `ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`.

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
- [ ] Ran the code path you actually changed — show it works, don't assert it
- [ ] Every behavioral claim has evidence (see *Verifying runtime claims*)
- [ ] No leftover debug logs, dead code, or redundant comments

**For big or important changes** — a new pipeline stage, a schema change or migration, anything touching the safety / synthesis / PDF / storage paths, or anything handling user input or secrets — don't self-review. Fan out parallel review subagents with the `superpowers:dispatching-parallel-agents` skill, dispatching the reviewers that match the change:

- `everything-claude-code:typescript-reviewer` — type safety, async correctness, idioms (default for any TS change)
- `everything-claude-code:security-reviewer` — input validation, secrets, the synthesize / PDF / storage paths
- `everything-claude-code:silent-failure-hunter` — swallowed errors and bad fallbacks (matters given fail-closed safety)
- `everything-claude-code:database-reviewer` — Drizzle schema, migrations, and queries

**Use the skills, don't reinvent them.** Reach for `ponytail` to cut over-engineering before you finish, `/simplify` to tighten the diff, and `/code-review` for a correctness pass. If a skill already covers what you're doing, invoke it instead of hand-rolling.
