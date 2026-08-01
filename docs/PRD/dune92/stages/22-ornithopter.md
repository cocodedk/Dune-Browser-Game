# Stage 22 — The ornithopter

**Phase:** 3 · **Depends on:** 12 (flight mode), 20 (art production) · **Builder:** Sonnet
**Status:** SPECCED — measured against the shipped craft, not against intent

## Goal

Make the ornithopter a hero asset. It is the only vehicle the camera ever chases, it
carries the game's signature cinematic, and it is currently 296 triangles of primitives
with a wing rig that is geometrically wrong.

This document is the research, the design, and the build plan. Read
`docs/PRD/dune92/stages/12-flight-mode.md` first for the cinematic it lives inside.

To actually run the build, see [`22-ornithopter-gauntlet.md`](./22-ornithopter-gauntlet.md)
— a Gauntlet Loop prompt whose bar is a blind identification test against section 1.4's
measured "reads as a scratch on the lens".

---

## 1. Current state, measured

Everything in this section came from the shipped build, not from reading the source.

### 1.1 The wings hinge in the wrong place

`Ornithopter.ts` positions each wing mesh at its own **midspan** and animates
`rotation.z`. Three.js rotates a mesh about its origin, and the origin is the middle of
the wing, so the wing see-saws about its centre instead of hinging at the fuselage.

Measured world positions of the left wing's root and tip across one beat:

```
rest       root=( 0.00,  2.60)   tip=(-34.00,  2.60)
peak-up    root=(-0.97,  8.27)   tip=(-33.03, -3.07)
peak-down  root=(-0.97, -3.07)   tip=(-33.03,  8.27)
```

The root travels **±5.67 units** vertically against a fuselage of radius 2.6. The wing
root leaves the hull entirely, twice per beat, by more than twice the hull's radius —
and the tip moves the opposite way, because a centre pivot is a see-saw. Captured
frames show the wings scissoring across the body and passing through it.

This is the single most damaging defect and it is not a tuning problem. No amount of
material or silhouette work survives a wing that visibly detaches from the aircraft.

### 1.2 Budget and proportion

```
meshes      8
triangles   296
vertices    370
bounding    68.0 span x 31.3 length x 10.6 height
span:length 2.17
```

Stage 12 specified "the ornithopter GLB (≤10k tris) — the only model asset in the
slice". What shipped is 3% of that budget, built from primitives. That was a reasonable
call at the time — it removed an asset pipeline — but it has never been revisited, and
the craft is now the least finished thing the camera looks at directly.

### 1.3 The nose is wider than the body it is bolted to

Measured at the joint plane (z = −11), the maximum radius of each part:

```
fuselage    1.40
nose cone   2.60
```

The cone's base is 86% wider than the hull section it meets, so the nose flares outward
into a lip that runs the whole way around the aircraft before tapering to a point. The
fuselage is built with `CylinderGeometry(2.6, 1.4, …)` — fat at the tail, thin at the
nose — and a 2.6-radius cone is then attached to the 1.4 end.

Cheap to fix and worth fixing early: it is visible in every captured frame and it is the
kind of seam that makes a shape read as assembled from parts rather than designed.

### 1.4 It does not separate from its background

Craft band versus adjacent sand, same frame:

| region | mean luma | rgb |
|---|---|---|
| craft | 110.1 | 132, 107, 73 |
| sand  | 133.7 | 160, 131, 85 |

18% darker than the sand it flies over, in the same hue family. Across the day:

| hour | craft-band mean | note |
|---|---|---|
| noon | 114.6 | flattest light, craft nearly the same value as ground |
| golden | 61.2 | the shot the cinematic exists for — craft is a dark silhouette |
| dusk | 23.3 | craft and ground both near black |

At golden hour the craft is read almost entirely as **silhouette**, which is precisely
where the current outline fails: two tapered planks at incoherent angles, a stubby
faceted tube, and a 7-unit fin.

Downsampling the craft to 64px wide — the test in acceptance criterion 2 — it resolves to
a horizontal dark smear with one blue pixel where the canopy is. It reads as a scratch on
the lens or a distant bird; nothing about the shape says aircraft, let alone ornithopter.
The artifact is at `.shots/thopter/silhouette-64.png` if the capture is rerun. This is the
bar the rebuild has to clear, and it is currently not close.

### 1.5 Everything else visible in the captures

- Wings are `CylinderGeometry` scaled to 0.12 in Y — flattened hexagonal tubes. They
  read as planks. No airfoil section, no camber, no spar, no membrane.
- The 8-sided fuselage cylinder shows its facets in silhouette.
- The canopy is a sphere sitting on top of the hull like a bead, at mid-body, rather
  than a cockpit the crew could see out of.
- No landing gear, no engines or jets, no panel lines, no antennae, no crew.
- `metalness: 0.05` plus an emissive floor across every material. The source comment is
  honest about why: there is no environment map, so a real metal renders as a black
  cutout. The emissive is a workaround that makes the hull self-lit, which is why it
  never quite sits in the scene's light.

---

### 1.6 Provenance

Section 1 is measured from this repository and needs no external source.

Section 2 draws on a sourced research pass: the full text of *Dune* (1965) read directly
rather than via wikis, the flapping-flight literature, production talks, Polycount, and
the three.js and Filament docs. Sources are in section 6. Where a claim is common practice
with no citable standard, or is reasoning rather than a source, it says so inline.

Five claims in earlier drafts of this document were wrong and have been corrected against
that research, all noted at the point of correction: the "dragonfly, not a bird" framing
(Herbert's own definition is ornithological), sinusoidal feathering (it is a plateaued
trapezoid), a feather *lag* (it must be *advanced*, or it produces downward force), the
Villeneuve wing count, and an evenly-spread geometry budget. A sixth — that fast wingbeats
need motion blur — turned out to be solving a problem this craft does not have.

---

## 2. Design specification

### 2.1 What it must be

**A big bird in flight, an insect at rest.** An earlier draft of this document opened
"a dragonfly, not a bird" — that is contradicted by Herbert's own definition, and the
correction matters because it changes the animation.

**From the novel** (quotations verbatim from the text of *Dune*, 1965). The Appendix
defines the craft outright:

> ORNITHOPTER (commonly: 'thopter): any aircraft capable of sustained wing-beat flight
> **in the manner of birds**.

Herbert's descriptive vocabulary follows the definition. Wings have **"coverts and
primaries"** — bird-feather group names — and *"the lapped coverts and primaries of the
wings' leaves"*. In flight they are *"like a covey of birds coming to nest"* and *"the
slow, spread-wing heaviness of a full load—like a giant bird"*. The insect imagery is
real but it is reserved for the craft **parked or hunched**: *"humming softly on standby
like a somnolent insect"*, *"wings snicked in to beetle stubs"*, thopters beside a
harvester as *"gnats beside a warrior beetle"*.

**The wing is a telescoping stack of metal leaves, not a membrane.** This is the novel's
most distinctive mechanical idea and no screen adaptation has ever shown it:

> The wings were at full spread-rest, their **delicate metal interleavings** extended.
> He touched the **retractor bar**, watched the wings shorten for jet-boost take-off.

Extension is continuous and separately controllable from incidence — *"cranked the wings
out to three-quarters, **set their angle**"* — and Herbert tracks the consequence in
correct aerodynamic vocabulary: *"their **aspect ratio** dropping faster and faster"*.
Stiffness is variable too: *"fed more power to the wings, **stiffened them** for a steeper
descent"*. Named states in his own words run from *"full spread-rest"* and *"full soaring
length"* through *"three-quarters"* to *"beetle stubs"* and, in a dive, *"wings folded
flat against its sides"*.

Note the takeoff configuration is Herbert's own word: *"wings **feathered** tightly and
afterjets thrusting them upward"*. The feathering axis in 2.3 is textually licensed, not
invented.

**Propulsion is genuinely hybrid, with a named transition.** Jets for thrust, wings for
lift and control: *"the Duke kicked on the jet brakes… Stub wings elongated, cupped the
air. **The craft became a full 'thopter**"*. It is only a thopter when the wings are out.
Takeoff is two strokes and ten metres: *"felt them cup and dip—once, twice. They were
airborne in ten meters"*.

⚠️ **The "Heart Scallop" is not canon.** Several wikis state ornithopters are powered by
a living mollusc at the wing junctures. That is from *The Dune Encyclopedia* (1984), not
Herbert; it appears **zero times** in the text of *Dune*, and the estate later treated the
Encyclopedia as non-canon. Do not build on it.

**From the adaptations.** Villeneuve's brief for the 2021 film was explicitly
"dragonfly — muscular — feel realistic — close to the spirit of a helicopter", under a
production rule that vehicles obey real physics rather than read as fantasy. The
production used **three wing-count variants — 8, 6 and 4 wings — as faction-silhouette
differentiation**, which is a better idea than any single count: it means the number is a
design lever, not a fact to copy. An earlier draft of this document guessed "four pairs";
that was wrong.

Take the lever. If a second craft is ever added, change the wing count rather than the
paint — silhouette is how factions read at distance, and it survives being backlit, which
colour does not.

**From Cryo's 1992 game**, which this project actually recreates. Thinly documented, but
what survives is directly useful: *"an Apache helicopter-style cockpit, retracting wings
that shifted forward on takeoff and buglike legs for landing"* — a design that bridges
Lynch's film and Herbert's text, and **the one adaptation that implemented the retraction
at all**. The CD-ROM release added rendered 3D flight animations; reviewers singled out
the colour as the game's strength and the animation as its weakness — *"the graphics
(especially the colours) are beautiful, although the animation is very limited"*.

That is a clean brief for a recreation: **carry the saturated, graded palette and the
slow ceremonial travel cadence forward, and supply the motion the original could not
afford.** Landing legs are canon for this project specifically, and they are cheap
silhouette value.

**Lynch (1984) is not a flight reference.** Its thopters have *"two small, static wings"*
and do not flap at all, contradicting the defining property. Useful only as colour mood,
and as the thing the Cryo game was partly imitating.

Three hard rules, in priority order:

1. **The silhouette carries it.** At golden hour it is a black shape against a bright
   sky. If the outline is not readable and deliberate at 64px, nothing else matters.
2. **The wing root never leaves the hull.** See 1.1.
3. **It must look like it could survive Arrakis.** Sand-scoured, patched, functional.
   A clean vehicle reads as a render; a worn one reads as a world.

### 2.2 Form and proportion

> ⚠️ **This section was wrong, and it cost a round.** The table below originally targeted a
> span:length ratio of ~1.3, reasoned from "insect-like, not glider-like". Round 3 followed
> it, halved the wingspan from 68 to 34, and produced a craft the person this is being built
> for immediately called too short in the body and too short in the wing.
>
> A measured reference settled it. Master Replicas' screen-accurate die-cast of the film
> ornithopter is specified at **wingspan just under two feet, length 10.5 inches nose to
> stern** — a span:length of roughly **2.19**. The original craft measured **2.17**. The
> baseline proportion was very nearly right all along; the table was the error, and
> "correcting" toward 1.3 made the craft worse.
>
> Photographs are in `.shots/reference/` (gitignored — reference only, not repository
> content). The whole-craft view against black, `mr-O8.jpg`, is the clearest.

Target proportions, from the reference rather than from reasoning:

| element | value | source |
|---|---|---|
| span : length | **~2.2** | measured: 23 in span / 10.5 in length on the replica |
| wings | 4, two per side | long, thin, near-straight blades, panel-lined along their length |
| wing planform | very high aspect ratio | narrow chord, extending far past the body |
| wing roots | cylindrical actuator housings with visible rods | the "mounted not inserted" cue every critic asked for |
| fuselage | faceted and angular, bone/tan, weathered | not a smooth revolve |
| canopy | multi-pane angular greenhouse, wrapping the nose | not a smooth bubble |
| underbody | dense mechanism, gear, weapons | where the greeble budget belongs |

**The lesson worth keeping**: a proportion argued from an analogy ("insect-like") lost to a
number read off the real object. Where a reference exists, measure it; do not reason toward
it. Section 1 of this document was measured and has held up. This section was reasoned and
did not.

The current craft is a fat tube with enormous wings. Lengthening the body and shortening
the span moves it from "dragonfly toy" toward "aircraft with insect wings".

### 2.3 Wing articulation — the part that matters

Replace single-axis roll with a three-degree-of-freedom root joint per wing. This is
what separates a flapping wing from a rotating plank.

```
wing root (pivot AT the fuselage attachment, not at midspan)
  ├─ flap     rotation about the fuselage's forward axis  (the stroke)
  ├─ sweep    rotation about the vertical axis            (stroke plane / fore-aft)
  └─ feather  rotation about the wing's own span axis     (angle of attack)
```

**Feathering is missing entirely today.** A wing that only flaps pushes air down on the
downstroke and back up on the upstroke, netting nothing — a paddle, not a wing. Rotating
about the span so the downstroke bites and the upstroke slices is what makes it read as
flight.

#### Specification

| parameter | value | note |
|---|---|---|
| beat frequency | **1–3 Hz**, trending 1–2 | see below; current ≈3.5 Hz is too fast |
| flap amplitude, forewing | **±32°** (64° p-p) | hold this steady |
| flap amplitude, hindwing | **±18–33°**, modulated | the aft pair is the control lever |
| feather, downstroke | **~50° AoA, held** | trapezoid, not sine |
| feather, upstroke | **~20° AoA, held** | ~90° total pitch travel |
| flip window | short, **advanced** | begins *before* stroke reversal |
| deviation | **±10–20°** at 2× beat | produces the figure-eight |
| stroke plane | **~60–65°, fixed to the hull** | animate hull pitch, not the plane |
| fore/hind phase | **driven**: ~90° cruise | → 0° takeoff, → ~150° at speed |

#### Four things the obvious implementation gets wrong

**1. Pitch is a trapezoid, not a phase-shifted sine.** An earlier draft of this document
specified a sine, which is wrong. Stroke *position* fits a sinusoid well, but angle of
attack is *"relatively constant after pronation and supination"* — held flat through most
of each half-stroke with a brisk corner at each reversal. This also follows from the
leading-edge vortex: LEV formation coincides with rapid AoA increase, and dragonflies
control flight primarily *through* angle of attack, so the wing wants to sit at a high
held incidence and snap to the next one.

**2. The flip is advanced, not lagged.** An earlier draft said "lagging by a quarter
cycle". Timing determines the sign of the force: a flip completing **before** reversal
*increases* lift; one spanning the reversal is neutral; one **after** reversal produces
**downward** force. The lagged version is the failure case. Name the parameter
`flipAdvance`, not `featherLag`, so nobody re-introduces it.

**3. The flip travels along the span, tip to root.** In real dragonflies the reversal is
*passive* — the fluid does the work, net rotational power is negative — and it propagates
as a torsional wave from wingtip toward root. Staggering the flip along the span rather
than rotating the wing as a rigid block is, per the research, the single change that does
most for believability.

**4. There is no dwell at the top or bottom.** Wake capture puts a force peak just *after*
reversal, so the stroke reverses snappily and continuously. Do not add the paused,
eased-out hold a bird's wingbeat has — that is the wrong idiom, and it is the default an
animator reaches for.

Also: **do not let the wingtips touch.** Clap-and-fling needs a left-right pair meeting
overhead; dragonflies have ipsilateral fore-hind pairs instead and do not use it.

#### Beat frequency — slow, and no motion blur needed

Real dragonflies run 25–40 Hz, but they are 10 cm long. Two independent scaling
approaches — Greenewalt's `f ∝ (wing length)^−1.15` anchored on the albatross (2.55 Hz at
3.5 m span), and a 414-point fit across insects, birds and bats — converge on **1–3 Hz for
a 4–8 m craft**, trending 1–2 Hz at the larger end.

That is one beat every 0.3–1 s: **slow, heavy, and individually readable.** Three
consequences, and they all save work:

- It agrees with Herbert (*"gentle beat"*, *"cup and dip—once, twice"*) over the films,
  which blur the wings through multiple beats per shutter — beautiful, and wrong for the
  scale.
- At 1–3 Hz the beat is nowhere near the aliasing wall (Nyquist is 30 Hz at 60 fps), so
  **no motion blur and no blur-proxy geometry are required.** An earlier draft of this
  document recommended selling speed with blur; that was solving a problem this craft
  does not have. Blur machinery only becomes relevant for a genuinely fast element —
  Herbert's *"wing rotors"* would qualify.
- Current code runs `elapsedMs * 0.022` ≈ 3.5 Hz, which reads insect rather than
  large-flier. Slow it and roughly double the amplitude.

#### Validated against the corrected model

Re-evaluated with the trapezoid, 200 samples, 17-unit half-span:

```
tip vertical travel                18.02 u
tip fore-aft travel                 8.80 u
deviation zero crossings per cycle  4        (4 = figure-eight, 2 = a simple arc)
fraction of cycle at a held AoA     79%      (plateau, not sine)
AoA at mid-downstroke              50.0 deg
AoA at mid-upstroke                20.0 deg
```

The 79% confirms the waveform is genuinely plateaued rather than a rounded sine, and the
four crossings confirm the 2:1 deviation ratio still yields a figure-eight. Both are cheap
to assert in a unit test on `wingCycle.ts`.

#### Break the symmetry — this is the finding that matters most

The single most useful thing the research turned up, and it is about motion, not modelling.
Villeneuve's ornithopters did not read as physically real until the animation stopped being
mirrored: **their wings are never perfectly symmetrical once beating, and they never take off
straight**, with the body drifting as though making constant small corrections for air
currents.

The current implementation is *exactly* mirrored — `rightWing.rotation.z = -beat * 0.34` is
the left wing negated. So is the spec above, as first written. Fix that:

- Give each of the four wings its own small phase and amplitude offset — a few degrees and
  a few percent, not a visible limp. Deterministic per wing, not random per frame.
- Add a slow, low-amplitude drift to the craft's roll and yaw, uncorrelated with the beat,
  so it looks like it is holding a heading rather than riding a rail.
- Never let the two sides reach peak at the same instant.

This is nearly free — it is a handful of constants in the cycle function — and it is
reportedly the difference between "model of an aircraft" and "aircraft". It also composes
with `bankAt(progress)` in `FlightPath.ts`, which already banks the craft into turns.

Related, from the same body of practice: perfect symmetry reads as artificial and
"game-like"; asymmetry sells realism at a cost in design effort. Here the cost is close to
zero, because the asymmetry is procedural.

Secondary motion, layered on top and all cheap:

- Spanwise bend: the tip lags the root. Either a bone chain or a vertex-shader bend
  driven by the same flap phase. Without it the wing is a rigid board.
- Trailing-edge flutter at a higher frequency, low amplitude.
- Body pitch and heave coupled to the beat, a few tenths of a unit — the whole craft
  should nod with its own wings.

### 2.4 Materials, and the environment-map problem

**Why the hull is currently emissive, stated properly.** At `metalness = 1` a PBR material
has *no diffuse term at all* — 100% of its visible colour is reflected environment tinted
by F0. With no environment there is nothing for the specular term to multiply, so a metal
renders black apart from tiny analytical-light highlights. This is not a three.js quirk;
Unreal documents the same behaviour, and Filament treats image-based lighting as mandatory
alongside direct lights for exactly this reason.

**Why emissive is the wrong patch.** Real reflection is view-dependent (it parallaxes as
the camera moves), roughness-dependent (sharp on polished, blurred on worn), and
Fresnel-dependent (surfaces brighten at grazing angles — a primary "this is reflective"
cue). Emissive is none of those: it is constant, view-independent and roughness-independent,
so it lights the whole surface uniformly regardless of angle. That reads as a self-lit
plastic toy and it disconnects the craft from its environment. Which is precisely the
symptom the source comment describes.

**The fix, cheapest first.** All four are strictly better than emissive:

1. `PMREMGenerator.fromEquirectangular()` — needs a startlingly small source. The minimum
   useful input is **64×32 px** (1024×512 ideal). The sky dome already computes a horizon,
   zenith and sun colour per hour; rendering that gradient to a tiny texture once per hour
   change is enough, and it fixes every metal in the game rather than just this craft.
2. `RoomEnvironment` + `PMREMGenerator.fromScene()` — three.js's built-in, zero-asset
   fallback. Wrong mood for a desert, but a one-line proof that the pipeline works.
3. `LightProbe` + `LightProbeGenerator` — spherical-harmonic ambient, cheap, good for the
   diffuse term.
4. `HemisphereLight` — cheapest, already in the rig. Gives no specular *shape* on metal,
   only a directionally-correct tint, but even that beats emissive.

**The specific fix for this repository.** Verified against the tree: there is **no
`scene.environment`, `PMREM` or `envMap` anywhere in `src/`** — that is why the emissive
floor exists. But `src/game-render/materials/SkyDome.ts` already computes a full sky in
GLSL: gradient, sun disc, horizon dust band, stars, all driven by the hour.

So the fix is to **PMREM the sky dome that already exists into `scene.environment`**,
regenerated only when the time-of-day palette changes rather than per frame. That gives
physically-grounded sky-above / sand-below reflections for near-zero ongoing cost, lets
the hull carry real metalness, and lets the emissive floor in `Ornithopter.ts` be
**deleted rather than tuned**. It also fixes every other metal in the game.

Then set `emissiveIntensity` to 0 on hull and trim and let real light do the work.
Note `scene.environmentIntensity` only affects materials using `scene.environment` — once
a texture is assigned to a material's own `envMap`, that material stops responding to the
scene-level control.

**Values.** Metalness is 0 or 1 with very little in between; author the *mask*, not a
middle value. Dielectric F0 sits near 0.04 regardless of colour. Metal F0 is the tint and
is high: iron ≈ 0.53/0.51/0.49, aluminium ≈ 0.91/0.92/0.92, copper ≈ 0.96/0.64/0.54
(linear). Keep dielectric albedo inside roughly 30–240 sRGB — nothing in the real world is
pure black or pure white.

- Hull: painted composite, roughness ~0.55, metalness 0. Sand-scoured leading edges worn
  through to bare metal — metalness 1 *only inside the wear mask*, tinted with iron or
  aluminium F0.
- Dust in every upward-facing crevice, driven by a world-normal-Y mask, plus AO-driven
  darkening where parts meet. Ungrounded joints read as pasted-on.
- Weathering has a chronology: rust, then paint chipping, then impact damage, then dust.
  Applied in that order it reads as history; scattered at random it reads as noise.
- Canopy keeps its gloss plus a Fresnel rim so it reads as glass at grazing angles.
- Give the hull a value distinct from sand. Section 1.4 measured 18% separation; target at
  least 35% at noon, or accept silhouette-only reading and design the outline accordingly.

### 2.5 Geometry budget

**Spend it on the outline.** A normal map categorically cannot change a silhouette — it
perturbs shading, not the mesh edge. This craft is seen mostly backlit against a bright
sky (measured: golden-hour craft-band luma 61.2), so interior panel detail is largely
invisible and outline-defining edges are everything. Budget accordingly, which is *not*
an even spread:

| element | triangles | why |
|---|---|---|
| wings: leaves, spar, tip and trailing-edge profile | 3,500 | the dominant outline, four of them, and they move |
| canopy frame and glazing profile | 1,500 | breaks the fuselage line; the one gloss element |
| fuselage + nose + tailboom, with bevelled edges | 2,000 | silhouette only; interior panels get a normal map |
| engine nacelle rims / intake lips | 1,200 | rim profile reads, interior does not |
| landing skids | 900 | strong outline shape, cheap |
| greebles: antennae, vents, fasteners | 900 | scale cues on the outline, `InstancedMesh` for repeats |
| **total** | **~10,000** | matches Stage 12's original ≤10k budget |

At 296 triangles today there is a factor of 34 in headroom, and the craft occupies a small
part of the frame — this is affordable. For a three.js hero asset, 8k–20k for LOD0 is the
sensible band; browser budgets sit well below console, where open-world vehicles run
30–50k and hero cars 100k+.

**How to build the wing itself.** Two findings that make this cheaper, not dearer:

- **Corrugation, not camber.** Dragonfly wings are pleated, and the pleats trap vortices
  so the section behaves like a cambered aerofoil while keeping drag near flat-plate. A
  **faceted, pleated wing surface is correct** — it is not a low-poly compromise. That
  suits both a procedural build and Herbert's overlapping metal leaves.
- **Anisotropic stiffness.** Spanwise stiffness exceeds chordwise by one to two orders of
  magnitude, falling exponentially from base to tip and from leading to trailing edge. So:
  a stiff leading-edge spar, a trailing edge that lags and flutters. Spanwise twist is
  only **~7°** at supination, at ~75% of span — much less than the 25–50° figures quoted
  for hawkmoths and hoverflies, which are *not* dragonfly numbers. Tip deflection ~5.5% of
  span, with upstroke bending about twice downstroke bending.

Two authentic markings that are nearly free and highly legible:

- **Pterostigma** — a small dark mass near the leading edge at ~85% of span. Real function
  is raising flutter speed; visually it is a crisp dark marking near each wingtip, exactly
  the sort of small element that gives the eye a scale cue on the outline.
- **Nodus** — a hinge on the leading edge at ~55% of span. A visible joint line there is
  both authentic and a natural place to break a long edge, which the silhouette rules
  want anyway.

Every hard edge needs a bevel. Perfectly sharp CAD edges are one of the most reliable
tells of a fake render — real edges catch a highlight, and the angled bevel face gives a
Fresnel response that reads as expensive. Bake bevels into the normal map on a trim sheet
rather than modelling them everywhere; Insomniac's "Ultimate Trim" is the canonical version
of that workflow. Every hard edge also needs a matching UV seam, or the bake produces black
seam artefacts.

LOD: one level is enough. The cinematic is the only place it is seen, always at similar
range, and `THREE.LOD` is only a runtime switcher — it does not generate the meshes, you
would have to author every level by hand. Do not build a chain for a single shot. Do merge
the static fuselage, tail and canopy into one draw call, and keep the four wings separate
because they each need their own transform.

---

### 2.6 Known ways this goes wrong

Checked against the current craft, since most of these already apply to it.

| failure | present today? | note |
|---|---|---|
| visible primitive shapes — capsule, box, cylinder | **yes** | 8-sided cylinder facets, sphere canopy, cone nose |
| sharp bevel-less CAD edges | **yes** | the most reliable "fake render" tell |
| perfect symmetry | **yes** | in both model *and* motion; see 2.3 |
| no scale cues | **yes** | nothing small enough to judge size against |
| uniform material, no metal-type variation | **yes** | one hull colour, no wear, no second material |
| floating / intersecting parts | **yes** | the wing roots, measurably (1.1) |
| no AO contact darkening at joints | **yes** | parts read as pasted together |
| no damage narrative | **yes** | a clean craft on a planet that strips paint |
| uniform greeble density | n/a yet | avoid a regular grid *and* uniform randomness |
| texture stretching on procedural UVs | risk | curved hulls and long thin triangles are the worst case, and that is exactly what procedural generation produces without hand-placed seams |

**The risk this spec carries.** Cloud Imperium tried purely procedural greebling on Star
Citizen and rejected it as "too random and greebly", going back to hand-modelled shapes
baked and textured afterwards. That is first-party evidence that procedural-only
generation reads as noise rather than as design — and this craft is procedural-only by
deliberate choice, to avoid an asset pipeline.

It does not mean the approach fails. It means the shapes have to be *authored* — specific
named forms placed with intent — not emitted from a loop with jitter. If Step 3 reaches
for randomised detail to fill space, that is the signal it has hit the ceiling of the
procedural approach, and the moment to reopen the GLB decision from Stage 12 rather than
push further.

---

## 3. Build plan

Staged so that each step is independently verifiable and the highest-value fix lands
first. **Step 1 alone is worth more than steps 3–5 combined.**

### Step 1 — Fix the hinge

Re-origin each wing so the pivot is at the fuselage attachment, and drive flap from
there. Pure geometry change, no new art.

- Translate the wing geometry so its root sits at the mesh origin, then position the
  mesh at the shoulder. Or parent each wing to an empty `Object3D` at the shoulder.
- Guard it: a unit test asserting the root vertex stays within the hull radius across a
  full beat. That test fails today and is the regression guard for the whole stage.

### Step 2 — Real articulation

Add feather and sweep per 2.3. Keep the pure motion maths in its own module —
`wingCycle.ts`, taking phase and returning three angles — so it is unit-testable without
a GL context, matching how `FlightPath.ts` already splits.

Module contract, so the maths stays testable without a GL context — the same split
`FlightPath.ts` already uses:

```ts
// src/game-render/modes/flight/wingCycle.ts  — PURE, no three.js
export interface WingAngles {
  /** Stroke, about the craft's forward axis. Radians. */
  flap: number
  /** Fore-and-aft, about the craft's vertical axis. Radians. */
  sweep: number
  /** Angle of attack, about the wing's own span axis. Radians. */
  feather: number
}

export interface WingCycleOptions {
  flapAmplitude: number
  /** Held angle of attack through the downstroke. ~50 deg. */
  aoaDownstroke: number
  /** Held angle of attack through the upstroke. ~20 deg. */
  aoaUpstroke: number
  /** Width of the pitch reversal, in radians of cycle. Short. */
  flipWindow: number
  /**
   * Radians by which the flip PRECEDES stroke reversal. Positive = advanced.
   * Advanced increases lift; delayed produces downward force. Named for the
   * sign so a later edit cannot quietly reintroduce a lag.
   */
  flipAdvance: number
  /** Deviation amplitude, applied at twice the beat. ~10-20 deg. */
  deviationAmplitude: number
  /** Radians this pair leads the forewing. 0 for the forewing itself. */
  pairPhase: number
  /** Per-wing offsets that break mirror symmetry. Small, deterministic. */
  asymmetry?: { phase: number; amplitudeScale: number }
}

/** @param phase Cycle position in radians; the caller owns the clock. */
export function wingAngles(phase: number, options: WingCycleOptions): WingAngles
```

`feather` is a **trapezoid**, not a sine — see 2.3. The two AoA values are held, not
amplitudes about a midpoint, and `flipWindow` is the corner between them. Modelling it as
an amplitude with a phase offset is the mistake this interface exists to prevent.

Two properties worth asserting directly in `wingCycle.test.ts`, both cheap:
the fraction of the cycle spent at a held AoA (~79% with the values above, which fails
immediately if someone substitutes a sine), and four deviation zero-crossings per cycle
(the figure-eight, which fails if the 2:1 ratio is lost).

The caller owning the clock matters: the flight cinematic is driven by
`currentTravelProgress` from the engine, and anything that reads a wall clock of its own
will drift against it.

### Step 3 — Rebuild the form

New geometry to the proportions in 2.2: slimmer, longer fuselage; forward cockpit;
four wings with spar and membrane; skids; jets. Still procedural — no asset pipeline —
unless a GLB proves necessary, which is a separate decision.

### Step 4 — Environment map and materials

Per 2.4. Benefits the whole game, so it may be worth pulling earlier if metals elsewhere
are also reading flat.

### Step 5 — Effects

Rotor-wash dust under the craft near the ground, wingtip vortices at speed, heat shimmer
off the jets. All additive, all skippable if the budget runs out.

---

## 4. Acceptance criteria

Measured, not judged. Capture with `scripts/shoot.mjs`, measure with `scripts/measure.mjs`.

1. **Hinge:** across a full beat, every wing root vertex stays within the fuselage
   radius. Unit test, no render required.
2. **Silhouette:** the craft is identifiable as an ornithopter from its outline alone at
   64px. Judged by a critic pass against the rendered frame, blind against a reference.
3. **Separation:** craft-band mean luma differs from the adjacent sand band by ≥35% at
   noon, against the 18% measured today.
4. **Budget:** ≤10,000 triangles, and the flight scene's draw calls stay within the
   existing frame budget.
5. **No regression:** `npm run lint`, `npx tsc --noEmit`, `npm run build`,
   `npm run test:unit`, `npm test` all pass.

---

## 5. Out of scope — with one stated ambition

**Stated direction from the project owner, not scheduled**: *"at one point in the future I
want to sit in the cockpit of the ornithopter and fly around"*, and *"I lean toward creating
an Ornithopter module which can be inserted into any game and it must look sublime."*

Both change what "finished" means for this asset, so they are recorded here even though
neither is being built yet:

- A **cockpit view** makes the canopy interior load-bearing. Today the canopy is exterior
  glazing over nothing; a seated view needs a frame read from inside, instruments, and the
  wings visible through the glass doing their actual cycle. The reference set already
  includes a cockpit interior study (`.shots/reference/thopter-03.jpg`) for exactly this.
- A **reusable module** means the craft must stop depending on this repo's specifics: it
  currently reads `FlightPath`, the shared `scene.environment`, and this project's palette.
  A portable version needs its own environment fallback and a self-contained factory —
  which is precisely the shape `img2threejs` emits, and an argument for pushing more of the
  build through that pipeline rather than hand-authoring against this scene.

Neither is in scope for stage 22. Both argue for keeping the craft's geometry, materials and
motion in `modes/flight/geometry/` and `wingCycle.ts` — free of engine and scene coupling —
which is already how it is built.

- Player-controlled flight. The cinematic is a transition, not a vehicle sim.
- Landing and take-off sequences, including wing folding. Worth doing, but it needs the
  location dioramas to have a landing pad to fold onto.
- Combat thopters, Harkonnen variants, or any second silhouette.
- An asset pipeline. If step 3 cannot reach the bar procedurally, that is the moment to
  reopen the GLB decision from Stage 12 — not before.

---

## 6. Sources

Gathered in a research pass for this document. Claims that are common practice with no
citable standard, or that are reasoning rather than a source, are marked inline in the
text rather than listed here.

**Primary text**
- *Dune* (1965), full text, archive.org item `dune_20220411`. All quotations in 2.1 are
  verbatim from it. Fan wikis proved unreliable on this subject — see the Heart Scallop
  correction — so the text was read directly. *Dune Messiah* and *Children of Dune* could
  not be obtained; textual claims here are for *Dune* only.

**The ornithopter specifically**
- Villeneuve's design brief, the 8/6/4 wing variants, and the asymmetric-motion finding —
  https://halcyonrealms.com/film/dune-how-denis-villeneuve-designed-the-ornithopters/
- Cryo 1992's design and the Lynch comparison — https://www.thecompanion.app/dune-ornithopter/

**Flapping-flight biomechanics**
- Norberg 1975 — hovering *Aeschna juncea*: inclined stroke plane, AoA ~50° down / ~20° up.
- Wakeling & Ellington 1997; Frontiers 2022, free-flying *Pantala flavescens* — stroke
  plane held at 64–67° **to the body** while body pitch swings; the basis for "animate hull
  pitch, not the stroke plane" —
  https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2022.795063/full
- Dickinson, Lehmann & Sane 1999, *Science* 284:1954 — advanced / symmetric / delayed
  rotation and the sign of the resulting force. Note: a robotic model, not a live insect.
- Wang 2005, *Annu. Rev. Fluid Mech.* 37:183 — AoA "relatively constant after pronation and
  supination"; the basis for the trapezoid rather than a sine.
- Bergou, Xu & Wang 2007, *JFM* 591:321 — passive pitch reversal, negative net rotational
  power, torsional wave propagating tip to root.
- Noda et al. 2023, *JFM* 967:A31 — asymmetric pitching; fore/hind phase 82° cruise, 46°
  escape.
- Wang & Russell 2007, *PRL* 99:148101 — hindwing leads by only ~22°, contradicting the
  textbook 180°.
- Usherwood & Lehmann 2008 — ~90° phasing recovers the forewing's shed swirl; induced power
  22% below forewings alone.
- Combes & Daniel 2003 — spanwise stiffness 10–100× chordwise.
- Jongerius & Lentink 2010 — ~7° spanwise twist at supination, at 75% span.
- Kesel 2000, *JEB* 203:3125 — corrugation behaves as camber at flat-plate drag.
- Norberg 1972 — pterostigma: 9% of forewing mass, 22% of its moment of inertia.
- Thomas, Taylor & Bomphrey 2004, *JEB* 207:4299 — LEV tracks rapid AoA increase.
  ⚠️ A widely-circulated "stroke plane 8°–88°" claim attributed to this paper was checked
  against its text and **is not in it**. Discard it.
- Greenewalt 1962 (`f ∝ length^−1.15`); Jensen, Dyre & Hecksher 2024, *PLOS ONE*
  19:e0303834 (414-point fit) — the two scaling routes that converge on 1–3 Hz.
- Festo BionicOpter (63 cm, 15–20 Hz) and UTIAS Snowbird (32 m, 0.65 Hz) — engineered
  anchors at either end of the scale.

**Silhouette, shape hierarchy, greebles**
- Squint test — https://www.nngroup.com/videos/squint-test/
- Warframe TennoGen art guide (2:1 shape hierarchy, irregular spacing, panel lines on
  direction changes, avoid long thin shapes) — https://www.warframe.com/en/steamworkshop/basic-art-guide
- Greebles, and their double duty as scale cues — https://en.wikipedia.org/wiki/Greeble
- Symmetry reads as artificial — https://www.gamedeveloper.com/design/designer-s-notebook-a-symmetry-lesson
- Star Citizen rejecting pure-procedural greebling — https://www.exp-points.com/luan-vetoreti-star-citizen-sci-fi-materials-substance-designer

**Panel lines, bevels, trim sheets**
- Insomniac, "The Ultimate Trim", GDC 2015 — https://media.gdcvault.com/gdc2015/presentations/Olsen_Morten_TheUltimateTrim.pdf
- Trim sheet technique — https://polycount.com/discussion/210492/tutorial-trim-textures-for-environment-art-and-props
- Why bevels read as expensive — https://www.blog.radiator.debacle.us/2017/07/bevels-in-video-games.html
- Normal maps cannot change silhouette — http://wiki.polycount.com/wiki/Normal_map
- Hard edges need matching UV seams — https://polycount.com/discussion/114529/smoothing-errors-on-hard-surface-pieces-aka-how-to-get-clean-bakes

**PBR and the no-environment-map problem**
- `MeshStandardMaterial` — https://threejs.org/docs/pages/MeshStandardMaterial.html
- `PMREMGenerator`, and its minimum source sizes — https://threejs.org/docs/pages/PMREMGenerator.html
- `RoomEnvironment` zero-asset fallback — https://threejs.org/docs/pages/RoomEnvironment.html
- `scene.environmentIntensity` / `environmentRotation` scope — https://threejs.org/docs/pages/Scene.html
- Metals go black without a reflection capture — https://forums.unrealengine.com/t/pure-metallic-objects-not-being-captured-by-reflection-captures/238762
- IBL as mandatory alongside direct light — https://google.github.io/filament/Filament.md.html
- Metal F0 values — https://rtarun9.github.io/blogs/physically_based_rendering/
- Albedo ranges — https://digitalcolony3d.wordpress.com/2019/07/25/albedo-chart/

**Animation and fast cyclic motion**
- Twelve principles in games; secondary action and follow-through — https://www.gameanim.com/2019/05/15/the-12-principles-of-animation-in-video-games/
- Layered blending — https://dev.epicgames.com/documentation/unreal-engine/using-layered-animations-in-unreal-engine
- Spring/damper secondary motion — https://www.wayline.io/blog/jiggle-physics-implementation-guide
- Stroboscopic aliasing, with worked examples — https://en.wikipedia.org/wiki/Stroboscopic_effect
- Per-object motion blur via velocity buffer — https://john-chapman-graphics.blogspot.com/2013/01/per-object-motion-blur.html
- Blade-blur proxy swap thresholds — https://docs.flightsimulator.com/msfs2024/html/3_Models_And_Textures/Modeling/Aircraft/Airframe/Propellers_Turbines_And_Blades.htm

**LOD and budgets**
- `THREE.LOD` is a switcher only — https://threejs.org/docs/pages/LOD.html
- Star Citizen budget reference points — https://robertsspaceindustries.com/comm-link/SCW/14120-API
- Fixed-% vs max-deviation LOD reduction, which genuinely disagree — https://www.simplygon.com/posts/51aba9d5-bafd-459d-94b8-718273fdf092

**Weathering and failure modes**
- Chronological weathering order — https://taleofpainters.com/2016/07/tutorial-how-to-weather-vehicles/
- Why renders look fake — https://medium.com/@dthomas.cam/5-reasons-why-your-3d-renders-look-fake-5d20d8118023
- UV stretching on curved/irregular geometry — https://bitsoulhosting.com/marketplace/blog/uv-mapping-game-assets-complete-guide

### Two tensions this spec resolves, and how

**Herbert versus Villeneuve on wing structure.** Herbert's telescoping metal interleavings
with continuously variable aspect ratio are a more distinctive mechanic than the film's
fixed-length folding dragonfly wings — and they are the thing the Cryo 1992 game half
implemented, with wings that "shifted forward on takeoff". Taking the film's look means
discarding the novel's most cinematic idea. **This spec follows Herbert**, because it is
also what the game being recreated did.

**Villeneuve versus physics on beat speed.** The film's wings blur through several beats
per shutter. That is beautiful and wrong for the scale: at 4–8 m span the physics says
1–3 Hz. Herbert agrees with the physics — *"gentle beat"*, *"cup and dip—once, twice"*.
**This spec follows Herbert and the scaling laws**, which is also cheaper to render and
immune to temporal aliasing.

### Where confidence is lowest

- **Cryo 1992's visual reference** rests on essentially one descriptive sentence plus
  contemporary reviews. It is the reference that matters most to this project and the one
  with the thinnest sourcing. Worth a direct look at the game if a copy can be found.
- **Villeneuve craft dimensions** (~23 m long, ~26 m span) are fan estimates from a
  modeller's build log, not official figures.
- **Dragonfly stroke-deviation angle** — no dragonfly-specific number was found; the
  10–20° figure is a general-insect default and is labelled as such.
- **Sweep-to-pitch phase offset in degrees** — a genuine gap in the literature, not just in
  this search. Hence the trapezoid is specified by its held values and flip window rather
  than by a phase constant.
- **Hovering fore/hind phase lag** — 180° classical versus 20–90° measured. This is
  **unresolved in the field itself**, not merely uncertain here.

### Where sources disagree

- **LOD reduction method** — fixed percentage per level versus a consistent
  geometric-deviation target. Simplygon documents both as live alternatives. Moot here:
  this craft gets one level.
- **Bevel width convention** — relative percentage versus absolute millimetres. No single
  studio standard found.
- **Hero texel density** — 1024 versus 2048 px/m depending on source. Consistency across
  the asset matters more than the absolute figure.
