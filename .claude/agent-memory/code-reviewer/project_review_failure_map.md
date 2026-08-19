---
name: project-review-failure-map
description: Where ArenaSwap bugs actually live — ESPN payload parsing, scorer calibration coupling, and the tooling that already gates style/types
metadata:
  type: project
---

The high-risk seams to review hard in this repo, and what is already covered by tooling.

**Why:** Repeated review passes surface the same three classes; everything else is either linted or
well tested.

**How to apply:**

- **ESPN payload parsing (`packages/core/src/espnSchemas.ts` + `apiClient.ts`) is the top seam.**
  ESPN varies types per sport *and* per endpoint (numbers vs quoted strings) and sends `null` for
  absent objects — the schema file's own `odds: zod.array(...nullable())` is proof the maintainers hit
  it in production. Any zod field that is `.optional()` but not null-tolerant turns a cosmetic ESPN
  quirk into a *dropped event*, because `parseScoreboard` discards the whole row on a failed
  `safeParse`. Always ask: "does this field failing delete a live game?" Verify claims by running the
  schema against a crafted payload with the repo's own zod (`node_modules/zod`) — takes 30 seconds and
  beats guessing.
- **PowerScore calibration is coupled to consumers.** Signal ceilings deliberately sum past
  `scoreMaxTotal` (156 → capped at 100). Anything that rescales the subtotal interacts with
  `sensitivityThresholds`, `standbyStreamThreshold` and the post-hoc boosts, which are all on the
  unscaled point scale. Check monotonicity: turning a signal off, or any renormalization, should not
  silently move scores for games that signal never contributed to.
- **Poll cadence ↔ history window coupling is a known past incident** (count-capped history +
  fast polls hid recent events, so excitement was self-defeating). `packages/powerscore/tests/polling-coupling.test.ts`
  guards it. Any change to history trimming or `historyWindowMs` needs to keep that invariant.
- **Already enforced, so never report it:** oxlint (`npm run lint`), `tsc --noEmit` per package
  (typechecks clean today), jest via @swc/jest. Tabs/CRLF/single quotes come from
  `.agents/CODESTYLE.md` and are not worth a comment.

See [[project-powerscore-reason-strings]].

**`packages/ui` must keep `defaultStrings.ts` complete, because `apps/docs` never provides a translator.**
Shared components call `useT()`, which falls back to `defaultT` = `defaultStrings[key] ?? key`. No `TranslationContext.Provider` exists anywhere under `apps/docs/src`, so the public website renders the *literal key string* for any label missing from `defaultStrings` — including into `aria-label`, where it is invisible to sighted review. The extension is immune (all three `app.tsx` render paths wrap in a Provider), so this class of defect ships to the marketing site silently.
**How to apply:** whenever a `packages/ui` component gains a `t('…')` call, check `defaultStrings.ts` for that key in the same review. Copy en.json's string verbatim so `{named}` placeholders still line up.

**Nothing in CI gates a merge.** `.github/workflows/` holds only a docs build (push to `mega`) and a dependabot auto-merge. `npm test` locally runs 211 Cypress component tests + jest, but that green run is the entire quality signal, and dependabot patch bumps merge with nothing in front of them. Never treat "a test covers it" as "a test gates it" here.

**Synthetic DnD tests give false confidence.** `cypress/component/leagueOrderList.cy.tsx:68-91` tests drag-reorder by firing `dragstart`/`dragover`/`drop` with a hand-built `dataTransfer`, which bypasses native drag initiation entirely. That is how a Firefox-only break shipped past 11 green tests: Firefox will not start a drag unless `dragstart` calls `dataTransfer.setData()`, and `leagueOrderList.tsx` sets only `effectAllowed`. Cypress runs Chrome/Electron, so it can never catch this class. Any browser-API finding needs a real Firefox check.

**The walkthrough bloom overlay covers its own navigation — a product bug, NOT test flake.** On 13d6847 `walkthroughView.cy.tsx` ("step 2 PowerScore sub-steps") failed on **two consecutive isolated runs** with the identical error, so an earlier "failed once, passed once" note was wrong. Root cause: `.ps-bloom-overlay` is `position: absolute; inset: 0; z-index: 100` (`assets/global.scss:514`) and its containing block is the `.popup-container` that also holds the progress dots and the Back/Next row — with `onClick={handleNext}` as its handler. So on signal sub-steps 1-5, ~600ms after arrival (150ms delay + 450ms bloom-in), **Back moves the user forward** and the dots become "advance one" buttons. Neighbouring specs pass only because Cypress clicks faster than the 150ms pre-bloom window, which is what makes the file *look* intermittent. A second independent bug sits in the same component: `advanceTo` derives `nextSubStep` from current `subStep`, so a second tap inside the 400ms shrink re-issues the same target (two taps advance one step). The walkthrough is the shipped first-run tour (`app.tsx:316`), so both are user-facing. Never paper this over with `{ force: true }` — the overlay is something a real user must click through too.