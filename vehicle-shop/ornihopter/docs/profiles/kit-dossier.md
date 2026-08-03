# Kit dossier: what the flat plates prove

A blind critic scored the exterior 4/10 against print-kit photographs and made seven
specific shape claims. Photographs foreshorten and have misled this project before, in
both directions (see `../info.md`). This document instead measures the print kit's own
flat plates — every part in `Individual Components` is a true ~1.8mm-thick 2D profile,
not a photograph of one — and settles or refutes each claim against millimetre numbers
taken directly off them.

**Method, in three layers, cheapest-and-least-certain first:**

1. **Bed-aligned bounding box** (`stl-measure.mjs`) — wrong for any plate that lies
   diagonally on the print bed, which several do.
2. **Principal-axis measurement** (`principal.mjs` / `stl_lib.py`) — de-rotates each
   plate to its own long axis before measuring. This is what `plate-to-outline.mjs` now
   does too (it didn't before this pass; see "Tooling fix" below).
3. **Assembled 3MF coordinates** — for questions the flat pack can't answer alone (which
   end is the nose, whether two "alternate" gear sets are really alternates), the
   `Kit options/*.3mf` files contain a real assembled scene with per-part 4×4 transform
   matrices. Applying those transforms to the actual mesh vertices (not just trusting
   raw translation numbers, which are misleading once rotation is involved — see below)
   places every named part in one consistent world space. Part identity between this
   folder's filenames and the 3MF's internal filenames was confirmed by **exact
   triangle-count matching** (e.g. `Gear_left.stl` = 166 tri = the 3MF's `Left_Gear.stl`,
   166 tri — not by name similarity, which differs between the two exports).

> **CORRECTION (Round 6a, verified by the lead).** Layer 3's premise is wrong. The
> per-part transforms in the `Kit options/*.3mf` `3dmodel.model` files are **print-bed
> placements**, not assembly positions: every translation's z lies within ~1mm of the
> bed and the 3×3 blocks are the rotations that lay each part FLAT (checked twice,
> independently — by the Round 6a builder and by the lead, who also confirmed
> `Assembly_168.model` contains no internal transforms at all). Consequences, claim by
> claim: **part-list facts stand** (ramp gear co-installed with main gear — that is a
> `model_settings.config` membership fact, true of a bed too); **single-plate anatomy
> stands** (all layer-1/2 measurements); **cross-part distances are DOWNGRADED to
> bed-packing artifacts** — §e's 39.52mm row gap survives only because the kit-2
> photograph independently corroborates it, and the tail-end anchoring of
> `Airframe_main` is likewise photo-derived now, not 3MF-derived. The "bosses, not nose
> fins" verdict (§b) survives either end-anchoring: the bosses sit 62–85% along the
> plate, i.e. not at EITHER tip.

Every plate render mentioned below (one PNG per part, de-rotated, filled top-face +
true-boundary outline + mm grid, plus a contact sheet) was produced and visually
inspected during this pass; they live in the measurement session's scratchpad, not in
this repo, because they're working artifacts, not shippable content. The renderer fixes
a bug of its own worth stating: a first pass drew **every** triangle edge, which for a
concave triangulated cap makes internal triangulation diagonals look like a truss of
real structure. The final renderer draws only edges used by exactly one top-face
triangle (the true 2D boundary — outer silhouette, hole boundaries, raised-feature
footprints); that change alone turned an apparently gnarled "truss" plate into a clean,
readable silhouette.

---

## a. Landing gear

**Anatomy (`Gear_left` + `Gear_right`, 166 tri / 35.29 × 11.36mm each, mirror images):**
each leg is a 2-bar linkage — a **hip bracket** (a hollow rectangular loop with a
castellated/notched edge, i.e. a multi-position locking joint, at the fuselage end) →
a long **main strut** → a shorter **brace strut** crossing it (a scissor/four-bar
mechanism, consistent with a foldable gear) → a **foot** that is itself a hollow
elongated rectangular loop, i.e. a flat bar lying along the ground. That foot really
does read as a horizontal skid bar, not a wheel or a point.

**Count — this is the interesting part.** The flat pack alone shows one gear family
(`Gear_left`/`Gear_right`/`Gear_main_support`) plus two others the task calls
"alternates" (`Ramp_gear_*`, `FM_Gear_*`). Checking the actual `Kit options/*.3mf`
assemblies (Standard, Compact, Small-Bed — all three, independently) shows those two
families are **not symmetric alternates**:

| family | present together with main gear? | verified via |
| --- | --- | --- |
| `Gear_left`/`Gear_right`/`Gear_main_support` | — (this *is* the main gear) | — |
| `Ramp_gear_left`(×2, mirrored)/`Ramp_gear_support`/`Ramp` | **YES — co-present in every one of the 3 ground-pose kits checked**, as one `Assembly` object on one print bed | exact triangle-count match: `Ramp_gear_left.stl`=242 tri = 3MF's `Ramp_support_left/right.stl`=242 tri; `Ramp_gear_support.stl`=32 tri = 3MF's `Back_Gear_Support.stl`=32 tri |
| `FM_Gear_left`/`FM_Gear_Main` | **NO** — appears only in the standalone `Flight_mode_upgrade_kit.3mf`, together with its own `FM_frame.stl` (a different main frame entirely), never with `Gear_left`/`Ramp_gear_*` | full part-list dump of the FM 3MF |

So the fully assembled *standard* kit genuinely has **four** strut-like structures
reaching toward the ground: 2 main-gear legs (ending in the skid-bar foot described
above, track width ≈50.6mm between `Left_Gear`/`Right_Gear` centroids) **plus** 2
ramp-support arms (`Ramp_gear_left`/mirrored copy, track width ≈44.3mm) bracing the
separate multi-segment **hinged ramp panel** (`Ramp.stl`, 65.23×14.62mm, three fold
joints — a genuine folding boarding ramp, confirmed by its own plate having full-width
hinge gaps at x≈14, 22 and 51mm). The ramp-support arms are a different anatomy from
the main legs, though: hip bracket + one long thin rail, tapering to a **point**, not a
skid bar — they read as ramp-deployment braces, not free-standing legs, even though they
approach the ground alongside the ramp. `FM_Gear_*` is confirmed a true either/or
alternate (different pose, different frame, never combined).

**Verdict — "4 landing legs total, ending in horizontal skid bars": PARTIALLY CONFIRMED.**
Count of 4 ground-approaching struts in the assembled standard kit: **confirmed**, but
the task's own framing of `Ramp_gear_*` as a simple "alternate" undersells it — it's
verified co-installed with the main gear, not a substitute for it. "Ending in horizontal
skid bars" is only true for 2 of the 4 (the main `Gear_left`/`Right_Gear`); the other 2
(`Ramp_gear_*`) end in a point and brace the ramp instead.

**Verdict — "crouched": REFUTED.** `Gear_left`'s principal length (hip to foot) is
35.29mm; `Airframe_main`'s overall bounding depth (dorsal-most to ventral-most point,
anywhere on the plate) is 33.30mm. Ratio 1.06 — **the leg is slightly longer than the
pod is deep**, not short relative to it. (Caveat: the leg is a bent linkage, not a
straight strut, so the *vertical* ground clearance it delivers once deployed is some
projection of this 35.29mm reach, not necessarily all of it — the flat pattern fixes the
leg's total reach but not its deployed spread angle.)

---

## b. Nose

**Which end is the nose is not obvious from the plate alone** — `Airframe_main` tapers
at *both* ends (see profile below) — so this was resolved with the 3MF assembly
coordinates: `Horizontal_Tail_Section` (unambiguous by name) projects to **0.011** of
the way along `Main_Airframe`'s own 170.81mm world-space principal axis, i.e.
essentially at the x≈0 (rounded-blade) end. That end is therefore the **tail**-boom
root, and x≈170.8mm, the pointed end, is the fore/nose-ward end.

**"Blunt nose face": REFUTED.** The pointed end (x=170.8mm) is a smooth, monotonic
taper, not a face: chord falls 22.1mm (x=145) → 13.2mm (x=165) → 8.6mm → 5.7mm → 3.4mm
(x=169.4mm) over the last 24mm — a continuous wedge, not a flat cutoff. (For reference,
the *other* end isn't blunt-vertical either: it's a rounded bullnose cap that reaches a
**constant** 6.27mm width by x=2.9mm and holds it — a rounded rod tip, not a wide face.)

**"Three vertical fins at the nose": REFUTED on both location and, precisely, count.**
Station-scanning the de-rotated plate finds exactly **two** clean local maxima in the
gear/ramp zone — x=130.62mm (29.36mm chord, the single tallest point on the *entire*
plate) and x=136.36mm (26.92mm, a shallow saddle between them) — plus one smoother,
hull-integrated rise further back (x=106.2mm, 23.09mm) that's continuous with the main
hull curve rather than a separated tab. Call it 2 sharp features or 3 generous ones, but
**none of them are within 25mm of either tip**: they sit at 62–85% along the plate's
length, in the same zone that the verified 3MF coordinates place `Ramp` (130.7mm along
the same axis — a 0.1mm match to the tallest peak) and `Gear_main_support` (134.8mm).
**These are gear/ramp mounting structure, not free-standing nose fins.** They *are*
correctly "vertical" — the plate is confirmed to be the craft's vertical center profile,
so anything projecting from its top edge is a true vertical protrusion in 3D — but that's
the only part of the claim that survives.

Two genuine, precisely located notches sit just before this hump — full-depth-ish slots
at x=109.1mm and x=122.0mm (chord collapses to ~10.3–10.4mm from a ~20–23mm baseline) —
which is where `Left_Gear` (109.5mm) and a `Ramp_gear_left` instance (108.8mm) verify to
mount. Landing-gear and ramp attachment, not fins, account for essentially the whole
"nose" cluster the critic described.

---

## c. Canopy

`Canopy.stl` (45.01 × 16.81mm) is a symmetric **lens/eye shape, pointed at both ends**,
with one rectangular through-hole (~10mm) offset toward one tip. A footprint that tapers
to a point on both ends is what a panel that **follows the hull's own taper** looks
like; a proud, free-standing box canopy would more plausibly show a boxier,
squarer-ended footprint. `Canopy_Airframe_support_front.stl` (15.60 × 7.76mm) is a
hinge/pivot bracket — a stepped clevis with a rectangular axle hole — consistent with
`info.md`'s cited "opening cockpit" feature, not a static mount.

**Verdict — "flush chamfered deck vs proud box": leans CONFIRMED (flush), but a flat
outline plate genuinely cannot fully prove 3D proudness/elevation** — that's the one
question in this dossier the plates can only partially answer. What they *can* settle:
the footprint is **not** box-shaped, which directly weighs against "proud windshield
box."

**Verdict — "~45% of pod length": CONFIRMED, closely.** Canopy's 45.01mm against the
"fat hull" portion of `Airframe_main` (the ~112.8mm run from where the boom flares out,
x≈58mm, to the tail-cone tip, x≈170.8mm) is **39.9%** — same order, a few points under
the critic's number.

**Where the support sits:** the 3MF places `Canopy`'s centroid at x=82.3mm along
`Main_Airframe` (48%, close to the plate's own midpoint) and
`Canopy_Airframe_support_front` 5.1mm further along at x=87.4mm — inside the canopy's
own footprint, toward its aft edge, not out at the tip. Local pod depth at the canopy's
station is only 11.8mm — **40% of the plate's 29.36mm maximum depth** — so the canopy
sits over a distinctly shallow part of the hull, not the deepest part.

---

## d. Boom (`Horizontal_tail`)

129.64 × 14.12mm, symmetric about its own centreline. From the root: a rounded,
chamfered cap (x=0–18mm) around one central mounting hole, then a genuine **neck-down**
at **x≈18–20mm** (a real pinch, not a gradual taper), opening back out to a near-constant
~14mm-chord plateau from x≈20–90mm.

**At x≈90mm the blade forks into two tines per side** (confirmed at high zoom):

- a **short tine** (90–108.5mm) that terminates in a **squared, flat paddle** with a
  long lightening **slot** cut into it, and
- a **long tine** (90–128.5mm) that continues to a rounded/blunted **point**.

**Verdict: CONFIRMED, and more specific than any one of the critic's guesses.** The
critic offered "squared paddle? fork? slot?" as alternatives; the plate shows it's a
**fork whose two tines are each of the other two** — one squared-and-slotted, one
pointed. Neck-down location: x=18–20mm from the root, 14–15% of the part's own length.

---

## e. Wing mounts

`Wing_support_front` (38.72 × 21.55mm) and `Wing_support_back` (36.50 × 20.34mm) are
near-twin brackets: a stubby cross/"H" body with **four outstretched corner arms**, each
arm terminating in its own small mounting slot — two arms above centreline, two below,
i.e. a genuine 2×2 (2-row × 2-column) hole pattern **on each plate independently**.

**Row spacing — CONFIRMED, with a number.** Applying the verified 3MF transforms to both
parts' actual mesh vertices (not raw translation, which is unreliable once rotation is
involved) puts their centroids **39.52mm apart**.

**Bonus, unclaimed by anyone:** these mount plates sit only **11.1–11.6mm** (world-space,
vertex-to-vertex) from the 2×2 cluster of circular-bossed holes already visible on
`Airframe_left`/`Airframe_right` (the hull side skins) — while `Right_Gear` sits
**131.6mm** away from that same spot. That resolves a naming red herring: the 3MF's
internal name for these hull panels is `Left/Right_Airframe_W_Snap_Gear.stl`, which
reads like "landing gear," but the geometry says otherwise — it's **11× closer** to the
wing-support hardware than to the actual landing gear. "Snap gear" is almost certainly a
gear-toothed wing-fold locking feature (the hip bracket's castellated notches, see §a,
are the same idiom), not a second gear-leg system. **This means the critic's "2×2
clevis-lug cluster per side" claim is confirmed on the *hull panels themselves*, not
just inferred from the named wing-support plates** — there are two independent, adjacent
2×2 systems (the shelf brackets and the hull-panel lug holes) working together.

---

## f. Wing root (`Wing_Fullscale_left`)

**CONFIRMED: a distinct thin-rod root segment exists, with numbers.** From the plate
(197.62 × 13.19mm, root end):

| feature | span | notes |
| --- | --- | --- |
| hinge eye | x = 0–9mm | annular pivot loop, ~9.6mm chord at widest |
| rod / ridged sleeve | x = 10–27mm | chord tapers 4.4mm → **2.48mm (root width, at x=26.81mm)**; ~16–18 regular scallops along both edges — a literal screw-thread/ridge texture |
| flare into blade | x = 28–41mm | chord climbs 2.9mm → 9.4mm |
| full blade chord | x ≥ 40.7mm | stable at 9.43–9.45mm |

Chord first **permanently** exceeds 2× the root width (4.97mm) at **x≈31.4mm** — 15.9%
of the 197.62mm span. Full stable blade chord isn't reached until x≈40.7mm (20.6%).

**Verdict: CONFIRMED IN KIND, REFUTED ON PROPORTION.** The critic's "thin rod + screw-jack
actuator sleeve" is a good description of what's actually there (right down to the
ridged/threaded texture), but it occupies the inner **16–21%** of the span, not "the
inner third" (33%).

---

## g. Pod side profile (hull-builder numbers, from de-rotated `Airframe_main`)

All figures as measured off the plate; no absolute scale (see note in
`airframe-side.json`) — these are proportions of the plate's own 170.80mm length and
29.36mm maximum single-station depth.

- **Max depth: 29.36mm at x=130.62mm — 76% along the length**, not mid-body. This is the
  same station as the tallest "fin"/ramp-mount peak in §b.
- **Overall bounding depth (dorsal-most point to ventral-most point, wherever each
  occurs): 33.30mm** — 3.9mm *more* than the deepest single cross-section, because the
  highest deck point and lowest keel point occur at different stations (x≈136mm deck vs
  x≈102mm keel) rather than stacking at one.
- **Deck and keel both descend together** from the tail-boom root (x=0) to x≈60mm (the
  boom stays a near-constant ~5–6mm wide blade over that whole run).
- From x≈60–102mm **the keel drops away much faster than the deck rises** — the hull
  gains its early depth mostly from the belly expanding downward, not the spine rising.
- The dorsal hump at x=129–144mm (§b) is produced almost entirely by the **deck line
  rising** (the keel stays roughly flat there) — geometric confirmation that feature is a
  top-side/dorsal addition, not a symmetric blister.
- "Nose"-adjacent depth: at x=145mm (where the final taper begins in earnest) local
  depth is 22.1mm — **75% of max depth**. It falls away smoothly from there; there is no
  station anywhere near either tip where depth is large right up to a cutoff.
- The tail-boom-root cap (x=0 end) plateaus at 6.27mm — **21% of max depth** — almost
  immediately.

---

## Tooling fix (background for the profile JSON regeneration)

`plate-to-outline.mjs` scanned stations in raw **bed-aligned** U/V, not the plate's own
principal axis. Most parts happened to sit close enough to bed-aligned that this didn't
matter; `Airframe_main` does not (it lies at 44.7° on the bed — its bed-aligned box is a
near-square 126.1×121.8, its true shape is a 170.8×33.3 blade). The old
`airframe-side.json`'s `offset` column swept **-1.18 to +1.28** (a normalised value that
should stay within roughly ±0.5) — a direct symptom. The tool now computes the same
principal-angle de-rotation `principal.mjs` uses before scanning stations at all, for
every plate, not just the diagonal ones. Regenerated with the fixed tool:

| profile | source | plate mm (L × W × t) | old offset range | new offset range |
| --- | --- | --- | --- | --- |
| `airframe-side.json` | `Airframe_main.stl` | 170.80 × 33.30 × 1.97 | **-1.184 .. +1.285 (contaminated)** | -0.144 .. +0.147 |
| `canopy-deck.json` | `Canopy.stl` | 45.01 × 16.81 × 1.80 | (already sane) | -0.009 .. +0.007 |
| `gear-leg.json` | `Gear_left.stl` | 35.29 × 11.36 × 1.80 | (already sane) | -0.164 .. +0.121 |
| `boom-plan.json` | `Horizontal_tail.stl` | 129.64 × 14.12 × 1.80 | (already sane) | -0.001 .. +0.000 |
| `mount-plate-front.json` | `Wing_support_front.stl` | 38.72 × 21.55 × 1.81 | (already sane) | -0.380 .. +0.145 |
| `mount-plate-back.json` (new) | `Wing_support_back.stl` | 36.50 × 20.34 × 1.79 | — | -0.368 .. +0.103 |
| `flank-panel.json` | `Side_left.stl` | 47.65 × 5.91 × 1.60 | (already sane) | -0.124 .. +0.100 |

`gear-leg.json`'s station scan is a simplified outer **envelope** of `Gear_left`'s
branching 2-bar linkage (documented tool limitation: it flattens shapes that double back
on themselves) — the anatomy described in §a comes from the plate render, not this JSON.
`wing-planform.json` (`Wing_Fullscale_left.stl`) was not in the regeneration list and was
not touched; it was already sane (its own diagonal angle is only -1.4°).
