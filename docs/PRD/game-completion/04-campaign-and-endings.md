# Campaign and Endings Specification

## Goal

Turn the existing act, raid, ecology, fort, prescience, and ending rules into one visible
four-act campaign. Every transition must be reachable through production controls, every
objective must have player-readable progress, and every ending must follow from consequences
the player was warned about.

The campaign is authored escalation, not an emergent faction sandbox. Harkonnen pressure is
scheduled and state-driven; other factions do not capture locations autonomously in the
background.

## Shared act contract

Every act defines:

- One sentence stating the strategic problem.
- Two or three concurrent objective records with stable IDs.
- One newly introduced capability or rule.
- One visible pressure increase.
- At least one optional character or location thread.
- One concluding scene that interprets completed objectives and establishes the next act.

Objective records expose `current`, `required`, `complete`, and an optional target ID. They
do not expose raw flags. Act transitions are evaluated after daily consequences and before
a new tribute settlement is opened; a pending settlement resolves before a transition can
present its scene.

On transition:

1. Freeze simulation.
2. Commit the completed act, update the rolling autosave, and retain the protected act
   checkpoint.
3. Present an authored transition scene with character, location, camera, text, and audio.
4. Apply new unlocks and pressure rules.
5. Reveal the next objectives.
6. Save again and resume only on player confirmation.

Reloading during a transition restores the scene or the post-transition state, never a
half-applied act.

## Act 1 — Build the network

**Strategic problem:** produce enough spice to survive without spending every future on
the Emperor’s present demand.

The opening in `03-opening-experience.md` is the first portion of Act 1.

### Objectives

| ID | Requirement | Player-facing wording |
|---|---|---|
| `act1.tribute` | Three tributes paid in full | Prove this house can meet three imperial demands. |
| `act1.pledges` | Three sietches currently pledged | Earn the trust of three sietches. |
| `act1.capacity` | Own and issue at least one harvester or discover a field of density 60+ | Build an operation that can survive the next demand. |

The first two are transition requirements. `act1.capacity` is a mastery objective that
must complete before the third full tribute can be generated on Normal; if balance permits
ignoring it, the economy is undertuned.

### Unlocks and authored beats

- Pledging and harvest through the opening.
- Smuggler den referral and equipment market.
- Prospecting after acquiring and issuing an ornithopter.
- Field depletion and the first replacement-field discovery.
- Duke Leto’s explanation of the political trap and one charisma award.
- The first spice ritual and Prescience 1 after transition requirements are met.

### Pressure

Tribute and depletion are active. Hostile raids do not resolve mechanically in Act 1. One
scripted Harkonnen probe foreshadows Act 2 and reacts to the player’s current preparedness;
it cannot kill a crew or end the run.

### Transition

When all requirements hold, the ritual scene grants Prescience 1, the Duke is recalled,
and Act 2 begins. The game does not require a specific calendar day, but the Normal golden
path targets days 28–40. Delayed players remain under ordinary tribute pressure rather
than receiving an arbitrary act timeout.

## Act 2 — Hold what you built

**Strategic problem:** every crew removed from spice makes tribute harder, but undefended
or ecologically neglected sietches will not hold.

### Objectives

| ID | Requirement | Player-facing wording |
|---|---|---|
| `act2.defense` | Repel two authored raids | Prove two sietches can survive a Harkonnen raid. |
| `act2.ecology` | Raise one region to vegetation 30 | Establish one living region. |
| `act2.renown` | Reach charisma 50 | Build enough renown to command beyond the near desert. |

All three are transition requirements.

### Unlocks and authored beats

- Gurney introduces training and interprets military skill/readiness.
- Liet-Kynes introduces ecology, bulb caches, windtraps, and lost spice opportunity.
- Prescience 2 becomes available after the second raid and charisma 50, granting authored
  remote dialogue and crew reassignment but never remote pledging.
- Regions 3–4 and their residents become discoverable.
- Crew positioning and garrison forecasts become visible before the first raid.

### Raid contract

- Every raid has a target, arrival day, estimated threat band, and named warning source.
- The first raid warns three days ahead on every difficulty so the defense loop is taught.
- Later warning lead uses prescience and difficulty, but never falls below one day.
- The target-selection rule is explainable and queryable; it may prefer the weakest pledged
  sietch but cannot change after the final warning without an authored event.
- A loss applies casualties, loyalty and morale damage, and visible location aftermath.
- A win awards charisma and dialogue reactions. It does not generate a second abstract
  troop resource.

### Transition

Completing all objectives triggers a prescience scene, opens the far regions and fort
campaign, and begins Act 3. At least two tribute decisions occur during Act 2 on the Normal
golden path.

## Act 3 — Break the occupation

**Strategic problem:** military preparation now competes directly with tribute and the
ecological foundation required for a non-military victory.

### Objectives

| ID | Requirement | Player-facing wording |
|---|---|---|
| `act3.outposts` | Destroy two non-capital forts | Break two Harkonnen outposts. |
| `act3.survival` | Keep at least three sietches pledged | Hold the alliance while the war expands. |
| `act3.future` | Reach vegetation 30 in a second region or train two crews to skill 80 | Commit visibly toward ecology or military strength. |

`act3.outposts` and `act3.survival` are hard transition requirements. `act3.future` must
be completed before the second outpost assault can be confirmed; it prevents an accidental
Act 4 entry with neither ending route prepared.

### Unlocks and authored beats

- Regions 5–6 and tier-3 market stock.
- Fort scouting, force assembly, assault preview, and persistent destruction state.
- Prescience 3 after the second outpost falls: exact field density and three-day strategic
  warnings.
- A challenge sequence whose result changes losses or loyalty but does not replace the
  campaign’s crew rules.
- The Baron’s truce offer: immediate patience relief in exchange for a clearly previewed
  Fremen-loyalty loss and later dialogue consequences.

### Fort contract

- An assault requires physical player presence and eligible crews at the fort.
- Preview shows committed crews, estimated power band, defender advantage, possible loss
  band, and whether retreat is legal.
- Resolution uses the seeded campaign RNG exactly once.
- Destroyed forts alter the map/location scene, raid power, dialogue, and objective state.
- The capital remains inaccessible until two outposts are destroyed and Act 4 begins.

### Transition

Destroying the second outpost after satisfying `act3.future` triggers the imperial final
demand and enters Act 4 at a paused decision scene.

## Act 4 — Choose the future

**Strategic problem:** the Emperor makes continued compliance impossible; the player must
choose the form and cost of resistance.

### Final demand

The demand is `max(500, 2 × (current stock + projected maximum income through the next
ordinary deadline))`, computed from live crews, fields, and equipment. The scene shows the
player’s reachable amount and the demand side by side so “impossible” is demonstrated, not
asserted.

The final decision is irreversible and stored as `submit` or `defy`. Confirmation previews
which victory routes remain open, the immediate spice effect, raid behavior, and the
12-day endgame deadline.

### Submit

- Immediately ship all available spice up to the impossible demand.
- Floor patience at 1 and suspend ordinary tribute settlement for the 12-day endgame.
- Continue normal-strength raids.
- Lock the military victory route; fort assaults may defend territory but cannot produce
  liberation through the capital.
- Keep the ecological victory route open.

Submission is a costly attempt to buy the time needed for a Fremen-led ecological uprising,
not a disguised immediate loss.

### Defy

- Ship no spice and suspend ordinary tribute settlement.
- Start the 12-day Sardaukar countdown.
- Increase raid pressure according to the authored endgame profile.
- Open the capital assault once its two outposts are destroyed.
- Keep both military and ecological victory routes open until the deadline.

### Endgame deadline

Both choices create a stored deadline day. If neither victory condition is met when that
day is processed, Sardaukar take Arrakeen and the run ends with `loss_palace`. The deadline
does not tick while dialogue, a modal decision, or an ending scene is active.

## Ending contracts

### Military victory

Requirements:

- Final choice is `defy`.
- Two non-capital forts are destroyed.
- The capital fort is destroyed before the endgame deadline.

Presentation: approach/assault aftermath, surviving crew roll call, reactions from at
least three affected characters, campaign statistics, and a dedicated final image/audio
cue. The ending states the human and ecological cost from live values.

### Ecological victory

Requirements:

- At least three regions have vegetation 60+.
- Average loyalty across pledged sietches is 80+.
- At least three sietches remain pledged.
- Conditions are met before the endgame deadline under either final choice.

Presentation: visible transformed regions, Fremen assembly, reactions conditioned on
submission/defiance, campaign statistics, and a dedicated final image/audio cue.

### Patience loss

Trigger: tribute settlement reduces patience to zero before Act 4.

Presentation names the last payment, arrears, and missed opportunity. It never uses victory
language or a generic “run ended” subtitle.

### Palace loss

Trigger: the Act 4 endgame deadline expires before a victory.

Presentation reflects the chosen final path, remaining forts, and closest unmet victory
condition.

### Abandoned loss

Trigger sequence:

1. After the player has completed Act 1, pledged count reaches zero through loyalty or
   campaign consequences.
2. Start a visible three-day abandonment countdown and an urgent recovery objective.
3. If any sietch pledges again, clear the countdown.
4. If the third day processes with zero pledges, end with `loss_abandoned`.

This grace period makes the loss recoverable and prevents one unseen daily decay tick from
ending a multi-hour run.

## Ending presentation requirements

Every ending:

- Freezes time and writes the ending before presentation begins.
- Creates an ending checkpoint that reloads into the ending, not the prior combat frame.
- Uses a distinct title, scene composition, music/stinger, and at least two paragraphs of
  state-conditioned text.
- Shows duration, tributes paid/partial/missed, pledged sietches, crews lost, forts
  destroyed, regions greened, and final difficulty.
- Offers `Return to Title`, `Load Earlier Save`, and `New Campaign`.
- Never offers `Continue` into a finished campaign.

## Difficulty contract

Objectives, information, dialogue choices, and ending requirements are identical across
difficulties. Difficulty changes margins only:

- Easy: lower tribute/raid power and slower neglect; optional guidance may recommend a
  recovery action, but the underlying information is unchanged.
- Normal: authored baseline.
- Hard: higher tribute/raid power and faster neglect, but the same numerical previews,
  warning categories, and recovery actions.

Every difficulty must remain arithmetically capable of reaching both victories from its
own golden-path fixture.

## Deterministic fixtures

| Fixture | Required result |
|---|---|
| `act1-transition` | Three full tributes plus three pledges and capacity mastery trigger one ritual transition. |
| `act2-raid-loss` | Casualties, loyalty/morale damage, location aftermath, no false “repelled” award. |
| `act2-transition` | Two wins, vegetation 30, charisma 50 trigger Prescience 2 and Act 3. |
| `act3-fort-loss` | Failed assault applies seeded casualties once; fort remains; reload reproduces it. |
| `act3-transition` | Two outposts plus future-path commitment open the final demand. |
| `act4-submit-ecology` | Submission drains stock, locks military win, ecology victory remains reachable. |
| `act4-defy-military` | Defiance plus capital destruction before deadline produces military victory. |
| `act4-deadline` | No victory by deadline produces palace loss under both final choices. |
| `abandonment-recovery` | Zero pledges starts warning; a pledge on day 2 clears it without loss. |
| `abandonment-loss` | Zero pledges for all three processed days produces abandoned loss once. |

## Acceptance criteria

1. Every objective displays correct live progress and a production-UI path to its next
   increment.
2. Every act transition is atomic across save/load and has a distinct authored scene.
3. Raid defeat changes state materially; the former no-op pledge assignment is absent.
4. The final choice changes legal actions and endgame state, not only dialogue flags.
5. Both victories and all three losses pass deterministic engine fixtures and production
   browser scenarios.
6. No ending depends on a constant `palaceHeld`, constant countdown value, debug flag, or
   PoC goal.
7. Golden paths on Easy, Normal, and Hard reach both victories within the duration ranges
   accepted by `07-balance-playtest-and-release.md`.
8. A human playtester can explain why their ending occurred and name the last point at
   which another outcome was still possible.
