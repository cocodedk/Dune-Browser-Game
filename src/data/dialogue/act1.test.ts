// src/data/dialogue/act1.test.ts
// Content-integrity tests. At ~650 nodes in the finished game these cannot be
// checked by eye, so the structural guarantees run in CI instead.

import { describe, it, expect } from 'vitest'
import { PALACE_NODES } from './act1-palace'
import { DESERT_NODES } from './act1-desert'
import { ACT2_NODES } from './act2'
import { INITIAL_DIALOGUE_STATES } from '../dialogueStates'
import type { DialogueNode } from '../../types'

const ALL: DialogueNode[] = [...PALACE_NODES, ...DESERT_NODES, ...ACT2_NODES]
const BY_ID = new Map(ALL.map(n => [n.id, n]))

describe('dialogue integrity', () => {
  it('uses unique node ids', () => {
    expect(BY_ID.size).toBe(ALL.length)
  })

  it('provides a node for every declared conversation root', () => {
    // A state pointing at a missing root is a conversation that opens onto
    // nothing — the player clicks a character and the game stops responding.
    const missing = INITIAL_DIALOGUE_STATES
      .map(s => s.rootNodeId)
      .filter(id => !BY_ID.has(id))
    expect(missing).toEqual([])
  })

  it('resolves every choice target', () => {
    const dangling: string[] = []
    for (const node of ALL) {
      for (const choice of node.choices) {
        if (choice.nextId !== null && !BY_ID.has(choice.nextId)) {
          dangling.push(`${node.id} -> ${choice.nextId}`)
        }
      }
    }
    expect(dangling).toEqual([])
  })

  it('gives every node at least one choice', () => {
    // Without one the conversation cannot be exited and the run is stuck.
    const dead = ALL.filter(n => n.choices.length === 0).map(n => n.id)
    expect(dead).toEqual([])
  })

  it('lets every conversation terminate', () => {
    // Every root must reach a choice with nextId null, or the player can loop
    // forever with no way back to the game.
    for (const state of INITIAL_DIALOGUE_STATES) {
      const root = BY_ID.get(state.rootNodeId)
      if (!root) continue

      const seen = new Set<string>()
      const queue = [root]
      let terminates = false

      while (queue.length > 0) {
        const node = queue.shift()!
        if (seen.has(node.id)) continue
        seen.add(node.id)

        for (const choice of node.choices) {
          if (choice.nextId === null) { terminates = true; break }
          const next = BY_ID.get(choice.nextId)
          if (next) queue.push(next)
        }
        if (terminates) break
      }
      expect(terminates, `${state.id} never terminates`).toBe(true)
    }
  })

  it('gives every node a speaker and text', () => {
    for (const node of ALL) {
      expect(node.speaker.length, node.id).toBeGreaterThan(0)
      expect(node.text.length, node.id).toBeGreaterThan(0)
    }
  })

  it('gives every choice non-empty text and a unique id within its node', () => {
    for (const node of ALL) {
      const ids = node.choices.map(c => c.id)
      expect(new Set(ids).size, node.id).toBe(ids.length)
      for (const choice of node.choices) {
        expect(choice.text.length, `${node.id}/${choice.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('keeps every spice cost affordable as an opening move', () => {
    // A choice that silently overdraws the player would read as a bug.
    for (const node of ALL) {
      for (const choice of node.choices) {
        const delta = choice.effect?.spiceDelta
        if (delta !== undefined && delta < 0) {
          expect(Math.abs(delta), `${node.id}/${choice.id}`).toBeLessThanOrEqual(60)
        }
      }
    }
  })

  it('offers a refusal wherever a choice costs something', () => {
    // Any node that spends spice must also let the player walk away.
    for (const node of ALL) {
      const costs = node.choices.some(c => (c.effect?.spiceDelta ?? 0) < 0)
      if (!costs) continue
      const canDecline = node.choices.some(c => (c.effect?.spiceDelta ?? 0) >= 0)
      expect(canDecline, node.id).toBe(true)
    }
  })
})
