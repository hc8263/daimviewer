# Wanted Design System

A recreation of **Wanted Lab's** open-source design system, sourced from the official Figma Community file "Wanted Design System". Wanted (원티드) is South Korea's leading career/jobs platform, run by Wanted Lab Inc. (원티드랩). This system powers a family of products that share a single visual language:

- **Wanted** — the flagship jobs / career marketplace (web + mobile)
- **Wanted Gigs** — freelance and contract work
- **Wanted Space** — workplace / coworking
- **Wanted OneID** — unified sign-on across products
- **Wanted Agent** — AI agent for candidates and recruiters
- **LaaS** — Recruiter-as-a-Service B2B product

The system is bilingual-first (Korean + English, with Japanese also supported through the typeface), highly token-driven, and built around **atomic → semantic** color layering, an 18-step type scale, and a tightly specified iconography set.

## Sources

- **Figma**: "Wanted Design System (Community)" — mounted as a virtual FS during construction.
  Public file: https://www.figma.com/community/file/1281625149147336651
- **License**: CC BY 4.0 (per the Figma file's "In conclusion" page)
- **Korean source-of-truth strings** appear throughout (e.g. `텍스트`, `목차`, `타이포그래피`). When recreating UIs, use the Korean strings shown in the kit; English shows up secondarily.

## Index

- `README.md` — this file. Brand overview, content rules, visual foundations, iconography.
- `SKILL.md` — agent-skill manifest for using this folder as a Claude Skill.
- `colors_and_type.css` — every CSS variable: atomic palette, semantic tokens, type styles, radii, shadows.
- `fonts/` — `fonts.css` loading Pretendard via CDN (the official Wanted typeface).
- `assets/logos/` — `wanted-symbol.svg` (mark only), `wanted-logotype.svg` (wordmark only), `wanted-horizontal.svg` (composed lockup).
- `preview/` — small HTML cards that populate the Design System tab.
- `ui_kits/wanted-web/` — high-fidelity recreation of the Wanted desktop web product (homepage, job listing, job detail, profile dropdown, etc.) as a clickable React-on-Babel prototype.

## Content fundamentals

**Language.** Korean is the primary voice, English secondary, Japanese tertiary. Body copy is short, declarative, and information-dense — typical job-board energy, never marketing fluff. Headings and section titles in Korean tend to be 1–4 characters (`목차`, `색`, `글꼴`, `스타일`). English titles use Title Case ("Color - Palette", "Looking Forward", "Before Use", "In conclusion").

**Tone.** Calm, informational, slightly formal. The Figma file itself models the tone — descriptions like:

> 일관된 브랜드 아이덴티티와 시각적 스타일을 유지하기 위해 정의된 색상 모음입니다.
> ("A set of colors defined to maintain a consistent brand identity and visual style.")

> 다양한 상황에서 일관된 목소리로 손쉽게 텍스트를 표시할 수 있습니다.
> ("Easily display text with a consistent voice across various contexts.")

Notice: no exclamation marks, no rhetorical questions, no "we" cheerleading. Verbs are explanatory (`정의된`, `안내합니다`, `사용합니다`). When addressing the reader (Korean), it uses polite -습니다/-니다 endings.

**Casing.** English headings and product names use Title Case ("Wanted Space", "Body 1/Normal", "Cool Neutral"). Tokens are kebab-cased with dot-style namespacing: `color-semantic-primary-normal`, `color-atomic-blue-50`, `color-semantic-background-normal-normal`. Component variants use `Variant=Solid, Color=Primary, Size=Large` Figma-style.

**I vs. you.** Almost never personal. The voice is **the platform speaking to the user**, e.g. `비밀번호가 일치하지 않습니다` ("Passwords do not match"), `최초 1회 적립` ("Earned once"), `완료` ("Done"). No "you", no "we" — just facts about state.

**Emoji.** Not used. Zero. The only graphic furniture is icons (line-drawn, 20–24px) and product symbol marks.

**Numbers & units.** Korean job posts use lots of small numeric metadata: `100P` (points), `2일권` (2-day pass), `2월 13일(화) – 4월 15일(수)` (date ranges), `7년+`. These appear as small, semibold labels rather than display numbers.

**Examples of in-product copy** (lifted from the kit):

- Button labels: `텍스트` (placeholder), `완료` (Done), `다중 선택 버튼 추가` (Add multi-select), `셀렉트 박스 추가` (Add select box)
- Error: `비밀번호가 일치하지 않습니다` (Passwords don't match)
- Status: `최초 1회 적립` (Earn once), `일 1회 적립` (Earn daily)
- Section headers (English): "Looking Forward", "Scope", "Before Use", "Table of Contents", "Feedback", "In conclusion"

## Visual foundations

**Color philosophy.** Two-layer token system:
1. **Atomic** — 13 named color rails (Common, Neutral, Cool Neutral, Blue, Red, Green, Orange, Red Orange, Lime, Cyan, Light Blue, Violet, Purple, Pink) plus a 14-step opacity scale.
2. **Semantic** — purpose-named tokens (`primary-normal`, `label-strong`, `background-normal-normal`, `line-normal-neutral`, `status-positive`) that map to atomic values. Every semantic comes in Light and Dark variants.

The default UI sits on **white** (#FFFFFF) with **cool-neutral** greys for text and dividers. The brand accent is a single, saturated **blue `#0066FF`** (`color-atomic-blue-50`). It is used sparingly — primary CTAs, highlighted links, focused states. Reds are reserved for error/negative; green for positive/success. The accent palette is wide (every spectrum hue has a full 50-step ramp) but in production you see mostly white + cool-neutrals + blue + occasional red/green.

**Type.** Single typeface: **Pretendard JP** (a multi-script Pretendard that covers Hangul, Latin, Japanese kana/kanji). One alternate, **Wanted Sans**, is used very sparingly for huge display moments (3 occurrences in the whole file). Eighteen-style scale across seven hierarchical tiers (Display, Title, Heading, Headline, Body, Label, Caption). Weights in use: 500 (Medium), 600 (SemiBold), 700 (Bold). 400/Regular shows up in body and reading variants.

**Spacing & rhythm.** Strong preference for `64`, `48`, `32`, `24`, `16`, `8`, `4` px steps. Section containers commonly use `64px` padding, `32px` border-radius for outer cards, `16–24px` for inner cards. Component-level radii: `12px` (buttons, inputs), `16px` (chips, badges), `8px` (small chips), `4px` (tags), full-pill for status badges.

**Backgrounds.** Predominantly **flat white** or `#F7F7F8` (cool-neutral-99) elevated surfaces. **No gradients, no textures, no full-bleed photography in chrome.** Imagery, when it appears, is product photography in cards with rounded corners — neutral, warm-but-natural color treatment. The brand mark itself is monochrome.

**Animation.** Not directly specified in the Figma binary. Inferred from the product: subtle, fast (150–250ms), standard ease-in-out. No bounces, no parallax. Loading states use a small circular spinner (`AnimateFalse2`/`AnimateTrue2` components).

**States.**
- **Hover** — adds a low-opacity overlay (`color-atomic-coolNeutral-50` at 5–8% opacity) on top of the base fill rather than swapping colors.
- **Press** — same overlay at slightly higher opacity (~16%).
- **Focus** — outline using `color-semantic-primary-normal` (the blue).
- **Disabled** — uses `color-semantic-interaction-disable` (`coolNeutral-96/97/98` backgrounds with `coolNeutral-50` text @ 16% opacity).
- **Inactive** — neutral fill with grey text.

**Borders.** Hairlines use `rgba(112,115,124,0.22)` — a translucent cool-neutral. Strong dividers use solid black at full opacity. The system prefers translucent borders over opaque ones so they sit nicely on any background.

**Shadow system.** Four-level elevation:

| Level | Use |
|---|---|
| `shadow-emphasize` | 0px 4px 6px -1px rgba(23,23,23,0.06), 0px 2px 4px -2px rgba(23,23,23,0.06) — small floating buttons |
| `shadow-strong` | 0px 10px 15px -3px rgba(23,23,23,0.07), 0px 4px 6px -2px rgba(0,0,0,0.07) — cards, popovers |
| `shadow-heavy` | 0px 16px 24px -6px rgba(23,23,23,0.08), 0px 6px 10px -4px rgba(23,23,23,0.08) — modals |
| `shadow-modal` | 0px 24px 38px -10px rgba(23,23,23,0.12), 0px 10px 15px -5px rgba(23,23,23,0.1) — full-screen overlays |

The shadows are layered (two each), use `rgba(23,23,23,*)` rather than pure black, and have negative spread to keep the bottom edge sharper than the top. There is no inner-shadow system documented.

**Protection gradients.** Not used in the chrome. Instead, the system uses solid colors and the four-step shadow elevation.

**Transparency & blur.** Translucent overlays are common via opacity scales (`opacity-05` through `opacity-100`). True backdrop-blur is not in the token spec; modal backdrops are solid `coolNeutral-50` at opacity 16–28%.

**Layout rules.** Fixed-element-friendly: top nav is sticky, search bar can be sticky on listing pages, FABs not used. Grid is 12-column on desktop, 4-column on mobile. Page max width ~1200–1280px; gutter ~24–32px.

**Imagery vibe.** Where photography appears (Korean job-board UI typical), it's office/lifestyle, warm-neutral, lightly desaturated, not stylized. No filters, no duotones.

**Corner radii.** Big-to-small: `32` (outer cards) → `24` (medium cards) → `16` (chips, small cards) → `12` (buttons, inputs) → `8` (small chips, tags) → `4` (smallest tags) → `full` (status pills, avatars).

**What cards look like.** White background, `16` or `24` border-radius, the translucent `rgba(112,115,124,0.22)` hairline border *or* a level-2 shadow (never both), `24px` internal padding, dense content. They do not use coloured left-border accents or large illustrations.

## Iconography

**Approach.** Custom 24×24 icon set named `wanted-icons` (visible in the Figma "Icon" page and as `NameLocationFillFalse`, `NamePinFillFalse`, `NameTicketFillFalse`, `NameSquareCheck`, `NameChevronRightTightSmall`, etc.). Two stroke variants: **standard** (1.5px) and **thick** (2px). Two fill variants: **outline** (`FillFalse`) and **filled** (`FillTrue`). Two density variants: **regular** and **tight** (smaller padding inside the 24px frame). Sizes used in product: **24px** (default), **20px** (inside buttons), **16px** (label rows).

**Format.** SVGs only — no icon font, no PNG icons in the binary. The icons live as Figma symbols and are referenced thousands of times across the file (the chevron alone has 85+ instances). In production, Wanted ships them via a React package (`@vanilla-extract`-style import); in this design system, each icon would be a separate `assets/icons/<name>.svg`.

**Emoji.** Never used.

**Unicode-as-icon.** Never used.

**Bundled here.** Because the source SVGs were not directly extractable into this skill, this folder substitutes **Lucide** (`https://unpkg.com/lucide-static@latest/icons/`) — Lucide's stroke weight (1.5px), 24×24 frame, and rounded line-caps are the closest open-source match to Wanted's house style. **Flagged for the user**: please drop the real `wanted-icons` SVGs into `assets/icons/` to replace the Lucide fallbacks if production fidelity matters.

## Caveats / things to flag

- **Fonts**: Pretendard JP exists on jsDelivr / NPM but is not on Google Fonts. The CSS pulls it from the official Pretendard JP CDN.
- **Icons**: substituted with Lucide. See above.
- **Imagery**: no licensed product photography included. The UI kit uses generic Unsplash-style placeholders with `image-slot` so the user can drop their own.
- The semantic-color token names are extensive (≈80 tokens). The CSS file ships the ~30 most-used; expand as needed.
