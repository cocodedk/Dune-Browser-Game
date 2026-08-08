// character-shop/chani/src/model/face/cheeks.ts
// The SIDE of the face — zygomatic arch, malar fat pad, sub-malar hollow,
// temporal fossa — as displacement fields on the same surface warp.ts
// displaces. Split out of warp.ts by PASS 3 for the 200-line rule and
// because these four share one property nothing in warp.ts has: they live
// 35-55mm off the centre line and must be GATED away from it.
//
// This file is the answer to the single finding every pass-2 judge gave:
// "female-leaning but GAUNT and CAREWORN". Gaunt is not a shape, it is a
// count — how many shadow lines cross the mid-face between the eye and the
// jaw. Pass 2 had three (tear trough, sub-malar hollow, mandible trench) on
// a face the brief describes as young, watchful and fine-boned. A young
// cheek has ONE form on it: a high round mass, lit, with nothing under it.
//
// So the arch keeps its step and the hollow that gives it that step is cut
// to a third, with the malar pad grown by half to fill what the hollow
// stops carving. The step head.test.ts guards survives because the arch
// itself never moved — what moved is the amount of face carved away to
// prove it is there.

import { bell, medial } from './curves'
import { EYE_X, EYE_Y, ZYGION_Y } from './plan'
import type { Delta } from './warp'

/** The medial gate every form here passes through. Nothing on the side of a
 *  face may displace the bridge of a nose, and until pass 3 all four of
 *  these did — see curves.ts medial() for the 0.13mm groove it caused. 14mm
 *  is inboard of the inner canthus and outboard of the nose's own widest
 *  authored half-width, so the gate opens in the only band where neither
 *  form has anything to say. */
const GATE_FROM = 0.0140
const GATE_TO = 0.0300

// Cheekbones — out AND sideways, because a zygomatic arch widens the head,
// it does not just bulge toward camera. This is the plane change that stops
// the mid-face reading as an egg, and the sideways term is what makes the
// brief's heart shape.
//
// It is also the form that failed hardest in the first three captures. At
// 9.2mm on a cos^2 mask the arch sits ~44 degrees off the centre line where
// cos^2 has already dropped to 0.48, so the surface actually moved 4.4mm
// and the mid-face rendered as one smooth vertical wall from the eye to the
// jaw — the single biggest reason the face read long and male. The cheek,
// its hollow and the temple all switched to the WIDE mask for this reason;
// the brow, sockets, lids and every centre-line form keep cos^2, which is
// correct for them because they sit near the front.
const CHEEK_X = 0.0508
const CHEEK_OUT = 0.0148
const CHEEK_WIDEN = 0.0120
const CHEEK_WX = 0.0268
const CHEEK_WY = 0.0190

// The malar fat pad — the apple of the cheek, and the form that decides how
// old this face looks. Pass 2 added it at 7.2mm and it was not enough,
// because 1.0mm of its 7.2 was being spent out on the nose bridge where the
// gate now stops it: an ungated Gaussian spreads its amplitude over the
// whole face and has strong LOCAL contrast nowhere.
//
// 11.2mm, gated, sitting 17.5mm below the arch and inboard of it. Wide
// sigmas on purpose: this form must never have an edge of its own, or it
// becomes a third shadow line instead of the thing that erases two. It is
// placed off EYE_X so it tracks the eyes outward rather than drifting under
// the nose when the eyes move.
const MALAR_X = EYE_X - 0.0006
const MALAR_Y = ZYGION_Y - 0.0175
const MALAR_OUT = 0.0112
const MALAR_WX = 0.0250
const MALAR_WY = 0.0250

// Hollow under the arch — gives the cheekbone something to sit proud OF.
//
// 1.5mm, down from pass 2's 3.4 and pass 1's 5.8. Each cut was made for the
// same reason and only the third one was big enough: a sub-malar hollow on
// a 24-year-old is a hint that the arch has an underside, not a trench that
// runs to the jawline. head.test.ts holds the arch 8mm proud of it and it
// still measures well over that, because the STEP is bought by the arch and
// the pad either side of the hollow, not by the depth of the hollow itself.
// Pass 2's comment claimed its 3.4mm no longer reached the jaw; the render
// said otherwise, and the vertical sigma is cut again here.
const HOLLOW_X = 0.0530
const HOLLOW_Y = EYE_Y - 0.0290
const HOLLOW_IN = 0.0015
const HOLLOW_WX = 0.0205
const HOLLOW_WY = 0.0120

// Temporal fossa — the shallow suck-in above the arch and behind the brow
// tail. Small, but without it the skull between brow and hairline is a
// barrel. Cut from 4.8mm to 3.6: a visible temple hollow is a skull read,
// and this face has no fat to spare on the judges' count.
const TEMPLE_X = 0.0575
const TEMPLE_Y = EYE_Y + 0.0280
const TEMPLE_IN = 0.0036
const TEMPLE_WX = 0.0225
const TEMPLE_WY = 0.0225

/** Arch, malar pad, hollow and temple. `wide` is the cos^0.55 angular mask
 *  — still 0.81 where cos^2 has fallen to 0.48, which is the difference
 *  between a 9mm cheekbone that renders and one that does not. */
export function cheekMass(ax: number, y: number, wide: number): Delta {
  const m = wide * medial(ax, GATE_FROM, GATE_TO)
  const cheek = bell(ax - CHEEK_X, CHEEK_WX) * bell(y - ZYGION_Y, CHEEK_WY) * m
  let dz = -CHEEK_OUT * cheek
  dz -= MALAR_OUT * bell(ax - MALAR_X, MALAR_WX) * bell(y - MALAR_Y, MALAR_WY) * m
  dz += HOLLOW_IN * bell(ax - HOLLOW_X, HOLLOW_WX) * bell(y - HOLLOW_Y, HOLLOW_WY) * m
  dz += TEMPLE_IN * bell(ax - TEMPLE_X, TEMPLE_WX) * bell(y - TEMPLE_Y, TEMPLE_WY) * m
  return { dx: CHEEK_WIDEN * cheek, dz }
}
