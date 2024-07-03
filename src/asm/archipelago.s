;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

.ifdef _ARCHIPELAGO

.segment "fe", "ff"

;;; Hook into the main loop right after the other hooks
;;; so it shouldn't affect anything else (this is only after input is read)
.org $cb68
  jsr HandleArchipelago

.reloc
HandleArchipelago:
  lda ArchipelagoFlag
  ;check for an incoming item
  beq AP_Continue
    lda #$02
    sta ArchipelagoFlag
    lda ArchipelagoItemGet
    cmp #$70
    bne +
      jsr SpawnMimic
      bne ++ ;unconditional
+   sta $23
    jsr GrantItemInRegisterA
++  lda #$00
    sta ArchipelagoItemGet
    sta ArchipelagoFlag
AP_Continue:
  jmp HandleStatusConditions

.endif ;_ARCHIPELAGO
