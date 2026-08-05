# 04 — Asset Pipeline

## Why

Hero assets (vehicles today, but the pattern is generic) take many gauntlet rounds to get
right — dozens of commits judging geometry, materials and motion against a reference.
None of that belongs in `src/game-render/`: it would drag half-finished parts, dev-only
harnesses and churn-heavy history into the game's own history and its own type-check.
`vehicle-shop/<name>/` is a standalone Vite sub-app where an asset develops in isolation,
with its own gauntlet loop (`progress.md`), and is released into the game **without ever
being copied** — the game imports the shop's own source through one narrow, enforced seam.

## The lifecycle

1. **Scaffold** — `npm run shop:new -- <name>` (`scripts/new-shop.mjs`) generates
   `vehicle-shop/<name>/`: a minimal public surface (`src/model/`, `contracts.ts`,
   `spec.ts`, `provenance.ts`) that builds and type-checks immediately, a passing
   `seam.test.ts`, and a bare three.js dev harness (`main.ts`, `index.html`).
2. **Build and gauntlet, in the shop** — the builder iterates against `progress.md`'s bar.
   The harness (`main.ts`, camera rigs, HUD, capture tooling) is free to churn; nothing
   outside `src/model/`, `contracts.ts` and `spec.ts` is ever imported by the game, so
   there is no cost to rewriting it mid-round.
3. **Public surface green** — the root Vitest config includes `vehicle-shop/**/*.test.ts`
   (`vite.config.ts`), so shop unit tests run in the same `npm run test:unit` as the game's.
   `npm run shop:check` type-checks every shop against its own `tsconfig.json` (a separate
   TS program from the root build) and runs in `.githooks/pre-commit` — without it a
   shop-only type error is invisible to every other gate.
4. **Adapter, in the game** — the existing game-side factory file becomes the release
   point, keeping its own API unchanged. `src/game-render/machines/Harvester.ts` is the
   reference: it still exports `createHarvester(scale): Harvester`, but internally wraps
   `@shop/harvester/src/model/Harvester` instead of building geometry itself. Callers
   (`CrewUnits.ts`) do not change.
5. **Measure** — `window.__DUNE__.inspect()` and `renderInfo` (`src/game-render/core/
   DebugHandle.ts`) for scene state and draw calls; the shop's own `vehicle-<name>`
   production chunk against the 150,000-byte budget (`scripts/check-bundle-size.mjs`);
   in-game fps with the release in place. Measure, don't assume.
6. **Look gate** — the user judges the release in the game's own lighting, not the shop's
   turntable. A shop can pass its own gauntlet and still need a look-gate pass once seen
   under planet fog and the actual sun angle.
7. **Flip consumer, record in the stage index** — once the look gate passes,
   `docs/PRD/dune92/03-stage-index.md` records the release.

## The fence

`eslint.config.js` enforces the seam in both directions, verbatim:

```js
// src/**/*.{ts,tsx}
'no-restricted-imports': ['error', { patterns: [
  { group: ['**/vehicle-shop/**'],
    message: 'Import shop code via the @shop alias, never by path.' },
  { group: ['@shop/**',
      '!@shop/*', '!@shop/*/src',
      '!@shop/*/src/model', '!@shop/*/src/model/**',
      '!@shop/*/src/contracts', '!@shop/*/src/spec'],
    message: 'Only the shop public surface (model/**, contracts, spec) is released to the game.' },
] }]

// vehicle-shop/**/*.ts
'no-restricted-imports': ['error', { patterns: [
  { group: ['**/src/game-engine/**', '**/src/game-render/**', '**/src/ui/**',
      '**/src/EventBus*', '@shop/**'],
    message: 'Shops are standalone: no imports from game src or other shops.' },
] }]
```

- **Public**: `src/model/**`, `contracts.ts`, `spec.ts`. `provenance.ts` is not directly
  reachable — `spec.ts` re-exports `PROVENANCE` from it, so provenance travels with the
  spec without opening a fourth import path.
- **Harness**: everything else in a shop (`main.ts`, camera/stage/input/debug helpers,
  `tools/`, `docs/`) — free to churn, never imported by the game.
- **`@shop/*`** (`tsconfig.json` paths, `vite.config.ts` `resolve.alias`, both pointing at
  `vehicle-shop/`) is the only sanctioned route from game code into a shop. A bare
  `../../vehicle-shop/...` path is an ESLint error, not a style preference.
- Shops may not import the game (`game-engine`, `game-render`, `ui`, `EventBus`) or each
  other — each shop is standalone, so building one can never regress another.

## What goes where

| Layer | Owns |
|---|---|
| Shop (`vehicle-shop/<name>/`) | Source of truth for the asset. True meters, one meter per three.js unit. Fully self-contained, dispose-complete models (`dispose()` frees every geometry and material it created). Its own unit tests, including the seam guard. |
| Adapter (`src/game-render/machines/*.ts` or equivalent) | Scale mapping from true meters to the caller's world units. Lighting and fog policy for wherever the game actually places the asset (a shop's own turntable lighting is not the game's). Per-frame state synthesis — the shop's model expects a domain state object (e.g. `CrawlerState`), and the adapter is what builds one from what the caller actually has. `dt` derivation from the caller's `elapsedMs`, clamped against stalls and hidden-object gaps. |
| Consumer (`CrewUnits.ts` or equivalent) | Unchanged. The adapter's exported API is the old placeholder's API; nothing downstream of it needs to know a shop exists. |

## Notes

- `vehicle-shop/` is a historical name from the first shop it held. It hosts any asset
  type — buildings, props — not only vehicles; nothing about the pipeline is
  vehicle-specific. **Characters are the exception**: they live under a second root,
  `character-shop/<name>/` (alias `@cast`, chunks `character-<name>`, scaffold
  `cast:new`), with the same fence semantics plus one stricter rule — character shops may
  not import each other. Loop contract: `character-shop/docs/gauntlet-loop.md`.
- Every public-surface file must compile under **both** the root `tsconfig.json` (which
  declares the `@shop/*` path and includes `src/`) and the shop's own `tsconfig.json`
  (which does not know about `@shop` at all, and includes only its own `src/`). `npm run
  shop:check` covers the second program; the root `tsc -b` covers the first only for
  files `src/` actually imports.
- three.js must be bumped in the game and in every shop **in lockstep**. The adapter
  casts the shop's structural `Object3DLike` root to a real three.js `Group` on the
  assumption that both sides were built by the same `three` module instance (one
  `node_modules/three`, repo-wide); an independent three.js version in a shop would break
  that cast silently at the type level and possibly at runtime.
- The harvester is the first release through this seam: 1,022 meshes / 46k triangles / 13
  materials per machine (against the placeholder's 6 meshes), `vehicle-harvester` chunk at
  23.8 KB of its 150 KB budget, 60 fps held with one machine in the planet view (draw
  calls 56 → 1,075 total). Known debt: per-link track belts make mesh count the next
  optimization target (instancing, or a map-detail flag on the shop side) if several
  machines are ever on screen at once. The ornithopter is the second application of the
  same seam (`src/game-render/modes/flight/Ornithopter.ts` over `@shop/ornihopter`).
