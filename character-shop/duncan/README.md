# Duncan — character shop

Scaffolded by `npm run cast:new -- duncan`. Build and gauntlet-test
duncan here, separately from the game and from every other shop, in
three.js — see `docs/PRD/dune92/04-asset-pipeline.md` for the pipeline
this shop is part of.

## Public surface

The game may import only `src/model/**`, `src/contracts.ts` and
`src/spec.ts`, and only via the `@cast` alias — never a bare path into
this directory. ESLint enforces the fence (see `eslint.config.js`);
`src/game-render/modes/conversation/drawFigure.ts` (and friends) is the release point — see `character-shop/docs/gauntlet-loop.md`.
Everything else here (`main.ts`, the dev harness, test-only helpers) is
harness, free to churn.

## Run it

```bash
npm run cast:duncan          # dev server for the test area
npm run cast:duncan:check    # type-check (tsc -p character-shop/duncan)
npm run cast:duncan:build    # production build of the shop alone
```

## Verifying

```bash
npm run lint                     # from the repo root
npm run cast:duncan:check
npx vitest run character-shop/duncan
bash scripts/check-file-length.sh
```

The 200-line cap applies to every source-like file here (see CODEX.md).
Markdown is exempt.

## Where the work is tracked

[`progress.md`](./progress.md) holds the bar and the round log.
