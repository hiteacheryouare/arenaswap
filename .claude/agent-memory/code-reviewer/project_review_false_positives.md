---
name: project-review-false-positives
description: ArenaSwap patterns that look like bugs on first read but are correct or pre-existing — i18n substitution, lowercase components, packages/ui shims, slider step fallbacks.
metadata:
  type: project
---

These things in this repo repeatedly get flagged as bugs (by Copilot and by fresh reviewers) and are **not** bugs. All three were verified against library source, not assumed.

**1. i18n substitution: `{name}` placeholders and plural objects are both valid.**
`apps/extension/locales/*.json` legitimately mixes two placeholder styles: positional `$1`/`$2` and named `{team}`/`{max}`/`{label}`. Both work. `@wxt-dev/i18n` supports named substitutions via `applyNamedSubstitutions` with regex `/\{([A-Za-z0-9_]+)\}/g`, so `t('key', { team: 'BOS' })` is correct — an object argument is a supported overload, not a misuse of the array form.
Plural keys are authored as objects, e.g. `powerScore.favoriteTeamsInMatchup: {"1": "...", "n": "$1 ..."}`. The i18n build joins those values with `" | "` and the runtime splits on `" | "` and indexes by count. So `t(key, someNumber)` is correct there.
Nested keys are also fine: the runtime does `key.replaceAll('.', '_')` before `browser.i18n.getMessage`, so `t('gameCard.foo')` resolves `gameCard.foo`.
**Why:** a naive audit script that flattens the locale JSON reports plural keys as "missing" and named placeholders as "never substituted". Both are false.
**How to apply:** before reporting a missing key or broken substitution, flatten *and* account for plural-object keys, and remember all 12 locales have historically been key-complete (verify, don't assume).

**2. Lowercase function names that return JSX are the house style, not a Rules of Hooks bug.**
`.agents/CODESTYLE.md` mandates camelCase for functions and files, which collides with React's capitalization rule. So the repo has `const mainView = ...` and helpers like `gameSection` / `leagueRows` that return JSX. This is safe as long as either the JSX call site uses a capitalized identifier (`import MainView from './components/mainView'`) or the helper calls no hooks.

**On the specific `gc2TeamLogo` Copilot finding: it was real, and it is already fixed. Do not repeat the claim that Copilot invented it.**
`git log -S'gc2TeamLogo' --all` shows it added in `45f3ef2` (2026-05-31) and removed in `d196b56` (2026-06-13), both on `dev`. At `45f3ef2` it was exactly what Copilot described — `export const gc2TeamLogo = ({ team }) => { const [failed, setFailed] = useState(false); ... }`, lowercase, calling a hook. Copilot reviewed an earlier push on a long-lived branch. The symbol is absent at the branch tip, so the correct verdict is **stale, already resolved**, not fabricated.
**How to apply:** on a 100+ commit branch, always date-check a stale bot finding with `git log -S'<symbol>' --all` before calling it wrong. "Not at HEAD" and "never existed" are different conclusions, and only one of them is fair to the author.

Current hook-calling exports in `packages/ui/src/components/gameCardShared.tsx` are all PascalCase and used as JSX (`TeamColumn`, `OddsProvider`, `GameMeta`). The residual risk is *latent*: some camelCase helpers are invoked conditionally (`cond && gameSection(...)`), so adding a hook to one later would make hook count vary per render. Flag it only if a hook is actually added, and grep call sites before asserting.

**3. `packages/ui` is not a duplicate of the popup components.**
The extension does not keep parallel copies. Files like `apps/extension/entrypoints/popup/components/gameCardShared.tsx` are one-line re-export shims (`export * from '@arenaswap/ui/src/components/...'`), so `packages/ui` source is what actually ships in the popup. A few (`liveGameCard`, `preGameCard`, `gameCardTypes`) are thin ~31-line wrappers that add extension-only props, not forks.
**How to apply:** don't open a "duplicated logic has diverged" finding without first checking whether the extension-side file is a shim. Do still review `packages/ui` as shipping popup code.

**4. The cooldown / switch-delay sliders' off-step fallback is pre-existing, not a new desync.**
`cooldownSlider` and `switchDelaySlider` map `prefs.cooldownSeconds` / `switchDelaySeconds` onto a fixed `steps` array and fall back to a default index when the stored value is not in it, so an off-step value displays the wrong label. `normalizeUserPreferences` only clamps these to `>= 0`, so the gap is real — but the logic is unchanged since well before the 2026-08 popup redesign and the defaults (45, 0) are both on-step.
**How to apply:** don't open this against a diff that merely re-labels or i18n's those sliders. If it is worth raising at all, raise it once as a repo-level suggestion (snap in `normalizeUserPreferences`), not as a blocker on someone's change.

Related: [[project_review_failure_map]]

**5. `turbo.json` build outputs: check the PACKAGE-level config before calling `.output/**` undeclared.**
The root `turbo.json` `build.outputs` is `["dist/**"]` and does *not* list `.output/**`. That looks
like the extension's WXT output is uncached/undeclared — it is not. `apps/extension/turbo.json`
(`extends: ["//"]`) overrides `build.outputs` to `[".output/chrome-mv3/**"]`, with sibling entries
per browser target (`build:firefox` → `.output/firefox-mv3/**`, the three `zip:*` tasks → their own
zip globs). The per-target scoping is deliberate and commented: a shared `.output/**` on all six
tasks would make them claim each other's artifacts, so restoring one target from cache could hand
back another target's build.
**How to apply:** `find apps packages -maxdepth 2 -name turbo.json` before reasoning about turbo
caching. Only `apps/extension` writes to `.output/`; `apps/docs` (astro) and both `packages/*` (tsc)
write to `dist/`, which the root config covers.

**6. Do not grep for Tailwind-ish class names with `\bword\b` — the hyphen is a word boundary.**
`grep -E '\bgrow\b'` matches inside Bootstrap's `flex-grow-1`, and `\bshrink-0\b` matches inside
`flex-shrink-0`. A naive sweep reported standalone `grow` in 16 files and `shrink-0` in 4; the real
counts are 6 and **zero**. Match the class as a whole token instead, e.g.
`grep -rnoE "className='[^']*'" … | grep -E "(=' *| )grow( |')"`.
**Standing (not introduced by PR #18):** the extension has no Tailwind build (AGENTS.md: Tailwind is
`apps/docs` only), and PR #18 removed a never-compiling `@import 'tailwindcss'` and rescued the
Preflight rules that mattered (`.min-w-0` now lives in `global.scss:40`). Left behind as inert
classes: standalone `grow` (6 sites, onboarding/walkthrough/banner), and in
`reviewPromptBanner.tsx` alone `mt-[0.08rem]`, `text-[0.72rem]`, `text-[0.62rem]`, `text-[0.65rem]`,
`leading-tight`, `leading-snug`; plus `dark:bg-blue-950`/`dark:text-blue-100`/`dark:border-blue-800`
on `proTip.tsx:62`. Almost all pre-date PR #18, which only re-touched those lines to add `i18n.t`.
Worth one repo-level suggestion, never a blocker on a diff that merely moved them.
