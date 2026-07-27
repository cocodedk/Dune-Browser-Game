# 08 — React UI Barebones

## Goal

Minimal React UI showing live world state — a map panel (Phaser) plus an info panel (React).

## Input

- Task 01 complete (Vite + React + Phaser scaffold exists)
- Task 02 complete (`World` type exists)
- Task 04 complete (Phaser map scene exists with clickable nodes)
- Task 06 complete (dialogue types exist)

## Scope (PoC only — keep it small)

- Create an event bus connecting Phaser ↔ React (no shared mutable state):
  ```ts
  // src/game-engine/eventBus.ts
  import mitt from 'mitt'

  type Events = {
    villageSelected: string        // village id
    worldUpdated: World            // full world snapshot each tick
    dialogueStarted: string        // first node id
  }

  export const eventBus = mitt<Events>()
  ```
  Install mitt: `npm install mitt`

- Layout: side-by-side panels
  ```
  ┌──────────────────┬─────────────────┐
  │   Phaser Canvas  │   Info Panel    │
  │   (map + nodes)  │   (React)       │
  └──────────────────┴─────────────────┘
  ```

- Info panel (`src/ui/InfoPanel.tsx`) displays:
  - Current game time (day number)
  - Selected village: name, spice, loyalty, status
  - Player state (idle / traveling)
  - Event log (last 5 entries)
  - Dialogue choices as buttons (when dialogue is active)

- Phaser → React: village click emits `villageSelected` event
  ```ts
  // In MapScene (Phaser)
  circle.on('pointerdown', () => eventBus.emit('villageSelected', node.id))
  ```

- React → Engine: dialogue choice dispatches to engine
  ```ts
  // In React component
  engine.dispatch({ type: "CHOOSE_DIALOGUE", choiceIndex: i })
  ```

- Engine tick sends world snapshot to React:
  ```ts
  // In game loop
  eventBus.emit('worldUpdated', structuredClone(world))
  ```

**Styling:** inline styles or a single CSS file — no CSS framework needed for PoC.

## Out of Scope (don't build yet)

- Polished UI design
- Animations or transitions
- Tooltips
- Mobile layout
- Dark/light theme toggle
- Responsive design

## Key Types / Interfaces

```ts
// src/game-engine/eventBus.ts
import mitt from 'mitt'

type Events = {
  villageSelected: string
  worldUpdated: World
  dialogueStarted: string
}

export const eventBus = mitt<Events>()
```

```ts
// src/game-engine/dispatch.ts
type EngineAction =
  | { type: "TRAVEL_TO"; villageId: string }
  | { type: "CHOOSE_DIALOGUE"; choiceIndex: number }
  | { type: "SET_TIME_SCALE"; scale: number }

function dispatch(action: EngineAction): void
```

## Acceptance Criteria

- [ ] Clicking a village node in Phaser updates the React info panel
- [ ] Info panel shows correct spice and loyalty values for selected village
- [ ] Game time (day count) updates in real time
- [ ] Event log shows last 5 entries, newest first
- [ ] When dialogue is active, choices render as clickable buttons
- [ ] Clicking a dialogue button advances the dialogue and updates loyalty display
- [ ] No console errors from React/Phaser integration

## Timebox

4–8 hours
