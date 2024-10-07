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




// TODO - next step is to start migrating passes to accept Config instead of FlagSet.
//   - while we're at it, we might as well also move them into the pass/ folder, etc.
