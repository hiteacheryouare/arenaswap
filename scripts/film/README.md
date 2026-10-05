# The films

Three cuts of an ArenaSwap ad (15, 30 and 60 seconds), each in 16:9 (1920×1080) and 9:16
(1080×1920), at 60 fps with a soundtrack. They are rendered from code, so every frame can be
rebuilt, retimed or translated.

Nothing on screen is mocked up. The popup is the shipped extension, built and running inside the
frame. The scores, clocks, PowerScores and tab switches are Saturday, October 3, 2026, as
`scripts/powerscore/recordSlate.ts` recorded it, scored by the PowerScore engine in this repo and
switched by the shipped rule (sensitivity 4, 45-second cooldown). The music and sound effects are
synthesized here too, in `audio/`.

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
  is offline and byte-for-byte repeatable.

## How it works

```
scripts/powerscore/recordings/2026-10-03   (gitignored, 180 MB, made by powerscore:record)
        │  npm run film:extract
        ▼
data/saturday.json      the night, compacted: every game's frames, PowerScores, box scores
        │
stage/                  a React page that composes the frame: the wall of scores, the browser
        │               window, the supers, the dot and the arrows, the end card, and an iframe
        │               for each popup on screen, running the built extension
        ▼
render/render.ts        headless Chrome on a virtual clock, one screenshot per frame, piped
        │               into ffmpeg with the score from audio/
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
  `Math.random` is seeded. A frame comes out the same however long it takes to render.
- **The cuts are data.** `stage/cuts/cut15.ts`, `cut30.ts` and `cut60.ts` list, in bars at 128 BPM:
  the shots, the supers, which popups exist and the night's clock for each, which tab is in front
  and why, the sound cues, and the music's sections. 8, 16 and 32 bars land on exactly 15, 30 and
  60 seconds. The last eight beats, the end card, are the same frames in all three.

## Changing things

| To change | Edit |
|---|---|
| Words on screen | `stage/locales/*.json` (every locale, keys match `en.json`) |
| When things happen | `stage/cuts/cut*.ts` |
| How a shot looks or moves | `stage/shots/*.tsx`, `stage/styles/stage.scss` |
| Which streams are open | `stage/data/tabs.ts` |
| The music | `audio/arrangement.ts`, `audio/theory.ts`; audition with `node scripts/film/audio/cli.cjs --demo 60 --out x.wav` after `npm run film:build` |
| The night | `extract/slateConfig.ts`, then `npm run film:extract` (needs the recording) |

A popup's clock keys are `{ at: film seconds, slate: sat('7:33:16') }`. Between two keys the night
runs linearly; two keys at the same film time are a cut; outside its keys a clock runs at real
speed. Real events worth landing on a beat (all Eastern, all from the recording):

| Time | What happened |
|---|---|
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
