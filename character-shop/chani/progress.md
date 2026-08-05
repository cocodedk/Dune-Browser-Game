# Chani Gauntlet Loop — the bar, and the live log

Standalone rig at `character-shop/chani/`. Run it with `npm run cast:chani`.

## STATUS — session handoff

R1 (body and silhouette) FROZEN at pass 4, critic score 5/10, by lead decision
2026-08-05: the remaining critique items (understated depth, "cap" deltoids,
mitten hands) are converging on what flat-shaded massing cannot sell — the
next call is the user's (accept R1 as the R2/R3 foundation, or keep grinding
under flat shading). Body is continuous, in-spec, and category-legible.

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
