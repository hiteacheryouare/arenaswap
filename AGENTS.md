# ArenaSwap Agent Instructions
For code style guidelines, read @.agents/CODESTYLE.md

## Overview
ArenaSwap is a cross-browser extension that automatically switches tabs to the most exciting live sports game.

Think NFL RedZone, but across all sports.

Philosophy and Goal:
To become the best, and most feature-packed, all-in-one way to watch sports on the web.

Target users:
- Sports fans watching multiple games simultaneously

---

## 🏗️ Architecture

### Monorepo (Turborepo)

Root structure:
- /apps
	- /extension → actual browser extension (UI + runtime logic)
	- /docs -> the landing page and documentation website for both the extension and npm package
- /packages
	- /powerscore → scoring algorithm
	- /core → core extension engine

### Tech Stack
- React (primary UI framework)
- JavaScript + TypeScript
- WXT (extension framework)
- Bootstrap (structural components + utility styling)
- SCSS (Sass) for everything Bootstrap can't express
- Tailwind (utility styling) — `apps/docs` only; the extension has no Tailwind build
- Jest (testing), Cypress (UI testing & validation)
- npm ONLY (no pnpm, yarn, bun)

---

## Core Values

### Beautiful Design
Everything we create should look beautiful, feel fast, and be intuitive to use. Stay within our design system.

### Power to the User
The products should be data rich, up to date, and accurate to what is happening in the world of sports. The user should feel like they are in control of their experience, and that they can customize it to their liking.

### Fun
Sports are meant to be fun. Product design and copy should be lighthearted, a little tounge-in-cheek, and not take itself too seriously.

### Modern
The tech stack should never fall more than 2 years behind the latest and greatest. We should always be using the best tools available to us, and not be afraid to try new things.

---

## Stuff for AI Agents:

- Skills for you have been provided. Check @.agents/skills
  - When stuck: think "could there be a skill for this", check the skills directory, if yes, use it!
- Validate your changes by testing and linting
- Leverage the power of turborepo and caching
- After every time you change something, update @CHANGELOG.md
- All code changes should be internationalized to every language we support at the moment.
- When opening PRs, Issues, etc via the GitHub API or any access you have to github, ALWAYS add the "robotic" label so we know it was assisted by agents.
- To verify, run my "everything command": `npm run lint test test:e2e build build:edge build:firefox zip zip:edge zip:firefox`


## UI Mistakes to Avoid:
The following are common UI designs spit out by AI agents and are usually discouraged unless approved of by the promptor:
- Pills
- Status Indicators
- Marquees
- Eyebrows
- Tags
- Chips
- Counting sections, specifically 01, 02, 03...

Instead, you must respect the existing design system. Look through the project and trace through how UI is implemented, and do your best to follow the exising brand and design system.

For more info, use the `avoiding-ai-slop` skill.

## Glossary
When working in this project, its important to know how we use certain terms:

- You: the AI agent working on this file
- Us/Me/We: The developer(s) working on the project at Lattice & Company and directing you
- ArenaSwap: the web extension that tracks, ranks, presents, and switches to the best available live sporting game
- PowerScore: the algorithm we designed to take in numerous data points and rank the excitement to watch of a live sports game on a scale of 0-100. Project agnostic and on npm.
- (PowerScore) Signal: one of the CORE data points we use to compose a raw powerscore
- (PowerScore) Boost: a more minor piece of data we use to raise a PowerScore
- (PowerScore) Penalty: a more minor piece of data we use to lower a PowerScore
- Game: a trackable sporting event between two teams that has a score and a progression toward the end of such a game.
- Tab Registry: the system we use to take over and manage the user's tabs.
- Data/API: We source our data from ESPN. For documentation, read [here](https://github.com/pseudo-r/Public-ESPN-API)


## Notes from the maintainer:

I started ArenaSwap during MarchMadness realizing there was no way to watch multiple games at once beyond manually switching between them and muting tabs. This project has blossomed so much since then, and has taken the goal of being the best and most powerful way to watch sports online. I rigorously hand-test it every time I watch sports, and if something isnt good enough for me, its never good enough for anybody else. When doing anything, remember that above all, it is my project, and the community that works on it's project, and you have the responsibility to continue to honor the love that we all put into this project. Make us proud!
