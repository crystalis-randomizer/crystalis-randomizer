;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Imports the original collision routines:
;;;  - hitboxes
;;;  - projectiles, status effects
;;;  - damage dealing
;;;  - knockback
;;; Most of this code originally lived in segment "1a" alongside the
;;; vector/movement routines and the object actions, but we're moving
;;; it out into segment "3c" instead.

.segment "3c"

.reloc
MoveObjectWithSpeedAndDirection_3c:     
        FAR_JUMP_LO MoveObjectWithSpeedAndDirection


.reloc
OVERRIDE
CheckAllObjectCollisions:
        ;; Start by ensuring page 1b is loaded into the second bank
        ;; (this was done automatically in MainGameModeJump_08_Normal
        ;; in the fixed bank, but now the pages aren't contiguous, so
        ;; we can't do it with a single call).
        lda #$1b                ; smudge off
        jsr BankSwitch8k_a000
        <@34f6e@>                ; smudge from $34f6e to $34fbb
        <@34f70@>
        <@34f73@>
        ;; Even frames: $2f = 7, $2e = 8
        <@34f76@>
        <@34f78@>
        <@34f7a GlobalCounter@>
        <@34f7c@>
        <@34f7d +@>
         ;; Odd frames: $2f = #$e, $2e = 7
          <@34f7f@>
          <@34f81@>
+       <@34f83@>
        <@34f85@>
-         <@34f87@>
          <@34f89@>
          <@34f8a@>
          <@34f8b@>
          <@34f8c CollisionTable@>
          <@34f8f@>
          <@34f90 CollisionTable+1@>
          <@34f93@>
          <@34f95 CollisionTable+2@>
          <@34f98@>
          <@34f9a CollisionTable+3@>
          <@34f9d@>
          <@34f9e OP_JMP_ABS@>
          <@34fa0@>
          <@34fa2 CollisionJump@>
          <@34fa5@>
          <@34fa7 CollisionJump+1@>
          <@34faa@>
          <@34fac CheckHitbox@> ; set carry if hit
          <@34faf +@>
            <@34fb1@>
+         <@34fb4@>
          <@34fb6@>
        <@34fb8 -@>
        <@34fba@>

.reloc   ; smudge from $356f1
;;; These are hitbox check conditions.  Quads represent a range of
;;; checks between object A (first element) and a range of objects
;;; B (From second element to third element, which is always spawn
;;; slots $c through $1f).  The final element is an index into the
;;; jump table for which collision routine to call when the hitboxes
;;; overlap.  This is used by CheckAllObjectCollisions.
OVERRIDE
CollisionTable: 
        .byte [@356f1@],[@356f2@],[@356f3@],[@356f4@] ; 00 sword blast hits enemy
        .byte [@356f5@],[@356f6@],[@356f7@],[@356f8@] ; 01 " "
        .byte [@356f9@],[@356fa@],[@356fb@],[@356fc@] ; 02 " "
        .byte [@356fd@],[@356fe@],[@356ff@],[@35700@] ; 03 " "
        .byte [@35701@],[@35702@],[@35703@],[@35704@] ; 04 " "
        .byte [@35705@],[@35706@],[@35707@],[@35708@] ; 05 paralysis beam hits npc/enemy
        .byte [@35709@],[@3570a@],[@3570b@],[@3570c@] ; 06 enemy hits player
        .byte [@3570d@],[@3570e@],[@3570f@],[@35710@] ; 07 front of player hits npc/trigger
        .byte [@35711@],[@35712@],[@35713@],[@35714@] ; 08 sword blast hits enemy
        .byte [@35715@],[@35716@],[@35717@],[@35718@] ; 09 " "
        .byte [@35719@],[@3571a@],[@3571b@],[@3571c@] ; 0a " "
        .byte [@3571d@],[@3571e@],[@3571f@],[@35720@] ; 0b paralysis beam hits npc/enemy
        .byte [@35721@],[@35722@],[@35723@],[@35724@] ; 0c sword hits enemy
        .byte [@35725@],[@35726@],[@35727@],[@35728@] ; 0d enemy hits player
        .byte [@35729@],[@3572a@],[@3572b@],[@3572c@] ; 0e front of player hits npc/trigger

.reloc                          ; NOTE: smudge irrelevant because no numbers
OVERRIDE
CollisionJump:
        .word (CollisionJump_00_SwordHitsEnemy) ; attack.s
        .word (CollisionJump_01_EnemyHitsPlayer) ; defend.s
        .word (CollisionJump_02_PlayerInFrontOfNpcOrTrigger) ; movement.s
        .word (CollisionJump_03_ParalysisBeam) ; paralysis.s

;;; --------------------------------
.reloc                          ; smudge from $355f4
OVERRIDE
DoneCheckHitbox:
        <@355f4@>
        <@355f6@>
        <@355f7@>
;;; --------------------------------
;;; Check a range of objects for collisions with any other objects.
;;; Input:
;;;   $10,$11 - range of NPCs to check collision with.
;;;        called from three places
;;;         - from $3554d it looks like an NPC index for *some* dialog -> ?
;;;         - from $34fac it's always [$c,$1f], from the table below Hitboxes
;;;           this version is called many times per frame, with diff X
;;;         - from $354ff it's always [0,2] - also some dialog -> ?
;;; Output:
;;;   set carry if there's a hit
;;; Push x into $1b for temporary storage
;;; Then look at $380,x and $340,x, quit (clc) if negative
;;; Look at $3a0,x nibbles
;;;   - hi nibble zero => quit (clc), otherwise store $1f
;;;   - lo nibble => $15 (shifted << 2)
;;; Next $420,x:40 | $3a0,x:0f<<2 => hitbox shape
OVERRIDE
CheckHitbox:                    ; smudge from $355f8
        <@355f8@>
          <@355fa ObjectTerrain@>
          <@355fd DoneCheckHitbox@> ; off screen => no hit
          <@355ff ObjectKnockback@>
          <@35602 DoneCheckHitbox@> ; being knocked back => no hit
          <@35604 ObjectHitbox@>
          <@35607@>
          <@35609 DoneCheckHitbox@> ; no hit (not spawned? exploding walls have zero)
          <@3560b@>             ; collision plane
          <@3560d ObjectHitbox@>
          <@35610@>
          <@35612@>
          <@35613@>
          <@35614@>
          <@35616 ObjectLevel@>
          <@35619@>
          <@3561b@>
          <@3561d@>
          <@3561e@> ; sprite x-coordinate on screen
          <@35621@>
          <@35622 Hitboxes+2@>
          <@35625@>
          <@35627@>
          <@35628 Hitboxes+3@>
          <@3562b@>
          <@3562d@> ; sprite y-coordinate on screen
          <@35630@>
          <@35631 Hitboxes@>
          <@35634@>
          <@35636@>
          <@35637 Hitboxes+1@>
          <@3563a@>
          ;; For each object, check same conditions
          <@3563c@> ; lower bound of range to check
@NextObject:
            <@3563e@>
            <@3563f@> ; upper bound of range
              <@35641 DoneCheckHitbox@>
            <@35643@>
              <@35646 @NextObject@> ; $3563e
            <@35648@>
            <@3564b@> ; same collision plane?
              <@3564d @NextObject@> ; $3563e
            <@3564f@>
              <@35652 @NextObject@> ; $3563e
            <@35654@> ; don't check the object against itself
              <@35656 @NextObject@> ; $3563e
            ;; Both objs are eligible for collisions
            <@35658@>
            <@3565b@>
            <@3565d@>
            <@3565e@>
            <@3565f@>
            <@35661@>
            <@35664@>
            <@35666@>
            <@35668@>
            <@35669@>
            <@3566c@>
            <@3566d Hitboxes@>
            <@35670@>
              <@35672 @NextObject@>
            <@35674 Hitboxes+1@>
            <@35677@>
              <@35679 @NextObject@>
            <@3567b@>
            <@3567e@>
            <@3567f Hitboxes+2@>
            <@35682@>
              <@35684 @NextObject@>
            <@35686 Hitboxes+3@>
            <@35689@>
              <@3568b @NextObject@>
          ;; fall through out of loop
        <@3568d@>
        <@3568f@>
        <@35690@>

.import Hitboxes
