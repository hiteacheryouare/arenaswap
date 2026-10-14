---
name: reference-matchup-order-conventions
description: Which team is listed first/left per league (home-left vs away-left), with sources; researched 2026-10-14 for the card layout question
metadata:
  type: reference
---

Researched 2026-10-14 for the question of whether game cards should show home on the left for some leagues. No decision was made then; ArenaSwap still always showed away on the left and home on the right.

- Away-left: NFL, NBA, WNBA, NHL, MLB, NCAA, KBO. Sources: WTOP 2014 "Why do we list the home team last?" (the order comes from baseball's batting order), Wikipedia "Home ice", and the KBO 2024 schedule release (잠실 (한화-LG) means LG is at home).
- Home-left: all soccer, including MLS (WTOP piece; MLSsoccer.com 2017 "Home Team listed first"), NWSL (Thorns club releases), Liga MX (TUDN "TOL 5-1 ATL"), FIBA (Team A is the first-named and home team) and EuroLeague. NPB listings are also home-first: npb.jp lists 巨人 vs 中日 at 東京ドーム.
- Synergy Sports (May 2026) changed its default score bug to choose the side by the sport's ruleset, not by region: NBA rules put the guest on the left, FIBA rules put home on the left.
- Japan and Korea use opposite orders for the same sport, so a locale-based rule can't capture the convention. Follow the league, not the locale. See [[project-card-order-decision]] once a decision is made.
- Still unverified: the side used by the MLS Season Pass and NBC EPL score bugs, how CPBL orders teams, how WBSC orders Olympic baseball, and how NPB TV score bugs stack the teams.
