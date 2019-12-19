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




.org $3fddb
PatchWritePaletteDataToPpu:
    bmi ++
    lda #$ff
    sta $61f0
    ldx #$1f
-    lda $6140,x
     cmp $6160,x
     beq +
      sta $61f0
+    sta $6160,x
     dex
    bpl -
    ldx #$00
    lda $61f0
    bpl +++
++  pla
    pla
+++ rts
.assert < $3fe00


;; ;;; Skip writing palettes if possible.
;; ;;; We need to make sure to write them at some point, so we do it
;; ;;; unconditionally when the game mode is 01.
.org $3f8cd
  jsr PatchWritePaletteDataToPpu
;; ;.org $34c0e
;; ;  jsr PatchLoadPalettesForLocation
;; ;  nop
;; .org $34cb3
;;   jsr PatchPreparePaletteData
;; .org $3f9b6
;;   jmp PatchPostPaletteWrite

;; ;;; Patched version of PreparePaletteData

;; ;;; we need to avoid WritePaletteDataToPpu

;; .org $3fddb
;; PatchWritePaletteDataToPpu:
;;    bmi +
;;    lda $61f0
;;    bpl ++
;;    lda $40
;;    cmp #$01
;;    beq ++
;; +  pla
;;    pla
;; ++ rts
;; PatchPostPaletteWrite: ;LoadPalettesForLocation:
;;   sta $2006
;;   lda #$ff
;;   sta $61f0
;;   rts
;;   ;; lda #$ff
;;   ;; sta $61f0
;;   ;; lda #$00
;;   ;; sta $11
;;   ;; rts
;; PatchPreparePaletteData:
;;   cmp $6140,x
;;   beq +
;;    sta $61f0
;; + sta $6140,x
;;   rts
;; .assert $3fe00
