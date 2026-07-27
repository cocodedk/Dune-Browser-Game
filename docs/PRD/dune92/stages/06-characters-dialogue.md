# Stage 06 — Characters and dialogue flags

**Phase:** 1 · **Depends on:** 05 · **Est. tasks:** 3 · **Builder:** Sonnet
**Status:** SPECCED

## Goal

Turn the dialogue-tree runner into a character-driven, state-gated conversation system.
This is the backbone of the whole game — in the Cryo shape, conversations *are* the
interface to every other system.

## Character model

```ts
export interface Character {
  id: CharacterId
  name: string
  role: string
  locationId: LocationId | 'with_player' | 'offworld'
  recruited: boolean
  dialogueTreeId: string
}
```

Roster data in `src/data/characters.ts`. The Act 1 slice needs eight speaking roles
(see `01-design-systems.md` §8): the Duke, the steward, the envoy, the first Naib, the
scout, the seer, the prospector, and the smuggler. All characters and their writing are
original to this project.

## Flag store

```ts
// WorldState
flags: Record<string, boolean | number>
```

Flat namespace, dotted keys by convention: `act`, `met.shadir`,
`quota.cycle`, `pledged.count`, `beat.duke_revelation`.

## Gated dialogue

A dialogue **state** is a tree entry selected by a condition. Extend the tree format:

```ts
export interface DialogueState {
  id: string
  characterId: CharacterId
  condition: FlagCondition | null   // null = fallback, always last
  rootNodeId: string
}

export type FlagCondition =
  | { op: 'eq' | 'gte' | 'lte'; key: string; value: boolean | number }
  | { op: 'and' | 'or'; terms: FlagCondition[] }
  | { op: 'not'; term: FlagCondition }
```

Resolution: evaluate states for a character in declaration order and take the first
whose condition passes. **Every character must have a fallback state with
`condition: null`** — a character with nothing to say is a dead end the player cannot
recover from. Enforce this with a data-validation test over the whole roster, not a
runtime check.

`FlagCondition` evaluation is pure and lives in `src/game-engine/dialogue/conditions.ts`
with thorough unit tests, including the `gte`/`lte` boolean-versus-number edge.

## Effects

Extend `DialogueEffect`:

```ts
setFlags?: Record<string, boolean | number>
addFlags?: Record<string, number>     // numeric increment
charismaDelta?: number
revealLocation?: LocationId
recruitCharacter?: CharacterId
```

Effects apply atomically when a choice is taken. Order is fixed and documented:
flags, then charisma, then reveals, then recruits — so a single choice can set a flag
*and* reveal a location gated on that flag.

## Referrals

The first Naib's tree must be able to reveal two other sietches via `revealLocation`.
This is the primary discovery channel in Act 1, ahead of prospecting.

## Acceptance criteria

1. Talking to a character selects the correct state for the current flags; changing a
   flag changes what they say, verified in tests.
2. Every character in the roster has a reachable fallback state — enforced by a test
   that walks the whole data file.
3. Effects apply in the documented order; a choice that sets a flag and reveals a
   location gated on it works in one step.
4. Dialogue still pauses time (Stage 05) and `DialoguePanel` renders unchanged.
5. No dialogue tree can strand the player: a test asserts every node either has choices
   or terminates cleanly with `nextId: null`.

## Out of scope

The 3D conversation view — Stage 14. This stage is engine and data only; the existing
React `DialoguePanel` is the UI.

## Gate

Standard.
