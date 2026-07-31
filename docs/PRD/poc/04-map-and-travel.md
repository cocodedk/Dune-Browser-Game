# 04 — Map and Travel

## Goal

3 clickable map nodes rendered in Phaser; player travels between them and arrives after a delay.

## Input

- Task 01 complete (Phaser canvas renders)
- Task 02 complete (`World`, `Player` types exist)

## Scope (PoC only — keep it small)

- Create a Phaser scene (`src/game-render/MapScene.ts`)
- Render exactly 3 hardcoded node positions as colored circles (no art needed)
- Each circle is interactive: clicking it triggers travel if player is `"idle"`
- On click, set `player.state = "traveling"` and `player.travelTarget = villageId`
- Set `player.travelTimeRemaining` (e.g. `5` seconds hardcoded for PoC)
- In `update()`, count down travel time and resolve arrival:
  ```ts
  if (player.state === "traveling") {
    player.travelTimeRemaining -= delta
    if (player.travelTimeRemaining <= 0) {
      player.currentVillageId = player.travelTarget
      player.travelTarget = null
      player.state = "idle"
      world.eventLog.push(`Player arrived at ${player.currentVillageId}`)
    }
  }
  ```
- Render player position: draw a small marker on the current village node (or midpoint during travel)

**Hardcoded node positions (PoC):**
```ts
// src/data/mapNodes.ts
export const MAP_NODES = [
  { id: "village-a", name: "Arrakeen",   x: 200, y: 150, color: 0xf5a623 },
  { id: "village-b", name: "Sietch Tau", x: 500, y: 300, color: 0xe74c3c },
  { id: "village-c", name: "Carthag",    x: 750, y: 150, color: 0x8e44ad },
]
```

## Out of Scope (don't build yet)

- Animated travel path
- Distance-based travel time
- Terrain or movement costs
- Multiple players
- Fog of war

## Key Types / Interfaces

```ts
// Additions to Player type in src/game-engine/types.ts
type Player = {
  id: "player"
  currentVillageId: string | null
  state: "idle" | "traveling"
  travelTarget: string | null
  travelTimeRemaining: number   // seconds remaining
  spice: number
}
```

## Acceptance Criteria

- [ ] 3 colored circles appear on the Phaser canvas at hardcoded positions
- [ ] Clicking a circle when player is idle sets `player.state = "traveling"`
- [ ] After `travelTimeRemaining` reaches 0, `player.currentVillageId` updates
- [ ] `player.state` returns to `"idle"` on arrival
- [ ] Event log receives arrival message
- [ ] Clicking during travel does nothing (no re-triggering travel)

## Timebox

4–8 hours
