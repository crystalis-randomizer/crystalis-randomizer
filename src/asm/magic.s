;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to magic routines
;;;  1. Consolidate the continuous magic table (36092)

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

;;; Free up some space in the magic table by consolidating the used magics.
.scope
  .org $a092
  ContinuousMagicTable_Orig:

  .org $a032 ; refer to moved table
    lda ContinuousMagicTable,y

  .org $a072
    .word (NoMagic)  ; UseMagicJump_00

  .reloc
  NoMagic:
    rts

  .reloc
  ContinuousMagicTable:
    .move 10, ContinuousMagicTable_Orig
    ;.byte $08,$00,$08,$08,$08,$08,$00,$08,$00,$08
.endscope
