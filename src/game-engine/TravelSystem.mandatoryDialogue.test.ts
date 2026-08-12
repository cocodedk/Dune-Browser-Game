// src/game-engine/TravelSystem.mandatoryDialogue.test.ts
// W3i remediation: the blind-play re-check's softlock — travel starting
// while a mandatory beat (Beat 1's briefing) was still open, then the clock
// never resuming. The fix refuses travel at the source, not just via the UI
// disabling a button. Split into its own file rather than added to
// TravelSystem.test.ts (already at 206/200 before this chunk) — mirrors that
// file's own "Beat 4 auto-open trigger" describe block split
// (TravelSystem.tabrDilemma.test.ts).

import { describe, it, expect } from 'vitest'
import { world, setWorld, createInitialState } from './GameState'
import { startTravel } from './TravelSystem'
import { REDWALL_TRUST_ACKNOWLEDGED_FLAG, BRIEFING_COMPLETE_FLAG } from './acts/openingObjectives'
import { REDWALL_TRUST_TREE_ID, BRIEFING_TREE_ID } from '../data/dialogue'

describe('startTravel: refused while a mandatory dialogue is open', () => {
  it('refuses travel, leaves the player idle, while the briefing is still open', () => {
    const state = createInitialState()
    state.dialogue = { treeId: BRIEFING_TREE_ID, currentNodeId: 'briefing_root', villageId: 'arrakeen' }
    setWorld(state)

    startTravel('hagg')

    expect(world.player.state).toBe('idle')
    expect(world.player.travelTarget).toBeNull()
    expect(world.dialogue?.treeId).toBe(BRIEFING_TREE_ID) // still open, untouched
  })

  it('allows travel once the mandatory beat closes', () => {
    const state = createInitialState()
    state.dialogue = null
    state.flags[BRIEFING_COMPLETE_FLAG] = true
    setWorld(state)

    startTravel('hagg')

    expect(world.player.state).toBe('traveling')
    expect(world.player.travelTarget).toBe('hagg')
  })

  it('does not block travel while an ORDINARY (closeable) dialogue is open', () => {
    // The discriminating edge of the rule is canCloseDialogue, not merely
    // "a dialogue is open" — an everyday conversation must not freeze travel.
    const state = createInitialState()
    state.flags[BRIEFING_COMPLETE_FLAG] = true
    state.dialogue = { treeId: REDWALL_TRUST_TREE_ID, currentNodeId: 'redwall_trust_root', villageId: 'arrakeen' }
    // REDWALL_TRUST_TREE_ID is itself mandatory until acknowledged (see
    // DialogueSystem.ts), so acknowledge it first to get a genuinely
    // closeable dialogue for this boundary case.
    state.flags[REDWALL_TRUST_ACKNOWLEDGED_FLAG] = true
    setWorld(state)

    startTravel('hagg')

    expect(world.player.state).toBe('traveling')
  })
})
