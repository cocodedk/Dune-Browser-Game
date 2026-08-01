---
name: gauntlet-loop
version: 1.0.0
description: Use when work must be driven to a quality bar by repeated build-and-judge rounds, especially visual or design work where "does it look right" is the deliverable — "make this look AAA", "get this to production quality", "run a gauntlet loop", "iterate until it beats X", "build this and have critics judge it", "keep going until it's actually good". Matt Shumer's Gauntlet Loop: a lead decomposes, builders build, and SEPARATE fresh-context critics judge the artifact against a concrete bar, never seeing the builder's reasoning. Use instead of agent-loop when the gate is a judgement against a reference rather than a green test suite. Also use when asked which loop fits a quality-driven or subjective goal.
argument-hint: [goal, e.g. "make the vehicle model look like a modern AAA game asset"]
---

# Gauntlet Loop

Matt Shumer's pattern, from the "Claude of Duty" project. You are the **lead**. You
decompose the work, spawn **builders**, spawn **separate critics with fresh context**, and
loop on the biggest named gap until the output clears the bar.

Use this when the gate is a *judgement*. If the gate is `npm test` passing, use
`agent-loop` instead — that is a cheaper, tighter loop and this one's machinery is waste.

## The three rules everything else serves

1. **A builder never grades its own work.** A builder that explains itself will talk its
   way around a limitation. The critic receives the artifact, never the argument.
2. **Give the destination, not the route.** Do not prescribe architecture, decomposition,
   or a round count. Builders find better paths than you specify.
3. **The bar must be impossible to argue away.** Observable and comparative — a reference
   image, a measurement with named parameters, a blind identification test. Never "make it
   great".

## Step 1 — Choose the bar. This is the whole job.

Most gauntlet loops fail here, and a weak bar wastes every round after it. A good bar is
something a stranger can check without your explanation.

Strong bars, in rough order of preference:

- **Blind identification.** Show a fresh critic the artifact with no context and ask what
  it is. Powerful because it needs no reference asset and cannot be flattered.
- **A real reference, side by side.** A photograph, a competitor's screenshot, a spec
  sheet with numbers on it.
- **A measurement with the parameters written down.** Not "contrast should be higher" but
  "region (650,430,320,220) versus region (650,750,320,220), same frame, ≥35%".
- **A test that fails today.** The strongest gate available when the property is checkable.

### The bar MUST contain a correctness question

This is the most expensive lesson available and it is not in the original method.

An aesthetic bar cannot catch a correctness defect. In a real run, an aircraft **flew
backwards for four rounds and three blind critics** — every critic was asked "is this
convincing?" and none was ever asked "is this doing the right thing?". One critic described
"a nose cone" and "cockpit glass" while explicitly noting the camera was *behind* the
craft, and never joined the two facts. The user spotted it in one glance.

So every critic prompt gets both halves:

- *Is this good?* — the quality bar.
- *Is this correct?* — does it do what it claims: right way round, right scale, right
  units, right state, consistent with its own inputs.

## Step 2 — Decompose, but do not over-fan

Split into the smallest parts that can be improved **and judged** independently.

**Coupled systems resist fan-out.** The Claude of Duty notes record broad fan-out
performing *worse* than sequential ownership for coupled visual work, and in a real run two
builders scoped to different concerns still collided in the same file on round one. A
single asset — its silhouette, materials and motion — is one aesthetic problem.

Expect a handful of parts, not a swarm. Genuine seams are usually: pure logic/maths,
shared infrastructure, geometry, materials. If two builders would touch one file, run them
in sequence.

## Step 3 — Build

Spawn one builder per part. Give it the goal, the bar, the hard boundaries, and nothing
about how to get there.

Boundaries that must be explicit, because gates lie:

- The full verification command list — and **name any check those commands do not run**.
  A pre-commit hook, a line-length limit, a bundle budget. A builder reported a green gate
  in a real run and the commit was still rejected.
- File size limits, layering rules, "do not commit", "no `--no-verify`".
- What must not be touched — previously hard-won fixes, tested contracts.

## Step 4 — Critique, with fresh context

Spawn a **separate** critic. It sees the goal, the bar, and the rendered artifact. It never
sees the builder's reasoning, its report, or its self-assessment.

Ask it to:

- Answer the correctness question as well as the quality one.
- Compare against the bar, blind and side by side where possible.
- Be blunt. Say explicitly that a diplomatic answer is worthless.
- Name the **single biggest remaining gap**, concrete enough to act on.
- Score against the bar, so progress across rounds is legible.

Judge across **several samples** where the artifact varies — animation phases, times of
day, screen sizes. One unlucky frame is not a verdict.

## Step 5 — Verify as the lead. Do not bank reports.

Builder reports are evidence, not findings. In one run:

- A builder reported **43.2%** on a measurement that reproduced at **8%** — it had paired a
  reading from one frame against a reading from a different frame.
- A builder reported the gate green while missing the pre-commit length check.
- A builder's own test validated its own fix; an independent probe was needed to confirm.

Re-run the measurement yourself with your own regions. Re-run the gate. Where a builder
wrote both the fix and its test, probe it a third way.

Two traps worth naming:

- **Never judge a tree mid-write.** Check file mtimes first. A gate run against a
  half-written file produces a phantom failure that reads exactly like a real one.
- **Never act on a stale critique.** If rounds have landed since a critic ran, its findings
  may already be fixed. Re-capture before re-fixing.

## Step 6 — Loop, and keep a visible log

Feed the named gap to the next round. Keep a progress file recording, per round: what
changed, the critic's verdict and score, the measured numbers, and **what did not
reproduce**. The failures are the most valuable entries — they are what stops round five
repeating round two.

Stop when the bar is met, when gains no longer justify the cost, or when the next gap needs
a human decision. Say which of the three it was.

## Failure modes seen in practice

| Symptom | Cause | Fix |
|---|---|---|
| Defect survives many rounds | The bar has no correctness question | Add "is this correct?" to every critic |
| Builders overwrite each other | Fan-out across a coupled artifact | Sequence them; one owner per file |
| Reported number won't reproduce | Undefined measurement regions | Put the parameters in the bar itself |
| Green gate, rejected commit | Verification list omits a hook | Name unrun checks explicitly |
| Phantom test failure | Read a tree mid-write | Check mtimes before judging |
| Round fixes an already-fixed thing | Stale critique | Re-capture before re-fixing |
| Detail reads as noise | Procedural generation filling space | Author named forms; jitter is not detail |
| Reasoned target beats measured one | Analogy instead of a reference | Measure the real object; reasoning loses |

## Cost

This is expensive — a real run spent well over a million tokens across six rounds. Scale
the fan-out and round count to how much the artifact matters, and say so up front rather
than discovering it at round four.
