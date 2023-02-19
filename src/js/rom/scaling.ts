import {Module} from '../asm/module';
import {Rom} from '../rom';
import {relocExportLabel} from './util';

// Data structure for scaling tables.  Goes with postshuffle.s.
export class Scaling {

  // TODO - consider if we can easily change the size of these tables?
  // levels = 48;

  // TODO - is there something better to initialize this with?
  patk: number[] = new Array(48).fill(0);
  pdef: number[] = new Array(48).fill(0);
  php: number[] = new Array(48).fill(0);
  exp: number[] = new Array(48).fill(0);

  constructor(readonly rom: Rom) {
    // PAtk = 5 + s * 15/32
    this.setPAtkFormula(s => 5 + s * 15 / 32);
    // NOTE: used to be 3+3*s/4, 2+s/2, and other things depending on
    // how armors are treated.  For armor cap at 3 * Lvl, set PDef = s
    this.setPDefFormula(s => s);
    // PHP = min(255, 48 + round(s * 11 / 2))
    this.setPhpFormula(s => 48 + 5.5 * s);
    this.setExpScalingFactor(1);
  }

  setExpScalingFactor(f: number) {
    // Pre-compressed formula.  Allow setting a multiplicative factor.
    this.setExpFormula(s => Math.floor(4 * (2 ** ((16 + 9 * s) / 32)) * f));
  }

  setPAtkFormula(f: (scaling: number) => number) {
    // Tale stores 8 * PAtk, where PAtk is expected player attack.
    this.patk = this.patk.map((_, s) => Math.round(8 * f(s)));
  }

  setPDefFormula(f: (scaling: number) => number) {
    // Table stores 4 * PDef, where PDef is the expected player defense.
    this.pdef = this.pdef.map((_, s) => Math.round(4 * f(s)));
  }

  setPhpFormula(f: (scaling: number) => number) {
    // Table stores PHP, which is expected player HP.
    this.php =
        this.php.map((_, s) => Math.min(255, Math.max(5, Math.round(f(s)))));
  }

  setExpFormula(f: (scaling: number) => number) {
    // Table stores ExpB, which is the compressed base EXP drop.
    // Compress maps values > 127 to $80|(x>>4)
    this.exp = this.exp.map((_, s) => {
      const e = f(s);
      return e < 0x80 ? e : Math.min(255, 0x80 + (e >> 4));
    });
  }

  write(): Module[] {
    const a = this.rom.assembler();
    a.segment("0d", "fe", "ff");
    relocExportLabel(a, 'DiffAtk');
    a.byte(...this.patk);
    relocExportLabel(a, 'DiffDef');
    a.byte(...this.pdef);
    relocExportLabel(a, 'DiffHP');
    a.byte(...this.php);
    relocExportLabel(a, 'DiffExp');
    a.byte(...this.exp);
    return [a.module()];
  }
}
