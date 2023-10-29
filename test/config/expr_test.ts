import { describe, it } from 'mocha';
import { expect } from 'chai';
import { Analyzer, Evaluator, LValue } from '../../src/js/config/expr';
import { parse } from '../../src/js/config/jsep';
import { Config, configInfo } from '../../src/js/config/config';

interface DebugLValue {
  terms: readonly (string|number)[];
  base?: DebugLValue;
  info?: string;
}
interface DebugMutation {
  lhs: DebugLValue;
  op: string;
  value: unknown;
  random: number;
}
interface AnalyzeResult {
  mutations: Record<string, DebugMutation>;
  warnings?: string[];
}

function analyze(expr: string): AnalyzeResult {
  const analyzer = new Analyzer(configInfo);
  analyzer.analyze(parse(expr));
  const mutations: Record<string, DebugMutation> = {};
  for (const [k, m] of analyzer.mutations) {
    mutations[k] = {...m, lhs: debug(m.lhs)};
  }
  const out: AnalyzeResult = {mutations};
  if (analyzer.warnings.length) out.warnings = analyzer.warnings;
  return out;
  function debug(l: LValue): DebugLValue {
    const out: DebugLValue = {terms: l.terms};
    if (l.info) out.info = l.info.fullName;
    if (l.base) out.base = debug(l.base);
    return out;
  }
}

describe('Analyzer', function() {

  it('should analyze a non-assignment', function() {
    expect(analyze('1')).to.eql({mutations: {}});
  });

  it('should ignore local variable assignments', function() {
    expect(analyze('x = 42')).to.eql({mutations: {}});
  });

  it('should recognize definite config property assignments', function() {
    expect(analyze('placement.random_armors = true')).to.eql({
      mutations: {
        'placement.randomArmors': {
          lhs: {
            terms: ['placement', 'randomArmors'],
            info: 'Config.Placement.randomArmors',
          },
          op: '=',
          value: true,
          random: 1,
        },
      },
    });
  });

  it('should recognize definite op-equals config property assignments', function() {
    expect(analyze('items.charge_speed += 1')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          lhs: {
            terms: ['items', 'chargeSpeed'],
            info: 'Config.Items.chargeSpeed',
          },
          op: '+=',
          value: 1,
          random: 1,
        },
      },
    });
  });

  it('should recognize preset append', function() {
    expect(analyze('presets += "foo"')).to.eql({
      mutations: {
        'presets': {
          lhs: {
            terms: ['presets'],
            info: 'Config.presets',
          },
          op: '+=',
          value: 'foo',
          random: 1,
        },
      },
    });
  });

  it('should recognize definite config assignment to unknown', function() {
    expect(analyze('items.charge_speed = x')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          lhs: {
            terms: ['items', 'chargeSpeed'],
            info: 'Config.Items.chargeSpeed',
          },
          op: '=',
          value: NaN,
          random: 1,
        },
      },
    });
  });

  it('should recognize known-probability assignment using &&', function() {
    expect(analyze('rand() < 0.4 && (items.charge_speed = 3)')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          lhs: {
            terms: ['items', 'chargeSpeed'],
            info: 'Config.Items.chargeSpeed',
          },
          op: '=',
          value: 3,
          random: 0.4,
        },
      },
    });
  });

  it('should recognize known-probability assignment using ||', function() {
    expect(analyze('rand() < 0.4 || (items.charge_speed = 3)')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          lhs: {
            terms: ['items', 'chargeSpeed'],
            info: 'Config.Items.chargeSpeed',
          },
          op: '=',
          value: 3,
          random: 0.6,
        },
      },
    });
  });

  it('should recognize unknown-probability assignment', function() {
    expect(analyze('x && (items.charge_speed = 3)')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          lhs: {
            terms: ['items', 'chargeSpeed'],
            info: 'Config.Items.chargeSpeed',
          },
          op: '=',
          value: 3,
          random: NaN,
        },
      },
    });
  });

  it('should recognize definite assignment to pick()', function() {
    expect(analyze('placement.minics = pick()')).to.eql({
      mutations: {
        'placement.mimics': {
          lhs: {
            terms: ['placement', 'mimics'],
            info: 'Config.Placement.mimics',
          },
          op: '=',
          value: NaN, // FIXME
          random: 1,
        },
      },
    });
  });
});

describe('Evaluator', function() {

  it('should evaluate an expression', function() {
    const evaluator = new Evaluator(Config.create(), configInfo);
    const result = evaluator.evaluate(parse('42'));
    expect(result).to.equal(42);
  });

});
