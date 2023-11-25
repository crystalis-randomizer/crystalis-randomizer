import { describe, it } from 'mocha';
import { expect } from 'chai';
import { Analysis, Mutation, Value } from '../../src/js/config/analysis';
import { Config, IConfig } from '../../src/js/config/config';
import { ExpectErrors } from './util';

const { SHUFFLE, RANDOM } = Config.Randomization;

ExpectErrors.install();

interface AnalyzeResult {
  mutations: Record<string, Mutation>;
  warnings?: Record<string, string>;
}

function analyze(config: IConfig|string): AnalyzeResult {
  let stringInput = false;
  if (typeof config === 'string') {
    stringInput = true;
    config = {mystery: [config]};
  }
  const analysis = Analysis.from(config);
  const mutations: Record<string, Mutation> = {};
  const warnings: Record<string, string> = {};

  for (const [path, source, mut] of analysis.mutations) {
    const sourceStr = String(source);
    const key = stringInput ? path : `${path}${sourceStr ? ':' + sourceStr : ''}`;
    mutations[key] = mut;
  }
  for (const [source, ws] of analysis.warnings) {
    warnings[String(source)] = [...ws].join(';');
  }
  const out: AnalyzeResult = {mutations};
  if (Object.keys(warnings).length) out.warnings = warnings;
  return out;
}

function fixed(val: unknown): Value {
  return {type: 'fixed', val};
}
function pick(...vals: [number, unknown][]): Value {
  return {type: 'pick', vals};
}
const complex = {type: 'complex'} as const;
const hidden = {type: 'hidden'} as const;
const all = {type: 'all'} as const;
const [] = [hidden, all];

describe('Analyzer', function() {

  it('should analyze a non-assignment', function() {
    expect(analyze('1')).to.eql({mutations: {}});
  });

  it('should ignore local variable assignments', function() {
    expect(analyze('x = 42')).to.eql({mutations: {}});
  });

  it('should ignore local variable property assignments', function() {
    expect(analyze('x.y = 42')).to.eql({mutations: {}});
  });

  it('should warn on invalid config property assignments', function() {
    expect(analyze('placement.y = 42')).to.eql({
      mutations: {},
      warnings: {'(placement.y = 42)@0': 'unknown field y on placement'},
    });
  });

  it('should recognize definite config property assignments', function() {
    expect(analyze('placement.random_armors = true')).to.eql({
      mutations: {
        'placement.randomArmors': {
          op: '=',
          value: fixed(true),
        },
      },
    });
  });

  it('should recognize definite op-equals config property assignments', function() {
    expect(analyze('items.charge_speed += 1')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          op: '+=',
          value: fixed(1),
        },
      },
    });
  });

  it('should recognize preset append', function() {
    expect(analyze('presets += ["foo"]')).to.eql({
      mutations: {
        'presets': {
          op: '+=',
          value: fixed(['foo']),
        },
      },
      warnings: {
        '(presets += ["foo"])@0': 'unknown preset: foo',
      }
    });
  });

  it('should recognize definite config assignment to unknown', function() {
    expect(analyze('items.charge_speed = x')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          op: '=',
          value: complex,
        },
      },
    });
  });

  it('should recognize known-probability assignment', function() {
    expect(analyze('items.charge_speed = rand() < 0.4 ? 3 : 4')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          op: '=',
          value: pick([0.4, 3], [0.6, 4]),
        },
      },
    });
  });

  it('should treat conditional assignment as complex', function() {
    expect(analyze('rand() < 0.4 && (items.charge_speed = 3)')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          op: '=',
          value: complex,
        },
      },
    });
  });

  it('should recognize definite assignment to pick()', function() {
    expect(analyze('placement.mimics = pick()')).to.eql({
      mutations: {
        'placement.mimics': {
          op: '=',
          value: all,
        },
      },
    });
  });

  it('should recognize definite assignment to hybrid()', function() {
    expect(analyze('placement.mimics = hybrid(rand(), "shuffle", 0.3, "random")')).to.eql({
      mutations: {
        'placement.mimics': {
          op: '=',
          value: pick([0.3, SHUFFLE], [0.7, RANDOM]),
        },
      },
    });
  });

  it('should recognize assignment to map', function() {
    expect(analyze('placement.force = {}')).to.eql({
      mutations: {
        'placement.force': {
          op: '=',
          value: complex,
        },
      },
    });
  });

  it('should treat conditional assignment to map as complex', function() {
    expect(analyze('rand() < 0.4 ? placement.force = {} : null')).to.eql({
      mutations: {
        'placement.force': {
          op: '=',
          value: complex,
        },
      },
    });
  });

  it('should recognize assignment into definite map value', function() {
    // NOTE: This is still sorted by base and counts as a "complex" mutation

    // TODO - remove lhs from mutation???  is it needed anymore?
    //      --> it's useful for passing to pick(), but that's about it...?

    expect(analyze('placement.force.leafElder = "Sword of Wind"')).to.eql({
      mutations: {
        'placement.force': {
          op: '=',
          value: complex,
        },
      },
    });
  });

  it('does simple math on rhs', function() {
    expect(analyze('items.charge_speed = 1 + 2')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          op: '=',
          value: fixed(3),
        },
      },
    });
  });
});
