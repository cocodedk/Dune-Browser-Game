# Gauntlet Loop — implementing `immediate-improvements.md`

The loop that drives `docs/immediate-improvements.md` to done. Companion to
`../progress.md` (the standing bar Q1–Q4 and the live round log — rounds from
this loop are logged THERE, numbered I0–I7 to avoid colliding with the old
numbering, which reached 16).

## Roles

- **Lead / art director in chief — Fable 5.** Decomposes, authors every spec
  delta (nobody else edits `spec.ts`), writes builder and critic prompts,
  re-runs every gate and reproduces every reported number itself, commits,
  keeps the log. Never writes model code.
- **Builders — Opus and Sonnet subagents.** Opus takes the three hard rounds
  (belt motion, cutter, weathering textures); Sonnet takes the mechanical
  ones. One builder per round, one owner per file, no parallel rounds — this
  repo has already had two builders collide in one file, and the machine is
  one coupled artifact.
- **Critics — fresh-context subagents.** They see the goal, the bar, and the
  PNGs. Never the builder's report, reasoning, or self-score. Sonnet for the
  per-round check, a 3×Opus blind panel at the two milestones (after I3,
  after I7).
- **Final judge — the user.** The user's eye outranks any critic — a user
  finding becomes the next pass's destination, applied as stated, not
  re-derived. Per-round pausing: see step 8 (suspended 2026-08-03 by user
  order "continue til the end of it").

**Cost, said up front:** eight rounds with per-round critics and two panels
is realistically 600k–1.2M tokens. The doc is priority-ordered; stopping
after any verified round leaves the tree green and better than before.

## The bar (global — every critic gets both halves)

The standing bar is `progress.md` Q1–Q4. Every critic prompt in this loop
must additionally contain, verbatim:

1. **Is this good?** Score 0–10 against the round's destination and name the
   single biggest remaining gap, concretely enough to act on. A diplomatic
   answer is worthless — if it looks wrong, say it looks wrong.
2. **Is this correct?** Does it do what it claims — right way round, right
   direction of motion, right scale, consistent with its own inputs? The
   ornithopter flew backwards for four rounds because no critic was ever
   asked this. Answer it explicitly, per round-specific question below.

Judge across ALL the round's named views, not one lucky frame. For motion
rounds, judge the frame pairs.

## Standing boundaries (in every builder prompt)

- **Verification is these four, and the four are not enough:**
  `npm run lint` · `npm run shop:harvester:check` ·
  `npx vitest run vehicle-shop/harvester` · `bash scripts/check-file-length.sh`.
  Named traps: plain `npx tsc --noEmit` does NOT cover this directory, only
  `shop:harvester:check` does; the pre-commit hook runs the 200-line check
  BEFORE the npm gates, so green npm commands do not mean a committable
  tree; `shop:harvester:shoot` needs a non-sandboxed shell.
- **200 lines per `.ts` file.** Split via helpers before, not after.
- Explicit `import { describe, it, expect } from 'vitest'`; unit tests have
  no DOM, no canvas, no WebGL — texture work uses `DataTexture` (the
  ornithopter `materials/neutralEnvMap.ts` / `hullWeathering.ts` pattern).
- **Builders never commit and never touch `spec.ts`.** The lead commits
  after verification, with the real hook. Never `--no-verify`.
- **Do not regress the pinned history:** the wrap curves around the OUTSIDE
  of the sprockets (round 16); the belt carries the wheels — wheels ride ON
  the bottom plate, not the ground (round 14); runner z-spans never overlap
  (round 8); the seam guard — frontmost geometry is the cutter at −Z and the
  machine drives toward it; the 3MF-measured block layout and the recorded
  film-over-measured rulings in `provenance.ts`.
- Axis convention: **−Z forward (cutter), +Y up, +X starboard.** The sun is
  on the PORT side; negative shoot azimuths are the lit flank.

## Art-director spec deltas (lead authors these at each round's start)

| round | change | from → to |
|---|---|---|
| I1 | `belt` straight links per run | 22 → 29 (pitch ≈ 1.41 m, link ≈ 1.1 m) |
| I1 | `belt` wrap links per sprocket | 10 → 15 (length ≈ arc pitch π·3.6/15) |
| I3 | cutter head height | 6 m → 8 m, plus drum r ≈ 1.5 m along X |
| I4 | `CAB.halfWidth` | 3.5 → 5.5 (7 m → 11 m wide) |
| I6 | sixth material `trim` | — → `0xd4c8a0` |
| I7 | sun height / fog | 560 → 300 · (400, 3400) → (200, 1500) |

These are destinations. HOW — geometry, grouping, animation mechanism — is
the builder's to find.

---

## Rounds

### I0 — harness for motion judging (Sonnet, small)

**Files:** `debug.ts`, `tools/shoot.mjs`, `components.test.ts` (split).
**Destination:** the loop can capture deterministic MOTION evidence. The
debug handle gains `drive(trackSpeed)` + `tick(dt)` — advance the model's
animation by exactly `dt` while paused, machine parked. `shoot.mjs` gains a
motion mode that shoots frame PAIRS (t, t+dt) at a named view. Split
`components.test.ts` into per-part files (it will not survive I1–I5 under
200 lines otherwise).
**Bar:** two runs of the same pair are pixel-identical; all existing tests
green. No critic — this is harness, the gate is mechanical.

### I1 — the belt: density, transition, scroll (Opus — the hardest round)

**Files:** `model/belt.ts`, `model/link.ts`, `model/tracks.ts`, belt tests.
**Destination:** §1 + §9 of the improvements doc. 29 links per straight run,
15 wrap links per sprocket at arc pitch; no visible gap where the straight
run hands over to the wrap; and the links MOVE — bottom run translates, wrap
links orbit the sprocket, driven by the crawler's signed track speeds,
phase-continuous at the tangent points (a link crossing the boundary must
not pop).
**Tests first, from §10 — they pin fixes that had none:**
wrap-direction (front wrap links at z < sprocketZ[0], rear at
z > sprocketZ[1]); total link count; belt-on-ground (bottom-run link bottoms
at y = 0, road-wheel bottoms at y = BOTTOM_THICK); plus a scroll test — the
phase function advances `s·dt`, wraps modulo pitch, and moves the bottom run
toward **+Z when driving forward**.
**Correctness question (the sign trap):** *"The machine drives forward,
toward its own cutter (−Z). In the frame pair, does the ground-run tread
move REARWARD relative to the hull — i.e., stay planted on the sand like a
real track? A tread that crawls forward with the machine is wrong even if
it moves smoothly."*
**Critic views:** `tracks`, `side`, `frontlow`, `low-flank` + a motion pair
at `tracks` and one at `side`.
**Lead verification:** reproduce the phase math independently — drive at a
known speed, tick a known dt, measure a named link's world-z displacement
via Playwright; it must equal `s·dt` within 1%.

### I2 — the hull: seams, taper, structure, flanks (Sonnet)

**Files:** `model/hull.ts` + its test file.
**Destination:** §2. 3–4 transverse deck seams (thin dark insets); a wedge
or stepped taper from deck edge toward the cutter; 2–3 underframe
cross-members; louvred flank panels on the solid nose/tail regions ONLY.
**Correctness question:** *"Can you still see clean through the machine's
open mid-section under the deck, between the tracks? A closed flank fails —
the see-under gap is part of what makes it a harvester."* Footprint bounds
unchanged (the component test enforces it).
**Critic views:** `side`, `low-flank`, `hero`, `rear34`.

### I3 — the cutter: the signature (Opus) — **milestone panel after**

**Files:** `model/cutter.ts` + its test file.
**Destination:** §3 + §9 drum. Head to 8 m tall with a visible rotating drum
along X at the head front, teeth around its circumference, speed ∝ throttle;
the plain pipe replaced by an angled truss conveyor from the feed hopper
down to the head; side fairings on the arm; two hydraulic rams from nose
housing to arm.
**Correctness question:** *"Two parts: (a) is the drum turning the FEEDING
way — at the sand line its surface moves toward the machine, pulling spice
in, not flinging it forward? (b) Is the cutter still the frontmost geometry,
ahead of everything, low enough to scrape the bed?"*
**Critic views:** `hero`, `frontlow`, `boom`, `boomclose`, `front` + one
motion pair at `boomclose`.
**Milestone: blind panel.** 3 fresh Opus critics, told NOTHING, each shown a
different 3/4 render (`hero`, `rear34`, `turn-high-030`): "What is this
machine? What is it for? What is the most and least convincing part?" Bar:
all three say Dune spice harvester or "huge tracked industrial processing
machine"; at least two name the cutter as a working mouth/cutting head.

### I4 — the cab (Sonnet)

**Files:** `model/cab.ts` + its test file. Lead widens `CAB.halfWidth` first.
**Destination:** §4. 11 m wide; full-width wrap glass (across the front,
halfway down the sides); roof rack or equipment box; rear access ladder.
**Correctness question:** *"Does the cab read as the place a crew rides —
window band at a plausible eye height for a raised control station, ladder
reaching somewhere a person could actually board from?"*
**Critic views:** `cab`, `hero2`, `front`, `deck-top`.

### I5 — deck machinery and scale cues (Sonnet)

**Files:** `model/machinery.ts` + its test file, `stage/` for the parked
groundcar and near posts.
**Destination:** §5 + §7 (static cues). 1–2 more hoppers at different
sizes; 2–3 connecting pipes along Z; deck railings on open edges; two light
masts at deck corners; a 4 m groundcar parked beside the machine; a 1.8 m
crew figure on deck near the cab.
**Correctness question:** *"Is the figure actually 1.8 m against the spec's
12 m deck height — does the machine read HUGE because the cues are right,
not because the cues shrank?"* Nothing may overlap the cab or cutter
envelopes (component bounds tests).
**Critic views:** `deck-top`, `hero`, `cab`, `high-hero`.

### I6 — palette and weathering (Opus — crosses every surface)

**Files:** new `model/materials/` helpers + touches to each part's material
wiring; the lead lands the `trim` colour in spec first.
**Destination:** §6. Sixth `trim` material `0xd4c8a0` on deck edges, window
frames, equipment highlights; panel lines, welds and weathering painted into
`DataTexture` maps (the ornithopter `hullWeathering.ts` house pattern —
unit-test safe, no canvas); belt grime dark on the ground run, lighter top
run; a dirt ring at each tire's contact radius.
**Correctness question:** *"Do the panel lines follow the machine's actual
construction — seams where plates would meet, grime where dust would
settle (lower surfaces, contact points) — or is it noise sprayed on
uniformly? Authored beats procedural; jitter is not detail."*
**Critic views:** `hero`, `side`, `tracks`, `tailclose`, `top`.

### I7 — light, fog, dust, sway (Sonnet) — **final panel after**

**Files:** `main.ts`/`stage/scene.ts` (sun, fill, fog), `stage/` or
`model/tracks.ts` for dust emitters, `model/cab.ts` antenna sway hook.
**Destination:** §8 + §7 dust + §9. Sun to 300 m; a low warm fill from
starboard; fog 200/1500; two semi-transparent dust plumes behind the rear
sprockets driven by track speed; subtle antenna sway with speed.
**Correctness questions:** *"(a) Parked machine: zero dust — plumes only
when tracks turn. (b) In the starboard turntable views, is the starboard
flank readable rather than flat black?"*
**Critic views:** `turntable-120`, `turntable-240`, `hero`, `side` + a
motion pair at `rear34` (dust on, driving).
**Final panel:** 3 fresh Opus critics — one blind ID on `hero`, one
side-by-side against the film stills in `.shots/reference/` if the user has
supplied them (else the Q1 mechanical checklist), one correctness sweep
(track direction, drum direction, dust gating, scale figure) across the full
turntable set. Bar: Q1 ≥ 7/10, Q2 pass, zero correctness findings.

---

## Lead round protocol (every round, in order)

1. Author the round's spec delta, if any. Commit it separately.
2. Spawn the builder with: destination, standing boundaries, files owned,
   tests-first requirement. Nothing about the route.
3. On "done": check file mtimes are quiet — never judge a tree mid-write.
4. Re-run all four gates MYSELF. Builder reports are evidence, not findings
   — this loop's own history includes a reported 43.2% that reproduced at
   8%, and a green gate on an uncommittable tree.
5. Re-shoot MYSELF (non-sandboxed shell). Reproduce any builder-reported
   measurement with my own parameters through `window.__HARVESTER__`.
6. Spawn the round critic (fresh context, PNGs + bar only). If any build
   landed after the capture, re-capture before acting — never fix from a
   stale critique.
7. Verdict: bar met → tick the boxes in `immediate-improvements.md`, commit
   (real hook) and PUSH (user standing order, 2026-08-03), log the round in
   `progress.md` including the score, the numbers, and **what did not
   reproduce**. Bar missed → feed the critic's
   single biggest gap back to the SAME builder, same ownership, next pass.
   Three passes without the score moving → stop, bring the gap to the user.
8. **User checkpoint — SUSPENDED by user order (2026-08-03: "continue til
   the end of it").** The loop runs round to round without pausing; the
   lead makes the art rulings and still presents each landed round's
   summary in the session. The user may interrupt at any time and their
   finding outranks any critic. (Original rule, restorable on request:
   present the landed round, then STOP until the user judges.)
9. Stop conditions, named honestly in the log: bar met · gains no longer
   worth the tokens · the next gap needs a human (art) decision.
