;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to movement calculations
;;;  1. Disable statue glitch and trigger skip glitch
;;;  2. Set up a flag for "currently riding dolphin"
;;;  3. Make rabbit boots charge while walking
;;;  4. Switch pain land check from leather boots to hazmat

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

.ifdef _DISABLE_STATUE_GLITCH
.org $959a
  ;; Just always push down.
  lda #$04
.endif

.org $9b96 ; clear dolphin bit => also clear the flag
  jsr UpdatePlayerStatusAndDolphinFlag

.ifdef _RABBIT_BOOTS_CHARGE_WHILE_WALKING
.org $9e00
  jsr CheckRabbitBoots

.pushseg "fe", "ff"
.reloc
CheckRabbitBoots:
; In charge shot only mode, we want to have the charge while walking enabled
; even without rabbit boots
.ifndef _CHARGE_SHOT_ONLY
  lda EquippedPassiveItem
  cmp #ITEM_RABBIT_BOOTS ; require rabbit boots
  bne +
.endif
  lda $06c0
  cmp #$10 ; don't charge past level 2
  bcs +
  rts
  ;; return instead to after the charge is increased
+ pla
  pla
  jmp $9e39 ; 35e39
.popseg

.endif

.ifdef _CHARGE_SHOT_ONLY
; Timer of 30 frames
.define Ctrl1CurrentDirection $49
.define WARRIOR_RING_DELAY 30

;; If we only have charge shot, buff rabbit boots to charge twice as fast while equipped
.org $9e0d
  jsr CheckRabbitBootsSpeedUp
  nop

.reloc
CheckRabbitBootsSpeedUp:
  lda EquippedPassiveItem
  cmp #ITEM_RABBIT_BOOTS
  bne +
    lda #1
    .byte $2c ; abs BIT instruction to skip the other load
; its safe to BIT here as it turns into BIT $03a9 which doesn't have side effects on read
+ lda #3
  and $08 ; GlobalCounter
  rts

;; Turn warrior ring into turret mode
.org $9c8d ; CheckWarriorRing
  jsr CheckIfStandingStillForWarriorRing
  nop

.reloc
CheckIfStandingStillForWarriorRing:
  bne @Exit
  ; The warrior ring is equiped so now check to see if we've stood still for long enough
  lda PlayerStandingTimer
  cmp #WARRIOR_RING_DELAY
  bne +
    inc $10
    bpl @Exit
+
  ; check our stab counter, every 3rd stab gets a free shot
  lda WarriorRingStabCounter
  cmp #3-1 ; minus 1 to account for bpl being branch greater than
  bpl +
    inc WarriorRingStabCounter
    rts
+ inc $10
  lda #0
  sta WarriorRingStabCounter
@Exit:
  rts

; Patch SwordSwingEnd to not reset charge amount if warrior ring is equipped
; and we are below the full charge amount
; .org $9cd1
;   jmp SwordSwingEndCheckIfWarriorRingEquipped
; FREE_UNTIL $9cda
; .reloc
; SwordSwingEndCheckIfWarriorRingEquipped:
;   lda EquippedPassiveItem
;   cmp #$0f ; ITEM_WARRIOR_RING
;   beq @HasWarriorRingEquipped
; @ClearChargeAmount:
;     lda #0
;     sta $06c0 ; PlayerSwordChargeAmount
;     beq @Exit
; @HasWarriorRingEquipped:
;   ; since we have the warrior ring equipped with charge mode on, we
;   ; want to keep the sword charge after stab IF its not fully charged yet
;   lda $06c0
;   cmp #$08
;   bcs @ClearChargeAmount
;   lda #0
; @Exit:
;   sta $06c1
;   rts

; ; Patch Player action to remove the requirement to hold b to charge the sword
; .org $9def
;   jsr HoldBCheckIfWarriorRingEquipped
;   nop

; .reloc
; HoldBCheckIfWarriorRingEquipped:
;   lda $43 ; Controller 1
;   and #$40
;   bne :>rts
;     ; if they aren't pressing b, see if we are increasing the warrior ring charge
;     lda EquippedPassiveItem
;     cmp #$0f ; ITEM_WARRIOR_RING
;     bne +
;       ; if they are holding the warrior ring check to add sword charge amount
;       lda $08
;       and #$03
;       bne + ; $35e39
;         lda $06c0 ; PlayerSwordChargeAmount
;         cmp #$08
;         bne + ; $35e22
;           inc $06c0 ; PlayerSwordChargeAmount
; +
;   lda #0
;   rts

; Patch global counter to track how long a player is standing still for
.org $f089 ; Near end of GlobalCounter processing
  jsr UpdatePlayerStandingTimer
.pushseg "fe", "ff"
.reloc
UpdatePlayerStandingTimer:
  lda Ctrl1CurrentDirection ; $ff if still
  bpl +
    lda PlayerStandingTimer
    cmp #WARRIOR_RING_DELAY
    beq @Exit
      clc
      adc #1
      .byte $2c ; Use bit to skip the lda #0
      ; this is safe because it compiles to BIT $00a9 which has no side effects
+ ; player moved so reset timer
  lda #0
  sta PlayerStandingTimer
@Exit:
  ; Continue patched function
  lda $071a
  rts
.popseg

.endif

.ifdef _DISABLE_TRIGGER_SKIP
.org $9d9a
  jsr FixTriggerSkip_CheckLatch
.endif

;.bank $36000 $a000:$2000
;
;.org $36086
;
;        ;; Free space at end of UseMagicJump
;        
;.assert * <= $36092 
;
;;;; Make gate opening independent of locations
;.org $37879
;  lda $23
;  and #$f8
;  cmp #$30
;  beq GateCheckPassed
;  lda $6c
;  cmp #$73
;  beq GateCheckPassed
;  bne GateCheckFailed
;.assert * <= $3788f
;.org $3788f
;GateCheckFailed:
;.org $37896
;GateCheckPassed:

;;; This is for fixing trigger glitch?
;;; @@@ TODO - this seems to have been orphaned somewhere?
;; .reloc
;; SetTriggerTileGameMode:
;;   sty $0623
;;   dec $41
;;   rts


.segment "fe", "ff"

.org $d29d ; Just set dolphin status bit => also set the flag
  jsr UpdatePlayerStatusAndDolphinFlag

.org $e7b3 ; just cleared dolphin status => also clear the flag
  jsr UpdatePlayerStatusAndDolphinFlag

;;; NOTE: this is 23 bytes.  If we do anything else with flags
;;; it would make sense to write a pair of functions SetFlag
;;; and ClearFlag that take an offset in Y and a bit in A (with
;;; appropriate CPL already applied for clear) - these are each
;;; 7 bytes to define and 7 bytes to call, so this ends up costing
;;; 34 bytes total, but only 20 on the margin.  It would take
;;; a number of calls to pay off.
.reloc
UpdatePlayerStatusAndDolphinFlag:
  ;; Args: A = new value for $0710, bit 40 will go into flag 0ee (649d:40)
  sta $0710
  and #$40
  beq +
   ora $648d ; flag 06e
   sta $648d
   rts
+ lda #$bf
  and $648d
  sta $648d
  rts


.ifdef _HAZMAT_SUIT
.org $ef66
  ;; Check for gas mask instead of leather boots for pain terrain
  cmp #$0d
.endif
