# Execution Plan

## Goal

Deliver the specification pack as a sequence of independently provable game increments.
The plan fixes runtime authority and the opening before multiplying content, then grows the
campaign act by act, and finishes with production presentation, human validation, and a
reviewed release candidate.

This is an implementation order, not a claim that the current fragments already satisfy a
package. All packages begin `planned` until their own entry conditions are met and their
implementation starts.

## Operating rules

1. Use the status vocabulary from `00-index.md` without substitutes.
2. One package owns a contract boundary at a time. Avoid concurrent edits to the campaign
   day runner, state schema, save migration, command wiring, or EventBus contract.
3. Preserve the engine/render/UI ownership boundaries and the 200-line source-file limit in
   `CODEX.md`.
4. Implement vertical paths: engine command → EventBus wiring → UI → save/load → browser
   evidence. Do not declare a package complete because its pure functions exist.
5. Keep a running decision record for any accepted change to canonical numbers, content
   floors, routes, or non-goals. Update every affected contract in the same change.
6. Verify the diff, raw test output, and browser artifacts. An implementation report is not
   evidence.
7. Do not begin bulk dialogue, asset, or audio production until the consuming schema and
   presentation bible are verified.

## Milestones

| Milestone | Player-visible result | Cumulative packages |
|---|---|---|
| M1 — Coherent opening | New Campaign through Q1 is understandable, balanced, saveable, and free of duplicate rules. | WP00–WP04 |
| M2 — Finishable campaign | One production path reaches both victories and all three losses across four acts. | WP00–WP07 |
| M3 — Content complete | Release-floor locations, characters, dialogue, events, and consequence states are integrated. | WP00–WP10 |
| M4 — Presentation complete | Production UX, scenes, art, audio, accessibility, and performance pass in game. | WP00–WP12 |
| M5 — Release candidate | Balance, human playtests, compatibility, full gate, and independent evidence review pass. | WP00–WP15 |

## Work-package board

| ID | Package | Status | Depends on | Primary contract |
|---|---|---|---|---|
| WP00 | Baseline and contract fixtures | `verified` | — | `02`, `03`, `04` |
| WP01 | Runtime authority and seeded time | `verified` | WP00 | `02` |
| WP02 | Command, pledge, crew, and tribute consolidation | `planned` | WP01 | `02` |
| WP03 | Title, new run, and opening through Q1 | `planned` | WP02 | `03` |
| WP04 | Runtime-faithful runner and opening balance | `planned` | WP03 | `07` |
| WP05 | Act/objective and consequence framework | `planned` | WP02 | `04`, `05` |
| WP06 | Acts 1–2 vertical campaign | `planned` | WP04, WP05 | `04`, `05` |
| WP07 | Acts 3–4 and five ending routes | `planned` | WP06 | `04`, `05` |
| WP08 | Content tools, schemas, and validation | `planned` | WP05 | `05` |
| WP09 | Release-floor authored content | `planned` | WP07, WP08 | `05` |
| WP10 | Consequence and continuity integration | `planned` | WP09 | `04`, `05` |
| WP11 | UX, accessibility, and save/settings shell | `planned` | WP03, WP05 | `06` |
| WP12 | Production scenes, assets, and audio | `planned` | WP09, WP11 | `06` |
| WP13 | Full balance and pacing pass | `planned` | WP10, WP12 | `07` |
| WP14 | Human playtests and corrective rounds | `planned` | WP13 | `07` |
| WP15 | Release hardening and sign-off | `planned` | WP14 | `07` |

`02` in this table means `02-runtime-consolidation.md`, and likewise for the other numbered
pack files.

## WP00 — Baseline and contract fixtures

### Scope

- Preserve reproducible current-state saves and browser captures for the opening, one
  pledge, one legacy payout, one tribute, a raid, current act state, and each currently
  reachable ending path.
- Add characterization tests around behavior that will be deliberately removed, so the
  consolidation diff proves which authority changed.
- Inventory campaign imports of legacy faction simulation, sietch threshold production,
  PoC goals, `player.troops`, `player.influence`, and unseeded randomness.
- Record the current content and asset key manifests using the counting rules in `05`.

### Exit proof

The baseline artifacts reproduce on the recorded commit, the legacy-authority inventory has
an owner for every removal, and later packages can compare behavior without relying on
memory or screenshots from unrelated frames.

## WP01 — Runtime authority and seeded time

### Scope

- Establish the versioned canonical campaign state, initial-state factory, stored seed and
  random cursor, and ordered day runner.
- Make act/endgame state the only victory authority.
- Quarantine faction simulation and PoC goals from campaign construction and day updates.
- Implement canonical state serialization, migration scaffolding, and state hashing.
- Make multi-day catch-up equivalent to repeated one-day processing.

### Exit proof

The `new-campaign-normal`, deterministic RNG, multi-day catch-up, save/reload, and no-faction
fixtures in `02` pass through production engine entry points. No campaign import or saved
field depends on the retired goal authority.

## WP02 — Command, pledge, crew, and tribute consolidation

### Scope

- Route every mutation through structured engine commands and outcomes.
- Make `TroopGroup` work the sole campaign production authority; stop legacy sietch and
  village payouts.
- Implement atomic present-at-sietch pledge, deterministic crew creation, assignment,
  equipment ownership, casualties, and refusal reasons.
- Implement pausing tribute settlement, patience bands, loss-before-resume behavior, and
  post-Q1 auto-shipment.
- Migrate or reject legacy saves explicitly and remove duplicate player resource fields.

### Exit proof

Every runtime fixture and acceptance criterion in `02` passes. A browser trace demonstrates
one pledge, one crew harvest, one reassignment, one tribute settlement, and one rejection,
with exact state-hash continuity through reload and no duplicate payout.

## WP03 — Title, new run, and opening through Q1

### Scope

- Build title, difficulty selection, new-run confirmation, Continue, load, pause, and
  opening save behavior.
- Implement the seven opening beats, progressive disclosure, objective Show actions,
  projections, refusal/recovery copy, and settlement modal in `03`.
- Ensure the reserve and investment lines are both visible choices rather than hidden test
  paths.
- Add keyboard, focus, skip, reload-pending, and no-softlock coverage.

### Exit proof

All opening fixtures pass in the release browser. Five internal dry runs can complete Q1
without debug state, and the implementation is ready for first-time-player testing after
production presentation is integrated. M1 is reached only when WP04 also proves the
arithmetic.

## WP04 — Runtime-faithful runner and opening balance

### Scope

- Build the headless runner as a client of production commands and queries.
- Add browser/headless state-hash parity and command-trace export.
- Implement reserve, capacity, reactive, novice, and recovery strategy agents first.
- Run published seed sweeps for the opening and first two tribute cycles.
- Tune Q1 and early progression using the protocol in `07`, preserving both opening lines.

### Exit proof

Opening parity is exact, Normal reserve/investment paths remain viable, the patience-1
recovery fixture survives two settlements, and no simulator mutation bypasses a production
command. M1 is verified.

## WP05 — Act/objective and consequence framework

### Scope

- Implement stable objective records, conjunction rules, authored transitions, atomic
  scene effects, and event/content effect validation.
- Implement the authored raid/fort pressure seam without enabling emergent faction AI.
- Establish content, character, location, dialogue, event, and consequence-state schemas.
- Add route/reference validation and deterministic effect fixtures.

### Exit proof

A compact fixture campaign can enter all four acts, resolve a raid, apply a permanent
consequence, and select a placeholder-free test ending through production commands. Invalid
content references fail validation with the exact source record.

## WP06 — Acts 1–2 vertical campaign

### Scope

- Integrate Act 1 tribute, pledge, and capacity objectives and its ritual/departure scene.
- Integrate Act 2 exploration, prescience, authored threat, optional opportunity, and
  transition contracts.
- Author only the content necessary for complete vertical routes plus explicit fallback
  coverage; bulk content remains WP09.
- Add save checkpoints, browser route scenarios, and strategy-agent actions for the new
  systems.

### Exit proof

A new run reaches Act 3 without debug controls through at least two materially different
strategies. Optional refusal remains viable, persistent consequences survive reload, and
act duration falls within the product pacing envelope in internal runs.

## WP07 — Acts 3–4 and five ending routes

### Scope

- Integrate Act 3 outposts, escalating raids, ecology/military setup, and final imperial
  demand.
- Implement atomic submit/defy effects, the 12-day endgame deadline, two victory checks,
  and three loss checks.
- Implement abandonment countdown/recovery and freeze all simulation on ending.
- Present each route with production-state statistics even before the final art pass.

### Exit proof

The route matrix reaches military victory, ecological victory, economic loss, abandonment,
and deadline loss through production commands. The impossible demand is proved across
legal seed-sweep states, all endings save/reload safely, and no PoC victory can interrupt
the campaign. M2 is verified.

## WP08 — Content tools, schemas, and validation

### Scope

- Build small authoring validators and reports for IDs, references, portraits, location
  keys, flags, choice effects, reachability, consequence variants, and content counts.
- Provide deterministic preview fixtures for dialogue nodes and event effects.
- Define the visual bible and asset manifests needed before bulk image/audio work begins.
- Make missing release-floor content visible in one generated manifest without treating raw
  line count as content depth.

### Exit proof

Malformed or unreachable records fail locally; valid records can be previewed in the
production dialogue/location composition; the manifest calculates all release-floor counts
using `05`; and the visual bible has an in-game reference capture.

## WP09 — Release-floor authored content

### Scope

- Reach the retained release floors for distinct locations, core/supporting characters,
  reachable character states, dialogue, scripted/systemic events, spice fields, and major
  scenes.
- Fill the four-act narrative spine and each core character’s multi-act arc.
- Give every location an identity contract and every irreversible choice a previewed,
  persistent consequence.
- Complete an IP/license decision before any public or commercial distribution work.

### Exit proof

Content validation meets every floor in `05`, every required record is reachable on at
least one legal route, no debug ID or generic release copy remains, and voice/continuity
review passes across all acts and endings.

## WP10 — Consequence and continuity integration

### Scope

- Exercise the complete consequence matrix across scenes, relationships, locations,
  resources, objectives, later acknowledgements, and endings.
- Add cross-act callbacks, relationship pressure responses, refusal variants, and outcome
  acknowledgements where play traces reveal silent state changes.
- Verify save/reload at every act boundary and before/after every irreversible choice.

### Exit proof

Every permanent effect has an immediate response, persistent representation, later
acknowledgement, and ending relevance where specified. Route sweeps show no contradictory
continuity or dead branch. M3 is verified.

## WP11 — UX, accessibility, and save/settings shell

### Scope

- Implement the information hierarchy, contextual command column, durable history,
  projections, warnings, and four-step action feedback in `06`.
- Finish save slots, autosave/checkpoint behavior, corruption/migration messages, settings,
  mixer controls, audio unlock status, and return-to-title protection.
- Add destination and resident DOM alternatives, keyboard behavior, focus management,
  contrast, zoom, reduced-motion, and canvas summaries.

### Exit proof

The opening and one full tribute cycle work keyboard-only; required accessibility fixtures
pass; save corruption never silently resets a run; and every core command exposes cost,
refusal, result, and persistent consequence without a debug panel.

## WP12 — Production scenes, assets, and audio

### Scope

- Release character, landscape, vehicle, world-state, UI, cinematic, music, ambience,
  stinger, and action-audio assets through their defined pipelines.
- Integrate lazy loading, mixer behavior, skip-safe atomic scenes, and production fallbacks.
- Run noon/golden-hour/dusk look gates, stress layouts, audio-key audit, accessibility
  presentation checks, and performance measurements in the real game.

### Exit proof

Every fixture and acceptance criterion in `06` passes. No required portrait/audio fallback
appears, no location family is visually ambiguous in blind review, and bundle/frame/draw-call
budgets pass. M4 is verified.

## WP13 — Full balance and pacing pass

### Scope

- Complete all strategy agents and 100+ published seeds on all three difficulties.
- Analyze outliers, dominated commands, dead days, act duration, tribute/raid pressure,
  ending reachability, and refusal viability.
- Tune in recorded rounds and rerun parity, route, save, presentation, and focused human
  checks after affected changes.

### Exit proof

All balance invariants pass with reproducible traces. Both victories have multiple legal
lines, every loss is caused and readable, and no unexplained softlock, dominant path, or
ten-minute systemic pacing gap remains in seed or internal full-run evidence.

## WP14 — Human playtests and corrective rounds

### Scope

- Run the cohorts and no-coaching protocol in `07` on release presentation.
- Classify repeated comprehension, pacing, fairness, continuity, and motivation defects.
- Make focused corrections, rerun affected automated evidence, and repeat human checks when
  the player-facing hypothesis changed.

### Exit proof

The first-time opening threshold, three full-campaign observations, difficulty checks,
accessibility sessions, and save recovery session all pass. Players understand the cause of
their tribute and ending outcomes, and no blocker, critical, or major playtest defect
remains.

## WP15 — Release hardening and sign-off

### Scope

- Freeze schemas/content, build the candidate, and execute the release protocol in `07`.
- Verify supported browser behavior, old/current saves, asset keys, console output, bundle
  budgets, performance, accessibility, and one unassisted Normal campaign.
- Archive the evidence manifest and have a reviewer inspect the diff and raw artifacts.

### Exit proof

The complete repository gate and release suite pass on the same candidate commit, the
defect bar is satisfied, all evidence is reproducible, and the independent reviewer records
`verified`. M5 is verified; only then is the game described as release-complete.

## Safe parallel work

Parallel work is allowed only when ownership is disjoint and the dependency output is
stable:

- During WP01–WP03, writers may draft content in isolated manifests, but integration waits
  for WP05/WP08 schemas.
- The visual bible and audio palette may be developed during WP05–WP07; production asset
  batches wait for WP08 and their consuming scene/location contract.
- After WP08, separate content batches may proceed by act or character if one continuity
  owner reviews cross-file flags and effects before merge.
- Asset shops may run independently after their specs are frozen, but game integration and
  in-game look gates remain serialized by asset family.
- Accessibility review may begin on the opening during WP03 and repeats on the complete
  shell in WP11/WP12.

Never run parallel balance tuning against different rule commits and combine the results.

## Critical path

```text
WP00 → WP01 → WP02 → WP03 → WP04
WP02 → WP05 → WP06 → WP07
WP05 → WP08
WP07 + WP08 → WP09 → WP10
WP03 + WP05 → WP11
WP09 + WP11 → WP12
WP10 + WP12 → WP13 → WP14 → WP15
```

The campaign can become finishable before bulk art is complete, but it cannot become
release-complete before presentation and human-playtest evidence join the critical path.

## Risk register

| Risk | Early signal | Required response |
|---|---|---|
| Duplicate runtime survives | One action changes two resource paths or a legacy import remains. | Stop feature work; return to WP01/WP02 and add a regression fixture. |
| Simulator drifts | Browser/headless hash mismatch or test-only mutation appears. | Invalidate balance results after divergence; fix parity before tuning. |
| Content multiplies rework | Bulk records depend on unstable flags/effects. | Freeze authoring; complete WP05/WP08 contract and migrate deliberately. |
| Opening teaches false rules | Tutorial text or gift bypasses production rules. | Treat as blocker for M1; remove special path and retest first-time flow. |
| One ending is decorative | Route changes only final title/image. | Add distinct prerequisites, pressure, consequences, and callbacks in WP07/WP10. |
| Asset pass overruns bundle | Late acts load at title or shop chunk exceeds budget. | Profile imports; split/lazy-load/reduce before accepting the asset. |
| Strong visuals hide weak pacing | Long stretches lack decisions while screenshots look finished. | Use trace/playtest timing; revise event and command cadence before more polish. |
| Reports overstate proof | Result lacks trace, exact frame, raw output, or reviewer. | Re-run on recorded commit and attach the evidence; do not advance status. |

## Package completion report

Every package handoff contains:

1. Package ID, status, commit, and specification clauses addressed.
2. Files changed, including migrations and generated manifests.
3. Exact commands run and their raw artifact locations.
4. Production UI path used for the browser proof.
5. Before/after state hashes or captures taken from the same trace and frame.
6. Known exclusions, defects, and downstream contract changes.
7. Independent reviewer verdict against the diff and package exit proof.

If any required item is absent, the package remains `in_progress`.

## Plan acceptance criteria

1. Work starts with runtime consolidation and a truthful opening rather than bulk content or
   polish.
2. Every package has explicit dependencies, player-visible scope, and exit proof.
3. The critical path reaches both victories and all three losses before release polishing
   is accepted as completion.
4. Simulator parity precedes balance claims; production presentation precedes human release
   claims.
5. Content and assets cannot enter bulk production before their schemas, manifests, and
   look contracts are stable.
6. M5 requires the same-candidate gate, full playthrough, compatibility evidence, and
   independent review.

## Plan rejection criteria

- A package advances on an implementer summary without raw evidence.
- Bulk content or assets begin while their consuming runtime contract is changing.
- A milestone is called complete because a pure engine route exists without production UI.
- Balance tuning uses copied formulas, different commits, or unmatched frames.
- Release is declared before first-time-player and full-campaign observations pass.
