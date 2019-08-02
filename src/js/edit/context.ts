import {Rom} from '../rom.js';
import {Graphics} from './graphics.js';

interface Data {
  location?: number;
  tileset: number;
  patterns: number[];
  palettes: number[];
  flag: boolean;
  // TODO - current object?  other stuff?
}

interface Update {
  graphics?: boolean;
  location?: boolean;
  tileset?: boolean;
  patterns?: boolean;
  palettes?: boolean;
  tilePattern?: boolean;
  tilePalette?: boolean;
  spritePattern?: boolean;
  spritePalette?: boolean;
  flag?: boolean;
  // TODO - drag/drop?  map updates?  etc
}

/** Global context for the editor state. */
export class Context {

  readonly graphics: Graphics;

  // TODO - update about this?
  selection: any;

  private readonly data: Data = {
    location: undefined,
    tileset: 0x80,
    patterns: [0, 0, 0, 0, 0, 0],
    // TODO - permanent purple palette, sword palette
    palettes: [0, 0, 0, 0x7f, 0, 0, 0, 0],
    flag: false,
  };
  private readonly listeners: Set<(update: Update) => void> = new Set();

  constructor(readonly rom: Rom) {
    this.graphics = new Graphics(rom);
  }

  set location(x: number|undefined) {
    const update: Update = {graphics: true, location: true};
    this.data.location = x;
    const l = x && this.rom.locations[x];
    if (l && l.used) {
      Object.assign(update, {tileset: true, patterns: true, palettes: true,
                             tilePattern: true, tilePalette: true,
                             spritePattern: true, spritePalette: true});
      this.data.tileset = l.tileset;
      this.data.patterns.splice(0, 2, ...l.tilePatterns);
      this.data.palettes.splice(0, 3, ...l.tilePalettes);
      this.data.patterns.splice(4, 2, ...l.spritePatterns);
      this.data.palettes.splice(6, 2, ...l.spritePalettes);
    }
    this.update(update);
  }

  get location(): number|undefined { return this.data.location; }

  set tileset(x: number) {
    if ((x & 3) !== 0 || x < 0x80 || x >= 0xaf) return;
    this.data.tileset = x;
    this.update({graphics: true, tileset: true});
  }
  get tileset(): number { return this.data.tileset; }

  set tilePatterns(x: [number, number]) {
    if (x.length !== 2) throw new Error(`invalid tilePatterns: ${x.join(',')}`);
    this.data.patterns.splice(0, 2, ...x);
    this.update({graphics: true, patterns: true, tilePattern: true});
  }
  get tilePatterns(): [number, number] { return this.data.patterns.slice(0, 2) as any; }

  set tilePalettes(x: [number, number, number]) {
    if (x.length !== 3) throw new Error(`invalid tilePalettes: ${x.join(',')}`);
    this.data.palettes.splice(0, 3, ...x);
    this.update({graphics: true, palettes: true, tilePalette: true});
  }
  get tilePalettes(): [number, number, number] { return this.data.palettes.slice(0, 3) as any; }

  set flag(x: boolean) {
    this.data.flag = x;
    this.update({graphics: true, flag: true});
  }
  get flag(): boolean {
    return this.data.flag;
  }

  // TODO - sprite setters/getters

  setPattern(id: number, value: number) {
    this.data.patterns[id] = value;
    const update: Update = {graphics: true, patterns: true};
    if (id < 2) update.tilePattern = true;
    else update.spritePattern = true;
    this.update(update);
  }

  setPalette(id: number, value: number) {
    this.data.palettes[id] = value;
    const update: Update = {graphics: true, palettes: true};
    if (id < 4) update.tilePalette = true;
    else update.spritePalette = true;
    this.update(update);
  }

  private update(update: Update): void {
    for (const listener of this.listeners) {
      listener(update);
    }
  }

  /** Async generator for updates. */
  updates(): AsyncIterableIterator<Update> {
    const updates: Update[] = [];
    const resolvers: Array<(result: IteratorResult<Update>) => void> = [];
    const listener = (update: Update) => {
      if (resolvers.length) {
        resolvers.shift()!({value: update, done: false});
      } else {
        updates.push(update);
      }
    }
    this.listeners.add(listener);
    const next = (): Promise<IteratorResult<Update>> => {
      if (updates.length) {
        return Promise.resolve({value: updates.shift()!, done: false});
      }
      return new Promise(resolve => resolvers.push(resolve));
    };
    const cleanup = <R>(result: R) => {
      this.listeners.delete(listener);
      return result;
    }
    const iter = {
      next,
      return: (result: any) => cleanup(Promise.resolve({done: true, value: result})),
      throw: (ex: any) => cleanup(Promise.reject(ex)),
      [Symbol.asyncIterator]: () => iter,
    }
    return iter;
  }      

  static readonly LOCATION: GetSet<number|undefined> = {
    get(context) { return context.location; },
    set(context, value) { context.location = value; },
  }
  static readonly TILESET: GetSet<number> = {
    get(context) { return context.tileset; },
    set(context, value) { context.tileset = value; },
  }
  static pattern(id: number): GetSet<number> {
    return {
      get(context) { return context.data.patterns[id]; },
      set(context, value) { context.setPattern(id, value); },
    };
  }
  static palette(id: number): GetSet<number> {
    return {
      get(context) { return context.data.palettes[id]; },
      set(context, value) { context.setPalette(id, value); },
    };
  }
}

export interface GetSet<T> {
  get(context: Context): T;
  set(context: Context, value: T): void;
}
