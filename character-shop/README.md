# character-shop

One standalone sub-project per named character — the cast equivalent of
`vehicle-shop/`, released into the game through the same fenced seam
(`docs/PRD/dune92/04-asset-pipeline.md`). Full-body, true meters, face toward −Z,
2021/24 Villeneuve films as the sole likeness authority, AAA bar.

The loop contract — roster, waves, rounds, the bar, and the rules every builder and
critic runs under — is [`docs/gauntlet-loop.md`](docs/gauntlet-loop.md). Per-character
round logs live in each sub-project's `progress.md`.

Characters stay separate: no cross-shop imports (ESLint-enforced). Shared DNA travels in
the `cast:new` scaffold template, never as shared code.
