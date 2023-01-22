;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Utility routines
;;;  1. 16-bit multiplication
;;;  2. Write coordinates and load an object (used by various triggers/dialogs)
;;;  3. Efficient way to (effectively) `jsr ($11)`

.segment "fe", "ff"

 
.reloc
Multiply16Bit:
  ;; Multiplies inputs in $61 and $62, then shifts
  ;; right A times.
  ;; Result goes $61$62 (lo hi), preserves XY
  ;; Sets carry if result doesn't fit in 8 bits
  txa
  pha
   lda #$00
   ldx #$08
   clc
-   bcc +
     clc
     adc $62
+   ror
    ror $61
    dex
   bpl -
   sta $62
   cmp #$01 ; set carry if A != 0
  pla
  tax
  rts

;.export Multiply16Bit

;;; a <- 0, x <- 8
;;; ror a -> ror $61
;;; if the bit we just rotated off $61 is set then add $62
;;; carry goes into upper of A

;;; TODO - use this in several more places (i.e. dialog action jump 10 ??)
.reloc
WriteCoordsAndLoadOneObject:
  jsr $9897 ; WriteObjectCoordinatesFrom_34_37
  jmp $ff80 ; LoadOneObjectData



;;; More efficient version of `jsr $0010`, just `jsr Jmp11`.  This can save
;;; 4 bytes by not writing #$4c to $10, but also opens up an extra byte of
;;; RAM we can use for other purposes.
.reloc
Jmp11:
  jmp ($0011)
