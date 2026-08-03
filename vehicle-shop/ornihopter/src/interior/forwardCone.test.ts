// vehicle-shop/ornihopter/src/interior/forwardCone.test.ts
// User finding #2: "the cockpit is very good, yet there is a
// windows/windshield frame which blocks the view right in front of the
// pilot." enclosure.test.ts's 48x30 full-frame grid never isolated it — its
// samples can straddle a beam a few degrees wide near dead-centre and still
// read the frame as sealed overall. This test is a dense, narrow sweep of
// ONLY the centre of the forward view, dense enough that nothing between a
// beam's edges can hide from it.
//
// THE CAUSE, measured: interior/canopyLayout.ts's mullionStations() puts a
// crossBeam (interior/canopyFrame.ts) on every canopy station inside the
// aperture band (0.75-2.30m aft); exactly one qualifies, 1.2m aft, and the
// pilot's level sightline crosses the deck 43mm under it (canopyFrame.ts's
// MULLION_DEPTH comment). model/geometry/canopyGeometry.ts mirrors a mullion
// rib at the same station on the outside. Both layers put opaque frame dead
// centre in the cone below.
//
// Grid: 13 rows x 21 cols, +/-6 degrees vertical and +/-10 horizontal about
// level-forward. gazeDirection(0, 0, yaw, pitch) starts from the dead-ahead
// ray (ndcX = ndcY = 0) and applies ONLY the head-look yaw/pitch rotation
// (camera/cameraRig.ts's own convention), so sweeping yaw/pitch here is a
// fixed-angle cone about the boresight — not a screen-space grid warped by
// the camera's FOV/aspect the way sampleFrame's NDC grid is.

import { describe, it, expect, afterAll } from 'vitest'
import { Raycaster, Vector3, type Object3D } from 'three'
import { createCockpit } from './Cockpit'
import { buildCanopy } from '../model/geometry/canopyGeometry'
import { PILOT_EYE, HALF_LENGTH } from '../spec'
import { gazeDirection, castGaze } from './sightlines'

const V_HALF_DEG = 6
const H_HALF_DEG = 10
const ROWS = 13
const COLS = 21

const EYE = new Vector3(PILOT_EYE.x, PILOT_EYE.y, PILOT_EYE.z)

function coneAngles(): Array<readonly [yaw: number, pitch: number]> {
  const out: Array<readonly [number, number]> = []
  for (let r = 0; r < ROWS; r++) {
    const pitch = -V_HALF_DEG + (r * (2 * V_HALF_DEG)) / (ROWS - 1)
    for (let c = 0; c < COLS; c++) {
      const yaw = -H_HALF_DEG + (c * (2 * H_HALF_DEG)) / (COLS - 1)
      out.push([yaw, pitch])
    }
  }
  return out
}

/** What the ray hit, identified well enough to name it in a failure message.
 *  The crossBeam/rib meshes carry no individual .name (sceneUtils.ts's box()
 *  never sets one), so the group they live under (canopyFrame vs canopy) and
 *  the station the hit POINT itself measures at — data, not an assumed label
 *  — are what "names" a member here. */
function describeHit(targets: Object3D[], direction: Vector3): string {
  const raycaster = new Raycaster(EYE, direction, 0.02, 400)
  const hits = raycaster.intersectObjects(targets, true)
  if (hits.length === 0) return '(open, no hit)'
  const obj = hits[0].object as Object3D
  const group = obj.parent?.name || obj.name || '(unnamed)'
  const aft = (hits[0].point.z + HALF_LENGTH).toFixed(2)
  return `${group}@${aft}m-aft`
}

function missReport(targets: Object3D[], angles: ReadonlyArray<readonly [number, number]>): string {
  const misses = angles
    .map(([yaw, pitch]) => {
      const direction = gazeDirection(0, 0, yaw, pitch)
      return { yaw, pitch, hit: castGaze(targets, direction).hit, direction }
    })
    .filter((s) => s.hit !== 'glazing')
  const buckets = new Map<string, { count: number; yaws: number[]; pitches: number[] }>()
  for (const m of misses) {
    const label = `${m.hit}:${describeHit(targets, m.direction)}`
    const b = buckets.get(label) ?? { count: 0, yaws: [], pitches: [] }
    b.count += 1
    b.yaws.push(m.yaw)
    b.pitches.push(m.pitch)
    buckets.set(label, b)
  }
  return [...buckets.entries()]
    .map(([label, b]) => {
      const yawRange = `${Math.min(...b.yaws)}..${Math.max(...b.yaws)}`
      const pitchRange = `${Math.min(...b.pitches)}..${Math.max(...b.pitches)}`
      return `${label} x${b.count} (yaw ${yawRange}, pitch ${pitchRange})`
    })
    .join(' | ')
}

const cockpit = createCockpit()
const canopy = buildCanopy()
const targets: Object3D[] = [cockpit.root as unknown as Object3D, canopy.group]

afterAll(() => {
  cockpit.dispose()
  for (const g of canopy.geometries) g.dispose()
  for (const m of canopy.materials) m.dispose()
})

describe('the forward cone is glazed edge to edge', () => {
  it('dead-ahead through the full right side hits glazing at every pitch but the bottom row', () => {
    // This is the region user finding #2 actually named ("right in front of
    // the pilot") — yaw 0..10, i.e. dead-ahead through the full right —
    // and the removed mullion's signature was centred and fully symmetric,
    // so a half-fixed or regressed mullion would fail here too. Pitch -6,
    // the single bottom-most row, is excluded: see the KNOWN LIMITATION test
    // below for what lives there and why it is not this round's mullion.
    const angles = coneAngles().filter(([yaw, pitch]) => yaw >= 0 && pitch > -V_HALF_DEG)
    const misses = angles.filter(
      ([yaw, pitch]) => castGaze(targets, gazeDirection(0, 0, yaw, pitch)).hit !== 'glazing'
    )
    expect(`${misses.length} of ${angles.length}: ${missReport(targets, angles)}`).toBe(
      `0 of ${angles.length}: `
    )
  })

  it('ROUND 9E: the cone reaches far HIGHER now — up to +24 degrees, all glazing', () => {
    // The 6f cone above stopped at +6 degrees because that was all the
    // aperture had: it ended at 2.45m aft, a metre AHEAD of the eye, and the
    // brow beam hung 0.16m under its aft edge. MEASURED on the pre-9e tree,
    // this same sweep: 27 of 117 rays missed glazing, every one of them naming
    // canopyFrame (the brow at 2.45m aft and the roof liner behind it) or the
    // overheadPanel that hung from it. With the aperture opened to 4.6m aft
    // the whole upward wedge is glass: 0 of 117.
    //
    // This is the "should get STRONGER" half of the contract — the same
    // dead-ahead-through-the-right region, swept two and a half times further
    // up, where the pilot looks when he raises the nose.
    const angles: Array<readonly [number, number]> = []
    for (let r = 0; r <= 8; r++) {
      const pitch = (r * 24) / 8
      for (let c = 0; c <= 12; c++) angles.push([(c * 10) / 12, pitch])
    }
    const misses = angles.filter(
      ([yaw, pitch]) => castGaze(targets, gazeDirection(0, 0, yaw, pitch)).hit !== 'glazing'
    )
    expect(`${misses.length} of ${angles.length}: ${missReport(targets, angles)}`).toBe(
      `0 of ${angles.length}: `
    )
  })

  it('KNOWN LIMITATION: the bottom pitch row and the pilot-side wedge are pre-existing, not the mullion', () => {
    // MEASURED, round 6f, AFTER the 1.2m mullion fix: 80 of 273 rays in the
    // full grid still miss glazing, but every one is either (a) pitch -6,
    // which runs below the aperture's own lower edge at EVERY yaw including
    // the far right, or (b) a wedge confined to yaw < 0 (the pilot's own
    // side: PILOT_EYE.x is -0.38, and the forward aperture is only
    // 0.42-0.78m half-wide there) that shrinks monotonically to nothing by
    // pitch +6. Both trace to the aperture's own OUTLINE (canopyPlan.ts's
    // PLAN, kit-measured and untouchable per the standing ruling) and the
    // seat offset it forces (spec.ts's COCKPIT.seatOffsetX, round 6b,
    // derived from that same outline) — not a mullion/bay-authoring matter.
    // Identical hit set before and after this round's fix. A regression
    // guard, not a target: this is not expected to reach zero without moving
    // geometry outside this round's mandate, and the lead should decide if
    // it is worth a future round.
    const misses = coneAngles().filter(
      ([yaw, pitch]) => castGaze(targets, gazeDirection(0, 0, yaw, pitch)).hit !== 'glazing'
    )
    const total = coneAngles().length
    if (misses.length > 80) {
      expect(`${misses.length} of ${total}: ${missReport(targets, coneAngles())}`).toBe(
        `<=80 of ${total}`
      )
    }
    expect(misses.length).toBeLessThanOrEqual(80)
  })
})
