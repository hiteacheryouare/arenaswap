---
name: project-core-package-json-inlined
description: constants.ts does `import pkg from "../package.json"`, so the whole manifest — npm scripts, devDependencies, the string "zod" — is inlined into a public docs-site chunk
metadata:
  type: project
---

`packages/core/src/constants.ts` line 1 is `import pkg from '../package.json'` (feeding `appName`,
`appVersion`, `appDescription`). Vite inlines the **entire** manifest object into whatever client
chunk pulls `@arenaswap/core/constants`, npm scripts and devDependencies included.

**Why it matters:** it is the only reason a grep for `zod` hits the built docs site. The zod
*library* is genuinely absent (no `ZodError`, `_zod`, `safeParse`, `$ZodError`, `invalid_type`,
`parseAsync`, `ZodType` anywhere in `_astro/*.js`) — the single hit is
`dependencies:{powerscore:"*",zod:"^4.4.3"}` inside that inlined JSON. Anyone auditing the "no zod
on the marketing page" claim with a naive grep will get a false positive.

**How to apply:** if you want a clean grep and a smaller chunk, have `constants.ts` take the three
strings it needs rather than the whole manifest. Also note `periodFormat.ts` side-effect-imports
this chunk (~973 B gzipped) onto `/powerscore/` without using any binding from it.

Related: [[project-livepowerscores-duplicated-helpers]], [[project-docs-site-metrics]]
