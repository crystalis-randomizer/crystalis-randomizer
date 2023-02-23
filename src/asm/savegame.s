;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to save-game and checkpointing routines.  Includes
;;;  1. Pity HP/MP
;;;  2. Fix warp boots reuse glitch
;;;  3. Refactor how the initial game data is set up

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
.assert * = MaybeSetCheckpoint
  ;; Normally this just jumps to MaybeSetCheckpointActual, which is kind
  ;; of pointless, but it provides a convenient point of indirection for
  ;; us to use here.
  jmp FixWarpBootsReuseGlitch
.endif


.segment "fe", "ff"

;;; ================================================================
;;; When initializing a new game, we need more space for custom
;;; values.  Instead of a bunch of sta $07xx to zero things out,
;;; use a table.

.org $c96d
  ldx #$00
-- lda PrepareGameInitialDataTable,x
    beq +
   sta $12
   inx
   lda PrepareGameInitialDataTable,x
   sta $10
   inx
   lda PrepareGameInitialDataTable,x
   sta $11
   inx
   ldy #$00
-   lda PrepareGameInitialDataTable,x
    sta ($10),y
    inx
    iny
    dec $12
   bne -
  beq --
+ jsr $c9ff ; PopulateInitialObjects
  jmp $c008
FREE_UNTIL $c9da

.reloc
PrepareGameInitialDataTable:
  ;; Initial location/entrance
  .byte 2
  .word ($006c)
  .byte $00,$01
  ;; Main loop mode and game mode
  .byte 2
  .word ($0040)
  .byte $01,$00
  ;; Various values in the 700 block
  .byte 8
  .word ($0702)
  .ifdef _MONEY_AT_START
    .byte 100
  .else
    .byte 0
  .endif
  .byte $00,$1e,$00,$00,$00,$22,$22
  ;; A few more values in 7xx
  .byte 11
  .word ($0710)
  .byte $00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00
  ;; Some other one-off values
  .byte 2
  .word ($0743)
  .byte $00,$00
  .byte 1
  .word ($07e8)
  .byte $00
  .byte 4
  .word ($0002)
  .byte $00,$00,$00,$00
  .byte 1
  .word ($0051)
  .byte $00
.ifdef _STATS_TRACKING
  ; We need to write these stats twice to prevent NMI shenanigans
.repeat 2
  .byte PERMANENT_LENGTH
  .word (StatTrackingBase)
  .repeat 5
    .byte $00
  .endrepeat
.endrepeat
.endif ; _STATS_TRACKING
  .byte 0
.ifdef _MONEY_AT_START
.pushseg "17"
.org $be80
  .byte 100
.popseg
.endif
