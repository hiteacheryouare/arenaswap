---
name: project-ui-sweep-detail
description: Detail-screen UI sweep (2026-11-04) - what exists, the one red, traps for mounting GameDetailView in the safety net
metadata:
  type: project
---

Specs `cypress/component/detail/detail{Containment,PanelsContainment,EdgesContainment}.cy.tsx`, helper `cypress/support/safetyNet/detailView.tsx`. Report `temporary/uiSweep/detail.md`. One red: `.gd-bar-status` ellipsizes a long delay notice without a title.

**Traps:** GameDetailView brings its own `.popup-container`, so mount via `mountDetailView` (not `mountInPopup`). `mock-N` game ids give canned records/series/standings (mock-3 widest record, mock-14 series). Charts are stubbed in component tests (`data-testid=game-detail-chart`), no canvas. Live charts need history within minutes of `Date.now()`. Use whole-number scores (`wholeScore`), `makeScore` fractions overflow. Never `pkill -f "cypress run"`: other Cowboys share the machine.
