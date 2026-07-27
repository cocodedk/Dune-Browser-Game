# 00 — Overview

## Target

The **Cryo Interactive Dune (1992)** shape: an adventure/strategy hybrid where the
player flies an ornithopter between sietches, talks to characters, assigns Fremen
troop groups to tasks, and works under an escalating spice quota from the Emperor.

Explicitly **not** Westwood's Dune II (real-time strategy).

## Ground rules

1. **All content is original.** Systems and structure are re-implemented; art, music,
   dialogue, and story beats are authored fresh. Character names and plot in
   `01-design-systems.md` are original inventions set in the Dune milieu. No assets or
   text are taken from the original game or the novels.
2. **This is a personal project.** Dune is licensed IP; nothing here is for distribution
   or sale.
3. **The engine stays pure.** `src/game-engine/` is deterministic TypeScript with no
   rendering or React imports, unit-tested with Vitest. The renderer reads `world`
   and never writes to it.
4. **200 lines per source file**, enforced by pre-commit. Plan for many small modules.
5. **The app runs at every commit.** No big-bang rewrites; the Phaser→three.js swap
   runs both renderers side by side until three reaches parity.

## Scope tiers

| Tier | Scope | Stages | Est. driven hours |
|---|---|---|---|
| **1 — Act 1 slice** | Playable 60–90 min: land, pledge sietches, harvest, prospect, buy a harvester, pay three quotas, Act 1 finale. Full 3D. | 01–14 | 25–35 |
| **2 — Complete, thin** | Full four-act arc, all systems, minimal art | 15–19, 21 | +30–45 |
| **3 — Faithful** | Original art set, ambient score, cutscenes, full script | 20 + polish | +60–120 |

The 3D requirement moves Tier 1 up from the earlier 2D estimate of 15–20 hours;
three.js infrastructure and the strategic-mode look are roughly 9 extra tasks.

## What survives from the current codebase

**Keep as-is (~3,000 lines):** `TimeSystem`, `EventSystem`, `TravelSystem`, the
dialogue-tree runner, `persistence.ts`, `difficulty.ts`, `EventBus`, the zustand
store, every React panel, the whole tooling layer (pre-commit gate, bundle budget,
file-length check, Vitest + Playwright suites).

**Rework:** `types.ts` (`Village` → `Location` union, new Player/Quota fields),
the sietch task/payout skeleton (threshold payouts → continuous accrual over troop
groups), `TerritoryZones` (`pointInPolygon` survives, Phaser Graphics dies),
`VillageMarkers` (colour + travel-lerp survive), `AudioManager` (Phaser sound →
raw WebAudio), `vite.config.ts`, `scripts/check-bundle-size.mjs`.

**Delete:** `BootScene`, `GameScene`, `MapRenderer`, `GameContainer.tsx`, the
phaser3spectorjs shim, the `phaser` dependency.

**Quarantine, do not delete:** `src/game-engine/faction/` — the diplomacy, goals,
conflict, and reputation simulation (~2,500 lines, well tested). Cryo Dune has one
authored antagonist and a hand-tuned escalation curve; an emergent multi-faction sim
fights that curve and multiplies the playtest surface. It is replaced in the active
loop by four scalars (`emperorPatience`, `harkonnenAggression`, `fremenTrust`,
`smugglerStanding`). Keep the module compiling behind a flag — it could power a
post-release open-sandbox mode. Retire `FactionPanel` and `GoalOverlay` from the
main screen.

## Two known defects to fix in passing

- `e2e/game.spec.ts` asserts the literal title `DUNE: BROWSER GAME — PoC`, but
  `App.tsx` renders `DUNE: BROWSER GAME`. Stale assertion.
- `GameScene.ts` mutates `world.speed` and `world.difficulty` directly from the
  render layer, violating rule 3. Stage 01 fixes this permanently.

## Verification gate

Every stage must pass, before it is called done:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:unit
npm test
```

Stages touching commit-time enforcement or repo tooling additionally run
`sh .githooks/pre-commit`.
