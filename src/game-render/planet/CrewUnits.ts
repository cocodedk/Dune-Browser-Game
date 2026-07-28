// src/game-render/planet/CrewUnits.ts
// Your people, on the planet, doing the thing you told them to.
//
// Crews were invisible: you assigned one and it vanished into a panel. There
// was no way to look at Arrakis and see that two crews are out on the sand at
// Red Wall and one is prospecting the Cielago — which is most of what a player
// wants from a map of their own operation.
//
// Harvesting crews get the machine. Everyone else gets a small marker in the
// colour of what they are doing, scattered around their anchor so several at
// one place do not stack into one dot.

import {
  Group, Mesh, ConeGeometry, SphereGeometry, MeshBasicMaterial, Vector3,
  type Object3D,
} from 'three'
import type { WorldState } from '../../types'
import { placeCrews, scatterOffset } from '../../game-engine/crews/placement'
import type { CrewActivity, PlacedCrew } from '../../game-engine/crews/placement'
import { createHarvester } from '../machines/Harvester'
import { latLonToVec3, canvasToLatLon } from './sphere'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from '../modes/strategic/markerLayout'

/** One colour per activity, so the map reads without a legend. */
const ACTIVITY_COLOR: Record<CrewActivity, number> = {
  harvesting: 0xe8913a,
  prospecting: 0x6fd0e8,
  planting: 0x6cc45a,
  drilling: 0xd8604a,
  resting: 0x8a7f6d,
}

const UP = new Vector3(0, 1, 0)

export interface CrewUnits {
  group: Group
  update(world: WorldState, elapsedMs: number): void
  dispose(): void
}

export function createCrewUnits(
  planetRadius: number,
  radiusAt: (direction: Vector3) => number,
): CrewUnits {
  const group = new Group()
  group.name = 'crew-units'

  const markerScale = planetRadius * 0.014
  const pin = new ConeGeometry(markerScale * 0.7, markerScale * 2.4, 5)
  pin.translate(0, markerScale * 1.2, 0)
  const bead = new SphereGeometry(markerScale * 0.55, 8, 6)

  const materials = new Map<CrewActivity, MeshBasicMaterial>()
  for (const [activity, color] of Object.entries(ACTIVITY_COLOR)) {
    materials.set(activity as CrewActivity, new MeshBasicMaterial({
      color, fog: false, depthTest: false,
    }))
  }

  // Pooled: crews are reassigned constantly and rebuilding meshes on every
  // change would churn geometry every time the player clicks a task button.
  const pins: Mesh[] = []
  const harvesters: ReturnType<typeof createHarvester>[] = []

  function pinAt(index: number): Mesh {
    while (pins.length <= index) {
      const mesh = new Mesh(pin, materials.get('resting')!)
      mesh.name = `crew:${pins.length}`
      mesh.renderOrder = 11
      mesh.visible = false
      pins.push(mesh)
      group.add(mesh)
    }
    return pins[index]
  }

  function harvesterAt(index: number): Object3D {
    while (harvesters.length <= index) {
      const machine = createHarvester(planetRadius * 0.017)
      machine.group.name = `harvester:${harvesters.length}`
      machine.group.visible = false
      harvesters.push(machine)
      group.add(machine.group)
    }
    return harvesters[index].group
  }

  /** Surface point for a crew's anchor, offset so crews do not stack. */
  function seatFor(world: WorldState, crew: PlacedCrew, index: number): Vector3 | null {
    const source = crew.atField
      ? world.spiceFields.find(f => f.id === crew.anchorId)
      : world.villages.find(v => v.id === crew.anchorId)
    if (!source) return null

    const offset = scatterOffset(crew.groupId, index)
    // Offsets are in canvas units, which the projection turns into degrees —
    // so a crew sits beside its anchor rather than on top of it.
    const spread = crew.activity === 'prospecting' ? 26 : 11
    const ll = canvasToLatLon(
      { x: source.position.x + offset.x * spread, y: source.position.y + offset.y * spread },
      SOURCE_WIDTH, SOURCE_HEIGHT,
    )
    const dir = latLonToVec3(ll, 1)
    return new Vector3(dir.x, dir.y, dir.z).normalize()
  }

  return {
    group,
    update(world: WorldState, elapsedMs: number): void {
      const harvesterGroups = new Set(
        world.equipment
          .filter(e => e.kind === 'harvester' || e.kind === 'heavy_harvester')
          .map(e => e.groupId)
          .filter((id): id is string => typeof id === 'string'),
      )

      const crews = placeCrews(
        world.troopGroups.map(g => ({
          id: g.id,
          locationId: g.locationId,
          size: g.size,
          task: g.task,
          taskTargetId: g.taskTargetId,
          changeoverDaysLeft: g.changeoverDaysLeft,
        })),
        world.spiceFields.map(f => f.id),
        harvesterGroups,
      )

      for (const mesh of pins) mesh.visible = false
      for (const machine of harvesters) machine.group.visible = false

      let pinIndex = 0
      let machineIndex = 0

      crews.forEach((crew, i) => {
        const out = seatFor(world, crew, i)
        if (!out) return
        const surface = radiusAt(out)

        // A crew working a machine gets the machine; everyone else a pin.
        const showMachine = crew.atField && crew.hasHarvester
        const object = showMachine ? harvesterAt(machineIndex++) : pinAt(pinIndex++)

        object.position.copy(out).multiplyScalar(surface)
        object.quaternion.setFromUnitVectors(UP, out)
        object.visible = true

        if (!showMachine) {
          const mesh = object as Mesh
          mesh.material = materials.get(crew.activity)!
          // A crew mid-changeover is drawn small: present, not yet working.
          mesh.scale.setScalar(crew.idleThisDay ? 0.6 : 1)
          mesh.geometry = crew.activity === 'resting' ? bead : pin
        }
      })

      for (const machine of harvesters) {
        if (machine.group.visible) machine.update(elapsedMs)
      }
    },
    dispose(): void {
      pin.dispose()
      bead.dispose()
      for (const m of materials.values()) m.dispose()
      for (const machine of harvesters) machine.dispose()
      group.clear()
    },
  }
}
