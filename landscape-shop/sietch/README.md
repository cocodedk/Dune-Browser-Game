# Sietch — landscape shop

Scaffolded by `npm run land:new -- sietch`. Build and gauntlet-test
sietch here, separately from the game and from every other shop, in
three.js — see `docs/PRD/dune92/04-asset-pipeline.md` for the pipeline
this shop is part of.

## Public surface

The game may import only `src/model/**`, `src/contracts.ts` and
`src/spec.ts`, and only via the `@land` alias — never a bare path into
this directory. ESLint enforces the fence (see `eslint.config.js`);
`src/game-render/modes/location/LocationMode.ts` (sietch) or `src/game-render/modes/flight/FlightMode.ts` (cliff) is the release point, per the roster — see `landscape-shop/docs/gauntlet-loop.md`.
Everything else here (`main.ts`, the dev harness, test-only helpers) is
harness, free to churn.

## Run it

```bash
npm run land:sietch          # dev server for the test area
npm run land:sietch:check    # type-check (tsc -p landscape-shop/sietch)
npm run land:sietch:build    # production build of the shop alone
```

## Verifying

```bash
npm run lint                     # from the repo root
npm run land:sietch:check
npx vitest run landscape-shop/sietch
bash scripts/check-file-length.sh
```

The 200-line cap applies to every source-like file here (see CODEX.md).
Markdown is exempt.

## Where the work is tracked

[`progress.md`](./progress.md) holds the bar and the round log.
