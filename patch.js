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
    const parsed = new Rom(rom);
    adjustObjectDifficultyStats(rom, parsed, random);
    fixShaking.apply(rom);
    preventSwordClobber.apply(rom);
    upgradeBallsToBracelets.apply(rom);
    scaleDifficultyLib.apply(rom);
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
`, 'fixShaking'));


// TODO - buff medical herb - change $1c4ea from $20 to e.g. $60,
//   or else have it scale with difficulty?
//   - (diff + 1) << 4 ? 


export const disableWildWarp = buildRomPatch(assemble(`
;;; NOTE: this actually recovers 36 bytes of prime real estate PRG.
.bank $3c000 $c000:$4000
.org $3cbc7
  rts
`, 'disableWildWarp'));


export const preventSwordClobber = buildRomPatch(assemble(`
.bank $3c000 $c000:$4000
.bank $20000 $8000:$4000

.org $20534
  lda #$02
.org $205a7
  .byte $0c
.org $205a9
  .byte $04
`, 'preventSwordClobber'));

export const upgradeBallsToBracelets = buildRomPatch(assemble(`
.bank $3c000 $c000:$4000
.bank $1c000 $8000:$2000

.org $1c2de
  lda $29
  bcc +
   inc $6430,x
   bne ItemGet_Bracelet
   lsr
   lda $29
   sbc #$00
   sta $23
+ sta $6430,x
  rts
.org $1c2f4
ItemGet_Bracelet:
`, 'upgradeBallsToBracelets'));

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
`, 'neverDie'));


export const fixVampire = buildRomPatch(assemble(`
;;; Fix the vampire to allow >60 HP
.bank $3c000 $c000:$4000
.bank $1e000 $a000:$2000
.org $1e576
  jsr ComputeVampireAnimationStart
  nop
.org $1ff97 ; This looks like it's just junk at the end, but we could
            ; probably go to $1ff47 if we don't care about developer mode
ComputeVampireAnimationStart:
   bcs +
   asl
   bcs +
   adc #$10
   bcc ++
+  lda #$ff
++ rts
`, 'fixVampire'));

// NOTE: if we insert at $3c406 then we have $11 as scratch space, too!
// Extra code for difficulty scaling
export const scaleDifficultyLib = buildRomPatch(assemble(`
.bank $3c000 $c000:$4000 ; fixed bank

define Difficulty $4c0
define PlayerLevel $421
define ObjectRecoil $340
define ObjectHP $3c0
define PlayerMaxHP $3c0
define ObjectAtk $3e0
define PlayerAtk $3e1
define ObjectDef $400
define ObjectActionScript $4a0
define ObjectGold $500
define ObjectElementalDefense $500
define ObjectExp $520

define SFX_MONSTER_HIT       $21
define SFX_ATTACK_IMMUNE     $3a

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

.org $1c26f
ItemGet:

.org $1c299
  jmp ItemGet_RaiseDifficulty
.org $1c2a0

.org $3ff44
ItemGet_RaiseDifficulty:
   ;; Raise difficulty iff the last element is $FE
   bmi +
    jmp ItemGet
+  lsr
   bcs +
    lda Difficulty
    cmp #$2f
    bcs +
     inc Difficulty
+  rts

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

SubtractEnemyHP:
  ;; NOTE: we could probably afford to move a few of these back if needed
  lda ObjectHP,y
  sec
  sbc $63
  sta ObjectHP,y
  lda $61
  sbc #$00
  rts
.org $3ff80


.org $3c010
;; Adjusted inventory update - use level instead of sword
   ldy $0719  ; max charge level
   lda #$01
-   asl
    dey
   bpl -
   clc
   ldy $0716  ; equipped passive item
   adc $0421  ; player level
   dey
   cpy #$0d   ; power ring - 1
   beq -
   sta $03e1  ; player attack
   lda $0421  ; player level
   cpy #$0f   ; iron necklace - 1
.org $3c02d   ; NOTE - MUST BE EXACT!!!!
   

.bank $34000 $8000:$4000 ; item use code


;; Adjusted stsab damage for populating sword object ($02)
.org $35c5f
  lda #$02
  sta $03e2
  rts


;; ADJUSTED DAMAGE CALCULATIONS
;; $61 is extra HP bit(s)
;; $62 is DEF
;; $63 is damage
.org $350fa
    lda #$00
    sta $61
    sta $63
    ;; Check elemental immunity
    lda ObjectElementalDefense,y
    and ObjectElementalDefense,x
    and #$0f
    bne +
    lda ObjectDef,y
    lsr     ; Just pull one extra bit for HP, could do one more if needed
    rol $61
    sta $62 ; Store actual shifted DEF in $62
    lda PlayerAtk
    adc ObjectAtk,x
    sec
    sbc $62 ; A <- atk - def
    bcc +
     sta $63
+   stx $10
    sty $11
    lda $63
    bne ++
      sta ObjectActionScript,x
      lda ObjectActionScript,y
      bmi +
       jsr KnockbackObject
+     lda #SFX_ATTACK_IMMUNE
      inc $63
      bne +++
++   jsr KnockbackObject
     lda #SFX_MONSTER_HIT
+++ jsr StartAudioTrack
    jsr SubtractEnemyHP
     bcc KillObject
    lsr
    lda $62
    rol
    sta ObjectDef,y
    rts
;;; NOTE: must finish before 35152
.org $35152
KillObject:
.org $355c0
KnockbackObject:
.org $3c125
StartAudioTrack:


.bank $1a000 $a000:$2000 ; object data
.org $3c409
  jmp ComputeEnemyStats

.org $1bb00  ; This should leave some space after compression

DiffAtk:   ; PAtk*8
  .byte $28,$2C,$30,$33,$37,$3B,$3F,$42,$46,$4A,$4E,$51,$55,$59,$5D,$60
  .byte $64,$68,$6C,$6F,$73,$77,$7B,$7E,$82,$86,$8A,$8D,$91,$95,$99,$9C
  .byte $A0,$A4,$A8,$AB,$AF,$B3,$B7,$BA,$BE,$C2,$C6,$C9,$CD,$D1,$D5,$D8
DiffDef:   ; PDef * 4
  .byte $0C,$0F,$12,$15,$18,$1B,$1E,$21,$24,$27,$2A,$2D,$30,$33,$36,$39
  .byte $3C,$3F,$42,$45,$48,$4B,$4E,$51,$54,$57,$5A,$5D,$60,$63,$66,$69
  .byte $6C,$6F,$72,$75,$78,$7B,$7E,$81,$84,$87,$8A,$8D,$90,$93,$96,$99
DiffHP:    ; PHP (0..$26)
  .byte $30,$36,$3B,$41,$46,$4C,$51,$57,$5C,$62,$67,$6D,$72,$78,$7D,$83
  .byte $88,$8E,$93,$99,$9E,$A4,$A9,$AF,$B4,$BA,$BF,$C5,$CA,$D0,$D5,$DB
  .byte $E0,$E6,$EB,$F1,$F6,$FC,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF
DiffExp:   ; ExpBase * 4, encoded in standard EXP encoding
  .byte $05,$06,$08,$0A,$0C,$0E,$12,$16,$1A,$20,$27,$30,$3A,$47,$56,$69
  .byte $80,$81,$83,$86,$89,$8D,$91,$97,$9E,$A6,$B0,$BC,$CA,$DC,$F2,$FF
  .byte $FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF

;;; $12 and $13 are free RAM at this point

.org $1bbd0  ; Note: this follows immediately from the tables.
ComputeEnemyStats:
  lda ObjectRecoil,x
  bmi +
   jmp $3c2af ; exit point
+ and #$7f
  sta ObjectRecoil,x
  ldy Difficulty
RescaleDefAndHP:
   ;; HP = max(PAtk + SWRD - DEF, 1) * HITS - 1
   ;; DiffAtk = 8 * PAtk
   ;; DEF = (8 * PAtk) * SDEF / 64   (alt, SDEF = 8 * DEF / PAtk)
   lda ObjectHP,x
    beq RescaleAtk
   ;; Start by computing 8*DEF, but don't write it to DEF yet.
+  lda ObjectDef,x
   pha
    and #$0f
    sta $62 ; SDEF
   pla
   and #$f0
   lsr
   sta $12 ; 8*SWRD (Note: we could store this on the stack)
   lda DiffAtk,y
   sta $61 ; 8 * PAtk
   jsr Multiply16Bit  ; $61$62 <- 64*DEF
   ;; Multiply by 4 and read off the high byte.
   lda $62
   asl $61
   rol
   asl $61
   rol
   sta ObjectDef,x
   ;; Now compute 8*PAtk + 8*SWRD - 8*DEF
   asl
   bcs +
    asl
    bcs +
     asl
     bcc ++
+     lda #$ff        ; overflow, so just use $ff.
++ sta $61            ; $61 <- 8*DEF
   ;; Subtract from 8*PAtk.  This may go negative, in which case
   ;; we store the #$ff in $62.  We start with 1 and unconditionally
   ;; decrement at the end so that we can check its zeroness and sign
   ;; without destroying the accumulator.
   lda #$01
   sta $62
   lda DiffAtk,y
   sec
   sbc $61
   bcs +
    dec $62
   ;; Now add 8*SWRD, again carrying into $62.
+  clc
   adc $12
   bcc +
    inc $62
+  dec $62
   ;; Check for overflow - if $62 == 1 then set A <- $ff
   beq ++
    bpl +
     lda #$ff
     bmi ++
+   lda #$00
++ sta $61
   ;; Now check if A is zero, in which case we need to increment it.
   ora #$0
   bne +
    inc $61
   ;; Multiply by hits, then divide by 8
+  lda ObjectHP,x
   sta $62
   jsr Multiply16Bit
   ;; Subtract 1
   lda $61
   sec
   sbc #$01
   bcs +
    dec $62
   ;; Divide by 8
+  lsr $62
   ror
   lsr $62
   ror
   lsr $62
   ror                ; A is low byte of HP, $62 is high byte.
   ;; Check the high part of HP.  One bit will be rotated into the DEF byte.
   lsr $62
   ;; If there's anything left in $62 then we've overflowed.
   beq +
    lda #$ff
    sec
+  rol ObjectDef,x
   sta ObjectHP,x
RescaleAtk:
  ;; DiffDef = 4 * PDef
  ;; DiffHP = PHP
  ;; ATK = (4 * PDef + PHP * SAtk / 32) / 4
  lda ObjectAtk,x
   beq RescaleGold
  sta $61
  lda DiffHP,y
  sta $62
  jsr Multiply16Bit
  lda $61
  lsr $62
  ror
  lsr $62
  ror
  lsr $62
  ror
  lsr $62
  ror
  lsr $62
  ror
  clc
  adc DiffDef
  lsr $62
  ror
  lsr $62
  ror
  sta ObjectAtk,x
RescaleGold:
  ;; GOLD = min(15, (8 * DGLD + 3 * DIFF) / 16)
  lda ObjectGold,x
  and #$f0
   beq RescaleExp
  lsr
  sta $61
  lda Difficulty
  asl
  adc Difficulty
  adc $61
  bcc +
   lda #$f0
+ and #$f0
  sta $61
  lda ObjectGold,x
  and #$0f
  ora $61
  sta ObjectGold,x
RescaleExp:
  ;; EXP = min(2032, DiffExp * SEXP)
  ;; NOTE: SEXP is compressed for values > $7f.
  lda ObjectExp,x
   beq RescaleDone
  sta $61
  lda DiffExp,y
  php ; keep track of whether we were compressed or not.
   and #$7f
   sta $62
   jsr Multiply16Bit  
  plp
  bmi ++
    ;; No scaling previously.  $61$62 is 128*EXP.
    ;; If EXP >= 128 then 128*EXP >= #$4000
    lda $62
    cmp #$40
    bcc +
     ;; $62 >= #$40 - need scaling now.
     ;; EXP/16 = ($80*EXP)/$800
     lsr
     lsr
     lsr
     ora #$80
     bne +++ ; uncond
    ;; No rescaling needed, rotate left one.
+   asl $61
    rol
    ;; Now A is EXP, A<128 guaranteed.  Make sure it's not zero.
    bne +++
    lda #$01
    bne +++ ; uncond
   ;; Was previously scaled - just re-add and carry.
++ asl $61
   rol
   bcs +
    adc #$80
    bcc +++
+    lda #$ff
+++ sta ObjectExp,x
RescaleDone:
   jmp $3c2af

Multiply16Bit:
  ;; Multiplies inputs in $61 and $62, then shifts
  ;; right A times.
  ;; Result goes $61$62 (lo hi), preserves XY
  ;; Sets carry if result doesn't fit in 8 bits
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
  cmp #$01 ; set carry if A != 0
  pla
  tax
  rts
`, 'scaleDifficultyLib'));



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

  for (const [id, {sdef, swrd, hits, satk, dgld, sexp}] of SCALED_MONSTERS) {
    // indicate that this object needs scaling
    const o = rom.objects[id].objectData;
    const boss =
        [0x57, 0x5e, 0x68, 0x7d, 0x88, 0x97, 0x9b, 0x9e].includes(id) ? 1 : 0;
    o[2] |= 0x80; // recoil
    o[6] = hits; // HP
    o[7] = satk;  // ATK
    // Sword: 0..3 (wind - thunder) preserved, 4 (crystalis) => 7
    o[8] = sdef | swrd << 4; // DEF
    o[9] = o[9] & 0xe0 | boss;
    o[16] = o[16] & 0x0f | dgld << 4; // GLD
    o[17] = sexp; // EXP
  }

  rom.writeObjectData();

  const pool = new MonsterPool();
  for (const loc of rom.locations) {
    if (loc) pool.populate(loc);
  }
  pool.shuffle(random);

  rom.writeNpcData();

  // Tag key items for difficulty buffs
  for (const get of rom.itemGets) {
    const item = ITEMS.get(get.item);
    if (!item || !item.key) continue;
    if (!get.table) throw new Error(`No table for ${item.name}`);
    if (get.table[get.table.length - 1] == 0xff) {
      get.table[get.table.length - 1] = 0xfe;
    } else {
      throw new Error('Expected FF at end of ItemGet table');
    }
    get.write(rom);
  }
};


const SCALED_MONSTERS = new Map([
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0x3f, 'p', 'Sorceror shot',              ,   ,   ,    17,  ,    ,],
  [0x4b, 'm', 'wraith??',                   2,  ,   2,   22,  4,   61],
  [0x4f, 'm', 'wraith',                     1,  ,   2,   20,  4,   61],
  [0x50, 'm', 'Blue Slime',                 ,   ,   1,   16,  2,   32],
  [0x51, 'm', 'Weretiger',                  ,   ,   1,   22,  4,   40],
  [0x52, 'm', 'Green Jelly',                4,  ,   3,   16,  4,   36],
  [0x53, 'm', 'Red Slime',                  6,  ,   4,   16,  4,   48],
  [0x54, 'm', 'Rock Golem',                 6,  ,   11,  24,  6,   85],
  [0x55, 'm', 'Blue Bat',                   ,   ,   ,    4,   ,    32],
  [0x56, 'm', 'Green Wyvern',               4,  ,   4,   24,  6,   52],
  [0x57, 'b', 'Vampire',                    3,  ,   13,  18,  ,    136],
  [0x58, 'm', 'Orc',                        3,  ,   4,   21,  4,   57],
  [0x59, 'm', 'Red Flying Swamp Insect',    3,  ,   1,   22,  4,   57],
  [0x5a, 'm', 'Blue Mushroom',              2,  ,   1,   27,  4,   48],
  [0x5b, 'm', 'Swamp Tomato',               3,  ,   2,   35,  4,   52],
  [0x5c, 'm', 'Flying Meadow Insect',       3,  ,   3,   24,  4,   81],
  [0x5d, 'm', 'Swamp Plant',                ,   ,   ,    ,    ,    36],
  [0x5e, 'b', 'Insect',                     ,   1,  8,   8,   ,    136],
  [0x5f, 'm', 'Large Blue Slime',           5,  ,   3,   20,  4,   52],
  [0x60, 'm', 'Ice Zombie',                 5,  ,   7,   14,  4,   57],
  [0x61, 'm', 'Green Living Rock',          ,   ,   1,   9,   4,   28],
  [0x62, 'm', 'Green Spider',               4,  ,   4,   22,  4,   44],
  [0x63, 'm', 'Red/Purple Wyvern',          3,  ,   4,   30,  4,   65],
  [0x64, 'm', 'Draygonia Soldier',          6,  ,   11,  36,  4,   89],
  [0x65, 'm', 'Ice Entity',                 3,  ,   2,   24,  4,   52],
  [0x66, 'm', 'Red Living Rock',            ,   ,   1,   13,  4,   40],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0x67, 'm', 'Ice Golem',                  7,  2,  11,  24,  4,   81],
  [0x68, 'b', 'Kelbesque',                  4,  2,  12,  30,  ,    176],
  [0x69, 'm', 'Giant Red Slime',            7,  ,   40,  48,  4,   102],
  [0x6a, 'm', 'Troll',                      2,  ,   3,   24,  4,   65],
  [0x6b, 'm', 'Red Jelly',                  2,  ,   2,   14,  4,   44],
  [0x6c, 'm', 'Medusa',                     3,  ,   4,   37,  8,   77],
  [0x6d, 'm', 'Red Crab',                   2,  ,   1,   22,  4,   44],
  [0x6e, 'm', 'Medusa Head',                ,   ,   1,   30,  4,   36],
  [0x6f, 'm', 'Evil Bird',                  ,   ,   2,   31,  6,   65],
  [0x71, 'm', 'Red/Purple Mushroom',        3,  ,   5,   19,  6,   69],
  [0x72, 'm', 'Violet Earth Entity',        3,  ,   3,   18,  6,   61],
  [0x73, 'm', 'Mimic',                      ,   ,   3,   27,  15,  73],
  [0x74, 'm', 'Red Spider',                 3,  ,   4,   23,  6,   48],
  [0x75, 'm', 'Fishman',                    4,  ,   6,   19,  5,   61],
  [0x76, 'm', 'Jellyfish',                  ,   ,   3,   14,  3,   48],
  [0x77, 'm', 'Kraken',                     5,  ,   11,  26,  7,   73],
  [0x78, 'm', 'Dark Green Wyvern',          4,  ,   5,   17,  5,   57],
  [0x79, 'm', 'Sand Monster',               4,  ,   8,   5,   4,   44],
  [0x7b, 'm', 'Wraith Shadow 1',            ,   ,   ,    10,  7,   44],
  [0x7c, 'm', 'Killer Moth',                ,   ,   2,   35,  ,    77],
  [0x7d, 'b', 'Sabera',                     3,  4,  13,  24,  ,    152],
  [0x80, 'm', 'Draygonia Archer',           1,  ,   3,   21,  6,   61],
  [0x81, 'm', 'Evil Bomber Bird',           ,   ,   1,   19,  4,   65],
  [0x82, 'm', 'Lavaman/blob',               3,  ,   3,   24,  6,   85],
  [0x84, 'm', 'Lizardman (w/ flail(',       2,  ,   3,   30,  6,   81],
  [0x85, 'm', 'Giant Eye',                  3,  ,   5,   33,  4,   81],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0x86, 'm', 'Salamander',                 2,  ,   4,   29,  8,   77],
  [0x87, 'm', 'Sorceror',                   2,  ,   5,   32,  6,   65],
  [0x88, 'b', 'Mado',                       4,  6,  10,  30,  ,    160],
  [0x89, 'm', 'Draygonia Knight',           2,  ,   3,   24,  4,   77],
  [0x8a, 'm', 'Devil',                      ,   ,   1,   18,  4,   52],
  [0x8b, 'b', 'Kelbesque 2',                4,  2,  11,  27,  ,    160],
  [0x8c, 'm', 'Wraith Shadow 2',            ,   ,   ,    17,  4,   48],
  [0x90, 'b', 'Sabera 2',                   5,  4,  21,  27,  ,    160],
  [0x91, 'm', 'Tarantula',                  3,  ,   3,   21,  6,   73],
  [0x92, 'm', 'Skeleton',                   ,   ,   4,   31,  6,   69],
  [0x93, 'b', 'Mado 2',                     4,  6,  11,  25,  ,    160],
  [0x94, 'm', 'Purple Giant Eye',           4,  ,   10,  23,  6,   98],
  [0x95, 'm', 'Black Knight (w/ flail)',    3,  ,   7,   26,  6,   89],
  [0x96, 'm', 'Scorpion',                   3,  ,   5,   29,  2,   73],
  [0x97, 'b', 'Karmine',                    4,  ,   14,  26,  ,    160],
  [0x98, 'm', 'Sandman/blob',               3,  ,   5,   36,  6,   98],
  [0x99, 'm', 'Mummy',                      5,  ,   19,  36,  6,   110],
  [0x9a, 'm', 'Tomb Guardian',              7,  ,   60,  37,  6,   106],
  [0x9b, 'b', 'Draygon',                    5,  6,  16,  41,  ,    160],
  [0x9e, 'b', 'Draygon 2',                  7,  6,  28,  40,  ,    160],
  [0xa0, 'm', 'Ground Sentry (1)',          4,  ,   12,  26,  ,    73],
  [0xa1, 'm', 'Tower Defense Mech (2)',     5,  ,   16,  36,  ,    85],
  [0xa2, 'm', 'Tower Sentinel',             ,   ,   2,   ,    ,    32],
  [0xa3, 'm', 'Air Sentry',                 3,  ,   4,   26,  ,    65],
  [0xa4, 'b', 'Dyna',                       6,  ,   16,  ,    ,    ,],
  [0xa5, 'b', 'Vampire 2',                  2,  ,   6,   27,  ,    ,],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0xb4, 'b', 'dyna pod',                   15, ,   255, 26,  ,    ,],
  [0xb8, 'p', 'dyna counter',               ,   ,   ,    26,  ,    ,],
  [0xb9, 'p', 'dyna laser',                 ,   ,   ,    26,  ,    ,],
  [0xba, 'p', 'dyna bubble',                ,   ,   ,    36,  ,    ,],
  [0xbc, 'm', 'vamp2 bat',                  ,   ,   ,    14,  ,    40],
  [0xbf, 'p', 'draygon2 fireball',          ,   ,   ,    26,  ,    ,],
  [0xc1, 'm', 'vamp1 bat',                  ,   ,   ,    16,  ,    40],
  [0xc3, 'p', 'giant insect spit',          ,   ,   ,    36,  ,    ,],
  [0xc4, 'm', 'summoned insect',            4,  ,   2,   51,  ,    98],
  [0xc5, 'p', 'kelby1 rock',                ,   ,   ,    22,  ,    ,],
  [0xc6, 'p', 'sabera1 balls',              ,   ,   ,    19,  ,    ,],
  [0xc7, 'p', 'kelby2 fireballs',           ,   ,   ,    10,  ,    ,],
  [0xc8, 'p', 'sabera2 fire',               ,   ,   ,    6,   ,    ,],
  [0xc9, 'p', 'sabera2 balls',              ,   ,   ,    15,  ,    ,],
  [0xca, 'p', 'karmine balls',              ,   ,   ,    25,  ,    ,],
  [0xcb, 'p', 'sun/moon statue fireballs',  ,   ,   ,    26,  ,    ,],
  [0xcc, 'p', 'draygon1 lightning',         ,   ,   ,    37,  ,    ,],
  [0xcd, 'p', 'draygon2 laser',             ,   ,   ,    36,  ,    ,],
  [0xce, 'p', 'draygon2 breath',            ,   ,   ,    36,  ,    ,],
  [0xe0, 'p', 'evil bomber bird bomb',      ,   ,   ,    1,   ,    ,],
  [0xe2, 'p', 'summoned insect bomb',       ,   ,   ,    47,  ,    ,],
  [0xe3, 'p', 'paralysis beam',             ,   ,   ,    23,  ,    ,],
  [0xe4, 'p', 'stone gaze',                 ,   ,   ,    26,  ,    ,],
  [0xe5, 'p', 'rock golem rock',            ,   ,   ,    18,  ,    ,],
  [0xe6, 'p', 'curse beam',                 ,   ,   ,    9,   ,    ,],
  [0xe7, 'p', 'mp drain web',               ,   ,   ,    10,  ,    ,],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0xe8, 'p', 'fishman trident',            ,   ,   ,    12,  ,    ,],
  [0xe9, 'p', 'orc axe',                    ,   ,   ,    15,  ,    ,],
  [0xea, 'p', 'Swamp Pollen',               ,   ,   ,    31,  ,    ,],
  [0xeb, 'p', 'paralysis powder',           ,   ,   ,    24,  ,    ,],
  [0xec, 'p', 'draygonia solider sword',    ,   ,   ,    24,  ,    ,],
  [0xed, 'p', 'ice golem rock',             ,   ,   ,    17,  ,    ,],
  [0xee, 'p', 'troll axe',                  ,   ,   ,    21,  ,    ,],
  [0xef, 'p', 'kraken ink',                 ,   ,   ,    19,  ,    ,],
  [0xf0, 'p', 'draygonia archer arrow',     ,   ,   ,    11,  ,    ,],
  [0xf1, 'p', '??? unused',                 ,   ,   ,    10,  ,    ,],
  [0xf2, 'p', 'draygonia knight sword',     ,   ,   ,    7,   ,    ,],
  [0xf3, 'p', 'moth residue',               ,   ,   ,    17,  ,    ,],
  [0xf4, 'p', 'ground sentry laser',        ,   ,   ,    13,  ,    ,],
  [0xf5, 'p', 'tower defense mech laser',   ,   ,   ,    23,  ,    ,],
  [0xf6, 'p', 'tower sentinel laser',       ,   ,   ,    8,   ,    ,],
  [0xf7, 'p', 'skeleton shot',              ,   ,   ,    10,  ,    ,],
  [0xf8, 'p', 'lavaman shot',               ,   ,   ,    10,  ,    ,],
  [0xf9, 'p', 'black knight flail',         ,   ,   ,    17,  ,    ,],
  [0xfa, 'p', 'lizardman flail',            ,   ,   ,    19,  ,    ,],
  [0xfc, 'p', 'mado shuriken',              ,   ,   ,    33,  ,    ,],
  [0xfd, 'p', 'guardian statue missile',    ,   ,   ,    19,  ,    ,],
  [0xfe, 'p', 'demon wall fire',            ,   ,   ,    19,  ,    ,],
].map(([id, type, name, sdef=0, swrd=0, hits=0, satk=0, dgld=0, sexp=0]) =>
      [id, {id, type, name, sdef, swrd, hits, satk, dgld, sexp}]));

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

const ITEMS = new Map([
  // id  name                  key
  [0x00, 'Sword of Wind',      true],
  [0x01, 'Sword of Fire',      true],
  [0x02, 'Sword of Water',     true],
  [0x03, 'Sword of Thunder',   true],
  [0x04, 'Crystalis',          true],
  [0x05, 'Ball of Wind',       true],
  [0x06, 'Tornado Bracelet',   true],
  [0x07, 'Ball of Fire',       true],
  [0x08, 'Flame Bracelet',     true],
  [0x09, 'Ball of Water',      true],
  [0x0a, 'Blizzard Bracelet',  true],
  [0x0b, 'Ball of Thunder',    true],
  [0x0c, 'Storm Bracelet',     true],
  [0x0d, 'Carapace Shield',    ],
  [0x0e, 'Bronze Shield',      ],
  [0x0f, 'Platinum Shield',    ],
  [0x10, 'Mirrored Shield',    ],
  [0x11, 'Ceramic Shield',     ],
  [0x12, 'Sacred Shield',      ],
  [0x13, 'Battle Shield',      ],
  // id  name                  key
  [0x14, 'Psycho Shield',      ],
  [0x15, 'Tanned Hide',        ],
  [0x16, 'Leather Armor',      ],
  [0x17, 'Bronze Armor',       ],
  [0x18, 'Platinum Armor',     ],
  [0x19, 'Soldier Suit',       ],
  [0x1a, 'Ceramic Suit',       ],
  [0x1b, 'Battle Armor',       ],
  [0x1c, 'Psycho Armor',       ],
  [0x1d, 'Medical Herb',       ],
  [0x1e, 'Antidote',           ],
  [0x1f, 'Lysis Plant',        ],
  [0x20, 'Fruit of Lime',      ],
  [0x21, 'Fruit of Power',     ],
  [0x22, 'Magic Ring',         ],
  [0x23, 'Fruit of Repun',     ],
  [0x24, 'Warp Boots',         ],
  [0x25, 'Statue of Onyx',     true],
  [0x26, 'Opel Statue',        true],
  [0x27, 'Insect Flute',       true],
  // id  name                  key
  [0x28, 'Flute of Lime',      true],
  [0x29, 'Gas Mask',           true],
  [0x2a, 'Power Ring',         true],
  [0x2b, 'Warrior Ring',       true],
  [0x2c, 'Iron Necklace',      true],
  [0x2d, 'Deo\'s Pendant',     true],
  [0x2e, 'Rabbit Boots',       true],
  [0x2f, 'Leather Boots',      true],
  [0x30, 'Shield Ring',        true],
  [0x31, 'Alarm Flute',        ],
  [0x32, 'Windmill Key',       true],
  [0x33, 'Key to Prison',      true],
  [0x34, 'Key to Styx',        true],
  [0x35, 'Fog Lamp',           true],
  [0x36, 'Shell Flute',        true],
  [0x37, 'Eye Glasses',        true],
  [0x38, 'Broken Statue',      true],
  [0x39, 'Glowing Lamp',       true],
  [0x3a, 'Statue of Gold',     true],
  [0x3b, 'Love Pendant',       true],
  // id  name                  key
  [0x3c, 'Kirisa Plant',       true],
  [0x3d, 'Ivory Statue',       true],
  [0x3e, 'Bow of Moon',        true],
  [0x3f, 'Bow of Sun',         true],
  [0x40, 'Bow of Truth',       true],
  [0x41, 'Refresh',            true],
  [0x42, 'Paralysis',          true],
  [0x43, 'Telepathy',          true],
  [0x44, 'Teleport',           true],
  [0x45, 'Recover',            true],
  [0x46, 'Barrier',            true],
  [0x47, 'Change',             true],
  [0x48, 'Flight',             true],
].map(([id, name, key]) => [id, {id, name, key}]));


const UNTOUCHED_MONSTERS = { // not yet +0x50 in these keys
  [0x7e]: true, // vertical platform
  [0x7f]: true, // horizontal platform
  [0x8e]: true, // broken?, but sits on top of iron wall
  [0x8f]: true, // shooting statue
  [0x9f]: true, // vertical platform
};
