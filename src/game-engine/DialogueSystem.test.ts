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

describe('DialogueSystem: reputation dispatch', () => {
  beforeEach(() => {
    setWorld(freshState());
  });

  it('applies help_village reputation action on offer_help choice', () => {
    startDialogue('village_leader', world.villages[0].id);
    chooseDialogue('offer_help');

    const fremenAfter = world.factionProfiles.find(f => f.id === 'fremen')!;
    expect(fremenAfter.relations['player']!.trust).toBe(15);
  });

  it('applies attack_faction reputation action on demand_spice choice', () => {
    startDialogue('village_leader', world.villages[0].id);
    chooseDialogue('demand_spice');

    const fremenAfter = world.factionProfiles.find(f => f.id === 'fremen')!;
    expect(fremenAfter.relations['player']!.trust).toBe(-20);
    expect(fremenAfter.relations['player']!.fear).toBe(15);
  });

  it('applies trade_with_faction reputation action on hk_trade choice', () => {
    startDialogue('harkonnen_stronghold', world.villages[0].id);
    chooseDialogue('hk_trade');

    const hkAfter = world.factionProfiles.find(f => f.id === 'harkonnen')!;
    expect(hkAfter.relations['player']!.trust).toBe(8);
  });

  it('does not mutate factionProfiles when choice has no reputationAction', () => {
    startDialogue('village_leader', world.villages[0].id);
    const profilesBefore = JSON.stringify(world.factionProfiles);

    chooseDialogue('just_passing');

    expect(JSON.stringify(world.factionProfiles)).toBe(profilesBefore);
  });

  it('applies honor_agreement reputation action on swear_protection choice', () => {
    startDialogue('village_leader', world.villages[0].id);
    chooseDialogue('offer_help');    // help_village: fremen trust +15
    chooseDialogue('swear_protection'); // honor_agreement: partner(fremen) trust +13

    const fremenAfter = world.factionProfiles.find(f => f.id === 'fremen')!;
    expect(fremenAfter.relations['player']!.trust).toBe(28);
  });
});

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