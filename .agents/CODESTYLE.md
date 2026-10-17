# CODESTYLE.md

> Project coding standards and style guide. This document defines **how code should be written**, not architectural decisions or agent behavior.

---

# Formatting

## Required

- Indentation: **Tabs**
- Line endings: **CRLF**
- Quotes: **Single quotes (`'`)**
- Semicolons: **Always required**

---

# Naming

Use **camelCase** for authored code.

| Item | Example |
|-------|---------|
| Variables | `userProfile` |
| Functions | `calculateScore` |
| Constants | `defaultTimeout` |
| Files | `userCard.tsx` |

## Exceptions

Keep required filenames exactly as required by frameworks, tooling, or standards.

Examples include:

- `package.json`
- `package-lock.json`
- `turbo.json`
- `tsconfig.json`
- `wxt.config.ts`
- `AGENTS.md`
- `.github/copilot-instructions.md`

Never rename required files solely to satisfy naming conventions.

---

# Functions

## Required

Always use arrow functions.

```ts
const doSomething = () => {
};

export default () => {
};
```

## Forbidden

```ts
function doSomething() {
}

export default function Component() {
}
```

Exceptions are only acceptable when required by the language, runtime, or framework.

---

# Exports

Use:

- **Default exports** for the primary item in a file.
- **Named exports** for supporting utilities.

---

# TypeScript

Use TypeScript for:

- Business logic
- Helper functions
- Complex React components

JavaScript must be used for for:

- Small reusable modules
- Components with minimal complexity
- Situations where type safety provides little value

TypeScript should be transpiled rather than executed directly at runtime.

Prefer **interfaces** over object `type` aliases for object shapes.

Use `any` pragmatically when it improves clarity without sacrificing correctness.

---

# Imports

Preferred:

- Relative imports
- Import aliases when appropriate
- Barrel exports when they improve organization

Use dynamic imports for:

```ts
const module = await import('module');
```

Dynamic imports are encouraged for:

- Large libraries
- Optional functionality
- Non-critical dependencies

Do **not** lazy-load:

- Application entry points
- Critical runtime logic

---

# React

- Component filename should match the component name.
- Keep components focused and modular.
- Move business logic outside components whenever practical.
- Reactive or component-specific logic may remain inside the component.

Split components when they become difficult to understand or maintain.

---

# Styling

## Which systems are available where

**Tailwind is only compiled in `apps/docs`.** It is wired there through
`@tailwindcss/vite` in `astro.config.mjs`, reading a `.css` entry.

**`apps/extension` is Bootstrap + SCSS only.** It has no Tailwind build step, so a
Tailwind class written into the popup does not fail loudly — it silently does
nothing. The app previously carried an `@import 'tailwindcss'` inside a `.scss`
file, which Sass inlined as raw uncompiled source: it produced lightningcss
warnings and ~18KB of dead CSS while generating zero utilities. Do not
reintroduce it. Tailwind cannot be driven from Sass at all; v4 expects a plain
`.css` entry processed by its own plugin.

Anything shared out of `packages/ui` renders in both apps, so style it with
Bootstrap utilities or SCSS — those are the systems both apps actually have.

## Priority Order

Always style in this order:

### 1. Bootstrap Components

Use Bootstrap components for application structure.

Examples:

- Buttons
- Cards
- Forms
- Navbars
- Modals
- Alerts

Customize through Bootstrap variable overrides whenever possible.

---

### 2. Utilities

For spacing, typography, layout, responsive behavior, colour and sizing, prefer
chaining utility classes over introducing custom styles.

In `apps/extension` and `packages/ui`, that means **Bootstrap's** utilities
(`d-flex`, `gap-2`, `flex-shrink-0`, `text-truncate`, `fs-5`, …).

In `apps/docs`, Tailwind utilities are available and compiled, including
arbitrary values such as `text-[0.6rem]` or `w-[3.5rem]`.

---

### 3. SCSS

Use SCSS only when the utilities above cannot reasonably express the desired styling.

Typical acceptable cases include:

- Keyframe animations
- `@font-face`
- Complex pseudo-elements
- Attribute selectors
- Advanced media queries
- Re-skinning a Bootstrap component — override its tokens (`.menu { --as-menu-bg: … }`)
  before its properties

Only `.scss` files are permitted.

Do not create application `.css` files, except a Tailwind entry file in
`apps/docs`, which Tailwind v4 requires.

---

## Tokens, Layers and Colour Modes

Bootstrap 6 is configured once, in `packages/ui/src/_bootstrap.scss`, which owns
every Sass token map. Apps configure only its scalars (`$body-font-size`,
`$radius`, `$font-sizes`, `$link-hover-color`); passing a token map from an app
replaces the theme's instead of merging with it.

- **Tokens are `--as-*`.** A PostCSS plugin (`packages/ui/src/tokenPrefix.ts`)
  prefixes every token Bootstrap declares. Write the compiled name in our code:
  `var(--as-fg-body)`, not `var(--fg-body)`. The few tokens Bootstrap's JS reads
  (`--bs-range-fill`, `--bs-breakpoint-*`) keep `--bs-`.
  `packages/ui/tests/tokenNames.test.ts` fails on a token nobody declares.
- **Our CSS goes in `@layer custom`.** Bootstrap layers everything and its
  utilities are not `!important`; `custom` sits between its components and its
  utilities, so a Bootstrap utility class still beats our rules. Element resets go
  in `@layer reboot` instead, so a class keeps beating them. On the docs site
  Tailwind is layered under all of Bootstrap (`tailwind.css` declares the order),
  so where the two share a class name, Bootstrap's wins.
- **Colour modes.** Every colour token is a `light-dark()` pair from
  `packages/ui/src/_theme.scss`. Dark is the default; light is
  `data-bs-theme='light'` on `<html>`, set from the Theme setting. Write one rule
  against the token, not a light-mode patch. Do not write Tailwind `dark:`
  variants.

---

## Forbidden

Do not introduce additional UI libraries such as:

- Material UI
- Chakra UI
- Headless UI
- shadcn/ui

---

# Error Handling

Favor straightforward error handling.

Avoid excessive defensive programming or complex recovery layers unless clearly justified.

When fixing bugs:

1. Start from the last known working behavior.
2. Prefer the simplest effective solution.
3. Avoid introducing unnecessary abstraction.

---

# Dependency Style

Dependencies should be:

- Installed locally
- Easy to inspect
- Easy to remove

Avoid:

- CDN imports
- URL imports
- Remote-only runtime dependencies

Prefer introducing mature, well-supported dependencies over niche packages.

---

# Decision Order

When multiple implementations are reasonable, prefer:

1. Explicit code
2. Simpler implementation
3. Smaller modules
4. Fewer dependencies
5. Readability
6. Consistency with the existing codebase