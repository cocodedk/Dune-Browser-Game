# Balance, Playtest, and Release Specification

## Goal

Prove that the consolidated campaign is understandable, strategically varied, recoverable,
and technically releasable. A green build alone is not evidence that the game is
entertaining; a favorable playtest alone is not evidence that its rules are sound.

Release requires three independent kinds of evidence:

1. Deterministic engine and browser fixtures.
2. Runtime-faithful balance simulation across seeds and strategies.
3. Observed human playtests using production presentation and no coaching.

## Evidence authority

The production engine is the authority for all resource, time, objective, and ending
results. Test helpers and analysis tools may issue commands and inspect state, but may not
reimplement production formulas.

Every release claim records:

- Commit identifier and build mode.
- Save schema and content schema versions.
- Difficulty, seed, command trace, and starting fixture.
- Resulting state hash or browser artifact.
- Pass/fail verdict and reviewer.

Reports without reproducible inputs are observations, not release evidence.

## Runtime-faithful simulator

Create a headless campaign runner that imports the same initial-state factory, command
handlers, seeded random source, day runner, objective evaluator, and ending evaluator used
by the browser runtime.

The runner may:

- Select an available production command.
- Advance to the next decision or a bounded number of days.
- Read the same projections exposed to the player.
- Serialize a command trace, state snapshot, and summary metrics.

The runner may not:

- Copy yield, cost, relationship, tribute, raid, or victory formulas.
- Grant crews, pledges, fields, discoveries, or resources automatically.
- Skip dialogue or story effects without invoking their production resolution command.
- Read hidden future random outcomes when selecting a command.
- Pair metrics from different frames, states, or seeds.

If the simulator needs an action the game cannot express as a production command, that is
a runtime contract defect rather than permission to mutate state directly.

## Determinism and parity

### State hash

A canonical state hash includes all rule-relevant campaign state and excludes transient
render state, wall-clock timestamps, audio state, and object-key insertion order. It must
include the seed and random cursor so a save/reload does not silently change the future.

### Parity protocol

For each parity trace:

1. Start the browser and headless runner from the same version, difficulty, and seed.
2. Submit the same legal commands in the same order.
3. Compare state hashes after every command and processed day.
4. Save and reload at the specified checkpoint in both paths.
5. Continue through at least one tribute, raid, act transition, and ending check.

The first divergence fails the fixture and reports the preceding command, both state
summaries, and the differing paths. Later coincidental equality does not clear the failure.

Required parity fixtures cover the opening reserve line, opening investment line, one
partial tribute, one raid defense, one act transition, and each ending family. At least one
trace spans 40 processed days and reloads twice.

## Strategy agents

Strategy agents are deterministic policies over player-visible information. They exist to
find dominant, dead, and fragile paths rather than to model every human preference.

| Agent | Priority |
|---|---|
| `reserve` | Protect the next tribute first; invest only projected surplus. |
| `capacity` | Acquire pledges and crews early while preserving a visible minimum reserve. |
| `military` | Develop crew capacity, alliances, equipment, and fort progress toward military victory. |
| `ecology` | Develop fields, research, and regional vegetation toward ecological victory. |
| `social` | Maximize relationships and optional scenes before spending on expansion. |
| `reactive` | Address only the highest-priority visible warning and otherwise take the cheapest useful action. |
| `recovery` | Begin from patience 1, arrears, a damaged field, and a threatened pledge; attempt stabilization. |
| `novice` | Follow objective Show actions and default recommendations without optimizing forecasts. |

Every agent must settle tribute explicitly. No policy may depend on special-case test gifts
that a human run cannot receive.

## Seed sweep

Run every applicable strategy on Easy, Normal, and Hard across a fixed published set of at
least 100 seeds. Keep the set stable between tuning rounds; add newly discovered regression
seeds without removing inconvenient ones.

Collect at minimum:

- Ending and ending day.
- Tribute band and remaining patience for every settlement.
- Minimum and maximum spice stock.
- Pledge, crew, field, equipment, and relationship progression.
- Raids warned, defended, lost, and recovered.
- Days with no useful legal command.
- Objective completion and act duration.
- Dominant command share and unused command families.
- Save/reload parity and invariant violations.

Summaries report distributions and outliers, not only averages. A single seed with an
unrecoverable legal state is a defect even when the median run succeeds.

## Balance invariants

The exact tuning bands may change through approved balance records, but these invariants do
not:

1. The Q1 reserve and investment fixtures are both viable on Normal.
2. A player entering a tribute cycle at patience 1 has at least one visible legal recovery
   line that can survive the next two settlements when executed correctly.
3. Every required act objective and all five ending routes are reachable through production
   commands on a published seed.
4. The Act 4 imperial demand is impossible to pay from any legal state; the submit/defy
   decision cannot be bypassed through stockpiling.
5. Military and ecological victory are both viable on all three difficulties without
   relying on a single exact command trace.
6. Difficulty changes margins and pressure, not rules knowledge or outcome previews.
7. If one strategy wins more than 80% of Normal seeds while every substantially different
   strategy wins fewer than 20%, the result is a dominance defect rather than acceptable
   mastery.
8. No required command family is dominated in every ordinary state by another command with
   equal or lower cost and risk.
9. Random outcomes may change tactics, losses, or timing but may not decide a campaign
   before the player receives a readable warning and response opportunity.
10. A player who refuses an optional gift, conversation, or upgrade remains capable of
    finishing the campaign.

Violating an invariant blocks release. Changing an invariant requires updating the product
or campaign contract, not merely editing a test threshold.

## Tuning protocol

Balance changes happen in reviewable rounds:

1. Record the player problem and evidence.
2. Identify the smallest authoritative rule or content lever.
3. Predict affected strategies, acts, and metrics.
4. Change one related lever set.
5. Run focused regression seeds, then the full sweep.
6. Conduct a human check if the change affects comprehension, pacing, or perceived fairness.
7. Record the result and retain before/after evidence.

Do not tune with hidden starting gifts, simulator-only rules, or difficulty-specific
exceptions that the UI cannot explain. Do not use average stock as a substitute for tracing
the exact state and decision that caused a failure.

## Human playtest program

### Cohorts

Before release, complete:

- Five first-time-player opening sessions on Normal using the release onboarding.
- Three full campaign sessions by players who did not author the tested content,
  collectively covering both victories and at least one earned loss.
- One focused Easy run and one focused Hard run through at least Act 2.
- One keyboard-only opening and tribute cycle.
- One reduced-motion and 200%-zoom opening review.
- One save/reload recovery session using an old supported save and an interrupted current
  save.

A person may satisfy more than one accessibility or difficulty check, but the five opening
sessions must be five distinct first-time players.

### Session protocol

1. State the premise and controls available on the title screen; do not explain strategy.
2. Record screen, input, game audio, and player think-aloud only with consent.
3. The observer takes timestamped notes and does not answer gameplay questions until the
   session ends unless a technical failure prevents continuation.
4. Afterward, ask the player to explain the objective, tribute projection, their most
   important relationship, and one consequence they caused.
5. Capture a short enjoyment/debrief rating only after the explanation so prompting does
   not teach the game.

If recording consent is not given, use written observations and an exported local session
trace. No external telemetry is required for release.

### Opening measures

- Time to identify the current objective.
- Time to first meaningful command.
- Time to first pledge, crew, production order, and Q1 settlement.
- Number of observer interventions.
- Number of accidental time advances or misunderstood projections.
- Whether the player can explain why their Q1 result occurred.
- Whether they choose to continue after Q1.

At least four of five first-time players must finish Q1 without coaching within 45 minutes.
All five must identify a legal next action after the result. A repeated misunderstanding by
two players is treated as a design issue even if both eventually succeed.

### Full-campaign measures

- Total playtime and act durations.
- First and last use of each core command family.
- Decisions described as tense, obvious, arbitrary, or repetitive.
- Periods longer than ten minutes without a new decision, consequence, discovery, or story
  beat.
- Ending reached and whether its causes are understood before the reveal.
- Voluntary continuation, abandonment point, and requested replay path.

The release target is not a universal numeric fun score. It is credible evidence that each
core loop creates understood trade-offs, that no act becomes sustained busywork, and that
the ending feels caused by the player’s campaign.

## Defect severity

| Severity | Meaning | Release effect |
|---|---|---|
| Blocker | Data loss, softlock, unreachable required route, parity failure, inaccessible required action, or crash. | Zero open. |
| Critical | Rule applies twice, consequence contradicts preview, repeatable exploit destroys campaign pressure, or common flow cannot complete. | Zero open. |
| Major | Repeated comprehension failure, dominant/dead strategy, broken presentation fixture, severe pacing gap, or required fallback asset. | Zero open unless the affected scope is explicitly removed. |
| Minor | Local polish, copy, animation, or low-impact edge defect with a safe workaround. | Triaged with owner and decision. |

Scope removal must update the authoritative specifications and content manifest. Relabeling a
defect does not count as scope removal.

## Automated release gate

Run from a clean install-compatible checkout:

```bash
npm run lint
npx tsc --noEmit
npm run shop:check
npm run build
npm run test:unit
npm test
```

The release suite additionally includes:

- Runtime/headless state-hash parity fixtures.
- Opening reserve, investment, refusal, short-payment, and reload scenarios.
- Act-transition, raid, abandonment, final-choice, and five-ending scenarios.
- Save migration, corruption handling, and seed continuity.
- Keyboard, focus, reduced-motion, zoom, and DOM-summary coverage.
- Required content-reference, portrait-key, environment-key, and audio-key validation.
- Bundle, loading, frame-rate, and draw-call fixtures from
  `06-presentation-audio-and-ux.md`.

A command’s success status is not enough. Preserve its output, test report, browser console,
and required visual artifacts. Any console error, unhandled rejection, failed asset request,
or test retry is investigated before sign-off.

## Release candidate protocol

1. Freeze rule/content schema and create the candidate build.
2. Run the full automated gate and published seed sweep.
3. Run the release browser matrix and presentation fixtures.
4. Load supported old saves and current interrupted-state fixtures.
5. Complete one unassisted Normal campaign from New Campaign to credits.
6. Review open defects and verify all blocker, critical, and major items are closed.
7. Archive the evidence manifest with links to logs, captures, traces, and playtest notes.
8. Have a reviewer verify the diff and raw evidence rather than relying on the implementer’s
   completion summary.

Any rule, content-effect, save, required asset, or timing change after step 1 invalidates the
affected evidence and creates a new candidate.

## Required fixtures

| Fixture | Proof |
|---|---|
| `parity-40-day` | Browser and headless hashes match after every command/day across two reloads. |
| `seed-sweep-normal` | Published 100+ seeds for every applicable strategy with distributions and outliers. |
| `recovery-patience-one` | At least one visible line survives two settlements from the defined distressed state. |
| `route-matrix` | Every act objective, story branch, and ending family is reached through production commands. |
| `opening-first-time` | Five distinct observed sessions with timestamps, notes, and intervention count. |
| `campaign-pacing` | Three full runs with act timing, decision-gap notes, and ending-causality debrief. |
| `save-compatibility` | Supported legacy, current pending-settlement, act-transition, and ending saves load correctly. |
| `release-evidence` | Gate outputs, console logs, visual/audio fixtures, defect list, and reviewer verdict. |

## Acceptance criteria

1. The simulator imports production rules and matches browser state hashes in every parity
   fixture.
2. The published seed sweep satisfies all balance invariants with no unexplained outlier or
   simulator-only intervention.
3. Five first-time opening sessions meet the completion threshold and expose no repeated
   unresolved comprehension defect.
4. Three complete campaigns demonstrate distinct viable priorities, no sustained pacing
   gap, and understood ending causality.
5. Easy, Normal, and Hard retain the same information contract while producing documented
   pressure differences.
6. The full automated and presentation gate passes on the release candidate with no console
   error or required fallback asset.
7. No blocker, critical, or major defect remains in release scope.
8. A reviewer independently verifies the raw diff, traces, logs, and captures recorded in
   the evidence manifest.

## Rejection criteria

- A balance report copies formulas, mutates state, or grants automatic capacity.
- Measurements compare values from different seeds, frames, or saves.
- Only optimized runs are used to claim viability.
- Testers are coached through the choice the session is intended to evaluate.
- A green build or a single successful playthrough is presented as proof of entertainment.
- Required evidence is replaced by an implementer’s summary.
