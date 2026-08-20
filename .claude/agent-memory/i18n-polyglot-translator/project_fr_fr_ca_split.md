---
name: project-fr-fr-ca-split
description: ATTEMPTED and REVERTED 2026-08-15 — fr_FR/fr_CA are not valid web-extension locale codes; keeps the approved Québécois terminology for any future runtime-override approach
metadata:
  type: project
---

**DO NOT RE-ATTEMPT THIS AS A LOCALE-FILE SPLIT.** `fr.json` was split into `fr_FR.json`/`fr_CA.json` on 2026-08-15 and reverted the same day. Web extensions accept only a fixed allowlist of locale codes, and **neither `fr_FR` nor `fr_CA` is on it** — only bare `fr`. The allowlist lives in `node_modules/@wxt-dev/i18n/dist/build-*.mjs` as `SUPPORTED_LOCALES`; it does include `en_AU/en_GB/en_US`, `es_419`, `pt_BR/pt_PT`, and `zh_CN/zh_TW`, which is why the `pt` split works and misleadingly suggests `fr` would too. WXT only *warns* about unsupported codes (`wxt prepare` prints "Unsupported locales: [...]") and still emits the directories, so a build succeeds while French silently falls back to `en`. Verified by building and inspecting `.output/chrome-mv3/_locales/`.

**Current state:** single `fr.json`, carrying the France/neutral text (the maintainer's call — France + Belgium + Switzerland + francophone Africa outweighs Quebec). The 7 standalone bug fixes made during the split were kept. Quebec users get France French, including `sport.football` meaning soccer, which is wrong for them but accepted.

**If the Quebec variant is ever wanted for real,** it must be a runtime override in the app's i18n layer keyed on `navigator.language === 'fr-CA'`, not a locale file. Only ~17 strings diverge, so the override map is small — the approved terminology below is exactly that map's contents. The highest-value entries by far are `sport.football`/`sport.soccer`, which are *swapped* between the two variants (Quebec: Football = NFL, Soccer = soccer; France: Football = soccer, Football américain = NFL).

**Why the split:** Hockey (NHL, NCAA M. Hockey, Olympic hockey) is a core supported sport, and Quebec/France hockey vocabulary genuinely forks — Quebec has native terms (hockey is culturally central there), France borrows English loanwords (hockey is niche there). Quebec is also the stronger French-market driver for this product since there's no Ligue 1 in the league lineup.

**Honest assessment of the hockey footprint:** it's thinner than the premise suggested. The locale file only surfaces ONE literal hockey-specific string (`detail.getReadyPuckDrop`) — the game doesn't expose play-by-play text (no faceoff/icing/power-play/boarding strings exist anywhere in the UI). The interesting discovery during the audit was that the *original* `fr.json` had already picked up Quebec-flavored hockey **and** football vocabulary in a few spots (`"mise au jeu"` for puck drop, `"essai"` for down) despite being a single generic file — meaning `fr_FR` needed correcting *toward* France usage, not the other way around. Most of the real divergence work ended up being **football** (Quebec's CFL/NFL heritage gives it native terms France lacks) and general anglicism-avoidance, not hockey per se.

## Approved terminology (verified via OQLF Vitrine linguistique, FFHG official lexicon, RDS/NHL.fr sports journalism — sources cited in-session, not re-verified here)

| Concept | fr_FR (France) | fr_CA (Québécois) | Why |
|---|---|---|---|
| Faceoff / puck drop | **l'engagement** | **la mise au jeu** | FFHG's own lexicon defines "Engagement" as the official France term; OQLF lists "mise au jeu" as its privileged term. Both are real, sourced, not invented. |
| Puck (noun itself, not currently a UI string but relevant background) | **le palet** | **la rondelle** | Confirmed: France never says rondelle for the puck (regional obscenity connotation is the folk explanation); Quebec never says palet. |
| Soccer | **Football** | **Soccer** | Quebec disambiguates because "football" alone means Canadian/American gridiron there (RDS/Radio-Canada usage, confirmed via Le Devoir/OQLF). France's "football" means soccer; American football needs the qualifier. |
| American/Canadian football | **Football américain** | **Football** | Mirror of the above — no qualifier needed in Quebec since "football" is already unambiguous there. |
| Down (football) | **la tentative** | **l'essai** | Sourced from French domestic amateur-league lexicons (Devils Cenon, décathlon) for fr_FR vs. RDS Alouettes/CFL coverage ("troisième essai et court") for fr_CA. |
| Quarterback | **QB** (kept as common francophone-NFL-fan shorthand) | **quart-arrière** | Confirmed via RDS headline usage of "quart-arrière" for Quebec; no equivalent native abbreviation established for France, "QB" is what French NFL fan media actually writes. |
| Kicker | **kicker** (loanword) | **botteur** | fr.wikipedia.org's own article is titled "Kicker (football américain)" — France uses the loanword natively; "botteur" confirmed via RDS Alouettes coverage. |
| Booing | **siffler** (whistle) | **huer** (boo aloud) | Genuine cultural/linguistic fork: European sports crowds boo by whistling; North American (incl. Quebec) crowds boo vocally. Not sport-specific, applies to `loading.m29`. |

## Non-sports Quebec register/vocabulary choices applied
- `loading.m26`: France "à la salle" → Quebec "au gym" (`aller au gym` is characteristic Québécois phrasing).
- `noGames.m3.sub`: one instance of "pour le moment" → "présentement" (the classic Quebec word for "right now"), applied once for authentic flavor rather than everywhere (would read as forced/repetitive otherwise).
- Anglicism-avoidance (Quebec's norm is stronger than France's here, confirmed direction matches the task brief): `booste`→`remonte` (m24), `show`→`spectacle` (m51), `brief`(verb)→`donne ses dernières consignes` (m70). France's versions keep the casual anglicism verbs — they're natural/accepted register there.
- `setup.keywordsLeagues` (settings-search synonyms, not user-visible copy): swapped `football`→`soccer` to match fr_CA's sport-naming split, and added `lnh` alongside `nhl` since Quebec broadcasters/fans commonly write the French abbreviation.

## Bugs fixed in BOTH files (not regional — plain errors found during the audit)
- `proTip.main.t5` had "Le Flux Veille" — a live instance of the open [[project-brand-term-leakage]] issue actually rendering "Standby Stream" in French. Fixed to the untranslated brand name in both files (this resolves that one instance of the tracked leakage; the es/zh_CN/ja/de instances remain open per that memory).
- `proTip.setup.t5` said "bonus de saison éliminatoire" for the Postseason Boost feature, inconsistent with the term used everywhere else in the file (`powerScore.postseasonBoost`, `postseasonBoost.label`, `stepPowerScore.postseasonBoostName` all say "Bonus de playoffs"). Aligned to match.
- `loading.m72` had a stray mid-word capital: `"dépoussiÈre"` → `"dépoussière"`.
- `loading.m33` mistranslated "fantasy league" as "championnat fantasy" (championship, not league) → "ligue fantasy".
- `footer.credit` used the English city spelling "Philadelphia" and an ampersand in running prose → "Philadelphie" (French exonym) and "et" (spelled-out conjunction).

## Deliberately left unchanged (considered, evidence said no)
- **"match" vs "partie"**: hypothesized Quebec might prefer "partie" for game/match. Verified false — RDS's own copy uses "matchs" routinely (e.g. "RDS s'assure de diffuser au moins 45 matchs du Canadien"). Did not do the wholesale replacement this would have required across nearly every key.
- **`detail.intermission` ("Pause")**: hypothesized Quebec might need "entracte" for the hockey between-periods break. OQLF's own GDT entry lists BOTH "entracte" and "pause" as privileged Quebec terms — "Pause" is already correct, left unchanged. (This key is also shared across sports, not hockey-exclusive, which would have made a hockey-only swap risky anyway.)
- **`detail.getReadyKickoff`**: this key is shared by football AND soccer in code (`gameStartPhrase.ts`, per [[project-pregame-gameinfo-translations]]'s known structural issue, unfixed). "Coup d'envoi" is the correct soccer term in both France and Quebec; the more precise Quebec gridiron term ("botté d'envoi") can't be applied without a code-level key split, which is out of scope here and already flagged to the maintainer separately.
- **Tailgate party** (`loading.m45`, translated as "barbecue d'avant-match"): Quebec Bills-fandom tailgate culture is real but I couldn't verify a settled Quebec media term for it strongly enough to diverge with confidence — left identical in both files.
- **`ludicrousSpeed.*`** (the Spaceballs movie-quote easter egg, ~47 lines): kept byte-identical between fr_FR and fr_CA. It's a film-parody homage, not sports content, and I found no evidence of a distinct Québécois dub track to draw from.

## Mechanics
Both new files got a trailing CRLF newline added (the task explicitly asked for this, diverging from the historical `fr.json`/`en.json` no-trailing-newline quirk documented in [[reference-locale-file-mechanics]] — that memory needs updating since `fr.json` no longer exists).
