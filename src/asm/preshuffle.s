;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Various flag-based defines will be prepended to this file, indicated
;;; by a `_` prefix.

.segment "0e"

.org $8157
  .word (PowersOfTwo) ; no need for multiple copies

;;; Rewrite the page boundary to avoid code crossing it.
;;; This is equivalent to the original, but 6 bytes shorter
;;; and doesn't cross the boundary (TODO - why did we care
;;; about that??? maybe it was something about a limitation
;;; in how the assembler handles cross-segment chunks?)
.segment "12", "13"
.org $9fef
  ;; Need to fit this in 17 bytes
  sta $09     ; 85 09
  ldy #$03    ; a0 04
- sta $06f0,y ; 99 f0 06
  sta $0002,y ; 99 02 00
  dey         ; 88
  bpl -       ; 10 f7
  jmp $a005   ; 4c 05 a0
FREE_UNTIL $a000
.org $a000
FREE_UNTIL $a005

.segment "fe", "ff"





;; End of ActivateTriggerSquare restores game mode to normal,
;; but if sword of thunder comes from trigger square, this will
;; clobber the LOCATION_CHANGE mode.  Patch it to call out to
;; FinishTriggerSquare to check for mode 02 and if it is, don't
;; change it back.
.org $d54b ; change this to call FinishTriggerSquare
  lda $41
  cmp #$01  ; game mode: location change
  jmp FinishTriggerSquare
.assert * = $d552

;; Change trigger action 4 to do any "start game" actions.
.org $d56b
  .word (InitialAction)

.org $d91f
  jsr PostInventoryMenu
.org $d971
  jsr PostInventoryMenu

.ifdef _FIX_OPEL_STATUE
;;; Prevent ever "equipping" opel statue
OpelStatueReturn = $db0d
.org $db0e
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
FREE_UNTIL $db28
.endif


.ifdef _ALLOW_TELEPORT_OUT_OF_BOSS
.org $db31
  .byte $00   ; don't jump
.endif

.ifdef _ALLOW_TELEPORT_OUT_OF_TOWER
.org $db39
  .byte $00   ; don't jump away to prevent warp, just goto next line

;; Make sure the down stair always spawns outside Mesia's room
.pushseg "1b", "fe", "ff"
.org $a48f
  lda $d0  ; player y hi
  ldy $b0  ; player y lo
  cpy #$20 ; set carry if below 2nd tile
  adc #0   ; add carry bit if needed
  tay      ; y is row to start clearing flags for
  ;; if we have crystalis then unlock from 0
  lda $6430
  cmp #4
  bne +
    ldy #0
  ;; set all the flags from y down to the bottom
+ lda #$ff
  bne +  ; (while ... do) instead of (do ... while)
-  sta $62f0,y
   iny
+  cpy #4
  bne -
  ;; if we're on the top screen (5c) then double-return
  lda $6c
  cmp #$5c
  bne +
   lda #0
   sta $04a0,x
   pla
   pla
   ;; TODO - do we still need to call SpawnTowerEscalator here?
+ rts
FREE_UNTIL $a4c6 ; currently saves ~12 bytes?
.popseg

.endif


;;; Allow putting oak child in pocket anywhere
.org $e7c3
-:
.org $e7cc
  bne -


.ifdef _SIMPLIFY_INVISIBLE_CHESTS
;;; We co-opt the unused npcdata[2]:20 bit to signify invisible chests
.org $e39f
  lda $2e
  and #$20
  beq $e3ad  ; normal chest
  bne $e3b0  ; invisible chest
  ;; 6 free bytes now
.endif

.org $e7b3 ; just cleared dolphin status => also clear the flag
  jsr UpdatePlayerStatusAndDolphinFlag

;;; Fix post-massacre Shyron sprites.  When we do sprite calculations,
;;; we don't really have any way to take into account the fact that
;;; post-massacre the game swaps $51 into pat1.  But pat0 is unused so
;;; if we make it $51 as well then we're good to go, even if we decide
;;; to flip the pattern slots.  Also, the changes to the color palettes
;;; are irrelevant, since it only changes pal3, which seems to be unused.
;;; So stop doing that so that peoples' colors don't change.
.org $e823
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
FREE_UNTIL $e845

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


;;; Allow any negative number to terminate an exit table.  Since X coordinates
;;; are constrained to 0..7f, this is safe, and it gives 7 extra bits for
;;; storing additional information that we can read when parsing the rom.
;;; For now, we will store %1p0eeeee where p is 1 if there is a pits table
;;; and eeeee is the number of entrances (0..1f).
.org $eb40
  bpl +
   rts
  nop
+:
.assert * = $eb44


;;; These are available because the "0a" screens are all for single-screen maps.
;;; We do use the 48 bytes at the end of the 142 screen for extra global data.
FREE "0a" [$80c0, $8100)
FREE "0a" [$81c0, $8200)


.ifdef _EXTRA_EXTENDED_SCREENS
.pushseg "0a", "fe", "ff"
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
.reloc
DecomposeScreenYX:
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
.popseg

.org $e639
  ;; read the y=1 byte into both 62fc AND 62fd/13
  jsr DecomposeScreenYX ; $140f0
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
  bpl $e652
FREE_UNTIL $e652

.org $ebe8
  ;; note: the AND should no longer be necessary since it's zero already
  and #$3f    ; note: we only need the 20 bit if we expand the rom
  beq $ebef
   jsr BankSwitch8k_8000  ; BankSwitch8k_8000
.assert * = $ebef

.org $ef36
  jsr PatchPrepareScreenMapRead
  bne $ef46  ; uncond
FREE_UNTIL $ef46

.pushseg "fe", "ff"
.reloc
PatchPrepareScreenMapRead:
    ;; First swap in the correct page into the $8000 bank.
    ;; Ultimately we want A = %00pp_paaa where ppp is $62ff (the low
    ;; 3 bits) and aaa is the upper 3 bits of the input ($11 for temp).
    pha
     sta $11
     lda $62ff
     asl $11
     rol
     asl $11
     rol
     asl $11
     rol
     jsr BankSwitch8k_a000
    pla
    and #$1f
    ora #$a0
    sta $11
    rts
    ; jmp $ef46  ; Pick up where we left off in the original code
.popseg
  

;;; TODO - PrepareMapScreenRead (ff:ef36) hardcodes assumptions about the
;;; segments - we probably need to patch into it to do something else.
;;; There's 4 calls to this.  Consider always loading out of the 8000
;;; bank rather than using both?  Will need to follow up on all 4 calls to
;;; see about swapping in the correct bank always?






.endif ; _EXTRA_EXTENDED_SCREENS


.ifdef _BUFF_DEOS_PENDANT
;;; Skip the check that the player is stationary.  We could also adjust
;;; the speed by changing the mask at $7f02b from $3f to $1f to make it
;;; faster, or $7f to slow it down.  Possibly we could start it at $7f and
;;; lsr if stationary, so that MP recovers quickly when still, but at half
;;; speed when moving?  We might want to consider how this plays with
;;; refresh and psycho armor...
.org $f026
  nop
  nop
.endif




.ifdef _FIX_SHAKING
;;; Fix the shaking issues by tweaking the delay times in IRQ callbacks.
.org $f455
  ldx #$07
  nop
.org $f4eb
  ldx #$03
- dex
  bpl -
.endif


; possibly better to just have a bitset of modes that need to set the latch
; or patch the {lda 8; sta GameMode} that should be in every one?
.ifdef _DISABLE_TRIGGER_SKIP
.org $d497
  jsr FixTriggerSkip_LatchOnItemUse
.org $dd70
  jsr FixTriggerSkip_LatchOnMagicUse
.org $decb
  jsr FixTriggerSkip_LatchOnMagicUse
.endif

;;; Call this instead of 3c008 after the inventory menu
.reloc
PostInventoryMenu:
  ;; Change 'lda' (ad) to 'jsr' (20) to enable these
.ifdef _AUTO_EQUIP_BRACELET
  jsr AutoEquipBracelets
.endif
  lda $0711 ; Equipped sword
  cmp #$05  ; Crystalis
  bne +
   lda #2
   sta $0719
+ jmp UpdateEquipmentAndStatus

.reloc
AutoEquipBracelets:
  lda $6428
  bpl +
   ;; deselect all
-  lda #$80
   sta $642b
   lda #0
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

.reloc
FinishTriggerSquare:
  beq +
   lda #$08  ; game mode normal
   sta $41
+ jmp MainLoop_01_Game
  
.reloc
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

;.export Multiply16Bit

;;; a <- 0, x <- 8
;;; ror a -> ror $61
;;; if the bit we just rotated off $61 is set then add $62
;;; carry goes into upper of A


.reloc
TrainerIncreaseScaling:
  ;; scaling level
  lda Difficulty
  clc
  adc #$02
  cmp #$2f
  bcc +
   lda #$2f
+ sta Difficulty
  lda ShouldRedisplayUI
  ora #UPDATE_DIFFICULTY
  sta ShouldRedisplayUI
  rts

.reloc
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
   jsr BankSwitch8k_8000
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
  jmp BankSwitch8k_8000


.org $e2ac ; normally loads object data for wall
  jsr SpawnWall

.reloc
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
  pha
   adc #$d0 ; carry clear
   sta $11
   jsr LoadOneObjectDataInternal
   ;; 6c0,x gets some information about the wall:
   ;;  - the 10 bit indicates it shoots
   ;;  - the 03 bits store the original type/shape:
   ;;    0/1 for a normal wall, 2 for bridge, 3 for iron.
   ;;    We use this for audible tinks.
  pla
  sta $06c0,x
  lda $2e
  and #$fc    ; don't overwrite the type
  ora $06c0,x ; We check the $10 bit later
  sta $06c0,x
  ;; Store the inverse of the element's mask in 500,x
  lda $2f
  and #$03
  tay
  lda WallElements,y
  sta $0500,x
+ rts

.reloc
WallElements:
  .byte $0e,$0d,$0b,$07

.reloc
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
.reloc
InitialAction:
.ifdef _TRAINER
  jsr TrainerStart
.endif
  rts


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
;;; TODO - move trainer to a different ROM page since it's so big.
.reloc
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
  lda $6e ; NOTE: could just jmp $7d276 ?? but less hygeinic
  pha
   lda #$1a
   jsr BankSwitch8k_8000 ; bank switch 8k 8000
   lda #$01
   jsr $8e46 ; display number internal
  pla
  jmp BankSwitch8k_8000

.reloc
TrainerData:
  .word (TrainerData_Swords)      ; 0 swords, armors, shields
  .word (TrainerData_Magic)       ; 1 accessories, bow of truth, magic
  .word (TrainerData_Balls)       ; 2
  .word (TrainerData_Bracelets)   ; 3
  .word (TrainerData_Consumables) ; 4
  .word (TrainerData_Armors)      ; 5
  .word (TrainerData_Shields)     ; 6

.reloc
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

.reloc
TrainerData_Swords:
  .byte $00,$0c
  .byte $00,$01,$02,$03,$15,$16,$17,$18,$0d,$0e,$0f,$10

.reloc
TrainerData_Magic:
  .byte $18,$18
  .byte $29,$2a,$2b,$2c,$2d,$2e,$2f,$30
  .byte $ff,$ff,$ff,$ff,$ff,$ff,$ff,$40
  .byte $41,$42,$43,$44,$45,$46,$47,$48

.reloc
TrainerData_Balls:
  .byte $0c,$04
  .byte $05,$07,$09,$0b

.reloc
TrainerData_Bracelets:
  .byte $0c,$04
  .byte $06,$08,$0a,$0c

.reloc
TrainerData_Consumables:
  .byte $10,$08
  .byte $1d,$1d,$21,$21,$22,$22,$24,$26

.reloc
TrainerData_Armors:
  .byte $04,$04
  .byte $19,$1a,$1b,$1c

.reloc
TrainerData_Shields:
  .byte $08,$04
  .byte $11,$12,$13,$14

.endif

.ifdef _DISABLE_TRIGGER_SKIP
.reloc
FixTriggerSkip_LatchOnItemUse:
  lda #$01
  sta $61fd
  rts

.reloc
FixTriggerSkip_LatchOnMagicUse:
  sta $07de
  lda #$01
  sta $61fd
  rts

;;; NOTE: We should move this to 34c0e after making _FIX_COIN_SPRITES
;;; mandatory.
.reloc
FixTriggerSkip_CheckLatch:
  lsr $61fd
  bcc +
  pla
  pla
+ lda $0710
  rts
.endif


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


.reloc
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

;;; Note: This is moved from $7db22, where we ran out of space.
.reloc
FinishEquippingConsumable:
    sbc #$1c
    sta EquippedConsumableItem
    rts


.reloc
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

.ifdef _UPDATE_HUD
.reloc
CheckToRedisplayUI:
  lda ShouldRedisplayUI
  beq @CheckEnemyDespawned
  lsr ShouldRedisplayUI
  bcc +
    lda #$06
    jsr DisplayNumber
+ 

.ifdef _ENEMY_HP
  lsr ShouldRedisplayUI
  bcc @CheckEnemyDespawned
    jsr UpdateEnemyHPDisplay
    bne @Exit ; unconditional (no need to check enemy despawn)
.endif ; _ENEMY_HP

; Check to see if the current enemy slot is nonzero, but the action script
; is zero, if so, then its despawned and we can delete it.
@CheckEnemyDespawned:
.ifdef _ENEMY_HP
  ldx CurrentEnemySlot
  beq @Exit
    lda ObjectActionScript,x
    bne @Exit
      sta CurrentEnemySlot
      jsr UpdateEnemyHPDisplay
.endif ; _ENEMY_HP

@Exit:
  jmp CheckForPlayerDeath
.endif

;;; Repurpose $7e148 to skip loading NPCs and just reset pattern table.
;;; The only difference from $7e144 is that $18 gets set to 1 instead of 0,
;;; but this value is never read.  Start by changing all jumps to $7e148
;;; to instead jump to $7e144.  Then we grab some space and have a nonzero
;;; value in $18 return early.
.ifndef _WARP_FLAGS_TABLE ; Note: _WARP_FLAGS_TABLE patches this differently.
.org $e6ff
  jmp $e144
.endif

.org $d21a
  jmp $e144
;;; For these, just eliminate the indirection: update the jump table directly.
.org $d56f
  .word ($e144)  ; ItemOrTriggerActionJumpTable[$06]
.org $d585
  .word ($e144)  ; ItemOrTriggerActionJumpTable[$11]

;;; TODO - we should free 3d6d5 and possibly move around the nearby routines
;;; to make more contiguous blocks.  We should also be able to kill two
;;; separate entries that just point to returns (04 and 00/03/05/12/1a).
;;; We might also be able to move these into a less-valuable bank (or to an
;;; expanded bank)?  Note that 04 is already repurposed for InitialAction,
;;; but the `rts` at d653 is still unused.


;;; ================================================================
;;; Consolidate some of the ItemOrTrigger -> itemget logic. (@@sog)
;;; A number of different message actions can be combined into a single
;;; one once we expose the active trigger ID at $23.

;;; TODO - change the actions on the messageids rather than repeat jumps
;;;   08,0d,0f -> 0b, 14 -> 13
;;;   ==> if we do this then we need to fix logic/world.ts
;;; We could free up 4 new actions (in addition to the 3 or so unused ones)
.org $d573                       ; ItemOrTriggerActionJumpTable + 2*$08
  .word (GrantItemFromTable)      ; 08 learn paralysis
.org $d579                       ; ItemOrTriggerActionJumpTable + 2*$0b
  .word (GrantItemFromTable)      ; 0b learn barrier
  .word (GrantItemThenDisappear)  ; 0c love pendant -> kensu change
  .word (GrantItemFromTable)      ; 0d kirisa plant -> bow of moon
  .word (UseIvoryStatue)          ; 0e
  .word (GrantItemFromTable)      ; 0f learn refresh
.org $d589                       ; ItemOrTriggerActionJumpTable + 2*$13
  .word (DestroyStatue)           ; 13 use bow of moon
  .word (DestroyStatue)           ; 14 use bow of sun


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

.reloc
GrantItemThenDisappear:  ; Used by Kensu in granting change (action 0c)
  jsr GrantItemFromTable
  ldy #$0e
  jmp $d31f

.reloc
UseIvoryStatue:  ; Move bytes from $7d6ec
  jsr $e144 ; LoadNpcDataForCurrentLocation
  ldx #$0f
  lda #$1a
  jsr BankSwitch8k_8000 ; BankSwitch8k_8000
  jsr $98a8 ; ReadObjectCoordinatesInto_34_37
  ldx #$1e
  stx $10
  jsr $9897 ; WriteObjectCoordinatesFrom_34_37
  lda #$df
  sta $11
  jsr $c25d ; LoadOneObjectDataInternal
  lda #$a0
  sta $033e
- rts
DestroyStatue:
  ;; Modified version to use the ID of the used bow rather than have
  ;; a separate action for each bow.
  lda #$00
  ldy $34  ; $3e for moon -> 4ad, $3f for sun -> 4ae ==> add 46f
  sta $046f,y
  lda #$6b
  jsr $c125 ; StartAudioTrack
  jsr $d88b
  lda $04ad
  ora $04ae
  bne -  ; rts from previous
  lda #$7f
  sta $07d7
  lda $04cf
  sta $11
  lda #$0f
  sta $10
  jmp $c25d ; LoadOneObjectDataInternal

.org $d7fd ; itemuse action jump 1c - statue of onyx -> akahana
  jsr GrantItemFromTable
  nop
  nop

;;; In HandleItemOrTrigger, backup $23 in $10 rather than using it for the
;;; JMP opcode, and then call Jmp11 instead.
.org $d845
  lda $23
  sta $34

.org $d853
  jsr Jmp11

;;; ================================================================

;;; Vanilla moves the player down a tile when falling into pits.
;;; This is presumably to better line up the landing with the
;;; horizontal wide screens, which are offset a tile down from
;;; normal caves.  This leads to two problems: (1) when falling
;;; into a non-wide screen, the player lands _inside_ the wall;
;;; (2) the entrance and exit of Sabera's palace need to be
;;; shifted down a tile to compensate and prevent the player
;;; falling through the exit during the screen-shaking dead
;;; frames.  Instead, we offset up a tile, which in practice
;;; seems to be fine.
;; .org $e5a9
;;   beq $e5b2
;; FREE_UNTIL $e5b2

;;; NEW: offset up, and clamp x-tile to [4, b] so that vertical
;;; spikes are eligible targets for both horizontal and vertical
;;; platforms.
.org $e5ab
  sec
  sbc #$10
  nop
  jsr @ClampPitX

.reloc
@ClampPitX:
  sta $b0  ; copied from ff:e5ae
  sta $b1
  ;; original code
  lda $70
  cmp #$44
  bcs +
   lda #$44
+ cmp #$bb
  bcc +
   lda #$bb
+ sta $70
  sta $71
  rts

;;; ================================================================

;;; Now fix the LoadNpcDataForLocation code
.org $e19a  ; in the middle of CheckForNpcSpawn
  lda $18
  beq $e1ae ; >rts
  lda ($10),y  ; npc[1]: sign bit indicates a timer spawn
  dey
  asl
  bcs $e1af ; skip the rts
  jsr $e1b6 ; TryNpcSpawn
  inx
  jmp $e18f ; Check next NPC spawn.
FREE_UNTIL $e1ae

;;; Vanilla returns out of timer spawns when it sees a commented spawn.
;;; Check instead for specifically $ff; $fe will never be a timer (this
;;; is guaranteed by Spawn's [Symbol.iterator] method).
.org $e0ff
  nop
  nop
  cmp #$ff
.assert * = $e103

.ifdef _RANDOM_FLYER_SPAWNS

.org $e1c9 ; In middle of TryNpcSpawn, replacing {iny; lda $2c}
  jsr RandomizeFlyerSpawnPosition

.reloc
;;; When spawning an NPC, if the first two bytes are $fd,$ff then pick
;;; a random location instead.
RandomizeFlyerSpawnPosition:
  lda $2c
  eor #$02 ; $fd -> ff
  and $2d
  eor #$ff
   bne @done
  ;; Read the low 4 bits of $32 (random step counter)
  ;; for 16 possible spawn positions: each of X and Y
  ;; can be one of 4 values: 0, max, half-max, or player.
  txa
  pha
   ;; 62fc,62fd is w,h of map - use that?
   lda #$00
   sta $2c
   sta $2d
   lda $32
   lsr
   bcc +
    ldx $62fd ; map height
    stx $2c
+  lsr
   bcc +
    ldx $62dc ; map width
    stx $2d
+  lsr
   pha
    bcc +
     lsr $2c  ; half height
     bne +
      ;; player y
      lda $d0
      sta $2c
+  pla
   lsr
    bcc +
     lsr $2d  ; half width
     bne +
      ;; player x
      lda $90
      sta $2d
+  ldx #$04
-   asl $2c
    asl $2d
    dex
   bne -
  pla
  tax

  ;; Note: We could possibly shorten this routine if needed by
  ;; instead making it a +/-2 screen (in each direction) delta from
  ;; the player's current position, regardless of map size (it's
  ;; fine to spawn off the map).  This would make the bombardment
  ;; a little more relentless, since the bird wouldn't need to
  ;; traverse a potentially large map to get to the player, but
  ;; would always spawn no more than 2 screens away.
  ;; ;;     lda $32
  ;; ;;     ldx #$04
  ;; ;; -    asl
  ;; ;;      ror $2c
  ;; ;;      asl
  ;; ;;      ror $2d
  ;; ;;      dex
  ;; ;;     bne -
  ;; ;;    pla
  ;; ;;    tax

@done:
  iny      ; Replace 3 bytes at 3e1c9
  lda $2c
  rts

.endif


.reloc
Jmp11: ;;; More efficient version of `jsr $0010`, just `jsr Jmp11`
  jmp ($0011)


.ifdef _HAZMAT_SUIT
.org $ef66
  ;; Check for gas mask instead of leather boots for pain terrain
  cmp #$0d
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



;;; TODO - set up an in-game timer?
;;; Also display completion percent on end screen?
;; .org $7f9f8
;; UpdateInGameTimer:
;; .org $7f3b7
;;   nop
;;   jsr UpdateInGameTimer


;;; The following patch fixes a crash where an IRQ right in the middle of
;;; loading NPCs can fail to correctly restore the bank select register
;;; $8000.  If the IRQ occurs exactly between selecting the bank and setting
;;; the value (i.e. at $7c430..$7c432) and executes both MaybeUpdateMusic
;;; (which page-swaps, rewriting $50 to $8000 afterwards, but not restoring
;;; $50) and SelectCHRRomBanks (which restores $8000 to the clobbered $50)
;;; then the bank swap will fail.  In the case of this crash, it then reads
;;; NpcData from the wrong page, reading a 7 into the NPC type and jumping
;;; off the end of the 5-element NpcDataJump table.  The fix is to make sure
;;; that MaybeUpdateMusic restores $50 as well as $8000, though this takes
;;; an extra two bytes that we need to recover from SelectCHRRomBanks (which
;;; immediately follows) by using smaller instructions.
.org $f564
  jsr SelectCHRRomBanks
.org $f6e2
  jsr SelectCHRRomBanks
.org $f734
  jsr SelectCHRRomBanks
.org $f779
  jsr SelectCHRRomBanks
.org $f785
  jsr SelectCHRRomBanks
.org $f7c8
  jsr SelectCHRRomBanks
.org $f882
  stx $50
  rts
FREE_UNTIL $f8cb

.reloc
SelectCHRRomBanks:
  ldx #$05
-  stx $8000
   lda $07f0,x
   sta $8001
   dex
  bpl -
  lda $50
  sta $8000
  rts

;;; ================================================================
;;; When initializing a new game, we need more space for custom
;;; values.  Instead of a bunch of sta $07xx to zero things out,
;;; use a table.

.org $c96d
  ldx #$00
-- lda PrepareGameInitialDataTable,x
    beq +
   sta $12
   inx
   lda PrepareGameInitialDataTable,x
   sta $10
   inx
   lda PrepareGameInitialDataTable,x
   sta $11
   inx
   ldy #$00
-   lda PrepareGameInitialDataTable,x
    sta ($10),y
    inx
    iny
    dec $12
   bne -
  beq --
+ jsr $c9ff ; PopulateInitialObjects
  jmp $c008
FREE_UNTIL $c9da

.reloc
PrepareGameInitialDataTable:
  ;; Initial location/entrance
  .byte 2
  .word ($006c)
  .byte $00,$01
  ;; Main loop mode and game mode
  .byte 2
  .word ($0040)
  .byte $01,$00
  ;; Various values in the 700 block
  .byte 8
  .word ($0702)
  .ifdef _MONEY_AT_START
    .byte 100
  .else
    .byte 0
  .endif
  .byte $00,$1e,$00,$00,$00,$22,$22
  ;; A few more values in 7xx
  .byte 11
  .word ($0710)
  .byte $00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00
  ;; Some other one-off values
  .byte 2
  .word ($0743)
  .byte $00,$00
  .byte 1
  .word ($07e8)
  .byte $00
  .byte 4
  .word ($0002)
  .byte $00,$00,$00,$00
  .byte 1
  .word ($0051)
  .byte $00
.ifdef _STATS_TRACKING
  ; We need to write these stats twice to prevent NMI shenanigans
.repeat 2
  .byte PERMANENT_LENGTH
  .word (StatTrackingBase)
  .repeat 5
    .byte $00
  .endrepeat
.endrepeat
.endif ; _STATS_TRACKING
  .byte 0
.ifdef _MONEY_AT_START
.pushseg "17"
.org $be80
  .byte 100
.popseg
.endif

.ifdef _ENEMY_HP
;; Clear out the SRAM that stores the enemy HP data
.org $f39f ; Patches on cold/warm boot
  jsr PatchClearEnemyHPRam
.reloc
PatchClearEnemyHPRam:
  lda #0
  ldy #EnemyHPRamLen-1 ; - 1 to account for bpl
-   sta EnemyHPRamStart,y
    dey
    bpl -
  jmp $f0a4 ; ValidateSaveFiles
.endif

.ifdef _AUDIBLE_WALLS
.pushseg "1a","fe","ff"
;;; Reorder the checks: if it's too low, then bail.
;;; Otherwise, check for element match and maybe play
;;; a sound if it's not an iron wall.  This is basically
;;; copied from the original.
.org $9094 ; 35094
  lda $0420,x ; ObjectLevel,x
  cmp #$01
  beq @rts ; Level is too low -> bail out
  lda $0500,y ; ObjectElementalDefense,y
  and $0500,x ; ObjectElementalDefense,x
  and #$0f
  jsr @AudibleWalls ; Will do a double-return if mismatched
  jmp KillObject
@rts:
  rts
.reloc
@AudibleWalls:
  beq +
   ;; Element mismatched.
   ;; See if we should play a sound, double-return either way.
   ;; When we spawned the wall, we stored the original element
   ;; in the upper nibble of the ID byte, so check that that's
   ;; not 3 before playing the sound. (We should also avoid 2?)
   pla
   pla
   lda $06c0,y
   and #$02
   bne + ; bail out if it's iron/bridge
    ;; Figure out what the element is by shifting
    txa
    pha
     lda $0500,y
     ldx #$3f ; 40 is wind, 41 is fire, etc
-     inx
      lsr
     bcs -
     txa
     jsr $c125
    pla
    tax
+ rts
.endif

.ifdef _FIX_SWORD_MANA_CHECK
.segment "1a"
.org $9c9a
  lda $0708 ; player mp
  cmp $8bd8,y ; cost
  bcs $9ca7 ; skip switching to level 2
.endif

.ifdef _FIX_BLIZZARD_SPAWN
.segment "1a","fe","ff"
.org $9cba
  jsr @AdHocSpawnSwordShot

.reloc
@AdHocSpawnSwordShot:
    ;; Check for 0b (blizzard) and clear sword spawns if found
    cmp #$0b
    bne +
      pha
      txa
      pha
      lda #$00
      ldx #$07
-       sta $4a4,x
        dex
      bpl -
      pla
      tax
      pla
+   jmp $972d ; AdHocSpawnObject
.endif
