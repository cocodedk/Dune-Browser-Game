# Builder prompt template

One builder per independently-judgeable part. Give it the destination and the boundaries;
let it choose the route.

---

Repo: [path], branch [x]. [State whether the tree has uncommitted work to build on rather
than revert.] Read [the repo's agent guide] first and obey it.

Spec / reference: [path or URL]. It is evidence and direction — **you choose the approach.**

## Where this stands

[What previous rounds established, and what must be preserved. Be specific about which
things are hard-won and tested, or a builder will helpfully "improve" them.]

## The gap you are closing

[The critic's named gap, quoted verbatim. Quoting matters — a paraphrase loses the
specificity that made it actionable.]

> "[critic's words]"

[Any supporting observations the critic made.]

## Measured targets

[Every number the work must move, with the measurement method and its parameters. Not
"improve contrast" but "region A vs region B in the same frame, ≥35%, via <tool>".]

If a previous round reported a number that did not reproduce, say so and say why — it stops
the next builder trusting it.

## Boundaries, not suggestions

- Verification: [the full command list].
- **[Name every check those commands do NOT run]** — pre-commit hooks, file-length limits,
  bundle budgets. State plainly that the commands can all pass and the commit still be
  rejected.
- [Layering rules, file size limits, naming conventions.]
- Do not break [named tests / contracts that previous rounds fought for].
- Do NOT commit. Do NOT use `--no-verify`. Remove scratch files you create.
- [If a shared resource exists — a port, a server — say how to check for it and how to
  release it. "Stop it by its port-owner PID, never a broad pkill."]

## See your own work

[Exactly how to reach the artifact: build command, server, the debug handles or routes
needed to get to the right screen or state.]

**Look at your own output before reporting.** [If the artifact varies — animation phases,
breakpoints, times of day — say so, and say to capture several.]

## Report

Files changed with line counts, the measured numbers before and after **with the frame or
sample each came from**, the exact output of the verification commands, and your honest
read of the result. Say what you did not manage, and what you deliberately left alone.

---

## Notes on why this shape

- **"You choose the approach"** is load-bearing — prescribing the route produces the
  solution you already imagined, rarely the best one available.
- **Quote the critic verbatim** — paraphrasing sands off the specificity.
- **Name the unrun checks** — gates lie by omission, and a builder cannot check for a hook
  it does not know exists.
- **"with the frame each came from"** — prevents the most common bad measurement, pairing a
  reading from one sample against a reading from another.
- **Asking what it left alone** — builders surface honest gaps if asked, quietly omit them
  if not.
