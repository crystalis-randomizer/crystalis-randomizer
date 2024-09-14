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


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

.segment "1a"

FREE "1a" [$97d7, $9824)

;;; --------------------------------
;;; Generates a pseudorandom number from 0..7 using a data table.
;;; Returns result in A, destroys Y.  Note that we've changed the
;;; algorithm to be a little more efficient _and_ to allow reading
;;; the most recent result directly from $0e even if A register
;;; was destroyed after calling this.  This allows calling from a
;;; different page and not needing to worry about restoring A.
;;; NOTE: this new algorithm requires the RandomNumbers table to
;;; have extra data in bits 3,4,5 so that the table is a single
;;; order-64 permutation, using the low bits as the actual numbers.
.reloc                          ; smudge from $357d7 to $357e4
OVERRIDE
GenerateRandomNumber:
        ldy $0e
        <@357e0 RandomNumbers@>
        <@357dd@>
        <@3595a@>
        <@3595d@>

.import RandomNumbers            ; 64 bytes
