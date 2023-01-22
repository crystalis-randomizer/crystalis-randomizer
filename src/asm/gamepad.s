;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to gamepad input routines
;;;  1. Rearrange a few of the RAM locations
;;;  2. Add quick warp and quick sword select


.segment "fe", "ff"

.ifdef _CTRL1_SHORTCUTS
;;; These cases need to watch for button-up instead of button-down
.org $cb90 ; enter start menu
  lda $4a
.org $cbb4 ; enter select menu
  lda $4a

.ifndef _CHECK_FLAG0
.org $cb62 ; game mode 8
  jsr ReadControllersWithButtonUp
.endif
.endif ; _CTRL1_SHORTCUTS



;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;;; Rather than reading ctrl2, we instead just read ctrl1 and
;;; then use $4a to store buttons released.
;;; $46 and $48 are buttons that have been pressed in button-up mode,
;;; but we remove bits from 48 to prevent button-up when a shortcut
;;; activates, but keep them in 46.
;;; $4c is the indicator that we're in button-up mode

;;; NOTE: This is also called from flags.s in case CHECK_FLAG0 is enabled.
;;;       We could probably simplify a bit once we start copy-pasting
;;;       original source here, since we can retain the original jump target.
.reloc
ReadControllersWithButtonUp:
  lda #$01
  jmp $fe82 ; ReadControllersWithDirections+2

.reloc
StartReadCtrl1:
  sta $4c
  ldx #$00
  jmp $ff17 ; ReadControllerX

.reloc
RegisterButtonRelease:
  ;; do nothing if not read with button up
  lda $4c
  bne +
   sta $46 ; also zero out pressed buttons
   sta $48
   rts
  ;; any newly-pressed buttons go in $48
+ lda $4b
  ora $48
  sta $48
  ora $46  ; NOTE: 46 should always be a superset of 48
  sta $46
  ;; any buttons in $48 not in $43 go in $4a
  lda $43
  eor #$ff
  and $48
  sta $4a
  ;; any unpressed buttons are removed from $48 and $46
  lda $43
  and $46
  sta $46
  and $48
  sta $48
-- rts
QuickChangeSword:
   lda $48
   and #$cf
   sta $48   ; zero out pressed buttons
   ldx $0711
   cpx #$05
   beq --     ; rts if crystalis
-   inx
    cpx #$05
    bne +
     ldx #$00
+   cpx $0711
     beq --   ; rts if no other sword found
    cpx #$00
     beq -
    lda $642f,x
     bmi -    ; don't own sword
    ;; Found a new sword - equip it
    sta $6428 ; currently equipped index
    stx $0711 ; equipped sword
    lda #$00
    sta $06c0 ; zero out the current charge
    lda #$4c  ; sfx: cursor select
    jsr $c125 ; StartAudioTrack
.ifndef _AUTO_EQUIP_BRACELET
    jsr $d9d8
    sty $0719
.endif
    jmp PostInventoryMenu
CheckSelectShortcuts:
  lda $4b
  cmp #$40   ; newly pressed B?
   beq QuickChangeSword  ; yes -> change sword

;;; select+start to effectively reset the cart
.ifdef _SOFT_RESET
  cmp #$10   ; newly pressed start
   beq SoftReset
.endif

-:
.ifdef _TRAINER
  jmp CheckTrainerShortcuts
.endif

  rts
CheckStartShortcuts:
  lda $46
  cmp #$d0   ; A+B+start exactly?
  bne -      ; done -> rts
.ifndef _NO_BIDI_WILD_WARP ; save 12 bytes without this...?
   lda $4b
   and #$40  ; B newly pressed -> go backwards
   beq +
    dec $0780
    dec $0780
.endif
+  lda $48   ; activated, so zero out start/select from $48
   and #$cf
   sta $48
   jmp $cbd3 ; yes -> wild warp

;;; Simulate hardware reset in software by zeroing the stack and
;;; jumping to the reset vector
.ifdef _SOFT_RESET
SoftReset:
  ldx #$ff
  txs
  jmp ($fffc)
.endif


.ifdef _CTRL1_SHORTCUTS
    ;; NOTE: we could save a bit of space by using relative jumps
    ;; and inserting the code around $3fe70
.org $fe80
  lda #$00
  jsr StartReadCtrl1
.org $fecc
  jmp RegisterButtonRelease

.org $fee0
  lda #$00
  jsr StartReadCtrl1
.org $ff13
  jmp RegisterButtonRelease

.org $cbc1
  lda $46
  and #$20   ; select pressed?
  beq +
   jsr CheckSelectShortcuts
+ lda $46
  and #$10   ; start pressed?
  beq $cbeb  ; no -> rts
   jmp CheckStartShortcuts
.assert * <= $cbd3
.endif

;;; TODO - quick select items
;; .org $7cb62
;;   jsr ReadControllersAndUpdateStart
;; .org $7d8ea
;;   jsr ReadControllersAndUpdateStart
;; 
;; .org $7fa10
;; ReadControllersAndUpdateStart:
;;   lda $43    ; Pressed buttons last frame
;;   and #$30   ; Start and Select
;;   sta $61
;;   jsr ReadControllersWithDirections
;;   ;; Change $4b to report start/select only on button-up, and
;;   ;; only if no quick select happened.  We store a mask #$30 in
;;   ;; $42 on button-down for start and select, and zero it out
;;   ;; on quick change, so that ANDing with it before setting
;;   ;; $4b is sufficient to meet the requirement.
;;   lda #$30
;;   bit $4b
;;   beq +
;;    sta $42
;; + lda $43
;;   eor #$ff
;;   and $61
;;   and $42
;;   sta $61
;;   lda $4b
;;   and #$cf  ; ~$30
;;   ora $61
;;   sta $4b
;;   rts
