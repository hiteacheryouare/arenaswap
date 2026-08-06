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
![WXT](https://img.shields.io/badge/WXT-0.20-FF6B35?logo=googlechrome&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)
[![jest tested](https://img.shields.io/badge/Jest-tested-eee.svg?logo=jest&labelColor=99424f)](https://github.com/jestjs/jest)
![Turborepo](https://img.shields.io/badge/Turborepo-2-EF4444?logo=turborepo&logoColor=white)
![npm](https://img.shields.io/badge/npm-10-CB3837?logo=npm&logoColor=white)

![Version](https://img.shields.io/badge/version-2.0.0-brightgreen)
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
![ESPN API](https://img.shields.io/badge/Data-ESPN%20API-D00000)

</div>

---

ArenaSwap watches every live game across 30+ leagues and automatically switches your browser tab to the most exciting one — powered by **PowerScore**, a real-time excitement algorithm built from closeness, momentum, lead changes, late-game pressure, and comebacks.

<div align="center">
  <img src="../apps/extension/marketing/img/demo-1.png" alt="Live Games view" width="190">
  &nbsp;
  <img src="../apps/extension/marketing/img/demo-3.png" alt="Game Detail and PowerScore Breakdown" width="190">
  &nbsp;
  <img src="../apps/extension/marketing/img/demo-2.png" alt="PowerScore analytics over time" width="190">
</div>

## Features

- **Auto-Switch** — Jumps to the hottest game as fast as every 6 seconds, hands-free
- **PowerScore** — Real-time excitement score built from 5 signals and 6 adjustments
- **Game Boost** — Manually pin any game to keep it on top
- **Standby Stream** — Falls back to a calm tab when all games go quiet
- **Leagues & Favorites** — Enable any of 30+ leagues; star your teams for a built-in PowerScore bonus
- **Private by default** — No account, no tracking, no ads. Scores come directly from ESPN's public API; everything else runs locally

## Development

**Requires:** Node.js 20+, npm 10+

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
| `npm test` | Run all tests |

## Architecture

Turborepo monorepo:

```
apps/
  extension/   → WXT browser extension (React + TypeScript)
  docs/        → Astro landing page
packages/
  core/        → Extension engine
  powerScore/  → Scoring algorithm
```

## License

ISC © [Ryan Mullin](https://github.com/hiteacheryouare) and contributors

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
