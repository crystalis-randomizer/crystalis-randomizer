;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

.segment "0f", "fe", "ff"

.ifdef _OOPS_ALL_MIMICS

; Patch the ObjectActionJump_6f to add a check for if we killed insect,
; add a flag to reset the screen mode when touching the chest, and then
; also move the chest down 16 px so it doesn't get trapped in the invisible
; wall when it spawns

; The patch point at $b825 is already used in stat tracking for
; setting the time stamp for boss death, so use a nearby one instead
.org $b82a
  jsr MoveInsectBossChest

.reloc
MoveInsectBossChest:
  cpy #2 ; Insect boss
  bne +
    lda #$a0
    sta $b0,x
    lda #INSECT_MIMIC
    sta $06c0,x
  ; finally run the patched instruction
+ lda $b96b,y ; BossKillDataTable
  rts

.endif ; _OOPS_ALL_MIMICS

;; Prevent soft-lock when encountering sabera and mado from reverse
;; Returns N (negative/false) if player is not on same screen as boss
;; and is at row 9, which causes the caller to return without
;; proceding any further in the action.  We skip the vanilla
;; "on-screen" check in favor of our own version that is not
;; skippable.
.reloc
CheckBelowBoss:
    ; skip the check for sabera 1 and mado 1
    lda $04a0,x
    and #$fe
    cmp #$e6  ; sabera and mado
    bne @CheckPosition
     lda #$dc
     cmp $04c0,x  ; first version has #$cf, second has #$dc
     bne @ReturnImmediate
     ;; This entirely removes the delay before Sabera 2
     lda #$3f
     sta $0620,x
@CheckPosition:
    ;; Check that we're on the correct y-screen
    lda $d0
    cmp $d0,x
     bne @ReturnFalse
    ;; Check that we're on the correct x-screen
    lda $90
    cmp $90,x
     bne @ReturnFalse
    ;; Check that we're on the 9th tile down
    lda $b0
    and #$f0
    cmp #$90
     beq @ReturnTrue
    ;; This is a little over-clever, but it compresses 6 bytes
    ;; (@ReturnFalse: lda #$ff; rts; @ReturnTrue: lda #$00; rts)
    ;; into only 4 by jumping into a misaligned opcode.
    ;; Specifically, jumping to @ReturnFalse reads as "lda #$a9; rts"
    ;; while jumping one byte further reads as "lda #$60; rts", so
    ;; it effectively returns true.  It might be possible to do this
    ;; with only three bytes if there were a positive one-byte opcode
    ;; that always set the negative flag, or a negative one-byte op
    ;; that always cleared it, but the only relevant op is LSR, which
    ;; clears it and is positive, so we're out of luck there.
@ReturnFalse:
    .byte $a9  ; lda (immediate)
@ReturnTrue:
    lda #$60   ; rts
@ReturnImmediate:
    rts

.org $a48b  ; vampire pattern 0
  jsr CheckBelowBoss
.org $a971  ; kelbesque pattern 0
  jsr CheckBelowBoss
.org $ac8f  ; sabera pattern 0
  jsr CheckBelowBoss
.org $ade8  ; mado pattern 0
  jsr CheckBelowBoss


.ifdef _NERF_MADO
;;; Mado's cannonball time is a function of his HP: framecount = HP + #$20.
;;; This causes problems when HP >= #$e0, since it overflows.  We can make
;;; sure he bounces for less time by dividing by two instead of clearing
;;; carry.  We also change the shift to #$18, making the range 24..152
;;; rather than 0..255.
.org $ae53
  lsr
  adc #$18
.endif


.ifdef _FIX_VAMPIRE
;;; Fix vampire to allow >60 HP.  Normally at 61 HP there's an overflow
;;; and the teleport animation gets really fast until HP drops below 61.
.org $a576
  jsr ComputeVampireAnimationStart
  nop
.assert * = $a57a ; match up exactly to next instruction

.reloc
ComputeVampireAnimationStart:
   bcs +
   asl
   bcs +
   adc #$10
   bcc ++
+  lda #$ff
++ rts

.endif

;;; Ensure Draygon 2 spawns directly if bow of truth was used earlier.
.org $b1a1
  jsr SpawnDraygon

;;; Once we use the Bow of Truth, it's gone, so we need to make sure
;;; any future encounters with Draygon 2 automatically go to the
;;; final form.  Since triggers and itemuse actions share the same
;;; address space, we add a fake trigger $a0 that has the same reveal
;;; action as using the Bow of Truth.  But rather than placing it on
;;; the screen (and incurring lag by stepping on it) we instead
;;; simulate it during the "start fight" object action by setting
;;; 0623 and 057f as if we were standing in front of it.  To get this
;;; right we actually need to move the UsedBowOfTruth trigger to a
;;; fixed position (02f) that we can check easily.
.reloc
SpawnDraygon:
  inc $0600,x ; original action
  lda $06c3
  beq +       ; make sure we're looking at draygon 2, not 1
  lda $6485
  bpl +       ; check flag 02f
  lda #$1f
  sta $0623
  lda #$a0
  sta $057f
  lda #$07 ; trigger tile
  sta $41
+ rts

;;; We moved the LV(menu) display from 06 to 0e so display that instead
.org $bd27
  lda #$0e

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

;;; This is a far entry in the jump table (????)
;;; Automatically spawn the insect if we've blown the flute and warped out
.org $a410
  .word (MaybeSpawnInsect)      ; ObjectActionJump_7e

.reloc
MaybeSpawnInsect:
  lda $038d
  bmi +
   bit $6488
   bvc +
    lda #$e2
    sta $04ad
+ rts

;;; Reset programmatically by bosses.ts
.import bossMusic_vampire, bossMusic_insect, bossMusic_kelbesque, \
        bossMusic_sabera, bossMusic_mado, bossMusic_karmine, \
        bossMusic_draygon1, bossMusic_draygon2, bossMusic_dyna
