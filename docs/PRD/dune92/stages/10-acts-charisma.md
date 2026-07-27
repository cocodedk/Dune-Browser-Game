# Stage 10 — Charisma and the act state machine

**Phase:** 1 · **Depends on:** 09 · **Est. tasks:** 3 · **Builder:** Sonnet
**Status:** SPECCED

## Goal

Give the sandbox a spine. Charisma gates how much empire the player can hold, story
beats grant charisma, and the act machine sequences the whole game.

## Act machine

```ts
export type ActId = 'act1' | 'act2' | 'act3' | 'act4'
export type EndingId =
  | 'win_military' | 'win_ecology'
  | 'loss_patience' | 'loss_palace' | 'loss_abandoned'
```

Evaluated at the day boundary. Triggers are conjunctive and pure:

```ts
// src/game-engine/acts/transitions.ts
export function evaluateActTransition(world): ActId | EndingId | null
```

Act 1 exits on Q3 paid **and** ≥3 sietches pledged. Later act triggers are specified in
`01-design-systems.md` §7 — implement Act 1 → Act 2 fully now and leave the rest as
data-driven entries so Stage 18 fills them in without restructuring.

Act transition side effects: clear `quota.restoredInAct`, apply the quota multiplier,
unlock regions, unlock tasks, fire the transition beat.

## Charisma

`player.charisma` starts at 20; `maxPledgedSietches = floor(charisma / 10)` — so 2 at
the start. Sources: story beats (+10, five across the game) and the trance ritual
(+5, max three, each costing 20 spice and requiring the seer character present).

The ritual is a dialogue-driven action, not a button — it should feel like a scene.

## Story beats

```ts
export interface StoryBeat {
  id: string
  act: ActId
  trigger: FlagCondition      // reuse Stage 06's condition evaluator
  once: true
  effects: DialogueEffect     // reuse Stage 06's effect shape
}
```

Data in `src/data/beats.ts`. Act 1 needs five: the first pledge, meeting the scout,
discovering the smuggler den, the Duke's revelation (+10 charisma), and the finale
ritual granting prescience L1.

Beats are checked at the day boundary and on flag change. A beat firing mid-dialogue
must queue rather than interrupt — an interrupted conversation is a state-corruption
bug waiting to happen.

## Prescience

`player.prescience: 0|1|2|3`. L1 is granted by the Act 1 finale and is **cosmetic in the
slice** — model the field and the grant, but implement no L1 behaviour. L2 and L3 are
Stage 17.

## Acceptance criteria

1. Act 1 → Act 2 fires exactly when both conditions hold, and never twice.
2. Each beat fires at most once, and a beat triggered during dialogue queues until
   dialogue ends.
3. The charisma cap actually blocks a third pledge until the Duke's beat lands.
4. The ritual costs spice, requires the seer, and is limited to three uses.
5. Loss states are distinguishable in the UI and in the save file.
6. `evaluateActTransition` is pure and exhaustively tested, including the case where
   two triggers could fire on the same day.

## Out of scope

Acts 3–4 content, prescience behaviour, endings beyond the Act 1 slice's win/lose.

## Gate

Standard.
