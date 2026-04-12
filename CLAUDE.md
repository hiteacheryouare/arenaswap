# ArenaSwap Agent Instructions

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
Everything must be camelCase:
- Variables → myVariable
- Functions → myFunction
- Constants → myConstant (NOT UPPERCASE)
- Files → myComponent.ts / myComponent.jsx

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

Allowed
	1.	Bootstrap → STRUCTURE ONLY
	2.	Tailwind → utilities (spacing, color, layout)

Forbidden
	•	No raw CSS (except global overrides)
	•	No external UI libraries:
	•	No shadcn
	•	No MUI
	•	No Chakra
	•	No HeadlessUI

SCSS
	•	Only .scss allowed
	•	Only for global styles if absolutely necessary

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

### UST DO
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