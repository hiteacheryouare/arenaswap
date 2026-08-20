---
name: project-platform-floor
description: RESOLVED 2026-08-19 — the manifest floor now matches the APIs the popup uses (Chrome 110 / Firefox 115). Keep checking new ES built-ins against that floor.
metadata:
  type: project
---

**This was a recurring finding across several reviews and it is now FIXED.** As of the 2.0 branch
(`dev`, PR #18), `apps/extension/wxt.config.ts` sets `minimum_chrome_version: '110'` (guarded with
`browser === 'firefox' ? {} : {...}` because AMO's linter rejects the Chrome-only key) and
`browser_specific_settings.gecko.strict_min_version: '115.0'`. The comment above the manifest names
both drivers — `Array.prototype.toSorted` and `browser.storage.session` — and states that
`vite.build.target` down-levels syntax rather than polyfilling built-ins.

Do **not** open this as a finding again. Report it as closed if it comes up.

**What still needs checking on every popup diff:** there is no `core-js`, no `browserslist`, and no
`preset-env` anywhere in the repo, so a new ES built-in still typechecks, lints, builds, and passes
Cypress (current Chrome) while throwing on the declared minimum.
- Safe: `findLastIndex` (Chrome 97 / FF 104), `toSorted` (Chrome 110 / FF 115 — now inside the floor;
  12 call sites in popup code as of PR #18).
- Verify before approving: anything newer than Chrome 110 / Firefox 115. `Object.groupBy` and
  `Array.prototype.with` are Chrome 117+/FF 119+ and would be **outside** the floor. As of PR #18
  there are zero `toReversed`/`toSpliced`/`Object.groupBy`/`Array.prototype.with` call sites.
- Raising the floor is two manifest lines, not a polyfill.

**The `storage.session` quota is the live version of this problem.** Chrome's `storage.session`
QUOTA_BYTES is 1 MB before Chrome 112 and 10 MB from 112 on — and the declared floor is 110. So any
growth in what `background.ts` mirrors into session storage has a real ceiling on Chrome 110-111.
See [[project-extension-runtime-footguns]].
