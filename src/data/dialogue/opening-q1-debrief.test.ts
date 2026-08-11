// src/data/dialogue/opening-q1-debrief.test.ts
// Content-integrity coverage for Beat 7's debrief tree, parallel to
// opening-tabr-dilemma.test.ts: pure context, no effect anywhere, and
// closes freely at every node (not in canCloseDialogue's mandatory set).
// Also pins q1DebriefRootId's band -> root mapping, since runtime/
// q1Debrief.ts trusts it to pick the right one of three parallel branches.

import { describe, it, expect } from 'vitest'
import { Q1_DEBRIEF_NODES, q1DebriefRootId } from './opening-q1-debrief'
import { Q1_DEBRIEF_TREE_ID } from './index'
import { world, setWorld, createInitialState } from '../../game-engine/GameState'
import { startDialogue, canCloseDialogue } from '../../game-engine/DialogueSystem'

const byId = new Map(Q1_DEBRIEF_NODES.map(n => [n.id, n]))

describe('opening-q1-debrief content integrity', () => {
  it('uses unique node ids', () => {
    expect(byId.size).toBe(Q1_DEBRIEF_NODES.length)
  })

  it('resolves every choice target', () => {
    const dangling: string[] = []
    for (const node of Q1_DEBRIEF_NODES) {
      for (const choice of node.choices) {
        if (choice.nextId !== null && !byId.has(choice.nextId)) {
          dangling.push(`${node.id} -> ${choice.nextId}`)
        }
      }
    }
    expect(dangling).toEqual([])
  })

  it('carries NO effect anywhere — pure context, like the Tabr dilemma tree', () => {
    const withEffect: string[] = []
    for (const node of Q1_DEBRIEF_NODES) {
      for (const choice of node.choices) {
        if (choice.effect !== undefined) withEffect.push(`${node.id}/${choice.id}`)
      }
    }
    expect(withEffect).toEqual([])
  })
})

describe.each([
  ['full', 'q1_debrief_full', 'q1_debrief_full_thufir'],
  ['partial', 'q1_debrief_partial', 'q1_debrief_partial_thufir'],
  ['short', 'q1_debrief_short', 'q1_debrief_short_thufir'],
] as const)('%s band branch', (band, rootId, thufirId) => {
  it('q1DebriefRootId maps the band to its own root', () => {
    expect(q1DebriefRootId(band)).toBe(rootId)
  })

  it('Fenring speaks at the root, Thufir at the second node, and the branch terminates', () => {
    const root = byId.get(rootId)!
    const thufir = byId.get(thufirId)!
    expect(root.speaker).toBe('Count Fenring')
    expect(thufir.speaker).toBe('Thufir Hawat')
    expect(root.choices[0].nextId).toBe(thufirId)
    expect(thufir.choices[0].nextId).toBeNull()
  })

  it('canCloseDialogue is true at both nodes of this branch', () => {
    const state = createInitialState()
    setWorld(state)

    startDialogue(Q1_DEBRIEF_TREE_ID, 'arrakeen', rootId)
    expect(canCloseDialogue()).toBe(true)

    startDialogue(Q1_DEBRIEF_TREE_ID, 'arrakeen', thufirId)
    expect(canCloseDialogue()).toBe(true)
    expect(world.dialogue?.treeId).toBe(Q1_DEBRIEF_TREE_ID)
  })
})
