<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../apps/extension/public/images/full_logo_white_on_transparent.svg">
  <img alt="ArenaSwap" src="../apps/extension/public/images/full_logo_black_on_transparent.png" width="320">
</picture>

**Never miss the moment.**

[![Version](https://img.shields.io/badge/version-2.0.0-f97316)](https://github.com/hiteacheryouare/arenaswap/releases)
[![License](https://img.shields.io/badge/license-ISC-3b82f6)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-supported-22c55e?logo=googlechrome&logoColor=white)](https://hiteacheryouare.github.io/arenaswap/)
[![Firefox](https://img.shields.io/badge/Firefox-supported-22c55e?logo=firefox&logoColor=white)](https://hiteacheryouare.github.io/arenaswap/)
[![Edge](https://img.shields.io/badge/Edge-supported-22c55e?logo=microsoftedge&logoColor=white)](https://hiteacheryouare.github.io/arenaswap/)

[![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![WXT](https://img.shields.io/badge/WXT-0.20-7c3aed?logo=firefoxbrowser&logoColor=white)](https://wxt.dev/)
[![Turborepo](https://img.shields.io/badge/Turborepo-monorepo-ef4444?logo=turborepo&logoColor=white)](https://turbo.build/)
[![Node](https://img.shields.io/badge/Node.js-20+-5fa04e?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-10-cb3837?logo=npm&logoColor=white)](https://npmjs.com/)

[Website](https://hiteacheryouare.github.io/arenaswap/) · [Report a bug](https://github.com/hiteacheryouare/arenaswap/issues)

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

- **Auto-Switch** — Jumps to the hottest game every 15 seconds, hands-free
- **PowerScore** — Real-time excitement score built from 5 signals and 6 adjustments
- **Game Boost** — Manually pin any game to keep it on top
- **Standby Stream** — Falls back to a calm tab when all games go quiet
- **Leagues & Favorites** — Enable any of 30+ leagues; star your teams for a built-in PowerScore bonus
- **Private by default** — No account, no tracking, no ads. Scores come directly from ESPN's public API; everything else runs locally

## Install

**[→ hiteacheryouare.github.io/arenaswap](https://hiteacheryouare.github.io/arenaswap/)** — Chrome, Firefox, and Edge

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
