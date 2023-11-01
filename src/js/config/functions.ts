import { BoolFieldInfo, EnumFieldInfo, NumberFieldInfo, Reporter } from "./info";
import { CallContext } from "./lvalue";

export interface IRandom {
  next(): number;
}

export type Fn = (args: unknown[],
                  reporter: Reporter|undefined,
                  ctx: CallContext) => unknown;

function nums(name: string, fn: (...args: number[]) => number,
              maxArgs = Infinity): Fn {
  return (args: unknown[], reporter?: Reporter) => {
    let ok = true;
    for (const arg of args) {
      if (typeof arg !== 'number') {
        reporter?.report(`${name} requires numeric arguments but got ${typeof arg}`);
        ok = false;
      }
    }
    if (args.length < fn.length) {
      reporter?.report(`${name} requires at least ${fn.length} arguments`);
      ok = false;
    } else if (args.length > maxArgs) {
      reporter?.report(`${name} requires at most ${maxArgs} arguments`);
      ok = false;
    }
    return ok ? fn(...args as number[]) : undefined;
  };
}

export function functions(random: IRandom): Record<string, Fn> {
  return {
    round: nums('round', Math.round, 1),
    floor: nums('floor', Math.floor, 1),
    ceil: nums('ceil', Math.ceil, 1),
    abs: nums('abs', Math.abs, 1),
    rand: nums('rand', () => random.next(), 0),
    hybrid: (args: unknown[], reporter?: Reporter) => {
      if (args.length % 2) {
        reporter?.report(`bad argument count to hybrid: ${args.length}, must be even`);
        return undefined;
      }
      for (let i = 0; i < args.length; i += 2) {
        if (typeof args[i] !== 'number') {
          reporter?.report(`hybrid even args must be numeric but got ${typeof args[i]}`);
          return undefined;
        }
      }
      const val = args[0] as number;
      for (let i = 2; i < args.length; i += 2) {
        if (val < (args[i] as number)) return args[i - 1];
      }
      return args[args.length - 1];
    },
    pick: (args: unknown[], reporter: Reporter|undefined, ctx: CallContext) => {
      // need to figure out what field it is
      const info = ctx?.info;
      if (args.length > 0) {
        reporter?.report(`pick requires at most 0 arguments`);
        return undefined;
      } else if (!info) {
        reporter?.report(`pick must be assigned to config field`);
        return undefined;
      }
      if (info instanceof NumberFieldInfo) {
        const opts = info.field.options || {};
        if (!opts['(min)'] || !opts['(max)']) {
          reporter?.report(`pick on number requires a field with explicit min/max`);
          return undefined;
        }
        if (info.primitive === 'float') {
          return random.next() * (info.max - info.min) + info.min;
        } else {
          return Math.floor(random.next() * (info.max - info.min + 1)) + info.min;
        }
      } else if (info instanceof BoolFieldInfo) {
        return random.next() < 0.5;
      } else if (info instanceof EnumFieldInfo) {
        return info.enum.values[Math.floor(random.next() * info.enum.values.length)];
      }
      reporter?.report(`pick on bad field type`);
      return undefined;
    },
  };
}
