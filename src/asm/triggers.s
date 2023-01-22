;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to trigger squares and item-use actions
;;;  1. Patch the end of ItemUse to check for a few more items
;;;  2. Fix a weird interaction when stepping on a trigger causes a location
;;;     change (e.g. from getting Sword of Thunder)
;;;  3. Sets trigger action 4 to a "game start" trigger, which we put on the
;;;     initial spawn square in Mezame (for now, this is just starting the
;;;     trainer, if it's installed)
;;;  4. Optionally disable trigger skip
;;;  5. Patch some triggers to call the correct ReloadNpcsForLocation
;;;  6. Consolidate itemuse/trigger table logic to use GrantItemFromTable
;;;     (itemget.s) and other things.
;;;  7. Refactor ivory statue slightly (maybe just freeing space?)
;;;  8. Combine bow-use actions into a single script

.segment "0e", "0f"

.org $834d
  jmp PatchTradeInItem

;; TODO - extra item indirection preamble...
;; handle different checks

;;; Fix the overly-long loop to find broken statue
;; .org $1c585
;;   ldx #$08
;; - lda $6450,x
;;   cmp #$38    ; broken statue
;;   beq +
;;   dex
;;   bpl -
;;   jmp $84db

;;; Allow giving arbitrary items for broken statue trade-in
.org $8594
  lda #$ff
;  sta $6450,x
  ;rts
;;   ;; 9 free bytes, could be more if we remove the unused Flute of Lime checks
;; .assert * <= $1c59e

;.org $1c596
;  jsr $d22b ; grant item in register A
;  jsr FixStatue
 ; jmp FixStatue

;; Count uses of Flute of Lime and Alarm Flute - discard after two.
.segment "0e", "0f", "fe", "ff"
.reloc
PatchTradeInItem:
    cmp #$28  ; flute of lime
    beq @FluteOfLime
    cmp #$31  ; alarm flute
    bne @DoTradeIn
    lda #$40
    SKIP_TWO_BYTES ; skip the next instruction (safe b/c $80a9 is prg rom)
@FluteOfLime:
    lda #$80
    sta $61
    lda $648e ; check flag 076 (alarm flute) or 077 (flute of lime)
    and $61
    bne @DoTradeIn
    lda $648e
    ora $61
    sta $648e
    ;; Deselect current item
    lda #$00
    sta $0715
    lda #$80
    sta $642e
    rts
@DoTradeIn:
    jmp ItemUse_TradeIn


.segment "fe", "ff"

;; End of ActivateTriggerSquare restores game mode to normal,
;; but if sword of thunder comes from trigger square, this will
;; clobber the LOCATION_CHANGE mode.  Patch it to call out to
;; FinishTriggerSquare to check for mode 02 and if it is, don't
;; change it back.
.org $d54b ; change this to call FinishTriggerSquare
  lda $41
  cmp #$01  ; game mode: location change
  jmp FinishTriggerSquare
.assert * = $d552

.reloc
FinishTriggerSquare:
  beq +
   lda #$08  ; game mode normal
   sta $41
+ jmp MainLoop_01_Game

;; Change trigger action 4 to do any "start game" actions.
.org $d56b
  .word (InitialAction)

;;; Defines code to run on game start
.reloc
InitialAction:
.ifdef _TRAINER
  jsr TrainerStart
.endif
  rts


; possibly better to just have a bitset of modes that need to set the latch
; or patch the {lda 8; sta GameMode} that should be in every one?
.ifdef _DISABLE_TRIGGER_SKIP
.org $d497
  jsr FixTriggerSkip_LatchOnItemUse
.org $dd70
  jsr FixTriggerSkip_LatchOnMagicUse
.org $decb
  jsr FixTriggerSkip_LatchOnMagicUse

.reloc
FixTriggerSkip_LatchOnItemUse:
  lda #$01
  sta $61fd
  rts

.reloc
FixTriggerSkip_LatchOnMagicUse:
  sta $07de
  lda #$01
  sta $61fd
  rts

;;; NOTE: We should move this to 34c0e after making _FIX_COIN_SPRITES
;;; mandatory.
.reloc
FixTriggerSkip_CheckLatch:
  lsr $61fd
  bcc +
  pla
  pla
+ lda $0710
  rts
.endif

;;; This looks like it was an attempt to fix the trigger skip, but
;;; as far as I can tell, it's unused.
;; .reloc
;; GameModeJump_05_ItemTrigger:
;;   lda $0623
;;   pha
;;    lda $6c
;;    pha
;;     jsr $d497 ; 3d497 game mode 06 item use
;;    pla
;;    cmp $6c
;;    bne ++
;;   pla
;;   sta $0623
;;   lda $41
;;   cmp #$08
;;   bne +
;;    dec $41
;;    jmp $d3eb ; 3d3eb game mode 07 trigger
;; + rts
;; ++ pla
;;   rts


;;; For these, just eliminate the indirection: update the jump table directly.
.org $d56f
  .word ($e144)  ; ItemOrTriggerActionJumpTable[$06]
.org $d585
  .word ($e144)  ; ItemOrTriggerActionJumpTable[$11]

;;; TODO - we should free 3d6d5 and possibly move around the nearby routines
;;; to make more contiguous blocks.  We should also be able to kill two
;;; separate entries that just point to returns (04 and 00/03/05/12/1a).
;;; We might also be able to move these into a less-valuable bank (or to an
;;; expanded bank)?  Note that 04 is already repurposed for InitialAction,
;;; but the `rts` at d653 is still unused.


;;; ================================================================
;;; Consolidate some of the ItemOrTrigger -> itemget logic. (@@sog)
;;; A number of different message actions can be combined into a single
;;; one once we expose the active trigger ID at $23.

;;; TODO - change the actions on the messageids rather than repeat jumps
;;;   08,0d,0f -> 0b, 14 -> 13
;;;   ==> if we do this then we need to fix logic/world.ts
;;; We could free up 4 new actions (in addition to the 3 or so unused ones)
.org $d573                        ; ItemOrTriggerActionJumpTable + 2*$08
  .word (GrantItemFromTable)      ; 08 learn paralysis
.org $d579                        ; ItemOrTriggerActionJumpTable + 2*$0b
  .word (GrantItemFromTable)      ; 0b learn barrier
  .word (GrantItemThenDisappear)  ; 0c love pendant -> kensu change
  .word (GrantItemFromTable)      ; 0d kirisa plant -> bow of moon
  .word (UseIvoryStatue)          ; 0e
  .word (GrantItemFromTable)      ; 0f learn refresh
.org $d589                        ; ItemOrTriggerActionJumpTable + 2*$13
  .word (DestroyStatue)           ; 13 use bow of moon
  .word (DestroyStatue)           ; 14 use bow of sun

.reloc
GrantItemThenDisappear:  ; Used by Kensu in granting change (item action 0c)
  jsr GrantItemFromTable
  ldy #$0e
  jmp $d31f


.reloc
UseIvoryStatue:  ; Move bytes from $7d6ec (NOTE: 01_init.s frees d6d5..d746)
  jsr $e144 ; LoadNpcDataForCurrentLocation
  ldx #$0f
  lda #$1a
  jsr BankSwitch8k_8000 ; BankSwitch8k_8000
  jsr $98a8 ; ReadObjectCoordinatesInto_34_37
  ldx #$1e
  stx $10
  jsr $9897 ; WriteObjectCoordinatesFrom_34_37
  lda #$df
  sta $11
  jsr $c25d ; LoadOneObjectDataInternal
  lda #$a0
  sta $033e
- rts
DestroyStatue:
  ;; Modified version to use the ID of the used bow rather than have
  ;; a separate action for each bow.
  lda #$00
  ldy $34  ; $3e for moon -> 4ad, $3f for sun -> 4ae ==> add 46f
  sta $046f,y
  lda #$6b
  jsr $c125 ; StartAudioTrack
  jsr $d88b
  lda $04ad
  ora $04ae
  bne -  ; rts from previous
  lda #$7f
  sta $07d7
  lda $04cf
  sta $11
  lda #$0f
  sta $10
  jmp $c25d ; LoadOneObjectDataInternal


.org $d7fd ; itemuse action jump 1c - statue of onyx -> akahana
  jsr GrantItemFromTable
  nop
  nop

;;; In HandleItemOrTrigger, backup $23 in $10 rather than using it for the
;;; JMP opcode, and then call Jmp11 instead.
.org $d845
  lda $23
  sta $34

.org $d853
  jsr Jmp11
