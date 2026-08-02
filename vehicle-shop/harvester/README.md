# Harvester — vehicle shop

We build and test the spice harvester here, separately from the game and from
the ornithopter shop, in three.js. It must LOOK like the harvester from the
2021 Dune films and ACT like one: a slow, heavy, unstoppable crawler with two
massive tracks, a deck you can see under, and a cutter anchoring it to the
sand. It has no interior by design — the film's crew ride in a raised cab we
do not need to enter.

Building it in its own worktree (`feat/harvester-vehicle-shop`, checked out at
`../Dune-Browser-Game-harvester`) is deliberate: the ornithopter shop has
open rounds (6e/6f) that must not collide with a second vehicle in the same
tree, and this shop boots in one step and can be thrown at a critic in
seconds.

## Run it

```bash
npm run shop:harvester          # dev server for the test area
npm run shop:harvester:check    # type-check (tsc -p vehicle-shop/harvester)
npm run shop:harvester:shoot    # capture the reference views to .shots/harvester/
npm run shop:harvester:build    # production build of the shop alone
```

Controls: `W`/`S` forward/reverse, `A`/`D` steer, `C` cycles camera, `R`
resets. The machine is heavy: it takes seconds to reach its crawl, and it
turns by running its two tracks at different speeds, like the real thing.

## Layout

```text
vehicle-shop/harvester/
├── docs/           the measured source — harvester.3mf (fan model), info.md
├── progress.md     the quality bar, and the round-by-round log
├── tools/shoot.mjs the capture harness
└── src/
    ├── spec.ts       every dimension, with provenance per number
    ├── contracts.ts  the interfaces the halves implement
    ├── crawler/      crawler dynamics — PURE, no three.js, unit-tested
    ├── model/        hull, track pods, cutter, cab, deck machinery
    ├── stage/        the test area, and heightAt()
    ├── camera/       chase / orbit / capture viewpoints
    ├── input/        key state to normalised demand
    ├── ui/           the numeric readout
    └── debug.ts      window.__HARVESTER__, the measurement handle
```

`spec.ts` and `contracts.ts` are the contract between the halves, exactly as
in the ornithopter shop.

## The axis convention

**`-Z` is forward (the cutter). `+Y` is up. `+X` is starboard.** Same as the
ornithopter shop, asserted in `src/seam.test.ts` — the frontmost geometry is
the cutter at negative local Z, and the crawler travels toward it. The
ornithopter's backwards-flight lesson is the reason this guard exists on day
one.

## What the numbers are, and where they came from

`docs/harvester.3mf` is a fan-made "Dune Spice Harvester" model (MakerLab
image-to-3D, BY-NC-SA). It is one 499,978-triangle mesh with no named parts.
Measured with the plate method (see `docs/info.md`), it gives the RATIOS
3.29 : 2.35 : 1 (length : width : height) and the block layout — two
full-length track pods at ~18% of width each, a deck band across the top, an
underframe, and solid nose and tail blocks. Those are MEASURED authority.

The absolute scale (48m hull, 60m with the cutter) is authored; the cutter
boom and the cab are FILM-derived — the 3MF has neither, and the film's
signature harvester act is the cutter in the sand. Do not quietly revert the
measured proportions to a guess, and do not delete the cutter because the
model lacks one.

## Verifying

```bash
npm run lint                   # from the worktree root
npm run shop:harvester:check
npx vitest run vehicle-shop/harvester
bash scripts/check-file-length.sh
```

The 200-line cap applies here (`scripts/check-file-length.sh` matches `*.ts`
anywhere) and `npx tsc --noEmit` does NOT cover this directory — only
`shop:harvester:check` does.

## Deferred until the machine is finished

- A full track tread (the pods currently roll wheels, not a scrolling belt).
- Dust/deformation around the tracks and the cutter.
- Panel lines and weathering (the hull is a flat-shaded blockout).
- A blind critic panel, once the blockout is judged good enough to spend on.

## Where the work is tracked

[`progress.md`](./progress.md) holds the bar and the round log.
