;;; Main patch data.  Note that the shuffle takes place in three steps:
;;;
;;;   1. Initial patch.
;;;   2. Shuffle.
;;;   3. Delayed patch.
;;;
;;; This file takes care of steps 1 and 3, as indicated by a prepended
;;; define clause.  After the initial patch, the shuffle step will read
;;; and parse various tables in the ROM, and will potentially write
;;; rearranged and defragmented tables back.  The upshot is that the
;;; initial step will write data that the parser will read, but cannot
;;; make use of any of the recovered space.  The delayed step can write
;;; to this space, but may not know where certain tables ended up.
;;; 
;;; Various flag-based defines will be prepended to this file, indicated
;;; by a `_` prefix.


;;; Indicate the fixed bank - this is always the case.
.bank $3c000 $c000:$4000

;;; Various global definitions.
define ObjectRecoil $340
define ObjectHP $3c0
define PlayerHP $3c1
define PlayerMaxHP $3c0
define ObjectAtk $3e0
define PlayerAtk $3e1
define ObjectDef $400
define PlayerLevel $421
define ObjectActionScript $4a0
define ObjectGold $500
define ObjectElementalDefense $500
define ObjectExp $520
define PlayerMP $708
define EquippedConsumableItem  $715
define EquippedPassiveItem     $716


define InvSwords $6430
define InvConsumables $6440
define InvPassive $6448
define InvQuest $6450
define InvMagic $6458
define SlotFlagsStart $64a0
define ItemFlagsStart $64c0
define Difficulty $648f         ; requires defrag! (flags 078 .. 07f)
define ShouldRedisplayDifficulty $61ff

        
define SelectedConsumableIndex  $642c
define SelectedQuestItemIndex   $642e

.ifdef _EXTRA_PITY_MP
define PITY_MP_AMOUNT     20
define ONE_MINUS_PITY_MP  237
.else
define PITY_MP_AMOUNT     1
define ONE_MINUS_PITY_MP  0
.endif        

define PITY_HP_AMOUNT     5

define SHOP_COUNT         11
define SCALING_LEVELS     48

.ifdef _UNIDENTIFIED_ITEMS
define SORT_START_ROW     3
.else
define SORT_START_ROW     2
.endif

;;; Constants
define ITEM_RABBIT_BOOTS     $12
define ITEM_OPEL_STATUE      $26
define SFX_MONSTER_HIT       $21
define SFX_ATTACK_IMMUNE     $3a

;;; see http://www.6502.org/tutorials/6502opcodes.html#BIT
;;; note: this is dangerous if it would result in a register read
define SKIP_TWO_BYTES   $2c

;;; Labels
.org $1c112
SetOrClearFlagsFromBytePair_24y:
.org $1c135
ReadFlagFromBytePair_24y:
.org $1c26f
ItemGet:
.org $1c2f4
ItemGet_Bracelet:
.org $1c308
ItemGet_FindOpenSlot:
.org $1c354
ItemUse_TradeIn:
.org $217cd
Shop_NothingPressed:
.org $21c7a
AfterLoadGame:
.org $2791c
PlayerDeath:
.org $279b0
ActivateOpelStatue:
.org $34bc0
ArmorDefense:
.org $34bc9
ShieldDefense:
.org $34e46
DisplayNumberInternal:
.org $35152
KillObject:
.org $355c0
KnockbackObject:
.org $3c000
PowersOfTwo:
.org $3c008
UpdateEquipmentAndStatus:
.org $3c125
StartAudioTrack:
.org $3c25d
LoadOneObjectDataInternal:
.org $3cab6
MainLoop_01_Game:
.org $3cb84
CheckForPlayerDeath:
.org $3d21d
DialogAction_11:
.org $3d347
LoadAndShowDialog:
.org $3d354
WaitForDialogToBeDismissed:
.org $3d3ff
MainLoopItemGet:
.org $3e756
RestoreBanksAndReturn:
.org $3fe80
ReadControllersWithDirections:
.org $3ffa9
DisplayNumber:


.bank $14000 $8000:$4000

;;; NOTE: there's space here, but we glob it into the space
;;; recovered from defragging MapData... if we want it back
;;; we'll need to change the "end" address there.
;.org $17cfa
;;; just over 256 bytes free in map space
;.assert < $17e00


.org $17f00
;; another 256 free in map space
.assert < $18000


.bank $18000 $8000:$4000


.org $183fc
;; ~80 bytes free in middle of SFX data that could be used on the npc data page?
.assert < $1844d

.org $1aba3 ; empty space at end of npcdata
        ;; unused
.assert < $1ac00 ; end of free space started at $1aba3

.bank $1c000 $8000:$4000

;; .ifdef _BUFF_DYNA
;; .ifdef _REMOVE_MAGIC_FOR_DYNA
;; ;;; Patch ItemGet_Crystalis to remove magics, too
;; .org $1c2b7

;;   ldx #$03
;; -  lda #$ff
;;    sta $6430,x
;;    sta $643c,x
;;    sta $6458,x
;;    sta $645c,x
;;    dex
;;   bpl -
;;   lda #$04
;;   sta $6430
;;   lda #$05
;;   sta $0711
;;   lda #$00
;;   sta $0712
;;   rts

;; .assert < $1c2dd
;; .endif
;; .endif


;;; Patch the end of ItemUse to check for a few more items.
.org $1c34d
  jmp PatchTradeInItem


.org $1c399 ; 58 bytes of free/unused space at start of itemuse jump
;; FixStatue:
  ;; sta $61
  ;; sta $643f,x
  ;; ;; also need to set the item flags...
  ;; lda $24
  ;; pha
  ;;  lda $25
  ;;  pha


;;;  TODO - this is broken - we probably need to update
;;;  the ItemUseData to do give the item, but that's also
;;;  tricky because how to store what the result is?!?
;;;   --> move all the trade-ins to be embedded in itemuse?!?
;;;  No, itemusejump should be able to do it?
;;;    --- see ???
;;;  ItemOrTriggerActionJump_0d currently hard-codes bow of moon
;;;    --- instead lookup table
    
  ;; jmp $d22b

  ;; tay
  ;; lda $23
  ;; pha
  ;;  sty $23
  ;;  lda #$ff
  ;;  sta $643f,x
  ;;  lda $24
  ;;  pha
  ;;   lda $25
  ;;   pha
  ;;    jsr $8271
  ;;   pla
  ;;   sta $25
  ;;  pla
  ;;  sta $24
  ;; pla
  ;; sta $23
  ;; rts

.assert < $1c3d3

.org $1c3eb ; 16 bytes of free/unused space in middle of itemuse jump
    ;; TODO - extra item indirection preamble...
    ;; handle different checks

    

.assert < $1c3fb

.org $1c41b ; 30 bytes of free/unused space at end of itemuse jump
.assert < $1c439


.org $1c157
  .word (PowersOfTwo) ; no need for multiple copies


;;; Fix the overly-long loop to find broken statue
;; .org $1c585
;;   ldx #$08
;; - lda $6450,x
;;   cmp #$38    ; broken statue
;;   beq +
;;   dex
;;   bpl -
;;   jmp $84db
;;; Allow giving arbitrary items for broken statue trade-in
.org $1c594
  lda #$ff
;  sta $6450,x
  ;rts
;;   ;; 9 free bytes, could be more if we remove the unused Flute of Lime checks
;; .assert < $1c59e

;.org $1c596
;  jsr $d22b ; grant item in register A
;  jsr FixStatue
 ; jmp FixStatue


;; Count uses of Flute of Lime and Alarm Flute - discard after two.
.org $1c6f2 ; 10 free bytes in middle of spawn condition table
PatchTradeInItem:
  cmp #$31  ; alarm flute
  beq +
  cmp #$28  ; flute of lime
  beq ++
  bne ++++
.assert < $1c6fc

.org $1c6fe ; free space in middle of spawn condition table
+    lda #$40
     .byte $2c ; skip the next instruction (safe b/c $80a9 is prg rom)
++   lda #$80
     sta $61
+++  lda $648e ; check flag 076 (alarm flute) or 077 (flute of lime)
     and $61
     bne ++++
     lda $648e
     ora $61
     sta $648e
     ;; Deselect current item
     lda #$00
     sta $0715
     lda #$80
     sta $642e
     rts
++++ jmp ItemUse_TradeIn

;;; Plenty of free space here!

.assert < $1c760

.org $1ca6f ; 10 free bytes in middle of dialog table
.assert < $1ca79

.org $1ca7b ; free space in middle of dialog table
.assert < $1cae3


;; Prevent soft-lock when encountering sabera and mado from reverse
;; Double-returns if the boss's sprite is not in the top quarter of
;; the screen. This is unused space after triggers.
.org $1e3c0
CheckBelowBoss:
   lda $0380,x
    bmi ++
   ; skip the check for sabera 1 and mado 1
   lda $04a0,x
   and #$fe
   cmp #$e6  ; sabera and mado
   bne +
    lda #$dc
    cmp $04c0,x  ; first version has #$cf, second has #$dc
    bne ++
+  sec
   lda $d0
   sbc $d0,x
    bmi ++
   lda $b0
   sbc $b0,x
    bmi ++
   sbc #$40
++ rts
.assert < $1e3f0

.ifdef _NERF_MADO
;;; Mado's cannonball time is a function of his HP: framecount = HP + #$20.
;;; This causes problems when HP >= #$e0, since it overflows.  We can make
;;; sure he bounces for less time by dividing by two instead of clearing
;;; carry.  We also change the shift to #$18, making the range 24..152
;;; rather than 0..255.
.org $1ee53
  lsr
  adc #$18
.endif

.org $1e48b  ; vampire pattern 0
  jsr CheckBelowBoss
.org $1e971  ; kelbesque pattern 0
  jsr CheckBelowBoss
.org $1ec8f  ; sabera pattern 0
  jsr CheckBelowBoss
.org $1ede8  ; mado pattern 0
  jsr CheckBelowBoss

;; If LookingAt is $1f and the item goes into the $20 row then we can't
;; just reject - instead, add the item to an overflow chest.
;; We use the bytes at 64b8..64bf to store the overflow.

.ifdef _DEBUG_DIALOG
;;; Auto level-up and scaling-up dialogs
.org $1cc87                     ; leaf rabbit -> action 1e
  .byte $20,$00,$f2,$84
.org $1cc30                     ; leaf daughter -> action 1d
  .byte $20,$00,$e8,$1d
;.org $1cb58                     ; leaf elder -> action 1c
.org $1cc62                     ; leaf red girl -> action 1c
  .byte $20,$00,$e0,$0f
.endif

;;; ITEM GET PATCHES


;; Treasure chest spawns don't need to be so complicated.
;; Instead, just use the new dedicated ItemGet flags 200..27f
.org $1c5c3
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
+ rts ; 24 bytes
.assert < $1c5de



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
.org $1c26f
  jsr PatchStartItemGet

.org $1c285
  nop ; don't update $29, it was already written in PatchStartItemGet...
  nop

;; Patches to ItemGet to update the dedicated flag and
;; leave room for calling the difficulty methods
.org $1c287
  jsr ItemGet_PickSlotAndAdd
.org $1c297
  jmp ItemGetFollowup
        ;; 4 bytes free here
.assert < $1c29e
.org $1c29e
ItemGet_PickSlotAndAdd:  ; move this up a few bytes
  sty $62
.assert $1c2a0

.org $1c2a8
  jsr ItemGet_FindOpenSlotWithOverflow

.ifdef _PROGRESSIVE_BRACELET
.org $1c2de
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
.assert < $1c308
.endif

.org $1dc82

CheckToItemGetMap:
  .byte $00,$01,$02,$03,$04,$05,$06,$07,$08,$09,$0a,$0b,$0c,$0d,$0e,$0f
  .byte $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$1a,$1b,$1c,$1d,$1e,$1f
  .byte $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$2a,$2b,$2c,$2d,$2e,$2f
  .byte $30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$3a,$3b,$3c,$3d,$3e,$3f
  .byte $40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$4a,$4b,$4c,$4d,$4e,$4f
  .byte $50,$51,$52,$53,$54,$55,$56,$57,$58,$59,$5a,$5b,$5c,$5d,$5e,$5f
  .byte $60,$61,$62,$63,$64,$65,$66,$67,$68,$69,$6a,$6b,$6c,$6d,$6e,$6f
  .byte $70,$71,$72,$73,$74,$75,$76,$77,$78,$79,$7a,$7b,$7c,$7d,$7e,$7f

PatchStartItemGet:
  lda $23
  sta $61fe
  tax
  lda CheckToItemGetMap,x
  tay
  cmp #$70
  bcc +
   ;; spawn mimic instead - need to back out of 3 layers of calls
   ;; TODO - keep track of which mimic so we can set the flag?
   pla
   pla
   pla
   pla
   pla
   pla
   jmp $d3da  ; SpawnMimic
+ cmp #$49
  bcc +
   lda $9d66,y
+ sta $29
  sta $07dc   ; TODO - can we ditch the table at 3d45c now?
              ;      - what about other writes to 07dc?
  rts

;; Freed from the chest spawn pointer table
;;   - TODO - could free up to 1ddaf, which would give 256 bytes
;;            but we need to only look up table if id > $49
.assert < $1ddaf

.org $3d3f7
  .byte $07 ; skip the nops
.org $3d3fb
  nop ; just in case there's another entry into here
  nop
  nop
  nop

;; Fix dialog to work with us...
.org $3d404
  ;lda $62 ; the actual item gained (or tried to gain)
  ;sta $07dc   ; note: already written in PatchStartItemGet
  lda $23
  bmi HandleTreasureChest_TooManyItems ; patched version of this message tells what was in chest
  bpl ShowTreasureChestMessage
  ;; skip these bytes
.assert < $3d41c
.org $3d41c ; Show actual message of what you got
ShowTreasureChestMessage:
.org $3d47c ; HandleTreasureChest_TooManyItems
HandleTreasureChest_TooManyItems:


;; Freed from the chest spawn data
.org $1e106
ItemGetRedisplayDifficulty:
.ifdef _DISPLAY_DIFFICULTY
  nop  ; TODO - just remove the path?
.else
  rts
.endif
  lda #$01
  sta ShouldRedisplayDifficulty
  rts
.org $1e110
KeyItemData:
  .res 10, 0
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

;; TODO - still 15 bytes here?
.assert < $1e17a


.ifdef _FIX_VAMPIRE
;;; Fix vampire to allow >60 HP.  Normally at 61 HP there's an overflow
;;; and the teleport animation gets really fast until HP drops below 61.
.org $1e576
  jsr ComputeVampireAnimationStart
  nop
.assert $1e57a ; match up exactly to next instruction
.endif


;;; Ensure Draygon 2 spawns directly if bow of truth was used earlier.
.org $1f1a1
  jsr SpawnDraygon

;;; Boss chest action jump has some special handling for bosskill 3 (rage)
;;; which is instead used for Kensu dropping a chest.  We'll rearrange the
;;; special case to consolidate.
;; .org $1f766
;;   lda #$8d
;;   sta $03a0,x
;;   lda #$aa
;;   sta $0300,x
;;   lda $0600,x
;;   asl
;;   asl
;;   ;clc
;;   adc $0600,x
;;   tay
;;   cpy #$0f
.org $1f76b
  beq HandleKensuChestInit
.org $1f77b
ReturnFromKensuChest:
.org $1f7c2
HandleKensuChestInit:
  jmp HandleKensuChest
.org $1f7d0
  .byte $00  


;;; We moved the LV(menu) display from 06 to 0e so display that instead
.org $1fd27
  lda #$0e

.org $1ff46
;;; TODO - consider grafting in our own debug mode here?
.assert < $1ff97

;; This looks like it's just junk at the end, but we could
;; probably go to $1ff47 if we don't care about developer mode
.org $1ff97
ComputeVampireAnimationStart:
   bcs +
   asl
   bcs +
   adc #$10
   bcc ++
+  lda #$ff
++ rts

HandleKensuChest:
  lda #$09
  sta $033e
  jmp ReturnFromKensuChest


;;; Once we use the Bow of Truth, it's gone, so we need to make sure
;;; any future encounters with Draygon 2 automatically go to the
;;; final form.  Since triggers and itemuse actions share the same
;;; address space, we add a fake trigger $a0 that has the same reveal
;;; action as using the Bow of Truth.  But rather than placing it on
;;; the screen (and incurring lag by stepping on it) we instead
;;; simulate it during the "start fight" object action by setting
;;; 0623 and 057f as if we were standing in front of it.  To get this
;;; right we actually need to move the UsedBowOfTruth trigger to a
;;; fixed position (02f) that we can check easily.
SpawnDraygon:
  inc $0600,x ; original action
  lda $06c3
  beq +       ; make sure we're looking at draygon 2, not 1
  lda $6485
  bpl +       ; check flag 02f
  lda #$1f
  sta $0623
  lda #$a0
  sta $057f
  lda #$07 ; trigger tile
  sta $41
+ rts

.assert < $20000

.bank $20000 $8000:$2000

;; Replace "drop item" code for key items to use an overflow buffer

.org $20372
  jsr CheckDroppable

.org $20434
  jsr MaybeDrop
  nop
  nop

.org $20ff0
InvItemData:


;; MUST BE EXACTLY 4 BYTES
.org $20534
  nop
  jsr FillQuestItemsFromBuffer
.assert $20538

;; NOTE: This prevents swords and orbs from sorting to avoid out-of-order
;; swords from clobbering one another.  We swap the second and fourth
;; items from the table of row starts so that when we start at two instead
;; of zero, we end up skipping exactly the first and fourth rows.
;; We change the sort order more generally so that we can prevent sorting
;; the key item row as well if unidentified items is set.
.org $2059e
  .byte $04,$04,$08,$08,$08,$08,$04,$04
  .byte $00,$0c,$20,$10,$18,$28,$04,$08


.org $21471 ; unused space, 130 or so bytes
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
FillQuestItemsFromBuffer: ; 214af
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

;;; Support for fixing sword charge glitch
ReloadInventoryAfterLoad:
  jsr PostInventoryMenu
  jmp AfterLoadGame

        ;; FREE: 3 bytes?
.assert < $21500

.org $20a37
        ;; FREE: 35 bytes
.assert < $20a5a



.ifdef _DISABLE_SHOP_GLITCH
;;; Disable the shop glitch by ensuring prices are updated immediately
;;; after moving the cursor, rather than a few frames later.
.org $21812
    jmp Shop_NothingPressed
.endif




.ifdef _FIX_OPEL_STATUE
;;; Don't select Opel Statue at all.  This patches the table at $2103b
;;; that translates an item ID to a "selected item" index, i.e. each
;;; type of item maps to a series 1..N.  In this case, we just remap
;;; Opel Statue to zero so that it looks like nothing is selected.
.org $21061
  .byte $00
.endif




.ifdef _DISABLE_SWORD_CHARGE_GLITCH
.org $21bce
  jmp ReloadInventoryAfterLoad
.org $21bde
  jmp ReloadInventoryAfterLoad
.endif


.bank $24000 $8000:$2000
.bank $26000 $a000:$2000

;;; Rewrite the page boundary to avoid code crossing it.
.org $25fef
  ;; Need to fit this in 17 bytes
  sta $09     ; 85 09
  ldy #$03    ; a0 04
- sta $06f0,y ; 99 f0 06
  sta $0002,y ; 99 02 00
  dey         ; 88
  bpl -       ; 10 f7
  jmp $a005   ; 4c 05 a0
.assert < $26000


.org $264b3
.assert < $264bf


.ifdef _FIX_OPEL_STATUE
;; Search inventory for a statue
.org $2788d ; START OF FREE SPACE
CheckOpelStatue:
.ifndef _NEVER_DIE
  lda $6440,x
  cmp #$26
  beq +
   dex
   bpl CheckOpelStatue
    jmp PlayerDeath
+ stx SelectedConsumableIndex
  lda #$0a
  sta EquippedConsumableItem
  jmp ActivateOpelStatue
.else
  ;; Special code path for "never die" mode
  jsr ActivateOpelStatue
  lda #$08
  sta $41
  rts
.endif
.assert < $27900 ; END OF FREE SPACE from $2788d or $278e9

.org $27903
  and #$f0
  ;; Now check opel statue
.org $27912
  ldx #$07
  jmp CheckOpelStatue
        ;; 5 free bytes
.assert < $2791c
.endif


.ifdef _DISPLAY_DIFFICULTY
;;; Start the loop at 6 instead of 5 to also show the difficulty
.org $27aca
  ldx #$06
.endif


;;; Fix the graphics glitch from getting a sword while changed.
.org $27c04
  jsr MaybeRevertChangeOnSwordGet

.org $27ff2
    ;; probably unused, but has some structure...?
MaybeRevertChangeOnSwordGet:
  lda $0710
  and #$80
  beq +
   jsr $bb9d ; 27b9d MainGameModeJump_19_ChangeMagicRevertAnimation
+ jmp $c867  ; 3c867 ??

.assert < $28000



.bank $2e000 $a000:$2000

.org $2fbd5 ; NOTE: start of an unused block

;;; Prevent softlock from saving or checkpointing with zero health or MP.
;;; This handles cases such as (1) swamp runs when the last HP was lost
;;; exactly upon entering Oak, (2) reverse goa runs where flight is needed
;;; to exit, but the last MP was used and no wise men are available to
;;; restore, (3) the first sword requires flying to Swan and then passing
;;; through the gate.  This patch guarantees starting with 5 HP and 1 MP,
;;; unless the player is swordless, in which case 20 MP are given (since
;;; it may be impossible to stay at an inn or buy magic-restoring items).
;;; This is entered by a patched call at $2fd82.
CheckForLowHpMp:
    cmp #PITY_HP_AMOUNT
    bcs +
     lda #PITY_HP_AMOUNT
+   sta PlayerHP
    ;; Check if we've ever found any swords
    lda ItemFlagsStart
    and #$0f
    ;; If this is zero then we have no swords and should give 20 MP.
    ;; If it's nonzero, set it to -19 and then we'll add 20 unconditionally.
    ;; Note that we can ignore the swordless check via a flag.
    beq +
     lda #ONE_MINUS_PITY_MP
+   clc
    adc #PITY_MP_AMOUNT
    ;; Now compare with MP - if it's less, set the minimum.
    cmp PlayerMP
    bcc +
     sta PlayerMP
+   rts

;;; This glitch works because the game sets three separate checkpoints
;;; when using warp boots: one from $3e538 (ExitTypeJump_2_Warp) after
;;; setting the location/exit but before setting coordinates, another
;;; from $3e503 (ExitTypeJump_0_Normal) after setting the coordinates
;;; but before consuming the item, and then the third time from $3d4ef
;;; (the warp boots follow-up of MainGameModeJump_06).  The third one
;;; is unique to Warp Boots (Teleport only does the first two), and is
;;; also the only one that does not run with GameMode == #$06.  The fix
;;; is simple: don't set the checkpoint in GameMode_06.
FixWarpBootsReuseGlitch:
  lda $41  ; GameMode
  cmp #$06 ; item use
  bne MaybeSetCheckpointActual
  rts

.assert < $2fc00 ; end of unused block from $2fbd5

.ifdef _DISABLE_WARP_BOOTS_REUSE
.org $2fc00
  ;; Normally this just jumps to MaybeSetCheckpointActual, which is kind
  ;; of pointless, but it provides a convenient point of indirection for
  ;; us to use here.
  jmp FixWarpBootsReuseGlitch
.endif

.org $2fc09
MaybeSetCheckpointActual:

.ifdef _PITY_HP_AND_MP
.org $2fd82 ; normally "sta $03c1"
  jsr CheckForLowHpMp
.endif ; _PITY_HP_AND_MP

.ifdef _HARDCORE_MODE
.org $2ff00
  .res 256, 0
.endif


.bank $34000 $8000:$4000

;;; Numeric displays
.org $34ee9  ; 06 - was LV(menu) but now it's difficulty
  .word (Difficulty)
  .byte $3c,$2b,$03,$00 ; display right of lvl
.org $34f19  ; 0e - was unused, now it's LV(menu)
  .byte $21,$04,$29,$29,$03,$00 ; copied from $34ee9


;; ADJUSTED DAMAGE CALCULATIONS
;; $61 is extra HP bit(s)
;; $62 is DEF
;; $63 is damage
.org $350fa
    lda #$00
    sta $61
    sta $63 ; damage we're actually going to do
    ;; Check elemental immunity
    lda ObjectElementalDefense,y
    and ObjectElementalDefense,x
    and #$0f
    php
     lda ObjectDef,y
     lsr     ; Just pull one extra bit for HP, could do one more if needed
     rol $61
     sta $62 ; Store actual shifted DEF in $62
     lda PlayerAtk
     adc ObjectAtk,x
     sec
     sbc $62 ; A <- atk - def
     bcc +
    plp
    bne ++
     sta $63 ; will do damage
     pha ; to prevent pla from screwing up
+   pla  ; to compensate for skipping the plp above
++  stx $10
    sty $11
    lda $63
    bne ++
      sta ObjectActionScript,x
      lda ObjectActionScript,y
      bmi +
       jsr KnockbackObject
+     lda #SFX_ATTACK_IMMUNE
      inc $63
      bne +++
++   jsr KnockbackObject
     lda #SFX_MONSTER_HIT
+++ jsr StartAudioTrack
    jsr SubtractEnemyHP
     bcc KillObject
    lsr
    lda $62
    rol
    sta ObjectDef,y
    rts
;;; NOTE: must finish before 35152
.assert < $35152


;;; Change sacred shield to block curse instead of paralysis
.org $352ce
  cmp #$05 ; ceramic shield blocks paralysis
.org $3534c
  jsr CheckSacredShieldForCurse


;;; Allow other negative numbers to indicate projectile damage.
;;; Only $ff exactly will cause it to despawn.  This allows marking
;;; flails as $fe so that they still do projectile damage, but won't
;;; disappear.
.org $353df
  nop
  nop
  bpl + ; $353e8
.org $353e8
+:

.ifdef _DISABLE_TRIGGER_SKIP
;;; The jumping warp-boots trigger skip works as follows:
;;; Because the main loop reads the controller first and
;;; sets the mode to #$06.  The trigger square only takes
;;; effect (by setting the mode to #$07) if the mode was
;;; #$08 (normal mode for walking on the map).  Because
;;; the item is being used, the trigger effect is skipped.
;;; The solution is to add a new game mode #$05 for using
;;; an item while on a trigger square.  After evaluating
;;; the item use, we jump right into to the trigger mode.
.org $354a2
  ;; save 623 first regardless
  lda $41
  cmp #$08
  beq +
   cmp #$06
   beq +
    rts
+ jmp SetTriggerTileGameMode
.org $3cae8
  .word (GameModeJump_05_ItemTrigger)

.endif

.ifdef _DISABLE_STATUE_GLITCH
.org $3559a
  ;; Just always push down.
  lda #$04
.endif

.org $35b96 ; clear dolphin bit => also clear the flag
  jsr UpdatePlayerStatusAndDolphinFlag

;; Adjusted stab damage for populating sword object ($02)
.org $35c5f
  lda #$02
.ifdef _NERF_FLIGHT
  jmp CheckSwordCollisionPlane
.else
  sta $03e2
.endif
  rts

.ifdef _RABBIT_BOOTS_CHARGE_WHILE_WALKING
.org $35e00
  jsr CheckRabbitBoots
.endif


.bank $36000 $a000:$2000
;
;.org $36086
;
;        ;; Free space at end of UseMagicJump
;        
;.assert < $36092 
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
;.assert < $3788f
;.org $3788f
;GateCheckFailed:
;.org $37896
;GateCheckPassed:

;;; Free up some space in the magic table by consolidating the used magics.
.org $36033
  .byte $98 ; this table moved back 6 bytes, to 36098
.org $36086
SetTriggerTileGameMode:
  sty $0623
  dec $41
  rts
  ;; 12 bytes free
.assert < $36098
.org $36098
  .byte $08,$00,$08,$08,$08,$08,$00,$08,$00,$08
.assert $360a2


.ifdef _CUSTOM_SHOOTING_WALLS
.org $1a168
  .byte $33,$33 ; make the wall at the front of goa shoot
.org $1a48e
  .byte $33,$33 ; make the oasis cave wall shoot
.org $36864
  lda $06c0,x
  nop
  nop
  nop
  cmp #$ff
.endif

.ifdef _FIX_COIN_SPRITES
;;; Normally this code reads from a table to give the 16 different coin drop
;;; buckets a different metasprite.  Instead, we just change the CHR pages
;;; so that they're all compatible with $a9, which is loaded by LoadObject
;;; (after we updated the coin's object data to use a9 instead of a8).
;;; Now everything shows a single big coin.  This leads to slightly less
;;; variety, but less glitchy graphics.  Mimics should load $aa instead.
;;; We can tell because $300,x == $90.  This also frees up metasprite a8.
.org $34bfe
  ;; this table is no longer read, free up 16 bytes
.assert < $34c0e

.org $37a1c
  lda $0300,x
  cmp #$90
  bne +
   inc $0300,y
+ rts
  ;; freed 5 bytes
.assert < $37a2c
.endif
  

;;; Beef up dyna

.ifdef _BUFF_DYNA

.org $37c9c
  ;; Don't check pod's status before shooting eye laser
  nop
  nop
;.org $37d37
;  ;; Don't shift the "bubble turns" by 2, so that one or the
;  ;; other is always shooting
;  nop
;  nop
;.org $37d3c
;  and #$01 ; each cannon shoots 1 in 2 rather than 1 in 8
.org $37d35
  txa
  asl ; clears carry
  adc $08
  and #$03
  beq +
   rts
+ lda $08
  and #$3c
  lsr
  lsr
  jmp $bd4c    ; 37d4c
.assert < $37d4c
;;; TODO - change ItemGet_Crystalis to remove magics!

.org $37d55
  ;; Change shots to start from a random location
  jmp DynaShoot
.org $37d86
  jmp DynaShoot2

.org $37d6c
  nop
  nop
.endif

;;.org $3c010
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
;;.org $3c02d   ; NOTE - MUST BE EXACT!!!!


.org $3c010
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
   jsr ComputeDefense
   sta $0401  ; armor defense
   ldy $0714  ; equipped shield
   lda ShieldDefense,y
   ldy #$14   ; shield ring
   jsr ComputeDefense
   sta $0400  ; shield defense
   nop
   nop
.assert $3c04f ; NOTE: must be exact!


.org $3c0f8
  jsr PostUpdateEquipment
  jmp RestoreBanksAndReturn


.org $3c446
PostUpdateEquipment:
  ;; Change 'lda' (ad) to 'jsr' (20) to enable these
.ifdef _LEATHER_BOOTS_GIVE_SPEED
  jsr ApplySpeedBoots
.else
  nop
  nop
  nop
.endif
  rts

ApplySpeedBoots:
  lda #$06   ; normal speed
  sta $0341  ; player speed
  lda $0716  ; equipped passive item
  cmp #$13   ; leather boots
  bne +
   inc $0341 ; speed up by 1
+ rts

CheckSacredShieldForCurse:
  lda $0714 ; equipped shield
  cmp #$06  ; sacred shield
  bne +
   pla
   pla
+ rts

;;; For fixing sword charge glitch
ReloadInventoryAfterContinue:
  sta $07e8
  jsr PostInventoryMenu
  rts

;;; Remove the '10' bit if the player is flying ('20')
CheckSwordCollisionPlane:
  sta $03e2 ; copied from $35c62
  lda $03a1
  and #$20
  ; lsr
  ; eor #$ff
  ; and $03a2
  ; sta $03a2
  ; rts
  beq +
   lda #$0c  ; zero out the collision plane entirely
   sta $03a2
+ rts

        ;; 8 bytes free

.assert < $3c482  ; end of empty area from $3c446

.ifdef _TWELVTH_WARP_POINT
.org $3c5b8
StageCustomNametableWrite:
  jsr $c676 ; FlushNametableDataWrite
  txa
  pha
  jmp $3c4b8
StageWarpMenuNametableWrite:
  ;; 20=a8, 21=DATA, 22=09, 23=00, 24=01
  sta $21
  lda #$a8
  sta $20
  lda #$09
  sta $22
  ldx #$00
  stx $23
  inx
  stx $24
  bne StageCustomNametableWrite ; uncond
WarpMenuNametableData:
  .byte $23,$2d,$36,$63,$6d,$76,$a3,$ad,$b6,$e3,$ed,$f6
  ;; should be 16 bytes free, still!
.assert < $3c5ef
.endif


.ifdef _DISABLE_SWORD_CHARGE_GLITCH
.org $3c9fb
  jsr ReloadInventoryAfterContinue
.endif

.ifdef _CHECK_FLAG0
;;; Note: this is a debugging aid added to determine if anything
;;; is accidentally setting flag 0.  It should not make a difference, 
.org $3cb62 ; main game mode jump 08
    jsr CheckFlag0              ; was jsr ReadControllersWithDirections
.endif ; _CHECK_FLAG0

.ifdef _DISPLAY_DIFFICULTY
.org $3cb65  ; inside GameModeJump_08_Normal
  jsr CheckToRedisplayDifficulty ; was jsr CheckForPlayerDeath
.endif


.ifdef _CTRL1_SHORTCUTS
;;; These cases need to watch for button-up instead of button-down
.org $3cb90 ; enter start menu
  lda $4a
.org $3cbb4 ; enter select menu
  lda $4a

.ifndef _CHECK_FLAG0
.org $3cb62 ; game mode 8
  jsr ReadControllersWithButtonUp
.endif

.endif


.ifdef _DISABLE_WILD_WARP
.org $3cbc7
  rts
.endif

.ifdef _NERF_WILD_WARP
.org $3cbec
  .res 16, 0
.endif

.ifdef _TELEPORT_ON_THUNDER_SWORD
.org $3d161
  .word (DialogFollowupAction_1f)
.endif


;;; NOTE: we could use this in several more places, including dialog action
;;; jump 10, 
.org $3d196
  jsr $9897 ; WriteObjectCoordinatesFrom_34_37
  jmp $ff80 ; LoadOneObjectData


.org $3d223 ; part of DialogFollowupActionJump_11 (give 2nd item)
  bpl GrantItemInRegisterA ; change from bne to handle sword of wind

.org $3d22b
GrantItemInRegisterA:
  jsr PatchGrantItemInRegisterA



;;; Fix bug in dialog action 9 where carrying from the low byte of money
;;; would just increment the low byte again instead of the high byte.
.org $3d273
  inc $0703



.ifdef _ZEBU_STUDENT_GIVES_ITEM
.org $3d27d
  jmp PatchZebuStudentFollowUp
.endif

.org $3d29d ; Just set dolphin status bit => also set the flag
  jsr UpdatePlayerStatusAndDolphinFlag

;;; Dialog action $0a is kensu dropping a chest behind - update it to
;;; no longer hardcode an item but instead check persondata[0]
.org $3d2f9
  ldx $0623
  lda $0680,x
  pha
  jsr $98a8 ; ReadObjectCoordinatesInto_34_37
  ldx #$1e  ; slot 1e
  stx $10
  lda #$0f  ; boss chest
  sta $11
  jsr $d196 ; Write coords AND load object data
  pla
  sta $057e
  ldx #$02
  stx $055e
  inx
  stx $061e
  nop
.assert $3d31c

;;; Convert a beq to a bcs for mimic spawns - any chest between $70 and $80
;;; will now spawn a mimic.
;;; .org $3d3fd
;;;   .byte $b0


;; End of ActivateTriggerSquare restores game mode to normal,
;; but if sword of thunder comes from trigger square, this will
;; clobber the LOCATION_CHANGE mode.  Patch it to call out to
;; FinishTriggerSquare to check for mode 02 and if it is, don't
;; change it back.
.org $3d54b ; change this to call FinishTriggerSquare
  lda $41
  cmp #$01  ; game mode: location change
  jmp FinishTriggerSquare
.assert $3d552

;; Change trigger action 4 to do any "start game" actions.
.org $3d56b
  .word (InitialAction)

.org $3d91f
  jsr PostInventoryMenu
.org $3d971
  jsr PostInventoryMenu

.ifdef _FIX_OPEL_STATUE
;;; Prevent ever "equipping" opel statue
.org $3db0d
OpelStatueReturn:
.org $3db0e
SetEquippedConsumableItem:
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
    jmp FinishEquippingConsumable
.org $3db28 ; Next routine starts here.
.endif


.ifdef _ALLOW_TELEPORT_OUT_OF_TOWER
.org $3db39
  .byte $00   ; don't jump away to prevent warp, just goto next line
.endif


.ifdef _ALLOW_TELEPORT_OUT_OF_BOSS
.org $3db31
  .byte $00   ; don't jump
.endif


.ifdef _TWELVTH_WARP_POINT
.org $3dc7b
  cmp #$0c  ; $0c is the first invalid slot (probably could just nop here)
.org $3dd40
  lda #$0b  ; start drawing menu at $b
.org $3dd4b
  ldx $11
  lda WarpMenuNametableData,x
  jsr StageWarpMenuNametableWrite
.assert $3dd53
.org $3dd59
  adc #$04  ; lower offset, start at 2f4 instead
.endif


;;; Allow putting oak child in pocket anywhere
.org $3e7c3
-:
.org $3e7cc
  bne -


.ifdef _SIMPLIFY_INVISIBLE_CHESTS
;;; We co-opt the unused npcdata[2]:20 bit to signify invisible chests
.org $3e39f
  lda $2e
  and #$20
  beq $e3ad  ; normal chest
  bne $e3b0  ; invisible chest
  ;; 6 free bytes now
.endif

.org $3e7b3 ; just cleared dolphin status => also clear the flag
  jsr UpdatePlayerStatusAndDolphinFlag

;;; Fix post-massacre Shyron sprites.  When we do sprite calculations,
;;; we don't really have any way to take into account the fact that
;;; post-massacre the game swaps $51 into pat1.  But pat0 is unused so
;;; if we make it $51 as well then we're good to go, even if we decide
;;; to flip the pattern slots.  Also, the changes to the color palettes
;;; are irrelevant, since it only changes pal3, which seems to be unused.
;;; So stop doing that so that peoples' colors don't change.
.org $3e823
  lda $6c   ; check current location
  cmp #$8c  ; is it shyron?
  bne +     ; if not, then return
  lda $6484 ; check flag 027
  bpl +     ; if it's unset then return
  lda #$51
  sta $07f4
  sta $07f5
+ rts
  ;; and we save 14 bytes, to boot.
ReloadLocationGraphicsAfterChest:
    ;; After player picks up a chest, reload the location's graphics.
    ;; NOTE: we make an exception for Stom's house, since it needs to
    ;;       keep the modified pattern (4e instead of 4d)
    ;;       TODO - this is pretty crummy, consider finding a better solution
    lda $6c
    cmp #$1e
    beq +
     jsr $3e148 ; reload just graphics, not objects
+   jmp $3d552 ; ExecuteItemOrTriggerAction
    ;; 2 bytes free
.assert < $3e845

.org $3d458
    ;; Once we pick up a chest, reset the graphics?
    jmp ReloadLocationGraphicsAfterChest

;;; Allow any negative number to terminate an exit table.  Since X coordinates
;;; are constrained to 0..7f, this is safe, and it gives 7 extra bits for
;;; storing additional information that we can read when parsing the rom.
;;; For now, we will store %1p0eeeee where p is 1 if there is a pits table
;;; and eeeee is the number of entrances (0..1f).
.org $3eb40
  bpl +
   rts
  nop
+:
.assert $3eb44


.ifdef _EXTRA_EXTENDED_SCREENS
;;; In this setup, we compress the map data by two bytes:
;;;  - The layout table (0) is now [music], [yx], [ext+anim],
;;;    where (x, y, anim, ext) have been compressed into only
;;;    two bytes, saving some room for other purposes.
;;;  - (yx) packs the height into the upper nibble and the
;;;    width into the lower nibble.
;;;  - (ext+anim) packs the ext number into the upper 6 bits
;;;    and the animation into the lower 2.  Thus, $28 would
;;;    indicate that screen 00 is at $14000, up through screen
;;;    $1f at $15f00.
.org $140f0
  lda ($10),y
  and #$0f
  sta $62fc
  lda ($10),y
  lsr
  lsr
  lsr
  lsr
  sta $13
  rts
.assert < $14100  

.org $3e639
  ;; read the y=1 byte into both 62fc AND 62fd/13
  jsr $80f0 ; $140f0
  sta $62fd
  iny
  lda ($10),y
  lsr
  lsr
  sta $62ff
  ;; read the y=2 byte into both 62ff AND 62fe
  lda ($10),y
  and #$03
  sta $62fe
  bpl $3e652
.assert < $3e652

.org $3ebe8
  ;; note: the AND should no longer be necessary since it's zero already
  and #$3f    ; note: we only need the 20 bit if we expand the rom
  beq $3ebef
   jsr $c418  ; BankSwitch8k_8000
.assert $3ebef
.endif


.ifdef _BUFF_DEOS_PENDANT
;;; Skip the check that the player is stationary.  We could also adjust
;;; the speed by changing the mask at $3f02b from $3f to $1f to make it
;;; faster, or $7f to slow it down.  Possibly we could start it at $7f and
;;; lsr if stationary, so that MP recovers quickly when still, but at half
;;; speed when moving?  We might want to consider how this plays with
;;; refresh and psycho armor...
.org $3f026
  nop
  nop
.endif




.ifdef _FIX_SHAKING
;;; Fix the shaking issues by tweaking the delay times in IRQ callbacks.
.org $3f455
  ldx #$07
  nop
.org $3f4eb
  ldx #$03
- dex
  bpl -
.endif


;;; Call 3f9ba instead of 3c008 after the inventory menu
.org $3f9ba  ; free space from here to $3fdf0
PostInventoryMenu:
  ;; Change 'lda' (ad) to 'jsr' (20) to enable these
.ifdef _AUTO_EQUIP_BRACELET
  jsr AutoEquipBracelets
.else
  lda AutoEquipBracelets ; basically just a 3-byte no-op
.endif
  jmp UpdateEquipmentAndStatus
AutoEquipBracelets:
  lda $6428
  bpl +
   ;; deselect all
-  lda #$80
   sta $642b
   lda #00
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

FinishTriggerSquare:
  beq +
   lda #$08  ; game mode normal
   sta $41
+ jmp MainLoop_01_Game
  
Multiply16Bit:
  ;; Multiplies inputs in $61 and $62, then shifts
  ;; right A times.
  ;; Result goes $61$62 (lo hi), preserves XY
  ;; Sets carry if result doesn't fit in 8 bits
  txa
  pha
   lda #$00
   ldx #$08
   clc
-   bcc +
     clc
     adc $62
+   ror
    ror $61
    dex
   bpl -
   sta $62
   cmp #$01 ; set carry if A != 0
  pla
  tax
  rts


;;; a <- 0, x <- 8
;;; ror a -> ror $61
;;; if the bit we just rotated off $61 is set then add $62
;;; carry goes into upper of A


.ifdef _CHECK_FLAG0
;.org $3fdd0
CheckFlag0:
    lda $6480
    lsr
    bcc +
     asl
     sta $6480
     lda #$00
     sta $20
     sta $21
     ldx #$0c
-     lda $6140,x
      eor #$ff
      sta $6140,x
      dex
     bpl -
     jsr LoadAndShowDialog

.ifdef _CTRL1_SHORTCUTS
+  jmp ReadControllersWithButtonUp
.else
+  jmp ReadControllersWithDirections
.endif

.endif ; _CHECK_FLAG0

;;; NOTE: These dialog actions are debug functionality.
DialogFollowupAction_1c:
TrainerIncreaseScaling:
  ;; scaling level
  lda Difficulty
  clc
  adc #$02
  cmp #$2f
  bcc +
   lda #$2f
+ sta Difficulty
  lda #$01
  sta ShouldRedisplayDifficulty
  rts

DialogFollowupAction_1d:
TrainerIncreaseLevel:
  ;; level up
  lda #$0f
  cmp $0421
  bcs +
   rts
+ inc $0421
  ldy $0421
  lda $6e
  pha
   lda #$1a
   jsr $c418
   lda $8b7f,y
   sta $03c0
   sta $03c1
   lda $8b8f,y
   sta $0708
   sta $0709
   jsr $8cc0
   lda #$00
   jsr $8e46
   lda #$02
   jsr $8e46
   lda #$03
   jsr $8e46
   lda #$04
   jsr $8e46
   lda #$05
   jsr $8e46
   jsr $c008
  pla
  jmp $c418


DialogFollowupAction_1e:
  ;; fill inventory with all worn items, magic, and top shields/armor
  ;; then warp to mesia - actually remove magic...
  ldx #$00
  clc
-  txa
   adc #$11
   sta $6438,x
   adc #$08
   sta $6434,x
   inx
   cpx #$04
  bcc -
  ldx #$00
  clc
-  lda #$22
   sta $6440,x
   txa
   adc #$29
   sta $6448,x
   adc #$18
   ;lda #$ff
   sta $6458,x
   inx
   cpx #$08
  bcc -   
  lda #$5e
  sta $6c
  lda #$00
  sta $6d
  lda #$01
  sta $41
  rts

SpawnWall:
  ;; Spawns a breakable wall.  The $2e byte (3rd) determines
  ;; several changes if type:$20 bit is set:
  ;;   id:$30 determines the spawned object, id:$03 is element
  ;;   type:$10 determine if it shoots (stored in $6c0,x)
  ;; Works together with _CUSTOM_SHOOTING_WALLS
  lda $2e
  and #$20
  bne +
   jmp LoadOneObjectDataInternal
  ;; Do extra processing
+ lda $2f
  and #$30
  lsr
  lsr
  lsr
  lsr
  adc #$d0 ; carry clear
  sta $11
  jsr LoadOneObjectDataInternal
  lda $2e
  and #$10
  beq +
   lda #$ff
   sta $06c0,x
+ lda $2f
  and #$03
  tay
  lda WallElements,y
  sta $0500,x
+ rts
WallElements:
  .byte $0e,$0d,$0b,$07
GameModeJump_05_ItemTrigger:
  lda $0623
  pha
   lda $6c
   pha
    jsr $d497 ; 3d497 game mode 06 item use
   pla
   cmp $6c
   bne ++
  pla
  sta $0623
  lda $41
  cmp #$08
  bne +
   dec $41
   jmp $d3eb ; 3d3eb game mode 07 trigger
+ rts
++ pla
  rts

;;; Rather than reading ctrl2, we instead just read ctrl1 and
;;; then use $4a to store buttons released.
;;; $46 and $48 are buttons that have been pressed in button-up mode,
;;; but we remove bits from 48 to prevent button-up when a shortcut
;;; activates, but keep them in 46.
;;; $4c is the indicator that we're in button-up mode
ReadControllersWithButtonUp:
  lda #$01
  jmp $fe82 ; ReadControllersWithDirections+2
StartReadCtrl1:
  sta $4c
  ldx #$00
  jmp $ff17 ; ReadControllerX
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
    jmp PostInventoryMenu
CheckSelectShortcuts:
  lda $4b
  cmp #$40   ; newly pressed B?
   beq QuickChangeSword  ; yes -> change sword

.ifdef _SOFT_RESET
  cmp #$10   ; newlt pressed start
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

.ifdef _SOFT_RESET
SoftReset:
  ldx #$ff
  txs
  jmp ($fffc)
.endif

;;; Defines code to run on game start
InitialAction:
.ifdef _TRAINER
  jsr TrainerStart
.endif
  rts

;;; NOTE: this is 23 bytes.  If we do anything else with flags
;;; it would make sense to write a pair of functions SetFlag
;;; and ClearFlag that take an offset in Y and a bit in A (with
;;; appropriate CPL already applied for clear) - these are each
;;; 7 bytes to define and 7 bytes to call, so this ends up costing
;;; 34 bytes total, but only 20 on the margin.  It would take
;;; a number of calls to pay off.
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

SetFlagYA:
;;; 27 bytes - we can probably improve this?
  pha
   sty $24
   lsr $24
   ror
   lsr $24
   ror
   lsr
   sta $24
  pla
  and #$07
  tay
  lda PowersOfTwo,y
  ldy $24
  ora $6480,y
  sta $6480,y
  rts

;;;  FREE SPACE

.ifdef _TRAINER
;;; Trainer mode: provides a number of controller shortcuts
;;; to do a wide variety of things:
;;;   Start+B+Left -> all balls
;;;   Start+B+Right -> all bracelets
;;;   Start+B+Down -> some consumables
;;;   Start+Up -> gain a level
;;;   Start+Down -> increase scaling by 2
;;;   Start+Left -> better armors
;;;   Start+Right -> better shields
CheckTrainerShortcuts:
   lda $46    ; Currently pressed?
   and #$50   ; Start+B
   cmp #$50
   bne ++
    lda $4b   ; Newly pressed?
    cmp #$08  ; Up
    bne +
     ;; TODO - something here?
+   cmp #$04  ; Down
    bne +
     lda #$04
     jmp TrainerGetItems
+   cmp #$02  ; Left
    bne +
     lda #$05
     jmp TrainerGetItems
+   cmp #$01  ; Right
    beq +
-    rts
+   lda #$06
    jmp TrainerGetItems
    ;; ----
++ cmp #$10  ; Start only
   bne -
   lda $4b   ; Newly pressed?
   cmp #$08  ; Up
   bne +
    lda $48
    and #$ef
    sta $48
    jmp TrainerIncreaseLevel
+  cmp #$04  ; Down
   bne +
    lda $48
    and #$ef
    sta $48
    jmp TrainerIncreaseScaling
+  cmp #$02  ; Left
   bne +
    lda #$02
    jmp TrainerGetItems
+  cmp #$01
   bne -
   lda #$03
   jmp TrainerGetItems

TrainerStart:
  ;; Get all swords, armor, magic, bow of truth, max money
  lda #$ff  ; max gold
  sta $0702
  sta $0703
  lda $6484 ; shyron massacre
  eor #$80
  sta $6484
  lda #$ff  ; activate all warp points
  sta $64de
  sta $64df
  lda #$00
  jsr TrainerGetItems
  lda #$01
  jsr TrainerGetItems
  lda #$04
  jsr TrainerGetItems
  lda $6e ; NOTE: could just jmp $3d276 ?? but less hygeinic
  pha
   lda #$1a
   jsr $c418 ; bank switch 8k 8000
   lda #$01
   jsr $8e46 ; display number internal
  pla
  jmp $c418

TrainerData:
  .word (TrainerData_Swords)      ; 0 swords, armors, shields
  .word (TrainerData_Magic)       ; 1 accessories, bow of truth, magic
  .word (TrainerData_Balls)       ; 2
  .word (TrainerData_Bracelets)   ; 3
  .word (TrainerData_Consumables) ; 4
  .word (TrainerData_Armors)      ; 5
  .word (TrainerData_Shields)     ; 6

TrainerGetItems:
    ;; Input: A = index into TrainerData table
    asl
    tax
    lda TrainerData,x
    sta $10
    lda TrainerData+1,x
    sta $11
    ldy #$00
    lda ($10),y
    sta $12
    iny
    lda ($10),y
    tay
    iny
    iny
    clc
    adc $12
    tax
    dex
    dey
    ;; At this point, we move $6430,x <- ($10),y
    ;; and then decrease both until y=2
-    lda ($10),y
     bmi +
      sta $6430,x
+    dex
     dey
     cpy #$02
    bcs -
    lda $48
    and #$ef
    sta $48
    rts  

TrainerData_Swords:
  .byte $00,$0c
  .byte $00,$01,$02,$03,$15,$16,$17,$18,$0d,$0e,$0f,$10
TrainerData_Magic:
  .byte $18,$18
  .byte $29,$2a,$2b,$2c,$2d,$2e,$2f,$30
  .byte $ff,$ff,$ff,$ff,$ff,$ff,$ff,$40
  .byte $41,$42,$43,$44,$45,$46,$47,$48
TrainerData_Balls:
  .byte $0c,$04
  .byte $05,$07,$09,$0b
TrainerData_Bracelets:
  .byte $0c,$04
  .byte $06,$08,$0a,$0c
TrainerData_Consumables:
  .byte $10,$08
  .byte $1d,$1d,$21,$21,$22,$22,$24,$26
TrainerData_Armors:
  .byte $04,$04
  .byte $19,$1a,$1b,$1c
TrainerData_Shields:
  .byte $08,$04
  .byte $11,$12,$13,$14

.endif  

.assert < $3fe00 ; end of free space started at 3f9ba

.org $3e2ac ; normally loads object data for wall
  jsr SpawnWall  

.org $3fe01
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
.assert < $3fe16

;; NOTE: 3fe2e might be safer than 3fe18
.org $3fe18 ; smaller chunk of free space to 3fe78 (or 3fe80?)
SubtractEnemyHP:
  ;; NOTE: we could probably afford to move a few of these back if needed
  lda ObjectElementalDefense,y
  and #$0f
  cmp #$0f
  sec
   beq +   ; don't damage anything that's invincible.
  lda ObjectHP,y
  sbc $63
  sta ObjectHP,y
+ lda $61
  sbc #$00
  rts

DialogFollowupAction_1f:
  ;; Patched DialogFollowupAction 1f - used for asina in shyron
  ;; Teleport the player back to the start
  lda #$00
  sta $6c
  sta $6d
  lda #$01
  sta $41
  rts

;;; Note: This is moved from $3db22, where we ran out of space.
FinishEquippingConsumable:
    sbc #$1c
    sta EquippedConsumableItem
    rts

DynaShoot:
  sta $61        ; Store the spawn ID for later
  lda $70,x      ; Save pod's position on stack
  pha            ;
   tya           ; Store the shot's direction on stack
   pha           ;
    lda $70      ; Seed the random number by player's position
    adc $08      ; Also seed it with the global counter
    and #$3f     ; Don't overflow
    tay          ;
    lda $97e4,y  ; Read from Random number table
    asl          ; Multiply by 8: range is 0..$3f
    asl          ;
    asl          ;
    adc #$e0     ; Subtract $20
    adc $70,x    ; Add to pod's position
    sta $70,x    ; And store it back (temporarily)
   pla           ; Pull off the direction
   tay           ;   ...and save it back in Y
   lda $61       ; Pull off the spawn ID
   jsr $972d     ; AdHocSpawnObject
  pla            ; Pull off the pod's position
  sta $70,x      ;   ...and restore it
  rts

DynaShoot2:
  pha
  lda $08
  asl
  bcc +
   iny
+ asl
  bcc +
   dey
+ pla
  jmp $972d     ; AdHocSpawnObject


;; free space
.assert < $3fe78


.org $3ff44 ; free space to 3ff80

PatchGrantItemInRegisterA:
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

ComputeDefense:
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

.ifdef _ZEBU_STUDENT_GIVES_ITEM
PatchZebuStudentFollowUp:
.bank $34000 $8000:$2000
  jsr DisplayNumberInternal
  jmp DialogAction_11
.endif

.assert < $3ff80 ; end of free space from 3ff44


.org $3ffe3 ; free space to 3fffa
CheckToRedisplayDifficulty:
  lda ShouldRedisplayDifficulty
  beq +
   lsr ShouldRedisplayDifficulty
   lda #$06
   jsr DisplayNumber
+ jmp CheckForPlayerDeath
.assert < $3fff3      ; Used by snes.s for Jmp11 and Jmp21
;.assert < $3fffa ; end of free space from 3ffe3


;;; Repurpose $3e148 to skip loading NPCs and just reset pattern table.
;;; The only difference from $3e144 is that $18 gets set to 1 instead of 0,
;;; but this value is never read.  Start by changing all jumps to $3e148
;;; to instead jump to $3e144.  Then we grab some space and have a nonzero
;;; value in $18 return early.
.org $3e6ff
  jmp $3e144
.org $3d21a
  jmp $3e144
;;; For these, just eliminate the indirection: update the jump table directly.
.org $3d56f
  .word ($e144)  ; ItemOrTriggerActionJumpTable[$06]
.org $3d585
  .word ($e144)  ; ItemOrTriggerActionJumpTable[$11]

.org $3d654
    ;; 5 free bytes
.assert < $3d659

;;; ================================================================
;;; Consolidate some of the ItemOrTrigger -> itemget logic. (@@sog)
;;; A number of different message actions can be combined into a single
;;; one once we expose the active trigger ID at $23.

;;; TODO - change the actions on the messageids rather than repeat jumps
;;;   08,0d,0f -> 0b, 14 -> 13
;;;   ==> if we do this then we need to fix logic/world.ts
;;; We could free up 4 new actions (in addition to the 3 or so unused ones)
.org $3d573                       ; ItemOrTriggerActionJumpTable + 2*$08
  .word (GrantItemFromTable)      ; 08 learn paralysis
.org $3d579                       ; ItemOrTriggerActionJumpTable + 2*$0b
  .word (GrantItemFromTable)      ; 0b learn barrier
  .word (GrantItemThenDisappear)  ; 0c love pendant -> kensu change
  .word (GrantItemFromTable)      ; 0d kirisa plant -> bow of moon
  .word (UseIvoryStatue)          ; 0e
  .word (GrantItemFromTable)      ; 0f learn refresh
.org $3d589                       ; ItemOrTriggerActionJumpTable + 2*$13
  .word (DestroyStatue)           ; 13 use bow of moon
  .word (DestroyStatue)           ; 14 use bow of sun

.org $3d6d5
GrantItemTable:
  .byte $25,$29  ; 25 statue of onyx use -> 29 gas mask
  .byte $39,$3a  ; 39 glowing lamp use -> 3a statue of gold
  .byte $3b,$47  ; 3b love pendant use -> 47 change
  .byte $3c,$3e  ; 3c kirisa plant use -> 3e bow of moon
  .byte $84,$46  ; 84 angry sea trigger -> 46 barrier
  .byte $b2,$42  ; b2 summit trigger -> 42 paralysis
  .byte $b4,$41  ; b4 windmill cave trigger -> 41 refresh
  .byte $ff      ; for bookkeeping purposes, not actually used

.assert $3d6e4
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

GrantItemThenDisappear:  ; Used by Kensu in granting change (action 0c)
  jsr GrantItemFromTable
  ldy #$0e
  jmp $d31f

UseIvoryStatue:  ; Move bytes from $3d6ec
  jsr $e144 ; LoadNpcDataForCurrentLocation
  ldx #$0f
  lda #$1a
  jsr $c418 ; BankSwitch8k_8000
  jsr $98a8 ; ReadObjectCoordinatesInto_34_37
  ldx #$1e
  stx $10
  jsr $9897 ; WriteObjectCoordinatesFrom_34_37
  lda #$df
  sta $11
  jsr $c25d ; LoadOneObjectDataInternal
  lda #$a0
  sta $033e
UseIvoryStatueRts:
  rts

DestroyStatue:
  ;; Modified version to use the ID of the used bow rather than have
  ;; a separate action for each bow.
  lda #$00
  ldy $34  ; $3e for moon -> 4ad, $3f for sun -> 4ae ==> add 46f
  sta $046f,y
  lda #$6b
  jsr $c125 ; StartAudioTrack
  jsr $3d88b
  lda $04ad
  ora $04ae
  bne UseIvoryStatueRts
  lda #$7f
  sta $07d7
  lda $04cf
  sta $11
  lda #$0f
  sta $10
  jmp $c25d ; LoadOneObjectDataInternal
.assert < $3d746    

.org $3d7fd ; itemuse action jump 1c - statue of onyx -> akahana
  jsr GrantItemFromTable
  nop
  nop

;;; In HandleItemOrTrigger, backup $23 in $10 rather than using it for the
;;; JMP opcode, and then call Jmp11 instead.
.org $3d845
  lda $23
  sta $34
.org $3d853
  jsr Jmp11

;;; ================================================================

;;; Now fix the LoadNpcDataForLocation code
.org $3e19a
  lda $18
  beq LoadNpcDataForLocation_Rts ; $3e173 ; <rts
  lda ($10),y
  dey
  asl
  bcs LoadNpcDataForLocation_Skip ; $3e1af ; skip
  jsr $3e1b6 ; TryNpcSpawn
  inx
  jmp $3e18f ; Check next NPC spawn.

Jmp11: ;;; More efficient version of `jsr $0010`, just `jsr Jmp11`
  jmp ($0011)
.assert < $3e1ae
.org $3e1ae
LoadNpcDataForLocation_Rts:
  rts
LoadNpcDataForLocation_Skip:

.ifdef _HAZMAT_SUIT
.org $3ef66
  ;; Check for gas mask instead of leather boots for pain terrain
  cmp #$0d
.endif

.ifdef _CTRL1_SHORTCUTS
    ;; NOTE: we could save a bit of space by using relative jumps
    ;; and inserting the code around $3fe70
.org $3fe80
  lda #$00
  jsr StartReadCtrl1
.org $3fecc
  jmp RegisterButtonRelease

.org $3fee0
  lda #$00
  jsr StartReadCtrl1
.org $3ff13
  jmp RegisterButtonRelease

.org $3cbc1
  lda $46
  and #$20   ; select pressed?
  beq +
   jsr CheckSelectShortcuts
+ lda $46
  and #$10   ; start pressed?
  beq $cbeb  ; no -> rts
   jmp CheckStartShortcuts
.assert < $3cbd3
.endif

;;; TODO - quick select items
;; .org $3cb62
;;   jsr ReadControllersAndUpdateStart
;; .org $3d8ea
;;   jsr ReadControllersAndUpdateStart
;; 
;; .org $3fa10
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



;;; TODO - set up an in-game timer?
;;; Also display completion percent on end screen?
;; .org $3f9f8
;; UpdateInGameTimer:
;; .org $3f3b7
;;   nop
;;   jsr UpdateInGameTimer


;;; The following patch fixes a crash where an IRQ right in the middle of
;;; loading NPCs can fail to correctly restore the bank select register
;;; $8000.  If the IRQ occurs exactly between selecting the bank and setting
;;; the value (i.e. at $3c430..$3c432) and executes both MaybeUpdateMusic
;;; (which page-swaps, rewriting $50 to $8000 afterwards, but not restoring
;;; $50) and SelectCHRRomBanks (which restores $8000 to the clobbered $50)
;;; then the bank swap will fail.  In the case of this crash, it then reads
;;; NpcData from the wrong page, reading a 7 into the NPC type and jumping
;;; off the end of the 5-element NpcDataJump table.  The fix is to make sure
;;; that MaybeUpdateMusic restores $50 as well as $8000, though this takes
;;; an extra two bytes that we need to recover from SelectCHRRomBanks (which
;;; immediately follows) by using smaller instructions.
.org $3f564
  jsr SelectCHRRomBanks
.org $3f6e2
  jsr SelectCHRRomBanks
.org $3f734
  jsr SelectCHRRomBanks
.org $3f779
  jsr SelectCHRRomBanks
.org $3f785
  jsr SelectCHRRomBanks
.org $3f7c8
  jsr SelectCHRRomBanks
.org $3f882
  stx $50
  rts
SelectCHRRomBanks:
  ldx #$05
- stx $8000
  lda $07f0,x
  sta $8001
  dex
  bpl -
  lda $50
  sta $8000
  rts
  ;; FREE: 50 bytes!  The loop takes 19 extra cycles to run versus unrolling.
.assert < $3f8cb

;;; NOTE: This is an alternative implementation of SelectCHRRomBanks
;;; that is 4 bytes shorter than the original, but way longer than
;;; the loop above.
  ;; ldx #$80
  ;; stx $53
  ;; ldx #$00
  ;; stx $52
  ;; txa
  ;; sta ($52,x)
  ;; tay
  ;; iny
  ;; lda $07f0
  ;; sta ($52),y
  ;; lda #$01
  ;; sta ($52,x)
  ;; lda $07f1
  ;; sta ($52),y
  ;; lda #$02
  ;; sta ($52,x)
  ;; lda $07f2
  ;; sta ($52),y
  ;; lda #$03
  ;; sta ($52,x)
  ;; lda $07f3
  ;; sta ($52),y
  ;; lda #$04
  ;; sta ($52,x)
  ;; lda $07f4
  ;; sta ($52),y
  ;; lda #$05
  ;; sta ($52,x)
  ;; lda $07f5
  ;; sta ($52),y
  ;; lda $50
  ;; sta ($52,x)
  ;; rts
