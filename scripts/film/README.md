# The films

Three cuts of an ArenaSwap ad (15, 30 and 60 seconds), each in 16:9 (1920×1080) and 9:16
(1080×1920), at 60 fps with a soundtrack. Each runs on into credits: the Lattice & Company lockup
and Ryan Mullin's wordmark, then, in the 60 only, the site's own disclaimers. They are rendered from
code, so every frame can be rebuilt, retimed or translated.

Nothing on screen is mocked up. The popup is the shipped extension, built and running inside the
frame. The scores, clocks, PowerScores and tab switches are Saturday, October 3, 2026, as
`scripts/powerscore/recordSlate.ts` recorded it, scored by the PowerScore engine in this repo and
switched by the shipped rule (sensitivity 4, 45-second cooldown). The one exception is the 60's
pre-game beat: Saturday's recording kept no pre-game data, so it shows Bears at Packers (Sun., Oct.
11), fetched before kickoff by `npm run film:pregame` into `data/pregame.json`.

The soundtrack is Otis McDonald's "Put It On The Floor", played 1% fast so it sits at 96 BPM. The
sound effects on top of it are a synthesized drumline, made in `audio/`.

## Make them

```sh
npm run film                                    # build, then render all six films
npm run film -- --cut 30 --format portrait      # just one
npm run film:render -- --cut 60 --scale 0.5     # quick half-size preview, no rebuild
npm run film:render -- --cut 15 --stills 4.2,9  # PNG frames at those seconds instead of a video
npm run film -- --locale ja                     # any locale the extension ships
```

Everything lands in `scripts/film/out/` (gitignored), named `arenaswap-<cut>s-<16x9|9x16>.mp4`.
A full set of six takes roughly 20 minutes on an Apple-silicon Mac with `--jobs 2`.

| Option | Default | |
|---|---|---|
| `--cut` | `15,30,60` | Which cuts |
| `--format` | `landscape,portrait` | 16:9, 9:16 or both |
| `--locale` | `en` | The supers come from `stage/locales/<locale>.json`, the popup from the extension's own catalog |
| `--jobs` | `2` | Renders in parallel |
| `--scale` | `1` | Smaller output for a fast look |
| `--stills` | | Seconds to write as PNGs, comma separated |
| `--offline` | | Never download; fail on a crest the cache does not hold |

### What it needs

- The repo's own dependencies (`npm install`). Nothing else is installed.
- Google Chrome, Chromium or Edge. Found in the usual places, or set `CHROME_PATH`.
- ffmpeg with libx264 and AAC. Found on `PATH`, in Homebrew's prefix, or inside kdenlive on a Mac
  (`/Applications/kdenlive.app/Contents/MacOS/ffmpeg`), or set `FFMPEG_PATH`.
- A network connection the first time only. Team crests and league marks are fetched from our
  sources' image servers once and kept in `scripts/film/.cache/` (gitignored); after that a render
  needs no network.
- The recording, at `scripts/film/music/putItOnTheFloor.mp3` (gitignored, since it isn't ours to
  redistribute). Without it the films fall back to the old synthesized pep band score.

## How it works

```
scripts/powerscore/recordings/2026-10-03   (gitignored, 180 MB, made by powerscore:record)
        │  npm run film:extract
        ▼
data/saturday.json      the night, compacted: every game's frames, PowerScores, box scores
        │
stage/                  a React page that composes the frame: the wall of scores, the browser
        │               window, the supers, the dot and its orange cards, the end card, and an iframe
        │               for each popup on screen, running the built extension
        ▼
render/render.ts        headless Chrome on a virtual clock, one screenshot per frame, piped
        │               into ffmpeg with the soundtrack from audio/
        ▼
out/*.mp4
```

- **The popups are real.** `build:film` builds the extension into `apps/extension/.output/film`.
  The film server serves that build and slips `stage/popup/popupShim.ts` into `popup.html` and
  `guide.html` ahead of the app. The shim installs the same fake `browser` the Cypress e2e suite
  uses, serves the recorded box scores, and pins each popup's clock to the moment of the night it
  is showing. The stage then pushes `SCORES_UPDATED` the way the background worker does and clicks
  through the UI with `element.click()`, so every card, chart, toast, glide and burst of confetti
  is the extension's own.
- **Time is virtual.** Chrome's virtual time drives timers, `requestAnimationFrame` and `Date`.
  CSS animations, transitions and Web Animations run on the compositor's clock instead, so
  `render/pageClock.ts` pauses every one of them each frame and sets it from the virtual clock.
  `Math.random` is seeded. A frame comes out the same however long it takes to render, with one
  exception: the popup launches confetti from an effect that runs after a paint, so a burst can
  start a frame apart between two renders and scatter a little differently.
- **The cuts are data.** `stage/cuts/cut15.ts`, `cut30.ts` and `cut60.ts` list, in bars at 128 BPM:
  the shots, the supers, which popups exist and the night's clock for each, which tab is in front
  and why, the sound cues, and the music's sections. 8, 16 and 32 bars land on exactly 15, 30 and
  60 seconds; the credits come after, three bars in the 15 and the 30 and five in the 60. The end
  card starts fourteen beats from the end (eight in the 15) and holds one beat of the soundtrack
  past it. It lifts Kentucky's LIVE badge to centre stage, turns its dot into each sport's ball and
  lands it as the wordmark's period; `endingFor` in `stage/cuts/shared.ts` times the balls and the
  landing, and the wordmark builds around the landing.
- **The soundtrack is cut to the picture.** At 96 BPM, three of its beats fill one of our bars, so
  every cut lands on one of its sixteenths. `audio/soundtrack.ts` holds what was measured off the
  recording: its tempo, where its beat grid starts, and its last hit. `audio/soundtrackMix.ts` lines
  that last hit up with each cut's `landsAt`, the moment the dot lands in the wordmark. Anything you
  hear as a hit (the balls changing, the Ctrl+Tab flick, a click) is timed with `musicBeats()` so it
  falls on the recording's grid.

## Changing things

| To change | Edit |
|---|---|
| Words on screen | `stage/locales/*.json` (every locale, keys match `en.json`) |
| The disclaimers in the credits | Read from the site, `apps/docs/src/i18n/strings/*.json` (`legal.terms`) |
| When things happen | `stage/cuts/cut*.ts` |
| How a shot looks or moves | `stage/shots/*.tsx`, `stage/styles/stage.scss` |
| Which streams are open | `stage/data/tabs.ts` |
| The music | Swap the file in `scripts/film/music/` and re-measure `audio/soundtrack.ts`. Hear a cut's soundtrack without the picture: `node scripts/film/audio/cli.cjs --cut 30 --out x.wav --report` after `npm run film:build` |
| The sound effects | `audio/sfx.ts` (the drumline voices are in `audio/drums.ts`), levelled against the music in `audio/mixer.ts`. `--sfx dot` plays one kind alone |
| The fallback score | The pep band in `audio/arrangement.ts`, `audio/theory.ts`, `audio/brass.ts` and `audio/cadences.ts`. Audition with `--demo 60` |
| The night | `extract/slateConfig.ts`, then `npm run film:extract` (needs the recording) |
| The pre-game game | `npm run film:pregame -- <game id>` (only before kickoff) |

A popup's clock keys are `{ at: film seconds, slate: sat('7:33:16') }`. Between two keys the night
runs linearly; two keys at the same film time are a cut; outside its keys a clock runs at real
speed. Real events worth landing on a beat (all Eastern, all from the recording):

| Time | What happened |
|---|---|
| 7:14:00 | A lull: every open tab is under 45, so a Standby Stream threshold of 45 parks the browser on the channel |
| 7:28:40 | Kentucky ties South Carolina 27–27 with a field goal, 4:17 left |
| 7:33:00 | Cal scores at UNLV with 0:31 left; ArenaSwap switches at 7:33:16 |
| 7:34:17 | Aranda homers, Rays 1, Yankees 0 |
| 7:35:18 | Cal's onside kick fails; ArenaSwap switches back to Kentucky |
| 7:48:11 | Regulation ends tied; ArenaSwap switches to Bay FC at KC Current |
| 7:48:47 | KC Current score, 3–1 |
| 7:54:21 | Overtime; ArenaSwap switches back |
| 8:01:49 | Kentucky touchdown, 33–34 |
| 8:02:51 | Kentucky's two-point conversion, 35–34 |

## When a render goes wrong

- **"Stuck for 30s"**: virtual time will not advance while a request is in flight, and the message
  names the request. Usually a crest that never answers; run again, or use `--offline` once the
  cache is warm.
- **A popup is blank or in the wrong state**: render `--stills` around that moment. Page errors
  from the stage and every popup are printed after each film.
- **"Chrome never drew frame N"**: Chrome stopped producing frames. The flags in
  `render/tools.ts` are what stopped this happening during development; check they are all there.
