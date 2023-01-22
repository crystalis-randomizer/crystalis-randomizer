;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to object spawn routines
;;;  1. White robots appear immediately outside the tower, rather than
;;;     waiting for brown robots to die (or randomly waiting for player
;;;     to walk on top of their spawn point).
;;;  2. Free some space in NpcDataJump_4 (fixed bank, may be related to
;;;     walls.s?)
;;;  3. Change spawn handling to repurpose $fe or $fd in the first byte
;;;  4. Allow randomizing flyer spawn positions (for rage skip)


.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

;;; Make white robots appear immediately outside tower.
.org $b5f3                 ; $375f3 is action script for waiting white robots
  jsr ReleaseWhiteRobots

.reloc
ReleaseWhiteRobots:
  lda $6c
  and #$f8
  cmp #$58
  bne +
   txa
   asl
   asl
   rts
+ pla
  pla
  jmp $b61b


.segment "fe", "ff"

;;; Free a few bytes in NpcDataJump_4 by jumping earlier to avoid duplication.
.org $e22c
  jmp $e284
  FREE_UNTIL $e239
;; .org $e2a8  ; NOTE: This is no good because we use SpawnWall instead!
;;   jmp $e284
;;   FREE_UNTIL $e2b5
.org $e3b8 ; NpcData_LoadTrigger
  lda #$0e
  jmp $e284
  FREE_UNTIL $e3c7


;;; Vanilla returns out of timer spawns when it sees a "commented" spawn
;;; (anything matching $fx).  We want to repurpose $fe, so change this to
;;; check instead for specifically $ff; $fe will never be a timer (this
;;; is guaranteed by Spawn's [Symbol.iterator] method).
.org $e0ff
  nop
  nop
  cmp #$ff
.assert * = $e103


.ifdef _RANDOM_FLYER_SPAWNS

.org $e1c9 ; In middle of TryNpcSpawn, replacing {iny; lda $2c}
  jsr RandomizeFlyerSpawnPosition

.reloc
;;; When spawning an NPC, if the first two bytes are $fd,$ff then pick
;;; a random location instead.
RandomizeFlyerSpawnPosition:
  lda $2c
  eor #$02 ; $fd -> ff
  and $2d
  eor #$ff
   bne @done
  ;; Read the low 4 bits of $32 (random step counter)
  ;; for 16 possible spawn positions: each of X and Y
  ;; can be one of 4 values: 0, max, half-max, or player.
  txa
  pha
   ;; 62fc,62fd is w,h of map - use that?
   lda #$00
   sta $2c
   sta $2d
   lda $32
   lsr
   bcc +
    ldx $62fd ; map height
    stx $2c
+  lsr
   bcc +
    ldx $62dc ; map width
    stx $2d
+  lsr
   pha
    bcc +
     lsr $2c  ; half height
     bne +
      ;; player y
      lda $d0
      sta $2c
+  pla
   lsr
    bcc +
     lsr $2d  ; half width
     bne +
      ;; player x
      lda $90
      sta $2d
+  ldx #$04
-   asl $2c
    asl $2d
    dex
   bne -
  pla
  tax

  ;; Note: We could possibly shorten this routine if needed by
  ;; instead making it a +/-2 screen (in each direction) delta from
  ;; the player's current position, regardless of map size (it's
  ;; fine to spawn off the map).  This would make the bombardment
  ;; a little more relentless, since the bird wouldn't need to
  ;; traverse a potentially large map to get to the player, but
  ;; would always spawn no more than 2 screens away.
  ;; ;;     lda $32
  ;; ;;     ldx #$04
  ;; ;; -    asl
  ;; ;;      ror $2c
  ;; ;;      asl
  ;; ;;      ror $2d
  ;; ;;      dex
  ;; ;;     bne -
  ;; ;;    pla
  ;; ;;    tax

@done:
  iny      ; Replace 3 bytes at 3e1c9
  lda $2c
  rts

.endif
