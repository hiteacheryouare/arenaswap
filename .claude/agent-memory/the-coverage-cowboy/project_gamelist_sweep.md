---
name: project-gamelist-sweep
description: gameList group UI safety-net sweep 2026-11-04 - what is covered, two reds, and harness traps (random stubbing, mainView stubs)
metadata:
  type: project
---

Report: `temporary/uiSweep/gameList.md`. Specs: `listContainment`, `listPiecesContainment`, `listCardsContainment`, `ludicrousContainment` in `cypress/component/gameList/`. Kit gained `mountPopupView` (no inner `.popup-container`, for views that render their own).

Reds: suggest view tab label cut with no `title`; ludicrous speed sign "LICHTGESCHWINDIGKEIT" (de) runs 5px past the popup (nowrap sign).

Traps: mainView specs stub `./gameCard`, `./popupFooter`, `./proTip`, `./emptyGameState`, `./reviewPromptBanner`, `./ludicrousSpeedOverlay` by specifier, so the real ones are imported by a path that does not match the stub. Math.random-picked lines (no-games, tips): override Math.random, and restore only after the picked element is on the page, because React renders after the mount command returns. Pro tips read i18n at module load, so they are English-only. Grouped card lists must be sorted by league or React warns about duplicate keys.
