// src/game-engine/faction/conflict.power.test.ts
// Unit tests for getFactionPower in conflict.ts

import { describe, it, expect } from 'vitest';
import type { FactionProfile } from '../../types';
import { getFactionPower } from './conflict';
import type { BattleContext } from './conflict';

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
    strategy: {
      aggression,
      diplomacy: 50,
      expansion: 50,
      greed: 50,
      loyaltyFocus,
    },
    relations: {},
    goals: [],
  };
}

function makeAttackCtx(regionId = 'region-1'): BattleContext {
  return { regionId, isHomeTerritory: false, alliedSupport: [] };
}

function makeDefendCtx(isHome: boolean, allies: FactionProfile['id'][] = []): BattleContext {
  return { regionId: 'region-1', isHomeTerritory: isHome, alliedSupport: allies };
}

// ── getFactionPower — attacker ────────────────────────────────────────────────

describe('getFactionPower — attacker role', () => {
  it('base power = troops × (aggression / 100)', () => {
    const faction = makeFaction('harkonnen', 100, 80, 50);
    const ctx = makeAttackCtx();
    expect(getFactionPower(faction, ctx, 'attacker', [faction])).toBe(80);
  });

  it('uses aggression axis (not loyaltyFocus) for attacker', () => {
    const faction = makeFaction('harkonnen', 100, 60, 90);
    const ctx = makeAttackCtx();
    // power = 100 × 0.60 = 60, NOT 90
    expect(getFactionPower(faction, ctx, 'attacker', [faction])).toBe(60);
  });

  it('isHomeTerritory=true does NOT apply a bonus for attacker', () => {
    const faction = makeFaction('harkonnen', 100, 80, 50);
    // Attackers never get home bonus — context.isHomeTerritory is ignored for them
    const ctx: BattleContext = { regionId: 'region-1', isHomeTerritory: true, alliedSupport: [] };
    expect(getFactionPower(faction, ctx, 'attacker', [faction])).toBe(80);
  });

  it('allied support adds ally.troops × 0.1 per ally', () => {
    const faction = makeFaction('player', 100, 80, 50);
    const ally = makeFaction('fremen', 200, 50, 50);
    const ctx: BattleContext = { regionId: 'region-1', isHomeTerritory: false, alliedSupport: ['fremen'] };
    // base = 100 × 0.80 = 80, ally adds 200 × 0.1 = 20 → total 100
    expect(getFactionPower(faction, ctx, 'attacker', [faction, ally])).toBe(100);
  });

  it('unknown ally id is silently ignored', () => {
    const faction = makeFaction('player', 100, 80, 50);
    const ctx: BattleContext = { regionId: 'region-1', isHomeTerritory: false, alliedSupport: ['neutral'] };
    expect(getFactionPower(faction, ctx, 'attacker', [faction])).toBe(80);
  });

  it('multiple allies all contribute', () => {
    const faction = makeFaction('player', 100, 80, 50);
    const ally1 = makeFaction('fremen', 100, 50, 50);
    const ally2 = makeFaction('atreides', 100, 50, 50);
    const ctx: BattleContext = {
      regionId: 'region-1',
      isHomeTerritory: false,
      alliedSupport: ['fremen', 'atreides'],
    };
    // base = 80, + 10 + 10 = 100
    expect(getFactionPower(faction, ctx, 'attacker', [faction, ally1, ally2])).toBe(100);
  });
});

// ── getFactionPower — defender ────────────────────────────────────────────────

describe('getFactionPower — defender role', () => {
  it('base power = troops × (loyaltyFocus / 100)', () => {
    const faction = makeFaction('harkonnen', 100, 80, 50);
    const ctx = makeDefendCtx(false);
    expect(getFactionPower(faction, ctx, 'defender', [faction])).toBe(50);
  });

  it('uses loyaltyFocus axis (not aggression) for defender', () => {
    const faction = makeFaction('harkonnen', 100, 90, 40);
    const ctx = makeDefendCtx(false);
    // power = 100 × 0.40 = 40, NOT 90
    expect(getFactionPower(faction, ctx, 'defender', [faction])).toBe(40);
  });

  it('isHomeTerritory=true applies ×1.2 bonus for defender', () => {
    const faction = makeFaction('harkonnen', 100, 80, 50);
    const ctx = makeDefendCtx(true);
    // 50 × 1.2 = 60
    expect(getFactionPower(faction, ctx, 'defender', [faction])).toBe(60);
  });

  it('isHomeTerritory=false gives no bonus for defender', () => {
    const faction = makeFaction('harkonnen', 100, 80, 50);
    const ctxHome = makeDefendCtx(true);
    const ctxAway = makeDefendCtx(false);
    const powerHome = getFactionPower(faction, ctxHome, 'defender', [faction]);
    const powerAway = getFactionPower(faction, ctxAway, 'defender', [faction]);
    expect(powerHome).toBeGreaterThan(powerAway);
    expect(powerHome / powerAway).toBeCloseTo(1.2);
  });

  it('defender allied support adds ally.troops × 0.1', () => {
    const faction = makeFaction('player', 100, 80, 50);
    const ally = makeFaction('fremen', 200, 50, 50);
    const ctx = makeDefendCtx(false, ['fremen']);
    // base = 50, ally = 200 × 0.1 = 20 → 70
    expect(getFactionPower(faction, ctx, 'defender', [faction, ally])).toBe(70);
  });

  it('home bonus and allied support stack correctly', () => {
    const faction = makeFaction('player', 100, 80, 50);
    const ally = makeFaction('fremen', 200, 50, 50);
    const ctx = makeDefendCtx(true, ['fremen']);
    // base = 50 × 1.2 = 60, ally = 200 × 0.1 = 20 → 80
    expect(getFactionPower(faction, ctx, 'defender', [faction, ally])).toBe(80);
  });

  it('zero troops results in zero base power', () => {
    const faction = makeFaction('player', 0, 80, 100);
    const ctx = makeDefendCtx(false);
    expect(getFactionPower(faction, ctx, 'defender', [faction])).toBe(0);
  });
});

