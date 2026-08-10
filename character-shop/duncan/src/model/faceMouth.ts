// character-shop/duncan/src/model/faceMouth.ts
// The MIDDLE and LOWER face as summed displacement: the nose's profile, the
// mouth's, and the paired patches that give each of them its ends. Split out
// of faceSculpt.ts with faceBrow.ts when the rebuild took that file past 200
// lines. Positive = back into the head, as everywhere in the face field.
//
// THE NOSE IS UNCHANGED and deliberately so — both pass-1 critics and the
// lead named it the strongest feature on the face, and the fastest way to
// lose a round is to tune something that is already working.
//
// THE MOUTH IS REBUILT. Pass 1 rendered a beige scalloped pad under a thin
// dark bar, and cropping it showed exactly why: the beard's aperture opened
// 12.5mm of skin, the whole of it below the lip line, and inside that opening
// the skull had no structure a 6.6-pixel-per-millimetre render could resolve.
// The stomion "notch" was a dip in a splined column — a Catmull-Rom through
// 19.5, 7.2 and 15mm of amplitude over 15mm of height is a smooth valley, and
// a smooth valley at this scale is one continuous pad. The three things a
// mouth needs are all LINES, and lines are what a rib cannot say:
//
//   * the stomion — a 66 x 4.8mm groove, 5mm deep, between the lips;
//   * the labiomental crease — the same trick under the lower lip, which is
//     what stops the lip and the chin reading as one shelf;
//   * the cupid's bow — a paired peak on the upper lip with the philtrum's
//     dip between them, the only structure visible in the 8mm of vermilion
//     the moustache leaves showing.
//
// And it is WIDER: FACE.mouthHalf went 62mm -> 69mm this pass, because 62mm
// of mouth inside 171mm of beard is a small pad and Momoa's is wide at rest.

import { patch, ribField } from './faceFields'
import type { Rib } from './faceFields'
import { FACE } from './faceLandmarks'

const SIDES = [-1, 1] as const

/** Nose: nothing at the nasion, a convex bridge, the tip frontmost, then in
 *  hard under the base. The amplitude column decelerates on the way down
 *  (9.7, 8.8, 6.0, 4.7, 3.1mm of added reach per step) which is what makes
 *  the bridge read straight-to-slightly-convex instead of as a wedge. The
 *  halves are wide because at 13-20mm this was a knife and the render read
 *  "beak" — the opposite of the broad-based nose the brief asks for. */
const NOSE: Rib[] = [
  { y: 1.7480, amp: 0.0000, half: 0.0250 },
  { y: FACE.subnasale, amp: 0.0170, half: 0.0285 },
  { y: FACE.noseTip, amp: 0.0330, half: 0.0250 },
  { y: 1.7760, amp: 0.0300, half: 0.0195 },
  { y: 1.7900, amp: 0.0245, half: 0.0180 },
  { y: 1.8020, amp: 0.0150, half: 0.0175 },
  { y: 1.8130, amp: 0.0065, half: 0.0180 },
  { y: 1.8230, amp: 0.0000, half: 0.0190 },
]

/** Chin, lip, lip. The column now carries the ROLL — 19.5mm at the lower lip
 *  against 7.2mm at the crease under it — and leaves the crease itself, the
 *  lip line and the bow to the three grooves in featureRelief(), because a
 *  splined column cannot hold an edge. */
const MOUTH: Rib[] = [
  { y: 1.6740, amp: 0.0000, half: 0.0330 },
  { y: FACE.pogonion, amp: 0.0180, half: 0.0340 },
  { y: FACE.labiomental, amp: 0.0080, half: 0.0335 },
  { y: 1.7180, amp: 0.0150, half: FACE.mouthHalf },
  { y: FACE.lowerLip, amp: 0.0195, half: FACE.mouthHalf },
  { y: FACE.stomion, amp: 0.0105, half: FACE.mouthHalf },
  { y: FACE.upperLip, amp: 0.0150, half: 0.0330 },
  { y: 1.7530, amp: 0.0038, half: 0.0260 },
  { y: 1.7610, amp: 0.0000, half: 0.0210 },
]

/** The three lip lines. Each is a patch whose y-radius is a few millimetres
 *  — narrow enough that its two edges are within one ring of each other on a
 *  96-ring skull, which is what makes it render as a line and not a valley. */
function lipLines(x: number, y: number): number {
  let fwd = 0
  fwd += 0.0050 * patch(x, y - FACE.stomion, 0.0330, 0.0024)
  fwd += 0.0040 * patch(x, y - FACE.labiomental, 0.0260, 0.0042)
  for (const side of SIDES) {
    // The bow's two peaks, with the philtrum's dip left between them.
    fwd -= 0.0028 * patch(x - side * 0.0090, y - 1.7422, 0.0115, 0.0055)
    // The lower lip's two lobes — a lip is not one pad either.
    fwd -= 0.0032 * patch(x - side * 0.0135, y - 1.7272, 0.0155, 0.0062)
  }
  return fwd
}

/** Nose and mouth ribs, the lip lines, plus the paired patches that give each
 *  form its ends: alar wings on the nose, sunk corners on the mouth. The
 *  corners moved out with FACE.mouthHalf — a corner inboard of the lip line
 *  it terminates is a dimple, not a corner. */
export function featureRelief(x: number, y: number): number {
  let fwd = -ribField(NOSE, y, x) - ribField(MOUTH, y, x) + lipLines(x, y)
  for (const side of SIDES) {
    fwd -= 0.0050 * patch(x - side * FACE.alarX, y - 1.7585, 0.0145, 0.0080)
    fwd += 0.0050 * patch(x - side * 0.0340, y - FACE.stomion, 0.0110, 0.0105)
  }
  return fwd
}
