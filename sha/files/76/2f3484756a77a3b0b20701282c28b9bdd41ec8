
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

;;;--------------------------
;;; HandleNMI
; Changes from Vanilla NMI handler
; - Removes $60 as a flag. Just uses $06 as the NMI flag
; - Uses a very small fast path for NMI disabled without pushing registers
; - Reworked the NMI disable path to be as fast as possible
; - Removes the double scroll write on Draygon/Insect fights

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
        lda #7
        sta BANKSELECT
        lda #$3d
        sta BANKDATA
        jsr NMIHandlerInternal
        lda #7
        sta BANKSELECT
        lda $6f
        sta BANKDATA
        ; Reload the register values and return
        lda BankSelectShadow
        sta BANKSELECT
      pla
      tay
    pla
    tax
  pla
InitialIRQHandler:
  rti


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

.reloc
WriteNametableDataToPpu:
;;;----------------------
;;; WriteNametableDataToPpu
; Clean up some minor waste of cycles and make it relocatable
; Changes from vanilla:
;  - Use axs unoffical opcode to shave cycles off bulk copy
;  - Removes the only reference to $0d so we can use that elsewhere
@ProcessNextEntry:
  ldy NmtBufReadOffset
  cpy NmtBufWriteOffset
  bne +
    rts
+
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
    ; which calculates x = a & x - imm (#-8)
    txa
    axs #-8
    ; txa
    ; clc
    ; adc #$08
    ; tax
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
  jsr RequestAttributeTable0Write

.popseg ; "12", "13"

.pushseg "14", "15"
.org $8836
  jsr DisableNMI
.org $8857
  jsr EnableNMI

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

.popseg ; "fe", "ff"


.pushseg "fe", "ff"


; Update RemoveSpritesBehindMessageBox to account for the fixed location message box
.reloc
RemoveSpritesBehindMessageBox:
  ; Messagebox used to fluctate its starting point for ...reasons? I think the intention
  ; is depending on where you were they could put it at different spots, but in practice
  ; it was limited to an 8px range and i didn't even know it was a thing until i read the code
  ; So we now fixed the starting point at 12 px from the top of the screen (4px from the top
  ; of the visual area)
  lda #SCANLINE_MSGBOT+1 ; +1 because we need a line to switch CHR ROM banks
ClearSpritesLessThanA:
  sta $10
  ldx #4
-   lda $10
    cmp SpriteRamY,x
    bcc +
      lda #$f0
      sta SpriteRamY,x
+   txa
    axs #-4
  bne -
  rts

.pushseg "13"
.org $ba11
  jsr ClearSpritesLessThanA
.org $bbe4
  jsr RemoveSpritesBehindMessageBox
.org $bc3f
  jsr RemoveSpritesBehindMessageBox
.org $bc5d
  jsr RemoveSpritesBehindMessageBox
.popseg ; 13

.pushseg "17"
.org $bbe4
  jsr RemoveSpritesBehindMessageBox
.popseg ; 17

.org $d376
  jsr RemoveSpritesBehindMessageBox
.org $d394
  jsr RemoveSpritesBehindMessageBox
.org $d3b0
  jsr RemoveSpritesBehindMessageBox
.org $d8b7
  jsr RemoveSpritesBehindMessageBox
.org $dbc2
  jsr RemoveSpritesBehindMessageBox
.org $de07
  jsr RemoveSpritesBehindMessageBox
.org $de56
  jsr ClearSpritesLessThanA
.org $df6a
  jsr ClearSpritesLessThanA


;;; -------------------
;;; IRQ rewrite
;;; -------------------
;;; - change the IRQ callbacks to use loopy's scrolling method
;;;   - (https://www.nesdev.org/wiki/PPU_scrolling#Split_X/Y_scroll)
;;;   - Using this scroll method avoids the $2006 write glitch on dot 257 by
;;;     putting the $2006 write later into hblank
;;; - tweak the delay timings to be more lenient of irq jitter (up to 10 cpu cycles of jitter)
;;;   - attempt to reduce IRQ total time by replacing waits with timed code
;;; - make the IRQ code relocatable because theres no need for it to not be at this point
;;;   - (jroweboy: I find it hard to read if i have to patch 100 small places and jump
;;;      between vanilla and rando code to understand the full method)



;;;---------
; Update the Reset function to setup the jmp (IRQHandler) in zp
.org $f2f6 ; in HandleReset
  lda #$4c
  sta IrqJumpJmpAbsolute
  ;; In vanilla, this is just a pointer to a random RTI instruction
  ;; so I pointed this to the RTI in NMI
  lda #<InitialIRQHandler
  sta IrqJumpLo
  lda #>InitialIRQHandler
  sta IrqJumpHi
.assert * = $f302

;;; --------------------------------
;;; Sets the callback to run in the IRQ handler to the
;;; callback indexed by A, saving the index in $56 and
;;; the jump table entry in ($0054).
.org $fffe ; VectorIRQ
  .word (IrqJumpJmpAbsolute)

; Update the only location that read from the current IRQ setup to use screenmode instead
.org $dca9
  ldy ScreenMode

;;-----------
; Macro that doesn't use x/y to set the next IRQcallback.
; if you aren't currently preserving x, this is less bytes and less cycles
; than doing a JSR to set the callback in code

; TODO: i don't understand these macros in your assembler steve :P
; this hack job should be cleaned up
.macro FastSetIRQCallback from
.if from = 0
  .define ReadAddress IrqMessageBoxTopHandler
.elseif from = 1
  .define ReadAddress IrqMessageBoxBottomHandler
.elseif from = 2
  .define ReadAddress IrqVerticalScreenWrapHandler
.elseif from = 3
  .define ReadAddress IrqStatusBarAndAudio
.elseif from = 4
  .define ReadAddress IrqInventoryUpdateCHRROMForMagic
.elseif from = 5
  .define ReadAddress IrqAnimateSNKLogoScroll
.endif
  lda #<ReadAddress
  sta IrqJumpLo
  lda #>ReadAddress
  sta IrqJumpHi
  .undefine ReadAddress
.endmacro

.reloc
IrqMessageBoxTopHandler:
  pha
    sta IRQDISABLE
    sta IRQENABLE
    
      ; set the next one to run #$49 == 73 scanlines from now
    ; lda #SCANLINE_MSGBOT - SCANLINE_MSGTOP
    ; If the msgbox bot overlaps with the vertical seam, we need to delay the irq by up to two scanlines
    ; so we precomputed it.
    lda MsgTopIrqReload
    sta IRQLATCH
    sta IRQRELOAD
    
    FastSetIRQCallback IRQ_MESSAGE_BOT

    ;; first two PPU writes can happen early before we need to wait
    lda PPUSTATUS ; reset address latch

    ; Nametable number << 2 (that is: $00, $04, $08, or $0C) to $2006
    lda #$08
    sta PPUADDR
    
    ;; take some time to figure out the messagebox bottom PPUADDR and PPUSCROLL value?
    MessageBoxTopY = 3
    lda #MessageBoxTopY
    sta PPUSCROLL
    ; we have a bit of time before hblank to swap a couple sprite CHR banks

    ;; If we need to cut just a few cycles before, we can
    ;; piggy back off MessageBoxTopY == 3 to shave off 3 cycles
    ; lda #$03
    sta BANKSELECT
    lda $5b
    sta BANKDATA

    lda #$02
    sta BANKSELECT
    lda $5a
    sta BANKDATA
    lda #$04
    sta BANKSELECT
    lda $5c
    sta BANKDATA
    lda #$05
    sta BANKSELECT
    lda $5d
    sta BANKDATA

    lda #0
    ; Timing should be in hblank (between dot 257 and 320)
    sta PPUSCROLL
    sta PPUADDR

    ; Now swap the background CHR banks
    sta BANKSELECT
    lda $58
    sta BANKDATA
    lda #$01
    sta BANKSELECT
    lda $59
    sta BANKDATA
    
    ; restore bankselect mirror
    lda BankSelectShadow
    sta BANKSELECT

  pla
  rti

.reloc
IrqMessageBoxBottomHandler:
  pha
    sta IRQDISABLE
    sta IRQENABLE

    lda MsgBotIrqReload
    sta IRQLATCH
    sta IRQRELOAD

    lda PPUSTATUS ; reset address latch

    ; start switching sprite banks
    lda #$01
    sta BANKSELECT
    lda $07f1
    sta BANKDATA
    lda #$02
    sta BANKSELECT
    lda $07f2
    sta BANKDATA
    lda #$03
    sta BANKSELECT
    lda $07f3
    sta BANKDATA

    ; Nametable number << 2 (that is: $00, $04, $08, or $0C) to $2006
    lda #$00
    sta PPUADDR
    sta BANKSELECT
    lda MsgBotScroll1
    sta PPUSCROLL

    ; we have to burn just a couple of cycles
    php
    plp

    ; Timing should be in hblank (between dot 257 and 320)
    lda ScrollXLo
    sta PPUSCROLL
    lda MsgBotAddr2
    sta PPUADDR

    ; Quickly switch the CHR bank
    lda $07f0
    sta BANKDATA

    ; finish switching banks
    lda #$04
    sta BANKSELECT
    lda $07f4
    sta BANKDATA
    lda #$05
    sta BANKSELECT
    lda $07f5
    sta BANKDATA

    ; Load the next IRQ jump
    lda MsgBotNextIrqLo
    sta IrqJumpLo
    lda MsgBotNextIrqHi
    sta IrqJumpHi

    lda BankSelectShadow
    sta BANKSELECT
  pla
  rti

.reloc
IrqVerticalScreenWrapHandler:
  pha
    sta IRQDISABLE
    sta IRQENABLE

    lda VertSeamIrqReload
    sta IRQLATCH
    sta IRQRELOAD

    FastSetIRQCallback IRQ_STATUSBAR

    ; After the first two writes and setup is done, we end up on dot 180
    ; so we need to stall for about 28 cycles.
    .repeat 5
      php
      plp
    .endrepeat

    ;; first two PPU writes can happen early before we need to wait
    lda PPUSTATUS ; reset address latch
    ; Nametable number << 2 (that is: $00, $04, $08, or $0C) to $2006
    lda #$00
    sta PPUADDR
    ; Y to $2005 -- The Y value will always be 0 because its a midframe split
    sta PPUSCROLL
    
    ;; setup the next PPUADDR and PPUSCROLL value
    ; IrqTmp == Low byte of nametable address to $2006, which is ((Y & $F8) << 2) | (X >> 3)
    lda ScrollXLo
    lsr
    lsr
    lsr
    sta IrqTmp
    ; Timing should be in hblank (between dot 257 and 320)
    lda ScrollXLo
    sta PPUSCROLL
    lda IrqTmp
    sta PPUADDR
  pla
  rti

.reloc
IrqStatusBarAndAudio:
  ; we need to preserve all of the registers because of MaybeUpdateMusic, so might
  ; as well do it while waiting for hblank
  pha
    txa
    pha
      tya
      pha
        sta IRQDISABLE
        
        lda PPUSTATUS ; reset address latch

        ;; first two PPU writes can happen early before we need to wait
        ; Nametable number << 2 (that is: $00, $04, $08, or $0C) to $2006
        lda #$08
        sta PPUADDR

        lda StatusScroll1
        sta PPUSCROLL

        ; Burning cycles: we can setup the code banks for the audio code
        ldy #$06
        ldx #$18 ; $8000 -> $30000
        sty BANKSELECT
        stx BANKDATA
        iny
        inx
        sty BANKSELECT
        stx BANKDATA

        ; Burning cycles: preload some extra values
        ldx #$3c
        ldy #<((StatusBarY & $f8) << 2) ; x = 0 so don't need to include it

        ; Burning cycles: lets disable NMI and setup the NMIskipped
        ; NmiSkipped increments every time it skips, so store it and check to see if it changes
        lda NmiSkipped
        pha
          DISABLE_NMI

          ; Still burning cycles. Preselect the next bank (CHR for the statusbar border)
          lda #0
          sta BANKSELECT

          ; alright thats all the work we can rearrange to do before switching.
          ; still needing to burn a few cycles though :shrug: its not much.
          php
          plp

          ; set draw background on
          lda PpuMaskShadow
          and #%00001110 ; $0e - turn off show sprites, keep show background on
          ora #%00001000 ; $08 - turn on show background
          sta PPUMASK

          ; Timing should be in hblank (between dot 257 and 320)
          ; In my testing, earliest dot for this write is 260 so we are perfect.
          sta PPUSCROLL
          sty PPUADDR
      
          ; bank was already selected to CHR bank 0
          stx BANKDATA
          lda #1
          sta BANKSELECT
          lda #$38
          sta BANKDATA

          ;; Attempt to process a little music before NMI
          ; we already banked the code banks earlier so skip past that
          jsr MaybeUpdateMusicBanked
          ENABLE_NMI
        pla
        ; If it skips NMI then go ahead and setup the screenmode (this causes a lag frame)
        cmp NmiSkipped
        beq +
          ; if NMI was skipped then we need to run the ScreenMode for this frame
          jsr ExecuteScreenMode
    +   ; restore the bank select from shadow
        lda BankSelectShadow
        sta BANKSELECT
      pla
      tay
    pla
    tax
  pla
  rti

.reloc
IrqInventoryUpdateCHRROMForMagic:
  pha
    sta IRQDISABLE
    sta IRQENABLE

    lda #(SCANLINE_STATUS - SCANLINE_INVENTORY - 1) ; off by one error fix
    sta IRQLATCH
    sta IRQRELOAD

    lda #0
    sta BANKSELECT
    lda $5e
    sta BANKDATA
    lda #1
    sta BANKSELECT
    lda $5f
    sta BANKDATA

    FastSetIRQCallback IRQ_STATUSBAR
    
    lda BankSelectShadow
    sta BANKSELECT
  pla
  rti


;;; --------------------------------
.reloc
IrqAnimateSNKLogoScroll:
  pha
    sta IRQDISABLE
    ; do nothing for ~60 cycles
    lda #$e9 ;hides 'sbc #$2A'
      rol A ;first loop only
      nop
      bcs *-3
    php
    plp
    ; now set the scroll
    lda PPUSTATUS
    lda $59
    sta PPUADDR
    lda $5a
    sta PPUADDR
  pla
  rti

;;; The following patch fixes a crash where an IRQ right in the middle of
;;; loading NPCs can fail to correctly restore the bank select register
;;; $8000.  If the IRQ occurs exactly between selecting the bank and setting
;;; the value (i.e. at $3c430..$3c432) and executes both MaybeUpdateMusic
;;; (which page-swaps, rewriting $50 to $8000 afterwards, but not restoring
;;; $50) and RestoreCHRRomBanks (which restores $8000 to the clobbered $50)
;;; then the bank swap will fail.  In the case of this crash, it then reads
;;; NpcData from the wrong page, reading a 7 into the NPC type and jumping
;;; off the end of the 5-element NpcDataJump table.  The fix is to make sure
;;; that MaybeUpdateMusic restores $50 as well as $8000, though this takes
;;; an extra two bytes that we need to recover from RestoreCHRRomBanks (which
;;; immediately follows) by using smaller instructions.

.org $f882 ; MaybeUpdateMusic
  stx BankSelectShadow
  rts

;;;---------------------------
; Redo the ScreenMode code
; Update various locations that SetIRQCallback
; Move all of this to a new bank. This screen mode stuff is called once a frame to setup
; the next frame's IRQs so it doesn't really need to be in the fixed bank.

.reloc
; ExecuteScreenMode
; Changes from vanilla:
; Banks the entire screen mode handling This frees up a ton of space in fixed bank
; frees up two ZP ($52 and $53) by using the RTS trick instead
; minor opt by splitting into Hi and Lo table
;  ^ ignore that, can't do that cause ScreenMode gets ora $#80 all the time
;    to disable palette writes in NMI
ExecuteScreenMode:
  lda #7
  sta BANKSELECT
  lda #$3d
  sta BANKDATA
  jsr ExecuteScreenModeInternal
  lda #7
  sta BANKSELECT
  lda $6f
  sta BANKDATA
  rts

.pushseg "3d"

.reloc
NMIHandlerInternal:
  lda PPUSTATUS
  lda OamDisable
  bne @SkipOAMDMA
    ;; Do an OAM DMA
    sta OAMADDR
    lda #$02
    sta OAMDMA

    ;; If ScreenMode is 7 or 9, then copy $[8ace]3 into $07d[89ab] instead.
    ;; This is the map position of object $13, likely the background boss
    ;; Changes from Vanilla, since ScreenMode 8 is unused, this can just check if >=7
    lda ScreenMode
    and #$7f ; TODO if we move the bit7 skip palette to a different variable, then we can shave a few more cycles
    cmp #$07
    bcc @CopyFromStandardScroll
      ; fallthrough
@CopyFromObjCoords:
      lda $83
      sta ScrollXLo
      lda $a3
      sta ScrollXHi
      lda $c3
      sta ScrollYLo
      lda $e3
      sta ScrollYHi
      bcs @SkipOAMDMA ; unconditional
@CopyFromStandardScroll:
      lda ScreenXLo
      sta ScrollXLo
      lda ScreenXHi
      sta ScrollXHi
      lda ScreenYLo
      sta ScrollYLo
      lda ScreenYHi
      sta ScrollYHi
      ; fallthrough
@SkipOAMDMA:
  ;; Back to the main line - always write nametables and palettes.
  jsr WriteNametableDataToPpu

  ; Inlined WritePaletteDataToPpu since it was only called from here.
  ; Check if ScreenMode bit 7 is set, and skip palette update if it is
  bit ScreenMode
  bpl +
    jmp @AfterPaletteUpdate
+
;;;---------------------------
;;; WritePaletteDataToPpu
; Changes from the original
;  - Inlined to shave off jsr/rts (4 bytes and 12 cycles)
;  - Removed unused loading palette by offset in x (saves 2 cycles from removing ldx #0)
;  - Removed paranoid palette corruption fix. (saves 16 bytes and 20 cycles)
  lda #$00
  sta PPUMASK
  lda PpuCtrlShadow
  and #%11111011 ; #$fb
  sta PPUCTRL
  ; we shouldn't need to reset the latch here since we did that in WriteNametableDataToPpu
  ; lda PPUSTATUS
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
  inc OamDisable ; flag OAMDMA complete by disabling it
  jmp ExecuteScreenMode
  ; implicit rts

ExecuteScreenModeInternal:
  lda #0
  sta IrqTmp
  ; TODO change the bit 7 "skip palette" to be a different flag, and just do ldx ScreenMode
  ; to shave off a few cycles in NMI
  lda ScreenMode
  and #$7f
  tax
  lda @ScreenModeTableHi,x
  pha
  lda @ScreenModeTableLo,x
  pha
  rts
; TODO: if i understood the macros well enough, this is a great one to macro
; all values offset by one for the RTS trick
@ScreenModeTableLo:
  .byte <(ScreenNormalPlayfield) - 1
  .byte <(ScreenMessageboxPlayfield) - 1
  .byte <(ScreenPlayerStatus) - 1
  .byte <(ScreenMovie) - 1
  .byte $00
  .byte <(ScreenSNKAnimation) - 1
  .byte <(ScreenInventory) - 1
  .byte <(ScreenNametableBoss) - 1
  .byte $00
  .byte <(ScreenNametableBossWithMsg) - 1
@ScreenModeTableHi:
  .byte >(ScreenNormalPlayfield)
  .byte >(ScreenMessageboxPlayfield)
  .byte >(ScreenPlayerStatus)
  .byte >(ScreenMovie)
  .byte $00
  .byte >(ScreenSNKAnimation)
  .byte >(ScreenInventory)
  .byte >(ScreenNametableBoss)
  .byte $00
  .byte >(ScreenNametableBossWithMsg)


; Changes from Vanilla: Doesn't set $56 anymore. (the one place that did was changed to read from screenmode instead)
.reloc
SetIRQCallback:
  asl
  tax
  lda IRQCallbackTable,x
  sta IrqJumpLo
  lda IRQCallbackTable+1,x
  sta IrqJumpHi
  rts

.reloc
IRQCallbackTable:
  .word (IrqMessageBoxTopHandler)
  .word (IrqMessageBoxBottomHandler)
  .word (IrqVerticalScreenWrapHandler)
  .word (IrqStatusBarAndAudio)
  .word (IrqInventoryUpdateCHRROMForMagic)
  .word (IrqAnimateSNKLogoScroll)


.reloc
; Temporarily updates the scroll for the frame by wrapping the Y scroll value at #$e8
UpdatePpuScrollWrapping:
  ldx ScrollYHi
  lda #$00
  ldy ScrollYLo
  cpy #(SCANLINE_FINAL - 7) ; $e8
  adc #$00 ; Sets a to 1 if ScrollYLo is greater than #$e8
  sta ScrollYHi
  jsr UpdatePpuScroll
  stx ScrollYHi ; Restore the original ScrollYHi value
  rts

.reloc
; This is used to switch banks in IRQ, so the banks 0 and 1 are
; important to change quickly to prevent graphic glitches
SwitchCHRBankForMessageBox:
  lda #$00
  sta BANKSELECT
  lda $58
  sta BANKDATA
  lda #$01
  sta BANKSELECT
  lda $59
  sta BANKDATA
  lda #$02
  sta BANKSELECT
  lda $5a
  sta BANKDATA
  lda #$03
  sta BANKSELECT
  lda $5b
  sta BANKDATA
  lda #$04
  sta BANKSELECT
  lda $5c
  sta BANKDATA
  lda #$05
  sta BANKSELECT
  lda $5d
  sta BANKDATA
  lda BankSelectShadow
  sta BANKSELECT
  rts

.reloc
; This is used to switch banks in IRQ, so the banks 0 and 1 are
; important to change quickly to prevent graphic glitches
RestoreCHRRomBanks:
  lda #$00
  sta BANKSELECT
  lda $07f0
  sta BANKDATA
  lda #$01
  sta BANKSELECT
  lda $07f1
  sta BANKDATA
  lda #$02
  sta BANKSELECT
  lda $07f2
  sta BANKDATA
  lda #$03
  sta BANKSELECT
  lda $07f3
  sta BANKDATA
  lda #$04
  sta BANKSELECT
  lda $07f4
  sta BANKDATA
  lda #$05
  sta BANKSELECT
  lda $07f5
  sta BANKDATA
  lda BankSelectShadow
  sta BANKSELECT
  rts

;;; --------------------------------

.reloc
ConfigureEarlyStatusBar:
  ; we can know if the status bar is early by checking if scrollY is $31 or $32
  ; check to see if we are in an early status bar.
  ; this could be up to 2 scanlines early.
  ScrollRangeLo = 48
  lda ScrollYLo
  sec
  sbc #ScrollRangeLo
  cmp #3 ; ScrollRangeHi - ScrollRangeLo
  bcs +
    sta IrqTmp ; stores 1 or 2
+ rts
.reloc
ConfigureStatusbar:
  StatusBarY = 195
  lda #StatusBarY
  sec
  sbc IrqTmp
  sta StatusScroll1
  rts

.reloc
ConfigureVerticalSeam:
  ; IrqTmp [in] - current scanline we are on. Either Messagebox Bot or 0 for regular screenmode
  ; theres no possibility this could be early status bar since we already checked for that
  lda #SCANLINE_STATUS - 1
  sec
  sbc IrqTmp
  sta VertSeamIrqReload
  lda #0
  sta IrqTmp
  jmp ConfigureStatusbar

.reloc
ScreenNormalPlayfield:
ScreenNametableBoss:
  lda PpuMaskShadow
  and #$18 ; check that sprites and background are enabled
  bne +
    jmp MaybeUpdateMusic
    ; implicit rts
+ 
  jsr UpdatePpuScrollWrapping
  jsr RestoreCHRRomBanks
  
  ; check if we are only drawing the status bar this frame
  ; (branches if we aren't even drawing the main game nametable)
  lda PpuCtrlShadow
  and #2
  bne UseStatusBar
    lda #SCANLINE_FINAL
    sec
    sbc ScrollYLo
    cmp #SCANLINE_STATUS - 2 ; subtract two to account for early status bar
    bcs @ChooseStatusBarCheckEarly
      ; Vertical seam handler
      sta IRQLATCH
      sta IRQRELOAD
      sta IRQENABLE
      sta IrqTmp
      
      jsr ConfigureVerticalSeam
      lda #IRQ_VERTICAL_WRAP
      jmp SetIRQCallback
      ; implicit rts
@ChooseStatusBarCheckEarly:
  jsr ConfigureEarlyStatusBar
UseStatusBar:
  jsr ConfigureStatusbar
  ; sets IrqTmp to 0-2 depending on if its an early status bar
  lda #SCANLINE_STATUS
  sec
  sbc IrqTmp
  sta IRQLATCH
  sta IRQRELOAD
  sta IRQENABLE

  lda #IRQ_STATUSBAR
  jmp SetIRQCallback
  ; implicit rts

;;; --------------------------------
;;; Message box on top of the screen (dialog, shop, item message, etc).
; Changes from Vanilla:
; Updates the scanline that the message box appears on to be at a fixed position
; In vanilla its kinda weird, but it fluctuates up to 8 pixels depending on scroll position
.reloc
ScreenMessageboxPlayfield:
ScreenNametableBossWithMsg:
  jsr UpdatePpuScrollWrapping
  jsr RestoreCHRRomBanks

  ; First set the IRQ early while we are still in vblank
  lda #SCANLINE_MSGTOP
  sta IRQLATCH
  sta IRQRELOAD
  sta IRQENABLE

  ; Precalculate all scanline data for the messagebox
  ; Check for a late messagebox bottom. This is similar to early status bar,
  ; but is much rarer. This only happens if the bottom of the message box is within
  ; two scanlines of the vertical seam. If so, we need to fire it up to two scanlines
  ; later, which will just draw the BG color for those two lines.
  ; we can detect this if ScrollYLo + MsgBoxY <= SCANLINE_FINAL+1 < ScrollYLo + MsgBoxY + 2
  lda #SCANLINE_FINAL - SCANLINE_MSGBOT
  sec
  sbc ScrollYLo
  cmp #3
  bcs @SetupMessageBot
    sta IrqTmp
@SetupMessageBot:
  lda #SCANLINE_MSGBOT - SCANLINE_MSGTOP
  clc
  adc IrqTmp
  sta MsgTopIrqReload
  lda #SCANLINE_MSGBOT + 2 ; account for scanline lag
  clc
  adc IrqTmp
  clc
  adc ScrollYLo
  bcs +
  cmp #SCANLINE_FINAL + 1
  bcc ++
+ adc #$0f
  ; Y to $2005
++sta MsgBotScroll1
  and #$f8
  asl
  asl
  sta MsgBotAddr2
  lda ScrollXLo
  lsr
  lsr
  lsr
  ora MsgBotAddr2
  sta MsgBotAddr2
  
  ; If IrqTmp has a value in it, then we are doing a late msgbox
  lda IrqTmp
  bne @LateMessageBox
    ; If we aren't doing a late one, then we need to check and see if vertical screenwrap or status bar is next
    lda #SCANLINE_FINAL
    sec
    sbc ScrollYLo
    cmp #SCANLINE_STATUS - 2 ; subtract two to account for early status bar
    bcs @StatusBar
    cmp #SCANLINE_MSGBOT + 2
    bcc @StatusBar
      ; vertical seam
      sta IrqTmp
      sec
      sbc #SCANLINE_MSGBOT + 2
      sta MsgBotIrqReload

      jsr ConfigureVerticalSeam
      lda #<IrqVerticalScreenWrapHandler
      sta MsgBotNextIrqLo
      lda #>IrqVerticalScreenWrapHandler
      sta MsgBotNextIrqHi
      
      lda #IRQ_MESSAGE_TOP
      jmp SetIRQCallback
      ; implicit rts
    ; MsgBotIrqReload
@StatusBar:
@LateMessageBox:
  lda #SCANLINE_STATUS - SCANLINE_MSGBOT- 2 ; -2 for scanline lag?
  sec
  sbc IrqTmp
  sta MsgBotIrqReload

  lda #0
  sta IrqTmp
  jsr ConfigureEarlyStatusBar
  jsr ConfigureStatusbar

  lda #<IrqStatusBarAndAudio
  sta MsgBotNextIrqLo
  lda #>IrqStatusBarAndAudio
  sta MsgBotNextIrqHi

  lda #IRQ_MESSAGE_TOP
  jmp SetIRQCallback
  ; implicit rts

; Changes from vanilla: NONE
.reloc
ScreenPlayerStatus:
  lda PpuCtrlShadow
  and #$fc ; clear the previous nmt value
  ora #$02 ; set nametable 2
  sta PPUCTRL
  lda #0
  sta PPUSCROLL
  sta PPUSCROLL
  jsr SwitchCHRBankForMessageBox
  lda PpuMaskShadow
  and #$18 ; check if we have either sprites or background enabled
  bne +    ; and if we do skip updating music. presumably that will run later
   jmp MaybeUpdateMusic
   ; implicit rts
+ 
  jmp UseStatusBar
  ; implicit rts

; Changes from Vanilla: NONE
.reloc
ScreenMovie:
  lda PpuMaskShadow
  sta PPUMASK
  jsr UpdatePpuScroll
  jsr RestoreCHRRomBanks
  sta IRQDISABLE
  jmp MaybeUpdateMusic

; Changes from vanilla. It used $58 as a split line, but the value for $58 was constant
; so just load the constant instead
.reloc
ScreenSNKAnimation:
  jsr UpdatePpuScroll
  jsr RestoreCHRRomBanks
  lda #SCANLINE_SNK_LOGO
  sta IRQLATCH
  sta IRQRELOAD
  sta IRQENABLE
  lda #IRQ_SNK_LOGO
  jmp SetIRQCallback

; Changes from Vanilla:
; Rewrite this method to setup the IRQ callback sooner than later.
; It needs to happen before the first scanline is run or it causes the status bar to bounce
.reloc
ScreenInventory:
  ; Its important to set the PPU values before vblank ends so do that first
  lda PpuCtrlShadow
  sta PPUCTRL
  lda #0
  sta PPUSCROLL
  sta PPUSCROLL

  lda #SCANLINE_INVENTORY
  sta IrqTmp
  sta IRQLATCH
  sta IRQRELOAD
  sta IRQENABLE

  jsr SwitchCHRBankForMessageBox

  lda #IRQ_INVENTORY
  jmp SetIRQCallback
  ; implicit rts

.popseg ; 3d

.popseg ; fe,ff
