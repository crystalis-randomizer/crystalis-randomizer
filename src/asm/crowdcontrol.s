;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

; .ifdef _CROWD_CONTROL_

.segment "fe", "ff"

; these should be set in messages.ts
.import LevelDownMessagePart, LevelDownMessageId
;;; Hook into the main loop right after the other hooks
;;; so it shouldn't affect anything else (this is only after input is read)
.org $cb68
  jsr HandleCrowdControl

.reloc
HandleCrowdControl:
  lda CrowdControlFlag
  ; check if theres even anything in the queue
  beq @continue
    lda CrowdControlQueue
    ldx #$08 ; we pre decrement so start at 8
    ; check each bit one at a time for sfx
@loop:
      dex
      bmi @finalize
      asl
      bcc @loop
  pha
    ; x has the offset for the crowd control main function
    txa
    pha
      jsr RTSJumpSubroutine
    pla
    tax
  pla
  ; if theres any other actions queued it'll be nonzero
  bne @loop
@finalize:
  ldx CrowdControlFlag
  lda #0
  sta CrowdControlFlag
  sta CrowdControlQueue
  txa
  ; if the high bit 7 is set (ie minus) then we should double return instead of continuing
  bpl @continue
    pla ; double return
    pla
    rts
@continue:
  jmp HandleStatusConditions

.reloc
RTSJumpSubroutine:
  asl
  tay
  lda CrowdControlMainOpRTSTable+1,y
  pha
  lda CrowdControlMainOpRTSTable,y
  pha
  rts

CrowdControlMainOpRTSTable:
  .word (UpdateStatusBar-1)
  .word (DoWildWarpToFirstLocation-1)
  .word (ForcePlayerLevelUp-1)
  .word (ForcePlayerLevelDown-1)

.reloc
ForcePlayerLevelUp:
  lda PlayerLevel
  and #$f0
  beq +
    ; player is already max level so don't level up
    rts
+
  inc PlayerLevel
  jmp UpdateEXPAfterForcedLevel

.reloc
ForcePlayerLevelDown:
  lda PlayerLevel
  cmp #1
  bne +
    ; player is already level 1 and can't go down
    rts
+
  dec PlayerLevel
  jsr UpdateEXPAfterForcedLevel

  ; cap the player HP/MP to max
  lda PlayerMaxHP
  cmp PlayerHP
  bpl +
    ; player has more HP than max so set it to max
    sta PlayerHP
+ lda PlayerMaxMP
  cmp PlayerMP
  bpl +
    ; player has more MP than max so set it to max
    sta PlayerMP
+
  ; The message for level down is set in misc shuffle text changes
  ; so just load the fixed ID here.
  lda #LevelDownMessageId
  sta $06c3
  lda #LevelDownMessagePart
  sta $06e3
  rts

.reloc
; This method forces the EXP to be the next level instead of taking
; the current exp and adding it in.
UpdateEXPAfterForcedLevel:
  lda $6e
  pha
    lda $6f
    pha
      lda #$1a
      jsr BankSwitch8k_8000
      lda #$1b
      jsr BankSwitch8k_a000
      lda PlayerLevel
      asl  ; note: clears carry
      tay
      lda $8b9e,y
      sta PlayerExp
      lda $8b9f,y
      sta PlayerExp+1
      jsr UpdateStatsAfterLevelChange
  jmp RestoreBanks
  ; 2x implicit pla
  ; implicit rts

.reloc
UpdateStatusBar:
  lda $6e
  pha
    lda $6f
    pha
      lda #$1a
      jsr BankSwitch8k_8000
      lda #$1b
      jsr BankSwitch8k_a000
      lda #%01011111 ; update all 5 status display (including difficulty)
      jsr UpdateStatusBarDisplays
      jsr UpdateHPDisplayInternal
      jmp RestoreBanks
  ;rts

.reloc
; We can't reuse the original code because we need to do Crowd Control cleanup
; before returning, and we want to fix it to only WW to the first location.
DoWildWarpToFirstLocation:
  lda CrowdControlFlag
  ora #%10000000
  sta CrowdControlFlag
  ldy #0
  lda WildWarpLocations,y
  sta CurrentLocation
  lda #$00
  sta CurrentEntrance
  lda #GAME_MODE_CHANGE_LOCATION
  sta GameMode
  rts

; .endif

