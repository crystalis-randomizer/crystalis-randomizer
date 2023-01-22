;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; We rearrange the HUD a bit to make better use of space and
;;; make room to accommodate the enemy HP bar.

.segment "12", "13", "fe", "ff"  ;.bank $24000 $8000:$4000

.ifdef _UPDATE_HUD

;; Overwrite the StatusBarDataTable with the new UI tile layout
.org $badb
  .byte $80,$20,$20,$20 ; Lf _ _ _
.org $baee
  .byte $83,$00,$00,$20 ; Lv 0 0 _
  .byte $9c             ;  $

.org $bafb
  ;; on this row we shifted most everything left by three tiles
  ;; It should be possible to use .move to shift everything over,
  ;; but it didn't really work when tested
  .byte $81,$8f,$8f,$8f ; Pw > > >
  .byte $8f,$8f,$8f,$8f ;  > > > >
  .byte $93,$95,$94     ; (1) lit up
  .byte $90,$91,$92     ; (_) not lit up
  .byte $90,$91,$92     ; (_) not lit up
  .byte $20,$20         ;  _ _
  .byte $84,$20,$20,$20 ; Dl _ _ _
  .byte $86,$20,$20,$20 ; Ex _ _ _
  .byte $20,$20,$1f     ;  _ _ |

.org $bb1b
; clear out the experience count thats there initially
; and make room for other status updates
  .res 12, $20          ; 12 blanks
  ; hold spots here for the enemy hp amount and name
  .byte $20,$20,$20,$20 ; _ _ _ _
  .byte $20,$20,$20,$20 ; _ _ _ _
  .byte $85,$20,$20,$20 ; Mp _ _ _
  .byte $9d,$20,$20,$20 ;  / _ _ _

.else
  ;; Even if we're not fully-updating the HUD, we still remove the
  ;; "next EXP" display in favor of a decreasing count, so we delete
  ;; the "/00000" from the display and replace it with spaces.
.org $bb26
  .byte $20,$20,$20,$20,$20,$20
.endif ; _UPDATE_HUD

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

.ifdef _UPDATE_HUD
;; Move the position of the main UI number elements
.org $8ec7 ; Lv
  .byte $36,$2b
.org $8ecd ; Money
  .byte $3a,$2b
.org $8ed3 ; Experience
  .byte $5a,$2b
.endif ; _UPDATE_HUD

;;; NumericDisplays
.org $8ed7  ; 03 - was Exp Left, now its Max MP
  .word (PlayerMaxMP)
  .byte $7b,$2b,$02,$00 ; copied from $34ee3
.org $8ee3  ; 05 - was Max MP, now its Enemy Curr HP
  .word (RecentEnemyCurrHP)
  .byte $64,$2b,$02,$40
.org $8ee9  ; 06 - was LV(menu) but now it's difficulty
  .word (Difficulty)
.ifdef _UPDATE_HUD
  .byte $56,$2b,$03,$00 ; display left of exp
.else
  .byte $3c,$2b,$03,$00 ; display right of lvl
.endif

.org $8f19  ; 0e - was unused, now it's LV(menu)
  .word (PlayerLevel)
  .byte $29,$29,$03,$00 ; copied from $34ee9
.org $8f1f  ; 0e - was unused, now it's Enemy Max HP
  .word (RecentEnemyMaxHP)
  .byte $68,$2b,$02,$40 ; copied from $34ee9

.pushseg "13", "fe", "ff"
.org $baca
InitializeStatusBarNametable:
.ifdef _ENEMY_HP
  jsr RedrawEnemyHPDisplayAfterClear
.endif ; _ENEMY_HP
  lda #%01011111 ; update all 5 status display (including difficulty)
  jsr UpdateStatusBarDisplays
  jmp FlushNametableDataWrite ; WaitForNametableFlush
FREE_UNTIL $bad9

.ifdef _ENEMY_HP
.reloc
RedrawEnemyHPDisplayAfterClear:
  ; This is called in a few places.
  ; When loading the game, this is called to draw the inital status bar
  ; This should clear the display because the RAM will be clear on game start
  ; When in the DYNA fight, this function is called after the DYNA drawing
  ; routine will overwrite the statusbar with garbage, so we can force a redraw
  ; of the current enemy by setting the previous slot to 0
  lda #0
  sta PreviousEnemySlot
  jmp UpdateEnemyHPDisplay
  ; implicit rts
.popseg ; 13/fe/ff

.pushseg "1a", "1b", "fe", "ff"
.org $e486
  jsr WaitForNametableFlushDuringLoad

.reloc
WaitForNametableFlushDuringLoad:
  jsr $9cef ; Do the original handler for location change
  jmp FlushNametableDataWrite
.popseg ; 1a/1b/fe/ff

.pushseg "fe", "ff"  ; needs to be accessible from multiple banks

.reloc
ClearCurrentEnemyHP:
  ldy #0
  sty PreviousEnemySlot
  sty RecentEnemyCurrHPHi
  sty RecentEnemyCurrHPLo
  sty RecentEnemyMaxHPLo
  sty RecentEnemyMaxHPHi
  sty RecentEnemyObjectId
  lda #$1c ; [=] bar character
  ldy #ENEMY_NAME_BUFFER_SIZE - 1
-   sta $6000 + ENEMY_NAME_VRAM_BUFFER_OFFSET,y
    dey
  bpl -
  lda #$20 ; space tile
  ldy #$09
-   sta $6000 + ENEMY_HP_VRAM_BUFFER_OFFSET,y
    dey
  bpl -
  lda #ENEMY_HP_VRAM_UPDATE
  jsr StageNametableWriteFromTable
  lda #ENEMY_NAME_VRAM_UPDATE
  jmp StageNametableWriteFromTable

.reloc
ClearCurrentEnemyHPSlot:
  ; if the current slot is already cleared out then theres nothing to do
  lda CurrentEnemySlot
  beq +
    lda #0
    sta CurrentEnemySlot
    lda ShouldRedisplayUI
    ora #DRAW_ENEMY_STATS
    sta ShouldRedisplayUI
+ rts
.endif ; _ENEMY_HP
.popseg ; fe/ff

.pushseg "1a", "fe", "ff"
;;; Calls DisplayNumberInternal for each of the bits in A as follows:
;; [in] A - bit mask for the different displays to update
;; [scratch] X - could push X if needed later
;; The following values are used in the randomizer for this
;; 0 - Level
;; 1 - Money
;; 2 - Exp
;; 3 - Max MP
;; 4 - MP
;; 5 - Enemy HP
;; 6 - Difficulty
.reloc
UpdateStatusBarDisplays:
  ldx #$07
-   rol
    bcc +
      pha
        txa
        jsr DisplayNumberInternal
      pla
+   dex
  bpl -
  rts
.popseg

.ifdef _UPDATE_HUD
;;; HP / Force bar display
;; Overwrites the tile position used by the nametable update buffer to move the tiles
.org $8d1f
  lda #$23 ; Subtracted 3 from the original value to move the player HP bar to the left
.org $8db2
  lda #$43 ; Subtracted 3 from the original to move the force bar to the left
.endif


.segment "fe", "ff"

.ifdef _UPDATE_HUD
.org $cb65  ; inside GameModeJump_08_Normal
  jsr @CheckToRedisplayUI ; was jsr CheckForPlayerDeath

.reloc
@CheckToRedisplayUI:
  lda ShouldRedisplayUI
  beq @CheckEnemyDespawned
  lsr ShouldRedisplayUI
  bcc +
    lda #$06
    jsr DisplayNumber
+ 

.ifdef _ENEMY_HP
  lsr ShouldRedisplayUI
  bcc @CheckEnemyDespawned
    jsr UpdateEnemyHPDisplay
    bne @Exit ; unconditional (no need to check enemy despawn)
.endif ; _ENEMY_HP

; Check to see if the current enemy slot is nonzero, but the action script
; is zero, if so, then its despawned and we can delete it.
@CheckEnemyDespawned:
.ifdef _ENEMY_HP
  ldx CurrentEnemySlot
  beq @Exit
    lda ObjectActionScript,x
    bne @Exit
      sta CurrentEnemySlot
      jsr UpdateEnemyHPDisplay
.endif ; _ENEMY_HP

@Exit:
  jmp CheckForPlayerDeath
.endif


.ifdef _ENEMY_HP
;; Clear out the SRAM that stores the enemy HP data
.org $f39f ; Patches on cold/warm boot
  jsr PatchClearEnemyHPRam
.reloc
PatchClearEnemyHPRam:
  lda #0
  ldy #EnemyHPRamLen-1 ; - 1 to account for bpl
-   sta EnemyHPRamStart,y
    dey
    bpl -
  jmp $f0a4 ; ValidateSaveFiles
.endif
