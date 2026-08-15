---
name: project-zh-tw-terminology
description: Approved Traditional Chinese / Taiwan (zh_TW.json) terminology, register, and judgment calls — deliberately NOT a script conversion of zh_CN
metadata:
  type: project
---

Created `apps/extension/locales/zh_TW.json` (2026-08-15). Product owner (Ryan) was explicit
this must not be a simplified→traditional script conversion of `zh_CN.json` — Taiwan has a
mature native baseball register (CPBL, WBSC #2, 2024 Premier12 champions) that mainland China's
NBA-driven zh_CN locale lacks. Verified terminology via the sports-analyst-consultant agent
(web-searched real CPBL/Yahoo Sports TW/PTT sources, not memory) before translating — findings
saved at `.claude/agent-memory/sports-analyst-consultant/project_zh_tw_terminology.md`.
Verified programmatically after writing: same technique as [[terminology_it]] (key-order +
key-set + placeholder-token equality vs `en.json` at every leaf) before converting to CRLF.

**Register:** informal 你, not zh_CN's formal 您 — matches the fr/pt_PT/it convention of
picking the casual register for ArenaSwap's energetic tone. This is a deliberate deviation
from zh_CN's own noted formality choice in [[reference_locale_file_format]], not an oversight.

**Sport terminology — verified real Taiwan usage, several genuinely diverge from zh_CN:**
- American football: **美式足球**, not zh_CN's 美式橄榄球/美式橄欖球. Confirmed dominant term
  in real Taiwan sportsv.net/TAFL sources — cleanly distinguishes from 足球 (soccer) and
  橄欖球 (rugby), which zh_CN's convention doesn't need to since mainland uses 橄榄球 loosely
  for both rugby and American football.
- Basketball 籃球, ice hockey 冰球, baseball 棒球, softball 壘球, soccer 足球 — same roots as
  zh_CN, script-only difference.
- Balls-Strikes-Outs (`bso.*`): kept Latin **B/S/O**, same as zh_CN. CPBL actually switched
  scoreboards from the old Japanese-style S-B-O order to international B-S-O around 2008 —
  the "Taiwan/Japan use S-B-O" trivia is over a decade stale. Don't reorder this for any
  future CJK locale without checking that assumption first.
- Inning-half labels (`gameCard.topOfInning`/`bottomOfInning`): kept 上半局/下半局 (full form),
  NOT the compact ticker form "X局上/X局下" CPBL headlines actually use — confirmed via code
  (`ui/src/components/inningHalfIcon.tsx`) that these strings are an aria-label/title tooltip
  on a ▲/▼ icon, not a compact scoreboard chip, so the descriptive full form is the correct
  register for this specific UI slot. If this string is ever repurposed as a visible ticker
  label instead of a tooltip, switch to the numbered compact form.
- `detail.getReadyFirstPitch`: rewritten to **第一球即將投出** ("the first pitch is about to
  be thrown"). Explicitly did NOT reuse 開球 (which zh_CN-style logic might suggest by analogy
  with `getReadyKickoff`'s 開球) — 開球 is already used elsewhere in this same file for soccer
  kickoff and would also read as the *ceremonial* first pitch (開球式) in a baseball context,
  not "the game is starting." This was a specific trap flagged by the sports analyst.
- `gameCard.shootout` ("PENS {away}–{home}") kept as-is (Latin abbreviation), unrelated to the
  above — this is hockey penalty-shot scoreboard shorthand, not investigated further since low
  confidence on Taiwan-specific hockey terminology exists either way (hockey has thin cultural
  penetration in Taiwan).

**Non-sport terminology fixes — genuine TW/CN software-localization divergences, not stylistic:**
- "Tab" (browser tab): **分頁**, not 標籤頁/标签页. Matches Chrome/Firefox's actual Taiwan UI
  convention (标签页 is the mainland Chrome term). Applied to every tab-related string
  (`tab.fallback`, `setup.standbyTab`, `main.sectionActiveLiveTabs`, all `stepTabAssign.*`,
  `tabControl.*`, etc.) — this was the single most pervasive term change in the file.
- "Settings": **設定**, not 設置. Applies both as the noun (Settings screen) and the verb
  ("to configure/set up") — 設置 reads as a mainland-software calque in Taiwan context.
- "Save" (settingsSavedToast): **儲存**, not 保存 — Taiwan software convention (Office/Google
  Docs TW use 儲存).
- "obtain/unavailable" (`app.gameDetailsUnavailable`): **取得**, not 获取/獲取.
- "priority" (`gameBoost.explainer`, `stepPowerScore.gameBoostMeasured`, etc.): **優先權**,
  not 优先级/優先級.
- "Tour" (`main.tourButton`, `onboarding.takeTour`, `stepReAccess.subtitle`/`body`): **導覽**,
  not 引导教程/引導教程 — matches how Taiwan consumer apps (LINE, Taiwan bank apps) label
  onboarding walkthroughs, feels native rather than translated.
- Internal consistency fix (not a TW/CN regional difference, just tightened while retranslating
  fresh rather than blindly copying zh_CN's own inconsistency): zh_CN uses 加速 ("acceleration")
  for the Game Boost feature name (`gameBoost.heading`, `powerScore.gameBoost`,
  `stepPowerScore.gameBoostName`, etc.) while using 加成 ("bonus") for every other *Boost
  feature (`favoriteBoost`→收藏球隊加成, `postseasonBoost`→季後賽加成, `volatilityBoost`→
  波動加成). zh_TW uses **比賽加成** for Game Boost throughout, aligning it with the rest of
  the PowerScore-boost family instead of reproducing zh_CN's one-off inconsistency.
- `gameCard.delay`/`delayFallback` ("DELAY"/"Delay"): translated as **延誤**, not 中断/中斷.
  Traced the actual usage (`game.delayed` from ESPN API status, e.g. baseball rain delays,
  surfaced via `gameSituation.ts`) — zh_CN's "interruption" reading doesn't match; "delay" is
  the correct sense.
- "起司牛肉潛艇堡" for the `loading.m31` cheesesteak joke, not zh_CN's "芝士牛肉堡" (cheese
  *burger*) — a genuine Philly cheesesteak is a hoagie/sub, not a burger; 潛艇堡 ("submarine
  sandwich") is the correct Taiwan term for that sandwich shape (popularized locally via
  Subway), so this both fixes an accuracy gap in the CN source and reads more natural in TW.

**City names:** kept "Philadelphia" and "Boston" untranslated in `footer.credit`, matching
zh_CN's choice (also de/fr/ja precedent per [[terminology_it]]'s note on the same field) rather
than using Taiwan's own exonyms (費城/波士頓), since this is Ryan's personal credit line and
consistency across CJK locales seemed more valuable than localizing a proper noun nobody but
Ryan "owns."

**National-team naming:** confirmed no string in `en.json` names a Taiwanese/Chinese national
team ("Chinese Taipei" etc.) — this locale renders whatever ESPN's API returns for team names
with no override, per the product owner's standing decision; nothing needed flagging in this
particular file. Worth re-checking this file specifically if the app ever adds a
national-team-context string (e.g. WBSC bracket labels) in the future.
