# Stage 12 — Flight mode

**Phase:** 2 · **Depends on:** 04, 05 · **Est. tasks:** 3 · **Builder:** Sonnet
**Status:** TODO — **OUTLINE ONLY, spec before building**

## Goal

The ornithopter travel cinematic. Travel stops being a dot sliding across a map and
becomes the signature moment of the game.

## Sketch

- `FlightMode.ts` — assembly, chase camera, skippable on Esc or click
- `DuneField.ts` — treadmill: fixed grid at the origin, vertex-shader displacement from
  tiling noise, world scrolled by UV offset. No streaming, no float drift.
- `Ornithopter.ts` — GLB, wing-flap animation, banking into turns, rotor dust
- `FlightPath.ts` — **pure** spline and progress maths, unit tested
- `SandFx.ts` — wind-streak particles

## Load-bearing constraints

The engine stays the clock: `progress = (world.time − (arrivalTime − duration)) / duration`
via `currentTravelProgress` from Stage 01. **Skipping is render-only** — it returns to
strategic view early while arrival still fires on the engine clock, so determinism and
E2E timing are untouched.

Needs the ornithopter GLB (≤10k tris) — the only model asset in the slice.

## Open questions for the spec pass

- Does flight play on every trip, or only on first visit to a location? A 16-second
  cinematic on the twentieth trip is a chore.
- Is there any interactivity during flight, or is it purely a transition?
