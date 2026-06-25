---
version: alpha
name: Recall
description: A terminal-feel RAG chatbot for Sethy's notes — green primary, Geist type, mono details, and pixel-letter emphasis composed on top of Nuxt UI's zinc neutral surface.
colors:
  primary: "#44A841"
  primarySoft: "#69C266"
  primaryDeep: "#2B6C29"
  ink: "#1A1C1E"
  inkMuted: "#52525B"
  inkDim: "#9CA3AF"
  surface: "#FFFFFF"
  surfaceMuted: "#F4F4F5"
  surfaceRing: "#E4E4E7"
typography:
  body-md:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body-lg:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.7
  h1:
    fontFamily: Geist
    fontSize: 4rem
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  h2:
    fontFamily: Geist
    fontSize: 3rem
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  eyebrow:
    fontFamily: Geist Mono
    fontSize: 0.75rem
    fontWeight: 500
    letterSpacing: "0.08em"
    textTransform: uppercase
  mono-sm:
    fontFamily: Geist Mono
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.6
  pixel-accent:
    fontFamily: Geist Pixel
    fontSize: 1em
    fontWeight: 500
rounded:
  pill: 9999px
  card: 12px
  input: 8px
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  "2xl": 16px
  "3xl": 24px
spacing:
  section-y: 80px
  container-gap: 56px
  card-pad: 24px
  eyebrow-pad-x: 12px
  eyebrow-pad-y: 4px
elevation:
  card: "0 1px 0 0 rgba(24,24,27,0.04)"
  card-ring: "1px solid #E4E4E7"
shapes:
  pill: rounded.pill
  card: rounded.card
  input: rounded.input
components:
  eyebrow-pill:
    backgroundColor: "{colors.surfaceMuted}"
    textColor: "{colors.inkMuted}"
    rounded: "{rounded.pill}"
    padding: "{spacing.eyebrow-pad-y} {spacing.eyebrow-pad-x}"
  eyebrow-pill-on-elevated:
    backgroundColor: "#FAFAFA"
    textColor: "{colors.inkMuted}"
    rounded: "{rounded.pill}"
    padding: "{spacing.eyebrow-pad-y} {spacing.eyebrow-pad-x}"
  card-surface:
    backgroundColor: "{colors.surfaceMuted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  card-ring:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  terminal-frame:
    backgroundColor: "{colors.surfaceMuted}"
    textColor: "{colors.inkMuted}"
    rounded: "{rounded.card}"
  terminal-traffic-light:
    backgroundColor: "{colors.primarySoft}"
    size: 10px
    rounded: "{rounded.pill}"
  source-chip:
    backgroundColor: "#FAFAFA"
    textColor: "{colors.inkMuted}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  answer-block:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  card-divider:
    backgroundColor: "{colors.surfaceRing}"
    height: "1px"
    width: "100%"
  muted-hint:
    backgroundColor: "transparent"
    textColor: "{colors.inkDim}"
    typography: "{typography.body-md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.input}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primaryDeep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.input}"
    padding: "10px 16px"
  button-primary-focus:
    backgroundColor: "{colors.primaryDeep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.input}"
    padding: "10px 16px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "10px 16px"
  pixel-accent-word:
    textColor: "{colors.primary}"
    typography: "{typography.pixel-accent}"
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
---

## Overview

Recall is the public surface for Sethy's personal RAG chatbot. The visual
language borrows from developer tooling — mono eyebrows, terminal-style mock
frames, "live" pulsing dots — but stays readable as a marketing page. A single
green accent drives every interactive cue; everything else is Nuxt UI's
default zinc neutral surface, so light and dark mode flip automatically.

The tone is "boring tools, deliberately." Type stays in Geist (sans + mono)
with `Geist Pixel` reserved for one or two accent words per heading — never
whole sentences, never body copy.

### How this spec maps to Nuxt UI

Recall composes on top of `@nuxt/ui`, so most styling happens through Nuxt
UI's semantic utility classes rather than the tokens in this file directly.
An agent generating markup should reach for these classes first and only fall
back to raw tokens when the spec is explicit.

- **Text ramp** — `text-dimmed` → `text-muted` → `text-toned` →
  `text-default` → `text-highlighted` (+ `text-inverted`). Home-page roles:
  meta info (`dimmed`), paragraph copy (`muted`), eyebrows + chips + status
  lines (`toned`), answer prose (`default`), headlines and prompts
  (`highlighted`).
- **Background ramp** — `bg-default` → `bg-muted` → `bg-elevated` →
  `bg-accented` (+ `bg-inverted`). Page uses `bg-default` for the answer
  block, `bg-muted` for cards and the terminal chrome, `bg-elevated` for
  chips and pills that float over cards.
- **Border / ring** — `border-default` / `ring-default` resolves to
  `--ui-border` (~zinc-200 light / zinc-800 dark). Use `ring-1
ring-default` on cards; reserve `border-default` for table-like rows
  or dividers (e.g. the answer block's `divide-y divide-default`).
- **Brand color** — `text-primary`, `bg-primary`, `ring-primary`,
  `border-primary` all derive from `--ui-primary`, which is
  `--ui-color-primary-500` in light mode and `--ui-color-primary-400` in
  dark mode. With the project's green scale this resolves to `#44A841`
  light / `#69C266` dark. Use opacity utilities (`bg-primary/30`,
  `bg-primary/50`, `bg-primary/80`) for the traffic-light decoration in
  the terminal mock — never hand-write rgba.
- **Container** — `UContainer` is bound to `--ui-container` (default `80rem`,
  equal to `max-w-7xl`). Don't introduce a wider custom container; every
  section already centers around `max-w-2xl` for prose and `UContainer`
  for the outer wrapper.
- **Focus** — Every interactive Nuxt UI component carries a `focus-visible`
  outline tinted with its `color` prop. Primary buttons
  (`UButton color="primary"`) get `outline-primary/25`; neutral outline
  buttons get `outline-inverted/25`. Custom focusable surfaces should
  mirror that pattern, not paint a raw green ring.

Radius utilities and the typography utilities are documented under their
own sections below.

## Colors

The home page's neutrals come from Nuxt UI's zinc scale; the values below
are the **light-mode approximations** of those semantic tokens. The source
of truth is `--ui-text-*`, `--ui-bg-*`, and `--ui-border`.

- **Primary `#44A841` (Leaf 500):** the only saturated hue on the page. Used
  for the brand mark, the pulsing "RAG chatbot" dot, chevron icons in mock
  frames, and pixel-letter accent words. Tinted lighter in dark mode
  (`primary-400: #69C266`).
- **Primary Deep `#2B6C29` (Leaf 700):** hover and pressed states for primary
  buttons, and the deep end of the `bg-primary/30 → /50 → /80` traffic-light
  row in the terminal mock.
- **Ink `#1A1C1E` ≈ `text-highlighted`:** headlines, question prompts, and
  the user-facing body of an answer.
- **Ink Muted `#52525B` ≈ `text-toned`:** eyebrow labels, source filenames,
  footer, and the assistant's running commentary. Uses zinc-600 for AA
  contrast (7.0:1) on `bg-muted`.
- **Ink Dim `#9CA3AF` ≈ `text-dimmed` / `text-muted`:** long-form paragraph
  copy and lower-priority hints.
- **Surface `#FFFFFF` ≈ `bg-default` / Surface Muted `#F4F4F5` ≈
  `bg-muted`:** the terminal mock and step cards live on muted; answers
  render on default for contrast.
- **Surface Ring `#E4E4E7` ≈ `ring-default`:** A 1px ring + tiny inset
  shadow gives cards a hairline definition without resorting to heavier
  borders.

In dark mode every neutral flips via the `--ui-text-*` / `--ui-bg-*`
variables; the green stays the green (just one shade lighter).

**Accessibility note.** `#44A841` itself does not meet WCAG AA (4.5:1)
against white at body sizes — its contrast ratio is ~3.0:1. The home page
respects this by using primary only as: a 6px dot, a Lucide icon glyph,
or a pixel-letter accent word. When you need a solid green CTA, step down
to `primaryDeep` (`#2B6C29`, 6.4:1) for the background and keep the label
white.

## Typography

Three faces, three jobs. All three are wired in `nuxt.config.ts` under
`fonts.families` and exposed as Tailwind utilities `font-sans`, `font-mono`,
and `font-pixel`.

- **Geist Sans (`font-sans`)** — body, headings, buttons. Body sits at
  `1rem` / `1.6` for paragraphs and `1.125rem` / `1.7` for the hero lede.
- **Geist Mono (`font-mono`)** — eyebrows, terminal mock lines, source
  chips, the logo mark, and the footer caption. Always uppercase with
  `0.08em` tracking for labels; sentence case for terminal output.
- **Geist Pixel (`font-pixel`)** — exactly one or two words per H1/H2
  ("Recall", "fully visible", "deliberately"). Inline only, never
  standalone, never in body copy. Apply with `font-pixel` on a `<span>`,
  not by setting the whole heading to pixel — that breaks the H1's
  readability.

Headlines use `tracking-[-0.02em]` and a tight `1.05` line-height so the
big H1s (up to `4.5rem`) read as a single block. Paragraphs default to a
relaxed `1.6–1.7` for legibility. `UButton` and `UBadge` labels inherit
sans at body weight; don't override the font family on button children.

## Layout & Spacing

A single max-width container (`UContainer`, ~`max-w-7xl`) wraps four stacked
sections separated by `py-20` of vertical rhythm. Hero is a two-column
grid (`lg:grid-cols-2 gap-14 lg:gap-20`); the rest are single-column with a
`max-w-2xl` intro block followed by a content row.

- **Section gap:** 80px (`space-y-20`) between major blocks.
- **Container gap:** 56–80px (`gap-14 lg:gap-20`) inside the hero.
- **Card padding:** 24px (`p-6`) on step cards; the answer block uses
  `py-4 px-5` so prose stays inside the ring.
- **Eyebrow pill:** `px-3 py-1` (12px × 4px) — small enough to read as a
  label, large enough to feel deliberate.

Cards never exceed three per row. Source chips wrap with `flex-wrap
gap-2` and a single `+` glyph separates the "Built with" stack list.

## Elevation & Depth

Depth is implied, not painted. Cards combine a 1px `ring-1 ring-default`
border with a sub-pixel shadow (`0 1px 0 0 rgba(24,24,27,0.04)`) — enough
to lift them off the background without dark-mode artifacts. There are no
drop shadows, no gradients, no glows. The terminal mock uses two stacked
backgrounds (`bg-muted` for the chrome, `bg-default` for the body) to
create depth instead of a shadow.

Focus rings substitute for elevation on interactive surfaces: a primary
button gets `outline outline-primary/25` on `focus-visible`, an outline
button gets `outline outline-inverted/25`. Never paint focus with raw
green — it conflicts with the brand swatch.

## Shapes

The radius scale is governed by `--ui-radius` (Nuxt UI overrides Tailwind's
`rounded-*` with this single base). Always reach for `rounded-*` utilities
so the system can be retuned globally by editing one variable. At the
project default of `0.25rem` (4px):

| Utility        | Multiplier | px   |
| -------------- | ---------- | ---- |
| `rounded-xs`   | ×0.5       | 2    |
| `rounded-sm`   | ×1         | 4    |
| `rounded-md`   | ×1.5       | 6    |
| `rounded-lg`   | ×2         | 8    |
| `rounded-xl`   | ×3         | 12   |
| `rounded-2xl`  | ×4         | 16   |
| `rounded-3xl`  | ×6         | 24   |
| `rounded-full` | —          | 9999 |

- **`rounded-xl` (12px)** — every card: step cards, terminal mock, answer
  block, "Built with" badge group.
- **`rounded-lg` (8px)** — every button (UButton's default at this base).
- **`rounded-full`** — every label: eyebrows, source chips, nav badges,
  pulsing status dots. Always true-circle, never derived from
  `--ui-radius`.

Avoid `rounded-2xl` and `rounded-3xl` on cards — they break the rhythm
against 8px buttons. Icons inside circular slots (the pulsing dot,
traffic-light row) use `size-1.5` / `size-2.5` — fractional sizes, never
exact integers, to keep the rhythm.

## Components

- **Eyebrow pill:** `bg-elevated` + `text-toned`, mono uppercase, optional
  leading icon in `text-primary`. Used on every section header and on the
  error page. The hero variant (`eyebrow-pill`) sits on the default surface;
  the on-card variant (`eyebrow-pill-on-elevated`) sits one shade lighter
  than its container.
- **Card surface:** `bg-muted` + `ring-1 ring-default`, used for step cards
  and the terminal frame header. Padding `p-6`, radius `rounded-xl`.
- **Card ring:** `bg-default` + `ring ring-default`, used for the answer
  block so prose reads against pure white while still feeling framed.
  Internal rows split with `divide-y divide-default`.
- **Terminal frame:** a three-row composite — `bg-muted` chrome with three
  traffic-light dots (`bg-primary/30 → /50 → /80`), `bg-default` body for
  the mock chat, `bg-muted` footer with a status line. Always mono, always
  sentence case.
- **Source chip:** `bg-elevated` + `ring-1 ring-default` + `text-toned`
  mono, prefixed by an `arrow-up-right` icon in `text-primary`. Lists
  inside an answer, never standalone.
- **Answer block:** `bg-default` + `ring ring-default` + `divide-y
divide-default`. Question row on the muted surface, answer row on
  default, source-chip row at the bottom.
- **Button primary:** `UButton` with default `color="primary"` (solid
  green, white label). Hover deepens to `bg-primary-deep` (Leaf 700).
  Focus uses `outline-primary/25`. Lead with a Lucide icon at the
  `leading` slot.
- **Button outline:** `UButton color="neutral" variant="outline"` for
  secondary actions ("How it works"). Same `outline-inverted/25` focus
  rule.
- **Pixel accent word:** inline `<span>` swapping `font-pixel` + green
  for one word inside an otherwise sans-serif headline. Always inside the
  H1 or H2 — never inside a paragraph, badge, or button label.
- **Nav link:** `UNavigationMenu` with default `color="primary"` for the
  active item, neutral for the rest. The right-hand sign-in button uses
  `variant="ghost"`.

## Do's and Don'ts

**Do**

- Reach for Nuxt UI semantic utilities (`text-toned`, `bg-elevated`,
  `ring-default`) before writing raw colors. The token layer is the
  fallback, not the default.
- Keep one green accent per viewport. If a heading already uses a pixel
  accent word, the buttons next to it should be neutral.
- Use `font-mono` for any label the user reads as a _category_ (eyebrow,
  source, status line, footer). Reserve sans for prose.
- Pair every section header with an eyebrow pill — even short ones.
- Let the terminal mock carry all of the "developer" flavor. Real copy
  stays in clean sans.
- Wrap source chips with `flex-wrap gap-2` so the list collapses on mobile
  instead of overflowing.

**Don't**

- Don't introduce a second saturated hue. If something feels like it
  wants red/blue/amber, use `text-toned` instead.
- Don't override `--ui-radius` to retune a single card — pick a different
  `rounded-*` utility. The base variable is a global commitment.
- Don't use Geist Pixel outside of heading accents — it's a display face
  and loses readability past two words.
- Don't paint cards with shadows. The hairline ring + 1px inset shadow
  is the entire depth language.
- Don't use `rounded-2xl` or larger on cards. The page lives at `rounded-xl`;
  growing it breaks the rhythm against `rounded-lg` buttons.
- Don't put accent text on a colored button — the contrast budget is
  already spent on the white label.
- Don't write a custom focus ring. Nuxt UI components already emit
  `outline-<color>/25` on `focus-visible`; custom surfaces should mirror
  the same pattern.
