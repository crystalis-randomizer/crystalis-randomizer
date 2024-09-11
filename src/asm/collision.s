;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Imports the original collision routines:
;;;  - hitboxes
;;;  - projectiles, status effects
;;;  - damage dealing
;;;  - knockback
;;; Most of this code originally lived in segment "1a" alongside the
;;; vector/movement routines and the object actions, but we're moving
;;; it out into segment "3d" instead.

;;; Jumps to the given address on a different page.  When the
;;; jumped-to routine returns, it will continue with restoring the
;;; banks to their current contents, and then return back out to the
;;; caller.  Note that this costs 23 bytes.
;;;
;;; Restrictions:
;;;   - A and F will be wrecked before the jump completes
;;;   - A and F will be wrecked after the routine returns
;;;   - Double-returns are not allowed in the routine
;;; 
;;; Usage:
;;;   Label_3d:
;;;     FAR_JUMP Label
.macro FAR_JUMP_LO addr
        .assert addr < $a000
        ;; Set up the stack for multiple uses of the "rts trick".
        ;; The top of the stack will be the 1a address we want,
        ;; so that the call to BankSwich8k_8000 returns to there.
        ;; When that routine returns, it will jump into RestoreBanks,
        ;; which expects two banks to be at the top of the stack
        ;; (pulled from 6e and 6f).  Once that's done, 
        lda $6e
        pha
        lda $6f
        pha
        lda #>RestoreBanks
        pha
        lda #<RestoreBanks
        pha
        lda #>addr
        pha
        lda #<addr
        pha
        lda #^addr
        jmp BankSwitch8k_8000
.endmacro


.segment "3d"

.reloc
LoadPalettesForLocation_3d:
        FAR_JUMP_LO LoadPalettesForLocation


;; .pushseg "fe", "ff"
;; LoadPalettesForLocation_3d:
;;         lda $6e
;;         pha
;;           lda #$1a
;;           jsr BankSwitch8k_8000
;;           jsr LoadPalettesForLocation
;;         pla
;;         jmp BankSwitch8k_8000
;; .popseg
