# Handoff — state of the build

Written at the end of a long autonomous build session. Everything below is
verified, not inferred: tests were run and read, and visual claims were checked
against screenshots.

Branch: `feat/dune92-3d-recreation`

## Numbers

| | |
|---|---|
| Unit tests | 738 (from 236) |
| E2E | 8/8 |
| Runtime JS | ~761 kB (from ~1763 kB) |

`npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:unit` and
`npm test` all pass.

## What exists and works

**Render (Phase 0 + Phase 2)** — three.js only, Phaser fully retired.
Procedural dune terrain with a custom sand shader, day/night atmosphere driven
by `world.time`, sietch markers with name labels, raycast picking, clamped
camera. Flight cinematic with a procedural ornithopter, location dioramas, and
a conversation view.

**Engine (Act 1 + Phase 3)** — loyalty and pledging, troop groups, calibrated
harvesting, field depletion, prospecting, smuggler market, the quota clock with
patience and arrears, crew orders, combat and raids, training, ecology,
prescience, fort assaults, and the four-act machine with five endings.

**Content** — all four acts have written dialogue, with CI-enforced integrity:
every conversation root resolves, no dangling choice targets, and every
conversation can terminate.

**Balance** — a headless simulation harness (`game-engine/balance/`) runs full
playthroughs in microseconds under four strategies.

## Known issues, honestly stated

1. **The character card renders darker than its authored backdrop.** Not
   solved. Ruled out with evidence: the scrim (disabling it entirely changed
   nothing), tone mapping, sRGB colour space, group render order, and material
   transparency. The per-character accent system demonstrably works — Ysane's
   rim reads spice-blue. The overall level does not match the authored values
   and the cause is still unknown. Roughly seven attempts went into this; a
   fresh pair of eyes will likely beat another hour of mine.

   Eight attempts total. Eliminated with evidence: the scrim (disabling it
   entirely changed nothing), tone mapping, sRGB colour space, group render
   order, material transparency, silhouette size, and a flat warm tint
   matching the one the diorama uses. The diorama renders correctly through
   the same pipeline, which is the strongest clue available: diff the two
   draw paths rather than theorising about the colour pipeline, because the
   pipeline has now been ruled out four separate ways.

2. **Portrait direction is a defensible default, not a chosen one.** All values
   live in `src/data/portraits.ts` and can be redirected without touching the
   renderer.

3. **Balance is internally consistent but unvalidated by play.** The harness
   proves the numbers agree with each other. It cannot say whether the 8-day
   cycle bites or whether the harvester decision feels like a decision.

## What I would do next, in order

1. **Play it for twenty minutes.** Everything below this line is cheaper once
   that has happened.
2. Retune from what that reveals — the harness makes any change verifiable in
   seconds, and `simulate.test.ts` documents the invariants that must survive.
3. Fix or replace the character card (issue 1).
4. Extend dialogue depth. The structure carries the full arc; individual trees
   are two to four nodes deep and would take more.
5. Audio. Nothing exists beyond the WebAudio plumbing and a silent-on-missing
   asset policy.

## Lessons worth keeping

Three times this session a fully green test suite reported nothing useful:

- It missed that the harvester was unpurchasable, so the capex decision the
  Act 1 slice is built around did not exist in play. A twelve-line simulation
  found it immediately.
- It missed that `DialogueEffect` was never extended with the flag fields
  Stage 06 specced — invisible for twelve stages, because vitest does not
  typecheck. It surfaced only when content finally used them.
- It had nothing to say about a card rendering black.

Each was caught by looking at output: a simulation, a type error, a screenshot.
**Passing tests prove the machine runs. They do not prove it is worth playing.**
