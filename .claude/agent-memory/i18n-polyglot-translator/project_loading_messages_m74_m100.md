---
name: project-loading-messages-m74-m100
description: 2026-09-20 batches of loading.m74-m100 and m101-m112 spinner jokes across 11 locales — sport/superstition/scandal localization calls and per-locale grammatical templates confirmed for this namespace
metadata:
  type: project
---

## Batch 2 (m101–m112, added same day)

These are oblique winks at real sports scandals/fiascos (Astros trash cans, Cape
Town sandpaper, the 1972 Olympic basketball three-second replay, 2012 Fail Mary,
Rio 2016 green pool, Salt Lake 2002 pairs skating, wrong-anthem ceremonies,
NFL Spygate tape destruction) plus two straight pregame-ritual lines (anthem note,
starter introductions). **The brief for this batch: the English never names the
incident, and that obliqueness is the joke — do not add a clarifying word that
gives the reference away, even where the target language would normally want one
for clarity.** Applied throughout: no locale's translation names a team, city,
year, or "scandal" — every line stays a plain physical description of an action.

**m106 ("Signalling touchdown and touchback at once" — the 2012 Fail Mary) is the
one case with an explicit instruction to check per-locale precedent rather than
translate uniformly:** re-read each locale's existing `m17`/`m59`/`m65` (fourth
down / the footballs / the backup QB) before deciding.
- **fil** keeps 100% of gridiron jargon as English loanwords everywhere in this
  file (`fourth down`, `football`, `backup QB`) — the one locale where Filipino
  NFL viewership genuinely consumes English-language broadcasts wholesale, so
  even obscure terms like "touchback" would appear as-is. Kept m106 fully
  literal: `Sabay na sine-signal ang touchdown at touchback...`
- **Every other locale generalized** to "two officials signal opposite
  calls/hand signs at once," dropping both "touchdown" and "touchback" as
  named terms. Reasoning: de/fr/it/es/pt_BR/pt_PT all keep *some* gridiron
  jargon as loanwords (Down, QB) but "touchback" specifically has no attested
  usage anywhere, including in these markets' own real NFL broadcasts, so
  pairing an established loanword (touchdown) with an invented one (touchback)
  would have broken worse than generalizing both away. zh_CN/zh_TW actually
  have real translated gridiron vocabulary (四分卫/四分衛 quarterback, 四档冲门/
  第四檔 fourth down) and even an attested term for touchdown itself (达阵/達陣
  in real Chinese-language NFL coverage) — generalized anyway rather than
  mixing an attested term with an invented touchback gloss, for the same
  internal-consistency reason. ja/ko keep Down/QB as katakana/Hangul loanwords
  but "touchback" isn't attested in either market's NFL coverage.

**Other locale-specific finds this batch:**
- pt_BR `calça` (singular) vs pt_PT `calças` (plural) for "trousers" (m102) —
  genuine regional grammatical-number difference, not a typo.
- pt_BR `gol`/`latas de lixo` vs pt_PT `baliza`/`caixotes do lixo` (m101, m103) —
  further confirmed BR/PT lexical divergence already established in
  [[project_box_namespace_terminology]] (defensemen/goaltending split) extends
  to everyday nouns too, not just sport-specific vocabulary.
- zh_CN `枚` vs zh_TW `面` as the measure word for "medal" (m108) — regional
  classifier-word difference, confirmed natural in both.
- zh_CN `首发阵容` vs zh_TW `先發陣容` (m112, "starters") — mainland vs Taiwan
  basketball/baseball broadcast convention, same pattern as the blocks/steals
  split in [[project_box_namespace_terminology]].
- m111 ("holding the last note of the anthem") was judged NOT US-exclusive
  enough to need adapting — holding a long note on a ceremonial anthem is a
  fairly universal vocal convention, so it was translated literally in all 11
  locales rather than substituted.

Added `loading.m74`–`m100` (27 keys) to all 11 non-English locale files, matching
`en.json`'s already-shipped English source. Extends the namespace covered by
[[reference_locale_file_mechanics]]; no width test gates `loading.*` (unlike
`gameInfoPanel`/`pregameDetail`), so no pixel budget applies here.

**Per-locale gerund/continuous template for this namespace** (confirmed by reading
all 73 pre-existing entries in each file before adding new ones — always do this,
tone drifts fast if you skip straight to translating):
- de: passive `Subject wird/werden verb-t...`, headline-style (article dropped on
  bare subject nouns: `Chaos wird sortiert`, not `Das Chaos wird sortiert`), with a
  ~15-25% minority of bare-infinitive/imperative phrasing (`Ab ins Fitnessstudio`,
  `Nichts verschreien wollen`). Indefinite articles (`ein/eine`) are kept where
  grammatically required — only *definite* articles get dropped for headline style.
- es: gerund + object, always with article (`Puliendo el hielo...`)
- fr: `On + present-tense verb...`, consistently, no exceptions found in 100 keys
- it: gerund + object (`Rifacendo il ghiaccio...`), a few bare gerunds without complement
- pt_BR: gerund + object, `você`-register verbs where relevant
- pt_PT: `A + infinitive...`, consistently
- ja: mixed `stem+中…` (abstract/checking-type actions: 確認中, 計算中, 物色中) vs
  `-ています…` (concrete physical actions done by hand: 磨いています, 引いています,
  かぶっています) — this split isn't formally documented anywhere, it's a naturalness
  judgment call made by scanning which of the two forms the existing 73 entries used
  per verb type. Onomatopoeia (ウロウロ) pairs with 中 not ています.
  Always full-width `…`, never half-width `...`.
- ko: `[noun/clause] + [verb stem] 중…`, always half-width `…` per
  [[reference_cjk_punctuation_and_spacing]], particles attach without space
  (`VAR로`, `PowerScore 계산` — PowerScore takes a space since it's a distinct
  compound noun, not a particle-suffixed word)
- zh_CN / zh_TW: bare verb+object, double ellipsis `……` (two U+2026 chars, not one),
  space inserted around embedded Latin tokens (`跟 VAR 核实……`, `PowerScore 的数据`)
- fil: Taglish verb-affix + English loanword noun (`Sina-mute ang ibang tab...`,
  `Kinukwenta ang PowerScore...`), matches [[locale_fil_terminology]]'s established
  register — sport/tech loanwords kept English, native affixes carry the grammar

**Localization swaps made per the "joke must land" brief** (English source and
per-locale substitution, with reasoning):
- `m77` "Checking with VAR" — kept `VAR` as a bare acronym in *every* locale
  including ja/ko/zh/fil. Confirmed this is the real term broadcasters use in each
  market (not a calque), not just a fallback for "no equivalent". Gender assigned
  where grammatically required: fr `la VAR`, it `il VAR`, es/pt `el/o VAR`, de
  `VAR` (headline-style, no article).
- `m82` "Turning the rally cap inside out" (US baseball superstition, no equivalent
  in most of Europe) — split by actual baseball culture:
  - Kept literal (real baseball-following markets): es (Caribbean/Mexican baseball
    culture — `gorra de la suerte al revés`, matches ESPN Deportes usage), ja, ko,
    zh_TW (NPB/KBO/CPBL all have real baseball fandom)
  - Substituted with "playoff beard" (an NHL/NBA superstition that travels better
    to non-baseball markets and is still authentic, not invented): de
    (`Playoff-Bart`, genuine German ice-hockey-media loanword), fr, it (`barba
    scaramantica` — ties into Italian's real *scaramanzia* superstition
    vocabulary), pt_BR, pt_PT (`barba da sorte` — Brazil/Portugal both have
    meaningful NBA followings even without baseball), zh_CN (`季后赛胡子`)
  - fil: kept the cap image but dropped "rally" specificity since Philippine
    basketball fandom doesn't have the exact ritual — generic "wearing the lucky
    cap backwards" reads fine there.
- `m84` "Refusing to jinx it" — used each language's own actual jinx-avoidance
  idiom rather than calquing "jinx": it `gufare` ("don't be an owl" — real
  colloquial Italian for jinxing), ja `フラグを立てる/回避` (the "flag" concept from
  anime/VN tropes, now mainstream slang for "don't jinx it"), ko `부정 타다`
  (genuine superstition term), zh `不把话说满`/`話說滿` ("don't speak too
  definitively" — a real Chinese saying about jinxing by overconfidence), pt_BR
  `zica` (iconic Brazilian slang for jinx/bad luck), fr `porter la poisse`, es
  `salarlo` (Mexican/Caribbean slang for jinxing, not Spain's `gafar` — chosen
  since `es.json` ships LatAm-flavored Spanish per [[reference_locale_file_format]]).
- `m85` "Arguing in the group chat" — localized to each market's actual dominant
  chat app rather than a generic "group chat": ja → LINEグループ, ko → 카톡방
  (KakaoTalk), pt_BR → "grupo do zap" (WhatsApp slang), zh_TW → LINE群組 (Taiwan's
  actual dominant app, NOT WeChat), zh_CN → 微信群 (WeChat, mainland's actual
  dominant app) — zh_CN/zh_TW deliberately diverge here on real app-usage grounds,
  not just script conversion.
- `m86` "Explaining offsides to a friend" — confirmed pt_BR `impedimento` vs pt_PT
  `fora de jogo` is a genuine lexical split (like the faceoff/first-pitch splits in
  [[project_pregame_gameinfo_translations]]), not laziness — used the correct term
  per variant.
- `m89` "Sniffing out a comeback" — every locale had a real native idiom for
  "sensing/scenting something about to happen" (de `wittern`, fr `flairer`, it
  `fiutare`, es `olfatear`, pt `farejar`, ja `嗅ぎつける`, ko `냄새를 맡다`, zh `嗅到`,
  fil `naaamoy`) — this idiom travels almost universally, unlike most idioms in
  this batch. Comeback noun itself is a genuine per-locale sports term, not
  invented: es/pt_BR `remontada`/`virada`, pt_PT `reviravolta` (diverges from
  pt_BR), ja 逆転, ko 역전, zh 逆转/逆轉. German keeps `Comeback` as a loanword —
  confirmed against the file's own pre-existing `detail.legendComeback` = "Comeback".
- `m91` "Weighing the upsets" — used each locale's real sports-media slang for an
  upset result rather than a literal "surprise": pt_BR `zebra` (iconic Brazilian
  football slang, "deu zebra"), ja `番狂わせ`, ko `이변`, zh `爆冷` — these are
  attested terms, not literal translations of "upset".
- `m92` "Looking for a blowout to leave" — used real colloquial "lopsided game"
  terms: es `paliza`, pt `goleada` (same term in both variants here, unlike most
  football vocabulary in this file), zh_CN `一边倒`, zh_TW `一面倒` + `開溜` (Taiwan
  slang for slipping away/bailing).
- `m96` "High-fiving nobody" — resisted a single universal translation: ja uses
  `ハイタッチ` (its actual native term, NOT `ハイファイブ`), ko uses `하이파이브`
  (the opposite choice from Japanese — Korean really did loan the English term
  directly while Japanese coined its own), it/es have genuine native idioms
  (`fare un cinque`, `chocar los cinco`) so those were used instead of the English
  loanword.
- `m99` "Getting stuck in the turnstile" — pt_BR `catraca` vs pt_PT `torniquete`
  and zh_CN `检票口` vs zh_TW `剪票口` are both genuine regional-equipment-name
  splits, not inconsistency.

**Proprietary terms**: `PowerScore` (m93) kept untranslated verbatim in all 11
locales, consistent with every other namespace in this file.

Related: [[reference_locale_file_mechanics]], [[reference_cjk_punctuation_and_spacing]],
[[project_pregame_gameinfo_translations]], [[locale_fil_terminology]],
[[project_ko_terminology]], [[terminology_it]], [[project_zh_tw_terminology]]
