;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to walls.  Includes
;;;  1. Crystalis has all elements
;;;  2. Invert wall susceptibility bits
;;;  3. Shooting walls are based on a spawn table bit

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

;;; Crystalis should have all elements, rather than none
;;; Since we now invert the handling for enemy immunity,
;;; this aligns enemies and walls nicely, Crystalis will
;;; also be able to break all walls now, too (if we get
;;; it working outside the tower, that is).
.org $9c6b
  .byte $0f

;;; Invert how walls work: their elemental defense byte stores
;;; a single bit, and the sword must have that bit as well: this
;;; makes Crystalis able to break all walls.
.org $9097
  eor #$0f
  and ObjectElementalDefense,x
  .byte $f0  ; change 'bne' to 'beq'.


.ifdef _CUSTOM_SHOOTING_WALLS
;;; This is in object jump 07, replacing the hardcoded location check
.org $a864
  lda $06c0,x
  eor #$ff
  and #$10  ; set Z if the 10 bit was _set_, meaning we should shoot.
  nop
.endif
