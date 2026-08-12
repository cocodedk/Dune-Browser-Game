import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chooseDialogue, startDialogue } from './DialogueSystem';
import { world, setWorld, createInitialState } from './GameState';
import { STORY_TREE_ID } from '../data/dialogue';
import type { FactionProfile, WorldState } from '../types';

function makeFaction(id: FactionProfile['id'], trust = 0, fear = 0): FactionProfile {
  return {
    id,
    name: id,
    type: 'house',
    resources: { spice: 0, solaris: 0, troops: 0, influence: 0 },
    strategy: { aggression: 50, diplomacy: 50, expansion: 50, greed: 50, loyaltyFocus: 50 },
    relations: { player: { trust, fear, trade: false, war: false } },
    goals: [],
  };
}

function freshState(): WorldState {
  const state = createInitialState();
  state.factionProfiles = [
    makeFaction('fremen'),
    makeFaction('harkonnen'),
    makeFaction('atreides'),
    makeFaction('smugglers'),
    makeFaction('emperor'),
  ];
  return state;
}

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

// "DialogueSystem: reputation dispatch" describe block removed in WP02e
// (legacy-authority-inventory.md category 1's `DialogueSystem.ts:97-101`
// WP01-audit-residue row, cross-referenced from category 6): applyEffect no
// longer reads effect.reputationAction or writes world.factionProfiles —
// see DialogueSystem.ts's applyEffect header comment. The authored
// reputationAction data (offer_help, demand_spice, hk_trade,
// swear_protection, ...) stays in src/data/ untouched; it is simply no
// longer read by anything, like every other authored dialogue effect that
// duplicated a retired system before WP01/WP02.

describe('DialogueSystem: ritual effect', () => {
  beforeEach(() => {
    setWorld(freshState());
  });

  it('raises player.prescience and sets ritual.count on a successful ritual', () => {
    // Fresh state is act1 with prescience 0 — checkGrant's Awareness branch
    // grants unconditionally there, so "Do it." should succeed outright.
    startDialogue(STORY_TREE_ID, world.villages[0].id, 'sova_ritual_root');
    chooseDialogue('sova_r1');

    expect(world.player.prescience).toBe(1);
    expect(world.flags['ritual.count']).toBe(1);
  });

  it('leaves ritual.count unchanged when a repeat ritual is refused', () => {
    startDialogue(STORY_TREE_ID, world.villages[0].id, 'sova_ritual_root');
    chooseDialogue('sova_r1'); // grants Awareness: prescience 0 -> 1

    // Still act1: the next grant would be Farspeech, which checkGrant
    // refuses with 'wrong-act' until act2+ regardless of charisma. A
    // refusal must not also spend one of the three ritual uses.
    startDialogue(STORY_TREE_ID, world.villages[0].id, 'sova_ritual_root');
    chooseDialogue('sova_r1');

    expect(world.player.prescience).toBe(1);
    expect(world.flags['ritual.count']).toBe(1);
  });
});