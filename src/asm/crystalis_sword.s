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

.import CRYSTALIS_BEAM_METASPRITE_UP,CRYSTALIS_BEAM_METASPRITE_RIGHT,CRYSTALIS_BEAM_METASPRITE_DOWN,CRYSTALIS_BEAM_METASPRITE_LEFT
;; The tail position is offset by 24px behind,
;; so kinda just make it look good or something
.reloc
OffsetTailPosition:
  ; Load the offset for the new metasprite
  ldy $10
  lda $0360,x
  sta $0580,y
  lsr
  tay
  lda @DirectionTable,y
  asl ; set the carry with the direction to use
  lda @OffsetTable, y
  ldy $10
  bcs @Xposition
@Yposition:
  adc $00b0,y
  sta $00b0,y
  jmp SwordProjectileActionJump ; @SetNewMetasprite
@Xposition:
  adc $0070,y
  sta $0070,y
  jmp SwordProjectileActionJump

@DirectionTable:
  .byte 0, $ff, 0, $ff
@OffsetTable:
  .byte $18, -$0f, -$10, $10
;@DirectionToMetaspriteTable:
;  .byte CRYSTALIS_BEAM_METASPRITE_UP
;  .byte CRYSTALIS_BEAM_METASPRITE_RIGHT
;  .byte CRYSTALIS_BEAM_METASPRITE_DOWN
;  .byte CRYSTALIS_BEAM_METASPRITE_LEFT

.segment "1c", "1d"
;; Patch the draw metasprite routine to add an extended metasprite table
.org $8283 ; asl tay bcs
  jsr ExtendedMetaspriteTable
  jmp $829d ; unconditional
FREE_UNTIL $829d

.reloc
ExtendedMetaspriteTable:
  cmp #$ff
  beq @UseExtendedTable
  asl
  tay
  bcs @TablePart2
    ; check for sprites in the extended table
    lda MetaspriteTable,y
    sta $15
    lda MetaspriteTable+1,y
    sta $16
    rts
@TablePart2:
  lda MetaspriteTablePart2,y
  sta $15
  lda MetaspriteTablePart2+1,y
  sta $16
  rts
@UseExtendedTable:
  ; when using the extended table, we bank out prgA temporarily
  lda #$3d
  jsr BankSwitch8k_a000
  lda $0580,x
  tay
  lda MetaspriteTablePart3,y
  sta $15
  lda MetaspriteTablePart3+1,y
  sta $16
  rts

; Clear the original Crystalis sword atk metasprite since we'll bank it
;FREE "1c" [$9041, $9163)
;
.reloc
MetaspriteTablePart3:
  .word (CrystalisSwordAtkUp)
  .word (CrystalisSwordAtkRight)
  .word (CrystalisSwordAtkDown)
  .word (CrystalisSwordAtkLeft)

; .segment "10"
;; Add a fifth row on the first inventory page
;; TODO figure out how to put it in there
; .org $8238
;   .byte $05

