# Stage 03 — Strategic mode and the sand look

**Phase:** 0 · **Depends on:** 02 · **Est. tasks:** 4 · **Builder:** Sonnet
**Status:** SPECCED

## Goal

The 3D map: procedural dune terrain, the sand material, sky and atmosphere, location
markers, territory overlay, camera, and raycast picking — at full feature parity with
today's Phaser map, and looking markedly better.

**This is the stage that decides whether the project looks good.** The sand material is
the highest-leverage asset in the whole build and it is code, not art. Budget real
iteration here; expect to go round more than once.

## Deliverables

| File | Lines | Responsibility |
|---|---|---|
| `src/game-render/terrain/noise.ts` | ~100 | **PURE** seeded simplex + fBm |
| `src/game-render/terrain/noise.test.ts` | ~90 | Determinism per seed, range bounds, no NaN |
| `src/game-render/terrain/heightfield.ts` | ~130 | **PURE** `Float32Array` generator with domain warp |
| `src/game-render/terrain/heightfield.test.ts` | ~90 | Dimensions, bounds, determinism |
| `src/game-render/materials/SandMaterial.ts` | ~150 | `MeshStandardMaterial` + `onBeforeCompile` patch |
| `src/game-render/materials/sandShader.glsl.ts` | ~150 | GLSL chunks as strings |
| `src/game-render/materials/SkyDome.ts` | ~120 | Gradient dome, sun disk, horizon dust band |
| `src/game-render/materials/skyShader.glsl.ts` | ~100 | Sky GLSL |
| `src/game-render/materials/Atmosphere.ts` | ~90 | **PURE** day–night palette and fog lerp |
| `src/game-render/materials/Atmosphere.test.ts` | ~80 | Palette continuity across the full day |
| `src/game-render/env/Lighting.ts` | ~90 | Directional sun + hemisphere |
| `src/game-render/core/CameraRig.ts` | ~140 | Clamped orbit, `flyTo` tween, idle drift |
| `src/game-render/core/Picking.ts` | ~100 | Pointer → raycast → id → bus |
| `src/game-render/core/Picking.test.ts` | ~70 | Hit-to-payload mapping |
| `src/game-render/core/PostFX.ts` | ~130 | Grade LUT, grain, vignette, half-res bloom |
| `src/game-render/modes/strategic/StrategicMode.ts` | ~150 | Assembly and refresh |
| `src/game-render/modes/strategic/TerrainMesh.ts` | ~120 | Heightfield → geometry |
| `src/game-render/modes/strategic/TerritoryOverlay.ts` | ~140 | Region fills and borders, owner colour, unrest tint |
| `src/game-render/modes/strategic/SietchMarkers.ts` | ~150 | `InstancedMesh` markers, hover, labels |
| `src/game-render/modes/strategic/PlayerToken.ts` | ~80 | Travel lerp via `currentTravelProgress` |

## Art direction

Non-negotiable palette: apricot and amber sky, deep blue-violet shadow, spice-blue as
the single accent. Consistency is what makes procedural geometry read as art direction
rather than as a placeholder.

**Sand material,** in priority order:

1. Two-tone windward/slip-face colouring keyed on slope against a wind direction
   uniform — this is what produces the sharp crest lines that make dunes legible.
2. Slope-based albedo ramp, burnt orange in shadow to pale gold at the crest.
3. View-dependent procedural glint: thresholded high-frequency noise into the specular
   term. Subtle. It should read as mica in sunlight, not as glitter.
4. One tiling ripple normal map at 512², the only texture this stage needs.

**Atmosphere:** height-based exponential fog tinted toward the sun; the sky dome carries
a sun disk and a hazy horizon dust band. Drive a **day–night palette lerp from
`world.time`** — nearly free, and it makes the simulation visible on screen.

**Lighting:** one directional sun plus one hemisphere light. No shadow maps on terrain;
slope shading does that work.

**Post:** grade LUT, film grain, vignette, gentle posterise/dither for the VGA-era feel,
half-res selective bloom on the sun and spice glow.

## Camera

High orbital, fixed pitch ~55°, pan and zoom clamped to map bounds. It is a map you
read, not a scene you fly — resist the urge to make it free-look.

## Picking

Raycast against marker instances and the terrain, resolve to a logical id, then emit
**exactly the events the Phaser build emits today**: `village:selected` always, plus
whatever `runtime/VisitPolicy.decideVisit()` returns. Territory clicks reuse the
existing pure `pointInPolygon` from `TerritoryZones.ts` against terrain UV space.

`__DUNE__.pick(id)` must route through the identical code path as a real raycast, minus
the ray.

## Performance

≤100 draw calls, ≤300k triangles, 60 fps at DPR 2 on integrated graphics. One terrain
draw call; markers via `InstancedMesh`. Zero per-frame allocation — preallocate every
vector and matrix. On the low quality tier, PostFX collapses to grade plus vignette and
the terrain grid drops to 128².

## Acceptance criteria

1. Every Phaser map affordance works: click to travel, click at your location to talk,
   territory click selects a region, ownership colours refresh live, unrest tints, the
   player token moves smoothly along a trip (correct for both a 4s and a 16s trip).
2. `renderer.info.calls` ≤ 100 on the strategic map — assert it in E2E.
3. All pure modules (`noise`, `heightfield`, `Atmosphere`, `Picking` mapping) are unit
   tested without a GL context.
4. Claude reviews a screenshot and signs off on the look before this stage is VERIFIED.
   If the sand does not read as dunes, iterate — do not proceed on a "good enough" map.
5. Existing tests unchanged and passing.

## Out of scope

Flight, locations, conversations. Deleting Phaser — that is Stage 04.

## Gate

Standard. Claude additionally drives the browser and inspects the result visually.
