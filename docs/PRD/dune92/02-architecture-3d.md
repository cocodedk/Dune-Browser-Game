# 02 — three.js Architecture

## Decision: vanilla three.js, not React Three Fiber

Imperative scene managers subscribing to `EventBus`.

**Why:**

- *"React is a shell, out of the frame loop"* is constitutional here. R3F makes React
  the owner of the scene graph — structure in JSX, per-frame logic in `useFrame` inside
  the React tree. Fast in practice, but it contradicts the stated architecture, and the
  `EventBus` boundary becomes ornamental because R3F's idiom is props and context.
- The existing pattern ports one-to-one. `GameScene` subscribes to the bus and pokes
  objects; `StrategicMode.ts` does exactly that with three objects. No second
  reconciler to debug.
- Testability. Plain modes are functions over injectable three objects, and three's math
  and geometry classes run in Node without a GL context. R3F needs
  `@react-three/test-renderer` and hook harnesses — more machinery, less isolation.
- Bundle. R3F plus drei (and you will want drei) adds ~120–180 KB min over three,
  against a hard budget file.

**The honest losing case:** R3F gives declarative composition, automatic disposal
(a real leak source in vanilla three), and drei's battle-tested helpers. If the scene
were driven by React state, R3F would win. It isn't — it is driven by a deterministic
engine over a bus. We accept writing our own disposal discipline: `ModeManager` owns
lifecycle and every mode implements `dispose()`.

## Bundle budget

`scripts/check-bundle-size.mjs` today (first matching pattern wins):

| Pattern | Budget | Actual |
|---|---|---|
| `^phaser-.*\.js$` | 550,000 B/chunk | 8 chunks, ~1,545 KB total |
| `^react-vendor-.*\.js$` | 250,000 B | 138 KB |
| `^game-.*\.js$` | 200,000 B | n/a |
| `\.js$` catch-all | 500,000 B | index 55 KB, GameContainer 24 KB |

A single three vendor chunk (~450–650 KB min tree-shaken; addons add ~80–130 KB) falls
through to the 500 KB catch-all and fails. The fix is sanctioned — the budget script is
on the keep-in-sync list. Replace the phaser entry with:

```js
{ pattern: /^three-core-.*\.js$/,   maxBytes: 700_000 },
{ pattern: /^three-addons-.*\.js$/, maxBytes: 200_000 },
```

and split in `manualChunks` (`three/examples/jsm/` → `three-addons`, `three/` →
`three-core`), mirroring today's phaser treatment.

**Net effect: shipped runtime JS drops from ~1.55 MB to ~0.7–0.9 MB — the migration is
a bundle win of roughly 700 KB.** Also delete the `phaser` alias, the spectorjs shim,
and the `define: { global: 'globalThis' }` workaround; three ships clean ESM.

## Migration order

The app stays runnable and E2E stays green at every step.

**Phase 0 — extract the driver, Phaser still renders.** `GameScene.ts` is not a
renderer today; it is the game driver — it runs the engine tick, hosts all `EventBus`
command wiring, and mutates `world.speed`/`world.difficulty` directly.
`VillageMarkers.ts` likewise embeds game logic (deciding dialogue vs travel on click,
calling `startDialogue`/`pushEvent`). New `src/runtime/` takes all of it. No visual
change; this also fixes the render-writes-engine violation permanently.

**Phase 1 — three side by side.** Add three plus `core/` infrastructure and
`StrategicMode`, mounted by a lazy `ThreeContainer.tsx`, selected via `?renderer=three`.
Default stays Phaser. Both renderers are lazy chunks, so the default path's bundle is
unchanged. Update the budget script and `vite.config.ts` in the same change.

**Phase 2 — parity and flip.** Raycast picking emits identical bus events; travel
interpolation, ownership colours, unrest tints and labels reach parity. Flip the
default. Rename `#phaser-container` → `#scene-container` and update the one E2E locator.

**Phase 3 — delete Phaser.** Dependency, alias, shim, chunks, budget entries, dead
files. Port `AudioManager` to raw WebAudio behind the same bus contract.

**Phase 4 — the Cryo experience.** FlightMode → LocationMode → ConversationMode, each
independently shippable, because the mode manager falls back to StrategicMode.

## Module tree

The load-bearing seam is a **pure mode reducer**:

```ts
type SceneModeId = 'strategic' | 'flight' | 'location' | 'conversation'
function nextMode(current: SceneModeId, ev: EngineSignal): SceneModeId
// travel_start → flight; travel_complete → location|strategic
// dialogue_start → conversation; dialogue_end → previous
```

Deterministic and Vitest-covered; the renderer just obeys it.

```
src/
├── runtime/                       renderer-agnostic — no three, no React
│   ├── GameDriver.ts       ~120   rAF loop, engine tick, 100ms-throttled world:updated
│   ├── CommandWiring.ts     ~90   bus handlers → engine calls (from GameScene.create)
│   └── VisitPolicy.ts       ~60   click-on-location decision: travel vs dialogue
├── game-render/
│   ├── core/
│   │   ├── Renderer.ts     ~110   WebGLRenderer, colour mgmt, tone mapping, DPR, resize
│   │   ├── SceneModes.ts    ~80   PURE reducer — unit tested
│   │   ├── ModeManager.ts  ~130   instantiate/dispose active mode, drive transitions
│   │   ├── Transitions.ts   ~90   fullscreen fade/iris shader quad
│   │   ├── Picking.ts      ~100   pointer → raycast → logical id → bus emit
│   │   ├── CameraRig.ts    ~140   clamped orbit, flyTo tweens, idle drift
│   │   ├── PostFX.ts       ~130   grade LUT, grain, vignette, half-res bloom
│   │   ├── Quality.ts       ~70   device tiering: DPR, grid res, postFX toggles
│   │   └── DebugHandle.ts   ~60   window.__DUNE__ for E2E
│   ├── assets/
│   │   ├── AssetRegistry.ts ~140  GLTF/KTX2/meshopt loading, cache, dispose, progress
│   │   └── manifests.ts     ~80   per-mode asset path lists
│   ├── modes/strategic/
│   │   ├── StrategicMode.ts ~150  assembles terrain + overlay + markers
│   │   ├── TerrainMesh.ts   ~120  heightfield mesh, sand material hookup
│   │   ├── TerritoryOverlay.ts ~140 region fills/borders, owner colour, unrest tint
│   │   ├── SietchMarkers.ts ~150  instanced markers, hover, labels
│   │   └── PlayerToken.ts    ~80  travel lerp from engine time
│   ├── modes/flight/
│   │   ├── FlightMode.ts    ~150  treadmill dune field, thopter, chase cam, skippable
│   │   ├── DuneField.ts     ~130  scrolling displaced grid
│   │   ├── Ornithopter.ts   ~110  GLB, wing-flap anim, banking, dust
│   │   ├── FlightPath.ts     ~90  PURE spline + progress math — unit tested
│   │   └── SandFx.ts        ~120  wind-streak particles
│   ├── modes/location/
│   │   ├── LocationMode.ts  ~140  diorama: backdrop + props + hotspots + drift cam
│   │   ├── Backdrop.ts       ~90  curved plane, 2–3 parallax layers
│   │   ├── Hotspots.ts      ~100  clickable zones → bus
│   │   └── locationDefs.ts  ~120  per-location backdrop/prop/hotspot data
│   ├── modes/conversation/
│   │   ├── ConversationMode.ts ~120 character card over dimmed location
│   │   └── CharacterCard.ts ~110  portrait plane, rim light, breathing drift
│   ├── materials/
│   │   ├── SandMaterial.ts  ~150  MeshStandardMaterial onBeforeCompile patch
│   │   ├── sandShader.glsl.ts ~150 displacement/crest/glint GLSL chunks
│   │   ├── SkyDome.ts       ~120  gradient dome, sun disk, horizon dust band
│   │   ├── skyShader.glsl.ts ~100
│   │   └── Atmosphere.ts     ~90  PURE day-night palette + fog lerp — unit tested
│   ├── terrain/
│   │   ├── noise.ts         ~100  PURE seeded simplex/fBm — unit tested
│   │   └── heightfield.ts   ~130  PURE Float32Array generator — unit tested
│   ├── env/Lighting.ts       ~90  sun directional + hemisphere
│   ├── audio/AudioManager.ts ~120 WebAudio port, same audio:changed contract
│   └── factionColors.ts            KEEP
└── ui/
    ├── ThreeContainer.tsx    ~70  mounts Renderer + GameDriver + ModeManager
    └── LoadingScreen.tsx     ~60  asset progress from bus
```

~35 render modules averaging ~110 lines. The 200-line cap is respected with headroom,
and the decomposition it forces — pure math separated from three glue — is exactly what
testability wants anyway.

UI compositing is unchanged: React panels absolutely positioned over the canvas, fed by
the store. `DialoguePanel` becomes the text layer over ConversationMode.

## Look and feel

Commit to a **stylised painterly look** — apricot and amber skies, deep blue-violet
shadows, spice-blue as the single accent. Stylisation is the budget-hider: a consistent
grade makes procedural terrain and generated backdrops read as art direction rather
than as cheapness.

- **Terrain** — seeded fBm with domain warp, pure TS and deterministic (so also unit
  testable). Strategic map: one static ~256×256 grid, ~130k tris.
- **Flight** — a **treadmill dune field**: fixed grid around the origin, vertex-shader
  displacement sampling tiling noise, world scrolled by UV offset. No streaming, no
  float drift, no clipmap complexity; the camera never really moves.
- **Sand material** is the single highest-leverage visual asset, and it is code, not
  art: two-tone windward/slip-face colouring keyed on slope versus wind direction for
  sharp crest lines; view-dependent procedural glint (thresholded high-frequency noise
  specular); one tiling ripple normal map; slope-based albedo ramp from burnt orange in
  shadow to pale gold at the crest.
- **Atmosphere** — height-based exponential fog tinted toward the sun; shader sky dome
  with sun disk and a hazy horizon dust band; **day–night palette lerp driven by
  `world.time`**, which is nearly free and makes the simulation visible.
- **Lighting** — one directional sun plus hemisphere. No shadow maps on terrain (slope
  shading fakes it); real shadows only in small location scenes, 1024 map, tight frustum.
- **Post stack** — grade LUT, film grain, vignette, slight posterise/dither to evoke the
  VGA-era look and mask low-poly assets; half-res selective bloom for sun and spice glow.
- **Locations are 2.5D dioramas** — one painted backdrop on a curved plane, 2–3 real 3D
  foreground props, slow camera drift for parallax. Cheapest *and* most faithful: the
  original was static painted scenes.
- **Characters are portrait cards, never 3D humans.** Rigged 3D characters are where
  small projects die.

## Assets

**Formats:** `.glb` with meshopt; textures KTX2/BasisU via `KTX2Loader` (UASTC for
normals, ETC1S for albedo); backdrops KTX2 or high-quality JPEG; audio Opus/OGG.

**Location:** `public/assets/{models,textures,backdrops,portraits,audio}`. Vite copies
`public/` verbatim, so assets never enter the JS bundle or the budget script's scope —
it only scans `dist/assets/*.js`.

**Loading:** `AssetRegistry` plus per-mode manifests. Boot loads only StrategicMode
assets; flight and location assets load on first entry, hidden behind the transition
fade. Progress events feed `LoadingScreen.tsx`.

**Minimum viable list** (everything else is procedural):

1. Sand ripple normal map, 512² tiling
2. Sand albedo detail, 512² tiling
3. Ornithopter `.glb`, ≤10k tris, one 1024 texture, flap animation
4. Four backdrops at ~2048×1024: sietch interior, palace hall, spice field, desert camp
5. ~8 character portraits at 1024²
6. One ambient desert loop plus 2–3 stingers
7. One 32³ colour-grade LUT (generated)

Target ≤10 MB on disk. All original — generated or authored, none copied.

## Performance budget

**Targets:** 60 fps on desktop integrated graphics (Iris Xe / M1) at DPR ≤2; 30 fps on
a mid-2021 Android at DPR 1 on the low tier. Frame budget 16.6 ms with ≤10 ms render;
the engine tick is already sub-millisecond and React stays on the 100 ms throttle.

**Draw calls:** strategic ≤100, flight ≤150, location ≤80 — via one terrain draw,
`InstancedMesh` for markers and props, merged static geometry per diorama, one material
per system. **Triangles** ≤300k/frame. **Texture memory** ≤128 MB (KTX2 stays
GPU-compressed).

**Discipline:** zero per-frame allocations, `Quality.ts` tiers on
`hardwareConcurrency`/DPR/first-frame timing, pixel ratio capped at 1.5–2, postFX
collapsing to grade + vignette on low tier. `renderer.info` is exposed through the debug
handle so the draw-call budget becomes an **E2E regression assertion**, not a hope.

## Camera and input

- **Strategic** — high orbital camera, fixed ~55° pitch, clamped pan and zoom. Click a
  marker → raycast → the same events as today: current location goes through
  `VisitPolicy`, elsewhere emits `player:travel`. Territory clicks reuse the existing
  pure `pointInPolygon` in the terrain's UV space.
- **Travel** — the engine remains the clock:
  `progress = (world.time − (arrivalTime − duration)) / duration`, exactly today's
  formula. The camera chases the thopter along a `FlightPath` spline.
  **Skipping is render-only** — it returns to strategic early, while arrival still fires
  on the engine clock, so determinism and E2E timing are untouched.
- **Location** — fixed cinematic camera with idle drift; hotspots raycast to bus events.
- **Conversation** — `dialogue:started` frames the character card; choices stay React
  buttons emitting `player:choose`.

No new engine commands are required. The entire 3D experience maps onto the existing
`BusEvents` contract plus one additive render-side event, `scene:mode`, so React and
Playwright can observe mode.

## Testability

**Vitest** — the engine suite is untouched. New pure modules are designed pure *so that
they are testable*: the `SceneModes` reducer, `terrain/noise` and `heightfield`
(determinism given a seed, height bounds, no NaN), `FlightPath` progress maths,
`Atmosphere` palette lerp, manifest resolution, and pick-to-payload mapping. three's
math runs fine in Node, so geometry construction tests (vertex counts, bounding boxes)
are viable. Do **not** unit-test `WebGLRenderer`; keep `Renderer.ts` thin and let E2E
cover it.

**Playwright** — keep every existing DOM assertion, then add a debug handle updated on
the same 100 ms throttle:

```ts
window.__DUNE__ = {
  mode, frame, worldTime,
  renderInfo: { calls, triangles },
  pick(id: string): void
}
```

Assert: canvas attached; `frame` strictly increasing (far more robust than pixel-reading
under SwiftShader); `mode === 'flight'` after travel and `'strategic'` once `worldTime`
passes arrival; `renderInfo.calls` under budget as a performance gate. Drive selection
via `__DUNE__.pick('sietch_tabr')` for functional tests, keeping exactly one
coordinate-click smoke test to prove real raycasting works. Headless Chromium renders
WebGL through SwiftShader — slow but stable; give the first-frame wait a generous
timeout.

## Risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | Content scope explosion (flight + 3 location types + conversations) | Mode-by-mode delivery; shippable after any phase; dioramas not interiors; strategic map is always the fallback |
| 2 | Character visuals sink perceived quality | Portrait cards only; a written style bible and fixed prompt template; never attempt rigged humans |
| 3 | Sand doesn't look good — the aesthetic rests on one material | Budget real iteration time on `SandMaterial` in Phase 1, before any content depends on it |
| 4 | Bundle budget breach | Amend the budget script in the same change; split core/addons chunks; the −700 KB gives slack |
| 5 | Migration breaks runnability | Driver extraction first, then dual-renderer flag; delete Phaser only once E2E is green on three |
| 6 | Renderer writing engine state (exists today) | Phase 0 moves all mutation into `runtime/`; the rule becomes trivially greppable in CI |
| 7 | E2E flakiness on headless WebGL | Assert the debug handle and DOM, never pixels |
| 8 | Vanilla-three leaks across mode switches | `dispose()` contract enforced by `ModeManager`; heap assertion after a mode round-trip |
| 9 | 200-line cap versus GLSL verbosity | Shader chunks in dedicated `.glsl.ts` files, composed by string |

## Keep / rework / delete

`src/game-render/`:

| File | Verdict | Reason |
|---|---|---|
| `AudioManager.ts` | REWORK | Same bus contract, Phaser sound → WebAudio |
| `BootScene.ts` | DELETE | Replaced by `AssetRegistry` + `LoadingScreen` |
| `GameScene.ts` | DELETE | Its driver logic rehomes to `src/runtime/`; nothing Phaser-shaped survives |
| `MapRenderer.ts` | DELETE | Superseded by 3D terrain |
| `TerritoryZones.ts` | REWORK | `pointInPolygon` and region-tint logic survive; Phaser Graphics dies |
| `VillageMarkers.ts` | REWORK | Colours and travel-lerp survive; embedded game logic moves to `VisitPolicy` |
| `factionColors.ts` | KEEP | Pure data; rename `FACTION_PHASER_COLORS` → `FACTION_HEX_COLORS` |

`src/ui/`: `GameContainer.tsx` DELETE (replaced by `ThreeContainer.tsx`);
`App.tsx` REWORK (swap the container import only); everything else KEEP — they are pure
store consumers with no Phaser imports. `SietchCommandSection.tsx` sits at exactly 200
lines, so touch it carefully.

Adjacent: `src/shims/phaser3spectorjs.cjs` DELETE; `vite.config.ts` REWORK;
`scripts/check-bundle-size.mjs` REWORK; `CODEX.md` and `CLAUDE.md` layout sections
updated at Phase 3.
