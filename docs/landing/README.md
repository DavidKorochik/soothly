# Soothly landing page — design direction (saved for future build)

A **preview / reference**, not shipped code. When we build the real marketing landing page, start here.

- **`landing-preview.html`** — self-contained clickable mockup. Open in a browser (`open docs/landing/landing-preview.html`). Reuses Soothly's real tokens, the botanical-engraving geometry, the paper grain + motes, and the brand mark — all ported verbatim from `app/` so it's of-a-piece with what's built.
- **`preview-desktop.png` / `preview-mobile.png`** — rendered visuals for instant recall.
- **`shoot.mjs`** — re-render the PNGs: `node docs/landing/shoot.mjs`.

## The decision

Chosen base design language: the **Claude (Anthropic) `DESIGN.md`** from [`voltagent/awesome-design-md`](https://github.com/voltagent/awesome-design-md) (`design-md/claude/DESIGN.md`). It won a 12-candidate review scored against Soothly's brand (2026-06-24):

| Rank | Design | Fit /10 |
|---|---|---|
| **1** | **Claude (Anthropic)** | **8.5** |
| 2 | Mastercard | 6 |
| 3 | Starbucks | 5 |
| 4 | Notion / Apple / Airbnb | 4 |
| ↓ | WIRED, Stripe, Mintlify, Runway, Ferrari, Sanity | 3.5–2 |

**Why Claude:** it's the only one of the 73 whose *soul* matches Soothly, not just its spacing — warm cream canvas + serif-display-at-weight-400 over humanist-sans-for-UI + color-block / shadow-rare elevation. Its palette maps almost 1:1 onto our tokens, and its serif-led type rule mirrors Frank Ruhl + David Libre + Heebo. (Catalog blurbs mislead — Notion's real spec is navy+purple Inter *sans*, not "warm serif." Always read the actual `DESIGN.md`.)

### Palette mapping (Claude → Soothly, verified against `app/globals.css`)
| Claude | → Soothly |
|---|---|
| `canvas #faf9f5` | `paper #f7f3ec` |
| `ink #141413` (warm, never jet) | `ink #1b1a17` |
| `hairline #e6dfd8` | `rule #e2d9c8` |
| coral `#cc785c` | `brand #c2674b` |
| accent-teal `#5db8a6` | `sage #9aa888` |
| feature-card `#efe9de` (one notch darker than canvas) | `--surface-card #efe9de` (added) |

### What to borrow from the runners-up
- **Mastercard** — "whitespace as structure": 300–500px breathing voids; ghost-headline-over-empty-cream for the trust beat.
- **Starbucks** — gold reserved *only* for ceremony, never a general-purpose color (keeps our `gold` precious); never pure white (cream temperature is load-bearing).
- **Airbnb** — inverted priority: the single loudest type moment is the **privacy promise**, not the hero.
- **Apple** — exactly one soft drop-shadow in the system, reserved for the sample-book render; surface-color change *is* the section divider (no chrome).
- **WIRED** — the serif-display / serif-body / sans-labels three-role ladder (maps to David / Frank / Heebo); bylined story-row as the how-it-works "contents page."

## Section structure (as built in the preview)
1. **Hero** — David Libre 700 ceremonial headline (right), keepsake book cover with the lone soft shadow (left), `brand` CTA + `gold` text link.
2. **How it works** — three flat `surface-card` cards, hairline borders, serif numerals: מספרים → מקשיבים → מקבלים ספר.
3. **Sample spread** — a real RTL two-page chapter spread (Frank Ruhl **900** title, justified body, engraving) under the one deep-shadow showcase.
4. **Gift** — the single `sage`-tinted band (color change = divider), "מתנה שנשארת" in David Libre.
5. **Privacy** — the page's typographic peak: "הסיפורים שלך נשארים שלך" in big David Libre, gold rails, near-empty paper.
6. **Close + footer** — quiet cream CTA, no dark footer; gold-line rule, wordmark right / links left.

## RTL / Hebrew rules (the load-bearing work)
- **Delete, don't adapt:** every uppercase token, all negative letter-spacing, badge/"NEW" pills. These are the *only* RTL-fragile pieces in the Claude base; removing them makes the rest mirror cleanly.
- Hierarchy via serif **size + weight**, never tracking or caps (Hebrew has no uppercase).
- David Libre 700 used **twice on the whole page** (hero + privacy), never on every heading.
- One continuous cream world — no dark band. Light wash enters from the right (`--wash-x: 88%`); spine on the right edge; spread reads right-page-first.
- Static copy stays gender-neutral (infinitives / `אפשר` / nominal phrases); plain hyphen `-` only, never em/en dash.
- Motion: one `soothly-rise` reveal per section + `scale(0.96)` press; honor `prefers-reduced-motion`.

## When building for real
Reuse `app/components/PaperField` and `BotanicalSprig` directly rather than the ported copies in the HTML. Optionally generate `docs/soothly_landing_DESIGN.md` (Stitch format, Claude-adapted, RTL-corrected) so any design agent can extend it consistently.
