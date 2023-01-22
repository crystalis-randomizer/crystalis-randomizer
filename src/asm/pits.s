;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to how we handle pits:
;;;  1. Adjust coordinates when falling through

.segment "fe", "ff"

;;; Vanilla moves the player down a tile when falling into pits.
;;; This is presumably to better line up the landing with the
;;; horizontal wide screens, which are offset a tile down from
;;; normal caves.  This leads to two problems: (1) when falling
;;; into a non-wide screen, the player lands _inside_ the wall;
;;; (2) the entrance and exit of Sabera's palace need to be
;;; shifted down a tile to compensate and prevent the player
;;; falling through the exit during the screen-shaking dead
;;; frames.  Instead, we offset up a tile, which in practice
;;; seems to be fine.
;; .org $e5a9
;;   beq $e5b2
;; FREE_UNTIL $e5b2

;;; NEW: offset up, and clamp x-tile to [4, b] so that vertical
;;; spikes are eligible targets for both horizontal and vertical
;;; platforms.
.org $e5ab
  sec
  sbc #$10
  nop
  jsr @ClampPitX

.reloc
@ClampPitX:
  sta $b0  ; copied from ff:e5ae
  sta $b1
  ;; original code
  lda $70
  cmp #$44
  bcs +
   lda #$44
+ cmp #$bb
  bcc +
   lda #$bb
+ sta $70
  sta $71
  rts
