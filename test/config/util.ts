import { afterEach } from 'mocha';
import { expect } from 'chai';

let toVerify: ExpectErrors[] = [];

export class ExpectErrors {
  expected: (string|RegExp)[];
  constructor(...expected: (string|RegExp)[]) {
    this.expected = expected;
    toVerify.push(this);
  }
  report(msg: string) {
    const e = this.expected.shift();
    if (!e) {
      expect.fail(`Unexpected error reported: ${msg}`);
    } else if (e instanceof RegExp) {
      expect(msg).to.match(e, 'Expected error message to match pattern');
    } else {
      expect(msg).to.equal(e, 'Expected error message text');
    }
  }
  verify() {
    expect(this.expected).to.eql([], 'Missing some expected errors');
    this.expected = [];
  }
  static install() {
    afterEach(function() {
      const vs = toVerify;
      toVerify = [];
      for (const v of vs) {
        v.verify();
      }
    });
  }
}
