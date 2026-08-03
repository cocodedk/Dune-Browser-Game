// vehicle-shop/ornihopter/src/interior/sticks.ts
// The pilot station's manual controls: a floor-rising CYCLIC and a left-hand
// COLLECTIVE, replacing round 6b's single brow-hung arm. Round 7's critic on
// that arm: "one smooth, unbroken cylinder — no knuckles, no hinge blocks, no
// clamps — with a black helix wound around it and a ball stuck on its FLANK,
// not its end." The user's AH-64E ruling (docs/apache-gauntlet.md) wants a
// stick between the knees and a collective at the left, not an arm hanging
// from the roof — cyclic.ts, collective.ts and controlConduit.ts build the
// three parts; layout.ts's CYCLIC/COLLECTIVE/CONDUIT place them.
//
// The copilot keeps a mirrored cyclic only — no reference names a copilot
// collective, and frustum.test.ts's 'stick-copilot' contract only ever
// asked for a control column in that seat, not a matched pair.
//
// 'stick-pilot' and 'stick-copilot' are kept as the two wrapper names on
// purpose: frustum.test.ts and Cockpit.test.ts both depend on them existing
// and the pilot's intersecting the camera frustum. That contract has not
// changed, only what each wrapper contains.

import { Group } from 'three'
import { buildCyclic } from './cyclic'
import { buildCollective } from './collective'
import { buildControlConduit } from './controlConduit'
import { disposeGroup } from './sceneUtils'

export interface Sticks {
  group: Group
  dispose(): void
}

export function createControlSticks(): Sticks {
  const group = new Group()
  group.name = 'sticks'

  const pilotStation = new Group()
  pilotStation.name = 'stick-pilot'
  pilotStation.add(buildCyclic(false, 'cyclic'), buildCollective())

  const copilotStation = new Group()
  copilotStation.name = 'stick-copilot'
  copilotStation.add(buildCyclic(true, 'cyclic-copilot'))

  // The conduit answers to the overhead console, not to either seat — see
  // layout.ts's CONDUIT for why it sits right of centre, clear of both.
  group.add(pilotStation, copilotStation, buildControlConduit())

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
