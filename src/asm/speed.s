;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Patches to speed table
;;; NOTE: This is currently off by default, since it's experimental and not
;;; yet working correctly.

;;; Problem: this is going to be laggy - at least 3-4x the time per addition,
;;; and this is inner-loop stuff.


.ifdef _EXPAND_SPEEDS

.segment "1a", "fe", "ff"

;;; Mark this whole area as free
FREE "1a" [$8480,$8b7f)

;.reloc
.org $8800
OVERRIDE ; !!!
ComputeDisplacementVector:  ; NOTE: 34849
;;; Inputs:
;;;   A - direction, from $360,x (0-7, or 0-f, or 0-3f)
;;;   $340,x:0f - speed bucket
;;;   $380,x:40 - in slow terrain
;;;   $480,x    - step counter
;;; Outputs:
;;;   ($31,$30) - (y,x) displacement
;;; For now, we're just working in "compatibility mode": we assume
;;; speeds are the same wonky nonsense that the vanilla game uses,
;;; and we have conversion tables into our more general system.
        ;; Figure out if we have an 8-dir or a 16-dir
        asl                     ; always need 4 shifts
        asl
        asl
        asl
        sta $12                 ; stash direction

        ;; Set $31 from step counter
        lda $0480,x
        and #$0f
        sta $31

        ;; Load speed
        lda $0340,x             ; load speed to y
        and #$0f                ; remove knockback bits
        sta $11
        tay
        lda $0380,x
        asl
        bpl +
          dey
          dey
          bpl +
            ldy #$00
        ;; Convert speed to new system
        ;; NOTE: 16-dir speeds are never slow-able
+       lda SpeedConversionTable,y
        sta $10                 ; $10 is now slow-adjusted speed (5 bits)

        ;; Check for 16-dir
        lda $12                 ; direction << 4
        ldy $11                 ; original speed & f
        cpy #$0b                ; check against $b
        bcs +                   ; if SPD < $b...
          asl                   ;   then it's 8-dir, so shift an extra time
+:

        ;; A has direction at far left - shift off 2 bits to figure out quadrant
        ldy #$00
        asl                     ; carry = quadrant 3 or 4 - determines sign
        bcc +
          dey
+       sty $11                 ; $11 is sign to apply after trig
        asl

        ora $10
        sta $12               ; save direction|speed
        tay

        bcs ++
          ;; Quadrants 1 and 3

          ;; At this point, A has index into one of the trig tables
          ;; Read the component and add the fraction to the whole part
          lda SinTable,y
          sta $10               ; stash table result
            ;; Put the fraction into y
            and #$f0
            ora $31             ; frame fraction
            tay
          lda $10               ; recover table result
          and #$0f
          eor $11
          sta $30
          lda SpeedFractionTable,y
          eor $11
          bpl +
            inc $30             ; store dx coordinate

          ;; Same thing, but for -cos
+         ldy $12
          lda CosTable,y
          sta $10               ; stash table result
            ;; Put the fraction into y
            and #$f0
            ora $31             ; frame fraction
            tay
          lda $10               ; recover table result
          and #$0f
          eor #$ff
          eor $11
          sta $31
          lda SpeedFractionTable,y
          eor $11
          bmi +
            inc $31
+         rts                   ; 169 cycles max, compared to 89 vanilla...
        ;; ----
++:
          ;; Quadrants 2 and 4
          lda CosTable,y
          sta $10
            ;; Put the fraction into y
            and #$f0
            ora $31             ; frame fraction
            tay
          lda $10
          and #$0f
          eor $11
          sta $30
          lda SpeedFractionTable,y
          eor $11
          bpl +
            inc $30             ; store dx coordinate

          ;; Same thing, but for +sin
+         ldy $12
          lda SinTable,y
          sta $10
            ;; Put the fraction into y
            and #$f0
            ora $31             ; frame fraction
            tay
          lda $10
          and #$0f
          eor $11
          sta $31
          lda SpeedFractionTable,y
          eor $11
          bpl +
            inc $31
+         rts

.reloc
SpeedConversionTable:
        .byte $00 ; 0: 0.5 pixels/frame
        .byte $01 ; 1: 0.75
        .byte $02 ; 2: 1.0
        .byte $03 ; 3: 1.25
        .byte $04 ; 4: 1.5
        .byte $05 ; 5: 1.75
        .byte $06 ; 6: 2.0
        .byte $08 ; 7: 2.5
        .byte $12 ; 8: 5.0
        .byte $18 ; 9: 6.5
        .byte $1e ; a: 8.0
        .byte $1a ; b: 7.0 *
        .byte $05 ; c: 1.75 *
        .byte $08 ; d: 2.5 *
        .byte $0a ; e: 3.0 *
        .byte $06 ; f: 2.0 *


;;; ----------------------------------------------------------------
;;; De-lag projectile motion
;;; We define a _second_ version of ComputeDisplacementVector that
;;; caches the trig results, saving a lot of computation time.


.segment "1a", "1b", "fe", "ff"

;;; smudge from 370be
.org $b0be
OVERRIDE
ObjectActionJump_57:
        <@370be@>
        <@370c1 +@> ; $370c6
         <@370c3 ClearSpawnSlot@>
+:       ;; ----
        <@370c6 ObjectTimer@>
        <@370c9 +@> ; $370ce
         <@370cb ReplaceWithOnDeathChild@>
+:       ;; ----
        <@370ce ComputeProjectileMotion@>
        <@370d1 ObjectTerrainSusceptibility@>
        <@370ee +@>
         <@370f0 CheckProjectileTerrain@>
+       <@37108@>
;;; smudge off
FREE_UNTIL $b0f6

;;; This is copied form CheckTerrainUnderObject (smudge from $35a30) but is
;;; adapted to look at the current position, rather than $34..37
;;; Uses $34 as a signal that a lookup is needed

.reloc
CheckProjectileTerrain:
        ;; If $10 is positive then there's nothing to do
        <@374f3@>
        <@37536 +@>
          <@3754b@>
+       <@35acb ObjYHi@> ; smudge from $35a4d
        <@35b4f@>
        <@35c2d@>
        <@35cad@>
        <@35e41 ObjXHi@>
        <@35efb@>
        <@3ebb2@>
        <@3ec4f@>
        <@1320c@>
        <@185cc@>
        <@35a55@>
        <@35a61@>
        <@35a62@>
        <@35a63@>
        <@35a64@>
        <@35a65@>
        <@35a67@>
        <@35a69@>
        <@35a6b@>
        <@35a6d BANKSELECT@>
        <@35a70 BANKDATA@>
        <@35acb ObjYLo@>
        <@35bfb@>
        <@36db8@>
        <@36e16 ObjXLo@>
        <@36e1f@>
        <@36e20@>
        <@36e21@>
        <@36ec1@>
        <@381fe@>
        <@3c068@>
        <@3c287@>
        <@3c778@>
        <@3de2b@>
        <@20a89@>
        <@236c9@>
        <@26224@>
        <@2885e@>
        <@28860 BANKSELECT@>
        <@28944 BANKDATA@>
        <@29497@>
        <@35a99@>
        <@35a9b@>
        <@35a9d@>
        <@35a9f +@>
          <@35e39 ObjYHi@>
          <@35e99 CurrentLocationFlags@>
          <@35eff ObjXHi@>
          <@36396 PowersOfTwo@>
          <@3642e +@>
            <@35aad@>
            <@35aaf@>
            <@35ab1@>
            <@35ab3@>
            <@35ab5@>
            <@35ab7@>
+       <@35ab9@>
        <@35abb@>
        <@35abd@>
        <@35abf@>
        <@35ac1 BANKSELECT@>
        <@35ac4 BANKDATA@>
        ;; ;; the following not used for projectiles???
        ;; lda $0380,x
        ;; and #$af ; overwrite the :50 bits no matter what.
        ;; sta $10
        ;; lda $20
        ;; and $0460,x ; Use 460,x as a mask for copying.
        ;; and #$50 ; only rewriting :50 (in front, slow)
        ;; ora $10
        ;; sta $0380,x
        ;; ;; smudge off
        lda $20
        and $0460,x
        and #$06
        beq +
          jmp ReplaceWithOnDeathChild
+       rts


;;; Switch mado shurikens to alternate frames that they curve at
;;; We can't have them _all_ go at different frames since it drastically
;;; changes their trajectory, but we can alternate even/odd without much
;;; noticeable change.  TODO - we'll probably want to rewrite more of this.
.org $b0f6
        dec $04e0,x
        dec $04e0,x
        txa
        and #1
        eor ObjectTimer,x
        and #$0f
        bne ++ ; $37118
         txa
         lsr
         bcc + ; $3710d
          dec $0360,x
          dec $0360,x
+        jsr @incAndInvalidate
         and #$0f
         sta $0360,x
++      jmp ObjectActionJump_57
.assert * = $b11b

.reloc
@incAndInvalidate:
        lsr PSpdOK,x
        inc $0360,x
        lda $0360,x
        rts

.macro PROJ_SPEED
        pha
          ;; Convert speed to new system
          lda SpeedConversionTable,y
          sta $10
        pla
        ;; OR the (shifted) direction into the speed to get trig table index
        ora $10
.endmacro

;;; Positive trig function
.macro PROJ_TRIGP table, memWhole, memFrac1, memFrac2
        tay
        lda table,y
        pha
          ;; Put the fraction into y
          lsr
          lsr
          lsr
          tay
        pla
        ;; Store whole number from low nibble
        and #$0f
        sta memWhole,x
        ;; Store two fraction bytes
        ;lda FracTable,y
        ;sta memFrac1,x
        lda FracTable+1,y
        sta memFrac2,x
.endmacro

;;; Negative trig function
.macro PROJ_TRIGN table, memWhole, memFrac1, memFrac2
        tay
        lda table,y
        pha
          ;; Put the fraction into y
          lsr
          lsr
          lsr
          and #$1e
          tay
        pla
        ;; Store whole number from low nibble, inverted
        and #$0f
        eor #$ff
        sta memWhole,x
        ;; Store two fraction bytes, inverted
        ;lda FracTable,y
        ;eor #$ff
        ;sta memFrac1,x
        lda FracTable+1,y
        eor #$ff
        sta memFrac2,x
.endmacro

;;; Projectile speed data
PSpdVX = $3c0       ; whole part of X velocity (signed 4-bit)
PSpdVY = $400       ; whole part of Y velocity (signed 4-bit)
PSpdFX1 = $440      ; fractional frames 1-8 for X velocity
PSpdFX2 = $520      ; fractional frames 9-16 for X velocity
PSpdFY1 = $640      ; fractional frames 1-8 for Y velocity
PSpdFY2 = $660      ; fractional frames 9-16 for Y velocity
PSpdOK = $680       ; $80 if valid, 00 if invalid

;; PSpdVX = $7060       ; whole part of X velocity (signed 4-bit)
;; PSpdVY = $7080       ; whole part of Y velocity (signed 4-bit)
;; PSpdFX1 = $70a0      ; fractional frames 1-8 for X velocity
;; PSpdFX2 = $70c0      ; fractional frames 9-16 for X velocity
;; PSpdFY1 = $70e0      ; fractional frames 1-8 for Y velocity
;; PSpdFY2 = $7100      ; fractional frames 9-16 for Y velocity
;; PSpdOK = $3c0        ; $80 if valid, 00 if invalid

;;; This is a drop-in replacement for ComputeDisplacementVector,
;;; so direction is in A and speed is in 340,x
.reloc
ComputeProjectileMotionCached:

;;; Looks up the cached displacement, then adds it directly into the object
;;; position.
;;; Result:
;;;   - $70..d0,x updated with new position
;;;   - $10 is negative if projectile moved to a new tile

        ;; 30 gets dx, 31 gets dy
        lda PSpdVX,x
        sta $30
        asl PSpdFX2,x
        ;rol PSpdFX1,x
        bcc +
          inc $30
          inc PSpdFX2,x
+       lda PSpdVY,x
        sta $31
        asl PSpdFY2,x
        ;rol PSpdFY1,x
        bcc +
          inc $31
          inc PSpdFY2,x
+:
        ;; Now add directly into object coordinates
        lda #$00
        sta $10
@addX:
        lda ObjXLo,x
        sta $34
        clc
        adc $30
        sta ObjXLo,x
        eor $34
        and #$f0
        beq +
          dec $10  ; moved to a new tile
+       bit $30    ; check sign of delta
        bmi +
          bcc @addY
            inc ObjXHi,x        ; NOTE: doesn't clear carry!
            bcs @addY ; uncond
+       bcs @addY
          dec ObjXHi,x
          bcs @addY
            dec ObjXHi,x
@addY:
        lda ObjYLo,x
        sta $36
        clc
        adc $31
        sta ObjYLo,x
        eor $36
        and #$f0
        beq +
          dec $10  ; moved to a new tile
+       lda ObjYLo,x
        cmp #$f0
        bcs +
          sta ObjYLo,x
          rts
        bit $31
        bmi +
          adc #$0f
          sta ObjYLo,x
          inc ObjYHi,x
          rts
+       adc #$ef
        sta ObjYLo,x
        dec ObjYHi,x
        rts
ComputeProjectileMotion:
        ;; Check if we have a cached direction
        ldy PSpdOK,x
        bpl +
          jmp ComputeProjectileMotionCached
+:      ;; Cache invalid: recompute from A/$340
        sec                     ; mark cache as valid
        ror PSpdOK,x
        ;; Figure out if we have an 8-dir or a 16-dir
        lda $0340,x             ; load speed to y
        and #$0f                ; remove knockback bits
        tay                     ; move to Y
        cpy #$0b                ; check against $b
        lda $360,x              ; reload direction
        bcs +                   ; if SPD < $b...
          asl                   ;   then it's 8-dir, so shift an extra time
+       asl                     ; direction is now 32-dir
        ;; Shift direction to MSB
        asl
        asl
        asl
        ;; Shift off the top two bits to figure out which quadrant we're in
        asl
        bcs @q3
        asl
        bcc @q1
        jmp @q2
@q1:
        ;; north -> east (dx = +sin, dy = -cos)
        PROJ_SPEED
        pha
          PROJ_TRIGP SinTable, PSpdVX, PSpdFX1, PSpdFX2
        pla
        PROJ_TRIGN CosTable, PSpdVY, PSpdFY1, PSpdFY2
        jmp ComputeProjectileMotionCached
@q3:
        asl
        bcs @q4
        ;; south -> west (dx = -sin, dy = +cos)
        PROJ_SPEED
        pha
          PROJ_TRIGN SinTable, PSpdVX, PSpdFX1, PSpdFX2
        pla
        PROJ_TRIGP CosTable, PSpdVY, PSpdFY1, PSpdFY2
        jmp ComputeProjectileMotionCached
@q4:
        ;; west -> north (dx = -cos, dy = -sin)
        PROJ_SPEED
        pha
          PROJ_TRIGN CosTable, PSpdVX, PSpdFX1, PSpdFX2
        pla
        PROJ_TRIGN SinTable, PSpdVY, PSpdFY1, PSpdFY2
        jmp ComputeProjectileMotionCached
@q2:
        ;; east -> south (dx = +cos, dy = +sin)
        PROJ_SPEED
        pha
          PROJ_TRIGP CosTable, PSpdVX, PSpdFX1, PSpdFX2
        pla
        PROJ_TRIGP SinTable, PSpdVY, PSpdFY1, PSpdFY2
        jmp ComputeProjectileMotionCached

.endif ; _EXPAND_SPEEDS
