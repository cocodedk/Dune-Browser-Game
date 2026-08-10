// character-shop/stilgar/src/model/geometry/beardEdges.ts
// WHERE THE BEARD STOPS: its angular extent, its upper hairline, its lower
// contour, and the deterministic irregularity both edges carry.
//
// Split out of beardField.ts in R2 pass 4 purely for size — the interior of
// the field (grooves, mandible, moustache, the mouth window) and the boundary
// of it are different decisions with different evidence behind them, and the
// two together no longer fit in 200 lines. The boundary is the half that
// every critic since R1 has actually reported on, so its history stays with
// it here.
//
// Everything is even in the angle about the chin, so the beard is bilaterally
// symmetric by construction and no term can crease the midline.

const DEG = Math.PI / 180

/** Ends behind the jaw angle and well under the hood's rim, so the patch's
 *  own cut edge never shows. */
export const EDGE = 103 * DEG

// Upper hairline by |angle from front|: low at the moustache (just under the
// nose base), climbing across the cheek to a full sideburn. R2 dropped the
// front from 0.0952 to 0.0866 — R1's moustache started ABOVE the subnasale,
// i.e. hair growing onto the nose.
// R2 pass 1 dropped the front of this table again and killed the ripple that
// runs over it near the chin. Its own render is why: the hairline's
// irregularity peaked at 17 degrees off the midline and reached local
// 0.1016, which is 14 mm ABOVE the subnasale and level with the nose tip —
// the beard was growing over the alar wings and had swallowed the strongest
// landmark on the face. A hairline may be irregular anywhere except across
// the nose.
//
// R2 pass 2 dropped the hairline across the cheeks by 3-4 mm. The pass-1
// headfront's exposed skin ran from the brow to the moustache as a narrow
// inverted teardrop, because this table climbs 19 mm between 20 and 60
// degrees and eats the cheek on the way. It still reaches a full sideburn at
// the edge — what changed is where the climb STARTS.
// R2 pass 3 drops it again, and this time the number that mattered was read
// off the MESH rather than off this table: the beard's top edge measured
// EY-15.2 mm at 60 degrees, EY-12.2 at 70 and EY-4.2 at 90 — hair reaching to
// within 4 mm of the eye line, which is a sideburn, not a beard boundary, and
// it is most of the "walrus spread across the cheeks" a critic reported. The
// boundary now lands on the LOWER CHEEK across the whole visible range and
// only reaches a sideburn behind the jaw where the hood covers it. The front
// drops to 0.0792, level with the measured subnasale (0.0798) instead of 4 mm
// above it, so the moustache stops growing onto the alar base.
export const TOP: number[][] = [
  [0, 0.0792], [20 * DEG, 0.0806], [40 * DEG, 0.0866],
  [60 * DEG, 0.0940], [80 * DEG, 0.1024], [EDGE, 0.1096],
]

// Lower edge: the "rounded-square contour" the brief asks for. R2 pass 2
// squares it further — flat out to 52 degrees, then a short hard sweep up the
// jaw. This curve IS the bottom of the head in a front view, and at pass 1 it
// began turning up at 48 degrees and read as a bowl.
//
// R2 pass 4 LIFTS THE FRONT 11.2 mm, to give the figure a neck. Three judges
// read the bust as "the head sits on the shoulders with no neck" — the beard
// ran down to local -6.2 mm (measured -7.5 mm with the inner sheet), which is
// below the head group's own origin and straight into the collar, so beard
// and robe were one unbroken dark mass with no throat between them. At +5.0
// mm the hair stops on the jaw's underside and the loft's submandibular ramp
// is left showing.
//
// +5.0 mm is a CEILING, not a preference: face.test.ts measures visible head
// mass as hood peak minus this edge against spec.ts's 0.13-0.14 band, and at
// a 0.24073 hood peak on a 1.81 m figure anything above local +5.4 mm puts
// the head under the spec's own minimum. The neck cannot be opened further
// from this file.
export const BOTTOM: number[][] = [
  [0, 0.0050], [30 * DEG, 0.0056], [52 * DEG, 0.0072],
  [66 * DEG, 0.0118], [80 * DEG, 0.0300], [92 * DEG, 0.0496], [EDGE, 0.0660],
]

/** Deterministic, bilaterally symmetric ripple for the hairline edges. Built
 *  from cos(k*|angle|) terms with no phase, so the slope is zero at the chin
 *  — a phase term there would crease the beard down the middle. */
export function ripple(a: number, k1: number, w1: number, k2: number, w2: number): number {
  return w1 * (1 - Math.cos(k1 * a)) + w2 * (1 - Math.cos(k2 * a))
}
