;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to NPC dialog (and item use, triggers, etc).
;;;  1. Update to better handle arbitrary item IDs
;;;  2. Fix "give money" effect to work when player already has some cash
;;;  3. Windmill guard in Leaf can now give either an item and/or cash
;;;  4. Take advantage of GrantItemTable (defined in itemget.s)
;;;  5. Update some followup actions to handle repurposed ReloadLocationGraphics
;;;  6. Fix Kensu's chest-dropping action to check PersonData instead of
;;;     hardcoding the item ID

.segment "fe", "ff"

.org $d223 ; part of DialogFollowupActionJump_11 (give 2nd item)
  bpl GrantItemInRegisterA ; change from bne to handle sword of wind

;;; Fix bug in dialog action 9 where carrying from the low byte of money
;;; would just increment the low byte again instead of the high byte.
.org $d273
  inc $0703

.ifdef _ZEBU_STUDENT_GIVES_ITEM
;;; This is hairy - if there's money at the start then we really should just
;;; switch the action directly to 11 and free the entire thing, but that
;;; involves code outside here so we'll put it off.
.ifdef _MONEY_AT_START
;;; immediately jump straight to 11 at start of routine
.org $d263
  jmp DialogAction_11
FREE_UNTIL $d280
.else
;;; if we need to give both item and money then patch the followup.
.org $d27d
  jmp PatchZebuStudentFollowUp ; replace jmp DisplayNumberInternal

.pushseg "1a", "fe", "ff"
.reloc
PatchZebuStudentFollowUp:
;.bank $34000 $8000:$2000
  jsr DisplayNumberInternal
  jmp DialogAction_11
.popseg
.endif

.else  ; zebu student doesn't give an item
.ifdef _MONEY_AT_START
.org $d263
  rts
FREE_UNTIL $d280
.endif
.endif


;;; Dialog action $0a is kensu dropping a chest behind - update it to
;;; no longer hardcode an item but instead check persondata[0]
.org $d2f9
  ldx $0623
  lda $0680,x
  pha
  jsr $98a8 ; ReadObjectCoordinatesInto_34_37
  ldx #$1e  ; slot 1e
  stx $10
  lda #$0f  ; boss chest
  sta $11
  jsr WriteCoordsAndLoadOneObject
  pla
  sta $057e
  ldx #$02
  stx $055e
  inx
  stx $061e
  nop
.assert * = $d31c


;;; Switch from e148 since we need to also reload NPCs
.org $d21a
  jmp $e144

