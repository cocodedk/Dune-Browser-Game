# Presentation, Audio, and UX Specification

## Goal

Give the consolidated campaign a finished sensory and interaction layer: clear priorities,
distinct people and places, readable consequences, purposeful motion, and an audio identity
that supports pressure without exhausting the player.

The current planet, day/night treatment, ornithopter, flight mode, and sietch environment
are foundations to refine, not reasons to rebuild the renderer. Production work follows the
existing shop pipelines and in-game look gates in `docs/PRD/dune92/04-asset-pipeline.md`.

## Presentation principles

1. **The world is the subject.** UI floats over Arrakis but yields space when a character,
   location, transition, or ending needs the frame.
2. **Urgency has hierarchy.** One current objective and the nearest deadline outrank
   historical logs, global faction data, and inactive systems.
3. **Actions have three layers of feedback.** Immediate response, persistent state change,
   and later acknowledgement.
4. **Modes feel connected.** Globe, flight, location, and conversation preserve time of
   day, destination, atmosphere, and narrative context.
5. **Restraint creates drama.** Motion, stingers, toasts, and screen effects are reserved
   for meaningful changes rather than constant activity.

## Supported presentation envelope

- Desktop browser, mouse and keyboard.
- Supported viewport range: 1280×720 through 2560×1440 at browser zoom 100%.
- A 1100×650 viewport must remain operable without clipped modal controls, but visual
  composition may be reduced.
- Device pixel ratio 1–2.5 under the existing quality resolver.
- Chromium is the release browser; current Firefox/Safari behavior is documented as
  supported or unsupported before release rather than assumed.

Mobile, touch-first layout, controller support, and console-safe-area work remain outside
this initiative.

## Visual identity bible

Create one production visual bible before generating or commissioning assets. It defines:

- Palette by mode and time of day.
- Material roughness/metal response and the environment-map policy.
- Character framing, gaze, background value, rim light, and faction accent limits.
- Location focal hierarchy and landmark scale.
- UI typography, spacing, line weights, states, and icon treatment.
- How prescience, ecology, Harkonnen threat, and imperial authority differ visually.
- Examples of acceptable stylization and rejected drift.

The bible contains measured values and representative in-game captures. A mood board alone
is insufficient because assets must survive the actual renderer’s exposure, fog, and
command-column composition.

## Asset inventory

### Character presentation

- One finished portrait/card image for every speaking character retained by
  `05-content-and-narrative.md`.
- A consistent master resolution and crop safe area; current 1024² direction remains valid
  unless the asset pass proves a smaller source sufficient.
- Neutral, pressure, and ending-state variants for the core cast where expression changes
  materially improve the scene. A tint of one neutral image does not count as a variant.
- Character-shop assets already released through `@cast` remain source material where they
  meet the bible; other characters may use authored 2D portraits without requiring a new
  full 3D shop.
- The CSS text label used as a portrait fallback is a development fallback only and may not
  appear in a release playthrough.

### Locations

- Approximately 12 production environment sets cover 30 locations through deliberate
  variants.
- Each variant changes focal landmark, prop composition, resident placement, light accent,
  and consequence state according to the location identity contract.
- At minimum: Arrakeen interior/exterior, Fremen sietch, deep sietch/ritual space, smuggler
  den, field camp, ecology site, imperial station, ordinary Harkonnen fort, capital fort,
  deep-desert discovery, devastated aftermath, and end-state Arrakis.
- The current sietch and cliff landscape shops remain reusable sources after their pending
  in-game look gates. Their successful release does not make every same-kind destination
  visually complete.

### Vehicles and machines

- Ornithopter and harvester retain their shop source of truth and release seams.
- The ornithopter passes an in-game approach/touchdown look gate at noon, golden hour, and
  dusk. Camera or massif intersections, unreadable silhouette, and gear/wing state mismatch
  are release blockers.
- Harvester visibility includes working motion, dust/activity feedback, equipment condition
  state if retained, and a low-detail/instanced strategy when several appear together.

### Strategic world

- Discovered/undiscovered, pledged, threatened, depleted, greened, worm-sign, and destroyed
  states are distinguishable by shape or annotation as well as color.
- Ecology changes the planet and relevant local scenes at both threshold 30 and 60.
- Fort destruction and raid aftermath persist visibly.
- Objective and threat markers yield to labels at close spacing; no marker may become
  permanently unclickable because labels overlap.

## Cinematic language

No pre-rendered video is required. A cinematic scene may combine existing 3D modes,
authored stills, camera moves, portraits, text, and audio.

Required scenes:

1. Title atmosphere and New Campaign opening.
2. Arrakeen assignment.
3. Act 1 ritual/Duke departure.
4. Act 2 prescience/far-region reveal.
5. Act 3 imperial final demand.
6. Submit/defy confirmation and consequence.
7. Military victory.
8. Ecological victory.
9. Three loss variants sharing a visual family but using distinct composition and text.

Scene controls:

- First viewing exposes Skip after three seconds and always supports pause.
- Replay is available from objective/history or an extras menu after completion.
- Skip applies the scene’s state atomically and lands on the same post-scene save as a full
  viewing.
- Text remains readable without audio; critical facts are never delivered only in a sting
  or background image.

## Audio contract

Synthesized wind may remain as a procedural layer, but it cannot carry the complete
soundscape.

### Required palette

| Class | Release floor | Behavior |
|---|---:|---|
| Ambient beds | 6 | Desert day/night, sietch, palace, smuggler den, fort/occupation, ecological region. |
| Music states | 6 | Opening, exploration, tribute pressure, raid/assault, prescience, ending. |
| Stingers | 12 | Pledge, discovery, tribute bands, raid warning/result, crew loss, threshold, fort, act, ending. |
| UI/action sounds | 12–20 | Confirm, refuse, select, order, purchase, issue, save, objective, modal, map focus. |
| Vehicle/machine loops | 3+ | Ornithopter cruise/landing and harvester work at minimum. |

Music states use restrained transitions and cooldowns. A tribute-warning layer may intensify
near deadline, but it must not restart on every UI update. Stingers queue by priority and
coalesce duplicate systemic events.

### Mixer and persistence

- Separate master, music, ambience, and UI/effects controls.
- Mute and volumes persist outside campaign saves as user settings.
- Browser audio unlock occurs on the first user gesture; the UI never claims audio is on
  while the context is still blocked.
- Missing/failed assets fall back safely and report once in diagnostics; production
  verification fails if a required key uses fallback.
- Pause lowers or suspends active loops without losing the intended state on resume.

## Information architecture

### Always visible during ordinary play

- Current location and travel state.
- Primary objective with progress/Show action.
- Tribute amount, due day, stock, and projected surplus/shortfall.
- One highest-priority warning: raid, abandonment, settlement, or endgame deadline.
- Time speed and pause state.

### Contextual command column

Order sections by current decision:

1. Urgent decision/warning.
2. Current objective.
3. Current location and residents.
4. Relevant crews/actions.
5. Relevant market/fort/ecology controls.
6. Collapsed campaign history/event log.

Inactive future systems are absent, not disabled clutter. Save/load/settings/difficulty are
not mixed into the live resource readout: save and settings live under Pause; difficulty is
read-only campaign metadata after run creation.

### Objective and event behavior

- A toast lasts long enough to read and is repeated in durable history.
- At most three toasts are visible; repeated daily events aggregate.
- A warning requiring action remains pinned until resolved or expired.
- Clicking a named crew, place, character, field, or objective in history focuses the
  corresponding current UI if it still exists.
- Debug IDs such as `field_tabr_shallows`, `act2`, and `group_*` never appear as final copy.

## Action-feedback contract

For every command:

1. Before action, show availability and the reason/cost/risk.
2. On confirmation, acknowledge input within 100 ms with control state, sound, or motion.
3. On engine result, show success/refusal text linked to the affected entity.
4. After action, update the persistent projection, objective, map/location state, or
   inventory that proves the consequence remains.

Commands lasting more than one game day show progress and expected completion. Commands
with irreversible casualties, tribute, pledge, fort, or ending-path effects use an explicit
confirmation; routine crew reassignment does not require a modal after the opening tutorial.

## Input and accessibility

### Keyboard

- All React controls are reachable in logical focus order with visible focus treatment.
- Enter/Space activates, Escape closes the topmost dismissible layer, and arrow keys move
  within radio/list groups where appropriate.
- A destination list provides the same travel actions as canvas markers.
- A resident list provides the same talk actions as location hotspots.
- `F` toggles fullscreen; browser Escape behavior exits fullscreen before game-level Escape
  handling proceeds.
- Remappable gameplay keys are not required, but every shortcut is documented in Settings.

### Semantics

- Dialogues and settlement/confirmation panels use appropriate dialog semantics, labelled
  titles, focus trapping, and focus restoration.
- Status changes use restrained live regions and do not re-announce the entire command
  column every update.
- Canvas-only visuals have DOM summaries sufficient to identify current mode, location,
  destinations, objective markers, and urgent threats.
- Decorative ornaments and visual labels are hidden from assistive technology where their
  semantic equivalent exists.

### Visual accessibility

- Text and interactive controls meet WCAG 2.1 AA contrast at every authored time of day.
- State is never communicated by color alone.
- UI text remains usable at browser zoom 200% within the minimum supported viewport, using
  scrollable panels instead of clipped controls.
- Reduced-motion disables camera shake, large parallax, rapid wing/cutscene motion where
  possible, and nonessential pulsing; it retains state transitions and timing information.
- Subtitles/text alternatives exist for every voice-like or information-bearing audio cue.

## Pause, save, and settings UX

Pause freezes campaign time and exposes:

- Resume.
- Save Campaign and Load Campaign.
- Settings.
- Objective/history summary.
- Return to Title with unsaved-progress warning.

Manual save slots show location, act, day, difficulty, playtime, ending if finished, version,
and timestamp. The rolling autosave is clearly labelled. Before a finished-ending
checkpoint overwrites it, the previous act checkpoint remains available as a protected
system load option; it does not consume or rename a manual slot.

Corrupt or incompatible saves remain listed with an explanation and non-destructive export
or delete controls; the game does not silently start over.

## Performance and bundle constraints

- Existing bundle classes and budgets remain enforced.
- New art uses the current shop/public-asset pipeline, compressed formats, and lazy loading
  by act/mode where practical.
- Opening/title code may not eagerly load every late-game portrait, location, and ending.
- Target: stable 60 fps on the repository’s reference desktop at 1920×1080; 30 fps is the
  minimum supported floor on the documented low tier.
- Normal campaign views target fewer than 200 draw calls. Exceptions require a measured
  look/performance decision recorded beside the asset; several simultaneous harvesters
  cannot multiply the known per-link mesh cost without mitigation.
- Loading longer than 500 ms shows authored progress/context; loading never advances time.

## Visual and audio fixtures

Capture and review at minimum:

| Fixture | Required view |
|---|---|
| `visual-opening-arrakeen` | New-run first frame at 1280×720 and 1920×1080. |
| `visual-globe-daycycle` | Globe at noon, golden hour, dusk, and night with objective/threat states. |
| `visual-flight-approach` | Ornithopter departure, cruise, approach, and touchdown at three light states. |
| `visual-location-family` | One capture per environment set plus pledged/raided/greened variants. |
| `visual-core-cast` | Every core portrait in conversation composition at production exposure. |
| `visual-ui-stress` | Long objective, three alerts, six crews, pending settlement, 200% zoom. |
| `visual-endings` | Both victories and all three losses with live statistics. |
| `audio-key-audit` | Every required audio key loads, plays after unlock, obeys mixer, and leaves no error. |

Screenshots are judged against the visual bible and actual player readability. Automated
pixel equality is not required; debug state, object inspection, performance metrics, and
human look-gate verdicts accompany each capture.

## Acceptance criteria

1. No portrait text fallback or required-audio fallback appears in a release playthrough.
2. All 30 locations satisfy identity and variant requirements; shared sets remain visibly
   distinguishable in blind capture review.
3. Objective, tribute, and highest-priority warning remain readable in every mode and light
   fixture without covering the scene’s focal subject.
4. Every production command satisfies the four-step action-feedback contract.
5. Title, opening, three transitions, final choice, both victories, and three losses have
   reviewed presentation scenes.
6. Keyboard-only opening and one full tribute cycle pass; modal focus and restoration have
   automated coverage.
7. WCAG contrast, color-independent states, 200% zoom, reduced motion, and DOM canvas
   summaries pass their fixtures.
8. Required audio keys, mixer persistence, unlock behavior, pause/resume, and priority
   coalescing pass browser verification.
9. Every asset release passes its shop gate, bundle budget, in-game performance measurement,
   and user look gate.

## Rejection criteria

- New visuals are accepted from a shop turntable without an in-game look gate.
- A permanent consequence is shown only by a toast or event-log line.
- The command column exposes every system from the first frame.
- Audio reports enabled while blocked, or a missing required asset silently ships on the
  synthesized fallback.
- A destination or resident is reachable only through a canvas hit target.
- An act or ending reuses generic presentation with only its title changed.
