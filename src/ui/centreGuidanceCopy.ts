// src/ui/centreGuidanceCopy.ts
// Every word the centre-screen decision card shows. Authored here, never in
// the component — the same split objectiveCopy.ts and coachMarkCopy.ts
// already use (02-runtime-consolidation.md "Campaign status": "UI wording is
// authored outside the engine query").
//
// Plain language per ISO 24495-1:2023: the reader's need first, short
// sentences, everyday words. Each card says what is possible, what it buys,
// and offers one verb.
//
// Two wording rules are load-bearing rather than stylistic:
//
// 1. The primary label must not collide with any other button in the app.
//    e2e/helpers.ts's clickButton matches ALL buttons app-wide by raw
//    textContent with an `nth` index, so a duplicate label silently clicks
//    the wrong control. `Pledge {name}` and `Send them to work` are chosen
//    to match no existing locator; the field name deliberately stays in the
//    BODY text, since a "Red Wall Pan" button here would break
//    reachFirstCrew and the four specs that run through it.
// 2. No line may repeat a phrase an e2e `text=` locator resolves strictly —
//    `one crew`, `no yield today`, `Recommended:`, `Crews`, `Loyalty`,
//    `Pledges` are all spoken elsewhere on screen at the same moment.

import type { LivePrompt } from './centreGuidance'

export interface PromptCopy {
  /** One short headline — what is possible right now. */
  title: string
  /** One or two lines: what it costs, what it buys. */
  lines: string[]
  /** The verb. See rule 1 above before changing it. */
  primaryLabel: string
}

/** The decline verb, shared by every prompt: one phrase to learn, not one
 * per card. Dismisses that prompt until guidance is re-enabled. */
export const DEFER_LABEL = 'Not yet'

export function promptCopy(prompt: LivePrompt): PromptCopy {
  switch (prompt.kind) {
    case 'pledge':
      return {
        title: 'Pledge them and you gain a crew',
        lines: [
          `The Fremen of ${prompt.name} are ready to swear to you. ` +
            'A pledge puts a crew of their own people under your orders.',
          'Nothing else on Arrakis brings spice in.',
        ],
        primaryLabel: `Pledge ${prompt.name}`,
      }
    case 'first-harvest':
      return {
        title: 'Your crew has no orders',
        lines: [
          `${prompt.fieldName} is the nearest sand they can work. ` +
            'They lose a day walking to it, then the spice starts arriving.',
        ],
        primaryLabel: 'Send them to work',
      }
  }
}
