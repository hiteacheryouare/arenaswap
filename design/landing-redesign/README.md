# Landing page redesign proposal

A design proposal for `arenaswap.app`, not an implementation. Open `index.html` in a
browser to read it. Nothing in here is wired into `apps/docs` and nothing is built by
Turborepo.

The proposal covers a rebuilt landing page, retiring `/blog/` in favour of a release
notes feed generated from `CHANGELOG.md`, and reserving `/docs/` so 2.1 only has to
write content.

## What is real and what is not

Every piece of product on the page is the shipped component with its shipped values,
reimplemented in plain CSS so the file runs standalone:

| On the page | Comes from |
| --- | --- |
| Live game card | `packages/ui/src/_game-card.scss`, `packages/ui/src/components/liveGameCard.tsx` |
| PowerScore bar colour | `powerScoreColor()` in `packages/ui/src/components/gameCardShared.tsx` |
| Team-colour wash and edges | `buildGameCardStyle()` in the same file |
| Popup chrome and labels | `apps/extension/entrypoints/popup`, `locales/en.json` → `main.*` |
| Four charts | `apps/extension/entrypoints/popup/components/gameDetailChartOptions.ts` |
| Six settings groups | `locales/en.json` → `setup.group*` |
| Marketing copy | `apps/docs/src/components/*.astro` |

Two things on the hero are **not** product UI, and the page says so: the orange ring
and the `ON YOUR SCREEN` flag on the active card. The extension has no such state,
because there the active tab is the browser tab.

## The hero animation

Twenty frames, 600ms apart, all values hardcoded. It never calls ESPN, so it works
offline and in the off-season. Which card is on screen is not animated separately: it
is whichever PowerScore is highest, the rule the switcher uses.

Before this ships, the twenty frames should be lifted from a real game captured with
`npm run powerscore:validate-live` rather than invented, since a scripted demo reads
as fake the moment a number is implausible.

## Rebuilding

`index.html` and `assets/main.css` are committed build output. To regenerate:

```sh
# from the repo root
python3 design/landing-redesign/src/build.py       # cards, charts, leagues, settings
python3 design/landing-redesign/src/assemble.py    # splice fragments into the shell
npx sass --load-path=node_modules --style=compressed --no-source-map \
  design/landing-redesign/src/scss/main.scss \
  design/landing-redesign/assets/main.css
```

`build.py` and `assemble.py` are standard library only. Sass needs the repo's
`node_modules` on the load path because the stylesheet imports Bootstrap's reboot.

## Fonts

DM Sans, Lekton and Geist, copied from `apps/docs/public/fonts`. Geist is here because
the game card uses it for scorelines: it is the only face we ship with real tabular
figures, and DM Sans has none, which drags a score pair's optical centre off the card
axis.
