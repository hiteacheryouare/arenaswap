# ArenaSwap Agent Instructions

BEFORE YOU READ, PLEASE ALSO READ @.agents/GLOBAL_AGENTS.md FOR MORE GENERAL, ALWAYS ACTIVE DEVELOPMENT PHILOSOPHIES AND PREFERENCES.
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
	- /powerScore → scoring algorithm
	- /core → core extension engine

### Tech Stack
- React (primary UI framework)
- JavaScript + TypeScript
- WXT (extension framework)
- Tailwind (utility styling)
- Bootstrap (structural components)
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


## Notes from the maintainer:

I started ArenaSwap during MarchMadness realizing there was no way to watch multiple games at once beyond manually switching between them and muting tabs. This project has blossomed so much since then, and has taken the goal of being the best and most powerful way to watch sports online. I rigorously hand-test it every time I watch sports, and if something isnt good enough for me, its never good enough for anybody else. When doing anything, remember that above all, it is my project, and the community that works on it's project, and you have the responsibility to continue to honor the love that we all put into this project. Make us proud!
