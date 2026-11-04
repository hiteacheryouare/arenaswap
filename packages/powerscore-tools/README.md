# PowerScore tools

The calibration harness for PowerScore. It records real slates, replays them through the scorer, simulates score distributions, and checks a league's scores against a live scoreboard. It is private to this repo and isn't published.

Run everything from the repo root. Each command builds the package first, then runs it. Anything after `--` is passed through.

```sh
npm run powerscore:record -- --detach nba nhl   # record live slates
npm run powerscore:replay -- --diff             # score the recordings
npm run powerscore:simulate -- 25000            # simulate score distributions
npm run powerscore:validate-live -- nba 10      # watch one league's live scores
npm run powerscore:breaks -- --recording packages/powerscore-tools/recordings
```

## Commands

### `powerscore:record`

Polls the public scoreboards and writes the raw responses, so any version of the scorer can re-score them later. Games being played are polled every 15 seconds, and a league with nothing live every 5 minutes. Standings and game summaries are recorded on their own slower schedules.

```sh
npm run powerscore:record -- [--detach] [leagueId ...]
```

| Argument | Default | |
|---|---|---|
| `leagueId` | every league | One or more league ids, like `nba` or `epl`. Anything unrecognized is ignored |
| `--detach` | off | Keep recording after the terminal closes. Logs to `recordings/recorder.log`. Stop it with `kill $(cat packages/powerscore-tools/recordings/recorder.pid)` |

Only one recorder runs at a time. On macOS it keeps the machine awake for as long as it runs.

### `powerscore:replay`

Replays recordings through PowerScore 2.2.0 and the working tree's PowerScore side by side, then scores both against labelled moments: times when a fan would want to be on a particular game. It prints a scorecard for each scorer, including how many times it switched.

```sh
npm run powerscore:replay -- [options]
```

| Option | Default | |
|---|---|---|
| `--recording <path>` | every recording | A recordings folder, a day folder or a single file |
| `--from <iso>` | start of the recording | Only report from here. State still warms up from the start |
| `--to <iso>` | end of the recording | Stop here |
| `--labels <file>` | `fixtures/labels/*.json` | Labelled moments to score against |
| `--modes a,b` | `classic` | PowerScore modes to run beside 2.2.0: `classic`, `blowouts`, `fantasy` |
| `--roster <file>` | none | A Fantasy roster, as a JSON array, for `fantasy` mode |
| `--timeline <file>` | none | Write a minute-by-minute slate to label by hand |
| `--blind` | off | Leave the scores out of the timeline so labels can't echo a scorer |
| `--diff` | off | List the stretches where the first two scorers disagree on the top game |
| `--json <file>` | none | Write the scorecard as JSON |
| `--include-cold` | off | Also score labels on games seen for less than one history window |

Relative paths resolve against the folder you ran the command from.

### `powerscore:simulate`

Runs the mock game simulator through many 15-second polls and prints the resulting PowerScore distributions, including the gap between the best game and the active one that the sensitivity levels are calibrated from.

```sh
npm run powerscore:simulate -- [ticks | --ticks=<n> | --early-game]
```

It runs 100,000 polls by default. A bare number or `--ticks=<n>` overrides that, with a minimum of 1,000. `--early-game` skips the run and stress-tests early-game scoring instead.

### `powerscore:validate-live`

A manual check, not a test. It polls one league's live scoreboard every 15 seconds and prints each live game's PowerScore and its five signals, so you can eyeball whether low-scoring sports stay alive through decay.

```sh
npm run powerscore:validate-live -- <leagueId> [polls]
```

`polls` defaults to 20. A missing or unknown league id prints the list of valid ones.

### `powerscore:breaks`

Scores the commercial-break detector. It replays recordings through the same steps the extension takes, then compares each poll's verdict with the dead time in the game's post-game play-by-play. Per league, it reports how many breaks were caught, how fast, and how many flagged runs were false alarms.

```sh
npm run powerscore:breaks -- [options]
```

| Option | Default | |
|---|---|---|
| `--recording <path>` | `scripts/powerscore/recordings` | A recordings folder, a day folder or a single file. The default is an older location, so pass `packages/powerscore-tools/recordings` |
| `--play-by-play <path>` | `<recording>/playByPlay` | Cached post-game summaries, named `<league>-<gameId>.json` |
| `--fetch` | off | Download play-by-play for recorded games that have none cached. Soccer is skipped |
| `--max-false <share>` | `0.05` | The most false alarms a league may raise, as a share of its flagged runs. A league over it is marked `OVER` |
| `--leagues a,b` | all | Only these leagues |
| `--examples` | off | List every false alarm |
| `--misses` | off | List every break no rule caught |

## Where recordings live

`packages/powerscore-tools/recordings/<YYYY-MM-DD>/<HH>-<process start>.jsonl.gz`, one file per hour and a new file for every run. The folder is gitignored, and a full day is large. The film for the October 3, 2026 slate was cut from 180 MB.

Every file opens with each live game in full, so any single hour replays on its own.

`apps/film` reads the same folder. `npm run film:extract` turns a night of recordings into the data file the ads are rendered from.

## Other files

- `fixtures/labels/` holds the labelled moments `replay` scores against.
- `fixtures/playByPlay/` holds cached play-by-play for the break detector's tests.
- `./recording` is the one export. `apps/film` imports it to read recordings.
