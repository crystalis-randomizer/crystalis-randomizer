import { FieldInfo, MapFieldInfo, MessageFieldInfo, PrimitiveFieldInfo, RepeatedFieldInfo, TypeInfo } from "./info";

export interface CallContext {
  info?: FieldInfo;
}

export type Pick = ReadonlyArray<readonly [number, unknown]>;

export interface Mutation {
  // lvalue being assigned to
  readonly lhs: LValue;
  // operator
  readonly op: string;
  // possible values, with probabilities of each; if not present, could be anything?
  readonly values?: Pick|'all';

  // // value as a primitive, array, or object
  // readonly value: unknown;
  // // independent chance of accepting mutation, or NaN if not independent
  // readonly random?: boolean;
}

export class LValue {
  private constructor(readonly terms: readonly (string|number)[],
                      readonly base?: LValue,
                      readonly info?: FieldInfo) {}
  static of(name: string, typeInfo?: TypeInfo): LValue {
    const f = typeInfo?.field(name);
    if (f) return new LValue([f.name], undefined, f);
    return new LValue([name]);
  }
  // NOTE: will never lose info: an lvalue w/ info will always map to another with info
  at(term: string|number): LValue|string {
    if (!this.info) return new LValue([...this.terms, term]);
    // cannot descend into primitive field
    if (this.info instanceof PrimitiveFieldInfo) return `cannot index primitive ${this.info}`;
    if (this.info instanceof RepeatedFieldInfo) {
      if (typeof term !== 'number') return `repeated field ${this.info} requires numeric index`;
      return new LValue([...this.terms, term], this.base || this, this.info.element);
    } else if (this.info instanceof MapFieldInfo) {
      // look at the key type
      const errs: string[] = [];
      const k = this.info.key.coerce(term, {report(msg: string) {errs.push(msg);}});
      if (k == undefined) return errs[0] || `failed to coerce ${term} to key of ${this.info}`;
      if (typeof k === 'string' || typeof k === 'number') {
        return new LValue([...this.terms, k], this.base || this, this.info.value);
      }
      return `unexpected coerced key type ${typeof k} for ${this.info}`;
    } else if (this.info instanceof MessageFieldInfo) {
      if (typeof term === 'number') return `message ${this.info} requires string fields`;
      const f = this.info.type.field(term);
      if (!f) return `unknown field ${term} in ${this.info}`;
      return new LValue([...this.terms, f.name], this.base, f);
    }
    return `unknown info type: ${this.info}`;
  }
  qname(): string {
    let out = '';
    for (const t of this.terms) {
      if (/^[a-z_$][a-z0-9_$]*$/i.test(String(t))) {
        out += (out ? '.' : '') + t;
      } else {
        out += `[${t}]`;
      }
    }
    return out;
  }
}
