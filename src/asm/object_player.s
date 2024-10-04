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
        <@35df5 PlayerSwordCooldown@>
        <@35df8@>
        <@35dfa +@>
         <@35dfc@>
         <@35dfe +@>

        ;; player is walking...?
    .ifdef _RABBIT_BOOTS_CHARGE_WHILE_WALKING

        ;; In charge shot only mode, we want to have the charge while walking enabled
        ;; even without rabbit boots

        ;; TODO - pull this into a separate independent flag

      .ifndef _CHARGE_SHOT_ONLY
          <@35e03 EquippedPassiveItem@>
          <@35e19 ITEM_RABBIT_BOOTS@> ; require rabbit boots
          <@35e1b @skipSwordCharge@>
      .endif

          <@35ea3 PlayerSwordChargeAmount@>
          <@364b4@> ; don't charge past level 2
          <@364b6 @skipSwordCharge@>

    .else
          <@35e00 @skipSwordCharge@>
    .endif
          ;; ----
          ;; $0600,x was < #$c or == #$11 - will reset to #$12
+       <@35e03 EquippedSword@>
        <@35e06 @skipSwordCharge@>
        <@35e08@>
        <@35e0a PlayerSwordCooldown@>

    ;; TODO: change this to a separate flag for the charge-while-walking speed

    ;; If we only have charge shot, buff rabbit boots to charge twice as fast
    ;; while equipped
    .ifdef _CHARGE_SHOT_ONLY
        ;; Timer of 30 frames

        <@35e0d EquippedPassiveItem@>
        <@35e19 ITEM_RABBIT_BOOTS@>
        <@35e1b +@>
          <@35e26 1@>
          .byte [@35e85@] ; abs BIT instruction to skip the other load
          ;; NOTE: it's safe to BIT here as it turns into BIT $03a9
          ;; which doesn't have side effects on read
+       <@35e8a 3@>
        <@35ec8 GlobalCounter@>

    .else
        <@35e0d GlobalCounter@>
        <@35e0f@>
    .endif

        <@35e11 @skipSwordCharge@>
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
