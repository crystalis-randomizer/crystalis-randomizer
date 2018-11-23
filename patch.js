import {assemble, buildRomPatch} from './6502.js';
import {Rom} from './rom/rom.js';

// Fix the shaking issues by tweaking the delay times in IRQ callbacks.
export const fixShaking = buildRomPatch(assemble(`
.bank $3c000 $c000:$4000 ; fixed bank

.org $3f4eb
  ldx #$03
loop1:
  dex
  bpl loop1

.org $3f455
  ldx #$07
  nop
`));



// Extra code for difficulty scaling
export const scaleDifficultyLib = buildRomPatch(assemble(`

;;; TODO - verify these numbers!!!
define CurrentDifficulty $361
define ObjectHP  $3c0
define ObjectAtk $3e0
define ObjectDef $400

.org $3f9ba

;;; X = object id
AdjustStatsForDifficulty:
  ;; Only do anything if $340,x is negative
  lda $340,x
  bmi ActuallyScale
   rts
ActuallyScale:
  ;; Unset the scaling flag
  and #$7f
  sta $340,x
  ldy CurrentDifficulty
  ;; Scale the current difficult level's ATK by monster's ATK scale
  lda ObjectAtk,x
  beq ScaleDef
  sta $12
  lda AtkDifficultyTable,y
  jsr AdjustLinear
  sta ObjectAtk,x
ScaleDef:
  ;; Scale the current difficult level's DEF by monster's DEF scale
  lda ObjectDef,x
  beq ScaleHP
  sta $12
  lda DefDifficultyTable,y
  jsr AdjustLinear
  sta ObjectDef,x
ScaleHP:
  ;; Scale the current difficult level's HP by monster's HP scale
  lda ObjectHP,x
  beq ScaleExp
  sta $12
  lda HPDifficultyTable,y
  jsr AdjustLinear
  sta ObjectHP,x
ScaleExp:
  ;; EXP is more difficult, since it jumps at $80.  Track the sign
  ;; of the difficulty level's number and do some extra work if it
  ;; changes after the multiplication.
  lda ObjectExp,x
  beq ScaleGold
  sta $12
  lda ExpDifficultyTable,y
  bpl SmallExp
   ;; EXP is large: rescale but don't worry about checking at end.
   and #$7f
   jsr AdjustLinear
   or #$80
   bmi StoreExp    ; Unconditional
SmallExp:
  jsr AdjustLinear
  bpl StoreExp
   ;; Multiplication caused it to jump past the disconnect
   ;; Shift right four times, and re-set the high bit
   lsr
   lsr
   lsr
   sec
   ror
StoreExp:
  sta ObjectExp,x
ScaleGold
  ;; Gold is already logarithmic, and the byte that tracks it is
  ;; shared with elemental defense, and we need to ensure we keep
  ;; it properly clamped.
  lda ObjectGold,x
  and #$f0
  beq 


`));

// TODO - need to set up tables
// TODO - make a way to adjust the ROM
//   - one statue needs special handling? just don't scale statues or dyna
//   --- can we ...?

const DIFFICULTY_SCALED = [
  // bosses
  0x57, 0x5e, 0x68, 0x7d, 0x88, 0x8b, 0x90, 0x93, 0x97, 0x9b, 0x9e,
  0xa4, 0xa5, 0xb4,
  // monsters
  0x4b, 0x4f, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x58, 0x59,
  0x5a, 0x5b, 0x5c, 0x5d, 0x5f, 0x60, 0x61, 0x62, 0x63, 0x64, 0x65,
  0x66, 0x67, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x71, 0x72,
  0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7b, 0x7c, 0x80, 0x81,
  0x82, 0x84, 0x85, 0x86, 0x87, 0x89, 0x8a, 0x8c, 0x91, 0x92, 0x94,
  0x95, 0x96, 0x98, 0x99, 0x9a, 0x9f, 0xa0, 0xa1, 0xa2, 0xa3, 0xbc,
  0xc1, 0xc4,
  // projetiles
  0x3f, 0xb8, 0xb9, 0xba, 0xbf, 0xc3, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
  0xca, 0xcb, 0xcc, 0xcd, 0xce, 0xe0, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5,
  0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xeb, 0xec, 0xed, 0xee, 0xef, 0xf0,
  0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xfc,
  0xfd, 0xfe,
];

const adjustObjectDifficultyStats = (data, rom) => {

  for (const obj of DIFFICULTY_SCALED.map(i => rom.objects[i])) {
    // indicate that this object needs scaling
    obj.objectData[2] |= 0x80;
    // figure out how to actually scale it...?
    // NOTE: bosses are tricky since we need much bigger multipliers than normal
    //  -- 6 bits for multiplier (up to a factor of 7?), 2 for subtraction
    //  
  }

  // OR $80 on all the $340 bytes for monsters/projectiles.
  // NOTE: we need to tweak the ROM library's understanding of those,
  //   since it lists a few we don't care about and misses a few we do.


  // TODO - we're going to have to deal with overlap, missing bits, etc...


};



// Pull in all the patches we want to apply automatically.
// TODO - make a debugger window for patches.
export default ({
  apply(rom) {
    fixShaking.apply(rom);
    scaleDifficultyLib.apply(rom);
    const parsed = new Rom(rom);
    adjustObjectDifficultyStats(rom, parsed);
  },
});

