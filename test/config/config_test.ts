import { describe, test, expect } from 'bun:test';
import { Config, ConfigGenerator } from '../../src/js/config';
import { ScriptEvaluator } from '../../src/js/config/script';
import { Random } from '../../src/js/random';

// TODO - expand these tests.

describe('ConfigGenerator#generate', () => {
  test('should generate a config', () => {
    const config = new ConfigGenerator().generate(new ScriptEvaluator(new Random(0)));
    expect(config.placement.algorithm).toBeNumber();
  });
  test('should propagate elements', () => {
    const gen = new ConfigGenerator();
    gen.placement = new Config.PlacementGenerator();
    gen.placement.algorithm = Config.Placement.Algorithm.ASSUMED_FILL;
    const config = gen.generate(new ScriptEvaluator(new Random(0)));
    expect(config.placement.algorithm).toBe(Config.Placement.Algorithm.ASSUMED_FILL);
  });
  test('should turn enum names into numbers', () => {
    const gen = Config.descriptor.fromJson(
      {placement: {algorithm: 'assumed fill'}});
    const config = gen.generate(new ScriptEvaluator(new Random(0)));
    expect(config.placement.algorithm).toBe(Config.Placement.Algorithm.ASSUMED_FILL);
  });
  test('should evaluate an expression', () => {
    const gen = Config.descriptor.fromJson(
      {placement: {check_beta: '= 1 + 2'}});
    const config = gen.generate(new ScriptEvaluator(new Random(0)));
    expect(config.placement.checkBeta).toBe(3);
  });
  test('should produce all possible values on `=?`', () => {
    const algorithms = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const gen = Config.descriptor.fromJson(
        {placement: {algorithm: '=?'}});
      const config = gen.generate(new ScriptEvaluator(new Random(i)));
      algorithms.add(config.placement.algorithm);
    }
    expect(algorithms.size).toBe(Config.Placement.Algorithm.descriptor.values.length);
  });

  // TODO - more tests!

});
