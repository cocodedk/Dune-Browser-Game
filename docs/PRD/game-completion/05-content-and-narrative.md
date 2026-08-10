# Content and Narrative Specification

## Goal

Supply enough authored people, places, events, and reactions to sustain the four-act
campaign without repetition or mechanical orphaning. Content must teach systems, frame
decisions, acknowledge consequences, and make destinations feel meaningfully different.

This is not a quota to generate text. A node, location, or event counts only when it adds
a new choice, strategic context, relationship response, discovery, or consequence.

The current cast uses protected Dune names and setting elements. This pack treats the game
as the repository’s documented personal project. Public or commercial distribution requires
a separate licensing decision or a complete original-setting/name pass; passing the game
completion gate does not resolve that IP boundary.

## Baseline and release floor

The 2026-08-10 static audit found roughly 19 locations, 20 speaking characters, 37 dialogue
states, 140 dialogue nodes, and 5 authored spice fields. That is enough to prove the
structure, not enough for a 4–6 hour campaign.

The release floor is:

| Content | Release floor | Quality constraint |
|---|---:|---|
| Visitable locations | 30 | Every location meets the identity contract below. |
| Core speaking characters | 14 | Each has a campaign-spanning mechanical role and voice sheet. |
| Supporting speaking characters | 4–6 | Each owns at least one location/system perspective not covered by a core role. |
| Dialogue states | 85 | Selected by meaningful world conditions, not duplicate greetings. |
| Dialogue nodes | 500 minimum; 650 target | No branch exists only to restate its parent. |
| Scripted campaign events | 60 | At least 10 per act, with remaining events allocated to opening/endings. |
| Systemic event templates | 15 | Each has state-conditioned variants and cooldown/once semantics. |
| Authored spice fields | 18 | Distributed across six strategic regions with distinct risk/reward profiles. |
| Major authored scene families | 8 | Opening, three act transitions, final choice, two victory families, and one loss family. |

Scene-family count is an authoring floor, not permission to reuse one finished scene. The
opening family includes title atmosphere and the Arrakeen assignment, while the loss family
expands into three distinct presentations under `06-presentation-audio-and-ux.md`.

Existing characters above the 14-role core are retained only if they pass the supporting
character contract. The solution is not adding more names; it is giving the existing cast
enough state, agency, and consequence.

## Narrative spine

The campaign tells one continuous arc:

1. **Assignment:** Arrakis appears to be a production problem; the tribute reveals it as a
   political trap.
2. **Alliance:** Fremen trust turns isolated survival into a network, but every alliance
   creates responsibility.
3. **Stewardship:** Military and ecological needs compete with extraction; the player’s
   allocation choices define their rule.
4. **Resistance:** The occupation can be broken by force or made untenable through a
   united, living desert.
5. **Choice and consequence:** Submission or defiance changes the price and available
   route, while the accumulated world determines the ending’s meaning.

No act may reset the player’s motives or treat previous losses, payments, pledges, or
environmental changes as if they did not occur.

## Voice and style bible

Write one style-bible entry per speaking character before expanding their dialogue. Each
entry contains:

- Mechanical role and story function.
- What the character wants from the player.
- What they fear, refuse, and misunderstand.
- Sentence length, formality, metaphor domain, and words they avoid.
- How their register changes under trust, anger, grief, victory, and defeat.
- Two positive and two negative example lines written for this project.
- Topics and decisions they must acknowledge by act.

Global dialogue rules:

- Prefer concrete observations and demands over lore exposition.
- A node presents one dramatic idea; choices answer that idea.
- Choice text states the player’s intent. The resulting line may surprise, but the intent
  may not be inverted.
- Mechanical consequences are previewed by category when consequential: trust, cost,
  route, readiness, or ending path. Exact numbers appear only where the character would
  plausibly know them or the UI supplies them beside the dialogue.
- No character explains a UI control by name unless they are explicitly teaching the
  underlying ledger/order process.
- Repeated visits use state-specific lines; a generic greeting is the final fallback, not
  the dominant campaign experience.

## Character contract

Every core character owns:

1. An unconditional reachable fallback.
2. An introduction that establishes desire and mechanical relevance.
3. At least one state in every act where the character is present.
4. A reaction to at least two campaign-wide consequences relevant to them.
5. One optional personal thread with a setup, player decision, and later acknowledgement.
6. One victory or loss reaction for every ending family in which they plausibly survive.

Supporting characters own an introduction, one evolving state, one system/location
perspective, and at least one later acknowledgement.

Characters are not permanently fixed to their static data location. A deterministic
character-state query resolves current location, availability, recruited status, and any
temporary absence from world flags and act state. The UI resident list, conversation mode,
and dialogue selector use that same query.

## Required core-role coverage

Names may follow the current cast, but these functions must each have one accountable
owner:

| Role | Content responsibility |
|---|---|
| House leader | Opening assignment, political trap, Act 1 transition. |
| Steward | Ledger, settlement, arrears, projections, recovery plans. |
| Imperial envoy | Patience voice, final demand, submission/defiance response. |
| First naib | Pledge/trust tutorial, crew responsibility, raid aftermath. |
| Scout | Travel/discovery, route knowledge, worm warnings. |
| Reverend mother | Rituals, prescience, cost of foresight. |
| Prospector | Fields, density uncertainty, depletion, equipment need. |
| Smuggler | Investment, equipment tiers, standing, hard prices. |
| Military tutor | Training, garrison forecasts, fort losses. |
| Planetologist | Ecology trade-offs, thresholds, ecological ending. |
| Political parent/adviser | Charisma, alliance strain, final moral framing. |
| Field antagonist | Raids, casualties, challenge sequence. |
| Strategic antagonist | Truce, occupation logic, capital confrontation. |
| Far-region witness | Makes late-map consequences personal rather than numerical. |

One character may cover two adjacent functions only if playtests show neither becomes a
wall of exposition.

## Dialogue-state design

State selection remains deterministic and priority ordered. A state condition should answer
“why does this conversation differ now?” Valid reasons include:

- Act and named story beat.
- Pledge/loyalty/morale state at the speaker’s sietch.
- Tribute band, arrears, or patience.
- Crew loss, raid result, fort result, or equipment milestone.
- Ecology threshold, field depletion, or discovery.
- Final choice and ending route.

Do not create states for incidental clock values or hidden scalars the dialogue cannot
interpret.

Typical state depth:

- Consequential conversation: 4–8 nodes, 2–3 meaningful branches, at least one effect or
  later-tracked stance.
- Tutorial conversation: 3–6 nodes, optional explanation branch, one explicit exit.
- Reaction: 2–4 nodes, one acknowledgement choice, no fake branch inflation.
- Ambient fallback: 1–2 nodes, always terminable.

No single visit should require reading more than approximately 500 words before the player
can leave or make a new strategic action.

## Effect contract

Every authored effect kind must be handled by the production dialogue engine or removed
from the authoring type. In particular:

- `setFlags` and `addFlags` update allowlisted narrative keys.
- `loyaltyDelta`, `moraleDelta`, `charismaDelta`, and `spiceDelta` use engine commands or
  shared mutation helpers and publish the resulting category of change.
- `revealLocation` marks one existing location discovered and provides a named route/source.
- `recruitCharacter` changes deterministic character state and unlocks the documented
  capability or bonus.
- `ritual` validates its own act, cost, prior uses, and participant requirements.
- Final-choice effects call the endgame command; setting a dialogue flag alone is
  insufficient.

Tests enumerate every effect property declared by the dialogue type and fail if no runtime
handler and targeted fixture exist.

## Location identity contract

Every one of the 30 locations defines:

- Strategic purpose: what action, route, resource, threat, or relationship justifies travel.
- At least one resident or a deliberate, story-explained absence.
- One visual identity note: silhouette, light, color, landmark, or interior motif.
- One ambient audio identity selected from the production palette.
- One state change visible after a campaign consequence.
- One authored arrival or first-visit line.
- One relationship to another location: referral, trade route, rivalry, dependency, or
  shared threat.

Locations that share an environment set still require different staging, landmark
composition, resident placement, and state text. Renaming the same diorama and values is
not location content.

## Field and discovery contract

The 18 fields form six regional portfolios rather than interchangeable resource nodes.
Each region includes:

- One reliable low/medium-density field.
- One higher-value field with travel, worm, depletion, or defense risk.
- One field discovered by prospecting, dialogue referral, or prescience.

Discovery has a source recorded in state and acknowledged in the event log/map. A hidden
location or field must have at least two reachable reveal paths unless it is an explicitly
optional secret.

## Scripted campaign events

A scripted event declares:

- Stable ID and act window.
- Once/cooldown behavior.
- Trigger conditions and suppression conditions.
- Presentation owner: character, courier, location, or transition scene.
- Choices or acknowledgement action, where applicable.
- World effects and later reaction keys.
- What happens if its target character/location is unavailable.

Required distribution:

| Category | Minimum |
|---|---:|
| Tribute/political | 10 |
| Pledge/loyalty/community | 10 |
| Discovery/prospect/worm | 8 |
| Raid/military/fort | 12 |
| Ecology/stewardship | 8 |
| Personal character threads | 8 |
| Final-choice/ending setup | 4 |

One event may count in one primary category only.

## Systemic event templates

Templates cover recurring facts such as field depletion, equipment damage, raid warning,
crew loss, loyalty neglect, tribute projection risk, ecology threshold, and discovery.

Each template has at least three variants selected by relevant state. It uses specific
names and quantities where known, has a cooldown or aggregation rule, and links to the
affected location/crew/objective. The event log stores durable history; toasts communicate
only immediate action and never flood more than three simultaneous messages.

## Consequence matrix

Before content is called complete, maintain a matrix whose rows are these campaign choices
and whose columns are immediate effect, later mechanical effect, reacting characters,
location/map change, and ending text:

- First costly pledge/gift decision.
- First full, partial, and short tribute.
- First crew loss.
- First raid win and loss.
- Ecology threshold 30 and 60.
- First fort victory and failed assault.
- Baron’s truce accepted/refused.
- Submission/defiance.
- Military/ecological victory and each loss.

Every row must have at least one later character reaction and one non-dialogue consequence.

## Content validation

Automated validation covers:

1. Every conversation root exists and every reachable choice terminates or reaches another
   existing node.
2. Every node is reachable from at least one declared state root; intentional shared nodes
   declare their roots.
3. Every speaking character has the required fallback and state coverage.
4. Every condition key has at least one reachable writer or engine producer.
5. Every effect targets an existing character, location, field, equipment kind, objective,
   or allowlisted flag.
6. Every hidden required location/field has the required number of reveal paths.
7. Every capability unlock has a character introduction and a production UI consequence.
8. Every scripted event has a reachable trigger fixture, suppression fixture, and
   once/cooldown fixture.
9. Every ending has state-conditioned text variants for final choice and the major route
   statistics.
10. Word-count, duplicate-line, and repeated-choice reports flag probable padding for human
    review; they do not auto-rewrite content.

## Authoring workflow

1. Freeze the consolidated runtime contracts and effect handlers.
2. Write the global voice rules and all core character sheets.
3. Build a campaign matrix of act objective → character → location → event.
4. Author one character across all acts, then review voice and reachability before the next.
5. Integrate and play one act at a time; do not author all late-game text before Act 1 works.
6. Run automated content validation after every character batch.
7. Perform an in-context browser read for every major conversation and scene.
8. Run a final cross-character continuity edit and consequence-matrix audit.

AI-assisted drafting may accelerate variants, but a human/lead edit must approve voice,
choice intent, continuity, and consequence. Generated text is not accepted merely because
the graph validates.

## Deterministic fixtures

| Fixture | Required result |
|---|---|
| `dialogue-first-pledge` | Both substantive Stilgar branches reach a legal pledge and write distinct later stance flags. |
| `dialogue-tribute-bands` | Thufir and Fenring select different full/partial/short states with correct facts. |
| `dialogue-crew-loss` | Relevant home naib and military tutor acknowledge the named crew loss once. |
| `dialogue-ecology-route` | Kynes reacts at 30/60 thresholds and ecological ending setup becomes available. |
| `dialogue-final-choice` | Submit/defy calls the endgame command, writes one choice, and changes later states. |
| `location-required-reveals` | Every required hidden location is discoverable through two production-reachable paths. |
| `event-once-reload` | A once event presented before save does not repeat after reload. |
| `ending-text-matrix` | Every ending produces the correct final-choice and live-stat variants without missing keys. |

## Acceptance criteria

1. The release-floor inventory is generated from source and passes every quality constraint;
   hand-maintained counts alone are not evidence.
2. Every core character passes their state, reaction, optional-thread, and ending coverage.
3. No required location is empty, mechanically redundant, or reachable only through debug
   state.
4. Every dialogue effect declared by the type has runtime handling and a focused fixture.
5. The consequence matrix has no missing immediate, later, character, world, or ending cell.
6. A full human playthrough reports no repeated greeting as the dominant response to a new
   act-level consequence.
7. At least 80% of required trips satisfy the travel-purpose pass condition in
   `01-product-contract.md`; the remainder are short return trips with changed state.
8. Content validation and the standard repository gate pass before prose is called final.

## Rejection criteria

- Dialogue count rises through copied nodes, cosmetic choice wording, or unreachable trees.
- A character exists only to deliver lore with no decision, capability, or consequence.
- A required progression flag is written only by a test/debug helper.
- A location differs from another only by name and scalar values.
- An event describes a permanent change that world state, map, and save do not retain.
- Final-choice dialogue sets flags without invoking the endgame transition.
