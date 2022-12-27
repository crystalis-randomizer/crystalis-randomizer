;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

.ifdef _STATS_TRACKING

;;; First step: patch into the NMI handler

.pushseg "fe","ff"
.reloc
@IncStatTimer:
  inc StatTimerLo
   bne +
   inc StatTimerMd
    bne +
    inc StatTimerHi
+ lda $2002  ; Clear the NMI flag (copied from f3b7)
  rts
.org $f3b7
  jsr @IncStatTimer


; Make sure the stats doesn't bleed into the checksum for save files
; .assert StatTrackingBase + PERMANENT_LENGTH + CHECKPOINT_LENGTH * 2 < $70f0

;;;------------------------
;
; Patch locations and general changes for supporting stat tracking

.pushseg "0f"

; Added this to PatchStartItemGet
; X,Y Registers do NOT need to be preserved as they are all reloaded afterwards
; A needs to remain the original ID
.reloc
CheckForStatTrackedItems:
  ; [in] a - current item id (also stored in $29).
  inc StatsChecks
  lda $29 ; reload the item to restore the minus flag (set by a cmp earlier)
  bmi @Exit
  cmp #$05 ; check to see if its a sword (items $00 - $04) are wind - crystalis
  bmi @Sword
  cmp #$48
  beq @Flight
  cmp #$3e
  beq @BowOfMoon
  cmp #$3f
  beq @BowOfSun
  cmp #$40
  beq @BowOfTruth
@Exit:
  rts
@Sword:
    clc
    adc #TsWindSword
    bpl @AddTimestampAndExit ; unconditional
@Flight:
    lda #TsFlight
    bpl @AddTimestampAndExit ; unconditional
@BowOfSun:
    lda #TsBowSun
    bpl @AddTimestampAndExit ; unconditional
@BowOfMoon:
    lda #TsBowMoon
    bpl @AddTimestampAndExit ; unconditional
@BowOfTruth:
    lda #TsBowTruth
    ; fallthrough
@AddTimestampAndExit:
    jsr AddTimestamp
  ; reload the original item ID into A and Y
  lda $29
  tay
  rts

; Patch ObjectActionJump_6f (boss death) to add a timestamp for their death
.org $b825
  jsr SetBossDeathTimestamp

.reloc
SetBossDeathTimestamp:
  ; do the original action at the place we patched
  sta $0600,x
  ; Check if its one of the bosses we do not track (and were replaced with bows)
  cpy #TsBowMoon
  beq @Exit
  cpy #TsBowSun
  beq @Exit
  cpy #TsBowTruth
  beq @Exit
  cpy #TsComplete
  beq @Exit
  ; A = Y, x is obj index, y is the boss id
  pha
    txa
    pha
      tya
      jsr AddTimestamp
    pla
    tax
  pla
  tay
@Exit:
  rts

;;;
; Writes the current timestamp to SRAM.
; [In a] - index of the type of timestamp to write
; Notice this does NOT preserve registers!
.reloc
AddTimestamp:
  ldx TimestampCount
  sta TimestampTypeList,x
  asl ; clears carry
  adc TimestampTypeList,x
  tax
  ; double read the timestamp. this prevents an issue where reading is interrupted by NMI
  ; keep the lo value in X so we can check if it changed and read again if it does
-   ldy StatTimerLo
    tya
    sta TimestampList,x
    lda StatTimerMd
    sta TimestampList + 1,x
    lda StatTimerHi
    sta TimestampList + 2,x
    cpy StatTimerLo
    bne -
  inc TimestampCount
  rts
.popseg ; "0f"

.pushseg "13"
.org $be54
  jsr PatchGameCompleted
.popseg ; 13

.pushseg "fe", "ff"
.reloc
PatchGameCompleted:
  ; original code
  jsr RequestAttributeTable0Write
  lda $6f
  pha
    lda #$0f
    jsr BankSwitch8k_a000
    lda #TsComplete
    jsr AddTimestamp
  pla
  jmp BankSwitch8k_a000
.popseg ; fe,ff

.pushseg "17"
ComputeChecksumForCheckpoint = $bd92
CopyExtraStateFromCheckpoint = $bd60

.org $bc60
  jsr SaveStatsToCheckpoint

.org $bcc5
  jsr LoadStatsFromCheckpoint

.reloc
SaveStatsToCheckpoint:
  ldx #CHECKPOINT_LENGTH-1
-   lda CheckpointBase,x
    sta CheckpointBase+CHECKPOINT,x
    dex
    bpl -
  jmp ComputeChecksumForCheckpoint

.reloc
LoadStatsFromCheckpoint:
  ldx #CHECKPOINT_LENGTH-1
-   lda CheckpointBase+CHECKPOINT,x
    sta CheckpointBase,x
    dex
    bpl -
  jmp CopyExtraStateFromCheckpoint

.popseg ; "17"

.pushseg "fe", "ff"

;; On continue with a new game, we need to reset the NMI counter
;; TODO - I removed this code because it has weird interations with loading from a save file
;;    after continuing from a different save. Just too much of a headache
;; We can use the fact that if a save file was reset, the game sets $7001 to $ff
;; It later overwrites this, but we can just store that in another spot
; ValidateSaveFiles = $f0a4

HandleColdBoot = $f374
HandleWarmBoot = $f39f

.org $f36d
  ; jmp instead of jsr because the main loop never returns
  jmp PatchResetWarmBootCheck
FREE_UNTIL $f374

.reloc
PatchResetWarmBootCheck:
  lda $0184
  cmp #$4f
  bne +
    ; the reset was a warm boot, so we want to increase the reset counter
    inc StatsResets
    jmp HandleWarmBoot
+ jmp HandleColdBoot

; .reloc
; ValidateSaveFilesAndSetFlag:
;   lda #0
;   sta $7000
;   jsr ValidateSaveFiles
;   lda $7001
;   sta $7000
;   rts

; .org $c9da
;   jsr CheckForResetSavefile

; .reloc
; CheckForResetSavefile:
;   lda $7000
;   bpl +
;     ; If the checkpoint file was reset, then we want to reset the timer as its a new game
; + jmp PopulateInitialObjects

;; Reset the saved stats tracking if the checkpoint is invalid
FinishSaveFileValidations = $f1c7
.org $f23a
  jmp ResetStatsCheckpoint

.reloc
ResetStatsCheckpoint:
  ; Deal with an off by one error from bne
  ; by adding one to the length and copying to minus one
  ldx #CHECKPOINT_LENGTH * 2 + 1
  lda #$00
-   sta CheckpointBase-1,x
    dex
    bne -
  jmp FinishSaveFileValidations

.popseg ; "fe", "ff"

;;; -----------------------
; THE END Credits scene drawing

.pushseg "10", "11"


NAMETABLE_ADDR = $2800

CreditWriteNametable = $a81c
WriteOAMDataFromTable = $a9d7

.org $a19c
  .word (DrawStatsToNMT2)

;; Patch the end credits main loop to check for the start button and skip to the end
;; if its pressed
.org $a14a
  jsr CheckForStartAndSkip

.reloc
CheckForStartAndSkip:
  lda $43 ; currently pressed 
  cmp #$10 ; start
  beq @SkipToTheEnd
    ; start isn't pressed so return
    lda $60e
    rts
@SkipToTheEnd:
  lda $0600 ; check current scene to see if we can skip
  cmp #$1b
  bcc +
    ; current scene is after where we skip to so return early
    lda $60e
    rts
  ; skip ahead to loading the final scene, but fade out first
+ lda #$1b
  sta $0600 ; Scene
  lda #2    ; Fade out
  sta $0602 ; Credits Mode
  lda #$00  ; 0 frames
  sta $0604
  lda #$01  ; 1 second
  sta $0605
  ; double return so we skip any of this frame's scene
  pla
  pla
  rts

; Force this part to be in $8000 bank so we can reuse $3d (expanded bank with enemy name info)
.pushseg "10"
.reloc
;; Instead of just waiting for the timer, redraw the background into a second nametable
DrawStatsToNMT2:
  ; start by drawing the the same background in CreditScene_19
  lda $b304
  sta $88
  lda $b305
  sta $89
  lda #$00
  sta $8a
  lda #$28
  sta $8b
  jsr CreditWriteNametable
  jsr FlushNametableDataWrite
  ; in case we got here through skipping the credits, then we need to draw the mesia/simea sprites
  lda #$04 ; sprite index
  sta $063e
  lda #$05 ; simea mesia sprite
  jsr WriteOAMDataFromTable
  lda #$8c ; sprite index
  sta $063e
  lda #$07 ; THE END sprite
  jsr WriteOAMDataFromTable

  jsr UpdateAttributeTable
  ; switch to a spare code bank to store the bulk of the code to use
  lda $6f
  pha
    lda #$3d
    jsr BankSwitch8k_a000
    jsr DrawAllStats
  pla
  sta $6f
  jsr BankSwitch8k_a000
  rts

.reloc
; This has to happen while "11" is in the A000 bank so we can read the original attribute data
; We will add the update header later in DrawAllStats
UpdateAttributeTable:
  ldx #$40
- txa
  and #$07
  cmp #$04
  bmi @SetToFF
  beq @SetTox3x3
  ; Otherwise just store the original byte
  lda $b3f8,x
  sta $6040,x
  dex
  bpl -
  rts
@SetTox3x3:
  ; if we are on a boundary attribute (between the hud and the tiles)
  ; then we need to load the original value and OR it with $33
  ; (set the left two quadrantss to palette 3)
  lda $b3f8,x
  ora #$33
  sta $6040,x
  dex
  bpl -
  rts
@SetToFF:
  lda #$ff
  sta $6040,x
  dex
  bpl -
  rts

.popseg ; "10"

.pushseg "3d"

.define Remainder  $a0
.define Dividend   $a3
.define Divisor    $a6
.define DivTmp     $a9

.define Hex0        $b0
.define DecOnes     $b1
.define DecTens     $b2
.define DecHundreds $b3

.define TmpHoursOnes   $90
.define TmpMinutesOnes $91
.define TmpMinutesTens $92
.define TmpSecondsOnes $93
.define TmpSecondsTens $94

.reloc
DrawAllStats:
  ; Start by drawing the border and background
  jsr DrawBox
  jsr FlushNametableDataWrite
  jsr DrawBasicStats
  jsr FlushNametableDataWrite
  jsr DrawTimestamps
  jsr FlushNametableDataWrite

  ; go ahead and do some bank switching to add the letters to the CHR tile bank
  lda #$3c ; Menu/HUD CHR bank
  sta $07f0

  ; set scroll to nametable 2
  lda #0
  sta $02
  sta $03
  sta $04
  lda #$01
  sta $05
  ; Pause the music just in case we skipped here from pushing start
  lda #$a4
  jsr StartAudioTrack
  ; and done! Bump $600 to go to the final scene
  inc $0600
  rts

.reloc
DrawBox:

  ; space is tight in segment "10", "11" so we copied the attribute data while they are banked in
  ; but now we can write buffer update headers
  jsr DisableNMI
  ldx NmtBufWriteOffset
  lda #>NAMETABLE_ADDR + $03
  sta $6200,x
  lda #<NAMETABLE_ADDR + $c0
  sta $6201,x
  lda #$40
  sta $6202,x
  lda #$40
  sta $6203,x
  txa
  clc
  adc #4
  and #$1f
  tax
  stx NmtBufWriteOffset
  jsr EnableNMI
  
  ; now spam the rest of the border
  ; draw 26 lines of the same stuff
  ; write to slots in $6000
  ; lda #$40
  lda #<NAMETABLE_ADDR
  sta $a0
  lda #>NAMETABLE_ADDR
  sta $a1

  lda #$20 ; space tile
  ldy #$12
@DrawWallLoop:
    sta $6000, y
    dey
    bpl @DrawWallLoop
  lda #$1e ; left wall
  ; ldy #$01
  sta $6001
  lda #$1f ; right wall
  ; ldy #$11
  sta $6011

  ; NES is 30x32 so draw 30 rows of the wall
  ldx #29
@UpdateBuffer:
    jsr DisableNMIAndWaitForNMTSlot
    ldy NmtBufWriteOffset
        
    lda $a1
    ; ora #$80 ; TODO allow for multiple per frame, but limit it to once every 5 or so
    sta $6200,y
    lda $a0
    sta $6201,y
    lda #$12
    sta $6202,y
    lda #$00
    sta $6203,y
    tya
    clc
    adc #4
    and #$1f
    sta NmtBufWriteOffset
    jsr EnableNMI
    ; bump the pointer to write to by $20
    clc
    lda #$20
    adc $a0
    sta $a0
    lda $a1
    adc #$00
    sta $a1
    dex
    bpl @UpdateBuffer

  ; and done!
  rts

.reloc
HexToDecimal8Bit:
;Given: Hex value in Hex0
;Returns decimal value in DecOnes, DecTens, and DecHundreds.
; copied from https://www.nesdev.org/wiki/HexToDecimal.8
  lda #$00
  sta DecOnes
  sta DecTens
  sta DecHundreds
  lda Hex0
  and #$0F
  tax
  lda @HexDigit00Table,x
  sta DecOnes
  lda @HexDigit01Table,x
  sta DecTens
  lda Hex0
  lsr a
  lsr a
  lsr a
  lsr a
  tax
  lda @HexDigit10Table,x
  clc
  adc DecOnes
  sta DecOnes
  lda @HexDigit11Table,x
  adc DecTens
  sta DecTens
  lda @HexDigit12Table,x
  sta DecHundreds
  clc
  ldx DecOnes
  lda @DecimalSumsLow,x
  sta DecOnes
  lda @DecimalSumsHigh,x
  adc DecTens
  tax
  lda @DecimalSumsLow,x
  sta DecTens
  lda @DecimalSumsHigh,x
  adc DecHundreds
  tax
  lda @DecimalSumsLow,x
  sta DecHundreds     ;118
  rts

@HexDigit00Table:
@DecimalSumsLow:
;55 bytes
	.byte $0,$1,$2,$3,$4,$5,$6,$7,$8,$9,$0,$1,$2,$3,$4,$5
	.byte $6,$7,$8,$9,$0,$1,$2,$3,$4,$5,$6,$7,$8,$9,$0,$1
	.byte $2,$3,$4,$5,$6,$7,$8,$9,$0,$1,$2,$3,$4,$5,$6,$7
	.byte $8,$9,$0,$1,$2,$3,$4
@HexDigit01Table:
@DecimalSumsHigh:
;55 bytes
	.byte $0,$0,$0,$0,$0,$0,$0,$0,$0,$0,$1,$1,$1,$1,$1,$1
	.byte $1,$1,$1,$1,$2,$2,$2,$2,$2,$2,$2,$2,$2,$2,$3,$3
	.byte $3,$3,$3,$3,$3,$3,$3,$3,$4,$4,$4,$4,$4,$4,$4,$4
	.byte $4,$4,$5,$5,$5,$5,$5
@HexDigit10Table:
  .byte $0,$6,$2,$8,$4,$0,$6,$2,$8,$4,$0,$6,$2,$8,$4,$0
@HexDigit11Table:
	.byte $0,$1,$3,$4,$6,$8,$9,$1,$2,$4,$6,$7,$9,$0,$2,$4
@HexDigit12Table:
	.byte $0,$0,$0,$0,$0,$0,$0,$1,$1,$1,$1,$1,$1,$2,$2,$2

.reloc
;; We have a box to draw to thats 15 wide and 26 tall
DrawBasicStats:
  jsr ClearBufferRAMForBox

  ; Start by writing player name
  ldx #0
-   lda $6400,x
    beq + ; Player name is a null terminated string
    sta $6000,x
    inx
    cpx #$06
    bmi -
+ lda #$4c ; "L"
  sta $6007
  lda #$76 ; "v"
  sta $6008
  lda PlayerLevel
  sta Hex0
  jsr HexToDecimal8Bit
  lda DecTens
  beq +
    sta $6009
+ lda DecOnes
  sta $600a
  ; lda 
  ; sta $600b
  lda #$44 ; "D"
  sta $600c
  lda Difficulty
  sta Hex0
  jsr HexToDecimal8Bit
  lda DecTens
  beq +
    sta $600d
+ lda DecOnes
  sta $600e
  
  ldx #ChecksLen-1
-   lda @Checks,x
    sta $6020,x
    dex
    bpl -

  lda StatsChecks
  sta Hex0
  jsr HexToDecimal8Bit
  lda DecHundreds
  beq +
  sta $6028
+ lda DecTens
  beq +
  sta $6029
+ lda DecOnes
  sta $602a
  lda #$2d ; '-'
  sta $602b
.import CHECK_COUNT_HUN, CHECK_COUNT_TEN, CHECK_COUNT_ONE
  lda #CHECK_COUNT_HUN
  beq +
  sta $602c
+ lda #CHECK_COUNT_TEN
  sta $602d
  lda #CHECK_COUNT_ONE
  sta $602e

; Handle mimics
  ldx #MimicsLen-1
-   lda @Mimics,x
    sta $6040,x
    dex
    bpl -
  ; Count the number of mimics by shifting each bit
  lda #0
  sta Hex0
  lda StatsMimicsLo
  ldx #7
-   asl
    bcc +
      inc Hex0
+   dex
    bpl -
  lda StatsMimicsHi
  ldx #7
-   asl
    bcc +
      inc Hex0
+   dex
    bpl -
  ; Hex0 has the number of mimics
  jsr HexToDecimal8Bit
  lda DecTens
  beq +
  sta $6049
+ lda DecOnes
  sta $604a
  lda #$2d ; '-'
  sta $604b
.import MIMIC_COUNT_HUN, MIMIC_COUNT_TEN, MIMIC_COUNT_ONE
  lda #MIMIC_COUNT_HUN
  beq +
  sta $604c
+ lda #MIMIC_COUNT_TEN
  sta $604d
  lda #MIMIC_COUNT_ONE
  sta $604e

  ldx #DeathsLen-1
-   lda @Deaths,x
    sta $6060,x
    dex
    bpl -

  lda StatsDeaths
  sta Hex0
  jsr HexToDecimal8Bit
  lda DecHundreds
  beq +
  sta $606b
+ lda DecTens
  beq +
  sta $606c
+ lda DecOnes
  sta $606d

  ldx #ResetsLen-1
-   lda @Resets,x
    sta $6080,x
    dex
    bpl -

  lda StatsResets
  sta Hex0
  jsr HexToDecimal8Bit
  lda DecHundreds
  beq +
  sta $608b
+ lda DecTens
  beq +
  sta $608c
+ lda DecOnes
  sta $608d

  jsr DisableNMI
  ; The NMT buffer is flushed between writes, so we can just write from slot zero
  lda #0
  sta NmtBufReadOffset
  lda #20
  sta NmtBufWriteOffset
  lda #>NAMETABLE_ADDR | $80
.repeat 5, I
  sta $6200 + I * 4
.endrepeat
.repeat 5, I
  lda #<NAMETABLE_ADDR + $42 + I * $20
  sta $6201 + I * 4
.endrepeat
  lda #$0f
.repeat 5, I
  sta $6202 + I * 4
.endrepeat
.repeat 5, I
  lda #$00  + I * $20
  sta $6203 + I * 4
.endrepeat
  jsr EnableNMI

  rts
  ; extra data to write
@Checks:
.byte "Checks:"
ChecksLen = * - @Checks
@Mimics:
.byte "Mimics:"
MimicsLen = * - @Mimics
@Deaths:
.byte "Deaths:"
DeathsLen = * - @Deaths
@Resets:
.byte "Resets:"
ResetsLen = * - @Resets


.reloc
DrawTimestamps:
  jsr ClearBufferRAMForBox

  ; loop counter
  lda TimestampCount
  bne +
    ; Sanity check that they have any timestamps. Really only possible with hacks.
    rts
+ sta $c0
  lda #0
  sta $c1

  ; ppuaddr
  lda #<NAMETABLE_ADDR + $02
  sta $c2
  lda #>NAMETABLE_ADDR + $01
  sta $c3

  ; write offset
  lda #$00
  sta $c6
  lda #$60
  sta $c7
@OuterLoop:

  ; Get the read offset for this element
  ldy $c1
  ; Get the type of timestamp
  lda TimestampTypeList, y
  ; multiply i * 7 to get the offset into the timestamp name list
  asl
  asl
  asl
  sec
  sbc TimestampTypeList, y
  ; a = index into name list

  ; update the read pointer
  clc
  adc #<@TsNameStart
  sta $c4
  lda #>@TsNameStart
  adc #0
  sta $c5

  ; copy name of timestamp
  ldy #TsNameLen-1
  @CopyNameLoop:
    lda ($c4),y
    sta ($c6),y
    dey
    bpl @CopyNameLoop

  ; Get the read offset for this element
  ldy $c1
  ; Get the type of timestamp
  lda TimestampTypeList, y
  ; multiply i * 3 to get offset into timestamp list
  asl
  adc TimestampTypeList, y
  tax

  ; read the 3 digits of the timestamp into the divide memory
  lda TimestampList,x
  sta Dividend
  lda TimestampList+1,x
  sta Dividend+1
  lda TimestampList+2,x
  sta Dividend+2
  ; 60.1 frm/sec * 60 sec/min * 60 min/hr = 216360 or 34d28 in hex
  lda #$28
  sta Divisor
  lda #$4d
  sta Divisor+1
  lda #$03
  sta Divisor+2
  jsr LongDivision24bit
  ; results in Dividend, Remainder will be divided again to find minutes
  lda Dividend
  sta Hex0
  jsr HexToDecimal8Bit
  ; if theres a ten's place for the hours, then just write 9:99:99
  lda DecTens
  beq +
    lda #9
    sta TmpHoursOnes
    sta TmpMinutesOnes
    sta TmpSecondsOnes
    sta TmpMinutesTens
    sta TmpSecondsTens
    jmp @WriteNumber
+ lda DecOnes
  sta TmpHoursOnes

  ; Update the minutes
  lda Remainder
  sta Dividend
  lda Remainder + 1
  sta Dividend + 1
  lda Remainder + 2
  sta Dividend + 2
  ; 60.1 frm/sec * 60 sec/min = 3606 or 0e16 in hex
  lda #$16
  sta Divisor
  lda #$0e
  sta Divisor+1
  lda #$00
  sta Divisor+2
  jsr LongDivision24bit
  lda Dividend
  sta Hex0
  jsr HexToDecimal8Bit
  lda DecTens
  sta TmpMinutesTens
  lda DecOnes
  sta TmpMinutesOnes

  ; update the seconds
  
  lda Remainder
  sta Dividend
  lda Remainder + 1
  sta Dividend + 1
  lda Remainder + 2
  sta Dividend + 2
  ; 60.1 frm/sec = 60 or 3c in hex
  lda #$3c
  sta Divisor
  lda #$00
  sta Divisor+1
  lda #$00
  sta Divisor+2
  jsr LongDivision24bit
  lda Dividend
  sta Hex0
  jsr HexToDecimal8Bit
  lda DecTens
  sta TmpSecondsTens
  lda DecOnes
  sta TmpSecondsOnes

  ; Finally draw write the numbers to the $6000 address

@WriteNumber:
  ldy #8
  lda TmpHoursOnes
  sta ($c6),y
  iny
  lda #$3a     ; ':'
  sta ($c6),y
  iny
  lda TmpMinutesTens
  sta ($c6),y
  iny
  lda TmpMinutesOnes
  sta ($c6),y
  iny
  lda #$3a     ; ':'
  sta ($c6),y
  iny
  lda TmpSecondsTens
  sta ($c6),y
  iny
  lda TmpSecondsOnes
  sta ($c6),y
  
  ; add the header
  jsr DisableNMIAndWaitForNMTSlot
  ldy NmtBufWriteOffset
  lda $c3
  ora #$80 ; enable multiple writes per NMI
  sta $6200,y
  lda $c2
  sta $6201,y
  lda #$0f ; 15 bytes fixed length
  sta $6202,y
  lda $c6
  sta $6203,y
  tya
  clc
  adc #4
  and #$1f
  sta NmtBufWriteOffset
  jsr EnableNMI

  ; update PPUADDR for next slot
  clc
  lda #$20
  adc $c2
  sta $c2
  lda #$00
  adc $c3
  sta $c3

  ; update the write pointer to the next available slot
  clc
  lda #$20
  adc $c6
  sta $c6

  inc $c1
  lda $c1
  cmp $c0
  beq @Exit
  jmp @OuterLoop
@Exit:
  rts

; All timestamp names have to be 7 Chars or shorter to fit timestamps
; example: `namehre h:mm:ss`
@TsNameStart:
@BowMoon: ; replaces Vampire1
.byte "BowMoon"
@BowSun: ; replaces Insect
.byte "BowSun "
@Kelbesque1:
.byte "Kelbes1"
@Flight:
.byte "Flight "
@Sabera1:
.byte "Sabera1"
@Mado1:
.byte "Mado 1 "
@Kelbesque2:
.byte "Kelbes2"
@Sabera2:
.byte "Sabera2"
@Mado2:
.byte "Mado 2 "
@Karmine:
.byte "Karmine"
@Draygon1:
.byte "Draygn1"
@Draygon2:
.byte "Draygn2"
@BowTruth: ; replaces Vampire2
.byte "BowTrut"
; @Dyna:
; .byte "DYNA   "
@Complete:
.byte "Finish "
@WindSword:
.byte "Wind", $0a, $0b, $0c
@FireSword:
.byte "Fire", $0a, $0b, $0c
@WaterSword:
.byte "Watr", $0a, $0b, $0c
@ThunderSword:
.byte "Thun", $0a, $0b, $0c
@Crystalis:
.byte "Crys", $0a, $0b, $0c
TsAllNameLen = * - @TsNameStart
TsNameLen = 7
; Verify that all the names are 7 characters long
.assert (TS_COUNT * TsNameLen) = TsAllNameLen

.reloc
ClearBufferRAMForBox:
  lda #$20
  ldx #$1f
@Loop:
.repeat 7, I
    sta $6000 + I * $20,x
.endrepeat
    dex
    bpl @Loop
  rts

.reloc
DisableNMIAndWaitForNMTSlot:
  jsr DisableNMI
  ; wait until the next nmt slot is available
  ; if next next one isn't available, when we bump the pointer at the end
  ; then Write == Read and nmi buffer doesn't run since it thinks theres no updates
  lda NmtBufWriteOffset
  adc #4
  and #$1f
  cmp NmtBufReadOffset
  bne +
    jsr EnableNMI
    ; wait for nmi
    jsr FlushNametableDataWrite
    jsr DisableNMI
+ rts

;; Long division routine copied from here:
;; https://codebase64.org/doku.php?id=base:24bit_division_24-bit_result
.reloc
LongDivision24bit:
  tya
  pha
  lda #0              ;preset remainder to 0
  sta Remainder
  sta Remainder+1
  sta Remainder+2
  ldx #24             ;repeat for each bit: ...
@Loop:
    asl Dividend      ;dividend lb & hb*2, msb -> Carry
    rol Dividend+1
    rol Dividend+2
    rol Remainder     ;remainder lb & hb * 2 + msb from carry
    rol Remainder+1
    rol Remainder+2
    lda Remainder
    sec
    sbc Divisor       ;substract divisor to see if it fits in
    tay               ;lb result -> Y, for we may need it later
    lda Remainder+1
    sbc Divisor+1
    sta DivTmp
    lda Remainder+2
    sbc Divisor+2
    bcc @Skip         ;if carry=0 then divisor didn't fit in yet

    sta Remainder+2   ;else save substraction result as new remainder,
    lda DivTmp
    sta Remainder+1
    sty Remainder	
    inc Dividend      ;and INCrement result cause divisor fit in 1 times
@Skip:
  dex
  bne @Loop
  pla
  tay
  rts

.popseg ; "3c"

.popseg ; "10", "11"

.endif ; _STATS_TRACKING
