;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to movement calculations
;;;  1. Disable statue glitch and trigger skip glitch
;;;  2. Set up a flag for "currently riding dolphin"
;;;  3. Make rabbit boots charge while walking
;;;  4. Switch pain land check from leather boots to hazmat
;;;  5. Move NPC/trigger collision handling routines from 1a to 3c

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

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


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;
;;; The following code is moved from 1a to 3c.  It also includes an optional
;;; patch for the statue glitch.
;;; 
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;;; --------------------------------
.reloc                          ; smudge from $354a2 to $354b0
OVERRIDE
PlayerHitTrigger_SetGameMode:
        <@354a2@>
        <@354a4@>
         bne :>rts
        <@354a8@>
        <@354ab GAME_MODE_TRIGGER_TILE@>
        <@354ad GameMode@>
        <@354af@>
;;; NOTE: not .reloc because we reverse-branch into the above
OVERRIDE
CollisionJump_02_PlayerInFrontOfNpcOrTrigger: ; smudge from $354b0 to $35535
        <@354b0@>
        <@354b3@>
        <@354b6@>
        <@354b8@>
        <@354ba +@> ; $354cb
         <@354bc@>
         <@354be +@> ; $354cb
          <@354c0@>
          <@354c1@>
          <@354c2@>
          <@354c5@>
          <@354c6@>
          <@354c8 ++@> ; $354ce
           <@354ca@>
           ;; ----
+       <@354d7 PlayerHitTrigger_SetGameMode@> ; unconditional
        ;; ----
++      <@35da5@>
         bmi :<rts ; $35534
        <@35f19@>
        <@36ce5@>
        <@36ce7 +@> ; $354df
        ;; Statue
         <@36d0e HandleStatueCollision@>
         <@36d5d ++@> ; $35508
         ;; ----
+       <@3ef6a@>
        bne :<rts ; $35534
        <@354e4@>
        <@354e7 +@> ; $354ee
         <@354e9@>
         beq :<rts ; $35534
+       <@354ee@>
        <@354f1@>
         <@354f2@>
         <@354f4@>
         <@354f7@>
         <@354f9@>
         <@354fb@>
         <@354fd@>
         <@354ff CheckHitbox@>
        <@35502@>
        <@35503@>
        bcs :>rts ; $35534
++      <@35508@>
        <@3550a@>
        <@3550d@>
        <@35510 GAME_MODE_DIALOG@>
        <@35512 GameMode@>
        <@35514@>
        bne :>rts ; $35534
        <@35519@>
        <@3551c@>
        beq :>rts ; $35534
        <@35520@>
        <@35523@>
        <@35524@>
        <@35526@>
        <@35528@>
        <@3552a@>
        <@3552d@>
        <@3552f@>
        <@35531@>
        <@35534@>
;;; --------------------------------
.reloc                          ; smudge from $35535 to $355b7
HandleStatueCollision:
        <@35535@>
        <@35537@>
@loop:
         <@35539@>
         <@3553c@>
          <@3553d@>
          <@3553f@>
          <@35542@>
          <@35543@>
           <@35544@>
           <@35545@>
           <@35547@>
           <@35548@>
           <@35549@>
           <@3554b@>
           <@3554d CheckHitbox@>
          <@35550@>
          <@35551@>
         <@35552@>
         <@35553@>
         <@35556 +@> ; $35568
          <@35558@>
          <@3555a@>
          <@3555d@>
          beq :>rts
          <@35562@>
          <@35564@>
          <@35567@>
          ;; ----
        ;; Move the player back in response to touching a statue.
+        <@35568@>
         <@3556b@>
         <@3556d +@> ; $35585
         <@3556f@>
         <@35572@>
         <@35574 +@> ; $35585
         <@35576@>
         <@35579@>
         <@3557b +@> ; $35585
         <@3557d@>
         <@35580@>
         <@35582@>
+        <@35585@>
         <@35586@>
          <@35587@>
-         <@35589 ObjectKnockback@>
          <@3558c@>
           <@3558d ObjectDirection@>
           <@35590@>
    .ifdef _DISABLE_STATUE_GLITCH ; smudge off
            lda #$04              ; just always push down
    .else                         ; smudge on
            <@35591@>
            <@35594@>
            <@35596@>
            <@35597@>
            <@35598@>
            <@3559a@>            ; TODO - can we disable statue glitch by making this #7?
    .endif
            <@3559c ObjectDirection@>
            <@3559f MoveObjectWithSpeedAndDirection_3c@>
           <@355a2@>
           <@355a3 ObjectDirection@>
          <@355a6@>
          <@355a7 ObjectKnockback@>
          <@355aa@>
          <@355ab -@> ; $35589
          <@355ad DrawAllObjectSprites@>
         <@355b0@>
         <@355b1@>
         <@355b2@>
        <@355b4 @loop@> ; $35539
        <@355b6@>

;;; --------------------------------
;;; Knocks back the object indexed $11 in the direction of object indexed $10?
;;; Not entirely sure about this - since it looks like direction,x is not used?
;;; (It's converted to an 8-dir and then stored shifted into the upper nibble).
;;; The use of $10/$11 as inputs is just because knocking back the player requires
;;; flipping x and y.  We could simplify a bit by using carry to indicate a flip:
;;;     plp; jsr SwapXYIfCarry; ... ; php; jsr SwapXYIfCarry; rts
;;;     SwapXYIfCarry:
;;;       bcc :>rts; stx $10; tya; tax; ldy $10; rts
;;; This saves 4 bytes in KnockbackObject and 3*3 bytes at each callsite,
;;; and costs 9 for the swap routine, which may be usable elsewhere as well?
.reloc                          ; smuge from $355c0
OVERRIDE
KnockbackObject:
        <@355c0@>
        <@355c2@>
        <@355c4@>
        <@355c6@>
        <@355c8 ObjectKnockback@>
        <@355cb +@> ; $355d4
         <@355cd@>
         <@355cf@>
         <@355d1 ObjectKnockback@>
+       <@355d4 ObjectKnockback@>
        <@355d7@>
        <@355d9 ObjectDirection@>
        <@355dc +@> ; $355df
         <@355de@>
+       <@355df@>
        <@355e0@>
        <@355e1@>
        <@355e2@>
        <@355e3@>
        <@355e5 ObjectDirection@>
        <@355e8@>
        <@355ea@>
        <@355ec ObjectDirection@>
        <@355ef@>
        <@355f1@>
        <@355f3@>
