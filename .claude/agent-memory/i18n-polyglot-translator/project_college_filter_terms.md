---
name: project-college-filter-terms
description: 2026-10-02 collegeFilter namespace (NCAA division/conference picker) across 11 locales; per-locale division/conference terms and the "our scouts" joke rendering
metadata:
  type: project
---

`collegeFilter.*` (19 keys, last top-level key in every locale file) translated 2026-10-02. Script kept at /tmp only; re-derive from the locale files.

**Division:** long form is `Division I/II/III` in de/fil/fr/it, `División` es, `Divisão` pt_BR/pt_PT, `ディビジョンI` ja, `디비전 I` ko, `一级/二级/三级` zh_CN, `第一級/第二級/第三級` zh_TW. `divisionShort` is Latin `D-I/D-II/D-III` in every locale (FBS/FCS never translated).
**Conference:** de/it/fil keep `Conference` (matches existing "Conference Finals" usage); es/fr/pt use conferencia/conférence/conferência; ja カンファレンス; ko 컨퍼런스 (keywords also 콘퍼런스); zh 联盟/聯盟.
**Ranked tile:** `Top {count}` in Latin-script locales, ja `トップ{count}`, ko `상위 {count}`, zh `前 {count} 名`.
**Scouts joke (never names ESPN):** de Scouts kundschaften aus, es ojeadores avistando, fil scout sumisilip, fr éclaireurs + jumelles, it osservatori in appostamento, ja スカウト偵察中, ko 스카우트 염탐, pt_BR olheiros de binóculo, pt_PT olheiros de binóculos / "mãos a abanar", zh 球探举着望远镜.
**pt_PT spelling:** file mixes pre-AO (seleccionada, activar) and AO forms; the new strings avoid both words (escolhido, ligares).
**summaryAll** hardcodes D-I in the English source ("All of D-I"); gender agrees as "la/a D-I" (es/fr/it/pt).
