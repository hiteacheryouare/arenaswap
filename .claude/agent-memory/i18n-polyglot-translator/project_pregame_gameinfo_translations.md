---
name: project-pregame-gameinfo-translations
description: Approved detail.getReady*/detail.info* translations (pre-game countdown headings + Game info row labels) across all 8 locales, reviewed 2026-08-10
metadata:
  type: project
---

Review of the `detail` keys added 2026-08-09 (`gameInfoHeading`, `infoWatch`, `infoVenue`, `infoWeather`, `infoLine`, `getReadyTipOff/Kickoff/PuckDrop/FirstPitch/Gametime`, `pregameTabExplainer`). Extends the precedent in [[project-shootout-translations]] and [[project-delay-translations]]: verify against real press/broadcast usage per locale, never literal-translate.

## Sport-term rulings (verified against native media)

| Sport moment | Ruling |
|---|---|
| Hockey face-off | **Ice hockey has no native lexical register in Spanish or Portuguese** — every real source borrows *faceoff/face-off*. Invented literal renderings (`el disco inicial`, `a queda do disco`) read as machine translation to a fan. Use the loanword. German is the exception: **`das Bully`** is genuinely native and current (NHL.com/de uses *Bullypunkt, Bullyquote*); neuter gender is correct. |
| Baseball first pitch | **German baseball has no native register** — `der erste Wurf` is wrong; the countable unit is **`der erste Pitch`** (de.wikipedia: "Der direkte Wurf des Pitchers … wird als **Pitch** bezeichnet"). Ceremonial sense is a separate register (`First Pitch` / `der erste Ball`). Spanish **`el primer lanzamiento`** is the MLB.com/es house term — correct. pt_BR **`primeiro arremesso`** vs pt_PT **`primeiro lançamento`** is a REAL lexical split (Brazil uses *arremessar/arremessador*, Portugal uses *lançar/lançador*). |
| Basketball tip-off | es **`salto inicial`** correct (do NOT use `saque inicial`, that is football). pt_BR **`bola ao alto`** is the official CBB/FIBA-PT term. pt_PT **`salto inicial`** kept, but **`bola ao ar`** is the stricter FPB/Wikipédia form — flagged for human sign-off, evidence for pt_PT prose usage is thin either way. |

## Register rulings

- **pt_PT addresses the user as informal `tu`** throughout (`o teu`, `estás`, `podes`, `Abre`, `activa-o`). Reflexive imperatives must be **`Prepara-te`**, NOT `Prepare-se` (which is the você/formal form and correct only for pt_BR).
- **pt_BR uses `você`** — `Prepare-se`, `Abra`, `seu` are correct there.
- **pt_PT deliberately uses pre-AO90 orthography** (`acção`, `activar`, `directo`, `seleccionar` — 16 `directo` / 0 `direto`). Match this convention in new pt_PT strings.
- **zh_CN uses formal 您** (36×). The single informal 你 is inside the `ludicrousSpeed` easter-egg strings and is intentional.
- de/es/fr use informal du/tú/tu.
- When the **app** is the actor (not the user), every locale except es correctly used an infinitive for `pregameTabExplainer`; es had an imperative `Abre` (telling the user to do it) and was corrected to `Abrir`.

## CJK heading shape

`〜の準備` / `准备〜` both read as an **instruction to the players** ("prepare to jump-ball"), not an announcement to a spectator. Countdown cards take the broadcast "imminent" form instead: ja **`まもなく〜`**, zh_CN **`即将〜`**. ja sport words are all correct katakana loanwords (`ティップオフ`/`キックオフ`/`フェイスオフ`/`プレイボール`); `プレイボール` is genuinely the Japanese baseball game-start call, distinct from `始球式` (ceremonial) and `初球` (first pitch of an at-bat).

zh_CN has **no fan-facing term for baseball's "first pitch"** (`首投` was invented; `开球` means the *ceremonial* pitch; `第一球` collides with "first goal"). So `getReadyFirstPitch` and `getReadyGametime` both resolve to `即将开赛` — two keys rendering identically is the honest outcome, not a bug.

## "Line" (betting) is not "odds"

The `infoLine` value is a spread + over/under (`KC -3.5 • O/U 47.5`), NOT a payout multiplier. `Quote`/`Cote`/`赔率` all mean payout odds and were wrong. Rulings: de `Wettlinie`, fr `Ligne`, zh_CN `盘口` (umbrella for spread + total; `让分` is spread-only), es `Línea` and pt `Linha` were already correct.

**ja deliberately keeps `オッズ`** even though it is strictly imprecise: the accurate calque `ライン` is unusable in Japanese because it reads as LINE, the messaging app. Japanese has thin sports-betting register, and `オッズ` is the umbrella users actually understand. Flagged for human review rather than swapped.

## Known structural issue — NOT yet fixed

`detail.getReadyKickoff` is shared by BOTH `football` (NFL) and `soccer` (EPL/MLS/NWSL) via `gameStartPhrase.ts`. In de/es/pt the soccer and American-football kickoff terms differ (`Anstoß` vs `Kickoff`; `saque inicial` vs `patada inicial`; `pontapé inicial` vs `kickoff`), so no single string is right for both. Recommended fix is splitting the key, which is a code change — left for the maintainer to decide.

**How to apply:** Reuse these rulings rather than re-deriving. The general principle that keeps recurring: for a sport with no native register in a language, **resisting translation is the correct move** — ship the loanword.
