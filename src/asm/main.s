;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Rewrites the MainLoop and subroutines.

.segment "fe","ff"

FREE "fe" [$c900, $ca2e)

;;; --------------------------------
;;; This loop happens nearly every frame.  Occasionally it takes
;;; a few frames to get back.
.reloc                               ; smudge from $3c900 to $3c91f
OVERRIDE
MainLoop:
        <@3c900@>
        <@3c902 MainLoop@>
        <@3c904 MainLoopMode@>
        <@3c906@>
        <@3c907@>
        <@3c90c MainLoopJumpTable@>
        <@3c90f@>
        <@3c911 MainLoopJumpTable+1@>
        <@3c914@>
        <@3c916 Jmp11@>
        <@3c919@>
        <@3c91b@>
        <@3c91d MainLoop@> ; Note: this is actually unconditional

;;; --------------------------------
;;; Jump table below: - TODO - set breakpoints for each, log changes to $40?
;;;   0: two frames between entering name and starting game
;;;   1: main game play
;;;   2: a single frame between title screen and intro movie, also at game over
;;;   3: title screen, intro movie
;;;   4: two frames after killing dyna
;;;   5: ending sequence
;;;   8: three frames on hitting continue
.reloc                               ; smudge from $3c91f to $3c931
OVERRIDE
MainLoopJumpTable:
        .word (MainLoopJump_00_PrepareGame)
        .word (MainLoopJump_01_Game)
        .word (MainLoopJump_02_PrepareTitleScreen)
        .word (MainLoopJump_03_TitleScreen)
        .word (MainLoopJump_04_PrepareEndingSequence)
        .word (MainLoopJump_05_EndingSequence)
        .word [@3c92b:w@]
        .word [@3c92d:w@]
        .word (MainLoopJump_08_ContinueGame)

;;; --------------------------------
.reloc                               ; smudge from $3c931 to $3c939
OVERRIDE
MainLoopJump_02_PrepareTitleScreen:
        <@3c931@>
        <@3c933 BankSwitch16k@>
        <@3c936 MainLoop_PrepareTitleScreen@>
;;; --------------------------------
.reloc                               ; smudge from $3c939 to $3c944
OVERRIDE
MainLoopJump_03_TitleScreen:
        <@3c939@>
        <@3c93b BankSwitch16k@>
        <@3c93e ReadControllersWithRepeat@>
        <@3c941 MainLoop_TitleScreen@>
;;; --------------------------------
.reloc                               ; smudge from $3c944 to $3c94c
OVERRIDE
MainLoopJump_04_PrepareEndingSequence:
        <@3c944@>
        <@3c946 BankSwitch16k@>
        <@3c949 MainLoop_PrepareEndingSequence@>
;;; --------------------------------
.reloc                               ; smudge from $3c94c to $3c957
OVERRIDE
MainLoopJump_05_EndingSequence:
        <@3c94c@>
        <@3c94e BankSwitch16k@>
        <@3c951 ReadControllersWithRepeat@>
        <@3c954 MainLoop_EndingSequence@>
;;; --------------------------------
;;; NOTE: This is a relatively large routine that doesn't need to be
;;; on the fixed page.  We move it out to 3c instead (in savegame.s)
.reloc                          ; smudge off
OVERRIDE
MainLoopJump_00_PrepareGame:
        lda #$3c
        jsr BankSwitch8k_8000
        jmp PrepareGame_3c

.reloc                               ; smudge from $3c9da to $3c9ff
OVERRIDE
MainLoopJump_08_ContinueGame:
        <@3c9da PopulateInitialObjects@>
        <@3c9dd@> ; A000 -> 2E000
        <@3c9df BankSwitch8k_a000@>
        <@3c9e2 CopyCheckpointToMemoryForContinueIndirected@> ; 2fc06
        <@3c9e5 WaitForNametableFlush@>
    .ifdef _DISABLE_SWORD_CHARGE_GLITCH   ; smudge off
        jsr PostInventoryMenu             ; defined in inventory.s
    .else                                 ; smudge on
        <@3c9e8 UpdateEquipmentAndStatus@>
    .endif
        <@3c9eb@> ; 8000 -> 24000
        <@3c9ed BankSwitch16k@>
        <@3c9f0 InitializeStatusBarNametable@>
        <@3c9f3 MAIN_LOOP_GAME@> ; Also GAME_MODE_CHANGE_LOCATION
        <@3c9f5 MainLoopMode@>
        <@3c9f7 GameMode@>
        <@3c9f9@>
        <@3c9fb@>
        <@3c9fe@>

;;; --------------------------------
;;; Loads objects in slots 0..3 from entries 6, 4, 5, and a, respectively.
.reloc                               ; smudge from $3c9ff to $3ca26
OVERRIDE
PopulateInitialObjects:
        <@3c9ff@>
        <@3ca01@>
-        <@3ca03 ObjectActionScript@>
         <@3ca06@>
        <@3ca07 -@> ; $3ca03
        <@3ca09@>
        <@3ca0b PpuMaskShadow@>
        <@3ca0d ScreenMode@>
        <@3ca0f WaitForOAMDMA@>
        <@3ca12@>
-        <@3ca14 InitialObjectsTable@> ; $3ca26
         <@3ca17@>
         <@3ca19 InitialObjectsTable+1@> ; $3ca27
         <@3ca1c@>
         <@3ca1e LoadOneObjectDataInternal@>
         <@3ca21@>
         <@3ca22@>
        <@3ca23 -@> ; $3ca14
        <@3ca25@>

;;; --------------------------------
;;; Maps slot to object data for initial objects (player and sword)
.reloc                               ; smudge from $3ca26 to $3ca2e
OVERRIDE
InitialObjectsTable:
        .byte [@3ca26@],[@3ca27@]
        .byte [@3ca28@],[@3ca29@]
        .byte [@3ca2a@],[@3ca2b@]
        .byte [@3ca2c@],[@3ca2d@]
;;; --------------------------------
