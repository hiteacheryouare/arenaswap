---
name: project-core-verification-risks
description: Where packages/core hides silent failures — ESPN schema drift reads as an off-season, and the strict/tolerant field split is inconsistent
metadata:
  type: project
---

`packages/core` normalizes ESPN's undocumented API. Its dangerous failures are all *quiet* ones, and they share one root: a drifted league and a league in its off-season look identical upstream.

**Why it matters:** `parseScoreboard` salvages row by row, so a bad event is dropped and counted rather than throwing. But if *every* event in a league drifts, the result is a successful fetch of zero games. `shedLeagues` only names leagues that *refused*, so a fully drifted league is not shed, and the poller reads a successful tick with nothing live as a quiet league and walks it down to dormant — while its games are being played. The only trace is a `logWarn` that fires once per change in the dropped count, and the logger is silent under `NODE_ENV=test`.

**How to apply:** When auditing or extending this layer, check the strict/tolerant split before assuming a field is safe. `espnNumericText` (accepts string *or* number) covers ids, scores, jerseys and possession. Everything else — `period`, `attendance`, `season.type`, `down`, `distance`, `yardLine`, `temperature`, `shootoutScore` — is a bare `z.number()`, and a quoted value there drops the whole game. Two known asymmetries worth fixing if Ryan ever asks: `shootoutScore` is strict while `score` beside it is tolerant, and `/teams` declares `id` as `z.string()` while the scoreboard's competitor `id` accepts both.

Also: `z.optional()` means "may be absent", not "may be null" — a `null` score fails the competitor even though the reader (`parseInt(score ?? '0')`) was written to cope with a missing one.

Related: [[feedback-coverage-setup]]
