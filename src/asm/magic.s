;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to magic routines
;;;  1. Consolidate the continuous magic table (36092)

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

;;; Free up some space in the magic table by consolidating the used magics.
.scope
  .org $a072
    .word (NoMagic)  ; UseMagicJump_00

  .reloc
  NoMagic:
    rts              ; NOTE: This is basically free - reloc will overlap it
.endscope

.reloc
OVERRIDE
ContinuousMagicTable:           ; smudge from $36092
    .byte [@36092@],[@36093@],[@36094@],[@36095@],[@36096@],[@36097@],[@36098@],[@36099@],[@3609a@],[@3609b@]
