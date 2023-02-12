;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to location change routines, including both normal exits and
;;; warps/teleports/wild warp:
;;;  1. Add a twelfth warp point
;;;  2. Set warp points on entering location, rather than by trigger
;;;     - specifically, these flags are now handled with a table
;;;  3. Optionally disable wild warp
;;;  4. Allow teleporting out of tower and boss fights (optionally)
;;;  5. Repurposes a second entry point into ReloadNpcDataForCurrentLocation
;;;     to just ReloadLocationGraphics (but not respawn everything).
;;;  6. Add an import for configuring thunder sword warp

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

.import TownWarpTable
.org $dc8c
  lda TownWarpTable,y

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

.ifdef _ALLOW_TELEPORT_OUT_OF_BOSS
.org $db31
  .byte $00   ; don't jump
.endif

.ifdef _ALLOW_TELEPORT_OUT_OF_TOWER
.org $db39
  .byte $00   ; don't jump away to prevent warp, just goto next line

;; Make sure the down stair always spawns outside Mesia's room
.pushseg "1b", "fe", "ff"
.org $a48f
  lda $d0  ; player y hi
  ldy $b0  ; player y lo
  cpy #$20 ; set carry if below 2nd tile
  adc #0   ; add carry bit if needed
  tay      ; y is row to start clearing flags for
  ;; if we have crystalis then unlock from 0
  lda $6430
  cmp #4
  bne +
    ldy #0
  ;; set all the flags from y down to the bottom
+ lda #$ff
  bne +  ; (while ... do) instead of (do ... while)
-  sta $62f0,y
   iny
+  cpy #4
  bne -
  ;; if we're on the top screen (5c) then double-return
  lda $6c
  cmp #$5c
  bne +
   lda #0
   sta $04a0,x
   pla
   pla
   ;; TODO - do we still need to call SpawnTowerEscalator here?
+ rts
FREE_UNTIL $a4c6 ; currently saves ~12 bytes?
.popseg

.endif


;;; Repurpose $7e148 to skip loading NPCs and just reset pattern table.
;;; The only difference from $7e144 is that $18 gets set to 1 instead of 0,
;;; but this value is never read.  Start by changing all jumps to $7e148
;;; to instead jump to $7e144.  Then we grab some space and have a nonzero
;;; value in $18 return early.  This is in ReadMapDataGraphicsTable.
.org $e19a  ; in the middle of CheckForNpcSpawn
  lda $18
  beq $e1ae ; >rts
  lda ($10),y  ; npc[1]: sign bit indicates a timer spawn
  dey
  asl
  bcs $e1af ; skip the rts
  jsr $e1b6 ; TryNpcSpawn
  inx
  jmp $e18f ; Check next NPC spawn.
FREE_UNTIL $e1ae

.ifndef _WARP_FLAGS_TABLE ; Note: _WARP_FLAGS_TABLE patches this differently.
.org $e6ff
  jmp $e144
.endif


;;; Import thunder sword warp info
.import thunderSwordWarpLocation, thunderSwordWarpEntrance
.org $d5c9
  lda #thunderSwordWarpLocation
.org $d5cd
  lda #thunderSwordWarpEntrance
