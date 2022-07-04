.define FREE {seg [start, end)} \
    .pushseg seg .eol \
    .org start .eol \
    .free end - start .eol \
    .popseg
.define FREE {seg [start, end]} .noexpand FREE seg [start, end + 1)


;;; Relocate a block of code and update refs
;;; Usage:
;;;   RELOCATE segments [start, end) refs...
;;; Where |segments| is an optional comma-separated list of segment
;;; names, and |refs| is a space-separated list of addresses whose
;;; contents point to |start| and that need to be updated to point to
;;; whereever it eventually ended up.  If no segments are specified
;;; then the relocation will stay within the current segment.
.define RELOCATE {seg [start, end) refs .eol} \
.org start .eol \
: FREE_UNTIL end .eol \
.ifnblank seg .eol \
.pushseg seg .eol \
.endif .eol \
.reloc .eol \
: .move (end-start), :-- .eol \
.ifnblank seg .eol \
.popseg .eol \
.endif .eol \
UPDATE_REFS :- @ refs


;;; Update a handful of refs to point to the given address.
;;; Usage:
;;;   UPDATE_REFS target @ refs...
;;; Where |refs| is a space-separated list of addresses, and
;;; |target| is an address or label to insert into each ref.
.define UPDATE_REFS {target @ ref refs .eol} \
.org ref .eol \
  .word (target) .eol \
UPDATE_REFS target @ refs
.define UPDATE_REFS {target @ .eol}


.macro FREE_UNTIL end
  .assert * <= end
  .free end - *
.endmacro


;;; TODO - this macro is currently broken!
;; .macro MOVE bytes, segment, source
;;   .local S
;;   .pushseg segment
;;   .org source
;;   S = *
;;   .popseg
;;   .move bytes, S
;; .endmacro

.segment "00"   :bank $00 :size $2000 :off $00000 :mem $8000
.segment "01"   :bank $01 :size $2000 :off $02000 :mem $a000
.segment "02"   :bank $02 :size $2000 :off $04000 :mem $8000
.segment "03"   :bank $03 :size $2000 :off $06000 :mem $a000
.segment "04"   :bank $04 :size $2000 :off $08000 :mem $8000
.segment "05"   :bank $05 :size $2000 :off $0a000 :mem $a000
.segment "06"   :bank $06 :size $2000 :off $0c000 :mem $8000
.segment "07"   :bank $07 :size $2000 :off $0e000 :mem $a000
.segment "08"   :bank $08 :size $2000 :off $10000 :mem $8000
.segment "09"   :bank $09 :size $2000 :off $12000 :mem $a000
.segment "0a"   :bank $0a :size $2000 :off $14000 :mem $8000
.segment "0b"   :bank $0b :size $2000 :off $16000 :mem $a000
.segment "0c"   :bank $0c :size $2000 :off $18000 :mem $8000
.segment "0d"   :bank $0d :size $2000 :off $1a000 :mem $a000
.segment "0e"   :bank $0e :size $2000 :off $1c000 :mem $8000
.segment "0f"   :bank $0f :size $2000 :off $1e000 :mem $a000
.segment "10"   :bank $10 :size $2000 :off $20000 :mem $8000
.segment "11"   :bank $11 :size $2000 :off $22000 :mem $a000
.segment "12"   :bank $12 :size $2000 :off $24000 :mem $8000
.segment "13"   :bank $13 :size $2000 :off $26000 :mem $a000
.segment "14"   :bank $14 :size $2000 :off $28000 :mem $8000
.segment "15"   :bank $15 :size $2000 :off $2a000 :mem $a000
.segment "16"   :bank $16 :size $2000 :off $2c000 :mem $8000
;;; 15..17 store messages, all accessed via the a000 slot
.segment "16:a" :bank $16 :size $2000 :off $2c000 :mem $a000
.segment "17"   :bank $17 :size $2000 :off $2e000 :mem $a000
.segment "18"   :bank $18 :size $2000 :off $30000 :mem $8000
.segment "19"   :bank $19 :size $2000 :off $32000 :mem $a000
.segment "1a"   :bank $1a :size $2000 :off $34000 :mem $8000
.segment "1b"   :bank $1b :size $2000 :off $36000 :mem $a000
.segment "1c"   :bank $1c :size $2000 :off $38000 :mem $8000
.segment "1d"   :bank $1d :size $2000 :off $3a000 :mem $a000
;;; Currently no good way to access the post-expanded 1e/1f

;;; Note: we moved these when we expanded the rom.
.segment "fe"   :bank $1e :size $2000 :off $3c000 :mem $c000
.segment "ff"   :bank $1f :size $2000 :off $3e000 :mem $e000

;;; Expanded rom segments??? consider doing these programmatically?
;;; Plane 4 - reserved for map data
.segment "20"   :bank $20 :size $2000 :off $40000 :mem $8000
.segment "21"   :bank $21 :size $2000 :off $42000 :mem $a000
.segment "22"   :bank $22 :size $2000 :off $44000 :mem $8000
.segment "23"   :bank $23 :size $2000 :off $46000 :mem $a000
.segment "24"   :bank $24 :size $2000 :off $48000 :mem $8000
.segment "25"   :bank $25 :size $2000 :off $4a000 :mem $a000
.segment "26"   :bank $26 :size $2000 :off $4c000 :mem $8000
.segment "27"   :bank $27 :size $2000 :off $4e000 :mem $a000
;;; Plane 5 - reserved for map data
.segment "28"   :bank $28 :size $2000 :off $50000 :mem $8000
.segment "29"   :bank $29 :size $2000 :off $52000 :mem $a000
.segment "2a"   :bank $2a :size $2000 :off $54000 :mem $8000
.segment "2b"   :bank $2b :size $2000 :off $56000 :mem $a000
.segment "2c"   :bank $2c :size $2000 :off $58000 :mem $8000
.segment "2d"   :bank $2d :size $2000 :off $5a000 :mem $a000
.segment "2e"   :bank $2e :size $2000 :off $5c000 :mem $8000
.segment "2f"   :bank $2f :size $2000 :off $5e000 :mem $a000
;;; Plane 6 - currently unused
.segment "30"   :bank $30 :size $2000 :off $60000 :mem $8000
.segment "31"   :bank $31 :size $2000 :off $62000 :mem $a000
.segment "32"   :bank $32 :size $2000 :off $64000 :mem $8000
.segment "33"   :bank $33 :size $2000 :off $66000 :mem $a000
.segment "34"   :bank $34 :size $2000 :off $68000 :mem $8000
.segment "35"   :bank $35 :size $2000 :off $6a000 :mem $a000
.segment "36"   :bank $36 :size $2000 :off $6c000 :mem $8000
.segment "37"   :bank $37 :size $2000 :off $6e000 :mem $a000
;;; Plane 7 - available for code/data
.segment "38"   :bank $38 :size $2000 :off $70000 :mem $8000
.segment "39"   :bank $39 :size $2000 :off $72000 :mem $a000
.segment "3a"   :bank $3a :size $2000 :off $74000 :mem $8000
.segment "3b"   :bank $3b :size $2000 :off $76000 :mem $a000
.segment "3c"   :bank $3c :size $2000 :off $78000 :mem $8000
.segment "3d"   :bank $3d :size $2000 :off $7a000 :mem $a000

FREE "38" [$8000, $a000)
FREE "39" [$a000, $c000)
FREE "3a" [$8000, $a000)
FREE "3b" [$a000, $c000)
FREE "3c" [$8000, $a000)
FREE "3d" [$a000, $c000)

;;; These are the fixed pages and should not be used!
;; .segment "3e"   :bank $3e :size $2000 :off $7c000 :mem $8000
;; .segment "3f"   :bank $3f :size $2000 :off $7e000 :mem $a000

VromPalettes = $3f00
PPUCTRL   = $2000
PPUMASK   = $2001
PPUSTATUS = $2002
OAMADDR   = $2003
OAMDATA   = $2004
PPUSCROLL = $2005
PPUADDR   = $2006
PPUDATA   = $2007
OAMDMA    = $4014

; Workaround compiler issue that forces values set using `=`
; to use absolute addressing instead of zp by using .define
.define PpuCtrlShadow $00
.define PpuMaskShadow $01

.define NmiDisable $06 ; Set to 1 to disable NMI processing
.define NmiSkipped $07 ; Set to $06 if NMI was skipped
.define OamDisable $09 ; Set to $00 to have OAM run

.define NmtBufReadOffset  $0a
.define NmtBufWriteOffset $0b
.define NmtBufTempValue   $0c

;;; Various global definitions.
.define GameMode   $41
.define ScreenMode $51
ObjectRecoil = $340
ObjectHP = $3c0
PlayerHP = $3c1
PlayerMaxHP = $3c0
ObjectAtk = $3e0
PlayerAtk = $3e1
ObjectDef = $400
PlayerLevel = $421
ObjectActionScript = $4a0
ObjectGold = $500
ObjectElementalDefense = $500
ObjectExp = $520
; PlayerExp - 16bit number (includes $705). This value was changed so that instead of
; starting at zero and counting up to ExpToNextLevel, it will start at ExpToNextLevel
; and count down.
PlayerExp = $704
PlayerMP = $708
PlayerMaxMP = $709
EquippedConsumableItem = $715
EquippedPassiveItem    = $716


InvSwords = $6430
InvConsumables = $6440
InvPassive = $6448
InvQuest = $6450
InvMagic = $6458
SlotFlagsStart = $64a0
ItemFlagsStart = $64c0
Difficulty = $648f         ; requires defrag! (flags 078 .. 07f)
ShouldRedisplayDifficulty = $61ff

        
SelectedConsumableIndex = $642c
SelectedQuestItemIndex  = $642e

.ifdef _EXTRA_PITY_MP
PITY_MP_AMOUNT    = 34
.else
PITY_MP_AMOUNT    = 2
.endif        

PITY_HP_AMOUNT    = 5

SHOP_COUNT        = 11
SCALING_LEVELS    = 48

.ifdef _UNIDENTIFIED_ITEMS
SORT_START_ROW    = 3
.else
SORT_START_ROW    = 2
.endif

;;; Constants
GAME_MODE_STATUS_MSG = $10
ITEM_RABBIT_BOOTS    = $12
ITEM_OPEL_STATUE     = $26
SFX_MONSTER_HIT      = $21
SFX_ATTACK_IMMUNE    = $3a

;;; see http://www.6502.org/tutorials/6502opcodes.html#BIT
;;; note: this is dangerous if it would result in a register read
.define SKIP_TWO_BYTES .byte $2c

;;; Labels (TODO - consider keeping track of bank?)
.segment "0e"                   ; 1c000
SetOrClearFlagsFromBytePair_24y = $8112
ReadFlagFromBytePair_24y        = $8135
ItemGet                         = $826f
ItemGet_Bracelet                = $82f4
ItemGet_FindOpenSlot            = $8308
ItemUse_TradeIn                 = $8354

.segment "10"       ; 20000
Shop_NothingPressed = $97cd
AfterLoadGame       = $9c7a

.segment "13"      ; 26000
PlayerDeath        = $b91c
ActivateOpelStatue = $b9b0


.segment "1a"         ; 34000
ArmorDefense          = $8bc0
ShieldDefense         = $8bc9
DisplayNumberInternal = $8e46
KillObject            = $9152
KnockbackObject       = $95c0

.segment "fe"              ; 3c000
PowersOfTwo                = $c000
UpdateEquipmentAndStatus   = $c008
StartAudioTrack            = $c125
LoadOneObjectDataInternal  = $c25d
BankSwitch16k              = $c40e
BankSwitch8k_8000          = $c418
BankSwitch8k_a000          = $c427
FlushNametableDataWrite    = $c676
MainLoop_01_Game           = $cab6
CheckForPlayerDeath        = $cb84
DialogAction_11            = $d21d
LoadAndShowDialog          = $d347
WaitForDialogToBeDismissed = $d354
SpawnMimic                 = $d3da
MainLoopItemGet            = $d3ff

.segment "ff"                 ; 3e000
RestoreBanksAndReturn         = $e756
ExecuteScreenMode             = $f6ad
ReadControllersWithDirections = $fe80
DisplayNumber                 = $ffa9

;;; Various free sections

;;; another 256 free in map space
FREE "0b" [$bf00, $c000)        ; 17f00 .. 18000
;;; ~80 bytes free in middle of SFX data that could be used on npc data page?
FREE "0c" [$83fc, $844d)        ; 183fc .. 1844d
;;; empty space at end of npcdata
FREE "0d" [$aba3, $ac00)        ; 1aba3 .. 1ac00

;;; 58 bytes of free/unused space at start of itemuse jump
FREE "0e" [$8399, $83d3)
;;; 16 bytes of free/unused space in middle of itemuse jump
FREE "0e" [$83eb, $83fb)
;;; 30 bytes of free/unused space at end of itemuse jump
FREE "0e" [$841b, $8439)

;;; TODO - move these into ROM - as we discover they're unused,
;;; free them directly there... (could allow for defragging).
;;; Free space in middle of spawn condition table (lots of unused IDs)
FREE "0e" [$86f2, $86fc)
FREE "0e" [$86fe, $8760)

;;; Free bytes in middle of dialog table
FREE "0e" [$8a6f, $8a79)
FREE "0e" [$8a7b, $8ae3)

;;; TreasureChestSpawnTable no longer needed

;;; Also frees the first HALF of the ItemGetTable, which is identity
;;; This leads to some tricky business, since we end up indexing into
;;; the table only starting at index $49, so that $9d66 is the base,
;;; even though that's inside the freed section.
FREE "0e" [$9c82, $9daf)

;;; Treasure chest spawn flags also unneeded
FREE "0f" [$a106, $a17a)
;;; Free space at end of trigger data
FREE "0f" [$a3c0, $a3f0)

;;; Debug mode (note: requires patch at 1fde4)
FREE "0f" [$bf46, $c000)

;;; Unused subroutine
FREE "10" [$8a37, $8a5a)
;;; Unused space at end of item name table 21471
FREE "10" [$9471, $9500)

;;; Unused subroutine
FREE "13" [$a4b3, $a4bf)
;;; Unused bytes after some of the intro menu graphics
FREE "13" [$b88d, $b900)
;;; A few unused bytes at the end of the page
FREE "13" [$bff2, $c000)

;;; Random unused data table
FREE "14" [$8520, $8528)

;;; NOTE: there's space here, but we glob it into the space
;;; recovered from defragging MapData... if we want it back
;;; we'll need to change the "end" address there.
;.org $17cfa
;;; just over 256 bytes free in map space
;.assert < $17e00

FREE "1b" [$a086, $a0a3)


FREE "fe" [$c446, $c482)
;;; Random uncovered 6 bytes between dialog actions
FREE "fe" [$d196, $d19c)
;;; Recovered from item/trigger jump 08 (get paralysis)
FREE "fe" [$d654, $d659)
;;; Recovered from other item/trigger jumps (06/11, 0b, 0c, 0d, 0e, 0f,
FREE "fe" [$d6d5, $d746)

FREE "ff" [$fa01, $fe00) ; rts at 3fe00 is important
FREE "ff" [$fe01, $fe16)
FREE "ff" [$fe18, $fe78) ;; NOTE: 3fe2e might be safer than 3fe18
FREE "ff" [$ff44, $ff80)
FREE "ff" [$ffe3, $fffa)

;;; Patch the DMC Sample to start with FF to eliminate the buzz
.segment "ff"
.org $fa00
  .byte $ff

;;; Patch the end of ItemUse to check for a few more items.
.segment "0e"
.org $834d
  jmp PatchTradeInItem

.org $8156                      ; 1c157
  lda PowersOfTwo,x ; no need for multiple copies
