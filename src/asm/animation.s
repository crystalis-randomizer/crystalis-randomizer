;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to animation routines.  Includes
;;;  1. Revert from change before sword-raise animation

.segment "13" ;

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

.segment "13" ; we are banking $8000 so we can't put the relocated code there
.org $bc16
  jsr UpdateSwordPaletteOnSwordGet

.reloc
UpdateSwordPaletteOnSwordGet:
  ; a == #0 so just add the value of the new sword we just got +1 (still in most recent item slot)
  sta $06c0 ; do original patch then set the sword palette
  sec ; intentionally add 1 since sword palettes start from 1
  adc $07dc
  sta $07e5
  lda $6e
  pha
    lda #$1a
    jsr BankSwitch8k_8000
    jsr LoadPalettesForLocation ; 34000 loaded at 8000
  pla
  jmp BankSwitch8k_8000
  ; rts ; implicit

;;; In deterministic.ts we moved the recover animation to use a new bank
;;; so update MainGameModeJump_18_RecoverMagicAnimation to load the new CHR bank for
;;; the animation (its now in bank $53)
.segment "13"
.org $bb4e
  lda #$53
