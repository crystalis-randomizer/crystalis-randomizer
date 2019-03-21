.bank $3c000 $c000:$4000 ; fixed bank

.bank $1a000 $a000:$2000 ; object data

.org $3c409
  jmp ComputeEnemyStats

;;; TODO - use a labe: .org EndOfCompressedMonsterData
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
  .byte $88,$89,$8B,$8E,$91,$95,$99,$9F,$A6,$AE,$B8,$C4,$D2,$E4,$FA,$FF
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
   ;; $1bc3c:
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

.assert < $1bff0
