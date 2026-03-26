![arenaswap logo](../apps/extension/public/images/full_logo_white_on_black.png)


**ArenaSwap** (stylized as arenaswap) is a browser extension that automatically scans the status of sports games and then swaps your tabs automatically so you are always watching the most exciting game.

> [!WARNING]
> As of right now, this extension is in an extremely early beta stage. It is not yet available on the Chrome Web Store, and you will need to load it locally to use it. The extension is also currently only designed for desktop Chrome, so it may not work on mobile or other browsers. Use at your own risk, and please report any bugs you find!
>

> [!NOTE]
> The extension currently only supports NCAA Men's Basketball. In the near term we plan to add support for many other sports, as well as cross-sport comparisons.

## How to Use
1. We are not on the Chrome Web Store yet, but you can load the extension locally:
   - Clone this repository and run `npm install` at the root.
   - Run `npm run dev --workspace @arenaswap/extension` to start the extension in development mode.
2. Once the extension is loaded, it will automatically show a list of currently ongoing sports games.
3. Turn on the extension using the switch in the top right corner of the popup. Then, using the settings icon right next to the switch, you can assign a tab to each game.
4. The extension will automatically switch to the tab of the most exciting game based on our scoring algorithm. 
5. If you want to get more granular, you can adjust the sensitiity of the scoring algorith, as well as the cooldown between tab switches.

## Repository Overview

```text
/
├── apps/extension      # WXT + React browser extension
├── packages/core       # Pure TypeScript scoring + ESPN API client
├── turbo.json          # Task graph (build/test/typecheck/dev)
└── package.json        # npm workspaces root
```

## What to Read First

- `CONTRIBUTING.md` for branch flow, code standards, and PR rules.
- `CODE_OF_CONDUCT.md` for collaboration expectations.
- `ISSUE_TEMPLATE/*` to file bugs, fixes, and feature ideas with enough context.

## Local Commands

Run all commands from repository root:

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```

Workspace-specific examples:

```bash
npm run dev --workspace @arenaswap/extension
npm run typecheck --workspace @arenaswap/core
npm run test --workspace @arenaswap/core
```

## License
At the moment, we have chosen not to include a license. This means the code is technically proprietary and cannot be used or modified by others without explicit permission from PorkyProductions.


## Authors

ArenaSwap is developed by PorkyProductions.

![hedgehog logo](https://avatars.githubusercontent.com/u/82683662?s=200&v=4)

Primary Author: [Ryan Mullin](https://github.com/hiteacheryouare)


![arenaswap logo](../apps/extension/public/images/full_text_compressed_black_on_white.png)