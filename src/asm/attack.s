;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to the player attack routines (i.e. damaging enemies).  Includes
;;;  1. Adjust damage calculations for different object ram layout
;;;  2. Enable tink mode (optionally
;;;  3. Nerf flight to not hit ground targets
;;;  4. Change EXP to a count down (on enemy death)
;;;  5. Update displayed enemy name and HP on hit
;;;  6. Fix coin sprites
;;;  7. Fix the MP check for level 3 sword to allow going to zero
;;;  8. Immediately despawn blizzard shots when firing a second time
;;;  9. Make slime mutation based on an imported symbol
;;; 10. Import the coin drop amounts table for mutation
;;; 11. Moves the entire attack-collision handler to page 3c

;;; TODO - consider splitting this up into separate files?
;;;      - EXP reversal could go into hud.s?

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

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
+   jmp AdHocSpawnObject
.endif

FREE "1a" [$8bde, $8bfe)        ; TODO - free other bits
.import CoinAmounts

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;; 
;;; The following code has been moved wholesale from page 1a to page 3c.
;;; It also includes various modifications inline (mostly marked by both
;;; preprocessor .if's as well as "smudge off" comments).
;;; 
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

.segment "3c"

.reloc
;;; --------------------------------
;;; When the player hits an invisible shadow with magic, it
;;; becomes its replacement (a visible wraith).
OVERRIDE
PlayerHitInvisibleShadow:       ; smudge from $35082 to $35094
        <@35082 ObjectLevel@>
        <@35085@>
          bne :>rts             ; TODO - make this bcc and allow customizing level
        ;; Object was hit with a level 3 shot.
        <@35089 ObjectReplacement@>
        <@3508c@>
        <@3508e@>
        <@35090 LoadOneObjectData@>

;;; --------------------------------
;;; The player hit a rock/ice/iron wall or a water channel.
;;; All of these have $4a0,y == $87.  In this case, check
;;; the elemental type for the wall and compare it with the
;;; sword.
OVERRIDE
PlayerHitFlagWallOrChannel:     ; smudge from $35094 to $350aa
    .ifdef _AUDIBLE_WALLS       ; smudge off [moved from walls.s]
        ;; Reorder the checks: if it's too low, then bail.
        ;; Otherwise, check for element match and maybe play
        ;; a sound if it's not an iron wall.  This is basically
        ;; copied from the original.
        lda ObjectLevel,x
        cmp #$01
        beq :>rts ; Level is too low -> bail out
        lda ObjectElementalDefense,y
        ;; Invert how walls work: their elemental defense byte stores
        ;; a single bit, and the sword must have that bit as well: this
        ;; makes Crystalis able to break all walls.
        eor #$0f
        and ObjectElementalDefense,x
          beq :>rts
        ;; Element mismatched.
        ;; See if we should play a sound, double-return either way.
        ;; When we spawned the wall, we stored the original element
        ;; in the upper nibble of the ID byte, so check that that's
        ;; not 3 before playing the sound. (We should also avoid 2?)
        lda $06c0,y
        and #$02
          bne :>rts ; bail out if it's iron/bridge
        ;; Figure out what the element is by shifting
        txa
        pha
          lda $0500,y
          ldx #$3f ; 40 is wind, 41 is fire, etc
-           inx
            lsr
          bcs -
          txa
          jsr StartAudioTrack
        pla
        tax
        rts
        ;; ---
+       jmp KillObject

    .else                      ; smudge on
        ;; If elements don't match, do nothing.
        <@35094 ObjectElementalDefense@>
        ;; Invert how walls work: their elemental defense byte stores
        ;; a single bit, and the sword must have that bit as well: this
        ;; makes Crystalis able to break all walls.
        eor #$0f                ; smudge off
        and ObjectElementalDefense,x
          beq :>rts
        ;; If level is 1 (bare sword or lvl1 shot), do nothing.
        <@3509e ObjectLevel@>       ; smudge on
        <@350a1@>
          beq :>rts
          ;; beq * + 5 ; never taken
        <@350a7 KillObject@>
    .endif

;;; --------------------------------
;;; Inputs:
;;;   x - index of the player's sword (2 for sword, 4..b for projectiles).
;;;   y - index of the object that was hit.
OVERRIDE
CollisionJump_00_SwordHitsEnemy:        ; smudge from $350aa to $351fa
        ;; Entry point??? - $34fb1
        <@350aa CurrentLocation@>
        <@350ac LOC_DYNA@>           ; TODO - does this work?
        <@350ae +@>
          ;; Dyna-only handling
          <@350b0@>
          <@350b2@>
          <@350b5@>
          <@350b8@>
+       <@350bb CheckThunderSwordReaction@>
        <@350be ObjectActionScript@>
        <@350c1@>
        <@350c3 ++@> ; $350e4
          ;; This happens for the Stom fight: $4a0,x == #$52
          ;; Note: persons' 4a0 and 6e0 both come from PersonData[id][2]:7f,
          ;; provided that [2] is negative; if it's negative then it's stored
          ;; in $6e0 but not $4a0.  Given that this looks like it's shifting
          ;; two objects' up one tile, that's consistent with this actually
          ;; being the code for hitting Stom.
          <@350c5@>
          <@350c8@>
          <@350cb@>
          <@350cd +@> ; $350df
            <@350cf PlayerYLo@>
            <@350d1@>
            <@350d2@>
            <@350d4 PlayerYLo@>
            <@350d6 ObjectYLo@>
            <@350d9@>
            <@350da@>
            <@350dc ObjectYLo@>
+         <@350df SFX_MONSTER_HIT@>
          <@350e1 StartAudioTrack@>
          ;; ----
++      <@350e4 ObjectActionScript@>
        <@350e7@>
        <@350e9 +@> ; $350ec
        ;; Don't do anything for hitting an object with action #$10.
        ;; This seems to mainly include enemies' swords and projectiles.
          <@350eb@>
          ;; ----
+       <@350ec ObjectActionScript@>
        <@350ef@>
          <@350f1 PlayerHitFlagWallOrChannel@>
        <@350f3 ObjectMetasprite@>
        <@350f6@>
          <@350f8 PlayerHitInvisibleShadow@>
        ;; Done with special cases - now compute damage

    .ifdef _RESCALE_DAMAGE      ; smudge off

        ;; ADJUSTED DAMAGE CALCULATIONS (in the middle of sword-enemy collision jump)
        ;; This does several things: (1) tinks do 1 damage, (2) handles the extra HP
        ;; bit that we store in the defense byte.
        ;; $61 is extra HP bit(s)
        ;; $62 is DEF
        ;; $63 is damage

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
+       sta $63 ; Damage we're actually going to do
        inc $63 ; Always add one since we added one to defense
        ;; Check elemental immunity
        lda ObjectElementalDefense,y
        eor #$ff ; invert monster defense so that 0=immune
        and ObjectElementalDefense,x
        and #$0f
        bne +
         sta $63
        ;; Check damage and subtract
+       stx $10
        sty $11
        lda $63
        bne ++
          sta ObjectActionScript,x
          lda ObjectActionScript,y
          bmi +
            jsr KnockbackObject
+           lda #SFX_ATTACK_IMMUNE
      .ifdef _TINK_MODE
            inc $63
      .endif
            bne +++
++      jsr KnockbackObject
        lda #SFX_MONSTER_HIT
+++     jsr StartAudioTrack
        ;; Subtract the enemy HP
        lda ObjectElementalDefense,y
        and #$0f
        cmp #$0f
        sec
        beq +   ; don't damage anything that's invincible.
          lda ObjectHP,y
          sbc $63
          sta ObjectHP,y
+       lda $61
        sbc #$00
        ;; Kill the enemy if its HP went negative
          bcc KillObject
        lsr

      .ifdef _ENEMY_HP
        jmp UpdateEnemyHP
        ; ---
      .else
        lda $62
        rol
        sta ObjectDef,y
        rts
      .endif ; _ENEMY_HP

    .else ; not _RESCALE_DAMAGE - smudge from $350fa to $35152

        <@350fa ObjectLevel@>
        <@350fd@> ; Required level to inflict damage
        <@350ff@>
        <@35101 PlayerLevel@>
        <@35104@>
          <@35106 @EnemyImmune@>
        ;; $421 >= $420,y so level is high enough to damage.
        ;; Now figure out the attack vs defense.  Add the player's attack with
        ;; the actual shot's attack.  This player's attack already takes into
        ;; account the sword, as does the object attack.
        <@35108 PlayerAttack@>
        <@3510b@>
        <@3510c ObjectAttack@>
        <@3510f@>
        ;; Check elemental defenses - 500,x is a single bit, 500,y bits are set
        ;; if the enemy is immune to that element.
        <@35111 ObjectElementalDefense@>
        <@35114 ObjectElementalDefense@>
        <@35117@>
        <@35119 @EnemyImmune@>
        <@3511b@>
        <@3511d@>
        <@3511e ObjectDefense@>
        <@35121@>
        <@35123 @DealDamage@>
@EnemyImmune:
        ;; Remove the attacking object
        <@35125@>
        <@35127 ObjectActionScript@>
        <@3512a@>
        <@3512c@>
        <@3512e ObjectActionScript@>
        <@35131 +@>
          <@35133 KnockbackObject@>
+       <@35136 SFX_ATTACK_IMMUNE@>
        <@35138 StartAudioTrack@>
        ;; ----
@DealDamage:
        ;; Deal damage to an enemy
        <@3513b ObjectHP@>
        <@3513e@>
        <@3513f@>
        <@35141 ObjectHP@>
          <@35144 KillObject@>
        <@35146@>
        <@35148@>
        <@3514a KnockbackObject@>
        <@3514d SFX_MONSTER_HIT@>
        <@3514f StartAudioTrack@>
        ;; ----

    .endif ; _RESCALE_DAMAGE

;;; NOTE: This must remain attached to the previous code chunk
;;; because it does a relative branch into here.

;;; Kills object Y, awarding experience and/or performing any death actions.
OVERRIDE
KillObject:

    .ifdef _UPDATE_HUD ; smudge off
        ;; NOTE: Part of the HUD update is to change the EXP display
        ;; to count down from the max, rather than up.  This requires
        ;; some changes to how EXP is granted.  While we're changing
        ;; this we _also_ update it to allow carrying over any extra
        ;; EXP into the next level.

        ;; Instead of calling AwardExperience immediately, just store
        ;; the obj offset and push it onto the stack for use
        ;; later. The code needs to check for an object replacement
        ;; and we don't wanna clobber that
        lda ObjectExp,y
        sta $61
        ;; After player level up, we need the original object slot so
        ;; we can check to see if the monster that just died is the
        ;; same one thats in the HP bar. If this monster is
        ;; blocklisted then we shouldn't clear the HP bar when it dies
        sty $62

    .else ; smudge from $35152 to $3516a
        <@35152 AwardExperiencePoints@>
    .endif

        <@35155 ObjectReplacement@>
        <@35158 +@>
        ;; If no replacement then do standard monster death animation
            <@3515a StartMonsterDeathAnimation@>
            <@3515d ++@>
            ;; ----
          ;; Otherwise, swap out the object for its replacement
+         <@35160@>
          <@35162 ObjectReplacement@>
          <@35165@>
    .ifdef _OOPS_ALL_MIMICS     ; smudge off
          ;; Replace the object and patch in a chest
          ;; a - ObjectReplacement; y - object index
          cmp #$0d ; ObjectChest - if we are about to drop a chest
          bne +
            ; AND we have the sentinel data to signify its from a dead mimic
            lda $06c0, y
            cmp #DEAD_MIMIC
            bne +
              ; after loading the replacement we want to copy over the item
              lda $06a0, y
              pha
                jsr $ff80 ; LoadOneObjectData
              pla
              sta $0560, y
              lda #DEAD_MIMIC
              sta $06c0, y
              rts
+         jmp LoadOneObjectData

    .else                       ; smudge on
          <@35167 LoadOneObjectData@>
    .endif

        ;; Check experience to see if we're at the next level yet.

    .ifdef _UPDATE_HUD        ; smudge off
    
++      lda PlayerLevel
        and #$f0
        beq +
          ;; If player is already at level 16, then bail out.
          jmp @ExitWithoutDrawingEXP ; (this is just a few bytes too far for a bne)
+       jsr AwardExperiencePoints
        ;; carry clear means we leveled up
        bcc @LevelUp
        ;; but it doesn't check if we were exactly at zero EXP so check for that now
        lda PlayerExp
        ora PlayerExp+1
          bne @UpdateCurrentEXPAndExit
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
+       jsr @UpdatePlayerMaxHPAndMPAfterLevelUp
        jsr @UpdateDisplayAfterLevelUp
        jmp @UpdateCurrentEXPAndExit

@UpdateCurrentEXPAndExit:
        lda #DISPLAY_NUMBER_EXP
        jsr DisplayNumber ;Internal
@ExitWithoutDrawingEXP:
      .ifdef _ENEMY_HP
        ;; RemoveEnemyAndPlaySFX:
        ;; the last attacked enemy is getting cleared out so we want to update the HP display
        ;; Check first if the current slot == this obj slot (stored in $62 at this point)
        ;; If the moster that just died is not the current monster, then its very likely that
        ;; this monster is blocklisted, so don't clear the HP bar.
        lda CurrentEnemySlot
        cmp $62
        bne +
          jsr ClearCurrentEnemyHPSlot
+       lda #SFX_MONSTER_HIT
        jmp StartAudioTrack
        ;; ---

      .else
        lda #SFX_MONSTER_HIT
        jmp StartAudioTrack
      .endif ; _ENEMY_HP

.reloc
@UpdatePlayerMaxHPAndMPAfterLevelUp:
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
@UpdateDisplayAfterLevelUp:
        jsr UpdateHPDisplay ;Internal
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

    .else ; not _UPDATE_HUD - smudge from $3516a to $351fa

++      <@3516a PlayerExp@>
        <@3516d@>
        <@3516e PlayerExpToNextLevel@>
        <@35171 PlayerExp+1@>
        <@35174 PlayerExpToNextLevel+1@>
        <@35177 +@>
         <@35179@>
         <@3517b PlayerExp@>
         <@3517e PlayerExp+1@>
         <@35181 PlayerLevel@>
         <@35184@>
         <@35186 +@>
          <@35188 PlayerLevel@>
          <@3518b PlayerLevel@>
          <@3518e MaxHPByLevel@>
          <@35191 PlayerMaxHP@>
          <@35194 MaxMPByLevel@>
          <@35197 PlayerMaxMP@>
        ;; Add the delta of the max HP/MP to the current
          <@3519a@>
          <@3519b MaxHPByLevel@>
          <@3519e MaxHPByLevel-1@>
          <@351a1@>
          <@351a2 PlayerHP@>
          <@351a5 PlayerHP@>
          <@351a8@>
          <@351a9 MaxMPByLevel@>
          <@351ac MaxMPByLevel-1@>
          <@351af@>
          <@351b0 PlayerMP@>
          <@351b3 PlayerMP@>
        ;; Load the exp to next level
          <@351b6 PlayerLevel@>
          <@351b9@>
          <@351ba@>
          <@351bb NextLevelExpByLevel-1@>
          <@351be PlayerExpToNextLevel@>
          <@351c1 NextLevelExpByLevel@>
          <@351c4 PlayerExpToNextLevel+1@>
        ;; Update the display
          <@351c7 UpdateHPDisplay@> ;Internal
          <@351ca@> ; LV (status bar)
          <@351cc DisplayNumber@> ;Internal
          <@351cf@> ; EXP left
          <@351d1 DisplayNumber@> ;Internal
          <@351d4@> ; MP
          <@351d6 DisplayNumber@> ;Internal
          <@351d9@> ; Max MP
          <@351db DisplayNumber@> ;Internal
          <@351de GAME_MODE_STATUS_MSG@>
          <@351e0 GameMode@>
          <@351e2@>
          <@351e4@>
          <@351e7@>
          <@351e9@>
          <@351ec UpdateEquipmentAndStatus@>
+       <@351ef@> ; EXP
        <@351f1 DisplayNumber@> ;Internal
        <@351f4 SFX_MONSTER_HIT@>
        <@351f6 StartAudioTrack@>
        <@351f9@>

    .endif ; _UPDATE_HUD

;;; --------------------------------

.reloc     ; smudge from $351fa to $35229
OVERRIDE
StartMonsterDeathAnimation:
        <@351fa@>
        <@351fc@>
        <@351ff ObjectTerrain@>
        <@35202@>
        <@35204@>
        <@35206 ObjectTerrain@>
        <@35209@>
        <@3520b ObjectKnockback@>
        <@3520e@>
        <@35210 ObjectActionScript@>
        <@35213@>
        <@35215 ObjectAnimationCounter@>
        <@35218@>
        <@3521a@>
        <@3521d ObjectHitbox@>
        <@35220 ObjectDelay@>
        <@35223@>
        <@35225 ObjectReplacement@>
        <@35228@>

;;; --------------------------------
;;; When hitting a small slime with the thunder sword, the slime turns into
;;; a big slime.  The Object ID of the big slime is at $6e0,y, but this is
;;; not used unless $540,y is zero and $560,y is not 3.  If this does trigger
;;; then we double-return out of CollisionJump_00_SwordHitsEnemy
.reloc                          ; smudge from $35229 to $3527e
OVERRIDE
CheckThunderSwordReaction:
        <@35229 EquippedSword@>
        ;;; Slimes mutate based on a configurable element 
    .import slimeMutationElement
        <@3522c slimeMutationElement@>
        bne :>rts
        <@35230@>
        bne :>rts
        <@35235@>
        <@35238 +@> ; pointless? shouldn't the bne cover this?
         <@3523a@>
         bne :>rts
        ;; NOTE: when hitting a slime with a thunder sword, this path
        ;; replaces it with a big blue slime; seems to also apply to
        ;; red slimes; several other monsters have this bit set, but it
        ;; does not have this effect for them - so it's contingent on
        ;; other things.  It looks like $0711 holds the sword type,
        ;; $540,y (3:40) needs to be zero and either $560,y (3:20) must
        ;; be zero or at least not 3.
+       <@3523e@>
        <@35241@>
        <@35243@>
        <@35245 LoadOneObjectData@>
        ;; Double-return
        <@35248@>
        <@35249@>
        <@3524a@>
;;; --------------------------------
.reloc                          ; smudge from $3524b
OVERRIDE
AwardExperiencePoints:
        ;; The HUD update flips the EXP stat to count down, and stashes
        ;; the killed enemy's EXP in $61 instead of calling this routine
        ;; directly (instead, this is called later, after the enemy has
        ;; been cleaned up).  Note that this preprocessor branch has a
        ;; side effect that reading __obj_exp is either 2 or 3 bytes,
        ;; depending on _UPDATE_HUD.
        .ifdef _UPDATE_HUD
          .define __obj_exp $61
        .else
          .define __obj_exp ObjectExperiencePoints,y
        .endif

        <@35275 __obj_exp@>
        <@352ca ++@>
          ;; exp < $80 are as-is
    .ifdef _UPDATE_HUD          ; smudge off
          ;; set 0 for monster exp lobyte
          ldy #0
          sty $11
          beq @Do16BitSubtractionForEXP ; unconditional
          ;; ---
    .else                       ; smudge on
          <@35377@>
          <@3539a PlayerExp@>
          <@353c9 PlayerExp@>
          <@35489 +@> ; $3525c
            <@35657 PlayerExp+1@>
+         <@35690@>
          ;; ----
    .endif
++      <@3573a@>
        <@3574b@>
        <@35768 __obj_exp@>
        <@3576a@>
        <@357a6@>
        <@35266@>
        <@35268@>
        <@35269@>
        <@3526b@>
        <@3526c@>
    .ifdef _UPDATE_HUD          ; smudge off
@Do16BitSubtractionForEXP:
        ;; A = monsterEXPLo; y = scratch
        ldy PlayerExp
        sta PlayerExp
        tya
        ;; A = playerExp; PlayerExp = monsterEXP
        sec
        sbc PlayerExp
        sta PlayerExp
        lda PlayerExp+1
        sbc $11
    .else                       ; smudge on
        <@3526e@>
        <@3526f PlayerExp@>
        <@35272 PlayerExp@>
        <@35275@>
        <@35277 PlayerExp+1@>
    .endif
        <@3527a PlayerExp+1@>
        <@3527d@>

.reloc
UpdateEnemyHP:
    lda $62
    <@35a61@>
    <@35b2a ObjectDef@>
    ; Check to see if the monster we attacked is on the blocklist
    ; by looking at the blocklist generated from the object data.
    ; If a monster has HP but does not have a display name then it is
    ; blocked from being displayed.
    <@35ba2 ObjectNameId@>
    ; The blocklist should never be empty, but if it somehow does, then this code would break horribly
.assert ENEMY_NAME_BLOCKLIST_LEN > 0
    <@35c4f ENEMY_NAME_BLOCKLIST_LEN-1@>
-     <@35fbc EnemyNameBlocklist@>
      <@36043 +@>
      <@37abf@>
      <@37ad4 -@>
    <@37b60 CurrentEnemySlot@>
    <@37b61 ShouldRedisplayUI@>
    <@37b62 DRAW_ENEMY_STATS@>
    <@37b64 ShouldRedisplayUI@>
+   <@37b78@>
.endif ; _ENEMY_HP
