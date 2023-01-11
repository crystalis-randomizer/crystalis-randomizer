;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to the player death routines.  Includes
;;;  1. Fix opel statue to work even if not equipped.
;;;  2. Add (optional) stat tracking to count deaths.

.segment "13", "fe", "ff"   ; TODO - check 12

.ifdef _FIX_OPEL_STATUE
;; Search inventory for a statue
.reloc
CheckOpelStatue:
.ifndef _NEVER_DIE
  lda $6440,x
  cmp #$26
  beq +
   dex
   bpl CheckOpelStatue
    jmp PlayerDeath
+ stx SelectedConsumableIndex
  lda #$0a
  sta EquippedConsumableItem
  jmp ActivateOpelStatue
.else
  ;; Special code path for "never die" mode
  ;; (just automatically activate opels)
  jsr ActivateOpelStatue
  lda #$08
  sta $41
  rts
.endif

;;; Fix opel statue bug that undid change/dolphin rather than status
.org $b903
  and #$f0

.org $b912
  ldx #$07
  jmp CheckOpelStatue
FREE_UNTIL $b91c
.endif

.ifdef _STATS_TRACKING
.org $b91e ; PlayerDeath
  jsr PatchPlayerDeath

.reloc
PatchPlayerDeath:
  inc StatsDeaths
  jmp StartAudioTrack
.endif ; _STATS_TRACKING
