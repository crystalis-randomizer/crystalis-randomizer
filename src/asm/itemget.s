;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; ITEM GET PATCHES
;;;  1. Add an extra layer of indirection when spawning chests
;;;  2. Mimics are now any chest over $70 (not just exactly $70)
;;;  3. Use 1xx and 2xx flags consistently for checks and items, respectively
;;;  4. Make bracelets progressive
;;;  5. Indicate which consumable item is in chest when invntory full
;;;  6. Add new items to overflow buffer if inventory full
;;;  7. Simplify invisible chests to read from spawn table instead of logic
;;;  8. Reset graphics after picking up a (boss) chest
;;;  9. Add an "item grant" table to streamline actions that given items
;;; 10. Handle the case of already-owned items more gracefully


.segment "0e", "fe", "ff"

;; If LookingAt is $1f and the item goes into the $20 row then we can't
;; just reject - instead, add the item to an overflow chest.
;; We use the bytes at 64b8..64bf to store the overflow.

;; Treasure chest spawns don't need to be so complicated.
;; Instead, just use the new dedicated ItemGet flags 200..27f
.org $85c3
  ;; Read the flag 100|chest, where chest is in $23
  lda $23
  and #$07
  tay
  lda $c000,y ; powers of two
  pha
   lda $23
   lsr
   lsr
   lsr
   tay
  pla
  and SlotFlagsStart,y
  bne +
   inc $20
+ rts
FREE_UNTIL $85de  ; ~24 bytes


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;; TODO - finish itemget patches
;;;  1. add a new table for indirection
;;;  2. new table can include mimic, so divert spawn
;;;  3. write both 1xx and 2yy flags.
;;;  4. store both ids until after item gotten
;;;     - may need to use something like 61fe ?
;;;  5. ???
;;; Also update the slots.
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;


;; Replace ItemGet with an extra indirection
.org $826f
  jsr PatchStartItemGet

.org $8285
  nop ; don't update $29, it was already written in PatchStartItemGet...
  nop

;; Patches to ItemGet to update the dedicated flag and
;; leave room for calling the difficulty methods
.org $8287
  jsr ItemGet_PickSlotAndAdd

.org $8297
  jmp ItemGetFollowup
FREE_UNTIL $829e  ; ~4 bytes

.org $829e
ItemGet_PickSlotAndAdd:  ; move this up a few bytes
  sty $62
.assert * = $82a0

.org $82a8
  jsr ItemGet_FindOpenSlotWithOverflow

.ifdef _PROGRESSIVE_BRACELET
;;; NOTE: this code replaces the WeaponBallOrBracelet_NotCrystalis branch
;;; of ItemGet, along with the Bracelet-only branch down to 1c308
.org $82de
   lda $29
   bcc +          ; just compared #$o4, swords are good to go
    inc $6430,x   ; try incrementing the power slot
    bne ++        ; if it was empty (ff) then now we're zero
    lsr           ; clear carry if $29 was even (a bracelet)
    lda $29
    sbc #$00      ; subtract one if carry clear, to make it a ball
    sta $23       ; store the *actual* item back in $23, which is used later
+  sta $6430,x    ; store the item in its spot
++ lda $6430,x    ; read the item back again (in case we jumped here)
   sta $07dc      ; store the actual item in the dialog spot to get right message
   rts ; jmp PostInventoryMenu (note: would be nice to get items right)
FREE_UNTIL $8308
.endif

;;; Exported by rom/slots.ts
.import CheckToItemGetMap

;;; NOTE: The start of this table is in the middle of some freed section
;;; [$9c82, $9daf); we only preserve the second half of the table, starting
;;; at $9daf (y=$49).
OriginalItemGetTable = $9d66

.reloc
PatchStartItemGet:
  lda $23
  sta $61fe
  tax
  lda CheckToItemGetMap,x
  tay
  cmp #$70
  bcc @RegularItem
    ; Mimics are the 16 objects from $70 to $80, so use the Powers of Two lookup to convert from the mimic to
    ; a mask for the byte. $70-$77 in the lo byte $78-$7f in hi
.ifdef _STATS_TRACKING
    cmp #$78
    bcc +
      sec
      sbc #$78
      tay
      lda PowersOfTwo,y
      ora StatsMimicsHi
      sta StatsMimicsHi
      bcs @SkipToSpawnMimic ; unconditional
+   sec
    sbc #$70
    tay
    lda PowersOfTwo,y
    ora StatsMimicsLo
    sta StatsMimicsLo
.endif
   ;; spawn mimic instead - need to back out of 3 layers of calls
   ;; TODO - keep track of which mimic so we can set the flag?
@SkipToSpawnMimic:
    pla
    pla
    pla
    pla
    pla
    pla
    jmp SpawnMimic
@RegularItem:
  cmp #$49
  bcc +
   lda OriginalItemGetTable,y  ; NOTE: y>=$49, so this is really [$9daf...)
+ sta $29
  sta $07dc   ; TODO - can we ditch the table at 3d45c now?
.ifdef _STATS_TRACKING
  jmp CheckForStatTrackedItems
.else
  rts         ;      - what about other writes to 07dc?
.endif ; _STATS_TRACKING
;; TODO - why is this here?

.org $d3f6              ; Within game mode jump 07 (trigger / chest)
  ;; This is only a minor optimization to skip the 4 nops we add below
  bcc +
.org $d3fb              ; HandleTreasureChest
  ;; This normally checks for a mimic spawn, but we check that elsewhere
  ;; so just replace it with nops.
  nop ; just in case there's another entry into here
  nop
  nop
  nop
+:

;; Fix dialog to work with us... (patch in the middle here)
ShowTreasureChestMessage = $d41c
.org $d404
  ;lda $62 ; the actual item gained (or tried to gain)
  ;sta $07dc   ; note: already written in PatchStartItemGet
  lda $23
  bmi HandleTreasureChest_TooManyItems ; patched version of this message tells what was in chest
  bpl ShowTreasureChestMessage
  ;; skip these bytes
FREE_UNTIL $d41c

.org $d47c ; HandleTreasureChest_TooManyItems
HandleTreasureChest_TooManyItems:
  ;; Rather than using the global timer to determine whether
  ;; to show the "too many items" message, use the gamepad:
  ;; only show if pressing a direction ($49 != #$ff)
  lda $49
  bpl +
   rts
   nop
+:
.assert * = $d482


;;; Redisplay scaling level when it changes
.segment "0e", "0f", "fe", "ff"
.reloc
ItemGetRedisplayDifficulty:
  lda ShouldRedisplayUI
  ora #UPDATE_DIFFICULTY
  sta ShouldRedisplayUI
  rts

;;; Exported by rom/item.ts
.import KeyItemData
.reloc
ItemGetFollowup:
  ;; The vanilla code checks whether the last byte at ($24),y is negative
  ;; and if not, then it stores the positive value in $23 as some sort of
  ;; "chained" ItemGet and repeats the whole ItemGet routine from the
  ;; start.  But no items actually use this, so we don't bother copying
  ;; it here.  If we needed to, it's easy enough to `lda ($24),y;pha` and
  ;; then instead of a simple `rts` we `pla;bmi >rts;sta $23;jmp ItemGet`.

  ;; Check if this is a key item, and maybe increase difficulty.
  lda $29
  lsr
  lsr
  lsr
  tay
  lda $29
  and #$07
  tax
  lda KeyItemData,y
  and PowersOfTwo,x
  beq +
   inc Difficulty
   jsr ItemGetRedisplayDifficulty
   ;; Always set the dedicated 200+chest flag.
+:
  ;; lda #$42
  ;; sta $61
  ;; ;; $62 is already the item number, saved from earlier
  ;; lda #$61
  ;; sta $24
  ;; lda #$00
  ;; sta $25
  ;; tay
  ;; jmp SetOrClearFlagsFromBytePair_24y
  ldy #$02
  lda $62
  jsr SetFlagYA
  ldy #$01
  lda $61fe
  jmp SetFlagYA

.reloc
ItemGet_FindOpenSlotWithOverflow:
  tay ; copied from 1c2a8
  bmi +
   pla ; make the call into this actually a jump...
   pla
   stx $61  ; save this for now
   jsr ItemGet_FindOpenSlot
   ;; if 23 nonzero then we failed to find a slot
   ;; if 61 is 20 then we really need to put it somewhere
   ;; in that case, add it to the overflow.  when we
   ;; delete a key item, it will fall in
   lda $23
    beq +
   lda $61
   cmp #$20
    bne +
   ;; need to find a place
   ldx #$07
-   lda $64b8,x
    beq ++
    dex
    bpl -
+ rts
++  lda $29
    sta $64b8,x
    lda #$00
    sta $23
    rts


;;; Convert a beq to a bcs for mimic spawns - any chest between $70 and $80
;;; will now spawn a mimic.
;;; .org $7d3fd
;;;   .byte $b0


.segment "fe", "ff"


.ifdef _SIMPLIFY_INVISIBLE_CHESTS
;;; We co-opt the unused npcdata[2]:20 bit to signify invisible chests
.org $e39f
  lda $2e
  and #$20
  beq $e3ad  ; normal chest
  bne $e3b0  ; invisible chest
  ;; 6 free bytes now
.endif


.org $d458
    ;; Once we pick up a chest, reset the graphics?
    jmp ReloadLocationGraphicsAfterChest

.reloc
ReloadLocationGraphicsAfterChest:
    ;; After player picks up a chest, reload the location's graphics.
    ;; NOTE: we make an exception for Stom's house, since it needs to
    ;;       keep the modified pattern (4e instead of 4d)
    ;;       TODO - this is pretty crummy, consider finding a better solution
    lda $6c
    cmp #$1e
    beq +
     jsr $e148 ; reload just graphics, not objects
+   jmp $d552 ; ExecuteItemOrTriggerAction


;;; This lives in the dialog followup action code section, but we
;;; want to change how it behaves by bailing out if the item is
;;; already owned.
.org $d22b
GrantItemInRegisterA:
  jsr @PatchGrantItemInRegisterA

.reloc
@PatchGrantItemInRegisterA:
  ;; Version of GrantItemInRegisterA that bails out if the
  ;; item is already owned.
  sta $057f
  lsr
  lsr
  lsr
  tax
  lda $057f
  and #$07
  tay
  lda SlotFlagsStart,x
  and PowersOfTwo,y
  beq +
   pla
   pla
+ rts


;;; ================================================================

;;; This is a (ff-terminated) key-value table mapping item/trigger ID to
;;; itemget ID.  It's written directly by the randomizer, so we just import
;;; it here.  Factoring this out into a table both streamlines the process
;;; for granting items, but also makes it much easier to change which item
;;; comes from which check (or swapping out trigger/item effects).
.import GrantItemTable
;;   .byte $25,$29  ; 25 statue of onyx use -> 29 gas mask
;;   .byte $39,$3a  ; 39 glowing lamp use -> 3a statue of gold
;;   .byte $3b,$47  ; 3b love pendant use -> 47 change
;;   .byte $3c,$3e  ; 3c kirisa plant use -> 3e bow of moon
;;   .byte $84,$46  ; 84 angry sea trigger -> 46 barrier
;;   .byte $b2,$42  ; b2 summit trigger -> 42 paralysis
;;   .byte $b4,$41  ; b4 windmill cave trigger -> 41 refresh
;;   .byte $ff      ; for bookkeeping purposes, not actually used

;; .assert * = $d6e4

.reloc
GrantItemFromTable:
  ldy #$00
  lda $34
-  iny
   iny
   ;; beq >rts    ; do we need a safety?
   cmp GrantItemTable-2,y
  bne -
+ lda GrantItemTable-1,y
  jmp GrantItemInRegisterA
