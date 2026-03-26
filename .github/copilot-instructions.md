# ArenaSwap Agent Instructions

## Project Context

ArenaSwap is a monorepo with two primary workspaces:
- `packages/core`: Pure TypeScript game data + excitement scoring logic
- `apps/extension`: WXT + React browser extension UI and background orchestration

Primary product goal: automatically switch users to the most exciting live game while keeping behavior understandable and user-controlled.

## Architectural Priorities

1. Keep `@arenaswap/core` deterministic, reusable, and framework-agnostic.
2. Keep extension behavior transparent (no hidden switching logic).
3. Preserve clear separation between scoring logic and browser integration.
4. Prefer explicit, maintainable solutions over clever abstractions.

## Repository Layout

```text
/
├── apps/extension
│   ├── entrypoints/background.ts
│   ├── entrypoints/popup/*
│   ├── assets/*
│   └── wxt.config.ts
├── packages/core
│   ├── src/api-client.ts
│   ├── src/excitement-scorer.ts
│   ├── src/constants.ts
│   └── src/types.ts
├── package.json
└── turbo.json
```

## Commands (run from repo root)

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```

Workspace examples:

```bash
npm run dev --workspace @arenaswap/extension
npm run test --workspace @arenaswap/core
npm run build --workspace @arenaswap/core
```

## Coding Rules

- Use TypeScript-first patterns.
- Prefer arrow functions for new code.
- Keep functions short and purpose-driven.
- Use named constants for thresholds/weights.
- Avoid introducing runtime dependencies unless clearly justified.
- Keep browser API usage isolated to extension workspace.

## Extension-Specific Guidance

- Respect user preferences (`enabled`, `sensitivity`, `cooldownSeconds`).
- Persist state in correct storage scope (`sync`, `session`, `local`).
- Ensure tab-switch behavior remains understandable in UI.
- For popup changes, preserve readability on constrained width.

## Core Package Guidance

- Keep scoring logic deterministic and easy to test.
- Export stable types and interfaces.
- Avoid side effects in utility/scoring functions.
- Keep API parsing defensive and explicit.

## Validation Expectations

Before finishing a change:
1. Run `npm run typecheck`
2. Run `npm run test`
3. Run `npm run build`
4. For UI/behavior changes, verify extension flow manually

If existing checks fail before your change, record that clearly and avoid unrelated fixes unless requested.
