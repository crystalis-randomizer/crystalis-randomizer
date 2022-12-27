;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Must come after preshuffle.s for various constants.

.segment "0e", "fe", "ff"

.ifdef _NORMALIZE_TELEPATHY
FREE "0e" [$8167, $822f)
;FREE "0e" [$98f4, $9b00) -- currently declared in rom/telepathy.ts

;;; Basic plan: rip out minimum level, result mapping, etc
;;; Also removed the extra powers of two table, so we have
;;; room to inline CheckTelepathyResult.
.org $de14  ; Ref from MainGameModeJump_16 jumped to 816f before
    jsr CastTelepathy

.reloc
CastTelepathy:
    sec
    lda PlayerMP
    sbc #$08 ; should never overflow because already checked
    sta PlayerMP
    lda $07c0
    and #$3f
    inc $07c0
    tay
    lda TelepathyResultTable,y
    bne +++
    ;;  give free MP
    clc
    lda #$20
    adc PlayerMP
    bcs +
     cmp PlayerMaxMP
     bcc ++
+     lda PlayerMapMP
++  sta PlayerMP
    ldx #$01
    bne Telepathy_ShowDefaultMessage ; unconditional
    ;; ------
+++ cmp #$01
    bne +
    ldx #$02
    bne Telepathy_ShowDefaultMessage ; unconditional
    ;; ------
+   and #$01
    sta $29
    lda #23 ; which sage
    asl
    tax
    lda TelepathyTable,x
    sta $24
    lda TelepathyTable+1,x
    sta $25
    ldy #$00
-    jsr ReadFlagFromBytePair_24y
     bne ++
     lda $26
     and #$40
     beq +
      lda $29
      beq +
       iny
       iny
+    lda ($24),y
     sta $21
     iny
     lda ($24),y
     sta $20
     rts
++   iny
     iny
     lda $26
     and #$40
     beq +
      iny
      iny
+    lda $26
    bpl -
    ldx #$03
Telepathy_ShowDefaultMessage:
    txa
    asl
    asl
    ora $23 ; which sage
    asl
    tax
    lda TelepathyTable,x
    sta $21
    lda TelepathyTable+1,x
    sta $20
    rts

TelepathyResults = $822f

.import TelepathyTable

.endif


.segment "10", "fe", "ff"

.ifdef _NORMALIZE_SHOP_PRICES

;;; Initialize tool shop
.org $98ee
  lda ToolShopIdTable,x

.org $98ff
  clc
  adc #SHOP_COUNT*4 ; 44 = delta between shop tables
  tax
  jsr CopyShopPrices
  jmp PostInitializeShop
FREE_UNTIL $9912

;;; Initialize armor shop
.org $9895
  lda ArmorShopIdTable,x ; should be unchanged, but just in case...

.org $98a6
  tax
  jsr CopyShopPrices
  jmp PostInitializeShop
FREE_UNTIL $98b6

.reloc
ShopItemHorizontalPositions:
  .byte 8,13,18,23

PostInitializeShop = $98b6

.org $98bc  ; use the new position table
  lda ShopItemHorizontalPositions,x

;;; Initialize inn price
.org $95cb
  ldx $646d
  lda InnPrices,x
  sta $62
  lda #$ff
  sta $61
  ldy #$04
  jsr ComputeShopPrice
.assert * = $95dc ; next display the price

;;; Fix pawn shop sell price
.org $81c1
  sta $61
  lda #$10
  sta $62
  ldy #$04
  jsr ComputeShopPrice
  nop
  nop
  nop
.assert * = $81cf

;;; Second version of the same thing (this one happens only
;;; once, when you say "yes" to "sell another?").
.org $84c7
  sta $61
  lda #$10
  sta $62
  ldy #$04
  jsr ComputeShopPrice
  nop
  nop
  nop
.assert * = $84d5

;;; Third read of price is immediately when selling.
.org $8634
  sta $61
  lda #$10
  sta $62
  ldy #$04
  jsr ComputeShopPrice
  clc
  lda $11
  adc $0702
  sta $0702
  lda $12
  adc $0703
  sta $0703
  bcc +
   lda #$ff
   sta $0702
   sta $0703
+ nop
  nop
  nop
  nop
  nop
.assert * = $865f


;;; Set up code to stripe the shop locations table.
.org $9953
  ldx #$00
- lda $6c
   cmp ShopLocations,x
    beq +
   inx
   cpx #SHOP_COUNT*4 ; # of shops
  bne -
  ldx #$00
+ txa
  lsr
  lsr
  sta $646d  ; current shop index   
  rts
FREE_UNTIL $9970

;;; These are exported by the Shops writer.
.import ShopData, ArmorShopIdTable, ToolShopIdTable, ArmorShopPriceTable
.import ToolShopPriceTable, InnPrices, ShopLocations
.import ToolShopScaling, ArmorShopScaling, BasePrices, InnBasePrice





;;; TODO - probably mark this whole area as freed and dispense
;;; with the concrete .org math...?!?

FREE "10" [$9da4, $a000]

;; .org $9da4 + SHOP_COUNT*21 + SCALING_LEVELS*2 + 54

;;; This is the space freed up by compressing the shop tables

;;;  TODO - can we save some space here?
;;;  what about consolidating the tables
;;;  and storing the reverse?
;;;    - or store one row and then shift
;;;      for >10 or >12 ?
;;;  -> this is taking 100 bytes of valuable code space...!
;;; Could get 48 or 72 bytes back by densifying it?
;;;   -> only scale every 2 or 4 levels...

.reloc
ComputeShopPrice:               ; ~71 bytes
    ;; Inputs:
    ;;   Difficulty - scaling level
    ;;   $61 - item ID to load (destroyed). $FF for inn
    ;;   $62 - shop variation factor (1/32)
    ;;   Y - index to store output in: $6470,y
    ;; Output:
    ;;   $6470,y - shop price (2 bytes)
    ;;  Destroys:
    ;;   A, $61..64 and $10..13
    txa
    pha
     ;; First find the item index in the base price table.
     ;; If the item is out of the bounds of the table [$0d,$27)
     ;; then return zero (pre-initialize the zero return).
     ldx #$00
     stx $11
     stx $12
     ;; Get index of item in BasePrices table, using item ID from $61.
     lda $61
     ;; Subtract the  $0d BasePrices offset.  If it carries then the ID
     ;; was under $0d so return zero.
     sec
     sbc #$0d
     bcc ++
     ;; Double the ID because the table is two-wide.  If the item ID is
     ;; negative then it's an inn, so read the price out of the spot
     ;; where $27 would have been.
     ldx #$34 ; 2 * ($27 - $0d)
     asl
     bcs +
      ;; Check for out of bounds: $26 is the last sellable item.  If it's
      ;; greater then return zero.
      cmp #$34 ; ($27 - $0d)
      bcs ++
       tax
+    lda BasePrices,x
     sta $63
     lda BasePrices+1,x
     sta $64
     ;; Read the current scaling factor out of the correct table.
     ;; Tools and armor use separate tables: if the ID (still in $61)
     ;; is less than $1d then use the armor table, which is $30 bytes
     ;; after the tools table.
     lda Difficulty
     cmp #(SCALING_LEVELS-1)
     bcc +
      lda #(SCALING_LEVELS-1)
+    ldx $61
     cpx #$1d
     bcs +
      adc #SCALING_LEVELS
+    tax
     ;; Write the scaling factor (8*s) into $61.  The shop multiplier (32*m)
     ;; is still in $62 from the original input.  Now multiply everything
     ;; together to get 256*s*m*b.
     lda ToolShopScaling,x
     sta $61
     jsr Multiply16Bit
     jsr Multiply32Bit
     ;; Make sure nothing carried: if $13 is nonzero then we need to push
     ;; $ff into $11 and $12.
     lda $13
     beq ++
      lda #$ff
      sta $11
      sta $12
++  lda $11
    sta $6470,y
    lda $12
    sta $6471,y
    pla
    tax
    rts

;;; NOTE: we could move this to a smaller chunk if needed, but it's nice to
;;; store all the shop normalization code in the space it recovered.
.reloc
CopyShopPrices:
  ;; Input:
  ;;   x: first item in the shop
  ;;      $21da4,x points to ID of first item
  ;;      $21dd0,x points to price multiplier
  ;;      For tool shops, add $84.
  ldy #$08
-  lda ArmorShopIdTable,x
   sta $61
   lda ArmorShopPriceTable,x
   sta $62
   jsr ComputeShopPrice
   inx
   iny
   iny
   cpy #$10
  bcc -
  rts

.reloc
Multiply32Bit:
  ;; Inputs: $61$62 and $63$64
  ;; Output: $10$11$12$13
  ;; Note: we could save X on the stack if it were needed.
  lda #$00
  sta $12  ; clear upper bits of product
  sta $13
  ldx #$10 ; set binary count to 16
- lsr $62  ; divide multiplier by 2
  ror $61
  bcc +
  lda $12  ; get upper half of product and add multiplicand
  clc
  adc $63
  sta $12
  lda $13
  adc $64
+ ror      ; rotate partial product
  sta $13
  ror $12
  ror $11
  ror $10
  dex
  bne -
  rts

.endif


.segment "1a", "fe", "ff"

.ifdef _EXPAND_SPEEDS
.org $8480
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

.endif
