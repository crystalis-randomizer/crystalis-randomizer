;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to walls.  Includes
;;;  1. Crystalis has all elements
;;;  2. Refactor how walls are stored in the spawn tables:
;;;     - Invert wall susceptibility bits
;;;     - Shooting walls are based on a spawn table bit
;;;     - Decouple element from spawned object
;;;  3. Optionally add an audible element-based 'tink' sound to walls

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

;;; Crystalis should have all elements, rather than none
;;; Since we now invert the handling for enemy immunity,
;;; this aligns enemies and walls nicely, Crystalis will
;;; also be able to break all walls now, too (if we get
;;; it working outside the tower, that is).
.org $9c6b
  .byte $0f

;;; Invert how walls work: their elemental defense byte stores
;;; a single bit, and the sword must have that bit as well: this
;;; makes Crystalis able to break all walls.
.org $9097
  eor #$0f
  and ObjectElementalDefense,x
  .byte $f0  ; change 'bne' to 'beq'.


.ifdef _CUSTOM_SHOOTING_WALLS
;;; This is in object jump 07, replacing the hardcoded location check
.org $a864
  lda $06c0,x
  eor #$ff
  and #$10  ; set Z if the 10 bit was _set_, meaning we should shoot.
  nop
.endif


.segment "fe", "ff"

.org $e2ac ; normally loads object data for wall
  jsr SpawnWall

.reloc
SpawnWall:
  ;; Spawns a breakable wall.  The $2e byte (3rd) determines
  ;; several changes if type:$20 bit is set:
  ;;   id:$30 determines the spawned object, id:$03 is element
  ;;   type:$10 determine if it shoots (stored in $6c0,x)
  ;; Works together with _CUSTOM_SHOOTING_WALLS
  lda $2e
  and #$20
  bne +
   jmp LoadOneObjectDataInternal
  ;; Do extra processing
+ lda $2f
  and #$30
  lsr
  lsr
  lsr
  lsr
  pha
   adc #$d0 ; carry clear
   sta $11
   jsr LoadOneObjectDataInternal
   ;; 6c0,x gets some information about the wall:
   ;;  - the 10 bit indicates it shoots
   ;;  - the 03 bits store the original type/shape:
   ;;    0/1 for a normal wall, 2 for bridge, 3 for iron.
   ;;    We use this for audible tinks.
  pla
  sta $06c0,x
  lda $2e
  and #$fc    ; don't overwrite the type
  ora $06c0,x ; We check the $10 bit later
  sta $06c0,x
  ;; Store the inverse of the element's mask in 500,x
  lda $2f
  and #$03
  tay
  lda WallElements,y
  sta $0500,x
+ rts

.reloc
WallElements:
  .byte $0e,$0d,$0b,$07


.segment "1a","fe","ff"

.ifdef _AUDIBLE_WALLS
;;; Reorder the checks: if it's too low, then bail.
;;; Otherwise, check for element match and maybe play
;;; a sound if it's not an iron wall.  This is basically
;;; copied from the original.
.org $9094 ; 35094
  lda $0420,x ; ObjectLevel,x
  cmp #$01
  beq @rts ; Level is too low -> bail out
  lda $0500,y ; ObjectElementalDefense,y
  and $0500,x ; ObjectElementalDefense,x
  and #$0f
  jsr @AudibleWalls ; Will do a double-return if mismatched
  jmp KillObject
@rts:
  rts
.reloc
@AudibleWalls:
  beq +
   ;; Element mismatched.
   ;; See if we should play a sound, double-return either way.
   ;; When we spawned the wall, we stored the original element
   ;; in the upper nibble of the ID byte, so check that that's
   ;; not 3 before playing the sound. (We should also avoid 2?)
   pla
   pla
   lda $06c0,y
   and #$02
   bne + ; bail out if it's iron/bridge
    ;; Figure out what the element is by shifting
    txa
    pha
     lda $0500,y
     ldx #$3f ; 40 is wind, 41 is fire, etc
-     inx
      lsr
     bcs -
     txa
     jsr $c125
    pla
    tax
+ rts
.endif
