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
define ItemFlagsStart $64c0
define Difficulty $64a2
define ShouldRedisplayDifficulty $64a3

        
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

;;; Constants
define ITEM_RABBIT_BOOTS     $12
define ITEM_OPEL_STATUE      $26
define SFX_MONSTER_HIT       $21
define SFX_ATTACK_IMMUNE     $3a

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


.ifdef _BUFF_DYNA
.ifdef _REMOVE_MAGIC_FOR_DYNA
;;; Patch ItemGet_Crystalis to remove magics, too
.org $1c2b7

  ldx #$03
-  lda #$ff
   sta $6430,x
   sta $643c,x
   sta $6458,x
   sta $645c,x
   dex
  bpl -
  lda #$04
  sta $6430
  lda #$05
  sta $0711
  lda #$00
  sta $0712
  rts

.assert < $1c2dd
.endif
.endif


;;; Patch the end of ItemUse to check for a few more items.
.org $1c34d
  jmp PatchTradeInItem


.org $1c399 ; 58 bytes of free/unused space at start of itemuse jump
.assert < $1c3d3

.org $1c3eb ; 16 bytes of free/unused space in middle of itemuse jump
.assert < $1c3fb

.org $1c41b ; 30 bytes of free/unused space at end of itemuse jump
.assert < $1c439


.org $1c157
  .word (PowersOfTwo) ; no need for multiple copies


;; Count uses of Flute of Lime and Alarm Flute - discard after two.
.org $1c6f2 ; 10 free bytes in middle of spawn condition table
PatchTradeInItem:
  cmp #$31
  beq +
  cmp #$28  ; flute of lime
  beq ++
  bne ++++
.assert < $1c6fc

.org $1c6fe ; free space in middle of spawn condition table
+    lda #$40
     sta $61
     bne +++
++   lda #$80
     sta $61
+++  lda $64a1
     and $61
     bne ++++
     lda $64a1
     ora $61
     sta $64a1
     ;; Deselect current item
     lda #$00
     sta $0715
     lda #$80
     sta $642e
     rts
++++ jmp ItemUse_TradeIn

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
  ;; Read the flag 200+chest, where chest is in $23
  lda #$a2
  sta $61
  lda $23
  sta $62
  lda #$61
  sta $24
  lda #$00
  sta $25
  tay
  jsr ReadFlagFromBytePair_24y
  beq +
   inc $20
+ rts
.org $1c5de

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
;; Freed from the chest spawn pointer table
.org $1dd64

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
   lda Difficulty
   cmp #$2f
   bcs +
    inc Difficulty
    jsr ItemGetRedisplayDifficulty
   ;; Always set the dedicated 200+chest flag.
+ lda #$42
  sta $61
  ;; $62 is already the item number, saved from earlier
  lda #$61
  sta $24
  lda #$00
  sta $25
  tay
  jmp SetOrClearFlagsFromBytePair_24y

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
;; TODO - still plenty of space here
.assert < $1e17a


.ifdef _FIX_VAMPIRE
;;; Fix vampire to allow >60 HP.  Normally at 61 HP there's an overflow
;;; and the teleport animation gets really fast until HP drops below 61.
.org $1e576
  jsr ComputeVampireAnimationStart
  nop
.assert $1e57a ; match up exactly to next instruction
.endif


;;; We moved the LV(menu) display from 06 to 0e so display that instead
.org $1fd27
  lda #$0e


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
.org $205a7
  .byte $0c
.org $205a9
  .byte $04


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
  ;; If there's anything in the buffer and any space in the inventory,
  ;; fill them in.  Just take the most recently added ones, not worrying
  ;; about cycling the queue (that's only needed for dropping).
  ldy #$08     ; predecrement, so start at $64c0
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
+ lda #$02
  sta $2e
  rts

;;; Support for fixing sword charge glitch
ReloadInventoryAfterLoad:
  jsr PostInventoryMenu
  jmp AfterLoadGame

        ;; FREE: 29 bytes
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


.bank $26000 $a000:$2000

.ifdef _DISPLAY_DIFFICULTY
;;; Start the loop at 6 instead of 5 to also show the difficulty
.org $27aca
  ldx #$06
.endif


.ifdef _FIX_OPEL_STATUE
;; Search inventory for a statue
.org $2788d ; START OF FREE SPACE
CheckOpelStatue:
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

.assert < $2fc00 ; end of unused block from $2fbd5



.ifdef _PITY_HP_AND_MP
.org $2fd82 ; normally "sta $03c1"
  jsr CheckForLowHpMp
.endif ; _PITY_HP_AND_MP





.bank $34000 $8000:$2000

;;; Numeric displays
.org $34ee9  ; 06 - was LV(menu) but now it's difficulty
  .byte $a2,$64,$3c,$2b,$03,$00 ; display difficulty right of lvl
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


.ifdef _DISABLE_STATUE_GLITCH
.org $3559a
  ;; Just always push down.
  lda #$04
.endif


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


.ifdef _FIX_COIN_SPRITES
.org $37a23
  nop
  lda #$a9
.assert $37a26
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
   sta $62
;; Max out armor and shield def at 2*level
   sta $61
   asl
   adc $62
   sta $61
   ldy $0713
   lda ArmorDefense,y
   cmp $61
   bcc +
    lda $61
+  ldy $0716 ; equipped passive item
   cpy #$10  ; iron necklace
   bne +
    asl
+  clc
   adc $62   ; armor defense
   jsr PatchUpdateShieldDefense
   nop
.assert $3c04f ; NOTE: must be exact!
  ; STA PLAYER_DEF





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
  lsr
  eor #$ff
  and $03a2
  sta $03a2
  rts

        ;; 8 bytes free

.assert < $3c482  ; end of empty area from $3c446


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


.ifdef _NEVER_DIE
;;; Debug mode to never actually die - wrap around to maxhp instead.
.org $3cb89
  lda $03c0
  sta $03c1
  nop
.org $3cbaf
  bne +
.org $3cbc0
+ rts  ; no change
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


.org $3d223 ; part of DialogFollowupActionJump_11 (give 2nd item)
  bpl GrantItemInRegisterA ; change from bne to handle sword of wind

.org $3d22b
GrantItemInRegisterA:
  jsr PatchGrantItemInRegisterA



;;; Fix bug in dialog action 9 where carrying from the low byte of money
;;; would just increment the low byte again instead of the high byte.
.org $3d273
  inc $0703



.org $3d27d
  jmp PatchZebuStudentFollowUp


;;; Convert a beq to a bcs for mimic spawns - any chest between $70 and $80
;;; will now spawn a mimic.
.org $3d3fd
  .byte $b0


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
  lda AutoEquipBracelets
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
+   jmp ReadControllersWithDirections
.endif ; _CHECK_FLAG0

;;; NOTE: These dialog actions are debug functionality.
DialogFollowupAction_1c:
  ;; scaling level
  lda $64a2
  clc
  adc #$04
  cmp #$2f
  bcc +
   lda #$2f
+ sta $64a2
  lda #$01
  sta $64a3
  rts

DialogFollowupAction_1d:
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

.assert < $3fe00 ; end of free space started at 3f9ba

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
  lda ItemFlagsStart,x
  and PowersOfTwo,y
  beq +
   pla
   pla
+ rts

PatchUpdateShieldDefense:
  sta $0401
  ldy $0714
  lda ShieldDefense,y
  cmp $61
  bcc +
   lda $61
+ ldy $0716 ; equipped passive item
  cpy #$14  ; shield ring
  bne +
   asl
+ clc
  adc $62 ; shield defense
  sta $0400
  rts

;; We could try to be cleverer about not reloading the equipped item.
;; If we just ASL the whole defense then we can do them simultaneously,
;; and then go into power ring.

PatchZebuStudentFollowUp:
.bank $34000 $8000:$2000
  jsr DisplayNumberInternal
  jmp DialogAction_11

.assert < $3ff80 ; end of free space from 3ff44


.org $3ffe3 ; free space to 3fffa
CheckToRedisplayDifficulty:
  lda ShouldRedisplayDifficulty
  beq +
   lda #$00
   sta ShouldRedisplayDifficulty
   lda #$06
   jsr DisplayNumber
+ jmp CheckForPlayerDeath
.assert < $3fffa ; end of free space from 3ffe3



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
