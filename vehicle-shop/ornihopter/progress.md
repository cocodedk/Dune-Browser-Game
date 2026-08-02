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

**The reference set changed on 2026-08-01 and this section was rewritten to match.** The five
Master Replicas photographs (`mr-O9copy`, `mr-O4copy`, `mr-IMG_9407`, `mr-IMG_9428copy`,
`thopter-mr`) were deleted by the user, who judged them wrong and misleading because they
read as three blades per side where the craft has four. They were never tracked — `.shots/`
is gitignored — so they are gone for good. Any round scored against them is not reproducible
now, and this is recorded so a later reader does not think the bar was simply sloppy.

Reference assets that actually exist:

| view | file | what it is good for |
|---|---|---|
| 3/4, assembled, wings extended | `.shots/reference/kit-assembled.png` | **primary.** A photograph of the user's own printed kit: ball-joint wing roots, faceted hull, canopy, gear |
| full craft, front-port 3/4, 20cm ruler | `docs/dune_ornihopter_kit-2.png` | second assembled view: landing stance, wing splay, boom taper. The ruler lies diagonal to the camera — scale sanity only, never a measurement source |
| hull close-up, nose-on starboard 3/4 | `docs/dune_ornihopter_kit-3.png` | **best hull view held.** Hard chine, chisel nose with twin tip slots, dorsal wing-root shelf, flank intake grille, deck louvres, pod-to-boom contrast, panel language |
| flat blade planform, root socket | `.shots/reference/kit-sprue-wings.png` | wing outline and the moulded root socket |
| cockpit interior concept art | `.shots/reference/thopter-03.jpg` | **primary for Q3** |
| canopy raised, crew seated | `.shots/reference/thopter-04.jpg` | canopy shape, seating posture |
| ingress/egress, landing gear | `.shots/reference/thopter-05.jpg` | gear and ramp arrangement |

A fresh critic scores our renders 0–10 against `kit-assembled.png` placed beside them, then
names the single largest difference. **Target: ≥7/10.**

Measured sub-part: span/length ratio from our top render must be within **±10%** of **2.35**.
That figure was measured by pixel off `mr-O9copy.jpg` (1804 px span / 767 px length) while it
still existed, and it is retained as a recorded historical measurement — the number survives
even though the image does not. It cannot be re-derived from `kit-assembled.png`, which is an
oblique three-quarter view and cannot give a true planform ratio. If that target is ever
disputed, it must be re-measured against a new orthographic reference rather than defended
from this line.

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

## img2threejs — verdict and what the kit photograph gave us

The skill at `~/.claude-personal/skills/img2threejs` **is** a clone of
`github.com/img2threejs/img2threejs` — nothing to fetch. Its intake gates admit
`docs/dune_ornihopter_kit.png` (1278x995, technical suitability pass, pHash recorded).

**Used in analysis-only mode. The code-generating stages were deliberately not run**, for
three reasons, the first of which is already recorded from the previous ornithopter loop:

1. `stage3_build/generate_threejs_factory.py` emits **one factory file** from a JSON spec.
   This repo caps every source file at 200 lines and the craft is deliberately split across
   hand-authored modules under `model/`, `interior/` and `flight/`, each with its own tests.
   A generated monolith would replace tested work with untested work and fail the hook.
2. By the skill's own validation rubric this photograph is a **weak reconstruction target**:
   the assembled craft occupies a small fraction of the frame, it is a single oblique view in
   hard sunlight, and much of the model is self-occluding.
3. **The model in the photograph appears partially assembled** — the sprues around it are
   still full of parts. Its visible wing count must not be used to re-litigate anything.

Analysis-only is the right mode here and it paid for itself. `.shots/reference/kit-assembled.png`
is a 3x crop of the built craft and is now a first-class reference; it shows things the flat
3mf plates structurally cannot.

**What the assembled photograph settles that the plates could not:**

- **The wing roots are ball joints.** Distinct spherical housings sit in a row along the dorsal
  spine, each blade attaching through a narrow neck. Our wings currently emerge from the hull
  with no mechanism at all, which is exactly what the blind critic called "wing roots are not
  attached... a black mounting plate that floats with a visible gap".
- **The blades are not flat plates and not straight.** Each carries a visible spar along its
  length and steps down in width at a distinct kink partway out, rather than tapering smoothly.
  This corroborates the `offset` range of -0.064..+0.251 measured off the kit's wing plate,
  which `WING.chordProfile` does not currently capture — our blades are straight where the real
  ones sweep.
- **The blades are not coplanar.** They fan in elevation as well as in plan, with visible
  dihedral variation between pairs.
- **The fuselage is faceted with a flat underside and hard chine lines.** Our hull is a single
  `LatheGeometry` revolve, which is a circular cross-section by construction and cannot produce
  a chine. This is a structural mismatch, not a texture one.
- **The canopy is a distinct faceted glazed volume** with visible framing, seated on the nose —
  consistent with `thopter-03.jpg` and `mr-O4copy.jpg`.

None of this changes round 2, which is already scoped to the cockpit. It is the round 3 brief.

## Round 3 — shape. Sequenced, not fanned out.

Goal restated by the user: deliver the craft with the correct shape.

Four shape defects are known. Two are being built now; two are deliberately queued behind
them, because the wings and the landing gear both attach to a hull that is being reshaped
underneath them this minute. Fanning all four out would repeat the coupled-artifact
collision the method warns about, in a subtler form than a shared file — a shared
*junction*.

| defect | evidence | status |
|---|---|---|
| hull is a revolve: circular by construction, so no chine, no flat belly, no facet, one continuous mass instead of three blocks, no forked tail | `kit-assembled.png`, `mr-O4copy.jpg`, kit part list is a panelled assembly | **building** |
| cockpit is not an enclosed volume; canopy has no inside face | blind critic, 2/10 | **building** |
| wings are flat black slabs: no thickness, no sweep, no root mechanism | blind critic ("~70% of every silhouette... black pencil lines"); `sweepProfile` measured and still unconsumed; ball housings visible in `kit-assembled.png` | queued |
| gear clusters under the mid/aft body with nothing under the heavy nose — it would tip onto its canopy; struts are a different value from the hull | blind critic | queued |

The interface pin that lets the two current builders run at once: `buildHullGeometry()` must
keep returning a single `BufferGeometry`, so `Ornithopter.ts` never changes hands.
`hullHalfWidthAt`/`isOutsideHull` must keep agreeing with the mesh actually built, because
the wing-clearance tests prove no blade passes through the fuselage through those functions
rather than through the geometry.

### Round 3 — hull and cockpit landed. Q1's measurable sub-part now PASSES.

Verified by the lead, at a defined pose with wings level:

| | value | |
|---|---|---|
| length | 22.896 m | 0.00% error against target |
| span | 51.757 m | 0.16% short of 51.84 |
| span / length | **2.261** | reference 2.35, window 2.115–2.585 — **PASS** |
| triangles / meshes | 4405 / 113 | whole craft including interior |

**A number to reconcile before it becomes a phantom.** The hull builder reported 3209
triangles; the manifest says 4405. Both are correct — the builder counted the exterior
through `Ornithopter.test.ts`, while `debug.measure()` walks the whole craft root, which has
the cockpit parented under it. Same class of mismatch as round 1's 51.32-vs-51.76 span:
different measurement scopes, not a disagreement. Recorded because an unexplained gap between
two numbers is exactly what wasted time in the previous loop.

**Open, not yet diagnosed:** soft warm glows appear in the pilot frame. They are NOT the new
cabin `PointLight`s directly — three.js does not render a light as geometry. Working
hypothesis is point-light hotspots falling on the transparent canopy panes: intensity 9 with
decay 2, positioned within inches of the glazing. To be confirmed by disabling the lights and
re-shooting once the wing builder is out of the tree, not assumed.

**Open:** the craft reads far too dark against the reference's pale bone/tan. The sand renders
bright in the same frame, so this is material colour rather than scene lighting. The materials
live in `Ornithopter.ts`, which the wing builder currently holds, so it waits.

### Round 4 — dispatched: AAA hull to the kit photograph. And a bar amendment.

The user rejected the hull twice in plain words — "the shape is still fat", "a submarine
with wings" — while Q1's only hard number (span/length, a PLAN ratio) passed. Both blind
critics also passed it on identification. The bar had no slenderness measure at all, so the
one defect a human saw instantly was structurally invisible to every check we ran. That is
the same lesson as the backwards-flight round, in a new coat: a bar item that cannot fail on
the actual defect is not a bar item.

**Q1 is amended.** In addition to span/length, the hull's width distribution is now part of
the bar: stations at >= 90% of max beam may span no more than ~3.5m of the 22.896m length,
and the boom must be at or under 30% of max beam by 16m aft. The measured cause of the
submarine read was hullStations.ts holding >= 93% beam for 10.1m (44% of the body). The
builder adds this as a unit test next to the station table so it cannot regress silently.

Also ruled: **the kit photograph is the shape authority.** The user: "we have the images of
the assembly kit and it is absolutely clear how this craft must look." My earlier pushback
(MENG proportions vs a foreshortened oblique photo) is overruled for shape questions, and
recorded here so the reasoning is not lost: the concern was real, but with the orthographic
references deleted the photo is the best evidence we hold, and it is the user's call.

Dispatched to an Opus builder: reshape (single width peak at the wing shoulder, continuous
taper, thin boom, tail-fork/vane dedup) plus the first AAA surface pass (DataTexture
panel-line and dirt maps per the game repo's own hullWeathering pattern, UVs added to the
loft, bone/tan palette from the photo). Wing-root stations must stay on the hull; canopy
seating re-verified after the height changes.

**Mid-round evidence, 2026-08-02.** The user supplied two more photographs of the assembled
kit — `docs/dune_ornihopter_kit-2.png` (full craft on a desk, printed 20cm ruler in frame)
and `docs/dune_ornihopter_kit-3.png` (hull close-up, nose-on starboard 3/4 — the best hull
view we hold). Both were added to the Q1 reference table above and briefed to the running
builder before it had written a line. The close-up settles, in the lead's read: the section
is hexagonal with a hard chine nose-to-boom (the existing loft approach is right; the defect
was only the longitudinal plateau); the nose is a blunt chisel with two stacked horizontal
slots at the tip; all eight wing roots ride a raised dorsal shelf on the deck edge, two
plates per side, forward pair higher; the boom is thin AND flattened, and the pod-to-boom
contrast is the dragonfly read; the panel language is a few large trapezoids with raised
lighter trim over darker inset faces, plus two authored grilles (deck louvres between the
root plates, fine-ribbed intake on the upper flank aft of the canopy).

Colour ruling recorded here because the evidence is self-contradicting: the two prints are
different filaments — kit-2 all light grey, kit-3 black plus grey — so filament colour is
NOT colour authority. The palette stays in the accepted bone/tan family for desert-sun
readability and adopts only the close-up's contrast structure: darker inset panels, dark
belly, dark grilles, lighter structural trim. The ruler in kit-2 confirms print scale
roughly and nothing else; MENG keeps absolute scale, the measured plates keep planform.

The three kit photographs were `git add -f`ed past the repo-wide `*.png` ignore: the bar's
primary shape authority must travel with the branch, not live only on one machine. The user
also directed mid-round: builders run at max effort, the lead at xhigh.

### Round 4 — LANDED. Verified by the lead. The hull is a dragonfly.

Commit `a619599`. Gates reproduced independently: lint 0, tsc 0, **1397/1397** tests, every
file <= 200 lines. The slenderness claim reproduced by the lead's own interpolation of the
new station table, not by trusting the builder's test: the >= 90%-beam run is 8.12m -> 11.40m
= **3.28m** (bar <= ~3.5m), widthFrac(16m) = **0.27** (bar <= 0.30), widthFrac(18m) = 0.177.
Fresh captures: span/length **2.188** (window 2.115-2.585 around 2.35), 5979 tris, meshes
136 -> 134 (tail vanes deleted, the slotted paddle stays), no page errors.

The plan is two-lobed — pod crest 0.90 at 2.7m, waist 0.79 at 6.2m, shoulder peak 1.00 at
9.8m — which is not the brief's literal "single peak" but IS the reference's head-thorax-
abdomen; the brief was the approximation, the kit is the authority. heightFrac is decoupled
from widthFrac (deep pod, flattened boom, pod:boom half-height 7.1), and keelY droops the
abdomen 0.6m. Lead's visual verdict from the fresh captures: the top view's ground shadow
alone now reads as a dragonfly — the exact glance-test the old hull failed; rear34 shows
chine, pale deck, dark keel, nose slots and flank grille all legible; pilot view unchanged
and correct. Builder's flagged guard swaps in hullProfile.test.ts (three assertions that
each mandated the slab, replaced by shoulder-floor, aspect-spread and true containment
checks) reviewed and accepted — the deleted assertions were load-bearing for the defect.

**Biggest remaining gap, confirmed by the lead's eyes, not just the builder's report:**
interior/cabinShell.ts builds floor and bulkhead at COCKPIT.clearWidth (4.9m) flat boxes
(lines ~89-95); corners reach |x| 2.45 vs hull 2.19-2.38 at the chine and far less at floor
height. Renders as a black tray under the pod in side/hero/rear34. Dispatched as **Round
4b** to a Sonnet builder at max effort (workflow `wf_cf67cbf8-f69`): floor and bulkhead
rebuilt from the hull's own section functions, with a falsifiability-proven containment
test. Landing gear (stick struts -> the kit's segmented insect legs) is **Round 4c, queued
behind 4b on purpose**: both builders' visual verification reads the same live tree through
the dev server, and one builder's half-written edit rendering as a phantom defect in the
other's captures is precisely the mid-write trap this loop has already paid for. Blind Q1/Q3
critics re-run only after 4b and 4c land, so their round is not spent naming known defects.

### Round 4b — LANDED. Verified. And it found the defect's smaller sibling.

Commit `f5260d5`. The floor and bulkhead now derive from the hull's own ring:
`interior/hullSection.ts` slices the exact ring hullLoft renders (width at a HEIGHT, inset
0.05m, with real vertical clearance from the flat keel/deck caps — the file documents why a
horizontal inset alone buys nothing against a horizontal edge). Worst vertex margin -0.041m
inside the skin. The builder proved its containment test falsifiable the strong way: ran it
fail-first against the old boxes, and it also caught two of the builder's own intermediate
bugs (the flat-cap clearance hole, and an x=0 pinch vertex 9mm from the keel). Lead
reproduced everything: lint 0, tsc 0, **1401/1401**, lengths clean, and in fresh captures
the black tray is gone — the belly tapers cleanly into the boom. 150 meshes / 5991 tris.

Two findings of lasting value from its report: (1) the wall-base sibling defect —
`buildSideWall` still plants its base at a constant WALL.halfX = 2.3m, 0.95-1.3m outside
the hull at floor height, now the only geometry breaking the belly line — confirmed in the
lead's own crops and dispatched as **Round 4b.2** (workflow `wf_01c2d94f-730`, Sonnet, max
effort, fail-first test required). (2) the bellyFrac headroom number: floor/bulkhead
containment is now fully hull-derived, so the hull builder may tuck the cabin belly from
0.51 freely down to ~0.44; the reference's 0.42 specifically at seatZ would put the seat
edge 2.4cm outside the safe floor and needs a compensating seat nudge. Recorded so a later
hull-polish round starts from the measured threshold, not a guess.

### Round 4b.2 — LANDED. Verified. The belly line is clean.

Commit `c5a0f36`. The side-wall bases (old: constant 2.3m, measured 0.77-2.15m OUTSIDE the
skin at all ten sampled base vertices) now derive from hullInteriorHalfWidthAt and end at
the measured nose/boom crossovers instead of pinching to unverified points. Fail-first
order preserved and reported with numbers. cabinShellWall.ts split out — a justified
deviation from the four-file brief, forced by the 200-line cap and mirroring the
hullSection.ts precedent. Lead reproduced: lint 0, tsc 0, **1402/1402**, lengths clean;
own captures show the hull's belly line clean nose to boom, the only remaining hangers-on
being the three old gear struts; pilot view unchanged (builder proved byte-identical via
stash-compare). Meshes 150 -> 174 (multi-band wall), tris 5991 -> 5979 — mesh count is
creeping toward Cockpit.test.ts's <200 budget; watch it.

Accepted trade recorded: wall greeble ribs thinned 4 -> 1 per side (three sat in the
no-hull-at-floor-height band; console-occluded, zero visible change). New pre-existing
defect surfaced and PROVEN pre-existing by stash-compare: at extreme head-look yaw the
pilot camera sees desert through the hull's back-face-culled exterior skin (canopy glazing
has the documented fix; the opaque hull does not). Queued as polish, not blocking.

**Round 4c dispatched** (workflow `wf_0422a0b0-368`, Opus, max effort): the stick-strut
gear becomes the kit's segmented insect legs — hips inside the (now drooping) hull, one
common foot plane, support polygon containing the pod, fail-first stance test, mirror
re-winding per the wing precedent. After it lands and verifies: re-shoot, then fresh blind
critics for Q1 and Q3.

### Round 4c — LANDED. Verified. The craft perches.

Commit `564a2e4`. Six segmented legs (hip boss / paired femur rails / knuckle / tibia /
spade foot, swept tapered plates, flat shading via unshared verts), hips bisected onto the
real lower flank with a 0.28m embed, all soles on one plane at y=-4.30. The finished stance
test failed the OLD gear 4 of 7 — feet spread 0.73m (four of six airborne), hips at a
0.08m bite, seat station outside the support polygon, feet not splayed — and passed after,
with a separate fault injection (one foot dropped 0.2m) failing three independent
assertions. The builder also RETRACTED its own first height bar mid-round: it had derived
"crouched, clearance under 1.72m" from hand-held kit photos, then recognised
thopter-05.jpg is the production's own ingress board showing crew walking upright under the
belly, rescaled to ~2.5m and rebuilt the assertion as a headroom floor. That is the
photographs-are-not-the-object lesson applied by a builder to itself, and it is why the
report is trusted after verification. Lead reproduced: lint 0, tsc 0, **1413/1413**,
lengths clean; parked height measures 7.582; side view reads as a perched insect — femur,
knee, tibia, foot, front pair raked forward, exactly the kit's stance.

Honest gaps taken forward: legs render near-black (~44% of hull luminance) where both kit
prints show legs in the body's own colour; spec's landedHeight=7.2 is stale either way it
is read; wing/rootPod.ts carries two comments describing the deleted strut gear. All three
dispatched together as **Round 4c.2** (workflow `wf_f7860923-e42`, Sonnet, max effort) with
the lead's ruling recorded: landedHeight means overall parked height and becomes the
measured 7.582. Accepted as authored (not measured): the middle-leg rake (0.95m, chosen so
the knee survives the side projection); the lens-shaped femur cutout and heel-spur feet
deferred — the flat sole is what makes the ground plane provable. After 4c.2: re-shoot and
the blind Q1/Q3 critics.

### Round 4c.2 — LANDED. Verified. The known-defect list is empty.

Commit `093a5fc`. Dedicated gearMaterial (0xddd6c4, roughness 0.78, metalness 0.08): lit
femur luminance 17% -> 85% of the lit hull at high resolution, measured by pixel sampling
before and after with the hull sample bit-identical across the change. The builder's own
report retracted its first material comment ("darker than BONE" — arithmetically false;
matching RENDERED brightness needed an albedo brighter than BONE because the femur faces
meet the light at a shallower angle) — recorded because that shading fact will matter to
any future material tuning. rootPod.ts's strut-era comments rewritten to describe the
six-unique-legs reality; landedHeight = 7.582 with a PROVENANCE entry, every reader
reconciled by exhaustive grep, no test depended on the old 7.2. Lead reproduced: lint 0,
tsc 0, **1413/1413**, lengths clean; own capture confirms the legs read in the airframe
family with segmentation legible (front leg sits darker in some frames — that is the pod's
shadow, not the material; the whole-leg average mixes lit and shadowed facets by design).

**Round 5 dispatched** (workflow `wf_434807e4-c85`): three parallel fresh-context critics —
blind identification (Sonnet), Q1 exterior fidelity vs the three kit photographs (Opus),
Q3 interior vs the concept boards (Opus), all at max effort, none shown any builder
reasoning, every prompt carrying both the quality half and the correctness half per the
bar's own rule. This is the first scoring pass with no known defect standing in the frame.

## Round 5 — the critics' verdicts, and the lead's triage

**Q2 blind identification: PASS.** "Dune ornithopter, Villeneuve dragonfly redesign" —
and the critic counted 8 wings EXACTLY (4 per side, from the top view) and derived
nose-first from geometry alone. It also mistook the craft's own ground shadow for a
"branding icon of a dragonfly" — the silhouette now advertises the species by itself.
Its flags: the wings read as two mismatched sets (fore/aft pairs tan-membranous vs
near-black-rigid — deterministic, not port/starboard, so not the old sun issue); the legs
read as an uncountable knot with no belly view in the capture set (a HARNESS gap — shoot.mjs
has no underside view; fix with the next tools touch); the bare boom.

**Q1 exterior: 4/10.** Correctness ALL PASSES — orientation, count, cross-view consistency,
plausible beat kinematics, nothing floating (it zoomed the one suspicious sliver and
identified it as the attached ventral strake). Named biggest gap: **the hull's form
language** — the pod reads as a lofted organic bulb where the kit is a machined,
hard-chined prism; wants flat slab sides, constant section forward, blunt nose face with
three vertical fins, and the proud windshield box replaced by a flush chamfered glazing
deck ~45% of pod length. Other fails: wing root arms missing the rod+screw-jack anatomy;
mounts in one flat row vs the kit's 2x2 clusters; gear (count/stance/value); panel density
~quarter of reference and drawn-on rather than cut; tonal structure inverted (bone hull vs
near-black wings — converges with the blind critic's "two asset kits" read).

**Q3 interior: 3/10.** Named gap: **no canopy shell from the pilot's eye** — 82% of the
upper frame is bare sky; no brow, roof, sills, seat, or visible glazing tint. Correctness
finds real holes: a see-through slot between panel top and coaming; sunlit desert through
the lower-left past the dash's end (the long-unexplained "bottom-left sliver," now
diagnosed); the glow patches read as TWO SUNS; instruments read as pastel slabs; the stick
is a bare post vs the reference's articulated arm with bulbous grip.

**Lead's triage — what stands, what is contested.** Accepted as the Round 6 agenda: form
language, flush glazing deck, root-arm anatomy, 2x2 mounts, wing/hull tonal unity, panel
density, and the full cockpit-enclosure brief. Contested on evidence: "no chine" is wrong
as stated (the section HAS a hard chine, per-panel normals — the organic read comes from
plan curvature, which is the real defect); "4 crouched legs with skids" (photo-derived)
conflicts with the 6-leg headroom stance built from the production ingress board, and
"flush vs proud canopy" pits kit photos against film boards. RULING: the flat-pack print
kit's own plates are true 2D profiles — they out-rank every photograph for any feature
they cover. A measurement round (workflow `wf_52a1d194-91b`, Sonnet, max effort) is
rendering and measuring every relevant plate into docs/profiles/kit-dossier.md (leg
anatomy and count, nose fins, canopy proportion, boom plan, mount plates, wing-root rod),
regenerating the de-rotated profiles (the first airframe-side.json extraction is
CONTAMINATED — the plate lies diagonally and the extractor does not de-rotate; its offsets
sweep -1.18..+1.28). Round 6 briefs are written from the dossier, not from the critique's
photo-derived specifics.

### The dossier landed (commit `1329222`) and the user ruled on the gear fork.

Plate verdicts, each cross-checked against the 3MF assembly by triangle-count identity and
real transforms: nose blunt-face-with-fins REFUTED (bosses mid-body; nose is a bullnose,
tip ~21% of max depth — current 0.19 nearly right); flush canopy lens CONFIRMED (39.9% of
pod length, over a shallow hull section); 2x2 mounts CONFIRMED (rows 39.52mm apart =
~5.30m at craft scale); wing rod arm 16% of span (spec's 0.17 vindicated; the critique's
"inner third" refuted); boom tip forks into a slotted-paddle tine plus a pointed tine;
gear = ONE skid-bar leg + ONE pointed ramp brace per side, "crouched" REFUTED (leg ~= pod
depth). The critique's verified core (form language, flush deck, clustered mounts, tonal
unity, panel density, cockpit enclosure) stands; its refuted specifics are stripped from
every brief.

**Round 6a dispatched** (workflow `wf_8aa9dd76-058`, Opus, max effort): machined plan read
(slab flanks, hard breaks — the measured two-lobe plan and slenderness guards survive),
flush canopy deck replacing the perched box (canopySectionAt contract preserved for the
interior), WING_ROOTS re-authored as the measured 2x2 clusters with mount-plate geometry,
and the two-tine boom fork. Fail-first tests demanded for canopy flushness and mount
clustering.

**Gear fork RULED BY THE USER (AskUserQuestion): "Film stance, kit anatomy."** The spread
multi-leg, walk-under-headroom stance from the production ingress board stays; every leg
is restyled with the kit's measured parts language — castellated hip bracket, scissor
brace, skid-style feet. Queued as its own round behind 6a (shared Ornithopter.ts wiring
and the shared dev server keep the sequence rule in force). Queue after 6a, one landing at
a time: cockpit enclosure (the 3/10 brief), wing arm/tonal round, gear restyle, then
re-shoot and a fresh critic panel.

### Round 6a — LANDED. Verified. The craft reads engineered.

Commit `c71aa14`. The station table is now the list of hard breaks and nothing else: 21 ->
10 stations, zero interpolation-softened breaks, longest straight flank run 1.30m ->
3.60m, and the slenderness guard tightened in passing (>=90% run 2.88m). The tent canopy
is deleted for a flush chamfered lens (proudness above deck 1.14m -> 0.22m, glazing
recessed, mullioned; 47.4% of pod length vs the plate's 39.9% — over, flagged, accepted
for now). WING_ROOTS re-authored to the kit's two 2x2 clusters (7.15/12.45m, gap 5.30m)
with mount shelves and clevis cheeks. The boom terminates in the measured two-tine fork —
and the slot came out 0.273m against the kit's independently scaled 0.270m, a 3mm
convergence arrived at through different ratios. Eleven fail-first reds recorded; the
builder caught a vacuous assertion in its own gap test. It also fixed a defect no critic
had isolated: the console had been poking through the nose hull in every exterior capture
for rounds (CONSOLE.halfWidth 2.1m vs a 1.03m hull corner) — both console dimensions now
hull-derived. Lead reproduced: lint 0, tsc 0, **1430/1430**, lengths clean, span/length
2.2249 in window; top and hero frames now read machined against kit-3.

**Evidence correction, verified by the lead.** 6a challenged the dossier's layer-3 method
and is RIGHT: the 3MF per-part transforms are print-bed placements (flat-lay rotations, z
within ~1mm; Assembly_168.model holds no internal transforms — lead re-checked
independently). Cross-part distances are downgraded to bed packing; the 5.30m mount-row
gap survives on kit-2 photo corroboration; part-list and single-plate facts stand;
"bosses, not nose fins" survives either end-anchoring. Correction block added to
kit-dossier.md. Lesson logged: an agent that VERIFIES its inputs beats an agent that
consumes them — the dossier's confident method paragraph did not survive contact with a
builder that actually opened the files.

Carried forward to open rounds: pilot eye 2.26m below deck (6b raises it — lead ruling);
dash 2.17m wide with an empty left third (6b builds the tapered console); fork tines read
thin; rear34 bullnose; landedHeight stale at measured 6.66 (gear round owns it); legs
read overbright in the new frames (gear round re-tunes). **Round 6b dispatched** (workflow
`wf_e6b57894-981`, Opus, max effort): full cockpit enclosure per the 3/10 critique — brow,
sills, visible glazing, both correctness holes closed, ONE sun, military-palette
instruments, articulated stick, seat presence, eye raised into the glazed sightline.

### Round 6b — LANDED. Verified. 17,920 rays, zero escapes.

Commit `4e41c30`. The eye came up 1.27m into the glazed forward bay — and the derivation
exposed the real root cause of the critic's lower-left desert: at the old floor height,
THREE cockpit stations had no hull wide enough to stand a floor on at all. The new
sightlines.ts instrument casts the actual pilot frustum against the actual meshes:
open-sky coverage went from 64% (yaw 0) and 100% (yaw -60) to ZERO at all seven poses.
Independent convergence worth recording: the critic estimated 18.3% top-half structure by
eye, the ray harness measured 16.3% from the meshes — two instruments, one answer, which
is what makes both trustworthy. The two-suns defect died at cause, not symptom: three.js
point-light attenuation is 1/d^2 with decay 2, so a light 0.15m off a panel multiplies
itself x44 before ACES clips it to a white disc — which retroactively explains why Round
3's 18x intensity cut "barely dimmed the glow". decay 0 removes the term. Two
watertightness lessons now written at the fix sites: an inset liner leaves its own inset
open as a sky slot at the top, and quads that merely SHARE an edge are not watertight to
a grazing ray — overlap them. Military panel landed (bezelled gauges, nav globe,
annunciators, tapes, articulated stick with coiled cable); glazing opacity 0.60 -> 0.34,
the sole exterior change, measured: a window darker than the wall beside it is not a
window. Cockpit mesh budget raised 200 -> 700 with the reasoning inside the test and the
triangle cap untouched (lead reviewed the diff; draw-call merging is queued for game
integration, not for the shop). Lead reproduced: lint 0, tsc 0, **1451/1451**, lengths
clean; the yaw-0 frame reads as thopter-03's cave — grey-green metal, one light, a
mullioned slot of desert ahead.

Honest gaps taken forward: the forward window is a SLOT by exterior design — the kit's
flush lens caps how much greenhouse the interior can ever show, a structural tension
between the kit-authority exterior and the film-board interior reference (accepted for
now; revisit only if the next critic panel names it); port wall enclosed but dull; forward
roof liner crushes dark; console's pilot-facing face near-black; no seat shoulder reads at
yaw 0; gauges legible but unlabelled. **Round 6c dispatched** (workflow `wf_ed829d16-895`,
Opus, max effort): wing root arms to the dossier's measured rod-and-sleeve anatomy (the
spec's 0.17 arm fraction was right all along — the geometry never honoured it), all eight
blades into ONE airframe tonal family (kill the deterministic fore/aft tan-vs-black split,
cause to be measured, not guessed), bevelled leading edge and scribed centre groove for
internal form; measured planform untouchable.

### Round 6c — LANDED. Verified. One craft, one family.

Commit `eb8fc86`. The tan/black split was never geometry: wingMaterial carried metalness
0.65 in a scene with NO environment map — in three.js a metal's reflection IS the
environment, so 65% of the light fed a specular lobe of nothing, and the +/-22 degree
pair-parity feather (pairs 0,2 vs 1,3 — parity, not fore/aft as every eye had read it)
moved half the blades in and out of the sun's narrow lobe. Proven by ablation with
geometry byte-identical: station spread 7.2:1 -> 1.20:1. Root arms rebuilt to the
dossier's plate numbers and they agree to within ~1%: waist 27.6% of blade chord at
13.57% span vs the plate's 26.3% at 13.6%; the arm reads the plate's own fine table
(spec.ts untouched, agreeing at the join — its 20-station resample had smeared the waist,
which is WHY the strap existed). Squared tip: already honoured; the builder checked the
data before changing anything and changed nothing. Nine fail-first reds; two threshold
revisions disclosed with reasons (albedo is the wrong proxy for rendered tone — the bar
is luminance); one fixture corrected because it would have passed by accident; root
balls/posts pulled out of the same no-envMap hole (accepted scope call — they were the
last near-black objects, at the exact joint the round owned). 172,032 clearance samples
outside the strided bar test, zero inside hull. Lead reproduced: lint 0, tsc 0,
**1463/1463**, lengths clean; top and hero read as one bone-family craft, rod-and-sleeve
roots legible exactly as kit-3. Carried forward: undersides dark at low sun-angles
(physically consistent — hull belly measures darker still); scribed line needs UVs to be
crisp at distance; five sleeve rings vs the plate's ~17 (resolution-bound).

**Round 6d dispatched** (workflow `wf_b9837e5d-d31`, Opus, max effort) — the LAST build
round before the Round 7 critic panel, implementing the user's gear ruling: film stance
kept (ground plane, hips, splay untouched and guarded), kit anatomy applied per the
dossier — castellated hip locking loops, scissor brace struts, hollow skid-bar feet —
plus gear tone re-verified against the post-6c hull and landedHeight re-measured (stale
at 7.582 vs measured ~6.66 since the flush canopy).

### USER FINDING (2026-08-02, from the published render gallery): wings are side-swapped.

"The wings of the left side are mounted on the right side and vice versa." Lead
verification against the sprue photograph agrees: each kit blade has a straight spine
edge (the tip dogleg angles toward it) and a flared side, and left/right are DISTINCT
mirrored parts (4x l1 + 4x r1) — while in the current top view the port fore blades wear
the straight edge aft and the tip dogleg curling toward the NOSE. A tip that leads is
wrong on every reference. Mechanism hypothesis (to be measured, not assumed, by the fix
round): a single global sign flip in the chord-axis mapping of the plate's offset table —
one flipped sign mirrors every blade across its own span, which presents exactly as
"each side wears the other side's shape". Why it surfaced only now: Round 6c restored
the plate's fine offset resolution (the old 20-station resample had smeared the dogleg
flat), making the real curvature visible for the first time — with the wrong sign. This
is also a bar note: no critic caught it; the user, who has assembled the physical kit,
did — the bar's Q1 prompt should name blade handedness explicitly from now on. Queued as
**Round 6e** immediately behind the in-flight gear round (sequence rule; same tree, same
server): flip derived from kit-2/kit-3/sprue crops by measurement, falsifiability-proven
handedness test (port blade tip-offset must trail AFT of its root chord line; sign-flip
injection goes red), before/after captures.
