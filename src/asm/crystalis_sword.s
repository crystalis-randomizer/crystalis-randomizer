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
;; Patch the draw metasprite routine to add an extended metasprite table.
;; Every caller maps bank $0e (1c/1d) before drawing, so the main table in 1d
;; is already at $a000 and only the extended table needs a bank switch.
.org $8283 ; asl tay bcs
  cmp #$ff
  bne @Normal
    ; when using the extended table, we bank out prgA temporarily
    lda #$3d
    jsr BankSwitch8k_a000
    ldy $0580,x
    jmp DrawFromExtendedTable
@Normal:
  tay
  lda NewMetaspriteTable,y
  sta $15
  lda NewMetaspriteTable+$0100,y
  sta $16
.assert * = $829d

;; Metasprite data now has a per-frame pointer table after the header
;; [size, frameMask, frame0 lo, frame0 hi, frame1 lo, frame1 hi, ...]
;; so the frame is a table lookup instead of multiplying frame * size * 4.
;; This replaces the old multiply code.
.org $82b9
DrawMetaspriteLookupFrame:
  ; A = sprite count, y = 0
  sta $17
  iny
  lda ObjectAnimationCounter,x ; step counter picks the animation frame
  lsr
  lsr
  lsr
  and ($15),y ; frameMask
  asl
  tay
  iny
  iny
  lda ($15),y
  sta $18 ; temp, overwritten below with $380,x << 1
  iny
  lda ($15),y
  sta $16
  lda $18
  sta $15
  ; Replaces the vanilla setup at $8301 to shave off some more cycles
  ; $18 = $380,x << 1
  ; $19 = behind bg bit
  lda ObjectOnScreen,x
  asl
  sta $18
  and #$20
  sta $19
  ; $1a = $320,x + ($380,x:20 << 1)
  ; Vanilla added in $1a, which was always 0 and read $380,x again
  ; even though $18 already has that bit at $40.
  lda $18
  and #$40
  clc
  adc ObjectDeathChain,x
  sta $1a
  ; Vanilla stored a knockback flag in $1d here, but nothing ever reads it.
  ldx $10 ; next OAM slot
  ldy #$00 ; ($15) points directly at the frame's sprites now
  jmp $832d
FREE_UNTIL $832d

.reloc
DrawFromExtendedTable:
  lda ExtendedMetaspriteTable,y
  sta $15
  lda ExtendedMetaspriteTable+$0100,y
  sta $16
  ; draw the rest of the metasprite then restore bank 1d
  jsr $829d
  lda #$1d
  jmp BankSwitch8k_a000

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

