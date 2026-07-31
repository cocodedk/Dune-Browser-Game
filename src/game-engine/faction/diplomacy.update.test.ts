// src/game-engine/faction/diplomacy.update.test.ts
// Unit tests for updateRelations (all 3 event types)

import { describe, it, expect } from 'vitest';
import type { FactionId, FactionProfile, Relation } from '../../types';
import { updateRelations } from './diplomacy';

function makeRelation(overrides: Partial<Relation> = {}): Relation {
  return { trust: 0, fear: 0, trade: false, war: false, ...overrides };
}

function makeFaction(id: FactionId, relations: Record<string, Relation> = {}): FactionProfile {
  return {
    id, name: id, type: 'house',
    resources: { spice: 0, solaris: 0, troops: 0, influence: 0 },
    strategy: { aggression: 0, diplomacy: 0, expansion: 0, greed: 0, loyaltyFocus: 0 },
    relations,
    goals: [],
  };
}

describe('updateRelations — tribute_refused', () => {
  it('returns shallow copy of all factions unchanged', () => {
    const factions = [
      makeFaction('player', { harkonnen: makeRelation({ trust: 20 }) }),
      makeFaction('harkonnen'),
      makeFaction('fremen'),
    ];
    const result = updateRelations({ type: 'tribute_refused', actor: 'player', target: 'harkonnen' }, factions);
    expect(result).toHaveLength(3);
    expect(result[0].relations['harkonnen']?.trust).toBe(20);
    expect(result[0]).not.toBe(factions[0]); // shallow copy
  });
});

describe('updateRelations — alliance_broken', () => {
  it('bystanders with relation to actor get trust-5 toward actor', () => {
    const factions = [
      makeFaction('player'),
      makeFaction('harkonnen'),
      makeFaction('fremen', { player: makeRelation({ trust: 30 }) }),
      makeFaction('neutral', { player: makeRelation({ trust: 10 }) }),
    ];
    const result = updateRelations({ type: 'alliance_broken', actor: 'player', target: 'harkonnen' }, factions);
    const fremen = result.find(f => f.id === 'fremen')!;
    const neutral = result.find(f => f.id === 'neutral')!;
    expect(fremen.relations['player']?.trust).toBe(25);
    expect(neutral.relations['player']?.trust).toBe(5);
  });

  it('bystanders without relation to actor are returned unchanged', () => {
    const factions = [
      makeFaction('player'),
      makeFaction('harkonnen'),
      makeFaction('fremen'), // no relation to actor
    ];
    const result = updateRelations({ type: 'alliance_broken', actor: 'player', target: 'harkonnen' }, factions);
    const fremen = result.find(f => f.id === 'fremen')!;
    expect(fremen.relations['player']).toBeUndefined();
  });

  it('actor and target factions returned unchanged (shallow copy)', () => {
    const factions = [
      makeFaction('player', { harkonnen: makeRelation({ trust: 50 }) }),
      makeFaction('harkonnen', { player: makeRelation({ trust: 40 }) }),
    ];
    const result = updateRelations({ type: 'alliance_broken', actor: 'player', target: 'harkonnen' }, factions);
    const actor = result.find(f => f.id === 'player')!;
    const target = result.find(f => f.id === 'harkonnen')!;
    expect(actor.relations['harkonnen']?.trust).toBe(50);
    expect(target.relations['player']?.trust).toBe(40);
  });
});

describe('updateRelations — war_declared', () => {
  it('bystanders with trust>20 toward target lose trust-15 toward actor', () => {
    const factions = [
      makeFaction('player'),
      makeFaction('harkonnen'),
      makeFaction('fremen', {
        harkonnen: makeRelation({ trust: 30 }), // trust>20 → affected
        player: makeRelation({ trust: 50 }),
      }),
    ];
    const result = updateRelations({ type: 'war_declared', actor: 'player', target: 'harkonnen' }, factions);
    const fremen = result.find(f => f.id === 'fremen')!;
    expect(fremen.relations['player']?.trust).toBe(35);
    expect(fremen.relations['harkonnen']?.trust).toBe(30); // target relation unchanged
  });

  it('bystanders with trust<=20 toward target are unchanged', () => {
    const factions = [
      makeFaction('player'),
      makeFaction('harkonnen'),
      makeFaction('fremen', {
        harkonnen: makeRelation({ trust: 20 }), // not > 20 → no effect
        player: makeRelation({ trust: 50 }),
      }),
    ];
    const result = updateRelations({ type: 'war_declared', actor: 'player', target: 'harkonnen' }, factions);
    const fremen = result.find(f => f.id === 'fremen')!;
    expect(fremen.relations['player']?.trust).toBe(50); // unchanged
  });

  it('actor and target factions returned unchanged (shallow copy)', () => {
    const factions = [
      makeFaction('player', { harkonnen: makeRelation({ trust: 10 }) }),
      makeFaction('harkonnen', { player: makeRelation({ trust: 15 }) }),
    ];
    const result = updateRelations({ type: 'war_declared', actor: 'player', target: 'harkonnen' }, factions);
    const actor = result.find(f => f.id === 'player')!;
    const target = result.find(f => f.id === 'harkonnen')!;
    expect(actor.relations['harkonnen']?.trust).toBe(10);
    expect(target.relations['player']?.trust).toBe(15);
    expect(actor).not.toBe(factions[0]);
    expect(target).not.toBe(factions[1]);
  });
});
