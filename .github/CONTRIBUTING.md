# ArenaSwap Contribution Guidelines


This document defines the mandatory standards for contributing to the ArenaSwap monorepo, which contains:
- `apps/extension`: the WXT browser extension for Chrome, Firefox and Edge
- `apps/docs`: the Astro website (docs, PowerScore reference, releases, FAQ and legal pages, in 12 locales)
- `packages/core`: the extension engine (data fetching, polling, tab switching)
- `packages/powerscore`: the PowerScore live sports excitement algorithm, published to npm as `powerscore`
- `packages/ui`: React components and styles shared by the extension and the website

This project operates under a centralized governance model, strict architectural standards, a controlled branching system (feature/* → dev → mega), and explicit formatting and dependency rules.

Non-compliant contributions will be rejected.

Method / Reasoning

These guidelines exist to:
- Preserve long-term extensibility
- Protect production stability for extension users across three browser stores
- Maintain deterministic Turbo builds
- Prevent architectural decay
- Enforce formatting and style uniformity
- Protect the website deployed from `mega`
- Safeguard the integrity of the published `powerscore` npm package

This is not a consensus-driven repository. Final authority rests with maintainers.


## Governance Model

This repository operates under centralized maintainership.
- **Owner:** Lattice & Company
- **Primary Maintainer:** Ryan Mullin

Maintainers retain unilateral authority over:
- Merge approvals
- Branch protections
- Release timing
- npm publishing
- Browser store submissions
- Website deployment
- Contributor access

Contribution does not grant governance rights.

## Branching Policy (Mandatory)

### Branch Hierarchy

The repository uses a controlled branching structure:
- mega → Production-ready branch
- dev → Integration branch
- `feature/*` , `fix/*` , `refactor/*` → Individual development branches


### Required Merge Flow

All work must follow:

`feature/* → dev → mega`

Direct merges into mega are prohibited.

Pull Requests must target dev.


### Feature Branch Rules

Feature branches must:
- Be created from dev
- Be singular in scope
- Avoid unrelated changes
- Remain focused and clean

Naming examples:

- `feature/add-more-sports`
- `fix/scoreboard-parsing`
- `refactor/ui-refactor`


### Promotion to mega

dev may only be merged into mega when:
- Lint passes
- Type checking passes
- Unit, component and end-to-end tests pass
- Full Turbo build succeeds for Chrome, Firefox and Edge
- Manual QA checklist completed
- No runtime regressions
- No performance degradation
- No architectural violations

Promotion is typically performed solely by Ryan Mullin.

Pushing to mega redeploys the website through `.github/workflows/docs.yml`.

This is not a voting process.


### Emergency Policy

If mega is compromised:
- Immediate revert
- Root cause identification
- Patch in dev
- Re-validation
- Controlled re-promotion

Hotfix authority remains with maintainers.


## Development Setup

Prerequisites
- Node `^22.9.0 || ^24.0.0 || >=26.0.0`
- npm 11 or newer (the repository pins `npm@12.1.0` through `packageManager`)
- No global installs unless unavoidable

Install

```bash
npm install
```

Development (Turbo)

```bash
npm run dev
```

Load `apps/extension/.output/chrome-mv3-dev/` as an unpacked extension.

## Verification (Mandatory)

Every pull request must pass the full verification command, run from the repository root:

```bash
npm run lint typecheck test test:e2e build build:edge build:firefox zip zip:edge zip:firefox
```

Run it from the root. Running workspace type checks from inside a subfolder can trip path-casing errors.

> [!WARNING]
> `docs/` at the repository root is tracked build output. `test`, `typecheck` and `zip` rebuild it from your working tree. Check `git status` before staging and do not commit a rebuild that captured unrelated changes.

## Formatting & Code Standards (Non-Negotiable)

Linting is enforced with oxlint, configured in `.oxlintrc.json` at the repository root. The full code style lives in `.agents/CODESTYLE.md`.

Mandatory rules:
- Tabs for indentation
- CRLF line endings (enforced by `.gitattributes`)
- Single quotes '
- Semicolons required
- camelCase naming for all identifiers
- camelCase file names, except files whose names are required by a framework or tool (`package.json`, `wxt.config.ts`, `AGENTS.md`, …)
- Interfaces over object `type` aliases

## Function Declaration Policy

Allowed:

```js
const myFunction = () => {
	// body
};

export default () => {
	// component
};
```

Forbidden:

```js
function myFunction() {}
export default function MyComponent() {}
```

Arrow functions only, unless the language, runtime or framework requires otherwise.

## Application Standards (apps/extension, apps/docs, packages/ui)

### Framework
- React for the extension popup, the Guide and the website's interactive islands
- Astro for the website
- TypeScript for business logic, helpers and complex components
- JavaScript for small, simple components

### Component Size
- Split a component when it gets hard to follow
- Move business logic out of components whenever practical
- Keep components focused and maintainable


### Styling Policy (Mandatory)
- `apps/extension` and `packages/ui` → Bootstrap components and utilities, plus SCSS
- `apps/docs` → Bootstrap, SCSS and TailwindCSS utilities
- Tailwind is compiled only in `apps/docs`. A Tailwind class in the extension does nothing.
- The popup and `packages/ui` support both light and dark themes. The website is dark only
- Motion uses the shared tokens in `packages/ui/src/_motion.scss` and `packages/ui/src/motion.ts`, and respects reduced motion
- `.scss` only (no `.sass`, no application `.css` beyond the website's Tailwind entry)

### Prohibited:
- External UI libraries (MUI, Chakra, shadcn, headlessui, etc.)
- Alternative CSS frameworks
- Custom component libraries outside `packages/ui`


## Internationalization (Mandatory)

The extension and the website ship in 12 locales: de, en, es, fil, fr, it, ja, ko, pt_BR, pt_PT, zh_CN and zh_TW.

- Every user-facing string goes through i18n. No hard-coded copy.
- A new or changed string must be updated in all 12 locale files in the same pull request.
- Extension strings live in `apps/extension/locales/`. Website strings live in `apps/docs/src/i18n/strings/`.


## Dependency Philosophy

Local-first, project-scoped dependency management only.

Allowed:
- Local npm installs
- Tangible node_modules

Prohibited:
- CDN imports
- URL-based package imports
- Forced remote coupling
- Global-only dependency reliance

Prefer mature, well-supported packages over niche ones.

> [!WARNING]
If it cannot be deleted with rm -rf, it does not belong here.


## Testing Policy

The test stack:
- **Jest** (through `@swc/jest`) for unit tests in every package and in `apps/extension`
- **Cypress component tests** for popup and shared UI components (`npm test` in `apps/extension`)
- **Cypress end-to-end tests** against a built popup and the website (`npm run test:e2e`, kept outside `npm test`)

Do not introduce another test framework.

Manual testing is still required for anything that touches live games. Maintainers hand-test against real games before release.

If a change breaks functionality:
- Revert
- Attempt alternative solution
- Keep it simple

## Pull Request Requirements

All PRs must:
- Target `dev`
- Pass the full verification command
- Add an entry to `CHANGELOG.md`: two or three sentences under one heading, nothing else
- Update all 12 locales for any user-facing string
- Include screenshots for visible UI changes
- Remain focused in scope
- Avoid opportunistic refactors

PRs, issues and comments written with an AI agent must carry the `robotic` label and open with:

```md
> [!NOTE]
> This content was created by an AI agent acting on behalf of <your name>.
```

PRs may be closed without merge.

Maintainer decisions are final.


## Commit Policy

Commit frequently.

### Commit Title
- Short
- Clear
- Plain English, no `feat:` / `fix:` prefixes
- Emoji permitted

### Commit Body

Must be:
- Detailed
- Explicit
- Long-form
- Reference issues, PRs, contributors, files changed

Superficial commit messages will be rejected.


## Prohibited Contributions

The following will be rejected:
- Overengineering
- Magic abstractions
- Dependency creep
- Additional testing frameworks
- External UI libraries
- Raw CSS overuse
- Hardcoded architecture
- oxlint violations
- Hard-coded, untranslated copy
- Breaking light or dark mode
- Direct mega merges

Repeated violations may result in access removal.


## Stability Philosophy
- mega protects production users and npm consumers.
- dev absorbs risk.
- Feature branches isolate change.
- Architecture is preserved deliberately.

This structure is enforced.


## Final Authority Clause

ArenaSwap and its maintainers reserve full discretion over:
- Branch protections
- Merge approvals
- Release timing
- Contributor access
- Policy modification

Participation in this repository constitutes acceptance of these guidelines.
