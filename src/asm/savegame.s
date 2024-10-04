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

FREE "17" [$bbd5, $bcf7)        ; free space from moved routines

;;; --------------------------------
.reloc                          ; smudge from $2fc09 to $2fc8e
OVERRIDE
MaybeSetCheckpoint:
OVERRIDE
MaybeSetCheckpointIndirected:
    .ifdef _DISABLE_WARP_BOOTS_REUSE ; smudge off
        lda GameMode
        cmp #GAME_MODE_ITEM_USE ; #$06
        bne +
          rts                   ; don't set checkpoint during item use
    .endif                           ; smudge on
+       <@2fc09@>
         <@2fc0a@>
         <@2fc0b@>
          <@2fc0c@>
          <@2fc0d@>
           <@2fc0e PlayerStatus@>
           <@2fc11@>
            <@2fc12@>
            <@2fc14 PlayerStatus@>
            <@2fc17@>
-            <@2fc19@>
             <@2fc1b@>
             <@2fc1e@>
             <@2fc1f@>
            <@2fc21 -@> ; $2fc19
            <@2fc23 SetCarryIfCheckpoint@>
            <@2fc26 @loop2@> ; $2fc65
             <@2fc28@>
             <@2fc2a@>
-             <@2fc2b@>
              <@2fc2e@>
              <@2fc31@>
              <@2fc34@>
             <@2fc35 -@> ; $2fc2b
             <@2fc37 StageGameDataForSave_7df0@>
             <@2fc3a@>
             <@2fc3c@>
@loop1:
              <@2fc3e@>
              <@2fc40@>
              <@2fc41@>
              <@2fc43@>
              <@2fc44@>
              <@2fc45@>
              <@2fc47@>
              <@2fc48@>
-              <@2fc4a CopyMemoryToCheckpointTable@>
               <@2fc4d@>
               <@2fc4f@>
               <@2fc50@>
               <@2fc51@>
              <@2fc53 -@> ; $2fc4a
              <@2fc55 CopyBytes@>
              <@2fc58@>
              <@2fc5a@>
              <@2fc5c@>
             <@2fc5e @loop1@> ; $2fc3e
             <@2fc60 ComputeChecksumForCheckpoint@> ; compute checksum => 70f4
        ;; Copy checkpoint from main location to backup
             <@2fc63@>
@loop2:
              <@2fc65@>
              <@2fc68@>
              <@2fc6b@>
              <@2fc6e@>
              <@2fc71@>
              <@2fc74@>
              <@2fc77@>
            <@2fc78 @loop2@> ; $2fc65
-            <@2fc7a@>
             <@2fc7d@>
             <@2fc7f@>
             <@2fc80@>
            <@2fc82 -@> ; $2fc7a
           <@2fc84@>
           <@2fc85 PlayerStatus@>
          <@2fc88@>
          <@2fc89@>
         <@2fc8a@>
         <@2fc8b@>
        <@2fc8c@>
        <@2fc8d@>

;;; --------------------------------
.reloc                          ; smudge from $2fc8e to $2fcda
OVERRIDE
CopyCheckpointToMemory:
OVERRIDE
CopyCheckpointToMemoryIndirected:
        ;; Back up AXY and $10..$30 (onto stack and $6000)
        <@2fc8e@>
         <@2fc8f@>
         <@2fc90@>
          <@2fc91@>
          <@2fc92@>
           <@2fc93@>
-           <@2fc95@>
            <@2fc97@>
            <@2fc9a@>
            <@2fc9b@>
           <@2fc9d -@> ; $2fc95
           ;; Copy checkpoint to memory by iterating over the copy table
           <@2fc9f@>             
           <@2fca1@>              ; $17 <- 0
@loop:
            <@2fca3@>
            <@2fca5@>
            <@2fca6@>
            <@2fca8@>
            <@2fca9@>
            <@2fcaa@>
            <@2fcac@>                 ; y <- 6 * $17
            ;; Load 6 bytes from the copy table (src, dest, len) into $10..$15
            <@2fcad@>
-            <@2fcaf CopyCheckpointToMemoryTable@>
             <@2fcb2@>
             <@2fcb4@>
             <@2fcb5@>
             <@2fcb6@>
            <@2fcb8 -@> ; $2fcaf
            <@2fcba CopyBytes@>
            <@2fcbd@>
            <@2fcbf@>
            <@2fcc1@>
           <@2fcc3 @loop@> ; $2fca3
           <@2fcc5 CopyExtraStateFromCheckpoint@>
           ;; Restore AXY and $10..$30
           <@2fcc8@>
-           <@2fcca@>
            <@2fccd@>
            <@2fccf@>
            <@2fcd0@>
           <@2fcd2 -@> ; $2fcca
          <@2fcd4@>
          <@2fcd5@>
         <@2fcd6@>
         <@2fcd7@>
        <@2fcd8@>
        <@2fcd9@>

;;; --------------------------------
;;; This copies the checkpoint into memory and then sets the game mode
;;; to CHANGE_LOCATION, which loads all the assets for the correct map.
;;; It sets the entrance to $ff, which triggers ExitTypeJump_7 to not
;;; actually set the player's location.
.reloc                          ; smudge from $2fcda to $2fcf7
OVERRIDE
CopyCheckpointToMemoryForContinue:
OVERRIDE
CopyCheckpointToMemoryForContinueIndirected:
        ;; This looks like it's involved in restoring saved games
        <@2fcda CopyCheckpointToMemory@> ; 2fc8e
        ;; Copy 7e00..7fff => 6480..667f - this seems redundant with
        ;; the previous call, which has already copied this?
        <@2fcdd@>
-        <@2fcdf@>
         <@2fce2@>
         <@2fce5@>
         <@2fce8@>
         <@2fceb@>
        <@2fcec -@> ; $2fcdf
        ;; Finally set entrance to $ff and set game mode.
        <@2fcee@>
        <@2fcf0@>
        <@2fcf2 GAME_MODE_CHANGE_LOCATION@>
        <@2fcf4 GameMode@>
        <@2fcf6@>
;;; --------------------------------
;;; smudge off


.segment "17"
.ifdef _MONEY_AT_START          ; TODO - refactor this away from a .define
  initialMoney = 100
.else
  initialMoney = 0
.endif
.export initialMoney


.segment "3c"
.reloc
PrepareGame_3c:                      ; smudge from $3c957 to $3c9da
        <@3c957@>
        <@3c959@>
-        <@3c95b@>
         <@3c95e@>
        <@3c95f -@> ; $3c95b
        <@3c961@>
        <@3c963@>
-        <@3c964@>
         <@3c967@>
         <@3c96a@>
        <@3c96b -@> ; $3c964
        ;; ================================================================
        ;; When initializing a new game, we need more space for custom
        ;; values.  Instead of a bunch of sta $07xx to zero things out,
        ;; use a table.
        ldx #$00                     ; smudge off
--       lda PrepareGameInitialDataTable,x
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
-         lda PrepareGameInitialDataTable,x
          sta ($10),y
          inx
          iny
          dec $12
         bne -
        beq --
+       jsr PopulateInitialObjects
        jmp UpdateEquipmentAndStatus

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
  .byte initialMoney,$00,$1e,$00,$00,$00,$22,$22
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
