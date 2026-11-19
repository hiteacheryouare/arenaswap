---
name: project-docs-site-i18n-bundle
description: 2026-09-05 — translated apps/docs/src/i18n/strings/*.json (marketing site) into all 11 non-English locales; file mechanics, ui.* copy rule, and the heroTagline puzzle solved per language
metadata:
  type: project
---

Full first translation of the ArenaSwap **marketing website** string bundle, distinct from the
extension's own locale files (which [[reference-locale-file-mechanics]] documents). Source of truth:
`apps/docs/src/i18n/strings/en.json`. Targets: `{de,es,fil,fr,it,ja,ko,pt-BR,pt-PT,zh-CN,zh-TW}.json`
in the same directory — **note the BCP-47 hyphens** (`pt-BR.json`, `zh-CN.json`), unlike the
extension's underscore form (`pt_BR.json`, `zh_CN.json`). Don't confuse the two file sets.

**This whole `apps/docs/src/i18n/strings/` directory was untracked/uncommitted in git** as of
2026-09-05 — `git ls-files` on `en.json` returns nothing, `git log` has no history for it. It's
brand-new work-in-progress from another session in the same shared checkout. Structural diffing has
to be done against the working-tree copy of `en.json`, not git history.

## Mechanics (same family as the extension files, verify before assuming)
- Tab indentation, CRLF, and **all 11 translated files carry a trailing CRLF** that `en.json` itself
  lacks — same quirk as the extension bundle, confirmed still true here.
- `en.json` had 436 lines at task start; the coordinator added 4 keys to `home.hero`
  (`captionSwitched`/`captionWatching`/`replay`/`tabLabel`) and split `powerscore.heroTagline`/
  `heroTaglineToken` into 4 keys (`heroTaglinePrefix`/`heroTaglineSuffix`/`heroRestingToken`/
  `heroRestingSuffix`) mid-task, landing at 440. The 11 target files had been seeded from an *older*
  436-line shape and needed both catching up.
- **A build-time guard now exists**: `cd apps/docs && npm run build` throws on any locale/en.json
  shape mismatch (missing/extra key, array-length mismatch). Use this as the authoritative check,
  not just a hand-rolled structural diff.
- `npm run build` in `apps/docs` writes to the gitignored `apps/docs/dist` (since 2026-11-19), so a verification build leaves nothing to restore.

## The `ui.*` / `sport.*` namespaces are copy-only, never translate directly
Per the task brief, every key under `ui.*` and the top-level `sport.*` must be copied **verbatim**
from the matching key in the *extension's* locale file (`apps/extension/locales/<code>.json`, note
underscore filenames there). All ~55 `ui.*` keys used by the docs site had direct 1:1 counterparts in
every one of the 11 extension locale files — no orphan keys to report back on this pass.

One divergence worth flagging to the maintainer: **docs `en.json`'s `ui.sensitivity.label` says
"Sensitivity"**, but the extension's `sensitivity.label` says "Switch sensitivity" — the English
source strings for this shared namespace have already drifted from each other. Per the task's
explicit instruction, every translated file still carries the *extension's* translated value for
that key (e.g. German "Wechselempfindlichkeit"), not a fresh translation of the docs' shorter English
label. This is correct per the brief, but the docs `en.json` value should probably be reconciled to
match the extension's someday.

## The heroTagline puzzle — the load-bearing design problem of this task
`powerscore.heroTaglinePrefix` + a rotating league-abbreviation token (NFL, MLB, …) + `heroTaglineSuffix`
must concatenate into "The score behind every {TOKEN} score."; at rest, `heroRestingToken` +
`heroRestingSuffix` (note: NOT `heroTaglineSuffix` — resting has its own suffix) must read "The score
behind every score." The mechanical constraint is that TOKEN always sits literally between prefix and
whatever suffix is active — you cannot reorder around it, only choose what surrounds it. Solutions
found per language (all verified to avoid double-spacing or word duplication when resting):

- **de**: `"Der Score hinter jedem "` + TOKEN + `"-Spielstand."` / resting token `"Score"` + `"."`
  → compound-noun hyphen trick (`NFL-Spielstand`), resting reads "Der Score hinter jedem Score."
- **es**: `"El puntaje detrás de cada puntaje "` + TOKEN + `"."` / resting token
  `"del partido"` + `"."` → **corrected 2026-09-05** after the coordinator caught the first version
  live: an earlier draft used `"...de la "` + TOKEN + `"."` with resting token `"puntuación"`, which
  concatenates to "El puntaje detrás de cada puntaje de la puntuación" — three synonyms for "score"
  stacked, reading as "the score behind every score of the score" rather than "of the game." The fix
  drops the article from the prefix entirely (direct apposition before TOKEN, same technique as
  de/fil: "puntaje NFL" reads like a headline compound, attested in Latin American sports media
  as "marcador NFL"/"resultados NBA" without an article) and puts the *entire* article+noun phrase
  `"del partido"` in the resting token instead of a bare noun — this sidesteps the gender clash that
  caused the bug: "de la" (fem. article, matches league acronyms by convention) can't be reused
  before "partido" (masc.), so the fix is to not carry any article in the shared prefix at all, and
  let the resting token supply its own correctly-gendered "del partido" complete. Verified both
  states: rotating → "El puntaje detrás de cada puntaje NFL."; settled → "El puntaje detrás de cada
  puntaje del partido." Lesson: **whenever a Romance-language resting token differs in grammatical
  gender from what the rotating TOKEN's implied article expects, don't bake the article into the
  shared prefix — push it into the resting token itself**, which is entirely ours to control.
- **fr**: `"Le score derrière chaque score de la "` + TOKEN + `"."` / resting token `"partie"` + `"."`
  → same prepositional pattern; resting shifts meaning slightly to "the score behind every game's
  score," which reads more naturally in French than a literal double "score."
- **it**: same shape as fr/es — `"Il punteggio dietro ogni punteggio della "` + TOKEN + `"."` /
  resting token `"partita"` + `"."`.
- **pt-BR** / **pt-PT**: same Romance pattern — `"O placar/marcador por trás de cada
  placar/marcador da "` + TOKEN + `"."` / resting token `"partida"` + `"."` (pt-BR uses "placar",
  pt-PT uses "marcador" — matches each locale's established `chartScoreTitle` vocabulary).
- **fil**: `"Ang score sa likod ng bawat "` + TOKEN + `" score."` / resting token `"score"` + `"."`
  → Taglish direct-borrowing works fine here, mirrors English structure exactly since "score" is
  already a loanword throughout the fil extension file.
- **ja**: `"あらゆる"` + TOKEN + `"スコアの裏にあるスコア。"` / **resting token is an empty string**
  `""` + resting suffix identical to the rotating suffix → the noun "スコア" needed for "every score"
  already lives inside the fixed suffix, so the resting state just omits the league-name modifier
  entirely rather than substituting a synonym. This is deliberate, not a bug — flagged here because
  an empty-string JSON value can look like a mistake on review.
- **ko**: same empty-token technique — `"매 "` + TOKEN + `" 점수 뒤에 숨은 점수."` / resting token
  `""` + resting suffix `"점수 뒤에 숨은 점수."` (no leading space, since prefix's trailing space
  plus empty token already produces exactly one space before the noun).
- **zh-CN** / **zh-TW**: same empty-token technique, no spaces at all around the Latin token (CJK
  space-around-Latin-script convention was considered and dropped here specifically because the
  resting state has no token to space around, and adding conditional spacing per-state isn't
  possible with fixed prefix/suffix strings) — `"每一个"`/`"每一個"` + TOKEN + `"比分背后的比分。"`/
  `"比分背後的比分。"`, resting token `""`.

**General pattern:** languages where "score" functions as a loanword or where the modifier can
precede the noun cleanly (de, fil) keep a non-empty resting token that literally re-uses the word
"score." Languages where the noun-then-modifier order is required (es/fr/it/pt via `de la`/`de`) use
a *different* near-synonym as the resting token to avoid an awkward stutter. Languages where the verb
naturally allows a bare quantifier with no head noun in the token slot (ja/ko/zh) use an **empty
resting token** and let the noun already embedded in the suffix carry the "every score" meaning.

## Terminology carried over from [[reference-locale-file-mechanics]] extension mapping
Pulled `gameBoost.heading` (extension) for the docs `home.settings.items[5].name` ("Game boost") in
every locale, since the English docs string matches the extension's feature name exactly even though
it's not under `ui.*`: de "Spielboost", es "Impulso del partido", fil "Boost ng Laro", fr "Coup de
boost", it "Boost partita", ja "ゲームブースト", ko "게임 부스트", pt-BR/pt-PT "Impulso do jogo",
zh-CN "比赛加速", zh-TW "比賽加成". Same pull for `favoriteTeamBonus.label`, `cooldown.label`,
`switchDelay.label`, `sensitivity.label` used as `home.settings.items[].name` values, and
`sport.football/baseball/...` for the FAQ's league-list prose.

## Register/vocabulary confirmed for this bundle (should match extension precedent)
- **fr/pt-PT**: tu, informal imperatives throughout marketing copy.
- **pt-BR**: você.
- **es**: tú (informal), Latin-American-neutral vocabulary, no vosotros forms.
- **zh-CN**: 您 (formal) throughout, including marketing copy — not just UI chrome.
- **zh-TW**: 你 (informal) throughout.
- **fil**: Taglish — English nouns kept liberally (Standby Stream, Score, Setting used as loanwords
  in other extension keys), Filipino grammar/particles carrying the sentence structure.
- **pt-PT** old orthography followed consistently in this pass too: "directo" not "direto",
  "activar"/"desactivar" not "ativar"/"desativar", "acção"-family spellings avoided only because no
  cognate of that particular word appeared in this bundle — but the *convention* (pre-AO90 spelling)
  should be assumed for any future pt-PT work on this project, confirmed from the extension's own
  `pt_PT.json`.

## Verification recipe used
A shared Python module (`build_common.py`, written to scratchpad, not checked in) did: load `en.json`
+ the matching extension locale, recursively diff key paths/array-lengths/placeholder-sets between a
constructed translation dict and `en.json`, then serialize with `json.dumps(..., indent='\t')`,
convert `\n`→`\r\n`, and write with a trailing CRLF. This is a reasonable pattern to reuse for the
next docs-bundle translation pass — faster and less error-prone than raw string-replace editing for
a file this size, since the structural check is enforced before any bytes hit disk.
