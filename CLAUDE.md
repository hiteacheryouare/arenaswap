# ArenaSwap Agent Instructions

BEFORE YOU READ, PLEASE ALSO READ @.agents/GLOBAL_AGENTS.md FOR MORE GENERAL, ALWAYS ACTIVE DEVELOPMENT PHILOSOPHIES AND PREFERENCES.

## 🧠 Project Overview
ArenaSwap is a browser extension that automatically switches tabs to the most exciting live sports game.

Think NFL RedZone, but across all sports.

Core idea:
- Monitor multiple live games
- Score them using the PowerScore algorithm
- Automatically surface the most exciting one

Target users:
- Sports fans watching multiple games simultaneously

---

## 🏗️ Architecture

### Monorepo (Turborepo)

Root structure:
- /apps
	- /extension → actual browser extension (UI + runtime logic)
- /packages
	- /powerScore → scoring algorithm
	- /core → core business logic

### Tech Stack
- React (primary UI framework)
- JavaScript + TypeScript (hybrid rules below)
- WXT (extension framework)
- Tailwind (utility styling)
- Bootstrap (structural components)
- Jest (testing)
- npm ONLY (no pnpm, yarn, bun)

---

## ⚙️ Language Rules

### React + TS Usage
- Use TypeScript for:
	- Helper functions
	- Complex components
	- Business logic

- Use JavaScript ONLY when:
	- No props
	- Highly reusable
	- No need for type safety

---

## 🧩 Code Style (STRICT)

### Formatting
- Indentation: TABS
- Line endings: CRLF (Windows)
- Quotes: SINGLE quotes only
- Semicolons: ALWAYS required

### Naming (GLOBAL)
Use camelCase for code you author:
- Variables → myVariable
- Functions → myFunction
- Constants → myConstant (NOT UPPERCASE)
- Files → myComponent.ts / myComponent.jsx (default)

Practical exceptions (required):
- Keep framework/tool-required filenames exactly as required (for example: package.json, package-lock.json, turbo.json, tsconfig*.json, wxt.config.ts).
- Keep standards/integration-required filenames exactly as required (for example: AGENTS.md, CLAUDE.md, .github/copilot-instructions.md).
- Never rename required entrypoint/config filenames just to force camelCase.

---

## 🔧 Function Rules (CRITICAL)

### ✅ Allowed
```js
const myFunction = () => {};
export default () => {};

❌ Forbidden

function myFunction() {}                // NEVER
export default function MyComp() {}    // NEVER
```

⸻

## ⚛️ React Rules
	•	File name MUST match component name
	•	Max 200 lines per component
	•	If >200 lines → split into smaller components
	•	Move non-React logic OUT of components

Exception:
	•	Reactive/component-critical logic can stay

⸻

## 🎨 Styling Rules (MANDATORY)

### ⚠️ STYLING PRIORITY (CRITICAL — NO EXCEPTIONS)

All UI MUST be styled in this exact order of preference. Treat each step as a hard gate: you may only fall through to the next step after honestly exhausting the previous one.

	1.	**Customized Bootstrap prebuilt components** (FIRST CHOICE)
		•	Use Bootstrap's prebuilt components (modal, card, navbar, nav, form-select, btn, alert, spinner, etc.) for structure.
		•	Customize via the existing Bootstrap variable overrides in `bootstrap.scss` — DO NOT write new SCSS to re-skin a component.
	2.	**Tailwind utility classes** (SECOND CHOICE — used to modify the Bootstrap base)
		•	Layer Tailwind utilities on top of Bootstrap markup to handle spacing, color, typography, sizing, responsive breakpoints, and dark mode.
		•	If a class doesn't exist as a single utility, CHAIN multiple Tailwind utilities together before considering anything else. Long Tailwind chains are explicitly preferred over even one line of raw SCSS.
		•	Use `text-[0.6rem]`, `w-[3.5rem]`, etc. for arbitrary values — Tailwind v4 supports arbitrary values inline; reach for these before custom SCSS classes.
	3.	**Raw SCSS** (LAST RESORT — only when 1 and 2 are genuinely impossible)
		•	Only allowed for highly complex situations a combination of Bootstrap + Tailwind cannot possibly express: keyframe animations, complex `@media (prefers-reduced-motion)` rules, deeply nested pseudo-element trees, font-face declarations, attribute selectors (`[data-foo='bar']`), sibling-combinator spacing, and **any rule that needs to override a property Bootstrap also sets on the same element** (see Tailwind v4 caveat below).
		•	Before writing SCSS, you MUST first attempt Tailwind chains. If you cannot articulate why Tailwind chains fail, do not write SCSS.

**⚠️ Tailwind v4 + Bootstrap cascade caveat (READ THIS):** Tailwind v4 emits its utilities inside `@layer utilities`, while Bootstrap's rules are unlayered. **Unlayered rules always beat layered rules in CSS regardless of source order**, so a Tailwind utility CANNOT override a property Bootstrap sets on the same element (color on `.btn`/`.btn-link`/spinners, font-size on `.btn-sm`, etc.). Tailwind utilities still work for properties Bootstrap doesn't touch (spacing, layout, custom colors on non-Bootstrap elements). When you need to override a Bootstrap-set property, fall through to **SCSS as a step-2 fallback**, not step-3 — this is the documented exception.

**Any deviation from this priority is an antipattern that must always be avoided.** Reviewers should reject PRs that introduce SCSS classes that could have been Tailwind utilities, or custom SCSS skins of Bootstrap components.

### Other Styling Rules

Forbidden
	•	No raw CSS files (.css) for application styles
	•	No external UI libraries:
	•	No shadcn
	•	No MUI
	•	No Chakra
	•	No HeadlessUI

SCSS
	•	Only .scss allowed (never .sass)
	•	Only for global styles, font-face, keyframe animations, or the Bootstrap import/override layer

Dark Mode
	•	ALWAYS include Tailwind dark: variants

⸻

## 📦 Dependency Management (STRICT)

Philosophy: Local-first

MUST:
	•	All dependencies installed locally via npm
	•	No global installs
	•	Everything removable via deleting project folder

FORBIDDEN:
	•	CDN imports
	•	URL imports
	•	Remote-coupled dependencies

Lazy Loading (IMPORTANT)
	•	Use:

const module = await import('module');

	•	Apply to:
	•	Non-critical dependencies
	•	Heavy modules
	•	DO NOT lazy load:
	•	Entry points
	•	Critical runtime logic

⸻

## 🔌 Data Fetching
	•	Prefer native fetch
	•	SWR allowed (ONLY advanced case)
	•	No heavy data libraries

⸻

## 🧠 AI Behavior Rules (CRITICAL)

### General Philosophy
	•	Be pragmatic
	•	Avoid overengineering
	•	Prefer clarity over cleverness
	•	Avoid “magic” abstractions

⸻

### MUST DO
	•	Use arrow functions ALWAYS
	•	Keep logic explicit
	•	Follow existing patterns in repo
	•	Minimize dependencies
	•	Keep components small and modular

⸻

### MUST NOT DO
	•	Introduce new UI libraries
	•	Use function declarations
	•	Add unnecessary abstractions
	•	Follow conventions blindly
	•	Generate “magic” code based on naming tricks

⸻

## 🚫 Anti-Patterns

Avoid:
	•	Overly abstract architectures
	•	Premature optimization
	•	Deep nesting
	•	Over-commenting simple code
	•	“Smart” code that reduces readability

⸻

## 💬 Comments
	•	ONLY explain complex or non-obvious logic
	•	NO comments for obvious code
	•	NO JSDoc unless absolutely necessary

⸻

## ❗ Error Handling Strategy

When something breaks:
	1.	Revert to last working state
	2.	Try a different approach
	3.	Keep solutions simple

Do NOT:
	•	Add complex defensive layers
	•	Overengineer fixes

⸻

## 🧪 Testing
	•	Use Jest
	•	Keep tests simple and focused

⸻

## 🧾 Git Commit Rules

Commit Title
	•	Short
	•	Slightly descriptive
	•	Emoji allowed if funny

Commit Body (VERY IMPORTANT)
	•	Extremely detailed
	•	Overexplain everything
	•	Include:
	•	Files changed
	•	Why change was made
	•	Related issues/PRs
	•	Side effects

⸻

## ⚡ Decision Framework (When Unsure)

Default to:
	1.	Arrow functions
	2.	Simpler implementation
	3.	Fewer dependencies
	4.	Explicit logic
	5.	Smaller components

⸻

## 🧠 Core Principle

If it feels overengineered, it probably is.

⸻

## 🦒 Misc

Giraffes and hedgehogs are cool.

---