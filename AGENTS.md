# Soothly — Base44 dev notes

## What this is
Next.js 16 (App Router, Turbopack, TS) + Tailwind v4 + Drizzle ORM. RTL Hebrew UI.
Build status: Step 1 of 5 — scaffold + schema + warm RTL landing page.

## Running here
`docker compose -f docker-compose.base44.yml up -d` — single `web` service (node:22),
bind-mounted source, `npm install` then `next dev -H 0.0.0.0 -p 3000` on port 3000.

## No database needed for dev
The app is **deliberately designed to run without a DB locally**. `lib/db/persistence.ts`
`persistenceEnabled()` returns false when `DATABASE_URL` is unset and `VERCEL` is not set,
so all DB writes become no-ops and the interview runs end-to-end in memory. `lib/db/index.ts`
throws if `DATABASE_URL` is unset, but it is only lazy-imported (`getDb` dynamic import) when
persistence is actually enabled — so it never fires in local dev. Do NOT add a Postgres
service or set `DATABASE_URL` just to boot; it is unnecessary and the neon-http driver
(`@neondatabase/serverless`) cannot talk to a standard local Postgres anyway.

## Credentials
- `ANTHROPIC_API_KEY` — required for the interview (question streaming via Vercel AI SDK)
  and book synthesis. Without it the landing page renders but `/api/interview/*` and
  `/api/synthesize` fail. Not required at boot.
- `OPENAI_API_KEY` — optional; powers Hebrew speech-to-text for voice dictation. Without it
  the mic appears but transcription returns a "type instead" message.
- `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `CRON_SECRET` — later steps (PDF storage,
  email, cron auth); not needed now.
None are required at boot; the app starts and renders without any of them.

## Verifying it works
`curl -s http://localhost:3000/` returns 200 with `<title>Soothly</title>` and the Hebrew
description "הסיפור שלך, כפי שנראה מבחוץ.".

## Next.js preview origin
`next.config.ts` sets `allowedDevOrigins` from `BASE44_PUBLIC_HOST_SUFFIX` so the Base44
preview origin can fetch dev assets / HMR. The var is passed into the `web` service env.
