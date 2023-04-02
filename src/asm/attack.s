;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to the player attack routines (i.e. damaging enemies).  Includes
;;;  1. Adjust damage calculations for different object ram layout
;;;  2. Enable tink mode (optionally)
;;;  3. Nerf flight to not hit ground targets
;;;  4. Change EXP to a count down (on enemy death)
;;;  5. Update displayed enemy name and HP on hit
;;;  6. Fix coin sprites
;;;  7. Fix the MP check for level 3 sword to allow going to zero
;;;  8. Immediately despawn blizzard shots when firing a second time
;;;  9. Make slime mutation based on an imported symbol
;;; 10. Import the coin drop amounts table for mutation

;;; TODO - consider splitting this up into separate files?
;;;      - EXP reversal could go into hud.s?

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

;;; ADJUSTED DAMAGE CALCULATIONS (in the middle of sword-enemy collision jump)
;;; This does several things: (1) tinks do 1 damage, (2) handles the extra HP
;;; bit that we store in the defense byte.
;;; $61 is extra HP bit(s)
;;; $62 is DEF
;;; $63 is damage
.org $90fa
    ;; Initialize
    lda #$00
    sta $61
    ;; Subtract enemy defense from player attack
    lda ObjectDef,y
    lsr     ; Just pull one extra bit for HP, could do one more if needed
    rol $61 ; Roll HP bit into $61, to be used later
    sta $62 ; Store actual shifted DEF in $62
    lda PlayerAtk
    adc ObjectAtk,x
    sbc $62 ; A <- atk - def - 1 (carry is always clear)
    bcs +
     lda #$00 ; If we overflowed, just set it to zero
+   sta $63 ; Damage we're actually going to do
    inc $63 ; Always add one since we added one to defense
    ;; Check elemental immunity
    lda ObjectElementalDefense,y
    eor #$ff ; invert monster defense so that 0=immune
    and ObjectElementalDefense,x
    and #$0f
    bne +
     sta $63
    ;; Check damage and subtract
+   stx $10
    sty $11
    lda $63
    bne ++
      sta ObjectActionScript,x
      lda ObjectActionScript,y
      bmi +
       jsr KnockbackObject
+     lda #SFX_ATTACK_IMMUNE
.ifdef _TINK_MODE
      inc $63
.endif
      bne +++
++   jsr KnockbackObject
     lda #SFX_MONSTER_HIT
+++ jsr StartAudioTrack
    jsr @SubtractEnemyHP
     bcc KillObject
    lsr
.ifdef _ENEMY_HP
    jmp UpdateEnemyHP
    ; implicit rts
.else
    lda $62
    rol
    sta ObjectDef,y
    rts
.endif ; _ENEMY_HP
;;; NOTE: must finish before 35152
FREE_UNTIL $9152

.reloc
@SubtractEnemyHP:
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

;; Adjusted stab damage for populating sword object ($02)
.org $9c5f
  lda #$02
.ifdef _NERF_FLIGHT
  jmp CheckSwordCollisionPlane
.else
  sta $03e2
.endif
  rts

;;; Remove the '10' bit if the player is flying ('20')
.reloc
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


.import EnemyNameBlocklist, ENEMY_NAME_BLOCKLIST_LEN

;;; ----------------------------------------------------
;;; KillObject
;;; Recalculate PlayerEXP to count down from max instead of up
;;; NOTE: This is about 40 bytes more than vanilla.

.org $9152
  ; Instead of calling AwardExperience immediately, just store the obj offset
  ; and push it onto the stack for use later. The code needs to check for an
  ; object replacement and we don't wanna clobber that
  jsr StoreObjectExp
.assert * = $9155

.reloc
StoreObjectExp:
  lda ObjectExp,y
  sta $61
  ; After player level up, we need the original object slot so we can check to see
  ; if the monster that just died is the same one thats in the HP bar. If this monster
  ; is blocklisted then we shouldn't clear the HP bar when it dies
  sty $62
  rts

;; Update the level up check
.org $916a
    lda PlayerLevel
    and #$f0
    beq +
     jmp ExitWithoutDrawingEXP ; (this is just a few bytes too far for a bne)
+   jsr AwardExperiencePoints
    ;; carry clear means we leveled up
    bcc @LevelUp
    ;; but it doesn't check if we were exactly at zero EXP so check for that now
    lda PlayerExp
    ora PlayerExp+1
     bne UpdateCurrentEXPAndExit
    ;; Give 1 free EXP point here to avoid dealing with the zero case below
    ;; (i.e. ensure that carry will always be set after leveling is done).
    dec PlayerExp+1
    dec PlayerExp
@LevelUp:
    inc PlayerLevel
    lda PlayerLevel
    asl ; note: clears carry
    tay
    lda PlayerExp
    adc NextLevelExpByLevel-1,y
    sta PlayerExp
    lda PlayerExp+1
    adc NextLevelExpByLevel,y
    sta PlayerExp+1
    ;; Now that we leveled, it's possible that we have enough exp to level again
    ;; first double check here that we aren't already max level
    lda PlayerLevel
    and #$f0
    bne +
     ;; Adding the PlayerExp hi byte will have set carry if we're back to being
     ;; "positive".  If we _didn't_ carry then we need to add a second level.
     bcc @LevelUp
+   jsr UpdatePlayerMaxHPAndMPAfterLevelUp
    jsr UpdateDisplayAfterLevelUp
    jmp UpdateCurrentEXPAndExit
FREE_UNTIL $91ef

.org $91ef
UpdateCurrentEXPAndExit:
  lda #DISPLAY_NUMBER_EXP
  jsr DisplayNumberInternal
ExitWithoutDrawingEXP:
.ifdef _ENEMY_HP
  jmp RemoveEnemyAndPlaySFX
.else
  lda #SFX_MONSTER_HIT
  jmp StartAudioTrack
.endif ; _ENEMY_HP
  ; implicit rts (note that space is very tight here)
.assert * <= $91fa ; StartMonsterDeathAnimation

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

.ifdef _ENEMY_HP
.reloc
RemoveEnemyAndPlaySFX:
  ;; the last attacked enemy is getting cleared out so we want to update the HP display
  ;; Check first if the current slot == this obj slot (stored in $62 at this point)
  ;; If the moster that just died is not the current monster, then its very likely that
  ;; this monster is blocklisted, so don't clear the HP bar.
  lda CurrentEnemySlot
  cmp $62
  bne +
    jsr ClearCurrentEnemyHPSlot
+ lda #SFX_MONSTER_HIT
  jmp StartAudioTrack
  ; implicit rts
.endif ; _ENEMY_HP

.reloc
UpdatePlayerMaxHPAndMPAfterLevelUp:
  ldy PlayerLevel
  lda $8b7f,y
  sta PlayerMaxHP
  lda $8b8f,y
  sta PlayerMaxMP
  ;; Add the delta of the max HP/MP to the current
  sec
  lda $8b7f,y
  sbc $8b7e,y
  clc
  adc PlayerHP
  sta PlayerHP
  sec
  lda $8b8f,y
  sbc $8b8e,y
  clc
  adc PlayerMP
  sta PlayerMP
  rts

.reloc
UpdateDisplayAfterLevelUp:
  jsr UpdateHPDisplayInternal
  lda #%00011001 ; update displays 0, 3, 4
  jsr UpdateStatusBarDisplays
  lda #GAME_MODE_STATUS_MSG
  sta GameMode
  ; Update player metasprite information? This was copied from the
  ; actual game code
  lda #$0d
  sta $06c3
  lda #$20
  sta $06e3
  jmp UpdateEquipmentAndStatus


;;; ----------------------------------------------------
;;; AwardExperiencePoints
;; This is changed so that Player EXP counts down instead of up to max EXP
;; skip exp calculation if max level
.org $924b ; AwardExperiencePoints
  ;; instead of loading from ObjExp, we store the Exp value in $61
  lda $61
  nop

.org $9250
  ;; If the EXP < $80, then we set 0 for the monster exp lobyte
  ldy #$00
  sty $11      ; $11 is used to store the upper bits of monster exp temporarily
  jmp Do16BitSubtractionForEXP
FREE_UNTIL $925d

.org $9261
  ;; instead of loading from ObjExp, we store the Exp value in $61
  lda $61
  nop

.org $926e
  ;; If the EXP >= $80, the code before this will load the hibyte into $11
  jmp Do16BitSubtractionForEXP


.reloc
Do16BitSubtractionForEXP:
  ; A = monsterEXPLo; y = scratch
  ldy PlayerExp
  sta PlayerExp
  tya
  ; A = playerExp; PlayerExp = monsterEXP
  sec
  sbc PlayerExp
  sta PlayerExp
  lda PlayerExp+1
  sbc $11
  sta PlayerExp+1
  rts


;;; ----------------------------------------------------
;; Inital EXP changes
;; Change the "initial" value loaded into the Continue save
;; file is you select continue from a cold boot. InitialPrg_6400
.pushseg "17", "fe", "ff"
.org $be82
  .byte $1e
.org $be84
  .byte $00
.popseg

.ifdef _ENEMY_HP
.pushseg "fe", "ff"

.import ENEMY_NAME_FIRST_ID, ENEMY_NAME_LAST_ID, ENEMY_NAME_LENGTH
EnemyNameTable = $a000
EnemyNameTableLo = $a000
EnemyNameTableHi = $a100

ENEMY_HP_VRAM_BUFFER_OFFSET = $a0
ENEMY_HP_VRAM_UPDATE = $20
ENEMY_NAME_VRAM_BUFFER_OFFSET = $b0
ENEMY_NAME_VRAM_UPDATE = $21
ENEMY_NAME_BUFFER_SIZE = ENEMY_NAME_LENGTH + 2

;; Add the Enemy Name to the precomputed write table.
.org $c5b8
; Used to set/clear the enemy HP (NametablePrecomputedHeaderTable @ #$20)
.byte $ab,$62,$09,ENEMY_HP_VRAM_BUFFER_OFFSET,$80
; Used to draw the enemy name (NametablePrecomputedHeaderTable @ #$21)
.byte $ab,$82,ENEMY_NAME_BUFFER_SIZE,ENEMY_NAME_VRAM_BUFFER_OFFSET,$80

.reloc
UpdateEnemyHPDisplay:
  lda $6e
  pha
    lda #$1a
    jsr BankSwitch8k_8000
    lda $6f
    pha
      lda #$3d
      jsr BankSwitch8k_a000
      ; UpdateEnemyHP preserves x and y
      jsr UpdateEnemyHPDisplayInternal
    pla
    jsr BankSwitch8k_a000
  pla
  jsr BankSwitch8k_8000
  jmp EnableNMI
  ; implicit rts
.popseg


;; Force this part to go into the $a000 page so we can have DisplayNumber in $8000
.pushseg "3d"


;; ;;; New version of GameMode_01, in the expanded PRG
;; .pushseg "3d", "fe", "ff"
;; .reloc
;; LocationChangeInitialHook:
;;     .ifdef _ENEMY_HP
;;   jsr ClearCurrentEnemyHPSlotAndRedraw
;;   jsr $c676 ; WaitForNametableFlush
;;     .endif
;;   jmp $ca2e ; MainGameModeJump_01_LocationChange

;; ;;; Change the page of the 01 game mode to 1e (3c/3d).
;; .org $cb2f
;;   .byte $1e ; page 3d
;; .org $cae0
;;   .word (LocationChangeInitialHook)
;; .popseg


;;; Call ClearCurrentEnemyHPSlotAndRedraw from ExitTypeJump_0_Normal.
;;; This ensures the enemy HP is erased while the screen is faded out,
;;; rather than a frame after it fades in (which is a little jarring).
.pushseg "3d", "fe", "ff"
.org $e453
@StartReplace:
  lda #$3d
  jsr $c427 ; BankSwitch8k_A000
  jsr @ClearCurrentEnemyHPSlotAndRedraw
@EndReplace:
.reloc
@ClearCurrentEnemyHPSlotAndRedraw:
  ;; We use #$ff as a signal that the slot was empty before spawning
  ;; NPCs.  This code runs _after_ NPC spawn (and fade-in?)
  lda #0
  sta CurrentEnemySlot
  jsr ClearCurrentEnemyHP
+ .move @EndReplace - @StartReplace, @StartReplace
  rts
.popseg


;;; ----------------------------------------------------
.reloc
; [in] carry set if the enemy is still alive, 0 if we are clearing
; [in] y - Offset for the current enemy we are displaying health for
UpdateEnemyHPDisplayInternal:
  ; Enemy is dead so clean out all the values.
  txa
  pha
    tya
    pha
      ldy CurrentEnemySlot
      bne @EnemyAlive
        ;; Enemy is dead, so clear the display
        ;; If the HP slot is already clear, then skip redrawing anything
        cpy PreviousEnemySlot
        beq @Exit
        ;; y is 0 at this point - zero everything out
        jsr ClearCurrentEnemyHP
@Exit:
    pla
    tay
  pla
  tax
  rts
@EnemyAlive:
  ; If the previous slot was empty, call all of the update functions without checking
  ; to see if they changed. This is useful in the event the game needs to redraw the status bar
  ; (See RedrawEnemyHPDisplayAfterClear for more info)
  lda PreviousEnemySlot
  bne +
    jsr @StandardTiles
    jsr @EnemyName
    jsr @LoadCurrentHP
    jsr @DrawCurrentHP
    jsr @LoadMaxHP
    jsr @DrawMaxHP
    bcc @Exit ; unconditional
+ ldy CurrentEnemySlot
  lda ObjectNameId,y
  cmp RecentEnemyObjectId
  beq +
    jsr @EnemyName
+ jsr @LoadCurrentHP
  cpx RecentEnemyCurrHPLo
  bne +
    cmp RecentEnemyCurrHPHi
    beq ++
  ; A = enemy curr hp hi, x = enemy curr hp lo
+ jsr @DrawCurrentHP
++jsr @LoadMaxHP
  cpx RecentEnemyMaxHPLo
  bne +
    cmp RecentEnemyMaxHPHi
    beq @Exit
  ; A = enemy max hp hi, x = enemy max hp lo
+ jsr @DrawMaxHP
  bcc @Exit ; unconditional

.reloc
@StandardTiles:
  ; if the previous enemy was slot 0, then we need to draw the Ey and /
  ldy CurrentEnemySlot
  sty PreviousEnemySlot
  lda #$82 ; Ey
  sta $6000 + ENEMY_HP_VRAM_BUFFER_OFFSET
  lda #$20 ; Space
  sta $6001 + ENEMY_HP_VRAM_BUFFER_OFFSET
  lda #$9d ; /
  sta $6005 + ENEMY_HP_VRAM_BUFFER_OFFSET
  lda #ENEMY_HP_VRAM_UPDATE
  jmp StageNametableWriteFromTable
  ; implicit rts
.reloc
@EnemyName:
  ldy CurrentEnemySlot
  lda ObjectNameId,y
  sta RecentEnemyObjectId
  ; Load the pointer to the enemy name len (one byte) and enemy name (len bytes)
  tax
  lda EnemyNameTableLo,x
  sta $61
  lda EnemyNameTableHi,x
  sta $62

  lda #$9a ; tile for left close ]
  sta $6000 + ENEMY_NAME_VRAM_BUFFER_OFFSET

  ; read the length of the name into x and store it for later use
  ldy #0
  lda ($61),y
  pha
    tax
    iny
    ; copy the name into the staging buffer
-     lda ($61),y
      sta $6000 + ENEMY_NAME_VRAM_BUFFER_OFFSET,y
      iny
      dex
    bne -
  pla
  tax
  inx
  lda #$9b ; tile for right close [
  sta $6000 + ENEMY_NAME_VRAM_BUFFER_OFFSET,x
  inx
  ; check if we need to fill the rest with the border
  cpx #ENEMY_NAME_BUFFER_SIZE
  bpl +
    ; fill the rest of the buffer with #$1c the bar character
    lda #$1c
-     sta $6000 + ENEMY_NAME_VRAM_BUFFER_OFFSET,x
      inx
      cpx #ENEMY_NAME_BUFFER_SIZE
    bmi -
+ ; call the function to blit it to the nametable
  lda #ENEMY_NAME_VRAM_UPDATE
  jmp StageNametableWriteFromTable
  ; implicit rts
.reloc
@LoadCurrentHP:
  ; load the Current HP into A == hi X == lo
  ldy CurrentEnemySlot
  lda ObjectHP,y
  clc
  adc #01
  tax
  lda ObjectDef,y
  ; mask off all but the lowest bit (since the enemy HP is only 9bits right now)
  and #$01
  adc #$00 ; adds 1 only if the carry is set (from the previous adc)
  rts
.reloc
@DrawCurrentHP:
  sta RecentEnemyCurrHPHi
  stx RecentEnemyCurrHPLo
  lda #DISPLAY_NUMBER_ENEMYHP
  jmp DisplayNumberInternal
  ; implicit rts
.reloc
@LoadMaxHP:
  ; load the Max HP into A == hi X == lo
  ldy CurrentEnemySlot
  lda ObjectMaxHPLo,y
  clc
  adc #$01
  tax
  lda ObjectMaxHPHi,y
  adc #$00 ; adds 1 only if the carry is set (because Max HP overflowed)
  rts
.reloc
@DrawMaxHP:
  sta RecentEnemyMaxHPHi
  stx RecentEnemyMaxHPLo
  lda #DISPLAY_NUMBER_ENEMYMAX
  jmp DisplayNumberInternal
  ; implicit rts
.popseg

;;; Back to 1a/1b/fe/ff

.reloc
UpdateEnemyHP:
    lda $62
    rol
    sta ObjectDef,y
    ; Check to see if the monster we attacked is on the blocklist
    ; by looking at the blocklist generated from the object data.
    ; If a monster has HP but does not have a display name then it is
    ; blocked from being displayed.
    lda ObjectNameId,y
    ; The blocklist should never be empty, but if it somehow does, then this code would break horribly
.assert ENEMY_NAME_BLOCKLIST_LEN > 0
    ldx #ENEMY_NAME_BLOCKLIST_LEN-1
-     cmp EnemyNameBlocklist,x
      beq +
      dex
      bpl -
    sty CurrentEnemySlot
    lda ShouldRedisplayUI
    ora #DRAW_ENEMY_STATS
    sta ShouldRedisplayUI
+   rts
.endif ; _ENEMY_HP


.ifdef _FIX_COIN_SPRITES
;;; Normally this code reads from a table to give the 16 different coin drop
;;; buckets a different metasprite.  Instead, we just change the CHR pages
;;; so that they're all compatible with $a9, which is loaded by LoadObject
;;; (after we updated the coin's object data to use a9 instead of a8).
;;; Now everything shows a single big coin.  This leads to slightly less
;;; variety, but less glitchy graphics.  Mimics should load $aa instead.
;;; We can tell because $300,x == $90.  This also frees up metasprite a8.
FREE "1a" [$8bfe, $8c0e) ; this table is no longer read, free up 16 bytes

.org $ba1c
  lda $0300,x
  cmp #$90
  bne +
   inc $0300,x
+ rts
FREE_UNTIL $ba2c
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

.segment "1a"

;;; Slimes mutate based on a configurable element 
.import slimeMutationElement
.org $922c
  cmp #slimeMutationElement

FREE "1a" [$8bde, $8bfe)        ; TODO - free other bits
.import CoinAmounts
