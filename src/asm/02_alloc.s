;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; This file does some initial work to move a handful of routines
;;; out of "high value real estate" segments, as well as to enable
;;; some defragging so that we can fit our own routines.

;;; TODO - fallback on non-38 version when not expanding?

;;; TODO - possible static routines to move:
;;;   ItemOrTriggerActionJump_09 3d659
;;;   StartAudioTrack 3c125
;;;    - note: need to preserve A (say, in $f4?)

.segment "fe", "ff"

.ifdef _EXPAND_PRG

;;; Does a cross-page jump to a subroutine on segment 38.
;;; Does not preserve the accumulator.  Must not be called
;;; from an interrupt.
;;; Usage:
;;;   jsr JmpSeg38
;;;   jmp DestinationAddrOnSeg38
;;;   FREE_UNTIL ...
;;; May be used together with RELOCATE and UPDATE_REFS:
;;;   RELOCATE "38" [$8123, $8234)
;;;   .reloc
;;;   : jsr JmpSeg38
;;;     jmp :--
;;;   UPDATE_REFS :- @ ...
.reloc
JmpSeg38:
  ;; We pull the return address and then read from there, noting
  ;; that the address on the stack is actually one byte BEFORE
  ;; the actual data (i.e. the CPU inc's PC before reading).
  pla ; Pull the low byte of the return address
  sta $38
  inc $38
  pla ; Pull the high byte
  sta $39 ; Now $38$39 is little-endian addr within calling code
  bcc +
   inc $39
  ;; Now $38$39 points to exactly the address we want.
  ;; Need to switch pages and then call
+ lda $6e
  pha
   lda #$38
   jsr $c418  ; BankSwitch8k_8000
   jsr +
  pla
  jmp $c418  ; restore bank
.reloc
+ jmp ($0038)

;;; Macro that behaves like RELOCATE but puts the bulk of
;;; the relocated content onto segment 38, only leaving
;;; behind 6 bytes in the current segment for the trampoline.
;;; This is only appropriate if the relocated content doesn't
;;; reference anything else in the actual segment.
.define RELOCATE_SEG38 {[start, end) refs .eol} \
.noexpand RELOCATE "38" [start, end) .eol \
.reloc .eol \
: jsr JmpSeg38 .eol \
  jmp :-- .eol \
.noexpand UPDATE_REFS :- @ refs

.else
.define RELOCATE_SEG38 .noexpand RELOCATE
.endif ; EXPAND_PRG

;;; Clear out some space in segment 13
.segment "12", "13"

;;; TODO(sdh): These were commented out by jrowe in stats branch
;;; I'm not sure why.  They're intended to move some of the title
;;; movie code into the expanded PRG.
; RELOCATE_SEG38 [$aa16, $aa30) $a7d4 $a7d6
; RELOCATE [$abb4, $abea) $a054
; RELOCATE [$abea, $ac07) $a056


;;; TODO - this does not work?
;; RELOCATE_SEG38 [$d659, $d6a8) $d575

;;; TODO - this does not work yet... a lot of static-page
;;; content doesn't seem to be movable?
;;; Move ClampScreenPosition off the static page
;; .segment "ff"
;; .org $ea72
;; ClampScreenPosition:
;;   jsr JmpSeg38
;;   jmp ClampScreenPosition_38
;;   FREE_UNTIL $eb05
;; .segment "38"
;; .reloc
;; ClampScreenPosition_38:
;;   .move ($eb05 - $ea72), ClampScreenPosition


;;; This looks safe and recovers over 300 bytes from the static page.
;;; This code is used by the Storm Bracelet.
.ifdef EXPAND_PRG
.segment "fe"
.org $ce12
  tay 
  lda #$38
  jsr $c418
  jsr @ReadTable
  jmp $ce39
  FREE_UNTIL $ce39
.org $cf47
: FREE_UNTIL $d085
.pushseg "38"
.reloc
@Table:
  .move ($d085-$cf47), :-
.reloc
@ReadTable:
  tya
  sta $10
  asl
  clc
  adc $10
  tay
  lda @Table,y
  sta $20
  lda @Table+1,y
  sta $21
  lda @Table+2,y
  sta $22
  bcc +
   lda @Table+$100,y
   sta $20
   lda @Table+$101,y
   sta $21
   lda @Table+$102,y
   sta $22
+ rts
.popseg

.endif ; EXPAND_PRG


.segment "0e"

.org $8157
  .word (PowersOfTwo) ; no need for multiple copies


;;; Rewrite the page boundary to avoid code crossing it.
;;; This is equivalent to the original, but 6 bytes shorter
;;; and doesn't cross the boundary (TODO - why did we care
;;; about that??? maybe it was something about a limitation
;;; in how the assembler handles cross-segment chunks?)
.segment "12", "13"
.org $9fef
  ;; Need to fit this in 17 bytes
  sta $09     ; 85 09
  ldy #$03    ; a0 04
- sta $06f0,y ; 99 f0 06
  sta $0002,y ; 99 02 00
  dey         ; 88
  bpl -       ; 10 f7
  jmp $a005   ; 4c 05 a0
FREE_UNTIL $a000
.org $a000
FREE_UNTIL $a005

