# Runtime Consolidation Specification

## Goal

Make one production runtime express the product loop in `01-product-contract.md`. A player
action must travel through one command path, mutate one authoritative representation, pay
out once, and report one consequence. The headless simulator must drive that same runtime
rather than approximate it with a parallel economy.

This package precedes new campaign content and production assets. Adding content to a
runtime with competing authorities multiplies rework and invalidates balance evidence.

## Current conflicts to retire

| Current path | Campaign disposition | Reason |
|---|---|---|
| `TroopGroup` harvest/prospect/train/ecology | Keep; authoritative | This is the designed people-and-equipment economy. |
| `SietchState.currentTask` plus threshold payouts | Remove | It duplicates crew work and permits a second income/troop stream. |
| `Village.productionRate` daily production | Stop applying to player resources | It is a legacy economy unrelated to crew choices. Static values may remain temporarily for migration. |
| Emergent faction goals/diplomacy/territory updates | Do not call in campaign | They generate noise and compete with authored Harkonnen escalation. Preserve behind a non-shipping sandbox seam only. |
| Authored raids, forts, quota, ecology, prescience | Keep; authoritative | These form the four-act campaign. |
| `goalType`, `control_all_villages`, `survive_20_min` | Remove from campaign state and UI | The act/endgame machine owns campaign completion. |
| `player.troops` aggregate | Remove | Combat power comes from positioned `TroopGroup` entities. |
| `player.influence` | Remove after content migration | `world.charisma`, sietch loyalty, and faction-specific flags already own its intended meanings. |
| `Math.random()` in campaign mutations | Replace with stored seeded RNG | Save/load, simulation parity, and reproducible defects require deterministic rolls. |

The repository may retain unused legacy modules while migration is in progress, but no
campaign import, command, panel, event, projection, or save field may depend on them when
this package is verified.

## Ownership contract

### Engine

`src/game-engine/` exclusively owns campaign state transitions, validation, deterministic
random rolls, day processing, ending evaluation, and save migrations. Every mutating
command validates its current preconditions even if the UI disabled the control.

### Runtime wiring

`src/runtime/CommandWiring.ts` translates EventBus commands into engine commands and
publishes their structured outcomes. It does not duplicate validation or mutate world
fields directly except for the established speed/pause control boundary.

### UI

`src/ui/` displays state, projections, legal actions, and rejection reasons. It never
constructs a second estimate of an engine rule. The quota projection, pledge capacity,
travel check, assault readiness, and market availability all come from pure engine queries.

### Renderer

`src/game-render/` visualizes world state and emits intent. It never awards resources,
changes ownership, resolves arrival, or mutates campaign flags.

## Authoritative state decisions

### Campaign status

- `world.act` and `world.ending` are the only progression authority.
- `world.ending === null` means the run is active; a non-null ending freezes simulation.
- The current act exposes two or three objective records with stable IDs, progress values,
  and completion state. UI wording is authored outside the engine query.
- `goalAchieved` may remain temporarily as a derived compatibility value, but it must not
  be serialized or evaluated independently.
- `goalType` is removed from new saves and ignored when migrating old saves.

### Sietches and loyalty

`SietchState` becomes the source of truth for loyalty, morale, pledge state, visit history,
gift allowance, and its crew IDs. `Village`/`Location` retains identity, kind, discovery,
owner, and position; it does not retain a second loyalty value.

A pledge command executes this exact chain atomically:

1. Confirm the player is physically present. Prescience permits remote dialogue and crew
   orders at its authored levels, but never a remote pledge.
2. Confirm the location is a Fremen sietch and has not pledged already.
3. Run `checkPledge` against loyalty, charisma capacity, and current pledge count.
4. On refusal, mutate nothing and publish the specific reason.
5. On success, mark the sietch pledged, award the authored charisma gain, create exactly
   one crew with a stable ID, attach that crew ID to the sietch, update objective/flag
   projections, and publish one pledge event.

Replaying or double-clicking the same command cannot grant charisma or another crew.

### Crew lifecycle

- A new campaign contains no operational crews before the first pledge.
- Each ordinary pledge creates one crew sized deterministically from sietch population.
- Any later extra crew is an explicit story reward with its own stable source ID; population
  or page reload cannot silently manufacture one.
- A crew has one task and one location. Reassignment applies one changeover cost exactly
  once.
- Harvest is the only routine source of player spice. Story effects, trade, and one-time
  rewards are individually typed and logged.
- Training changes crew military skill; it never increments a separate troop counter.
- Casualties change crew size and may merge or dissolve a crew according to one engine
  rule. A destroyed crew cannot remain selectable.

### Equipment

- Every item has one holder: a location, an unissued inventory slot, or one crew.
- Equipment condition is either fully active in campaign or removed from the UI and
  release scope. It cannot be displayed without decay/repair commands and consequences.
- Market stock queries include act and smuggler-standing gates. The UI renders only stock
  returned by that query.
- Issuing equipment targets a selected eligible crew. “Issue to the first crew” is not an
  acceptable production behavior when multiple crews exist.

### Tribute

- Q1 is 90 spice due on day 12; subsequent base amounts and the eight-day cadence reuse the
  current quota rules unless runtime-faithful validation retunes them.
- When a deadline is reached, simulation pauses before settlement and creates one pending
  settlement decision containing due, stock, minimum partial-payment threshold, arrears
  consequence, and legal payment range.
- The player chooses an amount or accepts the configured auto-shipment amount. Settlement
  applies exactly once, then advances the deadline and clears the pending decision.
- If settlement reduces patience to zero, the settlement command assigns the economic loss
  ending before simulation can resume.
- Closing or reloading the page while settlement is pending restores the same decision; it
  cannot skip payment or settle twice.
- Auto-shipment is unavailable before the first settlement tutorial. Once unlocked, it is
  opt-in and stored in the save.

### Randomness

Campaign randomness uses one seeded engine service whose serializable state includes the
seed and current step. Prospecting, worms, combat variance, raids, and authored random
event selection consume it through explicit injected calls.

Audio noise and purely visual variation may remain non-deterministic because they cannot
change world state.

## Day-boundary order

Every crossed day is processed sequentially in this order:

1. Finish task changeovers.
2. Apply harvest and field depletion.
3. Apply prospecting/discovery.
4. Apply training and ecology.
5. Apply equipment wear and worm consequences, if condition remains in scope.
6. Resolve scheduled authored events and raids.
7. Update loyalty neglect, morale, and persistent location state.
8. Evaluate act objectives and endings.
9. If tribute is due and no ending has occurred, create the pending settlement decision.
10. Publish one consolidated world update and ordered player-facing events.

If a frame, restored tab, or test advances across several days, the engine repeats all ten
steps for each day. It may not process only the final day.

## Command outcome contract

Every production mutation returns an outcome equivalent to:

```ts
type CommandOutcome<T extends string> =
  | { ok: true; code: T }
  | { ok: false; reason: string }
```

The concrete codes remain command-specific. The requirements are:

- No silent rejection.
- No player-facing prose in pure rule functions; UI/event policy maps stable reason codes
  to text.
- A successful command produces one durable mutation and at most one primary toast.
- Repeating the same idempotent command produces a refusal/no-op, never a second reward.

## Save migration

Introduce one schema version for the consolidated campaign model.

Migration must:

1. Preserve discovered locations, dialogue flags, equipment, fields, forts, ecology,
   current time, quota, act, and any valid ending.
2. Convert pledged legacy sietches into new sietch records and create at most one crew per
   pledge when no matching crew already exists.
3. Resolve duplicate legacy/new resource production without granting historical back-pay.
4. Drop `goalType`, aggregate troops, faction-AI timers, and legacy sietch task progress.
5. Map meaningful `influence`-gated content to explicit flags or charisma before removing
   the field.
6. Preserve the RNG seed for new saves and derive one stable seed from old save identity
   and time for migrated saves.
7. Be idempotent: migrating an already migrated save changes no value.

Before enabling automatic migration for players, keep an untouched fixture for each prior
schema version and assert the post-migration campaign is playable.

## Deterministic fixtures

| Fixture | Setup | Required result |
|---|---|---|
| `new-campaign-normal` | Start a Normal run | Arrakeen, day 0, 60 spice, no pledge, no crew, Q1 90/day 12, no faction-AI event. |
| `pledge-below-threshold` | Present at a 59-loyalty sietch with free charisma capacity | Refused; no charisma, crew, flag, or toast claiming success. |
| `pledge-at-threshold` | Same state at loyalty 60 | One pledge, one crew, one charisma award, objective projection updated. |
| `pledge-replayed` | Send the successful pledge command twice | Second command grants nothing and reports `already-pledged`. |
| `single-harvest-authority` | One crew harvests for three days | Spice equals the crew rule’s accumulated yield; no legacy threshold payout occurs. |
| `multi-day-catch-up` | Advance from day 2 to day 5 in one driver call | Days 3, 4, and 5 each process in order and match three one-day calls. |
| `settlement-reload` | Save with Q1 decision pending, reload, settle once | Same amount/options after reload; one settlement and one next deadline. |
| `campaign-goal-authority` | Make every location player-owned during Act 2 | Run remains active until act/endgame criteria produce an ending. |
| `seeded-prospect` | Same save and command sequence twice | Identical discovery, RNG step, events, and final state. |
| `legacy-save-migration` | Load a pledged save containing both task systems | One canonical crew economy, no duplicate income, preserved discoveries and act. |

## Acceptance criteria

1. `GameLoop` calls no legacy sietch payout, faction-AI, emergent diplomacy, PoC goal, or
   aggregate-troop mutation in campaign mode.
2. Campaign UI renders no `FactionPanel`, `SietchCommandSection`, PoC goal counter, or
   aggregate troops figure.
3. Every retained campaign system has a production EventBus command path and a visible
   refusal path.
4. The pledge fixtures prove threshold, charisma cap, idempotency, and crew creation.
5. The runtime and simulator produce identical state hashes for the deterministic opening
   fixture and a 40-day scripted strategy.
6. All save fixtures migrate, load, advance one day, save again, and reload without drift.
7. A browser scenario performs briefing → travel → dialogue → pledge → crew assignment →
   three day boundaries and sees one continuous causal chain.
8. The full repository gate passes after the targeted unit, migration, and browser tests.

## Rejection criteria

- A legacy panel is hidden with CSS while its system continues changing campaign state.
- Simulation copies formulas or invents crews instead of issuing production commands.
- A pledge can succeed without meeting loyalty and charisma gates.
- One sietch can generate spice through both crew harvest and legacy progress.
- A seeded campaign outcome changes after save/load with no additional player command.
- Old saves are discarded solely because the consolidated schema is inconvenient to
  migrate.
