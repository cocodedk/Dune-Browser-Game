// src/game-engine/DialogueSystem.loyaltyOnce.test.ts
// Chunk W3c — the loyalty-pump gate (progress.md Round 11: "the loyalty-pump
// gate extended to positive loyaltyDelta here"). Proves the reward gate
// (applyEffect.ts, extended from WP02g's spice/charisma-only version) now
// also caps a positive loyaltyDelta at once per (treeId, node.id) ever, while
// a negative loyaltyDelta (a rebuke, not a reward) keeps re-applying every
// time, and the gift command — a wholly separate code path with its own
// per-visit budget (SietchVisitSystem.ts) — is unaffected either way.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { startDialogue, chooseDialogue } from './DialogueSystem'
import { world, setWorld, createInitialState } from './GameState'
import { giftPlayerSietch } from './SietchVisitSystem'
import { STORY_TREE_ID } from '../data/dialogue'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function redWallLoyalty(): number {
  return world.sietches.find(s => s.villageId === 'red_wall_sietch')!.loyalty ?? 0
}

describe('dialogue loyalty-once guard: positive loyaltyDelta pays once per (tree, node)', () => {
  beforeEach(() => {
    const state = createInitialState()
    state.player.location = 'red_wall_sietch'
    setWorld(state)
  })

  it('applies shadir_wary_root/shadir_w1 (+6) once; a second conversation at the same node pays nothing', () => {
    const before = redWallLoyalty()

    startDialogue(STORY_TREE_ID, 'red_wall_sietch', 'shadir_wary_root')
    chooseDialogue('shadir_w1')
    expect(redWallLoyalty()).toBe(before + 6)
    expect(world.flags['reward.story.shadir_wary_root']).toBe(true)

    startDialogue(STORY_TREE_ID, 'red_wall_sietch', 'shadir_wary_root')
    chooseDialogue('shadir_w1')
    expect(redWallLoyalty()).toBe(before + 6) // no second gain — was the live pump before this gate
  })

  it('keeps applying a negative loyaltyDelta every time — shadir_w3 (-5) is a rebuke, not a reward', () => {
    const before = redWallLoyalty()

    startDialogue(STORY_TREE_ID, 'red_wall_sietch', 'shadir_wary_root')
    chooseDialogue('shadir_w3')
    expect(redWallLoyalty()).toBe(before - 5)
    expect(world.flags['reward.story.shadir_wary_root']).toBeUndefined() // never gated

    startDialogue(STORY_TREE_ID, 'red_wall_sietch', 'shadir_wary_root')
    chooseDialogue('shadir_w3')
    expect(redWallLoyalty()).toBe(before - 10) // applies again
  })

  it('the gift command still works after the dialogue reward is consumed, within its own per-visit cap', () => {
    startDialogue(STORY_TREE_ID, 'red_wall_sietch', 'shadir_wary_root')
    chooseDialogue('shadir_w1') // consumes the dialogue reward, +6
    const afterDialogue = redWallLoyalty()

    const outcome = giftPlayerSietch('red_wall_sietch')

    expect(outcome.ok).toBe(true)
    expect(redWallLoyalty()).toBeGreaterThan(afterDialogue) // GIFT_LOYALTY_GAIN, unrelated to the dialogue flag

    // A second dialogue reward attempt at the SAME node still pays nothing —
    // proves the gift did not reset or share the dialogue's own gate.
    const afterGift = redWallLoyalty()
    startDialogue(STORY_TREE_ID, 'red_wall_sietch', 'shadir_wary_root')
    chooseDialogue('shadir_w1')
    expect(redWallLoyalty()).toBe(afterGift)
  })

  it('a mixed-effect node (smug_deal: +15 spice, +5 loyalty) gates both under the one shared flag', () => {
    // Regression for the audit's own near-miss: WP02g gated smug_deal's
    // spice but never touched its loyalty, which kept paying on every
    // repeat even after the spice reward was capped.
    startDialogue('smuggler_outpost', 'plaster_basin')
    const before = world.villages.find(v => v.id === 'plaster_basin')!.loyalty
    const spiceBefore = world.player.spice

    chooseDialogue('smug_trade_offer') // -> smug_deal
    chooseDialogue('smug_accept_terms') // smug_deal's reward node

    const afterFirst = world.villages.find(v => v.id === 'plaster_basin')!.loyalty
    expect(afterFirst).toBe(before + 5)
    expect(world.player.spice).toBe(spiceBefore + 15)

    startDialogue('smuggler_outpost', 'plaster_basin')
    chooseDialogue('smug_trade_offer')
    chooseDialogue('smug_accept_terms')

    expect(world.villages.find(v => v.id === 'plaster_basin')!.loyalty).toBe(afterFirst) // no second gain
    expect(world.player.spice).toBe(spiceBefore + 15) // unchanged, as WP02g already proved
  })
})
