import { describe, it } from 'mocha';
import { expect } from 'chai';
import { Evaluator } from '../../src/js/config/expr';
import { parse } from '../../src/js/config/jsep';
import { CheckName, Config, ItemName, configInfo } from '../../src/js/config/config';
import { ExpectErrors } from './util';
import { IRandom } from '../../src/js/config/functions';

const { SHUFFLE } = Config.Randomization;

ExpectErrors.install();

function evaluator(config = {}, ...randomValues: number[]): Evaluator & {root: Config} {
  return new Evaluator(configInfo.coerce(config) as Config,
                       configInfo,
                       random(...randomValues)) as any;
}

function random(...values: number[]): IRandom {
  // TODO - randomN for expecting normal?
  return {
    next() {
      const result = values.shift();
      if (result != undefined) return result;
      throw new Error(`unexpected call to random.next`);
    },
    nextNormal() {
      throw new Error(`unexpected call to random.nextNormal`);
    },
  };
}

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
    expect(e.root.placement!.mimics).to.equal(SHUFFLE);
    expect(result).to.equal(SHUFFLE);
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
      [CheckName.LEAF_ELDER]: ItemName.SWORD_OF_FIRE,
      [CheckName.OAK_MOTHER]: ItemName.ALARM_FLUTE,
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
      [CheckName.LEAF_ELDER]: ItemName.SWORD_OF_WATER,
      [CheckName.OAK_MOTHER]: ItemName.SWORD_OF_WIND,
    });
    expect(result).to.eql(ItemName.SWORD_OF_WIND);
  });

  it('should overwrite dictionary element', function() {
    const e = evaluator({
      placement: {force: {oakMother: 'sword of water'}},
    });
    const result = e.evaluate(parse(
        `placement.force.oak_mother = 'sword of wind'`),
                                      new ExpectErrors());
    expect(e.root.placement!.force).to.eql({
      [CheckName.OAK_MOTHER]: ItemName.SWORD_OF_WIND,
    });
    expect(result).to.eql(ItemName.SWORD_OF_WIND);
  });

  it('should assign into empty dictionary', function() {
    const e = evaluator();
    const result = e.evaluate(parse(
        `placement.force.oak_mother = 'sword of wind'`),
                                      new ExpectErrors());
    expect(e.root.placement!.force).to.eql({
      [CheckName.OAK_MOTHER]: ItemName.SWORD_OF_WIND,
    });
    expect(result).to.eql(ItemName.SWORD_OF_WIND);
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

  it('should evaluate numeric functions', function() {
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

  // TODO - test hybrid() and pick()
});
