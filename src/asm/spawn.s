;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to object spawn routines
;;;  1. White robots appear immediately outside the tower, rather than
;;;     waiting for brown robots to die (or randomly waiting for player
;;;     to walk on top of their spawn point).
;;;  2. Free some space in NpcDataJump_4 (fixed bank, may be related to
;;;     walls.s?)


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
