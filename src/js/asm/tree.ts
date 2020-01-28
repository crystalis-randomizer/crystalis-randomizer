// Assembler and linker for 6502 asm code.

import {Operator, Value} from './value.js';

export interface SourceInfo {
  file: string;
  line: number;
  column?: number;
  content?: string;
}

export abstract class AbstractNode<T extends readonly AbstractNode<any>[]> {
  constructor(readonly children: T) {}
  sourceInfo?: SourceInfo;
}

type List<T> = readonly T[];
type TupleRO<A, B> = readonly [A] | readonly [A, B];
// type TupleRRO<A, B, C> = readonly [A, B] | readonly [A, B, C];

class AbstractListNode<T extends AbstractNode<any>>
extends AbstractNode<List<T>> {
  constructor(children: readonly T[]) { super(children); }
}
class AbstractNode1<T extends AbstractNode<any>>
extends AbstractNode<readonly [T]> {
  constructor(arg1: T) { super([arg1]); }
}
// class AbstractNode2<T extends AbstractNode<any>,
//                     U extends AbstractNode<any>>
//     extends AbstractNode<readonly [T, U]> {
//   constructor(arg1: T, arg2: U) { super([arg1, arg2]); }
// }
// class AbstractNode3<T extends AbstractNode<any>,
//                     U extends AbstractNode<any>,
//                     V extends AbstractNode<any>>
//     extends AbstractNode<readonly [T, U, V]> {
//   constructor(arg1: T, arg2: U, arg3: V) { super([arg1, arg2, arg3]); }
// }
class AbstractLeafNode extends AbstractNode<readonly []> {
  constructor() { super([]); }
}

type BodyChild = Label | Code | Block | Directive<any>;
export class SourceFile extends AbstractNode1<Body> {
  static parse(code: string, name: string): SourceFile {
    throw new Error('');
  }
}

export class Body extends AbstractListNode<BodyChild> {}

// TODO - .proc ?
// .reloc
// .proc Foo
//   lda SomeAddr
//   bne Done
//   sta SomeOtherAddr
// Done:
//   rts
// .endproc

// What happens when we put a .org or .reloc inside a .proc??  -> Fail?
// 

type BlockChild = Code | Data | Label | Directive<any>;
export class Block extends AbstractListNode<BlockChild> {

}

export class Label extends AbstractLeafNode {
  constructor(readonly label: string) { super(); }
}

export class Code extends AbstractNode<readonly [Identifier, ...Expr[]]> {
  // bank?  store in address?
  address?: number; // initially not filled
}

export class Data extends AbstractListNode<Expr> {

}

export class Directive<T extends readonly AbstractNode<any>[]>
    extends AbstractNode<T> {}

export class Define extends Directive<TupleRO<Identifier, Expr>> {
  constructor(ident: Identifier, expr?: Expr) {
    super(expr ? [ident, expr] : [ident]);
  }
}

class AbstractCondition<E extends Expr>
extends Directive<readonly [E, Body, Body]> {
  constructor(cond: E, body: Body, alt: Body) { super([cond, body, alt]); }
}

export class If extends AbstractCondition<Expr> {}
export class Ifdef extends AbstractCondition<Identifier> {}
export class Ifndef extends AbstractCondition<Identifier> {}

class AbstractUnaryDirective extends Directive<readonly [Expr]> {
  constructor(arg: Expr) { super([arg]); }
}

export class Org extends AbstractUnaryDirective {}
export class Assert extends AbstractUnaryDirective {}
export class Byte extends AbstractUnaryDirective {}
export class Word extends AbstractUnaryDirective {}
export class Res extends AbstractUnaryDirective {}
export class ErrorDirective extends AbstractUnaryDirective {}

class AbstractNullaryDirective extends Directive<readonly []> {
  constructor() { super([]) }
}
export class Reloc extends AbstractNullaryDirective {}

export class Proc extends Directive<readonly [Identifier, Body]> {
  constructor(ident: Identifier, body: Body) { super([ident, body]); }
}

export abstract class Expr extends AbstractListNode<Expr> {}
abstract class LiteralExpr extends Expr { constructor() { super([]); } }

export class ValueLiteral extends LiteralExpr {
  constructor(readonly value: Value) { super(); }
}

export class Identifier extends LiteralExpr {
  constructor(readonly text: string) { super(); }
}

export class Parenthesis extends Expr {
  constructor(readonly child: Expr) { super([child]); }
}

export class Brace extends Expr {
  constructor(readonly child: Expr) { super([child]); }
}

// +, -, *, /, <<, >>, >>>, &, |, ^, <, <=, >, >=, ==, !=
// TODO - consider : for bankaddress as a binop?
export class BinOp extends Expr {
  constructor(readonly op: Operator,
              readonly left: Expr,
              readonly right: Expr) {
    super([left, right]);
  }
}

export class Comma extends Expr {
  constructor(children: readonly Expr[]) { super(children); }
}

// <, >, ^, #, !, ~
export class PrefixOp extends Expr {
  constructor(readonly op: string, readonly arg: Expr) { super([arg]); }
}
