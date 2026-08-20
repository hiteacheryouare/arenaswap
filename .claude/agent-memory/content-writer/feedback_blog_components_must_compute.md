---
name: feedback_blog_components_must_compute
description: Interactive blog components must run real shipped code on reader-controlled inputs; delete anything that only renders static numbers with CSS
metadata:
  type: feedback
---

The bar for a blog post component: it runs real shipped code (imported from `powerscore`, `@arenaswap/core`, or `@arenaswap/ui`, never reimplemented) on inputs the reader controls, and shows a result the reader could not have predicted from the prose. If the same point survives being written as a sentence, don't build a component for it.

**Why:** Ryan rejected the first draft of the [[project_v2_launch_post]] because 4 of its 5 blog components (`FreezeCompare`, `PostseasonPath`, `StatGrid`, `Callout`) were static text styled with CSS — a hardcoded table of zeros, a styled `<ol>`, a number grid, an aside. Only `SignalBreakdown` actually computed anything. "A picture of a thing isn't a demonstration of it."

**How to apply:** Before building a blog widget, identify the exact real function it will call and confirm it's importable from the docs app (`npx turbo run typecheck --filter=@arenaswap/docs` will catch a bad import fast). If a fact needs no interactivity to land (a stat, a caveat, a numbered list of steps), write it as prose or a markdown table/blockquote instead of wrapping it in a component — MDX's native blockquote already carries the site's orange-accent aside styling (`.blog-prose blockquote`), so a custom `Callout` component wasn't even necessary for that case. Deleted components in this pass: `FreezeCompare.tsx`, `PostseasonPath.tsx`, `StatGrid.tsx`, `Callout.tsx`. Rebuilt `SignalBreakdown.tsx` to call the real `computePowerScore`/`isPlayFrozen` from `powerscore` instead of just clamping user-typed numbers against real ceiling constants. Added `PeriodExplorer.tsx` calling the real `formatPeriod` from `@arenaswap/ui/src/components/gameCardShared`.
