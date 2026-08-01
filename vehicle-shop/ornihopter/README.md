We build and test the Ornihopter here, separately. 
We build it in ThreeJS and aim for perfection.
Ornihopter must have interior and pilot seats and become functional to fly around the test area.
We should be able to steer it and the player can pilot it and have the pilot's perspective.

Measurements and instructions are saved in ./docs subfolder

The functioning Ornihopter will be inserted into the game when ready.

## Deferred until the vehicle is finished

Neither of these starts before the craft flies and looks right. They are records of
a finished thing, and building them early just means building them twice.

- **An artifact page.** A published page presenting the finished ornithopter — the
  matched reference-vs-render views, the cockpit, the measured dimensions, and the
  flight model. Build it from the captures in `.shots/thopter-shop/`, not from
  screenshots taken by hand.
- **A blueprint.** A proper technical drawing of the craft — SVG, or anything that
  produces a genuinely draughted look rather than a filter over a render. Orthographic
  top, side and front elevations with dimension lines and callouts, drawn from
  `src/spec.ts` so the drawing and the model cannot disagree. The measured sources for
  it are already in `docs/`: the print kit's flat plates are true 2D profiles, and the
  wing plate in particular is the real planform.

## Where the work is tracked

[`progress.md`](./progress.md) holds the quality bar this is being built against and the
round-by-round log, including the measurements that did not reproduce.
