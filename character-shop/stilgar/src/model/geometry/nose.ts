// character-shop/stilgar/src/model/geometry/nose.ts
// THE NOSE IS THE LANDMARK — and R2 pass 3 rebuilds its CHARACTER, because
// passes 1 and 2 both built the wrong nose well.
//
// Pass 2's brief asked for "a dorsum ridge that catches a hard highlight".
// It got one: measured on the pass-2 mesh, the front-facing plane of the
// dorsum was 0.0 mm wide at mid-bridge, at the low bridge AND at the tip
// (widest span staying within 1 mm of the most-forward point). By 3 mm off
// the midline the surface had already fallen 6 mm back. N.L against the
// portrait key went 0.00 on one side of the midline to 0.77 on the other in
// a single step. That is a knife, and a knife on this face reads hooked and
// aquiline — a hawk's nose, on a man who has neither.
//
// Bardem's nose is BROAD EVERYWHERE. So the shape language changes:
//
//   - the cross-section is a PLATEAU, not a ridge. DORSUM_POWER 4.6 with a
//     wider WIDTH_SCALE gives a flat front plane about 20 mm across with two
//     steep sidewalls, instead of a Gaussian mound with a crest on top.
//   - the crest is GONE. A narrow ridge line riding the top of a plateau is
//     the one form that would put the knife straight back.
//   - the tip is a wide rounded lobule with a soft droop, not a downturned
//     point, and the alar base is wide with flared wings.
//   - the bridge runs THICK out of the glabella. Pass 2's midline profile
//     dropped 12.8 mm between the glabella and the nasion and climbed back
//     out to the tip: a scoop, which is what detaches a nose from a brow and
//     lets it read as a beak. The table below plus browField.ts's lowered
//     glabella cut that dip to a couple of millimetres.
//
// Still a displacement of the head's own loft, never a mesh: a "nose ball"
// primitive is exactly what pass 2 of R1 shipped and what read as a mushroom.
// The tip is the frontmost point on the whole figure BY CONSTRUCTION, which
// is what keeps seam.test.ts's face-toward-minus-Z guard honest.

import { bell, smoothTable, superBell } from './curves'
import { eyeLineLocal } from '../proportions'

const EY = eyeLineLocal

// [height, protrusion beyond the face plane, half width]. Read bottom-up:
// base, wings, under-tip, tip, lower dorsum, mid-dorsum, eye line, upper
// root, root.
//
// WHY THE WIDTH TAPERS ABOVE THE EYE LINE, since "broad everywhere" is the
// brief: the medial canthus sits at |x| = 19.4 mm (faceFields.EYE_X minus
// APERTURE_HALF_LEN) and eyes.ts seats its lens on the socket floor, which
// does NOT include this file's displacement. A dorsum still 24 mm half-wide
// at the eye line pushes the SKIN there 11.8 mm forward of the lens and
// buries the inner corner of the eye under its own nose. Measured, not
// guessed. A nose narrows at the root anyway; the broad statement belongs to
// the lower two thirds, which is what both portrait framings actually read.
const NOSE: number[][] = [
  [EY - 0.0500, 0.0000, 0.0212],
  [EY - 0.0448, 0.0112, 0.0300], // base
  [EY - 0.0382, 0.0300, 0.0340], // alar wings, widest
  [EY - 0.0316, 0.0414, 0.0294], // under the tip
  [EY - 0.0252, 0.0448, 0.0270], // tip — the frontmost point on the figure
  [EY - 0.0160, 0.0372, 0.0256], // lower dorsum
  [EY - 0.0080, 0.0316, 0.0236], // mid-dorsum — the broad front plane
  [EY + 0.0000, 0.0262, 0.0148], // eye line — clear of the medial canthus
  [EY + 0.0100, 0.0152, 0.0126],
  [EY + 0.0210, 0.0000, 0.0112], // root, welded under the glabella
]

// A super-Gaussian cross-section. Exponent 2.0 (pass 2) is a mound with a
// ridge; 4.6 is a plateau with sidewalls. The plateau's own normal is not
// parallel to the forehead's — the protrusion table climbs 45 mm over the
// 46 mm from root to tip, so the front plane is tilted about 44 degrees
// up-and-forward and sits at N.L 0.79 against a dead-front face plane's 0.61.
// It reads as a wide soft band, which is the instruction.
const DORSUM_POWER = 4.6
// 0.86 of the authored half-width, up from 0.56. With the exponent above
// this puts the flat front plane at roughly 0.83 of the table's half-width
// and the 10%-of-protrusion line at 1.20 of it: a 20 mm plane with a 15 mm
// sidewall each side at the mid-dorsum.
const WIDTH_SCALE = 0.86

// Alar wings: two lobes of their own beside the base, so the bottom of the
// nose reads as ball-plus-wings instead of one cone. Pushed 6 mm further out
// than pass 2 to sit beside the wider base rather than on top of it.
const WING_X = 0.0248
const WING_Y = EY - 0.0356
const WING_OUT = 0.0104
const WING_WX = 0.0122
const WING_WY = 0.0100

// The alar crease — the groove that separates each wing from the cheek, and
// the reason the nose reads at all in a FRONT view: a face lit from 45
// degrees shows a nose by the shadow down its side, not by its profile. It
// moves out with the nose: the dorsum now carries 10% of its protrusion as
// far as |x| = 25 mm at the bridge and 35 mm at the alar row, so a crease
// left at pass 2's 31 mm would have been cut INTO the nose instead of beside
// it.
const CREASE_X = 0.0392
const CREASE_Y = EY - 0.0330
const CREASE_IN = 0.0114
const CREASE_WX = 0.0112
const CREASE_WY = 0.0252

// The tip's own fullness, and the two nostril hollows under it. BULB is
// twice as wide and a third shallower than pass 2's: on a plateau the job is
// no longer to add a ball but to keep the lobule from going flat-topped, and
// a narrow bell there would rebuild the knife at tip height.
const BULB_Y = EY - 0.0272
const BULB_OUT = 0.0030
const BULB_WX = 0.0190
const BULB_WY = 0.0110
const NOSTRIL_X = 0.0138
const NOSTRIL_Y = EY - 0.0418
const NOSTRIL_IN = 0.0104
const NOSTRIL_WX = 0.0064
const NOSTRIL_WY = 0.0052

// THE BASE PLANE — R2 pass 4, and the answer to "the nose base renders as
// pure black with no nostril or septum read".
//
// It was not underlit, it was UNMODELLED. Everything under the tip was one
// smooth recess (BASE below) with two dimples in it, so the whole underside
// was a single surface facing straight down — and browField.ts's sign
// analysis says exactly what that renders as: a plane with dz/dy < -1.22
// under this key is black, and the fill at azimuth -60/elevation 12 only
// reaches surfaces tilted UP toward it. A downward plane gets nothing from
// either lamp, whatever its shape.
//
// So the base is three forms now, and the two that matter both face FORWARD
// rather than down. COLUMELLA is the wall between the nostrils, projecting
// 5.2 mm and running down from the tip, so it catches the key at the same
// angle the dorsum does; RIM is the rolled lower edge of each wing, 3.8 mm
// proud, which puts a lit line under each ala. Between them sit the two
// nostril hollows, deeper and tighter than pass 3's, so the black is
// CONFINED to two openings with lit structure on three sides of each.
const COLU_OUT = 0.0052
const COLU_Y = EY - 0.0428
const COLU_WX = 0.0046
const COLU_WY = 0.0088
const RIM_OUT = 0.0038
const RIM_X = 0.0212
const RIM_Y = EY - 0.0432
const RIM_WX = 0.0094
const RIM_WY = 0.0056

// Undercut below the base, so there is a shadow under the nose rather than a
// smooth ramp down into the moustache. Shallower than pass 3's 9.2 mm: with
// the columella and the alar rims carrying the form, a deep blanket recess
// only puts them back in the dark it was the whole problem.
const BASE_IN = 0.0068
const BASE_Y = EY - 0.0476
const BASE_WX = 0.0240
const BASE_WY = 0.0050

// The droop, now soft. Pass 2 used this plus a deep base undercut to make
// the tip read DOWNTURNED, and combined with the knife dorsum that is most
// of what the critic called hooked. A wide lobule wants the columella tucked
// only enough to stop the underside reading as a ramp, so the amplitude
// drops from 3.0 mm to 1.6 mm and spreads over twice the width.
const DROOP_Y = EY - 0.0306
const DROOP_IN = 0.0016
const DROOP_WX = 0.0130
const DROOP_WY = 0.0050

// A hint of a root dip at the nasion, and no more than a hint. Pass 2's
// 3.0 mm scoop is a third of the reason the nose detached from the brow;
// the protrusion table now carries the bridge up to meet the glabella and
// this only marks where the two forms meet.
const ROOT_IN = 0.0010
const ROOT_Y = EY + 0.0100
const ROOT_WX = 0.0150
const ROOT_WY = 0.0075

/** Z displacement of the nose at (x, y). Negative is forward. */
export function noseDz(x: number, ax: number, y: number, front: number): number {
  let dz = 0
  const protrusion = smoothTable(NOSE, y, 1)
  if (protrusion > 0) {
    dz -= protrusion * superBell(x, smoothTable(NOSE, y, 2) * WIDTH_SCALE, DORSUM_POWER) * front
  }
  dz -= WING_OUT * bell(ax - WING_X, WING_WX) * bell(y - WING_Y, WING_WY) * front
  dz -= BULB_OUT * bell(x, BULB_WX) * bell(y - BULB_Y, BULB_WY) * front
  dz += DROOP_IN * bell(x, DROOP_WX) * bell(y - DROOP_Y, DROOP_WY) * front
  dz += NOSTRIL_IN * bell(ax - NOSTRIL_X, NOSTRIL_WX) * bell(y - NOSTRIL_Y, NOSTRIL_WY) * front
  dz -= COLU_OUT * bell(x, COLU_WX) * bell(y - COLU_Y, COLU_WY) * front
  dz -= RIM_OUT * bell(ax - RIM_X, RIM_WX) * bell(y - RIM_Y, RIM_WY) * front
  dz += CREASE_IN * bell(ax - CREASE_X, CREASE_WX) * bell(y - CREASE_Y, CREASE_WY) * front
  dz += BASE_IN * bell(x, BASE_WX) * bell(y - BASE_Y, BASE_WY) * front
  dz += ROOT_IN * bell(x, ROOT_WX) * bell(y - ROOT_Y, ROOT_WY) * front
  return dz
}
