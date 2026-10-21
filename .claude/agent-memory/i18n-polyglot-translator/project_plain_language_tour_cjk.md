---
name: project-plain-language-tour-cjk
description: 2026-10-21 issue #228 plain-language onboarding/tour rewrite (46 keys) for ja/ko/zh_CN/zh_TW; "link a tab" and signal/boost/penalty term choices
metadata:
  type: project
---

Applied via temporary/issue228/applyCjk.py (byte-lossless CRLF round-trip). 12 new keys (signalsSubtitle, stepPowerScore.about*).

**Link a tab:** English tour says "link", but the dropdown placeholder (assignPlaceholder / tabAssign.placeholder / proTip) still says "Assign". ja ひも付ける (was リンク/割り当て mix), ko 연결, zh_CN 绑定, zh_TW 連結.
**Signal/boost/penalty:** ja シグナル/ブースト/ペナルティ; ko 시그널/부스트/페널티; zh 信号|信號, 加成/扣分 (zh_CN boostsHeading says 惩罚 but Breakdown says 扣分; used 扣分).
**Win probability:** 勝利確率 / 승리 확률 / 胜率|勝率. Favorites: お気に入り / 응원팀 / 收藏.
**Power play:** zh keeps existing 强打|強打 (11 uses) though 多打少 is the real hockey term and already used in statPowerPlayPct; flagged for review.
**Tour noun:** zh_CN 引导教程, zh_TW 導覽, ja ツアー, ko 투어 (match takeTour).
Related: [[project-reason-sentences-rewrite]].
