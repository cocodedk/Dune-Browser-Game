// src/data/dialogue/opening-tabr-dilemma.test.ts
// Content-integrity coverage for Beat 6's tree, parallel to opening.test.ts
// and opening-redwall-trust.test.ts but stricter on effects: this tree is
// pure context (see its own header) — no choice anywhere may carry an
// `effect` at all, not merely no positive reward. Also pins the "closes
// freely" reading directly against DialogueSystem.ts's own function, so a
// future change to canCloseDialogue's mandatory set cannot silently make
// this beat mandatory without a test failing here.

import { describe, it, expect } from 'vitest'
import { TABR_DILEMMA_NODES } from './opening-tabr-dilemma'
import { TABR_DILEMMA_TREE_ID } from './index'
import { world, setWorld, createInitialState } from '../../game-engine/GameState'
import { startDialogue, canCloseDialogue } from '../../game-engine/DialogueSystem'

const byId = new Map(TABR_DILEMMA_NODES.map(n => [n.id, n]))

describe('opening-tabr-dilemma content integrity', () => {
  it('uses unique node ids', () => {
    expect(byId.size).toBe(TABR_DILEMMA_NODES.length)
  })

  it('resolves every choice target', () => {
    const dangling: string[] = []
    for (const node of TABR_DILEMMA_NODES) {
      for (const choice of node.choices) {
        if (choice.nextId !== null && !byId.has(choice.nextId)) {
          dangling.push(`${node.id} -> ${choice.nextId}`)
        }
      }
    }
    expect(dangling).toEqual([])
  })

  it('carries NO effect anywhere — pure context, not merely no positive reward', () => {
    const withEffect: string[] = []
    for (const node of TABR_DILEMMA_NODES) {
      for (const choice of node.choices) {
        if (choice.effect !== undefined) withEffect.push(`${node.id}/${choice.id}`)
      }
    }
    expect(withEffect).toEqual([])
  })

  it('gives every node at least one choice and every choice non-empty text', () => {
    for (const node of TABR_DILEMMA_NODES) {
      expect(node.choices.length, node.id).toBeGreaterThan(0)
      for (const choice of node.choices) {
        expect(choice.text.length, `${node.id}/${choice.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('the root reaches a terminal choice', () => {
    const seen = new Set<string>()
    const queue = [TABR_DILEMMA_NODES[0]]
    let terminates = false
    while (queue.length > 0) {
      const node = queue.shift()!
      if (seen.has(node.id)) continue
      seen.add(node.id)
      for (const choice of node.choices) {
        if (choice.nextId === null) { terminates = true; break }
        const next = byId.get(choice.nextId)
        if (next) queue.push(next)
      }
      if (terminates) break
    }
    expect(terminates).toBe(true)
  })
})

describe('opening-tabr-dilemma closes freely (03: "must not script the decision")', () => {
  it('canCloseDialogue is true at every node, unlike the mandatory opening beats', () => {
    const state = createInitialState()
    setWorld(state)

    for (const node of TABR_DILEMMA_NODES) {
      startDialogue(TABR_DILEMMA_TREE_ID, 'sietch_tabr', node.id)
      expect(canCloseDialogue(), node.id).toBe(true)
    }
    expect(world.dialogue).not.toBeNull() // sanity: the loop actually opened something
  })
})
