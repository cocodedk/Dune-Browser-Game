# Sietch Gauntlet Loop — the bar, and the live log

Standalone rig at `landscape-shop/sietch/`. Run it with `npm run land:sietch`.

## STATUS

R1 massing ACCEPTED by user verdict, 2026-08-09 ("I like what I see. It has
very alien vibe to it"). Next: R2 — surface and materials (Opus).

## The bar

Per `landscape-shop/docs/gauntlet-loop.md`: R1 massing/silhouette → R2
surface/materials → R3 dressing + final panel at ≥8/10 with zero correctness
findings; user's eye outranks any critic.

## Rounds

- **R0 (lead).** Spec authored: 36 × 52 m hall, camera rig standing just
  inside the mouth (the LocationMode framing), hearth color continuous with
  the painted diorama. Two later lead deltas from gauntlet evidence:
  depthM 48 → 52 + a GALLERIES contract (2.5 m sockets — 0.3 m reveals were
  invisible at the 35 m rig distance), then heightM 16 → 22 (a 3.6× door-to-
  vault ratio reads as a chamber; ~5× reads as a hall).
- **R1 (Sonnet, 5 passes, 4 fresh critics + user).** Scores 6 · 5 · 6 · 6 · 5.
  Pass 1–2 failed on flat "decal" doorways; root cause was the R0 spec (see
  deltas above). Pass 3 cut real sockets through the back-wall cap (Earcut
  silently discards holes touching the outer boundary — floor-level holes are
  clamped to y = 0.05 for this reason) and critics confirmed "real jambs +
  dark interior — not flat-painted". Pass 4 deleted the corner ledges, fixed
  a skirt-taper hairline, smoothed the floor junction, added the walkable
  right-wall tier + stair. Pass 5 rebuilt at heightM 22 and rooted the tier's
  far end in a floor pier. Final state: 4,173 / 40,000 triangles, 34 meshes,
  bbox 36 × 23 × 52 (spec-exact), 10/10 seam guards including enclosure
  raycasts at both drift extremes and a name-pinned tier-rooted guard.
  Critic scores plateaued (their remaining asks — striation, organic surface,
  habitation — are R2/R3 scope); the user looked and accepted. Known cosmetic
  note, deferred to R2: hearth PointLight.castShadow stays OFF (cube-shadow
  artifact blacks out the render — documented in main.ts).
