# Stage 22 — Gauntlet Loop prompt

The run prompt for building the ornithopter specced in
[`22-ornithopter.md`](./22-ornithopter.md). Paste the block in section 3 into Claude Code
or Codex at the repository root.

---

## 1. What a Gauntlet Loop is

Matt Shumer's pattern, from the "Claude of Duty" project — a browser FPS grown from a
three-paragraph prompt into ~55,000 lines across 11 subsystems, with a critic log tracking
the score climbing from 3.59/10 toward just above 5.

The loop:

1. **Decompose** — the lead agent breaks the goal into the smallest parts that can be
   improved and judged *independently*.
2. **Build** — a builder agent per part, working from the goal alone.
3. **Critique** — a **separate critic with fresh context**, which sees the goal, the bar
   and the actual rendered artifact, and **never the builder's reasoning**.
4. **Revise** — the critic names the single biggest remaining gap; it goes back.
5. **Integrate** — a final pass checks the parts still cohere.

Three rules do the real work:

- **Never let a builder grade its own work.** A builder that explains itself will talk its
  way around a limitation. The critic gets the artifact, not the argument.
- **Give the destination, not the implementation.** Do not prescribe architecture,
  decomposition, or a round count.
- **Make the bar impossible to argue away.** It has to be observable and comparative —
  reference screenshots, a test suite, a measurement — not "make it great".

## 2. The bar, and why this one is honest

The bar is the most important decision in the whole method, and most of them are too soft.
Two things make this project unusually well-suited:

**A blind identification test.** Section 1.4 of the spec measured the current craft
downsampled to 64px: it resolves to a horizontal dark smear with one blue pixel, and reads
as a scratch on the lens. So the bar writes itself — *a critic that has not been told what
it is looking at must identify it as an aircraft with beating wings.* That cannot be
argued around, it needs no external reference asset, and it is exactly the failure the
measurements already found.

**Hard gates that are already measurable.** Section 4 of the spec lists five acceptance
criteria, and the repository already has the instruments: `scripts/shoot.mjs` captures
frames, `scripts/measure.mjs` reports luma and contrast over a region, and a unit test can
assert the wing-root hinge without rendering anything.

Between them, a builder cannot pass by assertion. It has to produce a picture that a
stranger recognises, and numbers that clear a line.

**On fan-out.** The Claude of Duty notes record that broad fan-out performed *worse* than
sequential ownership for coupled visual systems. A single vehicle is exactly that: its
silhouette, materials and motion are one aesthetic problem. So the prompt below asks for
decomposition, but the genuinely independent seams here are few — the pure motion maths,
the environment map, the geometry, the material treatment. Expect a handful of parts, not
a swarm.

## 3. The prompt

Minimal on purpose. The method is explicit that the agent should choose the specifics.

```text
Rebuild the ornithopter in this repository so it reads as a hero vehicle from a modern
AAA game. The research, the measured current state and the design targets are in
docs/PRD/dune92/stages/22-ornithopter.md. Read it first. It is evidence and direction,
not instructions — you choose the approach.

The bar is blind identification. Capture the craft with scripts/shoot.mjs, downsample its
silhouette to 64 pixels wide, and show it to a fresh critic that has NOT been told what it
is. That critic must identify it unprompted as an aircraft with beating wings. Today the
same test returns "a scratch on the lens". Separately, every acceptance criterion in
section 4 of that spec must be met by measurement — scripts/measure.mjs and a unit test —
never by assertion.

Break the work into the smallest parts that can be improved and judged independently. For
each part spawn a builder, and spawn a SEPARATE critic with fresh context that sees only
the goal, the bar and the rendered result — never the builder's reasoning. The critic
names the single biggest remaining gap and hands it back. Keep looping until a blind
critic prefers our craft to what it expects of a modern game, or until the remaining gains
are too small to be worth the tokens. Keep a live progress page at
.shots/thopter/progress.md recording each round's critic verdict and the measured numbers.
Use subagents and ultracode.

These are boundaries, not suggestions. npm run lint, npx tsc --noEmit, npm run build,
npm run test:unit and npm test must all pass before anything is called done. 200 lines
maximum per source file, enforced by pre-commit — split rather than exceed. Never
--no-verify. src/game-engine/ stays free of three.js and src/game-render/ never mutates
world state. Do not commit; leave the work in the tree for review.
```

## 4. Running it

- Needs an agentic harness — Claude Code or Codex. This does not work in a chat window;
  the agent has to open files, run the build, render frames and read them back.
- `ultracode` is what lets the model write its own orchestration and fan work out; it is
  capped at 16 concurrent agents and 1,000 per run.
- Expect it to be expensive. The reference project ran for hours and was still improving
  when it was stopped.

**Watch for two failure modes specific to this task.** First, a builder reporting the gate
passed without running it — that has already happened once in this repository, where a
subagent's four verification commands missed the pre-commit line-length check. Second,
procedurally generated detail: Cloud Imperium tried exactly that on Star Citizen and
reverted to hand-modelled shapes because it read as noise. If the loop starts filling space
with randomised greebles, that is the ceiling of the procedural approach, and the moment to
reopen the GLB decision from Stage 12 rather than push on.

## 5. Sources

- How to run a Gauntlet Loop — https://somethingbig.ai/gauntlet-loop
- AI loop engineering and the Gauntlet Loop — https://www.thepromptindex.com/ai-loop-engineering-gauntlet-loop-guide.html
- Claude Opus 5's browser FPS, and the critic log — https://calipsu.com/gauntlet-loop-prompt-strategy/
- Gauntlet kit — https://github.com/artificialguybr/gauntlet-kit
