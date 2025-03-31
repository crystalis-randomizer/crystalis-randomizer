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

;.pushseg "1a", "fe", "ff"

FREE "fe" [$d1eb, $d336)

.reloc                          ; smudge from $3d1eb to $3d21d
OVERRIDE
DialogAction_10:
  ;; NPC reveals change magic when talked to (asina and kensu)
  <@3d1eb@>
  <@3d1ed@>
  <@3d1f0@>
  <@3d1f2@>
  <@3d1f5 WaitForDialogToBeDismissedInternal@>
  <@3d1f8 INV_MAGIC_RECOVER@>
  <@3d1fa GrantItemInRegisterA@>
  <@3d1fd@>
OVERRIDE
_3d1ff:
  <@3d1ff@>
  <@3d201 BankSwitch8k_8000@>
  <@3d204 ReadObjectCoordinatesInto_34_37@>
  <@3d207@>
  <@3d209@>
  <@3d20b WriteObjectCoordinatesFrom_34_37@>
  <@3d20e@>
  <@3d210@>
  <@3d212 LoadOneObjectDataInternal@>
  <@3d215@>
  <@3d217@>
  ;; smudge off
  ;; Switch from "Load" to "Reload" since we need to also reload NPCs
  jmp ReloadNpcDataForCurrentLocation ; $e144
  ;; smudge on

.reloc                          ; smudge from $3d21d to $3d23f
OVERRIDE
DialogAction_11:
  ;; Give an item (from $6a0,y), which is the 2nd byte
  <@3d21d LookingAt@>
  <@3d220@>
  ;; smudge off
  ;; Note: we changed this from `bne` to `bpl` to handle sword of wind
  bpl GrantItemInRegisterA
  ;; smudge on
OVERRIDE
DialogAction_03:
  ;; Give an item (from $680,y)
  <@3d225 LookingAt@>
  <@3d228@>
OVERRIDE
GrantItemInRegisterA:
  ;; Version of GrantItemInRegisterA that bails out if the
  ;; item is already owned.
  <@3d22b@>
  ;; smudge off
  lsr
  lsr
  lsr
  tax
  lda $057f
  and #$07
  tay
  lda SlotFlagsStart,x
  and PowersOfTwo,y
    bne :>rts
  ;; smudge on
  <@3d22e LookingAt@>
  <@3d231@>
    <@3d232@>
    <@3d234 LookingAt@>
    <@3d237 MainGameModeJump_07_TriggerSquareOrTreasureChest@>
  <@3d23a@>
  <@3d23b LookingAt@>
  <@3d23e@>

;;; This is just copy-paste, but we move it here to defrag
.reloc              ; smudge from $3d23f to $3d25a
OVERRIDE
DialogAction_06:    ; NOTE: also 0d
  ;; NPC walks away (treasure hunter)?
  <@3d23f@>
  <@3d241@>
  <@3d244@>
  <@3d246@>
  <@3d249@>
  <@3d24c@>
  <@3d24f@>
  <@3d251@>
  <@3d254@>
  <@3d256@>
  <@3d259@>

;;; Defrag copy-paste
.reloc              ; smudge from $3d25a to $3d263
OVERRIDE
DialogAction_0c:
  ;; Dwarf child starts following?
  <@3d25a@>
  <@3d25d@>
  <@3d25f@>
  <@3d262@>

;;; NOTE: We only need this action if the student gives money.
;;; If the money is free at the start of the game then we can
;;; free the whole routine (though there's still a ref to it in
;;; the jump table, so we keep the label) and replace it with a
;;; simple `message.action = 0x11`.
.reloc              ; smudge from $3d263 to $3d280
OVERRIDE
DialogAction_09:
.ifdef _ZEBU_STUDENT_GIVES_MONEY
  ;; Talk to Zebu student
  <@3d263 SFX_TREASURE@>
  <@3d265 StartAudioTrack@>
  <@3d268 <zebuStudentMoney@>
  <@3d26a@>
  <@3d26b@>
  <@3d26e@>
  <@3d271 +@> ; $3d276
    ;; smudge off - fix a bug in original, but also allow >255 money
    adc #>zebuStudentMoney
    ;; smudge on
+ <@3d276@> ; 8000 -> 34000
  <@3d278 BankSwitch8k_8000@>
  <@3d27b@> ; Money
  ;; smudge off
  jsr DisplayNumberInternal
  jmp DialogAction_11
  ;; smudge on
.endif

;;; --------------------------------
.reloc              ; smudge from $3d280 to $3d2ae
OVERRIDE
DialogAction_18:
        <@3d280@>
        <@3d282@>
        <@3d285@> ; 8000 -> 34000
        <@3d287 BankSwitch8k_8000@>
        <@3d28a@>
        <@3d28c ReadObjectCoordinatesInto_34_37@>
        <@3d28f@>
        <@3d291 WriteObjectCoordinatesFrom_34_37@>
        <@3d294@>
        <@3d295 WriteObjectCoordinatesFrom_34_37@>
        <@3d298 PlayerStatus@>
        <@3d29b@>
        ;; smudge off
        jsr UpdatePlayerStatusAndDolphinFlag
        ;; smudge on
        <@3d2a0@>
        <@3d2a2@>
        <@3d2a5@>
        <@3d2a8@>
        <@3d2aa@>
        <@3d2ad@>
;;; --------------------------------
;;; Just a simple defrag
.reloc              ; smudge from $3d2ae to $3d2d3
OVERRIDE
DialogAction_19:
        ;; Give shield ring then walk out
        <@3d2ae INV_SHIELD_RING@>
        <@3d2b0 GrantItemInRegisterA@> ; hard-code rather than $680,x
        <@3d2b3@>
        <@3d2b5@>
        <@3d2b8@>
        <@3d2ba@>
        <@3d2bd@>
        <@3d2c0@>
        <@3d2c3@>
        <@3d2c5@>
        <@3d2c8@>
        <@3d2ca@>
        <@3d2cd@>
        <@3d2cf@>
        <@3d2d2@>
;;; --------------------------------
.reloc             ; smudge from $3d2d3 to $3d2f4
OVERRIDE
DialogAction_15:
        <@3d2d3@>
        <@3d2d6@>
        beq :>rts ; $3d2f3
         <@3d2da@>
         <@3d2dc@>
         <@3d2df@>
         <@3d2e0@>
         <@3d2e3@>
         <@3d2e5@>
         <@3d2e8@>
         <@3d2eb@>
         <@3d2ed@>
         <@3d2f0@>
        <@3d2f3@>
;;; --------------------------------

;;; Dialog action $0a is kensu dropping a chest behind - update it to
;;; no longer hardcode an item but instead check persondata[0]
.reloc                          ; smudge from $3d2f4 to $3d336
OVERRIDE
DialogAction_0a:
  <@3d2f4@>
  <@3d2f6 BankSwitch8k_8000@>
  ldx LookingAt                 ; smudge off
  lda $0680,x ; this holds the persondata[0]
  pha
    jsr ReadObjectCoordinatesInto_34_37
    ldx #$1e  ; slot 1e
    stx $10
    lda #$0f  ; boss chest
    sta $11
    jsr WriteCoordsAndLoadOneObject
  pla
  sta $057e   ; itemget ID
  ldx #$02
  stx $055e
  inx
  stx $061e   ; "boss ID" <- 3 in place of rage
  ;; smudge on
OVERRIDE
DialogAction_02_Disappear:
  <@3d31c@>
OVERRIDE
_3d31f:
  <@3d31f@>
  <@3d321@>
  <@3d324@>
  <@3d326@>
  <@3d329@>
  <@3d32b@>
  <@3d32e@>
  <@3d331 SFX_TELEPORT_AWAY@>
  <@3d333 StartAudioTrack@>
  ;; smudge off


.pushseg "1a", "fe", "ff"

.reloc
;;; TODO - use this in several more places (i.e. dialog action jump 10 ??)
WriteCoordsAndLoadOneObject:
  jsr WriteObjectCoordinatesFrom_34_37
  jmp LoadOneObjectData

.popseg


;;; Allow dynamically changing dolphin entrance routes
OVERRIDE                        ; Provided by npc.ts
.import MovementScriptTable

OVERRIDE                        ; Provided by npc.ts
.import DolphinSpawnTable

.import dolphinSpawnIndexESI, dolphinSpawnIndexChannel
.org $d663
  ldy #(5 * dolphinSpawnIndexChannel)
.org $d66b
  ldy #(5 * dolphinSpawnIndexESI)

;;; Allow dynamically changing Medical Herb and Fruit of Power values
OVERRIDE
.import itemValueMedicalHerb, itemValueFruitOfPower

;;; Allow dynamically changing dialog pointers
OVERRIDE
.import CommonWords, UncommonWords, PersonNames, ItemNames
OVERRIDE
.import MessageTableBanks, MessageTableParts
