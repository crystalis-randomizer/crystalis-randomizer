import { describe, it, expect } from 'bun:test';
import { FlagSet } from '../src/js/flagset';

describe('FlagSet', () => {
  it('should produce a Config', () => {
    const flags = new FlagSet('Wm');
    expect(flags.config).toMatchObject({maps: {dungeonMaps: true}});
  });
  it('should invalidate the Config when options change', () => {
    const flags = new FlagSet('Wm');
    expect(flags.config.maps.dungeonMaps).toBe(true);
    flags.set('Wm', false);
    expect(flags.config.maps.dungeonMaps).toBe(false);
  });

  // TODO - more tests!

});
