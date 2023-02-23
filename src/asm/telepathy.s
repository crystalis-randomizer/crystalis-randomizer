;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to telepathy
;;; NOTE: This is currently off by default because it's experimental
;;; and not yet working...

.segment "0e", "fe", "ff"

.ifdef _NORMALIZE_TELEPATHY
FREE "0e" [$8167, $822f)
;FREE "0e" [$98f4, $9b00) -- currently declared in rom/telepathy.ts

;;; Basic plan: rip out minimum level, result mapping, etc
;;; Also removed the extra powers of two table, so we have
;;; room to inline CheckTelepathyResult.
.org $de14  ; Ref from MainGameModeJump_16 jumped to 816f before
    jsr CastTelepathy

.reloc
CastTelepathy:
    sec
    lda PlayerMP
    sbc #$08 ; should never overflow because already checked
    sta PlayerMP
    lda $07c0
    and #$3f
    inc $07c0
    tay
    lda TelepathyResultTable,y
    bne +++
    ;;  give free MP
    clc
    lda #$20
    adc PlayerMP
    bcs +
     cmp PlayerMaxMP
     bcc ++
+     lda PlayerMapMP
++  sta PlayerMP
    ldx #$01
    bne Telepathy_ShowDefaultMessage ; unconditional
    ;; ------
+++ cmp #$01
    bne +
    ldx #$02
    bne Telepathy_ShowDefaultMessage ; unconditional
    ;; ------
+   and #$01
    sta $29
    lda #23 ; which sage
    asl
    tax
    lda TelepathyTable,x
    sta $24
    lda TelepathyTable+1,x
    sta $25
    ldy #$00
-    jsr ReadFlagFromBytePair_24y
     bne ++
     lda $26
     and #$40
     beq +
      lda $29
      beq +
       iny
       iny
+    lda ($24),y
     sta $21
     iny
     lda ($24),y
     sta $20
     rts
++   iny
     iny
     lda $26
     and #$40
     beq +
      iny
      iny
+    lda $26
    bpl -
    ldx #$03
Telepathy_ShowDefaultMessage:
    txa
    asl
    asl
    ora $23 ; which sage
    asl
    tax
    lda TelepathyTable,x
    sta $21
    lda TelepathyTable+1,x
    sta $20
    rts

.import TelepathyTable

.endif
