import * as jsep from 'jsep';
import jsepAssignment from '@jsep-plugin/assignment';
import jsepObject from '@jsep-plugin/object';

jsep.plugins.register(jsepAssignment, jsepObject);

export const parse = jsep as unknown as (expr: String) => Expression;

// type DeepReadonly<T> =
//     T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepReadonly<U>> :
//     T extends object ? {+readonly [K in keyof T]: DeepReadonly<T[K]>} : T;
// type Expr = DeepReadonly<jsep.Expression>;

interface MemberExpression {
  readonly type: 'MemberExpression';
  readonly computed: boolean;
  readonly object: Expression;
  readonly property: Expression;
}
interface Identifier {
  readonly type: 'Identifier';
  readonly name: string;
}
interface CallExpression {
  readonly type: 'CallExpression';
  readonly callee: Expression;
  readonly arguments: Expression[];
}
interface Literal {
  readonly type: 'Literal';
  readonly value: unknown;
}
interface ArrayExpression {
  readonly type: 'ArrayExpression';
  readonly elements: Expression[];
}
interface ObjectExpression {
  readonly type: 'ObjectExpression';
  readonly properties: readonly {
    readonly type: 'Property',
    readonly computed: boolean,
    readonly shorthand: boolean,
    readonly key: Expression,
    readonly value: Expression,
  }[];
}
interface UnaryExpression {
  readonly type: 'UnaryExpression';
  readonly prefix: boolean;
  readonly operator: string;
  readonly argument: Expression;
}
interface BinaryExpression {
  readonly type: 'BinaryExpression';
  readonly operator: string;
  readonly left: Expression;
  readonly right: Expression;
}
interface ConditionalExpression {
  readonly type: 'ConditionalExpression';
  readonly test: Expression;
  readonly consequent: Expression;
  readonly alternate: Expression;
}
interface AssignmentExpression {
  readonly type: 'AssignmentExpression';
  readonly operator: string;
  readonly left: Expression;
  readonly right: Expression;
}

export type Expression =
    MemberExpression|Identifier|CallExpression|Literal|
    ArrayExpression|ObjectExpression|UnaryExpression|
    BinaryExpression|ConditionalExpression|AssignmentExpression;
