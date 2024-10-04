;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to location change routines, including both normal exits and
;;; warps/teleports/wild warp:
;;;  1. Add a twelfth warp point
;;;  2. Set warp points on entering location, rather than by trigger
;;;     - specifically, these flags are now handled with a table
;;;  3. Optionally disable wild warp
;;;  4. Allow teleporting out of tower and boss fights (optionally)
;;;  5. Repurposes a second entry point into ReloadNpcDataForCurrentLocation
;;;     to just ReloadLocationGraphics (but not respawn everything).
;;;  6. Add an import for configuring thunder sword warp

.segment "fe", "ff"

FREE "fe" [$ca2e, $ca5f)

.reloc                               ; smudge from $3ca2e to $3ca5f
OVERRIDE
MainGameModeJump_01_LocationChange:
        <@3ca2e _3e3e9@>
        <@3ca31@> ; 8000 -> 34000
        <@3ca33 BankSwitch8k_8000@>
        <@3ca36@> ; object = player
        <@3ca38 ReadObjectCoordinatesInto_34_37@>
        <@3ca3b@> ; update $380,x
        <@3ca3d CheckTerrainUnderObject@>
        <@3ca40@>
        <@3ca42 ScreenMode@> ; display mode: normal
        <@3ca44@>
        <@3ca47@>
        <@3ca4a@> ; remove "slow" bit from player
        <@3ca4c@>
        <@3ca4f GAME_MODE_NORMAL@>
        <@3ca51 GameMode@>
        <@3ca53@> ; check exit type
        <@3ca55@>
        <@3ca57@>
        <@3ca59 +@> ; $3ca5e ; most types just return back to the main loop
         <@3ca5b MainLoopJump_01_Game@> ; warp: skip the holding pattern
         ;; ----
+       <@3ca5e@>
;;; --------------------------------


.ifdef _TWELFTH_WARP_POINT
;;; Remove 9 (5-byte) lines from the nametable write table
FREE "fe" [$c5c2, $c5ef)

.reloc
StageWarpMenuNametableWrite:
  ;; 20=a8, 21=DATA, 22=09, 23=00, 24=01
  <@3ce21@>
  <@cad8@>
  <@15c9e@>
  <@168e7@>
  <@1c080@>
  <@1c177@>
  stx $23
  <@1c30f@>
  <@18361@>
  ;bne StageCustomNametableWrite ; uncond
StageCustomNametableWrite:  ; NOTE: was before the prev block
  <@18379 FlushNametableDataWrite@>
  <@18387@>
  <@18c37@>
  jmp $c4b8  ; resume into the middle of StageNametableWrite

.reloc
WarpMenuNametableData:
  .byte [@18cd4@],[@18d2c@],[@18e3e@],[@1914b@],[@19255@],[@19a46@],[@19b5f@],[@19c4b@],[@19d55@],[@1a387@],[@1b224@],[@1b68b@]

.org $dc7b
  <@1c2ef@>  ; $0c is the first invalid slot (probably could just nop here)

.org $dd40
  <@1ecc7@>  ; start drawing menu at $b

.org $dd4b
  <@378ba@>
  <@378cd WarpMenuNametableData@>
  <@378ce StageWarpMenuNametableWrite@>
.assert * = $dd53

.org $dd59
  <@37cb3@>  ; lower offset, start at 2f4 instead of 2f5
.endif ; _TWELFTH_WARP_POINT


.reloc
;;; Code to run on new location just before spawning NPCs
;;; TODO - this might want to move out to a different file?
LocationChangePreSpawnHook:
    .ifdef _WARP_FLAGS_TABLE
  <@37cd9 SetWarpFlagForLocation@>
    .endif
  jmp $e144 ; LoadNpcDataForCurrentLocation


.ifdef _WARP_FLAGS_TABLE
.pushseg "0a", "0b", "fe", "ff"
;;; We remove the triggers that set the warp flags and instead
;;; iterate over a simple table to find what flags should be set.
;;; This could be made more general by (1) using a jump table or
;;; address (with potential argument stored in A), (2) making a
;;; general script that runs at all location changes, and/or
;;; (3) leveraging the trigger table to get the effects.
;;; Triggers are difficult to use, however, and we don't really
;;; have any other use cases for now, so we'll go the easy route.

;; .import TownWarpTable
;; .org $dc8c
;;   lda TownWarpTable,y

.ifdef _TWELFTH_WARP_POINT
.define FIRST_WARP_POINT $f4
;.define INITIAL_MASK $10
.else
.define FIRST_WARP_POINT $f5
;.define INITIAL_MASK $20
.endif

.org $e6ff
  <@37d16 LocationChangePreSpawnHook@>
.reloc
SetWarpFlagForLocation:
  ;; Iterate over the warp points to see if the new location is one
  <@3c7ab@>
  <@3c7d6 FIRST_WARP_POINT@>
-  <@3cb09 $dc58-FIRST_WARP_POINT@> ; TownWarp entry
   <@3cb94 +@>
   <@3cd2b@>
  <@3cd2e -@>
- <@3cd30@>
  ;; At this point, we need to set flag $200|x
+ <@3cd80@>
  <@3db8e@>
  <@3dd63@>
  <@3e337@>
  <@3e361@>
  <@3e3cb@>
  <@3e3cc@>
  <@3e4c9@>
  <@3e717@>
  <@3e9e4 PowersOfTwo@>
  sta $64c0,x
  <@3ea57 -@> ; unconditional

;;; Alternative version: 37 bytes (2 more than previous)
;;   ldx #$fe
;;   lda #INITIAL_MASK
;;   sta $10  ; overwritten in LoadNpcDataForCurrentLocation anyway
;;   ldy #0
;; -   lda $dc58,y
;;     cmp $6c
;;     beq @FoundLocation
;;     asl $10
;;    bcc -
;;    rol $10
;;    inx
;;   bne -
;; - jmp $e144
;;   lda $63e0,x
;;   ora $10
;;   sta $63e0,x
;;   bne -

.popseg
.endif ; _WARP_FLAGS_TABLE


.ifdef _DISABLE_WILD_WARP
.org $cbc7
  <@3ea5e@>
.endif

.ifdef _ALLOW_TELEPORT_OUT_OF_BOSS
.org $db30
  <@3f4eb@>         ; don't jump
  <@3f4ec@>
.endif

.ifdef _ALLOW_TELEPORT_OUT_OF_TOWER
.org $db38
  <@3f4ed@>         ; don't jump away to prevent warp, just goto next line
  <@3f4ee@>

;; Make sure the down stair always spawns outside Mesia's room
.pushseg "1b", "fe", "ff"
.org $a48f
  <@1e545@>  ; player y hi
  <@2818f@>  ; player y lo
  <@35b2e@> ; set carry if below 2nd tile
  <@35c25 0@>   ; add carry bit if needed
  <@35c30@>      ; y is row to start clearing flags for
  ;; if we have crystalis then unlock from 0
  <@364a0@>
  <@364a3 4@>
  <@364a5 +@>
    <@364ad 0@>
  ;; set all the flags from y down to the bottom
+ <@364bd@>
  <@364c3 +@>  ; (while ... do) instead of (do ... while)
-  <@3c766@>
   <@3c780@>
+  <@3c78f 4@>
  <@3c7e0 -@>
  ;; if we're on the top screen (5c) then double-return
  <@3c89e@>
  <@3649c@>
  <@3649e +@>
   <@364aa 0@>
   <@364ac@>
   <@364af@>
   <@364b0@>
   ;; TODO - do we still need to call SpawnTowerEscalator here?
+ <@364b1@>
FREE_UNTIL $a4c6 ; currently saves ~12 bytes?
.popseg

.endif


;;; Repurpose $7e148 to skip loading NPCs and just reset pattern table.
;;; The only difference from $7e144 is that $18 gets set to 1 instead of 0,
;;; but this value is never read.  Start by changing all jumps to $7e148
;;; to instead jump to $7e144.  Then we grab some space and have a nonzero
;;; value in $18 return early.  This is in ReadMapDataGraphicsTable.
.org $e19a  ; in the middle of CheckForNpcSpawn
  <@1fd51@>
  <@1fdeb $e1ae@> ; >rts
  <@1fea7@>  ; npc[1]: sign bit indicates a timer spawn
  <@2002e@>
  <@20180@>
  <@202df $e1af@> ; skip the rts
  <@3e110@> ; TryNpcSpawn
  <@3e122@>
  <@3e1ab@> ; Check next NPC spawn.
FREE_UNTIL $e1ae

.ifndef _WARP_FLAGS_TABLE ; Note: _WARP_FLAGS_TABLE patches this differently.
.org $e6ff
  jmp $e144
.endif


;;; Import thunder sword warp info
.import thunderSwordWarpLocation, thunderSwordWarpEntrance
.org $d5c9
  <@3e246 thunderSwordWarpLocation@>
.org $d5cd
  <@3e256 thunderSwordWarpEntrance@>
