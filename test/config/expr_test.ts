import { describe, it } from 'mocha';
import { expect } from 'chai';
import { Analyzer, Evaluator, Mutation } from '../../src/js/config/expr';
import { parse } from '../../src/js/config/jsep';
import { Config, configInfo } from '../../src/js/config/config';

function analyze(expr: string): [string[], Map<string, Mutation>] {
  const analyzer = new Analyzer(/*configInfo*/ null!);
  analyzer.analyze(parse(expr));
  return [analyzer.warnings, analyzer.mutations];
}

describe('Analyzer', function() {

  it('should analyze a non-assignment', function() {
    const [warnings, mutations] = analyze('1');
    expect(warnings).to.eql([]);
    expect([...mutations]).to.eql([]);
  });

});

describe('Evaluator', function() {

  it('should evaluate an expression', function() {
    const evaluator = new Evaluator(Config.create(), configInfo);
    const result = evaluator.evaluate(parse('42'));
    expect(result).to.equal(42);
  });

});
