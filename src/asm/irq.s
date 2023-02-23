;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to IRQ handlers.  Includes
;;;  1. Fix to avoid screen shaking
;;;  2. Fix a crash when IRQ happens while loading NPCs

.segment "fe", "ff"

;;; Fix the shaking issues by tweaking the delay times in IRQ callbacks.
.ifdef _FIX_SHAKING
.org $f455
  ldx #$07
  nop
.org $f4eb
  ldx #$03
- dex
  bpl -
.endif


;;; The following patch fixes a crash where an IRQ right in the middle of
;;; loading NPCs can fail to correctly restore the bank select register
;;; $8000.  If the IRQ occurs exactly between selecting the bank and setting
;;; the value (i.e. at $7c430..$7c432) and executes both MaybeUpdateMusic
;;; (which page-swaps, rewriting $50 to $8000 afterwards, but not restoring
;;; $50) and SelectCHRRomBanks (which restores $8000 to the clobbered $50)
;;; then the bank swap will fail.  In the case of this crash, it then reads
;;; NpcData from the wrong page, reading a 7 into the NPC type and jumping
;;; off the end of the 5-element NpcDataJump table.  The fix is to make sure
;;; that MaybeUpdateMusic restores $50 as well as $8000, though this takes
;;; an extra two bytes that we need to recover from SelectCHRRomBanks (which
;;; immediately follows) by using smaller instructions.
.org $f882
  stx $50
  rts
FREE_UNTIL $f8cb

.reloc
OVERRIDE
SelectCHRRomBanks:
  ldx #$05
-  stx $8000
   lda $07f0,x
   sta $8001
   dex
  bpl -
  lda $50
  sta $8000
  rts
