# Hebrew voice - the brand-voice law

Read this before writing any user-facing Hebrew for Soothly - landing copy, interview prompts, buttons, errors, the synthesized book. It is the single source of truth for tone. It extends the house rules in `CLAUDE.md`; where this and `CLAUDE.md` overlap, they agree by design.

The guide obeys its own rules: every Hebrew string below uses a plain hyphen `-` only. No em-dash, no en-dash, ever - not even in examples.

## 1. North star

Write like a literate, warm Israeli human wrote it by hand for one specific person - never like a form, a translation, a self-help poster, or a chatbot performing empathy. The register is spoken-literary: the way a thoughtful Israeli actually speaks when they mean it, with precise words but no stiffness. Warmth comes from plainness, brevity, and concrete detail - not from intensifiers, exclamation marks, or grand metaphors. State the true thing and stop; let the reader feel it without being told how. The person is always the author of their own life; we are the lens that arranges what they said, never the voice that "understands" them.

## 2. Research before you write

Hebrew copy fails in predictable ways. Before drafting, run this quick check so you catch the failure mode before it ships.

1. **Is the user's gender known here?** STATIC copy (landing, onboarding, buttons, privacy, errors - written before intake) must be gender-neutral with no slash-forms. DYNAMIC interview copy the LLM conjugates at runtime from known gender MAY keep slash-forms in source (the model resolves them) - don't flag those.
2. **Would this survive being pasted into a motivational-quote listicle?** If yes, it's too abstract. Rewrite it concrete and specific to this one life.
3. **Does it read like a back-translation from English?** Say the Hebrew idea from scratch, not the English sentence in Hebrew words. Watch for calques (section 3).
4. **What part of speech is this surface?** Button = action-noun (שם פעולה). Instruction = `אפשר` + infinitive. Personal line = 2nd-person past + `שלך`. Product voice = first-person `אנחנו`. Decide before you write (section 5).
5. **Is the AI the emotional subject anywhere?** It must not be. Re-center the human as author.
6. **Punctuation pass:** plain hyphen only, no em/en dash, no semicolon, no exclamation stack, no decorative `...`.

## 3. Cringe tells - bad to good

Each pair: the antipattern, then the rewrite. Grouped by failure mode.

### Translationese (תרגומית) - the #1 tell

The words are Hebrew, the sentence is English. Resolve calques into native idiom; break long `של` / `סמיכות` chains; prefer a verb and a named human over nominalized abstraction.

| Bad | Good | Why |
|---|---|---|
| בסופו של יום, זה ספר על המסע שלך | בשורה התחתונה, זה ספר על החיים שלך | "At the end of the day" meaning *ultimately* is a calque - use `בשורה התחתונה` / `בסיכומו של דבר`. (Literal end-of-day is fine.) |
| הספר הוא על הרגעים שעיצבו אותך | הספר מספר על הרגעים שעיצבו אותך | "is about" is not `הוא על`. Use a verb (`מספר על`, `עוסק ב-`) or `זה ספר על`. |
| תהליך היצירה של הספר האישי של סיפור החיים שלך | כך נולד הספר שנכתב מהחיים שלך | Kill the `של`/`סמיכות` chain. One `של` max, then a verb carries the rest. |
| אנחנו כאן כדי לספק לך חוויה | אנחנו אוספים את מה שסיפרת וכותבים ספר | `לספק` is a calque of "provide." Name the real action. |
| כתבנו את הספר בשביל אותך, מכל הזיכרונות של אותך | כתבנו את הספר בשבילך, מכל מה שסיפרת | Use bound forms: `בשבילך`, `שלך` - never `preposition + אות-`. |
| יצרנו עבורך חוויה מותאמת עבור כל שלב | בנינו לך משהו אישי, לכל שלב בחיים | `עבור` is formal/translationese for everyday "for." Prefer `ל-` / `בשביל`. |
| המערכת מבצעת יצירה של ספר תוך ביצוע ניתוח של התשובות | אנחנו כותבים לך ספר מתוך מה שסיפרת | Collapse nominalization + light verb (`מבצע יצירה של`) to a plain verb with a human agent. |
| אתה תספר את הסיפור שלך, ואנחנו ניצור את הספר שלך עבורך | תספר, ואנחנו נכתוב | Hebrew encodes the subject in the verb. Drop redundant pronouns and doubled possessives. |

### Self-help slop

Inspirational-poster abstraction. The whole promise of a keepsake is specificity; abstraction breaks it. Ban the value-vocabulary: `מסע`, `להעצים`, `להכיל`, `ריפוי`, `צמיחה`, `אותנטי`, `להתחבר לעצמך`, `הגרסה הטובה ביותר של עצמך`, `פוטנציאל`, `נבכי הנשמה`, `האור הפנימי`.

| Bad | Good |
|---|---|
| הספר הזה הוא מסע מעצים אל האני האותנטי שלך - הזדמנות לצמיחה | הספר הזה מספר את הסיפור שלך - כמו שהוא, במילים שלך |
| צא למסע קסום אל נבכי נשמתך וגלה את האור הפנימי שלך | נדבר על הדברים שחזרת אליהם שוב ושוב, ועל מה שלמדת מהם |
| כל אחד מאיתנו נושא בתוכו סיפור, ובסופו של דבר מגיע לו לספר אותו | לכל חיים יש פרטים שאף אחד אחר לא יזכור במקומך |
| ספר חם, אישי ומרגש, שמספר, מתעד ושומר את הרגעים הגדולים והקטנים | ספר אישי, מהרגעים הגדולים ומאלה שכמעט שכחת |

Cut empty intensifiers (`ממש`, `באמת באמת`, `פשוט קסום`, `חוויה בלתי נשכחת`) and brand-gloss (`הפתרון המושלם עבורך`). Break the rule-of-three triad - keep one or two precise words, not three padding ones.

### AI-sentiment - the authenticity backlash

Identical emotional text reads as less authentic once it's believed AI-written. The defenses: keep the human as author, anchor every emotional line in their specific material, and under-state. Never let the software be the thing that "feels" or "understands."

| Bad | Good |
|---|---|
| הבינה המלאכותית שלנו באמת מבינה אותך, מקשיבה לך ונמצאת כאן בשבילך | הסיפורים שלך נשארים שלך, ומה שיוצא מהם נכתב מהמילים שלך |
| חוויה עוצמתית ומרגשת שתיגע בך עמוק בלב ותשנה את חייך | הספר שלך נכתב עכשיו מהדברים שסיפרת |
| זה פשוט מדהים!! חוויה ממש ממש מרגשת ובלתי נשכחת! | זה יישאר איתך |
| לא משנה מי אתה ומאיפה באת, לכל אחד יש סיפור, ולכל סיפור יש משמעות | לכל חיים יש דפוס שחוזר. אצלך הוא מחכה שמישהו יראה אותו מבחוץ |

In the **synthesized book** especially: every observation must quote the person's own material and read it back with a specific, non-obvious insight - no universal morals, no `כל אחד מאיתנו`, no abstract virtue nouns. Bad: `המסע שלך מלמד שכוח אמיתי מגיע מתוך פגיעות`. Good: `סיפרת שחיכית עד שכולם הלכו לישון כדי לבכות. זה לא חולשה - זו הדרך שלך לשמור על כולם`.

### Clinical / therapy-speak

The product is intimate but it is not therapy. Therapy vocabulary makes a keepsake feel like an intake form. Avoid `תהליך`, `לעבד`, `מרחב בטוח`, `להכיל`, `רגשות שעולים`, and the coaxing-counsellor cadence.

| Bad | Good |
|---|---|
| ניצור עבורך מרחב בטוח לעבד את הרגשות שעולים ולהכיל את התהליך | יש לך זמן. אפשר לעצור באמצע ולחזור מתי שנוח |
| בוא ניקח רגע לעבד את מה שאתה מרגיש עכשיו | אין למה למהר. אפשר לכתוב כמה שבא לך |

### Archaic / over-formal / flowery

Generic models default to courtroom-formal Hebrew. Strip it to warm spoken-literary. Also avoid the opposite failure - no slang (`סבבה`, `יאללה`) in premium keepsake copy.

| Bad | Good | Fix |
|---|---|---|
| בכדי להתחיל, יש למלא את הפרטים אשר נדרשים על מנת שנוכל להמשיך | כדי להתחיל, אפשר למלא את הפרטים ונמשיך מכאן | `בכדי`->`כדי`, `אשר`->`ש`, `על מנת ש`->`כדי ש`, impersonal `יש ל-`->`אפשר` |
| רגע זה מהווה נקודת מפנה אשר הינה משמעותית | זה רגע שמשנה הכול | Drop `מהווה`/`הינו`. Use `הוא` or a real verb. |
| באפשרותך לשתף את אשר על ליבך בהיקף הרצוי לך, ובכל עת ניתן לדלג | כמה שבא לך לכתוב - גם שורה אחת מספיקה. אפשר לדלג בכל רגע | Swap `באפשרותך`/`אשר על ליבך`/`ניתן` for plain spoken verbs + `אפשר` |
| חשוב לציין שבעולם של היום, כל אחד מאיתנו זקוק לרגע של עצירה | לפעמים צריך רגע אחד של שקט כדי לראות את עצמך | Cut filler openers (`חשוב לציין`, `בעולם של היום`, `כל אחד מאיתנו`) |

## 4. Modern microcopy patterns

Israeli digital tone is direct and unfussy. Warmth is understated. Buttons and CTAs are 1-3 words.

- **Buttons / CTAs:** action-noun (שם פעולה), never an imperative. `שליחה` not `שלח/י`, `הרשמה` not `הירשם`, `התחלה`, `המשך`, `דילוג`, `שמירה`, `שיתוף`. Move any explanation to helper text beside the button.
- **First-person product voice:** use `אנחנו` for system actions and the one big invitation - `שלחנו לך קישור`, `שמרנו את התשובות שלך`, `עוד רגע ומתחילים`. Reserve `בואו נ...` for the single onboarding opener; spammed on every button it reads like a kids' app.
- **`אפשר` is the politeness workhorse** for optional / permission copy: `אפשר לדלג`, `אפשר לחזור לזה אחר כך`, `אפשר לענות בקול או בכתב`, `תמיד אפשר לערוך`. Prefer `אפשר` over the clinical `ניתן`.
- **Placeholders hint, never instruct.** Light example, not the field's only label (it vanishes on focus). Label: `מייל לשליחת הספר` · placeholder: `למשל, rotem@gmail.com`. For the open text box: `כתבו כאן... אפשר להתחיל מכל מקום`.
- **Errors: no blame, name the situation, offer the next step.** `משהו השתבש אצלנו. אפשר לנסות שוב`. Validation names the field gently: `משהו לא נראה תקין בכתובת המייל, אפשר לבדוק שוב?`. No error codes, no ALL-CAPS, no Catch-22 phrasing.
- **Progress / loading:** present-continuous and bounded - `רגע, מכינים את הספר שלך, עוד כמה שניות`; `שלב 2 מתוך 5`. Confirmations are terse past-tense: `נשמר`, `נשלח`, `הכול מוכן`.
- **Onboarding:** one warm invitation, set expectations, lower the stakes - `זה לוקח כ-15 דקות`, `אין תשובות נכונות`, `אפשר לעצור ולחזור מתי שרוצים`. No feature-listing.

| Bad | Good |
|---|---|
| לחצו כאן כדי להמשיך לשלב הבא בתהליך | המשך |
| בקשתך התקבלה במערכת ותטופל בהקדם | קיבלנו, תכף חוזרים אליך |
| כל הכבוד!!! עשית את זה! אנחנו כל כך גאים בך! | יפה. השארת כאן משהו אמיתי |
| שגיאה! הזנת נתונים לא תקינים (ERR_VALIDATION) | משהו לא נראה תקין בכתובת המייל, אפשר לבדוק שוב? |
| אנא המתן... | רגע, מכינים את הספר שלך - עוד כמה שניות |

## 5. Gender-neutral static-copy toolkit

For STATIC copy (before gender is known), pick the technique by surface. These read as standard product Hebrew, not as a gender workaround.

- **Buttons / short labels -> action-noun (שם פעולה):** `כניסה`, `הרשמה`, `התחברות`, `הורדה`, `שמירה`, `המשך`, `דילוג`, `עריכה`, `שיתוף`.
- **Instructions / hints -> `אפשר` / `כדי` + infinitive:** `אפשר לדלג`, `כדי לשמור`, `כאן אפשר לכתוב בחופשיות`.
- **Impersonal frames -> `אפשר` / `כדאי` / `יש` / `אין`:** `כדאי להתחיל מכאן`, `יש עוד שאלה אחת`, `אין חובה לענות על הכל`. Prefer `אפשר` over the stiff `ניתן`.
- **Personal lines -> 2nd-person past + `-ך` possessive** (identical for both genders unvocalized): `סיפרת`, `השארת`, `בחרת`, `כתבת`; `שלך`, `אותך`, `איתך`, `לך`. `ההחלטה הזו רק שלך`. `מה שכתבת נשמר`.
- **Accompaniment -> first-person `אנחנו` / `אני`:** `סיימנו`, `מצאנו`, `אספנו את מה שסיפרת`, `עוד רגע ואנחנו מתחילים`.
- **Nominalize to kill the direct address:** instead of `אתה בטוח?` -> `לאשר את הבחירה?`; instead of `הזן את שמך` -> `השם שלך`.
- **Plural** (`ברוכים הבאים`) is neutral but less personal and masculine-generic - use only for true broadcast surfaces, never the intimate 1:1 interview voice.
- **`גם-וגם` doubling** (`ברוכים וברוכות`) only in short ceremonial lines, never in flowing sentences.

| Bad (static) | Good (static) |
|---|---|
| הירשם/הירשמי | הרשמה |
| כתוב/כתבי כאן את התשובה שלך | כאן אפשר לכתוב בחופשיות |
| אתה בטוח שברצונך להמשיך? | להמשיך? אפשר תמיד לחזור אחורה |
| רק אתה/את תוכל/י לראות את מה שסיפרת | מה שסיפרת נשאר רק שלך. ההחלטה לשתף - רק שלך |
| השלמת 3 מתוך 7 - אתה כמעט שם | סיימנו 3 מתוך 7 - עוד קצת ואנחנו שם |
| מצטערים, לא הצלחת לשלוח. נסה/י שוב | משהו השתבש בשליחה. אפשר לנסות שוב |
| ניתן לדלג על שאלה זו | אפשר לדלג על השאלה הזו |
| ספרו לנו על רגע ששינה אתכם (1:1 interview) | ספר לי על רגע ששינה אותך (dynamic, known gender) |
| ברוכ.ה הבא.ה, מוזמנ.ת להתחיל | טוב שהגעת. אפשר להתחיל מתי שבא לך |

## 6. Hard rules

- **Plain hyphen `-` only.** Never `—` or `–`. Author Hebrew with `-` from the start. (UI strings skip the pipeline's auto-strip, so hardcoded dashes survive.)
- **No slash-gender in STATIC copy** (`את/ה`, `כתוב/י`, `בן/בת`, `הירשם/הירשמי`). If you feel you "need" a slash, that's the signal to rephrase via section 5. Dynamic interview copy the LLM conjugates may keep slash-forms in source.
- **No inner-dot / period gender forms** (`תלמיד.ה`, `ברוכ.ה`) - banned, same as slashes.
- **No em/en dash, no semicolon** in reflective copy. Prefer a full stop and a new sentence.
- **No exclamation stacks, no emoji warmth, no decorative `...`.** One quiet warm line, then get out of the way.
- **The AI is never the emotional subject.** It arranges and reflects; it does not "understand," "feel," or "know" the person.
- **Concrete over abstract.** No `מסע` / `צמיחה` / `נבכי הנשמה` / `כל אחד מאיתנו`. Name the particular.
- **No `ספר הדפוסים`-style label-speak kicker.** Prefer human phrasing like `ספר אישי`.

## 7. Pre-ship cringe checklist

- [ ] Plain hyphen `-` only - searched for `—` and `–`, found none.
- [ ] No slash-gender, inner-dot, or period gender forms in static copy.
- [ ] No calques - reads as native Hebrew, not English in Hebrew words.
- [ ] No `של` / `סמיכות` chain longer than two words.
- [ ] No self-help vocabulary (`מסע`, `צמיחה`, `אותנטי`, `להעצים`, `נבכי הנשמה`).
- [ ] No AI-sentiment - software is not the thing that "understands" or "feels."
- [ ] No clinical / therapy-speak (`מרחב בטוח`, `לעבד`, `רגשות שעולים`).
- [ ] No archaic connectors (`בכדי`, `אשר`, `על מנת`, `מהווה`, `הינו`, `באפשרותך`).
- [ ] No filler openers (`חשוב לציין`, `בעולם של היום`, `כל אחד מאיתנו`).
- [ ] Emotion is shown through concrete detail, not named.
- [ ] No intensifier padding, exclamation stacks, emoji, or decorative `...`.
- [ ] Buttons are action-nouns; instructions use `אפשר` + infinitive.
- [ ] Errors name the situation without blame and offer the next step.
- [ ] Gender / number agreement holds to the end of every clause (`ההחלטה הזאת ... אישית`; `שלושה ילדים`).
- [ ] Synthesized-book lines quote the person's own material with a specific, non-obvious insight.