# Chani Gauntlet Loop — the bar, and the live log

Standalone rig at `character-shop/chani/`. Run it with `npm run cast:chani`.

## STATUS — SETTLED

Settled 2026-08-08 by user verdict: "no more work is needed on these figures."
Final state: R2 pass 3, interrupted by the 2026-08-07 weekly-limit cut and
never resumed — tests green (35), evidence deterministic, face reads young and
lidded but was not driven to the likeness bar. The user generates future cast
figures as 2D photo-style images (ChatGPT); the 3D loops end here.

## The bar

`character-shop/docs/gauntlet-loop.md` — R1: massing correct, proportioned,
continuous, real profile depth, silhouette reads as a wiry young Fremen woman.
Final (R3) panel: AAA ≥9/10, zero correctness findings, user verdict.

## Rounds

### R1 — body and silhouette (4 passes, 4 fresh critics)

| pass | builder | critic | headline |
|---|---|---|---|
| 1 | Sonnet | 2/10 | blind-ID: "wooden artist's mannequin" — disconnected capsule joints, mesh holes |
| 2 | Sonnet | 3/10 | continuity relocated (pelvis hole, wrist gaps); NO DEPTH — profile a flat cutout |
| 3 | Opus | 4/10 | loft rebuild with authored front/back depth; found tubes wound INSIDE-OUT (the real cause of flat limbs); category finally lands ("hooded traveler, leans female") |
| 4 | Opus | 5/10 | depth budget redistributed (ribcage 0.246 vs pelvis 0.203 by tape); elbow breaks; neck ledge; critic still reads hips heavy / chest flat |

**What did not reproduce:** pass-4 critic's "asymmetric neck lump" (per-mesh
mirror distance 0.0000 mm — a key-light artifact) and "hair gap band" (pixel
scan: zero interior background rows; PALETTE.hair reads darker than the
backdrop — value collision, not a hole). Pass-3 critic's "hips wider than
shoulders" was real but was DEPTH projected into width by the 45° camera, not
X-width — fixed by trimming seat maxZ, not the (already in-spec) hip X.

**Method lesson (applies to every shop):** stacked analytic primitives cannot
pass this bar; the pass-3 loft/station rebuild (authored rzF/rzB per ring,
Catmull-Rom curvature) is what moved the category read. Winding order matters:
inside-out tubes render as flat panels and no test saw it until signed-volume
checks landed in depth.test.ts.

**Tests:** 16 green (seam guards, widths in anatomical bands, symmetry,
signed-volume depth). Shots: `.shots/` seven views, deterministic.

### R2 — head and likeness (Opus — the hardest face of the wave: no hood, no
beard, nothing to hide behind)

Lead adjudication notes, on top of the builder log below: spec delta committed
first (137fb0a, `PALETTE.eyes 0x33689e` full-ibad); the wave's portrait rig +
`headfront`/`headthreequarter` framings; pass-1 blind judge named CHANI #1
(~60%) but explicitly from the COSTUME grammar; the p1 critic's "hand/forearm
skin drift" did NOT reproduce (same `mat.skin` instance — lighting); the
neck-loft-into-head-rows refactor was an approved boundary call; and the
whole session's exit-144 mystery root-caused here — shoot.mjs never exits
because its vite child holds the event loop (fix queued to builders).

| pass | builder | critic | headline |
|---|---|---|---|
| 1 | Opus | 2/10 | face sculpt built as summed fields on one loft; blind judge named "Chani" at ~60% but from the COSTUME grammar only — "the face does not read as a young woman, a stylized gender-ambiguous mask" |
| 2 | Opus | — | architecture pass: heart-shaped taper, mid-face mass, aperture exposure, real nose, lips that survive sampling |

**Pass 2, what moved (all measured off finished vertices, not authored):**

| | pass 1 | pass 2 |
|---|---|---|
| facial thirds (lower/mid/upper) | 0.324 / 0.388 / 0.288 | 0.311 / 0.357 / 0.331 |
| chin width at menton+7 | 95.59mm — 0.676 of bizygomatic | 76.77mm — **0.527** |
| bizygomatic | 141.50mm | 145.81mm |
| eye aperture | 34.02 × 15.12mm | 37.14 × 16.43mm |
| aperture NOT buried by skin | 10.05mm (pixel scan of the render) | **12.80mm** |
| nose proud of the upper lip | 2.05mm | **8.60mm** |
| upper lip vs the E-line | 2.9mm in FRONT | 0.68mm behind |
| mesh rows at the upper lip | 2.06mm | 0.81mm |
| front column gap at lip height | 2.40mm | 1.42mm |
| triangles | 34,004 | 69,912 |

**The one root cause behind four separate symptoms.** Pass 1's cupid's bow
(1.9mm) fell between mesh rows spaced 2.06mm and was averaged into a
straight line by `computeVertexNormals`; the same undersampling made the
nose a "soft crease on a flat plane" (2.40mm columns across a 34mm nose)
and the hair curls a "jagged zigzag ribbon" (12 rings sampling a 3.8-lobe
cosine — three samples a cycle is a triangle wave). Stilgar's loop found
the identical failure. Fix: check every relief wavelength against the
LOCAL sampling density, and warp density into the zone rather than raising
it globally.

**Two things the capture disproved, both of which I had built first:**

1. *Narrowing the chin ring to 63mm made it worse.* At 31.8mm of
   half-width the ring is narrower than the mandible border `jaw.ts` draws
   on it, so the crease ran down the FRONT of the chin and the render came
   back a narrow muzzle. The chin must be narrow relative to the cheekbone
   and still wide enough to carry a jawline. Settled at 77mm.
2. *Lowering the brow ridge to close the "brows float high" gap buried the
   eye.* The measured pass-1 gap was already 1.63mm — the perceived float
   was the ridge's shadow band plus a too-short aperture. What actually had
   the eye was the LID CREASE: pass 1 put it at EYE_Y + 9.4 against an
   aperture whose top edge is EYE_Y + 8.9, so the fold sat ON the eye and a
   pixel scan found 39% of the almond buried. Moving the crease UP is what
   opened it. The ridge ended within 0.2mm of where pass 1 had it.

**Guards changed, and why (declared):** the nasal-protrusion test scanned
for the profile's rearmost point in y 50-70mm and called it the subnasale —
it actually finds the PHILTRUM GROOVE, 14.5mm behind the columella base, so
it read 28.5mm for a nose whose true protrusion is 14.5. It now reads the
profile at the subnasale's own height. The mouth-width test measured the
lip seam against the lower vermillion 6.8mm below it; once the jawline was
rebuilt, the mandible border passed through that probe and reported 3.3mm
of "mouth" where there is cheek — it had been passing by cancellation
against the station ring's curvature. It now measures the vermillion
against the philtrum plane, which nothing else touches. The brow-relief
window moved down 7mm because the ridge did. Two guards added: the nose
must stand 6-16mm clear of the upper lip (pass 1: 2.05mm — it would have
failed), and the upper lip must sit behind the nose-tip-to-chin line (pass
1: 2.9mm in front — it would have failed). 33 tests to 35.

**Files split for the 200-line rule:** `face/nose.ts` (new — the nose needs
five named forms where pass 1 had two), `profile.test.ts` (new — the
centre-line guards), and `frontNarrow` moved from `warp.ts` to `jaw.ts`,
which is the mandible taper it belongs with.

**What still does not match — read from the render, not the intent.** The
face is legibly human, young and fine-boned now, with a real nose, real
lips and large canted ibad eyes; it is NOT yet Zendaya and I would not
claim a blind judge names her from the face. Remaining: the lower face is
still long for its width; the mouth is small and could take more
vermillion height; the ibad eyes read as flat blue lozenges with no depth
cue (material nuance is R3 scope, but the shape could take a rounder
lower lid); the side hair masses are still chunky at their silhouette
edges; and there is a faint vertical crease down the cheek in 3/4 where
the cheek hollow meets the jaw crease.
