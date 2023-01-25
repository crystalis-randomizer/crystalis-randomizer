;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to object spawn routines
;;;  1. White robots appear immediately outside the tower, rather than
;;;     waiting for brown robots to die (or randomly waiting for player
;;;     to walk on top of their spawn point).
;;;  2. Free some space in NpcDataJump_4 (fixed bank, may be related to
;;;     walls.s?)
;;;  3. Change spawn handling to repurpose $fe or $fd in the first byte
;;;  4. Allow randomizing flyer spawn positions (for rage skip)
;;;  5. Handled renormalized/scaled enemy stats


.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

;;; Make white robots appear immediately outside tower.
.org $b5f3                 ; $375f3 is action script for waiting white robots
  jsr ReleaseWhiteRobots

.reloc
ReleaseWhiteRobots:
  lda $6c
  and #$f8
  cmp #$58
  bne +
   txa
   asl
   asl
   rts
+ pla
  pla
  jmp $b61b


.segment "fe", "ff"

;;; Free a few bytes in NpcDataJump_4 by jumping earlier to avoid duplication.
.org $e22c
  jmp $e284
  FREE_UNTIL $e239
;; .org $e2a8  ; NOTE: This is no good because we use SpawnWall instead!
;;   jmp $e284
;;   FREE_UNTIL $e2b5
.org $e3b8 ; NpcData_LoadTrigger
  lda #$0e
  jmp $e284
  FREE_UNTIL $e3c7


;;; Vanilla returns out of timer spawns when it sees a "commented" spawn
;;; (anything matching $fx).  We want to repurpose $fe, so change this to
;;; check instead for specifically $ff; $fe will never be a timer (this
;;; is guaranteed by Spawn's [Symbol.iterator] method).
.org $e0ff
  nop
  nop
  cmp #$ff
.assert * = $e103


.ifdef _RANDOM_FLYER_SPAWNS

.org $e1c9 ; In middle of TryNpcSpawn, replacing {iny; lda $2c}
  jsr RandomizeFlyerSpawnPosition

.reloc
;;; When spawning an NPC, if the first two bytes are $fd,$ff then pick
;;; a random location instead.
RandomizeFlyerSpawnPosition:
  lda $2c
  eor #$02 ; $fd -> ff
  and $2d
  eor #$ff
   bne @done
  ;; Read the low 4 bits of $32 (random step counter)
  ;; for 16 possible spawn positions: each of X and Y
  ;; can be one of 4 values: 0, max, half-max, or player.
  txa
  pha
   ;; 62fc,62fd is w,h of map - use that?
   lda #$00
   sta $2c
   sta $2d
   lda $32
   lsr
   bcc +
    ldx $62fd ; map height
    stx $2c
+  lsr
   bcc +
    ldx $62dc ; map width
    stx $2d
+  lsr
   pha
    bcc +
     lsr $2c  ; half height
     bne +
      ;; player y
      lda $d0
      sta $2c
+  pla
   lsr
    bcc +
     lsr $2d  ; half width
     bne +
      ;; player x
      lda $90
      sta $2d
+  ldx #$04
-   asl $2c
    asl $2d
    dex
   bne -
  pla
  tax

  ;; Note: We could possibly shorten this routine if needed by
  ;; instead making it a +/-2 screen (in each direction) delta from
  ;; the player's current position, regardless of map size (it's
  ;; fine to spawn off the map).  This would make the bombardment
  ;; a little more relentless, since the bird wouldn't need to
  ;; traverse a potentially large map to get to the player, but
  ;; would always spawn no more than 2 screens away.
  ;; ;;     lda $32
  ;; ;;     ldx #$04
  ;; ;; -    asl
  ;; ;;      ror $2c
  ;; ;;      asl
  ;; ;;      ror $2d
  ;; ;;      dex
  ;; ;;     bne -
  ;; ;;    pla
  ;; ;;    tax

@done:
  iny      ; Replace 3 bytes at 3e1c9
  lda $2c
  rts

.endif


;;; ================================================================
;;; The following code does all the enemy stats rescaling at spawn time.
;;; The stats ar stored in the spawn table as normalized numbers, but
;;; when the enemy spawns, the current difficulty level affects the
;;; rescaled numbers that are actually written to the object RAM.

.segment "0d", "fe", "ff" ; object data

.org $c409
  jmp ComputeEnemyStats

.import DiffAtk, DiffDef, DiffHP, DiffExp

;; ;;; TODO - use a label: .org EndOfCompressedMonsterData
;; .org $bd00  ; This should leave some space after compression
;; DiffAtk:   ; PAtk*8
;; .org * + SCALING_LEVELS
;; DiffDef:   ; PDef * 4
;; .org * + SCALING_LEVELS
;; DiffHP:    ; PHP (0..$26)
;; .org * + SCALING_LEVELS
;; DiffExp:   ; ExpBase * 4, encoded in standard EXP encoding
;; .org * + SCALING_LEVELS

.reloc
;;; Inputs:
;;;   $11 - original object ID (i.e. $50 for slime, etc)
;;;   X   - spawn slot ($0d..$1e)
;;;   Y   - scaling level (0..47 or more)
;;; Constraints:
;;;   $12 and $13 are used as temporary space
ComputeEnemyStats:
.ifdef _ENEMY_HP
  ; Don't write any enemy data to the HP bar if its below the first enemy slot
  cpx #$0d
  bmi +
   ;; preload the enemy data here. Later the HP lo/hi will be fixed up if the
   ;; enemy has scaling.
   lda $11
   sta ObjectNameId,x
   lda ObjectHP,x
   sta ObjectMaxHPLo,x
   lda #0
   sta ObjectMaxHPHi,x
   ;; If respawning something in the currently-displayed slot then
   ;; clear it out.
   cpx CurrentEnemySlot
   bne +
    ;; The enemy displayed in the HP slot is now removed,
    ; so clear the display.
    jsr ClearCurrentEnemyHPSlot

.endif ; _ENEMY_HP
+ lda ObjectRecoil,x
  bmi +
   jmp $c2af ; exit point
+ and #$7f
  sta ObjectRecoil,x
  ;; We're gonna do the rescaling - figure out the actual difficulty
.ifdef _MAX_SCALING_IN_TOWER
  lda $6c
  and #$f8
  cmp #$58
  bne +
-  lda #(SCALING_LEVELS-1)
   bne ++
+   lda Difficulty
    cmp #(SCALING_LEVELS-1)
    bcs -
.else
   lda Difficulty
   cmp #(SCALING_LEVELS-1)
   bcc ++
    lda #(SCALING_LEVELS-1)
.endif
++ tay
   sta $63
@RescaleDefAndHP:
   ;; HP = max(PAtk + SWRD - DEF, 1) * HITS - 1
   ;; DiffAtk = 8 * PAtk
   ;; DEF = (8 * PAtk) * SDEF / 64   (alt, SDEF = 8 * DEF / PAtk)
   lda ObjectHP,x
   bne +
    jmp @RescaleAtk
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
   ;; $1bc3c:
+  lda ObjectHP,x
   sta $62
   lda $6c
   and #$f8
   cmp #$58
   bne +
    asl $62
    bcc +
     lda #$ff
     sta $62
+  jsr Multiply16Bit
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
   sta ObjectMaxHPLo,x
   lda ObjectDef,x
   and #$01
   sta ObjectMaxHPHi,x
@RescaleAtk:   ; $1bc63
  ;; DiffDef = 4 * PDef
  ;; DiffHP = PHP
  ;; ATK = (4 * PDef + PHP * SAtk / 32) / 4
  lda ObjectAtk,x
   beq @RescaleGold
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
  adc DiffDef,y
  sta $61
  lda $62
  adc #$00
  lsr
  ror $61
  lsr
  lda $61
  ror
  sta ObjectAtk,x
@RescaleGold:   ; $1bc98
  ;; GOLD = min(15, (8 * DGLD + 3 * DIFF) / 16)
  lda $6c
  and #$f8
  cmp #$58
  bne +
   ;; Zero out exp and gold
   lda ObjectGold,x
   and #$0f
   sta ObjectGold,x
   lda #$00
   sta ObjectExp,x
   beq @RescaleDone ; unconditional
   ;; ------------
+ lda ObjectGold,x
  and #$f0
   beq @RescaleExp
  lsr
  sta $61
  lda $63 ; difficulty
  asl
  adc $63 ; difficulty
  adc $61
  bcc +
   lda #$f0
+ and #$f0
  sta $61
  lda ObjectGold,x
  and #$0f
  ora $61
  sta ObjectGold,x
@RescaleExp:   ; $1bcbd
  ;; EXP = min(2032, DiffExp * SEXP)
  ;; NOTE: SEXP is compressed for values > $7f.
  lda ObjectExp,x
   beq @RescaleDone
  sta $61
  lda DiffExp,y
  php ; keep track of whether we were compressed or not.
   and #$7f
   sta $62
   jsr Multiply16Bit  
   lda $62
  plp
  bmi ++
    ;; No scaling previously.  $61$62 is 128*EXP.
    ;; If EXP >= 128 then 128*EXP >= #$4000
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
@RescaleDone:
+  jmp $c2af

; .assert * <= $c000
;.assert < $1bff0
