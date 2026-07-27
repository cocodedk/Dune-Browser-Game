# 03 — Stage Index and Status Board

## Status legend

`TODO` · `SPECCED` · `IN PROGRESS` · `BUILT` · `VERIFIED`

A stage is **VERIFIED** only after the full gate passes and Claude has read the diff.
Sonnet's own report is not sufficient evidence.

## Board

| # | Stage | Phase | Depends on | Spec | Status |
|---|---|---|---|---|---|
| 01 | Runtime driver extraction | 0 | — | full | SPECCED |
| 02 | three.js infrastructure | 0 | 01 | full | SPECCED |
| 03 | Strategic mode + sand look | 0 | 02 | full | SPECCED |
| 04 | Phaser removal | 0 | 03 | full | SPECCED |
| 05 | Clock pause + Location model | 1 | 01 | full | SPECCED |
| 06 | Characters + dialogue flags | 1 | 05 | full | SPECCED |
| 07 | Sietch loyalty, pledge, gifts | 1 | 06 | full | SPECCED |
| 08 | Troop groups + harvest + fields | 1 | 07 | full | SPECCED |
| 09 | Quota, patience, arrears | 1 | 08 | full | SPECCED |
| 10 | Charisma + act state machine | 1 | 09 | full | SPECCED |
| 11 | Prospecting + smuggler market | 1 | 10 | full | SPECCED |
| 12 | Flight mode | 2 | 04, 05 | outline | TODO |
| 13 | Location dioramas | 2 | 12 | outline | TODO |
| 14 | Conversation mode | 2 | 13, 06 | outline | TODO |
| 15 | Combat, raids, training | 3 | 11 | outline | TODO |
| 16 | Ecology layer | 3 | 15 | outline | TODO |
| 17 | Prescience L2/L3 | 3 | 16 | outline | TODO |
| 18 | Acts 3–4, forts, endings | 3 | 17 | outline | TODO |
| 19 | Content pass | 3 | 18 | outline | TODO |
| 20 | Art and audio production | 3 | 14 | outline | TODO |
| 21 | Balance and playtest | 3 | 19, 20 | outline | TODO |

## Critical path

```
01 ──┬── 02 ── 03 ── 04 ──┬── 12 ── 13 ── 14 ─────────┬── 20 ──┬── 21
     │                    │                           │        │
     └── 05 ── 06 ── 07 ──┴─ 08 ── 09 ── 10 ── 11 ────┴── 15 ── 16 ── 17 ── 18 ── 19 ──┘
```

Stage 05 (engine) and stages 02–04 (renderer) are independent after 01 and may run in
parallel with two Sonnet agents. Everything else in Phase 1 is a strict chain, because
each stage extends `types.ts` and `GameLoop.ts`.

## Parallelism policy

At most **two** concurrent Sonnet agents, and never two that both touch `types.ts`,
`GameLoop.ts`, or `ui/store.ts`. The realistic pairing is one renderer stage alongside
one engine stage. Verification is serialised through Claude regardless.

## Per-stage protocol

1. Claude confirms the spec file is at full detail and its dependencies are VERIFIED.
2. Claude dispatches one Sonnet agent with the spec file path and the ground rules.
3. Sonnet implements, writes tests, and runs the gate.
4. **Claude reads the actual diff**, re-runs the gate, and checks the acceptance
   criteria one by one.
5. On a visual stage, Claude drives the browser and looks at a screenshot.
6. Claude updates this board and appends anything learned to the stage file.

Fable reviews the design of any stage that changes a system boundary, before build.
