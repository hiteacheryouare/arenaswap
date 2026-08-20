---
name: project_zh_tw_terminology
description: Verified (web-searched, not guessed) Taiwan zh-TW sports terminology for CPBL baseball, NFL, and hockey, vs. mainland zh-CN usage — for the ArenaSwap zh-TW locale build
metadata:
  type: project
---

Traditional Chinese (zh-TW) localization is being done as its own linguistic pass, not a script conversion of the existing zh-CN (Simplified) locale, because Taiwan has much deeper native baseball culture (CPBL, WBSC #2, 2024 Premier12 champions) than mainland China. Findings below are grounded via web search of Taiwan sports media (CPBL official site, Yahoo Sports TW, sportsv.net, PTT Baseball board, ETtoday/CTS) on 2026-08-15, not memory alone, per explicit product-owner instruction to avoid guessing.

## Sport names
- Basketball: 籃球 — identical Taiwan/mainland, no divergence.
- American football (NFL): **美式足球** is the dominant term in actual Taiwan sports media (article titles from sportsv.net, 1on1.today, TAFL league branding all use 美式足球). 美式橄欖球 exists as a recognized synonym but is secondary — use 美式足球 as the primary zh-TW string. This does functionally distinguish it from 足球 (soccer) and 橄欖球 (rugby).
- Ice hockey: 冰球 — same both sides. Note 曲棍球 alone defaults to *field* hockey; always qualify as 冰球 to avoid ambiguity.
- Baseball: 棒球 — identical both sides.
- Softball: 壘球 (traditional) / 垒球 (simplified) — same word, script-only difference.
- Soccer: 足球 — identical both sides.

## Baseball inning display
- Confirmed via real CPBL game-recap headlines (Yahoo Sports TW, e.g. "八局上", "一局下", "二局下"): the natural, actually-used compact form is **"X局上" / "X局下"** (inning number + 上/下), e.g. "9局上", not "上半局"/"下半局" alone. Reserve 上半局/下半局 for full-sentence spoken/prose contexts ("現在是九局上半"); use "X局上"/"X局下" for scoreboard/ticker UI labels.
- 延長賽 confirmed correct and standard for "extra innings" (matches zh-TW Wikipedia article title).

## Balls-Strikes-Outs count — IMPORTANT, counter to initial hypothesis
- Vocabulary: 好球 = strike (S), 壞球 = ball (B), 出局 = out (O). Same roots as mainland (mainland writes 坏球 in simplified — same word).
- **Order: current Taiwan/CPBL convention is B-S-O (Ball-Strike-Out), NOT the old Japanese-style S-B-O.** A dedicated PTT Baseball-board thread ("[問題] SBO什麼時候開始變成BSO的？") and a fan blog ("計分板到底寫什麼？") confirm CPBL switched scoreboards from SBO to BSO around 2008 specifically to align with international/MLB standard. (Separately confirmed Japan's own NPB made the identical SBO→BSO switch in 2011 for international-game consistency — so the old "Japan/Taiwan use S-B-O" trivia is now outdated as of ~2008-2011 and should not be used.)
- Practical implication: **do not build a Taiwan-specific S-B-O reordering.** Taiwan now matches the same B-S-O order as mainland/MLB/int'l standard — this is one of the rare cases where zh-TW and zh-CN converge and no special-casing is needed for order.
- Display form (letters vs. characters): evidence is mixed/inconclusive on whether current CPBL on-screen graphics literally print Latin "B/S/O" vs. lit indicator dots with no text vs. full words 好球數/壞球數/出局數 in text-only play-by-play ("文字直播"). Recommend defaulting to Latin B/S/O labels for compact UI (matches the "international standard" CPBL explicitly adopted in 2008) but flag this specific sub-point as medium-confidence — verify against an actual current CPBL TV graphic or CPBL App screenshot before finalizing if pixel-exact authenticity matters.

## "Get ready, game about to start" — baseball-specific opening phrase
- No single canonical broadcast catchphrase was found via search (this remains a design/copywriting choice, not a fixed piece of terminology).
- **Avoid 開球 as the baseball-specific parallel to basketball's 即將跳球.** 開球 is heavily overloaded across the app's other sports: it means "kickoff" for soccer, "tee shot" for golf, AND "ceremonial first pitch" (開球儀式/開球式) for baseball specifically — i.e. it already collides with the pre-game VIP ceremonial pitch, not the real first live pitch of the game. Reusing it for "game about to start" risks reading as the ceremonial-pitch announcement instead.
- Recommended construction instead: something naming the literal first pitch action, e.g. "第一球即將投出" (the first pitch is about to be thrown) — specific, unambiguous, doesn't collide with other sports' vocab. Generic "即將開打" reads as sport-agnostic filler and should be avoided if the goal is sport-specific flavor (parallel to 即將跳球).

## NFL down-and-distance
- Confirmed via Taiwan NFL commentary explainer (sportsv.net): "down" is explained using **檔** (e.g. "第幾檔"), yards = 碼. However, actual on-screen/recap shorthand often keeps the pairing partly in numeral/English form (e.g. "1st and 10", "2nd-8" appeared directly in a Taiwan explainer rather than fully localized). Medium confidence — NFL has much thinner homegrown Chinese-language broadcast tradition than baseball in Taiwan (carried by 愛爾達/ELTA), so on-screen terminology may be less standardized than CPBL's. Worth a follow-up check against an actual ELTA NFL broadcast graphic if precision matters here.

## Hockey / soccer shootout terminology
- 驟死賽 (sudden death) confirmed standard Taiwan term, used for both soccer and hockey overtime contexts.
- PK戰 / PK大戰 confirmed as the standard, broadcast-real Taiwan term for a soccer penalty shootout (zh-TW Wikipedia article is titled 互射十二碼 but commonly referred to as PK大戰; CTS news article confirms usage). This is a case where Taiwan differs from mainland: mainland's standard sports-broadcast term is 点球大战, while "PK" as Latin-letter slang is comparatively more mainstream/normalized in Taiwan media.
- No Taiwan-specific ice-hockey shootout term was found in search — ice hockey has low cultural penetration in Taiwan, so there may not be an established distinct vocabulary. Low confidence; by structural analogy Taiwan broadcasts would likely borrow PK戰/驟死賽 phrasing, but this should be verified against an actual NHL Chinese-language broadcast (if one exists) rather than assumed.

See [[project_multi_sport]] for the broader multi-sport expansion context this locale work sits inside.
