import { data as loadData } from './data.macro' with {type: 'macro'};
import type { Data } from './data.macro';
import { RefsJson, Ref } from './tools/extract-refs';
import { Expr } from './asm/expr';

// These are all unused directly, we just have it so that it forces
// the bundler to re-run whenever a file changes.
import '../asm/01_init.s' with {type: 'text'};
import '../asm/animation.s' with {type: 'text'};
import '../asm/archipelago.s' with {type: 'text'};
import '../asm/attack.s' with {type: 'text'};
import '../asm/bosses.s' with {type: 'text'};
import '../asm/crystalis_sword.s' with {type: 'text'};
import '../asm/defend.s' with {type: 'text'};
import '../asm/dialog.s' with {type: 'text'};
import '../asm/enemy.s' with {type: 'text'};
import '../asm/expandprg.s' with {type: 'text'};
import '../asm/extendedmap.s' with {type: 'text'};
import '../asm/flags.s' with {type: 'text'};
import '../asm/gamepad.s' with {type: 'text'};
import '../asm/hud.s' with {type: 'text'};
import '../asm/inventory.s' with {type: 'text'};
import '../asm/irq.s' with {type: 'text'};
import '../asm/itemget.s' with {type: 'text'};
import '../asm/location.s' with {type: 'text'};
import '../asm/magic.s' with {type: 'text'};
import '../asm/movement.s' with {type: 'text'};
import '../asm/pits.s' with {type: 'text'};
import '../asm/playerdeath.s' with {type: 'text'};
import '../asm/random.s' with {type: 'text'};
import '../asm/savegame.s' with {type: 'text'};
import '../asm/shop.s' with {type: 'text'};
import '../asm/spawn.s' with {type: 'text'};
import '../asm/speed.s' with {type: 'text'};
import '../asm/stattracker.s' with {type: 'text'};
import '../asm/telepathy.s' with {type: 'text'};
import '../asm/trainer.s' with {type: 'text'};
import '../asm/triggers.s' with {type: 'text'};
import '../asm/utility.s' with {type: 'text'};
import '../asm/walls.s' with {type: 'text'};
import '../images/spritesheets/Mesia.nss' with {type: 'text'};
import '../images/spritesheets/Simea.nss' with {type: 'text'};
import '../../vanilla/crystalis.s' with {type: 'text'};

// Bun awaits async macros and inlines the resolved value.
const data = loadData() as unknown as Data;
const {sources: asmSources, spritesheets: nssSources} = data;

function memoize<T>(f: () => T): () => T {
  let fn = (): T => {
    const x = f();
    fn = () => x;
    return x;
  };
  return () => fn();
}

function clone<T>(arg: T): T {
  if (Array.isArray(arg)) return arg.map(clone) as T;
  if (typeof arg !== 'object') return arg;
  return Object.fromEntries(
      Object.entries(arg as object)
          .map(([k, v]) => [k, clone(v)])) as T;
}

/** Returns the assembly sources as strings. */
export const sources = () =>
    Object.entries(asmSources)
        .map(([filename, contents]) => ({filename, contents}));

/** Returns the spritesheets as a map of strings. */
export const spritesheets = () => ({...nssSources});

export const refs = (): RefsJson => clone(data.refs);

export const refsBySymbol = memoize((): ReadonlyMap<string, readonly Ref[]> => {
  const map = new Map<string, Ref[]>();
  for (const ref of refs().refs) {
    const syms = Expr.symbols(ref.expr);
    if (syms.length !== 1) continue;
    let vals = map.get(syms[0]);
    if (!vals) map.set(syms[0], vals = []);
    vals.push(ref);
  }
  return map;
});
