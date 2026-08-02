# AH-64E Cockpit Gauntlet — the bar and the prompts

User ruling 2026-08-02: the exterior is frozen at ~98/100; the interior is the whole
focus, referenced to the latest Apache attack-helicopter (AH-64E) crew station. This
file is the campaign's gauntlet-loop specification: the bar, the builder prompt, the
critic prompt, and the loop mechanics. `progress.md` stays the live log.

## The goal

From the pilot's seat, the ornithopter's cockpit must read — blind, to a stranger — as a
modern attack-helicopter glass cockpit: heavy-framed but genuinely transparent flat-plate
glazing with the desert visible beyond it, two large multifunction displays, an armored-tub
feel, articulated controls. All inside the existing kit-authority exterior, which must not
visibly change.

## The bar — four parts, all asked every round

### B1 — Blind identification (primary; needs no reference asset)

A fresh critic, told NOTHING, sees `pilot.png`. PASS requires, unprompted:
(a) "cockpit of a military aircraft" — attack-helicopter/glass-cockpit specificity scores
higher; (b) the viewer is in the pilot's seat looking forward THROUGH framed glazing;
(c) the outside world (desert) is visible beyond the glass. "Inside a box/duct/tunnel"
is the Round 7 failure and remains a FAIL.

### B2 — Reference match, element by element (0–10, target ≥7)

Scored against the AH-64E crew station the critic already knows. No Apache image ships in
the repo, so the critic must name each element FOUND or MISSING rather than emote:
two large colour MFDs with bezel-key rows dominating the panel · up-front display and
keypad between/above them · a small standby analog cluster · cyclic grip, articulated,
hand-scaled · collective at the pilot's left · dark grey/black panel carrier against olive
structure · high sills / armored-tub read · heavy framed flat-plate transparencies.

### B3 — Measurements, parameters written down (`pilot.png`, 1600×1000)

- Exterior (desert/sky seen through glazing) ≥ **20%** of frame pixels. Round 7 baseline:
  0.9%.
- An unbroken exterior run ≥ **250 rows** somewhere in columns x = 700–900.
- Exactly **2** MFD screens, each ≥ 140 px wide in frame, each inside a visible bezel
  carrying ≥ 8 distinct keys.
- Luminance > 215 forms exactly **one** connected region (the cockpit light). No second
  sun, no stray glow.

### B3-LIVE — the view must work in REAL FLIGHT (user finding, 2026-08-02 evening)

The user flew the craft: "the pilot view is not good at all. I see literally nothing.
Just a narrow band of view." The original B3 was measured at a +12 deg HELD head-look;
the live camera flies LEVEL. Lesson recorded: the bar must measure the pose the pilot
actually flies in. Amended targets, measured at LEVEL live-flight gaze (pitch 0):
- Exterior >= 20% of the frame at pitch 0 (not just at +12).
- The horizon line is visible dead ahead in level flight.
- The aperture may open REARWARD over the pilot's head (the exterior lens runs to 6.9m
  aft; the interior aperture stops at 2.45m — that margin is ours), the brow may thin,
  the eye may rise — the kit-frozen exterior outline may NOT change.

### B5 — Flyable by instruments (user finding, same message)

"I have no clue about the pitch and the altitude. and no compass and those sort of
nav things. I might need an option to auto-level the craft when it gets out of
control."
- HUD-style flight symbology in the pilot view: pitch ladder / horizon bar, heading
  tape or compass rose, altitude and speed readouts — legible at a glance, Apache
  flavoured.
- The MFD nav page shows LIVE heading; the systems page shows LIVE altitude/throttle
  (DataTexture updates from FlightState — keep the no-DOM test rule).
- AUTO-LEVEL: a held key smoothly levels roll and pitch; a unit-tested flight-model
  behaviour (fail-first: from a banked/pitched state, N seconds of auto-level bring
  attitude within tolerance), plus a HUD hint that it is active.

### B4 — Correctness. Every critic answers these; each is mechanically asserted where possible.

1. `forwardCone.test.ts` green, UNTOUCHED — the central forward cone hits glazing first.
2. `enclosure.test.ts` zero-escape green, UNTOUCHED.
3. Glass reads as GLASS — edge highlights, slight tint, frame shadows. An empty hole
   passes B3 and is still a FAIL here.
4. Controls on the correct sides (cyclic centre/right of seat, collective left), neither
   crossing the central sightline cone.
5. A second crew position exists (seat, or unmistakably implied station).
6. Scale: seated eye ≈ 1.65 m above the floor; MFDs at arm's reach; nothing toy-sized or
   giant.
7. **The exterior is frozen.** hero/top/side/rear34 must be visually equivalent
   before/after every interior round — pixel-diff the glazing regions and report numbers.

## Decomposition — sequence, never fan-out

The interior is one coupled artifact; its files are shared. One builder at a time:

1. **9a — see out**: interior glazing transmission + glass-read; camera only if diagnosis
   demands. (Brief already staged.)
2. **9b — the Apache panel**: MFDs, UFD + keypad, standby cluster, dark carrier.
3. **9c — controls**: articulated cyclic + collective; coil conduit rehung overhead.
4. **9d — tub, palette, crew**: black/grey panels vs olive structure, sill emphasis,
   second crew position.
5. **Re-panel** with fresh critics against this file's bar.

## The builder prompt (template — instantiate per round)

> Surgical round on the Dune ornithopter vehicle shop (`vehicle-shop/ornihopter/`,
> branch `feat/ornithopter-vehicle-shop`). Do NOT commit. Timebox ~40 min.
>
> GOAL: <the round's single outcome, stated as the destination — never the route>.
> THE BAR IT SERVES: <the specific B1–B4 lines this round moves>.
>
> HARD BOUNDARIES:
> - The exterior is FROZEN (user ruling). hero/top/side/rear34 must stay visually
>   equivalent — prove with before/after crops and pixel numbers on any shared material.
> - Do not touch: `forwardCone.test.ts`, `enclosure.test.ts`, the Round 6f
>   `FRAMED_CANOPY_Z` bay layout, the kit-measured lens outline, anything under
>   `src/model/` unless the brief names it.
> - 200-line cap on every source file — the pre-commit hook checks this BEFORE the npm
>   gates, so a green gate list does not mean a passing commit. Check `wc -l` yourself.
> - The game's `npx tsc --noEmit` does NOT cover the shop; use `shop:thopter:check`.
>
> PROOF: fail-first — write the round's guard test, run it RED against today's tree,
> record numbers, fix, GREEN, then full gates:
> `npm run lint && npm run shop:thopter:check && npm run test:unit && bash scripts/check-file-length.sh`.
>
> VISUAL: dev server :5219 (restart OUTSIDE any sandbox: `npx vite vehicle-shop/ornihopter
> --port 5219 --strictPort`; sandboxed vite dies silently, exit 144). Re-shoot with
> `node vehicle-shop/ornihopter/tools/shoot.mjs`, measure the B3 numbers yourself, judge
> with your own eyes, and report both.
>
> REPORT: red/green numbers, files/lines, every adapted assertion with reasoning,
> B3 measurements before/after, per-view visual verdict. Nothing else.

## The critic prompt (template — fresh context, never shown builder reasoning)

> You are a fresh-eyed reviewer for a AAA studio. Be blunt — a diplomatic answer is
> worthless to us.
>
> STEP 1, BLIND (told nothing): read
> `/home/cocodedk/0-projects/Dune-Browser-Game/.shots/thopter-shop/pilot.png` and say
> what you are looking at, where the viewer sits, and what is directly ahead at the
> centre of the frame.
>
> STEP 2, SCORED: this is meant to read as a modern AH-64E Apache-style attack-helicopter
> glass cockpit, from the pilot's seat, inside a desert-operations aircraft. Go element
> by element — two bezel-keyed MFDs, up-front display + keypad, standby analog cluster,
> articulated cyclic, collective at left, dark panel carrier vs olive structure, armored
> sills, framed transparencies with the desert visible through them — and mark each
> FOUND / PARTIAL / MISSING with pixel evidence. Score 0–10 against that station.
>
> STEP 3, CORRECTNESS (answer every one): Is the centre of the forward view glazing with
> the outside visible through it? Does glass read as glass rather than a hole or a wall?
> Are the controls on the correct sides, clear of the sightline? Is there a second crew
> position? Is the scale plausible for a seated pilot (eye ~1.65 m)? Is there exactly one
> light source and no stray glow? Measure, don't vibe: sample pixels and name coordinates.
>
> RETURN: your blind read, the element table, the 0–10 score, every correctness verdict
> with evidence, the SINGLE biggest remaining gap (concrete enough to act on), and the
> next three highest-value changes, ranked.

## Loop mechanics — the lead's half

- Verify every landing independently: re-run the gates, re-measure B3 with your own
  regions, look at the captures with your own eyes. Builder reports are evidence, not
  findings — where a builder wrote both fix and test, probe a third way.
- Check file mtimes before judging anything — never grade a tree mid-write.
- Re-capture before re-fixing — never act on a critique older than the last landing.
- Log every round in `progress.md`: what changed, verdicts, measured numbers, and what
  did NOT reproduce.
- STOP when: B1 passes AND B2 ≥ 7 AND every B3 line is met — or when a round's gain no
  longer justifies its cost — or when the next gap needs a user decision. Say which one
  it was.
