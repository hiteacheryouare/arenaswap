---
name: project-ui-sweep-settings
description: 2026-11-04 settings/onboarding containment sweep: specs, 3 reds, traps (SetupView mounts, shared scratchpad, long runs)
metadata:
  type: project
---

Report: temporary/uiSweep/settings.md. Specs: settings/settingsPagesContainment, settings/settingsSubpagesContainment, onboarding/onboardingContainment; fixture support/safetyNet/settingsFixture.ts.

**Traps:** SetupView/guides/walkthrough render their own `.popup-container` or `.popup-root`, so use `mountPopupView` (nested containers fake a 39px overflow). The scratchpad is shared by parallel Cowboys, so use a private subfolder; other Cowboys overwrite plain names. A foreground Bash call that is killed or times out also kills Cypress: start it with `nohup ... & disown` and poll. macOS sed needs `-i ''`. A no-match echo line appears after an async search, so `cy.get` it before assertContained or the check passes early.

**Reds left:** roster names text-truncate without title (fantasyRosterPage.tsx:89,283); no-match lines echo unbroken queries (teamPickerList.tsx, fantasyRosterPage.tsx:264).

Related: [[project-ui-safety-net]]
