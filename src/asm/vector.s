;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Routines for vector arithmetic

.segment "1a"

FREE "1a" [$9824, $98b9)

;;; --------------------------------
;;; $34..$37 have been copied from $3c..$3f, the screen coordinates.  $30,$31
;;; may be a velocity vector? This is very similar to AddDisplacementVectorShort
;;; below, but handles larger |dy| correctly.
.reloc                          ; smudge from $35824 to $35861
OVERRIDE
AddDisplacementVectorLong:
        <@35824@>
        <@35826 +@> ; $35833
          <@35828@>
          <@35829@>
          <@3582b@>
          <@3582d ++@> ; $3583c
           <@3582f@>
           <@35831 ++@> ; $3583c
+        <@35833@>
         <@35834@>
         <@35836@>
         <@35838 ++@> ; $3583c
          <@3583a@>
++      <@3583c@>
        <@3583e +++@> ; $35850
        ;; dy >= 0
         <@35840@>
         <@35841@>
         <@35843 +@> ; $35849
        ;; Carry not set, so check if we're in the exclusion zone
           <@35845@>
           <@35847 ++@> ; $3584d
        ;; There was a carry, or else we landed in the exclusion zone.
        ;; Either way, add the extra $10 (carry bit will always be set here).
+         <@35849@>
          <@3584b@>
++       <@3584d@>
         <@3584f@>
         ;; ----
+++     <@35850@>
        <@35851@>
        <@35853 +@> ; $3585a
        ;; Carry clear, check 
          <@35855@>
          <@35857 ++@> ; $3585e
           <@35859@>
+        <@3585a@>
         <@3585c@>
++      <@3585e@>
        <@35860@>

;;; --------------------------------
;;; Reads $30 and $31 (dx, dy)
;;; Mutates: $34..$37 - object's (x,y)
;;; This handles the skipped $f0 nibble correctly as long as |$31| <= $f.
.reloc                          ; smudge from $35861 to $35897
OVERRIDE
AddDisplacementVectorShort:
        <@35861@>
        <@35863 +@> ; $35870
          <@35865@>
          <@35866@>
          <@35868@>
          <@3586a ++@> ; $35879
           <@3586c@>
           <@3586e ++@> ; $35879 - uncond
+        <@35870@>
         <@35871@>
         <@35873@>
         <@35875 ++@> ; $35879
          <@35877@>
++      <@35879@>
        <@3587b@>
        <@3587c@>
        <@3587e@> ; Note special handling for 240px.
        <@35880 +@> ; $35885
         <@35882@>
         <@35884@>
         ;; ----
+       <@35885@>
        <@35887 +@> ; $35890
         <@35889@>
         <@3588b@>
         <@3588d@>
         <@3588f@>
         ;; ----
+       <@35890@>
        <@35892@>
        <@35894@>
        <@35896@>

;;; --------------------------------
.reloc                          ; smudge from $35897 to $358a8
OVERRIDE
WriteObjectCoordinatesFrom_34_37:
        <@35897@>
        <@35899@>
        <@3589b@>
        <@3589d@>
        <@3589f@>
        <@358a1@>
        <@358a3@>
        <@358a5@>
        <@358a7@>

;;; --------------------------------
.reloc                          ; smudge from $358a8 to $358b9
OVERRIDE
ReadObjectCoordinatesInto_34_37:
        <@358a8@>
        <@358aa@>
        <@358ac@>
        <@358ae@>
        <@358b0@>
        <@358b2@>
        <@358b4@>
        <@358b6@>
        <@358b8@>
