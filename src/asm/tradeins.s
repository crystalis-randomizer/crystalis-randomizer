;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

.segment "0e", "0f"

;;; Patch the end of ItemUse to check for a few more items.
.org $834d
  jmp PatchTradeInItem

;; TODO - extra item indirection preamble...
;; handle different checks

;;; Fix the overly-long loop to find broken statue
;; .org $1c585
;;   ldx #$08
;; - lda $6450,x
;;   cmp #$38    ; broken statue
;;   beq +
;;   dex
;;   bpl -
;;   jmp $84db

;;; Allow giving arbitrary items for broken statue trade-in
.org $8594
  lda #$ff
;  sta $6450,x
  ;rts
;;   ;; 9 free bytes, could be more if we remove the unused Flute of Lime checks
;; .assert * <= $1c59e

;.org $1c596
;  jsr $d22b ; grant item in register A
;  jsr FixStatue
 ; jmp FixStatue

;; Count uses of Flute of Lime and Alarm Flute - discard after two.
.segment "0e", "0f", "fe", "ff"
.reloc
PatchTradeInItem:
    cmp #$28  ; flute of lime
    beq @FluteOfLime
    cmp #$31  ; alarm flute
    bne @DoTradeIn
    lda #$40
    SKIP_TWO_BYTES ; skip the next instruction (safe b/c $80a9 is prg rom)
@FluteOfLime:
    lda #$80
    sta $61
    lda $648e ; check flag 076 (alarm flute) or 077 (flute of lime)
    and $61
    bne @DoTradeIn
    lda $648e
    ora $61
    sta $648e
    ;; Deselect current item
    lda #$00
    sta $0715
    lda #$80
    sta $642e
    rts
@DoTradeIn:
    jmp ItemUse_TradeIn
