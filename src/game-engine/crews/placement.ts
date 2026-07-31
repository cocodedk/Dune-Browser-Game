// src/game-engine/crews/placement.ts
// PURE: where each crew actually is, and what they are doing there.
//
// Crews have been invisible. You assign one and it disappears into a panel —
// there is no way to look at Arrakis and see that four of your people are out
// on the sand at Red Wall and two are prospecting the Cielago. This computes
// the answer; the render layer draws it.

export type CrewActivity = 'harvesting' | 'prospecting' | 'planting' | 'drilling' | 'resting'

export interface PlacedCrew {
  groupId: string
  /** Where to draw them: a spice field id, or a village id. */
  anchorId: string
  /** True when anchorId names a spice field rather than a settlement. */
  atField: boolean
  activity: CrewActivity
  size: number
  /** Working a machine, which is what a worm comes for. */
  hasHarvester: boolean
  /** Still in changeover — drawn, but not yet productive. */
  idleThisDay: boolean
}

export interface CrewInput {
  id: string
  locationId: string
  size: number
  task: string
  taskTargetId: string | null
  changeoverDaysLeft: number
}

const ACTIVITY: Record<string, CrewActivity> = {
  harvest: 'harvesting',
  prospect: 'prospecting',
  ecology: 'planting',
  train: 'drilling',
  garrison: 'resting',
  idle: 'resting',
}

/**
 * Place every crew.
 *
 * A harvesting crew stands on its field; everyone else stands at the
 * settlement they are working out of. Prospectors are the interesting case:
 * they are nominally at their sietch but actually out in the sand around it,
 * which the renderer shows by scattering them rather than stacking them on the
 * marker.
 */
export function placeCrews(
  crews: readonly CrewInput[],
  fieldIds: readonly string[],
  harvesterGroupIds: ReadonlySet<string>,
): PlacedCrew[] {
  const fields = new Set(fieldIds)
  const placed: PlacedCrew[] = []

  for (const crew of crews) {
    const target = crew.taskTargetId
    const atField = crew.task === 'harvest' && target !== null && fields.has(target)

    placed.push({
      groupId: crew.id,
      anchorId: atField && target ? target : crew.locationId,
      atField,
      activity: ACTIVITY[crew.task] ?? 'resting',
      size: crew.size,
      hasHarvester: harvesterGroupIds.has(crew.id),
      idleThisDay: crew.changeoverDaysLeft > 0,
    })
  }
  return placed
}

/**
 * A stable scatter offset for a crew, so several at one place do not stack.
 *
 * Deterministic from the id: a crew that jumped to a new offset every frame
 * would read as a rendering fault rather than as people moving.
 */
export function scatterOffset(groupId: string, index: number): { x: number; y: number } {
  let h = 2166136261
  for (let i = 0; i < groupId.length; i++) {
    h = Math.imul(h ^ groupId.charCodeAt(i), 16777619)
  }
  const angle = ((h >>> 0) / 0xffffffff) * Math.PI * 2 + index * 1.1
  const radius = 0.45 + (((h >>> 8) & 0xff) / 255) * 0.55
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
}

/** Crews worth drawing at all — everyone, but resting ones read as quieter. */
export function isWorking(crew: PlacedCrew): boolean {
  return crew.activity !== 'resting' && !crew.idleThisDay
}
