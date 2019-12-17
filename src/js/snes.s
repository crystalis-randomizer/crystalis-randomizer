;;; Rewrite a few things to work better.

.bank $3c000 $c000:$4000
.bank $24000 $8000:$2000
.bank $26000 $a000:$2000

;;; Rewrite the page boundary to avoid code crossing it.
.org $25fef
  ;; Need to fit this in 17 bytes
  sta $09     ; 85 09
  ldy #$03    ; a0 04
- sta $06f0,y ; 99 f0 06
  sta $0002,y ; 99 02 00
  dey         ; 88
  bpl -       ; 10 f7
  jmp $a005   ; 4c 05 a0
.assert < $26000

.bank $1e000 $a000:$2000
;;; Eliminate a jsr $0010
.org $1f83a
  lda ($18),y
  sta $11
  iny
  lda ($18),y
  sta $12
  ora $11
  beq ++
  bne +
  nop
  nop
+ jsr $fff3  ; jsr ($0011)
.assert $1f84e
++:

.bank $34000 $8000:$2000
;;; Eliminate a jsr $0020
.org $34f9e
  lda $8fbb,y
  sta $21
  lda $8fbc,y
  sta $22
  jsr $95f8
  bcc ++
  bcs +
  nop
  nop
+ jsr $fff6
.assert $34fb4
++:

;;; Eliminate jsr $0010 in MainLoop
.org $3c908
  lda $c91f,x
  sta $11
  lda $c920,x
  sta $12
  bne +
  nop
  nop
+ jsr $fff3
.assert $3c919

;;; Eliminate jsr $0010 in dyna routine
.org $3cd28
  jsr $fff3

;;; Eliminate jsr $0010 in item/trigger
.org $3d845
  lda $d885,y
  sta $11
  lda $d886,y
  sta $12
  bne +
  nop
  nop
+ jsr $fff3
.assert $3d856

;;; Indirect ram jumps
.org $3fff3
  jmp ($0011)
  jmp ($0021)

;;; Skip writing palettes if possible.
;;; We need to make sure to write them at some point, so we do it
;;; unconditionally when the game mode is 01.
.org $34c25
  jsr PatchPaletteWrite

;;; Patched version of PreparePaletteData
.org $3fde5
PatchPaletteWrite:
   pha
   lda $41   ; main loop mode
   cmp #$01
   beq +
    pla
    cmp $61f0,y
    bne ++
     inx
     inx
     inx
     inx
     iny
     rts
   .byte $24 ; bit zpg to skip next pla
+  pla
++ sta $61f0,y
   jmp $8c6e
.assert $3fe00
