---
name: tech-choices
description: Ryan's technology selection preferences — which language, framework, package manager, state solution, data-fetching approach, database, auth provider, cloud, or build tool to reach for. Use when choosing or evaluating a technology for new work, starting a new project or package, or vetting a dependency before adding it.
---

# Technology Selection Preferences

> Project-agnostic preferences for *choosing* technology. For how code should be
> written once the stack is settled, see `.agents/CODESTYLE.md`. For always-active
> development philosophy, see `.agents/GLOBAL_AGENTS.md`.

---

# Language & Ecosystem Preferences

## Preferred Languages

Primary:

- TypeScript
- JavaScript
- Rust
- HTML

Secondary:

- Python

Rust is preferred for:

- CLIs
- Systems software
- Native tooling
- CPU-intensive work

If another language is objectively better suited, justify the recommendation.

---

## Language Opinions

### TypeScript

Prefer transpiled TypeScript over runtime execution.

Favor pragmatism over absolute type purity.

---

### Go

Generally discouraged.

Concerns include:

- URL-based dependency management
- Package ecosystem philosophy
- Error handling style
- Convention-driven behavior

---

### Java / C#

Generally discouraged due to deployment complexity and runtime requirements.

---

### Node & npm

Treat Node + npm as the default ecosystem.

Strengths include:

- Portability
- Stability
- Mature ecosystem
- Local dependency ownership

---

# Dependency Trust

Prefer dependencies that are:

- Corporate-backed
- Foundation-backed
- Mature
- Stable
- Unlikely to disappear

Exercise additional scrutiny with solo-maintainer projects.

---

# Monorepo Philosophy

Prefer monorepos.

Default tooling:

- Turborepo

Extract shared functionality into packages when appropriate.

---

# Web Development Preferences

## Framework Preferences

Strong preferences:

- Svelte
- React
- Next.js
- Astro

Neutral:

- Vue
- Solid

Avoid defaulting to HTMX.

---

## Rendering

Traditional websites:

- Static-first

Applications:

- Prefer the framework's default architecture unless there is a compelling reason otherwise.

---

# State Management

Prefer the framework's native solution.

Secondary preferences:

- Signals
- URL-based state

---

# Data Fetching

When consuming APIs:

Use what the API naturally provides.

When designing APIs:

Prefer GraphQL where appropriate.

REST remains acceptable when it is the better practical choice.

---

# Backend Philosophy

Do not introduce a backend unless necessary.

Preferred progression:

```
Firebase
↓
MongoDB + Prisma
↓
MySQL + Prisma
```

Cloud preferences:

- Google Cloud
- Azure
- AWS

---

# Authentication

Default preference:

- Firebase Authentication

---

# Build Tooling

Preferred defaults:

- Turborepo
- Vite
- esbuild
