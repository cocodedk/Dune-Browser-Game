# AGENTS.md — Dune Browser Game

**Read [`CODEX.md`](./CODEX.md).** It is the canonical agent guide for this repository:
stack, architecture, working rules, build and test commands, enforced safeguards, and the
completion checklist.

This file exists because several tools look for `AGENTS.md` by name. It deliberately does
not restate what `CODEX.md` says — it used to, and the copies drifted.

## What the drift looked like

Recorded because it is the argument for keeping this file short:

- This file carried a "Vite / Phaser quirks" section telling agents to preserve an alias to
  `phaser/src/phaser.js` and a shim at `src/shims/phaser3spectorjs.cjs`. Phaser was removed
  in stage 04. There is no such dependency, no such alias, and no `src/shims/` directory.
  An agent following it would have been maintaining a renderer that had not existed for
  months.
- It named `GLM-PLAN.md` four times as the live work checklist. That checklist had reached
  eleven items done and none open.

The live status board is
[`docs/PRD/dune92/03-stage-index.md`](./docs/PRD/dune92/03-stage-index.md); per-stage specs
sit beside it in `docs/PRD/dune92/stages/`.

## The one thing not in CODEX.md

Some sessions use a planning/implementation split: a thinking model designs and reviews, an
implementing model writes the code, and the reviewer verifies against the diff and the gate
rather than against the implementer's own report.

That last clause is the load-bearing part, and it is not theoretical here. A subagent in
this repository reported a green gate while missing the pre-commit line-length check, which
only surfaced when the commit was rejected. Another reported a 43.2% measurement that did
not reproduce — it had paired a reading from one frame against a reading from a different
one. Both reports were confident and both were wrong.

Verify the work, not the summary.
