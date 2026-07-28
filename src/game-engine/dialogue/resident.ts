// src/game-engine/dialogue/resident.ts
// Who is actually standing in front of you.
//
// The location-agnostic conversation trees — village_leader,
// harkonnen_stronghold and the rest — name their speaker "Village Elder" or
// "Harkonnen Overseer", because they are written to work anywhere. The 3D
// character card, meanwhile, resolves the person who actually lives there.
//
// So a player at the Imperial Basin was shown a portrait captioned "Overseer
// Krail" above a dialogue box headed "VILLAGE ELDER": one speaker, two names,
// neither obviously wrong. This reconciles them.

/**
 * Speaker names that are placeholders rather than people.
 *
 * Only these get replaced. A scripted scene names a specific character on
 * purpose, and overriding that would put the wrong person's name on lines
 * somebody else wrote.
 */
const GENERIC_SPEAKERS = new Set([
  'Village Elder',
  'Harkonnen Overseer',
  'Fremen Naib',
  'Atreides Envoy',
  'Imperial Delegate',
  'Settlement Leader',
  'A voice',
])

export function isGenericSpeaker(name: string): boolean {
  return GENERIC_SPEAKERS.has(name.trim())
}

/**
 * The name to show for a line.
 *
 * @param nodeSpeaker  Whatever the dialogue node declares.
 * @param residentName The character who lives at the player's location, if any.
 */
export function displaySpeaker(
  nodeSpeaker: string,
  residentName: string | undefined,
): string {
  if (!residentName) return nodeSpeaker
  return isGenericSpeaker(nodeSpeaker) ? residentName : nodeSpeaker
}
