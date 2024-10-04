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


FREE "fe" [$ca2e, $cb84)
;;; --------------------------------
.reloc                               ; smudge from $3cab6 to $3cade
OVERRIDE
MainLoopJump_01_Game:
        <@3cab6 GameMode@>
        <@3cab8@>
        <@3caba +@> ; $3cac3
         <@3cabc@>
         <@3cabe +@> ; $3cac3
          <@3cac0 _3cc2e@>
+       <@3cac3 GlobalCounter@> ; update the global counter
        <@3cac5 GameMode@>
        <@3cac7@>
        <@3cac8@>
        <@3cac9 MainGameModeJumpTable@>
        <@3cacc@>
        <@3cace MainGameModeJumpTable+1@>
        <@3cad1@>
        <@3cad3@>
        <@3cad5 MainGameModeJumpBank@>

        ;; TODO - walking over triggers (e.g. front of oak 1c, mezame)
        ;; slows things down by basically a full frame.  We've seen this
        ;; before but I can't remember what caused it...

        <@3cad8 BankSwitch16k@>
        <@3cadb@>
;;; --------------------------------
.reloc                               ; smudge from $3cade to $3cb2e
OVERRIDE
MainGameModeJumpTable: 
        ;; The bank for these addresses is given by the same offset in $3cb2e
        ;; Most are in the fixed bank, so it loads 0, but some are in banks
        ;; 9 and 7.
        .word (MainGameModeJump_00_Initialize)
        .word (MainGameModeJump_01_LocationChange)
        .word [@3cae2:w@]
        .word (MainGameModeJump_03_DeathAnimation) ; b900 (16k page 09)
        .word (MainGameModeJump_04) ; (subset of 8 it looks like)
        .word [@3cae8:w@]
        .word (MainGameModeJump_06_ItemUseMessage) ; "Status recovered", warp message
        .word (MainGameModeJump_07_TriggerSquareOrTreasureChest)
        .word (MainGameModeJump_08_Normal) ; (includes start menu, oddly)
        .word [@3caf0:w@]
        .word [@3caf2:w@]
        .word [@3caf4:w@]
        .word (MainGameModeJump_0c_DisplayStartMenu) ; 0c: bc40 (16k page 07)
        .word (MainGameModeJump_0d_StartScreen) ; bddb (16k page 07)
        .word [@3cafa:w@]
        .word [@3cafc:w@]
        .word (MainGameModeJump_10_StatusMessage)
        .word (MainGameModeJump_11_Dialog)
        .word (MainGameModeJump_12_Inventory)
        .word (MainGameModeJump_13_StartGameFlash)
        .word (MainGameModeJump_14_TeleportMenu)
        .word (MainGameModeJump_15_TelepathyMenu)
        .word (JumpTable_3ddbd_00) ; related to telepathy, but never used directly
        .word (MainGameModeJump_17_ChangeMagicMenu)
        .word (MainGameModeJump_18_RecoverMagicAnimation) ; bb39 (16k page 09)
        .word (MainGameModeJump_19_ChangeMagicRevertAnimation) ; bb9d (16k page 09)
        .word (MainGameModeJump_1a_SwordInAir) ; bc04 (16k page 09)
        .word (MainGameModeJump_1b_ForgeCrystalis) ; bc6b (16k page 09)
        .word (MainGameModeJump_1c_ErrorMessage) ; "Magic power too low" message
        .word (MainGameModeJump_14_TeleportMenu)
        .word (MainGameModeJump_1e_ThrustCrystalis) ; bdf2 (16k page 09)
        .word (MainGameModeJump_1f_DynaAppears)
        .word (MainGameModeJump_20_ArmorShop) ; (mode 8->20->1->8)
        .word (MainGameModeJump_21_ToolShop)
        .word (MainGameModeJump_22_Inn)
        .word (MainGameModeJump_23_PawnShop)
        .word (MainGameModeJump_24_EmptyShop)
        .word [@3cb28:w@]
        .word [@3cb2a:w@]
        .word [@3cb2c:w@]
.reloc                               ; smudge from $3cb2e to $3cb62
OVERRIDE
MainGameModeJumpBank:
        .byte [@3cb2e@] ; 00
        .byte [@3cb2f@] ; 01
        .byte [@3cb30@] ; 02
        .byte ^MainGameModeJump_03_DeathAnimation >> 1 ; 03 ($09)
        .byte [@3cb32@] ; 04
        .byte [@3cb33@] ; 05
        .byte [@3cb34@] ; 06
        .byte [@3cb35@] ; 07
        .byte [@3cb36@] ; 08 TODO - consider preloading a bank?
        .byte [@3cb37@] ; 09
        .byte [@3cb38@] ; 0a
        .byte [@3cb39@] ; 0b
        .byte ^MainGameModeJump_0c_DisplayStartMenu >> 1 ; 0c ($07)
        .byte ^MainGameModeJump_0d_StartScreen >> 1 ; 0d ($07)
        .byte [@3cb3c@] ; 0e
        .byte [@3cb3d@] ; 0f
        .byte [@3cb3e@] ; 10
        .byte [@3cb3f@] ; 11
        .byte [@3cb40@] ; 12
        .byte [@3cb41@] ; 13
        .byte [@3cb42@] ; 14
        .byte [@3cb43@] ; 15
        .byte [@3cb44@] ; 16
        .byte [@3cb45@] ; 17
        .byte ^MainGameModeJump_18_RecoverMagicAnimation >> 1 ; 18 ($09)
        .byte ^MainGameModeJump_19_ChangeMagicRevertAnimation >> 1 ; 19 ($09)
        .byte ^MainGameModeJump_1a_SwordInAir >> 1 ; 1a ($09)
        .byte ^MainGameModeJump_1b_ForgeCrystalis >> 1 ; 1b ($09)
        .byte [@3cb4a@] ; 1c
        .byte [@3cb4b@] ; 1d
        .byte ^MainGameModeJump_1e_ThrustCrystalis >> 1 ; 1e ($09)
        .byte [@3cb4d@] ; 1f
        .byte [@3cb4e@] ; 20
        .byte [@3cb4f@] ; 21
        .byte [@3cb50@] ; 22
        .byte [@3cb51@] ; 23
        .byte [@3cb52@] ; 24
        .byte [@3cb53@] ; 25
        .byte [@3cb54@] ; 26
        .byte [@3cb55@] ; 27
        .byte [@3cb56@],[@3cb57@],[@3cb58@],[@3cb59@],[@3cb5a@],[@3cb5b@],[@3cb5c@],[@3cb5d@],[@3cb5e@],[@3cb5f@],[@3cb60@],[@3cb61@]
;;; --------------------------------
;;; Normal mode: player is moving on the main map.  This runs nearly every frame.
.reloc                               ; smudge from $3cb62 to $3cb84
OVERRIDE
MainGameModeJump_08_Normal:

    .ifdef _CHECK_FLAG0          ; smudge off
        ;; Note: this is a debugging aid added to determine if anything
        ;; is accidentally setting flag 0.  It should not make a difference, 
        jsr CheckFlag0           ; defined in flags.s
    .endif

    .ifdef _CTRL1_SHORTCUTS
        jsr ReadControllersWithButtonUp
    .else                        ; smudge on
        <@3cb62 ReadControllersWithDirections@>
    .endif

    .ifdef _UPDATE_HUD           ; smudge off
        jsr CheckToRedisplayUI
    .endif                       ; smudge on

        <@3cb65 CheckForPlayerDeath@>
        <@3cb68 CheckPassiveFrameEffects@> ; 3ef55
        <@3cb6b _3cccc@>
        <@3cb6e _3e8f6@>
        <@3cb71@>
        <@3cb73 BankSwitch16k@>
        <@3cb76 DrawAllObjectSpritesInternal@>

        ;; NOTE: Replace the 16k bank swap to 0d (i.e. 1a/1b) with a
        ;; single 8k swap to 3c (the second swap to 1b will happen
        ;; later). This precedes the call to CheckAllObjectCollisions
        ;; so that we can call into segmentd 3c.
        lda #^CheckAllObjectCollisions    ; smudge off
        jsr BankSwitch8k_8000
        
        ;; lda #$0d                             ; smudge on
        ;; jsr BankSwitch16k

        <@3cb7b CheckAllObjectCollisions@>
        <@3cb81 AnimateBackgroundAndRespawn@>
