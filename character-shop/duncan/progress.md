# Duncan Gauntlet Loop — the bar, and the live log

Standalone rig at `character-shop/duncan/`. Run it with `npm run cast:duncan`.

## STATUS — SETTLED

Settled 2026-08-08 by user verdict: "no more work is needed on these figures."
Final state: R2 pass 3, lead-verified (41 tests green, evidence deterministic)
— the scar reads as a scar, the jaw shows through the beard, and blind judges
ranked "Jason Momoa as Duncan Idaho" first in both tests. His 3×Opus panel
died with the weekly-limit cut and was never re-run. The user generates future
cast figures as 2D photo-style images (ChatGPT); the 3D loops end here.

## The bar

`character-shop/docs/gauntlet-loop.md` — R1: massing correct, proportioned,
continuous, real profile depth, silhouette reads as a tall broad athletic man
(Momoa's Duncan). Final (R3) panel: AAA ≥9/10, zero correctness findings.

## Rounds

### R1 — body and silhouette (5 passes, 3 fresh critics)

| pass | builder | critic | headline |
|---|---|---|---|
| 1 | Sonnet | — | evidence inadmissible (near-black on black; a real setSilhouette background-clobber bug found by pixel sampling) |
| 2 | Sonnet | 5/10 | base read lands ("adult male tactical soldier"); padded ball joints, crotch notch, skin-tone beard, no neck |
| 3 | Sonnet | 4/10 | six named fixes landed mechanically; gestalt regressed — "armor pauldrons, not muscle"; strict cones read lifeless |
| 4 | Opus | 4/10 | station/loft rebuild; found the real root cause — the head was 11.6 head-units (a doll head that made ANY shoulder read mecha), now 7.69; critic caught the builder's "upper-back curve" over-claim (16mm wobble ≈ a line) |
| 5 | Opus | frozen unscored | vertex-measured curves: pec crown +36mm over abdomen, lumbar hollow, glute 0.184 vs thigh 0.125, calf swell; breadth restored; boots debulked; nasion dip; 52mm neck sliver behind the beard in profile |

**What did not reproduce:** pass-4 report's "upper-back curve present" — the
critic and the lead's own read both found a straight edge; the builder's pass-5
vertex table owned the over-claim (16mm wobble over 400mm). Known residual:
the visible upper-back outline in profile is HAIR, not torso — only two of the
three direction changes are skin.

**Method lesson:** head-unit count drives the whole-figure read — no shoulder
tuning could fix an 11.6-unit head. Report the render, not the table's intent.

**Tests:** 18 green (seam guards, widths in anatomical bands, 3D joint
continuity incl. crotch, envelope with head-band check). Shots: `.shots/`
seven views, deterministic.

### R2 — head and likeness (3 passes so far)

Spec delta committed first (137fb0a): `PALETTE.eyes` natural dark, lifted to
0x453425 after pass 1 (near-black rendered as empty slits in shadowed sockets).
Portrait rig + `headfront`/`headthreequarter` as per the wave.

| pass | builder | verdict | headline |
|---|---|---|---|
| 1 | Opus | Sonnet 6/10 · blind ranks MOMOA'S DUNCAN #1 (~50%, Drogo 2nd) | full face sculpt; builder DISPROVED the lead's brief ("left = +X" was wrong — left is −X, arm.ts precedent + cross product; scar side approved at −X); scar read as "modeling error, not a mark" |
| 2 | Opus | Sonnet 6/10 · blind ranks Momoa's Duncan #1 (moderate) | eyes rebuilt as convex globes with real lids (9mm aperture vs flat pills), mouth resolved (24mm visible lip), hairline shaped, cranium+neck broadened; found+guarded its own bare-scalp defect; scar still "two pieces" — gap floor catches the key |
| 3 | Opus | running | scar as a MARK (raised tissue line through the gap, self-shadowing walls), jaw through the beard + hair/beard silhouette separation, brows follow the ridge, topknot-base show-throughs (lead-found in back.png) |

**What did not reproduce:** pass-1's "58.4mm neck sliver" (pass 2 measured
43.4mm in the same window — builder over-report); the p2 critic's "hair-volume
asymmetry" (lead checked back.png: one CENTERED tail — perspective in angled
views). **Guard re-ruler, declared:** scar notch 1D column sweep → 2D cell
sweep (column sweep blind to thin diagonal grooves; same geometry 2.0mm by the
old ruler, 5.3mm by the new).
