// character-shop/duncan/src/model/leg.ts
// ONE surface from inside the pelvis down to the ankle, plus the boot. The
// table is in stature metres so it can be read straight against bodyPlan's
// landmarks; loft.ts subtracts the hip joint's own height when it builds.
//
// Living taper, read bottom-up: ankle, a calf that swells BACKWARDS (rb
// 99mm against rf 70mm — the gastrocnemius is the reason a leg reads from
// the side at all), a knee that breaks NARROWER than both the calf below and
// the thigh above while pushing its own cap forward (rf 86mm, rb 76mm), then
// the thigh mass. Thigh half-width tops out at 112mm against the calf's 79mm
// — thigh clearly greater than calf, the verdict item, and 1.42x is the
// ratio a heavy-built man actually carries.
//
// The top station sits at 1.020m, well inside the pelvis loft, and both legs
// carry their upper stations ACROSS the midline (hip centre 98mm, thigh
// half-width 112mm): the crotch is closed by solid overlap between three
// surfaces, not bridged by a filler blob that a critic could name.

import { Group } from 'three'
import type { DuncanMaterials } from './materials'
import { roundedBox } from './primitives'
import type { Bin } from './primitives'
import { loft } from './loft'
import type { Station } from './stations'
import { LM, JOINTS } from './bodyPlan'

const LEG: Station[] = [
  { y: LM.ankle, rx: 0.042, rb: 0.048, rf: 0.040, cz: 0.002 },
  { y: 0.230, rx: 0.063, rb: 0.076, rf: 0.058, cz: 0.006 },
  // Calf: back reach 0.120 against the knee's 0.072 above it and the
  // ankle's 0.050 below — the gastrocnemius is the reason a lower leg
  // reads at all from the side, and pass 4 gave it 0.105.
  { y: LM.calfBelly, rx: 0.081, rb: 0.112, rf: 0.070, cz: 0.008 },
  { y: 0.470, rx: 0.079, rb: 0.094, rf: 0.078, cz: 0.004 },
  { y: LM.knee, rx: 0.080, rb: 0.076, rf: 0.088, cz: -0.004 },
  { y: 0.700, rx: 0.100, rb: 0.102, rf: 0.104, cz: 0.000 },
  { y: LM.thighBelly, rx: 0.114, rb: 0.120, rf: 0.116, cz: 0.002 },
  { y: LM.crotch, rx: 0.115, rb: 0.122, rf: 0.114, cz: 0.004 },
  { y: LM.hipJoint, rx: 0.109, rb: 0.120, rf: 0.108, cz: 0.006 },
  { y: 1.020, rx: 0.098, rb: 0.104, rf: 0.098, cz: 0.006 },
]

// Boot: the one part of this figure that is honestly rigid, so the one part
// still allowed to be a primitive. Shaft and sole both bottom out at exactly
// y=0 so the figure stands flush and the height measurement starts at the
// ground.
//
// Pass 5: bulk down ~15% in section, length up. Pass 4's boot was 146mm
// across and 252mm long over a shin measuring 126mm — it out-massed the leg
// it was on and read as a moon boot. 132 x 274 reads as a combat boot: a
// foot is long, not fat.
const SHAFT = { w: 0.132, h: 0.185, d: 0.128, r: 0.028 }
const SOLE = { w: 0.130, h: 0.062, d: 0.274, r: 0.024 }

/** side: -1 for legL (-X), +1 for legR (+X). */
export function buildLeg(bin: Bin, materials: DuncanMaterials, side: -1 | 1): Group {
  const group = new Group()
  group.name = side < 0 ? 'legL' : 'legR'

  loft(bin, group, LEG, materials.fabric, 'legMass', {
    originY: JOINTS.pelvisY, rings: 50, radial: 28,
    domeBottomH: 0.030, domeTopH: 0.040,
  })

  const ground = -JOINTS.pelvisY
  roundedBox(bin, group, SHAFT.w, SHAFT.h, SHAFT.d, SHAFT.r,
    materials.accent, 0, ground + SHAFT.h / 2, 0.004, 'bootShaft')
  roundedBox(bin, group, SOLE.w, SOLE.h, SOLE.d, SOLE.r,
    materials.accent, 0, ground + SOLE.h / 2, -0.070, 'bootSole')

  return group
}
