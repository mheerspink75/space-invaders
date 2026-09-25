# Space Invaders

A classic arcade Space Invaders clone built as a single-page React app, rendered
to an HTML5 canvas with a hand-rolled game loop and a WebAudio synth for all of
the sound. There are **no image or audio assets** — every sprite is an ASCII
bitmap baked into an offscreen canvas at boot, and every sound is generated with
oscillators and noise buffers.

Deployed to GitHub Pages with GitHub Actions.

## Contents

- [Features](#features)
- [How to play](#how-to-play)
- [Controls](#controls)
- [Tech stack](#tech-stack)
- [Local development](#local-development)
- [Deploying to GitHub Pages](#deploying-to-github-pages)
- [Tuning the game](#tuning-the-game)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)

## Features

- 5 × 11 invader formation in three types — squid (30), crab (20), octopus (10)
- The formation **accelerates as you thin it out**, drops at the screen edges,
  and gets faster again on every wave
- Four destructible pixel bunkers that take damage from your shots *and* from
  invader bombs, so you eventually have to thread the gaps
- Mystery UFO flying across the top worth 50 / 100 / 150 / 300
- Three lives, an extra cannon at 1500 points, and a high score persisted in
  `localStorage`
- The four-note marching bass that speeds up as the formation speeds up
- Shots and bombs cancel each other out, as in the arcade original
- Only one cannon shot on screen at a time and a maximum of three bombs in
  flight, so the game stays a duel rather than a bullet storm
- Pause, mute, and automatic pause when the tab loses focus
- On-screen controls appear automatically on touch devices
- **Board scales to fill the window** using a whole number of device pixels per
  game pixel, so the art is always perfectly square and never softens
- **Hand-drawn 5×7 pixel font** for the score, wave and status text, so the HUD
  is pin-sharp at every size instead of a blurry scaled system font
- Retro presentation: 256 × 224 playfield, `image-rendering: pixelated`,
  scanline overlay scaled to match the zoom, and reduced-motion support

## How to play

You defend a cannon at the bottom of the screen from descending waves of
invaders. Land a wave to advance; lose all your cannons and it's game over.

| Event                     | Points |
| ------------------------- | ------ |
| Squid (top row)           | 30     |
| Crab (middle rows)        | 20     |
| Octopus (bottom rows)     | 10     |
| Mystery UFO               | 50–300 |
| Extra cannon              | at 1500 |

Reach the bottom with the formation intact and you lose immediately, so a wave
you cannot finish has to be pushed back by careful shooting.

## Controls

| Action | Keys                   |
| ------ | ---------------------- |
| Move   | `←` `→` or `A` `D`     |
| Fire   | `space` (or `↑` / `W` / `Z` / `J`) |
| Start  | `enter` or `space`     |
| Pause  | `P` or `Esc`           |
| Mute   | `M`                    |

Holding fire keeps shooting at the weapon's rate, but a shot has to leave the
screen before the next one is fired.

## Tech stack

| Package             | Version |
| ------------------- | ------- |
| React               | 19      |
| TypeScript          | 7       |
| Vite                | 8       |
| @vitejs/plugin-react| 6       |

No game engine, no physics library, no asset pipeline — the whole thing is
about 1,600 lines of TypeScript, of which the game engine itself is ~740.

## Local development

Requires **Node 20 or newer** and npm. If you're working inside WSL, see
[Troubleshooting](#troubleshooting) first — the Windows Node copy usually takes
over and breaks every script.

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script              | What it does                            |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Vite dev server with fast refresh       |
| `npm run build`     | Type-check, then build into `dist/`     |
| `npm run preview`   | Serve the production build locally     |
| `npm run typecheck` | TypeScript only, no bundle              |

The production build emits a plain static `dist/` — no server, no runtime
config, no routing, so it can be hosted anywhere that serves files.

## Deploying to GitHub Pages

The app is configured for a **user/org Pages site** (`base: '/'` in
`vite.config.ts`), which means it is served from the root of a domain:

```
https://<your-username>.github.io/
```

1. Put this project in the repository that matches your username — for example
   `https://github.com/<your-username>/<your-username>`, the special
   `<user>.github.io` repository — and push it to the default branch, `main`.
2. In that repository open **Settings → Pages → Build and deployment → Source**
   and select **GitHub Actions**.
3. Push to `main`. `.github/workflows/deploy.yml` checks the code out, installs
   dependencies with `npm ci`, type-checks and builds, uploads `dist/` as a
   Pages artifact, and publishes it. The live URL is printed in the workflow run
   summary.

Every push to `main` redeploys; the workflow cancels an in-flight deployment if
a newer push lands first. You can also deploy by hand from the **Actions** tab
via *Deploy to GitHub Pages → Run workflow*.

The workflow grants only what it needs: `contents: read`, `pages: write`, and
`id-token: write` for the Pages deployment token.

### Deploying to a project site instead

If you want `https://<your-username>.github.io/<repo>/` instead, change the
`base` in `vite.config.ts`:

```ts
export default defineConfig({
  base: '/<repo>/',
  plugins: [react()],
})
```

## Tuning the game

All gameplay numbers live in `src/game/constants.ts`, so feel is adjusted in
one place without touching the engine:

| Constant                | Effect                                    |
| ----------------------- | ----------------------------------------- |
| `ALIEN_BASE_SPEED`      | Formation speed at the start of a wave     |
| `ALIEN_SPEED_PER_KILL`  | Extra speed per invader destroyed          |
| `ALIEN_LEVEL_SPEED_BONUS` | Extra speed per wave cleared             |
| `PLAYER_SPEED`          | Cannon movement speed                      |
| `PLAYER_FIRE_COOLDOWN`  | Minimum time between shots                 |
| `MAX_PLAYER_BULLETS`    | Shots allowed on screen at once            |
| `BOMB_SPEED`            | Speed of incoming bombs                    |
| `ALIEN_DROP`            | Pixels the formation descends per bounce  |
| `INVASION_Y`            | How close the formation may get before you lose |
| `MARCH_INTERVAL_MAX/MIN`| Tempo of the marching bass                 |

Artwork is defined as ASCII strings in `src/game/sprites.ts` — the invader
frames, the cannon, the UFO, the bombs, and the bunker mask. Bunker dimensions
are derived from that mask, so a bunker can be reshaped by editing the string.

## Project layout

```
.github/workflows/deploy.yml   GitHub Pages build & deploy
index.html                     Entry document, hosts the canvas
vite.config.ts                 Vite config (base path for GitHub Pages)
src/
  main.tsx                     React entry point
  App.tsx                      Canvas, HUD overlays, keyboard + touch wiring
  styles.css                   Retro cabinet styling and scanlines
  vite-env.d.ts                Vite client type declarations
  components/
    Overlays.tsx               Title / game over / pause screens
    TouchControls.tsx          On-screen d-pad and fire button
  game/
    Game.ts                    Entities, collision, scoring, rendering, loop
    constants.ts               Every tuning value
    sprites.ts                 ASCII pixel art baked to offscreen canvases
    font.ts                    5x7 pixel font used for the HUD
    sound.ts                   WebAudio synth: marching beat, pew, explosions
    input.ts                   Keyboard bindings
    types.ts                   Shared types
```

### How it fits together

`Game` owns the entire simulation and rendering. React's job is only to own the
`<canvas>`, mount the game, and subscribe to HUD values:

- `Game` runs its own `requestAnimationFrame` loop and draws a fixed
  256 × 224 playfield.
- **Zoom is always a whole number of device pixels.** The canvas backing store is
  `256 × zoom` by `224 × zoom` device pixels and the context is scaled by `zoom`,
  so every game pixel covers an exact square of screen pixels. Scaling by a
  fraction (the usual `width: 100%`) is what makes pixel art look soft and
  shimmer, so the app picks the largest whole zoom that fits the window and
  recomputes it on resize — a 1080p screen gets 4×, i.e. a 1024 × 896 board.
- HUD text uses a hand-coded 5 × 7 pixel font (`src/game/font.ts`) baked into
  small canvases and cached, not a system font, so it stays sharp when scaled.
- HUD values (score, lives, wave, status, mute) are pushed out through a
  listener only when they change, so React re-renders a handful of times per
  game instead of once per frame.
- Collision is rectangle work against the formation, the UFO, and per-pixel
  against the bunkers, which are stored as a `Uint8Array` of solid pixels and
  carved out where they take a hit.
- Audio is created lazily on the first key press or button tap, which satisfies
  browser autoplay policy without a "click to enable sound" gate.

## Troubleshooting

**`npm run dev` fails with "UNC paths are not supported" or "'vite' is not recognized"**

You are running **Windows** Node against a WSL filesystem path (for example
`\\wsl$\Ubuntu\home\...`). Windows command shims cannot use a UNC working
directory, so every npm script breaks. The fix is to use Linux Node inside WSL:

```bash
sudo apt update
sudo apt install -y nodejs   # gives you `node` only
sudo apt install -y npm      # npm is a SEPARATE package on Ubuntu
```

Check that you got both, and that they are the Linux ones:

```bash
which node npm
# /usr/bin/node
# /usr/bin/npm
```

> Installing only `nodejs` is the usual trap: Ubuntu ships `node` and `npm` as
> separate packages, so without the second command `npm` keeps falling through
> to the Windows copy in `/mnt/c/Program Files/nodejs` and you are back to the
> UNC error. `/usr/bin` comes before that path in `PATH`, so once `/usr/bin/npm`
> exists it wins.

**`vite: Permission denied`, or "Cannot find module @rolldown/binding-linux-x64-gnu"**

`node_modules` was installed by Windows npm: the `node_modules/.bin` shims have
no execute bit and the only native binding present is the Windows one. Do a
clean reinstall with the Linux npm:

```bash
rm -rf node_modules
npm ci
```

**Still broken after both of the above**

`hash -r` to clear the shell's command cache, or open a new terminal. If `which
npm` still points into `/mnt/c/Program Files/nodejs`, a stale `PATH` entry is
ahead of `/usr/bin` — fix it in your shell profile.

**No sound**

Browsers block audio until you interact with the page. Press a key or tap
START. Check the sound toggle in the footer, and note that `M` mutes.

**The game looks blurry or uneven**

It should be impossible: the board is drawn at a whole number of device pixels
per game pixel. If it still looks soft, something is overriding the CSS —
check for a global `image-rendering: auto` or a canvas style from browser dev
tools. Note that a browser zoom level or a non-integer OS display scale (like
Windows 125%) is handled automatically, since the app measures
`devicePixelRatio` and rounds the zoom to a whole number of device pixels.
