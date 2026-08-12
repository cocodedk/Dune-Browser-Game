// src/game-engine/sim/agents/harness.smoke.test.ts
// The required smoke matrix (progress.md Round 16, WP04 chunk W4c item 5):
// every agent x 3 seeds x Normal, through the first two tribute cycles — no
// crash, no isBlocked() spin (a decision point that never resolves), and a
// deterministic trace for a fixed seed+agent pair.

import { describe, it, expect } from 'vitest'
import { runAgentCampaign } from './harness'
import { SECOND_DEADLINE_DAY } from '../reserveLine'
import { reserveAgent } from './reserve'
import { capacityAgent } from './capacity'
import { reactiveAgent } from './reactive'
import { noviceAgent } from './novice'
import { recoveryAgent } from './recovery'
import type { Agent } from './types'

const AGENTS: Agent[] = [reserveAgent, capacityAgent, reactiveAgent, noviceAgent, recoveryAgent]
const SEEDS = [1, 2, 3]
// A day past the second deadline so both cycle-1 and cycle-2 settlements
// have a chance to resolve within the smoke window.
const THROUGH_DAY = SECOND_DEADLINE_DAY + 2

describe('agent smoke matrix: 5 agents x 3 seeds x Normal, through cycle 2', () => {
  for (const agent of AGENTS) {
    for (const seed of SEEDS) {
      it(`${agent.name} seed ${seed}: no crash, no spin, both cycle settlements resolved`, () => {
        const result = runAgentCampaign(agent, seed, 'normal', { throughDay: THROUGH_DAY })

        // THROUGH_DAY spans both deadlines (day 12, day 20) — pin the two-
        // cycle claim in the matrix's own name, not just "at least one".
        expect(result.settlements.length).toBeGreaterThanOrEqual(2)
        expect(result.trace.length).toBeGreaterThan(0)
        expect(result.hashLog.length).toBeGreaterThan(0)
        // Genuine progress: the loop did not sit at day 0.
        expect(result.finalDay).toBeGreaterThan(0)
      })
    }
  }

  // "Deterministic: same seed+agent = identical trace (assert)" (item 1) —
  // every agent, not only one: capacity/reactive's trace also carries
  // travel/pledge/assign/gift, the fuller pin the framework claim needs.
  for (const agent of AGENTS) {
    it(`${agent.name}: same seed replays byte-identical trace and hashLog`, () => {
      const a = runAgentCampaign(agent, 7, 'normal', { throughDay: THROUGH_DAY })
      const b = runAgentCampaign(agent, 7, 'normal', { throughDay: THROUGH_DAY })

      expect(b.trace).toEqual(a.trace)
      expect(b.hashLog).toEqual(a.hashLog)
      expect(b.settlements).toEqual(a.settlements)
      expect(b.ending).toBe(a.ending)
    })
  }
})
