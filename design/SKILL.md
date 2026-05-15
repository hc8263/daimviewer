---
name: wanted-design
description: Use this skill to generate well-branded interfaces and assets for Wanted (원티드), the Korean career platform by Wanted Lab, either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files (`colors_and_type.css`, `fonts/`, `assets/logos/`, `preview/`, `ui_kits/wanted-web/`).

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out of this skill folder into your project and create static HTML files for the user to view. Reference `colors_and_type.css` for design tokens and `fonts/fonts.css` for the Pretendard typeface. The `ui_kits/wanted-web/` folder contains JSX components you can lift or reference.

If working on production code, you can copy assets and read the rules in `README.md` (CONTENT FUNDAMENTALS, VISUAL FOUNDATIONS, ICONOGRAPHY sections) to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions about audience/format/length, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference

- **Brand color**: `#0066FF` (atomic-blue-50)
- **Typeface**: Pretendard JP (covers Hangul, Latin, CJK). Weights 400–900 available. Don't substitute.
- **Default text color**: `rgba(46,47,51,0.88)` — never pure black for body copy.
- **Default border**: `rgba(112,115,124,0.22)` — translucent hairlines, never opaque grey.
- **Default radius**: 12px (buttons/inputs), 16px (chips/small cards), 24px (medium cards), 32px (page sections).
- **Default shadow on cards**: `var(--shadow-strong)` — `0 10px 15px -3px rgba(23,23,23,0.07), 0 4px 6px -2px rgba(0,0,0,0.07)`. Do not use both shadow and border.
- **Korean tone**: short, declarative, no exclamation marks, no emoji, polite -습니다 endings. English: Title Case, factual.
- **Icons**: Custom Wanted icon set (1.5px stroke, 24×24, outline + filled variants). Substituted here with Lucide; if production fidelity matters, replace icons in `assets/icons/`.
