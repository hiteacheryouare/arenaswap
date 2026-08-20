# i18n Polyglot Translator — Memory Index

- [project_delay_translations.md](project_delay_translations.md) — Approved gameCard.delay / gameCard.delayFallback translations for all 7 non-English locales (2026-07-21)
- [project_shootout_translations.md](project_shootout_translations.md) — Approved gameCard.shootout (PENS badge) translations for all 8 locales incl. pt_PT/pt_BR split (2026-08-03)
- [project_pregame_gameinfo_translations.md](project_pregame_gameinfo_translations.md) — detail.getReady*/detail.info* rulings: hockey/baseball loanwords, pt_PT tu-register, shared kickoff key issue (2026-08-10)
- [reference_locale_file_mechanics.md](reference_locale_file_mechanics.md) — Tabs/CRLF/EOF quirks and the two Cypress width tests + measured px budgets that gate translations
- [project_brand_term_leakage.md](project_brand_term_leakage.md) — Open: "Standby Stream" is translated in es/zh/ja; fr instance fixed 2026-08-15; root cause is en.json's own inconsistent casing
- [project_settings_drilldown_review.md](project_settings_drilldown_review.md) — fr/pt_PT/zh_CN register bugs, German ß-normalize gotcha, label/keyword semantic collisions (2026-08-15)
- [project_fr_fr_ca_split.md](project_fr_fr_ca_split.md) — REVERTED: fr_FR/fr_CA aren't valid extension locale codes; read before proposing any regional variant
- [terminology_it.md](terminology_it.md) — it.json (2026-08-15): verified Italian sport terms, native-vs-loanword rulings, Spaceballs dub quotes
- [project_ko_terminology.md](project_ko_terminology.md) — ko.json (2026-08-15): KBO baseball convention, Konglish-vs-native rulings, shootout=PK fix, unsettled hockey terms
- [locale_fil_terminology.md](locale_fil_terminology.md) — fil.json (2026-08-15): deliberate Taglish calibration, which sports terms stay English and why
- [project_zh_tw_terminology.md](project_zh_tw_terminology.md) — zh_TW.json (2026-08-15): CPBL baseball terms, 你 register, TW-vs-CN software vocabulary, Game Boost consistency fix
- [reference_cjk_prose_vs_heading_split.md](reference_cjk_prose_vs_heading_split.md) — ja/ko/zh_CN/zh_TW already localize "standby stream" in body prose but keep it literal as a heading/label
- [reference_cjk_punctuation_and_spacing.md](reference_cjk_punctuation_and_spacing.md) — full vs half-width punctuation and placeholder-spacing rules per CJK locale
- [reference_locale_status_badge_treatment.md](reference_locale_status_badge_treatment.md) — per-locale literal-vs-translated rule for short uppercase badges like LIVE/WATCHING
- [reference_plural_object_convention.md](reference_plural_object_convention.md) — how each locale fills the {"1":..,"n":"$1 .."} plural-object shape (fil linker, CJK spacing)
- [project_clockstall_penalty_wording_fix.md](project_clockstall_penalty_wording_fix.md) — 2026-08-20: fixed "multiplier"→"flat deduction" mechanic error in tooltipClockStallPenalty across 11 locales, removed dead clockFrozenNote key
