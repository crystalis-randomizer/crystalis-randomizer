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
  lda EquippedPassiveItem
  cmp #ITEM_RABBIT_BOOTS ; require rabbit boots
  bne +
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
