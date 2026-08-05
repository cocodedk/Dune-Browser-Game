# Stilgar Gauntlet Loop — the bar, and the live log

Standalone rig at `character-shop/stilgar/`. Run it with `npm run cast:stilgar`.

## STATUS — session handoff

R1 (body and silhouette) FROZEN at pass 3 by lead decision 2026-08-05. The
pass-3 sculpt transformed the failed head assembly: the bust now reads as a
hooded, bearded man (lead-verified; unscored by a critic — frozen alongside
the other wave-1 shops for the user's verdict). Logged residuals: the wrap's
rim edges read as a raised cord at bust framing (builder attempted, unsolved);
the catchpocket tube placement reads odd at bust framing; eye geometry and
ibad colour are R2/R3 scope; beard internal form is value-crushed by
PALETTE.hair 0x241c14 (a spec.ts decision, lead/user-owned); arms/legs remain
pass-2 cylinders with visible joint seams (deliberately untouched this pass).

## The bar

`character-shop/docs/gauntlet-loop.md` — R1: massing correct, proportioned,
continuous, silhouette reads as a solid hooded bearded sietch leader
(Bardem's Stilgar). Final (R3) panel: AAA ≥9/10, zero correctness findings.

## Rounds

### R1 — body and silhouette (3 passes, 1 lead gate ×2)

| pass | builder | verdict | headline |
|---|---|---|---|
| 1 | Sonnet | lead gate FAIL | body continuous and in-spec, but the head read "motorcycle helmet + duck bill"; beard floated at collarbones; two pectoral spheres |
| 2 | Sonnet | lead gate FAIL | fixes landed as primitives again: hood a balloon with a slice out, brow+nose a mushroom, beard a hard-edged cone |
| 3 | Opus | frozen, lead-verified | topology-first sculpt: parametric surface mesher (Catmull-Rom tables, Gaussian blends), shellGeo giving cloth REAL thickness (kills the zero-thickness rim artifact), face carved INTO the head loft (brow +16.8mm, sockets −17mm with lid bulges, cheekbones, 8-row nose), thickness-field beard with irregular symmetric hairline, draped hood with an arch opening |

**What did not reproduce / near-misses caught by measurement:** the beard at
40.5mm projected 1.6mm PAST the nose tip (seam-guard near-violation — capped
to 33.5mm); first face-relief pass (brow 12.2mm) measured fine and rendered
as a smudge — relief must be sized for the harness lights, not the tape.
Head-height fraction is measurement-definition-sensitive: visible head mass
0.1364 (in band) vs beard-bbox 0.1441 (over) — the bbox includes the hidden
inner shell; recorded so R2 doesn't re-litigate it.

**Method lesson:** forms authored as cross-section tables and BLENDED BY
SUMMATION merge into one surface; intersecting analytic shapes never stop
reading as separate objects. Cloth needs thickness at every cut edge.

**Tests:** 9 green. Shots: `.shots/` seven views, deterministic.
Measured: height −0.20% vs spec, shoulders +2.84%, hips exact, nose frontmost
(−0.1254 ahead of beard −0.1202 and hood −0.1100), mirror error exactly 0.
