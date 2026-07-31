// src/game-engine/faction/conflict.battle.test.ts
// Unit tests for resolveBattle and applyBattleResult in conflict.ts

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { FactionProfile, Region } from '../../types';
import { resolveBattle, applyBattleResult } from './conflict';
import type { TerritoryWorld } from '../territory/territory';

afterEach(() => vi.restoreAllMocks());

// ── Factories ────────────────────────────────────────────────────────────────

function makeFaction(
  id: FactionProfile['id'],
  troops: number,
  aggression: number,
  loyaltyFocus: number,
): FactionProfile {
  return {
    id,
    name: id,
    type: 'house',
    resources: { spice: 0, solaris: 0, troops, influence: 0 },
    strategy: { aggression, diplomacy: 50, expansion: 50, greed: 50, loyaltyFocus },
    relations: {},
    goals: [],
  };
}

function makeRegion(id: string, owner: Region['owner']): Region {
  return { id, name: id, owner, spice: 50, unrest: 0 };
}

type WorldFaction = TerritoryWorld['factions'][number];

function makeWorld(regions: Region[], factions: WorldFaction[]): TerritoryWorld {
  return { regions, factions };
}

// ── resolveBattle ─────────────────────────────────────────────────────────────

describe('resolveBattle — outcome determination', () => {
  // attacker: aggression=80, troops=100 → power=80
  // defender: loyaltyFocus=30, troops=100, NOT home → power=30
  // random=0 → factor=0.85, net = 80*0.85 - 30 = 38 > 5 → attacker_wins
  it('returns attacker_wins when net > 5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const atk = makeFaction('player', 100, 80, 50);
    const def = makeFaction('harkonnen', 100, 50, 30);
    const region = makeRegion('r1', null); // not defender's home
    const result = resolveBattle(atk, def, region, [atk, def]);
    expect(result.outcome).toBe('attacker_wins');
  });

  // attacker: aggression=30, troops=100 → power=30
  // defender: loyaltyFocus=80, troops=100, IS home → power=80*1.2=96
  // random=0 → factor=0.85, net = 30*0.85 - 96 = -70.5 < -5 → defender_wins
  it('returns defender_wins when net < -5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const atk = makeFaction('player', 100, 30, 50);
    const def = makeFaction('harkonnen', 100, 50, 80);
    const region = makeRegion('r1', 'harkonnen'); // defender's home
    const result = resolveBattle(atk, def, region, [atk, def]);
    expect(result.outcome).toBe('defender_wins');
  });

  // attacker: aggression=50, troops=100 → power=50
  // defender: loyaltyFocus=50, troops=100, NOT home → power=50
  // random=0.5 → factor=0.85+0.5*0.30=1.0, net = 50*1.0 - 50 = 0 → stalemate
  it('returns stalemate when net is within [-5, 5]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const atk = makeFaction('player', 100, 50, 50);
    const def = makeFaction('harkonnen', 100, 50, 50);
    const region = makeRegion('r1', null);
    const result = resolveBattle(atk, def, region, [atk, def]);
    expect(result.outcome).toBe('stalemate');
  });
});

describe('resolveBattle — loss calculation', () => {
  it('attacker_wins: attackerLosses=floor(troops*0.1), defenderLosses=floor(troops*0.25)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const atk = makeFaction('player', 100, 80, 50);
    const def = makeFaction('harkonnen', 100, 50, 30);
    const region = makeRegion('r1', null);
    const result = resolveBattle(atk, def, region, [atk, def]);
    expect(result.attackerLosses).toBe(Math.floor(100 * 0.1));  // 10
    expect(result.defenderLosses).toBe(Math.floor(100 * 0.25)); // 25
  });

  it('defender_wins: attackerLosses=floor(troops*0.25), defenderLosses=floor(troops*0.1)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const atk = makeFaction('player', 100, 30, 50);
    const def = makeFaction('harkonnen', 100, 50, 80);
    const region = makeRegion('r1', 'harkonnen');
    const result = resolveBattle(atk, def, region, [atk, def]);
    expect(result.attackerLosses).toBe(Math.floor(100 * 0.25)); // 25
    expect(result.defenderLosses).toBe(Math.floor(100 * 0.1));  // 10
  });

  it('stalemate: both losses = floor(troops * 0.15)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const atk = makeFaction('player', 100, 50, 50);
    const def = makeFaction('harkonnen', 100, 50, 50);
    const region = makeRegion('r1', null);
    const result = resolveBattle(atk, def, region, [atk, def]);
    expect(result.attackerLosses).toBe(Math.floor(100 * 0.15)); // 15
    expect(result.defenderLosses).toBe(Math.floor(100 * 0.15)); // 15
  });

  it('losses use floor(), not round()', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const atk = makeFaction('player', 37, 80, 50); // 37*0.1 = 3.7 → floor = 3
    const def = makeFaction('harkonnen', 37, 50, 30);
    const region = makeRegion('r1', null);
    const result = resolveBattle(atk, def, region, [atk, def]);
    expect(result.attackerLosses).toBe(3);
  });
});

describe('resolveBattle — returned BattleResult fields', () => {
  it('regionId, attacker, defender match input ids', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const atk = makeFaction('fremen', 100, 80, 50);
    const def = makeFaction('emperor', 100, 50, 30);
    const region = makeRegion('arrakeen', null);
    const result = resolveBattle(atk, def, region, [atk, def]);
    expect(result.regionId).toBe('arrakeen');
    expect(result.attacker).toBe('fremen');
    expect(result.defender).toBe('emperor');
  });
});

// ── applyBattleResult ─────────────────────────────────────────────────────────

describe('applyBattleResult', () => {
  const atk = makeFaction('player', 100, 80, 50);
  const def = makeFaction('harkonnen', 100, 50, 30);

  function makeTestWorld(): TerritoryWorld {
    return makeWorld(
      [makeRegion('r1', 'harkonnen')],
      [
        { id: 'player', relations: {}, resources: { troops: 100 } } as WorldFaction,
        { id: 'harkonnen', relations: {}, resources: { troops: 100 } } as WorldFaction,
      ],
    );
  }

  it('attacker_wins: region ownership transfers to attacker', () => {
    const world = makeTestWorld();
    const updated = applyBattleResult(
      { outcome: 'attacker_wins', attacker: 'player', defender: 'harkonnen', regionId: 'r1', attackerLosses: 10, defenderLosses: 25 },
      world, [atk, def],
    );
    expect(updated.regions[0].owner).toBe('player');
  });

  it('defender_wins: no territory change', () => {
    const world = makeTestWorld();
    const updated = applyBattleResult(
      { outcome: 'defender_wins', attacker: 'player', defender: 'harkonnen', regionId: 'r1', attackerLosses: 25, defenderLosses: 10 },
      world, [atk, def],
    );
    expect(updated.regions[0].owner).toBe('harkonnen');
  });

  it('stalemate: no territory change', () => {
    const world = makeTestWorld();
    const updated = applyBattleResult(
      { outcome: 'stalemate', attacker: 'player', defender: 'harkonnen', regionId: 'r1', attackerLosses: 15, defenderLosses: 15 },
      world, [atk, def],
    );
    expect(updated.regions[0].owner).toBe('harkonnen');
  });

  it('troop losses are applied to both factions', () => {
    const world = makeTestWorld();
    const updated = applyBattleResult(
      { outcome: 'defender_wins', attacker: 'player', defender: 'harkonnen', regionId: 'r1', attackerLosses: 25, defenderLosses: 10 },
      world, [atk, def],
    );
    const atkFaction = updated.factions.find(f => f.id === 'player') as typeof updated.factions[0] & { resources: { troops: number } };
    const defFaction = updated.factions.find(f => f.id === 'harkonnen') as typeof updated.factions[0] & { resources: { troops: number } };
    expect(atkFaction.resources.troops).toBe(75);
    expect(defFaction.resources.troops).toBe(90);
  });

  it('is immutable — original world not mutated', () => {
    const world = makeTestWorld();
    const originalOwner = world.regions[0].owner;
    applyBattleResult(
      { outcome: 'attacker_wins', attacker: 'player', defender: 'harkonnen', regionId: 'r1', attackerLosses: 10, defenderLosses: 25 },
      world, [atk, def],
    );
    expect(world.regions[0].owner).toBe(originalOwner);
  });
});
