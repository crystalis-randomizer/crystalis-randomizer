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
;;;  7. Add an import for DolphinSpawnTable and allow switching out the indexes
;;;     into the movement script table (because of entrance number changes?)
;;;  8. Add imports for medical herb and fruit of power heal values.

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


;;; Allow more dynamically changing dolphin spawn routines
.pushseg "1b"
.import MovementScriptTable
.org $ae52
  lda MovementScriptTable,y
.org $ae57
  lda MovementScriptTable+1,y
.popseg

.import DolphinSpawnTable
.import dolphinSpawnIndexESI, dolphinSpawnIndexChannel
.org $d663
  ldy #(5 * dolphinSpawnIndexChannel)
.org $d66b
  ldy #(5 * dolphinSpawnIndexESI)
.org $d679
  lda DolphinSpawnTable,y
.org $d68d
  lda DolphinSpawnTable+1,y
.org $d692
  lda DolphinSpawnTable+2,y
.org $d697
  lda DolphinSpawnTable+3,y
.org $d69c
  lda DolphinSpawnTable+4,y

;;; Allow dynamically changing Medical Herb and Fruit of Power values
.segment "0e"
.import itemValueMedicalHerb, itemValueFruitOfPower
.org $84e9
; for some reason the vanilla code is lda medical herb value
; add the current hp, but for fruid of power its
  lda #itemValueMedicalHerb
.org $850b
; load current mp, then add fruit of power value.
  adc #itemValueFruitOfPower

;;; Allow dynamically changing dialog pointers
.import CommonWords, UncommonWords, PersonNames, ItemNames
.import MessageTableBanks, MessageTableParts
