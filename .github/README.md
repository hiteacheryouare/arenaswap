<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../apps/extension/public/images/full_logo_white_on_transparent.svg">
  <img alt="ArenaSwap" src="../apps/extension/public/images/full_logo_black_on_transparent.png" width="320">
</picture>

<br />

**Never miss the moment.**

<br />

[![Available in the Chrome Web Store](https://developer.chrome.com/static/docs/webstore/branding/image/UV4C4ybeBTsZt43U4xis.png)](https://chromewebstore.google.com/detail/arenaswap/gibojibgihombdmmfnhnimajppamfeee)&nbsp;&nbsp;[![Get the Add-on](https://extensionworkshop.com/assets/img/documentation/publish/get-the-addon-178x60px.dad84b42.png)](https://addons.mozilla.org/addon/arenaswap/)&nbsp;&nbsp;[![Get it from Microsoft](https://img.shields.io/badge/Get%20it%20from-Microsoft%20Edge%20Addons-0078D4?logo=microsoftedge&logoColor=white)](https://microsoftedge.microsoft.com/addons/detail/arenaswap/oeballpnidkinkcbjokogdgjckdjeeba)

<br />

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2023-F7DF1E?logo=javascript&logoColor=black)
![WXT](https://img.shields.io/badge/WXT-0.21-FF6B35?logo=googlechrome&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)
[![jest tested](https://img.shields.io/badge/Jest-tested-eee.svg?logo=jest&labelColor=99424f)](https://github.com/jestjs/jest)
![Turborepo](https://img.shields.io/badge/Turborepo-2-EF4444?logo=turborepo&logoColor=white)
![npm](https://img.shields.io/badge/npm-12-CB3837?logo=npm&logoColor=white)

![Version](https://img.shields.io/badge/version-2.2.0-brightgreen)
![License](https://img.shields.io/github/license/hiteacheryouare/arenaswap)
![Stars](https://img.shields.io/github/stars/hiteacheryouare/arenaswap?logo=github)
![Forks](https://img.shields.io/github/forks/hiteacheryouare/arenaswap?logo=github)
![Issues](https://img.shields.io/github/issues/hiteacheryouare/arenaswap?logo=github)
![Last Commit](https://img.shields.io/github/last-commit/hiteacheryouare/arenaswap?logo=git&logoColor=white)

![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Firefox](https://img.shields.io/badge/Firefox-Add--On-FF7139?logo=firefoxbrowser&logoColor=white)
![Edge](https://img.shields.io/badge/Edge-Extension-0078D4?logo=microsoftedge&logoColor=white)
![Leagues](https://img.shields.io/badge/Leagues-31-1DB954?logo=sportify&logoColor=white)
![PowerScore](https://img.shields.io/badge/Powered%20by-PowerScore-orange)

</div>

---

ArenaSwap watches every live game across 31 leagues and automatically switches your browser tab to the most exciting one — powered by **PowerScore**, a real-time excitement algorithm built from closeness, momentum, lead changes, late-game pressure, and comebacks.

<div align="center">
  <img src="../apps/extension/marketing/img/demo-live-games.png" alt="Live Games view" width="150">
  &nbsp;
  <img src="../apps/extension/marketing/img/demo-game-detail-nfl.png" alt="NFL game detail with drive chart and PowerScore Breakdown" width="150">
  &nbsp;
  <img src="../apps/extension/marketing/img/demo-game-detail-mlb.png" alt="MLB game detail with at-bat matchup and PowerScore Breakdown" width="150">
  &nbsp;
  <img src="../apps/extension/marketing/img/demo-box-score.png" alt="Box score with scoring by inning and batting lines" width="150">
  &nbsp;
  <img src="../apps/extension/marketing/img/demo-analytics.png" alt="PowerScore analytics over time" width="150">
</div>

## Features

- **Auto-Switch** — Rescores every live game as often as every 12 seconds, then switches to the best one and unmutes it
- **PowerScore** — Real-time 0–100 excitement score built from 5 signals and 6 adjustments; switch off a signal you disagree with and the rest renormalize
- **Guide** — A full-day timeline of every game with a heat curve, so you can see the good windows before they arrive
- **Game detail** — Box score, standings, win probability, and PowerScore charted over time, plus the live at-bat, drive, and latest play
- **Tab suggestions** — Spots the game streams already open in your tabs and offers to assign them for you
- **Up Next** — Shows games up to 14 days out so you can assign tabs before kickoff
- **Game Boost** — Manually pin any game to keep it on top
- **Standby Stream** — Falls back to a tab you choose when every game goes quiet
- **Leagues & Favorites** — Enable any of 31 leagues across 6 sports; star your teams for a built-in PowerScore bonus
- **Tuning** — Sensitivity, switch cooldown, switch delay, postseason weighting, and optional switch notifications
- **12 languages** — English, Spanish, French, German, Italian, Portuguese (BR and PT), Japanese, Korean, Filipino, and Chinese (Simplified and Traditional)
- **Private by default** — No account, no tracking, no ads. Scores come directly from ESPN's public API; everything else runs locally

## Development

**Requires:** Node.js `^22.9 || ^24 || >=26`, npm 11+

```bash
git clone https://github.com/hiteacheryouare/arenaswap
cd arenaswap
npm install
npm run dev
```

Load `apps/extension/.output/chrome-mv3-dev/` as an unpacked extension in your browser.

| Command | Description |
|---|---|
| `npm run dev` | Chrome dev server with hot reload |
| `npm run build:all` | Production build for Chrome, Firefox, and Edge |
| `npm run zip:all` | Zip all three for store submission |
| `npm test` | Unit and component tests |
| `npm run test:e2e` | End-to-end tests against a built popup |
| `npm run lint` | Lint every workspace |
| `npm run typecheck` | Type-check every workspace |

## Architecture

Turborepo monorepo:

```
apps/
  extension/   → WXT browser extension (React + TypeScript)
  docs/        → Astro site — docs, PowerScore reference, releases, FAQ, legal, in 12 locales
packages/
  core/        → Extension engine
  powerscore/  → Scoring algorithm, published to npm as powerscore
  ui/          → Components shared by the extension and the site
```

## License

ISC © [Ryan Mullin](https://github.com/hiteacheryouare), [Lattice & Company](https://github.com/latticeandcompany), and contributors

---

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/latticeco-white.png">
  <img alt="Lattice &amp; Company" src="assets/latticeco-black.png" width="240">
</picture>

<br />
<br />

<sub>ArenaSwap is a <a href="https://latticeandcompany.github.io">Lattice &amp; Company</a> project, built and maintained by <a href="https://hiteacheryouare.github.io">Ryan Mullin</a>.</sub>

</div>
