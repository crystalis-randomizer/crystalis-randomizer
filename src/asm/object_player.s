;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Rewrites the ObjectAction scripts for the player objects.
;;; This includes the sword thrust, passive effects, etc.
;;; We keep this on the same page as vanilla, but mark it as
;;; .reloc and weave various patches into it.

.segment "1a"

FREE "1a" [$9d7e, $a01f)

.reloc                          ; smudge from $35d81
OVERRIDE
ObjectActionJump_02:
        <@35d81@>
        <@35d83 Ctrl1CurrentlyPressed@>
        <@35d85 Ctrl1NewlyPressed@>
        <@35d87 Ctrl1NewlyPressedAB@>
        <@35d89 Ctrl1CurrentDirection@>
        <@35d8b CurrentLocation@>
        <@35d8d LOC_TOWER_ENTRANCE@>
        <@35d8f +@> ; ObjectActionJump_03
          ;; If we're in the tower, force direction to down and set script to 3
          <@35d91@>
          <@35d93 ObjectActionScript@>
          <@35d96@>
          <@35d98 Ctrl1CurrentDirection@>
OVERRIDE
ObjectActionJump_03:
        ;; NOTE: This runs on X=0
+       <@35d9a PlayerStatus@>
          <@35d9d +@> ; skip if changed
        <@35d9f STATUS_MASK@>
        <@35da1 STATUS_CURSED@>
          <@35da3 +@> ; skip if cursed
        ;; Not changed, not cursed: set sword sprite direction ???
        <@35da5 Ctrl1CurrentDirection@>
        <@35da7 ObjectShootMetaspriteBase@> ; $06e0
        <@35daa@>
        ;; Check for "slow" terrain ($40)
        bit ObjectTerrain        ; smudge off (rewrite to save a byte)
          bvc ++
          ;; lda ObjectTerrain,x ; smudge on
          ;; asl
          ;; bpl ++
        ;; Terrain is slow: only draw the top half of the player sprite
        <@35dac PlayerJumpDisplacement@> ; $0620
          <@35db5 ++@>
        ;; Not jumping: replace Y with 4c instead of a7
+       <@35db7@>
++      <@35db9@>
        ;; At this point, A is 4c if we're changed, cursed, or not jumping in
        ;; thick terrain.  Otherwise (normal condition/terrain) it's a7.
        <@35dba ObjectMetasprite@>

        ;; Update jump displacement (if it's nonzero)
        <@35dbd PlayerJumpDisplacement@>
        <@35dc0 ++@>
          <@35dc2 PlayerJumpDisplacement@>
          <@35dc5 PlayerJumpDisplacement@>
          <@35dc8@>
          <@35dca +@>
            ;; At displacement 11, we're at the point of no return for landing,
            ;; so play the landing sound.
            <@35dcc SFX_LANDING@>
            <@35dce StartAudioTrack@>
+         <@35dd1 PlayerJumpDisplacement@>
          <@35dd4@>
          <@35dd6 ++@>
            ;; At displacements LESS THAN 1e, copy the direction (if any) into $640.
            <@35dd8 Ctrl1CurrentDirection@>
            <@35dda ++@>
              <@35ddc ObjectShooterShooting@>
            ;; bpl ++  ; useless instruction omitted

        ;; ??? Check for jumping/rabbit boots?
++      <@35de1 _36022@>

        ;; Check if we need to increase the sword charge level
        <@35de4 PlayerStatus@>
          <@35de7 @skipSwordCharge@>
        <@35de9 STATUS_MASK@>
        <@35deb STATUS_CURSED@>
          <@35ded @skipSwordCharge@>
        <@35def Ctrl1CurrentlyPressed@> ; check whether holding B
        <@35df1 BUTTON_B@>
          <@35df3 @skipSwordCharge@> ; not holding B
        ;; holding down B

        ;; We make a change from vanilla here to consolidate the various
        ;; moving/still paths, along with checking for rabbit boots.
        ;; But we can't reuse CheckItemAndMovement, unfortunately.
        lda EquippedPassiveItem             ; smudge off
        eor #item_chargeWhileWalking
        tay                     ; this is mostly copied from CheckItemAndMovement
        beq +                   ; but we use Y instead of X, and we do movement later
          ldy #2
+       <@35df5 PlayerSwordCooldown@>           ; smudge on
        <@35df8@>
        <@35dfa +@>
          <@35dfc@>
          <@35dfe +@>
            ;; Player is moving.  Increment y, or just skip charging entirely if
            ;; we're already at charge level 2.
            iny                             ; smudge off
            lda PlayerSwordChargeAmount
            cmp #$10
            bcs @skipSwordCharge

+       <@35e03 EquippedSword@>                   ; smudge on
        <@35e06 @skipSwordCharge@>
        <@35e08@>
        <@35e0a PlayerSwordCooldown@>

        lda GlobalCounter                   ; smudge off
        and SwordChargeSpeed,y
        cmp #1

        <@35e11 @skipSwordCharge@>                ; smudge on
          ;; Increase sword charge amount
          <@35e13 PlayerSwordChargeAmount@>
          <@35e16 PlayerSwordChargeAmount@>
          <@35e19@>
          <@35e1b +@>
            <@35e1d@>
            <@35e1f@>
+         <@35e22@>
          <@35e24 +@>
            ;; move up to the next level, play a sound
            <@35e26 SFX_SWORD_CHARGED@>
            <@35e28 StartAudioTrack@>
+         <@35e2b MaxChargeLevel@>
          <@35e2e ChargeLevelThresholds@>
          <@35e31 PlayerSwordChargeAmount@>
          <@35e34 @skipSwordCharge@>
            <@35e36 PlayerSwordChargeAmount@>
@skipSwordCharge:
        <@35e39 PlayerSwordCooldown@>
          <@35e3c +++@>
        <@35e3e@>
        <@35e40 +@>
          ;; PlayerSwordCooldown is exactly $12
          <@35e42 Ctrl1CurrentlyPressed@>
          <@35e44 +@>
            ;; B is not currently pressed
            <@35e46 Ctrl1CurrentDirection@>
              <@35e48 +++@>
            ;; Standing still (no direction)
            <@35e4a PlayerJumpDisplacement@>
            <@35e4d +@>
              ;; Jump displacement is nonzero: zero the metasprite
              <@35e4f@>
              <@35e51 PlayerMetaspriteBase@>
              ;; jmp ++               ; smudge off
              beq ++   ; uncond
              ;; ----                 ; smudge on
+       <@35e57 PlayerAnimationCounter@>
        <@35e5a@>
        <@35e5c PlayerMetaspriteBase@>
        <@35e5f PlayerSwordCooldown@>

        ;; Initialize player's terrain susceptibility, handle (attempted) movement
++      <@35e62 PlayerJumpDisplacement@>
        <@35e65 +@>
          <@35e67@>
          <@35e69 ObjectTerrainSusceptibility@>
          ;; jmp +                ; smudge off
          bne +  ; uncond
          ;; ----                 ; smudge on
+++     <@35e6f@>
        <@35e71 PlayerMetaspriteBase@>
        <@35e74 PlayerJumpDisplacement@>
        <@35e77 +@>
          <@35e79@>
          <@35e7b ObjectTerrainSusceptibility@>
          <@35e7e Ctrl1CurrentDirection@>
          <@35e80 +@>
            <@35e82 PlayerAnimationCounter@>
+       <@35e85 PlayerStatus@>
        <@35e88 +@>
          ;; riding dolphin
          <@35e8a@>
          <@35e8c ObjectTerrainSusceptibility@>
+       <@35e8f PlayerJumpDisplacement@>
        <@35e92 +@>
          <@35e94 ObjectShooterShooting@>
          <@35e97 Ctrl1CurrentDirection@>
          <@35e99 FallDisplacements@>
            <@35e9c ++@>
+       <@35e9e ObjectDirection@>
        <@35ea1@>
        <@35ea3 Ctrl1CurrentDirection@>
          ;; not moving -> bail out to next check
          <@35ea5 ++@>
        <@35ea7@>
        <@35eaa +@>
          ;; 680 is negative (applying friction at bottom of slope)
          ;; Freeze animation
          <@35eac@>
          <@35eae PlayerAnimationCounter@>
          ;; Ignore diagonal directions (maybe to prevent climbing?)
          <@35eb1 Ctrl1CurrentDirection@>
          <@35eb3 HorizontalDirectionProjectionTable@>
            <@35eb6 ++@>
          <@35eb8 Ctrl1CurrentDirection@>
        ;; Store the controller direction into the player direction
+       <@35eba Ctrl1CurrentDirection@>
        <@35ebc ObjectDirection@>
        ;; Decrement the step counter
        <@35ebf PlayerStepCounter@>
        ;; Try to move the player, attempting adjacent cardinals if diag blocked
        <@35ec2 MoveObjectWithSpeedAndDirection@>
        <@35ec5 +@>
          ;; Movement was successful (no collision) - update terrain and restore
          ;; the direction (in case we promoted a diagonal to an adjacent
          ;; cardinal and MoveObject changed our direction under us).
          <@35ec7@>               ; terrain under player
          <@35ec9 PlayerTerrain@>
          <@35ecc@>               ; original player direction
          <@35ece ObjectDirection@>
          <@35ed1@>
          <@35ed3@>
          <@35ed6 ++@> ; uncond
          ;; ----
        ;; Movement was blocked
+       <@35ed8@>
        <@35edb ++@>
          ;; Run for the first 8 frames walking into a wall
          ;; This seems to be related to the way you can single-frame tap a
          ;; diagonal while walking into a wall and you end up moving for
          ;; 8 frames worth of movement.
          <@35edd@>
          <@35ee0@>               ; Direction saved earlier in this routine
          <@35ee2 ObjectDirection@>
          <@35ee5 MoveObjectWithSpeedAndDirection@>
          <@35ee8 ++@>
            ;; movement successful...?
            <@35eea@>
            <@35eec PlayerTerrain@>

        ;; Movement completed.  Now update some stuff around charge, sprites, etc.
++      <@35eef GlobalCounter@>
        <@35ef1@>
        <@35ef3 +@>
         <@35ef5 ChargeIndicatorDisplay@>
         <@35ef8@>
+       <@35efa ReadObjectCoordinatesInto_34_37@>
        <@35efd@>
        <@35eff PlayerJumpDisplacement@>
        <@35f02 +@>
         <@35f04@> ; update $380,x only if $620,x is zero
+       <@35f06 CheckTerrainUnderObject@>
        <@35f09 PlayerJumpDisplacement@>
        <@35f0c@>
        <@35f0e +@>
         <@35f10@>
         <@35f13@>
         <@35f15@>
         <@35f17 +@>
          <@35f19 ObjectShootMetaspriteBase@>
          <@35f1c ObjectShooterShooting@>
          <@35f1f PlayerJumpDisplacement@>
          <@35f22 +@>
           <@35f24 PlayerJumpDisplacement@>
           <@35f27 PlayerMP@>
           <@35f2a +@>
            <@35f2c@>
            <@35f2e@>
            <@35f30 +@>
             <@35f32@>
             <@35f34 SpendMPOrDoubleReturn@>
+       <@35f37 PlayerJumpDisplacement@>
        <@35f3a +@>
          <@35f3c@>
          <@35f3e@>
          <@35f40@>
          <@35f42 ObjectTerrainSusceptibility@>
          <@35f45@>
          <@35f47@>
          <@35f49 ObjectTerrainSusceptibility@>
+       <@35f4c ObjectTerrainSusceptibility@>
        <@35f4f@>
        <@35f51 ObjectTerrain@>
        <@35f54 ObjectTerrain@>
        <@35f57@>
        <@35f59@>
          <@35f5b ++@>
        <@35f5d@>
        <@35f60@>
        <@35f62 +@>
          <@35f64@>
          <@35f67@>
          <@35f69 +@>
          <@35f6b@>
          <@35f6d@>
-           <@35f70@>
            <@35f72@>
            <@35f75@>
            <@35f77@>
            <@35f7a@>
            ;; ----
+         <@35f7b@>
          <@35f7d@>
          <@35f80@>
        <@35f83 -@>
        <@35f85 GlobalCounter@>
        <@35f87@>
        <@35f89 +@>
          <@35f8b@>
+       <@35f8e@>
        <@35f90@>
        <@35f93 ApplySlopeToPlayer@>
++      <@35f95@>
        <@35f97@>
        <@35f9a ApplySlopeToPlayer@>
        <@35f9d PlayerJumpDisplacement@>
        <@35fa0@>
        <@35fa2 +@>
        <@35fa4 PlayerJumpDisplacement@>
         bne :>rts
        <@35fa9 PlayerStatus@>
        <@35fac ++@>
        <@35fae@>
        <@35fb0@>
         bne :>rts
+       <@35fb4 Ctrl1CurrentDirection@>
        <@35fb6@>
        <@35fb8 ++@>
        <@35fba@>
        <@35fbc@>
        <@35fbf ++@>
        <@35fc1@>
++      <@35fc4@>
        <@35fc7@>
        <@35fc9@>
        bcs :>rts
         <@35fce@>
        <@35fd1@>
;;; --------------------------------
;;; NOTE: not .reloc because we BNE into here from above
OVERRIDE
ApplySlopeToPlayer:
        ;; Stash direction, speed, and timer, on the stack
        <@35fd2 ObjectDirection@>
        <@35fd5@>
        <@35fd6 ObjectSpeed@>
        <@35fd9@>
        <@35fda ObjectTimer@>
        <@35fdd@>
        ;; Move global timer onto player timer
        <@35fde GlobalCounter@>
        <@35fe0 ObjectTimer@>
        ;; Move 660 into player speed
        <@35fe3@>
        <@35fe6 ObjectSpeed@>
        ;; Move 680 into player direction
        <@35fe9@>
        <@35fec@>
        <@35fee ObjectDirection@>
        ;; Move player, checking adjacent cardinal directions
        ;; if 680 was a diagonal (it's not).
        <@35ff1 MoveObjectWithSpeedAndDirection@>
        ;; bcc +
        ;;   ;; Player collided with something: update the 680 direction
        ;;   lda ObjectDirection,x
        ;;   and #$07
        ;;   tay
        ;;   lda SlopeFallbackDirectionTable,y
        ;;   sta $0680,x
        ;; Restore direction, speed, and timer, from stack
+       <@36002@>
        <@36003 ObjectTimer@>
        <@36006@>
        <@36007 ObjectSpeed@>
        <@3600a@>
        <@3600b ObjectDirection@>
        <@3600c@>

;;; --------------------------------
.reloc
OVERRIDE
ChargeLevelThresholds:
        .byte [@36048@],[@36057@],[@360bb@]

.reloc
OVERRIDE
HorizontalDirectionProjectionTable:
        .byte [@361c5@],[@3629c@],[@362a2@],[@362ad@],[@36312@],[@3641c@],[@3648e@],[@364c8@]

;;; ----------------------------------------------------------------

.reloc                          ; smudge off
SwordChargeSpeed:
        .byte swordChargeSpeedWithItem_still
        .byte swordChargeSpeedWithItem_moving
        .byte swordChargeSpeed_still
        .byte swordChargeSpeed_moving

.ifdef _RABBIT_BOOTS_CHARGE_WHILE_WALKING
  item_chargeWhileWalking = ITEM_RABBIT_BOOTS
.else
  item_chargeWhileWalking = $fe ; never satisfied
.endif

swordChargeSpeed_still = 3
.ifdef _CHARGE_SHOT_ONLY
  swordChargeSpeed_moving = 3
  swordChargeSpeedWithItem_still = 1
  swordChargeSpeedWithItem_moving = 1
.else
  swordChargeSpeed_moving = 0
  swordChargeSpeedWithItem_still = swordChargeSpeed_still
  swordChargeSpeedWithItem_moving = swordChargeSpeed_still
.endif

.segment "1a", "fe", "ff"

;;; Set up X to index an effect speed table.  These tables contain
;;; four masks, which should have the N rightmost bits set, depending
;;; on how often something should occur:
;;;   0 - never
;;;   1 - every other frame (30/s)
;;;   3 - every four frames (15/s)
;;;   7 - every eight frames (8/s)
;;;  15 - every 16 frames (4/s)
;;;  31 - every 32 frames (2/s)
;;;  63 - every 64 frames (1/s)
;;; 128 - every 128 frames (2s)
;;; 255 - every 256 frames (4s)
;;; 
;;; Inputs:
;;;   A - 0 if item is equipped, nonzero otherwise
;;; Output:
;;;   X - 0 if item equipped and player not moving
;;;       1 if item equipped and player is moving
;;;       2 if item not equipped and player not moving
;;;       3 if item not equipped and player is moving
;;;
;;; Usage:
;;;   SpeedTable:
;;;     .byte mask_itemStill, mask_itemMoving, mask_still, mask_moving
;;;   ApplyItemEffect:
;;;     lda EquippedPassiveItem
;;;     eor #itemId
;;;     jsr CheckItemAndMovement
;;;     and SpeedTable,x
;;;     cmp #1
;;;     bne @skip
;;;   @applyEffect:
;;;     ...
;;;   @skip
CheckItemAndMovement:
        tax
        beq +
          ldx #2
+       lda Ctrl1CurrentDirection
        bmi +
          inx
+       lda GlobalCounter
        rts

.segment "fe","ff"     ; NOTE: could also move to "1a" with an early bank switch

;;; --------------------------------
FREE "ff" [$ef55, $f0a4)
.reloc                               ; smudge from $3ef55 to $3f0a4
OVERRIDE
CheckPassiveFrameEffects:
        lda #$1a ; 8000 -> 34000     ; smudge off
        jsr BankSwitch8k_8000
;;; First check for poison/swamp/pain damage.  This is a little
;;; complicated because the checks are all mixed together.
@CheckPoisonStatus:                  ; smudge on
        <@3ef55 GlobalCounter@>
        <@3ef57@>
        <@3ef58 @CheckPainTile@>
          ;; Check poison status every 128 frames
          <@3ef5a PlayerStatus@>
          <@3ef5d STATUS_MASK@>
          <@3ef5f STATUS_POISON@>
          <@3ef61 @InflictPainOrPoisonDamage@>
@CheckPainTile:  ; 3ef63
         <@3ef63 EquippedPassiveItem@>
         <@3ef66 item_preventPain@>

    .ifdef _HAZMAT_SUIT
              item_preventPain = ITEM_GAS_MASK ; TODO - set this in TS?
    .else
              item_preventPain = ITEM_LEATHER_BOOTS
    .endif

         <@3ef68 @CheckSwampDamage@>
          ;; Not wearing leather boots: check if on ground
          <@3ef6a PlayerJumpDisplacement@>
          <@3ef6d @CheckSwampDamage@>
           ;; On ground: check if standing on a pain square
           <@3ef6f@> ; ?? susceptibility ?? currrent terrain ??
           <@3ef72@>
           <@3ef75 @InflictPainOrPoisonDamage@>
@CheckSwampDamage:  ; 3ef77
         <@3ef77 CurrentLocation@>
         <@3ef79 LOC_SWAMP@>
          <@3ef7b @CheckParalysis@>
         <@3ef7d EquippedPassiveItem@>
         <@3ef80 item_preventSwamp@>
              item_preventSwamp = ITEM_GAS_MASK
          <@3ef82 @CheckParalysis@>
         ;; Inflict damage every 8 frames
         <@3ef84 GlobalCounter@>
         <@3ef86 swampDamageSpeedMask@>
              swampDamageSpeedMask = [@3ef87@] ; TODO - make this adjustable
          <@3ef88 @CheckParalysis@>
         <@3ef8a @InflictSwampDamage@>
         ;; ----
;;; NOTE: Pain and poison have different frequencies. We already checked
;;; the poison frequency above _before_ checking the status bit, but the
;;; pain tile check was independent of the timer, so we check that timer
;;; here instead.  This falls through to @InflictSwampDamage since they
;;; do basically the same thing, just at different speeds.
@InflictPainOrPoisonDamage:  ; 3ef8c
        <@3ef8c GlobalCounter@>
        <@3ef8e painDamageSpeedMask@>
             painDamageSpeedMask = [@3ef8f@] ; TODO - make this adjustable
        <@3ef90 @CheckParalysis@>
@InflictSwampDamage:  ; 3ef92
        ;; Every 32 frames, poison takes 4 HP
        <@3ef92 PlayerHP@>
        <@3ef95@>
        <@3ef96 painDamageAmount@>
             painDamageAmount = [@3ef97@]
        <@3ef98 +@>
         <@3ef9a@> ; don't wrap past zero
+       <@3ef9c PlayerHP@>
        ;; Update audio-visual for the poison damage
        <@3ef9f SFX_POISON@>
        <@3efa1 StartAudioTrack@>
        <@3efa4@>
-        <@3efa6@>
         <@3efa8@>
         <@3efab@>
        <@3efac -@>
        <@3efae WaitForOAMDMA@>
        ;; lda #$1a
        ;; jsr BankSwitch8k_8000        ; NOTE: mv to top and rm dupe below to save 5 bytes
        <@3efb3 UpdateHPDisplayInternal@>
        <@3efb6 LoadPalettesForLocation@>
@CheckParalysis:  ; 3efbc
        <@3efbc@>
        <@3efbe BankSwitch8k_8000@>
        <@3efc1 PlayerStatus@>
        <@3efc4 STATUS_MASK@>
        <@3efc6 STATUS_PARALYZED@>
          <@3efc8 @CheckStone@>
        <@3efca PlayerSwordChargeAmount@>
        <@3efcd@>                ; max charge while paralyzed (reset to zero after)
        <@3efcf @CheckStone@>
          <@3efd1@>
          <@3efd3 PlayerSwordChargeAmount@>
          <@3efd6 SFX_LANDING@>
          <@3efd8 StartAudioTrack@>
@CheckStone:  ; $3efdb
        <@3efdb PlayerStatus@>
        <@3efde STATUS_MASK@>
        <@3efe0 STATUS_STONE@>
          <@3efe2 @CheckDeosPendant@> ; Not stoned: skip these checks
        <@3efe4@> ; only nonzero if stoned?
        <@3efe7 @CheckStoneRecoverMagic@>
          ;; Clear stone status after timer runs down
          <@3efe9 PlayerStatus@>
          <@3efec@>
          <@3efee PlayerStatus@>
          <@3eff1@>
          <@3eff3@>
          <@3eff6 LoadPalettesForLocation@>
          <@3eff9 @CheckDeosPendant@>
        ;; ----
@CheckStoneRecoverMagic:  ; 3effc
        ;; This is a special case to allow casting recover when stoned.
        <@3effc EquippedMagic@>
        <@3efff MAGIC_RECOVER@>
          <@3f001 @CheckDeosPendant@>
        ;; If 'recover' is equipped ...
        <@3f003 Ctrl1NewlyPressed@>
        <@3f005 BUTTON_A@>
          <@3f007 @CheckDeosPendant@>
        ;; ... and button A was just pressed ...
        <@3f009 GameMode@>
        <@3f00b GAME_MODE_NORMAL@>
          <@3f00d @CheckDeosPendant@>
        ;;  ... and we're in normal game mode, then try to cast 'recover'
        ;; lda #$1a ; 8000 -> 34000
        ;; jsr BankSwitch8k_8000
        <@3f00f mpCost_recover@>      ; 24
        <@3f011 SpendMPOrDoubleReturn@>
        <@3f014 GAME_MODE_RECOVER_MAGIC@>
        <@3f01b GameMode@>
@CheckDeosPendant:  ; 3f01d
        ;; If wearing Deo's Pendant: +1 MP on 64th frame unless moving
        <@3f01d EquippedPassiveItem@>
        eor #item_recoverMp       ; smudge off
             item_recoverMp = ITEM_DEOS_PENDANT
        jsr CheckItemAndMovement
        and DeoSpeedTable,x
        cmp #1
        bne @CheckPsychoArmor
        ;; cmp #ITEM_DEOS_PENDANT  ; smudge on
        ;;   bne @CheckPsychoArmor
        ;; lda Ctrl1CurrentDirection ; $ff if still
        ;;   bpl @CheckPsychoArmor        ; NOTE: patched by inventory.s ($f026)
        ;; lda GlobalCounter
        ;; and #$3f
        ;;   bne @CheckPsychoArmor
        <@3f024 PlayerMP@>
        <@3f031 PlayerMaxMP@>
          <@3f034 @CheckPsychoArmor@>
        <@3f036 PlayerMP@>
        <@3f039@> ; MP
        <@3f03b DisplayNumberInternal@>
@CheckPsychoArmor:  ; 3f03e
        ;; If wearing Psycho Armor: +1 HP on 16th frame unless moving
        <@3f03e EquippedArmor@>
        eor #armor_recoverHp               ; smudge off
             armor_recoverHp = ARMOR_PSYCHO ; 8
        jsr CheckItemAndMovement
        and PsychoArmorSpeedTable,x
        cmp #1
        bne @CheckMesiaMessage
        ;; cmp #armor_recoverHp            ; smudge on
        ;;   bne @CheckMesiaMessage
        ;; lda Ctrl1CurrentDirection ; $ff if still
        ;;   bpl @CheckMesiaMessage
        <@3f045 PlayerMaxHP@>
        <@3f04c PlayerHP@>
          <@3f04f @CheckMesiaMessage@>
        ;; lda GlobalCounter
        ;; and #psychoArmorSpeedMask
        ;;      psychoArmorSpeedMask = $0f
        ;;   bne @CheckMesiaMessage
        <@3f057 PlayerHP@>
        ; lda #$03 ; ignored - stale from an earlier version?
        <@3f05c UpdateHPDisplayInternal@>
@CheckMesiaMessage:  ; 3f05f
        ;; If we're in Mesia's shrine, dec $4fe - why?!?
        ;; This is read at 382be 7 frames later...?
        ;; But this doesn't seem to matter - it's possible
        ;; Mesia somehow spawns in $1e, even though there's
        ;; no NpcData entry there.
        <@3f05f CurrentLocation@>
        <@3f061 LOC_MESIA_SHRINE@>
          <@3f063 @CheckPitTile@>
        <@3f065@>
@CheckPitTile:  ; 3f068
        ;; Check pits???
        <@3f068@>
          <@3f06b +@>
        <@3f06d@>
        <@3f070@>
          <@3f071 +@>
        <@3f073@>
        <@3f076 +@>
          ;; Fall down a pit: set $6f:60 bit.
          <@3f078 GAME_MODE_CHANGE_LOCATION@>
          <@3f07a GameMode@>
          <@3f07c@>
          <@3f07e@>
          <@3f080@>
          <@3f082@>
          <@3f084@>
          <@3f086@>
+:      

    .ifdef _WARRIOR_RING_TURRET
        <@3f3a0 PlayerStandingTimer@>
        <@3f3a1 ++@>
          <@3f435@>
          <@3f480 Ctrl1CurrentDirection@> ; $ff if still
          <@3f5fe +@>
            ;; player moved so reset timer
            <@3f7fe warriorRingTurretDelay@>
+         <@3f802 PlayerStandingTimer@>
++:
    .endif

        <@3e513@>
        <@3e587 +@>
         <@3f08e@>
         <@3f091@>
         <@3f094@>
         <@3f096@>
         bne :>rts
+       <@3f09b@>
        <@3f09e@>
        <@3f0a0@>
        <@3f0a3@>
;;; --------------------------------

    mpCost_recover = [@3f23d@]

.reloc
DeoSpeedTable:
        .byte deoSpeed_still,deoSpeed_moving,0,0
    .ifdef _BUFF_DEOS_PENDANT
              deoSpeed_still = [@3f314@]
              deoSpeed_moving = [@3f836@]
    .else
              deoSpeed_still = [@3f8e0@]
              deoSpeed_moving = [@3f8e5:d@]
    .endif

.reloc
PsychoArmorSpeedTable:
        .byte psychoArmorSpeed_still,psychoArmorSpeed_moving,0,0
              psychoArmorSpeed_still = [@3fa5e@]
              psychoArmorSpeed_moving = [@3fbf4:d@]
