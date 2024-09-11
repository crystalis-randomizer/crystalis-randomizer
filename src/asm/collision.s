;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Imports the original collision routines:
;;;  - hitboxes
;;;  - projectiles, status effects
;;;  - damage dealing
;;;  - knockback
;;; Most of this code originally lived in segment "1a" alongside the
;;; vector/movement routines and the object actions, but we're moving
;;; it out into segment "3c" instead.

FREE "1a" [$8f6e, $972d)

;;; Jumps to the given address on a different page.  When the
;;; jumped-to routine returns, it will continue with restoring the
;;; banks to their current contents, and then return back out to the
;;; caller.  Note that this costs 23 bytes.
;;;
;;; Restrictions:
;;;   - A and F will be wrecked before the jump completes
;;;   - A and F will be wrecked after the routine returns
;;;   - Double-returns are not allowed in the routine
;;; 
;;; Usage:
;;;   Label_3c:
;;;     FAR_JUMP Label
.macro FAR_JUMP_LO addr
        .assert addr < $a000
        ;; Set up the stack for multiple uses of the "rts trick".
        ;; The top of the stack will be the 1a address we want,
        ;; so that the call to BankSwich8k_8000 returns to there.
        ;; When that routine returns, it will jump into RestoreBanks,
        ;; which expects two banks to be at the top of the stack
        ;; (pulled from 6e and 6f).  Once that's done, 
        lda $6e
        pha
        lda $6f
        pha
        lda #>(RestoreBanks-1)
        pha
        lda #<(RestoreBanks-1)
        pha
        lda #>(addr-1)
        pha
        lda #<(addr-1)
        pha
        lda #^addr
        jmp BankSwitch8k_8000
.endmacro


.segment "3c"

.reloc
LoadPalettesForLocation_3c:
        FAR_JUMP_LO LoadPalettesForLocation

.reloc
GenerateRandomNumber_3c:
        FAR_JUMP_LO GenerateRandomNumber

.reloc
MoveObjectWithSpeedAndDirection_3c:     
        FAR_JUMP_LO MoveObjectWithSpeedAndDirection

.ifdef _ENEMY_HP
.reloc                          ; TODO - move the whole thing to 3c
        ;; TODO - have the linker or assembler detect a page mismatch?
UpdateEnemyHP_3c:     
        FAR_JUMP_LO UpdateEnemyHP
.endif


.pushseg "fe"
.org $cb79                      ; smudge from $3cb79
        ;; Replace the 16k bank swap to 0d (i.e. 1a/1b) with a single
        ;; 8k swap to 3c (the second swap to 1b will happen later).
        ;; This precedes the call to CheckAllObjectCollisions so that
        ;; we can call into segmentd 3c.
        <@3d354@>
        <@3d35e BankSwitch8k_8000@>
        <@3d361 CheckAllObjectCollisions@> ; TODO - delete me?
.popseg

.reloc
OVERRIDE
CheckAllObjectCollisions:
        ;; Start by ensuring page 1b is loaded into the second bank
        ;; (this was done automatically in MainGameModeJump_08_Normal
        ;; in the fixed bank, but now the pages aren't contiguous, so
        ;; we can't do it with a single call).
        lda #$1b                ; smudge off
        jsr BankSwitch8k_a000
        <@34f6e@>                ; smudge from $34f6e to $34fbb
        <@34f70@>
        <@34f73@>
        ;; Even frames: $2f = 7, $2e = 8
        <@34f76@>
        <@34f78@>
        <@34f7a GlobalCounter@>
        <@34f7c@>
        <@34f7d +@>
         ;; Odd frames: $2f = #$e, $2e = 7
          <@34f7f@>
          <@34f81@>
+       <@34f83@>
        <@34f85@>
-         <@34f87@>
          <@34f89@>
          <@34f8a@>
          <@34f8b@>
          <@34f8c CollisionTable@>
          <@34f8f@>
          <@34f90 CollisionTable+1@>
          <@34f93@>
          <@34f95 CollisionTable+2@>
          <@34f98@>
          <@34f9a CollisionTable+3@>
          <@34f9d@>
          <@34f9e OP_JMP_ABS@>
          <@34fa0@>
          <@34fa2 CollisionJump@>
          <@34fa5@>
          <@34fa7 CollisionJump+1@>
          <@34faa@>
          <@34fac CheckHitbox@> ; set carry if hit
          <@34faf +@>
            <@34fb1@>
+         <@34fb4@>
          <@34fb6@>
        <@34fb8 -@>
        <@34fba@>

.reloc   ; smudge from $356f1
;;; These are hitbox check conditions.  Quads represent a range of
;;; checks between object A (first element) and a range of objects
;;; B (From second element to third element, which is always spawn
;;; slots $c through $1f).  The final element is an index into the
;;; jump table for which collision routine to call when the hitboxes
;;; overlap.  This is used by CheckAllObjectCollisions.
OVERRIDE
CollisionTable: 
        .byte [@356f1@],[@356f2@],[@356f3@],[@356f4@] ; 00 sword blast hits enemy
        .byte [@356f5@],[@356f6@],[@356f7@],[@356f8@] ; 01 " "
        .byte [@356f9@],[@356fa@],[@356fb@],[@356fc@] ; 02 " "
        .byte [@356fd@],[@356fe@],[@356ff@],[@35700@] ; 03 " "
        .byte [@35701@],[@35702@],[@35703@],[@35704@] ; 04 " "
        .byte [@35705@],[@35706@],[@35707@],[@35708@] ; 05 paralysis beam hits npc/enemy
        .byte [@35709@],[@3570a@],[@3570b@],[@3570c@] ; 06 enemy hits player
        .byte [@3570d@],[@3570e@],[@3570f@],[@35710@] ; 07 front of player hits npc/trigger
        .byte [@35711@],[@35712@],[@35713@],[@35714@] ; 08 sword blast hits enemy
        .byte [@35715@],[@35716@],[@35717@],[@35718@] ; 09 " "
        .byte [@35719@],[@3571a@],[@3571b@],[@3571c@] ; 0a " "
        .byte [@3571d@],[@3571e@],[@3571f@],[@35720@] ; 0b paralysis beam hits npc/enemy
        .byte [@35721@],[@35722@],[@35723@],[@35724@] ; 0c sword hits enemy
        .byte [@35725@],[@35726@],[@35727@],[@35728@] ; 0d enemy hits player
        .byte [@35729@],[@3572a@],[@3572b@],[@3572c@] ; 0e front of player hits npc/trigger

.reloc                          ; NOTE: smudge irrelevant because no numbers
OVERRIDE
CollisionJump:
        .word (CollisionJump_00_SwordHitsEnemy)
        .word (CollisionJump_01_EnemyHitsPlayer)
        .word (CollisionJump_02_PlayerInFrontOfNpcOrTrigger)
        .word (CollisionJump_03_ParalysisBeam)

;;; TODO - move this to attack.s, maybe?  Or maybe paralysis.s?

.reloc                          ; smudge from $34fc4
OVERRIDE
CollisionJump_03_ParalysisBeam:
        <@34fc4@>
        <@34fc7@>
        <@34fc9 ++@>
          ;; Target was immune
          <@3507c@>           ; smudge from $3507c (inlined)
          <@3507f@>
          <@3506f +@>                 ; smudge from $3506c (inlined)
            <@35071@>
            <@35073@>
            <@35076 SFX_ATTACK_IMMUNE@>
            <@35078 StartAudioTrack@>
            ;; ----
+         <@3507b@>
          ;; ----
        ;; Paralyze an NPC
++      <@3507c@>             ; smudge from $3507c (inlined)
        <@3507f@>
          beq :<rts             ; smudge from $34fd1 to $35045
        <@34fd3@>
        <@34fd6@>
          beq :<rts
        <@34fda@>
        <@34fdc@>
        <@34fdf@>
        <@34fe2@>
          bne :<rts
        <@34fe6@>
        <@34fe9@> ; NPC ID
        <@34feb@>
        <@34fed@> ; set paralysis flag
        <@34fef@>
        <@34ff1@>
        <@34ff4@>
        <@34ff6@>
        <@34ff9@>
          bne :<rts
        ;; Check immunity to paralysis
        <@34ffd (ParalysisImmuneNpcListEnd - ParalysisImmuneNpcList - 1)@> ; #$13
-         <@34fff ParalysisImmuneNpcList@>
          <@35002@>
          <@35004 +@>
            <@35006@>
            <@35008@>
            <@3500a@>
            <@3500d@>
            ;; ----
+         <@3500e@>
        <@3500f -@>
OVERRIDE
SetOrClearParalysisFlag:
        ;; Input: $12 = FF to set, 00 to clear
        ;;        $13 = NPC ID to handle
        <@35011 (ParalysisFlagTableValues - ParalysisFlagTableKeys)@>
-         <@350f9@>
          bmi :<rts             ; end of list: return
          <@350fa ParalysisFlagTableKeys@>
          <@35677@>
        <@357ce -@>
        ;; NPC was entry Y in the 35045 table
        ;;   -> set (or clear) the parallel flag in 3504f.
        <@357e0 ParalysisFlagTableValues@>
        <@35cb1@>
          <@35d19@>
          <@35d3f@>
          <@35e2e PowersOfTwo@>
          <@361e6@>
          <@3656f@>
          <@366fe PowersOfTwo@>
          <@3e728@>
          <@3e764@>
        <@3e7ab@>
        <@3ea43@>
        <@3eb0b@>
        <@3eb0c@>
        <@3ebb1@>
        <@3503a@>
        <@3503d@>
        <@3503f@>
        <@35041@>
        <@35044@>

;;; Looks like the first 19 bytes is a paralysis flag table
;;; But most of these are never read - it could be compressed down to
;;; just two entries: 6d => 70 and 6e => 71.
.reloc                     ; smudge from $35045
OVERRIDE
ParalysisFlagTableKeys:
        ;; This is the key to a map => person ID of paralysis target
        .byte [@35045@],[@35046@],[@35047@],[@35048@],[@35049@],[@3504a@],[@3504b@],[@3504c@],[@3504d@]

OVERRIDE   
ParalysisFlagTableValues: ; smudge from $3504f
        ;; This next line (9 bytes) appears to reference flags?
        .byte [@3504f@],[@35050@],[@35051@],[@35052@],[@35053@],[@35054@],[@35055@],[@35056@],[@35057@]

.reloc                     ; smudge from $35058
OVERRIDE
ParalysisImmuneNpcList:
        ;; 20 NPC IDs that are immune to paralysis
        .byte [@35058@],[@35059@] ; kensu
        .byte [@3505a@],[@3505b@] ; asina in various forms
        .byte [@3505c@]     ; unused
        .byte [@3505d@],[@3505e@] ; azteca
        .byte [@3505f@],[@35060@] ; shyron guards
        .byte [@35061@],[@35062@] ; dolphin
        .byte [@35063@],[@35064@],[@35065@] ; dead shyron people
        .byte [@35066@],[@35067@],[@35068@] ; kensu in various places
        .byte [@35069@]     ; mesia
        .byte [@3506a@],[@3506b@] ; aryllis attendants
ParalysisImmuneNpcListEnd:

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
        jmp UpdateEnemyHP_3c
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
        <@3522c SWORD_THUNDER@>
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

;;; TODO - move this to defend.s?

;;; --------------------------------
;;; TODO - how does this only add status sometimes?
;;; TODO - is this just poison?
.reloc ; smudge from $3527e to $352bf
OVERRIDE
PlayerHit_ApplyStatus:
        ;; Note: this routine is only for a body hit, not a projectile.
        ;; It will only apply poison status.
        <@3527e ObjectTerrain@>
        <@35281@>
          bne :>rts
        <@35285 EquippedArmor@>
        <@35288 ARMOR_BATTLE@>
          beq :>rts
        <@3528c ObjectLevel@> ; poison stored in sign bit of lvl
          bpl :>rts
        <@35291@>
        <@35293 GenerateRandomNumber_3c@>
        <@35296@>
        <@35298@>
          bcs :>rts ; 50% chance of doing nothing
        ;; add poison status   
        <@3529c PlayerStatus@>
        <@3529f@>
        <@352a1@>
        <@352a3 PlayerStatus@>
        <@352a6 GAME_MODE_STATUS_MSG@>
        <@352a8 GameMode@>
        <@352aa@>
        <@352ac@>
        <@352af@>
        <@352b1@>
        <@352b4 SetTemporaryInvincibility@>
        <@352b7 SFX_POISON@>
        <@352b9 StartAudioTrack@>
        <@352bc@>
        <@352be@>

;;; --------------------------------
;;; Projectiles have 540,y set to $ff to indicate that shield def is used.
;;; This also triggers this path to apply status effects.
.reloc                          ; smudge from $352bf to $35357
OVERRIDE
PlayerHit_ApplyProjectileStatus:
        <@352bf@>
        <@352c2 PlayerHit_CheckParalysis@>
         <@352c4 PlayerHit_CalculateDamage@>
         ;; ----
OVERRIDE
PlayerHit_CheckParalysis:
        <@352c7 STATUS_PARALYZED@>
         <@352c9 PlayerHit_CheckStone@>
        ;; Projectile causes paralysis (prevented by certain shields),
        ;; but no damage, so don't return back to damage calculation.
        <@352cb EquippedShield@>
    .ifdef _UPDATE_SHIELD_EFFECTS ; smudge off
        cmp #SHIELD_CERAMIC
    .else                         ; smudge on
        <@352ce SHIELD_SACRED@>
    .endif
          <@352d0 RemoveObjectY@> ; and return
        <@352d2 SHIELD_PSYCHO@>
          <@352d4 RemoveObjectY@> ; and return
        <@352d6 SFX_PARALYZED@>
        <@352d8 StartAudioTrack@>
        <@352db GAME_MODE_STATUS_MSG@>
        <@352dd GameMode@>
        <@352df@>
        <@352e1@>
        <@352e4@>
        <@352e6@>
        <@352e9 PlayerStatus@>
        <@352ec@>
        <@352ee STATUS_PARALYZED@>
        <@352f0 PlayerStatus@>
        <@352f3 RemoveObjectY@> ; uncond, but irrelevant
        ;; ----
OVERRIDE
RemoveObjectY:
        <@352f5@>
        <@352f7 ObjectActionScript@>
        <@352fa@>
        ;; ----
OVERRIDE
PlayerHit_CheckStone:
        <@352fb STATUS_STONE@>
          <@352fd PlayerHit_CheckMPDrain@>
        ;; Projectile causes stone (prevented by certain shields),
        ;; but no damage, so don't return back to damage calculation.
        <@352ff PlayerStatus@>
        <@35302@>
        <@35304 STATUS_STONE@>
          <@35306 RemoveObjectY@> ; already stone
        <@35308 EquippedShield@>
        <@3530b SHIELD_MIRRORED@>
          <@3530d RemoveObjectY@>
        <@3530f SHIELD_PSYCHO@>
          <@35311 RemoveObjectY@>
        <@35313 GAME_MODE_STATUS_MSG@>
        <@35315 GameMode@>
        <@35317@>
        <@35319@>
        <@3531c@>
        <@3531e@>
        <@35321 SFX_STONED@>
        <@35323 StartAudioTrack@>
        <@35326@>
        <@35328@>
        <@3532b@>
        <@3532d@>
        <@35330 LoadPalettesForLocation_3c@>
        <@35333 PlayerStatus@>
        <@35336@>
        <@35338 STATUS_STONE@>
        <@3533a PlayerStatus@>
        <@3533d RemoveObjectY@> ; unconditional
        ;; ----
OVERRIDE
PlayerHit_CheckMPDrain:
        <@3533f@> ; for a projectile, indicates MP drain.
         <@35341 PlayerHit_Curse@>
        <@35343@>
        <@35345@> ; MP drain web
        <@35347@>
        ;; Replace the projectile with the MP drain web, keeping same position.
        <@35349 LoadOneObjectData@>
        ;; ----
OVERRIDE
PlayerHit_Curse:
        ;; If it wasn't one of the above, then it's a curse beam.
    .ifdef _UPDATE_SHIELD_EFFECTS ; smudge off
        lda $0714 ; equipped shield
        cmp #SHIELD_SACRED
          beq :<rts
    .else                         ; smudge on
        <@3534c RemoveObjectY@>         ; TODO - consider removing for sacred shield, too?
    .endif
        <@3534f STATUS_CURSED@>
        <@35351 PlayerStatus@>
        <@35354 UpdateEquipmentAndStatus@>


;;; --------------------------------
.reloc                          ; smudge from $35357 to $35431
OVERRIDE
CollisionJump_01_EnemyHitsPlayer:
        <@35357@>
        <@3535a@>
        <@3535c PlayerHit_CalculateDamage@>
        ;; 540,y == $ff -> do something else
         <@3535e PlayerHit_ApplyProjectileStatus@>
         ;; ----
OVERRIDE
PlayerHit_CalculateDamage:
        <@35361 PlayerHit_ApplyStatus@>
        <@35364@>
        <@35367@> ; Stom
         <@35369 ++@> ; $35388
        ;; This is the Stom fight.  $661 tracks how many times the player's been hit.
        ;; Presumably once it gets really low, Stom basically just stops attacking,
        ;; but I can't find where this happens.
        <@3536b@>
        <@3536e@>
        <@35371@>
        <@35373 +@> ; $35383
         <@35375@>
         <@35377@>
         <@35378@>
         <@3537a@>
         <@3537c@>
         <@3537e@>
         <@3537f@>
         <@35381@>
+       <@35383 SFX_PLAYER_HIT@>
        <@35385 StartAudioTrack@>
        ;; ----
++      <@35388@>
        <@3538b@>
        <@3538d@>
         beq :>>rts ; $353fd
        <@35391@>
         beq :>>rts ; $353fd
        <@35395@>
        <@35397 +@> ; $3539c
         <@35399 PlayerHitCoin_GetMoney@>
         ;; ----
+       <@3539c@>
         <@3539e PlayerHit_ApplyKnockback_Relay@>
        <@353a0@>
         <@353a2 PlayerHit_ApplyKnockback_Relay@>
        ;; Done with special cases?
        <@353a4@>
        <@353a7@>
        <@353a9 +@> ; $353ac
         <@353ab@>
         ;; ----
+       <@353ac@>
        <@353ae@>
        <@353b0 KnockbackObject@>
        <@353b3 CurrentLocation@>
        <@353b5 LOC_SWAMP@>
        <@353b7 +@> ; $353c6
         <@353b9@>
         <@353bc +@> ; $353c6
          <@353be ObjectDirection@> ; note: X=1
          <@353c1@>
          <@353c3 ObjectDirection@>
+       <@353c6 ObjectDirection@>
        <@353c9 ObjectDirection@>
        <@353cc ObjectKnockback@>
        <@353cf ObjectKnockback@>
        <@353d2@>
        <@353d4@>
        <@353d7 ObjectDefense@> ; $401 is armor def
        <@353da@>
        <@353dc ObjectDamageType@>
    .ifdef _RESCALE_DAMAGE      ; smudge off
        ;; NOTE: we want to allow other negative numbers to indicate
        ;; projectile damage, but only $ff exa ctly will cause a despawn.
        ;; This allows marking flails as $fe to continue to do projectile
        ;; damage but not despawn on a hit.  TODO - where is the despawn???
        bpl +
    .else                       ; smudge on
        <@353df@> ; projectile -> shield
        <@353e1 +@> ; $353e8
    .endif
         <@353e3 ObjectDefense@> ; $400 is shield def
         <@353e6@>
+       <@353e8@>
        <@353ea@> ; twos complement
        <@353ec@>
        <@353ed@>
        <@353ef@>
        <@353f0 ObjectAttack@>
         <@353f3 PlayerHit_SubtractDamage@>
        <@353f5 SFX_ATTACK_IMMUNE@>
        <@353f7 StartAudioTrack@>
        <@353fa ++@> ; $35422
        ;; ----
        <@353fd@>
        ;; ----
OVERRIDE
PlayerHit_ApplyKnockback_Relay:
        <@353fe PlayerHit_ApplyKnockback@>
        ;; ----
OVERRIDE
PlayerHit_SubtractDamage:
        ;; Input:
        ;;   A = damage to subtract
        ;;   X = 1 (player HP)
        ;; Note: this checks the player's level against 17. It's not
        ;; clear when this should ever happen, except as some sort of
        ;; cheat mode where damage is not dealt.
        <@35401@>
        <@35403 PlayerLevel@>
        <@35406@>
        <@35408 ++@> ; $35422
         <@3540a ObjectHP@>
         <@3540d@>
         <@3540e@>
         <@35410 ObjectHP@>
         <@35413 +@> ; $3541a
        ;; Subtraction crossed zero - player is dead
          <@35415@>
          <@35417 ObjectHP@>
+        <@3541a SFX_PLAYER_HIT@>
         <@3541c StartAudioTrack@>
         <@3541f SetTemporaryInvincibility@>
++      <@35422 ObjectDamageType@>
        <@35425@>
        <@35427 +@> ; $3542e
        ;; projectiles despawn after dealing damage.
         <@35429@>
         <@3542b ObjectActionScript@>
+       <@3542e UpdateHPDisplay@> ;Internal

;;; --------------------------------
.reloc                          ; smudge from $35431 to 3543f
OVERRIDE
SetTemporaryInvincibility:
        <@35431@>
        <@35433@>
        <@35436@>
        <@35439@>
        <@3543b@>
        <@3543e@>

;;; --------------------------------
.reloc                          ; smudge from $3543f to $3546d
OVERRIDE
PlayerHit_ApplyKnockback:
        ;; Knock object x back at speed 2 (.75/step?) in y's direction
        <@3543f@>
         bne :>rts ; $3546c
        <@35444@>
        <@35447@>
         bne :>rts ; $3546c
        <@3544c@>
        <@3544e@>
        <@35451@>
         <@35452@>
         <@35455@>
          <@35456@>
          <@35458@>
          <@3545b@>
          <@3545e@>
          <@35461 MoveObjectWithSpeedAndDirection@>
         <@35464@>
         <@35465@>
        <@35468@>
        <@35469@>
        <@3546c@>

;;; --------------------------------
.reloc                          ; smudge from $3546d to $354a2
OVERRIDE
PlayerHitCoin_GetMoney:
        <@3546d@>
        <@35470@>
        <@35471@>
        <@35472@>
        <@35473@>
        <@35474@>
        <@35475@>
        <@35476 CoinAmounts@>
        <@35479@>
        <@3547a PlayerMoney@>
        <@3547d PlayerMoney@>
        <@35480 CoinAmounts+1@>
        <@35483 PlayerMoney+1@>
        <@35486 PlayerMoney+1@>
        <@35489 +@>
         <@3548b@>
         <@3548d PlayerMoney@>
         <@35490 PlayerMoney+1@>
+       <@35493@>
        <@35495@>
        <@35498 SFX_GET_COIN@>
        <@3549a StartAudioTrack@>
        <@3549d@> ; Money
        <@3549f DisplayNumber@> ;Internal

;;; --------------------------------
.reloc                          ; smudge from $354a2 to $354b0
OVERRIDE
PlayerHitTrigger_SetGameMode:
        <@354a2@>
        <@354a4@>
         bne :>rts
        <@354a8@>
        <@354ab GAME_MODE_TRIGGER_TILE@>
        <@354ad GameMode@>
        <@354af@>

;;; --------------------------------
;;; Note: attach to above for beq to work
OVERRIDE
CollisionJump_02_PlayerInFrontOfNpcOrTrigger: ; smudge from $354b0 to $35535
        <@354b0@>
        <@354b3@>
        <@354b6@>
        <@354b8@>
        <@354ba +@> ; $354cb
         <@354bc@>
         <@354be +@> ; $354cb
          <@354c0@>
          <@354c1@>
          <@354c2@>
          <@354c5@>
          <@354c6@>
          <@354c8 ++@> ; $354ce
           <@354ca@>
           ;; ----
+       <@354d7 PlayerHitTrigger_SetGameMode@> ; unconditional
        ;; ----
++      <@35da5@>
         bmi :<rts ; $35534
        <@35f19@>
        <@36ce5@>
        <@36ce7 +@> ; $354df
        ;; Statue
         <@36d0e HandleStatueCollision@>
         <@36d5d ++@> ; $35508
         ;; ----
+       <@3ef6a@>
        bne :<rts ; $35534
        <@354e4@>
        <@354e7 +@> ; $354ee
         <@354e9@>
         beq :<rts ; $35534
+       <@354ee@>
        <@354f1@>
         <@354f2@>
         <@354f4@>
         <@354f7@>
         <@354f9@>
         <@354fb@>
         <@354fd@>
         <@354ff CheckHitbox@>
        <@35502@>
        <@35503@>
        bcs :>rts ; $35534
++      <@35508@>
        <@3550a@>
        <@3550d@>
        <@35510 GAME_MODE_DIALOG@>
        <@35512 GameMode@>
        <@35514@>
        bne :>rts ; $35534
        <@35519@>
        <@3551c@>
        beq :>rts ; $35534
        <@35520@>
        <@35523@>
        <@35524@>
        <@35526@>
        <@35528@>
        <@3552a@>
        <@3552d@>
        <@3552f@>
        <@35531@>
        <@35534@>
;;; --------------------------------
.reloc                          ; smudge from $35535 to $355b7
HandleStatueCollision:
        <@35535@>
        <@35537@>
@loop:
         <@35539@>
         <@3553c@>
          <@3553d@>
          <@3553f@>
          <@35542@>
          <@35543@>
           <@35544@>
           <@35545@>
           <@35547@>
           <@35548@>
           <@35549@>
           <@3554b@>
           <@3554d CheckHitbox@>
          <@35550@>
          <@35551@>
         <@35552@>
         <@35553@>
         <@35556 +@> ; $35568
          <@35558@>
          <@3555a@>
          <@3555d@>
          beq :>rts
          <@35562@>
          <@35564@>
          <@35567@>
          ;; ----
        ;; Move the player back in response to touching a statue.
+        <@35568@>
         <@3556b@>
         <@3556d +@> ; $35585
         <@3556f@>
         <@35572@>
         <@35574 +@> ; $35585
         <@35576@>
         <@35579@>
         <@3557b +@> ; $35585
         <@3557d@>
         <@35580@>
         <@35582@>
+        <@35585@>
         <@35586@>
          <@35587@>
-         <@35589 ObjectKnockback@>
          <@3558c@>
           <@3558d ObjectDirection@>
           <@35590@>
    .ifdef _DISABLE_STATUE_GLITCH ; smudge off
            lda #$04              ; just always push down
    .else                         ; smudge on
            <@35591@>
            <@35594@>
            <@35596@>
            <@35597@>
            <@35598@>
            <@3559a@>            ; TODO - can we disable statue glitch by making this #7?
    .endif
            <@3559c ObjectDirection@>
            <@3559f MoveObjectWithSpeedAndDirection_3c@>
           <@355a2@>
           <@355a3 ObjectDirection@>
          <@355a6@>
          <@355a7 ObjectKnockback@>
          <@355aa@>
          <@355ab -@> ; $35589
          <@355ad DrawAllObjectSprites@>
         <@355b0@>
         <@355b1@>
         <@355b2@>
        <@355b4 @loop@> ; $35539
        <@355b6@>

;;; --------------------------------
;;; Knocks back the object indexed $11 in the direction of object indexed $10?
;;; Not entirely sure about this - since it looks like direction,x is not used?
;;; (It's converted to an 8-dir and then stored shifted into the upper nibble).
;;; The use of $10/$11 as inputs is just because knocking back the player requires
;;; flipping x and y.  We could simplify a bit by using carry to indicate a flip:
;;;     plp; jsr SwapXYIfCarry; ... ; php; jsr SwapXYIfCarry; rts
;;;     SwapXYIfCarry:
;;;       bcc :>rts; stx $10; tya; tax; ldy $10; rts
;;; This saves 4 bytes in KnockbackObject and 3*3 bytes at each callsite,
;;; and costs 9 for the swap routine, which may be usable elsewhere as well?
.reloc                          ; smuge from $355c0
OVERRIDE
KnockbackObject:
        <@355c0@>
        <@355c2@>
        <@355c4@>
        <@355c6@>
        <@355c8 ObjectKnockback@>
        <@355cb +@> ; $355d4
         <@355cd@>
         <@355cf@>
         <@355d1 ObjectKnockback@>
+       <@355d4 ObjectKnockback@>
        <@355d7@>
        <@355d9 ObjectDirection@>
        <@355dc +@> ; $355df
         <@355de@>
+       <@355df@>
        <@355e0@>
        <@355e1@>
        <@355e2@>
        <@355e3@>
        <@355e5 ObjectDirection@>
        <@355e8@>
        <@355ea@>
        <@355ec ObjectDirection@>
        <@355ef@>
        <@355f1@>
        <@355f3@>

;;; --------------------------------
.reloc                          ; smudge from $355f4
OVERRIDE
DoneCheckHitbox:
        <@355f4@>
        <@355f6@>
        <@355f7@>
;;; --------------------------------
;;; Check a range of objects for collisions with any other objects.
;;; Input:
;;;   $10,$11 - range of NPCs to check collision with.
;;;        called from three places
;;;         - from $3554d it looks like an NPC index for *some* dialog -> ?
;;;         - from $34fac it's always [$c,$1f], from the table below Hitboxes
;;;           this version is called many times per frame, with diff X
;;;         - from $354ff it's always [0,2] - also some dialog -> ?
;;; Output:
;;;   set carry if there's a hit
;;; Push x into $1b for temporary storage
;;; Then look at $380,x and $340,x, quit (clc) if negative
;;; Look at $3a0,x nibbles
;;;   - hi nibble zero => quit (clc), otherwise store $1f
;;;   - lo nibble => $15 (shifted << 2)
;;; Next $420,x:40 | $3a0,x:0f<<2 => hitbox shape
OVERRIDE
CheckHitbox:                    ; smudge from $355f8
        <@355f8@>
          <@355fa ObjectTerrain@>
          <@355fd DoneCheckHitbox@> ; off screen => no hit
          <@355ff ObjectKnockback@>
          <@35602 DoneCheckHitbox@> ; being knocked back => no hit
          <@35604 ObjectHitbox@>
          <@35607@>
          <@35609 DoneCheckHitbox@> ; no hit (not spawned? exploding walls have zero)
          <@3560b@>             ; collision plane
          <@3560d ObjectHitbox@>
          <@35610@>
          <@35612@>
          <@35613@>
          <@35614@>
          <@35616 ObjectLevel@>
          <@35619@>
          <@3561b@>
          <@3561d@>
          <@3561e@> ; sprite x-coordinate on screen
          <@35621@>
          <@35622 Hitboxes+2@>
          <@35625@>
          <@35627@>
          <@35628 Hitboxes+3@>
          <@3562b@>
          <@3562d@> ; sprite y-coordinate on screen
          <@35630@>
          <@35631 Hitboxes@>
          <@35634@>
          <@35636@>
          <@35637 Hitboxes+1@>
          <@3563a@>
          ;; For each object, check same conditions
          <@3563c@> ; lower bound of range to check
@NextObject:
            <@3563e@>
            <@3563f@> ; upper bound of range
              <@35641 DoneCheckHitbox@>
            <@35643@>
              <@35646 @NextObject@> ; $3563e
            <@35648@>
            <@3564b@> ; same collision plane?
              <@3564d @NextObject@> ; $3563e
            <@3564f@>
              <@35652 @NextObject@> ; $3563e
            <@35654@> ; don't check the object against itself
              <@35656 @NextObject@> ; $3563e
            ;; Both objs are eligible for collisions
            <@35658@>
            <@3565b@>
            <@3565d@>
            <@3565e@>
            <@3565f@>
            <@35661@>
            <@35664@>
            <@35666@>
            <@35668@>
            <@35669@>
            <@3566c@>
            <@3566d Hitboxes@>
            <@35670@>
              <@35672 @NextObject@>
            <@35674 Hitboxes+1@>
            <@35677@>
              <@35679 @NextObject@>
            <@3567b@>
            <@3567e@>
            <@3567f Hitboxes+2@>
            <@35682@>
              <@35684 @NextObject@>
            <@35686 Hitboxes+3@>
            <@35689@>
              <@3568b @NextObject@>
          ;; fall through out of loop
        <@3568d@>
        <@3568f@>
        <@35690@>

;;; --------------------------------
;;; Quads representing the different hitbox shapes.
;;; The hitbox of an object is stored as a 5-bit number,
;;; with the lower bits in the lower nibble of $3a0,x
;;; and the upper bit in the :40 bit of $420,x.
;;; The elements of the quad are (x0,w,y0,h) of the hitbox
;;; bounds relative to the object's screen position.
.reloc                          ; smudge from $35691
OVERRIDE
Hitboxes:
        .byte [@35691@],[@35692@],[@35693@],[@35694@] ; 00 player
        .byte [@35695@],[@35696@],[@35697@],[@35698@] ; 01
        .byte [@35699@],[@3569a@],[@3569b@],[@3569c@] ; 02
        .byte [@3569d@],[@3569e@],[@3569f@],[@356a0@] ; 03
        .byte [@356a1@],[@356a2@],[@356a3@],[@356a4@] ; 04
        .byte [@356a5@],[@356a6@],[@356a7@],[@356a8@] ; 05
        .byte [@356a9@],[@356aa@],[@356ab@],[@356ac@] ; 06 UNUSED
        .byte [@356ad@],[@356ae@],[@356af@],[@356b0@] ; 07 UNUSED
        .byte [@356b1@],[@356b2@],[@356b3@],[@356b4@] ; 08
        .byte [@356b5@],[@356b6@],[@356b7@],[@356b8@] ; 09
        .byte [@356b9@],[@356ba@],[@356bb@],[@356bc@] ; 0a trigger
        .byte [@356bd@],[@356be@],[@356bf@],[@356c0@] ; 0b
        .byte [@356c1@],[@356c2@],[@356c3@],[@356c4@] ; 0c sword
        .byte [@356c5@],[@356c6@],[@356c7@],[@356c8@] ; 0d
        .byte [@356c9@],[@356ca@],[@356cb@],[@356cc@] ; 0e
        .byte [@356cd@],[@356ce@],[@356cf@],[@356d0@] ; 0f
        .byte [@356d1@],[@356d2@],[@356d3@],[@356d4@] ; 10
        .byte [@356d5@],[@356d6@],[@356d7@],[@356d8@] ; 11
        .byte [@356d9@],[@356da@],[@356db@],[@356dc@] ; 12
        .byte [@356dd@],[@356de@],[@356df@],[@356e0@] ; 13
        .byte [@356e1@],[@356e2@],[@356e3@],[@356e4@] ; 14
        .byte [@356e5@],[@356e6@],[@356e7@],[@356e8@] ; 15 UNUSED?
        .byte [@356e9@],[@356ea@],[@356eb@],[@356ec@] ; 16
        .byte [@356ed@],[@356ee@],[@356ef@],[@356f0@] ; 17
