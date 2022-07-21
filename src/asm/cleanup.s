
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
            sta ScrollXLo
            lda $a3
            sta ScrollXHi
            lda $c3
            sta ScrollYLo
            lda $e3
            sta ScrollYHi
            jmp @SkipOAMDMA
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
InitialIRQHandler:
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
    ; txa
    ; .byte $cb, $f8 ; axs #$f8 ; removed for now since it breaks steves emu
    txa
    clc
    adc #$08
    tax
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
  jsr RequestAttributeTable0Write

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

.popseg ; "fe", "ff"

; Resample DMC to use less space overall
.pushseg "18", "fe", "ff"

.org $8bdc
  ; We resampled the original sample to a playback rate of 8, shrinking the sample from
  ; 992 bytes to 288 bytes.
  .byte $0f,$ff,$e8,$3c
  FREE_UNTIL $8c0c

; Resampled DMC audio binary
; .org $fa00

FREE "ff" [$fa00, $fe00) ; rts at 3fe00 is important

.popseg ; 18,fe,ff


.ifdef _FIX_SHAKING

.pushseg "fe", "ff"

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

; Free the original IRQ space
.org $f422
  FREE_UNTIL $f6ad


;;;---------
; Update the Reset function to setup the jmp (IRQHandler) in zp

MaybeUpdateMusic = $f7fe

.define IRQJumpJmpAbsolute $54
.define IRQJumpLo $55
.define IRQJumpHi $56
.define IRQScanline $57

.define IRQ_VERTICAL_WRAP $00
.define IRQ_STATUSBAR     $01
.define IRQ_MESSAGE_TOP   $02
.define IRQ_MESSAGE_BOT   $03
.define IRQ_SNK_LOGO      $04
.define IRQ_INVENTORY     $05

.define SCANLINE_MSGTOP    12
.define SCANLINE_MSGBOT    85
.define SCANLINE_STATUS    191
.define SCANLINE_FINAL     239


.org $f2f6 ; in HandleReset
  lda #$4c
  sta IRQJumpJmpAbsolute
  ;; In vanilla, this is just a pointer to a random RTI instruction
  ;; so I pointed this to the RTI in NMI
  lda #<InitialIRQHandler
  sta IRQJumpLo
  lda #>InitialIRQHandler
  sta IRQJumpHi
.assert * = $f302

;;; --------------------------------
;;; Sets the callback to run in the IRQ handler to the
;;; callback indexed by A, saving the index in $56 and
;;; the jump table entry in ($0054).
.org $fffe ; VectorIRQ
  .word (IRQJumpJmpAbsolute)

.reloc
SetIRQCallback:
  ;; TODO - $56 is a very likely candidate to change from ZP to ABS
  ;; Its only read once in the code when changing teleport spots
  ; sta $56
  asl
  tax
  lda IRQCallbackTable,x
  sta IRQJumpLo
  lda IRQCallbackTable+1,x
  sta IRQJumpHi
  rts

IRQtmp = $07fe

.macro FastSetIRQCallback a
  lda IRQCallbackTable + (a * 2)
  sta IRQJumpLo
  lda IRQCallbackTable + (a * 2) + 1
  sta IRQJumpHi
.endmacro

.reloc
IRQCallbackTable:
  .word (VerticalScreenWrapHandler)
  .word (StatusBarAndAudio)
  .word (MessageBoxTopHandler)
  .word (MessageBoxBottomHandler)
  .word (AnimateSNKLogoScroll)
  .word (InventoryUpdateCHRROMForMagic)

.reloc
VerticalScreenWrapHandler:
  pha
    sta IRQDISABLE
    sta IRQENABLE
    ;; Instead of burning cycles, we can setup the next IRQ
    lda #SCANLINE_STATUS - 1 ; offset by one to cover for this irq taking 1 scanline
    sec
    sbc IRQScanline
    sta IRQLATCH
    sta IRQRELOAD

    FastSetIRQCallback IRQ_STATUSBAR

    ; After the first two writes and setup is done, we end up on dot 180
    ; so we need to stall for about 28 cycles.
    .repeat 4
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
    ; IRQtmp == Low byte of nametable address to $2006, which is ((Y & $F8) << 2) | (X >> 3)
    lda ScrollXLo
    lsr
    lsr
    lsr
    sta IRQtmp
    ; Timing should be in hblank (between dot 257 and 320)
    lda ScrollXLo
    sta PPUSCROLL
    lda IRQtmp
    sta PPUADDR
  pla
  rti

.reloc
StatusBarAndAudio:
  ; we need to preserve all of the registers because of MaybeUpdateMusic, so might
  ; as well do it while waiting for hblank
  pha
    txa
    pha
      tya
      pha
        sta IRQDISABLE
        
        ; set draw background on
        lda PpuMaskShadow
        and #$0e
        ora #$08
        sta PPUMASK

        lda #0
        sta IRQtmp

        ;; first two PPU writes can happen early before we need to wait
        lda PPUSTATUS ; reset address latch
        ; Nametable number << 2 (that is: $00, $04, $08, or $0C) to $2006
        lda #$08
        sta PPUADDR

        ; Y to $2005 -- The Y value will always be 194 - (0|1|2) depending on how early it is
        ; we can know if the status bar is early by checking if scrollY is $31 or $32
        ; check to see if we are in an early status bar.
        ; this could be up to 2 scanlines early.
        ScrollRangeLo = $30 ; we need $31 to map to 1, so start at $30 instead
        ScrollRangeHi = $32 + 1 ; +1 to account for >= in cmp/bcs
        lda ScrollYLo
        sec
        sbc #ScrollRangeLo
        cmp #ScrollRangeHi - ScrollRangeLo
        bcs +
          ; TODO we have enough timing window here that burning these cycles isn't a problem
          ; but a maybe potential opt is to use a zp for IRQtmp and use BIT sta IRQtmp to skip the sta
          ; if the scroll is not in the range
          sta IRQtmp ; stores 1 or 2
+       bcc +
          ; make the branch constant time by countering out the sta with another branch
          nop
          nop
+       StatusBarY = 195
        lda #StatusBarY
        sec
        sbc IRQtmp
        sta PPUSCROLL

        .repeat 3
          php ; stall for a few cycles
          plp
        .endrepeat

        ; Timing should be in hblank (between dot 257 and 320)
        lda #0
        ; earliest dot for this scroll set is 259
        sta PPUSCROLL
        lda #<((StatusBarY & $f8) << 2) 
        sta PPUADDR
    
        ldx #$00
        stx BANKSELECT
        lda #$3c
        sta BANKDATA
        inx
        stx BANKSELECT
        lda #$38
        sta BANKDATA
        ; restore the bank select from shadow
        lda $50
        sta BANKSELECT
        ;; Attempt to process a little music before NMI
        ;; If it skips NMI then go ahead and draw setup the screenmode and cause a lag frame
        ; NmiSkipped increments every time it skips, so store it and check to see if it changes
        lda NmiSkipped
        pha
          DISABLE_NMI
          jsr MaybeUpdateMusic
          ENABLE_NMI
        pla
        cmp NmiSkipped
        beq +
          ; if NMI was skipped then we need to run the ScreenMode for this frame
          jsr ExecuteScreenMode
    + pla
      tay
    pla
    tax
  pla
  rti

.reloc
MessageBoxTopHandler:
  pha
    sta IRQDISABLE
    sta IRQENABLE
    
      ; set the next one to run #$49 == 73 scanlines from now
    lda #SCANLINE_MSGBOT - SCANLINE_MSGTOP
    sta IRQLATCH
    sta IRQRELOAD
    ; ; clc
    sec ; add 1 to account for scanline lag?
    adc IRQScanline
    sta IRQScanline
    
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

    ; We didn't have enough cycles to swap this sprite CHR bank earlier, so do it now
    lda #$05
    sta BANKSELECT
    lda $5d
    sta BANKDATA
    
    ; restore bankselect mirror
    lda $50
    sta BANKSELECT

    ; spend some time to setup the values for the msg box bottom IRQReload/Scanline/Callback
    ; message boxes are a holding pattern anyway, so burning cycles here isn't critical.
    lda IRQScanline
    sta IRQtmp
    lda #0
    sta $5e
    jsr ChooseVerticalSeamOrStatusBar

  pla
  rti

.reloc
MessageBoxBottomHandler:
  pha
    sta IRQDISABLE
    sta IRQENABLE
    
    ; We already caluclated the next frames IRQ timing
    lda IRQtmp
    sta IRQLATCH
    sta IRQRELOAD


    lda PPUSTATUS ; reset address latch
    ; Nametable number << 2 (that is: $00, $04, $08, or $0C) to $2006
    lda #$00
    sta PPUADDR

    ; convert from screen position to ppu scroll
    ; for the message box bottom position
    ; map scroll goes from 0 - $ef, so if we go past that we need to wrap around
    lda ScrollYLo
    clc
    adc IRQScanline
    bcs +
    cmp #SCANLINE_FINAL + 1 ; checking if its less than so we need to add one
    bcc ++ ; if we are already at the end of the nametable add $10 (== $ff - SCANLINE_FINAL)
+    adc #$10       ; adc #imm is 2 cycles, so we need to account for 2 extra cycles of jitter
++  ; Y to $2005
    sta PPUSCROLL
    and #$f8
    asl
    asl
    sta IRQtmp

    ; IRQtmp == Low byte of nametable address to $2006, which is ((Y & $F8) << 2) | (X >> 3)
    lda ScrollXLo
    lsr
    lsr
    lsr
    ora IRQtmp
    sta IRQtmp

    ; we can spare a little extra time here
    lda $5e
    sta IRQScanline

    ; Timing should be in hblank (between dot 257 and 320)
    lda ScrollXLo
    sta PPUSCROLL
    lda IRQtmp
    sta PPUADDR
    lda #$00
    sta BANKSELECT
    lda $07f0
    sta BANKDATA


    jsr RestoreCHRRomBanks

    lda $5f
    beq +
    FastSetIRQCallback IRQ_STATUSBAR
  pla
  rti
+   FastSetIRQCallback IRQ_VERTICAL_WRAP
  pla
  rti
  
.reloc
InventoryUpdateCHRROMForMagic:
  pha
    sta IRQDISABLE
    sta IRQENABLE
    lda #$00
    sta BANKSELECT
    lda $5e
    sta BANKDATA
    clc
    adc #1
    sta BANKSELECT
    lda $5f
    sta BANKDATA
    lda $50
    sta BANKSELECT
    lda #SCANLINE_STATUS
    sec
    sbc IRQScanline
    sta IRQLATCH
    sta IRQRELOAD
    lda #IRQ_STATUSBAR
    jsr SetIRQCallback
  pla
  rti


;;; --------------------------------
.reloc
AnimateSNKLogoScroll:
  pha
    ; do nothing for ~60 cycles
    lda #$e9 ;hides 'SBC #$2A'
      rol A ;first loop only
      nop
      bcs *-3
    php
    plp
    ; now set the scroll
    sta IRQDISABLE
    lda PPUSTATUS
    lda $59
    sta PPUADDR
    lda $5a
    sta PPUADDR
  pla
  rti
.endif

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
  lda $50
  sta BANKSELECT
  rts



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


.org $f6e2
  jsr RestoreCHRRomBanks
.org $f734
  jsr RestoreCHRRomBanks
.org $f762
  jsr SwitchCHRBankForMessageBox
.org $f779
  jsr RestoreCHRRomBanks
.org $f785
  jsr RestoreCHRRomBanks
.org $f7c8
  jsr RestoreCHRRomBanks
.org $f7e8
  jsr SwitchCHRBankForMessageBox

.org $f882 ; MaybeUpdateMusic
  stx $50
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
  lda $50
  sta BANKSELECT
  rts

; Update various locations that SetIRQCallback

.org $f6e5
  jmp CalculateIRQForNextFrame
FREE_UNTIL $f71b

.reloc
CalculateIRQForNextFrame:
  lda #0
  sta IRQtmp
  sta $5e
  lda PpuCtrlShadow
  lsr
  lsr
  bcs @StatusBar
    ; 
    jsr ChooseVerticalSeamOrStatusBar
    bpl + ; unconditional a is always 0 or 1 at this point
@StatusBar:
    jsr ChooseStatusBar
+ ; IRQtmp is the IRQRELOAD value
  ; $5e is next value of IRQScanline
  ; $5f is the IRQCallback
  lda IRQtmp
  sta IRQLATCH
  sta IRQRELOAD
  sta IRQENABLE
  lda $5e
  sta IRQScanline
  lda $5f
  jmp SetIRQCallback
  ; implicit rts

ChooseVerticalSeamOrStatusBar:
  ; precalculate the irq reload values for the next screen bottom.
  ; this part has a lot of branches, so its hard to do before the hblank starts
  ; vanilla calculates the ppuaddr/scroll, and stores the values in $5e and $5f
  ; but thats relatively less branchy than this part

  ; input IRQtmp - current scanline that we are on. 0 if in NMI

  lda #SCANLINE_FINAL
  sec
  sbc ScrollYLo
  cmp #SCANLINE_STATUS - 2 ; subtract two to account for early status bar
  bcs ChooseStatusBarCheckEarly

  cmp IRQtmp     ; check if the message box is hiding the seam
  bcc ChooseStatusBarCheckEarly
  pha
    sec
    sbc IRQtmp
    sta IRQtmp
  pla
  sta $5e
  lda #IRQ_VERTICAL_WRAP
  sta $5f
  rts
ChooseStatusBarCheckEarly:
  ; Early status bar is an 1-2 pixel gap in vanilla
  ; where the vertical seam handler *should* run but won't due to problems getting
  ; mmc3 scanline to fire twice in a row. (Its possible, just vanilla didn't do it)
  ; We could work around this with timed code in the future, but for now, just displaying
  ; bg color will be fine. We do this by firing the scanline earlier, and adjusting
  ; for the fine Y offset in the IRQ
  sbc #SCANLINE_STATUS
  bpl ChooseStatusBar
    ; The value is with -1 or -2, store it here and subtract it from the scanline
    sta $5e
ChooseStatusBar:
  lda #SCANLINE_STATUS
  clc
  adc $5e
  pha
    sec
    sbc IRQtmp
    sta IRQtmp
  pla
  sta $5e
  lda #IRQ_STATUSBAR
  sta $5f
  rts

.org $f737
  ; CHANGED from vanilla - Instead of doing some math to change the position,
  ; just fix it to 8 pixels from the top. Makes life easier
  lda #SCANLINE_MSGTOP
  sta IRQScanline
  sta IRQLATCH
  sta IRQRELOAD
  sta IRQENABLE
  lda #IRQ_MESSAGE_TOP
  jmp SetIRQCallback
FREE_UNTIL $f751

.org $f7a5
  ; UNUSED?

.org $f7d6
  lda #IRQ_SNK_LOGO
  jmp SetIRQCallback

.org $f7ed
  lda #IRQ_INVENTORY
  jsr SetIRQCallback

.popseg ; 18,fe,ff
