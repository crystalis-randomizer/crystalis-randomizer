import {assemble, buildRomPatch} from './6502';
import {Rom} from './rom';
import {Random} from './random';

// TODO - to shuffle the monsters, we need to find the sprite palttes and
// patterns for each monster.  Each location supports up to two matchups,
// so can only support monsters that match.  Moreover, different monsters
// seem to need to be in either slot 0 or 1.


// Pull in all the patches we want to apply automatically.
// TODO - make a debugger window for patches.
export default ({
  apply(rom, hash) {
    cheat.apply(rom);
    lime.apply(rom);

    //for (let i = 0; i < 16; i++) rom[0x2fe40 + i] = i;
  },
});

// Fix the shaking issues by tweaking the delay times in IRQ callbacks.
export const cheat = buildRomPatch(assemble(`
.bank $7c000 $c000:$4000 ; fixed bank
.bank $1e000 $a000:$2000

.org $1ff46
  nop
  nop
  nop
  nop
  nop
  nop
`));

// Fix the shaking issues by tweaking the delay times in IRQ callbacks.
export const lime = buildRomPatch(assemble(`
.bank $7c000 $c000:$4000 ; fixed bank
.bank $18000 $8000:$2000

.org $19d22
  .byte $25,$13,$42,$28
`));
