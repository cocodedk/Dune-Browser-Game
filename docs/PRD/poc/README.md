# PoC — Dune Browser Game

## What a PoC Is

A Proof of Concept is a small, incomplete version that proves the core idea works.
In games: test core mechanics, ignore everything else, throw it away if needed.

**Goal is NOT to build the game.**
Goal is to answer:
- Is it fun?
- Does the architecture hold?
- Does the AI approach make sense?

## Why PoC First

If you skip this step, you will:
- Overbuild systems that don't matter
- Spend months on architecture that breaks
- Discover too late that the gameplay loop is weak

The PoC is the cheapest way to validate the most important unknowns.

## PoC Scope (brutally small)

| Dimension | PoC value |
|-----------|-----------|
| World | 3 villages, 1 player, 1 AI faction |
| Systems | Time progression, travel, spice resource, basic dialogue |
| AI | One decision loop — attack / ally / ignore |
| UI | Barebones — text panel + map with clickable nodes |

**What to fake (do not build):**
- Full UI
- Animations
- Proper art
- Full diplomacy system
- Complex combat

Use: colored circles, plain text, hardcoded data.

## Task Checklist

Use this sequence. The original numbering is historical; the dependency order matters more than numeric order.

### Core path

- [ ] [01 — Project Setup](./01-project-setup.md)
- [ ] [02 — Engine World State](./02-engine-world-state.md)
- [ ] [03 — Time System](./03-time-system.md)
- [ ] [04 — Map and Travel](./04-map-and-travel.md)
- [ ] [05 — Village and Spice](./05-village-and-spice.md)
- [ ] [06 — Dialogue Tree](./06-dialogue-tree.md)
- [ ] [08 — React UI Barebones](./08-react-ui-barebones.md)

### AI path

- [ ] [09 — LLM Integration](./09-llm-integration.md)
- [ ] [07 — Faction AI Basic](./07-faction-ai-basic.md)

## PoC Success Criteria

All of the following must be true before calling the PoC complete:

- [ ] Can play 5–10 minutes without crashes or confusion
- [ ] AI produces believable behavior (not random, not game-breaking)
- [ ] Loop feels meaningful — decisions have visible effects
- [ ] Want to keep playing

## After the PoC — Go / No-Go Decision

When all success criteria are met, hold a brief review:

**Go** — gameplay loop is fun, architecture held up, AI is useful → proceed to `docs/PRD/impl/`

**No-Go** — loop is boring, AI is unusable, or architecture needs a full redesign → iterate on PoC or cancel

The go/no-go decision is made by a human. Do not skip it.

## PoC Story Scenario

The PoC should tell a minimal but complete story arc to validate the loop feels meaningful.

### Setup
- You arrive on Arrakis as a newly appointed ruler
- 3 villages exist — all neutral, none trust you
- 1 AI faction (Harkonnen) actively working against you

### Win condition (pick one)
- Control all 3 villages, OR
- Survive 20 minutes without losing all loyalty

### Required story events (exactly 3)
1. **Alliance offer** — a village leader offers to join you (dialogue choice: accept / negotiate / refuse)
2. **Betrayal** — an ally turns against you (triggered by Harkonnen bribery — AI faction action)
3. **Attack** — Harkonnen faction attacks one of your villages (abstract combat resolution)

### Why these 3 events matter
- Alliance offer tests: dialogue system + loyalty mechanics
- Betrayal tests: AI faction decisions have visible consequences
- Attack tests: conflict resolution + resource impact

These 3 events together prove the core loop works:
`travel → interact → time passes → world reacts → player decides → consequence`

If all 3 events fire correctly and feel meaningful → PoC passes.

### Narrative delivery
- No cutscenes
- Events delivered via dialogue panels and event log
- AI faction actions shown as text notifications ("Harkonnen troops move on Sietch Tabr")

---

> **GATE: Do NOT start `docs/PRD/impl/` tasks until the PoC passes all success criteria above.**
