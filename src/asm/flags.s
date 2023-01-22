;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Routines pertaining to flags.
;;;  1. Debugging aid to ensure we never accidentally set flag 0 (always off)
;;;  2. Routine for setting a particular (dynamic) flag more easily
;;;  3. Allow keeping oak child "in pocket" outside swamp (don't unset flag)
;;;  4. Fix the sprite pattern swap when shyron massacre flag is set

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


;;; Allow putting oak child in pocket (skip unsetting flag when outside swamp)
.org $e7c3
-:
.org $e7cc
  bne -


;;; Fix post-massacre Shyron sprites.  When we do sprite calculations,
;;; we don't really have any way to take into account the fact that
;;; post-massacre the game swaps $51 into pat1.  But pat0 is unused so
;;; if we make it $51 as well then we're good to go, even if we decide
;;; to flip the pattern slots.  Also, the changes to the color palettes
;;; are irrelevant, since it only changes pal3, which seems to be unused.
;;; So stop doing that so that peoples' colors don't change.
.org $e823
  lda $6c   ; check current location
  cmp #$8c  ; is it shyron?
  bne +     ; if not, then return
  lda $6484 ; check flag 027
  bpl +     ; if it's unset then return
  lda #$51
  sta $07f4
  sta $07f5
+ rts
  ;; and we save 14 bytes, to boot.
FREE_UNTIL $e845
