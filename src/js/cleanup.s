
;;; Cleanup NMI and NMI related flag usages
.pushseg "fe", "ff"

; Update the NMI Vector to point to our new handler
.org $fffa
.word (NMIHandler)

.macro DISABLE_NMI
lda #%10000000
sta NmiDisable
.endmacro

.macro ENABLE_NMI
lda #%00000000
sta NmiDisable
.endmacro

.org $c436 ; EnableNMI
  brk
.org $c43e ; DisableNMI
  brk
; TODO use FREE_UNTIL after all are surely gone

;;;---------------------------
;;; WritePaletteDataToPpu
; Changes from the original
;  - Inlined to shave off jsr/rts (4 bytes and 12 cycles)
;  - Removed unused loading palette by offset in x (saves 2 cycles from removing ldx #0)
;  - Removed paranoid palette corruption fix. (saves 16 bytes and 20 cycles)
.org $f8cb
FREE_UNTIL $fa00

;;;--------------------------
;;; HandleNMI
; Changes from Vanilla NMI handler
; - Removes $60 as a flag. Just uses $06 as the NMI flag
; - Uses a very small fast path for NMI disabled without pushing registers
; - Reworked the NMI disable path to be as fast as possible
; - Removes the double scroll write on Draygon/Insect fights
.org $f3b6
FREE_UNTIL $f424
.reloc
NMIHandler:

.ifdef _STATS_TRACKING
  inc StatTimerLo
    bne @CheckIfNMIEnabled
    inc StatTimerMd
      bne @CheckIfNMIEnabled
      inc StatTimerHi
@CheckIfNMIEnabled:
.endif ; _STATS_TRACKING

  bit NmiDisable
  bpl @ContinueNMI
    inc NmiSkipped
    rti
@ContinueNMI:
  pha
    txa
    pha
      tya
      pha
        lda PPUSTATUS
        lda OamDisable
        bne @SkipOAMDMA
          ;; Do an OAM DMA
          sta OAMADDR
          lda #$02
          sta OAMDMA

          ;; If ScreenMode is 7 or 9, then copy $[8ace]3 into $07d[89ab] instead.
          ;; This is the map position of object $13, likely the background boss
          lda ScreenMode
          cmp #$09
          beq @CopyFromObjCoords
          cmp #$07
          bne @CopyFromStandardScroll
            ; fallthrough
@CopyFromObjCoords:
            lda $83
            sta $07d8
            lda $a3
            sta $07d9
            lda $c3
            sta $07da
            lda $e3
            sta $07db
            jmp @SkipOAMDMA
@CopyFromStandardScroll:
            lda $02
            sta $07d8
            lda $03
            sta $07d9
            lda $04
            sta $07da
            lda $05
            sta $07db
            ; fallthrough
@SkipOAMDMA:
        ;; Back to the main line - always write nametables and palettes.
        jsr WriteNametableDataToPpu
        ; Inlined WritePaletteDataToPpu since it was only called from here.
        ; Check if bit 7 is set, and skip palette update if it is
        bit ScreenMode
        bpl +
          jmp @AfterPaletteUpdate
+
        lda #$00
        sta PPUMASK
        lda PpuCtrlShadow
        and #%11111011 ; #$fb
        sta PPUCTRL
        lda PPUSTATUS
        lda #>VromPalettes ; $3f
        sta PPUADDR
        lda #<VromPalettes ; $00
        sta PPUADDR
        .repeat $20, i
          lda $6140 + i
          sta PPUDATA
        .endrepeat
@AfterPaletteUpdate:
        ;; Write PPUMASK from $01
        lda PpuMaskShadow
        sta PPUMASK
        jsr ExecuteScreenMode
        inc OamDisable ; flag OAMDMA complete by disabling it

        ; Reload the register values and return
      pla
      tay
    pla
    tax
  pla
  rti


.org $c739
  brk
FREE_UNTIL $c75c

.reloc
;; Changes from vanilla:
; - Its slightly bigger to fit the new NMI flag in
RequestAttributeTable0Write:
  jsr DisableNMI
  ldx NmtBufWriteOffset
  lda #$23
  sta $6200,x
  lda #$c0
  sta $6201,x
  lda #$bf
  sta $6202,x
  lda #$00
  sta $6203,x
  txa
  clc
  adc #4
  and #$1f
  sta NmtBufWriteOffset
  jmp EnableNMI

;;;----------------------
;;; WriteNametableDatatoPpu
; Clean up some minor waste of cycles and make it relocatable
; Changes from vanilla:
;  - Use axs unoffical opcode to shave cycles off bulk copy
;  - Removes the only reference to $0d so we can use that elsewhere
.org $c67d
  brk
FREE_UNTIL $c72b
.reloc
WriteNametableDataToPpu:
@ProcessNextEntry:
  ldy NmtBufReadOffset
  cpy NmtBufWriteOffset
  beq @Exit
  ;; Check bit :40 of $6200,x to see if we're writing a horizontal
  ;; (clear) or vertical (set) strip to the nametable.  Fix the
  ;; :04 bit of $0 and write it to PPUCTRL.
  lda $6200,y
  sta NmtBufTempValue
  lda PpuCtrlShadow
  and #%11111011 ; #~$04 disable vertical write if its enabled
  bit NmtBufTempValue
  bvc +
   ora #%00000100 ; reenable vertical write if bit 6 was set
+ sta PPUCTRL
  ;; Write the next 14 bits to PPUADDR (the :c0 bits are mirrored out)
  lda NmtBufTempValue
  sta PPUADDR
  lda $6201,y
  sta PPUADDR
  lda $6202,y
  pha ; number of bytes to write
    ldx $6203,y ; offset into the $6000 page to write
    ;; Mark this buffer as clear. If bit 7 of $6202 is set, then
    ;; write from the memory in $6100 instead
    lda #$ff
    sta $6203,y
  pla
  bmi @WriteTwoRows
  tay
-   lda $6000,x
    sta PPUDATA
    inx
    dey
    bne -
  ;; After writing one chunk, increment $a and loop to see
  ;; if there's another chunk to write.
  lda NmtBufReadOffset
  clc
  adc #$04
  and #$1f
  sta NmtBufReadOffset
  lda NmtBufTempValue ; check bit 7 of $6202 to see if we loop
  bmi @ProcessNextEntry
@Exit:
  rts
@WriteTwoRows:
  ldy #$08
@BatchLoopCopy:
.repeat 8, i
    lda $6100 + i,x
    sta PPUDATA
.endrepeat
    ; faster way to add 8 to x by using safe unofficial opcode `axs`
    ; which calculates x = a & x - imm (#~8)
    txa
    .byte $cb, $f8 ; axs #$f8
    dey
    bne @BatchLoopCopy
  ;; Bump the read offset
  lda NmtBufReadOffset
  clc
  adc #$04
  and #$1f
  sta NmtBufReadOffset
  rts

;;; Various locations changed to no longer disable NMI
;;; and use the following flag versions instead
.reloc
DisableNMI:
  DISABLE_NMI
  rts

.reloc
EnableNMI:
  ENABLE_NMI
  rts

.reloc
WaitForOAMDMA:
- lda OamDisable
  beq -
  lda #$00
  sta OamDisable
  rts

.org $c8b2
  brk ; TODO remove after all are surely gone
FREE_UNTIL $c8f0
.reloc
ImmediateWriteNametableDataToPpu:
  DISABLE_NMI
  jsr WriteNametableDataToPpu
  ENABLE_NMI
  rts

;;--------------------------------
;; Remove custom NMI en/disables

; (Note that this one didn't write to the shadow reg)
.pushseg "10", "11"
.org $8ab0
  jsr DisableNMI
.org $8ad7
  jsr WriteNametableDataToPpu
.org $8ada
  jmp EnableNMI
FREE_UNTIL $8aed

.org $a720 ; DisableNMI_altbank11
  brk ; TODO remove

.org $a239
  jsr DisableNMI
.org $a301
  jsr EnableNMI
.org $a41f
  jsr DisableNMI
.org $a463
  jsr EnableNMI
.org $a756
  jsr DisableNMI
.org $a784
  jmp EnableNMI
.org $a7d9
  jsr DisableNMI
.org $a8d4
  jsr EnableNMI
.org $a811
  jsr EnableNMI
.org $a87c
  jsr DisableNMI
.org $a8ee
  jsr DisableNMI
.org $a911
  jsr EnableNMI
.org $ab5a
  jsr DisableNMI
.org $ab8a
  jsr EnableNMI

.popseg ; "10", "11"

.pushseg "12", "13"
; WaitForOAMDMA_alt2
.org $8084
  jsr EnableNMI
  jsr WaitForOAMDMA
.org $8097
  jsr WaitForOAMDMA
.org $80a5
  jsr WaitForOAMDMA
.org $80c5
  jsr WaitForOAMDMA
.org $80d0
  jsr WaitForOAMDMA
.org $81a6
  jsr DisableNMI
.org $81d4
  jsr EnableNMI
.org $81f0
  jsr DisableNMI
.org $8247
  jsr EnableNMI
.org $8263
  jsr DisableNMI
.org $82a8
  jsr EnableNMI
  jsr WaitForOAMDMA
.org $9fd2
  jsr WaitForOAMDMA
.org $a098
  jsr DisableNMI
.org $a0a1
  jmp EnableNMI
.org $a0c0
  jsr WaitForOAMDMA
.org $a2dd
  jsr DisableNMI
.org $a30b
  jsr EnableNMI
  jsr WaitForOAMDMA
.org $a314
  jsr DisableNMI
.org $a345
  jmp EnableNMI
.org $a36e
  jsr DisableNMI
.org $a3a0
  jsr EnableNMI
.org $a47d
  jsr DisableNMI
.org $a4ad
  jmp EnableNMI
.org $a57f
  jsr WaitForOAMDMA
.org $a656
  jsr WaitForOAMDMA
.org $a690
  jsr WaitForOAMDMA
.org $a79b
  jsr WaitForOAMDMA
.org $a9b0
  jsr WaitForOAMDMA
  ; TODO This was relocated but my patch disagrees with it.
.org $abb7
  jsr WaitForOAMDMA

.org $bb9a
  jmp RequestAttributeTable0Write
.org $bc01
  jmp RequestAttributeTable0Write
.org $be54
  jmp RequestAttributeTable0Write

.org $8174 ; DisableNMI_alt2 and then EnableNMI_alt2
  brk ; TODO remove after all are surely gone
FREE_UNTIL $8184
.org $8198 ; WaitForOAMDMA
  brk ; TODO remove after all are surely gone
FREE_UNTIL $81a1
.popseg ; "12", "13"

.pushseg "14", "15"
.org $8836
  jsr DisableNMI
.org $8857
  jsr EnableNMI

.org $8869 ; EnableNMI_alt
  brk ; TODO remove
FREE_UNTIL $8870
.org $8871 ; DisableNMI_alt
  brk ; TODO remove
FREE_UNTIL $8878
.popseg ; "14", "15"

.pushseg "1a", "1b"

.org $8d1a
  jsr DisableNMI
.org $8d41
  jsr ImmediateWriteNametableDataToPpu
.org $8d46
  jmp EnableNMI
.org $8dd2
  bne +
    jsr ImmediateWriteNametableDataToPpu
+ jsr EnableNMI
.org $8dad
  jsr DisableNMI
.org $8e90
  jsr DisableNMI
.org $8ebd
  jsr ImmediateWriteNametableDataToPpu
.org $8ec2
  jmp EnableNMI
.org $b835
  jsr RequestAttributeTable0Write

.popseg ; "1a", "1b"

.org $c4be
  jsr DisableNMI
.org $c4e5
  jsr ImmediateWriteNametableDataToPpu
.org $c4e8
  jsr EnableNMI
.org $c864
  jmp RequestAttributeTable0Write
.org $de61
  jsr RequestAttributeTable0Write
.org $e89a
  jsr RequestAttributeTable0Write
.org $e965
  jsr RequestAttributeTable0Write
.org $ec2d
  jsr DisableNMI
.org $ec57
  beq +
    jmp EnableNMI
+ jmp ImmediateWriteNametableDataToPpu
FREE_UNTIL $ec6c

.org $ed3a
  jsr DisableNMI
.org $ed61
  jmp EnableNMI

;;------------------------------

.popseg ; "fe", "ff"
