# 06 — Dialogue Tree

## Goal

One hardcoded conversation tree the player can walk through; completing it changes village loyalty.

## Input

- Task 02 complete (`World`, `Village` types exist)
- Task 04 complete (player can be at a village — `player.currentVillageId` is set)
- Task 08 partially started (React UI exists enough to render buttons) — or implement with console input as fallback

## Scope (PoC only — keep it small)

- Define dialogue types in `src/game-engine/dialogue.ts`:
  ```ts
  type DialogueChoice = {
    text: string
    next: string | null   // null = end dialogue
    loyaltyEffect: number // positive or negative, applied to current village
  }

  type DialogueNode = {
    id: string
    text: string
    choices: DialogueChoice[]
  }
  ```
- Hardcode one dialogue tree with 3–5 nodes in `src/data/dialogue.ts`
- Implement `advanceDialogue(world, nodeId, choiceIndex): void`
  - Applies `loyaltyEffect` to `player.currentVillageId` village
  - Moves to `next` node or ends dialogue
- Track active dialogue state on world:
  ```ts
  // Add to World type
  dialogue: {
    active: boolean
    currentNodeId: string | null
  }
  ```
- Player can only start dialogue when `player.state === "idle"` and at a village

**Example hardcoded tree:**
```ts
// src/data/dialogue.ts
export const DIALOGUE_TREE: DialogueNode[] = [
  {
    id: "root",
    text: "The village elder eyes you carefully. 'What brings you to our sietch?'",
    choices: [
      { text: "We seek alliance against the Harkonnens.", next: "ally", loyaltyEffect: 0 },
      { text: "We require your spice quota.", next: "demand", loyaltyEffect: 0 },
    ]
  },
  {
    id: "ally",
    text: "'An alliance...' The elder strokes his beard. 'What do you offer in return?'",
    choices: [
      { text: "Protection from faction raids.", next: "end-ally", loyaltyEffect: 15 },
      { text: "A share of our spice reserves.", next: "end-ally", loyaltyEffect: 20 },
    ]
  },
  {
    id: "demand",
    text: "The elder's expression hardens. 'You demand much, stranger.'",
    choices: [
      { text: "Forgive me. Let us speak as equals.", next: "ally", loyaltyEffect: -5 },
      { text: "The quota stands. Deliver it.", next: "end-demand", loyaltyEffect: -20 },
    ]
  },
  {
    id: "end-ally",
    text: "The elder nods. 'Then we have an accord.'",
    choices: []   // empty = end of dialogue
  },
  {
    id: "end-demand",
    text: "The elder turns away. This conversation is over.",
    choices: []
  }
]
```

## Out of Scope (don't build yet)

- Dynamic/procedural dialogue
- LLM-generated dialogue
- Branching based on world state (faction control, spice amounts)
- Voice or animation
- Multiple dialogue trees (one is enough for PoC)

## Key Types / Interfaces

```ts
type DialogueChoice = {
  text: string
  next: string | null
  loyaltyEffect: number
}

type DialogueNode = {
  id: string
  text: string
  choices: DialogueChoice[]
}
```

## Acceptance Criteria

- [ ] Dialogue tree is navigable (clicking/selecting choices advances to next node)
- [ ] Selecting a choice applies `loyaltyEffect` to the current village
- [ ] Village `loyalty` visibly changes after dialogue completes
- [ ] Dialogue ends correctly when reaching a node with no choices
- [ ] Player cannot start dialogue while traveling
- [ ] Event log records outcome of dialogue (e.g. "Loyalty in Arrakeen +15")

## Timebox

4–6 hours
