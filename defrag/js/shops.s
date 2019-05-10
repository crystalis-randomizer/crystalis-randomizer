;;; Must come after preshuffle.s for various constants.

.bank $3c000 $c000:$4000
.bank $20000 $8000:$2000

.ifdef _NORMALIZE_SHOP_PRICES

;;; Initialize tool shop
.org $218ee
  lda ToolShopIdTable,x
.org $218ff
  clc
  adc #SHOP_COUNT*4 ; 44 = delta between shop tables
  tax
  jsr CopyShopPrices
  jmp PostInitializeShop
.assert < $21912

;;; Initialize armor shop
.org $21895
  lda ArmorShopIdTable,x ; should be unchanged, but just in case...
.org $218a6
  tax
  jsr CopyShopPrices
  jmp PostInitializeShop
ShopItemHorizontalPositions:
  .byte 8,13,18,23
.assert < $218b6
PostInitializeShop:

.org $218bc  ; use the new position table
  lda ShopItemHorizontalPositions,x

;;; Initialize inn price
.org $215cb
  ldx $646d
  lda InnPrices,x
  sta $62
  lda #$ff
  sta $61
  ldy #$04
  jsr ComputeShopPrice
.assert $215dc ; next display the price

;;; Fix pawn shop sell price
.org $201c1
  sta $61
  lda #$10
  sta $62
  ldy #$04
  jsr ComputeShopPrice
  nop
  nop
  nop
.assert $201cf
;;; Second version of the same thing (this one happens only
;;; once, when you say "yes" to "sell another?").
.org $204c7
  sta $61
  lda #$10
  sta $62
  ldy #$04
  jsr ComputeShopPrice
  nop
  nop
  nop
.assert $204d5
;;; Third read of price is immediately when selling.
.org $20634
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
.assert $2065f


;;; Set up code to stripe the shop locations table.
.org $21953
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
.assert < $21970

.org $21da4
ShopData:
;;; NOTE: This structure is hard-coded in the RomOption, with two parameters:
;;;  1. SHOP_COUNT (11)
;;;  2. SCALING_LEVELS (48)
ArmorShopIdTable:
  .res SHOP_COUNT*4, 0
ToolShopIdTable:
  .res SHOP_COUNT*4, 0
ArmorShopPriceTable:
  .res SHOP_COUNT*4, 0
ToolShopPriceTable:
  .res SHOP_COUNT*4, 0
InnPrices:
  .res SHOP_COUNT, 0
ShopLocations:
  .res SHOP_COUNT*4, 0
ToolShopScaling:
  .res SCALING_LEVELS, 0
ArmorShopScaling:
  .res SCALING_LEVELS, 0
BasePrices:
  .res 52, 0             ; 0 = $0d, 50 = $26, 51 = "$27" (inn)
InnBasePrice:
  .res 2, 0

;;; This is the space freed up by compressing the shop tables

;;;  TODO - can we save some space here?
;;;  what about consolidating the tables
;;;  and storing the reverse?
;;;    - or store one row and then shift
;;;      for >10 or >12 ?
;;;  -> this is taking 100 bytes of valuable code space...!
;;; Could get 48 or 72 bytes back by densifying it?
;;;   -> only scale every 2 or 4 levels...


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
     ldx $61
     cpx #$1d
     bcs +
      adc #$30
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

.assert < $22000

.endif
