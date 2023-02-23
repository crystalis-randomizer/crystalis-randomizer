;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to speed table
;;; NOTE: This is currently off by default, since it's experimental and not
;;; yet working correctly.

.segment "1a", "fe", "ff"

.ifdef _EXPAND_SPEEDS
.org $8480
OVERRIDE ; !!!
ComputeDisplacementVector:
;;; Inputs:
;;;   A - direction, from $360,x (0-7, or 0-f, or 0-3f)
;;;   $340,x:0f - speed bucket
;;;   $380,x:40 - in slow terrain
;;;   $480,x    - step counter
;;; Outputs:
;;;   ($31,$30) - (y,x) displacement

    ;; First step: multiply te direction by the right factor.
    ;;   $340,x:40 => 64-dir mode
    ;;   A & $80   => 16-dir mode
    ;; We also want to end up with $31 having the speed in high nibble.
    ;; Start by saving the accumulator in Y temporarily while we shift
    ;; the speed into the high nibble and save flags for later inspection.
    tay
    lda $0340,x
    pha
    asl
    php  ; At this point, C and N tell us whether we're in 64-dir mode
    asl
    asl
    asl
    sta $31  ; $31 now has the speed in the high nibble
    ;; Check $380,x:40 for slowdown.
    lda $0380,x
    asl
    bpl ++
     sec
     sbc #$20
     bcs +
      lda #$00
+    sta $31
    ;; Check direction mode
++  plp
    bpl +    ; $340,x had a zero 40 bit -> not 64-dir -> do the shifts
    tya      ; restore original input in case we're not shifting
    bcc ++   ; $340,x:c0 was $40 => 64-dir => skip shifts
+   tya
    ;; Shift 2 or 3 times.  Only need the 3rd shift if in 8-dir mode (dir pos)
    asl
    bcs +    ; 16-dir mode: skip a shift
     asl
+   asl
++  and #$3f ; in case there's a knockback
    ;; From here on, assume 64-dir mode.
    ;; Figure out quadrant.
    ;;    for 00..0f,  X = sin = cos-    Y = -cos
    ;;    for 10..1f,  X = cos           Y = sin = cos-
    ;;    for 20..2f,  X = -sin = -cos-  Y = cos
    ;;    for 30..3f,  X = -cos          Y = -sin = -cos-
    pha
     tay
     lda XIndex,y
     jsr ComputeDisplacement
     sta $30
    pla
    tay
    lda YIndex,y
    jsr ComputeDisplacement
    sta $31
    rts    

ComputeDisplacement:
    ;; A|$31 holds an index into the CosineTable, then cross-ref with
    ;; step counter to get actual displacement.  Output => A.
    php ; Negate the result at the end if N
     bit XIndex  ; $10 means zero
     beq +
      ;; Result of trig function is zero, nothing more to do.
      lda #$00
      rts
+    ora $31
     tay
     lda CosineTable,y
     ;; Now pull the result apart: high nibble is whole part, low is fraction
     pha
      lsr
      lsr
      lsr
      lsr
      sta $10
     pla
     and #$0f
     asl
     tay
     lda $0480,x
     bit XIndex+8  ; $08 bit clear indicates we need to iny?
     bne +
      iny
+    lda BitsTable,y
     pha
      lda $0480,x
      and #$07
      tay
     pla
     and PowersOfTwo,y
     beq +
      inc $10
+    lda $10
    plp
    bpl +
     ;; negate the result
     eor #$ff
     sec
     adc #$00
+   rts

;;; shift to 64-dir - used by KnockbackObject patch
ShiftDirection:
    bpl +
    bcs +
    rts
+   asl
    bcs +
     asl
+   asl
    rts

CosineTable:
;;; Stores 16*SPD[i]*cos(DIR*pi/32) for DIR=0..15, i=0..15
.res 256,0

YIndex:  ; -cos/sin/cos/-sin
  .byte $80,$81,$82,$83,$84,$85,$86,$87,$88,$89,$8a,$8b,$8c,$8d,$8e,$8f
XIndex:  ; sin/cos/-sin/-cos
  .byte $10,$0f,$0e,$0d,$0c,$0b,$0a,$09,$08,$07,$06,$05,$04,$03,$02,$01
  .byte $00,$01,$02,$03,$04,$05,$06,$07,$08,$09,$0a,$0b,$0c,$0d,$0e,$0f
  .byte $10,$8f,$8e,$8d,$8c,$8b,$8a,$89,$88,$87,$86,$85,$84,$83,$82,$81
  .byte $80,$81,$82,$83,$84,$85,$86,$87,$88,$89,$8a,$8b,$8c,$8d,$8e,$8f

BitsTable:
  .byte $00,$00 ;  0 => 00000000 00000000
  .byte $00,$01 ;  1 => 00000000 00000001
  .byte $01,$01 ;  2 => 00000001 00000001
  .byte $08,$41 ;  3 => 00001000 01000001
  .byte $11,$11 ;  4 => 00010001 00010001
  .byte $24,$49 ;  5 => 00100100 01001001
  .byte $49,$49 ;  6 => 01001001 01001001
  .byte $52,$a9 ;  7 => 01010010 10101001
  .byte $55,$55 ;  8 => 01010101 01010101
  .byte $ad,$56 ;  9 => 10101101 01010110
  .byte $b6,$b6 ; 10 => 10110110 10110110
  .byte $9b,$b6 ; 11 => 11011011 10110110
  .byte $ee,$ee ; 12 => 11101110 11101110
  .byte $f7,$ce ; 13 => 11110111 10111110
  .byte $fe,$fe ; 14 => 11111110 11111110
  .byte $ff,$fe ; 15 => 11111111 11111110

;;; Update KnockbackObject to work for 64-dir projectiles
.org $95d4
    lda $0340,x
    asl
    php
    lda $0360,x
    plp    
    jsr ShiftDirection
    asl
    and #$70

.endif ; _EXPAND_SPEEDS
