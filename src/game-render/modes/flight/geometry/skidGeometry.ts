// src/game-render/modes/flight/geometry/skidGeometry.ts
// Landing skids — "buglike legs for landing" (Cryo's 1992 ornithopter, the
// design this project recreates; stage 22 section 2.1). Absent entirely
// today (section 1.5: "no landing gear"), and section 2.3's build plan calls
// them cheap silhouette value. Tucked close to the belly rather than fully
// extended: this craft is only ever seen in flight (landing/takeoff is out
// of scope — section 5), so a deployed-for-touchdown pose would read as a
// mistake, not a feature.
//
// Round 5: section 2.2's corrected table calls the underbody "dense
// mechanism... where the greeble budget belongs" (reference:
// .shots/reference/mr-O4copy.jpg, mr-IMG_9407.jpg show multi-strut gear
// clusters, not four bare legs). Each leg gets a thinner actuator strut
// alongside its thigh, plus a small hydraulic-block greeble at the hip; the
// front and rear pairs get a lateral cross-brace between their knees — real
// gear this dense needs bracing, not four independent legs.

import {
  Group, Mesh, CatmullRomCurve3, TubeGeometry, SphereGeometry, BoxGeometry, Vector3,
  type BufferGeometry, type Material,
} from 'three'
import { hullRadiusAt, FUSELAGE_LENGTH_SCALE } from './fuselageGeometry'

interface LegMount {
  x: number
  z: number
}

interface LegPoints {
  hip: Vector3
  knee: Vector3
}

const FRONT_LEGS: LegMount[] = [
  { x: 1.15, z: -4.2 * FUSELAGE_LENGTH_SCALE }, { x: -1.15, z: -4.2 * FUSELAGE_LENGTH_SCALE },
]
const REAR_LEGS: LegMount[] = [
  { x: 0.95, z: 4.4 * FUSELAGE_LENGTH_SCALE }, { x: -0.95, z: 4.4 * FUSELAGE_LENGTH_SCALE },
]

function buildLeg(mount: LegMount, material: Material, geometries: BufferGeometry[]): { group: Group; points: LegPoints } {
  const group = new Group()
  const sign = Math.sign(mount.x) || 1
  const hipY = -hullRadiusAt(mount.z) * 0.82

  const hip = new Vector3(mount.x, hipY, mount.z)
  const knee = new Vector3(mount.x + sign * 0.9, hipY - 1.35, mount.z + 0.3)
  const foot = new Vector3(mount.x + sign * 0.55, hipY - 2.45, mount.z - 0.15)

  const thighCurve = new CatmullRomCurve3([hip, knee])
  const thighGeometry = new TubeGeometry(thighCurve, 6, 0.15, 6, false)
  geometries.push(thighGeometry)
  group.add(new Mesh(thighGeometry, material))

  const shinCurve = new CatmullRomCurve3([knee, foot])
  const shinGeometry = new TubeGeometry(shinCurve, 6, 0.085, 6, false)
  geometries.push(shinGeometry)
  group.add(new Mesh(shinGeometry, material))

  const footGeometry = new SphereGeometry(0.16, 8, 6)
  const footMesh = new Mesh(footGeometry, material)
  footMesh.position.copy(foot)
  footMesh.scale.set(1, 0.7, 1)
  geometries.push(footGeometry)
  group.add(footMesh)

  // Secondary actuator strut, thinner and offset from the main thigh — a
  // single tube reads as a stick-figure leg no matter how dense the rest of
  // the craft gets; a real gear leg is never one member alone.
  const actuatorHip = hip.clone().add(new Vector3(0, 0.14, sign * -0.2))
  const actuatorKnee = knee.clone().add(new Vector3(0, 0.06, sign * -0.14))
  const actuatorCurve = new CatmullRomCurve3([actuatorHip, actuatorKnee])
  const actuatorGeometry = new TubeGeometry(actuatorCurve, 5, 0.05, 5, false)
  geometries.push(actuatorGeometry)
  group.add(new Mesh(actuatorGeometry, material))

  // Hydraulic-block greeble at the hip mount — a scale cue where the leg
  // meets the belly, the same "small element gives the eye a scale cue"
  // logic section 2.5 already applies to the wing markings.
  const greebleGeometry = new BoxGeometry(0.3, 0.22, 0.34)
  const greeble = new Mesh(greebleGeometry, material)
  greeble.position.copy(hip).add(new Vector3(0, 0.08, 0))
  geometries.push(greebleGeometry)
  group.add(greeble)

  return { group, points: { hip, knee } }
}

export interface SkidParts {
  group: Group
  geometries: BufferGeometry[]
}

/** @param material The worn-metal material — ground contact is where paint goes first. */
export function buildSkids(material: Material): SkidParts {
  const group = new Group()
  const geometries: BufferGeometry[] = []

  const legPoints = [...FRONT_LEGS, ...REAR_LEGS].map((mount) => {
    const leg = buildLeg(mount, material, geometries)
    group.add(leg.group)
    return leg.points
  })

  // Lateral cross-brace between each pair's knees.
  const [frontA, frontB, rearA, rearB] = legPoints
  for (const [a, b] of [[frontA, frontB], [rearA, rearB]] as const) {
    const braceCurve = new CatmullRomCurve3([a.knee, b.knee])
    const braceGeometry = new TubeGeometry(braceCurve, 6, 0.06, 5, false)
    geometries.push(braceGeometry)
    group.add(new Mesh(braceGeometry, material))
  }

  return { group, geometries }
}
