// src/game-render/modes/flight/geometry/nacelleGeometry.ts
// Jet nacelles — the thing that "explains propulsion" (stage 22 section 2.1:
// "nothing anywhere that explains propulsion"). Herbert's craft is explicitly
// hybrid: jets for thrust, wings for lift ("Stub wings elongated, cupped the
// air. The craft became a full 'thopter" — section 2.1), so a pair of pods
// flanking the tailboom reads as the jet half of that pairing without
// claiming to be a specific engine type.
//
// The intake rim is section 2.5's "engine nacelle rims / intake lips —
// 1,200 triangles — rim profile reads, interior does not": the rim gets a
// real bevelled torus, the interior is a flat dark disc, not a modelled bore.

import {
  Group, Mesh, LatheGeometry, TorusGeometry, CircleGeometry, Vector2,
  type BufferGeometry, type Material,
} from 'three'
import { FUSELAGE_LENGTH_SCALE } from './fuselageGeometry'

const NACELLE_PROFILE: ReadonlyArray<readonly [z: number, r: number]> = [
  [0.0, 0.4],
  [0.15, 0.5],
  [1.0, 0.52],
  [2.2, 0.4],
  [3.0, 0.18],
  [3.3, 0.05],
]

const MOUNT_X = 1.55
const MOUNT_Z = 6.6 * FUSELAGE_LENGTH_SCALE

export interface NacelleParts {
  group: Group
  geometries: BufferGeometry[]
}

function buildOnePod(side: 1 | -1, body: Material, rim: Material, dark: Material, geometries: BufferGeometry[]): Group {
  const group = new Group()

  const points = NACELLE_PROFILE.map(([z, r]) => new Vector2(r, z))
  const bodyGeometry = new LatheGeometry(points, 12)
  bodyGeometry.rotateX(Math.PI / 2)
  bodyGeometry.translate(0, 0, -1.6) // centre the 3.3-long profile on its own mount point
  geometries.push(bodyGeometry)
  const bodyMesh = new Mesh(bodyGeometry, body)
  group.add(bodyMesh)

  // Intake lip: a bevelled rim rather than a bare open edge.
  const rimGeometry = new TorusGeometry(0.42, 0.06, 8, 16)
  rimGeometry.translate(0, 0, -1.6)
  geometries.push(rimGeometry)
  group.add(new Mesh(rimGeometry, rim))

  // Dark interior disc, set back slightly — reads as an opening without
  // modelling a bore section 2.5 says will never be seen.
  const darkGeometry = new CircleGeometry(0.36, 14)
  darkGeometry.translate(0, 0, -1.5)
  geometries.push(darkGeometry)
  group.add(new Mesh(darkGeometry, dark))

  group.position.set(side * MOUNT_X, -0.15, MOUNT_Z)
  return group
}

/**
 * @param body Hull paint, matching the fuselage.
 * @param rim Worn-metal — sand-scoured intake lips are exactly the wear mask
 *   section 2.4 specifies.
 * @param dark A near-black, low-key material standing in for the intake bore.
 */
export function buildNacelles(body: Material, rim: Material, dark: Material): NacelleParts {
  const group = new Group()
  const geometries: BufferGeometry[] = []
  group.add(buildOnePod(1, body, rim, dark, geometries))
  group.add(buildOnePod(-1, body, rim, dark, geometries))
  return { group, geometries }
}
