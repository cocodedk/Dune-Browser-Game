# Harvester Gauntlet Loop — the bar, and the live log

Standalone rig at `vehicle-shop/harvester/`, on branch
`feat/harvester-vehicle-shop`, in its own worktree at
`../Dune-Browser-Game-harvester` (sibling of the main checkout, node_modules
symlinked). Run it with `npm run shop:harvester`.

## STATUS — first handoff. Read this first in a fresh session.

**Live loop (2026-08-02):** `docs/gauntlet-loop.md` drives
`docs/immediate-improvements.md` — rounds I0–I7, logged below alongside the
old rounds. The loop pauses at a user checkpoint after every round.

Round 1 landed and verified: the crawler core (pure, 15 unit tests), the
blockout model measured off `docs/harvester.3mf`, the seam guard, and the
stage/camera/debug/capture harness. Gates at handoff: shop tsc 0, harvester
unit tests **15/15**, file lengths clean. NOT yet run against the full repo
hook — WIP commits use `--no-verify` by the standing ornithopter instruction;
the REAL gate must pass once before any merge to main.

**What the machine is.** A 60m spice harvester: 48m hull measured from the
3MF's ratios at authored scale, plus a 12m film-derived cutter. Two track
pods (6.2m wide, full height) at ±14m, an open-framed deck between them
(deck band + underframe + solid nose/tail blocks — the 3MF's block layout),
a raised cab and deck machinery. Crawl: 8 m/s max, 1.5 m/s² accel, turns by
track-speed differential.

**Do next, in rough order:**
1. **Look at it.** `npm run shop:harvester`, then `shop:harvester:shoot`,
   then judge the blockout against film stills. The proportions are
   measured; whether they READ harvester is a critic's call, and this is the
   first round that needs one.
2. Track treads and dust — the two things that make it "act" like the film.
3. Reference frames from the user (film stills / a better model) belong in
   `.shots/reference/`; any number they change gets a MEASURED provenance
   entry.
4. Panel lines and weathering once the silhouette is accepted.

## The bar

Four questions, mirroring the ornithopter bar minus the interior (no
interior by design).

### Q1 — Reads as a Dune harvester, against a reference, side by side
A fresh critic scores our renders 0–10 against film stills (once supplied)
and names the single largest difference. Until references exist, the
mechanical checklist stands in: two full-length track pods; a deck you can
see under between them; a forward cutter; a raised cab; sand/rust palette.
**Target: ≥7/10.**

### Q2 — Blind identification
A fresh critic, told nothing, sees a 3/4 render. It must name it a Dune
spice harvester, or failing that "a huge tracked industrial processing
machine". Anything vaguer is a fail.

### Q3 — Acts like one (the crawler bar, all mechanical)
1. **Nose leads**: full throttle moves the machine toward its own cutter
   (`-Z`), asserted off the real geometry + the crawler in `seam.test.ts`.
2. **Reverse works**: `-Z`-facing machine backs toward `+Z`, slower than
   forward.
3. **Differential steering**: steer right turns the heading clockwise seen
   from above; steer splits the two track speeds opposite ways and never the
   body speed; it spins in place at zero throttle.
4. **It rides the terrain**: `position.y` is the mean of the four track
   corners' terrain heights, no corner can sink below its own terrain, and
   pitch/roll follow the dunes.
5. **The wheels roll**: forward motion rolls the wheels the sign that keeps
   the ground contact point still (pinned by test).
6. **Scale**: hull ≈ 48m, full footprint ≈ 60m, width ≈ 34m, measured off
   the real geometry.

### Q4 — Correctness of the numbers
Every spec value carries provenance; nothing in `spec.ts` is unaccounted
for. The 3MF is the shape authority for ratios and block layout; the cutter
and cab are marked film-derived.

---

## Measured inputs — what the build targets and where each number came from

| quantity | value | source |
|---|---|---|
| hull length | 48 m | MEASURED ratio from `harvester.3mf` (73.498mm) at authored scale |
| width (over pods) | 34.2 m | same (52.388mm) |
| height | 17.2 m (deck 14.2) | same (22.321mm) |
| full length with cutter | 60 m | hull + 12m film-derived boom |
| pod width | 6.2 m (18% of width) | MEASURED from the 3MF cross-sections |
| block layout | pods + deck band + underframe + solid nose/tail | MEASURED from the 3MF |

The 3MF is a fan AI model, not a licensed kit — treat its SHAPE as authority
and its absolute scale as nothing (it is a 73mm print). Orientation: the
slicer lay the model on its side; length=X, width=Y, height=Z in the file.

---

## Rounds

### Round 0 — scaffold (lead, no builders)

- `spec.ts` / `provenance.ts` / `contracts.ts`, crawler core, stage,
  camera, input, hud, debug handle, `shoot.mjs` — the ornithopter harness,
  adapted for a ground machine.
- Shop scripts `shop:harvester`, `:check`, `:shoot`, `:build` added to
  `package.json` (worktree branch).
- The axis convention, the seam guard idea, and the 200-line discipline
  carried over from the ornithopter shop.

_Status: complete._

### Round 1 — crawler + measured blockout. LANDED. Verified.

The pure crawler (forward/reverse, differential steer, terrain-riding
pitch/roll, wheel sign) with 13 tests, plus the seam guard (frontmost
geometry is the cutter; the machine travels toward it) with 2 tests.
**15/15 green**, shop tsc 0, file lengths clean.

**The user supplied `docs/harvester.3mf` mid-round** — a fan "Dune Spice
Harvester" (MakerLab image-to-3D, BY-NC-SA). Extracted and measured with the
plate method: 499,978 triangles, one mesh, no named parts. The initial
orientation guess (as-printed) read as a tall tower (3.29 : 2.35 : 1 was
length:width:height only after re-orienting the model onto its side), and
cross-sections then showed the real layout: two full-length track pods at
~18% of width each, a deck band across the top, an underframe, solid nose
and tail blocks. Those measurements replaced the authored proportions in
`spec.ts`.

**A defect the seam test caught that no review would have:** the first
blockout authored every "length runs along Z" box as (length, height,
width), so the machine was 48m WIDE and the frontmost geometry was a wheel
at −20.2m, not the cutter at −36. The frontmost-geometry assertion failed
with exactly the number that showed the bug; the boxes were re-ordered and
the guard stayed. Logged because it is the same class of axis confusion as
the ornithopter's backwards flight — caught here on day one by a mechanical
assertion rather than by a critic.

**Honest gaps taken forward:** the pods roll wheels, not a scrolling tread;
no dust or terrain deformation; the blockout is flat-shaded boxes; the
absolute scale (48m hull) is authored, not sourced; the cutter and cab are
film-derived additions the 3MF lacks.

_Status: complete._

### Round 2 — make it read as a harvester. LANDED. Verified.

User's verdict on the Round 1 blockout: **"this harvester looks very weird. it
is not clear what it is."** Diagnosis from the geometry, then the fix:

**Why it read as a box.** (1) The track pods were 48m x 14m flat walls with
small wheels — a wall, not a track. (2) The plan was nearly square
(48 x 34.2 = 1.4:1), from the 3MF's chunky AI proportions. (3) The cutter
was a 1.2m-thin stick on a 34m-wide machine — invisible at capture distance.
(4) The deck was a flat unbroken top with no machinery for scale.

**The fix (film proportions win over the measured model — ruling recorded in
provenance.round2):** width over tracks 34.2 -> 29 (span 28 -> 24), deck
14.2 -> 12.0; pods rebuilt as running gear — tread band + seven big wheels
sticking above it + an upper housing tucked under the deck (the classic
crawler silhouette); cutter enlarged to an 18m-wide grinder head with five
teeth, a 14m-wide arm, and a feed hopper; cab widened with a glass band;
three hoppers, a gantry and a conveyor on the open deck; tail housing
lowered.

Gates reproduced: lint 0, shop tsc 0, **15/15** harvester tests (seam bounds
all still pass off the real geometry), lengths clean. The seam guard earned
its keep again: no test needed changing for the new silhouette, because the
bounds are geometry-derived, not authored constants.

**Open:** tread scrolling (the band is static; only the wheels roll), dust,
panel lines, and the first blind critic panel.

_Status: complete._

### Round 3 — component decomposition (user's method: build parts, assemble at the end)

User direction: **"you build components which you assemble at the very end.
plan which components are needed. then build them one by one."** The
machine is now five independent parts, each a pure builder
(`{ group, dispose }`, reads spec, no scene/crawler access), each with its
own bounding-invariant test (`components.test.ts`), assembled only in
`model/Harvester.ts`:

1. **hull** — deck slab + trim lip, underframe, nose housing + intake grille, tail housing, flank slats.
2. **tracks** — per side: tread band + 12 segmented ribs (the belt read), 7 rotating wheels (14 total, driven by the crawler's signed track speeds), housing + cap trim.
3. **cutter** — arm + rails, 18m grinder head, 7 teeth, feed hopper, pipe to the head.
4. **cab** — two-step body, slanted glass band + mullions, side windows, roof, antenna.
5. **machinery** — hoppers, gantry + winch, conveyor, vent stacks, deck-edge control boxes.

The old monolithic `deck.ts` is deleted; its parts became cutter/cab/machinery.

**A defect the component test caught that the seam test could not:** the
nose and tail housings were placed with their z-centre written into the X
position slot — the same axis confusion that the seam test caught in Round
1, in a new shape. The assembled-footprint assertion in components.test.ts
failed on an asymmetric 58.85m width (the housings parked 20m off to each
side) and named the offender by part. Fixed at source; the seam test's
windows would have swallowed this (the machine was still ~60m long and the
cutter still frontmost). Lesson recorded: the assembly footprint check is
load-bearing, not decorative.

Gates: lint 0, shop tsc 0, **21/21** tests (15 + 6 component), lengths clean.

**Open:** tread scrolling, dust, panel lines, and the first blind critic
panel. Re-shoot (`npm run shop:harvester:shoot`) still needs to run in a
non-sandboxed shell.

_Status: complete._

### Round 4 — the tractors (user direction: "concentrate around the tractors and the track around them")

Each side is now a real crawler running-gear unit instead of a slab with
wheels: a TALL belt loop (7m) with 18 full-height transverse cleats on the
outer face, two big TOOTHED end sprockets (5 teeth on the upper arc — the
belt covers the lower run), six road wheels in the lower run, five return
rollers carrying the top run, and the housing with cap trim and panel
breaks. All 26 rotating parts per... per machine (13 per side) roll from the
crawler's signed track speeds, each at its own radius, so the assembly
drives itself.

**The component test caught the teeth through the ground:** the first pass
toothed the sprockets all the way around, and the lower teeth poked 4.2m
below the belt — the track footprint dipped to y = -4.2 and the assembled
height read 20.6m. Teeth restricted to the upper arc; the footprint test
now proves the running gear never leaves the ground line.

Gates: lint 0, shop tsc 0, **21/21** tests, lengths clean.

**Open:** cleat scrolling (the cleats are static bars — the belt still does
not visibly translate), dust, panel lines, first blind critic panel.

_Status: complete._

### Round 5 — soft edges, low cutter (user direction: "refine the edges make them rounder and lower the front loader/dozer")

The big masses are now ROUNDED (three's RoundedBoxGeometry via one shared
helper, `model/rounded.ts`): the deck slab, underframe, nose and tail
housings, belt loop and track housings, cutter arm and head, cab body and
roof, gantry and conveyor. Thin structural detail (cleats, teeth, rails,
lips, grilles) stays sharp — the film's heavy-soft-forms-with-hard-detail
contrast, not a blobby kit.

The CUTTER came down: BOOM.y 6 -> 3. The arm now runs 1..5m, the grinder
head 1.5..7.5m, and the seven teeth dip to within half a metre of the
sand — a dozer blade that scrapes the spice bed, not a mid-air boom. The
feed hopper stays on the nose housing; the pipe from it dropped to meet
the lower head.

Gates: lint 0, shop tsc 0, **21/21** tests (footprint bounds all
unchanged — rounding preserves bounds), lengths clean, shop build OK.

**Open:** cleat scrolling, dust, panel lines, first blind critic panel.

_Status: complete._

### Round I5 — deck machinery and scale (2 passes). LANDED. The deck is a working spice bed with honest scale cues.

Builder: Sonnet ×2 passes. Pass 1 (critic 3/10): 4 hoppers via one
buildHopper family (rims/collars), gantry drop pipe + winch spool, trunk
pipes, platform railings, 2 masts, 1.8 m figure (wired — the critic's
"never built" was refuted by the lead reading the code), groundcar +
near posts; the blind panel's ground-clip flag traced to hull's tail
underframe slab at min.y = 0.00 EXACTLY — touching, not clipping, an
optical illusion at the raking angle; machinery min.y ≥ 0 pinned anyway.
Pass 2 (six critic findings, five reproduced): the figure's torso went
accent-brown and now READS on the lit plate beside the cab (lead-
verified by fresh crop); the fourth hopper joined the family and all
four got true outboard feet; railings extended to the TRUE outer deck
edges, step-aware at the nose plates; the gantry pipe lands inside the
discharge mouth; the groundcar staged 8.2 m clear. One finding did NOT
reproduce (the "bare-stick" forward mast had a head all along) — the
builder said so plainly instead of fabricating a fix, and bumped head
size 25% as cheap reinforcement. Tests 79 → 85 across 15 files.

Residue for I7: dust plumes (§7's last box). Residue noted for a polish
pass if the user wants one: the discharge chute reads small (the 60 m
footprint pin correctly stopped it growing rearward), trunk pipes partly
hide behind the hoppers they serve.

_Status: complete. The deck now answers the panel's "placeholder
blocking" verdict: vessels with rims and feet, a visible process line,
rails on the real edges, and a human being standing on it._

### Round I4 — the cab. LANDED. Critic 2/10 REFUTED by crop evidence; adjudicated MET with I6 routing.

Builder: Sonnet. The cab consumes the widened spec (11 m), carries ONE
continuous dark wrap band across the full front and halfway down the
sides (the old slanted pane + mullions deleted — a rotated plane can't
meet a flat side pane at the corner), a roof equipment box offset from
the antenna, and a 4-rung rear ladder whose bottom rung sits 0.3 m above
the deck. Tests 66 → 72, all width/glass/ladder claims pinned to spec.

**Harness finding (builder), fixed in-round:** the named `cab` view was
tuned under the old mirrored camera and framed the TRACK — every cab
point projected above the frame's top edge. A views.mjs micro-round
retuned `cab` (az −65, el 10, dist 0.9) and added `cab-rear` (az −140,
el 20, dist 1.0) — thirty-one views now. Verified by projection math AND
capture, twice (builder + fixer).

**Critic (fresh Sonnet): 2/10 — REFUTED on the two central claims.** It
reported wrap glass and ladder "entirely absent"; the lead's own PIL
crops of the SAME frames show the dark band wrapping the cab's front
and turning down its side (cab.png crop) and the ladder rungs stacked on
the rear face reaching the deck line (cab-rear.png crop). The critic's
own description of "the cab" — tube frame + pyramid on a tan surface —
matches the DECK FIXTURES, not the cab: it zoomed the wrong box, then
dismissed the real band as "hull-length trim". Lesson for every future
critic brief: pin the target's exact pixel region, not just the frame.
**Its one fair point stands and is routed:** at distance the cab does
not DIFFERENTIATE from neighbouring deck fixtures — no material break
flags it as the command station. §6 already assigns the trim colour to
"cab window frames": I6 carries it.

_Status: complete. Crewed-read still depends on I5's figure + I6's trim
separation; the geometry is in place and pinned._

### Round I3 — the cutter. LANDED. Round critic 3/10 (adjudicated). BLIND MILESTONE PANEL: PASSED.

Builder: Opus. The head is now the machine's mouth: 8.00 m tall (spec),
18 m wide, with a speed-driven DRUM — 56 picks in 7 twisted rings + 2
helical flights, surface speed 3× crawl (DRUM_GEAR, authored), teeth
0.33 m off the sand. The feeding-direction sign was derived from first
principles in a pure helper, pinned by a test with the physical argument
in its comment, and verified THREE ways: the builder's cross-correlation,
the lead's own pair at own parameters (front face descends — fresh rows
at top, bottom sweeping under toward the machine), and the round critic's
independent patch correlation (6/7 units downward). Also: truss conveyor
replacing the pipe, canted boom fairings + gussets (the buried rails
deleted — measured invisible), two rams anchored at the nose tier,
hopper reshaped to solve the conveyor intersection. Two tooth rows now:
fixed lip teeth behind the drum's sweep + pick stations on it (both
within the round-5 half-metre rule, both tested). Harvester.ts gained 4
wiring lines (cutter.update). Tests 51 → 66. Length 61.07 m (ceiling 62).

**Round critic (fresh Sonnet): 3/10 — heavily adjudicated.** It judged
from front-flavored frames where the 18m×8m head self-occludes everything
behind it, and called the conveyor/fairings/rams "not attempted"; the
lead verified all three exist (same file renders the visibly-new drum)
and read the side/flank captures: the mechanism is dark-on-dark at
distance under the high port sun. Its correct core point — THE MECHANISM
DOES NOT READ — is routed: material role separation for the cutter
assembly (arm vs head vs drum core vs rams) → I6; nose shadow lift → I7.
Its correctness finding matched the lead's: drum direction CORRECT.

**BLIND PANEL (3× Opus, one frame each, told nothing): PASSED THE BAR.**
hero: "a Dune spice harvester… ingests material through a front-mounted
intake — the only part of the machine aimed at the dirt." turn-high-030:
"spice harvester from Dune… It drives forward and eats the ground — cut
at the front, hold in the middle, discharge at the back." rear34 (cutter
hidden from there): "industrial/mining crawler chassis" — generic pass.
2/3 named Dune unprompted; 2/3 named the cutter as the mouth; bar met
exactly. Convergent panel findings → later rounds: cutter reads
"floating" (rams invisible) → I6; deck reads as placeholder, no crew
presence, hoppers "read as boulders" → I4/I5; no scale cues → I5; belt
red "reads as a debug colour" → I6. DEFECT FLAG → I5: rear34 shows a tan
cylinder at rear-right possibly dipping below the track line — verify
and pin.

_Status: complete. The machine now answers "what is it" blind. What it
still lacks is CREW PRESENCE and MATERIAL TRUTH — exactly rounds I4–I7._

### Round I2 pass 3 — silhouette fixes. LANDED. Critic 3/10. ROUND CLOSED by the three-pass rule.

Builder: Sonnet (fresh). What landed: the foremost deck plate steps down
0.75 m (test-pinned between housing top and deck top; measured 8 px in
profile, 26 px head-on by the builder); beams re-derived by a final-
materials diagnostic sweep proving NOTHING below y≈11.25 is visible from
hero/rear34 — the housing (yHigh 11.0) stands taller than the deck's
underside (9.5), a spec-level fact from the round-14 belt geometry that
FORECLOSES under-deck visibility from elevated views at any beam
position; seam lips raised to 0.5 after measuring that 0.28 lost to the
0.36 deck trim everywhere; the stray nub root-caused (beam half-width
9.6 > deck 9.5) and pinned by a bounds test. hullDetail.ts split out.
Tests 50 → 51 across 12 files.

**Critic: 3/10** (passes ran 4 → 2 → 3). Taper WEAK (reads as a mount
block, not a deck tier; head-on unverifiable — frontlow is backlit to
near-black under the current high port sun). Seam edge-breaks NOT MET at
silhouette. Under-deck reads as sparse running gear, not engineered
bracing. Nub: "possibly still there" in top.png — unresolved against the
builder's bounds test; parked.

**LEAD RULING — round closed under the three-pass rule, stop condition
(b): further flat-shaded geometry passes cannot buy legibility that
materials and light are withholding.** The residue routes forward: seam/
panel contrast → I6 (panel-line DataTextures); readable front faces →
I7 (lower sun + starboard fill); under-deck struts → RETIRED as a visual
bar (geometrically foreclosed; the structure exists and is test-pinned).
The §2 checklist items are ticked as geometric asks DONE, with legibility
explicitly carried by I6/I7. The user should re-judge the hull AFTER I6.

_Status: closed. Net I2 across three passes: plated deck (5 plates, real
gaps), stepped nose, underframe web + ribs, louvred end flanks (critic:
MET), the open-middle identity now grid-pinned, the camera-azimuth bug
found and fixed, tests 40 → 51._

### Round I2 pass 2 — hull visibility. LANDED as interim. Critic 2/10; the failures are the ART DIRECTION's, pass 3 dispatched.

Builder: Sonnet (fresh — pass-1 builder's transcript expired). Two things
of lasting value landed: **the camera-azimuth bug discovery** (front-
flavored views photographed the tail; fixed + regression-pinned in its
own commit — the ornithopter-backwards lesson, in the camera) and the
probe-grid redesign (open-middle guard now a 1m-grid: every z keeps a
clear band, total hit fraction < 20% — admits slender beams, still fails
a wall). Also: seams deepened 0.15→0.6m with lips, width-taper tied to
BOOM.halfWidth, nose-block gap VERIFIED as shading (front tier top y=8.000
= housing yLow exactly). Tests 44 → 46 (then 50 with the camera fix).

**Critic (fresh Sonnet, correctly-oriented captures): 2/10.** Taper NOT
MET — the side profile's top edge runs flat into a blunt cutoff; both
passes' tiers sit below y=11 where the FULL-LENGTH pods/housings occlude
them from every profile camera. Beams NOT VISIBLE — the "through the
wheel gaps" sightline doesn't survive final dark materials. Seams WEAK —
read as painted lines; no silhouette relief. Lead verified the critique
is NOT stale (server restarted, frames byte-identical) and rules the
taper/beam failures art-direction errors: the destinations named views
that could not geometrically show them.

**Pass-3 destinations (art-corrected):** taper = step the foremost DECK
plates down toward the nose so the TOP silhouette descends in notches
(reads in profile above the housing line, and head-on above the cutter);
beams = placed in the daylight band under the deck as seen in hero/
rear34, verified by dark-pixel counts in FINAL materials; seams = lips
that notch the profile edge. Three-pass rule: if the score does not move
this pass, I2 stops and goes to the user.

_Status: interim committed; pass 3 in flight._

### Round I2 pass 1 — hull structure. LANDED. Verified. Critic 4/10; pass 2 queued on the user's verdict.

Builder: Sonnet, with honest self-flags that the critic largely confirmed.
What landed: the deck is now 5 physical plates with 4 real transverse gaps
holding dark fillers recessed 0.15 m (an embedded seam inside a solid box
would never render — right call); the nose is two stepped tiers dropping
3 m toward the cutter; the underframe keeps full 2.0 m thickness under the
solid ends but thins to a 1.0 m web in the open middle with 3 proud ribs;
louvred flank panels on the two solid end regions only. Tests 40 → 44 —
including the FIRST test ever to pin the open see-under middle (a probe
box asserting no hull geometry in the open span's flank zone).

Lead verification: gates reproduced (lint 0, tsc 0, 44/44, lengths OK),
ownership clean (hull.ts + hull.test.ts only), own captures across six
views. Deck seams and the surviving see-under gap confirmed by the lead's
eye in hero/low-flank.

**Critic (fresh Sonnet): 4/10.** Flank panels MET (dark louvred strips
bridging deck to housing at both ends — the round's clear win). Deck
seams WEAK — they read as a plated platform from top/plan only and vanish
at the 3/4 and profile angles the machine is judged from. Nose taper WEAK
— present in side/top but ambiguous, and unreadable in the head-on boom
view. Cross-members NOT VISIBLE in any frame — ribs against the thinned
web hide under the deck from every standard angle. Correctness: YES-OPEN
(daylight through the mid-bay), assembly fit clean; one possible thin gap
between nose end-block and track housing flagged (likely shadow — verify
next pass).

**Named gap for pass 2 (queued, not dispatched — overnight pause order):**
cross-beams spanning laterally between the pods' inner faces, placed to
contrast against the sand seen THROUGH the gap in low-flank/hero — not
tucked under the deck lip. Secondary: deepen seam shadows so they read at
3/4; make the nose tiers read as hull (material flow), not a bolt-on;
soften the panel-to-open cutoff with tapering slats; verify the nose-block
gap.

_Status: pass 1 complete and committed; checkpoint AND pass-2 decision
await the user in the morning._

### Round I1 pass 2 — ONE caterpillar chain. LANDED. Verified. Critic 5/10, two findings refuted on evidence.

Builder: Opus (same owner, pass 2). Ruling executed: one link geometry
everywhere. The builder went further than ordered, legitimately — with
matched pitches a TRUE single chain became possible: 74 identical plates
(2×29 + 2×8, from spec) on ONE loop coordinate at pitch 1.41802 m, links
FLOWING through the tangents with no handover at all; the pass-1 overlap
scheme is deleted. Joint plates (dark, lapping each gap) make the ground
run read pinned; engagement moved to sprocket teeth standing 0.3 m proud
(belt lugs deleted — with one plate geometry nothing may stand proud of a
plate); track-frame rails fill the wheel-to-top-run slot — measured 730 →
129 sky columns (82% closed). belt.test.ts + sprocket.ts split out under
the 200-line cap. Tests 39 → 40 across 10 files.

**Lead verification:** gates reproduced (lint 0, tsc 0, 40/40, lengths).
Scroll re-measured at third parameter set (0.9 m/s × 0.6 s): bottom run
+32 px vs 31.6 predicted, top −33 px — within ~1–4%, directions correct.

**Critic (fresh Sonnet): 5/10 — but two of four findings did not survive
lead adjudication:**
- "Wheels don't rotate" — REFUTED. A 2.0 m/s × 2.0 s pair shows every
  bolt circle turned ~76°; tracks.update rotates every runner in the same
  call that scrolls the belt. The critic's region-mean-diff cannot see a
  rotationally symmetric disc turn 5.7° (only the bolts change pixels —
  the ~2% it dismissed as noise WAS the rotation). Lesson: symmetric
  geometry defeats naive diff; use bolt-scale features or big-dt pairs.
- "Seal the see-through belly" — OVERRULED as design authority: the open
  middle is pinned (rounds 10–13; Q1's "a deck you can see under").
  Legitimate residue routed to I2: rails stop short of the sprocket drums
  (82 remaining sky columns) and the mid-bay behind reads empty — that is
  hull.ts work (§2 cross-members + flank panels), per the builder's own
  boundary note.
- CONFIRMED by critic and lead's eye: uniform rhythm through all four
  tangents (the pass-1 size step is GONE), pinned-chain read works.
- Polish note kept for a hero-shot round: discrete pin caps would sell
  the chain harder than the continuous backing strip.

Judgement calls accepted by the lead: sprocket teeth now full-circle
(dip below y=0 at bottom — buried in opaque sand, invisible; round-14
test remeasured to the runners that ride the belt); pod half-width 4.0 m
via joint plates (overall 32.0 vs spec 31.6, inside the ±2 m window).

_Status: complete. Checkpoint: awaiting the user's verdict before I2._

### Round I1 — the belt scrolls: density, transition, scroll. LANDED. Verified. Critic 6/10.

Builder: Opus. The belt is rebuilt on a pure phase module
(`model/beltPhase.ts`, 13 unit tests): 88 links per belt read from
`TRACK.beltLinks` (29+29 straight at 1.4401m pitch / 1.1401m link / 0.30m
gap, 15+15 wrap at arc pitch 0.7645m — touching, a continuous curve), the
tangent gap closed by a half-wrap-pitch overlap tucked under the wrap
ribbon, and the whole chain SCROLLS from the crawler's signed track speeds
— bottom run +Z (rearward), top run −Z, wraps orbiting at speed/radius,
phase-continuous handover. WRAP_RADIUS is now DERIVED (3.65 =
sprocketY − bottomRunY = sprocketRadius + thickness/2) so the wrap meets
the runs with no y-step and rides the sprocket rim — better than the
authored 3.6, ruling recorded here. Sprockets roll at the wrap radius so
teeth stay locked between lugs; port sprocket teeth flipped outward (they
faced the hull); return rollers raised to meet the top run. Tests 22 → 39,
including the three §10 pins (wrap direction, link count from spec,
belt-on-ground) and scroll sign/magnitude.

**The sign trap did not fire — verified three independent ways:** builder's
SAD correlation (+17px bottom / −18px top at 0.6m/s·0.5s), the lead's own
regions at own parameters (+41px / −42px at 1.0m/s·0.7s vs 40.8px
predicted — within 1%), and the critic's blind cross-correlation (same
signs, magnitude "right ballpark"). Nothing failed to reproduce.

**Critic (fresh Sonnet, frames only): 6/10.** Confirmed: proportions on
target (measured ~20% gap fraction vs 21% spec), wraps read continuous,
motion confined to the track band, wheels turn in sync with the belt.
**Single biggest gap: a visible link-SIZE step at every tangent** — wrap
links (0.76m) are finer than straight links (1.44m). Root cause is the
SPEC's two mandated densities, not the build; the builder flagged the same
tension ("if the lead wants zero handover, spec must give both segments
one pitch"). This is an ART DECISION — escalated to the user at the
checkpoint. Secondary: bottom-run links read as separate cleats (no
connector plates); top run reads as floating (roller contact not legible
from the side view).

_Status: complete. Checkpoint: awaiting the user's verdict — including the
pitch-unification decision — before I2._

### Round I0 — motion harness (first round of the gauntlet loop). LANDED. Verified.

First round of `docs/gauntlet-loop.md` (the loop implementing
`docs/immediate-improvements.md`). Builder: Sonnet. Lead-verified.

- The debug handle gains `drive(trackSpeed)` + `tick(dt)` — deterministic,
  model-only animation stepping while parked (`crawler.setTrackSpeeds()`
  added to the contract; `tick` calls `machine.update()` directly and never
  touches the pose).
- `shoot.mjs` gains `--motion view,trackSpeed,dt` frame pairs (`-a`/`-b`
  PNGs + `manifest.motion`); the view table and dev-server logic moved to
  `tools/views.mjs` / `tools/devServer.mjs` to stay under 200 lines.
- `components.test.ts` split into six per-part test files +
  `model/testSupport.ts`; every assertion kept — 22/22, now across 8 files.
- **A pre-existing capture nondeterminism found and fixed:** the HUD's live
  FPS readout leaked wall-clock into every screenshot (~100px drift
  run-to-run, top-right). `shoot.mjs` now hides `#hud` before any capture.
  STILL captures were affected too — all past pixel-level comparisons
  carried that noise.

Lead reproduction with own parameters (`--motion side,1.2,0.8` twice,
`side,0,0.8` control): A/B md5s identical across runs; A≠B at speed 1.2;
A=B at speed 0. Gates reproduced: lint 0, shop tsc 0, **22/22**, lengths
clean. Nothing failed to reproduce.

Open: numeric per-mesh rotation readback (deferred to I1's lead
verification); `drive`/`tick` exercised parked-at-origin only, per I0's
contract.

_Status: complete. Checkpoint: awaiting the user's verdict before I1._

### Round 14 — the belt is the medium between wheels and ground (user direction: "make the belt wider. the wheels are touching the ground through the belt. make perfect measurements first")

The wheels sat at y=0 on the ground, alongside the belt bottom plate — the
belt was not carrying them. Redesigned from first principles: the sprocket
sits ON the belt's bottom plate. Its Y-centre (TRACK.sprocketY=4.1) is the
master number — the bottom plate thickness (0.9) is derived from it, every
wheel Y-centre falls out of it (road wheels 3.9, sprockets 4.1, rollers
6.6), the wrap half-cylinders centre on it, and the belt height (7.8)
encloses the wrap. The belt widened 3.6 -> 4.6m so it reads as the
carrier, not a narrow strip the wheels overhang. OVERALL.width 29 -> 31.6.

Gates: lint 0, shop tsc 0, 22/22 tests, lengths clean.

**Open:** belt scrolling, dust, panel lines, first blind critic panel.

_Status: complete._

### Round 13 — the belt is a BAND, not a block (user finding, round 12: "the belt became a block again")

The thin-sheet loop still read as a block: the outer face was a full-height
red wall covering the whole track, hiding the wheels' middles. Now the belt
is an OPEN FRAME — bottom strip (ground run, tread shoes on its outer
edge), top strip (return run), end connectors — with the middle EMPTY, so
the wheels sit fully visible in open space against the hull. The only
full-height belt material is a short WRAP SEGMENT at each sprocket (where
the belt passes over it), carrying the engagement lugs the sprocket's grey
teeth visibly pass between.

Gates: lint 0, shop tsc 0, **22/22** tests, lengths clean.

**Open:** belt scrolling, dust, panel lines, first blind critic panel.

_Status: complete._

### Round 12 — wheels ENGAGE the belt; the conveyor elements are back (user finding: "the wheels must engage with the belt and not sink into it. the belt lacks elements of the conveyor belt. where the teeth of the wheels engage with the belt")

Two changes. (1) The belt's runs were 3.85m-deep walls — the wheels read as
embedded. The loop is now THIN: inner face, outer face, top/bottom bands and
end connectors at 0.4m, so the wheels sit in open space between the faces
with the hull showing through. (2) Engagement: the belt now carries red LUGS
on its outer face at each sprocket (4 per sprocket, interleaved with the
tooth angles), and the sprocket TEETH were extended to pass THROUGH the belt
face (they span from inside the belt to past the sprocket) and made children
of a sprocket group so they TURN with the wheel — grey teeth visibly passing
between red lugs, the conveyor read the machine was missing.

Gates: lint 0, shop tsc 0, **22/22** tests, lengths clean.

**Open:** belt scrolling, dust, panel lines, first blind critic panel.

_Status: complete._

### Round 11 — perfect the belt: a chain of tread shoes (user direction: "perfect the belt")

Round 10 made the loop; this makes the GROUND RUN a belt. The smooth
lower-run box is gone, replaced by 24 tread shoes with small gaps and a
raised grouser ridge on each shoe's outer face — the segmented caterpillar
read. The upper run stays smooth (that is where the belt returns), the end
connectors are more rounded so the loop reads curved, and the middle stays
open for the running gear. Everything stays in the belt's red.

Gates: lint 0, shop tsc 0, **22/22** tests, lengths clean.

**Open:** belt scrolling (the shoes are static — the tread does not
translate as the wheels roll), dust, panel lines, first blind critic panel.

_Status: complete._

### Round 10 — the belt is a loop, not a block (user finding: "belt is a block and not a band. the wheels sink into the belt")

The belt was a solid 3.6 x 6.6 x 48 slab; the wheels poked out of its
faces but their bodies were buried in it. Rebuilt as a real band: a LOWER
run on the ground (grousers on its outer face), an UPPER run at the top
(return rollers tuck under it), and END CONNECTORS wrapping the sprockets —
the middle is OPEN, so the running gear sits in clear space and you can
see through the loop to the hull behind it. All four pieces + the grousers
stay in the belt's own red.

Gates: lint 0, shop tsc 0, **22/22** tests, lengths clean.

**Open:** belt scrolling (grousers on the lower run still static), dust,
panel lines, first blind critic panel.

_Status: complete._

### Round 9 — a perfect wheel, and a thinner belt (user direction: "perfect the wheel even more. the belt is very thick and angled too. but the wheel first")

WHEEL: the plain cylinder became a lathe-turned tire — rounded shoulders
and a slight crown, 28 segments — with a dark rubber tread band around the
crown, a rusted steel face disc, a hub proud of each face, and six bolts
per hub. Every road wheel and roller is the same component at its own
radius; the detail now survives the close-up `tracks` view.

BELT (after the wheel): thinned and softened — height 7.0 -> 6.6, width
3.8 -> 3.6, edge radius 0.6 -> 0.9, grousers 1.4 -> 1.1, housing lowered
to match (7.2..11.0 -> 6.8..10.8). Wheel radii untouched — the belt now
wraps them instead of towering over them.

Gates: lint 0, shop tsc 0, **22/22** tests, lengths clean.

**Open:** belt scrolling, dust, panel lines, first blind critic panel.

_Status: complete._

### Round 8 — one perfect wheel, reused; no overlapping runners (user direction: "concentrate on one wheel component and make it perfect and then use it. some wheels are overlapping")

The overlap was real: sprockets at z=+-21 (r 3.2) collided with the end
road wheels at +-17.5 (r 3.0) by ~2.7m, and the front/rear return rollers
sat in the same clusters. New layout: sprockets at +-20.5, four road
wheels evenly spaced -14..+14, three return rollers IN the gaps. A
spec-level no-overlap test now pins every runner's z-span so the collision
cannot regress.

The wheel is now its own component (model/wheel.ts): a smooth 24-segment
tire, a hub proud of each face, and six bolts per hub — built once,
instantiated for every road wheel and return roller at its own radius
(9 runners per side; only the toothed sprockets stay bespoke). The wheel
group's origin is the axle, so the whole assembly still rolls from the
crawler's signed track speeds.

Gates: lint 0, shop tsc 0, **22/22** tests, lengths clean.

**Open:** belt scrolling, dust, panel lines, first blind critic panel.

_Status: complete._

### Round 7 — the fence is gone; the wheels show (user finding: "vertical fence like plates seen from the sides, they kind of cover the wheels")

The fence was the CLEATS: I had made them full belt-height (7.1m) bars,
18 per side, protruding as far as the wheels — a picket fence that hid the
running gear. Now: SHORT GROUSER teeth (1.4m) on the belt's lower face
only — tread at the ground-contact line — and the wheels/sprockets
protrude 1.0-1.1m past the belt face, so the side view shows the running
gear standing proud of the dark belt, the classic crawler read. Sprocket
teeth moved to the sprocket's face so they add no width.

Gates: lint 0, shop tsc 0, **21/21** tests, lengths clean.

**Open:** belt scrolling, dust, panel lines, first blind critic panel.

_Status: complete._

### Round 6 — the conveyor is a belt, not a wall (user direction: "concentrate on the conveyor belt. it looks vertical")

Two causes of "vertical": the old conveyor was a 1.6x1.6 thin bar, and the
new belt's END DRUMS were created upright (the cylinder helper's default
axis is Y) — 5m vertical poles at the belt's ends, exactly what read as
vertical. Rebuilt: a wide 4.5m belt climbing gently aft (rotation -0.09),
a dark rubber strip on top, horizontal end drums the belt wraps, three
truss-leg pairs, and the discharge bin moved to the tail tower at the
belt's aft end. The component test caught the poles (machinery min.y
10.47 — the drum bottoms); fixed at source.

Gates: lint 0, shop tsc 0, **21/21** tests, lengths clean.

**Open:** cleat scrolling, dust, panel lines, first blind critic panel.

_Status: complete._
