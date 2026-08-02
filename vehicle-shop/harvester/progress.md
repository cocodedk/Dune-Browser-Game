# Harvester Gauntlet Loop — the bar, and the live log

Standalone rig at `vehicle-shop/harvester/`, on branch
`feat/harvester-vehicle-shop`, in its own worktree at
`../Dune-Browser-Game-harvester` (sibling of the main checkout, node_modules
symlinked). Run it with `npm run shop:harvester`.

## STATUS — first handoff. Read this first in a fresh session.

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
