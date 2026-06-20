# Interview UI/UX direction (research-grounded)

Synthesized from multi-source UX research (Typeform completion data, self-disclosure / Social
Penetration, goal-gradient & endowed progress, active-listening chatbots, Calm/Day One/StoryWorth,
RTL Hebrew). This guides the interview screen.

## North star
Soothly should feel like sitting with a warm, attentive grandchild who is quietly writing your life
into a beautiful Hebrew book as you speak - never a chatbot, never a survey. Every screen is one
cream page of a keepsake being authored in real time.

## Principles
1. **One screen = one ask.** Highest-leverage completion lever. No counter, no chrome, no sidebar.
2. **Intimacy is earned, not extracted.** Easy/identity openers first; tender questions at 70-90%.
3. **Listen before you ask.** Every AI turn reflects a real detail back, then asks one new thing.
4. **The reward is the book, made visible** - not points/streaks. Their words becoming a serif page.
5. **Calm is engineered.** Muted cream/gold, lavish whitespace, slow decelerating motion. Warmth = restraint.
6. **Safety stated plainly, early.** "Who sees this?" answered before the first question.
7. **RTL-first, not RTL-translated.** Logical CSS props; bidi-isolate names/years/Latin.
8. **Nothing shared can be lost.** Autosave + save-and-resume; a 20-30 min vulnerable flow WILL be interrupted.

## Key decisions
- **First impression:** payoff line in serif + one human privacy line + a bounded expectation
  ("~20 min, one question at a time, no right answers"). First interactive moment is easy and warm.
- **Pacing:** strict one-per-screen; a brief thinking beat then the reflection streams in; never
  auto-advance (they hit send); AI turn shorter than theirs; skip + "come back later" on every prompt.
- **Progress:** named chapters as a quietly filling gold rule, filling from the RIGHT; endow to ~18%
  after warm-up; near-goal language (~80%); warm milestone beats at chapter close. Never a number.
- **Motion:** one gentle transition (~400-600ms, decelerating, forward = leftward in RTL); breathing
  dot (not spinner) for thinking; honor prefers-reduced-motion.
- **Microcopy:** warm spoken Hebrew, kind-grandchild register, gender-aware. Buttons are first-person
  plural ("בוא נמשיך"), placeholders invite ("כתוב כמה שבא לך, גם שורה אחת מספיקה"). Name heavy chapters gently.
- **Input:** borderless cream RTL textarea, >=18px (prevents iOS auto-zoom), auto-grow, ~62ch measure.
- **Emotional reward:** each answer visibly becomes a serif keepsake line; reflect details back; a
  deliberate peak near the end; a ceremonial cover-reveal close, not a form submit.
- **Mobile-first** RTL with logical properties; bigger Hebrew sizes; persistent autosave indicator.

## Drop-off mitigations
Chaptering; no numeric counter; endowed progress; tender questions at 70-90%; reassurance at the
three friction points (first vulnerable Q, the "endless middle," just-before-end); autosave +
resume; visible keepsake mid-flow; skip/defer on every prompt; effortless early questions.

## Risks to respect
Over-engineered warmth tips into uncanny (cap pauses ~1.5-2s, reflect concrete details only, ~1
sentence, restraint); emotion-naming can misfire on grief (offer, never assert); RTL/bidi bugs read
as a cheap foreign tool; the 20-30 min length is past every drop-off threshold (resume is the safety
net); privacy copy must match the real access model.

## MVP scope (this build) vs later
- **Now:** one-question cream serif screen, warm hook + privacy, gentle motion, two-beat AI (already),
  chapter gold progress (no numbers, endowed), warm Hebrew microcopy, skip, light keepsake echo of
  their words, localStorage save-and-resume, ceremonial close, mobile RTL.
- **Later:** voice-to-text (Hebrew STT - separate POC), full per-answer live *synthesis* preview,
  server-side resume, real privacy/access controls behind the copy.
