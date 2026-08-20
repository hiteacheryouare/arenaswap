---
name: review-docs-site-map
description: Review checkpoints for apps/docs + packages/ui — token shadowing, the "compute don't hardcode" rule for PowerScore numbers, hand-maintained font/asset dirs, and where dead code accumulates
metadata:
  type: project
---

Checkpoints for any diff touching `apps/docs` or `packages/ui`. These are the places the shared
design system and the website disagree, and they are not obvious from reading either side alone.

**Why:** `packages/ui` landed in 2.0 as the single source for Bootstrap tokens, fonts and popup
components, but each app still keeps its own copy of the things around it. Every gap found in the
2.0 review was at one of those seams.

**How to apply:**

- **Token shadowing.** `packages/ui/src/tailwind.css` declares `--color-*` in a Tailwind `@theme`
  block; `apps/docs/src/styles/global.scss` re-declares the same custom properties in `:root`.
  `Shell.astro` imports tailwind.css *before* global.scss, so the app's copy wins by source order.
  Verify with `grep -bo '\-\-color-primary:[^;]*' docs/_astro/Shell*.css` — two hits means the
  shared token file is inert. Changing a hex in `packages/ui` alone does not move the website.
- **"Compute, don't hardcode" is the house rule for any PowerScore number on the site.**
  `BrowserHero`, `PopupDemo` and `DetailCharts` all call the real `computePowerScore`, and
  `SettingsBand.astro` imports the real defaults from `@arenaswap/core/constants`. Any component
  that writes a signal ceiling or a score as a literal is drifting by construction — check literals
  against `scoreMaxCloseness/LateGame/Momentum/LeadChanges/Comeback` in
  `packages/powerscore/src/constants.ts` before approving.
- **Fonts are declared once and shipped twice.** `packages/ui/src/_fonts.scss` is the only
  `@font-face` source for both apps, but `apps/docs/public/fonts/` and
  `apps/extension/public/fonts/` are hand-maintained and do not match it in either direction
  (declared-but-absent, and present-but-undeclared). Diff the `as-woff2-face` includes against both
  directories on any font change.
- **Dead code collects in `apps/docs/src/components/` and its SCSS.** Components orphaned by a
  redesign keep typechecking and keep getting edited. Check every `.tsx`/`.astro` under
  `apps/docs/src/components` for an actual import (grep for `components/<Name>'`, not the bare word
  — "PowerScore" matches a dozen unrelated things), and sweep `apps/docs/src/styles/*.scss` class
  selectors against the markup.
- **`.astro` files are not covered by `.gitattributes`**, so the whole website is LF while every
  `.ts/.tsx/.scss` is CRLF. Consistent within the file type — do not report individual `.astro`
  files as EOL slips.

Related: [[reference-review-targets]], [[project-review-false-positives]]
