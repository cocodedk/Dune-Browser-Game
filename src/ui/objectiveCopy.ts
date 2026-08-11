// src/ui/objectiveCopy.ts
// Player-facing wording for the opening's seven-step objective chain.
// game-engine/acts/openingObjectives.ts owns the IDs and completion state;
// this module owns every word the player reads about them — 02-runtime-
// consolidation.md "Campaign status": "UI wording is authored outside the
// engine query." Plain, direct copy per 03-opening-experience.md's Teaching
// sequence beats — NOT dialogue content (W3c/d/e author character speech;
// the `why` text below is a stand-in until that content exists).

import type { ObjectiveId } from '../game-engine/acts/openingObjectives'

export interface ObjectiveCopy {
  /** One verb-first sentence (03 "Objective presentation"). */
  title: string
  /** At most two short clarifying lines. */
  substeps?: [string] | [string, string]
  /** Stand-in for the "latest character-authored explanation" the Why
   *  expander shows once W3c-e's dialogue exists to author it for real. */
  why: string
}

export const OBJECTIVE_COPY: Record<ObjectiveId, ObjectiveCopy> = {
  'act1.receive_briefing': {
    title: 'Hear the Duke’s briefing',
    why: 'The Emperor’s tribute is due, and House Atreides needs Fremen ' +
      'crews to meet it. Duke Leto explains the demand before anything else.',
  },
  'act1.read_ledger': {
    title: 'Read the tribute ledger',
    why: 'Thufir keeps the numbers: what is owed, what is in stock, and ' +
      'what a crew-less house can and cannot cover before the deadline.',
  },
  'act1.travel_red_wall': {
    title: 'Travel to Red Wall Sietch',
    substeps: ['Reachable on foot from Arrakeen, by way of Hagg'],
    why: 'Meeting quota needs a working crew, and every crew starts with a ' +
      'sietch that trusts you enough to pledge one.',
  },
  'act1.earn_trust': {
    title: 'Earn Stilgar’s trust',
    substeps: ['Loyalty must reach 60 before a pledge is offered'],
    why: 'A pledge is a Fremen sietch putting its own people under your ' +
      'orders — it is not given for a stranger’s asking.',
  },
  'act1.order_first_harvest': {
    title: 'Put your first crew to work',
    substeps: ['Assign them to a known spice field'],
    why: 'A pledge alone earns nothing — spice only moves once a crew ' +
      'is actually working a field.',
  },
  'act1.prepare_q1': {
    title: 'Prepare to meet the first tribute',
    // 03 "Beat 5": "presents two valid plans rather than one forced
    // instruction" — reserve (keep the one crew working) and invest (a
    // second pledge at Tabr). Neither is scripted as correct; both are
    // legal through Q1 (03's opening-reserve-line/opening-invest-line
    // fixtures, WP03e).
    substeps: [
      'Reserve: keep the field worked, spend nothing further',
      'Invest: visit Sietch Tabr, build trust, and gain a second crew',
    ],
    why: 'Q1 is due on day 12. Falling short costs patience, not the run ' +
      '— but only if the ledger is watched before the deadline arrives.',
  },
  'opening.complete': {
    title: 'Opening complete',
    why: 'The first tribute is settled. Act 1 continues from here.',
  },
}

/** Friendly labels for the panel-key half of ObjectiveTargetHint. */
export const PANEL_LABELS: Record<string, string> = {
  'quota-ledger': 'Tribute Ledger',
  'crew-panel': 'Crew',
}
