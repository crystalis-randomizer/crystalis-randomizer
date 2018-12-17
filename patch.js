import {assemble, buildRomPatch} from './6502.js';
import {Rom} from './view/rom.js';
import {Random} from './random.js';

// TODO - to shuffle the monsters, we need to find the sprite palttes and
// patterns for each monster.  Each location supports up to two matchups,
// so can only support monsters that match.  Moreover, different monsters
// seem to need to be in either slot 0 or 1.


// Pull in all the patches we want to apply automatically.
// TODO - make a debugger window for patches.
export default ({
  apply(rom, hash) {
    let seed;
    if (hash['seed']) {
      seed = hash['seed'];
    } else {
      // TODO - send in a hash object with get/set methods
      hash['seed'] = seed = Math.floor(Math.random() * 0x100000000);
      window.location.hash += '&seed=' + seed;
    }
    const random = new Random(seed);
    fixShaking.apply(rom);
    scaleDifficultyLib.apply(rom);
    const parsed = new Rom(rom);
    adjustObjectDifficultyStats(rom, parsed, random);
    if ('nodie' in hash) neverDie.apply(rom);
    console.log('patch applied');
  },
});

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


// PLAN - coopt the 'level' stat which is no longer used to indicate
// bosses that increase difficulty when they're killed.



// // Extra code for difficulty scaling
// export const scaleDifficultyLib = buildRomPatch(assemble(`
// .bank $3c000 $c000:$4000 ; fixed bank

// ;;; TODO - verify these numbers!!!
// define CurrentDifficulty $361
// define ObjectHP  $3c0
// define ObjectAtk $3e0
// define ObjectDef $400

// .org $3f9ba

// ;;; X = object id
// AdjustStatsForDifficulty:
//   ;; Only do anything if $340,x is negative
//   lda $340,x
//   bmi ActuallyScale
//    rts
// ActuallyScale:
//   ;; Unset the scaling flag
//   and #$7f
//   sta $340,x
//   ldy CurrentDifficulty
//   ;; Scale the current difficult level's ATK by monster's ATK scale
//   lda ObjectAtk,x
//   beq ScaleDef
//   sta $12
//   lda AtkDifficultyTable,y
//   jsr AdjustLinear
//   sta ObjectAtk,x
// ScaleDef:
//   ;; Scale the current difficult level's DEF by monster's DEF scale
//   lda ObjectDef,x
//   beq ScaleHP
//   sta $12
//   lda DefDifficultyTable,y
//   jsr AdjustLinear
//   sta ObjectDef,x
// ScaleHP:
//   ;; Scale the current difficult level's HP by monster's HP scale
//   lda ObjectHP,x
//   beq ScaleExp
//   sta $12
//   lda HPDifficultyTable,y
//   jsr AdjustLinear
//   sta ObjectHP,x
// ScaleExp:
//   ;; EXP is more difficult, since it jumps at $80.  Track the sign
//   ;; of the difficulty level's number and do some extra work if it
//   ;; changes after the multiplication.
//   lda ObjectExp,x
//   beq ScaleGold
//   sta $12
//   lda ExpDifficultyTable,y
//   bpl SmallExp
//    ;; EXP is large: rescale but don't worry about checking at end.
//    and #$7f
//    jsr AdjustLinear
//    ora #$80
//    bmi StoreExp    ; Unconditional
// SmallExp:
//   jsr AdjustLinear
//   bpl StoreExp
//    ;; Multiplication caused it to jump past the disconnect
//    ;; Shift right four times, and re-set the high bit
//    lsr
//    lsr
//    lsr
//    sec
//    ror
// StoreExp:
//   sta ObjectExp,x
// ScaleGold:
//   ;; Gold is already logarithmic, and the byte that tracks it is
//   ;; shared with elemental defense, and we need to ensure we keep
//   ;; it properly clamped.
//   lda ObjectGold,x
//   and #$f0


// `));



// TODO - vampire fight gets messed up
//   - instead of bats coming out, a weird green thing shows up on the player's
//     face.  we need to make a snapshot right before going into the room so as
//     to debug this more easily with different patches.
//   - also, difficulty does not increment after the kill.
//   - this seems weird - what would cause it?


// TODO - expose via a hash fragment (pass into patch)
export const neverDie = buildRomPatch(assemble(`
.bank $3c000 $c000:$4000

.org $3cb89
  lda $03c0
  sta $03c1
  nop
.org $3cbaf
  bne label
.org $3cbc0
label:
`));


// NOTE: if we insert at $3c406 then we have $11 as scratch space, too!
// Extra code for difficulty scaling
export const scaleDifficultyLib = buildRomPatch(assemble(`
.bank $3c000 $c000:$4000 ; fixed bank

define Difficulty $4c1
define PlayerLevel $421
define ObjectRecoil $340
define ObjectHP $3c0
define PlayerMaxHP $3c0
define ObjectAtk $3e0
define ObjectDef $400
define ObjectGold $500
define ObjectExp $520

.bank $2e000 $a000:$2000
; Save/restore difficulty
.org $2fd38
  lda Difficulty ; instead of $3c0, which is derivable from level
.org $2fd7c
  sta Difficulty
.org $2fd8e
  jmp FinishRestoreData
.org $2fef5 ; initial state of "continue"
  .byte $00

.org $3d946
  lda Difficulty
.org $3d961
  sta Difficulty
.org $3d982
  jmp FinishRestoreMode


.org $34bde
CoinAmounts:
  .word 0,1,2,4,8,16,30,50,100,200,300,400,500,600,700,800

.bank $1c000 $8000:$4000 ; item use code
.org $1c494
  jmp CheckForFogLamp
.org $1c4db
ItemUseJump_Invalid:

.org $3ff44
CheckForFogLamp:
  beq +
   jmp ItemUseJump_Invalid
+ lda $23
  cmp #$35
  bne +
   inc Difficulty
+ rts

FinishRestoreData:
  sta $0620 ; copied from $2fd8e
  ;; Need to set MaxHP from level
- lda PlayerLevel
  clc
  adc #$02
  asl
  asl
  asl
  asl
  bcc +
   lda #$ff
+ sta PlayerMaxHP
  rts
FinishRestoreMode:
  sta $41 ; copied from $3d982
  bne -   ; uncond - A is always 1 when we run this

.org $3ffe3
.bank $34000 $8000:$4000 ; collision code
KillObjectPatchImpl:
  lda $420,y
  lsr
  lda #$0
  adc Difficulty
  sta Difficulty
  jmp KillObject

.org $350fa
  bne SkipLevelCheck
EnsureNonzeroDamage:
  ;; TODO - what do we do with immune enemies?
  ;; we could possibly allow any sword but halve the damage?
  ;;   - would be nice to get a different SFX for that...?
  bit $10
  bne DealDamage
  inc $10
  bne DealDamage
KillObjectPatched:
  jmp KillObjectPatchImpl
.org $35108
SkipLevelCheck:
.org $35123
  bcs EnsureNonzeroDamage
.org $3513b
DealDamage:
.org $35144
  bcc KillObjectPatched
.org $35152
KillObject:


.bank $1a000 $a000:$2000 ; object data
.org $3c409
  jmp ComputeEnemyStats

.org $1be91
DiffBaseDefense:
  .byte 4,6,8,10,12,14,16,16,16,18
DiffPlayerDefense:
  .byte 5,11,13,18,25,30,38,39,48,48
DiffPlayerLevel:
  .byte 3,5,7,9,11,12,14,15,16,18
DiffBaseExperience:
  .byte 3,8,22,85,141,152,178,208,208,208

define TempLevel $12
define SwordLevel $13

ComputeEnemyStats:
  lda ObjectRecoil,x
  bmi +
   jmp $3c2af ; exit point
+ and #$7f
  sta ObjectRecoil,x
  ;;tya  ;; inserted where we don't need to preserve y
  ;;pha
   ;; Read the difficulty
   ldy Difficulty
   ;; Compute the expected player level
   lda DiffPlayerLevel,y
   ;; Subtract 1 or 2 based on LAdj in high bits of Exp
   lsr ObjectExp,x
   bcc +
    sbc #$01  ; note: carry already set
+  lsr ObjectExp,x
   bcc +
    sbc #$02  ; note: carry already set
+  sta TempLevel
   ;; Compute sword level
   ;; 0: wind. 1: fire, 2: water, 3: thunder: 7: crystalis
   lda #$2
   lsr ObjectDef,x
   bcc +
    asl
+  lsr ObjectDef,x
   bcc +
    asl
    asl
+  lsr ObjectDef,x
   bcc +
    asl
+  sta SwordLevel
   ;; Compute defense
   lda DiffBaseDefense,y
   sta $61
   lda ObjectDef,x
   beq +
    sta $62
    jsr Multiply16Bit
    jsr Shift3_16Bit
+  sta ObjectDef,x
   ;; Compute HP
   lda ObjectHP,x
   beq SkipHP
   ;; First multiply the difficulty-scaled part
   lsr
   lsr
   lsr
   lsr
   sta $61
   lda Difficulty
   sta $62
   jsr Multiply16Bit  ; could use 8-bit here...
   ;; Then add the non-scaled part
   lda ObjectHP,x
   and #$0f
   clc
   adc $61
   sta $61
   beq +
    dec $61 ; 0 is still alive, so subtract 1 - this gives minimum HP for #hits
+  lda TempLevel
   clc
   adc SwordLevel ; should never carry - 32 is max sword, 18 max level
   sec
   sbc ObjectDef,x
   beq +
    bpl ++
+    lda $#01
++ sta $62
   jsr Multiply16Bit
   lda $61
   bit $62
   beq +
    lda #$ff
+  sta ObjectHP,x
SkipHP:
   ;; compute ATK from max hp
   lda ObjectAtk,x
   beq SkipAttack
   sta $61
   ;; compute the player's expected max HP
   lda TempLevel
   clc
   adc #$02
   asl
   asl
   asl
   asl
   bcc +
    lda #$ff
+  sta $62
   jsr Multiply16Bit
   lda $62 ; pull out the high bit only
   clc
   adc DiffPlayerDefense,y
   adc TempLevel
   sec
   sbc DiffPlayerLevel,y ; we've forgotten LAdj, so recompute on the fly
   sta ObjectAtk,x
SkipAttack:
   ;; compute EXP
   lda ObjectExp,x
   beq SkipExperience
   sta $61
   lda DiffBaseExperience,y
   bpl +
    and #$7f ; big exp
+  sta $62
   jsr Multiply16Bit
   jsr Shift3_16Bit
   pha
   lda DiffBaseExperience,y
   bpl +
    pla
    eor #$80 ; big exp
    bmi StoreExp
     lda #$ff ; overflowed to max
     bmi StoreExp  ; uncond
+  pla
   bpl +
    ;; overflowed into the big regime
    lsr
    lsr
    lsr
    lsr
    ora #$80
+  bne StoreExp
    lda #$01 ; minimum of 1
StoreExp:
   sta ObjectExp,x
SkipExperience:
   ;; compute gold
   lda ObjectGold,x
   and #$f0
   beq SkipGold
   lda Difficulty
   asl
   asl
   asl
   asl ; carry will be clear
   adc ObjectGold,x
   bcc +
    ora #$f0
+  sta ObjectGold,x
SkipGold:
  ;;pla
  ;;tay
  ;;rts
  jmp $3c2af

Shift3_16Bit:
  ;; Shifts the value in $61$62 by 3 bits, returning result in A.
  ;; If overflows, returns #$ff.
  lda $61
  lsr $62
  ror
  lsr $62
  ror
  lsr $62
  ror
  bit $62
  beq +
   lda #$ff
+ rts

Multiply16Bit:
  ;; Multiplies inputs in $61 and $62, then shifts
  ;; right A times.
  ;; Result goes $61$62 (lo hi), preserves XY
  txa
  pha
  lda #$00
  ldx #$08
  clc
-  bcc +
    clc
    adc $62
+  ror
   ror $61
   dex
  bpl -
  sta $62
  pla
  tax
  rts
`));



const adjustObjectDifficultyStats = (data, rom, random) => {

  // TODO - find anything sharing the same memory and update them as well
  for (const id of SCALED_MONSTERS.keys()) {
    for (const other in rom.objects) {
      if (SCALED_MONSTERS.has(other)) return;
      if (rom.objects[id].objectDataBase == rom.objects[other].objectDataBase) {
        SCALED_MONSTERS[other] = SCALED_MONSTERS[id];
      }
    }
  }

  for (const [id, {ladj, sword, hits, def, atk, exp, gold}] of SCALED_MONSTERS) {
    // indicate that this object needs scaling
    const o = rom.objects[id].objectData;
    const boss =
        [0x57, 0x5e, 0x68, 0x7d, 0x88, 0x97, 0x9b, 0x9e].includes(id) ? 1 : 0;
    o[2] |= 0x80; // recoil
    o[6] = hits; // HP
    o[7] = atk;  // ATK
    // Sword: 0..3 (wind - thunder) preserved, 4 (crystalis) => 7
    o[8] = def << 3 | (sword < 4 ? sword : sword == 4 ? 7 : 0); // DEF
    o[9] = o[9] & 0xe0 | boss;
    o[16] = o[16] & 0x0f | gold << 4; // GLD
    o[17] = exp << 2 | ladj; // EXP
  }

  rom.writeObjectData();

  const pool = new MonsterPool();
  for (const loc of rom.locations) {
    if (loc) pool.populate(loc);
  }
  pool.shuffle(random);

  rom.writeNpcData();
};


const SCALED_MONSTERS = new Map([
  // ID  TYPE  NAME                        ΔL SW HIT DEF ATK EXP GLD
  [0x3F, 'p', 'Sorceror shot',             0, 1, 0,  0,  35, 0,  0],
  [0x4B, 'm', 'wraith??',                  1, 1, 18, 4,  44, 10, 5],
  [0x4F, 'm', 'wraith',                    1, 1, 19, 3,  40, 10, 4],
  [0x50, 'm', 'Blue Slime',                2, 1, 17, 0,  32, 2,  1],
  [0x51, 'm', 'Weretiger',                 2, 1, 18, 1,  43, 2,  2],
  [0x52, 'm', 'Green Jelly',               1, 1, 19, 4,  32, 4,  2],
  [0x53, 'm', 'Red Slime',                 1, 1, 19, 6,  32, 6,  2],
  [0x54, 'm', 'Rock Golem',                1, 1, 42, 6,  48, 11, 3],
  [0x55, 'm', 'Blue Bat',                  1, 1, 1,  0,  8,  2,  0],
  [0x56, 'm', 'Green Wyvern',              1, 1, 20, 4,  48, 8,  3],
  [0x57, 'b', 'Vampire',                   0, 1, 30, 4,  36, 32, 0],
  [0x58, 'm', 'Orc',                       2, 1, 19, 3,  46, 6,  2],
  [0x59, 'm', 'Red Flying Swamp Insect',   1, 2, 17, 4,  43, 8,  2],
  [0x5A, 'm', 'Blue Mushroom',             2, 2, 16, 3,  55, 8,  2],
  [0x5B, 'm', 'Swamp Tomato',              1, 1, 35, 4,  70, 8,  2],
  [0x5C, 'm', 'Flying Meadow Insect',      0, 2, 17, 5,  47, 13, 1],
  [0x5D, 'm', 'Swamp Plant',               1, 1, 1,  0,  0,  6,  0],
  [0x5E, 'b', 'Insect',                    1, 2, 39, 0,  16, 40, 0],
  [0x5F, 'm', 'Large Blue Slime',          1, 1, 39, 7,  40, 6,  2],
  [0x60, 'm', 'Ice Zombie',                2, 2, 35, 6,  28, 4,  2],
  [0x61, 'm', 'Green Living Rock',         2, 1, 16, 0,  19, 3,  2],
  [0x62, 'm', 'Green Spider',              2, 2, 18, 5,  44, 3,  2],
  [0x63, 'm', 'Red/Purple Wyvern',         2, 1, 19, 3,  60, 4,  2],
  [0x64, 'm', 'Draygonia Soldier',         1, 1, 25, 6,  72, 8,  2],
  [0x65, 'm', 'Ice Entity',                1, 2, 17, 4,  48, 6,  2],
  // ID  TYPE  NAME                        ΔL SW HIT DEF ATK EXP GLD
  [0x66, 'm', 'Red Living Rock',           1, 1, 16, 0,  26, 6,  2],
  [0x67, 'm', 'Ice Golem',                 0, 2, 45, 7,  48, 13, 2],
  [0x68, 'b', 'Kelbesque',                 0, 1, 63, 6,  59, 36, 0],
  [0x69, 'm', 'Giant Red Slime',           2, 1, 207,7,  96, 1,  1],
  [0x6A, 'm', 'Troll',                     2, 1, 19, 3,  46, 6,  2],
  [0x6B, 'm', 'Red Jelly',                 2, 1, 19, 3,  31, 5,  2],
  [0x6C, 'm', 'Medusa',                    2, 4, 18, 5,  75, 5,  4],
  [0x6D, 'm', 'Red Crab',                  2, 1, 17, 3,  45, 4,  2],
  [0x6E, 'm', 'Medusa Head',               2, 2, 16, 0,  61, 4,  2],
  [0x6F, 'm', 'Evil Bird',                 1, 2, 3,  0,  63, 6,  3],
  [0x71, 'm', 'Red/Purple Mushroom',       1, 2, 32, 4,  40, 8,  3],
  [0x72, 'm', 'Violet Earth Entity',       1, 1, 17, 3,  37, 10, 3],
  [0x73, 'm', 'Mimic',                     1, 2, 17, 0,  55, 12, 9],
  [0x74, 'm', 'Red Spider',                1, 2, 20, 5,  47, 10, 3],
  [0x75, 'm', 'Fishman',                   2, 1, 33, 4,  38, 6,  3],
  [0x76, 'm', 'Jellyfish',                 2, 1, 16, 0,  28, 7,  2],
  [0x77, 'm', 'Kraken',                    2, 1, 43, 5,  51, 8,  4],
  [0x78, 'm', 'Dark Green Wyvern',         0, 1, 21, 5,  34, 7,  3],
  [0x79, 'm', 'Sand Monster',              1, 1, 175,7,  10, 5,  2],
  [0x7B, 'm', 'Wraith Shadow 1',           1, 0, 0,  0,  19, 0,  0],
  [0x7C, 'm', 'Killer Moth',               1, 1, 4,  0,  70, 8,  0],
  [0x7D, 'b', 'Sabera',                    0, 2, 46, 5,  48, 32, 0],
  [0x80, 'm', 'Draygonia Archer',          1, 1, 18, 2,  41, 7,  3],
  [0x81, 'm', 'Evil Bomber Bird',          1, 2, 3,  0,  39, 6,  2],
  [0x82, 'm', 'Lavaman/blob',              1, 1, 21, 5,  48, 7,  3],
  // ID  TYPE  NAME                        ΔL SW HIT DEF ATK EXP GLD
  [0x84, 'm', 'Lizardman (w/ flail(',      1, 4, 16, 3,  61, 8,  3],
  [0x85, 'm', 'Giant Eye',                 1, 2, 33, 5,  66, 7,  2],
  [0x86, 'm', 'Salamander',                1, 1, 22, 3,  58, 12, 4],
  [0x87, 'm', 'Sorceror',                  1, 1, 37, 3,  63, 14, 3],
  [0x88, 'b', 'Mado',                      1, 4, 56, 7,  61, 24, 0],
  [0x89, 'm', 'Draygonia Knight',          2, 1, 22, 4,  48, 6,  2],
  [0x8A, 'm', 'Devil',                     2, 1, 4,  0,  36, 7,  2],
  [0x8B, 'b', 'Kelbesque 2',               1, 1, 25, 4,  55, 28, 0],
  [0x8C, 'm', 'Wraith Shadow 2',           1, 0, 0,  0,  34, 0,  0],
  [0x90, 'b', 'Sabera 2',                  1, 2, 79, 7,  55, 28, 0],
  [0x91, 'm', 'Tarantula',                 1, 2, 19, 5,  42, 12, 3],
  [0x92, 'm', 'Skeleton',                  1, 8, 5,  0,  61, 13, 3],
  [0x93, 'b', 'Mado 2',                    0, 4, 44, 8,  51, 28, 0],
  [0x94, 'm', 'Purple Giant Eye',          1, 1, 40, 5,  47, 7,  4],
  [0x95, 'm', 'Black Knight (w/ flail)',   1, 4, 22, 5,  53, 9,  4],
  [0x96, 'm', 'Scorpion',                  1, 8, 16, 5,  59, 10, 2],
  [0x97, 'b', 'Karmine',                   0, 8, 35, 7,  53, 28, 0],
  [0x98, 'm', 'Sandman/blob',              1, 8, 5,  5,  73, 9,  4],
  [0x99, 'm', 'Mummy',                     1, 4, 38, 7,  73, 12, 4],
  [0x9A, 'm', 'Tomb Guardian',             1, 1, 108,7,  74, 12, 3],
  [0x9B, 'b', 'Draygon',                   0, 8, 175,14, 82, 16, 0],
  [0x9E, 'b', 'Draygon 2',                 0, 8, 175,15, 81, 0,  0],
  [0xA0, 'm', 'Ground Sentry (1)',         0, 8, 20, 7,  53, 9,  2],
  [0xA1, 'm', 'Tower Defense Mech (2)',    0, 8, 24, 8,  73, 13, 4],
  [0xA2, 'm', 'Tower Sentinel',            0, 8, 3,  0,  0,  8,  0],
  // ID  TYPE  NAME                        ΔL SW HIT DEF ATK EXP GLD
  [0xA3, 'm', 'Air Sentry',                0, 8, 5,  4,  51, 11, 3],
  [0xA4, 'b', 'Dyna',                      0, 16,8,  7,  0,  0,  0],
  [0xA5, 'b', 'Vampire 2',                 1, 1, 24, 3,  54, 20, 0],
  [0xB4, 'b', 'dyna pod',                  0, 0, 0,  113,51, 0,  0],
  [0xB8, 'p', 'dyna counter',              0, 0, 0,  0,  52, 0,  0],
  [0xB9, 'p', 'dyna laser',                0, 0, 0,  0,  52, 0,  0],
  [0xBA, 'p', 'dyna bubble',               0, 0, 0,  0,  72, 0,  0],
  [0xBC, 'm', 'vamp2 bat',                 0, 1, 0,  0,  29, 0,  0],
  [0xBF, 'p', 'draygon2 fireball',         0, 0, 0,  0,  53, 0,  0],
  [0xC1, 'm', 'vamp1 bat',                 0, 1, 0,  0,  32, 0,  0],
  [0xC3, 'p', 'giant insect spit',         0, 0, 0,  0,  71, 0,  0],
  [0xC4, 'm', 'summoned insect',           1, 2, 18, 5,  102,0,  0],
  [0xC5, 'p', 'kelby1 rock',               0, 0, 0,  0,  45, 0,  0],
  [0xC6, 'p', 'sabera1 balls',             0, 0, 0,  0,  36, 0,  0],
  [0xC7, 'p', 'kelby2 fireballs',          0, 0, 0,  0,  21, 0,  0],
  [0xC8, 'p', 'sabera2 fire',              1, 0, 0,  0,  12, 0,  0],
  [0xC9, 'p', 'sabera2 balls',             0, 0, 0,  0,  31, 0,  0],
  [0xCA, 'p', 'karmine balls',             0, 0, 0,  0,  51, 0,  0],
  [0xCB, 'p', 'sun/moon statue fireballs', 0, 0, 0,  0,  53, 0,  0],
  [0xCC, 'p', 'draygon1 lightning',        0, 0, 0,  0,  82, 32, 0],
  [0xCD, 'p', 'draygon2 laser',            0, 0, 0,  0,  73, 0,  0],
  [0xCE, 'p', 'draygon2 breath',           0, 0, 0,  0,  73, 0,  0],
  [0xE0, 'p', 'evil bomber bird bomb',     0, 0, 0,  0,  3,  0,  0],
  [0xE2, 'p', 'summoned insect bomb',      0, 0, 0,  0,  94, 0,  0],
  [0xE3, 'p', 'paralysis beam',            0, 0, 0,  0,  45, 0,  0],
  // ID  TYPE  NAME                        ΔL SW HIT DEF ATK EXP GLD
  [0xE4, 'p', 'stone gaze',                0, 0, 0,  0,  50, 0,  0],
  [0xE5, 'p', 'rock golem rock',           0, 0, 0,  0,  36, 0,  0],
  [0xE6, 'p', 'curse beam',                0, 0, 0,  0,  19, 0,  0],
  [0xE7, 'p', 'mp drain web',              0, 0, 0,  0,  21, 0,  0],
  [0xE8, 'p', 'fishman trident',           0, 0, 0,  0,  22, 0,  0],
  [0xE9, 'p', 'orc axe',                   0, 0, 0,  0,  35, 0,  0],
  [0xEA, 'p', 'Swamp Pollen',              0, 0, 0,  0,  62, 0,  0],
  [0xEB, 'p', 'paralysis powder',          0, 0, 0,  0,  47, 0,  0],
  [0xEC, 'p', 'draygonia solider sword',   0, 0, 0,  0,  48, 0,  0],
  [0xED, 'p', 'ice golem rock',            0, 0, 0,  0,  34, 0,  0],
  [0xEE, 'p', 'troll axe',                 0, 0, 0,  0,  35, 0,  0],
  [0xEF, 'p', 'kraken ink',                0, 0, 0,  0,  36, 0,  0],
  [0xF0, 'p', 'draygonia archer arrow',    0, 0, 0,  0,  21, 0,  0],
  [0xF1, 'p', '??? unused',                0, 0, 0,  0,  21, 0,  0],
  [0xF2, 'p', 'draygonia knight sword',    0, 0, 0,  0,  22, 0,  0],
  [0xF3, 'p', 'moth residue',              0, 0, 0,  0,  31, 0,  0],
  [0xF4, 'p', 'ground sentry laser',       0, 0, 0,  0,  25, 0,  0],
  [0xF5, 'p', 'tower defense mech laser',  0, 0, 0,  0,  46, 0,  0],
  [0xF6, 'p', 'tower sentinel laser',      0, 0, 0,  0,  15, 0,  0],
  [0xF7, 'p', 'skeleton shot',             0, 0, 0,  0,  21, 0,  0],
  [0xF8, 'p', 'lavaman shot',              0, 0, 0,  0,  21, 0,  0],
  [0xF9, 'p', 'black knight flail',        0, 0, 0,  0,  35, 0,  0],
  [0xFA, 'p', 'lizardman flail',           0, 0, 0,  0,  38, 0,  0],
  [0xFC, 'p', 'mado shuriken',             0, 0, 0,  0,  67, 0,  0],
  [0xFD, 'p', 'guardian statue missile',   0, 0, 0,  0,  38, 0,  0],
  [0xFE, 'p', 'demon wall fire',           0, 0, 0,  0,  38, 0,  0],
].map(([id, type, name, ladj, sword, hits, def, atk, exp, gold]) =>
      [id, {id, type, name, ladj, sword, hits, def, atk, exp, gold}]));

// When dealing with constraints, it's basically ksat
//  - we have a list of requirements that are ANDed together
//  - each is a list of predicates that are ORed together
//  - each predicate has a continuation for when it's picked
//  - need a way to thin the crowd, efficiently check compat, etc
// Predicate is a four-element array [pat0,pat1,pal2,pal3]
// Rather than a continuation we could go through all the slots again


// class Constraints {
//   constructor() {
//     // Array of pattern table options.  Null indicates that it can be anything.
//     // 
//     this.patterns = [[null, null]];
//     this.palettes = [[null, null]];
//     this.flyers = 0;
//   }

//   requireTreasureChest() {
//     this.requireOrderedSlot(0, TREASURE_CHEST_BANKS);
//   }

//   requireOrderedSlot(slot, set) {
    
//     if (!this.ordered) {

//     }
// // TODO
//     this.pat0 = intersect(this.pat0, set);


//   }

  

// }

// const intersect = (left, right) => {
//   if (!right) throw new Error('right must be nontrivial');
//   if (!left) return right;
//   const out = new Set();
//   for (const x of left) {
//     if (right.has(x)) out.add(x);
//   }
//   return out;  
// }


// A pool of monster spawns, built up from the locations in the rom.
// Passes through the locations twice, first to build and then to 
// reassign monsters.
class MonsterPool {
  constructor() {
    // available monsters
    this.monsters = [];
    // used monsters - as a backup if no available monsters fit
    this.used = [];
    // all locations
    this.locations = [];
  }

  // TODO - monsters w/ projectiles may have a specific bank they need to appear in,
  // since the projectile doesn't know where it came from...?
  //   - for now, just assume if it has a child then it must keep same pattern bank!

  populate(/** !Location */ location) {
    const {maxFlyers, nonFlyers = {}, skip, fixedSlots = {}, ...unexpected} =
          MONSTER_ADJUSTMENTS[location.id] || {};
    for (const u in unexpected) {
      throw new Error(
          `Unexpected property '${u}' in MONSTER_ADJUSTMENTS[${location.id}]`);
    }
    if (skip || !location.spritePatterns || !location.spritePalettes) return;
    const monsters = [];
    const slots = [];
    //const constraints = {};
    let treasureChest = false;
    let slot = 0x0c;
    for (const o of location.objects || []) {
      ++slot;
      if (o[2] & 7) continue;
      const id = o[3] + 0x50;
      if (id in UNTOUCHED_MONSTERS) continue;
      const object = location.rom.objects[id];
      if (!object) continue;
      const patBank = o[2] & 0x80 ? 1 : 0;
      const pat = location.spritePatterns[patBank];
      const pal = object.palettes(true);
      const pal2 = pal.includes(2) ? location.spritePalettes[0] : null;
      const pal3 = pal.includes(3) ? location.spritePalettes[1] : null;
      monsters.push({id, pat, pal2, pal3, patBank});
      slots.push(slot);
    }
    if (!monsters.length) return;
    this.locations.push({location, slots});
    this.monsters.push(...monsters);
  }

  shuffle(random) {
    random.shuffle(this.locations);
    random.shuffle(this.monsters);
    while (this.locations.length) {
      const {location, slots} = this.locations.pop();
      const {maxFlyers, nonFlyers = {}, fixedSlots = {}} =
            MONSTER_ADJUSTMENTS[location.id] || {};
let console=location.id==3?window.console:{log(){}};
console.log(`Location ${location.id.toString(16)}`);
      // Keep track of pattern and palette slots we've pinned.
      // It might be nice to have a mode where palette conflicts are allowed,
      // and we just go with one or the other, though this could lead to poisonous
      // blue slimes and non-poisonous red slimes by accident.
      let pat0 = fixedSlots.pat0 || null;
      let pat1 = fixedSlots.pat1 || null;
      let pal2 = fixedSlots.pal2 || null;
      let pal3 = fixedSlots.pal3 || null;
      let flyers = maxFlyers; // count down...

      // Determine location constraints
      let treasureChest = false;
      for (const o of location.objects || []) {
        if ((o[2] & 7) == 2) treasureChest = true;
        if (o[2] & 7) continue;
        const id = o[3] + 0x50;
        if (id == 0x7e || id == 0x7f || id == 0x9f) {
          pat1 = 0x62;
        } else if (id == 0x8f) {
          pat0 = 0x61;
        }
      }

      const tryAddMonster = (m) => {
        const flyer = FLYERS.has(m.id);
        const moth = MOTHS_AND_BATS.has(m.id);
        if (flyer) {
          // TODO - add a small probability of adding it anyway, maybe
          // based on the map area?  25 seems a good threshold.
          if (!flyers) return false;
          --flyers;
        }
        if (pal2 != null && m.pal2 != null && pal2 != m.pal2 ||
            pal3 != null && m.pal3 != null && pal3 != m.pal3) {
          return false;
        }
        // whether we can put this one in pat0
        const pat0ok = !treasureChest || TREASURE_CHEST_BANKS.has(m.pat);
        let patSlot;
        if (location.rom.objects[m.id].child) {
          // if there's a child, make sure to keep it in the same pattern slot
          patSlot = m.patSlot ? 0x80 : 0;
          const prev = patSlot ? pa1 : pat0;
          if (prev != null && prev != m.pat) return false;
          if (patSlot) {
            pat1 = m.pat;
          } else if (pat0ok) {
            pat0 = m.pat;
          } else {
            return false;
          }


// NOTE - seed=3214314284 sealed cave has weird sprites

// NOTE - seed=1759221509 treasure chest screwed up in presence of solider
//   - seems like there's a fixed set of patterns we can use if a chest is around?
//   - arrows are messed up, too.
// NOTE - scaling vampire HP is broken - he teleports way too fast

          // TODO - if [pat0,pat1] were an array this would be a whole lot easier.
console.log(`  Adding ${m.id.toString(16)}: pat(${patSlot}) <-  ${m.pat.toString(16)}`);
        } else {
          if (pat0 == null && pat0ok || pat0 == m.pat) {
            pat0 = m.pat;
            patSlot = 0;
console.log(`  Adding ${m.id.toString(16)}: pat0 <-  ${m.pat.toString(16)}`);
          } else if (pat1 == null || pat1 == m.pat) {
            pat1 = m.pat;
            patSlot = 0x80;
console.log(`  Adding ${m.id.toString(16)}: pat1 <-  ${m.pat.toString(16)}`);
          } else {              
            return false;
          }
        }
        if (m.pal2 != null) pal2 = m.pal2;
        if (m.pal3 != null) pal3 = m.pal3;
console.log(`    ${Object.keys(m).map(k=>`${k}: ${m[k]}`).join(', ')}`);
console.log(`    pal: ${(m.pal2||0).toString(16)} ${(m.pal3||0).toString(16)}`);

        // Pick the slot only after we know for sure that it will fit.
        let eligible = 0;
        if (flyer || moth) {
          // look for a flyer slot if possible.
          for (let i = 0; i < slots.length; i++) {
            if (slots[i] in nonFlyers) {
              eligible = i;
              break;
            }
          }
        } else {
          // Prefer non-flyer slots, but adjust if we get a flyer.
          for (let i = 0; i < slots.length; i++) {
            if (slots[i] in nonFlyers) continue;
            eligible = i;
            break;
          }
        }
        const slot = slots[eligible];
        const objData = location.objects[slot - 0x0d];
        if (slot in nonFlyers) {
          objData[0] += nonFlyers[slot][0];
          objData[1] += nonFlyers[slot][1];
        }
        objData[2] = objData[2] & 0x7f | patSlot;
        objData[3] = m.id - 0x50;
console.log(`    slot ${slot.toString(16)}: objData=${objData}`);

        // TODO - anything else need splicing?

        slots.splice(eligible, 1);
        return true;
      };



      if (flyers) {
        // look for an eligible flyer in the first 40.  If it's there, add it first.
        for (let i = 0; i < Math.min(40, this.monsters.length); i++) {
          if (FLYERS.has(this.monsters[i].id)) {
            if (tryAddMonster(this.monsters[i])) {
              this.monsters.splice(i, 1);
            }
          }
          random.shuffle(this.monsters);
        }

        // maybe added a single flyer, to make sure we don't run out.  Now just work normally

        // decide if we're going to add any flyers.

        // also consider allowing a single random flyer to be added out of band if
        // the size of the map exceeds 25?


        // probably don't add flyers to used?


      }

      // iterate over monsters until we find one that's allowed...
      // NOTE: fill the non-flyer slots first (except if we pick a flyer??)
      //   - may need to weight flyers slightly higher or fill them differently?
      //     otherwise we'll likely not get them when we're allowed...?
      //   - or just do the non-flyer *locations* first?
      // - or just fill up flyers until we run out... 100% chance of first flyer,
      //   50% chance of getting a second flyer if allowed...
      for (let i = 0; i < this.monsters.length; i++) {
        if (!slots.length) break;
        if (tryAddMonster(this.monsters[i])) {
          const [used] = this.monsters.splice(i, 1);
          if (!FLYERS.has(used.id)) this.used.push(used);
          i--;
        }
      }

      // backup list
      for (let i = 0; i < this.used.length; i++) {
        if (!slots.length) break;
        if (tryAddMonster(this.used[i])) {
          this.used.push(...this.used.splice(i, 1));
          i--;
        }
      }

      if (pat0 != null) location.spritePatterns[0] = pat0;
      if (pat1 != null) location.spritePatterns[1] = pat1;
      if (pal2 != null) location.spritePalettes[0] = pal2;
      if (pal3 != null) location.spritePalettes[1] = pal3;

      if (slots.length) console.log(`Failed to fill location ${location.id.toString(16)}: ${slots.length} remaining`);
    }
  }
}

const FLYERS = new Set([0x59, 0x5c, 0x6e, 0x6f, 0x81, 0x8a, 0xa3, 0xc4]);
const MOTHS_AND_BATS = new Set([0x55, 0x7c, 0xbc, 0xc1]);
const SWIMMERS = new Set([0x75, 0x76]);
const STATIONARY = new Set([0x5d, 0x77, 0x87]);  // swamp plant, kraken, sorceror

// constrains pat0 if map has a treasure chest on it
const TREASURE_CHEST_BANKS = new Set([
  0x5e, 0x5f, 0x60, 0x61, 0x64, 0x65, 0x66, 0x67,
  0x68, 0x69, 0x6a, 0x6c, 0x6d, 0x6e, 0x6f, 0x70,
  0x74, 0x75, 0x76, 0x77,
]);

const MONSTER_ADJUSTMENTS = {
  [0x03]: { // Valley of Wind
    maxFlyers: 2,
    fixedSlots: {
      pat1: 0x60, // required by windmill
    },
  },
  [0x07]: { // Sealed Cave 4
    nonFlyers: {
      [0x0f]: [0, -3],  // bat
      [0x10]: [-10, 0], // bat
      [0x11]: [0, 4],   // bat
    },
  },
  [0x14]: { // Cordel West
    maxFlyers: 2,
  },
  [0x15]: { // Cordel East
    maxFlyers: 2,
  },
  [0x1a]: { // Swamp
    skip: true,
    maxFlyers: 2,
    fixedSlots: {
      pat1: 0x4f,
      pal3: 0x23,
    },
  },
  [0x1b]: { // Amazones
    // Random blue slime should be ignored
    skip: true,
  },
  [0x20]: { // Mt Sabre West Lower
    maxFlyers: 1,
  },
  [0x21]: { // Mt Sabre West Upper
    maxFlyers: 1,
    fixedSlots: {
      pat1: 0x50,
      //pal2: 0x06, // might be fine to change tornel's color...
    },
  },
  [0x27]: { // Mt Sabre West Cave 7
    nonFlyers: {
      [0x0d]: [0, 0x10], // random enemy stuck in wall
    },
  },
  [0x28]: { // Mt Sabre North Main
    maxFlyers: 1,
  },
  [0x29]: { // Mt Sabre North Middle
    maxFlyers: 1,
  },
  [0x2b]: { // Mt Sabre North Cave 2
    nonFlyers: {
      [0x14]: [0x20, -8], // bat
    },
  },
  [0x40]: { // Waterfall Valley North
    maxFlyers: 2,
    nonFlyers: {
      [0x13]: [12, -0x10], // medusa head
    },
  },
  [0x41]: { // Waterfall Valley South
    maxFlyers: 2,
    nonFlyers: {
      [0x15]: [0, -6], // medusa head
    },
  },
  [0x42]: { // Lime Tree Valley
    maxFlyers: 2,
    nonFlyers: {
      [0x0d]: [0, 8], // evil bird
      [0x0e]: [-8, 8], // evil bird
    },
  },
  [0x47]: { // Kirisa Meadow
    maxFlyers: 1,
    nonFlyers: {
      [0x0d]: [-8, -8],
    },
  },
  [0x4a]: { // Fog Lamp Cave 3
    maxFlyers: 1,
    nonFlyers: {
      [0x0e]: [4, 0],  // bat
      [0x0f]: [0, -3], // bat
      [0x10]: [0, 4],  // bat
    },
  },
  [0x4c]: { // Fog Lamp Cave 4
    // maxFlyers: 1,
  },
  [0x4d]: { // Fog Lamp Cave 5
    maxFlyers: 1,
  },
  [0x4e]: { // Fog Lamp Cave 6
    maxFlyers: 1,
  },
  [0x4f]: { // Fog Lamp Cave 7
    // maxFlyers: 1,
  },
  [0x59]: { // Tower Floor 1
    skip: true,
  },
  [0x5a]: { // Tower Floor 2
    skip: true,
  },
  [0x5b]: { // Tower Floor 3
    skip: true,
  },
  [0x60]: { // Angry Sea
    skip: true, // not sure how to randomize these well
    maxFlyers: 2,
    fixedSlots: {
      pat1: 0x52, // (as opposed to pat0)
      pal3: 0x08,
    },
  },
  [0x64]: { // Underground Channel
    skip: true,
    fixedSlots: {
      pat1: 0x52, // (as opposed to pat0)
      pal3: 0x08,
    },
  },
  [0x68]: { // Evil Spirit Island 1
    skip: true,
    fixedSlots: {
      pat1: 0x52, // (as opposed to pat0)
      pal3: 0x08,
    },
  },
  [0x69]: { // Evil Spirit Island 2
    maxFlyers: 1,
    nonFlyers: {
      [0x17]: [4, 6],  // medusa head
    },
  },
  [0x6a]: { // Evil Spirit Island 3
    maxFlyers: 1,
    nonFlyers: {
      [0x15]: [0, 0x18],  // medusa head
    },
  },
  [0x6c]: { // Sabera Palace 1
    maxFlyers: 1,
    nonFlyers: {
      [0x17]: [0, 0x18], // evil bird
    },
  },
  [0x6d]: { // Sabera Palace 2
    maxFlyers: 1,
    nonFlyers: {
      [0x11]: [0x10, 0], // moth
      [0x1b]: [0, 0],    // moth - ok already
      [0x1c]: [6, 0],    // moth
    },
  },
  [0x78]: { // Goa Valley
    maxFlyers: 1,
    nonFlyers: {
      [0x16]: [-8, -8], // evil bird
    },
  },
  [0x7c]: { // Mt Hydra
    maxFlyers: 1,
    nonFlyers: {
      [0x15]: [-0x27, 0x54], // evil bird
    },
  },
  [0x84]: { // Mt Hydra Cave 7
    nonFlyers: {
      [0x12]: [0, -4],
      [0x13]: [0, 4],
      [0x14]: [-6, 0],
      [0x15]: [10, 0],
    },
  },
  [0x88]: { // Styx 1
    maxFlyers: 1,
  },
  [0x89]: { // Styx 2
    maxFlyers: 1,
  },
  [0x8a]: { // Styx 1
    maxFlyers: 1,
    nonFlyers: {
      [0x0d]: [7, 0], // moth
      [0x0e]: [0, 0], // moth - ok
      [0x0f]: [7, 3], // moth
      [0x10]: [0, 6], // moth
      [0x11]: [11, -0x10], // moth
    },
  },
  [0x8f]: { // Goa Fortress - Oasis Cave Entrance
    skip: true,
  },
  [0x90]: { // Desert 1
    maxFlyers: 2,
    nonFlyers: {
      [0x14]: [-0xb, -3], // bomber bird
      [0x15]: [0, 0x10],  // bomber bird
    },
  },
  [0x91]: { // Oasis Cave
    maxFlyers: 2,
    nonFlyers: {
      [0x18]: [0, 14],    // insect
      [0x19]: [4, -0x10], // insect
    },
  },
  [0x98]: { // Desert 2
    maxFlyers: 2,
    nonFlyers: {
      [0x14]: [-6, 6],    // devil
      [0x15]: [0, -0x10], // devil
    },
  },
  [0x9e]: { // Pyramid Front - Main
    maxFlyers: 2,
  },
  [0xa2]: { // Pyramid Back - Branch
    maxFlyers: 1,
    nonFlyers: {
      [0x12]: [0, 11], // moth
      [0x13]: [6, 0],  // moth
    },
  },
  [0xa5]: { // Pyramid Back - Hall 2
    nonFlyers: {
      [0x17]: [6, 6],   // moth
      [0x18]: [-6, 0],  // moth
      [0x19]: [-1, -7], // moth
    },
  },
  [0xa6]: { // Draygon 2
    // Has a few blue slimes that aren't real and should be ignored.
    skip: true,
  },
  [0xa8]: { // Goa Fortress - Entrance
    skip: true,
  },
  [0xa9]: { // Goa Fortress - Kelbesque
    maxFlyers: 2,
    nonFlyers: {
      [0x16]: [0x1a, -0x10], // devil
      [0x17]: [0, 0x20],     // devil
    },
  },
  [0xab]: { // Goa Fortress - Sabera
    maxFlyers: 2,
    nonFlyers: {
      [0x0d]: [1, 0],  // insect
      [0x0e]: [2, -2], // insect
    },
  },

  [0xad]: { // Goa Fortress - Mado 1
    maxFlyers: 2,
    nonFlyers: {
      [0x18]: [0, 8],  // devil
      [0x19]: [0, -8], // devil
    },
  },
  [0xaf]: { // Goa Fortress - Mado 3
    nonFlyers: {
      [0x0d]: [0, 0],  // moth - ok
      [0x0e]: [0, 0],  // broken - but replace?
      [0x13]: [0x3b, -0x26], // shadow - embedded in wall
    },
  },
  [0xb4]: { // Goa Fortress - Karmine 5
    maxFlyers: 2,
    nonFlyers: {
      [0x11]: [6, 0],  // moth
      [0x12]: [0, 6],  // moth
    },
  },
  [0xd7]: { // Portoa Palace - Entry
    // There's a random slime in this room that would cause glitches
    skip: true,
  },
};





const UNTOUCHED_MONSTERS = { // not yet +0x50 in these keys
  [0x7e]: true, // vertical platform
  [0x7f]: true, // horizontal platform
  [0x8e]: true, // broken?, but sits on top of iron wall
  [0x8f]: true, // shooting statue
  [0x9f]: true, // vertical platform
};
