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
;;; by a `_` prefix.  The entirety of this file should be wrapped in
;;; one version or the other of `_DELAYED`.


;;; Indicate the fixed bank - this is always the case.
.bank $3c000 $c000:$4000

;;; Various global definitions.
define Difficulty $64a2
define ShouldRedisplayDifficulty $64a3

        
define SelectedItemIndex       $642c
define EquippedConsumableItem  $0715


;;; Labels
.org $217cd
Shop_NothingPressed:
.org $3d347
LoadAndShowDialog:
.org $3fe80
ReadControllersWithDirections:


.ifndef _DELAYED

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


.ifndef _NO_REVERSIBLE_SWAN_GATE
;;; Allow opening swan from either side.  This is editing the NPC data
;;; of location $73 Swan Gate.  It redirects the entry to some empty
;;; space at the end of the NpcData table.  The entry is always written
;;; for now, but we only conditionally activate it.
.org $192e7
  .byte $a3,$ab  ; $73 swan gate => $1aba3
.endif


;;; NOTE: this is used by _NO_REVERSIBLE_SWAN_GATE above.
;;; TODO - do this in JS code instead of Asm.
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
.assert $1abc5 ; tight bound, to fit more


.org $1ac00 ; end of free space






.bank $1c000 $8000:$4000


;; Move Draygon's spawn condition up about $100 bytes to make 3 bytes
;; extra space for a spawn flag check for Draygon 2.
.org $1c776         ; cb draygon 1 and 2
  .byte $54,$88     ; ($1c854)
.org $1c854
  .byte $9f,$a1,$0b ; pyramid front: 10b NOT defeated draygon 1
  .byte $ff,$ff,$ff
  .byte $ff

;; Move 'Learn Barrier' trigger into 'Shyron Massacre' to get 2 extra
;; bytes for the 'Calmed Sea' condition.
.org $1e182      ; 84 learn barrier
  .byte $00,$a2  ; ($1e200)

.org $1e200
  .byte $20,$51  ; Condition: 051 NOT learned barrier
  .byte $a0,$00  ; Condition: 000 NOT false
  .byte $5b,$b2  ; Message: 1d:12  Action: 0b
  .byte $40,$51  ; Set: 051 learned barrier
.org $1e208

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


;; bow of truth extra triggers
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

;; barrier triggers
.org $1c7e2
  .byte $20,$00 ; akahana cave
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

.org $1c26f
ItemGet:
.org $1c135
ReadFlagFromBytePair_24y:
.org $1c112
SetOrClearFlagsFromBytePair_24y:

;; Freed from the chest spawn pointer table
.org $1dc82
.org $1dd64

;; Freed from the chest spawn data
.org $1e106
ItemGetRedisplayDifficulty:
  rts  ; change to nop to enable this code
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

.org $1e179 ; 1e17a is above...


.org $1c308
ItemGet_FindOpenSlot:
.org $1c2a8
  jsr ItemGet_FindOpenSlotWithOverflow









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

;; NOTE: This is copied from preventSwordClobber, which is no longer
;; used on its own since we need to do slightly different initialization
;; to refill from the buffer.
;.org $20534
;  lda #$02
.org $205a7
  .byte $0c
.org $205a9
  .byte $04






.ifndef _DISABLE_SHOP_GLITCH
;;; Disable the shop glitch by ensuring prices are updated immediately
;;; after moving the cursor, rather than a few frames later.
.org $21812
    jmp Shop_NothingPressed
.endif









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
+ stx SelectedItemIndex
  lda #$0a
  sta EquippedConsumableItem
  jmp ActivateOpelStatue
.org $27900 ; END OF FREE SPACE

.org $27912
  ;; Clear status effects immediately - if there's an opel statue then we'll
  ;; need to clear it anyway; if not we're dead so it doesn't matter.
  lda #$00
  sta $0710
  ;; Now check opel statue
  ldx #$07
  bne CheckOpelStatue
.org $2791c
PlayerDeath:
.org $279b0
ActivateOpelStatue:

; Don't select opel statue at all...
.org $21061
  .byte $00










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
    cmp #$05
    bcs +
     lda #$05
+   sta $03c1
    ;; Check if we've ever found any swords
    lda $64c0
    and #$0f
    ;; If this is zero then we have no swords and should give 20 MP.
    ;; If it's nonzero, set it to -19 and then we'll add 20 unconditionally.
    ;; Note that we can ignore the swordless check via a flag.
    .ifdef _NO_EXTRA_PITY_MP
      beq +
       lda #$00
+     clc
       adc #$01
    .else
      beq +
       lda #$ed
+     clc
       adc #$14
    .endif
    ;; Now compare with MP - if it's less, set the minimum.
    cmp $0708
    bcc +
     sta $0708
+   rts
.assert $2fbf3 ; tight bound, in case we need space on this page later

.org $2fc00 ; end of unused block




.ifndef _NO_PITY_HPMP
.org $2fd82 ; normally "sta $03c1"
  jsr CheckForLowHpMp
.endif ; _NO_PITY_HPMP











.ifndef _NO_CHECK_FLAG0
;;; Note: this is a debugging aid added to determine if anything
;;; is accidentally setting flag 0.  It should not make a difference, 
.org $3cb62 ; main game mode jump 08
    jsr CheckFlag0
.endif ; _NO_CHECK_FLAG0









.org $3d223 ; part of DialogFollowupActionJump_11 (give 2nd item)
  bpl GrantItemInRegisterA ; change from bne to handle sword of wind

.org $3d22b
GrantItemInRegisterA:
  jsr PatchGrantItemInRegisterA







.ifndef _NO_CHECK_FLAG0
.org $3fdd0 ; !!! - note itemLib (I think) uses this space, too
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
.endif ; _NO_CHECK_FLAG0



.ifndef _NO_FIX_OPEL_STATUE
;;; Prevent ever "equipping" opel statue
.org $3db0d
OpelStatueReturn:
.org $3db0e
SetEquippedConsumableItem:
    ;; Figure out what's equipped
    ldy $642c
    bmi +
    lda $6440,y
    cmp #$26
    bne ++
+   ldy $642e
    bmi OpelStatueReturn
    lda $6450,y
++  sec
    jmp FinishEquippingConsumable
.org $3db28 ; Next routine starts here.
.endif

.org $3fe72
;;; Note: This is moved from $3db22, where we ran out of space.
FinishEquippingConsumable:
    sbc #$1c
    sta EquippedConsumableItem
    rts
.org $3fe78



.org $3ff44
; TODO - 60 bytes we could use here (now 36)
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
  lda $64c0,x
  and $3c000,y ; powers of two
  beq +
   pla
   pla
+ rts
.org $3ff5c


.endif
