# Game Completion Specification Pack

## Purpose

This pack defines the work required to turn the current Dune browser-game alpha into a
coherent, entertaining, finishable game. It is a forward-looking implementation contract,
not a claim that the described behavior already exists.

The pack responds to a live repository and browser audit performed on 2026-08-10. That
audit found strong rendering and simulation foundations, but also competing runtime loops,
an opening that does not match the balance model, thin campaign content, partially wired
endings, and an incomplete production-asset pass.

## Authority and boundaries

Use sources in this order when implementing this initiative:

1. [`CODEX.md`](../../../CODEX.md) for repository architecture, working rules, and the
   verification gate.
2. This pack for full-game product behavior, sequencing, and acceptance criteria.
3. [`docs/PRD/dune92/`](../dune92/) for system rationale, historical stage evidence, and
   asset-pipeline contracts that this pack explicitly retains.
4. Older [`docs/PRD/impl/`](../impl/), [`docs/PRD/poc/`](../poc/), and
   [`docs/PRD/reference/`](../reference/) files as historical background only.

This pack does not authorize changing the engine/render/UI ownership boundaries, the
EventBus coordination pattern, shop fences, bundle budgets, or the 200-line limit for
source-like files.

## Product decision summary

These decisions are shared by every file in the pack:

| Topic | Canonical decision |
|---|---|
| Campaign shape | Four authored acts ending in military victory, ecological victory, or an earned loss. |
| Target duration | 4–6 hours for a first successful run; 25–40 minutes for the opening contract. |
| Primary loop | Earn trust → pledge a sietch → gain a crew → assign work → meet or deliberately underpay tribute → invest and expand. |
| Campaign economy | `TroopGroup` tasks and equipment are authoritative. The threshold-based legacy sietch task/payout loop is removed from campaign play. |
| Antagonist | Authored Harkonnen pressure, raids, forts, and story beats. The emergent faction simulation is not active in campaign mode. |
| Victory authority | The act/endgame machine is the only campaign authority. PoC goals such as “control all villages” do not end a campaign. |
| Opening state | New game begins at Arrakeen with 60 spice, no pledged sietches, no operational crew, difficulty selected before play (Normal by default), and Q1 of 90 due on day 12. |
| First expansion | The first valid pledge creates exactly one operational crew. Later crew growth is deterministic and tied to additional pledges or explicit story rewards. |
| Tribute settlement | The deadline presents an explicit, pausing settlement decision. Optional auto-shipment is unlocked only after the first settlement. |
| Difficulty | Selected when starting a run and immutable for that run. It may be changed only by starting a new run. |
| Save model | One rolling autosave plus at least three named manual slots. Protected act/pre-ending recovery checkpoints may exist as system load options and do not consume or rename manual slots. Saves carry schema version, difficulty, act, and ending state. |
| Presentation | Desktop-first. Mobile/responsive play is outside this completion initiative. |
| Release bar | Production playthroughs and browser scenarios must collectively reach every ending route without debug controls, save editing, or knowledge of implementation details. |

## Pack map

| File | Contract |
|---|---|
| [`01-product-contract.md`](01-product-contract.md) | Player promise, experience pillars, fun bar, scope, and full-game definition. |
| [`02-runtime-consolidation.md`](02-runtime-consolidation.md) | One authoritative runtime loop, migration boundaries, invariants, and regression coverage. |
| [`03-opening-experience.md`](03-opening-experience.md) | Title screen through the first tribute: teaching order, pacing, UI, and fixtures. |
| [`04-campaign-and-endings.md`](04-campaign-and-endings.md) | Act objectives, escalation, raids, final choice, endings, and consequence rules. |
| [`05-content-and-narrative.md`](05-content-and-narrative.md) | Dialogue depth, event content, location identity, authoring schema, and validation. |
| [`06-presentation-audio-and-ux.md`](06-presentation-audio-and-ux.md) | Art, audio, cinematics, feedback, accessibility, and settings. |
| [`07-balance-playtest-and-release.md`](07-balance-playtest-and-release.md) | Runtime-faithful simulation, playtest protocol, local traces, quality gate, and release criteria. |
| [`08-execution-plan.md`](08-execution-plan.md) | Ordered work packages, dependencies, proof required, and completion reporting. |
| [`09-gauntlet-prompt.md`](09-gauntlet-prompt.md) | Operating prompt for the gauntlet loop that implements this pack. |

## Shared status vocabulary

Every work package in `08-execution-plan.md` uses exactly one status:

- `planned` — contract exists; implementation has not started.
- `in_progress` — implementation exists but its package gate has not passed.
- `verified` — acceptance criteria and required evidence have been independently checked.
- `blocked` — progress requires a named external decision or unavailable input.

“Implemented,” “mostly done,” and “green” are not completion statuses.

## Cross-pack completion rule

A feature is complete only when all of the following are true:

1. Its engine rule is reachable through the production UI.
2. The UI communicates availability, refusal, consequence, and changed state.
3. Its result survives save/load.
4. Deterministic tests cover success and refusal branches.
5. A browser scenario proves the entire cause → intermediate state → outcome chain.
6. The relevant full-game simulation or human playtest still meets its bar.

Code that exists only as an exported pure function or isolated unit test is not a shipped
game feature.

## Explicit non-goals

- Multiplayer, online services, accounts, achievements, monetization, and live operations.
- A second renderer, engine rewrite, ECS migration, or replacement of React/Zustand.
- A mobile UI, touch-first controls, gamepad support, or console packaging.
- Voice acting or fully animated cutscenes; authored text, camera, sound, and staging are
  sufficient.
- Activating the quarantined emergent faction simulation in campaign mode.
- Expanding the campaign beyond four acts before the existing four-act run is complete.
