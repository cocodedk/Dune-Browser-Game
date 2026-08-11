// src/game-engine/DialogueSystem.rewardOnce.test.ts
// Chunk W2g — closes docs/PRD/game-completion/baseline/wp02-critic-verdict.md
// §5, "the biggest remaining gap": unbounded repeatable dialogue spice
// income. Reproduces the audit's probe 6/7 scenario (smug_greet ->
// smug_trade_offer -> smug_deal -> smug_accept_terms -> smug_settled ->
// smug_depart, +25 spice per conversation, unbounded before this chunk) and
// proves it now pays exactly once.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { startDialogue, chooseDialogue } from './DialogueSystem'
import { world, setWorld, createInitialState } from './GameState'
import { serializeWorld, deserializeWorld } from './persistence'
import { STORY_TREE_ID } from '../data/dialogue'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

/** One full smug_greet -> ... -> smug_depart conversation: +25 spice if unpaid. */
function runSmugglerDeal(): void {
  startDialogue('smuggler_outpost', 'plaster_basin')
  chooseDialogue('smug_trade_offer') // -> smug_deal, no reward itself
  chooseDialogue('smug_accept_terms') // smug_deal reward: +15
  chooseDialogue('smug_depart') // smug_settled reward: +10, ends dialogue
}

describe('dialogue reward-once guard: smuggler_outpost trade', () => {
  beforeEach(() => {
    setWorld(createInitialState())
  })

  it('pays the full +25 through the production chooseDialogue path on first contact', () => {
    const spiceBefore = world.player.spice

    runSmugglerDeal()

    expect(world.player.spice).toBe(spiceBefore + 25)
    expect(world.flags['reward.smuggler_outpost.smug_deal']).toBe(true)
    expect(world.flags['reward.smuggler_outpost.smug_settled']).toBe(true)
    expect(world.events.filter(e => e.type === 'story_reward')).toHaveLength(2)
  })

  it('pays zero on a second conversation at the same location, and logs no second story_reward', () => {
    runSmugglerDeal()
    const spiceAfterFirst = world.player.spice
    const rewardEventsAfterFirst = world.events.filter(e => e.type === 'story_reward').length

    runSmugglerDeal() // player:talk again, same tree, same nodes

    expect(world.player.spice).toBe(spiceAfterFirst) // pays nothing
    expect(world.events.filter(e => e.type === 'story_reward')).toHaveLength(rewardEventsAfterFirst)
  })

  it("the audit's exploit scenario — four repeat conversations — yields exactly one payment of 25, not 100", () => {
    const spiceBefore = world.player.spice

    for (let i = 0; i < 4; i++) runSmugglerDeal()

    expect(world.player.spice).toBe(spiceBefore + 25) // was +100 (probe 6/7) before this chunk
  })

  it('a revisited node still navigates the conversation through to its end', () => {
    runSmugglerDeal()
    expect(world.dialogue).toBeNull() // first conversation ended normally

    runSmugglerDeal()
    expect(world.dialogue).toBeNull() // second conversation still reaches and ends at smug_depart
  })

  it('the consumption flag survives a serialize/deserialize round trip', () => {
    runSmugglerDeal()
    const spiceAfterFirst = world.player.spice

    const reloaded = deserializeWorld(serializeWorld(world))
    setWorld(reloaded)

    expect(world.flags['reward.smuggler_outpost.smug_deal']).toBe(true)
    expect(world.flags['reward.smuggler_outpost.smug_settled']).toBe(true)

    runSmugglerDeal() // replaying after reload still pays nothing
    expect(world.player.spice).toBe(spiceAfterFirst)
  })

  it('does not gate a negative spiceDelta — the Water-of-Life ritual cost stays repeatable', () => {
    // Regression guard for DialogueSystem.test.ts's ritual suite: a debit at
    // a node must re-apply every time that node is reached, unlike a credit.
    startDialogue(STORY_TREE_ID, world.villages[0].id, 'sova_ritual_root')
    world.player.spice = 100
    chooseDialogue('sova_r1') // -20, ritual granted (act1, prescience 0 -> 1)
    expect(world.player.spice).toBe(80)

    startDialogue(STORY_TREE_ID, world.villages[0].id, 'sova_ritual_root')
    chooseDialogue('sova_r1') // refused internally (wrong-act), cost still applies
    expect(world.player.spice).toBe(60)
  })
})
