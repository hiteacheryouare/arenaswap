---
name: project-docs-site-metrics
description: Line coverage is a weak signal for apps/docs (a static Astro site); the metrics that actually mean something there
metadata:
  type: project
---

`apps/docs` is 358 static HTML pages plus six React islands. Only the islands and two `.astro`
inline scripts ever execute in a browser, so an istanbul line-coverage number describes a few
hundred lines out of a workspace whose real product is markup.

**Why:** measured 2026-09-21, the instrumented client bundle was 494 lines total. Everything in
`src/i18n/ui.ts`, `src/lib/`, the layouts and every `.astro` frontmatter runs at build time and
reaches no browser. Components rendered without a `client:` directive (`NotFoundCard`,
`ScreenshotCard`) never appear in the report at all, even though they are on live pages.

**How to apply:** report line coverage as context, never as the headline. The metrics that tell you
whether this site works are: pages reachable, locales at page parity (12 locales × the same tree),
internal links resolving, sitemap membership, `<html lang>` correctness, islands hydrating, and no
raw dotted translation key rendered as visible text. `cypress/siteCrawl.ts` computes all of those
over the built output in under a second; `cypress/e2e/siteIntegrity.cy.ts` asserts on them.

Related: [[project-docs-coverage-harness]], [[project-livepowerscores-duplicated-helpers]]
