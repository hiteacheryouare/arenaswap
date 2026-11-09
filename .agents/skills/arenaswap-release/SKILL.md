---
name: arenaswap-release
description: Prep an ArenaSwap release end to end. Use when asked to prep or cut a release, write release notes, bump the version, backport fixes to stable (mega), ship a hotfix or security patch, write the store version of the notes, or "reprep the launch".
---

# ArenaSwap release

This skill covers the release process. How the notes themselves are written lives in `.agents/RELEASENOTES.md`, which wins over everything here on tone and shape. On `mega` that file may not exist yet, so read it with `git show dev:.agents/RELEASENOTES.md`.

## Branches

- `dev` is the integration branch. Feature work lands here.
- `mega` is stable: the default branch, the branch the stores ship from, and the branch the docs site deploys from.
- Only Ryan decides when `dev` merges into `mega`. Never merge, push to, or tag `mega` unless he asks in this session.

The checkout at `/Users/rpmul/Source/arenaswap` is shared with other agents. Check `git branch --show-current` and `git status` as their own commands before any branch operation, and never switch branches while someone else has uncommitted work. `mega` needs its own `npm ci`, because dev's `node_modules` will not run it. If you need `mega` and the checkout is busy, ask Ryan how he wants to proceed.

## Pick the release type

Ask Ryan if the type or version number is not obvious from the request.

| Type | Version | Base | Notes |
|---|---|---|---|
| Release from dev | minor or major | `dev`, merged into `mega` by Ryan | Full notes |
| Backport to stable | minor | new branch from `origin/mega` | Full notes |
| Hotfix | patch | `hotfix/<issue>-<slug>` from `origin/mega` | Short notes, like 2.1.1 |
| Security patch | patch | `hotfix/<issue>-<slug>` from `origin/mega` | Short notes, crediting the reporter |

**Backports.** Port changes by hand rather than cherry-picking, because `mega` and `dev` have diverged. Include only fixes that are critical to the user experience, and list them for Ryan to confirm before porting. Every fix made on the backport branch also lands on `dev`.

**Security patches.** First confirm the vulnerability is actually reachable in what ships. If it isn't, report that and stop: no release. `.github/SECURITY.md` promises reporters credit in the release notes. Every test must pass before Ryan pushes it to the stores.

## Prep checklist

1. **Bump the version.** Run `scripts/syncVersion.sh <x.y.z>` from the repo root. It sets `version` in every workspace `package.json` and refreshes the README badges in `.github/README.md`. It skips `package-lock.json`, so update the workspace `version` entries there by hand. Don't run `npm install` to do it.
2. **Write the release note** at `apps/docs/src/content/releases/<x.y.z>.md`, following `RELEASENOTES.md` and its checklist. Copy the frontmatter shape of the newest file. Web-search the current sports week for the opener and give Ryan the source links.
3. **Translate it, on `dev` only.** Each of the 11 locales (`de es fil fr it ja ko pt-BR pt-PT zh-CN zh-TW`) gets `releases/<locale>/<x.y.z>.md` with a `sourceHash` of the English file. Use the `i18n-polyglot-translator` agent. `apps/docs/tests/translations.test.ts` fails on missing or stale translations and prints the hash to set. Docs on `mega` are English-only.
4. **Add the CHANGELOG entry**: `## ArenaSwap <x.y.z> — <YYYY-MM-DD>`, in two or three sentences, per the rule at the top of the file.
5. **Build the release kit** in `temporary/release-<x.y.z>/`, which is gitignored:
   - `releaseBody.md`: the GitHub release body.
   - `storeNotes.txt`: the condensed notes for the Firefox Add-ons version-notes field. Plain text, with a lead line, feature bullets, then a `Fixes:` list. Write it in the same voice, with no technical details. Chrome has no per-version notes field.
   - If a feature changes what the store listing should say, update `apps/extension/marketing/` within the limits in its `README.md`.
6. **Verify** with the everything command: `npm run lint typecheck test test:e2e build build:edge build:firefox zip zip:edge zip:firefox`. It rebuilds the tracked `docs/` output from the working tree. Before staging, run `git checkout -- docs/` and delete the new untracked `docs/_astro/*` files, unless the docs rebuild belongs in the commit.
7. **Open the PR** with the `file-pr` skill and the `robotic` label. Backports and hotfixes target `mega`. Everything else targets `dev`.

## Hand-off

Ryan hand-tests the build before anything ships. If his testing finds a bug, fix it on the release branch and on `dev`, rerun step 6, and refresh the kit. That is what "reprep the launch" means.

End with a final message that has everything he needs, because he may not see anything earlier:

- The PR link, the version, and the kit path.
- The zips in `apps/extension/.output/`: `arenaswapextension-<x.y.z>-{chrome,edge,firefox,sources}.zip`.
- Every line of the notes that goes stale if the release slips, plus the source links for the opener.
- His remaining manual steps:
  1. Merge into `mega` and wait for the docs deploy.
  2. Create a GitHub release titled "ArenaSwap <x.y>" with tag `v<x.y.z>` on `mega`, and attach the chrome, edge and firefox zips.
  3. Upload to each store. The Firefox Add-ons upload also takes the sources zip and `apps/extension/marketing/amo_reviewer_notes.txt`.
- For a release cut on `mega`: the note, the CHANGELOG entry and the fixes that still need forward-porting to `dev`.
