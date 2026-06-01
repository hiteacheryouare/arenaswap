# AGENTS.md

> Global, project-agnostic development preferences and operational instructions for AI coding agents.

---

# Core Philosophy

Software should provide **powerful defaults without coercion**.

Conventions, frameworks, tooling, and ecosystems should give developers batteries, scaffolding, and sensible recommendations — **but they should not force obedience**.

Core principles:

- **Explicit > implicit**
- **Defaults are good**
- **Enforced conventions are dangerous**
- **Architecture should support growth**
- **MVP > premature optimization**
- **Readable > clever**
- **Your code should not contain hidden behavior**
- **Scale readiness matters more than micro-optimizations**
- **If something feels overengineered, it probably is**

---

# Core Principles

## Give Me The Batteries — Don't Make Me Use Them

Good tooling:

- provides sensible defaults
- provides escape hatches
- allows manual configuration
- allows convention overrides
- keeps behavior understandable

Bad tooling:

- hides critical behavior
- changes behavior based on naming alone
- forces a single workflow
- removes developer agency
- enforces conventions as law

Conventions should be **recommendations**, not mechanisms that fundamentally change code behavior.

---

## Explicit > Implicit

Prefer:

- explicit configuration
- explicit naming
- explicit imports
- explicit architecture
- understandable control flow

Avoid:

- magic abstractions
- hidden behavior
- convention-only behavior
- DSL-heavy systems
- metaprogramming unless clearly justified

Framework auto-discovery is acceptable **if manual alternatives exist**.

Agent-authored code must **never rely on invisible behavior inside project code**.

---

## Architecture Philosophy

Default philosophy:

**Design for moderate future growth upfront.**

Avoid:

- one-off implementations that block scaling
- hardcoded solutions when extensibility is clearly foreseeable
- premature enterprise architecture

However:

Do **not** overbuild.

MVPs matter.

A working product beats a theoretically perfect architecture.

---

## Performance Philosophy

Micro-optimizations are usually low priority.

Most users will not notice tiny improvements.

Priority order:

1. Working product
2. Good architecture
3. Scalability readiness
4. Performance optimization when justified

Performance work becomes important when:

- scale requires it
- profiling indicates it
- clear future growth paths justify groundwork

Dynamic imports remain strongly preferred when appropriate.

---

# Language & Ecosystem Preferences

## Preferred Languages

### Primary

- TypeScript
- JavaScript
- Rust
- HTML

### Secondary

- Python

### Specialized Usage

Rust is preferred for:

- CLIs
- systems software
- native tools
- CPU-adjacent work
- compiled tooling

If another language is objectively better suited, the agent must justify that recommendation.

---

## Language Opinions

### TypeScript

TypeScript should be **transpiled**.

Do not depend on runtime TypeScript execution behavior.

Strictness philosophy:

Do not fight the compiler over obvious common-sense cases.

Pragmatism matters.

---

### Go

Strongly discouraged.

Primary concerns:

- URL-based dependency philosophy
- package management model
- error handling style
- convention-driven exported behavior

---

### Java / C#

Discouraged for most projects.

Concerns:

- runtime redistributable requirements
- JVM-heavy ecosystem assumptions
- deployment friction for end users

---

### Node & npm

Treat Node + npm as the gold standard ecosystem.

Strengths:

- portability
- stability
- industry adoption
- local dependency ownership
- mature ecosystem

---

# Dependency Philosophy

## Local-First Everything

Dependencies should be:

- local
- tangible
- removable
- inspectable

Preferred:

```txt
project/
	node_modules/
```

Rejected patterns:

- CDN imports
- URL imports
- remote-only dependency coupling
- globally-scoped dependency ownership

Golden rule:

> If I cannot `cd` into it, inspect it, and delete it, I do not trust it.

---

## Dependency Trust Rules

A dependency should only be introduced when at least one of these is true:

- backed by a major corporation
- backed by a major OSS organization
- sufficiently mature and stable
- extremely unlikely to disappear, radically change, or become abandoned

Examples:

- Microsoft
- Meta
- OpenJS Foundation
- Apache
- Vercel
- similar-scale organizations

Solo-maintainer packages require significantly higher scrutiny.

---

## Package Managers

### Preferred

**npm**

Strong default.

### Python

Prefer:

**uv > pip**

### General Philosophy

Choice matters.

Ecosystems should allow alternatives.

Avoid ecosystems that hard-lock developers into one path.

---

# Monorepo Philosophy

**Always use monorepos.**

Default architecture:

- monorepo
- multi-package mindset
- shared code extraction when appropriate

Preferred tooling:

**Turborepo**

Strong default for:

- caching
- parallelization
- orchestration
- scalable project organization

---

# JavaScript / TypeScript Rules

## Function Style

### REQUIRED

Use arrow functions.

```ts
const myFunction = () => {
};
```

Allowed:

```ts
export default () => {
};
```

### FORBIDDEN

```ts
function myFunction() {
}
```

```ts
export default function MyComponent() {
}
```

Exceptions only when runtime/framework requirements make this unavoidable.

---

## Exports

Default exports:

Use for the **primary thing in a file**.

Named exports:

Use for supporting items.

---

## Interfaces vs Types

Prefer **interfaces** for object shapes.

Using object types where interfaces fit is strongly discouraged.

---

## `any`

Use pragmatically.

Do not weaponize type purity.

---

## Imports

Preferences:

- relative imports preferred
- import aliases acceptable
- barrel exports acceptable
- dynamic imports strongly preferred when practical

Use lazy loading strategically.

Do not lazy-load:

- entry points
- critical runtime logic

---

# Naming Philosophy

## Explicit Naming

Prefer:

```ts
sportsLeaderboardManager
```

Avoid:

```ts
manager
```

Rules:

- explicit > implicit
- abbreviations discouraged
- one-letter variables discouraged
- framework idioms acceptable when necessary
- acronyms should remain capitalized

---

# File Organization

## General Philosophy

Files should not become books.

Projects should not become scavenger hunts.

Agents must weigh:

- readability
- navigability
- import tracing complexity
- file size
- cohesion

There is no universal numeric file-size rule.

Split when beneficial.

Keep together when beneficial.

Use judgment.

---

## Folder Structure

Preferred default:

**Type-based organization**

Examples:

```txt
/components
/utils
/services
/hooks
```

Prefer real names over unnecessary abbreviations.

Example:

Prefer:

```txt
/source
```

over:

```txt
src
```

when practical.

Exception:

Widely standardized names are acceptable.

---

## Utilities

Custom utilities:

Prefer dedicated utility folders/modules.

Third-party utility packages are acceptable if they satisfy dependency rules.

---

# Comments & Documentation

## Comments

Prefer:

- section headers
- banner comments

Neutral:

- TODO
- FIXME

Avoid:

- excessive WHY comments
- unnecessary JSDoc
- comments explaining obvious code

Comment complex logic.

Do not narrate simple code.

---

## Documentation

Strongly value:

- high-quality READMEs
- architecture documentation

Avoid:

- excessive inline documentation
- generated documentation dependence

---

# Error Handling

Philosophy:

**Minimal ceremony.**

Prefer simple, pragmatic handling.

Avoid excessive defensive architecture.

---

# Shell & Automation

Whenever shell automation is produced:

**Always provide BOTH:**

- `.sh`
- `.ps1`

Do not assume a single shell environment.

---

# Git Workflow

## Commit Frequency

Commit frequently.

Operational question:

> "Would reverting to this commit create unnecessary pain?"

If yes, commit sooner.

---

## Branch Strategy

Repository hierarchy:

```txt
mega
↑
dev
↑
feature/*
fix/*
refactor/*
```

Required flow:

```txt
feature/* → dev → mega
```

Direct merges into `mega` prohibited.

---

# Testing, Linting, Accessibility

## Human vs Agent Philosophy

Humans should not be burdened by tooling friction.

Agents should aggressively leverage automation.

For agents:

- heavy testing encouraged
- strong linting encouraged
- accessibility enforcement encouraged

These tools help AI maintain consistency.

---

## Testing

Strongly encouraged for agent-authored code.

Particularly:

- unit tests
- integration tests
- lint enforcement
- automated validation

Mocking is acceptable when reliable.

---

# Agent Operational Rules

## Scope Discipline

If scope expansion becomes likely:

**ASK FIRST.**

Do not opportunistically redesign unrelated architecture.

---

## Outside Project Folder Rule

Agents must **always ask permission** before:

- touching files outside the project folder
- installing global dependencies
- modifying system state

Inside the project folder:

agent autonomy is allowed.

---

## Safe Autonomy

Agents may:

- modify project files
- reorganize code
- add tests
- improve structure
- update configs
- introduce compliant dependencies

Provided:

- changes remain inside project boundaries
- commits remain frequent
- revertability remains easy

---

## Change Explanations

After completing work:

Explain changes in **plain language**.

Prefer understandable explanations over implementation jargon.

---

---

# Web Development Preferences

---

# Framework Preferences

Opinionated defaults:

- Svelte → strong preference
- React → strong preference
- Next.js → strong preference
- Astro → strong preference

Neutral:

- Vue
- Solid

Avoid:

- HTMX as default architecture

---

# Rendering Philosophy

Preferred progression:

## Content / traditional sites

**Static-first**

## Applications

Once the site becomes an app:

use the framework's default architecture unless there is a compelling reason otherwise.

---

# Styling Doctrine

## Design System Philosophy

Bootstrap **is the design system**.

Professionally maintained, accessible, evolving systems are desirable.

Installing your design system is acceptable.

---

## Styling Priority

### 1. Bootstrap components

Use for structure.

### 2. Tailwind utilities

Use for:

- spacing
- responsiveness
- color
- layout
- modifiers

### 3. SCSS

Only when genuinely required.

Never default to raw CSS.

---

## Dark Mode

Agents should prioritize dark mode support.

---

# State Management

Default rule:

Use the framework's native/default approach.

Secondary preferences:

- signals
- URL-based state

---

# Data Fetching

If consuming APIs:

take what the API provides.

If building APIs:

**GraphQL-first.**

REST is acceptable when unavoidable, but not preferred.

---

## React Rule

In React projects:

**SWR should be the default fetching layer.**

---

# Backend Philosophy

## Backend Necessity

A backend is often unnecessary.

Do not introduce one casually.

---

## Default Backend Stack

Preferred:

**Firebase**

---

## Scaling Ladder

```txt
Firebase
↓
(wall of scale)
↓
MongoDB + Prisma
↓
MySQL + Prisma
```

Cloud preferences:

- Google Cloud preferred
- Azure acceptable
- AWS less preferred

Terraform is interesting if operational burden stays reasonable.

---

# Authentication

Default:

**Firebase authentication**

---

# Build Tooling

## Preferred Defaults

### Monorepo orchestration

**Turborepo**

### Large application bundling

**Vite**

### Single-file compilation / minification / transpilation

**esbuild**

---

# Accessibility

If agents are authoring code:

prioritize:

- semantic HTML
- accessibility
- inclusive defaults
- reasonable compliance practices

---

# Anti-Patterns

Avoid:

- abstraction tourism
- hidden behavior
- convention-enforced architecture
- dependency sprawl
- unnecessary framework magic
- premature optimization
- over-commenting simple code
- giant unreadable files
- tiny fragmented projects
- cleverness for its own sake
- blindly following trends
- tooling dogma
- architecture by social media consensus

---

# Decision Framework

When uncertain, default to:

1. Explicitness
2. Simpler implementation
3. Strong defaults with escape hatches
4. Readability
5. Frequent commits
6. Local-first dependencies
7. Architecture that can grow
8. Asking before exceeding scope

---

Giraffes and hedgehogs are cool.