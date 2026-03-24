# Madness — Design Spec

**Date:** 2026-03-23
**Status:** Approved

---

## Problem

During March Madness, people watch games in one of three ways: pick one game and commit, constantly flip channels manually, or record games and skip ahead. The second behavior — mindless channel flipping — is frustrating because it's reactive and random. You don't know what you're missing until you check, and by the time you switch, the moment is over.

The goal: automate the flipping decision with enough intelligence that you always end up watching the most exciting game, without constantly polling manually.

---

## Solution

A browser extension that monitors all live March Madness games in real time and automatically switches your streaming tab to whichever game is most exciting at that moment — muting the tab you leave, unmuting the one you join, and showing a notification explaining why it switched.

**Legal posture:** The extension only switches browser tabs. You bring your own streaming subscriptions (ESPN+, Peacock, Sling, etc.). The extension never hosts, proxies, or touches video content.

---

## Architecture

### Turborepo monorepo (npm workspaces)

```
/
├── apps/
│   └── extension/         # WXT-powered browser extension
└── packages/
    └── core/              # Pure TypeScript business logic (no browser APIs)
```

`packages/core` contains all excitement scoring logic as pure functions — framework-agnostic and fully testable with Vitest. The extension imports from it.

### Extension components

| Component | Role |
|---|---|
| **Service worker** (`entrypoints/background.ts`) | Polls ESPN API, computes scores, decides when to switch, fires notifications |
| **Popup** (`entrypoints/popup/`) | React UI — on/off toggle, sensitivity slider, tab-to-game assignment, live excitement bars |

No backend. No server. All state lives in `chrome.storage`.

---

## Data Source

**ESPN's undocumented public scoreboard API:**
```
https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard
```

- No API key required
- No authentication
- Returns all live games with scores, game clock, period, and team info
- Updated roughly every 15–30 seconds by ESPN's own infrastructure
- Polled every 15 seconds by the service worker

This is the **only** external network request the extension makes. No CDN, no analytics, no telemetry.

---

## Excitement Score Algorithm

Each game gets an excitement score computed from four signals:

| Signal | Max Points | How |
|---|---|---|
| **Closeness** | 40 | Inversely proportional to score margin. Tied = 40pts, 3pt game = 35, 7pt = 20, 12pt+ = 0 |
| **Late game** | 35 | OT = 35pts, last 2min of 2H = 30, last 5min of 2H = 20, last 5min of 1H = 10 |
| **Momentum** | 20 | Computed from score deltas across polling snapshots. 8+ unanswered = 20pts, 5-7 unanswered = 10pts |
| **Preference** | 15 | Fixed bonus if a user-designated favorite team is playing |

**Total max: 110 points.** In practice, a close OT game in your team's tournament run will score very high.

The `reason` string used in notifications is built from the highest-scoring signals: _"tied with 0:58 left in OT"_, _"Duke on an 8-0 run"_, etc.

### Momentum detection

Momentum is inferred from score snapshots rather than a play-by-play API. The service worker keeps a rolling window of the last 8 snapshots per game (2 minutes of data at 15s intervals). If one team's cumulative score delta significantly exceeds the other's over that window, a run is detected.

---

## Tab Management

The extension needs to know which tabs are which games. Flow:
1. User opens streaming service tabs in their browser
2. Opens the extension popup
3. Assigns each tab to a live game using a dropdown
4. Registrations stored in `chrome.storage.session` (cleared when browser closes)

---

## Switch Logic

```
every 15 seconds:
  fetch live games from ESPN
  update score snapshot history
  compute excitement score for each game

  if extensionEnabled:
    find the best game (highest excitement score)
    find the active tab's game (current score)

    if best.score > current.score + sensitivityThreshold
    AND timeSinceLastSwitch > cooldown:
      mute current tab
      activate + unmute best tab
      fire chrome.notification with reason string
      record switch time
```

**Cooldown:** Default 90 seconds. Prevents rapid-fire switching during a back-and-forth stretch.

**Sensitivity threshold** (user-controlled, 1–5):
| Level | Delta to trigger switch |
|---|---|
| 1 | 50 pts — only switch for truly critical moments |
| 2 | 35 pts |
| 3 | 20 pts (default) |
| 4 | 10 pts |
| 5 | 5 pts — switch for any edge |

---

## Popup UI

A 320px dark-themed popup with two views:

**Main view**
- Enable/disable toggle
- Sensitivity slider (1–5)
- List of registered game tabs with team names, live score, and excitement bar
- Gear icon to access setup

**Setup view**
- For each open browser tab: a dropdown to assign it to a live game
- "Done" returns to main view

**Styling:** Bootstrap for layout/cards, Tailwind for utilities and dark mode. Fonts shipped locally (no CDN).

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Monorepo | Turborepo + npm workspaces | Code sharing between core and extension |
| Extension build | WXT | TypeScript-first, handles MV3 (Chrome) vs MV2 (Firefox) differences automatically |
| Popup UI | React + TypeScript | WXT has first-class React support |
| Styling | Bootstrap + Tailwind | Bootstrap for structure, Tailwind for utilities and dark mode |
| Testing | Vitest | Fast, TypeScript-native, perfect for pure functions in packages/core |
| Cross-browser | WXT + webextension-polyfill | `browser.*` API works across Chrome, Firefox, Edge |

---

## Out of Scope

- Safari extension (requires Apple developer account + Xcode)
- Backend/server
- Play-by-play API integration (snapshot deltas are sufficient for momentum)
- Pause/resume video on switch (DRM-protected pages resist script injection)
- Automatic game-to-tab detection (manual assignment keeps it simple and reliable)
