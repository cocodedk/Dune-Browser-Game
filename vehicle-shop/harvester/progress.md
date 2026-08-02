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
