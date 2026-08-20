---
name: terminology-it
description: Approved Italian (it.json) terminology, regional/register choices, and judgment calls for ArenaSwap extension locales
metadata:
  type: project
---

Created `apps/extension/locales/it.json` (2026-08-15) — standard Italian, no regional variant (Ryan confirmed standard Italian only, since Serie A was the gap among Big-5 soccer markets). Built via a Python script that mirrors `en.json`'s exact key tree, then verified programmatically (key order/set equality + placeholder-token equality at every leaf) before writing — this is the pattern to reuse for any future locale, since hand-transcribing ~650 lines invites silent key drift.

**Register:** informal `tu`, matching fr/pt_PT convention noted in [[reference_locale_file_format]].

**Sport terminology grounded in real Italian broadcast/federation usage (verified via web search), not calqued:**
- Soccer: "Calcio". Extra time "tempo supplementare", stoppage time "recupero", penalty shootout "rigori" (per task brief, pre-approved).
- Basketball: "Basket" (colloquial/standard, not "Pallacanestro" — shorter, matches casual tone). Tip-off = "palla a due" (official term).
- Ice hockey: "Hockey su ghiaccio". Faceoff = "ingaggio" (official FISG term, confirmed via federation research — not a loanword despite thin overall vocabulary). Shootout: Italian hockey media genuinely reuses soccer's "rigori" for shootouts too (confirmed via hockeyitalia21.com), so the shared `gameCard.shootout` key uses "RIG" for both sports — a deliberate cross-sport reuse, not a shortcut.
- American football: "Football americano". Terms stay as English loanwords per task brief (down, yard, QB spelled "quarterback", audible, flag, GOAT) except "red zone" → "zona rossa", which IS the standard Italian NFL-broadcast term (verified).
- Baseball: "Baseball" kept, "inning" kept as loanword. Top/bottom of inning → "parte alta/bassa dell'inning" (confirmed FIBS usage).
- Generic overtime (used across sports in body text, not soccer-specific) → loanword "overtime" was chosen for brevity/cross-sport consistency, distinct from soccer's "tempo supplementare".
- "Boost" (gameBoost, favoriteBoost, postseasonBoost, volatilityBoost) kept as an English loanword throughout rather than "impulso" — shorter, and matches how Italian gaming/sports apps actually talk about boosts. Applied consistently everywhere the English source uses "boost" as a feature-name noun.
- "PowerScore Breakdown" → "Dettaglio PowerScore" (not "Scomposizione").
- Late-game signal (`legendLateGame`/`signalLateGame`) → "Fine gara", deliberately NOT "Finale" to avoid colliding with `detail.final` ("Finale" = game-over state) which can appear on the same screen.

**Spaceballs quotes (`ludicrousSpeed.*`):** translated using the actual Italian dub ("Balle Spaziali") terminology, verified via web search of the Italian transcript — "velocità smodata" for ludicrous speed (official dub term), "Sono finiti nella zona plaid!" for the plaid line, "colonnello Sandurz" (kept the character's English name, matching how es/fr/de/pt all keep "Sandurz" rather than substituting any dub-specific rename).

**Formatting convention (see [[reference_locale_file_format]]):** it.json ends with a trailing CRLF newline, following the 6-of-8 majority (en and fr are the only two without a trailing newline).

**Proprietary terms preserved verbatim:** ArenaSwap, PowerScore — kept English capitalization even where mid-sentence in English (e.g. "on standby stream" lowercase in en.json); "Standby Stream" also kept as a proper noun everywhere, consistently capitalized even in the one spot where en.json itself lowercases it — this matches de.json's existing precedent of normalizing the casing, not a deviation.

**Keyword-list fields (`keywords*` in `setup`):** the project convention (confirmed across fr/de/pt_BR/pt_PT/es) is to strip accents/diacritics from these search-alias strings for matching robustness — e.g. Italian used "unita" not "unità" in `keywordsTemperature`. This does NOT apply to normal UI copy, only the `keywords*` search-alias fields.

**City name judgment call:** kept "Philadelphia" untranslated in `footer.credit` (Italian has a historical exonym "Filadelfia", used by es/pt locales, but de/fr/ja/zh_CN keep the English form — went with the majority/modern-usage side).
