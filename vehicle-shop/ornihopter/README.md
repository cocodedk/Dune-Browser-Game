# Ornithopter — vehicle shop

We build and test the ornithopter here, separately from the game, in three.js, and aim
for perfection. It must have an interior with pilot seats, fly around a test area under
the player's control, and offer the pilot's own perspective from the seat. When it works,
it goes into the game.

Building it outside `src/` is deliberate. The game's renderer has its own budgets, its own
lazy-loading and its own E2E suite, and iterating a vehicle inside all of that is slow and
risks breaking things that have nothing to do with the vehicle. This shop boots in one
step, renders one craft, and can be thrown at a critic in seconds.

## Run it

```bash
npm run shop:thopter          # dev server for the test area
npm run shop:thopter:check    # type-check (see the warning below)
npm run shop:thopter:shoot    # capture the matched reference views to .shots/thopter-shop/
npm run shop:thopter:build    # production build of the shop alone
```

Controls: `W`/`S` pitch (W is nose down, the aircraft convention), `A`/`D` roll, `Q`/`E`
yaw, `Shift`/`Ctrl` throttle, `C` cycles camera between pilot / chase / orbit, `R` resets.

## Layout

```text
vehicle-shop/ornihopter/
├── docs/           measured sources — the MakerWorld print kit, and info.md
├── progress.md     the quality bar, and the round-by-round log
├── tools/shoot.mjs the capture harness
└── src/
    ├── spec.ts       every dimension, with provenance per number
    ├── contracts.ts  the interfaces the three halves implement
    ├── flight/       flight dynamics — PURE, no three.js, unit-tested
    ├── model/        exterior: hull, canopy shell, wings, tail, gear
    ├── interior/     cockpit: seats, console, controls
    ├── stage/        the test area, and heightAt()
    ├── camera/       camera modes, including the pilot's seat
    ├── input/        key state to normalised demand
    ├── ui/           the numeric readout
    └── debug.ts      window.__THOPTER__, the measurement handle
```

`spec.ts` and `contracts.ts` are the contract between the three halves. They exist so the
flight model, the exterior and the interior can be built in parallel without meeting in a
shared file, which is exactly how the previous ornithopter's builders collided.

## The axis convention

**`-Z` is forward. `+Y` is up. `+X` is starboard.**

Written down here, in `spec.ts`, and asserted in a test — because the previous in-game
ornithopter shipped flying tail-first for months. Its yaw helper aimed `+Z` along the
direction of travel while the hull was modelled nose-along `-Z`, and a unit test had
encoded the bug rather than caught it. Three blind critics missed it too. Nothing about
this convention is self-enforcing; the guard is the assertion that
`dot(noseDirection, velocityDirection) ≈ +1`.

## What the numbers are, and where they came from

`src/spec.ts` carries provenance on every value. Two are worth repeating here, because
`docs/info.md` disagrees with the kit in `docs/` and it is not obvious which to trust.

**Wing count: eight, four per side.** Measured from the print kit, not reasoned. The
standard kit lays out `8 × Wing_full_size.stl`; `Wings_Fullscale_Kit.3mf` lays out
`4 × l1` + `4 × r1`. A top-down photograph reads as three per side because blades overlap
at that angle — measuring the photograph gives the wrong answer, and did.

**Wing planform: 20.69:1, chord near-constant, taper only near the tip.** `info.md` says
`maxChord: 2.5m` / `tipChord: 0.35m` — a strong linear taper at roughly 8:1. That came
from a University of Leicester actor-comparison estimate, not from any licensed kit. The
kit's own wing plate measures 197.66 × 12.37 mm, and the Master Replicas reference
photographs agree with the kit. `spec.ts` follows the kit; do not quietly revert it to the
doc's numbers.

Overall length (22.896 m) and span (51.84 m) come from MENG's licensed 1:72 kit via
`info.md`, and are not in dispute.

## Verifying

```bash
npm run lint
npm run shop:thopter:check
npm run test:unit
```

Two checks those commands do **not** run:

- **`npx tsc --noEmit` does not cover this directory.** The root `tsconfig.json` includes
  only `src`. `npm run shop:thopter:check` is the only thing type-checking shop code.
- **The 200-line cap is not checked by any npm script.** `scripts/check-file-length.sh`
  matches `*.ts` anywhere in the tree, including here, and the pre-commit hook runs it
  *before* the npm commands — so lint, types, build and tests can all pass and the commit
  still be rejected. Check line counts yourself.

Unit tests run in a DOM-less node environment: no `document`, no canvas, no WebGL.
`CanvasTexture` will crash the suite. Build textures from a `Uint8Array` into a
`DataTexture` — see `src/game-render/materials/neutralEnvMap.ts` for the house pattern.

## Deferred until the vehicle is finished

Neither of these starts before the craft flies and looks right. They are records of a
finished thing, and building them early just means building them twice.

- **An artifact page** presenting the finished craft — matched reference-vs-render views,
  the cockpit, the measured dimensions, the flight model. Built from the captures in
  `.shots/thopter-shop/`, not from screenshots taken by hand.
- **A blueprint** — a real technical drawing, SVG or equivalent, that looks genuinely
  draughted rather than filtered over a render. Orthographic top, side and front
  elevations with dimension lines and callouts, generated from `src/spec.ts` so the
  drawing and the model cannot disagree. It has a good measured source already: the print
  kit's parts are flat plates, which makes them true 2D profiles, and the wing plate is
  the real planform.

## Where the work is tracked

[`progress.md`](./progress.md) holds the quality bar this is built against and the
round-by-round log — including, deliberately, the measurements that did not reproduce and
the defects that survived a round. Those entries are the most useful part of the file.
