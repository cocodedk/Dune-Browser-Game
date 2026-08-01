# Ornithopter Gauntlet Loop — the bar, and the live log

Standalone rig at `vehicle-shop/ornihopter/`. Run it with `npm run shop:thopter`.

Strategy chosen by the user: **flyable first, pretty later.** Round 1 optimises for a
correct, steerable, pilot-POV craft with placeholder-quality geometry. Exterior fidelity
rounds only start once flight and cockpit are right. The reason is that half this bar is
machine-checkable and half needs a critic's eye, and the machine-checkable half is both
cheaper to iterate and the half that sank the last run.

---

## The bar

Four questions. A round is not finished until all four have been asked, and **Q4 is asked
of every critic, every round, without exception.**

### Q1 — Exterior fidelity, against a real reference, side by side

Reference assets, already in the repo:

| view | file |
|---|---|
| top, near-orthographic | `.shots/reference/mr-O9copy.jpg` |
| side | `.shots/reference/mr-O4copy.jpg` |
| 3/4 hero, lit | `.shots/reference/thopter-mr.jpg` |
| 3/4 rear, wings visible | `.shots/reference/mr-IMG_9407.jpg` |
| landed, wings raised | `.shots/reference/mr-IMG_9428copy.jpg` |

We render the craft from three matched viewpoints and a fresh critic scores each 0–10
against the photograph placed beside it, then names the single largest difference.
**Target: ≥7/10 on all three.**

Measured sub-part, parameters fixed here so a number can be reproduced rather than
argued: span/length ratio from our top render must be within **±10%** of the same ratio
measured off `mr-O9copy.jpg`, which measures **1804 px span / 767 px length = 2.35**.

### Q2 — Blind identification, exterior

A fresh critic, told nothing about what it is looking at, sees a 3/4 render at 1280 px and
a 96 px thumbnail. It must name it as a Dune ornithopter, or failing that as "a
flapping-wing aircraft of dragonfly configuration". Anything vaguer is a fail.

### Q3 — Blind identification, interior

A fresh critic, told nothing, sees one pilot-POV frame. It must say, unprompted, that this
is the pilot's seat of an aircraft cockpit looking forward through a canopy, with a second
crew seat alongside. Then it is shown `.shots/reference/thopter-03.jpg` (the production
cockpit concept art) and scores the match 0–10. **Target: ≥7/10.**

### Q4 — Correctness. Every critic answers these, and each is also a mechanical assertion.

This section exists because the previous ornithopter loop **flew backwards for four rounds
and past three blind critics.** Every critic had been asked "is this convincing?" and none
was ever asked "is this doing the right thing?". One critic described a nose cone and
cockpit glass while noting the camera sat behind the craft, and never joined the two
facts. The user caught it in one glance. That was a flaw in the bar, not in the critics.

1. **Does the nose lead?** `dot(noseDirection(orientation), normalise(velocity)) > 0.99`
   in steady flight. Asserted in a unit test, not eyeballed.
2. **Is the pilot camera actually in the pilot's seat?** Its world position must lie
   inside the cabin volume; the canopy must be between it and the horizon; the seat it
   represents must not be visible in front of it; the second seat must be visible to the
   side. Partly mechanical, partly a critic's read of the frame.
3. **Do the controls do what they claim?** Four numeric assertions: pitch up raises
   altitude; yaw left rotates heading counter-clockwise seen from above; roll banks *into*
   the turn; throttle up raises speed.
4. **Do the wings beat, and correctly?** Tip Y amplitude > 0; beat frequency rises with
   throttle; left and right symmetric; four blades per side, eight total; the root stays
   inside the hull through the whole cycle and no blade passes through the fuselage.
5. **Is the scale right?** Length ≈ 22.896 m, span ≈ 51.84 m. A seated pilot's eye sits
   ≈ 1.65 m above the cabin floor. A 1.8 m figure fits the cabin.
6. **Does it stay out of the ground?** Over a 60 s flight, craft altitude above
   `heightAt(x, z)` never goes negative.

---

## Measured inputs — what the build targets and where each number came from

Recorded because two sources in `docs/` disagree with each other, and one of them is wrong.

| quantity | value | source |
|---|---|---|
| length | 22.896 m | MENG licensed 1:72 kit, via `docs/info.md` |
| span | 51.84 m | same |
| **wing count** | **8, four per side** | **MEASURED**, see below |
| wing length / max chord | **20.69** | **MEASURED** from the print kit's wing plate |
| chord distribution | near-constant over the middle 60%, taper only near the tip | same |

**The wing count was checked and the doc was right.** Reading the top-view photograph, I
measured three blades per side across ten scanline stations and was ready to build six
wings. The user said trust the doc. The print kit the user then supplied settles it
mechanically: `Dune_Ornithopte_Standard_Kit_with_FullScale_Wings.3mf` lays out
`8 x Wing_full_size.stl`, and `Wings_Fullscale_Kit.3mf` lays out `4 x l1` + `4 x r1`.
Eight wings, four per side. The photograph reads as three because blades overlap at that
angle. Recorded because it is the exact failure the method warns about — a measurement is
only as good as the thing being measured, and a photograph of an object is not the object.

**The doc is wrong about wing planform, though.** `docs/info.md` gives `maxChord: 2.5m,
tipChord: 0.35m` — a strong linear taper, 8:1 length-to-chord. That came from a University
of Leicester actor-comparison estimate, not from any licensed kit. The kit's own wing
plate measures 197.66 × 12.37 mm with chord near-constant along the span: **20.69:1**, well
over twice as slender, and the Master Replicas photographs agree with the kit. `spec.ts`
follows the kit and records why.

---

## Baseline — measured before any work

| metric | value |
|---|---|
| everything | nothing exists yet; `vehicle-shop/ornihopter/` held only `README.md` and `docs/` |

---

## Rounds

### Round 0 — scaffold (lead, no builders)

Harness the builders write into, so nobody has to invent the file layout and no two agents
meet in the same file.

- `spec.ts` — every dimension, with provenance per number. Lead owns it; builders read it.
- `contracts.ts` — the three interfaces, so flight, exterior and interior can be built in
  parallel without a shared file.
- `stage/scene.ts`, `stage/terrain.ts` — test area. `heightAt()` is exported pure and is
  the same function that displaces the mesh, so the craft cannot fly through a dune it
  believes it is above.
- `input/keyboard.ts` — key state to normalised demand.

Tooling notes for anyone reading later:
- `vite.config.ts` `test.include` was extended to `vehicle-shop/**/*.test.ts`. Without it
  the shop's unit tests are silently not run by `npm run test:unit`.
- The shop has its own `tsconfig.json` and its own npm scripts (`shop:thopter`,
  `shop:thopter:build`, `shop:thopter:check`), deliberately outside the game's `tsc -b` so
  it cannot emit into `dist/` or disturb the bundle budgets.
- `scripts/check-file-length.sh` matches `*.ts` **anywhere in the tree**, so the 200-line
  cap applies here too. The pre-commit hook runs it before the npm commands, so lint,
  types, build and tests can all pass and the commit still be rejected.

_Status: in progress._
