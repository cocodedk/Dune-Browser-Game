# Cliff Gauntlet Loop — the bar, and the live log

Standalone rig at `landscape-shop/cliff/`. Run it with `npm run land:cliff`.

## STATUS

R1 massing ACCEPTED by user verdict, 2026-08-10 (after five critic passes
plateaued at 4-5/10 while every named defect was verifiably fixed — the
same critic-variance plateau the sietch hit). Next: R2 — surface and
materials (Opus).

## The bar

Per `landscape-shop/docs/gauntlet-loop.md`: R1 massing/silhouette → R2
surface/materials → R3 dressing + final panel at ≥8/10 with zero
correctness findings; user's eye outranks any critic.

## Rounds

- **R0 (lead).** Spec authored: 600 × 220 × 190 m massif + 40 m seating
  skirt, 16 × 12 m entrance with 10 m recess, camera rigs measured from
  FlightMode. Lead delta after pass 1: the landing rig aimed at the back
  plane ([0,30,0]) — re-authored to the front face ([0,10,-220]).
- **R1 passes 1-2 (Sonnet, procedural).** 4/10 twice: "soft dune humps,"
  then "ruined architecture" — hand-authored profiles could not find rock
  shape language. Technique pivot ruled by the lead.
- **R1 pass 3 (Opus, feedstock reshape).** Rebuilt from licensed Desert
  Kingdom forms (mesa_outcrop + sandstone_boulder, Lifetime Commercial
  License): 24-28 instances taper-enveloped, sheared, mirrored, noise-
  displaced, scarp-clamped, welded — committed only as the derivative
  massifBake.json (raw GLBs gitignored; license forbids redistribution).
  Rock language ratified by critics from here on. Harness gained dune
  ground + grazing key matching FlightMode (lead-approved).
- **R1 pass 4 (Opus).** Hero mass 2.67× by signed-tetrahedron volume,
  per-mass band variation (capR/dip deform knobs), kit-seam blending,
  socketTone vertex-color mouth gradient. Critic confirmed band variation
  but split the silhouette at the west saddle.
- **R1 pass 5 (Sonnet).** West saddle bridged (crest ratio 21% → 64%,
  guard-locked ≥35%), floating shard removed via connected-components
  mask, shadow acne root-caused (DoubleSide needs shadowSide=BackSide),
  mouth gradient retuned to measured 10→32/255. Fifth critic split a
  different gap; scores flat 4·4·5·4·4 → user settled per contract.
  Final: 15,702 triangles of 25k, 21 guards green, bake byte-deterministic
  (288 KB — needs quantized encoding before the release round's 150 KB
  chunk budget).

Known open items for R2/R3: detached eastTail mound reads separate at the
approach rig; mouth gradient still reads dark-on-dark to critics; crest
reads "stacked boulders" rather than sheer wall to some eyes — surface
strata color and weathering are expected to carry most of this distance.
