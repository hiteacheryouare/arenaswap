---
name: project-issue228-plain-tour-ptpt-fil
description: 2026-10-21 issue #228 plain-language onboarding/tour rewrite (46 keys) for pt_BR, pt_PT, fil; the verb/term calls for "link a tab", "boost", "win probability"
metadata:
  type: project
---

Strictly plain copy (no analogies) for tabControl/teamPicker/stepPowerScore/stepTabAssign/... Script: temporary/issue228/applyPtFil.py (may be gone).

**"Link a tab" verb:** pt_BR `vincular` (already in linkHint), pt_PT `associar` (matches picker placeholder "Associa um separador"; `ligar` rejected as ambiguous), fil `i-link`. The English tour says link while the picker says Assign, so the mismatch exists in the source too.
**Plain swaps for figurative old wording:** "on a run" -> pt `pontuando/a marcar em sequência`, fil `tuloy-tuloy na nag-i-score`; "changed hands" -> `a liderança mudou`; "catching up" -> `diminuindo a diferença` / `encurtar a diferença` / `nakakahabol`; "boost" kept `impulso` (pt) and `boost` (fil); "star a team" -> pt_BR `Favorite`, pt_PT `Marca ... como favorita`, fil `I-star`.
**pt_PT:** score = `marcador`, TV timeout = `desconto de tempo para a TV`, pulled goalie = `sem guarda-redes`.
**fil:** "counts the most" = `pinakamabigat` (matches existing tooltipSituation); "win probability" and "chance" kept English.
