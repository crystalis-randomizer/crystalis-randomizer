import { describe, it } from 'mocha';
import { expect } from 'chai';
import { Analyzer, Evaluator } from '../../src/js/config/expr';
import { parse } from '../../src/js/config/jsep';
import { CheckName, Config, configInfo } from '../../src/js/config/config';
import { ExpectErrors } from './util';
import { IRandom } from '../../src/js/config/functions';
import { LValue, Pick } from '../../src/js/config/lvalue';

ExpectErrors.install();

interface DebugLValue {
  terms: readonly (string|number)[];
  base?: DebugLValue;
  info?: string;
}
interface DebugMutation {
  lhs: DebugLValue;
  op: string;
  values?: Pick|'all';
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

function evaluator(config = {}, ...randomValues: number[]): Evaluator & {root: Config} {
  return new Evaluator(configInfo.coerce(config) as Config,
                       configInfo,
                       random(...randomValues)) as any;
}

function random(...values: number[]): IRandom {
  return {
    next() {
      const result = values.shift();
      if (result != undefined) return result;
      throw new Error(`unexpected call to random.next`);
    },
  };
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
          values: [[1, true]],
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
          values: [[1, 1]],
        },
      },
    });
  });

  it('should recognize preset append', function() {
    expect(analyze('presets += ["foo"]')).to.eql({
      mutations: {
        'presets': {
          lhs: {
            terms: ['presets'],
            info: 'Config.presets',
          },
          op: '+=',
          values: [[1, ['foo']]],
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
          values: undefined,
        },
      },
    });
  });

  it('should recognize known-probability assignment', function() {
    expect(analyze('items.charge_speed = rand() < 0.4 ? 3 : 4')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          lhs: {
            terms: ['items', 'chargeSpeed'],
            info: 'Config.Items.chargeSpeed',
          },
          op: '=',
          values: [[0.4, 3], [0.6, 4]],
        },
      },
    });
  });

  it('should recognize unknown-probability assignment', function() {
    expect(analyze('rand() < 0.4 && (items.charge_speed = 3)')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          lhs: {
            terms: ['items', 'chargeSpeed'],
            info: 'Config.Items.chargeSpeed',
          },
          op: '=',
          values: undefined,
        },
      },
    });
  });

  it('should recognize definite assignment to pick()', function() {
    expect(analyze('placement.mimics = pick()')).to.eql({
      mutations: {
        'placement.mimics': {
          lhs: {
            terms: ['placement', 'mimics'],
            info: 'Config.Placement.mimics',
          },
          op: '=',
          values: 'all',
        },
      },
    });
  });

  it('should recognize definite assignment to hybrid()', function() {
    expect(analyze('placement.mimics = hybrid(rand(), "shuffle", 0.3, "random")')).to.eql({
      mutations: {
        'placement.mimics': {
          lhs: {
            terms: ['placement', 'mimics'],
            info: 'Config.Placement.mimics',
          },
          op: '=',
          values: [[0.3, 'SHUFFLE'], [0.7, 'RANDOM']],
        },
      },
    });
  });

  it('should recognize assignment to map', function() {
    expect(analyze('placement.force = {}')).to.eql({
      mutations: {
        'placement.force': {
          lhs: {
            terms: ['placement', 'force'],
            info: 'Config.Placement.force',
          },
          op: '=',
          values: [[1, {}]],
        },
      },
    });
  });

  it('should recognize conditional assignment to map', function() {
    expect(analyze('rand() < 0.4 ? placement.force = {} : null')).to.eql({
      mutations: {
        'placement.force': {
          lhs: {
            terms: ['placement', 'force'],
            info: 'Config.Placement.force',
          },
          op: '=',
          values: undefined,
        },
      },
    });
  });

  it('should recognize assignment into definite map value', function() {
    expect(analyze('placement.force.leafElder = "Sword of Wind"')).to.eql({
      mutations: {
        'placement.force': {
          lhs: {
            terms: ['placement', 'force', CheckName.LEAF_ELDER],
            base: {
              terms: ['placement', 'force'],
              info: 'Config.Placement.force',
            },
            info: 'Config.Placement.force',
          },
          op: '=',
          values: [[1, 'SWORD_OF_WIND']],
        },
      },
    });
  });

  it('should not try to do any math on rhs', function() {
    expect(analyze('items.charge_speed = 1 + 2')).to.eql({
      mutations: {
        'items.chargeSpeed': {
          lhs: {
            terms: ['items', 'chargeSpeed'],
            info: 'Config.Items.chargeSpeed',
          },
          op: '=',
          values: undefined,
        },
      },
    });
  });
});

describe('Evaluator', function() {

  it('should evaluate a literal', function() {
    const e = evaluator();
    const result = e.evaluate(parse('42'), new ExpectErrors());
    expect(result).to.equal(42);
  });

  it('should evaluate an assignment to a local', function() {
    const e = evaluator();
    const result = e.evaluate(parse('x = 42'), new ExpectErrors());
    expect(result).to.equal(42);
    expect([...e.vars]).to.eql([['x', 42]]);
  });

  it('should error when evaluating an assignment into an undefined local object', function() {
    const e = evaluator();
    expect(e.evaluate(parse('x.y = 42'),
                      new ExpectErrors(/variable undefined: x/,
                                       /cannot assign to.*undefined/)))
        .to.equal(undefined);
    expect([...e.vars]).to.eql([]);
  });

  it('should evaluate an undefined identifier', function() {
    const e = evaluator();
    const result = e.evaluate(parse('x'), new ExpectErrors(/variable undefined: x/));
    expect(result).to.equal(undefined);
  });

  it('should assign to config field', function() {
    const e = evaluator();
    const result = e.evaluate(parse('placement.mimics = "shuffle"'), new ExpectErrors());
    expect(e.root.placement!.mimics).to.equal('SHUFFLE');
    expect(result).to.equal('SHUFFLE');
  });

  it('should append preset', function() {
    const e = evaluator({presets: ['bar']});
    const result = e.evaluate(parse('presets += ["foo"]'),
                                      new ExpectErrors());
    expect(e.root.presets).to.eql(['bar', 'foo']);
    expect(result).to.eql(['bar', 'foo']);
  });

  it('should append preset to empty initial', function() {
    const e = evaluator();
    const result = e.evaluate(parse('presets += ["foo", "baz"]'),
                                      new ExpectErrors());
    expect(e.root.presets).to.eql(['foo', 'baz']);
    expect(result).to.eql(['foo', 'baz']);
  });

  it('should modify-assign to config field', function() {
    const e = evaluator({items: {chargeSpeed: 4}});
    const result = e.evaluate(parse('items.chargeSpeed += 2'),
                                      new ExpectErrors());
    expect(e.root.items!.chargeSpeed).to.equal(6);
    expect(result).to.equal(6);
  });

  it('should clamp assignments to config field', function() {
    const e = evaluator();
    const result = e.evaluate(parse('items.chargeSpeed = 10'),
                                      new ExpectErrors());
    expect(e.root.items!.chargeSpeed).to.equal(9);
    expect(result).to.equal(9);
  });

  it('should assign to full dictionary', function() {
    const e = evaluator();
    const result = e.evaluate(parse(`
        placement.force = {leafElder: 'sword of fire',
                           oakMother: 'alarm flute'}`),
                                      new ExpectErrors());
    expect(e.root.placement!.force).to.eql({
      [CheckName.LEAF_ELDER]: 'SWORD_OF_FIRE',
      [CheckName.OAK_MOTHER]: 'ALARM_FLUTE',
    });
    expect(result).to.eql(e.root.placement!.force);
  });

  it('should assign into dictionary', function() {
    const e = evaluator({
      placement: {force: {leafElder: 'sword of water'}},
    });
    const result = e.evaluate(parse(
        `placement.force.oak_mother = 'sword of wind'`),
                                      new ExpectErrors());
    expect(e.root.placement!.force).to.eql({
      [CheckName.LEAF_ELDER]: 'SWORD_OF_WATER',
      [CheckName.OAK_MOTHER]: 'SWORD_OF_WIND',
    });
    expect(result).to.eql('SWORD_OF_WIND');
  });

  it('should overwrite dictionary element', function() {
    const e = evaluator({
      placement: {force: {oakMother: 'sword of water'}},
    });
    const result = e.evaluate(parse(
        `placement.force.oak_mother = 'sword of wind'`),
                                      new ExpectErrors());
    expect(e.root.placement!.force).to.eql({
      [CheckName.OAK_MOTHER]: 'SWORD_OF_WIND',
    });
    expect(result).to.eql('SWORD_OF_WIND');
  });

  it('should assign into empty dictionary', function() {
    const e = evaluator();
    const result = e.evaluate(parse(
        `placement.force.oak_mother = 'sword of wind'`),
                                      new ExpectErrors());
    expect(e.root.placement!.force).to.eql({
      [CheckName.OAK_MOTHER]: 'SWORD_OF_WIND',
    });
    expect(result).to.eql('SWORD_OF_WIND');
  });

  // note: we don't strictly need it to be this way; we could instead
  // opt to allow this, though it would make analysis a little harder
  it('should refuse to assign a message field', function() {
    const e = evaluator({items: {chargeSpeed: 4}});
    const orig = e.root.items;
    const result = e.evaluate(parse(`items = {chargeWhileWalkingSpeed: 3}`),
                              new ExpectErrors(/cannot assign to a message field/));
    expect(e.root.items!.chargeSpeed).to.equal(4);
    expect(e.root.items!.chargeWhileWalkingSpeed).to.equal(null);
    expect(e.root.items).to.equal(orig);
    expect(result).to.equal(undefined);
  });

  // it('should overwrite a message field', function() {
  //   const e = evaluator({items: {chargeSpeed: 4}});
  //   const result = e.evaluate(parse(`items = {chargeWhileWalkingSpeed: 3}`),
  //                             new ExpectErrors());
  //   expect(e.root.items!.chargeSpeed).to.equal(null);
  //   expect(e.root.items!.chargeWhileWalkingSpeed).to.equal(3);
  //   expect(e.root.items).to.be.instanceof(Config.Items.ctor);
  //   expect(result).to.equal(e.root.items);
  // });

  it('should evaluate the numeric function', function() {
    const e = evaluator();
    expect(e.evaluate(parse(`round(3.2)`), new ExpectErrors())).to.equal(3);
    expect(e.evaluate(parse(`round(3.8)`), new ExpectErrors())).to.equal(4);
    expect(e.evaluate(parse(`ceil(3.2)`), new ExpectErrors())).to.equal(4);
    expect(e.evaluate(parse(`floor(3.8)`), new ExpectErrors())).to.equal(3);
    expect(e.evaluate(parse(`abs(-3.8)`), new ExpectErrors())).to.equal(3.8);
  });

  it('should evaluate rand()', function() {
    const e = evaluator({}, 0.4, 0.8);
    expect(e.evaluate(parse(`rand()`), new ExpectErrors())).to.equal(0.4);
    expect(e.evaluate(parse(`rand()`), new ExpectErrors())).to.equal(0.8);
  });

  // TODO - mockable rand()

});
