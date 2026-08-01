# Critic prompt template

Copy, fill the bracketed parts, and spawn as a **fresh** agent. It must not see the
builder's reasoning, report, or self-assessment — only the artifact.

Keep the artifact list to what is being judged. Tell it to ignore surrounding UI, or it
will critique your sidebar.

---

You are judging [an object / a page / a layout] in some images. Answer only from what you
can see. Read only the paths given — do not open any other file in this repository, and do
not speculate about where the images came from.

[If a blind identification test applies, put this block FIRST and give only the
low-information sample here — a downsampled or cropped version. Its value is destroyed if
the critic sees the full-resolution version first.]

Look at this one only:

  [path to the small / downsampled / silhouette sample]

1. What is it? Your single best guess, in a few words. "Not identifiable" is a valid and
   useful answer — say it plainly if that is the truth.
2. How confident are you: high, medium, or low?

Now the full-resolution frames. [Ignore the panel on the right / the browser chrome / the
surrounding page] entirely — it is not part of what you are judging.

  [path 1]
  [path 2]        ← several samples: different states, phases, sizes, times
  [path 3]

3. What is it now? Does your answer change?

4. **Is it correct?** [Ask the domain's correctness question explicitly. Examples:
   is it facing the direction it is moving; is the text legible at this size; are the
   proportions consistent between views; does the state shown match the state described;
   is anything upside down, mirrored, or out of scale.] This question is not optional and
   it is not the same as asking whether it looks good.

5. Does it read as [a built machine / a designed page / a finished asset], or as an
   assembly of simple shapes? Name the specific features that do or do not support that.

6. Put it side by side, in your mind, against [the reference / a comparable artifact from a
   well-funded product]. Which do you pick, and why? Be blunt. A diplomatic answer is
   worthless here — if it looks cheap, say so and name exactly what gives it away.

7. Name the single biggest remaining thing that would most improve it. One thing, the
   highest-impact one, concrete enough to act on without a follow-up question.

8. On a scale of 1 to 10, where 1 is [an untextured placeholder] and 10 is [a finished
   asset in a current AAA title], where does this sit? Give a number and one sentence.
   Do not be generous.

Return prose. Do not edit any files.

---

## Why each part is there

- **Blind sample first.** Once the critic has seen the full-resolution version it cannot
  un-see it, and the identification answer becomes worthless.
- **Several samples.** An artifact that varies — an animation phase, a breakpoint — can
  present one unlucky frame. A single sample is not a verdict.
- **The correctness question (4).** The reason this template exists. A critic asked only
  about quality will describe a defect in loving detail without recognising it as one.
- **"A diplomatic answer is worthless".** Without it, critics hedge, and a hedged critique
  produces a round that changes nothing.
- **One gap (7).** A list of twelve gaps is a list nobody acts on. One is a next round.
- **A score (8).** Makes progress legible across rounds and stops "it's better now" from
  being the only signal.
