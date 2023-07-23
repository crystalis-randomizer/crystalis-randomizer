;;; smudge sha1 fd0dcde4f1708b30d5c3de1e463f1dde89c5cb64
;;; smudge off

;;; Initialization. This must come before all other modules.

;;; Tag for labels that we expect to override vanilla
.define OVERRIDE

;;; Nicer syntax for declaring free sections
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
.segment "14:a" :bank $14 :size $2000 :off $28000 :mem $a000
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
.segment "1e"   :bank $1e :size $2000 :off $3c000 :mem $c000
.segment "1f"   :bank $1f :size $2000 :off $3e000 :mem $e000

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
;;;  - we move parts out of higher-value pages into here.
.segment "38"   :bank $38 :size $2000 :off $70000 :mem $8000
.segment "39"   :bank $39 :size $2000 :off $72000 :mem $a000
.segment "3a"   :bank $3a :size $2000 :off $74000 :mem $8000
.segment "3b"   :bank $3b :size $2000 :off $76000 :mem $a000
.segment "3c"   :bank $3c :size $2000 :off $78000 :mem $8000
.segment "3d"   :bank $3d :size $2000 :off $7a000 :mem $a000

;;; Note: we moved these when we expanded the rom.
.segment "fe"   :bank $1e :size $2000 :off $7c000 :mem $c000
.segment "ff"   :bank $1f :size $2000 :off $7e000 :mem $e000

FREE "38" [$8000, $a000)
FREE "39" [$a000, $c000)
FREE "3a" [$8000, $a000)
FREE "3b" [$a000, $c000)
FREE "3c" [$8000, $a000)
FREE "3d" [$a000, $c000)

;;; These are the fixed pages and should not be used!
;; .segment "3e"   :bank $3e :size $2000 :off $7c000 :mem $8000
;; .segment "3f"   :bank $3f :size $2000 :off $7e000 :mem $a000

; Workaround compiler issue that forces values set using `=`
; to use absolute addressing instead of zp by using .define
.define PpuCtrlShadow $00
.define PpuMaskShadow $01

;;; NOTE: These were used by the cleanup.s code to try to fix NMI.
;; .define NmiDisable $06 ; Set to 1 to disable NMI processing
;; .define NmiSkipped $07 ; Set to $06 if NMI was skipped
;; .define OamDisable $09 ; Set to $00 to have OAM run

.define NmtBufReadOffset  $0a
.define NmtBufWriteOffset $0b
.define NmtBufTempValue   $0c

;;; Various global definitions.
.define GameMode   $41
.define BankSelectShadow $50
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
PlayerMaxExp = $706 ; unused
PlayerMP = $708
PlayerMaxMP = $709
EquippedConsumableItem = $715
EquippedPassiveItem    = $716

; Screen values are written in the main game loop, and are copied to the scroll values
; during NMI. So the IRQ will read from the scroll values and the game will write to Screen
.define ScreenXLo   $02
.define ScreenXHi   $03
.define ScreenYLo   $04
.define ScreenYHi   $05

ScrollXLo = $07d8
ScrollXHi = $07d9
ScrollYLo = $07da
ScrollYHi = $07db

WarriorRingStabCounter = $61fb  ; added in rando
PlayerStandingTimer = $61fc     ; added in rando
InvSwords = $6430
InvConsumables = $6440
InvPassive = $6448
InvQuest = $6450
InvMagic = $6458
SlotFlagsStart = $64a0
ItemFlagsStart = $64c0
Difficulty = $648f         ; requires defrag! (flags 078 .. 07f)

; 0000 0eed - Bit pattern for flags
;       ||^-- Redisplay difficulty
;       |^--- Update Enemy HP stats
;       ^---- If 1 draw the data, if 0 clear the field.
ShouldRedisplayUI = $61ff
UPDATE_DIFFICULTY = %000000001
DRAW_ENEMY_STATS  = %000000010

SelectedConsumableIndex = $642c
SelectedQuestItemIndex  = $642e

EnemyHPRamStart     = $6a10
; These are offset by $0d since enemy objects only load from $0d - $1f
ObjectNameId        = $6a10 - $0d ; 18 bytes from $10 - $22 used to look up this object's name.
ObjectMaxHPLo       = $6a22 - $0d ; 18 bytes from $22 - $34
ObjectMaxHPHi       = $6a34 - $0d ; 18 bytes from $34 - $46
CurrentEnemySlot    = $6a46 ; 1 byte. Stores the most recent attacked enemy (or zero if we need to clear)
PreviousEnemySlot   = $6a47 ; 1 byte. Stores the previous attacked slot (to determine if the )
RecentEnemyObjectId = $6a48 ; 1 byte. Used to determine if the name has changed since the previous enemy.
RecentEnemyMaxHP    = $6a49 ; 2 bytes 49-4a
RecentEnemyMaxHPLo  = RecentEnemyMaxHP
RecentEnemyMaxHPHi  = RecentEnemyMaxHP+1
RecentEnemyCurrHP   = $6a4b ; 2 bytes 4b-4c
RecentEnemyCurrHPLo = RecentEnemyCurrHP
RecentEnemyCurrHPHi = RecentEnemyCurrHP+1
EnemyHPRamEnd       = RecentEnemyCurrHP+2
EnemyHPRamLen       = EnemyHPRamEnd - EnemyHPRamStart

; Constants used in DisplayNumberInternal for the NumericDisplays LUT
; These are including the overrides done in the randomizer
DISPLAY_NUMBER_LEVEL1   = $00 ; Level in Status Bar
DISPLAY_NUMBER_MONEY    = $01
DISPLAY_NUMBER_EXP      = $02
DISPLAY_NUMBER_MAXMP    = $03 ; Replaces ExpLeft
DISPLAY_NUMBER_MP       = $04
DISPLAY_NUMBER_ENEMYHP  = $05 ; Replaces MaxMP
DISPLAY_NUMBER_SCALING  = $06 ; Replaces Level (Menu)
DISPLAY_NUMBER_HP       = $07
DISPLAY_NUMBER_MAXHP    = $08
DISPLAY_NUMBER_ATTACK   = $09
DISPLAY_NUMBER_DEF1     = $0a
DISPLAY_NUMBER_BUYCOST  = $0b
DISPLAY_NUMBER_INNCOST  = $0c
DISPLAY_NUMBER_PAWNVAL  = $0d
DISPLAY_NUMBER_LEVEL2   = $0e ; Level in Menu replaces Unused
DISPLAY_NUMBER_ENEMYMAX = $0f ; Replaces Unused
DISPLAY_NUMBER_DEF2     = $10

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

.ifdef _STATS_TRACKING
;;;-------------
; layout of the stats SRAM is as follows

;; The follow stats are NOT checkpointed because they persist between reloads
StatTrackingBase  = $7010

StatTimer   = StatTrackingBase
StatTimerLo = StatTimer
StatTimerMd = StatTimer + 1
StatTimerHi = StatTimer + 2
; number of deaths
StatsDeaths = StatTimer + 3
; number of soft resets
StatsResets = StatsDeaths + 1

;; marks the start of the data that should be checkpointed
;; Anything below will be copied into a duplicate when a checkpoint is made
;; and loaded from the duplicate when the game is reloaded from checkpoint
CheckpointBase    = StatsResets + 1
; number of event timestamps
TimestampCount    = CheckpointBase
; array of each event ordered by when they happen
TimestampTypeList = TimestampCount + 1
TimestampTypeListEnd = TimestampTypeList + TS_COUNT
; Timestamp of each event, this is indexed by the order of events above
TimestampList     = TimestampTypeListEnd + 1
TimestampListEnd  = TimestampList + TS_COUNT * 3
; number of checks made
StatsChecks = TimestampListEnd + 1
; bit mask of each mimic encountered
StatsMimics   = StatsChecks + 1
StatsMimicsLo = StatsMimics
StatsMimicsHi = StatsMimicsLo + 1
CheckpointEnd = StatsMimicsHi + 1

PERMANENT_LENGTH  = CheckpointBase - StatTrackingBase
CHECKPOINT_LENGTH = (CheckpointEnd - CheckpointBase)
CHECKPOINT = CHECKPOINT_LENGTH

; All Timestamp types listed below for reference
; Bosses
; TsVamp1        = $00
; TsInsect       = $01
TsKelbesque1   = $02
TsSabera1      = $04
TsMado1        = $05
TsKelbesque2   = $06
TsSabera2      = $07
TsMado2        = $08
TsKarmine      = $09
TsDraygon1     = $0a
TsDraygon2     = $0b
; TsVampire2     = $0c
; TsDyna         = $0d
; Items
TsFlight       = $03 ; replaces unused Rage slot
TsBowMoon      = $00 ; replaces Vamp1
TsBowSun       = $01 ; replaces Insect
TsBowTruth     = $0c ; replaces Vamp2
TsWindSword    = $0e
TsFireSword    = $0f
TsWaterSword   = $10
TsThunderSword = $11
TsCrystalis    = $12
; Other
TsComplete     = $0d ; replaces DYNA
TS_COUNT       = $13

.endif

;;; Constants
GAME_MODE_STATUS_MSG = $10
ITEM_RABBIT_BOOTS    = $12
ITEM_OPEL_STATUE     = $26
SFX_MONSTER_HIT      = $21
SFX_ATTACK_IMMUNE    = $3a

SpriteRam           = $0200
SpriteRamY          = $0200
SpriteRamPattern    = $0201
SpriteRamAttributes = $0202
SpriteRamX          = $0203

PPUCTRL   = $2000
PPUMASK   = $2001
PPUSTATUS = $2002
OAMADDR   = $2003
OAMDATA   = $2004
PPUSCROLL = $2005
PPUADDR   = $2006
PPUDATA   = $2007

VromPalettes = $3f00

OAMDMA    = $4014

BANKSELECT = $8000
BANKDATA   = $8001
IRQLATCH   = $c000
IRQRELOAD  = $c001
IRQDISABLE = $e000
IRQENABLE  = $e001

;;; see http://www.6502.org/tutorials/6502opcodes.html#BIT
;;; note: this is dangerous if it would result in a register read
.define SKIP_TWO_BYTES .byte $2c

.segment "10"       ; 20000
AfterLoadGame       = $9c7a

.segment "fe"              ; 3c000
FlushNametableDataWrite         = $c676
MainLoop_01_Game           = $cab6
DialogAction_11            = $d21d
MainLoopItemGet            = $d3ff

.segment "ff"                 ; 3e000
RestoreBanksAndReturn         = $e756

;;; Various free sections

;;; another 256 free in map space
FREE "0b" [$bf00, $c000)        ; 17f00 .. 18000
;;; ~80 bytes free in middle of SFX data that could be used on npc data page?
FREE "0c" [$83fc, $844d)        ; 183fc .. 1844d
;;; empty space at end of npcdata
FREE "0d" [$aba3, $ac00)        ; 1aba3 .. 1ac00
;;; empty space at end of objectdata (but mapdata 0 is still after in segment)
FREE "0d" [$be91, $bff0)        ; 1aba3 .. 1ac00

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

;;; DMC changes, remove unused DMC configurations.
FREE "18" [$8be0, $8c0c)

FREE "1b" [$a086, $a0a3)


FREE "fe" [$c446, $c482)
;;; Random uncovered 6 bytes between dialog actions
FREE "fe" [$d196, $d19c)
;;; Recovered from item/trigger jump 08 (get paralysis)
FREE "fe" [$d654, $d659)
;;; Recovered from other item/trigger jumps (06/11, 0b, 0c, 0d, 0e, 0f,
FREE "fe" [$d6d5, $d746)

FREE "ff" [$f9ba, $fa00) ; first byte of DMC sample actually matters
FREE "ff" [$fa01, $fe00) ; rts at 3fe00 is important
FREE "ff" [$fe01, $fe16)
FREE "ff" [$fe18, $fe78) ;; NOTE: 3fe2e might be safer than 3fe18
FREE "ff" [$ff44, $ff80)
FREE "ff" [$ffe3, $fffa)

;;; Patch the DMC Sample to start with FF to eliminate the buzz
.segment "ff"
.org $fa00
  .byte $ff

;;; Explicitly declare some addresses we're writing directly.
;;; NOTE: Many of these could be made .reloc and then just export
;;; the address?

;;; Map screens
.macro RESERVE_MAPS
  .repeat 64, I
  .org ($8000+(I<<8))
    .res $f0
  .endrep
.endmacro

.segment "00","01"
RESERVE_MAPS
.segment "02","03"
RESERVE_MAPS
.segment "04","05"
RESERVE_MAPS
.segment "06","07"
RESERVE_MAPS
.undefine RESERVE_MAPS

;;; NPC data
.segment "04","05"
.repeat 64, I
.org ($8000 + (I<<8) + $f0)
  .res 16
.endrep

;;; Tileset
.segment "08","09"
.org $8000
  .res $2000
.org $a000
  .res $2000

;;; MapData index table (and shop screens)
.segment "0a"
.org $8000 
  .res $300 ; Shop screens
.org $8300
  .res $200 ; MapData

;;; Spawn tables
.segment "0c"
.org $9201
  .res $200

;;; Object data table index
.segment "0d"
.org $ac00
  .res $200

.segment "0e"

;;; ItemUseJump (this is a mess because we free chunks of it)
.org $83d3
  .res ($83eb - *)
.org $83fb
  .res ($841b - *)

;;; NPC spawn conditions
.org $85e0
  .res $112 ; NOTE: gap between 86f2..86fc repurposed
.org $86fc
  .res 2    ; Mesia
.org $8760
  .res 26   ; Boss spawns
.org $895d
  .res ($8ae5 - *)  ; Dialog

;;; Telepathy
.org $8213
  .res 7            ; Required level
.org $822f
  .res $40          ; Result table (i.e. the RNG)
.org $98f4
  .res $100         ; Location table
  .res ($9b00 - *)  ; Main table

;;; Item tables
.org $9b00
  .res ($9be2 - *)  ; Item Get indirection
  .res ($9c82 - *)  ; Item Use indirection
  ;; NOTE: [9c82 .. 9daf] is freed above (made more efficient in asm)
.org $9daf
  .res ($9de6 - *)  ; get-to-item table
  ;; NOTE: [9de6 .. a106] is freed in item.ts

;;; Triggers (main table)
.segment "0f"
.org $a17a
  .res $100

;;; Boss kills
.segment "0f"
.org $b7c1
  .res 14 * 5 ; graphics restore table
.org $b95d
  .res 14 ; location indexes for 14 bosses
.org $b96b
  .res 28 ; pointers for 14 bosses (actual data is reloc)

;;; Inventory item data
.segment "10"
.org $8ff0
  .res $4b ; bitmap data about droppability, palette, etc
  .res $4b ; equipped item id
  .res $4a * 2 ; menu name addresses

;;; Ad hoc spawn table
.segment "14"
.org $9c00
  .res $60 * 4

;;; Checkpoint locations table
.segment "17"
.org $bf00
  .res $100

;;; Attack/defese/misc data
.segment "1a"
.org $8bc0
  .res 9 ; armor defense
.org $8bc9
  .res 9 ; shield defense
.org $9691
  .res 24 * 4 ; hitboxes
.org $97e4
  .res 64 ; RNG table

;;; Metasprite rendering code + data
.segment "1c","1d"
.org $845c ; MetaspriteTable
  .res $100
.org $855c
  .res $100 ; MetaspriteTablePart2
; .org $865c
;   .res ($a000 - *) ; All of the actual metasprite data
; .org $a000
;   .res $1500
FREE_UNTIL $c000

;;; New extended map screens
.segment "20","21"
.org $8000
  .res $2000
.org $a000
  .res $2000
.segment "22","23"
.org $8000
  .res $2000
.org $a000
  .res $2000
.segment "24","25"
.org $8000
  .res $2000
.org $a000
  .res $2000
.segment "26","27"
.org $8000
  .res $2000
.org $a000
  .res $2000
.segment "28","29"
.org $8000
  .res $2000
.org $a000
  .res $2000
.segment "2a","2b"
.org $8000
  .res $2000
.org $a000
  .res $2000
.segment "2c","2d"
.org $8000
  .res $2000
.org $a000
  .res $2000
.segment "2e","2f"
.org $8000
  .res $2000
.org $a000
  .res $2000

;;; Enemy names index table (for HUD)
.segment "3d"
.org $a000
  .res $200

.segment "fe"
;;; Wild warp table
.org $cbec
  .res 16
;;; Town warp table
.org $dc58
  .res 12


;;; Rewrite the page boundary to avoid code crossing it.
;;; This is equivalent to the original, but 6 bytes shorter
;;; and doesn't cross the boundary (TODO - why did we care
;;; about that??? maybe it was something about a limitation
;;; in how the assembler handles cross-segment chunks?)
.segment "12", "13"
.org $9fef
  ;; Need to fit this in 17 bytes
  sta $09     ; 85 09
  ldy #$03    ; a0 04
- sta $06f0,y ; 99 f0 06
  sta $0002,y ; 99 02 00
  dey         ; 88
  bpl -       ; 10 f7
  jmp $a005   ; 4c 05 a0
FREE_UNTIL $a000
.org $a000
FREE_UNTIL $a005

