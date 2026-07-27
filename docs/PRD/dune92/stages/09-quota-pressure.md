# Stage 09 — Quota, patience, and arrears

**Phase:** 1 · **Depends on:** 08 · **Est. tasks:** 3 · **Builder:** Sonnet
**Status:** SPECCED

## Goal

The dominant clock. Without this the game is a sandbox with no reason to act; with it,
every assignment decision has a deadline behind it.

## Model

```ts
export interface QuotaState {
  nextDueDay: number
  amount: number
  cycleIndex: number
  patience: number   // 0–3
  arrears: number
}
```

## Rules

Due every **8 days**. Amounts Q1 100, Q2 250, Q3 450, then ×1.5 per cycle, with a
further ×1.5 at the Act 3 and Act 4 transitions. Difficulty scales the amount ×0.75 /
×1.0 / ×1.3 through the existing `DifficultyConfig` — add the field there rather than
inventing a parallel config.

On a due day:

| Paid | Patience | Shortfall |
|---|---|---|
| In full | +1 if below 3, **once per act** | — |
| ≥ 60% | unchanged | to arrears at +25% |
| < 60% | −1 | full amount to arrears |

Arrears are added to the next quota. **Patience 0 ends the game.**

The "once per act" restoration needs a flag (`quota.restoredInAct`) cleared on act
transition — without it, a competent player never feels pressure again after one good
cycle.

## Payment

Payment is an explicit player action at the palace, not automatic. The steward
character offers an auto-shipment toggle; when on, payment happens at the day boundary
from available stock. Default off — the first manual payment is a teaching moment.

## The ledger widget

The most important UI element in the game. It must show, at all times:

- amount due and days remaining
- current spice stock
- **projected income by the due date at current assignments**
- the resulting projected surplus or shortfall

The projection is a pure function over world state and belongs in
`src/game-engine/quota/projection.ts` with its own tests. If it is wrong, every player
decision is made on bad information — treat its tests as load-bearing.

## Courier messages

Each cycle the envoy character delivers a message whose tone tracks patience. Four
variants, at patience 3 down to 0. The pressure has to be felt in text, not inferred
from a number.

## Acceptance criteria

1. Each payment band produces the documented patience and arrears outcome — one test
   per band.
2. Arrears compound into the next quota correctly across three consecutive cycles.
3. Patience restoration fires at most once per act.
4. Patience 0 ends the game with a distinct loss state, not the generic goal overlay.
5. The projection matches actual accrued income over a simulated 8 days, within ±5%.
6. Difficulty multipliers apply to the amount and are covered by tests.

## Out of scope

Smuggler advances and debt (cut list). Act transitions — Stage 10.

## Gate

Standard.
