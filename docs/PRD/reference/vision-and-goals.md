# Vision and Goals

## Project Goal

Build a pure browser game recreating the Arrakis world simulation with:

- Time-based progression
- Dialogue-driven story
- Resource economy (spice)
- Faction dynamics
- Browser-stored save/resume so a run can continue later

Runs in browser using React + TypeScript + Phaser.

## Minimal Viable Version

5 villages, 1 resource (spice), 1 faction mechanic, 1 dialogue chain. If that works — scale.

## What Success Looks Like

Player can:

1. Click a village
2. Travel there
3. Talk to the leader
4. Influence loyalty
5. See time pass
6. Watch spice accumulate
7. Leave and resume the same game later from browser storage

If that loop feels good, Dune is rebuilt.

## Guiding Principles

- Use Phaser for rendering
- Keep the engine pure TypeScript
- Keep React out of the game loop
- Persist game state in browser storage for later resume
- Ship something ugly early

---

# Source

Extracted from `docs/PRD/game-plan.md` (Sections 1, 13, 14, 15)
