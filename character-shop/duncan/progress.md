# Duncan Gauntlet Loop — the bar, and the live log

Standalone rig at `character-shop/duncan/`. Run it with `npm run cast:duncan`.

## STATUS — session handoff

R1 (body and silhouette) FROZEN at pass 5 by lead decision 2026-08-05. Pass 5
was a measured tuning pass landed AFTER the last critic (4/10 on pass 4) and
is unscored — the lead verified its numbers and silhouette directly: the
"slender, sex-ambiguous" blind read is gone (A-pose 25°, breadth 1.155 m,
V-ratio 1.32, glute projection 59 mm, three direction changes on the back
edge). The user judges next.

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
