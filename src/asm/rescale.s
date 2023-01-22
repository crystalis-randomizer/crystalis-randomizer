;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to damage calculations (in both directions)
;;;  1. Handle different RAM layout
;;;  2. Enable tink mode (optionally)
;;;  3. Change shield abilities
;;;  4. Nerf flight to not hit ground enemies

;;; TODO - roll this into attack.s and defend.s

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


;;; Change sacred shield to block curse instead of paralysis
.org $92ce
  cmp #$05 ; ceramic shield blocks paralysis

.org $934c
  jsr CheckSacredShieldForCurse

.reloc
CheckSacredShieldForCurse:
  lda $0714 ; equipped shield
  cmp #$06  ; sacred shield
  bne +
   pla
   pla
+ rts

;;; Allow other negative numbers to indicate projectile damage.
;;; Only $ff exactly will cause it to despawn.  This allows marking
;;; flails as $fe so that they still do projectile damage, but won't
;;; disappear.
.org $93df
  nop
  nop
  bpl $93e8


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
