---
name: project-issue228-plain-onboarding-de-fr-it-es
description: 2026-10-21 issue #228 plain-language onboarding/tour rewrite for de/fr/it/es (46 keys); link-verb choice, term map, ohne Torwart call
metadata:
  type: project
---

46 keys (12 new `stepPowerScore.about*`/`signalsSubtitle`) in tabControl/teamPicker/onboarding/step* sections. Helper: temporary/issue228/translate4.py (translations inline, asserts placeholders/arrows, byte-lossless write).

**"Link a tab" verb:** de verknüpfen, fr associer (matches the unchanged tabAssign placeholder), it collegare, es vincular. The unchanged placeholders still say zuweisen/assegna/asigna, so it/es/de copy and picker use different verbs, same as English (Link vs Assign).
**Term map reused from existing sections:** boost = de Boost / fr bonus (+ "coup de boost" for Game Boost) / it boost / es impulso; penalty = Strafe / pénalité / penalità / penalización; cooldown = fr "temps d'attente", it "attesa", es "espera", de "Wartezeit"; win probability = Siegwahrscheinlichkeit / probabilité de victoire / probabilità di vittoria / probabilidad de victoria.
**Calls:** de goalie pulled = "ohne Torwart" (shorter than the tooltip's "vom Eis genommenem Torwart"); de favorite = "favorisieren" (matches starAriaLabel); es blowout = "palizas" (matches signalTiming); fr/it/es tour titles for full screen are "En plein écran"/"A schermo intero"/"En pantalla completa", de "Im Vollbild".
**Length:** short subtitles run 120-135% (de/fr/it/es naturally longer); long bodies mostly 105-118%.
