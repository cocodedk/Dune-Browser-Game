# Gauntlet Loop — landscape-shop: the terrain sets

Every hero landscape asset gets a full 3D set, built in a standalone workshop and
released into the game through the asset-pipeline seam — the same path the vehicles and
the cast took (`docs/PRD/dune92/04-asset-pipeline.md`). This document is the loop
contract. Per-asset round logs live in each sub-project's `progress.md`.

## Roles (user directives, 2026-08-05 and 2026-08-09)

- **Lead / art director / planner — Fable 5.** Decomposes, authors every `spec.ts`
  (nobody else edits it), writes builder and critic prompts, re-runs every gate and
  reproduces every reported number itself, commits, keeps the logs. Never writes model
  code.
- **Builders — Sonnet and Opus subagents.** Sonnet takes massing, infrastructure and
  mechanical rounds; Opus takes surface, material and dressing rounds (the
  judgement-heavy ones). One builder per sub-project at a time; rounds within a
  sub-project are sequential. Sub-projects are disjoint by design, so the two landscape
  loops may run in parallel — release rounds touch game `src/` and are serialized.
- **Critics — fresh-context subagents.** Goal, bar, PNGs shot through the spec'd camera
  rig. Never the builder's report or reasoning.
- **Final judge — the user**, in the game's own lighting. But this loop does **not**
  stop and wait for him: per his 2026-08-09 directive, an asset is integrated into the
  game right after its final panel passes, and the pending look-gate is recorded as an
  open item in the stage index — the same standing the two vehicles have.

## The bar (user directive, 2026-08-09 — differs from the cast loop)

**"I want AAA results. Perfection is not the goal. Good is enough."**

- Final-panel bar: **≥8/10 with zero correctness findings.** 8 passes. 7 names its gap
  and loops.
- Three builder passes on the same gap without movement → the lead settles at the best
  verified state if it is ≥7 and correctness-clean, records the shortfall honestly in
  `progress.md` and the stage index, and moves on. (Under the cast loop only the user
  could settle; here he has pre-authorized it.)
- Correctness findings are never settled — they loop until zero, at any score.

## Shape

- `landscape-shop/<name>/` — one sub-project per asset, scaffolded by
  `npm run land:new -- <name>` (lands in round L0). Alias `@land`, chunks
  `landscape-<name>` at the 150,000-byte budget, fence semantics identical to the other
  two roots: game imports only `src/model/**`, `contracts.ts`, `spec.ts`; shops import
  neither the game, nor each other, nor the other roots.
- **Landscape assets are STATIC scenery.** No animation contract. Public model contract
  (per-shop `contracts.ts`): `LandscapeModel { root: Object3DLike, dispose(): void }`.
  The model never writes its own root transform; placement is the adapter's job.
- Authored in **true meters, Y-up, the front (entrance, open face) toward −Z** — the
  repo-wide facing convention. Ground plane: the asset's walkable/base surface sits at
  **y = 0**; anything below y = 0 is deliberate skirt, sized by `spec.ts`, for seating
  into procedural terrain.
- `seam.test.ts` guards from day one: footprint within 1% of `spec.ts`, front-toward-−Z,
  base-at-zero (min-y within the spec'd skirt band, never floating above 0), and
  `dispose()` completeness.
- **The camera rig is part of the spec.** A landscape set is only ever seen through the
  framing its consumer gives it, so `spec.ts` names that rig (position, target, FOV or
  ortho box), the shop harness replicates it exactly, and critics judge only through it.
  Geometry the rig cannot see is waste; geometry it sees badly is a finding.

## Sourced assets (user directive, 2026-08-09)

Free GLB models from **https://threejsassets.com/assets/free** (that site only) may be
used and **reshaped** instead of building every form procedurally. Rules:

- License check first: the free tier ships inside commercial projects; the raw files may
  not be redistributed as assets. Record the source URL and license line in the shop's
  `provenance.ts`.
- The GLB lives inside the shop; the game still imports only the public surface. Primary
  structure (the massif shell, the cave hall) stays procedural — it is what the seam
  test measures and what the 150 KB chunk budget protects. Sourced GLBs are for
  **dressing and reshaping feedstock**: boulders, debris, palms, a carved doorway to
  retopo against.
- These are tiny low-poly kit pieces (reference point: Mossy Boulder, 5 KB GLB, 432
  triangles — user-nominated example). The preferred route is therefore **offline
  conversion, not runtime loading**: the GLB is committed in the shop as feedstock, a
  `tools/` script converts it once into baked geometry data (`.json` — exempt from the
  200-line hook; model code imports it), and reshaping happens in code: strip off-theme
  parts, re-tint to the Villeneuve palette, scale to true meters. No GLTFLoader, no
  WASM, seam tests stay node-only and can measure everything.
- Unit tests stay node-only. A builder who wants runtime GLB loading instead proposes
  it in the round report and the lead rules.
- Candidates already scouted (free tier): Sandstone Boulder, Cutting Rock Face, Cutting
  Wall Corner, Rockfall Debris, Rubble Scatter, Tomb Entrance, Dune/Sand tiles, Date
  Palm, Desert Scrub, Mossy Boulder (needs de-mossing — swamp piece, good rock form),
  Royal Palm (6 KB / 810 tris — tint fronds dustier for a sietch palmary).

## Authority

**The 2021/2024 Villeneuve films are the shape, palette and light authority** for
Arrakis rock and sand: vast smooth wind-carved massifs, warm neutral sand, hard sun.
The Cryo 1992 game is composition-mood reference only. Where they conflict, Villeneuve
wins without discussion — the cast ruling, applied to terrain.

## Roster

| shop | asset | consumer / release point | notes |
|---|---|---|---|
| `sietch` | Sietch interior set — carved cave hall, hearth, water discipline | `src/game-render/modes/location/LocationMode.ts`, `kind === 'sietch'` | replaces the painted canvas for sietches only; the painting stays as every other kind's backdrop |
| `cliff` | Sietch-entrance massif — exterior cliff wall with carved entrance | `src/game-render/modes/flight/FlightMode.ts`, mounted at the flight destination | the thing the player flies toward; the noise escarpment stays as distant skyline |

Scope is exactly these two (user named them by creating the directories). More
landscape assets get a roster row and their own R0 — never scope creep inside a round.

### Asset-specific correctness (in every relevant critic prompt)

- **sietch:** enclosure reads as carved rock, not built walls; hearth glow is authored
  light with a source, not ambient wash; hotspot positions in the released scene keep
  agreeing with their hit targets; the location name label survives the release (new
  home if the canvas that carried it goes).
- **cliff:** entrance scaled to the ornithopter that lands there (true meters); skirt
  extends the spec'd depth below y = 0 so the adapter can seat the root at
  `heightfield.heightAt(destination)` with no floating base and no buried entrance at
  any seed; silhouette reads at flight distance, not just up close.

## Standing boundaries (in every builder prompt)

- **Verification is these four, and the four are not enough:** `npm run lint` ·
  `npm run shop:check` · `npx vitest run landscape-shop/<name>` ·
  `bash scripts/check-file-length.sh`. Named traps: plain `npx tsc --noEmit` does NOT
  cover shop directories — only `shop:check` does; the pre-commit hook runs the
  200-line check BEFORE the npm gates; the hook also runs the full build and Playwright.
- **200 lines per source file.** Split via helpers before, not after.
- Explicit `import { describe, it, expect } from 'vitest'`; tests run in node with no
  DOM, no canvas, no WebGL — all texture work is `DataTexture` (the house pattern).
- **Builders never commit and never touch `spec.ts`.** The lead commits with the real
  hook. Never `--no-verify`.
- **No imports across shops, no imports from game `src/`** — a fence error is a design
  error, not an obstacle.

## Rounds

- **L0 — infrastructure (Sonnet, once).** Generalize the pipeline gates from two roots
  to three: `ROOTS` entry in `scripts/new-shop.mjs` + LANDSCAPE seed templates,
  `land:new` script, `@land` in `tsconfig.json` and `vite.config.ts` (alias, vitest
  include, `landscape-<name>` manualChunks), `check-bundle-size.mjs` budget,
  `check-shops.mjs` glob, both ESLint fence blocks mirrored. CODEX.md and
  `04-asset-pipeline.md` updated in the same change ("When Changing Core Tooling").
  Bar: mechanical — all gates green with a throwaway shop present and after its
  removal; fence red-tested from `src/` against a harness path.
- **R0 — spec (lead).** `land:new`, then the lead authors `spec.ts`: footprint and
  skirt in true meters, palette, the camera rig, material families, the asset-specific
  correctness lines. Gates only, no critic.
- **R1 — massing and silhouette (Sonnet).** Primary forms at true scale, composition
  through the spec rig. Bar: a blind critic on a black-fill or clay render names what
  it is and where you are ("carved cave hall", "a cliff wall you approach from the
  air") plus measured footprint.
- **R2 — surface and materials (Opus).** Rock strata, wind-carving, `DataTexture`
  weathering, authored lighting per the rig. Bar: reads as Arrakis rock in the spec
  framing; named forms, not noise.
- **R3 — dressing + FINAL panel (Opus).** Inhabitation cues (sietch: hearth, water
  basin, worn paths; cliff: entrance detail, sand aprons, scale cues). 3-critic fresh
  panel through the spec rig. Bar: **≥8/10, zero correctness findings** — then straight
  to the release round, no user stop.
- **Release round (per asset, serialized against the other's).** Adapter in the game
  per the roster table; painted diorama and noise escarpment stay as fallbacks.
  Measure, don't assume: `window.__DUNE__.inspect()` draw calls before/after, fps,
  chunk bytes against budget. Playwright green. Stage index records the release and
  the open user look-gate.

## Lead round protocol (every round, in order)

1. Author the round's spec delta, if any. Commit separately.
2. Spawn the builder: destination, standing boundaries, files owned, tests-first.
   Nothing about the route.
3. On "done": check mtimes are quiet — never judge a tree mid-write.
4. Re-run all four gates MYSELF. Builder reports are evidence, not findings.
5. Re-shoot MYSELF through the spec rig; reproduce any builder-reported number.
6. Spawn the critic (fresh context, PNGs + bar only). Builds landed after capture →
   re-capture; never fix from a stale critique.
7. Bar met → log in `progress.md`, commit with the real hook. Bar missed → feed the
   single biggest gap to the SAME builder. Three passes without movement → settle-or-
   escalate per "The bar" above.
8. Stop conditions, named honestly: bar met · correctness clean and ≥7 after three
   stalled passes (settle, record) · the gap needs a decision only the user can make.
