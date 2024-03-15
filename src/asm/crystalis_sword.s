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
  sta $0580,x ; store the direction as the extended sprite
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


;; Patch the draw metasprite routine to add an extended metasprite table
.org $8283
  jsr ExtendedMetaspriteTable
  jmp $829d ; unconditional
FREE_UNTIL $829d

.reloc
ExtendedMetaspriteTable:
  asl
  tay
  bcs +
    ; check for sprites in the extended table
    cpy #$ff
    beq @UseExtendedTable
      lda MetaspriteTable,y
      sta $15
      lda MetaspriteTable+1,y
      sta $16
      rts
+ 
  lda MetaspriteTablePart2,y
  sta $15
  lda MetaspriteTablePart2+1,y
  sta $16
  rts
@UseExtendedTable:
  lda $0580,x
  tay
  lda MetaspriteTablePart3,y
  sta $15
  lda MetaspriteTablePart3+1,y
  sta $16
  rts


; .segment "10"
;; Add a fifth row on the first inventory page
;; TODO figure out how to put it in there
; .org $8238
;   .byte $05

