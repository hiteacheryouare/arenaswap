---
name: project-theme-setting-translations
description: setup.theme/themeDark/themeLight/themeSystem/keywordsTheme (Light/Dark/System toggle, issue #121) across 11 locales, 2026-09-25
metadata:
  type: project
---

Added the Light/Dark/System theme picker's 5 strings for issue #121. Sits between
`keepFinalGamesExplainer` and `finishedTabAction` in every locale (theme/themeDark/
themeLight/themeSystem); `keywordsTheme` sits between `keywordsLeagueOrder` and
`keywordsUpcoming`.

## "Match my system" — per-locale idiom, not a literal transplant

Looked up how real platforms/apps phrase the system-follow option rather than
translating "match my system" word for word — the three-way split (light/dark/
system) is a extremely well-trodden UI pattern with established native phrasing
in every language:

- **zh_CN/zh_TW**: `跟随系统`/`跟隨系統` ("follow the system") — this is Apple's own
  official zh_CN/zh_TW terminology for the setting, near-universal in Chinese apps.
  Also used their platform's light/dark pair: 浅色/深色 (CN), 淺色/深色 (TW).
- **de**: `Systemeinstellung` (system setting) — matches Instagram's German triple
  Hell/Dunkel/Systemeinstellung, kept as a bare noun to stay parallel with the
  one-word Hell/Dunkel options rather than a verb phrase.
- **es**: `Predeterminado del sistema` (system default) — real Android/Chrome ES
  phrasing.
- **fr**: `Comme mon système` (like my system) — chose the more literal/personal
  phrasing over the generic "Utiliser les paramètres système" since it directly
  mirrors the English source's "my system" and fits ArenaSwap's casual voice.
- **it**: `Come il sistema` (like the system) — parallel construction to fr.
- **ja**: `システムに合わせる` (match/align with the system) — real phrase used by
  third-party apps (Slack-style), distinct from iOS's own bare "自動".
- **ko**: `시스템 설정에 따름` (follow system setting) — real Samsung/Android phrasing.
- **pt_BR**: `Padrão do sistema` (system default).
- **pt_PT**: `Seguir o sistema` (follow the system) — verb phrase, no explicit
  pronoun needed, consistent with pt_PT's tu register elsewhere.

**Lesson**: for this specific 3-option UI pattern, prioritize the phrasing users
have actually seen in Chrome/Android/iOS/major apps in that language over
consistency of grammatical form across locales — the ambient convention is
worth more than a matching sentence structure. See
[[project_pregame_gameinfo_translations]] and [[project_open_reveal_translations]]
for the same principle applied to other settings-screen strings.

## fil.json: kept theme/themeDark/themeLight as literal English

Filipino tech users overwhelmingly type/say "Dark Mode"/"Light Mode"/"Theme" in
English even inside otherwise-Filipino app UIs (Messenger PH literally ships
"I-on ang Dark Mode"). Kept `theme`="Theme", `themeDark`="Dark", `themeLight`=
"Light" as literal loanwords, but translated `themeSystem`="Sundin ang sistema"
(follow the system) since that phrase has no equally-dominant English fixed
form. Same split precedent as `holidayDecorations` (fully English) and
`openReveal` (mixed) — see [[locale_fil_terminology]] and
[[project_open_reveal_translations]]. Flagged as a judgment call for Ryan.

## keywordsTheme dedup rule applied

Per the instruction to drop the colors/colours spelling duplicate "where it makes
no sense," also dropped "bright" everywhere it just repeats the locale's own word
for "light" (e.g. es claro covers both light and bright, it chiaro, fr clair,
pt claro) — kept it only where the language actually has a distinct word doing
real search-term work (ja 明るい alongside ライト, ko 밝게 alongside 라이트, since
those really are different tokens users might type).

pt_BR and pt_PT ended up with an identical keywordsTheme string (`tema, aparencia,
modo, escuro, claro, noite, cores, sistema`) — no BR/PT vocabulary split exists
for this particular word set, consistent with `keywordsLeagueOrder` already being
near-identical between the two.

Related: [[reference_locale_file_mechanics]], [[project_open_reveal_translations]],
[[project_settings_drilldown_review]], [[locale_fil_terminology]].
