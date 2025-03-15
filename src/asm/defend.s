;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to the player defense routines (i.e. taking hits).  Includes
;;;  1. Change shield abilities
;;;  2. Prevent flails from despawning
;;;  3. Moves defensive parts of collision handler from 1a to 3c

.segment "3c"

.reloc
LoadPalettesForLocation_3c:
        FAR_JUMP_LO LoadPalettesForLocation

.reloc
;;; NOTE: The FAR_JUMP_LO destroys A, so we need to re-read the
;;; random number from $7 (and mask out the upper bits).
GenerateRandomNumber_3c:
        jsr @jmp
        lda $0e
        and #$07
        rts
@jmp:
        FAR_JUMP_LO GenerateRandomNumber

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
        <@35298@>
        <@352bc@>                 ; NOTE: does not affect C register
          bcs :>rts ; 50% chance of doing nothing
        ;; add poison status   
        <@352cb PlayerStatus@>
        <@352ec@>
        <@3984d@>
        <@3990c PlayerStatus@>
        <@39a3a GAME_MODE_STATUS_MSG@>
        <@39a88 GameMode@>
        <@3f86b@>
        <@1e9a1@>
        <@1eb9f@>
        <@1ece8@>
        <@1ed05 SetTemporaryInvincibility@>
        <@1ed53 SFX_POISON@>
        <@1ed56 StartAudioTrack@>
        <@1ef1a@>
        <@1ef1f@>

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
          <@35461 MoveObjectWithSpeedAndDirection_3c@>
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
