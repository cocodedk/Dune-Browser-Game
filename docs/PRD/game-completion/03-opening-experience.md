# Opening Experience Specification

## Goal

Teach the complete relationship → pledge → crew → production → tribute loop in 25–40
minutes without a detached tutorial level. The player must understand the immediate
political problem, make one meaningful relationship choice, issue one economically useful
order, and settle Q1 before the opening contract ends.

The opening is complete only when a first-time player can continue into Act 1 without
needing external instructions or an event-log archaeology session.

## Starting contract

A new campaign begins with:

| State | Value |
|---|---|
| Location | Arrakeen |
| Day/time | Day 0, morning presentation; simulation paused for the briefing |
| Spice | 60 |
| Pledged sietches | 0 |
| Operational crews | 0 |
| Charisma | 20; capacity for two pledges |
| Prescience | 0 |
| Q1 | 90 spice due on day 12 |
| Known destinations | Arrakeen, Red Wall Sietch, Sietch Tabr, and only routes valid for the opening |
| Current act | Act 1 |
| Current objective | `act1.receive_briefing` |
| Difficulty | Chosen on the new-run screen; Normal is the default |

No AI faction event, autonomous territorial capture, raid, worm attack, field depletion,
or loyalty neglect may fire before the briefing ends.

## Title and run setup

The title screen appears before the renderer begins advancing campaign time.

Required controls:

- `Continue` when a valid autosave or most-recent manual save exists.
- `New Campaign`.
- `Load Campaign` with slot metadata and corrupt/incompatible-state handling.
- `Settings`.
- A visible version identifier suitable for bug reports.

`New Campaign` opens a setup panel with Easy, Normal, and Hard. Each option explains its
player-facing effect in one sentence; internal multipliers are available in a details
expander. Difficulty is written once into campaign state and cannot change until another
new campaign begins.

Guidance callouts default on and may be disabled in setup or settings. Disabling guidance
removes coach marks and highlighted controls; it does not skip dialogue, flags, travel,
pledges, or tribute.

## Progressive disclosure

The opening does not show every campaign panel on frame one.

| UI surface | First appears |
|---|---|
| Position, pause, save, objective | Initial Arrakeen view |
| Tribute ledger | Thufir explains the first demand |
| Destination list/map controls | Duke briefing completes |
| Crew panel | First pledge creates a crew |
| Market | Smuggler den is discovered and entered |
| Ecology | Liet-Kynes unlocks the task in Act 2 |
| Training | Gurney unlocks the task in Act 2 |
| Strongholds | Act 3 begins |
| Ending-path display | Final choice is made in Act 4 |

The emergent faction panel, aggregate troop count, and PoC village-control counter never
appear in campaign mode.

## Teaching sequence

### Beat 1 — The assignment

**Target:** 0–5 minutes.

1. The opening frames Arrakis, the imperial tribute, and why failure threatens the house.
2. Duke Leto gives the immediate objective: understand the demand, then earn the trust of
   Red Wall Sietch.
3. The player receives at least two responses that establish tone but do not conceal a
   mechanical trap.
4. Completing the exchange sets `briefing.complete` and advances the objective to
   `act1.read_ledger`.

The first conversation must show a finished character presentation, not a text-only label
where a portrait belongs.

### Beat 2 — Read the pressure

**Target:** 3–8 minutes.

Thufir introduces the tribute ledger. The ledger reveals in this order:

1. Q1 amount and due day.
2. Current stock.
3. Projected stock at the deadline.
4. Projected surplus/shortfall.
5. Patience and the consequences of full, partial, and short payment.

With no crew, the projection reads “60 available; short by 30” rather than “0 income” as
the only message. Thufir states that gaining a crew requires a sietch pledge. The next
objective becomes `act1.travel_red_wall`.

### Beat 3 — First expedition

**Target:** 6–12 minutes.

- Red Wall is highlighted both on the globe and in an accessible destination list.
- Selecting it previews travel time, why it is reachable, who is known there, and the
  current objective association.
- Confirming travel starts the normal flight sequence. The first flight may not be skipped
  during its first three seconds; after that, Escape and a visible Skip control are legal.
- Arrival opens the Red Wall location view with `Speak` and `Depart` controls and names the
  available resident.

The travel tutorial teaches selection, confirmation, arrival, and leaving. It does not
teach camera orbit before the player knows why they are looking at the planet.

### Beat 4 — Earn and verify trust

**Target:** 9–15 minutes.

Stilgar’s opening state begins close enough to the pledge threshold that either substantive
reply reaches it. The two replies must differ in later acknowledgement—solidarity versus
transaction—not in whether the tutorial can continue.

After dialogue:

- The sietch panel shows loyalty numerically and visually.
- The pledge threshold of 60 and the charisma capacity of 2 are visible.
- The Pledge control is enabled only when both checks pass.
- Selecting it opens a concise confirmation that a pledge grants responsibility for one
  crew; it is not an unlabelled ownership button.

On confirmation the pledge command executes the atomic contract in
`02-runtime-consolidation.md`. The objective becomes `act1.order_first_harvest`.

### Beat 5 — Put people to work

**Target:** 11–18 minutes.

The new Red Wall crew appears with:

- Home, current location, size, morale, and relevant skill.
- One recommended known field.
- A projected daily yield range; exact density remains hidden until the authored knowledge
  gate allows it.
- The one-day changeover consequence before confirmation.

Issuing the first harvest order immediately changes the ledger projection and shows the
cause: crew name, field, changeover, then expected contribution. The projection must never
claim the crew is already producing while changeover remains.

The objective becomes `act1.prepare_q1` and presents two valid plans rather than one forced
instruction:

- Keep reserves and let the first crew work.
- Visit Sietch Tabr, improve trust, spend a 20-spice gift if needed, and gain a second crew
  for stronger long-term income.

### Beat 6 — First dilemma

**Target:** 15–30 minutes.

The Tabr route teaches that relationships can cost the same resource used for tribute.
Chani and Ramallo provide the context; a gift has a previewed cost and loyalty gain. The
player can decline and remain viable through Q1, or invest and gain a second crew if their
charisma cap permits.

The opening must not script the decision. Both plans are legal, simulated, and acknowledged
at settlement. The ledger continuously explains whether the current plan is on track.

### Beat 7 — Settle Q1

**Target:** 25–40 minutes; hard ceiling 45.

At day 12, the campaign pauses and opens the pending settlement decision. It shows:

- Due, stock, and any amount already committed.
- Full-payment result.
- Minimum partial payment and resulting arrears.
- A custom amount control bounded by available spice and total due.
- The patience consequence of the selected amount before confirmation.

The player confirms once. Count Fenring delivers a state-specific response; Thufir gives a
one-paragraph operational summary. Auto-shipment becomes available but remains off until
the player opts in.

Q1 completion sets `opening.complete`, autosaves, removes opening coach marks, and reveals
the remaining Act 1 objectives. It does not interrupt play with a generic victory overlay.

## Objective presentation

The active objective surface shows:

- One primary sentence beginning with a verb.
- At most two optional substeps.
- A `Show` action that selects or frames the relevant person/location/control.
- Progress where numeric progress is meaningful.
- A `Why` expander containing the latest character-authored explanation.

Completed objectives move into a compact history. At no point may the only current goal be
“Villages 0/19,” a raw flag name, or an act ID.

## Guidance behavior

- A coach mark targets one control and never blocks the rest of the screen.
- It disappears when the player performs the action, not after a timer.
- It can be dismissed; the objective and normal disabled-reason UI remain.
- Re-enabling guidance resumes at the current unmet step.
- No guidance relies only on color, animation, or a canvas marker.

## Recovery and refusal behavior

| Player action | Required response |
|---|---|
| Attempts pledge below 60 loyalty | Control disabled with current/required loyalty and at least one valid recovery route. |
| Reaches charisma cap | Explain cap, current charisma, next known source, and that existing pledges remain safe. |
| Orders prospecting without a thopter | Refuse before confirmation and identify the equipment/location path. |
| Waits with no crew order | Ledger remains short; objective points to the idle crew without automatically assigning it. |
| Cannot fully pay Q1 | Partial/custom settlement remains legal; explain arrears and patience, then continue the campaign. |
| Closes during travel or settlement | Autosave restores the same travel or pending-decision state without duplication. |
| Dismisses every coach mark | All steps remain discoverable through objective, destination, resident, crew, and ledger UI. |

The opening contains no unrecoverable loss. A disastrous Q1 may reduce patience and create
arrears, but it must lead into a documented recovery state rather than a forced restart.

## Deterministic fixtures

| Fixture | Branch | Required result |
|---|---|---|
| `opening-reserve-line` | Pledge Red Wall, harvest, keep 60-spice reserve | Q1 can be settled without a second pledge; player exits with less capacity but no softlock. |
| `opening-invest-line` | Pledge Red Wall, spend gift at Tabr, pledge and order second crew | Higher projected income, lower immediate stock, both costs visible before Q1. |
| `opening-low-trust` | Force Red Wall loyalty to 59 | Pledge refused; current/required values and dialogue recovery shown. |
| `opening-charisma-cap` | Fill both pledge slots before selecting a third | Pledge disabled with next charisma source; no mutation. |
| `opening-short-payment` | Reach day 12 below 54 spice | Short band and patience loss previewed, applied once, campaign continues. |
| `opening-partial-payment` | Pay exactly 54 of 90 | Partial band, patience held, 45 arrears after surcharge, next deadline correct. |
| `opening-reload-pending` | Reload during Q1 modal | Same selected amount defaults, no elapsed time, one final settlement. |
| `opening-guidance-off` | Start with coach marks disabled | All required actions remain visible and completable. |

## Browser scenarios

At minimum, Playwright covers:

1. New Campaign → choose Normal → briefing → ledger → Red Wall flight → Stilgar dialogue →
   pledge → crew order → projection change.
2. The reserve line through Q1 settlement and opening autosave.
3. The investment line through Tabr gift, second pledge, second crew, and Q1 settlement.
4. A refused pledge and its displayed recovery path.
5. Reload during flight and reload during pending settlement.
6. Keyboard-only traversal of title, setup, dialogue choices, destination list, pledge,
   crew order, and settlement.

Each scenario asserts engine state and visible text after every meaningful action. A final
screenshot without intermediate-state assertions is insufficient.

## Acceptance criteria

1. The starting contract matches the production world, save, UI, and simulator exactly.
2. Four of five first-time playtesters complete Q1 without coaching within 45 minutes.
3. Four of five can state why the second pledge is attractive and why it is risky.
4. Every required opening action has a visible legal path without clicking a canvas marker.
5. Pledge and settlement commands are idempotent across double-click and reload.
6. The reserve and investment fixtures both remain viable on Normal difficulty.
7. No faction-simulation event or campaign-ineligible panel appears during the opening.
8. Completion reveals Act 1 objectives, autosaves, and resumes time without a victory
   overlay or debug-like transition text.
