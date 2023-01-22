;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Allows map data to be relocated to additional rom banks.
;;; Also rearranges how some of the location tables are stored.
;;; (e.g. the exit terminator stores a pit flag and entrance count,
;;; though this is not used by the actual game logic currently).

.segment "1a", "1b", "fe", "ff" ;.bank $34000 $8000:$4000

;;; These are available because the "0a" screens are all for single-screen maps.
;;; We do use the 48 bytes at the end of the 142 screen for extra global data.
FREE "0a" [$80c0, $8100)
FREE "0a" [$81c0, $8200)

.ifdef _EXTRA_EXTENDED_SCREENS
;;; Normally the check for tile effects just looks at the
;;; current map screen and clamps the page switch to the
;;; first 8 pages, but if we're reading screen data from
;;; extended locations, this won't work.  We need to patch
;;; the tile effects reader to read from extended pages
;;; when the extended flag is set ($62ff)

;;; NOTE: We could save some space by just calling directly
;;; into PatchPrepareScreenMapRead, but possibly the original
;;; code used the quick version for a reason?  It looks like
;;; it's not generally called more than a handful of times
;;; per frame (12-14, maybe a few more with a lot of objects)
;;; and it only saves 3 cycles each (the jsr and rts also
;;; o few instructions).
.if 1

.org $9a58
  jsr PatchPrepareScreenMapRead
  bne $9a73
FREE_UNTIL $9a73

.else ; false

.org $9a58
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
   jsr QuickSwapPageA
  pla
  and #$1f
  ora #$a0
  sta $11
.assert * = $9a73

;;; This is a faster version of page swap ($a000) that destroys Y
;;; (Remove "1b" because it would change the page out from under itself).
.pushseg "1a", "fe", "ff"
.reloc
QuickSwapPageA:
  sta $6f
  ldy #$07
  sty $50
  sty $8000
  sta $8001
  rts
.popseg

.endif ; 1

.pushseg "0a", "fe", "ff"
;;; In this setup, we compress the map data by two bytes:
;;;  - The layout table (0) is now [music], [yx], [ext+anim],
;;;    where (x, y, anim, ext) have been compressed into only
;;;    two bytes, saving some room for other purposes.
;;;  - (yx) packs the height into the upper nibble and the
;;;    width into the lower nibble.
;;;  - (ext+anim) packs the ext number into the upper 6 bits
;;;    and the animation into the lower 2.  Thus, $28 would
;;;    indicate that screen 00 is at $14000, up through screen
;;;    $1f at $15f00.
.reloc
DecomposeScreenYX:
  lda ($10),y
  and #$0f
  sta $62fc
  lda ($10),y
  lsr
  lsr
  lsr
  lsr
  sta $13
  rts
.popseg

.org $e639
  ;; read the y=1 byte into both 62fc AND 62fd/13
  jsr DecomposeScreenYX ; $140f0
  sta $62fd
  iny
  lda ($10),y
  lsr
  lsr
  sta $62ff
  ;; read the y=2 byte into both 62ff AND 62fe
  lda ($10),y
  and #$03
  sta $62fe
  bpl $e652
FREE_UNTIL $e652

.org $ebe8
  ;; note: the AND should no longer be necessary since it's zero already
  and #$3f    ; note: we only need the 20 bit if we expand the rom
  beq $ebef
   jsr BankSwitch8k_8000  ; BankSwitch8k_8000
.assert * = $ebef

.org $ef36
  jsr PatchPrepareScreenMapRead
  bne $ef46  ; uncond
FREE_UNTIL $ef46

.pushseg "fe", "ff"
.reloc
PatchPrepareScreenMapRead:
    ;; First swap in the correct page into the $8000 bank.
    ;; Ultimately we want A = %00pp_paaa where ppp is $62ff (the low
    ;; 3 bits) and aaa is the upper 3 bits of the input ($11 for temp).
    pha
     sta $11
     lda $62ff
     asl $11
     rol
     asl $11
     rol
     asl $11
     rol
     jsr BankSwitch8k_a000
    pla
    and #$1f
    ora #$a0
    sta $11
    rts
    ; jmp $ef46  ; Pick up where we left off in the original code
.popseg
  

;;; TODO - PrepareMapScreenRead (ff:ef36) hardcodes assumptions about the
;;; segments - we probably need to patch into it to do something else.
;;; There's 4 calls to this.  Consider always loading out of the 8000
;;; bank rather than using both?  Will need to follow up on all 4 calls to
;;; see about swapping in the correct bank always?



.endif ; _EXTRA_EXTENDED_SCREENS


;;; Allow any negative number to terminate an exit table.  Since X coordinates
;;; are constrained to 0..7f, this is safe, and it gives 7 extra bits for
;;; storing additional information that we can read when parsing the rom.
;;; For now, we will store %1p0eeeee where p is 1 if there is a pits table
;;; and eeeee is the number of entrances (0..1f).
.org $eb40
  bpl +
   rts
  nop
+:
.assert * = $eb44
