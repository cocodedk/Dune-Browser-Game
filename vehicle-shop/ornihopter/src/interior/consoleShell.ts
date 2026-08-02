// vehicle-shop/ornihopter/src/interior/consoleShell.ts
// The dash's structure: a TAPERED console that follows the wedge hull, a raked
// instrument panel facing the seated eye, a glareshield over it and a coaming
// lip along its near edge. Instruments themselves are instruments.ts.
//
// FOUND, round 6b: "a see-through horizontal slot between the panel top and
// the coaming (~x 870-1000, y 758-772) with sunlit sand visible through it",
// and "the panel reads as a table you are standing over". Both come from the
// same place — the dash was a single BoxGeometry sized to the hull's narrowest
// corner (layout.ts CONSOLE), so it was too narrow to reach the sills, flat on
// top so nothing faced the pilot, and every greeble on it was a separate box
// with air between them.
//
// The console is now a swept surface: at every station its half-width is read
// from the hull at the dash's own height, so it lands ON the side liner at
// both ends of its run instead of stopping short of it. The near half is flat
// — switch land, under the hands — and the far half rakes up 0.30m to a
// glareshield, which is what turns the panel from a table into something a
// seated pilot looks INTO.

import { Group } from 'three'
import { CONSOLE } from './layout'
import { box, flatQuad, disposeGroup, type Placed } from './sceneUtils'
import { consoleBodyMaterial, consoleFaceMaterial, armorMaterial } from './materials'

const STATIONS = 8
/** Where the flat switch deck ends and the raked instrument panel begins. */
export const PANEL_BREAK_Z = CONSOLE.nearZ - 0.35
/** How far the panel's top edge stands above the flat deck. */
export const PANEL_RISE = 0.3

/** Dash surface height at z: flat aft of the break, raking up forward of it. */
export function surfaceYAt(z: number): number {
  if (z >= PANEL_BREAK_Z) return CONSOLE.topY
  const t = (PANEL_BREAK_Z - z) / (PANEL_BREAK_Z - CONSOLE.farZ)
  return CONSOLE.topY + PANEL_RISE * Math.min(1, Math.max(0, t))
}

/** The raked panel's own normal tilt, for mounting instruments flush on it. */
export const PANEL_PITCH = Math.atan2(PANEL_RISE, PANEL_BREAK_Z - CONSOLE.farZ)

function stations(): number[] {
  return Array.from(
    { length: STATIONS + 1 },
    (_, i) => CONSOLE.farZ + ((CONSOLE.nearZ - CONSOLE.farZ) * i) / STATIONS
  )
}

function corner(x: number, y: number, z: number): Placed {
  return { x, y, z }
}

function topSurface(group: Group, zs: readonly number[]): void {
  const material = consoleBodyMaterial()
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i]
    const zb = zs[i + 1]
    const wa = CONSOLE.halfWidthAt(za)
    const wb = CONSOLE.halfWidthAt(zb)
    if (wa <= 0 || wb <= 0) continue
    const ya = surfaceYAt(za)
    const yb = surfaceYAt(zb)
    group.add(
      flatQuad(
        corner(-wa, ya, za),
        corner(wa, ya, za),
        corner(wb, yb, zb),
        corner(-wb, yb, zb),
        material
      )
    )
  }
}

function sidesAndEnds(group: Group, zs: readonly number[]): void {
  const material = consoleBodyMaterial()
  const base = CONSOLE.baseY
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i]
    const zb = zs[i + 1]
    const wa = CONSOLE.halfWidthAt(za)
    const wb = CONSOLE.halfWidthAt(zb)
    if (wa <= 0 || wb <= 0) continue
    for (const sign of [-1, 1] as const) {
      group.add(
        flatQuad(
          corner(sign * wa, base, za),
          corner(sign * wa, surfaceYAt(za), za),
          corner(sign * wb, surfaceYAt(zb), zb),
          corner(sign * wb, base, zb),
          material
        )
      )
    }
    group.add(
      flatQuad(
        corner(-wa, base, za),
        corner(wa, base, za),
        corner(wb, base, zb),
        corner(-wb, base, zb),
        material
      )
    )
  }
  for (const [z, sign] of [[CONSOLE.nearZ, 1], [CONSOLE.farZ, -1]] as const) {
    const w = CONSOLE.halfWidthAt(z)
    if (w <= 0) continue
    const y = surfaceYAt(z)
    const face = sign > 0 ? consoleFaceMaterial() : material
    group.add(
      flatQuad(corner(-w, base, z), corner(w, base, z), corner(w, y, z), corner(-w, y, z), face)
    )
  }
}

/**
 * The coaming: a lip standing along the dash's near edge. It is the thing the
 * critic could not find — "no see-through gaps between panel, coaming, sills"
 * presupposes a coaming — and it is also what reads, at the bottom of frame,
 * as the edge of a tub a body is sitting down inside. ROUND 9d: onto the dark
 * armor tone (was machinedMaterial's olive) so that edge reads as a distinct
 * band rather than the same metal as the structure around it; named so
 * crewPalette.test.ts can hold the tone mechanically.
 */
function coaming(group: Group): void {
  const w = CONSOLE.halfWidthAt(CONSOLE.nearZ)
  if (w <= 0) return
  const mesh = box(w * 2, CONSOLE.coamingRise, 0.13, armorMaterial(), {
    x: 0,
    y: CONSOLE.topY + CONSOLE.coamingRise / 2,
    z: CONSOLE.nearZ - 0.06,
  })
  mesh.name = 'coaming'
  group.add(mesh)
}

/** The glareshield hood over the top of the raked panel. ROUND 9d: same dark
 *  armor tone as the coaming — it is the same dash, not a second material. */
function glareshield(group: Group): void {
  const w = CONSOLE.halfWidthAt(CONSOLE.farZ + 0.12)
  if (w <= 0) return
  group.add(
    box(w * 1.75, 0.07, 0.26, armorMaterial(), {
      x: 0,
      y: surfaceYAt(CONSOLE.farZ) + 0.06,
      z: CONSOLE.farZ + 0.14,
    })
  )
}

export interface ConsoleShell {
  group: Group
  dispose(): void
}

export function buildConsoleShell(): ConsoleShell {
  const group = new Group()
  group.name = 'consoleShell'
  const zs = stations()
  topSurface(group, zs)
  sidesAndEnds(group, zs)
  coaming(group)
  glareshield(group)
  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
