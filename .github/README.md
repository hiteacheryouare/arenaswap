![arenaswap logo](../apps/extension/public/images/full_logo_white_on_black.png)

<br>

**ArenaSwap** is a browser extension that monitors every live sports game across 12 leagues and automatically switches your browser tab to the most exciting one, powered by a live scoring algorithm called **PowerScore**.

Think [NFL RedZone](https://www.nfl.com/redzone), but for every sport. All day. All season.

> [!WARNING]
> ArenaSwap is in active early beta. It is not yet on the Chrome Web Store or Firefox Add-ons. Load it locally using the instructions below. Expect rough edges — and please report bugs!

---

## The Idea

Inspired by [this TikTok](https://www.tiktok.com/@gfedgocrazy/video/7620585631143496974?is_from_webapp=1&sender_device=pc&web_id=7621724919189866014),from one of my favorite TikTokers, [@gfedgocrazy](https://www.tiktok.com/@gfedgocrazy), and the concept behind NFL RedZone, ArenaSwap was built to solve a simple problem: when you have many games open, its hard to always be watching the best one.

ArenaSwap fixes that. It watches every game for you and puts the best one on screen automatically.

---

## How It Works

ArenaSwap uses the **bring-your-own-tabs** model:

**01 — Open your streams.**
Pull up your games in separate browser tabs. Any service that works in a browser works with ArenaSwap; ESPN+, Peacock, Paramount+, YouTube TV, Hulu, whatever you've got.

**02 — Assign each tab once.**
Open the extension, find each game in the list, and connect it to the right tab with a single dropdown.

**03 — The best game finds you.**
Every 15 seconds, ArenaSwap scores every live game via ESPN's public API and switches to the most exciting one. It unmutes the active tab and mutes all others so you always hear the right broadcast.

When no games are live, the extension enters a low-power dormant mode and checks less frequently to save resources.

---

## Twelve Leagues. If It's Live, It's Covered.

| Sport | Leagues |
|---|---|
| 🏀 Basketball | NBA, WNBA, NCAAB, NCAAW |
| 🏈 Football | NFL, NCAAF |
| 🏒 Hockey | NHL, NCAAMH |
| ⚾ Baseball | MLB |
| ⚽ Soccer | MLS, EPL, FIFA World Cup |

---

## PowerScore

PowerScore is a 100-point live algorithm that measures how exciting a game is *right now*. Five signals feed into it:

| Signal | Max Points | What It Measures |
|---|---|---|
| Closeness | 30 | How tight the margin is. A tied game scores maximum. |
| Late-Game Pressure | 30 | Exponential boost as the clock winds down. Overtime maxes the scale. |
| Momentum | 20 | Unanswered scoring runs |
| Lead Changes | 12 | Back-and-forth games beat one-sided affairs. |
| Comeback Factor | 8 | Is the trailing team clawing back? |

Games with frozen clocks (halftime, timeouts) take a penalty so ArenaSwap doesn't switch during stoppages. You can also add a **Favorite Team Bonus** to keep games involving your teams ranked higher.

---

## Settings

| Setting | Description |
|---|---|
| **Sensitivity (1–7)** | How large a PowerScore gap needs to be before a switch happens. |
| **Switch Cooldown** | Minimum time between switches — prevents rapid tab-flipping. |
| **Switch Delay** | Wait before switching — useful when streams lag behind live data. |
| **Favorite Team Bonus** | Extra PowerScore points for games involving teams you care about. |
| **Active Leagues** | Filter down to only the leagues you want monitored. |

---

## Local Setup

ArenaSwap isn't on the extension stores yet. To run it locally:

```bash
# Clone and install
git clone https://github.com/hiteacheryouare/arenaswap.git
cd arenaswap
npm install

# Start the extension in development mode
npm run dev
```

Then load the unpacked extension from the `apps/extension` build output in your browser's extension manager.

---

## Monorepo Structure

```
arenaswap/
├── apps/
│   └── extension/      # Browser extension (WXT + React)
└── packages/
    ├── core/           # Core business logic
    └── powerscore/     # PowerScore algorithm
```

Built with [WXT](https://wxt.dev), React, TypeScript, Tailwind, and Bootstrap. Managed with Turborepo.

---

## FAQ

**Does ArenaSwap collect any data?**
No. Everything runs locally in your browser. No account, no tracking, no personal data. Game data comes directly from ESPN's public API.

**Will it work with my streaming service?**
Yes — if your stream runs in a browser tab, ArenaSwap can switch to it.

**Can I stop it from switching during a specific game?**
Yes. Unassign a tab from a game at any time using the dropdown in the popup. Adjusting sensitivity also reduces how often switches happen.

**Does it mute other tabs?**
Yes. When ArenaSwap switches to a game, it unmutes that tab and mutes all other assigned tabs.

---

## License

ISC License. See the [LICENSE](../LICENSE) file for details.

---

## Authors

Primary Author: [Ryan Mullin](https://github.com/hiteacheryouare)

*Not affiliated with or endorsed by ESPN, the NFL, NBA, NHL, MLB, MLS, or any other league tracked by this extension.*
