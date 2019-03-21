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

define ITEM_OPEL_STATUE  $26
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
.org $217cd
Shop_NothingPressed:
.org $2791c
PlayerDeath:
.org $279b0
ActivateOpelStatue:
.org $34bc0
ArmorDefense:
.org $34bc9
ShieldDefense:
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

.ifdef _CONNECT_LEAF_TO_LIME_TREE
;;; Valley of Wind
.org $145dd
  .byte $e7,$93 ; new valley of wind entrance table
  .byte $22,$86 ; move exit table up a little
.org $14605
  .byte $10
.org $153e7
  .byte $80,$03,$df,$06
  .byte $40,$01,$60,$01
  .byte $80,$02,$70,$00
  .byte $c8,$01,$98,$01
  .byte $98,$01,$98,$01
  .byte $a8,$00,$90,$03
  .byte $ef,$04,$78,$05 ; new entrance from lime tree
.org $14622
  .byte $4f,$56,$42,$02 ; new exit to lime tree valley
  .byte $4f,$57,$42,$02

;; Lime Tree Valley
.org $1544c
  .byte $12,$86 ; new entrance table (inside v.wind area)
  .byte $67,$94 ; move exit table up a little
.org $14612 ; lime tree entrances
  .byte $ef,$02,$78,$01
  .byte $80,$01,$30,$00
  .byte $10,$00,$c0,$01 ; new entrance from valley of wind
.org $1545a
  .byte $1a ; left-middle screen
.org $1545d
  .byte $0c ; bottom-left (just nicer matched mountains)
.org $15467
  .byte $00,$1b,$03,$06 ; new exits to valley of wind
  .byte $00,$1c,$03,$06

;; Waterfall Valley South - recover some extra space from the map area.
.org $153dd
  .byte $60,$93 ; share layout and graphics tables w/ north half
  .byte $92,$93
;;.org $153e7  ;; Newly-freed space
;;.org $1541e
.endif



.bank $18000 $8000:$4000


.ifdef _REVERSIBLE_SWAN_GATE
;;; Allow opening swan from either side.  This is editing the NPC data
;;; of location $73 Swan Gate.  It redirects the entry to some empty
;;; space at the end of the NpcData table.  The entry is always written
;;; for now, but we only conditionally activate it.
.org $192e7
  .byte $a3,$ab  ; $73 swan gate => $1aba3
.endif


.org $1a181 ;; npcdata a9 slot 0d second byte
  .byte $67 ;; move kelbesque 2 one tile left


;; TODO - despawning swan guards closes the door forever
;; instead, pick an unused flag, then set it as a prereq for
;; trigger_b3 (1e34c) and set it as result of dialog_2d @73 +0 (1cf87)
;;   => need 2 extra bytes to do this...
;;   ... or add a jump to DialogFollowupActionJump_08 () to
;;       set the flag manually if $6c==#$73

;; Also fix softlock issue with zebu in reverse fortress.
;; Remove the $c4,$29 spawn that locks the screen.
.org $1a1c0  ; npcdata_aa slot 0e
  .byte $ff  ; just delete the spawn entirely
.org $1a220  ; npcdata_ac slot 0f
  .byte $ff  ; same for tornel
.org $1a2e8  ; npcdata_b9 slot 0f
  .byte $ff  ; same for asina
;; NOTE - changing this for kensu seems broken and is unnecessary...
;; except that it seems to be broken.
;;.org $1a3ac  ; npcdata_ba slot 0e
;;  .byte $00,$00,$02,$80 ; more npcs follow so instead change to off-screen trigger


;;; NOTE: this is used by _REVERSIBLE_SWAN_GATE above.
;;;       (points swan gate npcdata to here)
.org $1aba3 ; empty space at end of npcdata
  .byte $00,$ff,$09,$6b,$ff
  .byte $04,$01,$02,$b3
  .byte $04,$0a,$04,$2c
  .byte $07,$06,$01,$2d
  .byte $07,$09,$01,$2d
  .byte $02,$0a,$01,$2d ; new soldier (they need to come in pairs)
  .byte $02,$0b,$01,$2d ; new soldier
  .byte $0a,$0e,$02,$b3 ; new trigger to erase guards
  .byte $ff
.assert < $1ac00 ; end of free space started at $1aba3




.bank $1c000 $8000:$4000

;; clark moves back to joel after giving item, not after calming sea
;; TODO - this is slightly awkward in that you can go up the stairs
;; and back down and he's disappeared.  An alternative would be to
;; put a trigger somewhere far away that checks 08d and sets some
;; other (fresh/unused) flag to key off of.  (disappearing would be
;; weird for clark, tho)
.org $1c842
  .byte $8d
.org $1c845
  .byte $8d

;; Prevent soft-lock when encountering sabera and mado from reverse
;; Double-returns if the boss's sprite is not in the top quarter of
;; the screen. This is unused space at the end of the triggers.
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
.org $1e3e5
.org $1e3f0

.org $1e48b  ; vampire pattern 0
  jsr CheckBelowBoss
.org $1e971  ; kelbesque pattern 0
  jsr CheckBelowBoss
.org $1ec8f  ; sabera pattern 0
  jsr CheckBelowBoss
.org $1ede8  ; mado pattern 0
  jsr CheckBelowBoss





;;; Dialogs and Spawn Conditions


;; Move Draygon's spawn condition up about $100 bytes to make 3 bytes
;; extra space for a spawn flag check for Draygon 2, who shouldn't
;; respawn after being defeated.
.org $1c776         ; cb draygon 1 and 2
  .byte $54,$88     ; ($1c854)
.org $1c854
  .byte $9f,$a1,$0b ; pyramid front: 10b NOT defeated draygon 1
  .byte $a6,$a2,$8d ; pyramid back:  28d NOT defeated draygon 2
  .byte $ff

;; Reorder Zebu cave dialog to spawn windmill guard first
;; Alternatively: consider just having him always spawned?
;; NOTE: this reordering requires adjusting the offset for
;; the refresh give condition.
.org $1d76c ; zebu dialog 10 cave
  .byte $60,$3a,$00,$1a,$00 ; 03a NOT talked to zebu in cave -> 00:1a
  .byte         $40,$3a     ;     Set: 03a talked to zebu in cave
  .byte $00,$0d,$00,$1d,$00 ; 00d leaf villagers rescued -> 00:1d
  .byte $00,$38,$00,$1c,$00 ; 038 leaf attacked -> 00:1c
  .byte $00,$39,$00,$1d,$00 ; 039 learned refresh -> 00:1d
  .byte $40,$0a,$18,$1b,$00 ; 00a windmill key used -> 00:1b (action 03)
  .byte         $c0,$00     ;     Clear: 000 (set on item get instead)
;;.byte         $40,$39     ;     Set: 039 learned refresh

;; Give key to styx regardless of whether sword of thunder found
;; Also don't duplicate-set 03b, it's already handled by ItemGet.
.org $1d78e ; zebu dialog f2 shyron temple
  .byte $60,$3b,$8a,$97,$22,$c0,$00  ; 03b NOT -> 14:17 (action 11)
  .byte $00,$2d,$02,$c3,$22          ; 02d -> 16:03

;; Move 'Shyron Massacre' trigger to the unused space in triggers
;; 87 and 88 to get 2 extra bytes (leaves 8 more bytes in that spot).
.org $1e17a      ; 80 shyron massacre
  .byte $32,$a2  ; ($1e232)
.org $1e232
  .byte $20,$27  ; Condition: 027 NOT shyron massacre
  .byte $00,$5f  ; Condition: 05f sword of thunder
  .byte $80,$3b  ; Condition: 03b talked to zebu in shyron -> SLOT(key to styx)
  .byte $03,$b3  ; Message: 1d:13
  .byte $40,$27  ; Set: 027 shyron massacre
.org $1e244

;; Move 'Learn Barrier' trigger into 'Shyron Massacre' to get 2 extra
;; bytes for the 'Calmed Sea' condition.
.org $1e182      ; 84 learn barrier
  .byte $00,$a2  ; ($1e200)
.org $1e200
  .byte $20,$51  ; Condition: 051 NOT learned barrier
.ifdef _BARRIER_REQUIRES_CALM_SEA
;; Specifically require having calmed the sea to learn barrier
  .byte $80,$8f  ; Condition: 283 calmed angy sea (also 283)
.else
  .byte $a0,$00  ; Condition: 000 NOT false
.endif
  .byte $5b,$b2  ; Message: 1d:12  Action: 0b
  .byte $40,$51  ; Set: 051 learned barrier
.org $1e208


;; Windmill guard shouldn't despawn on massacre
.org $1c7d6
  .byte $00 ; no despawn at all

;; Don't check unwritten 104 flag for mado spawn
.org $1c93a
  .byte $a0,$00

;; Remove redundant dialog itemget flag sets
.org $1cb67 ; sword of wind
  .byte $c0,$00
.org $1cde1 ; sword of fire
  .byte $c0,$00
.org $1ce0c ; insect flute
  .byte $c0,$00
.org $1d5db ; warrior ring
  .byte $c0,$00
.org $1d662 ; deo
  .byte $c0,$00
.org $1d6ee ; shield ring
  .byte $c0,$00
.org $1ccdf ; windmill key
  .byte $c0,$00
;.org $1d798 ; key to styx (zebu)
;  .byte $c0,$00
.org $1e208 ; key to styx (trigger)
  .byte $a0,$00
.org $1d3b4 ; eye glasses (clark)
  .byte $a0,$00
.org $1d852 ; kensu lighthouse
  .byte $c0,$00

; Move NpcDialog_2d to the unused space at 1d1fd..1f21b
.org $1c9b7
  .byte $fd,$91
.org $1d1fd
  .byte $80,$00,$00,$00
  .byte $28,$00
  .byte $73,$05
  .byte $ff
  ;; 00: 28 Mt Sabre North - Main
  .byte $a0,$00,$08,$b0,$00 ; default -> 05:10 (action 01)
  ;; 05: 73 Swan - Gate
  .byte $40,$2a,$42,$75,$05 ; 02a change:soldier -> 13:15 (action 08)
  .byte         $41,$0d     ;     Set: 10d
  .byte $a0,$00,$0a,$74,$05 ; default -> 13:14 (action 01) -> @ 05
.org $1d21b

.org $1e34c ; trigger b3: despawn swan guards
  .byte $81,$0d ; 10d talked to guards from other side -> despawn

;; NOTE: we could use 2 less bytes if necessary by moving a smaller
;; entry here that's otherwise adjacent to some free space.  Or
;; just defrag that table.
.org $1db06
  .byte $79,$8f ; ItemGetData_03 pointer
.org $1cf79 ; space freed by moving Dialog_2d
ItemGetData_03: ; sword of thunder
  .byte $03,$80 ; slot
  .byte $08,$00 ; action 01 -> teleport to shyron
  .byte $02,$fd ; Set: 2fd warp:shyron
  .byte $40,$5f ; Set: 05f chest:03:sword of thunder
  .byte $ff
.org $1cf82
  ; 15 bytes still available
.org $1cf91


;; queen will try to give flute of lime even if got sword first
.org $1cfab ; queen "you found sword of water" message action
  .byte $19 ; add action 03
;.org $3d1f5 ; call to WaitForDialogToBeDismissed
;  jsr PatchAsinaReveal

;; asina will also give flute of lime if queen never did (after recover)
.org $098f9
  .byte $28 ; asina persondata[1] -> flute of lime
.org $1d80a
  .byte $89 ; asina love pendant dialog -> give second item
.org $1d816
  .byte $89 ; asina default dialog -> give second item




;; If LookingAt is $1f and the item goes into the $20 row then we can't
;; just reject - instead, add the item to an overflow chest.
;; We use the bytes at 64b8..64bf to store the overflow.

;; asina reveal depends on mesia recording (01b), not ball of water (01f)
;; - this ensures you have both sword and ball to get to her --> ???
.org $1c81f
  .byte $1b
.org $1c822
  .byte $1b
.org $1c82a
  .byte $1b
.org $1cf9c
  .byte $1b
.org $1d047
  .byte $1b
.org $1e389
  .byte $1b




;;; NPC Despawn triggers

;; bow of truth - remove extra itemget flags
.org $1d8dc ;; Azteca dialog
  .byte $80,$00,$c0,$00

;; refresh triggers
;.org $1d780
;  .byte $c0,$00
.org $1e358
  .byte $c0,$00

;; paralysis triggers
.org $1e34a
  .byte $c0,$00

;; teleport triggers
.org $1d7d0
  .byte $c0,$00

;; barrier triggers - the following don't disappear after barrier
.org $1c7e2
  .byte $20,$00 ; akahana (unstoned) in cave
.org $1c7ef
  .byte $a0,$00 ; akahana stoned
.org $1c886
  .byte $a0,$00 ; zebu
.org $1c898
  .byte $a0,$00 ; tornel
.org $1c8ac
  .byte $a0,$00 ; stom
.org $1e222
  .byte $c0,$00 ; trigger set flag

;; asina does not disappear after defeating sabera
.org $1c8b9
  .byte $00

;; insect/dwarf items
;; Change all the post-insect messages to action 03
.org $1cdc6
  .byte $18
.org $1cdcb
  .byte $18
.org $1cdd2
  .byte $18
.org $1cdd9
  .byte $18
.org $1cdff
  .byte $18
.org $1ce04
  .byte $18

;; kensu in the cabin needs to be available even after visiting joel.
;; just have him disappear after setting the flag. but also require
;; having returned the fog lamp before he shows up - this requires
;; moving him up a word.
.org $1c6b0
  .byte $f6,$88 ; pointer to kensu 68
.org $1c8f6
  .byte $61,$20,$9b,$80,$21,$ff
.org $1d867
  .byte $12,$21 ; message 11:01 (action 02 disappear)

.ifdef _REQUIRE_HEALED_DOLPHIN_TO_RIDE
;; move portoa fisherman up 1 word, make him only
;; appear if both shell flute AND healed dolphin
;; NOTE: 8b is the traditional itemget and 25
;; is tied to the slot (healing dolphin)
;; We could delete the slot one, but it's actually
;; convenient to have both...
.org $1c6a8
  .byte $99,$87
.org $1c799
  .byte $d6,$00,$25,$80,$8b,$ff
;; daughter's dialog should trigger on both, too
.org $1d1c5
  .byte $80,$2a,$03,$cc,$ff
  .byte $20,$25,$01,$26,$00
  .byte $20,$8b,$01,$26,$00
  .byte $00,$21,$01,$25,$00
  .byte $a0,$00,$01,$24,$00
.endif


.ifdef _TELEPORT_ON_THUNDER_SWORD
;; This is the alternative to noTeleportOnThunderSword - if we teleport then
;; we need a way back to leaf just in case, so have Asina in Shyron act as a
;; teleport point back to the start.  Add an extra dialog followup for asina
;; to conditionally use to warp back to leaf from shyron
.org $1d81b
  .byte $fa ; 03b -> action 1f
.org $1d820
  .byte $fa ; 03b -> action 1f
.org $1d82c
  .byte $fa ; default -> action 1f
.endif


.ifdef _SAHARA_RABBITS_REQUIRE_TELEPATHY
.org $1d653 ; dialog 5a deo
  ;; replace akahana's dialog - would be nice to add an extra stanza instead,
  ;; but there's not immediately space - if we ever defrag then we should do it
  ;; or else remove all the changed forms (except maybe soldier)
  .byte $c2,$43   ; 243 NOT telepathy -> 1a:13
.org $1d671 ; dialog 59 generic sahara bunnies
  ;; replace stom - he can talk to bunnies just fine
  .byte $c2,$43   ; 243 NOT telepathy -> 1a:12
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
.org $1c299
  jmp ItemGetFollowup
.org $1c29c
ItemGet_PickSlotAndAdd:  ; move this up 4 bytes
  sty $62
  nop
  nop
.org $1c2a0

.org $1c2a8
  jsr ItemGet_FindOpenSlotWithOverflow

.ifdef _PROGRESSIVE_BRACELET
.org $1c2de
  lda $29
  bcc +
   inc $6430,x
   bne ItemGet_Bracelet
   lsr
   lda $29
   sbc #$00
   sta $23
+ sta $6430,x
  rts
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
ItemGetFollowup:
  ;; We have room to exactly copy this behavior, but it does appear
  ;; to be dead.
  lda ($24),y
  pha  ; later -> pla and if pl then repeat ItemGet with A -> $23
   ;; Maybe increase difficulty (if last element is FE)
   bpl +
   lsr
   bcs +
    lda Difficulty
    cmp #$2f
    bcs +
     inc Difficulty
     jsr ItemGetRedisplayDifficulty
   ;; Always set the dedicated 200+chest flag.
+  lda #$42
   sta $61
   ;; $62 is already the item number, saved from earlier
   lda #$61
   sta $24
   lda #$00
   sta $25
   tay
   jsr SetOrClearFlagsFromBytePair_24y
  ;; Now finish by maybe chaining to another item if positive
  pla
  bmi +
   sta $23
   jmp ItemGet
+ rts

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
.assert < $1e179 ; 1e17a is above...



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

.org $21500

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


.ifdef _LEATHER_BOOTS_GIVE_SPEED
.org $2134a
  .byte "Speed Boots",$ff
.endif


.bank $26000 $a000:$2000

.ifdef _DISPLAY_DIFFICULTY
;;; Start the loop at 6 instead of 5 to also show the difficulty
.org $27aca
  ldx #$06
.endif


.ifdef _FIX_OPEL_STATUE
;; First thing to do is read which item is selected.
.org $2788d ; START OF FREE SPACE ???
.org $278e9
CheckOpelStatue:
  lda $6440,x
  cmp #$26
  beq +
  dex
  bpl CheckOpelStatue
  bmi PlayerDeath
+ stx SelectedConsumableIndex
  lda #$0a
  sta EquippedConsumableItem
  jmp ActivateOpelStatue
.assert < $27900 ; END OF FREE SPACE from $2788d or $278e9

.org $27912
  ;; Clear status effects immediately - if there's an opel statue then we'll
  ;; need to clear it anyway; if not we're dead so it doesn't matter.
  lda #$00
  sta $0710
  ;; Now check opel statue
  ldx #$07
  bne CheckOpelStatue
.endif



.bank $28000 $8000:$2000
.ifdef _LEATHER_BOOTS_GIVE_SPEED
.org $29105
  .byte "Speed Boots",$00
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
.org $35152



;; Adjusted stab damage for populating sword object ($02)
.org $35c5f
  lda #$02
  sta $03e2
  rts


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
.assert $3c02b   ; NOTE - MUST BE EXACT!!!!

;; Max out armor and shield def at 2*level
.org $3c02b
  sta $61
  asl $61
  ldy $0713
  lda ArmorDefense,y
  cmp $61
  bcc +
   lda $61
+ ldy $0716 ; equipped passive item
  cpy #$10  ; iron necklace
  bne +
   asl
+ clc
  adc $0421 ; armor defense
  sta $0401
.org $3c04a
  jsr PatchUpdateShieldDefense
  nop
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
.assert < $3c482  ; end of empty area from $3c446


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
  .byte $00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00
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



.ifndef _TELEPORT_ON_THUNDER_SWORD
;;; Prevent the teleport-to-shyron sequence upon getting thunder sword.
.org $3d565
  .word ($d78c)
.endif

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
-  bcc +
    clc
    adc $62
+  ror
   ror $61
   dex
  bpl -
  sta $62
  cmp #$01 ; set carry if A != 0
  pla
  tax
  rts


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

.assert < $3fe00 ; end of free space started at 3f9ba

.org $3fe01
  ;; free space?
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
  adc $0421 ; shield defense
  sta $0400
  rts

;; We could try to be cleverer about not reloading the equipped item.
;; If we just ASL the whole defense then we can do them simultaneously,
;; and then go into power ring.

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
