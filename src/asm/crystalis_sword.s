;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

.import ExtendedMetaspriteTable, NewMetaspriteTable

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
  lsr
  ; store the direction as the metasprite into the extended metasprite table
  sta $0580,y
  jmp SwordProjectileActionJump
;  tay
;  lda @DirectionTable,y
;  asl ; set the carry with the direction to use
;  lda @OffsetTable, y
;  ldy $10
;  bcs @Xposition
;@Yposition:
;  adc $00b0,y
;  sta $00b0,y
;  jmp SwordProjectileActionJump ; @SetNewMetasprite
;@Xposition:
;  adc $0070,y
;  sta $0070,y
;  jmp SwordProjectileActionJump
;
;@DirectionTable:
;  .byte 0, $ff, 0, $ff
;@OffsetTable:
;  .byte $18, -$0f, -$10, $10
;@DirectionToMetaspriteTable:
;  .byte CRYSTALIS_BEAM_METASPRITE_UP
;  .byte CRYSTALIS_BEAM_METASPRITE_RIGHT
;  .byte CRYSTALIS_BEAM_METASPRITE_DOWN
;  .byte CRYSTALIS_BEAM_METASPRITE_LEFT

.segment "1c"
;; Patch the draw metasprite routine to add an extended metasprite table
.org $8283 ; asl tay bcs
  jmp LoadFromMetaspriteTable
; This section is required to be in address space $8000 since we bank out the other half
.org $828a
LoadFromExtendedTable:
  lda #$3d
  jsr BankSwitch8k_a000
  lda $0580,x
  tay
  lda ExtendedMetaspriteTable,y
  sta $15
  lda ExtendedMetaspriteTable+$0100,y
  sta $16
.assert * = $829d

; This is a bit of a hack, normally we would make this a reloc function, but it needs
; to be placed in 1c, and the linker places chunks from largest to smallest. So
; by the time it gets to this chunk, its already filled all of 1c and throws an error
; here. We can work around this by setting this to a known free address
; (ie where the metasprite table used to be)
.org $845c
LoadFromMetaspriteTable:
  cmp #$ff
  beq @UseExtendedTable
    tay
    lda #$1d
    jsr BankSwitch8k_a000
    ; check for sprites in the extended table
    lda NewMetaspriteTable,y
    sta $15
    lda NewMetaspriteTable+$0100,y
    sta $16
    jmp $829d ; unconditional
@UseExtendedTable:
  ; when using the extended table, we bank out prgA temporarily
  jmp LoadFromExtendedTable

; Clear the original Crystalis sword atk metasprite since we'll bank it
;FREE "1c" [$9041, $9163)
;
;.reloc
;MetaspriteTablePart3:
;  .word (CrystalisSwordAtkUp)
;  .word (CrystalisSwordAtkRight)
;  .word (CrystalisSwordAtkDown)
;  .word (CrystalisSwordAtkLeft)

; .segment "10"
;; Add a fifth row on the first inventory page
;; TODO figure out how to put it in there
; .org $8238
;   .byte $05

