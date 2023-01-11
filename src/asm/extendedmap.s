;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Allows map data to be relocated to additional rom banks.

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

.ifdef _EXTRA_EXTENDED_SCREENS
;;; Normally the check for tile effects just looks at the
;;; current map screen and clamps the page switch to the
;;; first 8 pages, but if we're reading screen data from
;;; extended locations, this won't work.  We need to patch
;;; the tile effects reader to read from extended pages
;;; when the extended flag is set ($62ff)

;;; NOTE: We could save some space by just calling directly
;;; into PatchPrepareScreenMapRead, but possibly the original
;;; code used the quick version for a reason?  It looks like
;;; it's not generally called more than a handful of times
;;; per frame (12-14, maybe a few more with a lot of objects)
;;; and it only saves 3 cycles each (the jsr and rts also
;;; o few instructions).
.if 1

.org $9a58
  jsr PatchPrepareScreenMapRead
  bne $9a73
FREE_UNTIL $9a73

.else ; false

.org $9a58
  pha
   sta $11
   lda $62ff
   asl $11
   rol
   asl $11
   rol
   asl $11
   rol
   sta $6f
   jsr QuickSwapPageA
  pla
  and #$1f
  ora #$a0
  sta $11
.assert * = $9a73

;;; This is a faster version of page swap ($a000) that destroys Y
;;; (Remove "1b" because it would change the page out from under itself).
.pushseg "1a", "fe", "ff"
.reloc
QuickSwapPageA:
  sta $6f
  ldy #$07
  sty $50
  sty $8000
  sta $8001
  rts
.popseg

.endif ; 1

.endif ; _EXTRA_EXTENDED_SCREENS
