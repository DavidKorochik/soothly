# Hebrew model A/B — blind bake-off

Settles the "should Soothly's Hebrew run on Claude or GPT?" question the only way public benchmarks
can't: a **blind, native-reader A/B on the real synthesis prompt.** No leaderboard scores warm,
non-translationese Israeli register with correct gender over thousands of words — so we measure it
directly. See memory `hebrew-model-choice` for why the folk wisdom ("GPT is better at Hebrew") is
stale for this task.

## What it does

1. Runs the **production** synthesis path (`buildSynthesisPrompt` + the real system prompt +
   `parseBook`) for every fixture × every model in the registry.
2. Generates **raw** books — no quality gate, no repair pass. That is deliberate: prod's repair runs
   on Claude, so applying it to a GPT draft would measure a Claude-repaired GPT book. Each model is
   judged on its own unaided Hebrew.
3. Writes each book to a **blinded** HTML file (random id, no model name) and shuffles the order.
4. You score each book 1–5 against the `hebrew_voice.md` rubric, in `scoresheet.csv`.
5. `ab:tally` un-blinds via the keymap and reports per-model means, head-to-head wins, and a switch
   verdict.

## Setup

```bash
# Anthropic is already a dep. For the GPT side:
npm i -D @ai-sdk/openai          # already installed
export ANTHROPIC_API_KEY=...     # required for Claude models
export OPENAI_API_KEY=...        # required only if a gpt-* model is selected
```

Then **confirm the exact OpenAI model id** in `models.ts` against OpenAI's current model list — ids
drift (the research saw `gpt-5.1` / `gpt-5.5`). A wrong id 404s.

## Run

```bash
npm run ab:run                                   # all models, all fixtures
npm run ab:run -- --models opus-4-8,gpt-5-1      # subset
npm run ab:run -- --fixtures /path/to/real       # your own transcripts dir
```

Each run lands in `scripts/hebrew-ab/.runs/<timestamp>/` (gitignored):

```
<fixture>/<blind_id>.html   the book to read (rubric printed at top)
raw/<blind_id>.txt          raw [MARKER] output, for debugging
scoresheet.csv              fill 1–5 per cell
keymap.json                 blind_id -> model (the un-blinding key — don't peek before scoring)
```

## Score, then tally

Open each `<fixture>/*.html`, read it as a native Hebrew reader, and fill `scoresheet.csv` (1–5).
Use 2–3 independent raters for signal. Then:

```bash
npm run ab:tally             # latest run
npm run ab:tally -- scripts/hebrew-ab/.runs/<timestamp>
```

### Rubric (1–5, defined in `rubric.ts`)

| key | what 5 means |
|---|---|
| `translationese` *(decisive)* | fully native Hebrew, zero calques |
| `slop` | no self-help / therapy vocabulary |
| `gender` *(decisive)* | gender held consistently to the end of every clause (gender is known) |
| `anchoring` | every line could only be about this person (the ONE RULE) |
| `warmth` *(decisive)* | warm spoken-literary, not stiff/academic (Claude's known risk) and not fawning |
| `overall` | a book you'd be glad to receive |

### The switch rule

`tally` flags a switch **only if a challenger beats the best Claude model by >0.25 on all three
decisive dims** (translationese, gender, warmth). One aggregate win isn't enough, and a single
sample isn't either — re-run to confirm stability before acting.

## Fixtures

A fixture is one JSON: `{ name, gender: "male"|"female", age, answers }`. `answers` is the raw
interview text. The two `example-*.json` files are **synthetic** and safe to commit; drop **real
anonymized transcripts** in as `*.json` and gitignore keeps them (and all generated books) out of
git — these are people's life stories.
