;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Routines relating to random number generation.

;;; Store global attempted step counter in $32 as a semi-prng
.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000
.reloc
UpdateGlobalStepCounter:
  inc $32
  lda #$00
  sta $25
  rts
.org $98d7
  nop
  jsr UpdateGlobalStepCounter
.assert * = $98db
