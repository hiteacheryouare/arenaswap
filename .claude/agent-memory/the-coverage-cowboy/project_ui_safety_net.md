---
name: project-ui-safety-net
description: The shared UI containment kit in apps/extension/cypress/support/safetyNet (built 2026-11-04) - how to use it, why each rule is shaped the way it is, traps, and the red tests it left
metadata:
  type: project
---

Built 2026-11-04 for Ryan's UI safety-net sweep (orchestrator fixes, Cowboy proves). Report: `temporary/uiSweep/foundation.md`.

**Use it:** `mountInPopup(node, locale)` mounts inside the real `.popup-root > .popup-view-shell.is-opening-view > .popup-container` at 320x560; then `cy.get(popupSurface).assertContained({ exempt, bleeds, scrollers })`. `inEveryLocale(title, locale => ...)` makes one `it` per shipped locale. Content: `worstCaseGames`, `worstTeams`, `worstVenues`, `worstBroadcasts`, `worstUserText`, `slateOf(n)` / `slateSizes` (worstCase.ts); Guide time edges in timeEdges.ts. `assertContained` is registered globally from support/component.ts.

**Rule shapes and why (don't "simplify" these away):**
- Bound for a clipping ancestor is its CONTENT box, not padding box. Padding-box missed the 8e0e95d1d picker-arrow bug (text 11px under a background-image caret) and the popup-margin overhang. Deliberate bleeds (popup header's -0.75rem, detail hero `--gd-inset`) go in `bleeds`.
- Ellipsis only counts as truncation when the element is NOT flex/grid. Pre-fix picker button was flex + text-truncate: ellipsis did nothing, child was hard-clipped.
- overflow-x auto with overflow-y auto is ambiguous (overflow-y:auto alone computes overflow-x auto), so it is a clip unless listed in `scrollers`.
- Cut text must have the full text in a `title` on itself or an ancestor (0394b1557 convention).
- Fonts: loads every face the surface uses with its own text; `document.fonts.check()` lies.
- Cross-frame safe (nodeType, ownerDocument.defaultView) so apps/docs Cypress e2e can import containment.ts.

**Traps:** the `#i18n` stub (cypress/stubs/i18n.ts) gained `setStubLocale`; locales.tsx resets it in a root beforeEach. Components calling `displayLocale()` read the wxtBrowser stub and stay English. New support files need `cypress/support/safetyNet/**` in each component group's turbo inputs (added to all 7), or test:specGroups fails. Cypress run mode disables Vite watching, so editing shared stubs doesn't disturb other agents' running groups.

**Dedupe reds:** one cause = one red test. Per-locale tests assert on the component's own box or exempt the known-red element; a single English test asserts the popup-level promise.

**Teeth recipe:** detached worktree at 8e0e95d1d^ + APFS node_modules clone; old tree is flat `cypress/component/`, so sed the spec's import paths and add `import '../support/safetyNet/containmentCommand'`.

Related: [[project-turbo-test-groups]], [[feedback-coverage-setup]], [[source-edits-ask-first]]
