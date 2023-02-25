;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Move chunks from crowded pages (particularly the fixed banks)
;;; out into the expanded PRG:
;;;  1. A storm bracelet animation table -> segment 38

.ifdef EXPAND_PRG

;;; This looks safe and recovers over 300 bytes from the static page.
;;; This code is used by the Storm Bracelet.
FREE "fe" [$ce12, $ce89)
FREE "fe" [$cf47, $d085)
.segment "fe"

.reloc
OVERRIDE
_3ce12:
  tay
  lda #$38
  jsr BankSwitch8k_8000
  jsr @ReadTable
  ;; smudge from $3ce39
  <@3ce39@>
  <@3ce3b BankSwitch16k@>
  <@3ce3e@>
  <@3ce40 ++@>
   <@3ce42@>
   <@3ce43@>
   <@3ce45@>
   beq :>rts
   <@3ce49@>
   <@3ce4b@>
   <@3ce4d@>
   <@3ce4f@>
    <@3ce50@>
    <@3ce52 _3ce89@>
    <@3ce55 _3ce89@>
   <@3ce58@>
   <@3ce59 StageNametableWriteFromTable@>
   <@3ce5c@>
   <@3ce5e@>
   <@3ce5f +@>
   ;; Odd frames: bail out to 34c0e instead (location palette)
    <@3ce61@>
    <@3ce63 BankSwitch8k_8000@>
    <@3ce66 LoadPalettesForLocation@>
   ;; ----
   ;; Clear the map palette data.
+  <@3ce69@>
   <@3ce6b@>
-   <@3ce6d@>
    <@3ce70@>
   <@3ce71 -@>
   ;; Write straight #$30s back to all the non-background colors
   <@3ce73@>
   <@3ce75@>
-   <@3ce77@>
    <@3ce7a@>
    <@3ce7d@>
    <@3ce80@>
    <@3ce81@>
    <@3ce82@>
    <@3ce83@>
   <@3ce84 -@>
   <@3ce86 WaitForOAMDMA@>

.pushseg "38"

.reloc
@ReadTable:
  <@3cf6f@>
  <@3ce12@>              ; smudge from $3ce12
  <@3ce14@>
  <@3ce15@>
  <@3ce16@>
  <@3ce18@>
  <@3ce19 @Table@>
  <@3ce1c@>
  <@3ce1e @Table+1@>
  <@3ce21@>
  <@3ce23 @Table+2@>
  <@3ce26@>
  <@3ce28 +@>
   <@3ce2a @Table+$100@>
   <@3ce2d@>
   <@3ce2f @Table+$101@>
   <@3ce32@>
   <@3ce34 @Table+$102@>
   <@3ce37@>
+ <@3ce98@>

.reloc
@Table:
  ;; smudge from $3cf47
  .byte [@3cf47@],[@3cf48@],[@3cf49@]
  .byte [@3cf4a@],[@3cf4b@],[@3cf4c@]
  .byte [@3cf4d@],[@3cf4e@],[@3cf4f@]
  .byte [@3cf50@],[@3cf51@],[@3cf52@]
  .byte [@3cf53@],[@3cf54@],[@3cf55@]
  .byte [@3cf56@],[@3cf57@],[@3cf58@]
  .byte [@3cf59@],[@3cf5a@],[@3cf5b@]
  .byte [@3cf5c@],[@3cf5d@],[@3cf5e@]
  .byte [@3cf5f@],[@3cf60@],[@3cf61@]
  .byte [@3cf62@],[@3cf63@],[@3cf64@]
  .byte [@3cf65@],[@3cf66@],[@3cf67@]
  .byte [@3cf68@],[@3cf69@],[@3cf6a@]
  .byte [@3cf6b@],[@3cf6c@],[@3cf6d@]
  .byte [@3cf6e@],[@3cf6f@],[@3cf70@]
  .byte [@3cf71@],[@3cf72@],[@3cf73@]
  .byte [@3cf74@],[@3cf75@],[@3cf76@]
  .byte [@3cf77@],[@3cf78@],[@3cf79@]
  .byte [@3cf7a@],[@3cf7b@],[@3cf7c@]
  .byte [@3cf7d@],[@3cf7e@],[@3cf7f@]
  .byte [@3cf80@],[@3cf81@],[@3cf82@]
  .byte [@3cf83@],[@3cf84@],[@3cf85@]
  .byte [@3cf86@],[@3cf87@],[@3cf88@]
  .byte [@3cf89@],[@3cf8a@],[@3cf8b@]
  .byte [@3cf8c@],[@3cf8d@],[@3cf8e@]
  .byte [@3cf8f@],[@3cf90@],[@3cf91@]
  .byte [@3cf92@],[@3cf93@],[@3cf94@]
  .byte [@3cf95@],[@3cf96@],[@3cf97@]
  .byte [@3cf98@],[@3cf99@],[@3cf9a@]
  .byte [@3cf9b@],[@3cf9c@],[@3cf9d@]
  .byte [@3cf9e@],[@3cf9f@],[@3cfa0@]
  .byte [@3cfa1@],[@3cfa2@],[@3cfa3@]
  .byte [@3cfa4@],[@3cfa5@],[@3cfa6@]
  .byte [@3cfa7@],[@3cfa8@],[@3cfa9@]
  .byte [@3cfaa@],[@3cfab@],[@3cfac@]
  .byte [@3cfad@],[@3cfae@],[@3cfaf@]
  .byte [@3cfb0@],[@3cfb1@],[@3cfb2@]
  .byte [@3cfb3@],[@3cfb4@],[@3cfb5@]
  .byte [@3cfb6@],[@3cfb7@],[@3cfb8@]
  .byte [@3cfb9@],[@3cfba@],[@3cfbb@]
  .byte [@3cfbc@],[@3cfbd@],[@3cfbe@]
  .byte [@3cfbf@],[@3cfc0@],[@3cfc1@]
  .byte [@3cfc2@],[@3cfc3@],[@3cfc4@]
  .byte [@3cfc5@],[@3cfc6@],[@3cfc7@]
  .byte [@3cfc8@],[@3cfc9@],[@3cfca@]
  .byte [@3cfcb@],[@3cfcc@],[@3cfcd@]
  .byte [@3cfce@],[@3cfcf@],[@3cfd0@]
  .byte [@3cfd1@],[@3cfd2@],[@3cfd3@]
  .byte [@3cfd4@],[@3cfd5@],[@3cfd6@]
  .byte [@3cfd7@],[@3cfd8@],[@3cfd9@]
  .byte [@3cfda@],[@3cfdb@],[@3cfdc@]
  .byte [@3cfdd@],[@3cfde@],[@3cfdf@]
  .byte [@3cfe0@],[@3cfe1@],[@3cfe2@]
  .byte [@3cfe3@],[@3cfe4@],[@3cfe5@]
  .byte [@3cfe6@],[@3cfe7@],[@3cfe8@]
  .byte [@3cfe9@],[@3cfea@],[@3cfeb@]
  .byte [@3cfec@],[@3cfed@],[@3cfee@]
  .byte [@3cfef@],[@3cff0@],[@3cff1@]
  .byte [@3cff2@],[@3cff3@],[@3cff4@]
  .byte [@3cff5@],[@3cff6@],[@3cff7@]
  .byte [@3cff8@],[@3cff9@],[@3cffa@]
  .byte [@3cffb@],[@3cffc@],[@3cffd@]
  .byte [@3cffe@],[@3cfff@],[@3d000@]
  .byte [@3d001@],[@3d002@],[@3d003@]
  .byte [@3d004@],[@3d005@],[@3d006@]
  .byte [@3d007@],[@3d008@],[@3d009@]
  .byte [@3d00a@],[@3d00b@],[@3d00c@]
  .byte [@3d00d@],[@3d00e@],[@3d00f@]
  .byte [@3d010@],[@3d011@],[@3d012@]
  .byte [@3d013@],[@3d014@],[@3d015@]
  .byte [@3d016@],[@3d017@],[@3d018@]
  .byte [@3d019@],[@3d01a@],[@3d01b@]
  .byte [@3d01c@],[@3d01d@],[@3d01e@]
  .byte [@3d01f@],[@3d020@],[@3d021@]
  .byte [@3d022@],[@3d023@],[@3d024@]
  .byte [@3d025@],[@3d026@],[@3d027@]
  .byte [@3d028@],[@3d029@],[@3d02a@]
  .byte [@3d02b@],[@3d02c@],[@3d02d@]
  .byte [@3d02e@],[@3d02f@],[@3d030@]
  .byte [@3d031@],[@3d032@],[@3d033@]
  .byte [@3d034@],[@3d035@],[@3d036@]
  .byte [@3d037@],[@3d038@],[@3d039@]
  .byte [@3d03a@],[@3d03b@],[@3d03c@]
  .byte [@3d03d@],[@3d03e@],[@3d03f@]
  .byte [@3d040@],[@3d041@],[@3d042@]
  .byte [@3d043@],[@3d044@],[@3d045@]
  .byte [@3d046@],[@3d047@],[@3d048@]
  .byte [@3d049@],[@3d04a@],[@3d04b@]
  .byte [@3d04c@],[@3d04d@],[@3d04e@]
  .byte [@3d04f@],[@3d050@],[@3d051@]
  .byte [@3d052@],[@3d053@],[@3d054@]
  .byte [@3d055@],[@3d056@],[@3d057@]
  .byte [@3d058@],[@3d059@],[@3d05a@]
  .byte [@3d05b@],[@3d05c@],[@3d05d@]
  .byte [@3d05e@],[@3d05f@],[@3d060@]
  .byte [@3d061@],[@3d062@],[@3d063@]
  .byte [@3d064@],[@3d065@],[@3d066@]
  .byte [@3d067@],[@3d068@],[@3d069@]
  .byte [@3d06a@],[@3d06b@],[@3d06c@]
  .byte [@3d06d@],[@3d06e@],[@3d06f@]
  .byte [@3d070@],[@3d071@],[@3d072@]
  .byte [@3d073@],[@3d074@],[@3d075@]
  .byte [@3d076@],[@3d077@],[@3d078@]
  .byte [@3d079@],[@3d07a@],[@3d07b@]
  .byte [@3d07c@],[@3d07d@],[@3d07e@]
  .byte [@3d07f@],[@3d080@],[@3d081@]
  .byte [@3d082@],[@3d083@],[@3d084@]
.popseg
;; smudge off


.endif ; EXPAND_PRG
