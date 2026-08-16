// src/ui/confirmCopy.ts
// The wording of the two confirmation steps the opening requires, in one
// place, because two surfaces now raise each of them: the command-column
// panels (PledgePanel.tsx, CrewCard.tsx) and the centre-screen decision card
// (ActionPrompt.tsx).
//
// Both steps are authored requirements, not decoration:
//   - 03-opening-experience.md Beat 4: a pledge needs "a concise
//     confirmation that a pledge grants responsibility for one crew; it is
//     not an unlabelled ownership button";
//   - Beat 5: the one-day changeover consequence must be surfaced BEFORE
//     confirmation, not after.
// A prompt that emitted the bus event straight from its own button would
// skip both. So the card opens this same ConfirmModal instead.
//
// The strings are lifted verbatim from those two components — several are
// load-bearing in the e2e suite (`one crew`, `no yield today`, and the
// confirm labels `Pledge` and `Issue order`, which e2e/helpers.ts clicks by
// exact text). Changing any of them is a suite-wide change, which is exactly
// why they now live somewhere a unit test can see them.

import type { YieldRange } from '../game-engine/troops/harvestRecommendation'

/** Exactly ConfirmModal.tsx's own props, minus the two callbacks. */
export interface ConfirmCopy {
  title: string
  lines: string[]
  confirmLabel: string
}

export function pledgeConfirmCopy(villageName: string): ConfirmCopy {
  return {
    title: `Pledge the Fremen of ${villageName}`,
    lines: [
      'A pledge grants you responsibility for one crew raised from their ' +
        'people — their orders, their welfare, and their harvest become yours to answer for.',
    ],
    confirmLabel: 'Pledge',
  }
}

/** CrewCard's own order label, e.g. `harvest Red Wall Pan`. */
export function harvestOrderLabel(fieldName: string): string {
  return `harvest ${fieldName}`
}

/** CrewCard's own projected-yield phrasing, e.g. `3.1–8.4/day`. */
export function yieldRangeText(range: YieldRange): string {
  return `${range.min.toFixed(1)}–${range.max.toFixed(1)}/day`
}

export function orderConfirmCopy(label: string, rangeText: string | null): ConfirmCopy {
  return {
    title: `Order: ${label}`,
    lines: [
      'Moving to new orders — no yield today; the changeover costs one full ' +
        'day before this crew produces again.',
      ...(rangeText ? [`Once working, projected yield: ${rangeText}.`] : []),
    ],
    confirmLabel: 'Issue order',
  }
}
