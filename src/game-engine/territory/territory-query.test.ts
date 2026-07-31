// src/game-engine/territory/territory-query.test.ts
// Unit tests for territory query functions

import { describe, it, expect } from 'vitest';
import type { Region } from '../../types';
import {
  getFactionRegions,
  type TerritoryWorld,
} from './territory';

const createRegion = (overrides?: Partial<Region>): Region => ({
  id: 'test-region',
  name: 'Test Region',
  owner: null,
  spice: 50,
  unrest: 0,
  ...overrides,
});

const createWorld = (regions: Region[] = []): TerritoryWorld => ({
  regions,
  factions: [
    { id: 'player', relations: {} },
    { id: 'harkonnen', relations: {} },
  ],
});

describe('getFactionRegions', () => {
  it('returns only regions owned by the given faction', () => {
    const regions = [
      createRegion({ id: 'r1', owner: 'player' }),
      createRegion({ id: 'r2', owner: 'harkonnen' }),
      createRegion({ id: 'r3', owner: 'player' }),
      createRegion({ id: 'r4', owner: null }),
    ];
    const world = createWorld(regions);
    const playerRegions = getFactionRegions('player', world);
    expect(playerRegions).toHaveLength(2);
    expect(playerRegions[0].id).toBe('r1');
    expect(playerRegions[1].id).toBe('r3');
  });

  it('returns empty array when faction owns no regions', () => {
    const regions = [
      createRegion({ id: 'r1', owner: 'harkonnen' }),
      createRegion({ id: 'r2', owner: 'harkonnen' }),
    ];
    const world = createWorld(regions);
    const playerRegions = getFactionRegions('player', world);
    expect(playerRegions).toHaveLength(0);
  });

  it('ignores unowned (null owner) regions', () => {
    const regions = [
      createRegion({ id: 'r1', owner: null }),
      createRegion({ id: 'r2', owner: 'player' }),
      createRegion({ id: 'r3', owner: null }),
    ];
    const world = createWorld(regions);
    const playerRegions = getFactionRegions('player', world);
    expect(playerRegions).toHaveLength(1);
    expect(playerRegions[0].id).toBe('r2');
  });
});
