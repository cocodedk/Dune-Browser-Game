// src/game-engine/faction/reputation.decay.test.ts
// Unit tests for decayReputation, getReputationStanding, getReputationSummary

import { describe, it, expect } from 'vitest';
import type { FactionProfile } from '../../types';
import {
  decayReputation,
  getReputationStanding,
  getReputationSummary,
} from './reputation';
import type { ReputationWorld } from './reputation';

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

function makeFactionNoRelation(id: FactionProfile['id']): FactionProfile {
  return {
    id,
    name: id,
    type: 'house',
    resources: { spice: 0, solaris: 0, troops: 0, influence: 0 },
    strategy: { aggression: 50, diplomacy: 50, expansion: 50, greed: 50, loyaltyFocus: 50 },
    relations: {},
    goals: [],
  };
}

function playerTrust(world: ReputationWorld, id: FactionProfile['id']): number {
  return world.factions.find(f => f.id === id)!.relations['player']!.trust;
}

// ─── decayReputation ─────────────────────────────────────────────────────────

describe('decayReputation: trust dead zone [-20, 20]', () => {
  it('trust=20 stays at 20 (dead zone boundary)', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', 20)] };
    expect(playerTrust(decayReputation(world), 'fremen')).toBe(20);
  });

  it('trust=-20 stays at -20 (dead zone boundary)', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', -20)] };
    expect(playerTrust(decayReputation(world), 'fremen')).toBe(-20);
  });

  it('trust=0 stays at 0', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', 0)] };
    expect(playerTrust(decayReputation(world), 'fremen')).toBe(0);
  });
});

describe('decayReputation: positive trust above dead zone', () => {
  it('trust=21 decays by 1 to 20', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', 21)] };
    expect(playerTrust(decayReputation(world), 'fremen')).toBe(20);
  });
  it('trust=75 decays by 1 to 74 (boundary is strict >75)', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', 75)] };
    expect(playerTrust(decayReputation(world), 'fremen')).toBe(74);
  });
  it('trust=76 decays by 0.5 to 75.5', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', 76)] };
    expect(playerTrust(decayReputation(world), 'fremen')).toBe(75.5);
  });
  it('trust=100 decays by 0.5 to 99.5', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', 100)] };
    expect(playerTrust(decayReputation(world), 'fremen')).toBe(99.5);
  });
});

describe('decayReputation: negative trust below dead zone', () => {
  it('trust=-21 decays by 1 to -20', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', -21)] };
    expect(playerTrust(decayReputation(world), 'fremen')).toBe(-20);
  });
  it('trust=-75 decays by 1 to -74 (boundary is strict < -75)', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', -75)] };
    expect(playerTrust(decayReputation(world), 'fremen')).toBe(-74);
  });
  it('trust=-76 decays by 0.5 to -75.5', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', -76)] };
    expect(playerTrust(decayReputation(world), 'fremen')).toBe(-75.5);
  });
  it('trust=-100 decays by 0.5 to -99.5', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', -100)] };
    expect(playerTrust(decayReputation(world), 'fremen')).toBe(-99.5);
  });
});

describe('decayReputation: faction without player relation', () => {
  it('faction with no player relation is returned unchanged', () => {
    const faction = makeFactionNoRelation('harkonnen');
    const world: ReputationWorld = { factions: [faction] };
    const result = decayReputation(world);
    expect(result.factions[0].relations['player']).toBeUndefined();
  });
});

// ─── getReputationStanding ───────────────────────────────────────────────────

describe('getReputationStanding', () => {
  it('trust = 76 → revered (trust > 75)', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', 76)] };
    expect(getReputationStanding('fremen', world)).toBe('revered');
  });

  it('trust = 75 → trusted (not revered; boundary is strict)', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', 75)] };
    expect(getReputationStanding('fremen', world)).toBe('trusted');
  });

  it('trust = 40 → trusted', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', 40)] };
    expect(getReputationStanding('fremen', world)).toBe('trusted');
  });

  it('trust = 39 → neutral', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', 39)] };
    expect(getReputationStanding('fremen', world)).toBe('neutral');
  });

  it('trust = -20 → neutral', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', -20)] };
    expect(getReputationStanding('fremen', world)).toBe('neutral');
  });

  it('trust = -21 → suspicious', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', -21)] };
    expect(getReputationStanding('fremen', world)).toBe('suspicious');
  });

  it('trust = -50 → suspicious', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', -50)] };
    expect(getReputationStanding('fremen', world)).toBe('suspicious');
  });

  it('trust = -51 → hostile', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', -51)] };
    expect(getReputationStanding('fremen', world)).toBe('hostile');
  });

  it('faction with no player relation defaults to trust=0 → neutral', () => {
    const world: ReputationWorld = { factions: [makeFactionNoRelation('harkonnen')] };
    expect(getReputationStanding('harkonnen', world)).toBe('neutral');
  });
});

// ─── getReputationSummary ────────────────────────────────────────────────────

describe('getReputationSummary', () => {
  it('returns one entry per faction', () => {
    const world: ReputationWorld = {
      factions: [makeFaction('fremen', 80), makeFaction('harkonnen', -60)],
    };
    const summary = getReputationSummary(world);
    expect(summary.factions).toHaveLength(2);
  });

  it('entry.standing matches getReputationStanding', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', 80)] };
    const summary = getReputationSummary(world);
    expect(summary.factions[0].standing).toBe(getReputationStanding('fremen', world));
  });

  it('entry.trust and entry.fear match relation values', () => {
    const world: ReputationWorld = { factions: [makeFaction('atreides', 45, 20)] };
    const entry = getReputationSummary(world).factions[0];
    expect(entry.trust).toBe(45);
    expect(entry.fear).toBe(20);
    expect(entry.factionId).toBe('atreides');
  });

  it('entry for faction without player relation has trust=0 and fear=0', () => {
    const world: ReputationWorld = { factions: [makeFactionNoRelation('emperor')] };
    const entry = getReputationSummary(world).factions[0];
    expect(entry.trust).toBe(0);
    expect(entry.fear).toBe(0);
    expect(entry.standing).toBe('neutral');
  });
});
