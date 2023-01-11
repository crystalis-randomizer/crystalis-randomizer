;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to warp (teleport, warp boots, and wild warp)
;;;  1. Add a twelfth warp point
;;;  2. Set warp points on entering location, rather than by trigger
;;;  3. Optionally disable wild warp

.segment "fe", "ff"



.ifdef _TWELFTH_WARP_POINT
;;; Remove 9 (5-byte) lines from the nametable write table
FREE "fe" [$c5c2, $c5ef)

.reloc
StageWarpMenuNametableWrite:
  ;; 20=a8, 21=DATA, 22=09, 23=00, 24=01
  sta $21
  lda #$a8
  sta $20
  lda #$09
  sta $22
  ldx #$00
  stx $23
  inx
  stx $24
  ;bne StageCustomNametableWrite ; uncond
StageCustomNametableWrite:  ; NOTE: was before the prev block
  jsr FlushNametableDataWrite
  txa
  pha
  jmp $c4b8  ; resume into the middle of StageNametableWrite

.reloc
WarpMenuNametableData:
  .byte $23,$2d,$36,$63,$6d,$76,$a3,$ad,$b6,$e3,$ed,$f6

.org $dc7b
  cmp #$0c  ; $0c is the first invalid slot (probably could just nop here)

.org $dd40
  lda #$0b  ; start drawing menu at $b

.org $dd4b
  ldx $11
  lda WarpMenuNametableData,x
  jsr StageWarpMenuNametableWrite
.assert * = $dd53

.org $dd59
  adc #$04  ; lower offset, start at 2f4 instead of 2f5
.endif ; _TWELFTH_WARP_POINT


.reloc
;;; Code to run on new location just before spawning NPCs
;;; TODO - this might want to move out to a different file?
LocationChangePreSpawnHook:
    .ifdef _WARP_FLAGS_TABLE
  jsr SetWarpFlagForLocation
    .endif
  jmp $e144 ; LoadNpcDataForCurrentLocation


.ifdef _WARP_FLAGS_TABLE
.pushseg "0a", "0b", "fe", "ff"
;;; We remove the triggers that set the warp flags and instead
;;; iterate over a simple table to find what flags should be set.
;;; This could be made more general by (1) using a jump table or
;;; address (with potential argument stored in A), (2) making a
;;; general script that runs at all location changes, and/or
;;; (3) leveraging the trigger table to get the effects.
;;; Triggers are difficult to use, however, and we don't really
;;; have any other use cases for now, so we'll go the easy route.

.ifdef _TWELFTH_WARP_POINT
.define FIRST_WARP_POINT $f4
;.define INITIAL_MASK $10
.else
.define FIRST_WARP_POINT $f5
;.define INITIAL_MASK $20
.endif

.org $e6ff
  jmp LocationChangePreSpawnHook
.reloc
SetWarpFlagForLocation:
  ;; Iterate over the warp points to see if the new location is one
  lda $6c
  ldx #FIRST_WARP_POINT
-  cmp $dc58-FIRST_WARP_POINT,x ; TownWarp entry
   beq +
   inx
  bne -
- rts
  ;; At this point, we need to set flag $200|x
+ txa
  and #$07
  tay
  txa
  lsr
  lsr
  lsr
  tax
  lda $64c0,x
  ora PowersOfTwo,y
  sta $64c0,x
  bne - ; unconditional

;;; Alternative version: 37 bytes (2 more than previous)
;;   ldx #$fe
;;   lda #INITIAL_MASK
;;   sta $10  ; overwritten in LoadNpcDataForCurrentLocation anyway
;;   ldy #0
;; -   lda $dc58,y
;;     cmp $6c
;;     beq @FoundLocation
;;     asl $10
;;    bcc -
;;    rol $10
;;    inx
;;   bne -
;; - jmp $e144
;;   lda $63e0,x
;;   ora $10
;;   sta $63e0,x
;;   bne -

.popseg
.endif ; _WARP_FLAGS_TABLE


.ifdef _DISABLE_WILD_WARP
.org $cbc7
  rts
.endif
