;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to walls.  Includes
;;;  1. Crystalis has all elements
;;;  2. Refactor how walls are stored in the spawn tables:
;;;     - Invert wall susceptibility bits [->collision.s]
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
