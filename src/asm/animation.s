;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to animation routines.  Includes
;;;  1. Revert from change before sword-raise animation

.segment "13", "fe", "ff"   ; TODO - check 12

;;; Fix the graphics glitch from getting a sword while changed.
.org $bc04
  jsr MaybeRevertChangeOnSwordGet

.reloc
MaybeRevertChangeOnSwordGet:
  lda $0710
  and #$80
  beq +
   jsr $bb9d ; 27b9d MainGameModeJump_19_ChangeMagicRevertAnimation
+ jmp $c867  ; 3c867 ??
