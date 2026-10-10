---
name: project-store-listing-kword-stuffing-fix
description: 2026-09-05 rewrite of the SUPPORTED LEAGUES section in all 12 desc_long.md files (bulleted league list -> 3 prose paragraphs) to fix a store keyword-stuffing flag
metadata:
  type: project
---

Commit 934055c ("avoid kword stuffing") replaced the English `apps/extension/marketing/desc_long.md`
SUPPORTED LEAGUES section — a heading, five emoji-bulleted per-sport lines spelling out every league
abbreviation (31 leagues total), and a closing "Six sports. 31 leagues..." line — with three short
prose paragraphs that describe the same coverage without enumerating every league name. A browser
store review had flagged the old version as keyword stuffing. I applied the equivalent change to all
11 translated copies (de, es, fil, fr, it, ja, ko, pt_BR, pt_PT, zh_CN, zh_TW). See also
[[project_store_listing_translations]] for the original store-listing translation pass this builds on.

**No em dash anywhere in any locale's desc_long.md.** The English replacement uses an em dash inside
the coverage paragraph ("...Olympic levels — the NBA and WNBA..."). None of the 12 marketing files use
em dashes anywhere, in any language (confirmed by grep across all locales) — they use periods or
colons for asides instead. So every translation splits that clause into its own full sentence rather
than importing the dash. This is a stronger signal than the general CJK-only em-dash avoidance noted
in [[reference_cjk_punctuation_and_spacing]] — it applies to the Latin-script marketing locales too,
specifically in this file.

**"Professional / college / Olympic" level terms used per locale**, since the new prose describes
levels generically instead of naming NCAA per bullet: de "Profi- / College- / Olympia-", es
"profesional / universitario / olímpico", fil "propesyonal / kolehiyo / Olympics" (kept in English),
fr "professionnel / universitaire / olympique", it "professionistico / universitario / olimpico", ja
"プロ / 大学 / オリンピック", ko "프로 / 대학 / 올림픽", pt_BR "profissional / universitário /
olímpico", pt_PT same word forms but pre-AO90 spelling elsewhere in the file, zh_CN "职业 / 大学 /
奥运会", zh_TW "職業 / 大學 / 奧運". "College" has no established prior translation in these files
(NCAA was always left as a literal untranslated abbreviation in the old bulleted lists), so these are
new coinages — reasonable ones, but worth another look if "college" shows up as a first-class term
elsewhere later.

**Reused each locale's own already-established toggle/closing phrase** rather than translating the
English sentence fresh, since every file already had a semantically identical "Six sports. 31
leagues. Toggle any of them on or off." line that the commit deleted — e.g. es kept "Activa o
desactiva cualquiera de ellas", fr kept "activer/désactiver chacune d'entre elles", zh_TW kept its
own established "自行開關" (self-toggle) verb from the deleted line rather than the "单独开启或关闭"
phrasing zh_CN uses — the two Chinese variants use different verbs for the same idea and I kept both
as-is rather than harmonizing them.

**fr/es/it/pt_BR/pt_PT all have the same two-words-one-root ambiguity**: "football" (soccer) vs.
"football américain"/"fútbol americano"/"football americano"/"futebol americano" (American football).
The English source names both sports as separate items in one sentence ("basketball, football,
hockey, baseball and softball ... This also includes soccer"), so in these five locales I had to be
careful to keep "football américain" (etc.) for the first mention and the bare, unmodified word for
the soccer sentence — never let the qualifier drop and never let the bare word appear in the
professional/college/Olympic list where it would misread as soccer.

**Structural template used for all 11**, matching the English replacement 1:1 in shape: paragraph 1 =
one sentence (monitors N leagues, toggle), paragraph 2 = 3 sentences merged into a single paragraph
(sport list at three levels; named leagues + college/international counterparts; soccer's own
range), paragraph 3 = one sentence (watch what you follow, or turn it all on). Verified via `git
diff --stat` that every locale shows exactly `17 lines removed, 3 lines added`, matching the shape of
the English commit, and that blank-line spacing on both sides of the replaced block was left
untouched (it was not part of this commit's diff either).
