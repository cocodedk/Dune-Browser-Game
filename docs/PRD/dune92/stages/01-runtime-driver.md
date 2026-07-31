# Stage 01 — Runtime driver extraction

**Phase:** 0 · **Depends on:** — · **Est. tasks:** 2 · **Builder:** Sonnet
**Status:** SPECCED

## Goal

Pull the game-driving logic out of the Phaser render layer into a renderer-agnostic
`src/runtime/`. Phaser still renders and the game looks and behaves identically. This
makes the three.js swap mechanical and permanently fixes the render-writes-engine
violation.

## Why this is first

`GameScene.ts` is not a renderer. It runs the engine tick, owns every `EventBus`
command handler, and mutates `world.speed` and `world.difficulty` directly.
`VillageMarkers.ts` embeds game logic too — it decides dialogue-versus-travel on click
and calls `startDialogue`/`pushEvent`. None of that should have to be rewritten when
the renderer changes.

## Deliverables

| File | Lines | Responsibility |
|---|---|---|
| `src/runtime/GameDriver.ts` | ~120 | Owns the tick: `initLoop()`, `tick(deltaMs)`, and the 100 ms-throttled `world:updated` emit. Renderer-independent — the caller supplies delta. |
| `src/runtime/CommandWiring.ts` | ~90 | `wireCommands(): () => void` — registers every `EventBus` command handler, returns an unsubscribe function. |
| `src/runtime/VisitPolicy.ts` | ~60 | PURE. `decideVisit(world, locationId): VisitAction` — the click decision, no side effects. |
| `src/runtime/VisitPolicy.test.ts` | ~90 | Unit tests for every branch |
| `src/runtime/GameDriver.test.ts` | ~70 | Throttle behaviour and tick delegation |
| `src/runtime/CommandWiring.test.ts` | ~90 | Each bus command reaches its engine call; unsubscribe works |

## Engine changes

**`src/game-engine/TravelSystem.ts`** — export the duration so the renderer can
interpolate correctly:

```ts
export function travelDuration(fromId, toId): number   // extract the existing private fn
export function currentTravelProgress(world): number   // 0..1, or 0 when idle
```

There is a **live bug** to fix here: `VillageMarkers.updatePlayerPosition` hardcodes
`(world.time - (player.arrivalTime - 10)) / 10`, assuming every trip takes 10 seconds.
`travelTime()` actually returns `max(4, round(dist/50))`, so the marker lerps wrong for
every trip that isn't exactly 10s — it teleports early on short hops and lags on long
ones. `currentTravelProgress` must derive the duration from the same distance formula,
and needs a test that a 4-second and a 16-second trip both interpolate 0→1 correctly.

`world.speed` and `world.difficulty` mutation moves into `CommandWiring.ts`. After this
stage, **no file under `src/game-render/` may write to `world`.**

## VisitAction contract

```ts
type VisitAction =
  | { kind: 'none' }                                  // traveling or in dialogue
  | { kind: 'travel'; targetId: VillageId }
  | { kind: 'dialogue'; treeId: string; villageId: VillageId }
  | { kind: 'event'; message: string }                // own territory
```

Preserve today's behaviour exactly: blocked while traveling or in dialogue; at your
location, `owner === 'player'` gives the event, `'harkonnen'` opens
`harkonnen_stronghold`, anything else opens `village_leader`; elsewhere, travel.

## Refactors

- `GameScene.ts` shrinks to a view: create visuals, call `GameDriver.tick(delta)` in
  `update`, call `refresh*` on the throttle. No `EventBus.on` handlers, no engine
  imports beyond `world` for reads.
- `VillageMarkers.ts` loses its `pointerdown` logic — the handler calls
  `decideVisit()` and dispatches the result. It keeps emitting `village:selected`.

## Acceptance criteria

1. `src/runtime/` contains no Phaser, three.js, or React import.
2. `grep -rn "world\." src/game-render/ | grep -vE "world\.(villages|player|regions|sietches|factionProfiles|time|dialogue|difficulty|speed|events|goalAchieved)\b"` shows no assignment — verify by eye that no line assigns into `world`.
3. Player marker interpolation is correct for a 4s and a 16s trip.
4. Every existing bus command still works in the browser: travel, choose, speed,
   difficulty, pledge, assign task, stop task, attack, scout, mute.
5. `GameScene.ts` is under 60 lines.
6. All 236 existing unit tests still pass; the 8 E2E tests still pass, unchanged.

## Out of scope

Any three.js work. Any visual change. Any gameplay change.

## Gate

```bash
npm run lint && npx tsc --noEmit && npm run build && npm run test:unit && npm test
```
