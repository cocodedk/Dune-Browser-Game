# Architecture

## High-Level Structure

Separation is still the rule, but the current repo layout is:

```text
src/
  data/          ← authored game content
  game-engine/   ← pure TS rules and simulation
  game-render/   ← Phaser scenes and render wiring
  ui/            ← React panels and Zustand store
  EventBus.ts    ← Phaser ↔ React bridge
  types.ts       ← shared contracts
```

## Layer Responsibilities

| Layer | Responsibility |
|-------|----------------|
| Engine | rules, simulation, state |
| Phaser | rendering, input, animation |
| React | UI panels and overlays |
| Data | villages, dialogue, content |
| EventBus | explicit bridge between Phaser and React |

## Core Principles

1. **Engine is deterministic** — no React state in game logic, no DOM access.
2. **React is a shell** — UI renders from engine-owned state and bus events.
3. **Phaser owns the interactive surface** — one game canvas, scene-driven rendering and input.
4. **Bridges stay explicit** — cross-layer coordination should go through shared contracts such as `EventBus`.

---

# Source

Originally derived from `docs/PRD/game-plan.md`, then updated to reflect the live repository.
