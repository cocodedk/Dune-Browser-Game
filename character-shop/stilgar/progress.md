# Stilgar Gauntlet Loop — the bar, and the live log

Standalone rig at `character-shop/stilgar/`. Run it with `npm run cast:stilgar`.

## STATUS — SETTLED

Settled 2026-08-08 by user verdict: "no more work is needed on these figures."
Final state: R2 pass 4, interrupted mid-rebuild by the 2026-08-07 weekly-limit
cut — eyes seated in lidded sockets (the panel's top defect, fixed), mouth
region half-rebuilt, tests green (25), evidence deterministic. The 3×Opus
panel had passed identification 3/3 ("Stilgar") and failed correctness 0/3;
the fix list stops here. The user generates future cast figures as 2D
photo-style images (ChatGPT); the 3D loops end here.

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

### R2 — head and likeness (4 passes; milestone = 3×Opus blind bust panel)

Spec delta committed first (137fb0a): `PALETTE.eyes 0x33689e`, full-ibad flat blue.
R2 adds the prescribed portrait rig (3-point, mid-grey backdrop, recorded in the
manifest) and two head framings, `headfront`/`headthreequarter`.

| pass | builder | verdict | headline |
|---|---|---|---|
| 1 | Opus | Sonnet 4/10 · blind names STILGAR high | face carved (20mm brow, ibad eye masses, philtrum, squared beard, hood-cord artifact solved) but structure did not read from DEAD FRONT — "brow is a decal" |
| 2 | Opus | Sonnet 4/10 · blind names Stilgar moderate | root cause: forms finer than mesh sampling get normal-averaged away (1.9mm lid vs 4.1mm rings) — sample-density warp landed; sub-brow now renders 10/255; both mesh defects closed; NEW defect: lead's "dorsum ridge" direction produced a hawk nose |
| 3 | Opus | Sonnet 4/10 (biggest-gap ruled NOT reproduced) · blind names Stilgar high | nose rebuilt broad (dorsum plane 0→15mm; socket field was carving the midline — medial gate fix); brow BAR built above the shadow (N·L derivation); hood aperture 124→154mm; wedge proved watertight, was beard hair on the nose wing |
| — | 3×Opus PANEL | **ID PASS 3/3 — "Stilgar" 65–70%. CORRECTNESS FAIL 0/3** | measured consensus: eyes 1.69–1.7 aperture-widths apart (canon ~1.0), unsocketed proud lenses, far brow through the 3/4 silhouette, mouth/moustache boolean chaos, hood shard+rim gap+pinhole+seam, barbed brow tips, black under-nose, no neck, ripple bands = artifact. Asymmetry claims DISPROVED (mirror IoU 0.9969). No actor likeness discernible in flat-shaded geometry — 3/3 said so |
| 4 | Opus | running | the panel's consensus list, verbatim |

**What did not reproduce:** the p3 Sonnet scorer's "nose still thin and hooked"
(contradicted by 15mm measured dorsum plane, the lead's read, and the panel);
p1 panel judge's brow/eye asymmetry (yawed-bust perspective — two judges measured
mirror-clean). **Method lessons:** Sonnet critics score direction, Opus panels
find truth — R2 exits are panel-only; panel paths must be NEUTRAL (the shop name
in the path leaked the blind, disclosed by judge 3); relief must survive the
worst-lit framing; cross-field interference (socket bell carving the nose) is
real — gate displacement fields medially. Debt: 97 non-manifold hood-weld edges
(p4 clears), +73% triangles from the sampling fix (50.7k→87.9k, lead-accepted).
