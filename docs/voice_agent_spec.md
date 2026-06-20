# Voice Interview Agent — Build Spec & Context
**Product (working name TBD):** a personalized "book of your patterns & lessons" generated from a deep AI voice interview.
**Audience:** Hebrew-first (Israel), any adult life stage. English is a later port.
**This doc is for:** the engineer/agent building the MVP (Claude Code). Read Part 1 before writing code.

---

# PART 1 — CONTEXT & CONCLUSIONS (read first)

## What we're building
A service where a person books a time, receives a phone/web call from a warm AI **voice agent**, and has a ~20–30 minute guided conversation about their life — defining moments, turning points, hardships, people, fears, patterns. The conversation is transcribed, a **synthesis** step finds the non-obvious patterns and lessons that run across their answers, and the output is a beautifully designed **book** (PDF for MVP) that reflects "who you've become" — something that feels written *only about them*.

It works as both a personal purchase and a gift, where **the subject always answers the questions** (the gift-giver buys it; the recipient does the interview). Forward-looking and reflective, not a backward memoir.

## How we got here (strategy conclusions that shape the build)
- **The market is validated but crowded at the edges.** AI "insight" apps (Kin, Rosebud, Purpose, MeetYu) own ongoing-subscription self-reflection. AI memoir apps (Autobiographer, Life Story AI) own backward-looking life-story books. Personalized-book gifting (Wonderbly, acquired by Penguin Random House) proves the "personalized + book + gift" business model. **The open whitespace** = forward-looking life *synthesis* delivered as an owned *book*, in Hebrew.
- **The killer differentiator is the "living book"** — a book that re-synthesizes over time and shows how you've *changed* ("last year the thread was X; now it's Y"). Nobody does AI longitudinal re-synthesis. This also converts a one-time purchase into recurring revenue and builds a data moat. The voice interview is the perfect recurring ritual for this.
- **The #1 product risk is "the horoscope / AI-slop problem."** AI-written sentimental content faces a real, growing 2026 authenticity backlash (the "AI-authorship effect": identical emotional text is judged less authentic and triggers mild disgust when believed to be AI-written). **Mitigation is the entire product:** the output must feel like something *only this person could have produced*, because it's built from *their own stories*. Position the human as the author, the AI as the lens. Never market as "AI writes you a book."
- **Specificity beats length.** A short book where every line is anchored to the person's real stories beats a long padded one. Length must be *earned* by input depth, never faked with generic filler. This is why we're using a voice interview: it extracts far more, and far more specific, raw material than a form.

## The risks every design decision must respect
1. **Synthesis is the gate.** A great interview feeding a synthesis that produces generic output = failure. The synthesis quality is the make-or-break, and it is *independent* of the voice agent. **Validate the synthesis separately and first** (can be done today with written answers).
2. **Hebrew voice is the weakest link.** Hebrew STT/TTS lags English. A mis-hearing or robotic-sounding agent breaks the intimacy spell in the first 30 seconds. **De-risk this before building the full flow** (see Build Order, Part 6).
3. **Intimacy cuts both ways.** Some people open up more to a non-judgmental AI; others clam up. The agent's warmth and safety-setting are critical to landing on the right side.
4. **Don't over-build before validation.** MVP = the thinnest thing that lets a real person complete an interview and receive a book. No accounts, no payments integration, no scale infra until the book is proven to land.

## Design north star
The agent must feel like **a warm, curious, thoughtful listener — not a clinical psychologist, not a chirpy assistant, and above all NOT a robotic survey.** The uncanny-valley failure mode to avoid is "a robot reading questions off a list." Warmth, real follow-ups, and unhurried pacing are the product.

---

# PART 2 — THE PRODUCT (end-to-end flow)

```
1. Landing page  →  2. Book a time (calendar)  →  3. Agent calls at booked time
        ↓
4. ~20–30 min voice interview (adaptive)  →  5. Transcript (Hebrew, speaker-labeled)
        ↓
6. Synthesis step (LLM: transcript → book content, anchored, non-generic)
        ↓
7. Render to book PDF (designed template)  →  8. Deliver (email link)
```

MVP can run steps 6–8 **manually/semi-automated** (David triggers synthesis + render) while steps 1–5 are automated. Automate the back half only once synthesis output is trusted.

---

# PART 3 — THE VOICE AGENT (core IP)

## 3.1 Persona & voice
- Warm, grounded, genuinely curious. Speaks natural Hebrew (gendered correctly once known).
- A great listener who asks the question you didn't expect — not a therapist, not a survey bot.
- Unhurried. Comfortable with silence. Never rushes the person to the next question.
- Gives short, human acknowledgments ("וואו" / "אני שומע/ת" / "תודה ששיתפת") — never robotic "Question 4 of 14."
- Configurable agent name + a single TTS voice chosen for warmth (test 3–4 Hebrew voices, pick the least synthetic).

## 3.2 System prompt (behavioral spec — adapt into the live prompt; agent SPEAKS Hebrew)
```
You are a warm, perceptive interviewer conducting an intimate ~25-minute conversation in
Hebrew that will become a personal book about the person you're speaking with.

GOAL: draw out specific, real STORIES from their life — concrete moments, not abstractions —
across a set of life themes. The richer and more specific their answers, the better their book.

PERSONA: a thoughtful, curious friend who is an exceptional listener. NOT a therapist, NOT a
survey bot, NOT a cheerful assistant. Calm, warm, unhurried. You make people feel safe enough
to say the true thing, not the polished thing.

OPENING (always): greet them by name, set safety and expectations in ~20 seconds:
- "אין תשובות נכונות, ואף אחד חוץ ממך לא ישמע את זה."
- "ככל שתספר/י סיפור אמיתי ולא משפט כללי — הספר ייצא יותר שלך."
- "אפשר לדלג על כל שאלה. קח/י את הזמן."
Confirm their gender naturally if not provided (needed for the book's grammar).

DURING:
- Cover the SPINE questions (below), in order, but conversationally — not mechanically.
- After each answer, run the EVALUATION logic. If the answer is abstract/thin, ask ONE
  follow-up that digs for the concrete scene or the feeling. Max 2 follow-ups per question.
- Reference what they just said ("אמרת ש... ספר/י לי על הרגע עצמו").
- Acknowledge warmly between themes. Never announce question numbers.
- If they get emotional, slow down, hold space, don't rush. If they decline, move on gently.

CLOSING: thank them genuinely, tell them what happens next (they'll receive their book), warm goodbye.

NEVER: sound clinical or scripted; ask multiple questions at once; give advice or interpretation
(you collect, you don't analyze — the book does that later); fill silence nervously.
```

## 3.3 The interview SPINE (Hebrew, gender-neutral phrasing)
The agent covers these ~14 themes. Each is a doorway; depth comes from adaptive follow-ups, not from more questions. (This is the curated voice version of the 31-question form — voice needs a smaller spine because follow-ups generate the depth.)

```
01. שורשים: מאיפה את/ה בא/ה — באיזה בית גדלת, ומה הייתה האווירה בו?
02. ילדות: דבר אחד מהילדות שעיצב אותך יותר משמתחשק להודות — הסיטואציה עצמה.
03. מפנה: רגע אחד שאחריו כבר לא היית אותו אדם. מה קרה בדיוק?
04. החלטה: החלטה אחת ששינתה את מסלול חייך — איך קיבלת אותה, וממה פחדת?
05. קושי: הזמן הכי קשה שעברת. קח/י את הזמן.
06. כישלון: כישלון אחד שאת/ה עדיין נושא/ת איתך. מה הוא לימד אותך?
07. אנשים: מי האדם שהכי עיצב אותך — לטוב או לרע? דוגמה ספציפית.
08. דפוס: מה חוזר אצלך שוב ושוב — אותו מצב, אותה תגובה, אותו סוג של אנשים?
09. פחד: ממה את/ה הכי פוחד/ת — באמת, לא התשובה היפה.
10. צל: מה מחזיק אותך אחורה? משהו שאת/ה מתחרט/ת עליו?
11. תובנה: תובנה אחת על החיים שהגעת אליה בדרך הקשה.
12. שינוי: במה השתנית הכי הרבה, ומה היית אומר/ת לעצמך מלפני עשר שנים?
13. עתיד: איזו גרסה של עצמך את/ה הכי רוצה להיות?
14. גאווה: מה את/ה הכי גאה בו — שכמעט לא סיפרת עליו לאף אחד?
```

## 3.4 Answer-evaluation layer (the "evaluate the answers" feature)
After each user answer, score it (cheap LLM call or inline reasoning):
```
depth:        1–5  (1 = vague abstraction, 5 = concrete scene with specifics + feeling)
has_scene:    bool (a specific moment with place/time/people?)
has_feeling:  bool (did they touch a real emotion or stay on the surface?)
followups_used_for_this_theme: int

DECISION:
  if depth < 3 AND followups_used < 2:
      → ask ONE adaptive follow-up (see templates) targeting the missing piece
  else:
      → warm acknowledgment, advance to next spine theme
```

## 3.5 Adaptive follow-up templates (Hebrew)
```
abstraction → scene:   "תן/י לי רגע אחד ספציפי שבו זה קרה — איפה היית, מי היה שם?"
scene → feeling:       "ומה עבר לך בראש בדיוק באותו רגע?"
skated past something:  "אמרת '<X>' כאילו זה כלום — ספר/י לי עוד על זה."
too short:             "יש עוד? אני ממש רוצה להבין את זה לעומק."
emotional moment:      "<silence / acknowledgment> ... קח/י את הזמן. אני כאן."
```

---

# PART 4 — PIPELINE DETAIL

- **Booking site:** dead simple. Name, phone (or web-call), pick a time, gender select. One page. No accounts.
- **Call trigger:** at booked time, initiate the call via the voice platform; pass name + gender into the agent's system prompt.
- **STT (Hebrew):** stream speech→text with speaker labels. Hebrew accuracy is the risk — see Build Order.
- **Interview loop:** realtime voice model OR (STT → LLM turn logic → TTS) loop running the system prompt + spine + evaluation.
- **Transcript:** store the full Hebrew transcript, speaker-labeled, tied to name+gender+age+timestamp. Keep raw — the synthesis and the future "living book" depend on this being saved.
- **Synthesis:** feed transcript into the synthesis prompt (see Appendix B). Output = book content with markers.
- **Render:** drop synthesis output into the book template → export PDF.
- **Deliver:** email the PDF link.

---

# PART 5 — RECOMMENDED STACK
(Engineer's call; these fit a Go/GCP background and Hebrew constraints.)
- **Voice orchestration:** LiveKit Agents, Vapi, Retell, or Pipecat. (Realtime, barge-in, turn-taking handled.)
- **STT:** test Deepgram (Hebrew) vs. Whisper-large (Hebrew). Pick on real Hebrew accuracy with emotional/rambling speech.
- **TTS:** ElevenLabs (best Hebrew warmth currently) — audition multiple voices. This choice makes or breaks the first impression.
- **Conversation LLM:** a strong multilingual model for the interview turn logic + evaluation.
- **Synthesis LLM:** highest-quality model available (synthesis quality > cost here).
- **Backend/hosting:** Go on GCP (Cloud Run) — existing strength. Store transcripts in Cloud SQL.
- **Book render:** HTML/CSS template (RTL Hebrew) → headless-Chrome print-to-PDF.

---

# PART 6 — BUILD ORDER (de-risk the weakest links FIRST)

**Step 0 — Hebrew voice spike (1 hour, do before anything else).**
Wire STT + TTS only. Have it ask 2 questions and call yourself in Hebrew. Judge: does it *hear*
you correctly, and does it *sound* warm (not robotic)? GREEN → proceed. RED → fix voice/lang or
reconsider voice-first, before building any flow around a broken first impression.

**Step 1 — Synthesis validation (parallel, can start today, no voice needed).**
Run the synthesis prompt on a real written transcript (interview yourself or one friend by text).
Read the book cold: uncanny or generic? This is the GATE. If it's generic, fix synthesis before
investing in the agent — the agent feeds this engine and can't fix it.

**Step 2 — Single end-to-end happy path.** One person books → gets called → completes interview →
transcript → (manual synthesis + render) → receives PDF. No scale, no payments.

**Step 3 — Harden the interview feel.** Iterate the persona, follow-ups, pacing on ~5 real calls.

**Step 4 — Automate the back half** (synthesis + render + deliver) only once trusted.

---

# PART 7 — SCOPE DISCIPLINE (NON-GOALS for MVP)
- ❌ User accounts / login
- ❌ Payment integration (collect payment manually for the first books)
- ❌ The "living book" re-synthesis (v2 — but DO save transcripts so it's possible later)
- ❌ The "relational / between-you" chapter (later)
- ❌ Printed/bound book (PDF only for now; print-on-demand is a later upsell)
- ❌ English version (Hebrew-first)
- ❌ Scale infra, queues, dashboards
The MVP exists to answer ONE question: does a real person, after a voice interview, receive a
book that makes them feel "how did it know that about me." Build only what serves that.

---

# APPENDIX A — Anti-generic rules (apply in synthesis; agent must feed it well)
- Every sentence in the book must be something you could say ONLY about this person, from their
  own words. If it'd be true of a stranger, cut it.
- Banned: horoscope/Barnum lines, self-help clichés, flattery without evidence, therapy-speak,
  invented facts, generic filler to pad length, mixed gender forms.
- Length scales with input depth. Thin input → shorter honest book, never padding.

# APPENDIX B — Synthesis prompt
Use the long-form universal synthesis prompt (separate file: synthesis_prompt_v2.md). It takes
NAME + GENDER + AGE + transcript and outputs a multi-chapter Hebrew book with markers
([TITLE], [OPENING], [CH#_NUM/TITLE/BODY/NUGGET], [CLOSING]) that map to the book template.

# APPENDIX C — Hebrew gendering
Collect gender at booking. Conjugate ALL Hebrew consistently — the agent's speech AND the book.
Never mix male/female forms within one person's experience.

# APPENDIX D — Authenticity positioning (affects copy, not just code)
This is "your own life, reflected" — the human is the author, the AI is the lens. Never present
it as "an AI wrote a book about you." The felt authenticity of the output is the moat.
```
