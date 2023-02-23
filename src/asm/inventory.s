;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to inventory management code.  Includes
;;;  1. Quest item overflow buffer
;;;  2. Progressive upgrades for orbs/bracelets
;;;  3. Optionally disabling sorting quest item row (for unidentified items)
;;;  4. Optionally patch out sword charge glitch
;;;  5. Change a few accessories' details/calculations
;;;  6. Patch a handful of spots to call into a PostInventoryMenu hook
;;;  7. Prevent equipping Opel Statue

.segment "10", "fe", "ff"  ; TODO - is 11 valid here, too?

;;; Add a "quest item overflow buffer", to prevent soft-locks in cases
;;; where more than either quest items are required to be held at the
;;; same time.  We repurpose eight bytes of RAM from 180..1ff
;;; ($64b8..$64bf) to store eight additional items as a FIFO queue.
;;; When the player drops an item from the quest row, we intercept the
;;; routine and instead swap it with the front of the buffer (if it
;;; exists) and replace the dropped item in the back.

.org $8372
  jsr CheckDroppable

.org $8434
  jsr MaybeDrop
  nop
  nop

InvItemData = $8ff0

;; MUST BE EXACTLY 4 BYTES
.org $8534
  nop
  jsr FillQuestItemsFromBuffer
.assert * = $8538

.reloc
CheckDroppable:
  ;; Loads A with something that has the :40 bit set if the item
  ;; is not droppable.
  lda $64bf
  beq +
   ;; there's overflow, so allow deleting if selecting from 3rd row
   lda $6427
   and #$38
   cmp #$10
   bne +
    lda #$00
    rts
+ lda InvItemData,x
  rts

.reloc
MaybeDrop:  ; 21486
  txa
  and #$f0
  cmp #$20
  beq +
   lda #$ff
   sta $6430,x
   rts
  ;; This is a key item and we have overflow.
  ;; Substitute the overflow and cycle...
+ lda $6430,x
  pha
   lda $64bf
   sta $6430,x
   ldx #$07
-   lda $64b7,x
    beq +
    sta $64b8,x
    dex
    bne -
+ pla
  sta $64b8,x
  rts

.reloc
FillQuestItemsFromBuffer:
  ;; First fill in any gaps in the quest item row
  ;; Note: we're very short space, but we need to increment x and y.
  ;; Start them at -9 (due to preincr) and -8 so that they end at zero.
  ldx #$f8
  ldy #$f7
-  iny
   beq +
   lda $6358,y ; NOTE: $6450..$6457
    bmi - ; nothing in y so loop
   sta $6358,x
   inx
   beq ++
  bne - ; uncond
+ lda #$ff
-  sta $6358,x
   inx
  bne -
  ;; Now check the overflow buffer...

  ;; If there's anything in the buffer and any space in the inventory,
  ;; fill them in.  Just take the most recently added ones, not worrying
  ;; about cycling the queue (that's only needed for dropping).
++:
  ldy #$08     ; predecrement, so start at $64c0 even tho last item at $64bf
-  dey
   bmi +       ; buffer is full
   lda $64b8,y
  bne -        ; occupied, decrement and look at the next
  ;; If y == #$08 then buffer is empty - return.
+ iny
  cpy #$08
  beq +
  ;; Look for open spots in the quest item row
  ldx #$08
-   dex
    bmi +
    lda $6450,x
   bpl -
   ;; We're looking at an open slot in x and an available item in y
   lda $64b8,y
   sta $6450,x
   lda #$00
   sta $64b8,y
   iny
   cpy #$08
  bne -
  ;; The following is copied from $20534, patched to not sort
  ;; the swords or powerups (so it loads 2 instead of 0)
+ lda #SORT_START_ROW
  sta $2e
  rts

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; NOTE: This prevents swords and orbs from sorting to avoid out-of-order
;; swords from clobbering one another.  We swap the second and fourth
;; items from the table of row starts so that when we start at two instead
;; of zero, we end up skipping exactly the first and fourth rows.
;; We change the sort order more generally so that we can prevent sorting
;; the key item row as well if unidentified items is set.
.org $859e
  .byte $04,$04,$08,$08,$08,$08,$04,$04
  .byte $00,$0c,$20,$10,$18,$28,$04,$08

;;; Support for fixing sword charge glitch
.reloc
ReloadInventoryAfterLoad:
  jsr PostInventoryMenu
  jmp AfterLoadGame


.ifdef _DISABLE_SWORD_CHARGE_GLITCH
.org $9bce
  jmp ReloadInventoryAfterLoad
.org $9bde
  jmp ReloadInventoryAfterLoad
.endif


.segment "fe", "ff"

;;.org $7c010
;;;; Adjusted inventory update - use level instead of sword
;;   ldy $0719  ; max charge level
;;   lda #$01
;;-   asl
;;    dey
;;   bpl -
;;   ldy $0716  ; equipped passive item
;;-   clc
;;    adc $0421  ; player level
;;    dey
;;    cpy #$0d   ; power ring - 1
;;   beq -
;;   sta $03e1  ; player attack
;;   lda $0421  ; player level
;;   cpy #$0f   ; iron necklace - 1
;;.org $7c02d   ; NOTE - MUST BE EXACT!!!!


.org $c010
;; Adjusted inventory update - use level instead of sword
;; Also nerf power ring to only double the sword value, rather than the level.
   ldy $0719  ; max charge level
   lda #$01
-   asl
    dey
   bpl -
   ldy $0716  ; equipped passive item
   cpy #$0e   ; power ring
   bne +
    asl
+  clc
   adc $0421  ; player level
   sta $03e1  ; player attack
   lda $0421  ; player level
   asl
   sta $62    ; $62 <- 2*player level
   asl
   sta $61    ; $61 <- 4*player level
   ldy $0713  ; equipped armor
   lda ArmorDefense,y
   ldy #$10   ; iron necklace
   jsr @ComputeDefense
   sta $0401  ; armor defense
   ldy $0714  ; equipped shield
   lda ShieldDefense,y
   ldy #$14   ; shield ring
   jsr @ComputeDefense
   sta $0400  ; shield defense
   nop
   nop
.assert * = $c04f ; NOTE: must be exact!

.reloc
@ComputeDefense:
  cpy $0716   ; equipped worn item
  php         ; remember whether it was equal or not
   clc
   adc $0421  ; add the level
   cmp $61    ; compare to 4*level
   bcc +      ; if less then skip
    lda $61   ; if greater then cap
+ plp         ; pull the Z flag
  bne +       ; if not wearing correct item then skip
   clc
   adc $62    ; add 2*level
+ rts


.org $c0f8
  jsr PostUpdateEquipment
  jmp RestoreBanksAndReturn


.reloc
PostUpdateEquipment:
  ;; Change 'lda' (ad) to 'jsr' (20) to enable these
.ifdef _LEATHER_BOOTS_GIVE_SPEED
  jsr ApplySpeedBoots
.endif
  rts

.reloc
ApplySpeedBoots:
  lda #$06   ; normal speed
  sta $0341  ; player speed
  lda $0716  ; equipped passive item
  cmp #$13   ; leather boots
  bne +
   inc $0341 ; speed up by 1
+ rts


.ifdef _DISABLE_SWORD_CHARGE_GLITCH
.org $c9fb
  jsr @ReloadInventoryAfterContinue

.reloc
@ReloadInventoryAfterContinue:
  sta $07e8
  jsr PostInventoryMenu
  rts
.endif

;;; Patch MainGameModeJump_12_Inventory
.org $d91f
  jsr PostInventoryMenu
.org $d971
  jsr PostInventoryMenu


;;; Call this instead of 3c008 after the inventory menu
.reloc
PostInventoryMenu:
  ;; Change 'lda' (ad) to 'jsr' (20) to enable these
.ifdef _AUTO_EQUIP_BRACELET
  jsr AutoEquipBracelets
.endif
  lda $0711 ; Equipped sword
  cmp #$05  ; Crystalis
  bne +
   lda #2
   sta $0719
+ jmp UpdateEquipmentAndStatus  ; Defined in vanilla (init.s)

.reloc
AutoEquipBracelets:
  lda $6428
  bpl +
   ;; deselect all
-  lda #$80
   sta $642b
   lda #0
   sta $0718
   sta $0719
   rts
+ tay
  cmp $6430,y ; check for crystalis
   bne -
  lda $643c,y ; which power-up do we have?
   bmi -
  ;; need to store $718 (0=nothing, 1..4=ball, 5..8=bracelet), $719 (0..2), $642b (0..3)
  lsr
  lda #$01
  bcs +
   lda #$02
+ sta $719
  and #$02
  asl
  sta $61
  tya
  sta $642b
  sec
  adc $61
  sta $0718
  rts



.ifdef _FIX_OPEL_STATUE
;;; Prevent ever "equipping" opel statue
OpelStatueReturn = $db0d
.org $db0e
.assert * = SetEquippedConsumableItem
    ;; Figure out what's equipped
    ldy SelectedConsumableIndex
    bmi +
    lda InvConsumables,y
    cmp #ITEM_OPEL_STATUE
    bne ++
+   ldy SelectedQuestItemIndex
    bmi OpelStatueReturn
    lda InvQuest,y
++  sec
    jmp @FinishEquippingConsumable
FREE_UNTIL $db28

;;; Note: This is moved from $7db22, where we ran out of space.
.reloc
@FinishEquippingConsumable:
    sbc #$1c
    sta EquippedConsumableItem
    rts
.endif



.ifdef _BUFF_DEOS_PENDANT
;;; Skip the check that the player is stationary.  We could also adjust
;;; the speed by changing the mask at $7f02b from $3f to $1f to make it
;;; faster, or $7f to slow it down.  Possibly we could start it at $7f and
;;; lsr if stationary, so that MP recovers quickly when still, but at half
;;; speed when moving?  We might want to consider how this plays with
;;; refresh and psycho armor...
.org $f026
  nop
  nop
.endif
