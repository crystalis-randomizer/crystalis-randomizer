;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to gamepad input routines
;;;  1. Rearrange a few of the RAM locations
;;;  2. Add quick warp and quick sword select


.segment "fe", "ff"

.ifdef _CTRL1_SHORTCUTS
;;; These cases need to watch for button-up instead of button-down
.org $cb90 ; enter start menu
  lda $4a
.org $cbb4 ; enter select menu
  lda $4a

.ifndef _CHECK_FLAG0
.org $cb62 ; game mode 8
  jsr ReadControllersWithButtonUp
.endif
.endif ; _CTRL1_SHORTCUTS
