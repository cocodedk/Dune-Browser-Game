# Cliff Gauntlet Loop — the bar, and the live log

Standalone rig at `landscape-shop/cliff/`. Run it with `npm run land:cliff`.

## STATUS

R3 COMPLETE, build closing 2026-08-10. R3 dressing (16 licensed pieces:
sand banks framing a swept 70 m approach notch, waymark stones, scar
debris reinforcement, sill cargo — the worn-path strip was attempted
four measured ways and correctly abandoned for the notch design; lead
ratified). Final panel 6/4/5 → R3.1 falsified the briefed root cause
with a clay-control render (the "checkerboard" was facet tilt on ruled
grid lines, not paint) and fixed it with pinned node jitter; R3.2
closed the measured saddle sky-gap (2,317 open px → 0, guard locked
0.35 → 0.70 discriminating), subdivided oversize facets, collapsed the
westBastion needles (aspect 284 → 8.4). 42 guards green, 23,652/25,000
triangles, bakes byte-deterministic. Next: RELEASE into FlightMode
(with quantized bake encoding for the 150 KB chunk budget); the user's
in-game look-gate is the final judge. Lead rulings on R2.1: both metric
replacements ratified (a guard that can no longer discriminate is dead
weight).

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

- **R2 (Opus).** One geology (`model/strata.ts`) read at each mass's own
  bedding plane, five named weathering agents, three rockfall scars pinned
  to real debris, a bedded prow, a toned mouth. 35 guards green. The fresh
  critic failed it anyway, and was right: every form was authored and
  measurable in the vertex colours and SUB-THRESHOLD on screen. "One
  near-uniform warm-brown value, no distinct colour bands"; the prow "a
  soft, indistinct blur-blob"; the mouth "flat, gradientless black".
- **R2.1 (Opus).** Amplification measured at the PIXEL, not the data —
  `tools/probe.mjs` reads the shot PNG (own decoder, own rasterizer, own
  depth buffer) and reports what a critic sees. It found the transfer that
  had been eating the round's work: `rendered_linear ≈ 0.10 · albedo_linear
  + 0.071` at the approach rig. A whole albedo doubling is a handful of
  levels. Three fixes:
  1. Members ALTERNATE pale and iron (`model/rockRamp.ts`, split out of
     strata.ts) across a chalk-to-rust ramp. Adjacent-member deltas on the
     rendered frame: mean 5.6 → 19.1 of 255, 16 of 20 over the 12-level
     threshold. Three of the four that are not are the basal member pair
     (-1 to 0), buried in drift at the sand line; the fourth is the hero's
     0-to-1 contact at 11.6, a near miss on a half-sanded pale member.
     Lowering the drift to force them was shot, measured and reverted — it
     bought one delta and cost the warmth ladder, so the sand stays.
  2. The prow is FLAT-SHADED and painted per face, like the baked rock it
     grows out of, and the mouth's lit rim is built from five rings instead
     of two. Adjacent-pixel steps over 6 levels: 0.5% → 4.0% of the left
     half; p99 3.4 → 15.3. Two artifacts of the first attempt were shot,
     measured and reverted: an alternating split diagonal (a hard
     checkerboard) and a half-course sand quantum beating against the row
     pitch (a plaid).
  3. The mouth's warm zone was authored where nothing can see it. The world
     -height sweep says the visible interior is y = 1 to 25; the bounce
     peaked at y = 0-6 and faded by 16. Moved to full strength through
     y ≈ 7 with a hard broken break at 12.6, depth share 0.42 → 0.70. The
     floor strip renders 43-50 of 255 over 80 rows against 9-15 above it
     and 69-81 on the rock outside.

Known open items for R3: detached eastTail mound reads separate at the
approach rig; the massif's crest reads "stacked boulders" rather than sheer
wall to some eyes; the bake still needs quantized encoding before the
release round's 150 KB chunk budget.
