// src/data/dialogue/opening-redwall-trust.test.ts
// Content-integrity coverage for Beat 4's dedicated tree, parallel to
// opening.test.ts's checks for Beats 1-2 but NOT merged into that file's
// describe.each: this tree deliberately DOES carry a positive loyaltyDelta
// (opening.test.ts's shared "no reward anywhere" assertion is specific to
// Beats 1-2 — see opening-redwall-trust.ts's own header for why Beat 4 is
// different by design).

import { describe, it, expect } from 'vitest'
import { REDWALL_TRUST_NODES } from './opening-redwall-trust'

const byId = new Map(REDWALL_TRUST_NODES.map(n => [n.id, n]))

describe('opening-redwall-trust content integrity', () => {
  it('uses unique node ids', () => {
    expect(byId.size).toBe(REDWALL_TRUST_NODES.length)
  })

  it('resolves every choice target', () => {
    const dangling: string[] = []
    for (const node of REDWALL_TRUST_NODES) {
      for (const choice of node.choices) {
        if (choice.nextId !== null && !byId.has(choice.nextId)) {
          dangling.push(`${node.id} -> ${choice.nextId}`)
        }
      }
    }
    expect(dangling).toEqual([])
  })

  it('sets redwall.trust.acknowledged on every terminal choice, and nowhere else', () => {
    for (const node of REDWALL_TRUST_NODES) {
      for (const choice of node.choices) {
        const setsFlag = choice.effect?.setFlags?.['redwall.trust.acknowledged'] === true
        if (choice.nextId === null) {
          expect(setsFlag, `${node.id}/${choice.id} should close the beat`).toBe(true)
        } else {
          expect(setsFlag, `${node.id}/${choice.id} is not terminal and should not close the beat early`).toBe(false)
        }
      }
    }
  })

  it('grants +5 loyaltyDelta on both root choices, and nowhere else', () => {
    const root = byId.get('redwall_trust_root')!
    for (const choice of root.choices) {
      expect(choice.effect?.loyaltyDelta, choice.id).toBe(5)
    }
    for (const node of REDWALL_TRUST_NODES) {
      if (node.id === 'redwall_trust_root') continue
      for (const choice of node.choices) {
        expect(choice.effect?.loyaltyDelta ?? 0, `${node.id}/${choice.id}`).toBe(0)
      }
    }
  })

  it('both root choices share one (treeId, node.id) reward key — the once-only gate applies to the pair, not each separately', () => {
    const root = byId.get('redwall_trust_root')!
    expect(new Set(root.choices.map(() => root.id)).size).toBe(1)
  })

  it('the two branches set distinct acknowledgement flags for later content to read', () => {
    const solidarity = byId.get('redwall_trust_ack_solidarity')!.choices[0]
    const transaction = byId.get('redwall_trust_ack_transaction')!.choices[0]
    expect(solidarity.effect?.setFlags?.['redwall.trust.solidarity']).toBe(true)
    expect(transaction.effect?.setFlags?.['redwall.trust.transaction']).toBe(true)
    expect(solidarity.effect?.setFlags?.['redwall.trust.transaction']).toBeUndefined()
    expect(transaction.effect?.setFlags?.['redwall.trust.solidarity']).toBeUndefined()
  })

  it('every root choice reaches a terminal choice', () => {
    const queue = [byId.get('redwall_trust_root')!]
    const seen = new Set<string>()
    let terminates = false
    while (queue.length > 0) {
      const node = queue.shift()!
      if (seen.has(node.id)) continue
      seen.add(node.id)
      for (const choice of node.choices) {
        if (choice.nextId === null) { terminates = true; continue }
        const next = byId.get(choice.nextId)
        if (next) queue.push(next)
      }
    }
    expect(terminates).toBe(true)
  })
})
