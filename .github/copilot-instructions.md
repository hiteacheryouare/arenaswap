# Coding Agent Instructions

## Project Context
This is ArenaSwap (stylized in logos as "arenaswap."), a web browser extension that automatically switches your tabs so you are always watching the most exciting sporting events.

It is contained in a monorepo managed by TurboRepo.

## Quick Overview

- **Language/frameworks**: WXT Extension + React + TypeScript
- **Bundler**: WXT
- **UI**: Tailwind + Bootstrap (some customized theme files)
- **Insults/data**: provided by the ESPN scoreboard API


## Language and Framework Rules

### Svelte Components
- Use React Typescript as primary framework
- TypeScript for all helper functions and complex components
- Use JavaScript (not TypeScript) for simple components that:
  - Don't use props
  - Are highly reusable
  - Don't need type safety

## Code Style Requirements

### Formatting
- **Indentation**: TABS (not spaces)
- **Line endings**: Windows (CRLF)
- **Quotes**: Single quotes only `'like this'`
- **Semicolons**: ALWAYS use semicolons;
- **Line length**: No explicit limit, use common sense

### Naming Conventions
- **Everything**: camelCase
  - Variables: `myVariable`
  - Functions: `myFunction`
  - Constants: `myConstant` (NOT UPPER_SNAKE_CASE)
  - Files: `myComponent.svelte` or `myComponent.ts`

### Function Declarations
```javascript
// ✅ CORRECT - Named anonymous arrow functions
const myFunction = () => {
	// function body
};

// ✅ CORRECT - Anonymous default export
export default () => {
	// component body
};

// ❌ WRONG - Never use explicit function declaration
function myFunction() { } // NEVER DO THIS

// ❌ WRONG - Never name default exports
export default function MyComponent() { } // NEVER DO THIS
```

### React Component Rules
- File name = Component name
- Maximum 200 lines per component
- If longer, break into smaller components with props/slots
- Move non-Svelte operations to `/src/utils` folder
- Exception: Reactive statements and component-critical logic stay in component
- Data for `.map()` blocks go in separate files

## Styling Rules

### MANDATORY Styling Approach
1. **Bootstrap COMPONENTS only** - Use for structural components (modals, cards, navbars, etc.)
2. **Tailwind for utility classes** - Use for spacing, colors, responsive design
3. **NEVER write raw CSS** - Exception: Global styles or overriding Bootstrap/Tailwind
4. **Use .scss files** (not .sass) - Only for global styles when absolutely necessary
5. **Dark mode**: Include Tailwind dark mode classes for everything


## What You Should NEVER Suggest

### Absolute Prohibitions
1. **NO testing libraries** - We test manually only
2. **NO external UI libraries** - Only Bootstrap and Tailwind
   - No shadcn/ui
   - No headlessui
   - No Material-UI
   - No Chakra UI
   - No other component libraries
3. **NO explicit function declarations** - Always use arrow functions
4. **NO `var` keyword** - **Exception**: Single-use variables without hoisting issues
5. **NO .sass files** - Use .scss instead
6. **NO mainstream conventions just because they're popular**
7. **NO magic** - codemods and random naming conventions that do crazy things just because they are named a certain way should be avoided at all costs. All things should be explicit and easy to understand.

### Error Handling
When errors occur:
1. Git revert to last working version
2. Try a different approach
3. Don't overcomplicate error handling

### Comments
- Only comment complex/unreadable code with esoteric operators
- No unnecessary comments for simple code
- No JSDoc unless absolutely needed

## 📦 Dependency & Environment Management

**Local-First, Project-Scoped Everything**
- Every project should have its own isolated dependency environment
- No global installations unless absolutely unavoidable
- Dependencies should live in the project directory where you can see and delete them
- Reproducibility > convenience

**Preferred Patterns:**
- ✅ npm with local node_modules
- ✅ uv for Python (project-scoped virtual environments)
- ✅ Local package installation that you can `rm -rf` when things break

**Rejected Patterns:**
- ❌ CDN imports (looking at you, `<script src="https://cdn..."`)
- ❌ URL-based package imports (Deno's import maps)
- ❌ Globally-scoped package managers (pip's default behavior)
- ❌ Forced remote coupling (Go's GitHub requirement)

**Why:**
- If your internet dies, your project should still work
- If a CDN goes down, your site shouldn't break
- If you delete a project folder, all traces should vanish with it
- Dependencies should be *tangible things you can inspect*, not abstract remote references

**Golden Rule:**
If I can't `cd` into it, `ls` it, and `rm -rf` it, I don't trust it.

## Git Commit Style

### Commit Title
- Keep it terse and not overly descriptive
- General idea of changes
- Add emoji if it's funny and enhances comedic value 🦒

### Commit Message Body
- Be VERY detailed and longwinded
- Overexplain everything
- Reference:
  - Other contributors
  - Bots
  - PRs (#123)
  - Issues
  - Files changed
  - Related commits

Example:
```
🦔 Fixed navbar thing

So I was working on the navbar and noticed that when you clicked the hamburger menu on mobile, it wasn't closing properly when you navigated to a new page. This was happening because the state wasn't being reset properly in Svelte's reactive statements. I talked to @dependabot about updating our Svelte version but decided against it. This relates to PR #42 and fixes issue #38.

Changed files:
- /src/components/Navbar.svelte - Added proper cleanup with onDestroy
- /src/utils/navbarHelpers.ts - Refactored the toggle logic to be more reusable

Also while I was in there I noticed the dark mode wasn't applying to the dropdown items so I added the appropriate Tailwind classes. Bootstrap was handling most of it but needed the extra dark: modifiers for the text color.

This should work with the deployment pipeline we set up in the GitHub Actions workflow.
```

## Data Fetching
- Use SWR

## Philosophy
- Pragmatic solutions over dogmatic adherence to "best practices"
- Avoid bikeshedding at all costs
- Conventions are guidelines, not laws
- Keep things simple and working
- If mainstream conventions conflict with these rules, ignore the conventions

## Remember
When in doubt:
1. Use arrow functions
2. Use Bootstrap components + Tailwind utilities
3. Keep components under 200 lines
4. Don't overthink it
5. Giraffes and hedgehogs are cool 🦒🦔

---