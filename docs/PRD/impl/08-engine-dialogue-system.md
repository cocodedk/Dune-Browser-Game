# 08 — Engine: Dialogue System

## Goal

Implement the dialogue tree runner: load dialogue trees from JSON, evaluate conditions, apply world-state effects, and enforce the one-active-dialogue constraint.

## Prerequisites

- `02-engine-world-model.md` — `World`, `Character` types.
- `05-engine-event-system.md` — `EventQueue` for `dialogue` events.
- Dialogue seed data must exist in the current data layer.

## Scope

- `DialogueSystem` class in `src/game-engine/dialogue-system.ts`.
- Load `dialogues.json` at startup.
- `DialogueNode` type and `DialogueCondition` evaluator.
- `startDialogue(world, characterId)` — begins a dialogue session.
- `chooseOption(world, choiceIndex)` — advances the tree.
- Effects: loyalty change, spice gain/loss, faction relation change.
- One active dialogue at a time — engine blocks other dialogues until closed.
- Fires `dialogueStarted` and `dialogueEnded` events for React to display panel.

## Out of scope

- React dialogue panel rendering (task 17).
- Dialogue authored content itself.
- LLM-generated dialogue (faction AI — task 10 may extend this later).
- Animated portraits — static image only.

## Key types / interfaces

```ts
// src/game-engine/types/dialogue.types.ts

export type DialogueCondition = {
  type: "loyalty" | "spice" | "relation" | "visited" | "flag"
  target: string           // villageId, factionId, or flag name
  operator: ">=" | "<=" | "==" | "!="
  value: number | boolean
}

export type DialogueEffect = {
  type: "loyalty" | "spice" | "relation" | "flag" | "end"
  target: string
  value: number | boolean
}

export type DialogueChoice = {
  text: string
  next: string             // next node id, or "END" to close dialogue
  condition?: DialogueCondition
  effects?: DialogueEffect[]
}

export type DialogueNode = {
  id: string
  characterId: string
  text: string
  choices: DialogueChoice[]
}

export type DialogueTree = {
  id: string               // matches character's dialogueTreeId
  rootId: string           // first node id
  nodes: Record<string, DialogueNode>
}

export type ActiveDialogue = {
  treeId: string
  currentNodeId: string
  characterId: string
}
```

```ts
// src/game-engine/dialogue-system.ts

import dialoguesData from '../data/dialogues.json'
import { EventQueue } from './event-system'
import type { World } from './types/world.types'
import type {
  DialogueTree, DialogueNode, DialogueChoice,
  DialogueCondition, DialogueEffect, ActiveDialogue
} from './types/dialogue.types'

export class DialogueSystem {
  private trees: Map<string, DialogueTree> = new Map()
  private eventQueue: EventQueue

  constructor(eventQueue: EventQueue) {
    this.eventQueue = eventQueue

    // Load all dialogue trees from JSON
    for (const tree of dialoguesData as DialogueTree[]) {
      this.trees.set(tree.id, tree)
    }

    // Listen for dialogue events queued by other systems
    eventQueue.on("dialogue", (event, world) => {
      this.startDialogue(world, event.targetId)
    })
  }

  /** Begin dialogue with a character. Returns false if a dialogue is already active. */
  startDialogue(world: World, characterId: string): boolean {
    if (world.activeDialogue) return false  // enforce one-at-a-time

    const character = world.characters.find(c => c.id === characterId)
    if (!character) return false

    const tree = this.trees.get(character.dialogueTreeId)
    if (!tree) return false

    world.activeDialogue = {
      treeId: tree.id,
      currentNodeId: tree.rootId,
      characterId,
    }

    EventQueue.enqueue(world, {
      type: "dialogue-started" as any,
      targetId: characterId,
      payload: { node: this.getCurrentNode(world) },
      scheduledAt: 0,
    })

    return true
  }

  /** Get the current dialogue node for rendering. */
  getCurrentNode(world: World): DialogueNode | null {
    if (!world.activeDialogue) return null
    const tree = this.trees.get(world.activeDialogue.treeId)
    if (!tree) return null
    return tree.nodes[world.activeDialogue.currentNodeId] ?? null
  }

  /** Get available choices (filtered by conditions). */
  getAvailableChoices(world: World): DialogueChoice[] {
    const node = this.getCurrentNode(world)
    if (!node) return []
    return node.choices.filter(c =>
      !c.condition || this.evaluateCondition(c.condition, world)
    )
  }

  /** Player selects a choice by index (from getAvailableChoices). */
  chooseOption(world: World, choiceIndex: number): void {
    const choices = this.getAvailableChoices(world)
    const choice = choices[choiceIndex]
    if (!choice) return

    // Apply effects
    if (choice.effects) {
      for (const effect of choice.effects) {
        this.applyEffect(effect, world)
      }
    }

    // Advance or end dialogue
    if (choice.next === "END") {
      this.endDialogue(world)
    } else {
      world.activeDialogue!.currentNodeId = choice.next
    }
  }

  private endDialogue(world: World): void {
    const characterId = world.activeDialogue?.characterId
    world.activeDialogue = undefined

    EventQueue.enqueue(world, {
      type: "dialogue-ended" as any,
      targetId: characterId ?? "unknown",
      payload: {},
      scheduledAt: 0,
    })
  }

  private evaluateCondition(cond: DialogueCondition, world: World): boolean {
    let actual: number | boolean

    switch (cond.type) {
      case "loyalty": {
        const village = world.villages.find(v => v.id === cond.target)
        actual = village?.loyalty ?? 0
        break
      }
      case "spice":
        actual = world.player.spice
        break
      case "relation":
        actual = world.player.relations[cond.target] ?? 0
        break
      case "visited": {
        const village = world.villages.find(v => v.id === cond.target)
        actual = (village?.lastVisitedTime ?? 0) > 0
        break
      }
      case "flag":
        actual = (world.flags as Record<string, boolean>)?.[cond.target] ?? false
        break
      default:
        return true
    }

    switch (cond.operator) {
      case ">=": return (actual as number) >= (cond.value as number)
      case "<=": return (actual as number) <= (cond.value as number)
      case "==": return actual === cond.value
      case "!=": return actual !== cond.value
      default: return true
    }
  }

  private applyEffect(effect: DialogueEffect, world: World): void {
    switch (effect.type) {
      case "loyalty": {
        const village = world.villages.find(v => v.id === effect.target)
        if (village) {
          village.loyalty = Math.max(0, Math.min(100, village.loyalty + (effect.value as number)))
        }
        break
      }
      case "spice":
        world.player.spice = Math.max(0, world.player.spice + (effect.value as number))
        break
      case "relation":
        world.player.relations[effect.target] = Math.max(
          -100,
          Math.min(100, (world.player.relations[effect.target] ?? 0) + (effect.value as number))
        )
        break
      case "flag":
        if (!world.flags) (world as any).flags = {}
        ;(world as any).flags[effect.target] = effect.value
        break
    }
  }
}
```

### dialogues.json structure (from task 12)

```json
[
  {
    "id": "stilgar-tree",
    "rootId": "stilgar-greeting",
    "nodes": {
      "stilgar-greeting": {
        "id": "stilgar-greeting",
        "characterId": "stilgar",
        "text": "You come to Sietch Tabr. What do you seek, offworlder?",
        "choices": [
          {
            "text": "I seek alliance against the Harkonnens.",
            "next": "stilgar-alliance",
            "effects": [{ "type": "relation", "target": "fremen", "value": 5 }]
          },
          {
            "text": "I need spice — will your people trade?",
            "next": "stilgar-trade",
            "condition": { "type": "spice", "target": "player", "operator": ">=", "value": 0 }
          },
          {
            "text": "I must leave.",
            "next": "END"
          }
        ]
      }
    }
  }
]
```

### World type extension needed

Add to `World` type (task 02):

```ts
activeDialogue?: ActiveDialogue
flags?: Record<string, boolean>   // persistent story flags
```

## File locations

| File | Action |
|------|--------|
| `src/game-engine/dialogue-system.ts` | Create |
| `src/game-engine/types/dialogue.types.ts` | Create (was stub in task 02) |
| `src/game-engine/types/world.types.ts` | Add `activeDialogue?` and `flags?` fields |
| `src/game-engine/index.ts` | Export `DialogueSystem` |

## Acceptance criteria

- [ ] `DialogueSystem` loads all trees from `dialogues.json` without errors.
- [ ] `startDialogue(world, "stilgar")` sets `world.activeDialogue` and fires `dialogue-started` event.
- [ ] `startDialogue()` returns `false` if a dialogue is already active.
- [ ] `getCurrentNode()` returns the correct `DialogueNode`.
- [ ] `getAvailableChoices()` filters out choices whose conditions are not met.
- [ ] `chooseOption(world, 0)` applies effects and advances to the next node.
- [ ] Choosing a `"next": "END"` choice clears `world.activeDialogue` and fires `dialogue-ended`.
- [ ] Loyalty effects apply correctly — `{ type: "loyalty", target: "sietch_tabr", value: 10 }` adds 10 loyalty to that village.
- [ ] `world.activeDialogue` is serializable — survives `JSON.stringify` / `JSON.parse`.
- [ ] No imports from `game-render` or `ui`.
