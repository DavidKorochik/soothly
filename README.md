# Soothly

Web app that interviews a person about their life and synthesizes the answers
into a beautifully designed, personalized Hebrew book of the patterns and lessons they can't see in
themselves.

Core IP lives in `docs/`: `synthesis_prompt_v2.md`, `questions_universal.md`, `voice_agent_spec.md`,
`book_template.html`.

## Stack

Next.js (App Router, TS) · Tailwind v4 · Drizzle ORM + Neon Postgres · Anthropic via Vercel AI SDK
(later steps) · Puppeteer → PDF (later) · Vercel Blob + Resend (later). Deploys on Vercel.

## Structure

```
app/            Next.js App Router (RTL Hebrew UI)
lib/db/         Drizzle schema + Neon client (sessions, transcripts, feedback, funnel_events)
docs/           Reference IP (prompts, questions, voice spec, book template)
```

## Run locally

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL (and later keys)
npm run dev                 # http://localhost:3000
```

## Database (Neon)

Create a Neon project, put its connection string in `DATABASE_URL`, then:

```bash
npm run db:push             # apply the schema
npm run db:studio           # browse data (optional)
```

## Deploy (Vercel)

```bash
npx vercel            # first run links/creates the project
npx vercel --prod     # production deploy
```

Set the env vars from `.env.example` in the Vercel project settings.

## Build status

Step 1 of 5 — scaffold + schema + warm RTL hello-world. See the build order in the project brief.
