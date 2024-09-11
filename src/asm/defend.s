;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to the player defense routines (i.e. taking hits).  Includes
;;;  1. Change shield abilities
;;;  2. Prevent flails from despawning

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

;;; Change sacred shield to block curse instead of paralysis
.org $92ce
  cmp #$05 ; ceramic shield blocks paralysis

.org $934c
  jsr @CheckSacredShieldForCurse

.reloc
@CheckSacredShieldForCurse:
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
