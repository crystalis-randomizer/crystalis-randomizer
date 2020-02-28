
.segment "00"   :bank $00 :size $2000 :off $00000 :mem $8000
.segment "01"   :bank $01 :size $2000 :off $02000 :mem $a000
.segment "02"   :bank $02 :size $2000 :off $04000 :mem $8000
.segment "03"   :bank $03 :size $2000 :off $06000 :mem $a000
.segment "04"   :bank $04 :size $2000 :off $08000 :mem $8000
.segment "05"   :bank $05 :size $2000 :off $0a000 :mem $a000
.segment "06"   :bank $06 :size $2000 :off $0c000 :mem $8000
.segment "07"   :bank $07 :size $2000 :off $0e000 :mem $a000
.segment "08"   :bank $08 :size $2000 :off $10000 :mem $8000
.segment "09"   :bank $09 :size $2000 :off $12000 :mem $a000
.segment "0a"   :bank $0a :size $2000 :off $14000 :mem $8000
.segment "0b"   :bank $0b :size $2000 :off $16000 :mem $a000
.segment "0c"   :bank $0c :size $2000 :off $18000 :mem $8000
.segment "0d"   :bank $0d :size $2000 :off $1a000 :mem $a000
.segment "0e"   :bank $0e :size $2000 :off $1c000 :mem $8000
.segment "0f"   :bank $0f :size $2000 :off $1e000 :mem $a000
.segment "10"   :bank $10 :size $2000 :off $20000 :mem $8000
.segment "11"   :bank $11 :size $2000 :off $22000 :mem $a000
.segment "12"   :bank $12 :size $2000 :off $24000 :mem $8000
.segment "13"   :bank $13 :size $2000 :off $26000 :mem $a000
.segment "14"   :bank $14 :size $2000 :off $28000 :mem $8000
.segment "15"   :bank $15 :size $2000 :off $2a000 :mem $a000
.segment "16"   :bank $16 :size $2000 :off $2c000 :mem $8000
.segment "17"   :bank $17 :size $2000 :off $2e000 :mem $a000
.segment "18"   :bank $18 :size $2000 :off $30000 :mem $8000
.segment "19"   :bank $19 :size $2000 :off $32000 :mem $a000
.segment "1a"   :bank $1a :size $2000 :off $34000 :mem $8000
.segment "1b"   :bank $1b :size $2000 :off $36000 :mem $a000
.segment "1c"   :bank $1c :size $2000 :off $38000 :mem $8000
.segment "1d"   :bank $1d :size $2000 :off $3a000 :mem $a000
.segment "fe"   :bank $1e :size $2000 :off $7c000 :mem $c000
.segment "ff"   :bank $1f :size $2000 :off $7e000 :mem $e000

.segment "0d", "fe", "ff" ; object data

.org $c409
  jmp ComputeEnemyStats

;;; TODO - use a label: .org EndOfCompressedMonsterData
.org $bd00  ; This should leave some space after compression
DiffAtk:   ; PAtk*8
.org * + SCALING_LEVELS
DiffDef:   ; PDef * 4
.org * + SCALING_LEVELS
DiffHP:    ; PHP (0..$26)
.org * + SCALING_LEVELS
DiffExp:   ; ExpBase * 4, encoded in standard EXP encoding
.org * + SCALING_LEVELS

;;; $12 and $13 are free RAM at this point

;.org $1bdd0  ; Note: this follows immediately from the tables.
ComputeEnemyStats:
  lda ObjectRecoil,x
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
RescaleDefAndHP:
   ;; HP = max(PAtk + SWRD - DEF, 1) * HITS - 1
   ;; DiffAtk = 8 * PAtk
   ;; DEF = (8 * PAtk) * SDEF / 64   (alt, SDEF = 8 * DEF / PAtk)
   lda ObjectHP,x
   bne +
    jmp RescaleAtk
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
RescaleAtk:   ; $1bc63
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
RescaleGold:   ; $1bc98
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
   beq RescaleDone ; unconditional
   ;; ------------
+ lda ObjectGold,x
  and #$f0
   beq RescaleExp
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
RescaleExp:   ; $1bcbd
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
RescaleDone:
   jmp $c2af

.assert * <= $c000
;.assert < $1bff0

.export DiffAtk, DiffDef, DiffHP, DiffExp
