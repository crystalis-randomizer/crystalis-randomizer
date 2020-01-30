// Assembler and linker for 6502 asm code.

import {Operator, Value} from './value.js';

export interface SourceInfo {
  file: string;
  line: number;
  column?: number;
  content?: string;
}

export abstract class AbstractNode<T extends readonly AbstractNode<any, any>[],
                                   D> {
  abstract tag: string;
  readonly data: D;
  constructor(readonly children: T, data?: D) { this.data = data!; }
  sourceInfo?: SourceInfo;
  // bank?  store in address?
  address?: number; // initially not filled
  // TODO - does clone need to copy this?
  clone(): this { return this.constructor(this.children, this.data); }
}

export type Node = AbstractNode<any, any>;

type List<T> = readonly T[];
type TupleRO<A, B> = readonly [A] | readonly [A, B];
// type TupleRRO<A, B, C> = readonly [A, B] | readonly [A, B, C];

abstract class AbstractListNode<T extends AbstractNode<any, any>, D>
    extends AbstractNode<List<T>, D> {}

abstract class AbstractNode1<T extends AbstractNode<any, any>>
    extends AbstractNode<readonly [T], undefined> {}

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
abstract class AbstractLeafNode<D> extends AbstractNode<readonly [], D> {}

export type BodyChild = Label | Code | Block | Directive<any>;
export class SourceFile extends AbstractNode1<Body> {
  get tag() { return 'SourceFile'; }
  get body(): Body { return this.children[0]; }
  static parse(code: string, name: string): SourceFile {
    throw new Error('');
  }
}

export class Body extends AbstractListNode<BodyChild, undefined> {
  get tag() { return 'Body'; }
}

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

type BlockChild = Code | Label | Directive<any>;
export class Block extends AbstractListNode<BlockChild, undefined> {
  get tag() { return 'Block'; }
}

export class Label extends AbstractLeafNode<string> {
  get tag() { return 'Label'; }
  get label(): string { return this.data; }
}

export class Code
extends AbstractNode<readonly [Identifier, ...Expr<any>[]], undefined> {
  get tag() { return 'Code'; }
}

export abstract class Directive<T extends readonly AbstractNode<any, any>[]>
    extends AbstractNode<T, undefined> {}

export class Define extends Directive<TupleRO<Identifier, Expr<any>>> {
  get tag() { return 'Define'; }
  get ident() { return this.children[0]; }
  get expr() { return this.children[1]; }
}

abstract class AbstractCondition<E extends Expr<any>>
extends Directive<readonly [E, Body, Body]> {
  get cond() { return this.children[0]; }
  get body() { return this.children[1]; }
  get alt() { return this.children[2]; }
}

export class Macro extends Directive<readonly [Identifier, Body]> {
  get tag() { return 'Macro'; }
  get ident(): Identifier { return this.children[0]; }
  get body(): Body { return this.children[1]; }
}
export class Scope extends Directive<readonly [Body]> {
  get tag() { return 'Scope'; }
  get body() { return this.children[0]; }
}

export class If extends AbstractCondition<Expr<any>> {
  get tag() { return 'If'; }
}
export class Ifdef extends AbstractCondition<Identifier> {
  get tag() { return 'Ifdef'; }
}
export class Ifndef extends AbstractCondition<Identifier> {
  get tag() { return 'Ifndef'; }
}

abstract class AbstractUnaryDirective extends Directive<readonly [Expr<any>]> {}

export class Org extends AbstractUnaryDirective {
  get tag() { return 'Org'; }
}
export class Assert extends AbstractUnaryDirective {
  get tag() { return 'Assert'; }
}
export class Byte extends AbstractUnaryDirective {
  get tag() { return 'Byte'; }
}
export class Word extends AbstractUnaryDirective {
  get tag() { return 'Word'; }
}
export class Res extends AbstractUnaryDirective {
  get tag() { return 'Res'; }
}
export class Local extends AbstractUnaryDirective {
  get tag() { return 'Local'; }
}
export class ErrorDirective extends AbstractUnaryDirective {
  get tag() { return 'Error'; }
}

abstract class AbstractNullaryDirective extends Directive<readonly []> {}

export class Reloc extends AbstractNullaryDirective {
  get tag() { return 'Reloc'; }
}

export class Proc extends Directive<readonly [Identifier, Body]> {
  get tag() { return 'Proc'; }
  get ident() { return this.children[0]; }
  get body() { return this.children[1]; }
}

export abstract class Expr<D> extends AbstractListNode<Expr<any>, D> {}
abstract class LiteralExpr<D> extends Expr<D> {}

export class ValueLiteral extends LiteralExpr<Value> {
  get tag() { return 'Value'; }
  get value() { return this.data; }
}

export class Identifier extends LiteralExpr<string> {
  get tag() { return 'Identifier'; }
  get text() { return this.data; }
}

export class Parenthesis extends Expr<undefined> {
  get tag() { return 'Parenthesis'; }
  get child() { return this.children[0]; }
}

export class Brace extends Expr<undefined> {
  get tag() { return 'Brace'; }
  get child() { return this.children[0]; }
}

// +, -, *, /, <<, >>, >>>, &, |, ^, <, <=, >, >=, ==, !=
// TODO - consider : for bankaddress as a binop?
export class BinOp extends Expr<Operator> {
  get tag() { return 'BinOp'; }
  get left(): Expr<any> { return this.children[0]; }
  get right(): Expr<any> { return this.children[1]; }
  get op(): Operator { return this.data; }
}

export class Comma extends Expr<undefined> {
  get tag() { return 'Comma'; }
}

// <, >, ^, #, !, ~
export class PrefixOp extends Expr<string> {
  get tag() { return 'PrefixOp'; }
  get arg(): Expr<any> { return this.children[0]; }
  get op(): string { return this.data; }
}
