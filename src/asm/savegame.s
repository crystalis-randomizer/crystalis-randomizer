;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to save-game and checkpointing routines.  Includes
;;;  1. Pity HP/MP
;;;  2. Fix warp boots reuse glitch
;;;  3. 

.segment "17", "fe", "ff"

;;; Prevent softlock from saving or checkpointing with zero health or MP.
;;; This handles cases such as (1) swamp runs when the last HP was lost
;;; exactly upon entering Oak, (2) reverse goa runs where flight is needed
;;; to exit, but the last MP was used and no wise men are available to
;;; restore, (3) the first sword requires flying to Swan and then passing
;;; through the gate.  This patch guarantees starting with 5 HP and 1 MP,
;;; unless the player is swordless, in which case 20 MP are given (since
;;; it may be impossible to stay at an inn or buy magic-restoring items).
;;; This is entered by a patched call at $2fd82.
.ifdef _PITY_HP_AND_MP
.org $bd82 ; normally "sta $03c1"
  jsr CheckForLowHpMp

.reloc
CheckForLowHpMp:
    cmp #PITY_HP_AMOUNT
    bcs +
     lda #PITY_HP_AMOUNT
+   sta PlayerHP
    ;; Check if we've ever found any swords
    lda ItemFlagsStart
    and #$0f
    ;; If this is zero then we have no swords and should give 34 MP.
    ;; Note that we can ignore the swordless check via a flag.
    beq +
     lda #$01
    .byte $2c             ; skip next instruction
+    lda #PITY_MP_AMOUNT
    ;; Now compare with MP - if it's less, set the minimum.
    cmp PlayerMP
    bcc +
     sta PlayerMP
+   rts
.endif ; _PITY_HP_AND_MP


;;; This glitch works because the game sets three separate checkpoints
;;; when using warp boots: one from $3e538 (ExitTypeJump_2_Warp) after
;;; setting the location/exit but before setting coordinates, another
;;; from $3e503 (ExitTypeJump_0_Normal) after setting the coordinates
;;; but before consuming the item, and then the third time from $3d4ef
;;; (the warp boots follow-up of MainGameModeJump_06).  The third one
;;; is unique to Warp Boots (Teleport only does the first two), and is
;;; also the only one that does not run with GameMode == #$06.  The fix
;;; is simple: don't set the checkpoint in GameMode_06.

.org $bbd5
;;; Space freed from unused "revert change magic" routine.  We specify
;;; this directly so that we can use a branch to MaybeSetCheckpointActual
;;; and thus save 3 bytes.
FixWarpBootsReuseGlitch:
  lda $41  ; GameMode
  cmp #$06 ; item use
  bne MaybeSetCheckpointActual
  rts
FREE_UNTIL $bc00

.ifdef _DISABLE_WARP_BOOTS_REUSE
.org $bc00
MaybeSetCheckpoint:
  ;; Normally this just jumps to MaybeSetCheckpointActual, which is kind
  ;; of pointless, but it provides a convenient point of indirection for
  ;; us to use here.
  jmp FixWarpBootsReuseGlitch
.endif

.org $bc09
MaybeSetCheckpointActual:
