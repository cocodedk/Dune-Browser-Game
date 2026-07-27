# Stage 02 — three.js infrastructure

**Phase:** 0 · **Depends on:** 01 · **Est. tasks:** 3 · **Builder:** Sonnet
**Status:** SPECCED

## Goal

Stand three.js up **beside** Phaser. Add the renderer core, the mode state machine, the
asset registry, quality tiering, and the E2E debug handle. Selected by `?renderer=three`;
the default stays Phaser so nothing regresses.

## Deliverables

| File | Lines | Responsibility |
|---|---|---|
| `src/game-render/core/Renderer.ts` | ~110 | `WebGLRenderer` setup: colour management, ACES tone mapping, DPR cap, resize observer, context-loss handling |
| `src/game-render/core/SceneModes.ts` | ~80 | **PURE** `nextMode(current, signal)` reducer |
| `src/game-render/core/SceneModes.test.ts` | ~120 | Every transition and every no-op |
| `src/game-render/core/ModeManager.ts` | ~130 | Instantiates and disposes the active mode; subscribes to engine signals; emits `scene:mode` |
| `src/game-render/core/Quality.ts` | ~70 | Device tier from `hardwareConcurrency`, DPR, first-frame timing |
| `src/game-render/core/Quality.test.ts` | ~60 | Tier selection boundaries |
| `src/game-render/core/DebugHandle.ts` | ~60 | `window.__DUNE__` for Playwright |
| `src/game-render/assets/AssetRegistry.ts` | ~140 | GLTF/KTX2/meshopt loading, cache, `dispose()`, progress → bus |
| `src/game-render/assets/manifests.ts` | ~80 | Per-mode asset path lists |
| `src/ui/ThreeContainer.tsx` | ~70 | Lazy-mounted; wires `Renderer` + `GameDriver` + `ModeManager`; full cleanup on unmount |
| `src/ui/LoadingScreen.tsx` | ~60 | Asset progress from the bus |

## Mode reducer contract

```ts
export type SceneModeId = 'strategic' | 'flight' | 'location' | 'conversation'

export type EngineSignal =
  | { kind: 'travel_start' }
  | { kind: 'travel_complete' }
  | { kind: 'dialogue_start' }
  | { kind: 'dialogue_end' }

export function nextMode(current: SceneModeId, signal: EngineSignal): SceneModeId
```

Rules: `travel_start` → `flight`. `travel_complete` → `location`. `dialogue_start` →
`conversation`. `dialogue_end` → the mode before the conversation (ModeManager keeps a
one-deep previous-mode stack; the reducer takes it as an argument rather than holding
state). Any signal that makes no sense for the current mode returns `current` unchanged
— never throw.

In this stage only `strategic` is implemented. `ModeManager` must fall back to
`strategic` when the target mode has no registered factory, and log once. That fallback
is what keeps stages 12–14 independently shippable.

## Bus additions

Add to `BusEvents` in `src/types.ts`:

```ts
'scene:mode':     { mode: SceneModeId }
'assets:progress': { loaded: number; total: number }
```

Both are render→React only. **No new engine commands.**

## Debug handle

```ts
window.__DUNE__ = {
  mode: SceneModeId,
  frame: number,             // monotonic, incremented every rendered frame
  worldTime: number,
  renderInfo: { calls: number; triangles: number },
  pick(id: string): void,    // emits the same bus event a real raycast would
}
```

Updated on the same 100 ms throttle as `world:updated`, except `frame`, which
increments every frame. Only attached when `import.meta.env.DEV` or
`?debug=1` — it must not ship enabled in a production build.

## Build config

**`vite.config.ts`** — add to `manualChunks`, keeping the phaser entries for now:

```js
if (id.includes('three/examples/jsm/')) return 'three-addons'
if (id.includes('three/'))              return 'three-core'
```

**`scripts/check-bundle-size.mjs`** — add (do not yet remove the phaser entries):

```js
{ pattern: /^three-core-.*\.js$/,   maxBytes: 700_000 },
{ pattern: /^three-addons-.*\.js$/, maxBytes: 200_000 },
```

Import three narrowly (`import { Scene, PerspectiveCamera } from 'three'`) so tree
shaking works. Never `import * as THREE`.

## Acceptance criteria

1. `?renderer=three` mounts a canvas that clears to a colour and animates; the default
   URL is byte-for-byte the same Phaser experience.
2. `npm run build` passes the budget check with both renderers present.
3. Report the actual `three-core` chunk size in the completion notes.
4. `SceneModes` and `Quality` are pure and fully unit tested; no GL context needed.
5. Unmounting `ThreeContainer` disposes the renderer, cancels the rAF loop, and removes
   every bus listener. Prove it with a test that mounts and unmounts twice and asserts
   no listener leak.
6. All existing tests still pass, unchanged.

## Out of scope

Terrain, markers, materials, picking — all Stage 03. This stage renders a clear colour
and proves the plumbing.

## Gate

Standard, plus `sh .githooks/pre-commit` because tooling files change.
