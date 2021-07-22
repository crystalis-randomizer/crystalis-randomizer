;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

.import CrowdControlRunLevelUp

; .ifdef _CROWD_CONTROL_
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
      bcs @handle_op
      bcc @loop
@handle_op:
  pha
    ; x has the offset for the crowd control main function
    txa
    pha
      asl
      tay
      ; $10,11,12 is used for jump points, it seems to be always overwritten
      ; before use, so its fine to reuse here
      lda #OP_JMP_ABS
      sta $10
      lda CrowdControlMainOpTable,y
      sta $11
      lda CrowdControlMainOpTable+1,y
      sta $12
      jsr $10
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
  sta CrowdControlStatusBarUpdate
  txa
  ; if the high bit 7 is set (ie minus) then we should double return instead of continuing
  bpl @continue
    pla ; double return
    pla
    rts
@continue:
  jmp HandleStatusConditions

CrowdControlMainOpTable:
.word (UpdateStatusBar)
.word (DoWildWarp)

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
      lda CrowdControlStatusBarUpdate
      bpl @update_numeric
        ; if the high bit 7 is set, then we want to update player HP as well
        jsr UpdateHPDisplayInternal
@update_numeric:
      and #%00000001
      bne @skip_level_up
        jsr CrowdControlRunLevelUp
        jsr UpdateHPDisplayInternal
        jmp RestoreBanks
    @skip_level_up:
      jsr UpdateStatusBarDisplays
      jmp RestoreBanks
  ;rts

.reloc
; We can't reuse the original code because we need to do Crowd Control cleanup
; before returning.
DoWildWarp:
  lda CrowdControlFlag
  ora #%10000000
  sta CrowdControlFlag
  lda $0780
  and #$0f
  tay
  lda WildWarpLocations,y
  sta CurrentLocation
  lda #$00
  sta CurrentEntrance
  inc $0780
  lda #GAME_MODE_CHANGE_LOCATION
  sta GameMode
  rts

; .endif
