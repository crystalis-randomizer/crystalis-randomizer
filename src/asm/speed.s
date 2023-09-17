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

;;; Do the speed conversion, once per branch.  Leaves DDDS.SSSS in A
.macro CONVERT_SPEED
        pha
          ;; Check for slow terrain
          lda $0380,x
          asl
          bpl +
            dey
            dey
            bpl +
              ldy #$00
          ;; Convert speed to new system
+         lda SpeedConversionTable,y
          sta $10
          ;; Store step counter in $11
          lda $0480,x
          and #$0f
          sta $11
        pla
        ;; OR the (shifted) direction into the speed to get trig table index
        ora $10
.endmacro

;;; Positive trig function
.macro TRIGP table, mem
        ;; At this point, A has index into one of the trig tables
        ;; Read the component and add the fraction to the whole part
        tay
        lda table,y
        pha
          ;; Put the fraction into y
          and #$f0
          ora $11
          tay
        pla
        and #$0f
        sta mem
        lda SpeedFractionTable,y
        asl
        bcc +
          inc mem
+:
.endmacro

;;; Negative trig function
.macro TRIGN table, mem
        ;; At this point, A has index into one of the trig tables
        ;; Read the component, then negate and add the fraction (inverse carry)
        ;; This is effectively a two's complement but rather than always
        ;; incrementing and then somtimes decrementing, we just conditionally
        ;; increment on the opposite condition (carry clear)
        tay
        lda table,y
        pha
          ;; Put the fraction into y
          and #$f0
          ora $11
          tay
        pla
        and #$0f
        eor #$ff
        sta mem
        lda SpeedFractionTable,y
        asl
        bcs +
          inc mem
+:
.endmacro



;.reloc
.org $8800
;;; NOTE: can't use a cheap local because of the named label below... :-(
cdv_q2:         ; Put this before the main routine to keep jumps in bounds
        ;; east -> south (dx = +cos, dy = +sin)
        CONVERT_SPEED
        pha
        TRIGP CosTable, $30
        pla
        TRIGP SinTable, $31
        rts
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
        sta $12                 ; stash direction
        lda $0340,x             ; load speed to y
        and #$0f                ; remove knockback bits
        tay                     ; move to Y
        cpy #$0b                ; check against $b
        lda $12                 ; reload direction
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
        bcs cdv_q2
@q1:
        ;; north -> east (dx = +sin, dy = -cos)
        CONVERT_SPEED
        pha
        TRIGP SinTable, $30
        pla
        TRIGN CosTable, $31
        rts
@q3:
        asl
        bcs @q4
        ;; south -> west (dx = -sin, dy = +cos)
        CONVERT_SPEED
        pha
        TRIGN SinTable, $30
        pla
        TRIGP CosTable, $31
        rts
@q4:
        ;; west -> north (dx = -cos, dy = -sin)
        CONVERT_SPEED
        pha
        TRIGN CosTable, $30
        pla
        TRIGN SinTable, $31
        rts


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



.segment "1a", "1b", "fe", "ff"
;;; Switch mado shurikens to alternate frames that they curve at
;;; We can't have them _all_ go at different frames since it drastically
;;; changes their trajectory, but we can alternate even/odd without much
;;; noticeable change.  TODO - we'll probably want to rewrite more of this.
.org $b0fc
        jsr +
.reloc
+       txa
        and #1
        eor $0480,x
        rts

;;; De-lag projectile motion
;;; We define a _second_ version of ComputeDisplacementVector that
;;; caches the trig results, saving a lot of computation time.

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

;;; TODO - don't write into $30, but inline all of AddDisplacementVectorShort
;;; and write directly into the position
;;;   - this should speed up quite a bit; the only difference is that if the
;;;     thing dies then it will drop its replacement one step further, into
;;;     the illegal terrain?  - but the only children are FF, 0, 2, and 3
;;;     which all just zero out the object, so it's truly irrelevant!

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
+       rts
ComputeProjectileMotion:
        ;; Check if we have a cached direction
        ldy PSpdOK,x
        bne ComputeProjectileMotionCached
        ;; Cache invalid: recompute from A/$340
        sec                     ; mark cache as valid
        ror PSpdOK,x
        ;; Figure out if we have an 8-dir or a 16-dir
        sta $12                 ; stash direction
        lda $0340,x             ; load speed to y
        and #$0f                ; remove knockback bits
        tay                     ; move to Y
        cpy #$0b                ; check against $b
        lda $12                 ; reload direction
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

;;; Replace ObjectActionJump_57 call to CDV with CPM
.org $b0d4
        jsr ComputeProjectileMotion

.endif ; _EXPAND_SPEEDS
