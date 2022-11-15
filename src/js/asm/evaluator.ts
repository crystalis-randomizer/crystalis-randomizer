import {Expr} from './expr';

interface Environment {
  pc(): number|undefined; // ??? - undef in a reloc context outside linker
}

export class Evaluator {

  constructor(readonly env: Environment) {}

  definedSymbol(name: string): boolean {
    throw new Error(`unimplemented`);
  }

  referencedSymbol(name: string): boolean {
    throw new Error(`unimplemented`);
  }

  evaluate(expr: Expr): number {
    throw new Error(`unimplemented`);
  }

  simplify(expr: Expr): Expr {
    const args = expr.args;
    if (!args) return expr;
    let nums: number[]|undefined = [];
    for (let i = 0; i < args.length; i++) {
      args[i] = this.simplify(args[i]);
      if (args[i].op === 'num' && nums) {
        nums[i] = args[i].num!;
      } else {
        nums = undefined;
      }
    }
    const f =
        this.functions.get(expr.op) ??
        (args.length === 1 ?
            this.prefix.get(expr.op) :
            this.infix.get(expr.op));
    if (!f || !nums) return {op: expr.op, args};
    const result = f(...nums);
    return {op: 'num', num: result};
  }

  private byteAt(addr: number): number {
    throw new Error(`not implemented`);
  }

  private readonly functions: Map<string, FuncType> = new Map([
    ['.min', Math.min],
    ['.max', Math.max],
    ['.byteat', (addr) => this.byteAt(addr)],
    ['.wordat', (addr) => this.byteAt(addr) | this.byteAt(addr + 1) << 8],
  ]);

  private readonly prefix: Map<string, (x: number) => number> = new Map([
    ['+', x => x],
    ['-', x => -x],
    ['~', x => ~x],
    ['!', x => Number(!x)],
    ['<', x => x & 0xff],
    ['>', x => x >> 8 & 0xff],
    // NOTE: .bankbytes not supported yet...
  ]);

  private readonly infix: Map<string, BinOp> = new Map([
    ['+', (a, b) => a + b],
    ['-', (a, b) => a - b],
    ['*', (a, b) => a * b],
    ['/', (a, b) => Math.floor(a / b)],
    ['.mod', (a, b) => a % b],
    ['<<', (a, b) => a << b],
    ['>>', (a, b) => a >>> b],
    ['&', (a, b) => a & b],
    ['|', (a, b) => a | b],
    ['^', (a, b) => a ^ b],
    ['&&', (a, b) => a && b],
    ['||', (a, b) => a || b],
    ['.xor', (a, b) => Number(!a && b || !b && a)], // logical xor
    ['<', (a, b) => Number(a < b)], //
    ['<=', (a, b) => Number(a <= b)],
    ['>', (a, b) => Number(a > b)],
    ['>=', (a, b) => Number(a >= b)],
    ['=', (a, b) => Number(a === b)],
    ['<>', (a, b) => Number(a !== b)], // TODO: != ?
  ]);
}


type BinOp = (a: number, b: number) => number;
type FuncType = (...args: number[]) => number
