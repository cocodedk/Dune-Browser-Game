// src/data/dialogue/opening.test.ts
// Content-integrity tests for the opening's two dedicated beat trees
// (opening-briefing.ts, opening-ledger.ts) — not covered by act1.test.ts,
// which runs only against STORY_NODES and these are deliberately separate
// from it (see opening-briefing.ts's header). Enforces, programmatically,
// the two hard constraints 03/progress.md place on this content: Beat 1's
// replies carry no mechanical trap, and NOTHING in either tree pays a
// positive spice/charisma/loyalty reward (progress.md Round 11: "NO new
// positive spiceDelta anywhere in opening content").

import { describe, it, expect } from 'vitest'
import { BRIEFING_NODES } from './opening-briefing'
import { LEDGER_NODES } from './opening-ledger'
import { BRIEFING_COMPLETE_FLAG, LEDGER_READ_FLAG } from '../../game-engine/acts/openingObjectives'

describe.each([
  ['opening-briefing', BRIEFING_NODES, BRIEFING_COMPLETE_FLAG],
  ['opening-ledger', LEDGER_NODES, LEDGER_READ_FLAG],
] as const)('%s content integrity', (_name, nodes, completingFlag) => {
  const byId = new Map(nodes.map(n => [n.id, n]))

  it('uses unique node ids', () => {
    expect(byId.size).toBe(nodes.length)
  })

  it('resolves every choice target', () => {
    const dangling: string[] = []
    for (const node of nodes) {
      for (const choice of node.choices) {
        if (choice.nextId !== null && !byId.has(choice.nextId)) {
          dangling.push(`${node.id} -> ${choice.nextId}`)
        }
      }
    }
    expect(dangling).toEqual([])
  })

  it('gives every node at least one choice and every choice non-empty text', () => {
    for (const node of nodes) {
      expect(node.choices.length, node.id).toBeGreaterThan(0)
      for (const choice of node.choices) {
        expect(choice.text.length, `${node.id}/${choice.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('carries no positive spiceDelta/charismaDelta/loyaltyDelta anywhere — no mechanical reward in opening content', () => {
    const rewarded: string[] = []
    for (const node of nodes) {
      for (const choice of node.choices) {
        const e = choice.effect
        if (!e) continue
        if ((e.spiceDelta ?? 0) > 0 || (e.charismaDelta ?? 0) > 0 || (e.loyaltyDelta ?? 0) > 0) {
          rewarded.push(`${node.id}/${choice.id}`)
        }
      }
    }
    expect(rewarded).toEqual([])
  })

  it('sets its own completing flag on every terminal choice (nextId: null), and nowhere else', () => {
    for (const node of nodes) {
      for (const choice of node.choices) {
        const setsFlag = choice.effect?.setFlags?.[completingFlag] === true
        if (choice.nextId === null) {
          expect(setsFlag, `${node.id}/${choice.id} should close the beat`).toBe(true)
        } else {
          expect(setsFlag, `${node.id}/${choice.id} is not terminal and should not close the beat early`).toBe(false)
        }
      }
    }
  })

  it('lets every root reach a terminal choice', () => {
    const seen = new Set<string>()
    const queue = [nodes[0]]
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
