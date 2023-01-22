;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Trainer mode: provides a number of controller shortcuts
;;; to do a wide variety of things:
;;;   Start+B+Left -> all balls
;;;   Start+B+Right -> all bracelets
;;;   Start+B+Down -> some consumables
;;;   Start+Up -> gain a level
;;;   Start+Down -> increase scaling by 2
;;;   Start+Left -> better armors
;;;   Start+Right -> better shields
;;; TODO - move trainer to a different ROM page since it's so big.

.segment "fe", "ff"

.ifdef _TRAINER

.reloc
CheckTrainerShortcuts:
   lda $46    ; Currently pressed?
   and #$50   ; Start+B
   cmp #$50
   bne ++
    lda $4b   ; Newly pressed?
    cmp #$08  ; Up
    bne +
     ;; TODO - something here?
+   cmp #$04  ; Down
    bne +
     lda #$04
     jmp TrainerGetItems
+   cmp #$02  ; Left
    bne +
     lda #$05
     jmp TrainerGetItems
+   cmp #$01  ; Right
    beq +
-    rts
+   lda #$06
    jmp TrainerGetItems
    ;; ----
++ cmp #$10  ; Start only
   bne -
   lda $4b   ; Newly pressed?
   cmp #$08  ; Up
   bne +
    lda $48
    and #$ef
    sta $48
    jmp TrainerIncreaseLevel
+  cmp #$04  ; Down
   bne +
    lda $48
    and #$ef
    sta $48
    jmp TrainerIncreaseScaling
+  cmp #$02  ; Left
   bne +
    lda #$02
    jmp TrainerGetItems
+  cmp #$01
   bne -
   lda #$03
   jmp TrainerGetItems

TrainerStart:
  ;; Get all swords, armor, magic, bow of truth, max money
  lda #$ff  ; max gold
  sta $0702
  sta $0703
  lda $6484 ; shyron massacre
  eor #$80
  sta $6484
  lda #$ff  ; activate all warp points
  sta $64de
  sta $64df
  lda #$00
  jsr TrainerGetItems
  lda #$01
  jsr TrainerGetItems
  lda #$04
  jsr TrainerGetItems
  lda $6e ; NOTE: could just jmp $7d276 ?? but less hygeinic
  pha
   lda #$1a
   jsr BankSwitch8k_8000 ; bank switch 8k 8000
   lda #$01
   jsr $8e46 ; display number internal
  pla
  jmp BankSwitch8k_8000

.reloc
TrainerData:
  .word (TrainerData_Swords)      ; 0 swords, armors, shields
  .word (TrainerData_Magic)       ; 1 accessories, bow of truth, magic
  .word (TrainerData_Balls)       ; 2
  .word (TrainerData_Bracelets)   ; 3
  .word (TrainerData_Consumables) ; 4
  .word (TrainerData_Armors)      ; 5
  .word (TrainerData_Shields)     ; 6

.reloc
TrainerGetItems:
    ;; Input: A = index into TrainerData table
    asl
    tax
    lda TrainerData,x
    sta $10
    lda TrainerData+1,x
    sta $11
    ldy #$00
    lda ($10),y
    sta $12
    iny
    lda ($10),y
    tay
    iny
    iny
    clc
    adc $12
    tax
    dex
    dey
    ;; At this point, we move $6430,x <- ($10),y
    ;; and then decrease both until y=2
-    lda ($10),y
     bmi +
      sta $6430,x
+    dex
     dey
     cpy #$02
    bcs -
    lda $48
    and #$ef
    sta $48
    rts  

.reloc
TrainerData_Swords:
  .byte $00,$0c
  .byte $00,$01,$02,$03,$15,$16,$17,$18,$0d,$0e,$0f,$10

.reloc
TrainerData_Magic:
  .byte $18,$18
  .byte $29,$2a,$2b,$2c,$2d,$2e,$2f,$30
  .byte $ff,$ff,$ff,$ff,$ff,$ff,$ff,$40
  .byte $41,$42,$43,$44,$45,$46,$47,$48

.reloc
TrainerData_Balls:
  .byte $0c,$04
  .byte $05,$07,$09,$0b

.reloc
TrainerData_Bracelets:
  .byte $0c,$04
  .byte $06,$08,$0a,$0c

.reloc
TrainerData_Consumables:
  .byte $10,$08
  .byte $1d,$1d,$21,$21,$22,$22,$24,$26

.reloc
TrainerData_Armors:
  .byte $04,$04
  .byte $19,$1a,$1b,$1c

.reloc
TrainerData_Shields:
  .byte $08,$04
  .byte $11,$12,$13,$14

.reloc
TrainerIncreaseScaling:
  ;; scaling level
  lda Difficulty
  clc
  adc #$02
  cmp #$2f
  bcc +
   lda #$2f
+ sta Difficulty
  lda ShouldRedisplayUI
  ora #UPDATE_DIFFICULTY
  sta ShouldRedisplayUI
  rts

.reloc
TrainerIncreaseLevel:
  ;; level up
  lda #$0f
  cmp $0421
  bcs +
   rts
+ inc $0421
  ldy $0421
  lda $6e
  pha
   lda #$1a
   jsr BankSwitch8k_8000
   lda $8b7f,y
   sta $03c0
   sta $03c1
   lda $8b8f,y
   sta $0708
   sta $0709
   jsr $8cc0
   lda #$00
   jsr $8e46
   lda #$02
   jsr $8e46
   lda #$03
   jsr $8e46
   lda #$04
   jsr $8e46
   lda #$05
   jsr $8e46
   jsr $c008
  pla
  jmp BankSwitch8k_8000

.endif
