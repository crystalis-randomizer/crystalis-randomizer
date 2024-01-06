;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;; Skip over the check for dyna location
.segment "1a", "1b"
SwordSwingCrystalisNew = $9ce0
.org $9c73
  beq SwordSwingCrystalisNew

;; Update the shot init to use proper directions
.org $b070
SwordProjectileActionJump = $b0be

CrystalisShotObjectAction:
  ; Check if we've already initialized this 
  lda $0620,x
  bne SwordProjectileActionJump
  ; mark this as initialized
  inc $0620,x
  ; and spawn the shot tail object
  lda $0360,x
  tay
  lda #$14
  jsr AdHocSpawnObject
  bcc SwordProjectileActionJump
  jmp OffsetTailPosition
FREE_UNTIL $b094

;; The tail position is offset by 24px behind,
;; so kinda just make it look good or something
.reloc
OffsetTailPosition:
  lda $0360,x
  lsr
  tay
  lda @DirectionTable,y
  asl
  lda @OffsetTable, y
  ldy $10
  bcs @Xposition
@Yposition:
  adc $00b0,y
  sta $00b0,y
  jmp SwordProjectileActionJump
@Xposition:
  adc $0070,y
  sta $0070,y
  jmp SwordProjectileActionJump

@DirectionTable:
  .byte 0, $ff, 0, $ff
@OffsetTable:
  .byte $18, -$0f, -$10, $10