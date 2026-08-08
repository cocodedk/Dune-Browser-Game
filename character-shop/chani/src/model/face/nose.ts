// character-shop/chani/src/model/face/nose.ts
// The nose, as fields on the same surface warp.ts and mouth.ts displace.
// Split out of mouth.ts by PASS 2, for the 200-line rule and because the
// critic's finding was that pass 1's nose "has no bridge, tip, or wings
// even in 3/4" — it read as a soft crease on a flat plane. Rebuilding it
// properly needs five named forms where pass 1 had two, and they do not
// fit alongside the lips.
//
// Destination: a small STRAIGHT-bridged nose, soft defined tip with the
// faintest upturn, subtle alar wings and nostril shadows. It has to read
// in headfront as well as in headthreequarter, and headfront is the
// harder one — a nose seen dead on has no silhouette at all, so
// everything it shows is the shading break between its dorsum and its
// side planes. That is the whole design problem here.
//
// WHY PASS 1'S NOSE HAD NO SIDES. Its protrusion fell off as bell(x, w) —
// a Gaussian, whose derivative at the centre line is zero and which has no
// straight part anywhere. A Gaussian ridge IS a mound: there is no
// dorsum, no sidewall, and no edge between them for a light to break on.
// The second number is the damning one. Pass 1's tip stood 2.05mm proud of
// its own upper lip, where life runs 8-12mm — so whatever the table said,
// the nose was very nearly in the plane of the mouth. This one measures
// 8.60mm proud of the lip and 14.5mm past the subnasale.

import { bell, smoothTable } from './curves'
import { NOSE_TIP_Y, SUBNASALE_Y } from './plan'
import type { Delta } from './warp'

/** Quartic super-Gaussian: exp(-(d/w)^4). Flat within ~half of w, then
 *  falls off far more steeply than a Gaussian does — 0.94 at d = w/2,
 *  0.37 at d = w, 0.0 by d = 1.6w. That flat top IS the dorsum and that
 *  steep flank IS the sidewall, and the corner between them is the only
 *  thing that makes a nose exist in a dead-front render. bell() cannot
 *  make one at any width. */
function ridge(d: number, w: number): number {
  const t = (d / w) ** 2
  return Math.exp(-t * t)
}

// Nose as a profile: [height, protrusion beyond the face plane, half
// width]. Read bottom-up: lip plane, columella base, under-tip, tip,
// supratip break, lower dorsum, dorsum, upper dorsum, nasion, out at the
// brow. The tip's protrusion is the frontmost value on the whole figure by
// construction, which is what keeps depth.test.ts's face-toward-minus-Z
// guard honest without a special-cased mesh — R1 needed a separate nose
// blob for that and the blob is exactly what read as a snowman.
//
// The upturn is the gap between rows 2 and 4: the tip stands ~12mm further
// forward than the columella base only 8mm below it, so the underside of
// the nose runs back and down instead of hanging. Barely there on purpose.
//
// The SUPRATIP BREAK at 0.0858 is new and is what stops the dorsum and the
// tip being one continuous ramp: the protrusion dips 4.6mm below the tip's
// over 4.6mm of height, so the profile has the small concave notch above
// the tip that every young nose has and no straight taper does.
//
// PASS 3 PULLED THE WHOLE THING BACK. Pass 2 overshot in the direction it
// was pushed: the capture came back with a broad base, flared wings and a
// tip that hooks DOWN, against a brief that says small, straight, soft
// tip, faintest upturn. Three numbers changed and each has its own reason.
//
// The alar base half-width, 15.2 -> 13.8mm, is a 30mm base rather than a
// 30.4 plus two 6.2mm wing buds either side of it — the flare was mostly
// the buds and they are cut harder (WING_OUT below).
//
// The HOOK was not in this table at all and that is why pass 2 could not
// see it: the profile here already runs back and down under the tip. It
// was TIP_OUT, a 4.0mm Gaussian bud centred 0.4mm BELOW the tip with a
// 7.4mm vertical sigma, so a third of its mass sat under the tip and
// dragged the lowest lit point of the nose downward. The bud now sits
// 0.6mm ABOVE the tip with a 5.5mm sigma and 3.0mm of amplitude.
//
// The tip's PROTRUSION is the one number that did not come down, and the
// first cut of this pass proved why by taking it to 23.6mm: the measured
// clearance over the upper lip fell to 2.29mm against a 6-16mm guard, and
// the E-line put the lip 2.66mm in FRONT of the nose-tip-to-chin line — a
// muzzle, which is exactly what pass 1 was rejected for. "Small" is a
// WIDTH, not a projection: the alar base and the wings are what read as
// broad, and they are what came in. The tip stands 26.2mm proud of the
// face plane against pass 2's 24.8, and its measured protrusion past the
// subnasale is 18.7mm — a human female runs 17-21, so the nose is not
// large, it is correctly projected under a narrower base. The clearance
// over the upper lip is what this buys, and it is shared with the mouth:
// see mouth.ts SEAM_OUT for the other half of the same trade.
const NOSE: readonly number[][] = [
  [SUBNASALE_Y - 0.0072, 0.0000, 0.0122],
  [SUBNASALE_Y, 0.0106, 0.0138], // columella base — the alar base width
  [0.0788, 0.0208, 0.0130],
  [NOSE_TIP_Y, 0.0262, 0.0116], // tip — the frontmost point on the figure
  [0.0856, 0.0214, 0.0094], // supratip break
  [0.0928, 0.0174, 0.0080],
  [0.1020, 0.0132, 0.0075], // dorsum — straight, per the brief
  [0.1135, 0.0080, 0.0078],
  [0.1250, 0.0026, 0.0088], // nasion — shallow, so the root does not vanish
  [0.1330, 0.0000, 0.0102],
]

/** Fraction of the authored half-width the protrusion's own falloff uses.
 *  Higher than pass 1's 0.72 because ridge() falls off so much faster than
 *  bell() did: the dorsum has to stay as wide as the table says while the
 *  flank gets steeper, which is the entire point of the change. */
const NOSE_EDGE = 0.88

// The tip itself, as a small round bud ON the ridge. Without it the top of
// the dorsum is a flat-topped extrusion that ends in a corner, which is a
// carved nose, not a soft one. This is the brief's "soft tip" and it is
// the only Gaussian left in the nose.
const TIP_OUT = 0.0038
const TIP_Y = NOSE_TIP_Y + 0.0006
const TIP_WX = 0.0098
const TIP_WY = 0.0055

// Nostril wings: two forward buds either side of the tip. Without them the
// nose is a ridge that ends, and the alar crease below has nothing to run
// around. 3.8mm, not 6.2, and pulled 1.6mm inboard: at 6.2mm each bud was
// as proud as a quarter of the whole nose and the base rendered FLARED,
// which is the opposite of the brief's word for it.
const WING_OUT = 0.0038
const WING_X = 0.0112
const WING_Y = 0.0768
const WING_WX = 0.0056
const WING_WY = 0.0062

// Alar crease: the groove where the nostril wing meets the cheek. Without
// it the nose, philtrum and upper lip fuse into one convex muzzle, which
// is what the first two captures showed. Moved in with the wing it runs
// around, and softened — with a narrower base there is less to separate.
const ALAR_IN = 0.0032
const ALAR_X = 0.0168
const ALAR_Y = 0.0748
const ALAR_WX = 0.0048
const ALAR_WY = 0.0072

// Nostril shadow: a small recess under the alar rim, inboard of the wing
// and below the tip. It is the dark note that says "nostril" at bust
// framing without modelling an opening — a real aperture would be a hole
// in a closed surface and this sculpt does not have holes. Its sigma is
// deliberately tight enough that at x = 0 it is worth 2.7% of itself, so
// it never eats the columella between the two of them.
const NOSTRIL_IN = 0.0021
const NOSTRIL_X = 0.0072
const NOSTRIL_Y = SUBNASALE_Y - 0.0008
const NOSTRIL_WX = 0.0040
const NOSTRIL_WY = 0.0038

/** Dorsum, tip, wings, alar creases and nostril shadows, summed. `front`
 *  is the same cos^2 mask warp.ts and mouth.ts use. */
export function noseField(x: number, ax: number, y: number, front: number): Delta {
  let dz = 0

  const protrusion = smoothTable(NOSE, y, 1)
  if (protrusion > 0) dz -= protrusion * ridge(x, smoothTable(NOSE, y, 2) * NOSE_EDGE)
  dz -= TIP_OUT * bell(x, TIP_WX) * bell(y - TIP_Y, TIP_WY)
  dz -= WING_OUT * bell(ax - WING_X, WING_WX) * bell(y - WING_Y, WING_WY)
  dz += ALAR_IN * bell(ax - ALAR_X, ALAR_WX) * bell(y - ALAR_Y, ALAR_WY)
  dz += NOSTRIL_IN * bell(ax - NOSTRIL_X, NOSTRIL_WX) * bell(y - NOSTRIL_Y, NOSTRIL_WY)

  return { dx: 0, dz: dz * front }
}
