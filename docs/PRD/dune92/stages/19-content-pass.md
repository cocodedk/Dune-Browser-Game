# Stage 19 — Content pass

**Phase:** 3 · **Depends on:** 18 · **Est. tasks:** 6 · **Builder:** Sonnet + Claude
**Status:** TODO — **OUTLINE ONLY, spec before building**

## Goal

Scale from the slice's content to the complete game's. This is the largest single stage
by volume and the least parallelisable.

## Volume

| | From (slice) | To (complete) |
|---|---|---|
| Locations | 7 | 30 |
| Speaking characters | 8 | 14 |
| Dialogue states | ~28 | ~85 |
| Dialogue nodes | ~140 | ~650 |
| Scripted events | 14 | 60 |
| Systemic event templates | 6 | 15 |
| Regions / fields | 2 / 5 | 6 / ~18 |

## Why this is the risk

Roughly 500 new dialogue nodes is the bulk of the remaining work, and dialogue is where
voice consistency matters most — the thing that fragments worst when split across
agents. Expect Claude to write or heavily edit the character voices and Sonnet to
handle structure, wiring, and validation.

All content original. One style guide, written first, covering each character's register
and vocabulary; every batch checked against it.

## Mandatory validation

Data-driven tests over the whole content set:

- every character has a reachable fallback state
- no dialogue node is unreachable from its root
- no node has zero choices without `nextId: null`
- every `revealLocation` and `recruitCharacter` names something that exists
- every flag read by a condition is written by something

These must run in CI. At 650 nodes, manual verification stops being possible.

## Open questions for the spec pass

- Batch by character or by act? Character keeps voice consistent; act keeps the
  playable frontier moving.
