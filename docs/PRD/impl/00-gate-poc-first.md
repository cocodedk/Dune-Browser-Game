# 00 — Gate: PoC Must Pass First

## Goal

Prevent premature full-game implementation by enforcing a sequencing rule: do not treat `impl/` as active work until the PoC has validated the core loop.

## Prerequisites

None — read this file before any other file in `docs/PRD/impl/`.

## Scope

This file defines the gate rule and the go/no-go decision process. It does not contain implementation work.

## Out of scope

Implementation of any system. That begins only after the gate passes.

---

## ⚠️ WARNING

**Do not use this folder as the default starting point for new work until the PoC (`docs/PRD/poc/`) has passed its success criteria.**

---

## What the Gate Means

The PoC (Proof of Concept) in `docs/PRD/poc/` is a small, throwaway prototype that validates:

1. The gameplay loop is fun and meaningful.
2. The engine architecture (game-engine / game-render / React split) holds under real conditions.
3. The AI approach (LLM + rule-based fallback) produces believable behavior.
4. Players want to keep playing after 5–10 minutes.

Until those four things are confirmed, the full implementation tasks in this folder are speculative. Building them early means:

- Overbuildng systems that gameplay may not need.
- Locking in architectural decisions that the PoC might invalidate.
- Wasting weeks on polish before the core is proven.

## Link to PoC

See: [`docs/PRD/poc/README.md`](../poc/README.md)

PoC task checklist is there. Complete all PoC tasks first.

## PoC Success Criteria (must all be true)

- [ ] Can play 5–10 minutes without crashes or confusion.
- [ ] AI produces believable behavior — not random, not game-breaking.
- [ ] Decisions have visible effects — the loop feels meaningful.
- [ ] Players want to keep playing.

## Go / No-Go Decision

When all PoC success criteria are checked, a human holds a brief review:

| Decision | Condition | Next action |
|----------|-----------|-------------|
| **Go** | Loop is fun, architecture held, AI is useful | Begin `docs/PRD/impl/` tasks starting with `01-project-structure.md` |
| **No-Go** | Loop is boring, AI unusable, or architecture needs redesign | Iterate on PoC or cancel the project |

**The go/no-go decision is made by a human. Do not skip or automate it.**

## How to Proceed After Go

1. Confirm all PoC success criteria are checked.
2. A human explicitly says "Go" after reviewing PoC gameplay.
3. Begin with `01-project-structure.md`.
4. Follow task order: each task lists prerequisites — respect them.

## Key types / interfaces

None — this is a process document.

## File locations

- This file: `docs/PRD/impl/00-gate-poc-first.md`
- PoC reference: `docs/PRD/poc/README.md`
- First impl task (after gate): `docs/PRD/impl/01-project-structure.md`

## Acceptance criteria

- [ ] PoC README checklist is fully checked before `impl/` becomes the primary planning track.
- [ ] A human has made the Go decision explicitly.
- [ ] Anyone using `impl/` understands it is a post-PoC backlog, not a reason to rewrite working PoC code blindly.
