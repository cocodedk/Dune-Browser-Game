# Product Contract

## Goal

Deliver a 4–6 hour browser strategy-adventure in which relationships create economic
capacity, economic choices create political pressure, and political pressure forces the
player to choose what kind of ruler they will become. The game must feel authored and
reactive rather than like a dashboard over independent simulations.

The player fantasy is: **cross Arrakis, earn the Fremen’s trust, organize their scarce
people, survive imperial tribute, and turn that survival into liberation.**

## Player promise

Every important decision must visibly connect a person, a resource, and a future
consequence. The player should be able to explain both halves of a dilemma:

- “If I buy the harvester, I risk this tribute but improve every later cycle.”
- “If I pull this crew from ecology, I can pay now but lose the loyalty and ending path.”
- “If I train here, this sietch may survive the next raid but another field will run dry.”
- “If I accept the Emperor’s terms, I gain time but close the direct military route.”

A choice that changes only a hidden scalar, or a scalar whose consequence is never shown,
does not satisfy this promise.

## Experience pillars

### 1. People are the progression tree

Conversation earns trust, referrals, knowledge, and capabilities. Pledging a sietch is
not map completion: it is a relationship becoming operational capacity. Characters react
to crew losses, neglected settlements, ecological progress, tribute decisions, and act
transitions.

Pass condition: every permanent capability is introduced or interpreted by a character,
and every act objective has at least one character who can explain why it matters.

### 2. Time turns information into pressure

Travel, task changeover, field depletion, raid warnings, and tribute deadlines all consume
the same clock. Dialogue and modal decisions such as tribute settlement pause the clock so
reading is never punished. The always-visible command column and ordinary map inspection
do not pause it.

Pass condition: at least two pressure sources are visible during normal play after the
opening, and the UI can state their next consequence in player language.

### 3. Every quota cycle contains a dilemma

The tribute is not a tax animation. It forces a choice between safety now and capacity,
loyalty, military readiness, or ecology later. Full payment, deliberate partial payment,
and investment must each be rational in at least one tested state.

Pass condition: playtesters encounter their first costly trade-off before Q1 settles and
can name at least one alternative they rejected.

### 4. Travel is anticipation, not delay

Destinations must matter. Flight communicates distance, environment, and approaching
danger; arrival changes available people and actions. Discoveries, altered locations, and
character movement prevent repeated travel from becoming a loading screen with wings.

Pass condition: every required campaign trip either unlocks a new action, changes a
relationship, answers a current question, or reveals a new threat.

### 5. The world remembers

Consequences persist in the map, dialogue, economy, and ending evaluation. A broken
sietch, depleted field, destroyed fort, recruited specialist, or green region cannot be
represented only by a transient toast.

Pass condition: every campaign-changing action has a persistent world-state field, a
visible representation, and at least one later acknowledgement.

## Loop hierarchy

### Moment-to-moment: 30–120 seconds

Inspect a problem → compare options → issue one command or choose one reply → receive
immediate confirmation → see the relevant projection or relationship change.

### Expedition: 3–8 minutes

Choose a destination → travel → speak or act locally → gain information/capacity → revise
crew assignments before leaving.

### Tribute cycle: 15–30 minutes

Read the deadline and threats → allocate crews → absorb an event or raid → decide whether
to invest → settle tribute → review the changed political state.

### Act: 45–90 minutes

Learn a new strategic problem → unlock one major capability → demonstrate mastery through
two or three conjunctive objectives → make a story decision → enter a visibly changed act.

### Campaign: 4–6 hours

Build a viable network → survive escalation → choose submission or defiance → complete a
military or ecological liberation, or lose for a specific accumulated reason.

## Pacing targets

| Milestone | First-run target | Hard ceiling |
|---|---:|---:|
| Player can state the premise and current deadline | 3 min | 5 min |
| First meaningful dialogue choice | 5 min | 8 min |
| First valid pledge | 10 min | 15 min |
| First crew order and visible projection change | 12 min | 18 min |
| First costly economic choice | 20 min | Before Q1 settlement |
| First tribute settlement | 25–40 min | 45 min |
| First hostile raid with advance warning | 75–110 min | Before Act 2 midpoint |
| First irreversible ending-path signal | 150–210 min | Before Act 4 |

These are playtest targets, not timers that force progression. A player delayed by reading
or deliberate planning is not a failure; a player delayed because the next action is
unclear is.

## Decision quality bar

A major decision passes only if it has:

1. At least two legal options with materially different downstream effects.
2. Enough information to predict the category of each effect without knowing exact code.
3. A visible opportunity cost.
4. No option that dominates across all reasonable states.
5. A later acknowledgement through mechanics, dialogue, or presentation.

Difficulty may change margins and recovery room; it must not remove options or conceal
information required to make the decision.

## Full-game scope

The completion initiative includes:

- A title screen, new-run setup, continue flow, pause/settings, autosave, and manual saves.
- One guided opening ending with the first tribute decision.
- Four complete acts with visible objectives and transitions.
- Trust, pledging, crews, harvesting, prospecting, market equipment, training, ecology,
  raids, prescience, forts, and the final political choice wired through production UI.
- Two distinct victories and three losses, each reachable and presented as its own outcome.
- Authored dialogue and systemic events at the depth specified in
  `05-content-and-narrative.md`.
- The production presentation and accessibility floor in
  `06-presentation-audio-and-ux.md`.
- Runtime-faithful simulation plus human validation in
  `07-balance-playtest-and-release.md`.

## Explicit exclusions

The non-goals in `00-index.md` apply. In addition:

- No open-ended sandbox is required for release. The quarantined faction simulation may
  become a later mode, but cannot add campaign UI or balance surface now.
- No procedural quest generator or generative dialogue is required. Deterministic authored
  content is the release path.
- No collectible/crafting layer may be added merely to extend playtime.
- No system may be added until the same player need cannot be met by the existing campaign
  verbs.

## Acceptance criteria

1. Five first-time playtesters can state the current objective, deadline, and next legal
   action after ten minutes without coaching; at least four succeed.
2. Every completed tribute cycle in the golden-path playthrough records one decision that
   meets the five-part decision quality bar.
3. No required progression step depends on an event-log message that has already expired
   from view.
4. A player can complete each victory route and trigger each loss route through production
   controls without debug helpers.
5. A full campaign contains no 10-minute interval without a new decision, consequence,
   discovery, relationship response, or visible progress change, excluding paused reading.
6. Removing any one presentation layer—toast, event log, map state, or dialogue—does not
   erase the only evidence of a permanent consequence.
7. The standard repository gate passes, followed by the playtest and release evidence in
   `07-balance-playtest-and-release.md`.

## Rejection criteria

The product is not full-game complete if any of these remain true:

- A pure rule is called “implemented” without a production command path.
- The opening balance differs from the simulator’s opening state.
- A campaign panel exposes a legacy system that is not part of the primary loop.
- An act transition is communicated only as a debug-like event string.
- An ending is reachable only by teleporting, mutating flags, or editing a save.
- Content volume is increased by duplicating dialogue, locations, or encounters that do
  not introduce a new choice, reaction, or strategic context.
