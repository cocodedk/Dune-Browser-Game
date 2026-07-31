# Stage 04 — Phaser removal

**Phase:** 0 · **Depends on:** 03 · **Est. tasks:** 2 · **Builder:** Sonnet
**Status:** SPECCED

## Goal

Flip the default renderer to three.js, delete Phaser entirely, and port the audio layer.
This is the stage that banks the bundle win.

## Preconditions

Do not start until Stage 03 is VERIFIED and Claude has signed off on the look. Deleting
the fallback before parity is real leaves no way back.

## Work

**Flip the default.** `?renderer=three` becomes the default; `?renderer=phaser` keeps
Phaser alive for exactly one commit, then the next task removes it.

**Rename the mount point.** `#phaser-container` → `#scene-container`. One E2E locator in
`e2e/game.spec.ts` references it.

**Fix the stale E2E assertion** while in that file: it asserts the literal title
`DUNE: BROWSER GAME — PoC`, but `App.tsx` renders `DUNE: BROWSER GAME`. It passes today
only because of how the assertion is written; make it match reality.

**Port audio.** `src/game-render/audio/AudioManager.ts` (~120 lines) replaces the Phaser
sound version using raw WebAudio. It must keep the identical bus contract —
`audio:changed` and `audio:mute` — so `StatusBar.tsx` needs no change. Honour browser
autoplay policy: create the `AudioContext` lazily on first user gesture and never throw
if it is blocked.

**Delete:**

- `src/game-render/BootScene.ts`, `GameScene.ts`, `MapRenderer.ts`
- the old `src/game-render/AudioManager.ts`
- `src/ui/GameContainer.tsx`
- `src/shims/phaser3spectorjs.cjs`
- the `phaser` dependency from `package.json`
- the `phaser` alias, the shim alias, the `phaser` `manualChunks` entries, and the
  `define: { global: 'globalThis' }` workaround from `vite.config.ts` (verify the
  `global` define is genuinely unused before removing it)
- the `^phaser-.*\.js$` budget entry from `scripts/check-bundle-size.mjs`

**Rename** `FACTION_PHASER_COLORS` → `FACTION_HEX_COLORS` in `factionColors.ts` and at
its call sites. The values feed `THREE.Color` directly and need no conversion.

**Update docs:** the layout and stack sections of `CODEX.md` and `CLAUDE.md`. Both list
Phaser as current stack; that becomes three.js. These two files must stay in sync with
each other — that rule is already in `CLAUDE.md`.

## Acceptance criteria

1. `grep -rn "phaser" src/ vite.config.ts package.json scripts/ --include='*' -i`
   returns nothing outside of historical docs.
2. `npm run build` passes; **report the before/after total JS size**. Expect roughly
   1.55 MB → 0.7–0.9 MB. If the drop is much smaller, three is not tree-shaking —
   investigate before calling the stage done.
3. Audio still plays and the mute toggle still works, with no console error when
   autoplay is blocked.
4. All E2E tests pass against the three renderer.
5. `CODEX.md` and `CLAUDE.md` agree with each other and with reality.

## Gate

Standard, plus `sh .githooks/pre-commit` — this stage changes tooling and enforcement
files.
