;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Moves routines handling the paralysis beam (called from the collision
;;; detection loop) to page 3c.

.segment "1a"

;;; Called by routine near $3ccdd to clear paralysis after a delay
.reloc
OVERRIDE
SetOrClearParalysisFlag:
        FAR_JUMP_LO SetOrClearParalysisFlag_3c

.segment "3c"

.reloc                          ; smudge from $34fc4
OVERRIDE
CollisionJump_03_ParalysisBeam:
        <@34fc4@>
        <@34fc7@>
        <@34fc9 ++@>
          ;; Target was immune
          <@3507c@>           ; smudge from $3507c (inlined)
          <@3507f@>
          <@3506f +@>                 ; smudge from $3506c (inlined)
            <@35071@>
            <@35073@>
            <@35076 SFX_ATTACK_IMMUNE@>
            <@35078 StartAudioTrack@>
            ;; ----
+         <@3507b@>
          ;; ----
        ;; Paralyze an NPC
++      <@3507c@>             ; smudge from $3507c (inlined)
        <@3507f@>
          beq :<rts             ; smudge from $34fd1 to $35045
        <@34fd3@>
        <@34fd6@>
          beq :<rts
        <@34fda@>
        <@34fdc@>
        <@34fdf@>
        <@34fe2@>
          bne :<rts
        <@34fe6@>
        <@34fe9@> ; NPC ID
        <@34feb@>
        <@34fed@> ; set paralysis flag
        <@34fef@>
        <@34ff1@>
        <@34ff4@>
        <@34ff6@>
        <@34ff9@>
          bne :<rts
        ;; Check immunity to paralysis
        <@34ffd (ParalysisImmuneNpcListEnd - ParalysisImmuneNpcList - 1)@> ; #$13
-         <@34fff ParalysisImmuneNpcList@>
          <@35002@>
          <@35004 +@>
            <@35006@>
            <@35008@>
            <@3500a@>
            <@3500d@>
            ;; ----
+         <@3500e@>
        <@3500f -@>
SetOrClearParalysisFlag_3c:
        ;; Input: $12 = FF to set, 00 to clear
        ;;        $13 = NPC ID to handle
        ;; smudge off (NOTE: This has been rewritten to remove the zero-delimiter
        ;; from the key list and instead embed the statically known size of the
        ;; list as a constant initialization for Y, saving a few bytes)
        ldy #(ParalysisFlagTableValues - ParalysisFlagTableKeys)
-         dey
          bmi :<rts             ; end of list: return
          lda ParalysisFlagTableKeys,y
          cmp $13
        bne -
        ;; smudge from $35020
        ;; NPC was entry Y in the 35045 table
        ;;   -> set (or clear) the parallel flag in 3504f.
        <@35020 ParalysisFlagTableValues@>
        <@35023@>
          <@35024@>
          <@35026@>
          <@35027 PowersOfTwo@>
          <@3502a@>
          <@3502c@>
          <@3502e PowersOfTwo@>
          <@35031@>
          <@35033@>
        <@35035@>
        <@35036@>
        <@35037@>
        <@35038@>
        <@35039@>
        <@3503a@>
        <@3503d@>
        <@3503f@>
        <@35041@>
        <@35044@>

;;; Looks like the first 19 bytes is a paralysis flag table
;;; But most of these are never read - it could be compressed down to
;;; just two entries: 6d => 70 and 6e => 71.
.reloc                     ; smudge from $35045
OVERRIDE
ParalysisFlagTableKeys:
        ;; This is the key to a map => person ID of paralysis target
        .byte [@35045@],[@35046@],[@35047@],[@35048@],[@35049@],[@3504a@],[@3504b@],[@3504c@],[@3504d@]

OVERRIDE   
ParalysisFlagTableValues: ; smudge from $3504f
        ;; This next line (9 bytes) appears to reference flags?
        .byte [@3504f@],[@35050@],[@35051@],[@35052@],[@35053@],[@35054@],[@35055@],[@35056@],[@35057@]

.reloc                     ; smudge from $35058
OVERRIDE
ParalysisImmuneNpcList:
        ;; 20 NPC IDs that are immune to paralysis
        .byte [@35058@],[@35059@] ; kensu
        .byte [@3505a@],[@3505b@] ; asina in various forms
        .byte [@3505c@]     ; unused
        .byte [@3505d@],[@3505e@] ; azteca
        .byte [@3505f@],[@35060@] ; shyron guards
        .byte [@35061@],[@35062@] ; dolphin
        .byte [@35063@],[@35064@],[@35065@] ; dead shyron people
        .byte [@35066@],[@35067@],[@35068@] ; kensu in various places
        .byte [@35069@]     ; mesia
        .byte [@3506a@],[@3506b@] ; aryllis attendants
ParalysisImmuneNpcListEnd:
