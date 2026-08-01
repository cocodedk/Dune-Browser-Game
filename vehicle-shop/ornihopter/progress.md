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

_Status: complete._

### Round 1 — Builder A, flight model: LANDED. Verified independently.

22 files, 949 lines, 38 tests, largest file 82 lines. No `three` import anywhere under
`src/flight/`, so it is genuinely pure and genuinely unit-tested. `npx vitest run
vehicle-shop` green in 827ms. Line counts and the three-import check re-run by me, not
taken from the report.

**The sign tests are real and I confirmed it.** `yawHeading`, `rollBank` and
`pitchAltitude` all measure the resulting nose/starboard direction through
`contracts.ts`, not through the flight module's own conventions, so a flipped sign
genuinely fails them. The builder also flipped each sign to watch the matching test fail
before reverting. Measured: yaw-left → heading exactly −40.0°; roll-right → starboard.y
−0.856 with nose.x +0.151, i.e. banking right turns right; throttle 0.2 → 40.07 m/s,
0.9 → 82.80 m/s; beatHz = 1.5 + 2.5 × throttle.

**Finding 1 — the nose-leads test is vacuous. Bar item Q4.1 is currently unguarded.**
`kinematics.ts` defines `velocity = scale(nose, nextSpeed)`. Therefore
`normalise(velocity)` *is* `nose`, and `dot(nose, normalise(velocity))` is identically
1.0 for every orientation, including a completely wrong one. The reported "dot = 1.0
exactly" is the tell: a model that integrated velocity independently would read
0.98–0.999, never exactly 1.

The builder disclosed the architecture honestly and called it "true by construction".
That is accurate about the model — and it is precisely why the test proves nothing about
the thing Q4.1 exists to catch. **The historical bug was never inside the flight model.**
It was a mismatch between the hull's modelled forward axis and the yaw maths. If the
exterior builder models the hull nose-along +Z, this craft flies backwards and all 38
tests still pass at exactly 1.0.

The guard has to live at the seam between the flight model and the geometry, which no
single builder owns. Lead's job: a test in a lead-owned file asserting the craft's actual
frontmost geometry — the canopy — sits at negative local Z. Written once Builder B lands.

**Finding 2 — undisclosed: there is no weight force. The craft cannot fall.** Gravity
appears only as `GRAVITY * nose.y` in the *speed* equation. Nothing accelerates the craft
downward. With the nose level and zero throttle it decelerates on drag alone and holds
altitude forever, coming to a dead stop hanging in mid-air at 60 m. Altitude changes only
by pointing the nose.

The builder disclosed "no stall, no adverse yaw, no skidding" but framed it as a property
of the velocity vector; the absence of weight is a larger simplification and was not
named. For a flapping-wing craft, hovering is arguably *correct* — dragonflies hover —
but this is an accident of the equations rather than a decision, and it is untested.
Deliberately not sent back this round: "flyable first" got what it asked for, and whether
the hover reads wrong is exactly the sort of thing a critic flying it should judge rather
than something to pre-emptively tune.

### Round 1 — blind exterior critic: **Q2 PASSED. Quality 2/10.**

Fresh context, six frames, told nothing:

> "An ornithopter — specifically the dragonfly-style thopter from Denis Villeneuve's
> *Dune* (2021)... High confidence... unmistakably a Dune-thopter homage, built low-poly."

It counted **8 blades, four per side**, independently. **Q2 is met on round 1**, and the
silhouette — the hard part — is right. Quality against a shipped AAA asset: **2/10,
"programmer art, a competent blockout, nothing more"**, which is what "flyable first"
bought and is not a surprise.

**Two defects it found by eye that I then confirmed at source. Neither builder reported
either, and both builders' own tests passed.**

1. **Mirrored wing geometry has inverted normals.** The critic: "left blades render lit
   tan and the right blades render pitch black... a symmetric craft under symmetric light
   should not do this." Confirmed in `model/geometry/wingGeometry.ts`: the index list is
   fixed for both sides while vertex X is multiplied by `outboardSign` (−1 for left).
   Negating one axis inverts triangle handedness, so `computeVertexNormals()` points the
   mirrored side's normals inward. Builder B's tests measured vertex *positions* and
   passed; nothing measured winding.

2. **Nothing in the scene casts or receives shadows.** `grep castShadow` across
   `model/` and `interior/` returns nothing. `stage/scene.ts` enables `shadowMap` and sets
   `sun.castShadow`, so a 2048² shadow map is being computed every frame and thrown away —
   costing performance and producing nothing. That is my hole: I enabled shadows in the
   stage and never told either builder that meshes must opt in.

Other defects named, not yet root-caused: wing roots read as unattached (floating mount
plate, blades emerging through the hull with no fairing) even though Builder B's
containment test passes at 0.56 units — mechanically contained is not the same as visually
attached; an unclosed rectangular box hanging under the aft hull; gear struts a different
value from the hull, one apparently hanging off a wing bracket, and all legs clustered
under the mid/aft body with nothing under the heavy nose, so it would tip onto its canopy
on touchdown; fore and aft blades visibly overlapping at the root cluster in the
beat-down frame.

**A scale-readability failure the numbers hide.** The craft measures exactly 22.896 m by
51.76 m. The critic, reasoning from the cockpit bulb and the scale posts, read it as
**12–18 m long with a 30–40 m span** — roughly 35% under. The dimensions are right and the
craft still does not read as big. Bar item Q4.5 is met by measurement and failed by eye,
which is worth more than the measurement.

**A correction to my own reading.** Looking at `hero.png` I took the long black bars
radiating across the sand for wing shadows. They are the wings themselves, rendered flat
black and unlit. There are no shadows in any frame, as above.

**Its single named gap for round 2:** rebuild the wings as real objects — tapered planform
with actual thickness, rooted into modelled hinge pods faired into the hull, and a
material that is not pure black. "They are ~70% of every silhouette and currently read as
black pencil lines... that one change transforms all six shots at once."

### Round 1 — blind cockpit critic: **2/10. The named gap is a lead's error, not a builder's.**

Fresh context, shown one frame, told nothing about what it was.

> "What the frame actually reads as is a control desk standing in open desert air. There
> is no visible hull, canopy, windshield, or any enclosure connecting the pieces, so
> 'inside a vehicle' is inferred from the props, not seen."

**The single biggest gap, in the critic's words: there is no canopy.** The cockpit is not
a volume — dash, side slab, overhead box and control sticks are disconnected islands with
open sky between them. The reference reads as a cockpit precisely because everything is
mounted to a continuous faceted canopy frame; ours is furniture floating in the air.

**This is my fault, and it is a fault in how I split the work.** I told the exterior
builder "you own the hull shell and the canopy shell" and told the interior builder "the
hull shell and canopy shell belong to the exterior builder, not you". So the canopy exists
as an exterior blob and nothing at all encloses the pilot's view. Neither builder was
wrong; the boundary I drew had a hole in it, and the hole is exactly the thing the frame
most needed. Round 2 gives the canopy — inside face and outside face — to a single owner.

Other specific defects the critic named, none of which any builder reported:
- Four black rectangular panes float unattached at upper left. Not the wings: the wing
  roots sit 3.9–8.7 m *aft* of the pilot's eye, well outside a forward 47-degree half-FOV.
  Still unidentified; round 2 must find them.
- The overhead console hangs from a single stalk that exits the top of frame, with no
  ceiling anywhere — a box suspended in the sky.
- Interior geometry is near-total black silhouette against a bright sky. Nothing lights
  the cabin, so solid shapes read as cutouts.
- The terrain's scale posts read as "stray geometry or debug markers" from inside, and one
  stands dead centre bisecting the sightline. They are mine, added to give the eye
  something of known size; from the cockpit they cost more than they give.
- No seat is visible at all — not the copilot's, not even the pilot's own.

Confirmed against the bar: Q3 target was 7/10. **Scored 2/10. Fails.**

**Other honest limits, disclosed by the builder and confirmed by reading the source:**
rate-command rotation with no inertia or smoothing; throttle passthrough with no spool
lag; ground contact is a position clamp plus speed damping, not impact physics, and the
craft keeps whatever pitch it landed at; no obstacle collision beyond the height field.

### Round 1 — verdict against the bar

| | target | result | |
|---|---|---|---|
| Q1 exterior fidelity | ≥7/10 | **2/10** | fail — expected, "flyable first" |
| Q2 blind identification | names it | **"unmistakably a Dune-thopter", high confidence** | **PASS** |
| Q3 cockpit | ≥7/10 | **2/10** | fail |
| Q4.1 nose leads | dot > 0.99 | guard written, proven falsifiable, passes | **PASS** |
| Q4.2 pilot camera / 2nd seat | seat visible | seat plane sits behind the camera | fail — my spec |
| Q4.3 controls | 4 assertions | all four, falsifiable, verified | **PASS** |
| Q4.4 wings beat | 8, symmetric, contained | 8 counted by a blind eye; roots contained at 0.56u | **PASS mechanically**, fails visually |
| Q4.5 scale | 22.896 × 51.84 m | exact by measurement; reads 35% smaller to a fresh eye | measured pass, perceptual fail |
| Q4.6 ground | never negative | min altitude 0.0 over 60s | **PASS** |

Gate: lint, shop type-check, **1357 unit tests**, no file over 200 lines. 96 meshes,
4304 triangles.

**Four root causes carried into round 2, and three of the four are mine, not a builder's:**

1. *(lead)* **The canopy has no inside.** I gave the canopy shell to the exterior builder
   and explicitly told the interior builder it was not theirs. Nothing encloses the
   pilot's view. One owner takes the canopy — both faces — in round 2.
2. *(lead)* **Shadows are enabled but nothing opts in.** Cost paid, nothing rendered.
3. *(lead)* **`PILOT_EYE.z` sits 0.15 m forward of `seatZ`**, so no forward FOV can ever
   show either seat. Either head-look, or move the eye, or amend the bar — this one needs
   a decision, not a fix.
4. *(builder)* **Mirrored wing normals.** Fixed winding with a negated axis.

**What the loop learned this round.** Builder tests passed on wing containment and the
craft still reads as having unattached wings; builder tests passed on dimensions and the
craft still reads 35% too small. Measurement and perception came apart in both directions,
which is the argument for having critics at all. And the one bar item written specifically
to catch the historical defect — Q4.1 — was guarded by a test that could not fail until
the lead rewrote it, twice, after an invalid fault injection that proved nothing.
