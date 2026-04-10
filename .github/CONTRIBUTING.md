# ArenaSwap Contribution Guidelines

These guidelines define the standards for contributing to the ArenaSwap monorepo:
- `packages/core` (excitement scoring engine + ESPN client)
- `apps/extension` (WXT + React browser extension)

Non-compliant contributions may be rejected.

## Repository Architecture

ArenaSwap is organized as:

```text
/
├── apps/extension
├── packages/core
├── turbo.json
└── package.json
```

Turbo build/test/typecheck tasks are run from the repository root.

## Governance Model

This repository is maintainer-governed.

Maintainers retain final authority on:
- Merge approvals
- Branch protections
- Release timing
- Access control
- Policy updates

Contribution does not grant governance rights.

## Branching & PR Policy

### Branch hierarchy
- `mega` → integration/stable branch
- `feature/*`, `fix/*`, `refactor/*` → contribution branches

### Required flow

All changes should follow:

`feature/* (or fix/*) → mega`

### Feature branch expectations
- Start from latest `mega`
- Keep scope focused
- Avoid unrelated refactors
- Name branches clearly (`feature/popup-score-legend`, `fix/tab-switch-loop`)

## Development Setup

Prerequisites:
- Node.js 25+
- npm 10+

Install:

```bash
npm install
```

Core commands (root):

```bash
npm run dev
npm run typecheck
npm run test
npm run build
```

Workspace commands:

```bash
npm run dev --workspace @arenaswap/extension
npm run build --workspace @arenaswap/core
npm run test --workspace @arenaswap/core
npm run test:unit --workspace @arenaswap/core
npm run test:e2e --workspace @arenaswap/core
```

## Code Standards

Formatting and style should follow repository conventions:
- Tabs for indentation
- Single quotes
- Semicolons required
- camelCase for identifiers and utility file names
- Prefer small, purpose-focused modules

Function policy:
- Prefer arrow functions for new code
- Avoid large all-in-one modules

## Package-Specific Standards

### `packages/core`
- Keep logic deterministic and testable.
- Avoid browser-only APIs.
- Keep exported types stable and well-scoped.
- Place parsing/scoring logic in reusable helpers.

### `apps/extension`
- Keep popup UI responsive and readable.
- Preserve compatibility with extension APIs and WXT conventions.
- Avoid hidden behavior that switches tabs without visible user control.
- Keep user preference storage explicit (`sync`, `session`, `local` as intended).

## Dependency Policy

Use project-scoped dependencies only.

Allowed:
- Workspace-local npm dependencies

Avoid:
- Unnecessary dependency additions
- Remote runtime imports
- Tooling bloat without clear value

## Testing & Validation Requirements

Before opening a PR, run:

```bash
npm run typecheck
npm run test
npm run build
```

If any check fails, include context in the PR and explain why.

## Pull Request Requirements

PRs must:
- Target `mega`
- Be focused in scope
- Include clear summary and rationale
- Include screenshots/video for popup UI changes when relevant
- Note any API changes in `@arenaswap/core`

Maintainers may request changes or close PRs that do not align with project direction.

## Commit Guidance

Use concise, descriptive commit titles.

In commit bodies (when useful), include:
- What changed
- Why it changed
- Any tradeoffs or follow-up work

## Security & Responsible Disclosure

Do not publicly post exploitable extension/browser security details before maintainers have a chance to respond.

Report security-sensitive issues privately through maintainer contact channels when available.
