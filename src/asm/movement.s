;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to movement calculations
;;;  1. Disable statue glitch and trigger skip glitch
;;;  2. Set up a flag for "currently riding dolphin"
;;;  3. Make rabbit boots charge while walking
;;;  4. Switch pain land check from leather boots to hazmat
;;;  5. Move NPC/trigger collision handling routines from 1a to 3c

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

.org $9b96 ; clear dolphin bit => also clear the flag
  jsr UpdatePlayerStatusAndDolphinFlag

.ifdef _RABBIT_BOOTS_CHARGE_WHILE_WALKING
.org $9e00
  jsr CheckRabbitBoots

.pushseg "fe", "ff"
.reloc
CheckRabbitBoots:
; In charge shot only mode, we want to have the charge while walking enabled
; even without rabbit boots
.ifndef _CHARGE_SHOT_ONLY
  lda EquippedPassiveItem
  cmp #ITEM_RABBIT_BOOTS ; require rabbit boots
  bne +
.endif
  lda $06c0
  cmp #$10 ; don't charge past level 2
  bcs +
  rts
  ;; return instead to after the charge is increased
+ pla
  pla
  jmp $9e39 ; 35e39
.popseg

.endif

.ifdef _CHARGE_SHOT_ONLY
; Timer of 30 frames
.define Ctrl1CurrentDirection $49
.define WARRIOR_RING_DELAY 30

;; If we only have charge shot, buff rabbit boots to charge twice as fast while equipped
.org $9e0d
  jsr CheckRabbitBootsSpeedUp
  nop

.reloc
CheckRabbitBootsSpeedUp:
  lda EquippedPassiveItem
  cmp #ITEM_RABBIT_BOOTS
  bne +
    lda #1
    .byte $2c ; abs BIT instruction to skip the other load
; its safe to BIT here as it turns into BIT $03a9 which doesn't have side effects on read
+ lda #3
  and $08 ; GlobalCounter
  rts

;; Turn warrior ring into turret mode
.org $9c8d ; CheckWarriorRing
  jsr CheckIfStandingStillForWarriorRing
  nop

.reloc
CheckIfStandingStillForWarriorRing:
  bne @Exit
  ; The warrior ring is equiped so now check to see if we've stood still for long enough
  lda PlayerStandingTimer
  cmp #WARRIOR_RING_DELAY
  bne +
    inc $10
    bpl @Exit
+
  ; check our stab counter, every 3rd stab gets a free shot
  lda WarriorRingStabCounter
  cmp #3-1 ; minus 1 to account for bpl being branch greater than
  bpl +
    inc WarriorRingStabCounter
    rts
+ inc $10
  lda #0
  sta WarriorRingStabCounter
@Exit:
  rts

; Patch SwordSwingEnd to not reset charge amount if warrior ring is equipped
; and we are below the full charge amount
; .org $9cd1
;   jmp SwordSwingEndCheckIfWarriorRingEquipped
; FREE_UNTIL $9cda
; .reloc
; SwordSwingEndCheckIfWarriorRingEquipped:
;   lda EquippedPassiveItem
;   cmp #$0f ; ITEM_WARRIOR_RING
;   beq @HasWarriorRingEquipped
; @ClearChargeAmount:
;     lda #0
;     sta $06c0 ; PlayerSwordChargeAmount
;     beq @Exit
; @HasWarriorRingEquipped:
;   ; since we have the warrior ring equipped with charge mode on, we
;   ; want to keep the sword charge after stab IF its not fully charged yet
;   lda $06c0
;   cmp #$08
;   bcs @ClearChargeAmount
;   lda #0
; @Exit:
;   sta $06c1
;   rts

; ; Patch Player action to remove the requirement to hold b to charge the sword
; .org $9def
;   jsr HoldBCheckIfWarriorRingEquipped
;   nop

; .reloc
; HoldBCheckIfWarriorRingEquipped:
;   lda $43 ; Controller 1
;   and #$40
;   bne :>rts
;     ; if they aren't pressing b, see if we are increasing the warrior ring charge
;     lda EquippedPassiveItem
;     cmp #$0f ; ITEM_WARRIOR_RING
;     bne +
;       ; if they are holding the warrior ring check to add sword charge amount
;       lda $08
;       and #$03
;       bne + ; $35e39
;         lda $06c0 ; PlayerSwordChargeAmount
;         cmp #$08
;         bne + ; $35e22
;           inc $06c0 ; PlayerSwordChargeAmount
; +
;   lda #0
;   rts

; Patch global counter to track how long a player is standing still for
.org $f089 ; Near end of GlobalCounter processing
  jsr UpdatePlayerStandingTimer
.pushseg "fe", "ff"
.reloc
UpdatePlayerStandingTimer:
  lda Ctrl1CurrentDirection ; $ff if still
  bpl +
    lda PlayerStandingTimer
    cmp #WARRIOR_RING_DELAY
    beq @Exit
      clc
      adc #1
      .byte $2c ; Use bit to skip the lda #0
      ; this is safe because it compiles to BIT $00a9 which has no side effects
+ ; player moved so reset timer
  lda #0
  sta PlayerStandingTimer
@Exit:
  ; Continue patched function
  lda $071a
  rts
.popseg

.endif

.ifdef _DISABLE_TRIGGER_SKIP
.org $9d9a
  jsr FixTriggerSkip_CheckLatch
.endif

;.bank $36000 $a000:$2000
;
;.org $36086
;
;        ;; Free space at end of UseMagicJump
;        
;.assert * <= $36092 
;
;;;; Make gate opening independent of locations
;.org $37879
;  lda $23
;  and #$f8
;  cmp #$30
;  beq GateCheckPassed
;  lda $6c
;  cmp #$73
;  beq GateCheckPassed
;  bne GateCheckFailed
;.assert * <= $3788f
;.org $3788f
;GateCheckFailed:
;.org $37896
;GateCheckPassed:

;;; This is for fixing trigger glitch?
;;; @@@ TODO - this seems to have been orphaned somewhere?
;; .reloc
;; SetTriggerTileGameMode:
;;   sty $0623
;;   dec $41
;;   rts

.segment "fe", "ff"

.org $d29d ; Just set dolphin status bit => also set the flag
  jsr UpdatePlayerStatusAndDolphinFlag

.org $e7b3 ; just cleared dolphin status => also clear the flag
  jsr UpdatePlayerStatusAndDolphinFlag

;;; NOTE: this is 23 bytes.  If we do anything else with flags
;;; it would make sense to write a pair of functions SetFlag
;;; and ClearFlag that take an offset in Y and a bit in A (with
;;; appropriate CPL already applied for clear) - these are each
;;; 7 bytes to define and 7 bytes to call, so this ends up costing
;;; 34 bytes total, but only 20 on the margin.  It would take
;;; a number of calls to pay off.
.reloc
UpdatePlayerStatusAndDolphinFlag:
  ;; Args: A = new value for $0710, bit 40 will go into flag 0ee (649d:40)
  sta $0710
  and #$40
  beq +
   ora $648d ; flag 06e
   sta $648d
   rts
+ lda #$bf
  and $648d
  sta $648d
  rts


.ifdef _HAZMAT_SUIT
.org $ef66
  ;; Check for gas mask instead of leather boots for pain terrain
  cmp #$0d
.endif


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;
;;; The following code is moved from 1a to 3c.  It also includes an optional
;;; patch for the statue glitch.
;;; 
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

.segment "3c"

;;; --------------------------------
.reloc                          ; smudge from $354a2 to $354b0
OVERRIDE
PlayerHitTrigger_SetGameMode:
        <@354a2@>
        <@354a4@>
         bne :>rts
        <@354a8@>
        <@354ab GAME_MODE_TRIGGER_TILE@>
        <@354ad GameMode@>
        <@354af@>
;;; NOTE: not .reloc because we reverse-branch into the above
OVERRIDE
CollisionJump_02_PlayerInFrontOfNpcOrTrigger: ; smudge from $354b0 to $35535
        <@354b0@>
        <@354b3@>
        <@354b6@>
        <@354b8@>
        <@354ba +@>
         <@354bc@>
         <@354be +@>
          <@354c0@>
          <@354c1@>
          <@354c2@>
          <@354c5@>
          <@354c6@>
          <@354c8 ++@>
           <@354ca@>
           ;; ----
+       <@354d7 PlayerHitTrigger_SetGameMode@> ; unconditional
        ;; ----
++      <@35da5@>
         bmi :<rts
        <@35f19@>
        <@36ce5@>
        <@36ce7 +@>
        ;; Statue
         <@36d0e HandleStatueCollision@>
         <@36d5d ++@>
         ;; ----
+       <@3ef6a@>
        bne :<rts
        <@354e4@>
        <@354e7 +@>
         <@354e9@>
         beq :<rts
+       <@354ee@>
        <@354f1@>
         <@354f2@>
         <@354f4@>
         <@354f7@>
         <@354f9@>
         <@354fb@>
         <@354fd@>
         <@354ff CheckHitbox@>
        <@35502@>
        <@35503@>
        bcs :>rts
++      <@35508@>
        <@3550a@>
        <@3550d@>
        <@35510 GAME_MODE_DIALOG@>
        <@35512 GameMode@>
        <@35514@>
        bne :>rts
        <@35519@>
        <@3551c@>
        beq :>rts
        <@35520@>
        <@35523@>
        <@35524@>
        <@35526@>
        <@35528@>
        <@3552a@>
        <@3552d@>
        <@3552f@>
        <@35531@>
        <@35534@>
;;; --------------------------------
.reloc                          ; smudge from $35535 to $355b7
HandleStatueCollision:
        <@35535@>
        <@35537@>
@outer_loop:
         <@35539@>
         <@3553c@>
          <@3553d@>
          <@3553f@>
          <@35542@>
          <@35543@>
           <@35544@>
           <@35545@>
           <@35547@>
           <@35548@>
           <@35549@>
           <@3554b@>
           <@3554d CheckHitbox@>
          <@35550@>
          <@35551@>
         <@35552@>
         <@35553@>
         <@35556 +@>
          <@35558@>
          <@3555a@>
          <@3555d@>
          beq :>rts
          <@35562@>
          <@35564@>
          <@35567@>
          ;; ----
        ;; Move the player back in response to touching a statue.
+        <@35568@>
         <@3556b@>
         <@3556d +@>
         <@3556f@>
         <@35572@>
         <@35574 +@>
         <@35576@>
         <@35579@>
         <@3557b +@>
         <@3557d@>
         <@35580@>
         <@35582@>
+        <@35585@>
         <@35586@>
          <@35587@>
-         <@35589 ObjectKnockback@>
          <@3558c@>
           <@3558d ObjectDirection@>
           <@35590@>
    .ifdef _DISABLE_STATUE_GLITCH ; smudge off
            lda #$04              ; just always push down
    .else                         ; smudge on
            <@35591@>
            <@35594@>
            <@35596@>
            <@35597@>
            <@35598@>
            <@3559a@>            ; TODO - can we disable statue glitch by making this #7?
    .endif
            <@3559c ObjectDirection@>
            <@3559f MoveObjectWithSpeedAndDirection_3c@>
           <@355a2@>
           <@355a3 ObjectDirection@>
          <@355a6@>
          <@355a7 ObjectKnockback@>
          <@355aa@>
          <@355ab -@>
          <@355ad DrawAllObjectSprites@>
         <@355b0@>
         <@355b1@>
         <@355b2@>
        <@355b4 @outer_loop@>
        <@355b6@>

;;; --------------------------------
;;; Knocks back the object indexed $11 in the direction of object indexed $10?
;;; Not entirely sure about this - since it looks like direction,x is not used?
;;; (It's converted to an 8-dir and then stored shifted into the upper nibble).
;;; The use of $10/$11 as inputs is just because knocking back the player requires
;;; flipping x and y.  We could simplify a bit by using carry to indicate a flip:
;;;     plp; jsr SwapXYIfCarry; ... ; php; jsr SwapXYIfCarry; rts
;;;     SwapXYIfCarry:
;;;       bcc :>rts; stx $10; tya; tax; ldy $10; rts
;;; This saves 4 bytes in KnockbackObject and 3*3 bytes at each callsite,
;;; and costs 9 for the swap routine, which may be usable elsewhere as well?
.reloc                          ; smuge from $355c0
OVERRIDE
KnockbackObject:
        <@355c0@>
        <@355c2@>
        <@355c4@>
        <@355c6@>
        <@355c8 ObjectKnockback@>
        <@355cb +@>
         <@355cd@>
         <@355cf@>
         <@355d1 ObjectKnockback@>
+       <@355d4 ObjectKnockback@>
        <@355d7@>
        <@355d9 ObjectDirection@>
        <@355dc +@>
         <@355de@>
+       <@355df@>
        <@355e0@>
        <@355e1@>
        <@355e2@>
        <@355e3@>
        <@355e5 ObjectDirection@>
        <@355e8@>
        <@355ea@>
        <@355ec ObjectDirection@>
        <@355ef@>
        <@355f1@>
        <@355f3@>

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;; 
;;; The following code is retained on "1a" but refactored to be .reloc
;;; 
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

.segment "1a"

FREE "1a" [$98d7, $9ae8)

;;; --------------------------------
;;; Input:
;;;   x:                Object to work on
;;;   70,x, ..., d0,x:  Object's coordinates
;;;   360,x:            Object direction (etc)
;;; Result:
;;;   C - set if we collided with an impassible tile.
;;;       clear if the movement was successful.
;;;   Object coords and direction updated.
.reloc                          ; smudge from $358d7 to $35907
OVERRIDE
MoveObjectWithSpeedAndDirection:
    .ifdef _RANDOM_FLYER_SPAWNS ; smudge off  (see spawn.s)
        inc $32
    .endif                      ; smudge on
        <@358d7@>
        <@358d9@>
        <@358db ObjectDirection@>
        <@358de@>
        <@358e0 CheckDirectionAgainstTerrain@>
        <@358e3 ObjectDirection@>
        <@358e6@>
        <@358e7 +@>
        ;; diagonal direction: check either adjacent cardinal dir, too
         <@358e9@>
         <@358eb@>
         <@358ed ObjectDirection@>
         <@358f0 CheckDirectionAgainstTerrain@>
         <@358f3@>
         <@358f5@>
         <@358f7 ObjectDirection@>
         <@358fa ObjectDirection@>
         <@358fd CheckDirectionAgainstTerrain@>
+       <@35900@>
        <@35902 ObjectDirection@>
        <@35905@>
        <@35906@>

;;; --------------------------------
;;; Indexed by $360,x:07 which stores a direction (0 = up, 2 = right, etc).
;;; Each row has four possible pairs, which presumably give a pair of deltas
;;; or something.  Used immediately below in $3597f.  Rows are terminated by
;;; (0,0): cardinal rows have 2 elements (45 degrees CCW and 90 deg CW), while
;;; diagonals have 3 (45 deg CW, 90 deg CCW, and 135 deg CCW).  Interestingly,
;;; these are added without resetting, so that's why the directions are weird.
;;; The 90 deg CW for cardinal directions is just the opposite diagonal, while
;;; the diagonals include the current diagonal as well as the two adjacent ones.
;;; This doesn't take speed into account at all, though?!? It seems to be about
;;; putting the object on an adjacent tile if there's an obstacle?  But I don't
;;; see where it's checking for obstacles?
.reloc                                        ; smudge from $35907 to $35947
OVERRIDE
FallbackDirectionsTable:  ; 35907
        ;;    U-L     U-R
        .byte [@35907@],[@35908@],[@35909@],[@3590a@],[@3590b@],[@3590c@],[@3590d@],[@3590e@] ; up
        ;;    U-L     U-R     D-R 
        .byte [@3590f@],[@35910@],[@35911@],[@35912@],[@35913@],[@35914@],[@35915@],[@35916@] ; up-right
        ;;    U-R     D-R
        .byte [@35917@],[@35918@],[@35919@],[@3591a@],[@3591b@],[@3591c@],[@3591d@],[@3591e@] ; right
        ;;    U-R     D-R     D-L
        .byte [@3591f@],[@35920@],[@35921@],[@35922@],[@35923@],[@35924@],[@35925@],[@35926@] ; down-right
        ;;    D-L     D-R
        .byte [@35927@],[@35928@],[@35929@],[@3592a@],[@3592b@],[@3592c@],[@3592d@],[@3592e@] ; down
        ;;    D-R     D-L     U-L
        .byte [@3592f@],[@35930@],[@35931@],[@35932@],[@35933@],[@35934@],[@35935@],[@35936@] ; down-left
        ;;    U-L     D-L
        .byte [@35937@],[@35938@],[@35939@],[@3593a@],[@3593b@],[@3593c@],[@3593d@],[@3593e@] ; left
        ;;    U-R     U-L     D-L
        .byte [@3593f@],[@35940@],[@35941@],[@35942@],[@35943@],[@35944@],[@35945@],[@35946@] ; up-left

;;; --------------------------------
;;; Possibly double-returns (in case movement actually happens)
;;; Reads object's coordinatesinto $34,..,$37.
;;; Removes upper 5 bits of $360,x, then mul *8 => $24
;;;   - this becomes the index of the $35907 table, which is pairs.
;;;     we try up to four different options.
;;; Calls: $34480, $35861 (AddDisplacementVector) x2, $359ff, $35a30 (CheckTerrainUnderObject) x3
;;; Might update $360,x.
.reloc                          ; smudge from $35947 to $359ff
OVERRIDE
CheckDirectionAgainstTerrain:
        <@35947 ObjXLo@> ; why is this not just jsr $358a8 ???
        <@35949@>
        <@3594b ObjXHi@>
        <@3594d@>
        <@3594f ObjYLo@>
        <@35951@>
        <@35953 ObjYHi@>
        <@35955@>
        <@35957 ObjectDirection@>
        <@3595a@>
        <@3595c ObjectDirection@>
        <@3595f@>
        <@35960@>
        <@35961@>
        <@35962@> ; temp, loaded back into y
        <@35964 ObjectDirection@>
        <@35967 ComputeDisplacementVector@> ; initialize $30,$31 from SPD,DIR,48x
        <@3596a AddDisplacementVectorShort@> ; presumably uses $30,$31???
        ;; move new displaced position into $1c..$1f.
        <@3596d@>
        <@3596f@>
        <@35971@>
        <@35973@>
        <@35975@>
        <@35977@>
        <@35979@>
        <@3597b@>
@DirLoop:
        <@3597d@>
        <@3597f FallbackDirectionsTable@>
        <@35982@>
        <@35984 FallbackDirectionsTable+1@>
        <@35987@>
        <@35989@>
         ;; Stop looking and double-return if we get to a (0,0) pair in the row.
         ;; At this point we're going with whatever was stored in $1c..$1f.
         <@3598b @BailOut@>
        <@3598d@>
        <@3598e@>
        <@3598f@>
        <@35991 AddDisplacementVectorShort@>
        <@35994@>
        <@35996 +@>
         ;; special handling for player only here (x=0)
         <@35998 ApplyInvisibleWallAtScreenEdge@>
          bcs :>rts
         ;; screen position okay, check terrain
         <@3599d@> ; force terrain lookup, no update $380,x
         <@3599f CheckTerrainUnderObject@>
         <@359a2@>
         <@359a4@> ; $25 always starts zero
         <@359a6@>
         ;; Only proceed straight if $340,x == #$8 exactly (what does this mean?)
         ;;   - not being knocked back, certain speed ??? why not just cmp?
         ;; (potentially this is looking for dolphin speed? but why?)
         <@359a8 ObjectKnockback@>
         <@359ab@>
          <@359ad ++@>
         ;; Check if we're riding on a dolphin - jump away if *not*
         <@359af PlayerStatus@>
          <@359b2 ++@>
         ;; At this point we know we're on a dolphin - so water becomes passable.
          <@359b4 @DirLoop@>
         ;; Carry clear - if no terrain blockers, return directly.
         <@359b6@>
          beq :>rts
         ;; Carry was clear, but the terrain was non-zero.  If the terrain is a
         ;; waterfall or a solid wall (impassible even flying) then loop back,
         ;; otherwise return with clear carry.
         <@359ba@>
          <@359bc @DirLoop@>
         <@359be@>
         ;; ----
        ;; Non-player (x != 0), though non-dolphin player comes in in two lines
+       <@359bf@> ; force terrain lookup, no update $380,x
        <@359c1 CheckTerrainUnderObject@>
++      <@359c4@> ; enemies avoid slides, pits, walls, water
        <@359c6@>
        <@359c8 +@> ; $359cc
         <@359ca@>
+       <@359cc@>
        <@359ce ObjectTerrainSusceptibility@>
        ;; this AND means that either if the feature wasn't there or the object
        ;; isn't susceptible to it, then we end up with zero, allowing another
        ;; loop - this seems backwards.
         <@359d1 @DirLoop@> ; $3597d
        <@359d3@>
        ;; ----
@BailOut:
        ;; Looks like some sort of double-return?
        <@359d4@>
        <@359d5@>
        ;; Copy positions from $1c..$1f into the actual position *and* $34..$37
        <@359d6@>
        <@359d8 ObjXLo@>
        <@359da@>
        <@359dc@>
        <@359de ObjXHi@>
        <@359e0@>
        <@359e2@>
        <@359e4 ObjYLo@>
        <@359e6@>
        <@359e8@>
        <@359ea ObjYHi@>
        <@359ec@>
        ;; ???
        <@359ee@> ; do update $380,x
        <@359f0 CheckTerrainUnderObject@>
        ;; Swap $360,x and $23 - why?
        <@359f3 ObjectDirection@>
        <@359f6@>
        <@359f8 ObjectDirection@>
        <@359fb@>
        <@359fd@> ; signal that we double-returned
        <@359fe@>

;;; --------------------------------
;;; Keeps the player bounded in x ($0a, $fc) and y ($18, $d0) directions.
;;; This is only relevant if there are missing actual walls (e.g. the
;;; RHS of the giant insect screen) or during boss fights where the camera
;;; does not move with the player (thus keeping the player on the boss
;;; screen).
;;; 
;;; Inputs:
;;;   x == 0 - only applies to player
;;;   $2, $4 - camera x,y low bytes
;;;   $34, $36 - player x,y low bytes
;;; Outputs:
;;;   $20 - relevant terrain features, copied from :a0 of $380,x
;;;         :06 (impassible) will be added if player is tryung to go off screen
;;;   C - carry bit set if player trying to go off screen
.reloc                          ; smudge from $359ff to $35a30
OVERRIDE
ApplyInvisibleWallAtScreenEdge:
        <@359ff@>
        <@35a01@>
        <@35a02@>
        <@35a04@>
         <@35a06 @ClipAtScreenEdge@>
        <@35a08@>
         <@35a0a @ClipAtScreenEdge@>
        <@35a0c@>
        <@35a0e@>
        <@35a0f@>
        <@35a11 +@>
         <@35a13@>
+       <@35a15@>
         <@35a17 @ClipAtScreenEdge@>
        <@35a19@>
         <@35a1b @ClipAtScreenEdge@>
        <@35a1d@>
        <@35a20@>
        <@35a22@>
        <@35a24@>
        ;; ----
@ClipAtScreenEdge:
        <@35a25@>
        <@35a28@>
        <@35a2a@>
        <@35a2c@>
        <@35a2e@>
        <@35a2f@>

;;; --------------------------------
.reloc                          ; smudge from $35a30 to $35ae0
OVERRIDE
CheckTerrainUnderObject:
        ;; Called by e.g. $35f06, $35947
        ;; Input:
        ;;   A --> bitset:
        ;;           40: copy the :50 bits to $380,x (masked by $460,x)
        ;;           80: force lookup (otherwise skipped if unchanged)
        ;;   Object's true coordinates in $[79bd]0,x
        ;;   Object's new coordinates new $34..$37 -> these are used for terrain
        ;; Output:
        ;;   Carry bit set if not moved, cleared if moved
        ;;   $20 gets $380,x:50 (the slow and behind bits) or else the current terrain
        ;;   $380,x updated as appropriate (masked by $460,x)
        ;;   
        ;; Appears to be called for every (mobile?) object on the screen, regardless
        ;; of whether it's actually moved or not.  Probably determines tile effects.
        <@35a30@>
        ;; Did the object move from last frame's 70,x by a full tile?
        <@35a32 +@> ; $35a4d
         <@35a34@> ; yl
         <@35a36@>
         <@35a38@>
         <@35a3a +@> ; $35a4d
          <@35a3c@> ; xl
          <@35a3e@>
          <@35a40@>
          <@35a42 +@> ; $35a4d
        ;; Object is on the same tile as last time, copy $380,x:50 to $20 and sec
           <@35a44@>
           <@35a47@>
           <@35a49@>
           <@35a4b@>
           <@35a4c@>
           ;; ----
        ;; Load the current map screen layout.
+       <@35a4d@> ; yh
        <@35a4f@>
        <@35a50@>
        <@35a51@>
        <@35a52@> ; xh
        <@35a54@>
        <@35a55@>
    .ifdef _EXTRA_EXTENDED_SCREENS ; smudge off
        ;; Normally the check for tile effects just looks at the
        ;; current map screen and clamps the page switch to the
        ;; first 8 pages, but if we're reading screen data from
        ;; extended locations, this won't work.  We need to patch
        ;; the tile effects reader to read from extended pages
        ;; when the extended flag is set ($62ff)

        ;; NOTE: We could save some space by just calling directly
        ;; into PatchPrepareScreenMapRead, but possibly the original
        ;; code used the quick version for a reason?  It looks like
        ;; it's not generally called more than a handful of times
        ;; per frame (12-14, maybe a few more with a lot of objects)
        ;; and it only saves 3 cycles each (the jsr and rts also
        ;; a few instructions).

        ;; jsr PatchPrepareScreenMapRead  ; -- instead of all the below...

        pha
         sta $11
         lda $62ff
         asl $11
         rol
         asl $11
         rol
         asl $11
         rol
         sta $6f 
         ldy #$07
         sty $50
         sty BANKSELECT
         sta BANKDATA
        pla
        and #$1f
        ora #$a0
        sta $11
    .else
        and #$1f
        ora #$a0
        sta $11 ; $11 is offset within the page
        lda $6300,y
        rol
        rol
        rol
        rol
        and #$07 ; A is PRG page to load
        sta $6f
        ldy #$07 ; $a000 -> 0, 2, 4, 6, 8, a, c, or e
        sty $50
        sty BANKSELECT
        sta BANKDATA
    .endif ; _EXTRA_EXTENDED_SCREENS   ; smudge from $35a73
        <@35a73@>
        <@35a75@>
        <@35a77@>
        <@35a79@>
        <@35a7b@>
        <@35a7c@>
        <@35a7d@>
        <@35a7e@>
        <@35a7f@>
        <@35a81@> ; $10 = (y)(x) tile indexes in nibbles
        <@35a83@>
        <@35a85@> ; load the metatile ID
        <@35a87@>
        <@35a89@> ; $a000 -> $12000
        <@35a8b@>
        <@35a8d@>
        <@35a8f@>
        <@35a91 BANKSELECT@>
        <@35a94 BANKDATA@>
        <@35a97@>
        ;; $68 = metatile ID, $69 = MapData[i].Graphics[4], page = $12000, y = 0
        <@35a99@>
        <@35a9b@>
        ;; $20 <- tile effect of current tile
        <@35a9d@>
        <@35a9f +@> ; $35ab9
         <@35aa1@> ; yh
         <@35aa3 CurrentLocationFlags@>
         <@35aa6@> ; xh
         <@35aa8 PowersOfTwo@>
         <@35aab +@> ; $35ab9
        ;; This map screen has a flag set.
          <@35aad@>
          <@35aaf@>
          <@35ab1@>
          <@35ab3@>
          <@35ab5@>
          <@35ab7@>
        ;; Restore the expected upper bank for code execution
+       <@35ab9@> ; $a000 -> $36000
        <@35abb@>
        <@35abd@>
        <@35abf@>
        <@35ac1 BANKSELECT@>
        <@35ac4 BANKDATA@>
        <@35ac7@>
        <@35ac9 +@> ; $35ade
        ;; Copy some bits from ($68),y into $380,x conditional on $460,x
         <@35acb@>
         <@35ace@> ; overwrite the :50 bits no matter what.
         <@35ad0@>
         <@35ad2@>
         <@35ad4@> ; Use 460,x as a mask for copying.
         <@35ad7@> ; only rewriting :50 (in front, slow)
         <@35ad9@>
         <@35adb@>
+       <@35ade@>
        <@35adf@>
