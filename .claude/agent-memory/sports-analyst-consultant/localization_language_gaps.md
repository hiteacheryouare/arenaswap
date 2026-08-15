---
name: localization-language-gaps
description: Ranked recommendation for which locales ArenaSwap is missing given its 31 supported leagues, with league-to-language mapping, negative cases, and terminology hazards per language
metadata:
  type: project
---

Analyzed 2026-08-15 against ArenaSwap's 31-league lineup and 8 shipped locales (en, es, de, fr, ja, pt_BR, pt_PT, zh_CN). Question was purely locale/language gaps, not league additions — no files edited.

## Ranked recommendations (highest value first)

1. **Italian (`it`)** — Serie A is directly supported with zero home-market locale coverage. Cleanest gap: every other Big-5 league (EPL/en, La Liga/es, Bundesliga/de) already has its home-market locale shipped; Italy is the outlier. No regional variant needed (Italian soccer broadcast language is centralized).
2. **Korean (`ko`)** — MLB + WBC + Olympic Baseball, secondary NBA. Korean-American population hit 2.21M in 2024 (+9% YoY, now 5th-largest Asian-American group, fastest-growing of top 5 per AAPI Data/Census). South Korea is a WBC powerhouse (WBSC top-2 tier). No regional variant needed.
3. **Arabic (`ar`, MSA)** — FIFA World Cup / Women's World Cup / Olympic Soccer, plus MENA reach into EPL/La Liga/Serie A/UCL via beIN Sports. Qatar 2022 final drew 242.8M viewers = 68% of MENA's adult population (beIN, 5.4B cumulative tournament views). Largest population of any gap (~420M Arabic speakers) but also the highest lift: recommend single MSA locale (not dialect-fragmented — mirrors how Arabic sports broadcast media already works), and RTL/bidi layout is an engineering task, not just translation.
4. **Traditional Chinese / Taiwan split (`zh_TW`)** — not a new language, a hidden gap inside `zh_CN`. Direct match: WBC + Olympic Baseball. Baseball is Taiwan's national sport (Chinese Taipei ranked #2 by WBSC, won 2024 Premier12); mainland China has ~no baseball culture and is NBA-driven instead. This is the same structural situation as the existing pt_BR/pt_PT split — traditional vs simplified script is a legibility requirement, not a style choice. Naming sensitivity: IOC/WBSC protocol requires "Chinese Taipei" but fans commonly say "Team Taiwan" (visible at 2026 WBC in Tokyo) — needs an explicit product naming decision before translation, don't let a translator default it.
5. **Filipino (`fil`, not `tl`)** — NBA only (single-league bet, ranked below the multi-sport gaps above). NBA Asia 2022 study: 55% of Filipinos are NBA fans, 98% awareness, 2nd-largest average NBA audience in Asia behind China, largest NBA Facebook following outside the US (8.7M). Use `fil` (the codified national-standard code Google/Meta/Chrome OS use), not raw ISO `tl`. Terminology hazard: Filipino basketball broadcast is heavily Taglish (code-switched with English) — a maximalist full translation of terms like "quarter"/"buzzer-beater" may read as more foreign to the actual audience than leaving common English loanwords in place. Recommend testing a lighter-touch localization before full investment.

## Negative cases — looked obvious, ruled out for this specific league lineup

- **Russian (`ru`)** — NHL Russian star power looks like a driver, but distribution into Russia is complicated by sanctions/Chrome Web Store restrictions, Russian teams face ongoing international competition bans (directly affects Olympic content relevance), and diaspora audience (US/Israel/Baltics) is real but small relative to build cost. Revisit only if geopolitics shift.
- **Hindi / other Indian languages** — Huge population (1.4B) but no cricket in the league list, which is the actual driver of Indian sports fandom. NBA/EPL-following Indian demographic already skews English-fluent/English-media-consuming. Only reconsider if cricket is ever added.
- **Dutch (`nl`)** — No Eredivisie or Dutch-anchored league in the list; players scattered across supported leagues but no concentrated market/diaspora signal.
- **Vietnamese (`vi`)** — Vietnamese-American population is actually large (2.44M, 4th-largest Asian-American group, ahead of Korean-Americans per 2024 Census) with real MLB/NBA diaspora viewership, but no anchoring home-market league like Italy/Serie A or Korea/WBC. Real but below the top 5, not urgent.
- **Polish, Turkish** — Diffuse diaspora interest, no anchoring league. Skip.

## Bonus observation (out of scope of the original question, worth remembering)

`fr` locale currently has no matching French-market league (no Ligue 1 in the 31-league list) — justified today via Quebec/NHL fandom and France's World Cup/UCL interest, but if Ligue 1 is ever added, note Quebec vs. France hockey vocabulary genuinely diverges (Quebec has fully native terms like *mise en jeu* for faceoff; France leans on English loanwords since hockey is niche there) — relevant if `fr` is ever split into `fr_CA`/`fr_FR`.

## Terminology hazard reference (source-language-specific, useful for whoever writes translation prompts)

- **Italian**: Soccer vocab fully native/established (*tempo supplementare*, *recupero*, *rigori*) — don't assume same maturity for hockey (thinner, some native federation terms) or baseball (niche, mixes loanwords like "inning" itself).
- **Korean**: Baseball vocab is a mature mix of native terms + Konglish loanwords transliterated into Hangul — follow existing KBO broadcast convention, don't "purify" into invented native terms fans won't recognize. Ice hockey is the weak spot (low domestic penetration, less settled convention).
- **Arabic**: Soccer vocab fully established in MSA (الوقت بدل الضائع stoppage time, الشوط الإضافي extra time, ركلات الترجيح penalty shootout). Baseball/football/hockey have ~no established native vocabulary since those sports have negligible MENA penetration — translator will face transliteration-vs-paraphrase calls with little precedent; needs explicit guidance to stay consistent across strings.
- **zh_TW**: Strongest native baseball vocabulary of any language here (局 inning, 全壘打 home run, 延長賽 extra innings) via CPBL/international broadcast tradition. Hazard is the Chinese Taipei vs. Team Taiwan naming decision, not vocabulary gaps.
- **Filipino**: Opposite hazard — basketball broadcast is heavily Taglish already; over-translating common English terms (quarter, shooting guard, buzzer-beater) into native Filipino may feel more foreign to the actual audience, not less.
