// src/game-engine/territory/territory.test.ts
// Unit tests for territory control system

import { describe, it, expect } from 'vitest';
import type { Region } from '../../types';
import {
  captureRegion,
  accumulateUnrest,
  produceSpice,
  processRegionDefection,
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
    { id: 'fremen', relations: {} },
  ],
});

describe('captureRegion', () => {
  it('changes region owner to newOwner', () => {
    const region = createRegion({ owner: null });
    const world = createWorld([region]);
    const { world: updated } = captureRegion('test-region', 'player', world);
    expect(updated.regions[0].owner).toBe('player');
  });

  it('increases unrest by 20', () => {
    const region = createRegion({ unrest: 30 });
    const world = createWorld([region]);
    const { world: updated } = captureRegion('test-region', 'player', world);
    expect(updated.regions[0].unrest).toBe(50);
  });

  it('caps unrest at 100', () => {
    const region = createRegion({ unrest: 85 });
    const world = createWorld([region]);
    const { world: updated } = captureRegion('test-region', 'player', world);
    expect(updated.regions[0].unrest).toBe(100);
  });

  it('returns event with correct type and fields', () => {
    const region = createRegion({ owner: 'harkonnen' });
    const world = createWorld([region]);
    const { event } = captureRegion('test-region', 'player', world);
    expect(event.type).toBe('region_captured');
    expect(event.regionId).toBe('test-region');
    if (event.type === 'region_captured') {
      expect(event.newOwner).toBe('player');
      expect(event.prevOwner).toBe('harkonnen');
    }
  });

  it('throws error if region not found', () => {
    const world = createWorld([]);
    expect(() => captureRegion('nonexistent', 'player', world)).toThrow(
      'Region not found: nonexistent'
    );
  });
});

describe('accumulateUnrest', () => {
  it('adds +2 base when owner != null', () => {
    const region = createRegion({ owner: 'player', unrest: 10 });
    const world = createWorld([region]);
    const result = accumulateUnrest(region, world);
    expect(result.unrest).toBe(12);
  });

  it('adds +3 when owner at war with >2 factions', () => {
    const region = createRegion({ owner: 'player', unrest: 10 });
    const world: TerritoryWorld = {
      regions: [region],
      factions: [
        {
          id: 'player',
          relations: {
            f1: { trust: 0, trade: false, war: true },
            f2: { trust: 0, trade: false, war: true },
            f3: { trust: 0, trade: false, war: true },
          },
        },
      ],
    };
    const result = accumulateUnrest(region, world);
    expect(result.unrest).toBe(15); // +2 base + 3 extra = +5
  });

  it('adds +2 when spice > 70', () => {
    const region = createRegion({ owner: null, spice: 75, unrest: 10 });
    const world = createWorld([region]);
    const result = accumulateUnrest(region, world);
    expect(result.unrest).toBe(12);
  });

  it('subtracts -2 when owner has trade relation', () => {
    const region = createRegion({ owner: 'player', unrest: 10 });
    const world: TerritoryWorld = {
      regions: [region],
      factions: [
        {
          id: 'player',
          relations: {
            ally: { trust: 50, trade: true, war: false },
          },
        },
      ],
    };
    const result = accumulateUnrest(region, world);
    expect(result.unrest).toBe(10); // +2 base - 2 trade = 0 delta
  });

  it('clamps result to [0, 100]', () => {
    const region = createRegion({ owner: null, spice: 75, unrest: 99 });
    const world = createWorld([region]);
    const result = accumulateUnrest(region, world);
    expect(result.unrest).toBe(100);
  });

  it('does not go below 0', () => {
    const region = createRegion({ owner: null, spice: 50, unrest: 1 });
    const world = createWorld([region]);
    const result = accumulateUnrest(region, world);
    expect(result.unrest).toBeGreaterThanOrEqual(0);
  });
});

describe('produceSpice', () => {
  it('returns 0 when unrest >= 80', () => {
    expect(produceSpice(createRegion({ spice: 100, unrest: 80 }))).toBe(0);
    expect(produceSpice(createRegion({ spice: 100, unrest: 90 }))).toBe(0);
  });

  it('uses formula spice * (1 - unrest/100) * 0.1', () => {
    const r = createRegion({ spice: 100, unrest: 50 });
    expect(produceSpice(r)).toBe(100 * (1 - 50 / 100) * 0.1);
  });

  it('produces correct yield with various unrest values', () => {
    expect(produceSpice(createRegion({ spice: 50, unrest: 0 }))).toBe(5);
    expect(produceSpice(createRegion({ spice: 100, unrest: 79 }))).toBe(
      100 * (1 - 79 / 100) * 0.1
    );
  });
});

describe('processRegionDefection', () => {
  it('no-op when unrest < 100', () => {
    const region = createRegion({ owner: 'player', unrest: 99 });
    const world = createWorld([region]);
    const { event } = processRegionDefection(region, world);
    expect(event).toBeNull();
  });

  it('owner becomes null when unrest >= 100', () => {
    const region = createRegion({ owner: 'player', unrest: 100 });
    const world = createWorld([region]);
    const { world: updated } = processRegionDefection(region, world);
    expect(updated.regions[0].owner).toBeNull();
  });

  it('unrest resets to 50 after defection', () => {
    const region = createRegion({ owner: 'player', unrest: 100 });
    const world = createWorld([region]);
    const { world: updated } = processRegionDefection(region, world);
    expect(updated.regions[0].unrest).toBe(50);
  });

  it('event has correct type and fields when defection occurs', () => {
    const region = createRegion({ owner: 'harkonnen', unrest: 100 });
    const world = createWorld([region]);
    const { event } = processRegionDefection(region, world);
    expect(event?.type).toBe('region_defected');
    if (event?.type === 'region_defected') {
      expect(event.regionId).toBe('test-region');
      expect(event.fromOwner).toBe('harkonnen');
    }
  });

  it('no-op when region owner is null', () => {
    const region = createRegion({ owner: null, unrest: 100 });
    const world = createWorld([region]);
    const { event } = processRegionDefection(region, world);
    expect(event).toBeNull();
  });
});
