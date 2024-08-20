import { describe, it, expect } from 'bun:test';
import { Config, ConfigGenerator } from '../../src/js/config';
import { ScriptEvaluator } from '../../src/js/config/script';
import { Random } from '../../src/js/random';

// TODO - expand these tests.

describe('ConfigGenerator#generate', () => {
  it('should generate a config', () => {
    const config = new ConfigGenerator().generate(new ScriptEvaluator(new Random(0)));
    expect(config.placement.algorithm).toBeNumber();
  });
  it('should propagate elements', () => {
    const gen = new ConfigGenerator();
    gen.placement = new Config.PlacementGenerator();
    gen.placement.algorithm = Config.Placement.Algorithm.ASSUMED_FILL;
    const config = gen.generate(new ScriptEvaluator(new Random(0)));
    expect(config.placement.algorithm).toBe(Config.Placement.Algorithm.ASSUMED_FILL);
  });
  it('should turn enum names into numbers', () => {
    const gen = Config.descriptor.fromJson(
      {placement: {algorithm: 'assumed fill'}});
    const config = gen.generate(new ScriptEvaluator(new Random(0)));
    expect(config.placement.algorithm).toBe(Config.Placement.Algorithm.ASSUMED_FILL);
  });
  it('should evaluate an expression', () => {
    const gen = Config.descriptor.fromJson(
      {placement: {check_beta: '= 1 + 2'}});
    const config = gen.generate(new ScriptEvaluator(new Random(0)));
    expect(config.placement.checkBeta).toBe(3);
  });
  it('should produce all possible values on `=?`', () => {
    const algorithms = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const gen = Config.descriptor.fromJson(
        {placement: {algorithm: '=?'}});
      const config = gen.generate(new ScriptEvaluator(new Random(i)));
      algorithms.add(config.placement.algorithm);
    }
    expect(algorithms.size).toBe(Config.Placement.Algorithm.descriptor.values.length);
  });

  it.only('options should not affect seed', () => {
    const json1 = {
      glitches: {
        statueGlitch: '=?',
        swordChargeGlitch: '=?',
      },
      fun: {
        communityJokes: '=?',
        paletteSwapBackgrounds: '=?',
      },
    };
    const json2 = {
      ...json1,
      options: {
        fun: {
          communityJokes: '=?',
          randomizeMusic: '=?',
        },
      },
    };

    for (let i = 0; i < 10; i++) {
      const r1 = new Random(i);
      const r2 = new Random(i);

      const gen1 = ConfigGenerator.fromJson(json1);
      const gen2 = ConfigGenerator.fromJson(json2);

      const config1 = gen1.generate(new ScriptEvaluator(r1));
      const config2 = gen2.generate(new ScriptEvaluator(r2));

      expect(config2.fun.randomizeMusic).toBe(config2.options.fun.randomizeMusic);
      // NOTE: config1 doesn't have options, so just copy over config2's before deep-comparing
      config1.options.fun.randomizeMusic = config1.fun.randomizeMusic = config2.fun.randomizeMusic;
      config1.options.fun.communityJokes = config2.options.fun.communityJokes;
      expect(config1).toEqual(config2);
      // assert r1 and r2 state are the same.
      const next1 = [r1.next(), r1.next(), r1.next()];
      const next2 = [r2.next(), r2.next(), r2.next()];
      expect(next2).toEqual(next1);
    }
  });

  // TODO - more tests!

});
