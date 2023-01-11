;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to enemy AI routines
;;;  1. Buff DYNA

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

;;; Beef up dyna

.ifdef _BUFF_DYNA

;;; This is near the beginning of object action 70:06 (dyna eye)
.org $bc9c
  ;; Don't check pod's status before shooting eye laser
  nop
  nop
;.org $37d37
;  ;; Don't shift the "bubble turns" by 2, so that one or the
;  ;; other is always shooting
;  nop
;  nop
;.org $37d3c
;  and #$01 ; each cannon shoots 1 in 2 rather than 1 in 8

;;; Middle of object action 70:08 (dyna pod)
.org $bd35
  txa
  asl ; clears carry
  adc $08
  and #$03
  beq +
   rts
+ lda $08
  and #$3c
  lsr
  lsr
  jmp $bd4c    ; 37d4c
.assert * <= $bd4c
;;; TODO - change ItemGet_Crystalis to remove magics!

.org $bd55
  ;; Change shots to start from a random location
  jmp DynaShoot

.org $bd86
  jmp DynaShoot2

.org $bd6c
  nop
  nop

.reloc
DynaShoot:
  sta $61        ; Store the spawn ID for later
  lda $70,x      ; Save pod's position on stack
  pha            ;
   tya           ; Store the shot's direction on stack
   pha           ;
    lda $70      ; Seed the random number by player's position
    adc $08      ; Also seed it with the global counter
    and #$3f     ; Don't overflow
    tay          ;
    lda $97e4,y  ; Read from Random number table
    asl          ; Multiply by 8: range is 0..$3f
    asl          ;
    asl          ;
    adc #$e0     ; Subtract $20
    adc $70,x    ; Add to pod's position
    sta $70,x    ; And store it back (temporarily)
   pla           ; Pull off the direction
   tay           ;   ...and save it back in Y
   lda $61       ; Pull off the spawn ID
   jsr $972d     ; AdHocSpawnObject
  pla            ; Pull off the pod's position
  sta $70,x      ;   ...and restore it
  rts

.reloc
DynaShoot2:
  pha
  lda $08
  asl
  bcc +
   iny
+ asl
  bcc +
   dey
+ pla
  jmp $972d     ; AdHocSpawnObject

.endif
