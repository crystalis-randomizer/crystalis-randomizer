;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Routines pertaining to flags.
;;;  1. Debugging aid to ensure we never accidentally set flag 0 (always off)
;;;  2. Routine for setting a particular (dynamic) flag more easily

.segment "fe", "ff"

.ifdef _CHECK_FLAG0
;;; Note: this is a debugging aid added to determine if anything
;;; is accidentally setting flag 0.  It should not make a difference, 
.org $cb62 ; main game mode jump 08
    jsr CheckFlag0              ; was jsr ReadControllersWithDirections

.reloc
CheckFlag0:
    lda $6480
    lsr
    bcc +
     asl
     sta $6480
     lda #$00
     sta $20
     sta $21
     ldx #$0c
-     lda $6140,x
      eor #$ff
      sta $6140,x
      dex
     bpl -
     jsr LoadAndShowDialog

.ifdef _CTRL1_SHORTCUTS
+  jmp ReadControllersWithButtonUp
.else
+  jmp ReadControllersWithDirections
.endif
.endif ; _CHECK_FLAG0


.reloc
SetFlagYA:
;;; 27 bytes - we can probably improve this?
  pha
   sty $24
   lsr $24
   ror
   lsr $24
   ror
   lsr
   sta $24
  pla
  and #$07
  tay
  lda PowersOfTwo,y
  ldy $24
  ora $6480,y
  sta $6480,y
  rts
