;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to shops.  Includes
;;;  1. Disable shop glitch
;;;  2.

.segment "10", "fe", "ff"  ; TODO - is 11 valid here, too?

.ifdef _DISABLE_SHOP_GLITCH
;;; Disable the shop glitch by ensuring prices are updated immediately
;;; after moving the cursor, rather than a few frames later.
.org $9812
    jmp Shop_NothingPressed
.endif
