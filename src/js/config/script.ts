import jsep from 'jsep';
import jsepAssignment from '@jsep-plugin/assignment';
import * as ESTree from 'estree';
import { FieldInfo, SimplePresetEvaluator, Val } from './runtime';
import { Config } from './index';

jsep.plugins.register(jsepAssignment);
jsep.addBinaryOp('**', 11, true); // exponentiation

interface Random {
  next(): number;
  nextInt(a: number, b: number): number;
  nextNormal(): number;
}

export class ScriptEvaluator extends SimplePresetEvaluator {
  // TODO - can we make this an interface and build parse/eval into it?
  private readonly values = new Map<string, Val>();

  constructor(readonly random: Random) {
    super(Config.Preset.descriptor);
  }

  // NOTE: may throw an Error
  evaluate(script: string, field: FieldInfo<any, any>): Val {
    if (script === '?') {
      // Special case `=?` to pick any random value from all the options.
      return field.pick(() => this.random.next());
    }
    return field.type.fromJson(this.evalTree(jsep.parse(script), field.name === 'scripts'));
  }

  private evalTree(tree: ESTree.Node, mutable: boolean): Val {
    switch (tree.type) {
      case 'Literal':
        if (!supportedTypes.has(typeof tree.value)) throw new Error(`unsupported literal type: ${typeof tree.value}`);
        return tree.value as Val;
      case 'Identifier':
        if (this.values.has(tree.name)) {
          return this.values.get(tree.name)!;
        }
        // TODO - handle enum names???
        throw new Error(`unknown variable: ${tree.name}`);
      case 'BinaryExpression': {
        const left = this.evalTree(tree.left, mutable);
        const right = this.evalTree(tree.right, mutable);
        switch (tree.operator) {
          case '+': return num(left) + num(right);
          case '-': return num(left) - num(right);
          case '*': return num(left) * num(right);
          case '**': return num(left) ** num(right);
          case '/': return num(left) / num(right);
          case '%': return num(left) % num(right);
          case '==': return left === right;
          case '!=': return left !== right;
          case '<': return num(left) < num(right);
          case '<=': return num(left) <= num(right);
          case '>': return num(left) > num(right);
          case '>=': return num(left) >= num(right);
          default:
            throw new Error(`unknown operator: ${tree.operator}`);
        }
      }
      case 'LogicalExpression': {
        const left = this.evalTree(tree.left, mutable);
        switch (tree.operator) {
          case '&&': return left && this.evalTree(tree.right, mutable);
          case '||': return left || this.evalTree(tree.right, mutable);
          default:
            throw new Error(`unknown operator: ${tree.operator}`);
        }
      }
      case 'UnaryExpression': {
        const arg = this.evalTree(tree.argument, mutable);
        switch (tree.operator) {
          case '-': return -num(arg);
          case '!': return !arg;
            // NOTE: no bitwise ops yet
          default:
            throw new Error(`unknown operator: ${tree.operator}`);
        }
      }
      case 'ConditionalExpression': {
        const test = this.evalTree(tree.test, mutable);
        return test ? this.evalTree(tree.consequent, mutable) :
          this.evalTree(tree.alternate, mutable);
      }
      case 'CallExpression': {
        if (tree.callee.type !== 'Identifier') {
          throw new Error(`expected simple name, got ${tree.callee.type}`);
        }
        const callee = tree.callee.name;
        if (callee === 'rand') {
          if (tree.arguments.length === 0) return this.random.next();
          if (tree.arguments.length === 1) {
            return this.random.nextInt(Number(this.evalTree(tree.arguments[0], mutable)));
          }
          if (tree.arguments.length === 2) {
            // NOTE: rand(a, b) is INCLUSIVE, rand(n) is EXCLUSIVE.
            const a = Number(this.evalTree(tree.arguments[0], mutable));
            const b = Number(this.evalTree(tree.arguments[1], mutable));
            return a + this.random.nextInt(b - a + 1);
          }
          throw new Error('rand() takes 0 to 2 arguments');
        } else if (callee === 'randn') {
          if (tree.arguments.length) throw new Error('randn() takes 0 arguments');
          return this.random.nextNormal();
        } else if (isMathFn(callee)) {
          const fn = Math[callee];
          const args = tree.arguments.map(a => Number(this.evalTree(a, mutable)));
          return fn.apply(null, args)
        } else {            
          throw new Error(`unknown function: ${callee}`);
        }
      }
      case 'AssignmentExpression': {
        if (!mutable) {
          throw new Error('assignment in non-mutable context');
        }
        if (tree.operator !== '=') {
          // TODO - support assignment operators
          throw new Error(`unknown operator: ${tree.operator}`);
        }
        const value = this.evalTree(tree.right, mutable);
        this.values.set((tree.left as ESTree.Identifier).name, value);
        return value;
      }
        // TODO - consider supporting member expression for enums?
        // build in all the enum names and support ItemName.SwordOfWind
        // OR canonicalize everything and leave known enum names unresolved
        // until we have a context to resolve them in?
      default:
        throw new Error(`unknown node type: ${tree.type}`);
    }
  }
}

const MATH_FNS = new Set([
  'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atanh', 'atan2',
  'ceil', 'cbrt', 'expm1', 'clz32', 'cos', 'cosh', 'exp', 'floor',
  'hypot', 'log', 'log1p', 'log2', 'log10', 'max', 'min', 'pow',
  'round', 'sign', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'trunc',
] as const);
function isMathFn(x: string): x is typeof MATH_FNS extends Set<infer U> ? U : never {
  return MATH_FNS.has(x as any);
}


const supportedTypes = new Set(['boolean', 'number', 'string']);

// TODO - what about deferred enum names??
// possibly would need a context param for evalTree to know expected type?
function num(v: Val): number {
  if (typeof v !== 'number') throw new Error(`expected number, got ${typeof v}`);
  return v;
}
