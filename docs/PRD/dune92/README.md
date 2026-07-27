# DUNE92 — Plan Tree

Re-creation of the **Cryo Interactive Dune (1992)** adventure/strategy shape, in the browser, in 3D.

This directory is the canonical plan. `docs/PRD/impl/` describes the previous
(faction grand-strategy) direction and is now historical.

## Reading order

| Doc | What it is |
|---|---|
| [00-overview.md](00-overview.md) | Target, scope tiers, what survives from the current codebase, ground rules |
| [01-design-systems.md](01-design-systems.md) | Game design spec — entities, tasks, economy, acts, characters |
| [02-architecture-3d.md](02-architecture-3d.md) | three.js architecture, Phaser removal, asset pipeline, perf budget |
| [03-stage-index.md](03-stage-index.md) | Stage dependency graph and status board |
| `stages/NN-*.md` | One file per stage — the build unit handed to Sonnet |

## Roles

- **Claude (Opus)** — driver. Sequences stages, writes/updates specs, verifies every
  Sonnet deliverable through the full gate, integrates, keeps the plan honest.
- **Fable** — planner/advisor. Designs, reviews, and critiques. Never writes code.
- **Sonnet** — implementer. Builds one stage at a time against its spec file.

## Stage map

**Phase 0 — Foundation and the 3D look** (de-risks the visual identity first)

| # | Stage | Est. tasks |
|---|---|---|
| 01 | [Runtime driver extraction](stages/01-runtime-driver.md) | 2 |
| 02 | [three.js infrastructure](stages/02-threejs-infrastructure.md) | 3 |
| 03 | [Strategic mode + sand look](stages/03-strategic-mode.md) | 4 |
| 04 | [Phaser removal](stages/04-phaser-removal.md) | 2 |

**Phase 1 — Act 1 engine**

| # | Stage | Est. tasks |
|---|---|---|
| 05 | [Clock pause + Location migration](stages/05-location-model.md) | 3 |
| 06 | [Characters + dialogue flags](stages/06-characters-dialogue.md) | 3 |
| 07 | [Sietch loyalty, pledge, gifts](stages/07-sietch-loyalty.md) | 3 |
| 08 | [Troop groups + harvest + spice fields](stages/08-troops-harvest.md) | 4 |
| 09 | [Quota, patience, arrears](stages/09-quota-pressure.md) | 3 |
| 10 | [Charisma + act state machine](stages/10-acts-charisma.md) | 3 |
| 11 | [Prospecting + smuggler market](stages/11-prospect-market.md) | 3 |

**Phase 2 — Cinematic modes**

| # | Stage | Est. tasks |
|---|---|---|
| 12 | [Flight mode](stages/12-flight-mode.md) | 3 |
| 13 | [Location dioramas](stages/13-location-mode.md) | 3 |
| 14 | [Conversation mode](stages/14-conversation-mode.md) | 2 |

**→ ACT 1 VERTICAL SLICE SHIPS HERE**

**Phase 3 — Full game**

| # | Stage | Est. tasks |
|---|---|---|
| 15 | [Combat, raids, training](stages/15-combat-training.md) | 4 |
| 16 | [Ecology layer](stages/16-ecology.md) | 3 |
| 17 | [Prescience L2/L3](stages/17-prescience.md) | 2 |
| 18 | [Acts 3–4, forts, endings](stages/18-endgame.md) | 4 |
| 19 | [Content pass](stages/19-content-pass.md) | 6 |
| 20 | [Art and audio production](stages/20-assets.md) | 6 |
| 21 | [Balance and playtest](stages/21-balance.md) | 4 |

## Spec depth policy

Stages 01–11 are specced in full now — they are the near-term build queue.
Stages 12–21 are outlined and get specced **just before build**, because earlier
stages will move their ground. Do not hand Sonnet an outline-level stage.
