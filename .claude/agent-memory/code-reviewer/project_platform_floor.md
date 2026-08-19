---
name: project-platform-floor
description: ArenaSwap's declared browser floor is lower than the APIs the popup actually uses — a recurring, still-unfixed finding. Check new ES built-ins against Firefox 115 / Chrome 110.
metadata:
  type: project
---

`apps/extension/wxt.config.ts` declares `browser_specific_settings.gecko.strict_min_version: '109.0'` and **no `minimum_chrome_version` at all**. The shipping code needs higher than that:

- `browser.storage.session` (Firefox 115+) — used since before the 2.0 branch, so the Gecko floor has been wrong for a while.
- `Array.prototype.toSorted` (Chrome/Edge 110+, Firefox 115+) — 12 call sites added in the 2.0 branch, including `mainView.tsx` (the default view) and `app.tsx`. Verified present in the built `chunks/popup-*.js`.

**Why it is not caught:** there is no `core-js`, no `browserslist`, and no `preset-env` anywhere in the repo, and `vite.build.target: 'es2023'` down-levels **syntax only** — it never polyfills missing built-ins. So new built-ins typecheck, lint, build, and pass all Cypress specs (current Chrome) while throwing `TypeError` on the declared minimum. In the popup that means a blank ErrorBoundary on open.

**How to apply:**
- Any new `Array`/`Object` built-in in popup code needs a support check against Chrome 110 / Firefox 115 before approval. `findLastIndex` (Chrome 97 / FF 104) is fine; `toSorted`/`toReversed`/`toSpliced`/`Array.prototype.with`/`Object.groupBy` are not.
- The cheap fix is two manifest lines (`minimum_chrome_version: '110'`, `strict_min_version: '115.0'`), not a polyfill.
- This has been reported in more than one review and remains unfixed — expect to raise it again, and say plainly that it is a standing gap rather than a new discovery.
