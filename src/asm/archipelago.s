;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

.ifdef _ARCHIPELAGO

.segment "1a"

.org $92f5
  jmp PatchRemoveObjectY
FREE_UNTIL $92fb

.segment "fe", "ff"

.reloc
StatusWildWarp = $cbd3
StatusParalysis = $92cb
StatusStone = $9308
StatusPoison = $929c
StatusNuper = $934c

GetStatusJumpTableLo:
  .byte <StatusWildWarp, <StatusParalysis, <StatusStone, <StatusPoison, <StatusNuper
GetStatusJumpTableHi:
  .byte >StatusWildWarp, >StatusParalysis, >StatusStone, >StatusPoison, >StatusNuper

.reloc
PatchRemoveObjectY:
  lda ArchipelagoStatusFlag
  cmp #02
  beq +
  lda #$00
  sta $04a0,y
+ rts

.org $f374
  jsr ClearArchipelagoFlagsOnColdBoot

.reloc
ClearArchipelagoFlagsOnColdBoot:
  lda #0
  sta ArchipelagoStatusFlag
  sta ArchipelagoItemGet
  sta ArchipelagoItemMetaData
  jmp UnconditionallyResetCheckpointFile
  ; implicit rts

;;; Hook into the main loop right after the other hooks
;;; so it shouldn't affect anything else (this is only after input is read)
.org $cb68
  jsr HandleArchipelago

.reloc

.define MIMIC_DISPLACEMENT $18

HandleArchipelago:
  lda ArchipelagoStatusFlag
  ;check for an incoming item
  bne @AP_HasItem
  jmp HandleStatusConditions
 @AP_HasItem:
    lda #$02
    sta ArchipelagoStatusFlag
    lda ArchipelagoItemGet
    cmp #$70
    bne +
      lda $0623
      pha
        jsr FindEmptyOrMonsterSlot
        bne @AP_Finish_Mimic ; if a isn't 0 coming out, then we didn't find a slot
        stx $0623
        lda $70
        sta $70,x
        lda $90
        sta $90,x
        clc
        lda $b0
        sbc #MIMIC_DISPLACEMENT
        sta $b0,x
        lda $d0
        sbc #$00 ;bring in the carry bit
        sta $d0,x
        jsr SpawnMimic
@AP_Finish_Mimic:
      pla
      sta $0623
      jmp +++ ;unconditional
+   cmp #$ff ; check for status effect 
    bne ++
      lda ArchipelagoItemMetaData
      cmp #$03 ; poison, need to apply Battle Armor before jumping
      bne @ApplyStatus
        lda $0713 ; Equipped Armor
        cmp #$07 ; Battle Armor
        beq +++ ; if Battle armor is equipped, we're immune to poison, so just jump to the end
        lda ArchipelagoItemMetaData
@ApplyStatus:
      tax
      lda #$0d
      jsr BankSwitch16k
      jsr ArchipelagoStatusJumpHandler
      jmp +++
++  sta $23
    jsr GrantItemInRegisterA
+++ lda #$00
    sta ArchipelagoItemGet
    sta ArchipelagoStatusFlag
    sta ArchipelagoItemMetaData
    jmp HandleStatusConditions
    
.reloc
ArchipelagoStatusJumpHandler:
      ; Strategy: read table, jumps to code, code uses rts to come back here
      lda GetStatusJumpTableLo,x
      sta $10
      lda GetStatusJumpTableHi,x
      sta $11
      ; okay this is kind of stupid, but the wildwarp code pops an extra layer of stack
      ; so if we're going to jump to that code, we'll push an extra layer of stack first
      txa
      bne @jmp
        jsr @jmp ; no rts needed because the wild warp code pops the extra layer of stack
@jmp:
      jmp ($0010)  

.reloc
FindEmptyOrMonsterSlot:
  jsr BankSwitch16k_Bank6
  lda $6c
  asl
  tay
  lda NpcData,y
  sta $10
  lda NpcData+1,y
  sta $11
  bcc +
  lda NpcDataPart2,y
   sta $10
   lda NpcDataPart2+1,y
   sta $11
  ;; At this point, ($10),y == NpcData[$6c][y]
+ lda $11
  bpl ++ ; e.g. if NpcData[$6c] is $0000
  ;; Start at byte 5, slot $d, look for the slot to spawn in.
  ;; The loop is just to get to the right pair (x,y) and ensure
  ;; it's valid (not past the last entry).
  ldy #$05
  ldx #$0d
-  lda ($10),y
   eor #$f0
   and #$f0
   beq ++ ; $fx in slot => slot not used, good to go (hopefully?)
   iny
   iny ;y now at 3rd byte of slot data
   lda ($10),y
   and #$07 ;last three bits are spawn type
   beq ++ ;spawn type 0 is enemy, good to replace
   iny
   iny
   inx
   cpx #$1d
   bne -
   lda $ff
++ rts

.endif ;_ARCHIPELAGO
