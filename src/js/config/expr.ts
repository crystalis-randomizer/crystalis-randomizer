import { Expression } from './jsep';
import { FieldInfo, MapFieldInfo, MessageFieldInfo, RepeatedFieldInfo, Reporter, TypeInfo } from './info';
import { CallContext, Fn, IRandom, functions } from './functions';

function fromEntries(entries: ReadonlyArray<readonly [string|number, unknown]>): object {
  const obj: Record<string|number, unknown> = {};
  for (const [k, v] of entries) {
    obj[k] = v;
  }
  return obj;
}

const infoMap = new WeakMap<object, FieldInfo>();

function tagInfo<T>(arg: T, info: FieldInfo): T {
  if (arg && typeof arg === 'object') infoMap.set(arg, info);
  return arg;
}

function lookupKey(info: FieldInfo, key: string|number,
                   reporter?: Reporter): [string|number, FieldInfo?] {
  if (info instanceof MessageFieldInfo) {
    const f = info.type.field(key as string);
    if (!f) {
      reporter?.report(`unknown field ${key} on ${info.type}`);
      return [key];
    }
    return [f.name, f];
  } else if (info instanceof RepeatedFieldInfo) {
    if (typeof key !== 'number') {
      reporter?.report(`cannot index repeated field with non-number: ${key}`);
      return [key];
    }
    return [key, info.element];
  } else if (info instanceof MapFieldInfo) {
    const k = info.key.coerce(key, reporter);
    if (!k) return [key]; // already reported.
    return [k as string|number, info.value];
  }
  reporter?.report(`cannot index non-repeated/non-message field ${info}`);
  return [key];
}

export class Evaluator {
  readonly vars = new Map<string, unknown>();
  readonly functions: Record<string, Fn>;

  constructor(readonly root: object,
              readonly rootInfo: TypeInfo,
              random: IRandom) {
    this.functions = functions(random);
  }

  // Given a Property expression, returns the string|number key.
  private prop(computed: boolean, prop: Expression, reporter?: Reporter): string|number|undefined {
    if (computed) {
      const key = this.evaluate(prop, reporter);
      if (typeof key === 'string' || typeof key === 'number') return key;
      reporter?.report(`bad computed key: ${key} (type: ${typeof key})`);
      return undefined;
    }
    if (prop.type === 'Identifier') return prop.name;
    if (prop.type === 'Literal') return typeof prop.value === 'number' ? prop.value : prop.raw;
    reporter?.report(`bad non-computed key type: ${prop.type}`);
    return undefined;
  }

  // Evaluates an exression, returning its value and carrying out any side effects.
  evaluate(expr: Expression, reporter?: Reporter, ctx: CallContext = {}): unknown {
    switch (expr.type) {
      case 'Literal': return expr.value;
      case 'ArrayExpression': return expr.elements.map(e => this.evaluate(e, reporter));
      case 'ObjectExpression': return fromEntries(expr.properties.flatMap(p => {
        const key = this.prop(p.computed, p.key, reporter);
        return key != null ? [[key, this.evaluate(p.value, reporter)]] : [];
      }));
      case 'Identifier': {
        if (this.vars.has(expr.name)) {
          return this.vars.get(expr.name);
        }
        const f = this.rootInfo.field(expr.name);
        if (f) {
          const root: any = this.root;
          return tagInfo(root[f.name] ?? (root[f.name] = f.empty()), f);
        }
        reporter?.report(`variable undefined: ${expr.name}`);
        return undefined;
      }
      case 'MemberExpression': {
        const key = this.prop(expr.computed, expr.property, reporter);
        if (key == undefined) return undefined; // already reported.
        const obj: any = this.evaluate(expr.object, reporter);
        if (obj && typeof obj === 'object') {
          const info = infoMap.get(obj);
          if (info) {
            const [k, childInfo] = lookupKey(info, key);
            return childInfo ? tagInfo(obj[k as keyof typeof obj], childInfo) : undefined;
          }
          // ordinary object - just index it, may be undefined
          return (obj as any)[key];
        }
        // non-object
        reporter?.report(`property access on non-object: ${obj}`);
        return undefined; // note: may lead to further errors...?
      }
      case 'CallExpression': {
        // restrict this to only known functions!
        if (expr.callee.type !== 'Identifier') {
          reporter?.report(`can only call functions by name, but callee was ${expr.callee.type}`);
          return undefined;
        }
        const fn = this.functions[expr.callee.name];
        if (!fn) {
          reporter?.report(`unknown function: ${expr.callee.name}`);
          return undefined;
        }
        return fn(expr.arguments.map(arg => this.evaluate(arg, reporter)), reporter, ctx);
      }
      case 'UnaryExpression': {
        const arg = this.evaluate(expr.argument) as any;
        switch (expr.operator) {
          case '!': return !arg;
          case '+': return +arg;
          case '-': return -arg;
          case '~': return ~arg;
        }
        reporter?.report(`unknown unary operator: ${expr.operator}`);
        return undefined;
      }
      case 'BinaryExpression':
        return this.binary(expr.operator,
                           this.evaluate(expr.left, reporter),
                           expr.right, reporter, ctx);

      case 'ConditionalExpression':
        return this.evaluate(expr.test, reporter) ?
            this.evaluate(expr.consequent, reporter, ctx) : 
            this.evaluate(expr.alternate, reporter, ctx);

      case 'AssignmentExpression': {
        // look at LHS - it needs to be either an identifier or a getprop
        let base: unknown = undefined;
        let key: string|number|undefined = undefined;
        let info: FieldInfo|undefined = undefined;
        let name: string|undefined = undefined;
        if (expr.left.type === 'MemberExpression') {
          key = this.prop(expr.left.computed, expr.left.property, reporter);
          if (key == undefined) return undefined; // already reported.
          base = this.evaluate(expr.left.object, reporter);
          if (!base || typeof base !== 'object') {
            reporter?.report(`cannot assign to property of non-object ${base}`);
            return undefined;
          }
          const baseInfo = infoMap.get(base as object);
          if (baseInfo) {
            [key, info] = lookupKey(baseInfo, key!);
          }
        } else if (expr.left.type === 'Identifier') {
          info = this.rootInfo.field(expr.left.name);
          if (info) {
            key = info.name;
            base = this.root;
            if (!base || typeof base !== 'object') {
              reporter?.report(`cannot assign to property of non-object ${base}`);
              return undefined;
            }
          } else {
            name = expr.left.name;
          }
        } else {
          reporter?.report(`left-hand of assignment must be qualified name but was ${
                            expr.left.type}`);
          return undefined;
        }

        // special case: don't allow assigning messages
        if (info instanceof MessageFieldInfo) {
          reporter?.report(`cannot assign to a message field: ${info}`);
          return undefined;
        }

        // look at operator and maybe do a mutation
        let value;
        const op = expr.operator;
        if (op !== '=') {
          if (!op.endsWith('=')) throw new Error(`unknown assignment operator: ${op}`);
          // TODO - can both name and key be missing?
          const left = key != undefined ? (base as any)[key] : this.vars.get(name!)!;
          value = this.binary(op.substring(0, op.length - 1), left, expr.right, reporter, {info});
        } else {
          value = this.evaluate(expr.right, reporter, {info});
        }

        // conform value to expectation
        if (info) value = info.coerce(value);

        // make the assignment
        if (key == undefined) {
          // local variable assignment
          this.vars.set(name!, value);
        } else {
          // property assignment (including top-level config props)
          (base as any)[key] = value;
        }
        return value;
      }
    }
    // unreachable default case
    reporter?.report(`can't handle expression type ${(expr as any).type}`);
    return undefined;
  }

  binary(op: string, left: unknown, rightExpr: Expression,
         reporter?: Reporter, ctx: CallContext = {}): unknown {
    // special handling for short-circuiting
    if (op === '&&') return left && this.evaluate(rightExpr, reporter, ctx);
    if (op === '||') return left || this.evaluate(rightExpr, reporter, ctx);
    let right = this.evaluate(rightExpr, reporter); // no ctx
    // special handling for array concatenation
    if (op === '+') {
      const leftIsArray = Array.isArray(left);
      if (leftIsArray && Array.isArray(right)) {
        return [...(left as unknown[]), ...right];
      } else if (leftIsArray || Array.isArray(right)) {
        reporter?.report(`can only add arrays to other arrays`);
        return undefined;
      }
    }
    // All other operations are full numeric: cast booleans but accept
    // no other types than numbers.  NOTE: we don't even support string
    // concatenation.
    if (typeof left === 'boolean') left = +left;
    if (typeof right === 'boolean') right = +right;
    if (typeof left !== 'number' || typeof right !== 'number') {
      reporter?.report(`can only do math on numbers: ${typeof left} ${op} ${typeof right}`);
      return undefined;
    }

    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '**': return left ** right;
      case '<<': return left << right;
      case '>>': return left >> right;
      case '>>>': return left >>> right;
      case '&': return left & right;
      case '|': return left | right;
      case '^': return left ^ right;
      case '==': case '===': return left=== right;
      case '!=': case '!==': return left !== right;
      case '<': return left < right;
      case '<=': return left <= right;
      case '>': return left > right;
      case '>=': return left >= right;
    }
    reporter?.report(`unknown binary operator: ${op}`);
    return undefined;
  }
}
