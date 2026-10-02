var VANILLA_LABELS=`NesInternalRam:0:PpuCtrlShadow:
NesInternalRam:1:PpuMaskShadow:
NesInternalRam:2:ScreenXLo:
NesInternalRam:3:ScreenXHi:
NesInternalRam:4:ScreenYLo:
NesInternalRam:5:ScreenYHi:
NesInternalRam:8:GlobalCounter:
NesInternalRam:a:NametableBufferReadOffset:
NesInternalRam:b:NametableBufferWriteOffset:
NesInternalRam:c:NametableBufferTempValue:seems to be unused?
NesInternalRam:d:NametableBufferBytesWritten:
NesInternalRam:40:MainLoopMode:
NesInternalRam:41:GameMode:
NesInternalRam:43:Ctrl1CurrentlyPressed:
NesInternalRam:44:Ctrl2CurrentlyPressed:in menus only
NesInternalRam:45:Ctrl1MenuRepeatTimer:in menus only
NesInternalRam:46:Ctrl2MenuRepeatTimer:in normal mode
NesInternalRam:47:Ctrl1FrameCountB:in normal mode
NesInternalRam:48:Ctrl2FrameCountB:in normal mode
NesInternalRam:49:Ctrl1CurrentDirection:in normal mode
NesInternalRam:4a:Ctrl2CurrentDirection:
NesInternalRam:4b:Ctrl1NewlyPressed:
NesInternalRam:4c:Ctrl2NewlyPressed:in normal mode, may add A or B repeats
NesInternalRam:4d:Ctrl1NewlyPressedAB:in normal mode, may add A or B repeats
NesInternalRam:4e:Ctrl2NewlyPressedAB:
NesInternalRam:51:ScreenMode:
NesInternalRam:6c:CurrentLocation:
NesInternalRam:6d:CurrentEntrance:
NesInternalRam:6e:PrgPageShadowLo:
NesInternalRam:6f:PrgPageShadowHi:
NesInternalRam:70:PlayerXLo:
NesInternalRam:90:PlayerXHi:
NesInternalRam:b0:PlayerYLo:
NesInternalRam:d0:PlayerYHi:
NesInternalRam:11a:ChannelDataPtrLo:
NesInternalRam:120:ChannelDataPtrHi:
NesInternalRam:200:SpriteRam:
NesInternalRam:201:SpriteRamPattern:
NesInternalRam:202:SpriteRamAttributes:
NesInternalRam:203:SpriteRamX:
NesInternalRam:300:ObjectMetasprite:;; if this is $80 when object dies, then next object dies too.
NesInternalRam:320:ObjectDeathChain:upper bit(s)
NesInternalRam:340:ObjectKnockback:lower nibble
NesInternalRam:360:ObjectDirection:sign bit minus if off-screen
NesInternalRam:380:ObjectOnScreen:
NesInternalRam:3a0:ObjectHitbox:
NesInternalRam:3c0:ObjectHP:
NesInternalRam:3e0:ObjectAttack:
NesInternalRam:400:ObjectDefense:also 40 selects ext hitboxes
NesInternalRam:420:ObjectLevel:
NesInternalRam:440:ObjectChildSpawn:
NesInternalRam:460:ObjectTerrainSusceptibility:
NesInternalRam:480:ObjectTimer:also includes presence in 80
NesInternalRam:4a0:ObjectActionScript:???
NesInternalRam:4c0:ObjectReplacement:also used as a "step counter"
NesInternalRam:4e0:ObjectAnimationCounter:hi nibble
NesInternalRam:500:ObjectGoldDropBucket:lo nibble
NesInternalRam:520:ObjectExperiencePoints:
NesInternalRam:540:ObjectDamageType:
NesInternalRam:560:ObjectProjectileStatus:;; 560 ? other effects?
NesInternalRam:5a0:ObjectDelay:
NesInternalRam:5c0:ObjectSpriteX:
NesInternalRam:5e0:ObjectSpriteY:
NesInternalRam:600:ObjectBossMode:NPC movement speed
NesInternalRam:620:ObjectMovementScriptPos:
NesInternalRam:640:ObjectShooterShooting:
NesInternalRam:680:ObjectMovementScript:ID of persondata
NesInternalRam:6c0:ObjectDirMetaspriteBase:2 bytes
NesInternalRam:6e0:ObjectShootMetaspriteBase:
NesInternalRam:623:LookingAt:
NesInternalRam:301:PlayerMetaspriteBase:
NesInternalRam:3c1:PlayerHP:
NesInternalRam:3e1:PlayerAttack:
NesInternalRam:401:PlayerArmorDef:
NesInternalRam:421:PlayerLevel:
NesInternalRam:702:PlayerMoney:2 bytes
NesInternalRam:704:PlayerExp:2 bytes
NesInternalRam:706:PlayerExpToNextLevel:
NesInternalRam:708:PlayerMP:
NesInternalRam:709:PlayerMaxMP:
NesInternalRam:710:PlayerStatus:
NesInternalRam:7dd:CurrentlyInPawnShop:
NesSaveRam:e0:Inventory_ScratchSortRow:
NesSaveRam:424:InventoryMenu_CurrentPage:# columns per row this page
NesSaveRam:426:InventoryMenu_RowSize:Offset from page
NesSaveRam:427:InventoryMenu_CurrentItem:
NesSaveRam:428:InventoryMenu_SelectedSword:
NesSaveRam:429:InventoryMenu_SelectedArmor:
NesSaveRam:42a:InventoryMenu_SelectedShield:
NesSaveRam:42b:InventoryMenu_SelectedBracelet:
NesSaveRam:42c:InventoryMenu_SelectedConsumableItem:
NesSaveRam:42d:InventoryMenu_SelectedPassiveItem:
NesSaveRam:42e:InventoryMenu_SelectedQuestItem:
NesSaveRam:42f:InventoryMenu_SelectedMagic:
NesSaveRam:430:Inventory:
NesSaveRam:434:Inventory_Armors:
NesSaveRam:438:Inventory_Shields:
NesSaveRam:43c:Inventory_Bracelets:
NesSaveRam:440:Inventory_ConsumableItems:
NesSaveRam:448:Inventory_PassiveItems:
NesSaveRam:450:Inventory_QuestItems:
NesSaveRam:458:Inventory_Magics:
NesSaveRam:2f0:CurrentLocationFlags:
NesSaveRam:46c:ShopMenu_CurrentItemId:
NesSaveRam:46d:ShopMenu_CurrentShopIndex:
NesSaveRam:470:ShopMenu_AllItemIds:
NesSaveRam:474:ShopMenu_CurrentItemPrice:
NesSaveRam:478:ShopMenu_AllPrices:
NesMemory:3f00:VromPalettes:
NesMemory:2000:PPUCTRL:
NesMemory:2001:PPUMASK:
NesMemory:2002:PPUSTATUS:
NesMemory:2003:OAMADDR:
NesMemory:2004:OAMDATA:
NesMemory:2005:PPUSCROLL:
NesMemory:2006:PPUADDR:
NesMemory:2007:PPUDATA:
NesMemory:4014:OAMDMA:
NesMemory:4000:PULSE1_DUTY:
NesMemory:4001:PULSE1_SWEEP:
NesMemory:4002:PULSE1_TIMER_LO:
NesMemory:4003:PULSE1_TIMER_HI:
NesMemory:4004:PULSE2_DUTY:
NesMemory:4005:PULSE2_SWEEP:
NesMemory:4006:PULSE2_TIMER_LO:
NesMemory:4007:PULSE2_TIMER_HI:
NesMemory:4008:TRIANGLE_CTL:
NesMemory:400a:TRIANGLE_TIMER_LO:
NesMemory:400b:TRIANGLE_TIMER_HI:
NesMemory:400c:NOISE_VOLUME:
NesMemory:400e:NOISE_PERIOD:
NesMemory:400f:NOISE_LOAD:
NesMemory:4010:DMC_ENABLE:
NesMemory:4011:DMC_LOAD_COUNTER:
NesMemory:4012:DMC_SAMPLE_ADDR:
NesMemory:4013:DMC_SAMPLE_LENGTH:
NesMemory:4015:APU_STATUS:
NesMemory:4017:APU_FRAME_COUNTER:
NesPrgRom:8000:BANKSELECT:
NesPrgRom:8001:BANKDATA:
NesPrgRom:c000:IRQLATCH:
NesPrgRom:c001:IRQRELOAD:
NesPrgRom:e000:IRQDISABLE:
NesPrgRom:e001:IRQENABLE:
NesInternalRam:711:EquippedSword:;; 0 for no magic, 1 for refresh, etc - see MAGIC_* constants.
NesInternalRam:712:EquippedMagic:;; 0 for no armor, 1 = leather ($15), ..., 8 = psycho ($1c)
NesInternalRam:713:EquippedArmor:;; 0 for no shield, 1 = carapace ($d), ..., 8 = psycho ($14)
NesInternalRam:714:EquippedShield:;; 0 for no item, otherwise per ITEM_* constant; includes quest items.
NesInternalRam:715:EquippedConsumableItem:;; 0 for no item, otherwise per ITEM_* constant.
NesInternalRam:716:EquippedPassiveItem:;; 0 for no ball, 1-4 for ball of wind-thunder, 5-8 for bracelet.
NesInternalRam:718:EquippedBracelet:;; 0 for no ball, 1 for ball, 2 for bracelet; takes into account
NesInternalRam:719:MaxChargeLevel:
NesPrgRom:1c011:p_0:; ----\\n$1ca5d
NesPrgRom:1c019:p_1:; At this point, $24$25 now points to this character's dialog script
NesPrgRom:1c01d:m_2:
NesPrgRom:1c025:p_3:; ----
NesPrgRom:1c02c:m_4:; Once we find a negative first byte, look instead for a location match.
NesPrgRom:1c03b:p_5:; ----\\n; At this point we've found a matching location.\\n; In this case, set the second byte to $6580,x where x<-$23 is the person ID,\\n; then continue looped above.
NesPrgRom:1c046:p_6:; ----\\n; Done handling locations.  Read the result out of $6580,x which may or may not\\n; have been mutated based on the location (i.e. older values persist).\\n; Start by advancing $24$25 by Y so that we can index by Y <- $6580,x.\\n; For NPCs that don't have a location table, their 6580,x is just always zero.\\n; It seems like we could vastly simplify this, since we can probabbly just\\n; store this in a single temporary byte in RAM - the result seems like it's\\n; never actually used...?
NesPrgRom:1c057:m_7:$1c071
NesPrgRom:1c071:p_8:; ----
NesPrgRom:1c097:m_9:; If 40 was set on the first byte then skip until 40 is set again...
NesPrgRom:1c0b6:p_10:; ----\\n$1c6e0
NesPrgRom:1c0be:p_11:
NesPrgRom:1c0c0:NpcSpawnConditionLoop:; Now ($24,y) points to the start of a condition.
NesPrgRom:1c0cb:m_13:$1c0d3
NesPrgRom:1c0d3:p_14:$1c0cb
NesPrgRom:1c0ea:p_15:condition not yet met
NesPrgRom:1c0fb:m_16:do the action
NesPrgRom:1c124:p_17:; ----\\n; CLEAR
NesPrgRom:1c12e:p_18:; ----\\n; Maybe loop
NesPrgRom:1c145:p_19:
NesPrgRom:1c18b:p_20:0 = MP,
NesPrgRom:1c1a4:p_21:
NesPrgRom:1c1a7:p_22:
NesPrgRom:1c1af:p_23:$1c1b8
NesPrgRom:1c1b8:p_24:; ----\\n; NOTE - used by telepathy for most results (except 0,1)
NesPrgRom:1c1d1:p_25:; ----\\ntelepathy area 0..6
NesPrgRom:1c1e5:m_26:$1c200
NesPrgRom:1c1f6:p_27:
NesPrgRom:1c200:p_28:; ----\\n; Flag matched
NesPrgRom:1c20a:p_29:$1c1e5
NesPrgRom:1c26f:ItemGet:
NesPrgRom:1c28f:p_31:; Read [2] and [3] from $24$25.  [2] is a bitset address -> $21$22.  [3] is zero -> $20
NesPrgRom:1c2f4:ItemGet_Bracelet:; ----
NesPrgRom:1c307:p_33:; ----
NesPrgRom:1c308:ItemGet_FindOpenSlot:; Inputs\\n; $29 - the item id we're trying to gain\\n; x - slot to start checking\\n; y - number of slots to try\\n; Outputs\\n; $23 <- 0 if successful
NesPrgRom:1c314:p_35:; ----\\n; Found an empty slot - store the item, zero out $23
NesPrgRom:1c351:jmp_36:;; --------------------------------
NesPrgRom:1c36b:m_37:
NesPrgRom:1c384:p_38:
NesPrgRom:1c475:m_39:$1c489
NesPrgRom:1c489:p_40:; ----
NesPrgRom:1c4af:p_41:uncond
NesPrgRom:1c4e6:p_42:; ----
NesPrgRom:1c4f2:p_43:$1c4fa
NesPrgRom:1c4fa:p_44:
NesPrgRom:1c511:p_45:$1c519
NesPrgRom:1c519:p_46:
NesPrgRom:1c579:p_47:; ----
NesPrgRom:1c57c:p_48:$1c584
NesPrgRom:1c587:m_49:
NesPrgRom:1c594:p_50:; ----
NesPrgRom:1c5a4:p_51:; ----
NesPrgRom:1c5ac:p_52:; ----
NesPrgRom:1c5b4:p_53:; ----
NesPrgRom:1c5bc:p_54:;; --------------------------------
NesPrgRom:1c5d2:m_55:$1c5da
NesPrgRom:1c5da:p_56:$1c5d2 try the next condition (never fires)
NesPrgRom:1e486:p_57:Vampire boss pattern base
NesPrgRom:1e524:p_58:; Either 660 hit 0c or else 4e0 (anim counter) hit 80\\n; So increment mode to 5 and pick a random location to appear.
NesPrgRom:1e592:p_59:player
NesPrgRom:1e5ad:m_60:spawn in different directions
NesPrgRom:1e5cd:p_61:
NesPrgRom:1e5d9:m_62:Vampire smoke
NesPrgRom:1e62d:p_63:
NesPrgRom:1e62f:p_64:
NesPrgRom:1e64a:p_65:
NesPrgRom:1e64c:p_66:
NesPrgRom:1e658:p_67:
NesPrgRom:1e66d:p_68:; ----
NesPrgRom:1e66e:p_69:$1e674
NesPrgRom:1e674:p_70:;; --------------------------------
NesPrgRom:1e68f:p_71:; ----
NesPrgRom:1e6fd:m_72:
NesPrgRom:1e70a:m_73:
NesPrgRom:1e73e:m_74:
NesPrgRom:1e76a:1e76a_75:; ----
NesPrgRom:1e773:p_76:
NesPrgRom:1e868:p_77:; ----
NesPrgRom:1e8aa:p_78:
NesPrgRom:1e8b8:p_79:
NesPrgRom:1e8bc:p_80:
NesPrgRom:1e8c6:p_81:$1e8cc
NesPrgRom:1e8cc:p_82:$1e8d2
NesPrgRom:1e8d2:p_83:
NesPrgRom:1e912:m_84:
NesPrgRom:1e967:p_85:
NesPrgRom:1e9b4:p_86:
NesPrgRom:1e9fa:p_87:; ----
NesPrgRom:1ea19:p_88:; ----
NesPrgRom:1ea5a:p_89:; ----
NesPrgRom:1ea84:p_90:
NesPrgRom:1eab2:p_91:; ----
NesPrgRom:1eacb:p_92:
NesPrgRom:1eaf8:p_93:; ----
NesPrgRom:1eb1c:p_94:
NesPrgRom:1eb95:p_95:;; --------------------------------
NesPrgRom:1ebad:p_96:; ----\\n; Actually not a rock, this must be K2 so it's the laser?\\n;  - Start by decrementing Y by 1 pixel (?)\\n;  - Reset the step counter to #$80 and the action script to #$10\\n;  - 16-dir vector to player, add 0,1,-1 randomly and store in $360
NesPrgRom:1ec85:p_97:
NesPrgRom:1ed08:p_98:$1ed10
NesPrgRom:1ed10:p_99:; ----
NesPrgRom:1ed5e:p_100:; Set the speed based on the HP.
NesPrgRom:1ed70:p_101:
NesPrgRom:1edaf:p_102:
NesPrgRom:1edbd:p_103:; ----
NesPrgRom:1edde:p_104:
NesPrgRom:1ee82:p_105:TODO - what is this?
NesPrgRom:1ee9e:p_106:
NesPrgRom:1eefe:p_107:$1ef27
NesPrgRom:1ef22:p_108:; ----
NesPrgRom:1ef52:p_109:
NesPrgRom:1efdc:p_110:$1efec
NesPrgRom:1efec:p_111:
NesPrgRom:1f022:p_112:
NesPrgRom:1f077:1f077_113:; ----
NesPrgRom:1f08a:p_114:; ----
NesPrgRom:1f0c0:p_115:
NesPrgRom:1f140:p_116:$1f14a
NesPrgRom:1f14a:p_117:
NesPrgRom:1f195:p_118:
NesPrgRom:1f1ad:p_119:; ----
NesPrgRom:1f1d5:p_120:
NesPrgRom:1f1e3:p_121:
NesPrgRom:1f1e6:p_122:
NesPrgRom:1f1fb:p_123:
NesPrgRom:1f21f:p_124:; ----
NesPrgRom:1f252:p_125:
NesPrgRom:1f267:p_126:
NesPrgRom:1f26b:p_127:; ----
NesPrgRom:1f290:p_128:; ----
NesPrgRom:1f2ad:m_129:
NesPrgRom:1f2f3:p_130:
NesPrgRom:1f2fa:m_131:
NesPrgRom:1f34a:m_132:
NesPrgRom:1f359:m_133:
NesPrgRom:1f375:m_134:
NesPrgRom:1f3ec:p_135:; ----
NesPrgRom:1f3f7:p_136:; ----
NesPrgRom:1f40a:p_137:$1f410
NesPrgRom:1f410:p_138:;
NesPrgRom:1f42f:p_139:
NesPrgRom:1f484:p_140:
NesPrgRom:1f4bb:Directions_141:; ----\\n;    ESE ESE SE  SSE S   SSW SW  WSW WSW
NesPrgRom:1f4c4:Speeds_142:
NesPrgRom:1f4d8:p_143:
NesPrgRom:1f4eb:p_144:
NesPrgRom:1f4f7:p_145:; ----
NesPrgRom:1f51c:Directions_146:; 16-dirs for D2
NesPrgRom:1f532:p_147:
NesPrgRom:1f53e:p_148:; ----
NesPrgRom:1f55c:p_149:
NesPrgRom:1f572:p_150:; ----
NesPrgRom:1f586:p_151:;; --------------------------------
NesPrgRom:1f594:p_152:$1f5b0
NesPrgRom:1f5a3:p_153:
NesPrgRom:1f5b0:p_154:; ----\\n; This happens if $620,x is nonzero\\nlaser, will be spawned later
NesPrgRom:1f61a:m_155:
NesPrgRom:1f665:p_156:
NesPrgRom:1f687:p_157:; ----
NesPrgRom:1f6b1:p_158:; ----
NesPrgRom:1f6b7:p_159:1f50c
NesPrgRom:1f6c0:p_160:; smudge from $1f50c (NOTE pulled from earlier for locality)
NesPrgRom:1f50c:Directions_161:;    00 1f 2e 3d 4c 5b 6a 79 88 97 a6 b5 c4 d3 e2 f1
NesPrgRom:1f6e3:m_162:
NesPrgRom:1f6f5:p_163:$1f6e3
NesPrgRom:1f736:p_164:$1f73e
NesPrgRom:1f73e:p_165:; ----\\n; Look for an object with action script OTHER THAN\\n; $78 (treasure chest or trigger square), $70 (some\\n; bosses/projectiles), $7f (insect, ??), $30 (person),\\n; or $39 (??).  If we find one then bail out (_1f7bb),\\n; resetting $7d7 (screen lock).
NesPrgRom:1f740:m_166:
NesPrgRom:1f761:p_167:
NesPrgRom:1f77b:p_168:
NesPrgRom:1f7b8:p_169:
NesPrgRom:1f81a:m_170:
NesPrgRom:1f824:p_171:
NesPrgRom:1f84e:p_172:
NesPrgRom:1f868:m_173:$1f86f
NesPrgRom:1f86f:p_174:
NesPrgRom:1f878:m_175:$1f87f
NesPrgRom:1f87f:p_176:
NesPrgRom:1f890:m_177:
NesPrgRom:1f8c7:p_178:
NesPrgRom:1f8cc:p_179:;; --------------------------------
NesPrgRom:1f8d4:m_180:
NesPrgRom:1f8e5:m_181:
NesPrgRom:1f903:m_182:
NesPrgRom:1f912:m_183:
NesPrgRom:1fb2b:m_184:
NesPrgRom:1fb49:p_185:
NesPrgRom:1fb52:m_186:
NesPrgRom:1fc5e:m_187:
NesPrgRom:1fc66:m_188:
NesPrgRom:1fc83:m_189:
NesPrgRom:1fcb9:m_190:
NesPrgRom:1fcf0:m_191:
NesPrgRom:1fd03:m_192:
NesPrgRom:1fd19:m_193:
NesPrgRom:1fd51:m_194:
NesPrgRom:1fd5b:m_195:
NesPrgRom:1fdf1:m_196:
NesPrgRom:1fe1d:m_197:
NesPrgRom:1fe9e:p_198:
NesPrgRom:1fea7:m_199:
NesPrgRom:1fed1:p_200:
NesPrgRom:1fee4:p_201:
NesPrgRom:1fef0:p_202:
NesPrgRom:1ff03:m_203:
NesPrgRom:1ff0e:p_204:
NesPrgRom:1ff10:m_205:
NesPrgRom:1ff4c:p_206:; ----
NesPrgRom:1ff54:m_207:$1ff5f
NesPrgRom:1ff5f:p_208:$1ff54
NesPrgRom:1ff70:p_209:; ----\\n; No direcrtion pressed on ctrl2 (if jumped from above)
NesPrgRom:2000d:m_210:; Copy the first 16 bytes from the table to $20-$2F
NesPrgRom:20080:p_211:
NesPrgRom:20092:p_212:$200a1
NesPrgRom:20098:m_213:
NesPrgRom:200a1:p_214:$200a9
NesPrgRom:200a9:p_215:
NesPrgRom:200ef:p_216:
NesPrgRom:200f4:p_217:; ----
NesPrgRom:200f7:p_218:; ----
NesPrgRom:20111:p_219:
NesPrgRom:20116:p_220:; ----
NesPrgRom:20119:p_221:; ----
NesPrgRom:20127:p_222:; ----
NesPrgRom:2012a:p_223:; ----
NesPrgRom:2013d:p_224:; ----
NesPrgRom:20140:p_225:; ----
NesPrgRom:20149:p_226:; ----
NesPrgRom:2015c:_2015c:; ----
NesPrgRom:20165:p_228:
NesPrgRom:2016e:p_229:;; --------------------------------
NesPrgRom:2018b:p_230:; ----
NesPrgRom:20193:p_231:
NesPrgRom:201b4:p_232:; ----\\n; Compute the pawn shop sell price\\n(spaces)
NesPrgRom:201d8:p_233:"$" in two diff spots
NesPrgRom:201e4:p_234:; ----\\n(spaces)
NesPrgRom:201fa:p_235:;; --------------------------------
NesPrgRom:20225:m_236:
NesPrgRom:20253:p_237:; ----\\n???
NesPrgRom:20278:m_238:x = 0..3
NesPrgRom:2028d:p_239:
NesPrgRom:202ae:p_240:
NesPrgRom:202bf:p_241:; ----
NesPrgRom:202d0:p_242:$202d7
NesPrgRom:202d7:p_243:
NesPrgRom:20304:p_244:; ----
NesPrgRom:20326:p_245:; ----\\n"now using (item)"
NesPrgRom:2032b:p_246:
NesPrgRom:2036a:p_247:; ----
NesPrgRom:2038d:p_248:; ----\\n"I won't buy that"
NesPrgRom:20392:p_249:; ----
NesPrgRom:203ae:p_250:; ----\\n"Sell (item)?"
NesPrgRom:203b8:p_251:
NesPrgRom:203e2:p_252:
NesPrgRom:20423:p_253:(spaces)
NesPrgRom:20432:p_254:
NesPrgRom:2046c:p_255:; ----\\n(spaces)
NesPrgRom:20491:m_256:
NesPrgRom:2049e:p_257:; ----
NesPrgRom:204b0:p_258:(item name)
NesPrgRom:204c0:p_259:"$" in diff spots
NesPrgRom:204e0:p_260:1=No
NesPrgRom:204e6:m_261:; Main loop
NesPrgRom:204fc:p_262:A or B
NesPrgRom:20538:m_263:; sort the row number in ($2e), loop until all following rows sorted
NesPrgRom:20545:m_264:$60e0,y
NesPrgRom:20551:BubbleSortRow_265:
NesPrgRom:2055b:m_266:
NesPrgRom:20578:BubbleSortRow_CheckFinished_267:; ----
NesPrgRom:20589:m_268:
NesPrgRom:205b5:p_269:; ----
NesPrgRom:205be:p_270:
NesPrgRom:205c6:m_271:
NesPrgRom:205d6:p_272:
NesPrgRom:205e2:p_273:
NesPrgRom:205ed:p_274:
NesPrgRom:205fd:p_275:
NesPrgRom:2060c:m_276:
NesPrgRom:20616:m_277:
NesPrgRom:20626:m_278:
NesPrgRom:20653:p_279:
NesPrgRom:20668:p_280:; ----
NesPrgRom:2068f:p_281:; ----
NesPrgRom:206b6:p_282:
NesPrgRom:206ef:m_283:
NesPrgRom:20724:m_284:
NesPrgRom:20730:m_285:
NesPrgRom:20732:m_286:
NesPrgRom:2074a:m_287:
NesPrgRom:2074d:m_288:
NesPrgRom:2075c:p_289:; ----
NesPrgRom:20762:p_290:
NesPrgRom:2076f:p_291:; ----
NesPrgRom:20833:m_292:
NesPrgRom:20848:m_293:
NesPrgRom:2086d:m_294:; This first pattern ($fe) appears to denote what function drew this row\\n; Since this isn't viewable due to overscan, maybe it was used for debugging?\\n; Other functions will write different values here
NesPrgRom:2087f:m_295:
NesPrgRom:208de:m_296:
NesPrgRom:208fb:p_297:; ----
NesPrgRom:2090a:m_298:
NesPrgRom:2095f:m_299:
NesPrgRom:2096a:p_300:$20974
NesPrgRom:20974:p_301:$2097e
NesPrgRom:2097e:p_302:$20988
NesPrgRom:20988:p_303:$2095f
NesPrgRom:209a8:m_304:; Copy 6 bytes from the file to the nametable
NesPrgRom:209c6:p_305:
NesPrgRom:209c9:p_306:
NesPrgRom:20a18:p_307:
NesPrgRom:20a26:m_308:
NesPrgRom:20a34:p_309:; ----
NesPrgRom:20a61:p_310:
NesPrgRom:20a8b:m_311:
NesPrgRom:20ada:p_312:;; --------------------------------
NesPrgRom:215f0:p_313:; ----
NesPrgRom:2164e:p_314:; ----\\n(spaces)
NesPrgRom:21665:p_315:; ----\\n(spaces)
NesPrgRom:216be:p_316:; ----
NesPrgRom:216d9:p_317:; ----\\n; "Wish to buy?" -> Yes
NesPrgRom:21719:p_318:; ----
NesPrgRom:2172d:p_319:; ----\\n; Hitting select in a shop makes you leave immediately
NesPrgRom:21734:p_320:; ----
NesPrgRom:2174c:p_321:; ----
NesPrgRom:21755:p_322:; ----\\n; On A, try to buy the item
NesPrgRom:21769:p_323:; ----
NesPrgRom:2177e:p_324:$21792
NesPrgRom:21792:p_325:; ----\\n(spaces)
NesPrgRom:21843:p_326:; ----
NesPrgRom:21895:m_327:ArmorIdTable
NesPrgRom:218aa:m_328:ArmorPriceTable
NesPrgRom:218ba:m_329:
NesPrgRom:218d1:p_330:; ----
NesPrgRom:218d7:p_331:
NesPrgRom:218ee:m_332:y = 0..3
NesPrgRom:21903:m_333:y = 0..7
NesPrgRom:21929:m_334:
NesPrgRom:2193e:m_335:
NesPrgRom:21958:m_336:$21965
NesPrgRom:21965:p_337:; ----
NesPrgRom:2196c:p_338:; ----
NesPrgRom:21988:p_339:; ----
NesPrgRom:2199b:m_340:
NesPrgRom:219aa:p_341:; ----
NesPrgRom:219b0:m_342:
NesPrgRom:219bf:p_343:; ----
NesPrgRom:219c9:p_344:; ----
NesPrgRom:219cf:m_345:
NesPrgRom:21a01:m_346:
NesPrgRom:21a0f:p_347:;; --------------------------------
NesPrgRom:21a1d:m_348:
NesPrgRom:21a54:p_349:; ----\\n; Slot is empty zero out $6474
NesPrgRom:21a66:m_350:
NesPrgRom:21a80:p_351:; ----
NesPrgRom:21a83:p_352:
NesPrgRom:21a95:m_353:
NesPrgRom:21aaf:p_354:
NesPrgRom:21acd:p_355:
NesPrgRom:21acf:m_356:
NesPrgRom:21adc:p_357:
NesPrgRom:21b14:m_358:
NesPrgRom:21b3a:_21b3a:
NesPrgRom:21b4e:p_360:; ----
NesPrgRom:21b63:p_361:; ----
NesPrgRom:21b73:p_362:
NesPrgRom:21b86:p_363:; ----
NesPrgRom:21b94:p_364:; ----
NesPrgRom:21bd1:p_365:; ----
NesPrgRom:21bfd:m_366:Maybe wait for OAM DMA?
NesPrgRom:21bff:m_367:$21bff
NesPrgRom:21c12:p_368:; ----
NesPrgRom:21c2b:p_369:; ----\\n"Save this game?"
NesPrgRom:21c64:p_370:;; --------------------------------
NesPrgRom:21c82:p_371:;; --------------------------------
NesPrgRom:21ce3:m_372:Save values in $10-$15
NesPrgRom:21cf3:m_373:
NesPrgRom:21d09:m_374:
NesPrgRom:21d13:p_375:$21d19
NesPrgRom:21d19:p_376:$21d09
NesPrgRom:21d27:m_377:
NesPrgRom:21d83:m_378:
NesPrgRom:22065:p_379:; ----
NesPrgRom:22078:p_380:; ----
NesPrgRom:22097:p_381:; ----
NesPrgRom:2209a:p_382:
NesPrgRom:220b8:p_383:; ----
NesPrgRom:220cb:p_384:; ----
NesPrgRom:220dc:p_385:; ----
NesPrgRom:220e3:p_386:
NesPrgRom:220e6:p_387:
NesPrgRom:220f1:CreditsDecrementSeconds:604 stores frames, 605 stores seconds
NesPrgRom:220fc:CreditsContinueToNextScene:; ----
NesPrgRom:22127:p_390:; ----
NesPrgRom:22152:p_391:; ----
NesPrgRom:2221b:p_392:; ----
NesPrgRom:22220:m_393:$2222c
NesPrgRom:2222c:p_394:; ----
NesPrgRom:22283:p_395:
NesPrgRom:22287:m_396:
NesPrgRom:222d2:p_397:
NesPrgRom:222dd:m_398:
NesPrgRom:22301:p_399:
NesPrgRom:22321:p_400:
NesPrgRom:22329:p_401:; ----
NesPrgRom:2234b:p_402:; ----
NesPrgRom:22363:m_403:
NesPrgRom:2239c:p_404:$223a1
NesPrgRom:223a1:p_405:; ----
NesPrgRom:223a8:p_406:; ----
NesPrgRom:223bd:p_407:; ----
NesPrgRom:2240c:m_408:
NesPrgRom:2261a:m_409:
NesPrgRom:226e6:p_410:
NesPrgRom:226ed:p_411:; ----
NesPrgRom:22748:m_412:$22748
NesPrgRom:2276b:m_413:
NesPrgRom:2276d:m_414:
NesPrgRom:2277b:m_415:
NesPrgRom:22796:loop_416:
NesPrgRom:227c0:m_417:
NesPrgRom:227c4:m_418:
NesPrgRom:22806:p_419:
NesPrgRom:22846:m_420:
NesPrgRom:228e1:CopyAttributesPalettesAndBanks:; ----
NesPrgRom:228e5:m_422:Copies 40 bytes of attribute data
NesPrgRom:22919:m_423:Copy palette data into $0618 where it will be copied later into $6140
NesPrgRom:22926:m_424:Copy the CHR nametable banks to the update buffer
NesPrgRom:22933:m_425:Copy the CHR sprite banks to the update buffer
NesPrgRom:22952:m_426:
NesPrgRom:22970:p_427:; ----
NesPrgRom:22980:p_428:; ----
NesPrgRom:22990:p_429:; ----
NesPrgRom:229a0:p_430:; ----
NesPrgRom:229b0:p_431:; ----
NesPrgRom:229de:m_432:
NesPrgRom:229f3:m_433:
NesPrgRom:229fa:p_434:; ----\\n; Write the OAM data, then loop
NesPrgRom:22a1b:m_435:
NesPrgRom:22a2b:p_436:
NesPrgRom:22a37:m_437:
NesPrgRom:22a4a:m_438:
NesPrgRom:22a57:m_439:
NesPrgRom:22a63:m_440:
NesPrgRom:22a7b:p_441:; ----
NesPrgRom:22a82:m_442:
NesPrgRom:22a90:p_443:; ----
NesPrgRom:22a96:p_444:$22a82
NesPrgRom:22aa1:CreditsChangeToMode0:; ----
NesPrgRom:22ab4:p_446:; ----
NesPrgRom:22abb:m_447:
NesPrgRom:22ac8:p_448:; ----
NesPrgRom:22ad5:p_449:; ----
NesPrgRom:22adc:p_450:$22abb
NesPrgRom:22ae7:p_451:; ----\\n; Return to mode 0
NesPrgRom:22b3d:m_452:
NesPrgRom:22b41:m_453:
NesPrgRom:24097:m_454:
NesPrgRom:240a5:m_455:
NesPrgRom:240c5:m_456:
NesPrgRom:240d0:m_457:
NesPrgRom:2412d:m_458:
NesPrgRom:24134:p_459:; ----
NesPrgRom:24162:p_460:
NesPrgRom:2416a:p_461:; ----
NesPrgRom:2416e:p_462:$2412d
NesPrgRom:24198:WaitForOAMDMA_alt2:$24198
NesPrgRom:241bb:m_464:$2007
NesPrgRom:241bd:m_465:$2007
NesPrgRom:241cb:m_466:
NesPrgRom:241e6:m_467:
NesPrgRom:2420e:m_469:; Outer loop $73 iterations
NesPrgRom:24227:m_470:; Inner loop $72 iterations
NesPrgRom:24263:m_471:
NesPrgRom:2426a:m_472:
NesPrgRom:242b7:m_473:
NesPrgRom:242c7:p_474:
NesPrgRom:242d3:m_475:
NesPrgRom:242e6:m_476:
NesPrgRom:242f3:m_477:
NesPrgRom:242ff:m_478:
NesPrgRom:24318:p_479:; ----
NesPrgRom:2431f:m_480:
NesPrgRom:2432d:p_481:; ----
NesPrgRom:24333:p_482:$2431f
NesPrgRom:24352:p_483:; ----
NesPrgRom:24359:m_484:
NesPrgRom:24366:p_485:; ----
NesPrgRom:24373:p_486:; ----
NesPrgRom:2437a:p_487:$24359
NesPrgRom:24385:p_488:; ----
NesPrgRom:25fc8:p_489:
NesPrgRom:25fdd:m_490:
NesPrgRom:25fe7:m_491:
NesPrgRom:2601d:p_492:; Trigger OAMDMA
NesPrgRom:26092:ResetNMTBuffer:;; Waits for NMT write buffer to empty, then resets the index\\n;; to zero. They do this because they want to write two entries\\n;; without bumping the pointer twice. shrug
NesPrgRom:26137:m_494:
NesPrgRom:261be:m_495:
NesPrgRom:261ec:p_496:$26207
NesPrgRom:26207:p_497:
NesPrgRom:26218:p_498:; ----
NesPrgRom:2622b:m_499:
NesPrgRom:26259:p_500:; ----
NesPrgRom:26267:p_501:; ----
NesPrgRom:26273:p_502:; ----
NesPrgRom:26282:p_503:; ----
NesPrgRom:262cf:m_504:
NesPrgRom:26356:p_505:$263bd
NesPrgRom:263b7:p_506:; ----
NesPrgRom:263bd:p_507:$263c3
NesPrgRom:263c3:p_508:; ----
NesPrgRom:263cc:p_509:; ----
NesPrgRom:263e4:m_510:
NesPrgRom:26420:p_511:; ----
NesPrgRom:26429:p_512:; ----
NesPrgRom:26430:p_513:; ----
NesPrgRom:2643a:p_514:$26441
NesPrgRom:26441:p_515:$26448
NesPrgRom:26448:p_516:; ----
NesPrgRom:2646a:p_517:
NesPrgRom:264cc:p_518:
NesPrgRom:264df:p_519:
NesPrgRom:264e5:m_520:
NesPrgRom:264f2:p_521:; ----
NesPrgRom:264fd:m_522:
NesPrgRom:26511:p_523:; ----
NesPrgRom:26520:p_524:; ----
NesPrgRom:26528:p_525:
NesPrgRom:2654b:m_526:
NesPrgRom:26559:p_527:; ----
NesPrgRom:2655b:m_528:
NesPrgRom:26569:p_529:;; --------------------------------
NesPrgRom:26590:p_530:
NesPrgRom:2659a:m_531:
NesPrgRom:265a4:p_532:
NesPrgRom:265b3:p_533:$265cf
NesPrgRom:265b8:m_534:
NesPrgRom:265c0:p_535:
NesPrgRom:265cf:p_536:$265ef
NesPrgRom:265d4:m_537:
NesPrgRom:265e0:p_538:
NesPrgRom:265ef:p_539:; ----
NesPrgRom:265f4:m_540:
NesPrgRom:26600:p_541:
NesPrgRom:2663f:p_542:; ----
NesPrgRom:26647:p_543:$2664c
NesPrgRom:2664c:p_544:; ----
NesPrgRom:266fe:TitleMenuJump_00:
NesPrgRom:2675b:p_546:$26761
NesPrgRom:26761:p_547:; ----
NesPrgRom:26790:p_548:; ----
NesPrgRom:267a8:p_549:; ----\\n; Select/start not pressed progress the movie
NesPrgRom:268fb:p_550:$2692c
NesPrgRom:26919:p_551:
NesPrgRom:26947:p_552:; ----
NesPrgRom:26a27:p_553:; ----
NesPrgRom:26acc:p_554:
NesPrgRom:26ae7:p_555:$26aed
NesPrgRom:26aed:p_556:; ----
NesPrgRom:26b89:p_557:; ----
NesPrgRom:26ba7:p_558:; ----
NesPrgRom:26bf3:p_559:; ----
NesPrgRom:26cb9:m_560:
NesPrgRom:26cf5:p_561:; ----
NesPrgRom:26d23:p_562:; ----
NesPrgRom:26d6b:m_563:
NesPrgRom:26d99:p_564:$26db4
NesPrgRom:26db4:p_565:
NesPrgRom:26de1:p_566:
NesPrgRom:26df1:p_567:; ----
NesPrgRom:26e9b:m_568:
NesPrgRom:26ef6:p_569:; ----
NesPrgRom:26f4f:p_570:$26f6a
NesPrgRom:26f6a:p_571:
NesPrgRom:26f92:p_572:
NesPrgRom:26f9e:p_573:
NesPrgRom:26fab:p_574:$26fb1
NesPrgRom:26fb1:p_575:$26fb7
NesPrgRom:26fb7:p_576:; ----
NesPrgRom:270bb:p_577:$270c3
NesPrgRom:270c3:p_578:; ----
NesPrgRom:270d6:p_579:; ----
NesPrgRom:270f1:p_580:$270f7
NesPrgRom:270f7:p_581:; ----
NesPrgRom:2791c:PlayerDeath:
NesPrgRom:2793e:m_583:
NesPrgRom:279bd:m_584:
NesPrgRom:279c7:m_585:
NesPrgRom:279dc:p_586:MP
NesPrgRom:27a20:m_587:
NesPrgRom:27a32:m_588:
NesPrgRom:27a40:p_589:
NesPrgRom:27a6a:m_590:; Draw a row of top border
NesPrgRom:27ab1:m_591:
NesPrgRom:27acc:m_592:
NesPrgRom:27b75:m_593:
NesPrgRom:27bac:p_594:
NesPrgRom:27be7:m_595:
NesPrgRom:27c42:m_596:
NesPrgRom:27cc4:p_597:; ----
NesPrgRom:27cdc:m_598:
NesPrgRom:27cf1:p_599:
NesPrgRom:27d00:p_600:; ----
NesPrgRom:27d12:m_601:
NesPrgRom:27d95:m_602:
NesPrgRom:27dc3:m_603:
NesPrgRom:27dde:m_604:
NesPrgRom:27df6:m_605:
NesPrgRom:27e2e:m_606:
NesPrgRom:27e4e:m_607:
NesPrgRom:27e5e:m_608:NOTE odd banking here! .segment "0b8"
NesPrgRom:27e74:m_609:walk simea to the core of the reactor
NesPrgRom:27e96:p_610:
NesPrgRom:27eb1:m_611:
NesPrgRom:27ed5:m_612:
NesPrgRom:27f56:m_613:
NesPrgRom:27f8c:m_614:
NesPrgRom:27fa1:p_615:; ----
NesPrgRom:27fa4:p_616:
NesPrgRom:27fb9:p_617:
NesPrgRom:28502:m_618:
NesPrgRom:2850f:m_619:; Flush nametable write
NesPrgRom:28519:m_620:
NesPrgRom:2852a:m_621:
NesPrgRom:2856a:m_622:; ($2a),y is now the actual message\\n; Loop over the contents to decode.
NesPrgRom:28576:p_623:$28580
NesPrgRom:28580:p_624:$2856a
NesPrgRom:28592:p_625:;; --------------------------------
NesPrgRom:285e9:FlushNametableWrite_626:
NesPrgRom:285f7:m_627:
NesPrgRom:28606:p_628:;; --------------------------------
NesPrgRom:28618:p_629:;; --------------------------------
NesPrgRom:2861f:m_630:
NesPrgRom:28641:m_631:$28641
NesPrgRom:28660:p_632:; ----
NesPrgRom:28667:p_633:
NesPrgRom:2866f:m_634:$2867a
NesPrgRom:2867a:p_635:; ----
NesPrgRom:28681:p_636:;; --------------------------------
NesPrgRom:28695:m_637:$2869f
NesPrgRom:2869f:p_638:; ----\\n; Finish writing to the message buffer and return.
NesPrgRom:286b4:p_639:
NesPrgRom:286bd:p_640:
NesPrgRom:286c4:p_641:
NesPrgRom:2871d:p_642:
NesPrgRom:28722:m_643:
NesPrgRom:2872a:m_644:
NesPrgRom:2873c:m_645:
NesPrgRom:2875b:m_646:
NesPrgRom:2876c:p_647:$28771
NesPrgRom:28771:p_648:;; --------------------------------
NesPrgRom:28786:p_649:
NesPrgRom:28794:m_650:$2879e
NesPrgRom:2879e:p_651:; ----
NesPrgRom:287a5:p_652:
NesPrgRom:287d0:m_653:; Wait for nametable flush in NMI
NesPrgRom:287da:m_654:
NesPrgRom:287ef:DrawMessageBoxBackgroundRows:; Wait for nametable flush in NMI
NesPrgRom:287fb:m_656:
NesPrgRom:2880d:m_657:
NesPrgRom:29406:m_658:
NesPrgRom:29435:m_659:
NesPrgRom:29451:p_660:; ----
NesPrgRom:29458:p_661:; ----
NesPrgRom:2945f:p_662:;; --------------------------------
NesPrgRom:29483:m_663:$29483
NesPrgRom:29499:m_664:
NesPrgRom:294c2:m_665:$294c2
NesPrgRom:294db:m_666:
NesPrgRom:294f9:m_667:
NesPrgRom:29509:m_668:
NesPrgRom:29524:p_669:; ----
NesPrgRom:29548:p_670:; ----
NesPrgRom:2955d:p_671:; ----
NesPrgRom:2956f:m_672:
NesPrgRom:295aa:m_673:
NesPrgRom:29659:p_674:
NesPrgRom:2971a:m_675:
NesPrgRom:2974e:m_676:$2974e
NesPrgRom:2fbe7:m_677:
NesPrgRom:2fc19:m_678:
NesPrgRom:2fc2b:m_679:
NesPrgRom:2fc3e:m_680:
NesPrgRom:2fc4a:m_681:
NesPrgRom:2fc65:p_682:
NesPrgRom:2fc7a:m_684:
NesPrgRom:2fc95:m_685:
NesPrgRom:2fca3:m_686:
NesPrgRom:2fcaf:m_687:
NesPrgRom:2fcca:m_688:
NesPrgRom:2fcdf:m_689:
NesPrgRom:2fcf9:m_690:
NesPrgRom:2fd03:p_691:$2fd09
NesPrgRom:2fd09:p_692:
NesPrgRom:2fd14:p_693:; ----
NesPrgRom:2fd9b:m_694:
NesPrgRom:30064:p_695:$30071
NesPrgRom:30071:p_696:$30070 (but could be >rts)
NesPrgRom:30086:p_697:; ----
NesPrgRom:30088:m_698:
NesPrgRom:300bf:p_699:
NesPrgRom:300fb:p_700:
NesPrgRom:3018c:p_701:; ----
NesPrgRom:301ae:p_702:$301d0
NesPrgRom:301d0:p_703:$301de
NesPrgRom:301de:p_704:$301ec
NesPrgRom:301ec:p_705:
NesPrgRom:301ff:p_706:
NesPrgRom:3022a:m_707:; Turn off the music?
NesPrgRom:30230:p_708:$3022a
NesPrgRom:30239:m_709:
NesPrgRom:30295:m_710:
NesPrgRom:302b3:p_711:; Turn on all non-DMC channels
NesPrgRom:302d8:p_712:
NesPrgRom:302e9:p_713:
NesPrgRom:302f3:p_714:$30307
NesPrgRom:30300:p_715:; ----
NesPrgRom:30307:p_716:$30346
NesPrgRom:30319:p_717:$30323
NesPrgRom:30323:p_718:$3032d
NesPrgRom:3032d:p_719:$30346
NesPrgRom:3037d:p_720:; ----\\n; Zero out bits for channel x in $fb\\n; Check the 114,bgm(x) - if negative, clear 80, set 10\\n$307b2
NesPrgRom:303ae:p_721:; ----
NesPrgRom:303cc:p_722:; ----\\n; dX on non-noise channels - reads the octave (stored in hi nibble\\n; of 156,x) and indexes 303da table to do a 2 but with a different\\n; value in f7 (pitch bend).  This bends the note down anywhere from\\n; a quarter step (at the higher notes, e.g. B) to an eighth step\\n; (at the lower notes, e.g. C).
NesPrgRom:3040d:p_723:; ----\\n; Melody channel (square or triangle)
NesPrgRom:30457:p_724:; ----
NesPrgRom:304a9:p_725:
NesPrgRom:304b4:m_726:
NesPrgRom:304ce:p_727:; ----
NesPrgRom:304d1:p_728:
NesPrgRom:304db:p_729:$304e8
NesPrgRom:304e8:p_730:;; --------------------------------
NesPrgRom:304f0:p_731:;; --------------------------------
NesPrgRom:304f1:p_732:;; --------------------------------
NesPrgRom:30522:p_733:; ----
NesPrgRom:3054c:p_734:;; --------------------------------
NesPrgRom:30569:p_735:
NesPrgRom:30571:p_736:set the upper 4 bits of $0168 and flag volume changed
NesPrgRom:3059b:p_737:$305ae
NesPrgRom:305eb:p_738:
NesPrgRom:3060b:m_739:
NesPrgRom:30626:p_740:; ----
NesPrgRom:30634:p_741:
NesPrgRom:3064c:p_742:; ----
NesPrgRom:3065f:p_743:; ----\\n; Initiate DMC
NesPrgRom:30698:p_744:; ----
NesPrgRom:306a1:p_745:; ----
NesPrgRom:306bc:p_746:
NesPrgRom:306d8:p_747:
NesPrgRom:306f6:p_748:
NesPrgRom:30713:p_749:;; --------------------------------
NesPrgRom:3441c:p_750:; x coordinates don't line up - so $11 definitely != 0
NesPrgRom:34422:p_751:; ----\\n; hi x coordinates are equal - check lo, extending the sign bit of\\n; xhi as we shift it right four bits.
NesPrgRom:34430:p_752:; At this point A is some measure of dx (but might be units of screens\\n; or tiles, if within a screen). This ensures that it is only a single\\n; nibble, plus sign bit.  So shift it to the range [0, 1f] where 10 is\\n; dead center (zero).
NesPrgRom:34449:p_753:; yhi diff is nonzero shift hi left 1 nibble -> $11, lo right 1 nibble -> y
NesPrgRom:34458:p_754:; NOTE if we want to increase the resolution of this table, we need\\n; to start right here.  We also need some way to bail out early and\\n; change which direction we report... easiest might be to store the\\n; lower bits in a separate location (A?) so that all the callers don't\\n; need to change - only the ones that could use 64-dir angles.
NesPrgRom:34497:p_755:
NesPrgRom:34c1e:m_756:
NesPrgRom:34c36:m_757:
NesPrgRom:34c53:p_758:
NesPrgRom:34c57:m_759:
NesPrgRom:34c75:p_760:$1c <- abcd efgh (assume bg, not sprite)
NesPrgRom:34c92:p_761:
NesPrgRom:34ca1:p_762:; This loop copies 4 bytes from $0[46]0001111cd00
NesPrgRom:34ca3:m_763:; This loop copies 4 bytes from $0[46]0001111cd00\\n; to the palette staging area.  ff just copies $6140, which I believe\\n; is the background color.  We subreact $11, which was set to zero if\\n; $1d & 1.  This seems to have something to do with screen fade?
NesPrgRom:34cac:p_764:
NesPrgRom:34cb3:p_765:
NesPrgRom:34ccb:m_766:
NesPrgRom:34cdb:p_767:; divide current hp by 16 (floor)
NesPrgRom:34ce7:m_768:
NesPrgRom:34cf7:p_769:; Divide current HP by 16 to get the offset that we want for the\\n; filled health bars.
NesPrgRom:34d01:m_770:
NesPrgRom:34d07:p_771:; reload the current hp in to A and mask the low nybble to get\\n; which of the split hp/empty tiles to draw
NesPrgRom:34d11:p_772:
NesPrgRom:34d44:p_773:
NesPrgRom:34d64:m_774:
NesPrgRom:34d74:m_775:
NesPrgRom:34d7a:p_776:
NesPrgRom:34d91:p_777:
NesPrgRom:34da1:m_778:
NesPrgRom:34dd7:p_779:
NesPrgRom:34e77:p_780:
NesPrgRom:34e85:m_781:
NesPrgRom:34ec0:p_782:
NesPrgRom:34f3b:m_783:the 16-bit number
NesPrgRom:34f5d:p_784:; ----
NesPrgRom:34f83:p_785:
NesPrgRom:34f87:m_786:
NesPrgRom:34fb4:p_787:
NesPrgRom:34fce:p_788:$34fc3
NesPrgRom:34fff:m_789:
NesPrgRom:3500e:p_790:$34fff
NesPrgRom:35013:m_791:$35044
NesPrgRom:35020:p_792:; ----\\n; NPC was entry Y in the 35045 table\\n;   -> set (or clear) the parallel flag in 3504f.
NesPrgRom:3507b:p_793:;; --------------------------------
NesPrgRom:350bb:p_794:
NesPrgRom:350df:p_795:
NesPrgRom:350e4:p_796:; ----
NesPrgRom:350ec:p_797:; ----
NesPrgRom:35136:p_798:
NesPrgRom:35160:p_799:; ----\\n; Otherwise, swap out the object for its replacement
NesPrgRom:3516a:p_800:; Check experience to see if we're at the next level yet.
NesPrgRom:351ef:p_801:EXP
NesPrgRom:3523e:p_802:; NOTE when hitting a slime with a thunder sword, this path\\n; replaces it with a big blue slime; seems to also apply to\\n; red slimes; several other monsters have this bit set, but it\\n; does not have this effect for them - so it's contingent on\\n; other things.  It looks like $0711 holds the sword type,\\n; $540,y (340) needs to be zero and either $560,y (320) must\\n; be zero or at least not 3.
NesPrgRom:3525c:p_803:; ----
NesPrgRom:3525d:p_804:; ----\\n; exp >= $80 subtract $80, multiply by $10.
NesPrgRom:35383:p_805:
NesPrgRom:35388:p_806:; ----
NesPrgRom:3539c:p_807:; ----
NesPrgRom:353ac:p_808:; ----
NesPrgRom:353c6:p_809:
NesPrgRom:353e8:p_810:twos complement
NesPrgRom:3541a:p_811:
NesPrgRom:35422:p_812:
NesPrgRom:3542e:p_813:;; --------------------------------
NesPrgRom:35493:p_814:
NesPrgRom:354cb:p_815:; ----
NesPrgRom:354ce:p_816:$35534
NesPrgRom:354df:p_817:$35534
NesPrgRom:354ee:p_818:
NesPrgRom:35508:p_819:
NesPrgRom:35539:m_820:
NesPrgRom:35568:p_821:; ----\\n; Move the player back in response to touching a statue.
NesPrgRom:35585:p_822:
NesPrgRom:35589:m_823:
NesPrgRom:355d4:p_824:
NesPrgRom:355df:p_825:
NesPrgRom:3563e:NextObject_826:
NesPrgRom:35768:p_827:
NesPrgRom:35773:loop_828:; ----\\n; Actually spawn something.  Check slots [$21,$22) for empty.
NesPrgRom:3579f:p_829:direction
NesPrgRom:357d0:quit_830:
NesPrgRom:35833:p_831:
NesPrgRom:3583c:p_832:$35850
NesPrgRom:35849:p_833:; There was a carry, or else we landed in the exclusion zone.\\n; Either way, add the extra $10 (carry bit will always be set here).
NesPrgRom:3584d:p_834:
NesPrgRom:35850:p_835:; ----
NesPrgRom:3585a:p_836:
NesPrgRom:3585e:p_837:
NesPrgRom:35870:p_838:
NesPrgRom:35879:p_839:
NesPrgRom:35885:p_840:$35890
NesPrgRom:35890:p_841:; ----
NesPrgRom:358b9:FindEmptySpawnSlot:> sec, then rts
NesPrgRom:358c5:p_843:; ----
NesPrgRom:35900:p_844:
NesPrgRom:3597d:DirLoop_845:
NesPrgRom:359be:p_846:; ----
NesPrgRom:359bf:p_847:; ----\\n; Non-player (x != 0), though non-dolphin player comes in in two lines\\nforce terrain lookup, no update $380,x
NesPrgRom:359c4:p_848:enemies avoid slides, pits, walls, water
NesPrgRom:359cc:p_849:
NesPrgRom:359d4:BailOut_850:; ----\\n; Looks like some sort of double-return?
NesPrgRom:35a15:p_851:$35a25
NesPrgRom:35a25:p_852:; ----
NesPrgRom:35a4d:p_853:; ----\\n; Load the current map screen layout.\\nyh
NesPrgRom:35ab9:p_854:$a000 -> $36000
NesPrgRom:35ade:p_855:
NesPrgRom:35af7:p_856:; Insufficient MP - double-return to skip the rest of the routine
NesPrgRom:35afe:p_857:MP
NesPrgRom:35b11:p_858:; ----\\n; Flash the boss white while it's knocked back??
NesPrgRom:35b18:m_859:
NesPrgRom:35b1d:m_860:$35b28
NesPrgRom:35b28:p_861:
NesPrgRom:35b2d:p_862:
NesPrgRom:35b34:p_863:$35b1d
NesPrgRom:35b5a:p_864:; Copy the lower nibble of $341 into $340.\\n$341
NesPrgRom:35b7d:p_865:$35bd2
NesPrgRom:35b9c:p_866:; ----
NesPrgRom:35bcc:p_867:
NesPrgRom:35bd2:p_868:not changed
NesPrgRom:35c19:p_869:
NesPrgRom:35c1f:p_870:
NesPrgRom:35c2a:p_871:; Come back together from the two branches above\\n; We don't bother to call the load/spawn subroutines\\n; to spawn the sword.  Instead, we just copy some things\\n; manually into $4a2 (action), $3e2 (damage), etc.
NesPrgRom:35c4c:p_872:zero out the action - remove sword?
NesPrgRom:35c6c:p_873:no sword equipped
NesPrgRom:35c91:p_874:
NesPrgRom:35ca7:p_875:
NesPrgRom:35cd1:SwordSwingEnd:
NesPrgRom:35d11:p_877:; ----\\n; Done with fall (or just none in progress).\\nput the hitbox back - except LSN...
NesPrgRom:35d27:p_878:
NesPrgRom:35d3a:p_879:
NesPrgRom:35d9a:ObjectActionJump_03:$35db7 - changed
NesPrgRom:35db7:p_881:
NesPrgRom:35db9:p_882:
NesPrgRom:35dd1:p_883:
NesPrgRom:35de1:p_884:
NesPrgRom:35e03:p_885:$35e39
NesPrgRom:35e22:p_886:$35e2b
NesPrgRom:35e2b:p_887:
NesPrgRom:35e39:p_888:$35e6f
NesPrgRom:35e57:p_889:; ----
NesPrgRom:35e62:p_890:$35e85
NesPrgRom:35e6f:p_891:; ----
NesPrgRom:35e85:p_892:$35e8f
NesPrgRom:35e8f:p_893:$35e9e
NesPrgRom:35e9e:p_894:
NesPrgRom:35eba:p_895:
NesPrgRom:35ed8:p_896:$35eef
NesPrgRom:35eef:p_897:
NesPrgRom:35efa:p_898:
NesPrgRom:35f06:p_899:
NesPrgRom:35f37:p_900:$35f4c
NesPrgRom:35f4c:p_901:
NesPrgRom:35f70:m_902:
NesPrgRom:35f7b:p_903:; ----
NesPrgRom:35f8e:p_904:
NesPrgRom:35f95:p_905:
NesPrgRom:35fb4:p_906:
NesPrgRom:35fc4:p_907:
NesPrgRom:36002:p_908:
NesPrgRom:36030:p_909:0 or 8
NesPrgRom:3603c:p_910:; ----
NesPrgRom:36054:p_911:
NesPrgRom:3605e:p_912:; ----
NesPrgRom:360b0:p_913:; Run this twice (jsr then again normally, unless double-returned?)
NesPrgRom:360ca:p_914:
NesPrgRom:360fc:p_915:; ----
NesPrgRom:3610c:p_916:
NesPrgRom:36122:p_917:$36133
NesPrgRom:36133:p_918:
NesPrgRom:3613d:p_919:
NesPrgRom:3614d:p_920:
NesPrgRom:36172:p_921:20
NesPrgRom:361c0:p_922:;; --------------------------------
NesPrgRom:361dd:p_923:; ----\\n0..7 ff
NesPrgRom:361f9:p_924:$36210 - only possible if fell through from above
NesPrgRom:36221:p_925:
NesPrgRom:36270:p_926:
NesPrgRom:36275:p_927:
NesPrgRom:3628b:p_928:$362ab
NesPrgRom:3629f:p_929:$362a5
NesPrgRom:362a5:p_930:
NesPrgRom:362bf:p_931:; ----\\n; Player wins fight
NesPrgRom:362e8:p_932:; ----\\n; Player loses fight
NesPrgRom:36422:p_933:
NesPrgRom:36424:m_934:
NesPrgRom:3643b:p_935:
NesPrgRom:364aa:p_936:self-destruct
NesPrgRom:364b2:p_937:; ----\\n; Initial setup for main tower level escalator checks\\n; On entry, y = 4, 3, or 2 for levels 59, 5a, and 5b, respectively.\\n; If the player is at the top of a screen, decrease y (so treat it\\n; like they're on the _next_ screen).  Then set all the flags on all\\n; rows _below_ the current screen's, up to (including) 3.  The DEY\\n; will fire right after a transition but not when exiting a door.\\nplayer y (pixel within screen)
NesPrgRom:364b9:end_938:
NesPrgRom:364e2:p_939:
NesPrgRom:36502:p_940:
NesPrgRom:3650a:p_941:
NesPrgRom:36525:p_942:$3653f
NesPrgRom:3653f:p_943:$3654f
NesPrgRom:3654f:p_944:; ----
NesPrgRom:3655e:p_945:; ----
NesPrgRom:36576:p_946:; ----
NesPrgRom:3658b:p_947:$365bf
NesPrgRom:365d7:p_948:; ----
NesPrgRom:365fb:p_949:; ----
NesPrgRom:36609:p_950:5 if in evil spirit island entrance, 4 otherwise
NesPrgRom:36624:p_951:$3662a
NesPrgRom:3662a:p_952:
NesPrgRom:3665f:p_953:;; --------------------------------
NesPrgRom:3667a:p_954:$3669e
NesPrgRom:36689:p_955:; ----\\n; Make NPC jump outside starting cave
NesPrgRom:3669e:p_956:$366c4
NesPrgRom:366c4:p_957:;; --------------------------------
NesPrgRom:366ee:p_958:
NesPrgRom:3670d:p_959:;; --------------------------------
NesPrgRom:36725:p_960:; ----\\n; Initiate Stom fight set hardcoded pattern 4e into second slot
NesPrgRom:36774:p_961:; ----
NesPrgRom:36785:p_962:
NesPrgRom:36790:p_963:$36796
NesPrgRom:36796:p_964:
NesPrgRom:36799:p_965:
NesPrgRom:367c3:p_966:$367cc
NesPrgRom:367cc:p_967:;; --------------------------------
NesPrgRom:367e9:m_968:; ----
NesPrgRom:367ea:p_970:; ----
NesPrgRom:3680b:p_971:
NesPrgRom:3682d:p_972:$36834
NesPrgRom:36834:p_973:
NesPrgRom:36849:p_974:
NesPrgRom:36875:p_975:$368a6
NesPrgRom:368a6:p_976:$368b0
NesPrgRom:368b0:p_977:
NesPrgRom:368c5:p_978:
NesPrgRom:368fb:p_979:;; --------------------------------
NesPrgRom:36923:p_980:$36936
NesPrgRom:36935:p_981:; ----
NesPrgRom:36936:p_982:$3693e
NesPrgRom:3693e:p_983:
NesPrgRom:36998:p_984:; ----
NesPrgRom:369b3:p_985:;; --------------------------------
NesPrgRom:369cf:p_986:;; --------------------------------
NesPrgRom:369f4:p_987:
NesPrgRom:369fa:p_988:; At this point, A is cardinal direction (0..3) or zero.\\n; 6e0 allows a separate set of metasprites for when the orc throws.
NesPrgRom:36a25:p_989:; ----\\n; For non-directional sprites, use ObjectDirection instead.
NesPrgRom:36a3c:p_990:
NesPrgRom:36a42:p_991:
NesPrgRom:36a60:p_992:$10 <- on screen ? 1  7
NesPrgRom:36a6b:p_993:; ----\\n; Tick the non-looping counter (4e0) twice, the step counter once
NesPrgRom:36a96:p_994:
NesPrgRom:36ab9:p_995:
NesPrgRom:36ae0:p_996:zero if clear? why not just bcs?
NesPrgRom:36aec:p_997:; ----
NesPrgRom:36aef:p_998:; ----
NesPrgRom:36b35:p_999:; ----\\n; sprite does need to update $300,x to change direction
NesPrgRom:36b6f:p_1000:; ----\\n; Main movement code - after
NesPrgRom:36b98:p_1001:; ----
NesPrgRom:36bd9:p_1002:
NesPrgRom:36bfe:p_1003:; ----
NesPrgRom:36c8c:p_1004:; ----\\nupdate $380,x
NesPrgRom:36ca3:p_1005:; ----
NesPrgRom:36cae:p_1006:; ----
NesPrgRom:36cc4:m_1007:
NesPrgRom:36ce2:p_1008:; ----
NesPrgRom:36cec:p_1009:; ----\\n; Non-statue
NesPrgRom:36d03:p_1010:; ----
NesPrgRom:36d1e:p_1011:
NesPrgRom:36d4a:p_1013:; ----
NesPrgRom:36d57:p_1014:
NesPrgRom:36d60:p_1015:; ----
NesPrgRom:36d84:FinishNpcAction_1016:
NesPrgRom:36dfe:p_1017:; ----
NesPrgRom:36e25:p_1018:$36e30
NesPrgRom:36e66:terminate_movement_1019:; ----
NesPrgRom:36e76:p_1020:
NesPrgRom:36e7b:handle_fc_1021:; ----
NesPrgRom:36e9c:handle_fd_1022:; ----
NesPrgRom:36eb1:update_direction_1023:; ----
NesPrgRom:36eb7:advance_frame_1024:
NesPrgRom:36fdc:p_1025:; ----
NesPrgRom:37006:p_1026:; ----
NesPrgRom:37012:p_1027:$37005
NesPrgRom:37037:p_1028:; ----
NesPrgRom:3705e:p_1029:
NesPrgRom:370c6:p_1030:$370ce
NesPrgRom:370ce:p_1031:; ----
NesPrgRom:370e2:p_1032:; ----\\nforce check, update $380,x
NesPrgRom:370f3:p_1033:;; --------------------------------
NesPrgRom:3710d:p_1034:
NesPrgRom:37118:p_1035:;; --------------------------------
NesPrgRom:37135:p_1036:; ----
NesPrgRom:37139:m_1037:
NesPrgRom:3716e:p_1038:; ----
NesPrgRom:37187:p_1039:; ----
NesPrgRom:371a7:p_1040:
NesPrgRom:371bc:p_1041:; ----
NesPrgRom:371dc:p_1042:
NesPrgRom:37250:p_1043:; ----
NesPrgRom:3726b:p_1044:
NesPrgRom:37282:p_1045:; ----
NesPrgRom:37292:p_1046:
NesPrgRom:372ae:p_1047:; ----
NesPrgRom:372ba:p_1048:
NesPrgRom:37323:p_1049:$37322
NesPrgRom:37346:p_1050:; ----
NesPrgRom:37364:p_1051:$37383
NesPrgRom:3737d:p_1052:; ----
NesPrgRom:37383:p_1053:; ----
NesPrgRom:373d0:p_1054:; ----\\n$37422
NesPrgRom:37422:p_1055:; ----
NesPrgRom:3744e:p_1056:$37479
NesPrgRom:37462:p_1057:
NesPrgRom:37479:p_1058:update $380,x
NesPrgRom:374d3:p_1059:; Remove the 10 bit of 380. (unknown what this does)
NesPrgRom:374fd:p_1060:
NesPrgRom:3750e:p_1061:
NesPrgRom:37573:p_1062:; ----
NesPrgRom:37586:p_1063:; ----
NesPrgRom:375b0:p_1064:; ----
NesPrgRom:375d3:p_1065:; ----
NesPrgRom:37603:m_1066:$37616
NesPrgRom:37616:p_1067:
NesPrgRom:3763f:p_1068:
NesPrgRom:3764a:p_1069:
NesPrgRom:3766e:p_1070:; ----
NesPrgRom:376a7:p_1071:;; --------------------------------
NesPrgRom:37736:p_1072:; ----
NesPrgRom:37786:p_1073:; ----
NesPrgRom:37798:p_1074:
NesPrgRom:377b0:p_1075:
NesPrgRom:37838:p_1076:
NesPrgRom:37845:p_1077:
NesPrgRom:3785b:p_1078:; ----
NesPrgRom:37879:p_1079:; Check whether we need an explosion or not.
NesPrgRom:3788b:p_1080:$37896
NesPrgRom:3788f:p_1081:
NesPrgRom:37896:p_1082:; Open gate non-explosively.
NesPrgRom:378a8:p_1083:; ----
NesPrgRom:378bc:p_1084:; ----
NesPrgRom:378bf:p_1085:; ----
NesPrgRom:37980:p_1086:$37993
NesPrgRom:37993:p_1087:$3799d
NesPrgRom:3799e:m_1088:
NesPrgRom:379d1:p_1089:; ----
NesPrgRom:379f5:p_1090:; ----\\n; Spawn a coin
NesPrgRom:37a14:p_1091:
NesPrgRom:37a7b:m_1092:
NesPrgRom:37aae:p_1093:
NesPrgRom:37aba:m_1094:
NesPrgRom:37ac4:m_1095:
NesPrgRom:37ada:m_1096:
NesPrgRom:37b03:p_1097:; ----
NesPrgRom:37b26:p_1098:; ----
NesPrgRom:37b32:m_1099:
NesPrgRom:37b79:p_1100:; ----
NesPrgRom:37bee:m_1101:
NesPrgRom:37bf6:m_1102:
NesPrgRom:37c13:m_1103:
NesPrgRom:37cc1:p_1104:$37c60
NesPrgRom:37cec:m_1105:
NesPrgRom:37d03:m_1106:
NesPrgRom:37d1f:p_1107:; ----
NesPrgRom:37d35:p_1108:
NesPrgRom:37d41:p_1109:; ----\\n; Shoot bubbles left when 64e is 0 mod 8, right when 64f is 4 mod 8
NesPrgRom:37d68:p_1110:; ----
NesPrgRom:37db9:p_1111:; ----\\n; At this point, the parent object's index is y.
NesPrgRom:37ddf:p_1112:parent index
NesPrgRom:37e20:p_1113:
NesPrgRom:38018:p_1114:$1e <- $08 & 2 ? 3  0
NesPrgRom:38030:m_1115:
NesPrgRom:38060:p_1116:
NesPrgRom:3808b:p_1117:
NesPrgRom:3808e:loop_1118:
NesPrgRom:3809a:p_1119:; ----
NesPrgRom:380ab:m_1120:
NesPrgRom:380b4:p_1121:$380d5
NesPrgRom:380c3:p_1122:
NesPrgRom:380c6:m_1123:
NesPrgRom:380e3:p_1124:; ----
NesPrgRom:380e9:m_1125:
NesPrgRom:38101:p_1126:
NesPrgRom:3813c:p_1127:
NesPrgRom:38145:p_1128:$381a4
NesPrgRom:38157:m_1129:
NesPrgRom:3819c:p_1130:
NesPrgRom:381b9:p_1131:;; --------------------------------
NesPrgRom:38239:p_1132:
NesPrgRom:38271:p_1133:
NesPrgRom:38283:p_1134:
NesPrgRom:38293:p_1135:; ----
NesPrgRom:3829d:m_1136:
NesPrgRom:382b8:p_1138:; ----
NesPrgRom:382b9:p_1139:; ----\\n; At this point, A contains the number of tiles\\n;                ($15) is top of metasprite, y=0 still
NesPrgRom:382d1:p_1140:
NesPrgRom:382da:p_1141:
NesPrgRom:382e3:p_1142:
NesPrgRom:382ec:p_1143:$382f3
NesPrgRom:382f3:p_1144:$382f8
NesPrgRom:382f8:p_1145:; Add to $15 (with carry into $16, obv)
NesPrgRom:38301:p_1146:; Store $380 << 1 in $18 now -> will be used in the +++ branch\\n;   The #$20 bit (#$10 orig) goes in $19\\n;   This indicates that the sprite is in the background
NesPrgRom:38327:p_1147:probably current sprite index?
NesPrgRom:38331:m_1148:; Actually draw the sprites
NesPrgRom:38358:m_1149:
NesPrgRom:3836b:m_1150:
NesPrgRom:3836e:p_1152:$3836b
NesPrgRom:38379:p_1153:$38358 - back-jump if we're at normal speed
NesPrgRom:383b0:m_1154:
NesPrgRom:383c3:Exit_1155:
NesPrgRom:383c6:p_1156:; ----
NesPrgRom:383d1:p_1157:$383b0
NesPrgRom:3c01b:p_1158:
NesPrgRom:3c030:p_1159:
NesPrgRom:3c045:p_1160:
NesPrgRom:3c060:p_1161:"change" flags
NesPrgRom:3c073:p_1162:
NesPrgRom:3c07d:p_1163:
NesPrgRom:3c08a:p_1164:; ----
NesPrgRom:3c0b3:p_1165:
NesPrgRom:3c0c0:p_1166:
NesPrgRom:3c0cc:p_1167:$3c0d0
NesPrgRom:3c0d0:p_1168:
NesPrgRom:3c0da:m_1169:
NesPrgRom:3c0ed:p_1170:MP
NesPrgRom:3c100:p_1171:; ----
NesPrgRom:3c10c:p_1172:
NesPrgRom:3c13d:p_1173:; ----
NesPrgRom:3c13f:p_1174:
NesPrgRom:3c154:p_1175:
NesPrgRom:3c15d:p_1176:
NesPrgRom:3c160:p_1177:
NesPrgRom:3c165:p_1178:
NesPrgRom:3c16d:m_1179:; Holding pattern waiting for NMI when OAM DMA is needed
NesPrgRom:3c176:WaitForMultipleOAMDMA:; [in y] - Number of frames to wait.
NesPrgRom:3c18c:m_1181:
NesPrgRom:3c198:p_1182:
NesPrgRom:3c1bd:m_1183:
NesPrgRom:3c214:m_1184:$3c21f
NesPrgRom:3c21f:p_1185:; ----
NesPrgRom:3c239:p_1186:
NesPrgRom:3c23b:p_1187:
NesPrgRom:3c24b:p_1188:$3c256
NesPrgRom:3c256:p_1189:; ----
NesPrgRom:3c264:p_1190:; ----
NesPrgRom:3c287:p_1191:
NesPrgRom:3c290:p_1192:
NesPrgRom:3c295:m_1193:; zero out the 32 data slots $0300 + $20n + x
NesPrgRom:3c2b4:p_1194:; ----\\n; Here's where we actually fill up the tables.\\n; The basic approach is that mnst[1] is a bitmap where the highest bit\\n; tells whether the next element is present (and is then shifted left).
NesPrgRom:3c2c5:p_1195:$3c2cf
NesPrgRom:3c2cf:p_1196:$3c2d9
NesPrgRom:3c2d9:p_1197:$3c2e3
NesPrgRom:3c2e3:p_1198:$3c2ed
NesPrgRom:3c2ed:p_1199:$3c2f7
NesPrgRom:3c2f7:p_1200:$3c301
NesPrgRom:3c301:p_1201:$3c30b
NesPrgRom:3c30b:p_1202:
NesPrgRom:3c319:p_1203:$3c323
NesPrgRom:3c323:p_1204:$3c32d
NesPrgRom:3c32d:p_1205:$3c337
NesPrgRom:3c337:p_1206:$3c341
NesPrgRom:3c341:p_1207:$3c34b
NesPrgRom:3c34b:p_1208:$3c355
NesPrgRom:3c355:p_1209:$3c35f
NesPrgRom:3c35f:p_1210:
NesPrgRom:3c36d:p_1211:$3c377
NesPrgRom:3c377:p_1212:$3c381
NesPrgRom:3c381:p_1213:$3c38b
NesPrgRom:3c38b:p_1214:$3c395
NesPrgRom:3c395:p_1215:$3c39f
NesPrgRom:3c39f:p_1216:$3c3a9
NesPrgRom:3c3a9:p_1217:$3c3b3
NesPrgRom:3c3b3:p_1218:
NesPrgRom:3c3c1:p_1219:$3c3cb
NesPrgRom:3c3cb:p_1220:$3c3d5
NesPrgRom:3c3d5:p_1221:$3c3df
NesPrgRom:3c3df:p_1222:$3c3e9
NesPrgRom:3c3e9:p_1223:$3c3f3
NesPrgRom:3c3f3:p_1224:$3c3fd
NesPrgRom:3c3fd:p_1225:$3c406
NesPrgRom:3c406:p_1226:
NesPrgRom:3c4a1:p_1227:
NesPrgRom:3c4ae:m_1228:
NesPrgRom:3c4be:m_1229:; Write the first four bytes from the data table to $6200,x
NesPrgRom:3c4e8:p_1230:
NesPrgRom:3c4f3:p_1231:; A = max(#$20, $22) - this is a single row; add to $21$20 (bigendian)
NesPrgRom:3c4fc:p_1232:
NesPrgRom:3c50a:p_1233:$3c4be
NesPrgRom:3c515:p_1234:
NesPrgRom:3c67d:WriteNametableDataToPpu:; called from $3f40a (maybe others)\\n; Check if we even need to update anything - $b may lead $a\\n; by #$04 (sometimes #$08), wrapping around at $#20.  These\\n; are indexes into scratch space at $6200,x [x=0..#$20].\\n; The format is\\n;     0 high 6 bits of PPUADDR, plus PPUCTRL increment in 40.\\n;        80 indicates we need to do it again after this w/ no flush.\\n;     1 low byte of PPUADDR\\n;     2 number of bytes to write. If this is negative then\\n;        instead write $40 bytes directly from $6100,[3] instead\\n;        of $6000,[3] and don't bother looping.\\n;     3 start offset into $6000 to copy
NesPrgRom:3c692:p_1236:; Write the next 14 bits to PPUADDR (the c0 bits are mirrored out)
NesPrgRom:3c6b1:m_1237:; TODO(sdh) Why is this loop unrolled?!? it seems like it\\n; could be done with a single \`bne -\` rather than four at once.
NesPrgRom:3c6d9:p_1238:; After writing one chunk, increment $a and loop to see\\n; if there's another chunk to write.
NesPrgRom:3c6e7:p_1239:; ----\\n; Negative lengths ($6202,x) end up here.\\n; This seems to load data from 6100,y instead\\n; of 6000,y, and exactly 64 bytes instead of x.
NesPrgRom:3c6e9:m_1240:
NesPrgRom:3c72b:WaitForNametableBufferAvailable:
NesPrgRom:3c72d:m_1242:$3c72b
NesPrgRom:3c778:m_1243:
NesPrgRom:3c7c5:p_1244:; At this point the address of the A-th table is in $10, so ($10),y is data[A][y]
NesPrgRom:3c7d8:m_1245:
NesPrgRom:3c7ee:m_1246:$3c7ee
NesPrgRom:3c801:m_1247:
NesPrgRom:3c816:m_1248:$3c816
NesPrgRom:3c820:m_1249:$3c820
NesPrgRom:3c835:m_1250:
NesPrgRom:3c83e:m_1251:8000 -> 34000
NesPrgRom:3c864:p_1252:;; --------------------------------
NesPrgRom:3c86b:m_1253:
NesPrgRom:3c87b:m_1254:
NesPrgRom:3c886:m_1255:
NesPrgRom:3c88e:m_1256:
NesPrgRom:3c95b:m_1257:
NesPrgRom:3c964:m_1258:
NesPrgRom:3ca03:m_1259:
NesPrgRom:3ca14:m_1260:$3ca26
NesPrgRom:3ca5e:p_1261:;; --------------------------------
NesPrgRom:3cac3:p_1262:update the global counter
NesPrgRom:3cba3:p_1263:
NesPrgRom:3cc87:m_1264:
NesPrgRom:3cc8f:m_1265:
NesPrgRom:3cca4:m_1266:
NesPrgRom:3ccb1:m_1267:redundant?
NesPrgRom:3ccfa:p_1268:
NesPrgRom:3cd06:p_1269:; ----
NesPrgRom:3cd28:p_1270:
NesPrgRom:3cd31:p_1271:; ----
NesPrgRom:3cd45:p_1272:$3cd74
NesPrgRom:3cd74:p_1273:; ----
NesPrgRom:3cdc0:p_1274:$3cdd4
NesPrgRom:3ce0b:m_1275:
NesPrgRom:3ce39:p_1276:
NesPrgRom:3ce69:p_1277:; ----\\n; Clear the map palette data.
NesPrgRom:3ce6d:m_1278:
NesPrgRom:3ce77:m_1279:
NesPrgRom:3ce8d:m_1280:
NesPrgRom:3ceb0:p_1281:$3cee0
NesPrgRom:3cec0:p_1282:
NesPrgRom:3ceca:m_1283:
NesPrgRom:3cee0:p_1284:$3cf13
NesPrgRom:3cef1:m_1285:
NesPrgRom:3cf13:p_1286:; ----
NesPrgRom:3cf1d:p_1287:
NesPrgRom:3d0ae:p_1288:; ----
NesPrgRom:3d0b3:p_1289:
NesPrgRom:3d0f3:p_1290:; Display "zzz..."
NesPrgRom:3d100:p_1291:; ----
NesPrgRom:3d276:p_1292:8000 -> 34000
NesPrgRom:3d371:p_1293:
NesPrgRom:3d382:p_1294:
NesPrgRom:3d38a:m_1295:$3d38a
NesPrgRom:3d3a0:p_1296:; ----
NesPrgRom:3d3aa:m_1297:
NesPrgRom:3d3fb:HandleTreasureChest:; ----
NesPrgRom:3d41c:p_1299:
NesPrgRom:3d435:p_1300:; ----
NesPrgRom:3d43a:p_1301:
NesPrgRom:3d4ac:p_1302:;; --------------------------------\\n; Require changed to a girl to even use kirisa plant
NesPrgRom:3d4c3:p_1303:
NesPrgRom:3d4c8:p_1304:;; --------------------------------
NesPrgRom:3d4d9:p_1305:;; --------------------------------
NesPrgRom:3d4e7:p_1306:;; --------------------------------\\n; teleported
NesPrgRom:3d501:p_1307:
NesPrgRom:3d506:p_1308:
NesPrgRom:3d54b:p_1309:
NesPrgRom:3d652:p_1310:;; --------------------------------
NesPrgRom:3d679:p_1311:
NesPrgRom:3d724:p_1312:
NesPrgRom:3d7a6:m_1313:
NesPrgRom:3d7c2:p_1314:
NesPrgRom:3d7d8:m_1315:$3d7f7
NesPrgRom:3d7f7:p_1316:
NesPrgRom:3d880:p_1317:
NesPrgRom:3d89a:m_1318:
NesPrgRom:3d8b1:m_1319:
NesPrgRom:3d8d1:p_1320:
NesPrgRom:3d8f1:m_1321:
NesPrgRom:3d90c:p_1322:
NesPrgRom:3d915:p_1323:
NesPrgRom:3d930:p_1324:; ----
NesPrgRom:3d9fc:p_1325:; ----
NesPrgRom:3da03:3da03_1326:
NesPrgRom:3da06:p_1327:; ----
NesPrgRom:3da46:m_1328:
NesPrgRom:3da60:m_1329:
NesPrgRom:3da98:m_1330:
NesPrgRom:3dadc:m_1331:$3daf6
NesPrgRom:3daec:p_1332:$3daf6
NesPrgRom:3daf6:p_1333:
NesPrgRom:3db05:m_1334:
NesPrgRom:3db19:p_1335:$3db27
NesPrgRom:3db21:p_1336:
NesPrgRom:3db45:p_1337:
NesPrgRom:3db4a:p_1338:
NesPrgRom:3db4f:p_1339:;; --------------------------------
NesPrgRom:3dbb9:p_1340:
NesPrgRom:3dc04:p_1341:
NesPrgRom:3dc1e:p_1342:
NesPrgRom:3dc36:p_1343:
NesPrgRom:3dc50:p_1344:
NesPrgRom:3dc82:p_1345:$3dc8a
NesPrgRom:3dc8a:p_1346:; ----\\n;; This runs once a warp/teleport location is selected
NesPrgRom:3dca9:p_1347:holding pattern
NesPrgRom:3dcd2:m_1349:
NesPrgRom:3dce8:m_1350:
NesPrgRom:3dd1d:m_1351:
NesPrgRom:3dd3a:m_1352:
NesPrgRom:3dd44:m_1353:
NesPrgRom:3dd53:p_1354:$3dd44
NesPrgRom:3dd88:m_1355:
NesPrgRom:3dddd:p_1356:
NesPrgRom:3de2f:m_1357:
NesPrgRom:3de86:m_1358:
NesPrgRom:3df47:m_1359:
NesPrgRom:3dfd6:m_1360:
NesPrgRom:3e026:p_1361:; ----
NesPrgRom:3e061:p_1362:; ----
NesPrgRom:3e079:m_1363:
NesPrgRom:3e0d8:p_1364:; ----\\n; Load the NpcData table for the current location\\n; Looks like this is checking whether to spawn a new enemy\\n; in an empty slot?
NesPrgRom:3e0f5:p_1365:e.g. if NpcData[$6c] is $0000
NesPrgRom:3e0fd:m_1366:
NesPrgRom:3e11e:p_1367:; ----
NesPrgRom:3e142:p_1368:; ----
NesPrgRom:3e14a:p_1369:; Load the NpcData table for the current location
NesPrgRom:3e169:p_1370:$3e1ae rts bail out if no table entry
NesPrgRom:3e174:p_1371:y=1
NesPrgRom:3e18f:CheckForNpcSpawn:npc[0] == $ff => break out of loop
NesPrgRom:3e1a7:p_1373:; ----\\n$3e1b6
NesPrgRom:3e1af:p_1374:; ----\\n; This appears to just skip the NPC entirely - a comment?
NesPrgRom:3e22a:m_1375:
NesPrgRom:3e264:p_1376:
NesPrgRom:3e2ce:m_1377:
NesPrgRom:3e307:p_1378:no-op
NesPrgRom:3e311:p_1379:
NesPrgRom:3e323:p_1380:why 8? seems backwards
NesPrgRom:3e32f:p_1381:
NesPrgRom:3e35c:p_1382:;; --------------------------------
NesPrgRom:3e39c:p_1383:; Check for the three invisible chests
NesPrgRom:3e3b0:p_1384:; ----
NesPrgRom:3e406:p_1385:; the high 3 bytes of the entrance triggers a jump table?
NesPrgRom:3e46e:m_1386:
NesPrgRom:3e489:p_1387:; Clear out the nametable write buffer (note that any\\n; unfinished writes will be lost).
NesPrgRom:3e48d:m_1388:
NesPrgRom:3e49e:m_1389:
NesPrgRom:3e4c3:m_1390:
NesPrgRom:3e4ef:p_1391:8000 -> 34000
NesPrgRom:3e4fe:p_1392:a000 -> 2e000
NesPrgRom:3e520:m_1393:
NesPrgRom:3e544:ExitTypeJump_3_Pit:8000 -> 34000
NesPrgRom:3e573:FallIntoPit:; ----\\n; Loads the pits table into $20,x
NesPrgRom:3e57b:m_1396:
NesPrgRom:3e581:m_1397:$20,x <- element; x starts at zero
NesPrgRom:3e5e2:p_1398:
NesPrgRom:3e603:p_1399:; ----
NesPrgRom:3e61f:m_1400:
NesPrgRom:3e657:m_1401:
NesPrgRom:3e65e:m_1402:; Now load the map rows aligned to 8 bytes.\\njust loaded up a few instructions ago [1]
NesPrgRom:3e663:m_1403:
NesPrgRom:3e67d:m_1404:
NesPrgRom:3e69e:p_1405:; ----
NesPrgRom:3e6af:m_1406:
NesPrgRom:3e70d:m_1407:
NesPrgRom:3e72e:p_1408:cccc.ddd
NesPrgRom:3e756:p_1409:; ----
NesPrgRom:3e7b9:p_1410:; ----\\n; Currently riding dolphin - "spawn" dolphin at player's position
NesPrgRom:3e85b:m_1411:
NesPrgRom:3e861:m_1412:
NesPrgRom:3e865:m_1413:
NesPrgRom:3e903:p_1414:; ----
NesPrgRom:3e930:m_1415:
NesPrgRom:3e948:p_1416:
NesPrgRom:3e961:p_1417:$3e968
NesPrgRom:3e968:p_1418:$3e971
NesPrgRom:3e971:p_1419:
NesPrgRom:3e979:p_1420:$3e986
NesPrgRom:3e981:p_1421:$3e986
NesPrgRom:3e986:p_1422:
NesPrgRom:3e988:p_1423:
NesPrgRom:3e98a:m_1424:
NesPrgRom:3e9a5:m_1425:
NesPrgRom:3e9be:p_1426:; ----\\n; looks like we're comparing the player's position to the screen,\\n; fencing Y between #$68 and #$78, unless $7d7 is negative (???)
NesPrgRom:3e9c7:p_1427:
NesPrgRom:3e9d5:p_1428:
NesPrgRom:3e9da:p_1429:$3e9e5
NesPrgRom:3e9e5:p_1430:
NesPrgRom:3e9f8:p_1431:
NesPrgRom:3e9fd:p_1432:; ----
NesPrgRom:3e9fe:p_1433:; ----
NesPrgRom:3ea0e:p_1434:
NesPrgRom:3ea1f:p_1435:$3ea2e
NesPrgRom:3ea2c:p_1436:
NesPrgRom:3ea2e:p_1437:;; --------------------------------
NesPrgRom:3ea3a:p_1438:$3ea40
NesPrgRom:3ea40:p_1439:;; --------------------------------
NesPrgRom:3ea6a:p_1440:
NesPrgRom:3ea7f:p_1441:$3ea91
NesPrgRom:3ea91:p_1442:$3eaa1
NesPrgRom:3eaa1:p_1443:$3eab9
NesPrgRom:3eab8:p_1444:; ----
NesPrgRom:3eab9:p_1445:$3b <-#$08
NesPrgRom:3eac8:p_1446:$3eade
NesPrgRom:3eade:p_1447:;; --------------------------------
NesPrgRom:3eaee:p_1448:; ----
NesPrgRom:3eafa:m_1449:
NesPrgRom:3eb34:m_1450:
NesPrgRom:3eb50:p_1451:
NesPrgRom:3eb9c:p_1452:
NesPrgRom:3ebef:m_1453:; At this point,\\n;   ($10),y points to the 16-byte row of metatile IDs to load (PRG $0000..$ffff)\\n;   ($23),y maps metatile ID to alternatives in $13e00..$13fff\\n;   $13 indicates how many tiles are needed (if the corner is on the\\n;       right hand half of a metatile, we need an extra one, though\\n;       how does this not clobber the first tile we wrote?).\\n;   y is somewhere between 0 and $10, corresponding to the corner.\\n;   x is twice y.\\n; Now we loop and write a metatile ID into alternating bytes of $6000.\\n; A later routine will go back and translate these to actual patterns.
NesPrgRom:3ec11:p_1455:8000 -> a000
NesPrgRom:3ec5c:p_1456:;; --------------------------------
NesPrgRom:3ec9a:p_1457:
NesPrgRom:3ecac:p_1458:$3ecb2
NesPrgRom:3ecb2:p_1459:
NesPrgRom:3ecf5:m_1460:
NesPrgRom:3ed1d:p_1461:8000 -> 10000
NesPrgRom:3ed9e:p_1462:; ----\\ntemp store y
NesPrgRom:3edb7:p_1463:
NesPrgRom:3edc6:m_1464:
NesPrgRom:3edf6:p_1465:; ----\\n$a000 -> $12000
NesPrgRom:3ee42:p_1466:; ----\\n$a000 -> $12000
NesPrgRom:3ee80:MapTilesToAttributesForVerticalScroll:
NesPrgRom:3eea4:MapTilesToAttributesForHorizontalScroll:
NesPrgRom:3eede:m_1469:$3eee6
NesPrgRom:3eee6:p_1470:
NesPrgRom:3ef63:p_1471:
NesPrgRom:3ef77:p_1472:
NesPrgRom:3ef8c:p_1473:; ----
NesPrgRom:3ef9c:p_1474:
NesPrgRom:3efa6:m_1475:
NesPrgRom:3efdb:p_1476:
NesPrgRom:3f03e:p_1477:Psycho Armor
NesPrgRom:3f05f:p_1478:
NesPrgRom:3f068:p_1479:$3f089
NesPrgRom:3f089:p_1480:$3f09b
NesPrgRom:3f09b:p_1481:
NesPrgRom:3f0b5:m_1482:
NesPrgRom:3f121:m_1483:2fe00
NesPrgRom:3f142:m_1484:
NesPrgRom:3f1a5:m_1485:
NesPrgRom:3f1e4:m_1486:
NesPrgRom:3f21b:m_1487:
NesPrgRom:3f254:m_1488:
NesPrgRom:3f287:m_1489:
NesPrgRom:3f2b3:m_1490:$3f2b3
NesPrgRom:3f2b8:m_1491:$3f2b8
NesPrgRom:3f308:m_1492:
NesPrgRom:3f317:m_1493:
NesPrgRom:3f33e:m_1494:
NesPrgRom:3f397:p_1495:8000 -> 24000
NesPrgRom:3f3a4:m_1496:
NesPrgRom:3f3c6:p_1497:
NesPrgRom:3f3c8:p_1498:push y
NesPrgRom:3f3f6:p_1499:; If $51 is 7 or 9, then copy $[8ace]3 into $07d[89ab] instead.\\n; This is the map position of object $13, whatever that is.
NesPrgRom:3f40a:p_1500:; Back to the main line - always write nametables and palettes.
NesPrgRom:3f451:KillSomeCycles:$3f451
NesPrgRom:3f4db:p_1502:
NesPrgRom:3f527:p_1503:
NesPrgRom:3f529:p_1504:
NesPrgRom:3f58b:p_1505:; ----
NesPrgRom:3f60e:IRQCallback_05:
NesPrgRom:3f6df:p_1507:; ----
NesPrgRom:3f76e:p_1508:;; --------------------------------
NesPrgRom:3f7aa:p_1509:; ----
NesPrgRom:3f82b:p_1510:
NesPrgRom:3f832:p_1511:
NesPrgRom:3f843:p_1512:$3f866
NesPrgRom:3f858:m_1513:Seems to be progressing something.
NesPrgRom:3f866:p_1514:
NesPrgRom:3f8d0:p_1515:; ----
NesPrgRom:3fe09:m_1516:
NesPrgRom:3fe20:m_1517:
NesPrgRom:3fe82:loop_1518:result of controller read
NesPrgRom:3fea3:p_1519:$3fea8
NesPrgRom:3fea8:p_1520:
NesPrgRom:3feb8:p_1521:$3fec6
NesPrgRom:3fec6:p_1522:0 or #$80 (every 32nd frame of B)
NesPrgRom:3fee2:m_1523:
NesPrgRom:3fef7:p_1524:
NesPrgRom:3ff0f:p_1525:
NesPrgRom:3ff17:ReadControllerX:; ----\\n; Repeatedly read they joystick to work around DMC DMA bug
NesPrgRom:3ff36:m_1527:
NesPrgRom:3ff3e:p_1528:clears carry
NesPrgRom:0-f:MapScreen_00:
NesPrgRom:100-10f:MapScreen_01:
NesPrgRom:200-20f:MapScreen_02:
NesPrgRom:300-30f:MapScreen_03:
NesPrgRom:400-40f:MapScreen_04:
NesPrgRom:500-50f:MapScreen_05:
NesPrgRom:600-60f:MapScreen_06:
NesPrgRom:700-70f:MapScreen_07:
NesPrgRom:800-80f:MapScreen_08:
NesPrgRom:900-90f:MapScreen_09:
NesPrgRom:a00-a0f:MapScreen_0A:
NesPrgRom:b00-b0f:MapScreen_0B:
NesPrgRom:c00-c0f:MapScreen_0C:
NesPrgRom:d00-d0f:MapScreen_0D:
NesPrgRom:e00-e0f:MapScreen_0E:
NesPrgRom:f00-f0f:MapScreen_0F:
NesPrgRom:1000-100f:MapScreen_10:
NesPrgRom:1100-110f:MapScreen_11:
NesPrgRom:1200-120f:MapScreen_12:
NesPrgRom:1300-130f:MapScreen_13:
NesPrgRom:1400-140f:MapScreen_14:
NesPrgRom:1500-150f:MapScreen_15:
NesPrgRom:1600-160f:MapScreen_16:
NesPrgRom:1700-170f:MapScreen_17:
NesPrgRom:1800-180f:MapScreen_18:
NesPrgRom:1900-190f:MapScreen_19:
NesPrgRom:1a00-1a0f:MapScreen_1A:
NesPrgRom:1b00-1b0f:MapScreen_1B:
NesPrgRom:1c00-1c0f:MapScreen_1C:
NesPrgRom:1d00-1d0f:MapScreen_1D:
NesPrgRom:1e00-1e0f:MapScreen_1E:
NesPrgRom:1f00-1f0f:MapScreen_1F:
NesPrgRom:2000-200f:MapScreen_20:
NesPrgRom:2100-210f:MapScreen_21:
NesPrgRom:2200-220f:MapScreen_22:
NesPrgRom:2300-230f:MapScreen_23:
NesPrgRom:2400-240f:MapScreen_24:
NesPrgRom:2500-250f:MapScreen_25:
NesPrgRom:2600-260f:MapScreen_26:
NesPrgRom:2700-270f:MapScreen_27:
NesPrgRom:2800-280f:MapScreen_28:
NesPrgRom:2900-290f:MapScreen_29:
NesPrgRom:2a00-2a0f:MapScreen_2A:
NesPrgRom:2b00-2b0f:MapScreen_2B:
NesPrgRom:2c00-2c0f:MapScreen_2C:
NesPrgRom:2d00-2d0f:MapScreen_2D:
NesPrgRom:2e00-2e0f:MapScreen_2E:
NesPrgRom:2f00-2f0f:MapScreen_2F:
NesPrgRom:3000-300f:MapScreen_30:
NesPrgRom:3100-310f:MapScreen_31:
NesPrgRom:3200-320f:MapScreen_32:
NesPrgRom:3300-330f:MapScreen_33:
NesPrgRom:3400-340f:MapScreen_34:
NesPrgRom:3500-350f:MapScreen_35:
NesPrgRom:3600-360f:MapScreen_36:
NesPrgRom:3700-370f:MapScreen_37:
NesPrgRom:3800-380f:MapScreen_38:
NesPrgRom:3900-390f:MapScreen_39:
NesPrgRom:3a00-3a0f:MapScreen_3A:
NesPrgRom:3b00-3b0f:MapScreen_3B:
NesPrgRom:3c00-3c0f:MapScreen_3C:
NesPrgRom:3d00-3d0f:MapScreen_3D:
NesPrgRom:3e00-3e0f:MapScreen_3E:
NesPrgRom:3f00-3f0f:MapScreen_3F:
NesPrgRom:4000-400f:MapScreen_40:
NesPrgRom:40f0-40f3:Palette_00:
NesPrgRom:40f4-40f7:Palette_01:
NesPrgRom:40f8-40fb:Palette_02:
NesPrgRom:40fc-40ff:Palette_03:
NesPrgRom:4100-410f:MapScreen_41:
NesPrgRom:41f0-41f3:Palette_04:
NesPrgRom:41f4-41f7:Palette_05:
NesPrgRom:41f8-41fb:Palette_06:
NesPrgRom:41fc-41ff:Palette_07:
NesPrgRom:4200-420f:MapScreen_42:
NesPrgRom:42f0-42f3:Palette_08:
NesPrgRom:42f4-42f7:Palette_09:
NesPrgRom:42f8-42fb:Palette_0A:
NesPrgRom:42fc-42ff:Palette_0B:
NesPrgRom:4300-430f:MapScreen_43:
NesPrgRom:43f0-43f3:Palette_0C:
NesPrgRom:43f4-43f7:Palette_0D:
NesPrgRom:43f8-43fb:Palette_0E:
NesPrgRom:43fc-43ff:Palette_0F:
NesPrgRom:4400-440f:MapScreen_44:
NesPrgRom:44f0-44f3:Palette_10:
NesPrgRom:44f4-44f7:Palette_11:
NesPrgRom:44f8-44fb:Palette_12:
NesPrgRom:44fc-44ff:Palette_13:
NesPrgRom:4500-450f:MapScreen_45:
NesPrgRom:45f0-45f3:Palette_14:
NesPrgRom:45f4-45f7:Palette_15:
NesPrgRom:45f8-45fb:Palette_16:
NesPrgRom:45fc-45ff:Palette_17:
NesPrgRom:4600-460f:MapScreen_46:
NesPrgRom:46f0-46f3:Palette_18:
NesPrgRom:46f4-46f7:Palette_19:
NesPrgRom:46f8-46fb:Palette_1A:
NesPrgRom:46fc-46ff:Palette_1B:
NesPrgRom:4700-470f:MapScreen_47:
NesPrgRom:47f0-47f3:Palette_1C:
NesPrgRom:47f4-47f7:Palette_1D:
NesPrgRom:47f8-47fb:Palette_1E:
NesPrgRom:47fc-47ff:Palette_1F:
NesPrgRom:4800-480f:MapScreen_48:
NesPrgRom:48f0-48f3:Palette_20:
NesPrgRom:48f4-48f7:Palette_21:
NesPrgRom:48f8-48fb:Palette_22:
NesPrgRom:48fc-48ff:Palette_23:
NesPrgRom:4900-490f:MapScreen_49:
NesPrgRom:49f0-49f3:Palette_24:
NesPrgRom:49f4-49f7:Palette_25:
NesPrgRom:49f8-49fb:Palette_26:
NesPrgRom:49fc-49ff:Palette_27:
NesPrgRom:4a00-4a0f:MapScreen_4A:
NesPrgRom:4af0-4af3:Palette_28:
NesPrgRom:4af4-4af7:Palette_29:
NesPrgRom:4af8-4afb:Palette_2A:
NesPrgRom:4afc-4aff:Palette_2B:
NesPrgRom:4b00-4b0f:MapScreen_4B:
NesPrgRom:4bf0-4bf3:Palette_2C:
NesPrgRom:4bf4-4bf7:Palette_2D:
NesPrgRom:4bf8-4bfb:Palette_2E:
NesPrgRom:4bfc-4bff:Palette_2F:
NesPrgRom:4c00-4c0f:MapScreen_4C:
NesPrgRom:4cf0-4cf3:Palette_30:
NesPrgRom:4cf4-4cf7:Palette_31:
NesPrgRom:4cf8-4cfb:Palette_32:
NesPrgRom:4cfc-4cff:Palette_33:
NesPrgRom:4d00-4d0f:MapScreen_4D:
NesPrgRom:4df0-4df3:Palette_34:
NesPrgRom:4df4-4df7:Palette_35:
NesPrgRom:4df8-4dfb:Palette_36:
NesPrgRom:4dfc-4dff:Palette_37:
NesPrgRom:4e00-4e0f:MapScreen_4E:
NesPrgRom:4ef0-4ef3:Palette_38:
NesPrgRom:4ef4-4ef7:Palette_39:
NesPrgRom:4ef8-4efb:Palette_3A:
NesPrgRom:4efc-4eff:Palette_3B:
NesPrgRom:4f00-4f0f:MapScreen_4F:
NesPrgRom:4ff0-4ff3:Palette_3C:
NesPrgRom:4ff4-4ff7:Palette_3D:
NesPrgRom:4ff8-4ffb:Palette_3E:
NesPrgRom:4ffc-4fff:Palette_3F:
NesPrgRom:5000-500f:MapScreen_50:
NesPrgRom:50f0-50f3:Palette_40:
NesPrgRom:50f4-50f7:Palette_41:
NesPrgRom:50f8-50fb:Palette_42:
NesPrgRom:50fc-50ff:Palette_43:
NesPrgRom:5100-510f:MapScreen_51:
NesPrgRom:51f0-51f3:Palette_44:
NesPrgRom:51f4-51f7:Palette_45:
NesPrgRom:51f8-51fb:Palette_46:
NesPrgRom:51fc-51ff:Palette_47:
NesPrgRom:5200-520f:MapScreen_52:
NesPrgRom:52f0-52f3:Palette_48:
NesPrgRom:52f4-52f7:Palette_49:
NesPrgRom:52f8-52fb:Palette_4A:
NesPrgRom:52fc-52ff:Palette_4B:
NesPrgRom:5300-530f:MapScreen_53:
NesPrgRom:53f0-53f3:Palette_4C:
NesPrgRom:53f4-53f7:Palette_4D:
NesPrgRom:53f8-53fb:Palette_4E:
NesPrgRom:53fc-53ff:Palette_4F:
NesPrgRom:5400-540f:MapScreen_54:
NesPrgRom:54f0-54f3:Palette_50:
NesPrgRom:54f4-54f7:Palette_51:
NesPrgRom:54f8-54fb:Palette_52:
NesPrgRom:54fc-54ff:Palette_53:
NesPrgRom:5500-550f:MapScreen_55:
NesPrgRom:55f0-55f3:Palette_54:
NesPrgRom:55f4-55f7:Palette_55:
NesPrgRom:55f8-55fb:Palette_56:
NesPrgRom:55fc-55ff:Palette_57:
NesPrgRom:5600-560f:MapScreen_56:
NesPrgRom:56f0-56f3:Palette_58:
NesPrgRom:56f4-56f7:Palette_59:
NesPrgRom:56f8-56fb:Palette_5A:
NesPrgRom:56fc-56ff:Palette_5B:
NesPrgRom:5700-570f:MapScreen_57:
NesPrgRom:57f0-57f3:Palette_5C:
NesPrgRom:57f4-57f7:Palette_5D:
NesPrgRom:57f8-57fb:Palette_5E:
NesPrgRom:57fc-57ff:Palette_5F:
NesPrgRom:5800-580f:MapScreen_58:
NesPrgRom:58f0-58f3:Palette_60:
NesPrgRom:58f4-58f7:Palette_61:
NesPrgRom:58f8-58fb:Palette_62:
NesPrgRom:58fc-58ff:Palette_63:
NesPrgRom:5900-590f:MapScreen_59:
NesPrgRom:59f0-59f3:Palette_64:
NesPrgRom:59f4-59f7:Palette_65:
NesPrgRom:59f8-59fb:Palette_66:
NesPrgRom:59fc-59ff:Palette_67:
NesPrgRom:5a00-5a0f:MapScreen_5A:
NesPrgRom:5af0-5af3:Palette_68:
NesPrgRom:5af4-5af7:Palette_69:
NesPrgRom:5af8-5afb:Palette_6A:
NesPrgRom:5afc-5aff:Palette_6B:
NesPrgRom:5b00-5b0f:MapScreen_5B:
NesPrgRom:5bf0-5bf3:Palette_6C:
NesPrgRom:5bf4-5bf7:Palette_6D:
NesPrgRom:5bf8-5bfb:Palette_6E:
NesPrgRom:5bfc-5bff:Palette_6F:
NesPrgRom:5c00-5c0f:MapScreen_5C:
NesPrgRom:5cf0-5cf3:Palette_70:
NesPrgRom:5cf4-5cf7:Palette_71:
NesPrgRom:5cf8-5cfb:Palette_72:
NesPrgRom:5cfc-5cff:Palette_73:
NesPrgRom:5d00-5d0f:MapScreen_5D:
NesPrgRom:5df0-5df3:Palette_74:
NesPrgRom:5df4-5df7:Palette_75:
NesPrgRom:5df8-5dfb:Palette_76:
NesPrgRom:5dfc-5dff:Palette_77:
NesPrgRom:5e00-5e0f:MapScreen_5E:
NesPrgRom:5ef0-5ef3:Palette_78:
NesPrgRom:5ef4-5ef7:Palette_79:
NesPrgRom:5ef8-5efb:Palette_7A:
NesPrgRom:5efc-5eff:Palette_7B:
NesPrgRom:5f00-5f0f:MapScreen_5F:
NesPrgRom:5ff0-5ff3:Palette_7C:
NesPrgRom:5ff4-5ff7:Palette_7D:
NesPrgRom:5ff8-5ffb:Palette_7E:
NesPrgRom:5ffc-5fff:Palette_7F:
NesPrgRom:6000-600f:MapScreen_60:
NesPrgRom:60f0-60f3:Palette_80:
NesPrgRom:60f4-60f7:Palette_81:
NesPrgRom:60f8-60fb:Palette_82:
NesPrgRom:60fc-60ff:Palette_83:
NesPrgRom:6100-610f:MapScreen_61:
NesPrgRom:61f0-61f3:Palette_84:
NesPrgRom:61f4-61f7:Palette_85:
NesPrgRom:61f8-61fb:Palette_86:
NesPrgRom:61fc-61ff:Palette_87:
NesPrgRom:6200-620f:MapScreen_62:
NesPrgRom:62f0-62f3:Palette_88:
NesPrgRom:62f4-62f7:Palette_89:
NesPrgRom:62f8-62fb:Palette_8A:
NesPrgRom:62fc-62ff:Palette_8B:
NesPrgRom:6300-630f:MapScreen_63:
NesPrgRom:63f0-63f3:Palette_8C:
NesPrgRom:63f4-63f7:Palette_8D:
NesPrgRom:63f8-63fb:Palette_8E:
NesPrgRom:63fc-63ff:Palette_8F:
NesPrgRom:6400-640f:MapScreen_64:
NesPrgRom:64f0-64f3:Palette_90:
NesPrgRom:64f4-64f7:Palette_91:
NesPrgRom:64f8-64fb:Palette_92:
NesPrgRom:64fc-64ff:Palette_93:
NesPrgRom:6500-650f:MapScreen_65:
NesPrgRom:65f0-65f3:Palette_94:
NesPrgRom:65f4-65f7:Palette_95:
NesPrgRom:65f8-65fb:Palette_96:
NesPrgRom:65fc-65ff:Palette_97:
NesPrgRom:6600-660f:MapScreen_66:
NesPrgRom:66f0-66f3:Palette_98:
NesPrgRom:66f4-66f7:Palette_99:
NesPrgRom:66f8-66fb:Palette_9A:
NesPrgRom:66fc-66ff:Palette_9B:
NesPrgRom:6700-670f:MapScreen_67:
NesPrgRom:67f0-67f3:Palette_9C:
NesPrgRom:67f4-67f7:Palette_9D:
NesPrgRom:67f8-67fb:Palette_9E:
NesPrgRom:67fc-67ff:Palette_9F:
NesPrgRom:6800-680f:MapScreen_68:
NesPrgRom:68f0-68f3:Palette_A0:
NesPrgRom:68f4-68f7:Palette_A1:
NesPrgRom:68f8-68fb:Palette_A2:
NesPrgRom:68fc-68ff:Palette_A3:
NesPrgRom:6900-690f:MapScreen_69:
NesPrgRom:69f0-69f3:Palette_A4:
NesPrgRom:69f4-69f7:Palette_A5:
NesPrgRom:69f8-69fb:Palette_A6:
NesPrgRom:69fc-69ff:Palette_A7:
NesPrgRom:6a00-6a0f:MapScreen_6A:
NesPrgRom:6af0-6af3:Palette_A8:
NesPrgRom:6af4-6af7:Palette_A9:
NesPrgRom:6af8-6afb:Palette_AA:
NesPrgRom:6afc-6aff:Palette_AB:
NesPrgRom:6b00-6b0f:MapScreen_6B:
NesPrgRom:6bf0-6bf3:Palette_AC:
NesPrgRom:6bf4-6bf7:Palette_AD:
NesPrgRom:6bf8-6bfb:Palette_AE:
NesPrgRom:6bfc-6bff:Palette_AF:
NesPrgRom:6c00-6c0f:MapScreen_6C:
NesPrgRom:6cf0-6cf3:Palette_B0:
NesPrgRom:6cf4-6cf7:Palette_B1:
NesPrgRom:6cf8-6cfb:Palette_B2:
NesPrgRom:6cfc-6cff:Palette_B3:
NesPrgRom:6d00-6d0f:MapScreen_6D:
NesPrgRom:6df0-6df3:Palette_B4:
NesPrgRom:6df4-6df7:Palette_B5:
NesPrgRom:6df8-6dfb:Palette_B6:
NesPrgRom:6dfc-6dff:Palette_B7:
NesPrgRom:6e00-6e0f:MapScreen_6E:
NesPrgRom:6ef0-6ef3:Palette_B8:
NesPrgRom:6ef4-6ef7:Palette_B9:
NesPrgRom:6ef8-6efb:Palette_BA:
NesPrgRom:6efc-6eff:Palette_BB:
NesPrgRom:6f00-6f0f:MapScreen_6F:
NesPrgRom:6ff0-6ff3:Palette_BC:
NesPrgRom:6ff4-6ff7:Palette_BD:
NesPrgRom:6ff8-6ffb:Palette_BE:
NesPrgRom:6ffc-6fff:Palette_BF:
NesPrgRom:7000-700f:MapScreen_70:
NesPrgRom:70f0-70f3:Palette_C0:
NesPrgRom:70f4-70f7:Palette_C1:
NesPrgRom:70f8-70fb:Palette_C2:
NesPrgRom:70fc-70ff:Palette_C3:
NesPrgRom:7100-710f:MapScreen_71:
NesPrgRom:71f0-71f3:Palette_C4:
NesPrgRom:71f4-71f7:Palette_C5:
NesPrgRom:71f8-71fb:Palette_C6:
NesPrgRom:71fc-71ff:Palette_C7:
NesPrgRom:7200-720f:MapScreen_72:
NesPrgRom:72f0-72f3:Palette_C8:
NesPrgRom:72f4-72f7:Palette_C9:
NesPrgRom:72f8-72fb:Palette_CA:
NesPrgRom:72fc-72ff:Palette_CB:
NesPrgRom:7300-730f:MapScreen_73:
NesPrgRom:73f0-73f3:Palette_CC:
NesPrgRom:73f4-73f7:Palette_CD:
NesPrgRom:73f8-73fb:Palette_CE:
NesPrgRom:73fc-73ff:Palette_CF:
NesPrgRom:7400-740f:MapScreen_74:
NesPrgRom:74f0-74f3:Palette_D0:
NesPrgRom:74f4-74f7:Palette_D1:
NesPrgRom:74f8-74fb:Palette_D2:
NesPrgRom:74fc-74ff:Palette_D3:
NesPrgRom:7500-750f:MapScreen_75:
NesPrgRom:75f0-75f3:Palette_D4:
NesPrgRom:75f4-75f7:Palette_D5:
NesPrgRom:75f8-75fb:Palette_D6:
NesPrgRom:75fc-75ff:Palette_D7:
NesPrgRom:7600-760f:MapScreen_76:
NesPrgRom:76f0-76f3:Palette_D8:
NesPrgRom:76f4-76f7:Palette_D9:
NesPrgRom:76f8-76fb:Palette_DA:
NesPrgRom:76fc-76ff:Palette_DB:
NesPrgRom:7700-770f:MapScreen_77:
NesPrgRom:77f0-77f3:Palette_DC:
NesPrgRom:77f4-77f7:Palette_DD:
NesPrgRom:77f8-77fb:Palette_DE:
NesPrgRom:77fc-77ff:Palette_DF:
NesPrgRom:7800-780f:MapScreen_78:
NesPrgRom:78f0-78f3:Palette_E0:
NesPrgRom:78f4-78f7:Palette_E1:
NesPrgRom:78f8-78fb:Palette_E2:
NesPrgRom:78fc-78ff:Palette_E3:
NesPrgRom:7900-790f:MapScreen_79:
NesPrgRom:79f0-79f3:Palette_E4:
NesPrgRom:79f4-79f7:Palette_E5:
NesPrgRom:79f8-79fb:Palette_E6:
NesPrgRom:79fc-79ff:Palette_E7:
NesPrgRom:7a00-7a0f:MapScreen_7A:
NesPrgRom:7af0-7af3:Palette_E8:
NesPrgRom:7af4-7af7:Palette_E9:
NesPrgRom:7af8-7afb:Palette_EA:
NesPrgRom:7afc-7aff:Palette_EB:
NesPrgRom:7b00-7b0f:MapScreen_7B:
NesPrgRom:7bf0-7bf3:Palette_EC:
NesPrgRom:7bf4-7bf7:Palette_ED:
NesPrgRom:7bf8-7bfb:Palette_EE:
NesPrgRom:7bfc-7bff:Palette_EF:
NesPrgRom:7c00-7c0f:MapScreen_7C:
NesPrgRom:7cf0-7cf3:Palette_F0:
NesPrgRom:7cf4-7cf7:Palette_F1:
NesPrgRom:7cf8-7cfb:Palette_F2:
NesPrgRom:7cfc-7cff:Palette_F3:
NesPrgRom:7d00-7d0f:MapScreen_7D:
NesPrgRom:7df0-7df3:Palette_F4:
NesPrgRom:7df4-7df7:Palette_F5:
NesPrgRom:7df8-7dfb:Palette_F6:
NesPrgRom:7dfc-7dff:Palette_F7:
NesPrgRom:7e00-7e0f:MapScreen_7E:
NesPrgRom:7ef0-7ef3:Palette_F8:
NesPrgRom:7ef4-7ef7:Palette_F9:
NesPrgRom:7ef8-7efb:Palette_FA:
NesPrgRom:7efc-7eff:Palette_FB:
NesPrgRom:7f00-7f0f:MapScreen_7F:
NesPrgRom:7ff0-7ff3:Palette_FC:
NesPrgRom:7ff4-7ff7:Palette_FD:
NesPrgRom:7ff8-7ffb:Palette_FE:
NesPrgRom:7ffc-7fff:Palette_FF:
NesPrgRom:8000-800f:MapScreen_80:
NesPrgRom:80f0-80f3:PersonData_00:
NesPrgRom:80f4-80f7:PersonData_01:
NesPrgRom:80f8-80fb:PersonData_02:
NesPrgRom:80fc-80ff:PersonData_03:
NesPrgRom:8100-810f:MapScreen_81:
NesPrgRom:81f0-81f3:PersonData_04:
NesPrgRom:81f4-81f7:PersonData_05:
NesPrgRom:81f8-81fb:PersonData_06:
NesPrgRom:81fc-81ff:PersonData_07:
NesPrgRom:8200-820f:MapScreen_82:
NesPrgRom:82f0-82f3:PersonData_08:
NesPrgRom:82f4-82f7:PersonData_09:
NesPrgRom:82f8-82fb:PersonData_0a:
NesPrgRom:82fc-82ff:PersonData_0b:
NesPrgRom:8300-830f:MapScreen_83:
NesPrgRom:83f0-83f3:PersonData_0c:
NesPrgRom:83f4-83f7:PersonData_0d:
NesPrgRom:83f8-83fb:PersonData_0e:
NesPrgRom:83fc-83ff:PersonData_0f:
NesPrgRom:8400-840f:MapScreen_84:
NesPrgRom:84f0-84f3:PersonData_10:
NesPrgRom:84f4-84f7:PersonData_11:
NesPrgRom:84f8-84fb:PersonData_12:
NesPrgRom:84fc-84ff:PersonData_13:
NesPrgRom:8500-850f:MapScreen_85:
NesPrgRom:85f0-85f3:PersonData_14:
NesPrgRom:85f4-85f7:PersonData_15:
NesPrgRom:85f8-85fb:PersonData_16:
NesPrgRom:85fc-85ff:PersonData_17:
NesPrgRom:8600-860f:MapScreen_86:
NesPrgRom:86f0-86f3:PersonData_18:
NesPrgRom:86f4-86f7:PersonData_19:
NesPrgRom:86f8-86fb:PersonData_1a:
NesPrgRom:86fc-86ff:PersonData_1b:
NesPrgRom:8700-870f:MapScreen_87:
NesPrgRom:87f0-87f3:PersonData_1c:
NesPrgRom:87f4-87f7:PersonData_1d:
NesPrgRom:87f8-87fb:PersonData_1e:
NesPrgRom:87fc-87ff:PersonData_1f:
NesPrgRom:8800-880f:MapScreen_88:
NesPrgRom:88f0-88f3:PersonData_20:
NesPrgRom:88f4-88f7:PersonData_21:
NesPrgRom:88f8-88fb:PersonData_22:
NesPrgRom:88fc-88ff:PersonData_23:
NesPrgRom:8900-890f:MapScreen_89:
NesPrgRom:89f0-89f3:PersonData_24:
NesPrgRom:89f4-89f7:PersonData_25:
NesPrgRom:89f8-89fb:PersonData_26:
NesPrgRom:89fc-89ff:PersonData_27:
NesPrgRom:8a00-8a0f:MapScreen_8A:
NesPrgRom:8af0-8af3:PersonData_28:
NesPrgRom:8af4-8af7:PersonData_29:
NesPrgRom:8af8-8afb:PersonData_2a:
NesPrgRom:8afc-8aff:PersonData_2b:
NesPrgRom:8b00-8b0f:MapScreen_8B:
NesPrgRom:8bf0-8bf3:PersonData_2c:
NesPrgRom:8bf4-8bf7:PersonData_2d:
NesPrgRom:8bf8-8bfb:PersonData_2e:
NesPrgRom:8bfc-8bff:PersonData_2f:
NesPrgRom:8c00-8c0f:MapScreen_8C:
NesPrgRom:8cf0-8cf3:PersonData_30:
NesPrgRom:8cf4-8cf7:PersonData_31:
NesPrgRom:8cf8-8cfb:PersonData_32:
NesPrgRom:8cfc-8cff:PersonData_33:
NesPrgRom:8d00-8d0f:MapScreen_8D:
NesPrgRom:8df0-8df3:PersonData_34:
NesPrgRom:8df4-8df7:PersonData_35:
NesPrgRom:8df8-8dfb:PersonData_36:
NesPrgRom:8dfc-8dff:PersonData_37:
NesPrgRom:8e00-8e0f:MapScreen_8E:
NesPrgRom:8ef0-8ef3:PersonData_38:
NesPrgRom:8ef4-8ef7:PersonData_39:
NesPrgRom:8ef8-8efb:PersonData_3a:
NesPrgRom:8efc-8eff:PersonData_3b:
NesPrgRom:8f00-8f0f:MapScreen_8F:
NesPrgRom:8ff0-8ff3:PersonData_3c:
NesPrgRom:8ff4-8ff7:PersonData_3d:
NesPrgRom:8ff8-8ffb:PersonData_3e:
NesPrgRom:8ffc-8fff:PersonData_3f:
NesPrgRom:9000-900f:MapScreen_90:
NesPrgRom:90f0-90f3:PersonData_40:
NesPrgRom:90f4-90f7:PersonData_41:
NesPrgRom:90f8-90fb:PersonData_42:
NesPrgRom:90fc-90ff:PersonData_43:
NesPrgRom:9100-910f:MapScreen_91:
NesPrgRom:91f0-91f3:PersonData_44:
NesPrgRom:91f4-91f7:PersonData_45:
NesPrgRom:91f8-91fb:PersonData_46:
NesPrgRom:91fc-91ff:PersonData_47:
NesPrgRom:9200-920f:MapScreen_92:
NesPrgRom:92f0-92f3:PersonData_48:
NesPrgRom:92f4-92f7:PersonData_49:
NesPrgRom:92f8-92fb:PersonData_4a:
NesPrgRom:92fc-92ff:PersonData_4b:
NesPrgRom:9300-930f:MapScreen_93:
NesPrgRom:93f0-93f3:PersonData_4c:
NesPrgRom:93f4-93f7:PersonData_4d:
NesPrgRom:93f8-93fb:PersonData_4e:
NesPrgRom:93fc-93ff:PersonData_4f:
NesPrgRom:9400-940f:MapScreen_94:
NesPrgRom:94f0-94f3:PersonData_50:
NesPrgRom:94f4-94f7:PersonData_51:
NesPrgRom:94f8-94fb:PersonData_52:
NesPrgRom:94fc-94ff:PersonData_53:
NesPrgRom:9500-950f:MapScreen_95:
NesPrgRom:95f0-95f3:PersonData_54:
NesPrgRom:95f4-95f7:PersonData_55:
NesPrgRom:95f8-95fb:PersonData_56:
NesPrgRom:95fc-95ff:PersonData_57:
NesPrgRom:9600-960f:MapScreen_96:
NesPrgRom:96f0-96f3:PersonData_58:
NesPrgRom:96f4-96f7:PersonData_59:
NesPrgRom:96f8-96fb:PersonData_5a:
NesPrgRom:96fc-96ff:PersonData_5b:
NesPrgRom:9700-970f:MapScreen_97:
NesPrgRom:97f0-97f3:PersonData_5c:
NesPrgRom:97f4-97f7:PersonData_5d:
NesPrgRom:97f8-97fb:PersonData_5e:
NesPrgRom:97fc-97ff:PersonData_5f:
NesPrgRom:9800-980f:MapScreen_98:
NesPrgRom:98f0-98f3:PersonData_60:
NesPrgRom:98f4-98f7:PersonData_61:
NesPrgRom:98f8-98fb:PersonData_62:
NesPrgRom:98fc-98ff:PersonData_63:
NesPrgRom:9900-990f:MapScreen_99:
NesPrgRom:99f0-99f3:PersonData_64:
NesPrgRom:99f4-99f7:PersonData_65:
NesPrgRom:99f8-99fb:PersonData_66:
NesPrgRom:99fc-99ff:PersonData_67:
NesPrgRom:9a00-9a0f:MapScreen_9A:
NesPrgRom:9af0-9af3:PersonData_68:
NesPrgRom:9af4-9af7:PersonData_69:
NesPrgRom:9af8-9afb:PersonData_6a:
NesPrgRom:9afc-9aff:PersonData_6b:
NesPrgRom:9b00-9b0f:MapScreen_9B:
NesPrgRom:9bf0-9bf3:PersonData_6c:
NesPrgRom:9bf4-9bf7:PersonData_6d:
NesPrgRom:9bf8-9bfb:PersonData_6e:
NesPrgRom:9bfc-9bff:PersonData_6f:
NesPrgRom:9c00-9c0f:MapScreen_9C:
NesPrgRom:9cf0-9cf3:PersonData_70:
NesPrgRom:9cf4-9cf7:PersonData_71:
NesPrgRom:9cf8-9cfb:PersonData_72:
NesPrgRom:9cfc-9cff:PersonData_73:
NesPrgRom:9d00-9d0f:MapScreen_9D:
NesPrgRom:9df0-9df3:PersonData_74:
NesPrgRom:9df4-9df7:PersonData_75:
NesPrgRom:9df8-9dfb:PersonData_76:
NesPrgRom:9dfc-9dff:PersonData_77:
NesPrgRom:9e00-9e0f:MapScreen_9E:
NesPrgRom:9ef0-9ef3:PersonData_78:
NesPrgRom:9ef4-9ef7:PersonData_79:
NesPrgRom:9ef8-9efb:PersonData_7a:
NesPrgRom:9efc-9eff:PersonData_7b:
NesPrgRom:9f00-9f0f:MapScreen_9F:
NesPrgRom:9ff0-9ff3:PersonData_7c:
NesPrgRom:9ff4-9ff7:PersonData_7d:
NesPrgRom:9ff8-9ffb:PersonData_7e:
NesPrgRom:9ffc-9fff:PersonData_7f:
NesPrgRom:a000-a00f:MapScreen_A0:
NesPrgRom:a0f0-a0f3:PersonData_80:
NesPrgRom:a0f4-a0f7:PersonData_81:
NesPrgRom:a0f8-a0fb:PersonData_82:
NesPrgRom:a0fc-a0ff:PersonData_83:
NesPrgRom:a100-a10f:MapScreen_A1:
NesPrgRom:a1f0-a1f3:PersonData_84:
NesPrgRom:a1f4-a1f7:PersonData_85:
NesPrgRom:a1f8-a1fb:PersonData_86:
NesPrgRom:a1fc-a1ff:PersonData_87:
NesPrgRom:a200-a20f:MapScreen_A2:
NesPrgRom:a2f0-a2f3:PersonData_88:
NesPrgRom:a2f4-a2f7:PersonData_89:
NesPrgRom:a2f8-a2fb:PersonData_8a:
NesPrgRom:a2fc-a2ff:PersonData_8b:
NesPrgRom:a300-a30f:MapScreen_A3:
NesPrgRom:a3f0-a3f3:PersonData_8c:
NesPrgRom:a3f4-a3f7:PersonData_8d:
NesPrgRom:a3f8-a3fb:PersonData_8e:
NesPrgRom:a3fc-a3ff:PersonData_8f:
NesPrgRom:a400-a40f:MapScreen_A4:
NesPrgRom:a4f0-a4f3:PersonData_90:
NesPrgRom:a4f4-a4f7:PersonData_91:
NesPrgRom:a4f8-a4fb:PersonData_92:
NesPrgRom:a4fc-a4ff:PersonData_93:
NesPrgRom:a500-a50f:MapScreen_A5:
NesPrgRom:a5f0-a5f3:PersonData_94:
NesPrgRom:a5f4-a5f7:PersonData_95:
NesPrgRom:a5f8-a5fb:PersonData_96:
NesPrgRom:a5fc-a5ff:PersonData_97:
NesPrgRom:a600-a60f:MapScreen_A6:
NesPrgRom:a6f0-a6f3:PersonData_98:
NesPrgRom:a6f4-a6f7:PersonData_99:
NesPrgRom:a6f8-a6fb:PersonData_9a:
NesPrgRom:a6fc-a6ff:PersonData_9b:
NesPrgRom:a700-a70f:MapScreen_A7:
NesPrgRom:a7f0-a7f3:PersonData_9c:
NesPrgRom:a7f4-a7f7:PersonData_9d:
NesPrgRom:a7f8-a7fb:PersonData_9e:
NesPrgRom:a7fc-a7ff:PersonData_9f:
NesPrgRom:a800-a80f:MapScreen_A8:
NesPrgRom:a8f0-a8f3:PersonData_a0:
NesPrgRom:a8f4-a8f7:PersonData_a1:
NesPrgRom:a8f8-a8fb:PersonData_a2:
NesPrgRom:a8fc-a8ff:PersonData_a3:
NesPrgRom:a900-a90f:MapScreen_A9:
NesPrgRom:a9f0-a9f3:PersonData_a4:
NesPrgRom:a9f4-a9f7:PersonData_a5:
NesPrgRom:a9f8-a9fb:PersonData_a6:
NesPrgRom:a9fc-a9ff:PersonData_a7:
NesPrgRom:aa00-aa0f:MapScreen_AA:
NesPrgRom:aaf0-aaf3:PersonData_a8:
NesPrgRom:aaf4-aaf7:PersonData_a9:
NesPrgRom:aaf8-aafb:PersonData_aa:
NesPrgRom:aafc-aaff:PersonData_ab:
NesPrgRom:ab00-ab0f:MapScreen_AB:
NesPrgRom:abf0-abf3:PersonData_ac:
NesPrgRom:abf4-abf7:PersonData_ad:
NesPrgRom:abf8-abfb:PersonData_ae:
NesPrgRom:abfc-abff:PersonData_af:
NesPrgRom:ac00-ac0f:MapScreen_AC:
NesPrgRom:acf0-acf3:PersonData_b0:
NesPrgRom:acf4-acf7:PersonData_b1:
NesPrgRom:acf8-acfb:PersonData_b2:
NesPrgRom:acfc-acff:PersonData_b3:
NesPrgRom:ad00-ad0f:MapScreen_AD:
NesPrgRom:adf0-adf3:PersonData_b4:
NesPrgRom:adf4-adf7:PersonData_b5:
NesPrgRom:adf8-adfb:PersonData_b6:
NesPrgRom:adfc-adff:PersonData_b7:
NesPrgRom:ae00-ae0f:MapScreen_AE:
NesPrgRom:aef0-aef3:PersonData_b8:
NesPrgRom:aef4-aef7:PersonData_b9:
NesPrgRom:aef8-aefb:PersonData_ba:
NesPrgRom:aefc-aeff:PersonData_bb:
NesPrgRom:af00-af0f:MapScreen_AF:
NesPrgRom:aff0-aff3:PersonData_bc:
NesPrgRom:aff4-aff7:PersonData_bd:
NesPrgRom:aff8-affb:PersonData_be:
NesPrgRom:affc-afff:PersonData_bf:
NesPrgRom:b000-b00f:MapScreen_B0:
NesPrgRom:b0f0-b0f3:PersonData_c0:
NesPrgRom:b0f4-b0f7:PersonData_c1:
NesPrgRom:b0f8-b0fb:PersonData_c2:
NesPrgRom:b0fc-b0ff:PersonData_c3:
NesPrgRom:b100-b10f:MapScreen_B1:
NesPrgRom:b1f0-b1f3:PersonData_c4:
NesPrgRom:b1f4-b1f7:PersonData_c5:
NesPrgRom:b1f8-b1fb:PersonData_c6:
NesPrgRom:b1fc-b1ff:PersonData_c7:
NesPrgRom:b200-b20f:MapScreen_B2:
NesPrgRom:b2f0-b2f3:PersonData_c8:
NesPrgRom:b2f4-b2f7:PersonData_c9:
NesPrgRom:b2f8-b2fb:PersonData_ca:
NesPrgRom:b2fc-b2ff:PersonData_cb:
NesPrgRom:b300-b30f:MapScreen_B3:
NesPrgRom:b3f0-b3f3:PersonData_cc:
NesPrgRom:b3f4-b3f7:PersonData_cd:
NesPrgRom:b3f8-b3fb:PersonData_ce:
NesPrgRom:b3fc-b3ff:PersonData_cf:
NesPrgRom:b400-b40f:MapScreen_B4:
NesPrgRom:b4f0-b4f3:PersonData_d0:
NesPrgRom:b4f4-b4f7:PersonData_d1:
NesPrgRom:b4f8-b4fb:PersonData_d2:
NesPrgRom:b4fc-b4ff:PersonData_d3:
NesPrgRom:b500-b50f:MapScreen_B5:
NesPrgRom:b5f0-b5f3:PersonData_d4:
NesPrgRom:b5f4-b5f7:PersonData_d5:
NesPrgRom:b5f8-b5fb:PersonData_d6:
NesPrgRom:b5fc-b5ff:PersonData_d7:
NesPrgRom:b600-b60f:MapScreen_B6:
NesPrgRom:b6f0-b6f3:PersonData_d8:
NesPrgRom:b6f4-b6f7:PersonData_d9:
NesPrgRom:b6f8-b6fb:PersonData_da:
NesPrgRom:b6fc-b6ff:PersonData_db:
NesPrgRom:b700-b70f:MapScreen_B7:
NesPrgRom:b7f0-b7f3:PersonData_dc:
NesPrgRom:b7f4-b7f7:PersonData_dd:
NesPrgRom:b7f8-b7fb:PersonData_de:
NesPrgRom:b7fc-b7ff:PersonData_df:
NesPrgRom:b800-b80f:MapScreen_B8:
NesPrgRom:b8f0-b8f3:PersonData_e0:
NesPrgRom:b8f4-b8f7:PersonData_e1:
NesPrgRom:b8f8-b8fb:PersonData_e2:
NesPrgRom:b8fc-b8ff:PersonData_e3:
NesPrgRom:b900-b90f:MapScreen_B9:
NesPrgRom:b9f0-b9f3:PersonData_e4:
NesPrgRom:b9f4-b9f7:PersonData_e5:
NesPrgRom:b9f8-b9fb:PersonData_e6:
NesPrgRom:b9fc-b9ff:PersonData_e7:
NesPrgRom:ba00-ba0f:MapScreen_BA:
NesPrgRom:baf0-baf3:PersonData_e8:
NesPrgRom:baf4-baf7:PersonData_e9:
NesPrgRom:baf8-bafb:PersonData_ea:
NesPrgRom:bafc-baff:PersonData_eb:
NesPrgRom:bb00-bb0f:MapScreen_BB:
NesPrgRom:bbf0-bbf3:PersonData_ec:
NesPrgRom:bbf4-bbf7:PersonData_ed:
NesPrgRom:bbf8-bbfb:PersonData_ee:
NesPrgRom:bbfc-bbff:PersonData_ef:
NesPrgRom:bc00-bc0f:MapScreen_BC:
NesPrgRom:bcf0-bcf3:PersonData_f0:
NesPrgRom:bcf4-bcf7:PersonData_f1:
NesPrgRom:bcf8-bcfb:PersonData_f2:
NesPrgRom:bcfc-bcff:PersonData_f3:
NesPrgRom:bd00-bd0f:MapScreen_BD:
NesPrgRom:bdf0-bdf3:PersonData_f4:
NesPrgRom:bdf4-bdf7:PersonData_f5:
NesPrgRom:bdf8-bdfb:PersonData_f6:
NesPrgRom:bdfc-bdff:PersonData_f7:
NesPrgRom:be00-be0f:MapScreen_BE:
NesPrgRom:bef0-bef3:PersonData_f8:
NesPrgRom:bef4-bef7:PersonData_f9:
NesPrgRom:bef8-befb:PersonData_fa:
NesPrgRom:befc-beff:PersonData_fb:
NesPrgRom:bf00-bf0f:MapScreen_BF:
NesPrgRom:bff0-bff3:PersonData_fc:
NesPrgRom:bff4-bff7:PersonData_fd:
NesPrgRom:bff8-bffb:PersonData_fe:
NesPrgRom:bffc-bfff:PersonData_ff:
NesPrgRom:c000-c00f:MapScreen_C0:
NesPrgRom:c0f0-c0ff:_0c0f0:
NesPrgRom:c100-c10f:MapScreen_C1:
NesPrgRom:c1f0-c1ff:_0c1f0:
NesPrgRom:c200-c20f:MapScreen_C2:
NesPrgRom:c2f0-c2ff:_0c2f0:
NesPrgRom:c300-c30f:MapScreen_C3:
NesPrgRom:c3f0-c3ff:_0c3f0:
NesPrgRom:c400-c40f:MapScreen_C4:
NesPrgRom:c4f0-c4ff:_0c4f0:
NesPrgRom:c500-c50f:MapScreen_C5:
NesPrgRom:c5f0-c5ff:_0c5f0:
NesPrgRom:c600-c60f:MapScreen_C6:
NesPrgRom:c6f0-c6ff:_0c6f0:
NesPrgRom:c700-c70f:MapScreen_C7:
NesPrgRom:c7f0-c7ff:_0c7f0:
NesPrgRom:c800-c80f:MapScreen_C8:
NesPrgRom:c8f0-c8ff:_0c8f0:
NesPrgRom:c900-c90f:MapScreen_C9:
NesPrgRom:c9f0-c9ff:_0c9f0:
NesPrgRom:ca00-ca0f:MapScreen_CA:
NesPrgRom:caf0-caff:_0caf0:
NesPrgRom:cb00-cb0f:MapScreen_CB:
NesPrgRom:cbf0-cbff:_0cbf0:
NesPrgRom:cc00-cc0f:MapScreen_CC:
NesPrgRom:ccf0-ccff:_0ccf0:
NesPrgRom:cd00-cd0f:MapScreen_CD:
NesPrgRom:cdf0-cdff:_0cdf0:
NesPrgRom:ce00-ce0f:MapScreen_CE:
NesPrgRom:cef0-ceff:_0cef0:
NesPrgRom:cf00-cf0f:MapScreen_CF:
NesPrgRom:cff0-cfff:_0cff0:
NesPrgRom:d000-d00f:MapScreen_D0:
NesPrgRom:d0f0-d0ff:_0d0f0:
NesPrgRom:d100-d10f:MapScreen_D1:
NesPrgRom:d1f0-d1ff:_0d1f0:
NesPrgRom:d200-d20f:MapScreen_D2:
NesPrgRom:d2f0-d2ff:_0d2f0:
NesPrgRom:d300-d30f:MapScreen_D3:
NesPrgRom:d3f0-d3ff:_0d3f0:
NesPrgRom:d400-d40f:MapScreen_D4:
NesPrgRom:d4f0-d4ff:_0d4f0:
NesPrgRom:d500-d50f:MapScreen_D5:
NesPrgRom:d5f0-d5ff:_0d5f0:
NesPrgRom:d600-d60f:MapScreen_D6:
NesPrgRom:d6f0-d6ff:_0d6f0:
NesPrgRom:d700-d70f:MapScreen_D7:
NesPrgRom:d7f0-d7ff:_0d7f0:
NesPrgRom:d800-d80f:MapScreen_D8:
NesPrgRom:d8f0-d8ff:_0d8f0:
NesPrgRom:d900-d90f:MapScreen_D9:
NesPrgRom:d9f0-d9ff:_0d9f0:
NesPrgRom:da00-da0f:MapScreen_DA:
NesPrgRom:daf0-daff:_0daf0:
NesPrgRom:db00-db0f:MapScreen_DB:
NesPrgRom:dbf0-dbff:_0dbf0:
NesPrgRom:dc00-dc0f:MapScreen_DC:
NesPrgRom:dcf0-dcff:_0dcf0:
NesPrgRom:dd00-dd0f:MapScreen_DD:
NesPrgRom:ddf0-ddff:_0ddf0:
NesPrgRom:de00-de0f:MapScreen_DE:
NesPrgRom:def0-deff:_0def0:
NesPrgRom:df00-df0f:MapScreen_DF:
NesPrgRom:dff0-dfff:_0dff0:
NesPrgRom:e000-e00f:MapScreen_E0:
NesPrgRom:e0f0-e0ff:_0e0f0:; Data for Draygon 2 fight
NesPrgRom:e100-e10f:MapScreen_E1:
NesPrgRom:e1f0-e1ff:_0e1f0:
NesPrgRom:e200-e20f:MapScreen_E2:
NesPrgRom:e2f0-e2ff:_0e2f0:
NesPrgRom:e300-e30f:MapScreen_E3:
NesPrgRom:e3f0-e3ff:_0e3f0:; Data for Draygon 2 fight
NesPrgRom:e400-e40f:MapScreen_E4:
NesPrgRom:e4f0-e4ff:_0e4f0:
NesPrgRom:e500-e50f:MapScreen_E5:
NesPrgRom:e5f0-e5ff:_0e5f0:
NesPrgRom:e600-e60f:MapScreen_E6:
NesPrgRom:e6f0-e6ff:_0e6f0:
NesPrgRom:e700-e70f:MapScreen_E7:
NesPrgRom:e7f0-e7ff:_0e7f0:
NesPrgRom:e800-e80f:MapScreen_E8:
NesPrgRom:e8f0-e8ff:_0e8f0:
NesPrgRom:e900-e90f:MapScreen_E9:
NesPrgRom:e9f0-e9ff:_0e9f0:
NesPrgRom:ea00-ea0f:MapScreen_EA:
NesPrgRom:eaf0-eaff:_0eaf0:
NesPrgRom:eb00-eb0f:MapScreen_EB:
NesPrgRom:ebf0-ebff:_0ebf0:
NesPrgRom:ec00-ec0f:MapScreen_EC:
NesPrgRom:ecf0-ecff:_0ecf0:
NesPrgRom:ed00-ed0f:MapScreen_ED:
NesPrgRom:edf0-edff:_0edf0:
NesPrgRom:ee00-ee0f:MapScreen_EE:
NesPrgRom:eef0-eeff:_0eef0:
NesPrgRom:ef00-ef0f:MapScreen_EF:
NesPrgRom:eff0-efff:_0eff0:
NesPrgRom:f000-f00f:MapScreen_F0:
NesPrgRom:f0f0-f0ff:_0f0f0:
NesPrgRom:f100-f10f:MapScreen_F1:
NesPrgRom:f1f0-f1ff:_0f1f0:
NesPrgRom:f200-f20f:MapScreen_F2:
NesPrgRom:f2f0-f2ff:_0f2f0:
NesPrgRom:f300-f30f:MapScreen_F3:
NesPrgRom:f3f0-f3ff:_0f3f0:
NesPrgRom:f400-f40f:MapScreen_F4:
NesPrgRom:f4f0-f4ff:_0f4f0:
NesPrgRom:f500-f50f:MapScreen_F5:
NesPrgRom:f5f0-f5ff:_0f5f0:
NesPrgRom:f600-f60f:MapScreen_F6:
NesPrgRom:f6f0-f6ff:_0f6f0:
NesPrgRom:f700-f70f:MapScreen_F7:
NesPrgRom:f7f0-f7ff:_0f7f0:
NesPrgRom:f800-f80f:MapScreen_F8:
NesPrgRom:f8f0-f8ff:_0f8f0:
NesPrgRom:f900-f90f:MapScreen_F9:
NesPrgRom:f9f0-f9ff:_0f9f0:
NesPrgRom:fa00-fa0f:MapScreen_FA:
NesPrgRom:faf0-faff:_0faf0:
NesPrgRom:fb00-fb0f:MapScreen_FB:
NesPrgRom:fbf0-fbff:_0fbf0:
NesPrgRom:fc00-fc0f:MapScreen_FC:
NesPrgRom:fcf0-fcff:_0fcf0:
NesPrgRom:fd00-fd0f:MapScreen_FD:
NesPrgRom:fdf0-fdff:_0fdf0:
NesPrgRom:fe00-fe0f:MapScreen_FE:
NesPrgRom:fef0-feff:_0fef0:
NesPrgRom:ff00-ff0f:MapScreen_FF:
NesPrgRom:fff0-ffff:_0fff0:
NesPrgRom:10000-1000f:BackgroundTilePatterns_00_TL:
NesPrgRom:10100-1010f:BackgroundTilePatterns_00_TR:
NesPrgRom:10200-1020f:BackgroundTilePatterns_00_BL:
NesPrgRom:10300-1030f:BackgroundTilePatterns_00_BR:
NesPrgRom:10400-1040f:BackgroundTilePatterns_01_TL:
NesPrgRom:10500-1050f:BackgroundTilePatterns_01_TR:
NesPrgRom:10600-1060f:BackgroundTilePatterns_01_BL:
NesPrgRom:10700-1070f:BackgroundTilePatterns_01_BR:
NesPrgRom:10800-1080f:BackgroundTilePatterns_02_TL:
NesPrgRom:10900-1090f:BackgroundTilePatterns_02_TR:
NesPrgRom:10a00-10a0f:BackgroundTilePatterns_02_BL:
NesPrgRom:10b00-10b0f:BackgroundTilePatterns_02_BR:
NesPrgRom:10c00-10c0f:BackgroundTilePatterns_03_TL:
NesPrgRom:10d00-10d0f:BackgroundTilePatterns_03_TR:
NesPrgRom:10e00-10e0f:BackgroundTilePatterns_03_BL:
NesPrgRom:10f00-10f0f:BackgroundTilePatterns_03_BR:
NesPrgRom:11000-1100f:BackgroundTilePatterns_04_TL:
NesPrgRom:11100-1110f:BackgroundTilePatterns_04_TR:
NesPrgRom:11200-1120f:BackgroundTilePatterns_04_BL:
NesPrgRom:11300-1130f:BackgroundTilePatterns_04_BR:
NesPrgRom:11400-1140f:BackgroundTilePatterns_05_TL:
NesPrgRom:11500-1150f:BackgroundTilePatterns_05_TR:
NesPrgRom:11600-1160f:BackgroundTilePatterns_05_BL:
NesPrgRom:11700-1170f:BackgroundTilePatterns_05_BR:
NesPrgRom:11800-1180f:BackgroundTilePatterns_06_TL:
NesPrgRom:11900-1190f:BackgroundTilePatterns_06_TR:
NesPrgRom:11a00-11a0f:BackgroundTilePatterns_06_BL:
NesPrgRom:11b00-11b0f:BackgroundTilePatterns_06_BR:
NesPrgRom:11c00-11c0f:BackgroundTilePatterns_07_TL:
NesPrgRom:11d00-11d0f:BackgroundTilePatterns_07_TR:
NesPrgRom:11e00-11e0f:BackgroundTilePatterns_07_BL:
NesPrgRom:11f00-11f0f:BackgroundTilePatterns_07_BR:
NesPrgRom:12000-1200f:BackgroundTilePatterns_08_TL:
NesPrgRom:12100-1210f:BackgroundTilePatterns_08_TR:
NesPrgRom:12200-1220f:BackgroundTilePatterns_08_BL:
NesPrgRom:12300-1230f:BackgroundTilePatterns_08_BR:
NesPrgRom:12400-1240f:BackgroundTilePatterns_09_TL:
NesPrgRom:12500-1250f:BackgroundTilePatterns_09_TR:
NesPrgRom:12600-1260f:BackgroundTilePatterns_09_BL:
NesPrgRom:12700-1270f:BackgroundTilePatterns_09_BR:
NesPrgRom:12800-1280f:BackgroundTilePatterns_0A_TL:
NesPrgRom:12900-1290f:BackgroundTilePatterns_0A_TR:
NesPrgRom:12a00-12a0f:BackgroundTilePatterns_0A_BL:
NesPrgRom:12b00-12b0f:BackgroundTilePatterns_0A_BR:
NesPrgRom:12c00-12c0f:BackgroundTilePatterns_0B_TL:
NesPrgRom:12d00-12d0f:BackgroundTilePatterns_0B_TR:
NesPrgRom:12e00-12e0f:BackgroundTilePatterns_0B_BL:
NesPrgRom:12f00-12f0f:BackgroundTilePatterns_0B_BR:
NesPrgRom:13000-1300f:MetatileAttributesMap_00:
NesPrgRom:13040-1304f:MetatileAttributesMap_01:
NesPrgRom:13080-1308f:MetatileAttributesMap_02:
NesPrgRom:130c0-130cf:MetatileAttributesMap_03:
NesPrgRom:13100-1310f:MetatileAttributesMap_04:
NesPrgRom:13140-1314f:MetatileAttributesMap_05:
NesPrgRom:13180-1318f:MetatileAttributesMap_06:
NesPrgRom:131c0-131cf:MetatileAttributesMap_07:
NesPrgRom:13200-1320f:MetatileAttributesMap_08:
NesPrgRom:13240-1324f:MetatileAttributesMap_09:
NesPrgRom:13280-1328f:MetatileAttributesMap_0A:
NesPrgRom:132c0-132cf:MetatileAttributesMap_0B:
NesPrgRom:13300-1330f:MetatileEffectsMap_B3:
NesPrgRom:13400-1340f:MetatileEffectsMap_B4:
NesPrgRom:13500-1350f:MetatileEffectsMap_B5:
NesPrgRom:13600-1360f:MetatileEffectsMap_B6:
NesPrgRom:13700-1370f:MetatileEffectsMap_B7:
NesPrgRom:13800-1380f:MetatileEffectsMap_B8:
NesPrgRom:13900-1390f:MetatileEffectsMap_B9:
NesPrgRom:13a00-13a0f:MetatileEffectsMap_BA:
NesPrgRom:13b00-13b0f:MetatileEffectsMap_BB:
NesPrgRom:13c00-13c0f:MetatileEffectsMap_BC:
NesPrgRom:13d00-13d0f:MetatileEffectsMap_BD:
NesPrgRom:13e00-13e0f:MetatileAlternativesMap_00:
NesPrgRom:13e20-13e2f:MetatileAlternativesMap_01:
NesPrgRom:13e40-13e4f:MetatileAlternativesMap_02:
NesPrgRom:13e60-13e6f:MetatileAlternativesMap_03:
NesPrgRom:13e80-13e8f:MetatileAlternativesMap_04:
NesPrgRom:13ea0-13eaf:MetatileAlternativesMap_05:
NesPrgRom:13ec0-13ecf:MetatileAlternativesMap_06:
NesPrgRom:13ee0-13eef:MetatileAlternativesMap_07:
NesPrgRom:13f00-13f0f:MetatileAlternativesMap_08:
NesPrgRom:13f20-13f2f:MetatileAlternativesMap_09:
NesPrgRom:13f40-13f4f:MetatileAlternativesMap_0A:
NesPrgRom:13f60-13f6f:MetatileAlternativesMap_0B:
NesPrgRom:13f80-13f8f::; UNUSED
NesPrgRom:14000-1400f:MapScreen_100:
NesPrgRom:14100-1410f:MapScreen_101:
NesPrgRom:14200-1420f:MapScreen_102:
NesPrgRom:14300-14301:MapData:00 Start ("Mezame Shrine")
NesPrgRom:14302-14303::01 OutsideStart
NesPrgRom:14304-14305::02 Leaf
NesPrgRom:14306-14307::03 ValleyOfWind
NesPrgRom:14308-14309::04 SealedCave1
NesPrgRom:1430a-1430b::05 SealedCave2
NesPrgRom:1430c-1430d::06 SealedCave3
NesPrgRom:1430e-1430f::07 SealedCave4
NesPrgRom:14310-14311::08 SealedCave5
NesPrgRom:14312-14313::09 SealedCave6
NesPrgRom:14314-14315::0a SealedCave7
NesPrgRom:14318-14319::0c SealedCave8
NesPrgRom:1431c-1431d::0e WindmillCave
NesPrgRom:1431e-1431f::0f Windmill
NesPrgRom:14320-14321::10 ZebuCave
NesPrgRom:14322-14323::11 MtSabreWestCave1
NesPrgRom:14328-14329::14 CordelPlainsWest
NesPrgRom:1432a-1432b::15 CordelPlainsEast ("Maze of Forest"?)
NesPrgRom:1432c-1432d::16  -- unused copy of 18
NesPrgRom:14330-14331::18 Brynmaer
NesPrgRom:14332-14333::19 OutsideStomHouse
NesPrgRom:14334-14335::1a Swamp
NesPrgRom:14336-14337::1b Amazones
NesPrgRom:14338-14339::1c Oak
NesPrgRom:1433c-1433d::1e StomHouse
NesPrgRom:14340-14341::20 MtSabreWestLower
NesPrgRom:14342-14343::21 MtSabreWestUpper
NesPrgRom:14344-14345::22 MtSabreWestCave2
NesPrgRom:14346-14347::23 MtSabreWestCave3
NesPrgRom:14348-14349::24 MtSabreWestCave4
NesPrgRom:1434a-1434b::25 MtSabreWestCave5
NesPrgRom:1434c-1434d::26 MtSabreWestCave6
NesPrgRom:1434e-1434f::27 MtSabreWestCave7
NesPrgRom:14350-14351::28 MtSabreNorthMain
NesPrgRom:14352-14353::29 MtSabreNortMiddle
NesPrgRom:14354-14355::2a MtSabreNorthCave1
NesPrgRom:14356-14357::2b MtSabreNorthCave2
NesPrgRom:14358-14359::2c MtSabreNorthCave3
NesPrgRom:1435a-1435b::2d MtSabreNorthCave4
NesPrgRom:1435c-1435d::2e MtSabreNorthCave5
NesPrgRom:1435e-1435f::2f MtSabreNorthCave6
NesPrgRom:14360-14361::30 MtSabreNorthLeftCell
NesPrgRom:14362-14363::31 MtSabreNorthPrisonKeyHall
NesPrgRom:14364-14365::32 MtSabreNorthRightCell
NesPrgRom:14366-14367::33 MtSabreNorthCave7
NesPrgRom:14368-14369::34 MtSabreNorthCave8
NesPrgRom:1436a-1436b::35 MtSabreNorthSummitCave
NesPrgRom:14370-14371::38 MtSabreNorthEntranceCave
NesPrgRom:14372-14373::39 MtSabreNorthCave5a
NesPrgRom:14378-14379::3c
NesPrgRom:1437a-1437b::3d
NesPrgRom:1437c-1437d::3e
NesPrgRom:14380-14381::40 WaterfallValleyNorth
NesPrgRom:14382-14383::41 WaterfallValleySouth
NesPrgRom:14384-14385::42 LimeTreeValley
NesPrgRom:14386-14387::43 LimeTreeLake
NesPrgRom:14388-14389::44 KirisaPlantCave1
NesPrgRom:1438a-1438b::45 KirisaPlantCave2
NesPrgRom:1438c-1438d::46 KirisaPlantCave3
NesPrgRom:1438e-1438f::47 KirisaMeadow
NesPrgRom:14390-14391::48 FogLampCave1
NesPrgRom:14392-14393::49 FogLampCave2
NesPrgRom:14394-14395::4a FogLampCave3
NesPrgRom:14396-14397::4b FogLampCaveDeadEnd
NesPrgRom:14398-14399::4c FogLampCave4
NesPrgRom:1439a-1439b::4d FogLampCave5
NesPrgRom:1439c-1439d::4e FogLampCave6
NesPrgRom:1439e-1439f::4f FogLampCave7
NesPrgRom:143a0-143a1::50 Portoa
NesPrgRom:143a2-143a3::51 PortoaFishermanIsland
NesPrgRom:143a4-143a5::52 MesiaShrine
NesPrgRom:143a8-143a9::54 WaterfallCave1
NesPrgRom:143aa-143ab::55 WaterfallCave2
NesPrgRom:143ac-143ad::56 WaterfallCave3
NesPrgRom:143ae-143af::57 WaterfallCave4
NesPrgRom:143b0-143b1::58
NesPrgRom:143b2-143b3::59
NesPrgRom:143b4-143b5::5a
NesPrgRom:143b6-143b7::5b
NesPrgRom:143b8-143b9::5c
NesPrgRom:143ba-143bb::5d
NesPrgRom:143bc-143bd::5e
NesPrgRom:143be-143bf::5f Dyna
NesPrgRom:143c0-143c1::60 AngrySea
NesPrgRom:143c2-143c3::61 BoatHouse
NesPrgRom:143c4-143c5::62 JoelLighthouse
NesPrgRom:143c8-143c9::64 UndergroundChannel
NesPrgRom:143ca-143cb::65 =ZombieTown
NesPrgRom:143d0-143d1::68 =EvilSpiritIsland1
NesPrgRom:143d2-143d3::69
NesPrgRom:143d4-143d5::6a
NesPrgRom:143d6-143d7::6b
NesPrgRom:143d8-143d9::6c
NesPrgRom:143da-143db::6d
NesPrgRom:143dc-143dd::6e
NesPrgRom:143de-143df::6f  --- BROKEN
NesPrgRom:143e0-143e1::70 JoelSecretPassage
NesPrgRom:143e2-143e3::71 Joel
NesPrgRom:143e4-143e5::72 Swan
NesPrgRom:143e6-143e7::73
NesPrgRom:143f0-143f1::78
NesPrgRom:143f8-143f9::7c =MtHydra1
NesPrgRom:143fa-143fb::7d =MtHydraCave1
NesPrgRom:143fc-143fd::7e =MtHydra2
NesPrgRom:143fe-143ff::7f
NesPrgRom:14400-14401:MapDataPart2:80
NesPrgRom:14402-14403::81
NesPrgRom:14404-14405::82
NesPrgRom:14406-14407::83
NesPrgRom:14408-14409::84
NesPrgRom:1440a-1440b::85
NesPrgRom:1440c-1440d::86
NesPrgRom:1440e-1440f::87
NesPrgRom:14410-14411::88
NesPrgRom:14412-14413::89
NesPrgRom:14414-14415::8a
NesPrgRom:14418-14419::8c =Shyron
NesPrgRom:1441c-1441d::8e =Goa
NesPrgRom:1441e-1441f::8f
NesPrgRom:14420-14421::90 =Desert1
NesPrgRom:14422-14423::91
NesPrgRom:14424-14425::92 =DesertCave1
NesPrgRom:14426-14427::93 =Sahara
NesPrgRom:14428-14429::94
NesPrgRom:1442a-1442b::95
NesPrgRom:1442c-1442d::96 =SaharaMeadow
NesPrgRom:14430-14431::98
NesPrgRom:14438-14439::9c
NesPrgRom:1443a-1443b::9d
NesPrgRom:1443c-1443d::9e
NesPrgRom:1443e-1443f::9f
NesPrgRom:14440-14441::a0
NesPrgRom:14442-14443::a1
NesPrgRom:14444-14445::a2
NesPrgRom:14446-14447::a3
NesPrgRom:14448-14449::a4
NesPrgRom:1444a-1444b::a5
NesPrgRom:1444c-1444d::a6 Draygon2
NesPrgRom:1444e-1444f::a7
NesPrgRom:14450-14451::a8 =GoaCastle1
NesPrgRom:14452-14453::a9 =GoaCastle2
NesPrgRom:14454-14455::aa =GoaCastleZebu
NesPrgRom:14456-14457::ab =GoaCastle3
NesPrgRom:14458-14459::ac =GoaCastleTornel
NesPrgRom:1445a-1445b::ad =GoaCastle4
NesPrgRom:1445c-1445d::ae =GoaCastle5
NesPrgRom:1445e-1445f::af
NesPrgRom:14460-14461::b0 =GoaCastle6
NesPrgRom:14462-14463::b1
NesPrgRom:14464-14465::b2
NesPrgRom:14466-14467::b3
NesPrgRom:14468-14469::b4
NesPrgRom:1446a-1446b::b5
NesPrgRom:1446c-1446d::b6
NesPrgRom:1446e-1446f::b7
NesPrgRom:14470-14471::b8
NesPrgRom:14472-14473::b9 =GoaCastleAsina
NesPrgRom:14474-14475::ba
NesPrgRom:14476-14477::bb =GoaHouse
NesPrgRom:14478-14479::bc =GoaInn
NesPrgRom:1447a-1447b::bd   ---  BROKEN
NesPrgRom:1447c-1447d::be =GoaToolShop
NesPrgRom:1447e-1447f::bf =GoaTavern
NesPrgRom:14480-14481::c0 =LeafElderHouse
NesPrgRom:14482-14483::c1 =LeafRabbitHut
NesPrgRom:14484-14485::c2 =LeafInn
NesPrgRom:14486-14487::c3 =LeafToolShop
NesPrgRom:14488-14489::c4 =LeafArmorShop
NesPrgRom:1448a-1448b::c5 =LeafStudentHouse
NesPrgRom:1448c-1448d::c6 BrynmaerTavern
NesPrgRom:1448e-1448f::c7 BrynmaerPawnShop
NesPrgRom:14490-14491::c8 BrynmaerInn
NesPrgRom:14492-14493::c9 BrynmaerArmorShop
NesPrgRom:14494-14495::ca   --- BROKEN
NesPrgRom:14496-14497::cb BrynmaerToolShop
NesPrgRom:14498-14499::cc   --- BROKEN
NesPrgRom:1449a-1449b::cd OakElderHouse
NesPrgRom:1449c-1449d::ce OakMotherHouse
NesPrgRom:1449e-1449f::cf OakToolShop
NesPrgRom:144a0-144a1::d0 OakInn
NesPrgRom:144a2-144a3::d1 AmazonesInn
NesPrgRom:144a4-144a5::d2 AmazonesToolShop
NesPrgRom:144a6-144a7::d3 AmazonesArmorShop
NesPrgRom:144a8-144a9::d4 AmazonesElder
NesPrgRom:144aa-144ab::d5 =Nadares
NesPrgRom:144ac-144ad::d6 PortoaFishermanHouse
NesPrgRom:144ae-144af::d7 PortoaPalaceEntrance
NesPrgRom:144b0-144b1::d8 PortoaFortuneTeller
NesPrgRom:144b2-144b3::d9 PortoaPawnShop
NesPrgRom:144b4-144b5::da PortoaArmorShop
NesPrgRom:144b6-144b7::db  --- BROKEN
NesPrgRom:144b8-144b9::dc PortoaInn
NesPrgRom:144ba-144bb::dd PortoaToolShop
NesPrgRom:144bc-144bd::de =PortoaPalaceLeftWing
NesPrgRom:144be-144bf::df =PortoaPalaceThroneRoom
NesPrgRom:144c0-144c1::e0 =PortoaPalaceRightWing
NesPrgRom:144c2-144c3::e1 =PortoaAsinaRoom
NesPrgRom:144c4-144c5::e2 AmazonesElderDownstairs
NesPrgRom:144c6-144c7::e3 JoelElderHouse
NesPrgRom:144c8-144c9::e4 JoelShed
NesPrgRom:144ca-144cb::e5 JoelToolShop
NesPrgRom:144cc-144cd::e6  --- BROKEN
NesPrgRom:144ce-144cf::e7 JoelInn
NesPrgRom:144d0-144d1::e8 =ZombieTownHouse
NesPrgRom:144d2-144d3::e9 =ZombieTownHouseBasement
NesPrgRom:144d4-144d5::ea  --- BROKEN
NesPrgRom:144d6-144d7::eb =SwanToolShop
NesPrgRom:144d8-144d9::ec =SwanStomHut
NesPrgRom:144da-144db::ed =SwanInn
NesPrgRom:144dc-144dd::ee =SwanArmorShop
NesPrgRom:144de-144df::ef =SwanTavern
NesPrgRom:144e0-144e1::f0 =SwanPawnShop
NesPrgRom:144e2-144e3::f1 =SwanDanceHall
NesPrgRom:144e4-144e5::f2 =ShyronFortress
NesPrgRom:144e6-144e7::f3 =ShyronTrainingHall
NesPrgRom:144e8-144e9::f4 =ShyronHospital
NesPrgRom:144ea-144eb::f5 =ShyronArmorShop
NesPrgRom:144ec-144ed::f6 =ShyronToolShop
NesPrgRom:144ee-144ef::f7 =ShyronInn
NesPrgRom:144f0-144f1::f8 =SaharaInn
NesPrgRom:144f2-144f3::f9 =SaharaToolShop
NesPrgRom:144f4-144f5::fa =SaharaElderHouse
NesPrgRom:144f6-144f7::fb =SaharaPawnShop
NesPrgRom:144f8-144f9:MapData_00:
NesPrgRom:14502:MapData_00_Layout:
NesPrgRom:14507::; Map 1x1
NesPrgRom:14508-1450a:MapData_00_Graphics:
NesPrgRom:1450f-14512:MapData_00_Entrances:Entrance at bottom
NesPrgRom:14513-14516::Start door
NesPrgRom:14517-1451a:MapData_00_Exits:Exit to OutsideStart, 5 wide
NesPrgRom:1452c-1452d:MapData_00_Flags:$64dd80 -> $62f001
NesPrgRom:1452f-14530:MapData_01:
NesPrgRom:14539:MapData_01_Layout:
NesPrgRom:1453e::; Map 1x1
NesPrgRom:1453f-14541:MapData_01_Graphics:
NesPrgRom:14546-14549:MapData_01_Entrances:From Start cave
NesPrgRom:1454a-1454d::From Leaf
NesPrgRom:1454e-14551:MapData_01_Exits:Exit to Start, 2x2 (why?)
NesPrgRom:1455e-14561::Exit to Leaf (3 tall)
NesPrgRom:1456a-1456b::Fall through since $ff below will catch
NesPrgRom:1456c-1456d:MapData_01_Flags:$64dd80 -> $62f001
NesPrgRom:1456f-14570:MapData_02:
NesPrgRom:14579:MapData_02_Layout:
NesPrgRom:1457e-1457f::; Map 2x2
NesPrgRom:14582-14584:MapData_02_Graphics:
NesPrgRom:14589-1458c:MapData_02_Entrances:From cave (or warp)
NesPrgRom:1458d-14590::From valley of wind
NesPrgRom:14591-14594::From elder's house
NesPrgRom:14595-14598::From hut
NesPrgRom:14599-1459c::From stdent's house
NesPrgRom:1459d-145a0::From tool shop
NesPrgRom:145a1-145a4::From armor shop
NesPrgRom:145a5-145a8::From inn
NesPrgRom:145a9-145ac:MapData_02_Exits:Exit to OutsideStart (3 tall)
NesPrgRom:145b5-145b8::Exit to ValleyOfWind (2 wide)
NesPrgRom:145bd-145c0::Exit to LeafElderHouse
NesPrgRom:145c1-145c4::Exit to LeafRabbitHut
NesPrgRom:145c5-145c8::Exit to LeafStudentHouse
NesPrgRom:145c9-145cc::Exit to LeafToolShop
NesPrgRom:145cd-145d0::Exit to LeafArmorShop
NesPrgRom:145d1-145d4::Exit to LeafInn
NesPrgRom:145d6-145d7:MapData_02_Flags:$64d004 -> $62f001
NesPrgRom:145d9-145da:MapData_03:
NesPrgRom:145e3:MapData_03_Layout:
NesPrgRom:145e8-145ec::; Map 5x7
NesPrgRom:1460b-1460d:MapData_03_Graphics:
NesPrgRom:14612-14615:MapData_03_Entrances:
NesPrgRom:1462a-1462d:MapData_03_Exits:Exit to Leaf (2 wide)
NesPrgRom:14632-14635::Exit to Sealed Cave 1 (2 wide)
NesPrgRom:1463a-1463d::Exit to Windmill Cave (2 wide, above bridge)
NesPrgRom:14642-14645::Exit to Windmill Cave (windmill side)
NesPrgRom:14646-14649::Exit to Windmill
NesPrgRom:1464a-1464d::Exit to Zebu's Cave (2 wide)
NesPrgRom:14653-14654:MapData_03_Flags:$64dd40 -> $62f102 windmill started
NesPrgRom:14656-14657:MapData_0e:
NesPrgRom:14660:MapData_0e_Layout:
NesPrgRom:14665-14667::; Map 3x4
NesPrgRom:14671-14673:MapData_0e_Graphics:
NesPrgRom:14678-1467b:MapData_0e_Entrances:
NesPrgRom:14680-14683:MapData_0e_Exits:
NesPrgRom:14691:MapData_0e_Flags:
NesPrgRom:14692-14693:MapData_0f:
NesPrgRom:1469c:MapData_0f_Layout:
NesPrgRom:146a1::; Map 1x1
NesPrgRom:146a2-146a4:MapData_0f_Graphics:
NesPrgRom:146a9-146ac:MapData_0f_Entrances:
NesPrgRom:146ad-146b0:MapData_0f_Exits:
NesPrgRom:146b2:MapData_0f_Flags:
NesPrgRom:146b3-146b4:MapData_10:
NesPrgRom:146bd:MapData_10_Layout:
NesPrgRom:146c2-146c5::; Map 4x4
NesPrgRom:146d2-146d4:MapData_10_Graphics:
NesPrgRom:146d9-146dc:MapData_10_Entrances:
NesPrgRom:146e1-146e4:MapData_10_Exits:
NesPrgRom:146f2-146f3:MapData_10_Flags:$64dd20 -> $62f202
NesPrgRom:146f5-146f6:MapData_11:
NesPrgRom:146ff:MapData_11_Layout:
NesPrgRom:14704-14705::; Map 2x4
NesPrgRom:1470c-1470e:MapData_11_Graphics:
NesPrgRom:14713-14716:MapData_11_Entrances:
NesPrgRom:1471b-1471e:MapData_11_Exits:To Zebu's Cave
NesPrgRom:14723-14726::To Mt Sabre West
NesPrgRom:1472c:MapData_11_Flags:
NesPrgRom:1472d-1472e:MapData_04:
NesPrgRom:14737:MapData_04_Layout:
NesPrgRom:1473c-1473e::; Map 3x3
NesPrgRom:14745-14747:MapData_04_Graphics:
NesPrgRom:1474c-1474f:MapData_04_Entrances:
NesPrgRom:14754-14757:MapData_04_Exits:
NesPrgRom:14765:MapData_04_Flags:
NesPrgRom:14766-14767:MapData_05:
NesPrgRom:14770:MapData_05_Layout:
NesPrgRom:14775-14778::; Map 4x3
NesPrgRom:14781-14783:MapData_05_Graphics:
NesPrgRom:14788-1478b:MapData_05_Entrances:
NesPrgRom:14790-14793:MapData_05_Exits:
NesPrgRom:147a1:MapData_05_Flags:
NesPrgRom:147a2-147a3:MapData_06:
NesPrgRom:147ac:MapData_06_Layout:
NesPrgRom:147b1-147b3::; Map 3x1
NesPrgRom:147b4-147b6:MapData_06_Graphics:
NesPrgRom:147bb-147be:MapData_06_Entrances:
NesPrgRom:147bf-147c2:MapData_06_Exits:
NesPrgRom:147c8:MapData_06_Flags:
NesPrgRom:147c9-147ca:MapData_07:
NesPrgRom:147d3:MapData_07_Layout:
NesPrgRom:147d8-147da::; Map 3x6
NesPrgRom:147ea-147ec:MapData_07_Graphics:
NesPrgRom:147f1-147f4:MapData_07_Entrances:
NesPrgRom:147f5-147f8:MapData_07_Exits:
NesPrgRom:147fe-147ff:MapData_07_Flags:$64dd10 -> $62f104
NesPrgRom:14801-14802:MapData_08:
NesPrgRom:1480b:MapData_08_Layout:
NesPrgRom:14810::; Map 1x3
NesPrgRom:14813-14815:MapData_08_Graphics:
NesPrgRom:1481a-1481d:MapData_08_Entrances:
NesPrgRom:1481e-14821:MapData_08_Exits:
NesPrgRom:14827:MapData_08_Flags:
NesPrgRom:14828-14829:MapData_09:
NesPrgRom:14832:MapData_09_Layout:
NesPrgRom:14837-1483b::; Map 5x3
NesPrgRom:14846-14848:MapData_09_Graphics:
NesPrgRom:1484d-14850:MapData_09_Entrances:
NesPrgRom:14861-14864:MapData_09_Exits:
NesPrgRom:1488a-1488b:MapData_09_Flags:$64dd08 -> $62f102
NesPrgRom:1488d-1488e:MapData_0a:
NesPrgRom:14897:MapData_0a_Layout:
NesPrgRom:1489c-1489e::; Map 3x2
NesPrgRom:148a2-148a4:MapData_0a_Graphics:
NesPrgRom:148a9-148ac:MapData_0a_Entrances:
NesPrgRom:148b1-148b4:MapData_0a_Exits:
NesPrgRom:148c2:MapData_0a_Flags:
NesPrgRom:148c3-148c4:MapData_0c:
NesPrgRom:148cd:MapData_0c_Layout:
NesPrgRom:148d2-148d3::; Map 2x3
NesPrgRom:148d8-148da:MapData_0c_Graphics:
NesPrgRom:148df-148e2:MapData_0c_Entrances:
NesPrgRom:148e7-148ea:MapData_0c_Exits:
NesPrgRom:148f8-148f9:MapData_0c_Flags:$64d010 -> $62f102
NesPrgRom:148fb-148fc:MapData_14:
NesPrgRom:14905:MapData_14_Layout:
NesPrgRom:1490a-14911::; Map 8x8
NesPrgRom:1494a-1494c:MapData_14_Graphics:; Pattern data [5] -> $7f0 = tiles 0-$7f, [6] -> $7f1 = tiles $80-$ff
NesPrgRom:14951-14954:MapData_14_Entrances:
NesPrgRom:1496d-14970:MapData_14_Exits:
NesPrgRom:149b2-149b3:MapData_14_Flags:64dd04 -> 62f504
NesPrgRom:149b5-149b6:MapData_15:; Area south of the bridge, east toward the swamp
NesPrgRom:149bb-149bc::$14a27
NesPrgRom:149bf:MapData_15_Layout:
NesPrgRom:149c4-149cb::; Map 8x8
NesPrgRom:14a04-14a06:MapData_15_Graphics:
NesPrgRom:14a0b-14a0e:MapData_15_Entrances:
NesPrgRom:14a27-14a2a:MapData_15_Exits:
NesPrgRom:14a6c:MapData_15_Flags:
NesPrgRom:14a6d-14a6e:MapData_18:
NesPrgRom:14a77:MapData_18_Layout:
NesPrgRom:14a7c-14a7e::; Map 3x1
NesPrgRom:14a7f-14a81:MapData_18_Graphics:
NesPrgRom:14a86-14a89:MapData_18_Entrances:
NesPrgRom:14aa2-14aa5:MapData_18_Exits:
NesPrgRom:14abf:MapData_18_Flags:
NesPrgRom:14ac0-14ac1:MapData_19:
NesPrgRom:14aca:MapData_19_Layout:
NesPrgRom:14acf::; Map 1x1
NesPrgRom:14ad0-14ad2:MapData_19_Graphics:
NesPrgRom:14ad7-14ada:MapData_19_Entrances:
NesPrgRom:14adf-14ae2:MapData_19_Exits:
NesPrgRom:14af0:MapData_19_Flags:
NesPrgRom:14af1-14af2:MapData_1e:
NesPrgRom:14afb:MapData_1e_Layout:
NesPrgRom:14b00::; Map 1x1
NesPrgRom:14b01-14b03:MapData_1e_Graphics:
NesPrgRom:14b08-14b0b:MapData_1e_Entrances:
NesPrgRom:14b0c-14b0f:MapData_1e_Exits:
NesPrgRom:14b15-14b16:MapData_1e_Flags:64d004 -> 62f001
NesPrgRom:14b18-14b19:MapData_1a:
NesPrgRom:14b22:MapData_1a_Layout:
NesPrgRom:14b27-14b2b::; Map 5x5
NesPrgRom:14b40-14b42:MapData_1a_Graphics:
NesPrgRom:14b47-14b4a:MapData_1a_Entrances:
NesPrgRom:14b4f-14b52:MapData_1a_Exits:
NesPrgRom:14b6c:MapData_1a_Flags:
NesPrgRom:14b6d-14b6e:MapData_1b:
NesPrgRom:14b77:MapData_1b_Layout:
NesPrgRom:14b7c-14b7d::; Map 2x1
NesPrgRom:14b7e-14b80:MapData_1b_Graphics:
NesPrgRom:14b85-14b88:MapData_1b_Entrances:
NesPrgRom:14b99-14b9c:MapData_1b_Exits:
NesPrgRom:14bb2-14bb3:MapData_1b_Flags:64d004 -> 62f001
NesPrgRom:14bb5-14bb6:MapData_1c:
NesPrgRom:14bbf:MapData_1c_Layout:
NesPrgRom:14bc4-14bc5::; Map 2x2
NesPrgRom:14bc8-14bca:MapData_1c_Graphics:
NesPrgRom:14bcf-14bd2:MapData_1c_Entrances:
NesPrgRom:14be3-14be6:MapData_1c_Exits:
NesPrgRom:14bfc:MapData_1c_Flags:
NesPrgRom:14bfd-14bfe:MapData_20:
NesPrgRom:14c07:MapData_20_Layout:
NesPrgRom:14c0c-14c11::; Map 6x5
NesPrgRom:14c2a-14c2c:MapData_20_Graphics:
NesPrgRom:14c31-14c34:MapData_20_Entrances:
NesPrgRom:14c45-14c48:MapData_20_Exits:; See map http//mikesrpgcenter.com/crystalis/maps/mtsabrewest.html\\nMain entrance to Cordel Plain
NesPrgRom:14c55-14c58::Cave back to Zebu/Leaf
NesPrgRom:14c5d-14c60::Lower entrance B
NesPrgRom:14c65-14c68::Upper entrance C (dead-end with warp boots)
NesPrgRom:14c6d-14c70::Entrance D to Tornado Bracelet
NesPrgRom:14c75-14c78::Seamless transition to upper half of outside
NesPrgRom:14c86:MapData_20_Flags:
NesPrgRom:14c87-14c88:MapData_21:
NesPrgRom:14c91:MapData_21_Layout:
NesPrgRom:14c96-14c9b::; Map 6x5
NesPrgRom:14cb4-14cb6:MapData_21_Graphics:
NesPrgRom:14cbb-14cbe:MapData_21_Entrances:
NesPrgRom:14cc7-14cca:MapData_21_Exits:
NesPrgRom:14cf0:MapData_21_Flags:
NesPrgRom:14cf1-14cf2:MapData_22:
NesPrgRom:14cfb:MapData_22_Layout:
NesPrgRom:14d00-14d04::; Map 5x5
NesPrgRom:14d19-14d1b:MapData_22_Graphics:
NesPrgRom:14d20-14d23:MapData_22_Entrances:
NesPrgRom:14d2c-14d2f:MapData_22_Exits:Entrance from Mt Sabre (B)
NesPrgRom:14d34-14d37::Connector to Tornel/Upper
NesPrgRom:14d3c-14d3f::Dead-end exit to Warp Boots (C)
NesPrgRom:14d45-14d46:MapData_22_Flags:64dd01 -> 62f208
NesPrgRom:14d47-14d48::64dd02 -> 62f202
NesPrgRom:14d4a-14d4b:MapData_23:
NesPrgRom:14d54:MapData_23_Layout:
NesPrgRom:14d59-14d5d::; Map 5x3
NesPrgRom:14d68-14d6a:MapData_23_Graphics:
NesPrgRom:14d6f-14d72:MapData_23_Entrances:
NesPrgRom:14d7b-14d7e:MapData_23_Exits:Return to Lower
NesPrgRom:14d83-14d86::Exit F connecting to Tornel
NesPrgRom:14d8b-14d8e::Exit E to Outside upper
NesPrgRom:14d94-14d95:MapData_23_Flags:64dc80 -> 62f108
NesPrgRom:14d97-14d98:MapData_24:
NesPrgRom:14da1:MapData_24_Layout:
NesPrgRom:14da6-14da9::; Map 4x5
NesPrgRom:14dba-14dbc:MapData_24_Graphics:
NesPrgRom:14dc1-14dc4:MapData_24_Entrances:
NesPrgRom:14dcd-14dd0:MapData_24_Exits:Return to lower (F)
NesPrgRom:14dd5-14dd8::Tiny connector towards Tornel
NesPrgRom:14ddd-14de0::Exit (G) to outside
NesPrgRom:14de6-14de7:MapData_24_Flags:64dc40 -> 62f301
NesPrgRom:14de9-14dea:MapData_25:
NesPrgRom:14df3:MapData_25_Layout:
NesPrgRom:14df8-14df9::; Map 2x1
NesPrgRom:14dfa-14dfc:MapData_25_Graphics:
NesPrgRom:14e01-14e04:MapData_25_Entrances:
NesPrgRom:14e09-14e0c:MapData_25_Exits:Backwards
NesPrgRom:14e11-14e14::Forward towards Tornel
NesPrgRom:14e1a:MapData_25_Flags:
NesPrgRom:14e1b-14e1c:MapData_26:
NesPrgRom:14e25:MapData_26_Layout:
NesPrgRom:14e2a-14e2b::; Map 2x5
NesPrgRom:14e34-14e36:MapData_26_Graphics:
NesPrgRom:14e3b-14e3e:MapData_26_Entrances:
NesPrgRom:14e43-14e46:MapData_26_Exits:Backward to tiny connector
NesPrgRom:14e4b-14e4e::Tornel
NesPrgRom:14e54-14e55:MapData_26_Flags:64dc20 -> 62f201
NesPrgRom:14e57-14e58:MapData_27:
NesPrgRom:14e61:MapData_27_Layout:
NesPrgRom:14e66-14e68::; Map 3x5
NesPrgRom:14e75-14e77:MapData_27_Graphics:
NesPrgRom:14e7c-14e7f:MapData_27_Entrances:
NesPrgRom:14e80-14e83:MapData_27_Exits:Entrance from lower outside
NesPrgRom:14e89-14e8a:MapData_27_Flags:64dc10 -> 62f302
NesPrgRom:14e8b-14e8c::64dc08 -> 62f102
NesPrgRom:14e8e-14e8f:MapData_28:; See map http//mikesrpgcenter.com/crystalis/maps/mtsabrewest.html\\n; Seems to also include the summit?!?
NesPrgRom:14e98:MapData_28_Layout:
NesPrgRom:14e9d-14ea4::; Map 8x8
NesPrgRom:14edd-14edf:MapData_28_Graphics:
NesPrgRom:14ee4-14ee7:MapData_28_Entrances:
NesPrgRom:14f00-14f03:MapData_28_Exits:Back to Cordel Plains East
NesPrgRom:14f10-14f13::Exit A to first cave past guards
NesPrgRom:14f18-14f1b::Exit I back to middle
NesPrgRom:14f20-14f23::Exit J to summit
NesPrgRom:14f28-14f2b::Exit K to fight gen kelby
NesPrgRom:14f30-14f33::Exit L at top (prison key)
NesPrgRom:14f3c-14f3f::Nadare's
NesPrgRom:14f41-14f42:MapData_28_Flags:64db01 -> 62f010
NesPrgRom:14f44-14f45:MapData_29:
NesPrgRom:14f4a-14f4b::$14fae
NesPrgRom:14f4e:MapData_29_Layout:
NesPrgRom:14f53-14f5a::; Map 8x8
NesPrgRom:14f93-14f95:MapData_29_Graphics:
NesPrgRom:14f9a-14f9d:MapData_29_Entrances:
NesPrgRom:14fae-14fb1:MapData_29_Exits:; First two exits are a small connector between lower and the rest of middle\\nExit B to cave 1 heading back to lower
NesPrgRom:14fb6-14fb9::Exit C to cave 2 heading to rest of middle
NesPrgRom:14fbe-14fc1::Exit H on far left side to cave 5
NesPrgRom:14fc6-14fc9::Exit F in middle to cave 3
NesPrgRom:14fce-14fd1::Exit G on far right side to cave 4
NesPrgRom:14fd7:MapData_29_Flags:
NesPrgRom:14fd8-14fd9:MapData_2a:
NesPrgRom:14fe2:MapData_2a_Layout:
NesPrgRom:14fe7-14fea::; Map 4x4
NesPrgRom:14ff7-14ff9:MapData_2a_Graphics:
NesPrgRom:14ffe-15001:MapData_2a_Entrances:
NesPrgRom:15006-15009:MapData_2a_Exits:Back to entrance cave
NesPrgRom:1500e-15011::Exit B to middle
NesPrgRom:15017-15018:MapData_2a_Flags:64dc04 -> 62f101
NesPrgRom:1501a-1501b:MapData_38:; Main entrance cave, past the guards.
NesPrgRom:15024:MapData_38_Layout:
NesPrgRom:15029::; Map 1x4
NesPrgRom:1502d-1502f:MapData_38_Graphics:
NesPrgRom:15034-15037:MapData_38_Entrances:
NesPrgRom:1503c-1503f:MapData_38_Exits:Back outside to the bottom
NesPrgRom:15044-15047::Into Cave 1
NesPrgRom:1504d:MapData_38_Flags:
NesPrgRom:1504e-1504f:MapData_2b:; C-D-E connector between B-C outside area and the rest of the middle.
NesPrgRom:15058:MapData_2b_Layout:
NesPrgRom:1505d-15060::; Map 4x6
NesPrgRom:15075-15077:MapData_2b_Graphics:
NesPrgRom:1507c-1507f:MapData_2b_Entrances:
NesPrgRom:15088-1508b:MapData_2b_Exits:Exit C
NesPrgRom:15090-15093::Exit E
NesPrgRom:15098-1509b::Exit D
NesPrgRom:150a1-150a2:MapData_2b_Flags:64dc02 -> 62f404
NesPrgRom:150a3-150a4::64dc01 -> 62f302
NesPrgRom:150a6-150a7:MapData_2c:; Connector cave with bridge between entrances E and F\\n$150b0
NesPrgRom:150b0:MapData_2c_Layout:
NesPrgRom:150b5-150b7::; Map 3x5
NesPrgRom:150c4-150c6:MapData_2c_Graphics:
NesPrgRom:150cb-150ce:MapData_2c_Entrances:
NesPrgRom:150d3-150d6:MapData_2c_Exits:Exit E
NesPrgRom:150db-150de::Exit F
NesPrgRom:150e4-150e5:MapData_2c_Flags:64d004 -> 62f001
NesPrgRom:150e7-150e8:MapData_2d:; Cave at entrance G
NesPrgRom:150f1:MapData_2d_Layout:
NesPrgRom:150f6-150f8::; Map 3x3
NesPrgRom:150ff-15101:MapData_2d_Graphics:
NesPrgRom:15106-15109:MapData_2d_Entrances:
NesPrgRom:15112-15115:MapData_2d_Exits:Exit D to hallway with entrance C
NesPrgRom:1511a-1511d::Unmarked exit up to hallway with entrance H
NesPrgRom:15122-15125::Exit G to outside
NesPrgRom:1512b-1512c:MapData_2d_Flags:64db80 -> 62f102
NesPrgRom:1512e-1512f:MapData_2e:; Cave at entrance H
NesPrgRom:15138:MapData_2e_Layout:
NesPrgRom:1513d-15142::; Map 6x4
NesPrgRom:15155-15157:MapData_2e_Graphics:
NesPrgRom:1515c-1515f:MapData_2e_Entrances:
NesPrgRom:15168-1516b:MapData_2e_Exits:Unmarked exit to hallway with G entrance
NesPrgRom:15170-15173::Exit H to outside
NesPrgRom:15178-1517b::Unmarked exit to hallway with I toward summit
NesPrgRom:15181-15182:MapData_2e_Flags:64db40 -> 62f304
NesPrgRom:15183-15184::64db20 -> 62f110
NesPrgRom:15186-15187:MapData_39:
NesPrgRom:15190:MapData_39_Layout:
NesPrgRom:15195-15196::; Map 2x2
NesPrgRom:15199-1519b:MapData_39_Graphics:
NesPrgRom:151a0-151a3:MapData_39_Entrances:
NesPrgRom:151a8-151ab:MapData_39_Exits:Back to cave towards middle
NesPrgRom:151b0-151b3::Exit I to upper outside
NesPrgRom:151b9:MapData_39_Flags:
NesPrgRom:151ba-151bb:MapData_2f:; hallway with leaf prisoners
NesPrgRom:151c4:MapData_2f_Layout:
NesPrgRom:151c9-151cd::; Map 5x1
NesPrgRom:151ce-151d0:MapData_2f_Graphics:
NesPrgRom:151d5-151d8:MapData_2f_Entrances:
NesPrgRom:151e1-151e4:MapData_2f_Exits:Exit J from upper outside area
NesPrgRom:151e9-151ec::Throuch ice wall up to right-hand cell
NesPrgRom:151f1-151f4::Through ice wall up to left-hand cell
NesPrgRom:151fa-151fb:MapData_2f_Flags:64db10 -> 62f008
NesPrgRom:151fc-151fd::64db08 -> 62f004
NesPrgRom:151ff-15200:MapData_30:; Left-hand cell
NesPrgRom:15209:MapData_30_Layout:
NesPrgRom:1520e::; Map 1x1
NesPrgRom:1520f-15211:MapData_30_Graphics:
NesPrgRom:15216-15219:MapData_30_Entrances:
NesPrgRom:1521e-15221:MapData_30_Exits:Back through ice wall to prison hallway
NesPrgRom:1522e-15231::To hallway with prison key
NesPrgRom:15237-15238:MapData_30_Flags:64db04 -> 62f001
NesPrgRom:1523a-1523b:MapData_31:; Hallway with prison key
NesPrgRom:15244:MapData_31_Layout:
NesPrgRom:15249::; Map 1x2
NesPrgRom:1524b-1524d:MapData_31_Graphics:
NesPrgRom:15252-15255:MapData_31_Entrances:
NesPrgRom:15256-15259:MapData_31_Exits:Back to left cell
NesPrgRom:15267:MapData_31_Flags:
NesPrgRom:15268-15269:MapData_32:; Right-hand cell, with exit toward summit
NesPrgRom:15272:MapData_32_Layout:
NesPrgRom:15277::; Map 1x1
NesPrgRom:15278-1527a:MapData_32_Graphics:
NesPrgRom:1527f-15282:MapData_32_Entrances:
NesPrgRom:15287-1528a:MapData_32_Exits:Back through ice wall to prison hallway
NesPrgRom:15297-1529a::To hallway with summit exit
NesPrgRom:152a0-152a1:MapData_32_Flags:64db02 -> 62f001
NesPrgRom:152a3-152a4:MapData_33:; Hallway north out of right-hand cell, toward summit
NesPrgRom:152ad:MapData_33_Layout:
NesPrgRom:152b2::; Map 1x2
NesPrgRom:152b4-152b6:MapData_33_Graphics:
NesPrgRom:152bb-152be:MapData_33_Entrances:
NesPrgRom:152c3-152c6:MapData_33_Exits:Back to right cell
NesPrgRom:152d3-152d6::Around to cave 8, up to summit
NesPrgRom:152dc:MapData_33_Flags:
NesPrgRom:152dd-152de:MapData_34:; short straight connector hallway to bendy hallway with exit K to summit
NesPrgRom:152e7:MapData_34_Layout:
NesPrgRom:152ec-152ed::; Map 2x3
NesPrgRom:152f2-152f4:MapData_34_Graphics:
NesPrgRom:152f9-152fc:MapData_34_Entrances:
NesPrgRom:15301-15304:MapData_34_Exits:Back to cave 7
NesPrgRom:15309-1530c::Out to summit
NesPrgRom:15312:MapData_34_Flags:
NesPrgRom:15313-15314:MapData_35:
NesPrgRom:1531d:MapData_35_Layout:
NesPrgRom:15322-15324::; Map 3x3
NesPrgRom:1532b-1532d:MapData_35_Graphics:
NesPrgRom:15332-15335:MapData_35_Entrances:
NesPrgRom:1533a-1533d:MapData_35_Exits:Back to summit
NesPrgRom:1534a-1534d::Out to waterfall valley
NesPrgRom:15353-15354:MapData_35_Flags:64da80 -> 62f201
NesPrgRom:15356-15357:MapData_40:
NesPrgRom:15360:MapData_40_Layout:
NesPrgRom:15365-15369::; Map 5x9
NesPrgRom:15392-15394:MapData_40_Graphics:
NesPrgRom:15399-1539c:MapData_40_Entrances:
NesPrgRom:153a9-153ac:MapData_40_Exits:Back to Mt Sabre Summit
NesPrgRom:153b1-153b4::To Portoa
NesPrgRom:153c1-153c4::To Waterfall Cave
NesPrgRom:153c9-153cc::To Fog Lamp Cave
NesPrgRom:153d1-153d4::Bridge to south half
NesPrgRom:153da-153db:MapData_40_Flags:64da40 -> 62f108
NesPrgRom:153dd-153de:MapData_41:
NesPrgRom:153e7:MapData_41_Layout:
NesPrgRom:153ec-153f0::; Map 5x9
NesPrgRom:15419-1541b:MapData_41_Graphics:
NesPrgRom:15420-15423:MapData_41_Entrances:
NesPrgRom:15428-1542b:MapData_41_Exits:To Lime Tree Valley
NesPrgRom:15434-15437::To Kirisa Plant Cave
NesPrgRom:1543c-1543f::Bridge to north half
NesPrgRom:15445-15446:MapData_41_Flags:64da20 -> 62f704
NesPrgRom:15448-15449:MapData_42:
NesPrgRom:15452:MapData_42_Layout:
NesPrgRom:15457-15459::; Map 3x3
NesPrgRom:15460-15462:MapData_42_Graphics:
NesPrgRom:15467-1546a:MapData_42_Entrances:
NesPrgRom:1546f-15472:MapData_42_Exits:To Waterfall Valley (south)
NesPrgRom:15477-1547a::To Lime Tree Lake
NesPrgRom:15480:MapData_42_Flags:
NesPrgRom:15481-15482:MapData_43:
NesPrgRom:1548b:MapData_43_Layout:
NesPrgRom:15490::; Map 1x1
NesPrgRom:15491-15493:MapData_43_Graphics:
NesPrgRom:15498-1549b:MapData_43_Entrances:
NesPrgRom:154a0-154a3:MapData_43_Exits:Out to Lime Tree Valley
NesPrgRom:154a8-154ab::In to Mesia's shrine
NesPrgRom:154b1-154b2:MapData_43_Flags:64d940 -> 62f001
NesPrgRom:154b4-154b5:MapData_52:
NesPrgRom:154be:MapData_52_Layout:
NesPrgRom:154c3::; Map 1x1
NesPrgRom:154c4-154c6:MapData_52_Graphics:
NesPrgRom:154cb-154ce:MapData_52_Entrances:
NesPrgRom:154cf-154d2:MapData_52_Exits:Out to Lime Tree Lake
NesPrgRom:154e4:MapData_52_Flags:
NesPrgRom:154e5-154e6:MapData_44:
NesPrgRom:154ef:MapData_44_Layout:
NesPrgRom:154f4-154f5::; Map 2x4
NesPrgRom:154fc-154fe:MapData_44_Graphics:
NesPrgRom:15503-15506:MapData_44_Entrances:
NesPrgRom:1550b-1550e:MapData_44_Exits:Out to Waterfall Valley (south)
NesPrgRom:15513-15516::To next room in (very linear cave)
NesPrgRom:1551c-1551d:MapData_44_Flags:64d802 -> 62f101
NesPrgRom:1551f-15520:MapData_45:
NesPrgRom:15529:MapData_45_Layout:
NesPrgRom:1552e-15531::; Map 4x4
NesPrgRom:1553e-15540:MapData_45_Graphics:
NesPrgRom:15545-15548:MapData_45_Entrances:
NesPrgRom:1554d-15550:MapData_45_Exits:Back to room 1
NesPrgRom:15555-15558::In to room 3
NesPrgRom:1555e-1555f:MapData_45_Flags:64d801 -> 62f208
NesPrgRom:15560-15561::64d780 -> 62f202
NesPrgRom:15563-15564:MapData_46:
NesPrgRom:1556d:MapData_46_Layout:
NesPrgRom:15572-15574::; Map 3x4
NesPrgRom:1557e-15580:MapData_46_Graphics:
NesPrgRom:15585-15588:MapData_46_Entrances:
NesPrgRom:1558d-15590:MapData_46_Exits:Back to room 2
NesPrgRom:15595-15598::In to Kirisa Meadow
NesPrgRom:1559e-1559f:MapData_46_Flags:64d040 -> 62f202
NesPrgRom:155a1-155a2:MapData_47:
NesPrgRom:155ab:MapData_47_Layout:
NesPrgRom:155b0-155b1::; Map 2x3
NesPrgRom:155b6-155b8:MapData_47_Graphics:
NesPrgRom:155bd-155c0:MapData_47_Entrances:
NesPrgRom:155c1-155c4:MapData_47_Exits:Back to room 3
NesPrgRom:155ca:MapData_47_Flags:
NesPrgRom:155cb-155cc:MapData_48:
NesPrgRom:155d5:MapData_48_Layout:
NesPrgRom:155da-155dc::; Map 3x5
NesPrgRom:155e9-155eb:MapData_48_Graphics:
NesPrgRom:155f0-155f3:MapData_48_Entrances:
NesPrgRom:155f8-155fb:MapData_48_Exits:Out to Waterfall Valley (north)
NesPrgRom:15600-15603::In to next room
NesPrgRom:15609-1560a:MapData_48_Flags:64d920 -> 62f002
NesPrgRom:1560b-1560c::64d910 -> 62f302
NesPrgRom:1560e-1560f:MapData_49:
NesPrgRom:15618:MapData_49_Layout:
NesPrgRom:1561d-1561e::; Map 2x1
NesPrgRom:1561f-15621:MapData_49_Graphics:
NesPrgRom:15626-15629:MapData_49_Entrances:
NesPrgRom:1562e-15631:MapData_49_Exits:Back to previous room
NesPrgRom:15636-15639::In to next room
NesPrgRom:1563f:MapData_49_Flags:
NesPrgRom:15640-15641:MapData_4a:
NesPrgRom:1564a:MapData_4a_Layout:
NesPrgRom:1564f-15652::; Map 4x5
NesPrgRom:15663-15665:MapData_4a_Graphics:
NesPrgRom:1566a-1566d:MapData_4a_Entrances:
NesPrgRom:15676-15679:MapData_4a_Exits:Back to previous room
NesPrgRom:1567e-15681::To dead end room (on left)
NesPrgRom:15686-15689::In to next room
NesPrgRom:1568f-15690:MapData_4a_Flags:64d904 -> 62f402
NesPrgRom:15691-15692::64d902 -> 62f304
NesPrgRom:15693-15694::64d901 -> 62f108
NesPrgRom:15696-15697:MapData_4b:
NesPrgRom:156a0:MapData_4b_Layout:
NesPrgRom:156a5-156a7::; Map 3x2
NesPrgRom:156ab-156ad:MapData_4b_Graphics:
NesPrgRom:156b2-156b5:MapData_4b_Entrances:
NesPrgRom:156b6-156b9:MapData_4b_Exits:Back to previous room
NesPrgRom:156bf-156c0:MapData_4b_Flags:64d908 -> 62f102
NesPrgRom:156c2-156c3:MapData_4c:
NesPrgRom:156cc:MapData_4c_Layout:
NesPrgRom:156d1-156d4::; Map 4x5
NesPrgRom:156e5-156e7:MapData_4c_Graphics:
NesPrgRom:156ec-156ef:MapData_4c_Entrances:
NesPrgRom:156f8-156fb:MapData_4c_Exits:Back to previous room
NesPrgRom:15700-15703::Left-hand door to next room
NesPrgRom:15708-1570b::Right-hand door to next room
NesPrgRom:15711-15712:MapData_4c_Flags:64d880 -> 62f204
NesPrgRom:15714-15715:MapData_4d:
NesPrgRom:1571e:MapData_4d_Layout:
NesPrgRom:15723-15726::; Map 4x5
NesPrgRom:15737-15739:MapData_4d_Graphics:
NesPrgRom:1573e-15741:MapData_4d_Entrances:
NesPrgRom:1574a-1574d:MapData_4d_Exits:Back to previous room (right exit)
NesPrgRom:15752-15755::Back to previous room (left exit)
NesPrgRom:1575a-1575d::In to next room
NesPrgRom:15763-15764:MapData_4d_Flags:64d840 -> 62f202
NesPrgRom:15765-15766::64d820 -> 62f102
NesPrgRom:15767-15768::64d810 -> 62f101
NesPrgRom:1576a-1576b:MapData_4e:
NesPrgRom:15774:MapData_4e_Layout:
NesPrgRom:15779-1577c::; Map 4x5
NesPrgRom:1578d-1578f:MapData_4e_Graphics:
NesPrgRom:15794-15797:MapData_4e_Entrances:
NesPrgRom:1579c-1579f:MapData_4e_Exits:Back
NesPrgRom:157a4-157a7::Onward
NesPrgRom:157ad-157ae:MapData_4e_Flags:64d808 -> 62f104
NesPrgRom:157b0-157b1:MapData_4f:
NesPrgRom:157ba:MapData_4f_Layout:
NesPrgRom:157bf-157c2::; Map 4x5
NesPrgRom:157d3-157d5:MapData_4f_Graphics:
NesPrgRom:157da-157dd:MapData_4f_Entrances:
NesPrgRom:157de-157e1:MapData_4f_Exits:Back
NesPrgRom:157e7-157e8:MapData_4f_Flags:64d804 -> 62f102
NesPrgRom:157ea-157eb:MapData_50:
NesPrgRom:157f4:MapData_50_Layout:
NesPrgRom:157f9-157fa::; Map 2x2
NesPrgRom:157fd-157ff:MapData_50_Graphics:
NesPrgRom:15804-15807:MapData_50_Entrances:
NesPrgRom:15828-1582b:MapData_50_Exits:Out to Waterfall Valley
NesPrgRom:15830-15833::Bridge to fisherman's house
NesPrgRom:15838-1583b::Palace
NesPrgRom:15840-15843::Fortune Teller
NesPrgRom:15844-15847::Pawn Shop
NesPrgRom:15848-1584b::Armor Shop
NesPrgRom:1584c-1584f::-- no door here, location does not exist
NesPrgRom:15850-15853::Inn
NesPrgRom:15854-15857::Tool Shop
NesPrgRom:15859-1585a:MapData_50_Flags:64d004 -> 62f001
NesPrgRom:1585c-1585d:MapData_51:
NesPrgRom:15866:MapData_51_Layout:
NesPrgRom:1586b::; Map 1x1
NesPrgRom:1586c-1586e:MapData_51_Graphics:
NesPrgRom:15873-15876:MapData_51_Entrances:
NesPrgRom:1587f-15882:MapData_51_Exits:Bridge to Portoa
NesPrgRom:15887-1588a::West to Angry Sea
NesPrgRom:1589f-158a2::In to house
NesPrgRom:158a4-158a5:MapData_51_Flags:64d004 -> 62f001
NesPrgRom:158a7-158a8:MapData_54:
NesPrgRom:158b1:MapData_54_Layout:
NesPrgRom:158b6-158ba::; Map 5x6
NesPrgRom:158d4-158d6:MapData_54_Graphics:
NesPrgRom:158db-158de:MapData_54_Entrances:
NesPrgRom:158e3-158e6:MapData_54_Exits:Out to Waterfall Valley
NesPrgRom:158eb-158ee::Next room
NesPrgRom:158f4-158f5:MapData_54_Flags:64da10 -> 62f201
NesPrgRom:158f6-158f7::64da08 -> 62f102
NesPrgRom:158f8-158f9::64da04 -> 62f108
NesPrgRom:158fb-158fc:MapData_55:
NesPrgRom:15905:MapData_55_Layout:
NesPrgRom:1590a-1590c::; Map 3x2
NesPrgRom:15910-15912:MapData_55_Graphics:
NesPrgRom:15917-1591a:MapData_55_Entrances:
NesPrgRom:1591f-15922:MapData_WaterfallCave3_Exits:Last room
NesPrgRom:15927-1592a::Next room
NesPrgRom:15930:MapData_55_Flags:
NesPrgRom:15931-15932:MapData_56:
NesPrgRom:1593b:MapData_56_Layout:
NesPrgRom:15940-15944::; Map 5x5
NesPrgRom:15959-1595b:MapData_56_Graphics:
NesPrgRom:15960-15963:MapData_56_Entrances:
NesPrgRom:1596c-1596f:MapData_56_Exits:Last room
NesPrgRom:15974-15977::Next room (left route)
NesPrgRom:15984-15987::Next room (right route)
NesPrgRom:15995-15996:MapData_56_Flags:64da02 -> 62f001
NesPrgRom:15997-15998::64da01 -> 62f010
NesPrgRom:1599a-1599b:MapData_57:
NesPrgRom:159a4:MapData_57_Layout:
NesPrgRom:159a9-159ad::; Map 5x5
NesPrgRom:159c2-159c4:MapData_57_Graphics:
NesPrgRom:159c9-159cc:MapData_57_Entrances:
NesPrgRom:159d1-159d4:MapData_57_Exits:Last room (left route)
NesPrgRom:159d9-159dc::Last room (right route)
NesPrgRom:159e2-159e3:MapData_57_Flags:64d980 -> 62f108
NesPrgRom:159e5-159e6:MapData_60:
NesPrgRom:159ef:MapData_60_Layout:
NesPrgRom:159f4-159fb::; Map 8x9
NesPrgRom:15a3c-15a3e:MapData_60_Graphics:
NesPrgRom:15a43-15a46:MapData_60_Entrances:
NesPrgRom:15a67-15a6a:MapData_60_Exits:To Portoa
NesPrgRom:15a77-15a7a::To Underground Channel
NesPrgRom:15a7f-15a82::Lighthouse
NesPrgRom:15a83-15a86::Joel Secret Passage
NesPrgRom:15a8b-15a8e::Joel
NesPrgRom:15a93-15a96::Evil Spirit Island Entrance
NesPrgRom:15a9b-15a9e::To Swan
NesPrgRom:15aa3-15aa6::Cabin
NesPrgRom:15aa8-15aa9:MapData_60_Flags:64d008 -> 62f202
NesPrgRom:15aab-15aac:MapData_61:
NesPrgRom:15ab5:MapData_61_Layout:
NesPrgRom:15aba::; Map 1x1
NesPrgRom:15abb-15abd:MapData_61_Graphics:
NesPrgRom:15ac2-15ac5:MapData_61_Entrances:
NesPrgRom:15ac6-15ac9:MapData_61_Exits:
NesPrgRom:15acf:MapData_61_Flags:
NesPrgRom:15ad0-15ad1:MapData_64:
NesPrgRom:15ada:MapData_64_Layout:
NesPrgRom:15adf-15ae2::; Map 4x3
NesPrgRom:15aeb-15aed:MapData_64_Graphics:
NesPrgRom:15af2-15af5:MapData_64_Entrances:
NesPrgRom:15b06-15b09:MapData_64_Exits:
NesPrgRom:15b2b-15b2c:MapData_64_Flags:64d740 -> 62f202
NesPrgRom:15b2d-15b2e::64d720 -> 62f208
NesPrgRom:15b2f-15b30::64d710 -> 62f104
NesPrgRom:15b32-15b33:MapData_65:
NesPrgRom:15b3c:MapData_65_Layout:
NesPrgRom:15b41::; Map 1x3
NesPrgRom:15b44-15b46:MapData_65_Graphics:
NesPrgRom:15b4b-15b4e:MapData_65_Entrances:
NesPrgRom:15b57-15b5a:MapData_65_Exits:
NesPrgRom:15b6c:MapData_65_Flags:
NesPrgRom:15b6d-15b6e:MapData_68:
NesPrgRom:15b77:MapData_68_Layout:
NesPrgRom:15b7c-15b7e::; Map 3x1
NesPrgRom:15b7f-15b81:MapData_68_Graphics:
NesPrgRom:15b86-15b89:MapData_68_Entrances:
NesPrgRom:15b8e-15b91:MapData_68_Exits:
NesPrgRom:15b9f:MapData_68_Flags:
NesPrgRom:15ba0-15ba1:MapData_69:
NesPrgRom:15baa:MapData_69_Layout:
NesPrgRom:15baf-15bb5::; Map 7x7
NesPrgRom:15be0-15be2:MapData_69_Graphics:
NesPrgRom:15be7-15bea:MapData_69_Entrances:
NesPrgRom:15bef-15bf2:MapData_69_Exits:
NesPrgRom:15c00-15c01:MapData_69_Flags:64d708 -> 62f204
NesPrgRom:15c02-15c03::64d704 -> 62f120
NesPrgRom:15c04-15c05::64d702 -> 62f201
NesPrgRom:15c06-15c07::64d701 -> 62f510
NesPrgRom:15c08-15c09::64d680 -> 62f440
NesPrgRom:15c0b-15c0c:MapData_6a:
NesPrgRom:15c17:MapData_6a_Layout:
NesPrgRom:15c1c-15c22::; Map 7x5
NesPrgRom:15c3f-15c41:MapData_6a_Graphics:
NesPrgRom:15c46-15c49:MapData_6a_Entrances:
NesPrgRom:15c52-15c55:MapData_6a_Exits:
NesPrgRom:15c6b-15c6c:MapData_6a_Flags:64d640 -> 62f101
NesPrgRom:15c6d-15c6e::64d620 -> 62f208
NesPrgRom:15c70-15c73:MapData_6a_Pits:
NesPrgRom:15c75-15c76:MapData_6b:
NesPrgRom:15c7f:MapData_6b_Layout:
NesPrgRom:15c84-15c85::; Map 2x3
NesPrgRom:15c8a-15c8c:MapData_6b_Graphics:
NesPrgRom:15c91-15c94:MapData_6b_Entrances:
NesPrgRom:15c95-15c98:MapData_6b_Exits:
NesPrgRom:15c9e-15c9f:MapData_6b_Flags:64d020 -> 62f201
NesPrgRom:15ca1-15ca2:MapData_6c:
NesPrgRom:15cab:MapData_6c_Layout:
NesPrgRom:15cb0-15cb5::; Map 6x7
NesPrgRom:15cda-15cdc:MapData_6c_Graphics:
NesPrgRom:15ce1-15ce4:MapData_6c_Entrances:
NesPrgRom:15ced-15cf0:MapData_6c_Exits:
NesPrgRom:15d06:MapData_6c_Flags:
NesPrgRom:15d07-15d08:MapData_6d:
NesPrgRom:15d13:MapData_6d_Layout:
NesPrgRom:15d18-15d1c::; Map 5x7
NesPrgRom:15d3b-15d3d:MapData_6d_Graphics:
NesPrgRom:15d42-15d45:MapData_6d_Entrances:
NesPrgRom:15d4e-15d51:MapData_6d_Exits:
NesPrgRom:15d67:MapData_6d_Flags:
NesPrgRom:15d68-15d6b:MapData_6d_Pits:
NesPrgRom:15d71-15d72:MapData_6e:
NesPrgRom:15d7d:MapData_6e_Layout:
NesPrgRom:15d82::; Map 1x3
NesPrgRom:15d85-15d87:MapData_6e_Graphics:
NesPrgRom:15d8c-15d8f:MapData_6e_Entrances:
NesPrgRom:15d90-15d93:MapData_6e_Exits:
NesPrgRom:15d99:MapData_6e_Flags:
NesPrgRom:15d9a-15d9d:MapData_6e_Pits:
NesPrgRom:15d9f-15da0:MapData_6f:
NesPrgRom:15dab:MapData_6f_Layout:
NesPrgRom:15db0::; Map 1x3
NesPrgRom:15db3-15db5:MapData_6f_Graphics:
NesPrgRom:15dba-15dbd:MapData_6f_Exits:
NesPrgRom:15dc3:MapData_6f_Flags:
NesPrgRom:15dc4-15dc7:MapData_6f_Pits:
NesPrgRom:15dc9-15dca:MapData_70:
NesPrgRom:15dd3:MapData_70_Layout:
NesPrgRom:15dd8-15dd9::; Map 2x2
NesPrgRom:15ddc-15dde:MapData_70_Graphics:
NesPrgRom:15de3-15de6:MapData_70_Entrances:
NesPrgRom:15deb-15dee:MapData_70_Exits:Angry Sea
NesPrgRom:15df3-15df6::Joel Shed
NesPrgRom:15dfc:MapData_70_Flags:
NesPrgRom:15dfd-15dfe:MapData_62:
NesPrgRom:15e07:MapData_62_Layout:
NesPrgRom:15e0c::; Map 1x1
NesPrgRom:15e0d-15e0f:MapData_62_Graphics:
NesPrgRom:15e14-15e17:MapData_62_Entrances:
NesPrgRom:15e18-15e1b:MapData_62_Exits:
NesPrgRom:15e1d:MapData_62_Flags:
NesPrgRom:15e1e-15e1f:MapData_71:
NesPrgRom:15e28:MapData_71_Layout:
NesPrgRom:15e2d-15e2e::; Map 2x2
NesPrgRom:15e31-15e33:MapData_71_Graphics:
NesPrgRom:15e38-15e3b:MapData_71_Entrances:
NesPrgRom:15e4c-15e4f:MapData_71_Exits:
NesPrgRom:15e65:MapData_71_Flags:
NesPrgRom:15e66-15e67:MapData_72:
NesPrgRom:15e70:MapData_72_Layout:
NesPrgRom:15e75-15e77::; Map 3x1
NesPrgRom:15e78-15e7a:MapData_72_Graphics:
NesPrgRom:15e7f-15e82:MapData_72_Entrances:
NesPrgRom:15ea7-15eaa:MapData_72_Exits:
NesPrgRom:15ed4:MapData_72_Flags:
NesPrgRom:15ed5-15ed6:MapData_73:
NesPrgRom:15edf:MapData_73_Layout:
NesPrgRom:15ee4::; Map 1x1
NesPrgRom:15ee5-15ee7:MapData_73_Graphics:
NesPrgRom:15eec-15eef:MapData_73_Entrances:
NesPrgRom:15ef4-15ef7:MapData_73_Exits:
NesPrgRom:15f05-15f06:MapData_73_Flags:64d608 -> 62f001
NesPrgRom:15f08-15f09:MapData_78:
NesPrgRom:15f12:MapData_78_Layout:
NesPrgRom:15f17-15f1b::; Map 5x5
NesPrgRom:15f30-15f32:MapData_78_Graphics:
NesPrgRom:15f37-15f3a:MapData_78_Entrances:
NesPrgRom:15f3f-15f42::unused - in the mountains
NesPrgRom:15f4b-15f4e:MapData_78_Exits:
NesPrgRom:15f78:MapData_78_Flags:
NesPrgRom:15f79-15f7a:MapData_7c:
NesPrgRom:15f83:MapData_7c_Layout:
NesPrgRom:15f88-15f8d::; Map 6x8
NesPrgRom:15fb8-15fba:MapData_7c_Graphics:
NesPrgRom:15fbf-15fc2:MapData_7c_Entrances:
NesPrgRom:15fe7-15fea:MapData_7c_Exits:
NesPrgRom:16044-16045:MapData_7c_Flags:64d604 -> 62f604
NesPrgRom:16046-16047::64d602 -> 62f304
NesPrgRom:16048-16049::64d601 -> 62f101
NesPrgRom:1604b-1604c:MapData_7d:
NesPrgRom:16055:MapData_7d_Layout:
NesPrgRom:1605a-1605b::; Map 2x2
NesPrgRom:1605e-16060:MapData_7d_Graphics:
NesPrgRom:16065-16068:MapData_7d_Entrances:
NesPrgRom:1606d-16070:MapData_7d_Exits:
NesPrgRom:1607e:MapData_7d_Flags:
NesPrgRom:1607f-16080:MapData_7e:
NesPrgRom:16089:MapData_7e_Layout:
NesPrgRom:1608e-1608f::; Map 2x1
NesPrgRom:16090-16092:MapData_7e_Graphics:
NesPrgRom:16097-1609a:MapData_7e_Entrances:
NesPrgRom:1609f-160a2:MapData_7e_Exits:
NesPrgRom:160b0:MapData_7e_Flags:
NesPrgRom:160b1-160b2:MapData_7f:
NesPrgRom:160bb:MapData_7f_Layout:
NesPrgRom:160c0-160c2::; Map 3x2
NesPrgRom:160c6-160c8:MapData_7f_Graphics:
NesPrgRom:160cd-160d0:MapData_7f_Entrances:
NesPrgRom:160d9-160dc:MapData_7f_Exits:
NesPrgRom:160f2:MapData_7f_Flags:
NesPrgRom:160f3-160f4:MapData_80:
NesPrgRom:160fd:MapData_80_Layout:
NesPrgRom:16102-16106::; Map 5x3
NesPrgRom:16111-16113:MapData_80_Graphics:
NesPrgRom:16118-1611b:MapData_80_Entrances:
NesPrgRom:16128-1612b:MapData_80_Exits:
NesPrgRom:16149:MapData_80_Flags:
NesPrgRom:1614a-1614b:MapData_81:
NesPrgRom:16154:MapData_81_Layout:
NesPrgRom:16159-1615b::; Map 3x2
NesPrgRom:1615f-16161:MapData_81_Graphics:
NesPrgRom:16166-16169:MapData_81_Entrances:
NesPrgRom:16172-16175:MapData_81_Exits:
NesPrgRom:1618b:MapData_81_Flags:
NesPrgRom:1618c-1618d:MapData_82:
NesPrgRom:16196:MapData_82_Layout:
NesPrgRom:1619b-1619c::; Map 2x2
NesPrgRom:1619f-161a1:MapData_82_Graphics:
NesPrgRom:161a6-161a9:MapData_82_Entrances:
NesPrgRom:161aa-161ad:MapData_82_Exits:
NesPrgRom:161b3:MapData_82_Flags:
NesPrgRom:161b4-161b5:MapData_83:
NesPrgRom:161be:MapData_83_Layout:
NesPrgRom:161c3-161c4::; Map 2x3
NesPrgRom:161c9-161cb:MapData_83_Graphics:
NesPrgRom:161d0-161d3:MapData_83_Entrances:
NesPrgRom:161d8-161db:MapData_83_Exits:
NesPrgRom:161e9-161ea:MapData_83_Flags:64d580 -> 62f102
NesPrgRom:161ec-161ed:MapData_84:
NesPrgRom:161f6:MapData_84_Layout:
NesPrgRom:161fb-161fc::; Map 2x3
NesPrgRom:16201-16203:MapData_84_Graphics:
NesPrgRom:16208-1620b:MapData_84_Entrances:
NesPrgRom:16210-16213:MapData_84_Exits:
NesPrgRom:16229-1622a:MapData_84_Flags:64d540 -> 62f002
NesPrgRom:1622c-1622d:MapData_85:
NesPrgRom:16236:MapData_85_Layout:
NesPrgRom:1623b-1623c::; Map 2x2
NesPrgRom:1623f-16241:MapData_85_Graphics:
NesPrgRom:16246-16249:MapData_85_Entrances:
NesPrgRom:1624e-16251:MapData_85_Exits:
NesPrgRom:1625f:MapData_85_Flags:
NesPrgRom:16260-16261:MapData_86:
NesPrgRom:1626a:MapData_86_Layout:
NesPrgRom:1626f-16272::; Map 4x3
NesPrgRom:1627b-1627d:MapData_86_Graphics:
NesPrgRom:16282-16285:MapData_86_Entrances:
NesPrgRom:16292-16295:MapData_86_Exits:
NesPrgRom:162b3-162b4:MapData_86_Flags:64d520 -> 62f102
NesPrgRom:162b6-162b7:MapData_87:
NesPrgRom:162c0:MapData_87_Layout:
NesPrgRom:162c5-162c6::; Map 2x3
NesPrgRom:162cb-162cd:MapData_87_Graphics:
NesPrgRom:162d2-162d5:MapData_87_Entrances:
NesPrgRom:162da-162dd:MapData_87_Exits:
NesPrgRom:162eb-162ec:MapData_87_Flags:64d510 -> 62f102
NesPrgRom:162ee-162ef:MapData_88:
NesPrgRom:162f8:MapData_88_Layout:
NesPrgRom:162fd-16301::; Map 5x5
NesPrgRom:16316-16318:MapData_88_Graphics:
NesPrgRom:1631d-16320:MapData_88_Entrances:
NesPrgRom:16329-1632c:MapData_88_Exits:
NesPrgRom:16342:MapData_88_Flags:
NesPrgRom:16343-16344:MapData_89:
NesPrgRom:1634d:MapData_89_Layout:
NesPrgRom:16352-16356::; Map 5x6
NesPrgRom:16370-16372:MapData_89_Graphics:
NesPrgRom:16377-1637a:MapData_89_Entrances:
NesPrgRom:16383-16386:MapData_89_Exits:
NesPrgRom:1639c-1639d:MapData_89_Flags:64d504 -> 62f104
NesPrgRom:1639e-1639f::64d502 -> 62f108
NesPrgRom:163a1-163a2:MapData_8a:
NesPrgRom:163ad:MapData_8a_Layout:
NesPrgRom:163b2-163b5::; Map 4x6
NesPrgRom:163ca-163cc:MapData_8a_Graphics:
NesPrgRom:163d1-163d4:MapData_8a_Entrances:
NesPrgRom:163d5-163d8:MapData_8a_Exits:
NesPrgRom:163de:MapData_8a_Flags:
NesPrgRom:163df-163e2:MapData_8a_Pits:
NesPrgRom:163e4-163e5:MapData_8c:
NesPrgRom:163ee:MapData_8c_Layout:
NesPrgRom:163f3::; Map 1x3
NesPrgRom:163f6-163f8:MapData_8c_Graphics:
NesPrgRom:163fd-16400:MapData_8c_Entrances:
NesPrgRom:16419-1641c:MapData_8c_Exits:
NesPrgRom:1643e:MapData_8c_Flags:
NesPrgRom:1643f-16440:MapData_8e:
NesPrgRom:16449:MapData_8e_Layout:
NesPrgRom:1644e-1644f::; Map 2x2
NesPrgRom:16452-16454:MapData_8e_Graphics:
NesPrgRom:16459-1645c:MapData_8e_Entrances:
NesPrgRom:16471-16474:MapData_8e_Exits:
NesPrgRom:16492:MapData_8e_Flags:
NesPrgRom:16493-16494:MapData_90:
NesPrgRom:1649d:MapData_90_Layout:
NesPrgRom:164a2-164a7::; Map 6x6
NesPrgRom:164c6-164c8:MapData_90_Graphics:
NesPrgRom:164cd-164d0:MapData_90_Entrances:
NesPrgRom:164d9-164dc:MapData_90_Exits:
NesPrgRom:164f2:MapData_90_Flags:
NesPrgRom:164f3-164f4:MapData_91:
NesPrgRom:164fd:MapData_91_Layout:
NesPrgRom:16502-16509::; Map 8x12
NesPrgRom:1655a-1655c:MapData_91_Graphics:
NesPrgRom:16561-16564:MapData_91_Entrances:
NesPrgRom:16569-1656c:MapData_91_Exits:
NesPrgRom:1657a-1657b:MapData_91_Flags:64d308 -> 62f104
NesPrgRom:1657c-1657d::64d304 -> 62f502
NesPrgRom:1657e-1657f::64d302 -> 62f404
NesPrgRom:16580-16581::64d301 -> 62f704
NesPrgRom:16582-16583::64d280 -> 62f310
NesPrgRom:16584-16585::64d240 -> 62f810
NesPrgRom:16586-16587::64d220 -> 62f910
NesPrgRom:16588-16589::64d210 -> 62f520
NesPrgRom:1658a-1658b::64d208 -> 62f380
NesPrgRom:1658c-1658d::64d204 -> 62f580
NesPrgRom:1658e-1658f::64d202 -> 62f880
NesPrgRom:16591-16592:MapData_8f:
NesPrgRom:1659b:MapData_8f_Layout:
NesPrgRom:165a0::; Map 1x3
NesPrgRom:165a3-165a5:MapData_8f_Graphics:
NesPrgRom:165aa-165ad:MapData_8f_Entrances:
NesPrgRom:165ae-165b1:MapData_8f_Exits:
NesPrgRom:165b7-165b8:MapData_8f_Flags:64d201 -> 62f101
NesPrgRom:165ba-165bb:MapData_92:
NesPrgRom:165c4:MapData_92_Layout:
NesPrgRom:165c9-165cb::; Map 3x3
NesPrgRom:165d2-165d4:MapData_92_Graphics:
NesPrgRom:165d9-165dc:MapData_92_Entrances:
NesPrgRom:165e1-165e4:MapData_92_Exits:
NesPrgRom:165f2:MapData_92_Flags:
NesPrgRom:165f3-165f4:MapData_93:
NesPrgRom:165fd:MapData_93_Layout:
NesPrgRom:16602-16603::; Map 2x1
NesPrgRom:16604-16606:MapData_93_Graphics:
NesPrgRom:1660b-1660e:MapData_93_Entrances:
NesPrgRom:16623-16626:MapData_93_Exits:
NesPrgRom:16644:MapData_93_Flags:
NesPrgRom:16645-16646:MapData_94:
NesPrgRom:1664f:MapData_94_Layout:
NesPrgRom:16654::; Map 1x1
NesPrgRom:16655-16657:MapData_94_Graphics:
NesPrgRom:1665c-1665f:MapData_94_Entrances:
NesPrgRom:16664-16667:MapData_94_Exits:
NesPrgRom:16675:MapData_94_Flags:
NesPrgRom:16676-16677:MapData_95:
NesPrgRom:16680:MapData_95_Layout:
NesPrgRom:16685-16687::; Map 3x3
NesPrgRom:1668e-16690:MapData_95_Graphics:
NesPrgRom:16695-16698:MapData_95_Entrances:
NesPrgRom:1669d-166a0:MapData_95_Exits:
NesPrgRom:166ae:MapData_95_Flags:
NesPrgRom:166af-166b0:MapData_96:
NesPrgRom:166b9:MapData_96_Layout:
NesPrgRom:166be-166c0::; Map 3x2
NesPrgRom:166c4-166c6:MapData_96_Graphics:
NesPrgRom:166cb-166ce:MapData_96_Entrances:
NesPrgRom:166d3-166d6:MapData_96_Exits:
NesPrgRom:166e4:MapData_96_Flags:
NesPrgRom:166e5-166e6:MapData_98:
NesPrgRom:166ef:MapData_98_Layout:
NesPrgRom:166f4-166f7::; Map 4x6
NesPrgRom:1670c-1670e:MapData_98_Graphics:
NesPrgRom:16713-16716:MapData_98_Entrances:
NesPrgRom:1671f-16722:MapData_98_Exits:
NesPrgRom:16738:MapData_98_Flags:
NesPrgRom:16739-1673a:MapData_9c:
NesPrgRom:16743:MapData_9c_Layout:
NesPrgRom:16748::; Map 1x2
NesPrgRom:1674a-1674c:MapData_9c_Graphics:
NesPrgRom:16751-16754:MapData_9c_Entrances:
NesPrgRom:16759-1675c:MapData_9c_Exits:
NesPrgRom:1676a:MapData_9c_Flags:
NesPrgRom:1676b-1676c:MapData_9d:
NesPrgRom:16775:MapData_9d_Layout:
NesPrgRom:1677a-1677c::; Map 3x2
NesPrgRom:16780-16782:MapData_9d_Graphics:
NesPrgRom:16787-1678a:MapData_9d_Entrances:
NesPrgRom:16793-16796:MapData_9d_Exits:
NesPrgRom:167ac:MapData_9d_Flags:
NesPrgRom:167ad-167ae:MapData_9e:
NesPrgRom:167b7:MapData_9e_Layout:
NesPrgRom:167bc-167c2::; Map 7x11
NesPrgRom:16809-1680b:MapData_9e_Graphics:
NesPrgRom:16810-16813:MapData_9e_Entrances:
NesPrgRom:16854-16857:MapData_9e_Exits:
NesPrgRom:168dd:MapData_9e_Flags:
NesPrgRom:168de-168df:MapData_9f:
NesPrgRom:168ea-168ef:MapData_9f_Layout:
NesPrgRom:168f2-168f4:MapData_9f_Graphics:
NesPrgRom:168f9-168fc:MapData_9f_Entrances:
NesPrgRom:168fd-16900:MapData_9f_Exits:
NesPrgRom:16906-16907:MapData_9f_Flags:64d180 -> 62f001
NesPrgRom:16909-1690c:MapData_9f_Pits:
NesPrgRom:1690e-1690f:MapData_a0:
NesPrgRom:16918:MapData_a0_Layout:
NesPrgRom:1691d-1691f::; Map 3x5
NesPrgRom:1692c-1692e:MapData_a0_Graphics:
NesPrgRom:16933-16936:MapData_a0_Entrances:
NesPrgRom:1693b-1693e:MapData_a0_Exits:
NesPrgRom:1694c-1694d:MapData_a0_Flags:64d140 -> 62f301
NesPrgRom:1694f-16950:MapData_a1:
NesPrgRom:16959:MapData_a1_Layout:
NesPrgRom:1695e-16961::; Map 4x5
NesPrgRom:16972-16974:MapData_a1_Graphics:
NesPrgRom:16979-1697c:MapData_a1_Entrances:
NesPrgRom:16981-16984:MapData_a1_Exits:
NesPrgRom:1699a:MapData_a1_Flags:
NesPrgRom:1699b-1699c:MapData_a2:
NesPrgRom:169a7:MapData_a2_Layout:
NesPrgRom:169ac-169b0::; Map 5x5
NesPrgRom:169c5-169c7:MapData_a2_Graphics:
NesPrgRom:169cc-169cf:MapData_a2_Entrances:
NesPrgRom:169dc-169df:MapData_a2_Exits:
NesPrgRom:169fd:MapData_a2_Flags:
NesPrgRom:169fe-16a01:MapData_a2_Pits:
NesPrgRom:16a0f-16a10:MapData_a3:
NesPrgRom:16a19-16a1f:MapData_a3_Layout:
NesPrgRom:16a28-16a2a:MapData_a3_Graphics:
NesPrgRom:16a2f-16a32:MapData_a3_Entrances:
NesPrgRom:16a33-16a36:MapData_a3_Exits:
NesPrgRom:16a3c:MapData_a3_Flags:
NesPrgRom:16a3d-16a3e:MapData_a4:
NesPrgRom:16a47:MapData_a4_Layout:
NesPrgRom:16a4c-16a4d::; Map 2x5
NesPrgRom:16a56-16a58:MapData_a4_Graphics:
NesPrgRom:16a5d-16a60:MapData_a4_Entrances:
NesPrgRom:16a61-16a64:MapData_a4_Exits:
NesPrgRom:16a6a:MapData_a4_Flags:
NesPrgRom:16a6b-16a6c:MapData_a5:
NesPrgRom:16a77:MapData_a5_Layout:
NesPrgRom:16a78-16a7b::; Map 3x6
NesPrgRom:16a8e-16a90:MapData_a5_Graphics:
NesPrgRom:16a95-16a98:MapData_a5_Entrances:
NesPrgRom:16a9d-16aa0:MapData_a5_Exits:
NesPrgRom:16aae:MapData_a5_Flags:
NesPrgRom:16aaf-16ab2:MapData_a5_Pits:
NesPrgRom:16ab8-16ab9:MapData_a6:
NesPrgRom:16ac2:MapData_a6_Layout:
NesPrgRom:16ac7::; Map 1x2
NesPrgRom:16ac9-16acb:MapData_a6_Graphics:
NesPrgRom:16ad0-16ad3:MapData_a6_Entrances:
NesPrgRom:16ad8-16adb:MapData_a6_Exits:
NesPrgRom:16af1-16af2:MapData_a6_Flags:
NesPrgRom:16af4-16af5:MapData_a7:
NesPrgRom:16afe:MapData_a7_Layout:
NesPrgRom:16b03::; Map 1x1
NesPrgRom:16b04-16b06:MapData_a7_Graphics:
NesPrgRom:16b0b-16b0e:MapData_a7_Entrances:
NesPrgRom:16b0f-16b12:MapData_a7_Exits:
NesPrgRom:16b28:MapData_a7_Flags:
NesPrgRom:16b29-16b2a:MapData_a8:
NesPrgRom:16b33:MapData_a8_Layout:
NesPrgRom:16b38::; Map 1x3
NesPrgRom:16b3b-16b3d:MapData_a8_Graphics:
NesPrgRom:16b42-16b45:MapData_a8_Entrances:
NesPrgRom:16b4a-16b4d:MapData_a8_Exits:
NesPrgRom:16b63-16b64:MapData_a8_Flags:64d501 -> 62f001
NesPrgRom:16b66-16b67:MapData_a9:
NesPrgRom:16b70:MapData_a9_Layout:
NesPrgRom:16b75-16b7b::; Map 7x9
NesPrgRom:16bb4-16bb6:MapData_a9_Graphics:
NesPrgRom:16bbb-16bbe:MapData_a9_Entrances:
NesPrgRom:16bc3-16bc6:MapData_a9_Exits:
NesPrgRom:16bdc:MapData_a9_Flags:
NesPrgRom:16bdd-16bde:MapData_aa:
NesPrgRom:16be7:MapData_aa_Layout:
NesPrgRom:16bec::; Map 1x3
NesPrgRom:16bef-16bf1:MapData_aa_Graphics:
NesPrgRom:16bf6-16bf9:MapData_aa_Entrances:
NesPrgRom:16bfe-16c01:MapData_aa_Exits:
NesPrgRom:16c17:MapData_aa_Flags:
NesPrgRom:16c18-16c19:MapData_ab:
NesPrgRom:16c22:MapData_ab_Layout:
NesPrgRom:16c27-16c2e::; Map 8x9
NesPrgRom:16c6f-16c71:MapData_ab_Graphics:
NesPrgRom:16c76-16c79:MapData_ab_Entrances:
NesPrgRom:16c7e-16c81:MapData_ab_Exits:
NesPrgRom:16c8f-16c90:MapData_ab_Flags:64d440 -> 62f504
NesPrgRom:16c91-16c92::64d420 -> 62f520
NesPrgRom:16c93-16c94::64d410 -> 62f480
NesPrgRom:16c95-16c96::64d408 -> 62f420
NesPrgRom:16c97-16c98::64d404 -> 62f380
NesPrgRom:16c99-16c9a::64d402 -> 62f210
NesPrgRom:16c9b-16c9c::64d401 -> 62f808
NesPrgRom:16c9d-16c9e::64d380 -> 62f302
NesPrgRom:16c9f-16ca0::64d340 -> 62f140
NesPrgRom:16ca2-16ca3:MapData_ac:
NesPrgRom:16cac:MapData_ac_Layout:
NesPrgRom:16cb1::; Map 1x7
NesPrgRom:16cb8-16cba:MapData_ac_Graphics:
NesPrgRom:16cbf-16cc2:MapData_ac_Entrances:
NesPrgRom:16cc7-16cca:MapData_ac_Exits:
NesPrgRom:16cd8:MapData_ac_Flags:
NesPrgRom:16cd9-16cda:MapData_ad:
NesPrgRom:16ce3:MapData_ad_Layout:
NesPrgRom:16ce8-16cec::; Map 5x8
NesPrgRom:16d10-16d12:MapData_ad_Graphics:
NesPrgRom:16d17-16d1a:MapData_ad_Entrances:
NesPrgRom:16d27-16d2a:MapData_ad_Exits:
NesPrgRom:16d48:MapData_ad_Flags:
NesPrgRom:16d49-16d4a:MapData_ae:
NesPrgRom:16d55:MapData_ae_Layout:
NesPrgRom:16d5a-16d5c::; Map 3x7
NesPrgRom:16d6f-16d71:MapData_ae_Graphics:
NesPrgRom:16d76-16d79:MapData_ae_Entrances:
NesPrgRom:16d7e-16d81:MapData_ae_Exits:
NesPrgRom:16d8f-16d90:MapData_ae_Flags:64d320 -> 62f402
NesPrgRom:16d92-16d95:MapData_ae_Pits:
NesPrgRom:16d9f-16da0:MapData_af:
NesPrgRom:16dab:MapData_af_Layout:
NesPrgRom:16db0-16db3::; Map 4x11
NesPrgRom:16ddc-16dde:MapData_af_Graphics:
NesPrgRom:16de3-16de6:MapData_af_Entrances:
NesPrgRom:16de7-16dea::unused
NesPrgRom:16def-16df2:MapData_af_Exits:
NesPrgRom:16df7-16dfa::unused
NesPrgRom:16dfb-16dfe::unused
NesPrgRom:16e08:MapData_af_Flags:
NesPrgRom:16e09-16e0c:MapData_af_Pits:
NesPrgRom:16e1a-16e1b:MapData_b9:
NesPrgRom:16e24:MapData_b9_Layout:
NesPrgRom:16e29-16e2c::; Map 4x11
NesPrgRom:16e55-16e57:MapData_b9_Graphics:
NesPrgRom:16e5c-16e5f:MapData_b9_Entrances:
NesPrgRom:16e68-16e6b:MapData_b9_Exits:
NesPrgRom:16e81:MapData_b9_Flags:
NesPrgRom:16e82-16e91::; Extra data???
NesPrgRom:16e93-16e94:MapData_b0:
NesPrgRom:16e9d:MapData_b0_Layout:
NesPrgRom:16ea2-16ea4::; Map 3x4
NesPrgRom:16eae-16eb0:MapData_b0_Graphics:
NesPrgRom:16eb5-16eb8:MapData_b0_Entrances:
NesPrgRom:16ec1-16ec4:MapData_b0_Exits:
NesPrgRom:16eda:MapData_b0_Flags:
NesPrgRom:16edb-16edc:MapData_b1:
NesPrgRom:16ee5:MapData_b1_Layout:
NesPrgRom:16eea-16eeb::; Map 2x4
NesPrgRom:16ef2-16ef4:MapData_b1_Graphics:
NesPrgRom:16ef9-16efc:MapData_b1_Entrances:
NesPrgRom:16f01-16f04:MapData_b1_Exits:
NesPrgRom:16f12:MapData_b1_Flags:
NesPrgRom:16f13-16f14:MapData_b2:
NesPrgRom:16f1d:MapData_b2_Layout:
NesPrgRom:16f22-16f24::; Map 3x6
NesPrgRom:16f34-16f36:MapData_b2_Graphics:
NesPrgRom:16f3b-16f3e:MapData_b2_Entrances:
NesPrgRom:16f47-16f4a:MapData_b2_Exits:
NesPrgRom:16f60:MapData_b2_Flags:
NesPrgRom:16f61-16f62:MapData_b3:
NesPrgRom:16f6b:MapData_b3_Layout:
NesPrgRom:16f70-16f71::; Map 2x2
NesPrgRom:16f74-16f76:MapData_b3_Graphics:
NesPrgRom:16f7b-16f7e:MapData_b3_Entrances:
NesPrgRom:16f83-16f86:MapData_b3_Exits:
NesPrgRom:16f94:MapData_b3_Flags:
NesPrgRom:16f95-16f96:MapData_b4:
NesPrgRom:16fa1:MapData_b4_Layout:
NesPrgRom:16fa6-16fac::; Map 7x9
NesPrgRom:16fe5-16fe7:MapData_b4_Graphics:
NesPrgRom:16fec-16fef:MapData_b4_Entrances:
NesPrgRom:17004-17007:MapData_b4_Exits:
NesPrgRom:17045-17046:MapData_b4_Flags:64d310 -> 62f420
NesPrgRom:17048-1704b:MapData_b4_Pits:
NesPrgRom:17055-17056:MapData_ba:
NesPrgRom:1705f:MapData_ba_Layout:
NesPrgRom:17064-1706a::; Map 7x9
NesPrgRom:170a3-170a5:MapData_ba_Graphics:
NesPrgRom:170aa-170ad:MapData_ba_Entrances:
NesPrgRom:170c2-170c5:MapData_ba_Exits:
NesPrgRom:17103:MapData_ba_Flags:
NesPrgRom:17104-17105:MapData_b5:
NesPrgRom:1710e:MapData_b5_Layout:
NesPrgRom:17113-17118::; Map 6x5
NesPrgRom:17131-17133:MapData_b5_Graphics:
NesPrgRom:17138-1713b:MapData_b5_Entrances:
NesPrgRom:17144-17147:MapData_b5_Exits:
NesPrgRom:1715d:MapData_b5_Flags:
NesPrgRom:1715e-1715f:MapData_b6:
NesPrgRom:17168:MapData_b6_Layout:
NesPrgRom:1716d::; Map 1x5
NesPrgRom:17172-17174:MapData_b6_Graphics:
NesPrgRom:17179-1717c:MapData_b6_Entrances:
NesPrgRom:1717d-17180:MapData_b6_Exits:
NesPrgRom:17186:MapData_b6_Flags:
NesPrgRom:17187-17188:MapData_b7:
NesPrgRom:17191:MapData_b7_Layout:
NesPrgRom:17196-17197::; Map 2x4
NesPrgRom:1719e-171a0:MapData_b7_Graphics:
NesPrgRom:171a5-171a8:MapData_b7_Entrances:
NesPrgRom:171c5-171c8:MapData_b7_Exits:
NesPrgRom:17206:MapData_b7_Flags:
NesPrgRom:17207-17208:MapData_b8:
NesPrgRom:17211:MapData_b8_Layout:
NesPrgRom:17216-17219::; Map 4x10
NesPrgRom:1723e-17240:MapData_b8_Graphics:
NesPrgRom:17245-17248:MapData_b8_Entrances:
NesPrgRom:17251-17254:MapData_b8_Exits:
NesPrgRom:1726a:MapData_b8_Flags:
NesPrgRom:1726b-1726c:MapData_c0:
NesPrgRom:17275:MapData_c0_Layout:
NesPrgRom:1727a::; Map 1x1
NesPrgRom:1727b-1727d:MapData_c0_Graphics:
NesPrgRom:17282-17285:MapData_c0_Entrances:
NesPrgRom:17286-17289:MapData_c0_Exits:
NesPrgRom:1728f:MapData_c0_Flags:
NesPrgRom:17290-17291:MapData_c1:
NesPrgRom:1729a:MapData_c1_Layout:
NesPrgRom:1729f::; Map 1x1
NesPrgRom:172a0-172a2:MapData_c1_Graphics:
NesPrgRom:172a7-172aa:MapData_c1_Entrances:
NesPrgRom:172ab-172ae:MapData_c1_Exits:
NesPrgRom:172b4:MapData_c1_Flags:
NesPrgRom:172b5-172b6:MapData_c2:
NesPrgRom:172bf:MapData_c2_Layout:
NesPrgRom:172c4::; Map 1x1
NesPrgRom:172c5-172c7:MapData_c2_Graphics:
NesPrgRom:172cc-172cf:MapData_c2_Entrances:
NesPrgRom:172d0-172d3:MapData_c2_Exits:
NesPrgRom:172d5:MapData_c2_Flags:
NesPrgRom:172d6-172d7:MapData_c3:
NesPrgRom:172e0:MapData_c3_Layout:
NesPrgRom:172e5::; Map 1x1
NesPrgRom:172e6-172e8:MapData_c3_Graphics:
NesPrgRom:172ed-172f0:MapData_c3_Entrances:
NesPrgRom:172f1-172f4:MapData_c3_Exits:
NesPrgRom:172f6:MapData_c3_Flags:
NesPrgRom:172f7-172f8:MapData_c4:
NesPrgRom:17301:MapData_c4_Layout:
NesPrgRom:17306::; Map 1x1
NesPrgRom:17307-17309:MapData_c4_Graphics:
NesPrgRom:1730e-17311:MapData_c4_Entrances:
NesPrgRom:17312-17315:MapData_c4_Exits:
NesPrgRom:17317:MapData_c4_Flags:
NesPrgRom:17318-17319:MapData_c5:
NesPrgRom:17322:MapData_c5_Layout:
NesPrgRom:17327::; Map 1x1
NesPrgRom:17328-1732a:MapData_c5_Graphics:
NesPrgRom:1732f-17332:MapData_c5_Entrances:
NesPrgRom:17333-17336:MapData_c5_Exits:
NesPrgRom:1733c:MapData_c5_Flags:
NesPrgRom:1733d-1733e:MapData_c6:
NesPrgRom:17347:MapData_c6_Layout:
NesPrgRom:1734c::; Map 1x1
NesPrgRom:1734d-1734f:MapData_c6_Graphics:
NesPrgRom:17354-17357:MapData_c6_Entrances:
NesPrgRom:17358-1735b:MapData_c6_Exits:
NesPrgRom:17361:MapData_c6_Flags:
NesPrgRom:17362-17363:MapData_c7:
NesPrgRom:1736c:MapData_c7_Layout:
NesPrgRom:17371::; Map 1x1
NesPrgRom:17372-17374:MapData_c7_Graphics:
NesPrgRom:17379-1737c:MapData_c7_Entrances:
NesPrgRom:1737d-17380:MapData_c7_Exits:
NesPrgRom:17382:MapData_c7_Flags:
NesPrgRom:17383-17384:MapData_c8:
NesPrgRom:1738d:MapData_c8_Layout:
NesPrgRom:17392::; Map 1x1
NesPrgRom:17393-17395:MapData_c8_Graphics:
NesPrgRom:1739a-1739d:MapData_c8_Entrances:
NesPrgRom:1739e-173a1:MapData_c8_Exits:
NesPrgRom:173a3:MapData_c8_Flags:
NesPrgRom:173a4-173a5:MapData_c9:
NesPrgRom:173ae:MapData_c9_Layout:
NesPrgRom:173b3::; Map 1x1
NesPrgRom:173b4-173b6:MapData_c9_Graphics:
NesPrgRom:173bb-173be:MapData_c9_Entrances:
NesPrgRom:173bf-173c2:MapData_c9_Exits:
NesPrgRom:173c4:MapData_c9_Flags:
NesPrgRom:173c5::Extra?
NesPrgRom:173c6-173c7:MapData_cb:
NesPrgRom:173d0:MapData_cb_Layout:
NesPrgRom:173d5::; Map 1x1
NesPrgRom:173d6-173d8:MapData_cb_Graphics:
NesPrgRom:173dd-173e0:MapData_cb_Entrances:
NesPrgRom:173e1-173e4:MapData_cb_Exits:
NesPrgRom:173e6:MapData_cb_Flags:
NesPrgRom:173e7::Extra?
NesPrgRom:173e8-173e9:MapData_cd:
NesPrgRom:173f2:MapData_cd_Layout:
NesPrgRom:173f7::; Map 1x1
NesPrgRom:173f8-173fa:MapData_cd_Graphics:
NesPrgRom:173ff-17402:MapData_cd_Entrances:
NesPrgRom:17403-17406:MapData_cd_Exits:
NesPrgRom:1740c:MapData_cd_Flags:
NesPrgRom:1740d-1740e:MapData_ce:
NesPrgRom:17417:MapData_ce_Layout:
NesPrgRom:1741c::; Map 1x1
NesPrgRom:1741d-1741f:MapData_ce_Graphics:
NesPrgRom:17424-17427:MapData_ce_Entrances:
NesPrgRom:17428-1742b:MapData_ce_Exits:
NesPrgRom:17431:MapData_ce_Flags:
NesPrgRom:17432-17433:MapData_d0:
NesPrgRom:1743c:MapData_d0_Layout:
NesPrgRom:17441::; Map 1x1
NesPrgRom:17442-17444:MapData_d0_Graphics:
NesPrgRom:17449-1744c:MapData_d0_Entrances:
NesPrgRom:1744d-17450:MapData_d0_Exits:
NesPrgRom:17452:MapData_d0_Flags:
NesPrgRom:17453-17454:MapData_cf:
NesPrgRom:1745d:MapData_cf_Layout:
NesPrgRom:17462::; Map 1x1
NesPrgRom:17463-17465:MapData_cf_Graphics:
NesPrgRom:1746a-1746d:MapData_cf_Entrances:
NesPrgRom:1746e-17471:MapData_cf_Exits:
NesPrgRom:17473:MapData_cf_Flags:
NesPrgRom:17474-17475:MapData_d1:
NesPrgRom:1747e:MapData_d1_Layout:
NesPrgRom:17483::; Map 1x1
NesPrgRom:17484-17486:MapData_d1_Graphics:
NesPrgRom:1748b-1748e:MapData_d1_Entrances:
NesPrgRom:1748f-17492:MapData_d1_Exits:
NesPrgRom:17494:MapData_d1_Flags:
NesPrgRom:17495-17496:MapData_d2:
NesPrgRom:1749f:MapData_d2_Layout:
NesPrgRom:174a4::; Map 1x1
NesPrgRom:174a5-174a7:MapData_d2_Graphics:
NesPrgRom:174ac-174af:MapData_d2_Entrances:
NesPrgRom:174b0-174b3:MapData_d2_Exits:
NesPrgRom:174b5:MapData_d2_Flags:
NesPrgRom:174b6-174b7:MapData_d3:
NesPrgRom:174c0:MapData_d3_Layout:
NesPrgRom:174c5::; Map 1x1
NesPrgRom:174c6-174c8:MapData_d3_Graphics:
NesPrgRom:174cd-174d0:MapData_d3_Entrances:
NesPrgRom:174d1-174d4:MapData_d3_Exits:
NesPrgRom:174d6:MapData_d3_Flags:
NesPrgRom:174d7-174d8:MapData_d4:
NesPrgRom:174e1:MapData_d4_Layout:
NesPrgRom:174e6::; Map 1x1
NesPrgRom:174e7-174e9:MapData_d4_Graphics:
NesPrgRom:174ee-174f1:MapData_d4_Entrances:
NesPrgRom:174f6-174f9:MapData_d4_Exits:
NesPrgRom:17507:MapData_d4_Flags:
NesPrgRom:17508-17509:MapData_e2:
NesPrgRom:17512:MapData_e2_Layout:
NesPrgRom:17517::; Map 1x1
NesPrgRom:17518-1751a:MapData_e2_Graphics:
NesPrgRom:1751f-17522:MapData_e2_Entrances:
NesPrgRom:17523-17526:MapData_e2_Exits:
NesPrgRom:17528:MapData_e2_Flags:
NesPrgRom:17529-1752a:MapData_d5:
NesPrgRom:17533:MapData_d5_Layout:
NesPrgRom:17538::; Map 1x1
NesPrgRom:17539-1753b:MapData_d5_Graphics:
NesPrgRom:17540-17543:MapData_d5_Entrances:
NesPrgRom:17550-17553:MapData_d5_Exits:
NesPrgRom:17565:MapData_d5_Flags:
NesPrgRom:17566-17567:MapData_3c:
NesPrgRom:17570:MapData_3c_Layout:
NesPrgRom:17575::; Map 1x1
NesPrgRom:17576-17578:MapData_3c_Graphics:
NesPrgRom:1757d-17580:MapData_3c_Entrances:
NesPrgRom:17581-17584:MapData_3c_Exits:
NesPrgRom:17586:MapData_3c_Flags:
NesPrgRom:17587-17588:MapData_3d:
NesPrgRom:17591:MapData_3d_Layout:
NesPrgRom:17596::; Map 1x1
NesPrgRom:17597-17599:MapData_3d_Graphics:
NesPrgRom:1759e-175a1:MapData_3d_Entrances:
NesPrgRom:175a2-175a5:MapData_3d_Exits:
NesPrgRom:175a7:MapData_3d_Flags:
NesPrgRom:175a8-175a9:MapData_3e:
NesPrgRom:175b2:MapData_3e_Layout:
NesPrgRom:175b7::; Map 1x1
NesPrgRom:175b8-175ba:MapData_3e_Graphics:
NesPrgRom:175bf-175c2:MapData_3e_Entrances:
NesPrgRom:175c3-175c6:MapData_3e_Exits:
NesPrgRom:175cc:MapData_3e_Flags:
NesPrgRom:175cd-175ce:MapData_d6:
NesPrgRom:175d7:MapData_d6_Layout:
NesPrgRom:175dc::; Map 1x1
NesPrgRom:175dd-175df:MapData_d6_Graphics:
NesPrgRom:175e4-175e7:MapData_d6_Entrances:
NesPrgRom:175e8-175eb:MapData_d6_Exits:
NesPrgRom:175f1:MapData_d6_Flags:
NesPrgRom:175f2-175f3:MapData_d7:
NesPrgRom:175fc:MapData_d7_Layout:
NesPrgRom:17601::; Map 1x1
NesPrgRom:17602-17604:MapData_d7_Graphics:
NesPrgRom:17609-1760c:MapData_d7_Entrances:
NesPrgRom:17619-1761c:MapData_d7_Exits:
NesPrgRom:1762e:MapData_d7_Flags:
NesPrgRom:1762f-17630:MapData_de:
NesPrgRom:17639:MapData_de_Layout:
NesPrgRom:1763e::; Map 1x1
NesPrgRom:1763f-17641:MapData_de_Graphics:
NesPrgRom:17646-17649:MapData_de_Entrances:
NesPrgRom:1764a-1764d:MapData_de_Exits:
NesPrgRom:17653:MapData_de_Flags:
NesPrgRom:17654-17655:MapData_df:
NesPrgRom:1765e:MapData_df_Layout:
NesPrgRom:17663::; Map 1x1
NesPrgRom:17664-17666:MapData_df_Graphics:
NesPrgRom:1766b-1766e:MapData_df_Entrances:
NesPrgRom:17673-17676:MapData_df_Exits:
NesPrgRom:17680:MapData_df_Flags:
NesPrgRom:17681-17682:MapData_e0:
NesPrgRom:1768b:MapData_e0_Layout:
NesPrgRom:17690::; Map 1x1
NesPrgRom:17691-17693:MapData_e0_Graphics:
NesPrgRom:17698-1769b:MapData_e0_Entrances:
NesPrgRom:1769c-1769f:MapData_e0_Exits:
NesPrgRom:176a5:MapData_e0_Flags:
NesPrgRom:176a6-176a7:MapData_d8:
NesPrgRom:176b0:MapData_d8_Layout:
NesPrgRom:176b5::; Map 1x1
NesPrgRom:176b6-176b8:MapData_d8_Graphics:
NesPrgRom:176bd-176c0:MapData_d8_Entrances:
NesPrgRom:176c9-176cc:MapData_d8_Exits:
NesPrgRom:176da:MapData_d8_Flags:
NesPrgRom:176db-176dc:MapData_d9:
NesPrgRom:176e5:MapData_d9_Layout:
NesPrgRom:176ea::; Map 1x1
NesPrgRom:176eb-176ed:MapData_d9_Graphics:
NesPrgRom:176f2-176f5:MapData_d9_Entrances:
NesPrgRom:176f6-176f9:MapData_d9_Exits:
NesPrgRom:176fb:MapData_d9_Flags:
NesPrgRom:176fc-176fd:MapData_da:
NesPrgRom:17706:MapData_da_Layout:
NesPrgRom:1770b::; Map 1x1
NesPrgRom:1770c-1770e:MapData_da_Graphics:
NesPrgRom:17713-17716:MapData_da_Entrances:
NesPrgRom:17717-1771a:MapData_da_Exits:
NesPrgRom:1771c:MapData_da_Flags:
NesPrgRom:1771e-1771f:MapData_dc:
NesPrgRom:17728:MapData_dc_Layout:
NesPrgRom:1772d::; Map 1x1
NesPrgRom:1772e-17730:MapData_dc_Graphics:
NesPrgRom:17735-17738:MapData_dc_Entrances:
NesPrgRom:17739-1773c:MapData_dc_Exits:
NesPrgRom:1773e:MapData_dc_Flags:
NesPrgRom:1773f-17740:MapData_dd:
NesPrgRom:17749:MapData_dd_Layout:
NesPrgRom:1774e::; Map 1x1
NesPrgRom:1774f-17751:MapData_dd_Graphics:
NesPrgRom:17756-17759:MapData_dd_Entrances:
NesPrgRom:1775a-1775d:MapData_dd_Exits:
NesPrgRom:1775f:MapData_dd_Flags:
NesPrgRom:17760-17761:MapData_e1:
NesPrgRom:1776a:MapData_e1_Layout:
NesPrgRom:1776f::; Map 1x1
NesPrgRom:17770-17772:MapData_e1_Graphics:
NesPrgRom:17777-1777a:MapData_e1_Entrances:
NesPrgRom:1777b-1777e:MapData_e1_Exits:
NesPrgRom:17784:MapData_e1_Flags:
NesPrgRom:17785-17786:MapData_e3:
NesPrgRom:1778f:MapData_e3_Layout:
NesPrgRom:17794::; Map 1x1
NesPrgRom:17795-17797:MapData_e3_Graphics:
NesPrgRom:1779c-1779f:MapData_e3_Entrances:
NesPrgRom:177a0-177a3:MapData_e3_Exits:
NesPrgRom:177a9:MapData_e3_Flags:
NesPrgRom:177aa-177ab:MapData_e4:
NesPrgRom:177b4:MapData_e4_Layout:
NesPrgRom:177b9::; Map 1x1
NesPrgRom:177ba-177bc:MapData_e4_Graphics:
NesPrgRom:177c1-177c4:MapData_e4_Entrances:
NesPrgRom:177c9-177cc:MapData_e4_Exits:
NesPrgRom:177da-177db:MapData_e4_Flags:
NesPrgRom:177dd-177de:MapData_e5:
NesPrgRom:177e7:MapData_e5_Layout:
NesPrgRom:177ec::; Map 1x1
NesPrgRom:177ed-177ef:MapData_e5_Graphics:
NesPrgRom:177f4-177f7:MapData_e5_Entrances:
NesPrgRom:177f8-177fb:MapData_e5_Exits:
NesPrgRom:177fd:MapData_e5_Flags:
NesPrgRom:177ff-17800:MapData_e7:
NesPrgRom:17809:MapData_e7_Layout:
NesPrgRom:1780e::; Map 1x1
NesPrgRom:1780f-17811:MapData_e7_Graphics:
NesPrgRom:17816-17819:MapData_e7_Entrances:
NesPrgRom:1781a-1781d:MapData_e7_Exits:
NesPrgRom:1781f:MapData_e7_Flags:
NesPrgRom:17820-17821:MapData_e8:
NesPrgRom:1782a:MapData_e8_Layout:
NesPrgRom:1782f::; Map 1x1
NesPrgRom:17830-17832:MapData_e8_Graphics:
NesPrgRom:17837-1783a:MapData_e8_Entrances:
NesPrgRom:1783f-17842:MapData_e8_Exits:
NesPrgRom:1784c:MapData_e8_Flags:
NesPrgRom:1784d-1784e:MapData_e9:
NesPrgRom:17857:MapData_e9_Layout:
NesPrgRom:1785c::; Map 1x1
NesPrgRom:1785d-1785f:MapData_e9_Graphics:
NesPrgRom:17864-17867:MapData_e9_Entrances:
NesPrgRom:17868-1786b:MapData_e9_Exits:
NesPrgRom:1786d:MapData_e9_Flags:
NesPrgRom:1786f-17870:MapData_eb:
NesPrgRom:17879:MapData_eb_Layout:
NesPrgRom:1787e::; Map 1x1
NesPrgRom:1787f-17881:MapData_eb_Graphics:
NesPrgRom:17886-17889:MapData_eb_Entrances:
NesPrgRom:1788a-1788d:MapData_eb_Exits:
NesPrgRom:1788f:MapData_eb_Flags:
NesPrgRom:17890-17891:MapData_ec:
NesPrgRom:1789a:MapData_ec_Layout:
NesPrgRom:1789f::; Map 1x1
NesPrgRom:178a0-178a2:MapData_ec_Graphics:
NesPrgRom:178a7-178aa:MapData_ec_Entrances:
NesPrgRom:178ab-178ae:MapData_ec_Exits:
NesPrgRom:178b4:MapData_ec_Flags:
NesPrgRom:178b5-178b6:MapData_ed:
NesPrgRom:178bf:MapData_ed_Layout:
NesPrgRom:178c4::; Map 1x1
NesPrgRom:178c5-178c7:MapData_ed_Graphics:
NesPrgRom:178cc-178cf:MapData_ed_Entrances:
NesPrgRom:178d0-178d3:MapData_ed_Exits:
NesPrgRom:178d5:MapData_ed_Flags:
NesPrgRom:178d6-178d7:MapData_ee:
NesPrgRom:178e0:MapData_ee_Layout:
NesPrgRom:178e5::; Map 1x1
NesPrgRom:178e6-178e8:MapData_ee_Graphics:
NesPrgRom:178ed-178f0:MapData_ee_Entrances:
NesPrgRom:178f1-178f4:MapData_ee_Exits:
NesPrgRom:178f6:MapData_ee_Flags:
NesPrgRom:178f7-178f8:MapData_ef:
NesPrgRom:17901:MapData_ef_Layout:
NesPrgRom:17906::; Map 1x1
NesPrgRom:17907-17909:MapData_ef_Graphics:
NesPrgRom:1790e-17911:MapData_ef_Entrances:
NesPrgRom:17912-17915:MapData_ef_Exits:
NesPrgRom:1791b:MapData_ef_Flags:
NesPrgRom:1791c-1791d:MapData_f0:
NesPrgRom:17926:MapData_f0_Layout:
NesPrgRom:1792b::; Map 1x1
NesPrgRom:1792c-1792e:MapData_f0_Graphics:
NesPrgRom:17933-17936:MapData_f0_Entrances:
NesPrgRom:17937-1793a:MapData_f0_Exits:
NesPrgRom:1793c:MapData_f0_Flags:
NesPrgRom:1793d-1793e:MapData_f1:
NesPrgRom:17947:MapData_f1_Layout:
NesPrgRom:1794c::; Map 1x1
NesPrgRom:1794d-1794f:MapData_f1_Graphics:
NesPrgRom:17954-17957:MapData_f1_Entrances:
NesPrgRom:17958-1795b:MapData_f1_Exits:
NesPrgRom:17961:MapData_f1_Flags:
NesPrgRom:17962-17963:MapData_f2:
NesPrgRom:1796c:MapData_f2_Layout:
NesPrgRom:17971::; Map 1x1
NesPrgRom:17972-17974:MapData_f2_Graphics:
NesPrgRom:17979-1797c:MapData_f2_Entrances:
NesPrgRom:17981-17984:MapData_f2_Exits:
NesPrgRom:1798a:MapData_f2_Flags:
NesPrgRom:1798b-1798c:MapData_f3:
NesPrgRom:17995:MapData_f3_Layout:
NesPrgRom:1799a::; Map 1x1
NesPrgRom:1799b-1799d:MapData_f3_Graphics:
NesPrgRom:179a2-179a5:MapData_f3_Entrances:
NesPrgRom:179a6-179a9:MapData_f3_Exits:
NesPrgRom:179af:MapData_f3_Flags:
NesPrgRom:179b0-179b1:MapData_f4:
NesPrgRom:179ba:MapData_f4_Layout:
NesPrgRom:179bf::; Map 1x1
NesPrgRom:179c0-179c2:MapData_f4_Graphics:
NesPrgRom:179c7-179ca:MapData_f4_Entrances:
NesPrgRom:179cb-179ce:MapData_f4_Exits:
NesPrgRom:179d4:MapData_f4_Flags:
NesPrgRom:179d5-179d6:MapData_f5:
NesPrgRom:179df:MapData_f5_Layout:
NesPrgRom:179e4::; Map 1x1
NesPrgRom:179e5-179e7:MapData_f5_Graphics:
NesPrgRom:179ec-179ef:MapData_f5_Entrances:
NesPrgRom:179f0-179f3:MapData_f5_Exits:
NesPrgRom:179f5:MapData_f5_Flags:
NesPrgRom:179f6-179f7:MapData_f6:
NesPrgRom:17a00:MapData_f6_Layout:
NesPrgRom:17a05::; Map 1x1
NesPrgRom:17a06-17a08:MapData_f6_Graphics:
NesPrgRom:17a0d-17a10:MapData_f6_Entrances:
NesPrgRom:17a11-17a14:MapData_f6_Exits:
NesPrgRom:17a16:MapData_f6_Flags:
NesPrgRom:17a17-17a18:MapData_f7:
NesPrgRom:17a21:MapData_f7_Layout:
NesPrgRom:17a26::; Map 1x1
NesPrgRom:17a27-17a29:MapData_f7_Graphics:
NesPrgRom:17a2e-17a31:MapData_f7_Entrances:
NesPrgRom:17a32-17a35:MapData_f7_Exits:
NesPrgRom:17a37:MapData_f7_Flags:
NesPrgRom:17a38-17a39:MapData_f8:
NesPrgRom:17a42:MapData_f8_Layout:
NesPrgRom:17a47::; Map 1x1
NesPrgRom:17a48-17a4a:MapData_f8_Graphics:
NesPrgRom:17a4f-17a52:MapData_f8_Entrances:
NesPrgRom:17a53-17a56:MapData_f8_Exits:
NesPrgRom:17a58:MapData_f8_Flags:
NesPrgRom:17a59-17a5a:MapData_f9:
NesPrgRom:17a63:MapData_f9_Layout:
NesPrgRom:17a68::; Map 1x1
NesPrgRom:17a69-17a6b:MapData_f9_Graphics:
NesPrgRom:17a70-17a73:MapData_f9_Entrances:
NesPrgRom:17a74-17a77:MapData_f9_Exits:
NesPrgRom:17a79:MapData_f9_Flags:
NesPrgRom:17a7a-17a7b:MapData_fa:
NesPrgRom:17a84:MapData_fa_Layout:
NesPrgRom:17a89::; Map 1x1
NesPrgRom:17a8a-17a8c:MapData_fa_Graphics:
NesPrgRom:17a91-17a94:MapData_fa_Entrances:
NesPrgRom:17a95-17a98:MapData_fa_Exits:
NesPrgRom:17a9e:MapData_fa_Flags:
NesPrgRom:17a9f-17aa0:MapData_fb:
NesPrgRom:17aa9:MapData_fb_Layout:
NesPrgRom:17aae::; Map 1x1
NesPrgRom:17aaf-17ab1:MapData_fb_Graphics:
NesPrgRom:17ab6-17ab9:MapData_fb_Entrances:
NesPrgRom:17aba-17abd:MapData_fb_Exits:
NesPrgRom:17abf:MapData_fb_Flags:
NesPrgRom:17ac0-17ac1:MapData_bb:
NesPrgRom:17aca:MapData_bb_Layout:
NesPrgRom:17acf::; Map 1x1
NesPrgRom:17ad0-17ad2:MapData_bb_Graphics:
NesPrgRom:17ad7-17ada:MapData_bb_Entrances:
NesPrgRom:17adb-17ade:MapData_bb_Exits:
NesPrgRom:17ae4:MapData_bb_Flags:
NesPrgRom:17ae5-17ae6:MapData_bc:
NesPrgRom:17aef:MapData_bc_Layout:
NesPrgRom:17af4::; Map 1x1
NesPrgRom:17af5-17af7:MapData_bc_Graphics:
NesPrgRom:17afc-17aff:MapData_bc_Entrances:
NesPrgRom:17b00-17b03:MapData_bc_Exits:
NesPrgRom:17b05:MapData_bc_Flags:
NesPrgRom:17b07-17b08:MapData_be:
NesPrgRom:17b11:MapData_be_Layout:
NesPrgRom:17b16::; Map 1x1
NesPrgRom:17b17-17b19:MapData_be_Graphics:
NesPrgRom:17b1e-17b21:MapData_be_Entrances:
NesPrgRom:17b22-17b25:MapData_be_Exits:
NesPrgRom:17b27:MapData_be_Flags:
NesPrgRom:17b28-17b29:MapData_bf:
NesPrgRom:17b32:MapData_bf_Layout:
NesPrgRom:17b37::; Map 1x1
NesPrgRom:17b38-17b3a:MapData_bf_Graphics:
NesPrgRom:17b3f-17b42:MapData_bf_Entrances:
NesPrgRom:17b43-17b46:MapData_bf_Exits:
NesPrgRom:17b4c:MapData_bf_Flags:
NesPrgRom:17b4d-17b4e:MapData_58:
NesPrgRom:17b57:MapData_58_Layout:
NesPrgRom:17b5c::; Map 1x1
NesPrgRom:17b5d-17b5f:MapData_58_Graphics:
NesPrgRom:17b64-17b67:MapData_58_Entrances:
NesPrgRom:17b6c-17b6f:MapData_58_Exits:
NesPrgRom:17b75:MapData_58_Flags:
NesPrgRom:17b76-17b77:MapData_59:
NesPrgRom:17b80:MapData_59_Layout:
NesPrgRom:17b85-17b8a::; Map 6x4
NesPrgRom:17b9d-17b9f:MapData_59_Graphics:
NesPrgRom:17ba4-17ba7:MapData_59_Entrances:
NesPrgRom:17ba8-17bab:MapData_59_Exits:
NesPrgRom:17bb9:MapData_59_Flags:
NesPrgRom:17bba-17bbb:MapData_5a:
NesPrgRom:17bc4:MapData_5a_Layout:
NesPrgRom:17bc9-17bce::; Map 6x4
NesPrgRom:17be1-17be3:MapData_5a_Graphics:
NesPrgRom:17be8-17beb:MapData_5a_Exits:
NesPrgRom:17bf9:MapData_5a_Flags:
NesPrgRom:17bfa-17bfb:MapData_5b:
NesPrgRom:17c04:MapData_5b_Layout:
NesPrgRom:17c09-17c0e::; Map 6x4
NesPrgRom:17c21-17c23:MapData_5b_Graphics:
NesPrgRom:17c28-17c2b:MapData_5b_Exits:
NesPrgRom:17c39:MapData_5b_Flags:
NesPrgRom:17c3a-17c3b:MapData_5c:
NesPrgRom:17c44:MapData_5c_Layout:
NesPrgRom:17c49-17c4e::; Map 6x4
NesPrgRom:17c61-17c63:MapData_5c_Graphics:
NesPrgRom:17c68-17c6b:MapData_5c_Entrances:
NesPrgRom:17c74-17c77:MapData_5c_Exits:
NesPrgRom:17c8d:MapData_5c_Flags:
NesPrgRom:17c8e-17c8f:MapData_5d:
NesPrgRom:17c98:MapData_5d_Layout:
NesPrgRom:17c9d::; Map 1x2
NesPrgRom:17c9f-17ca1:MapData_5d_Graphics:
NesPrgRom:17ca6-17ca9:MapData_5d_Entrances:
NesPrgRom:17cae-17cb1:MapData_5d_Exits:
NesPrgRom:17cb7:MapData_5d_Flags:
NesPrgRom:17cb8-17cb9:MapData_5e:
NesPrgRom:17cc2:MapData_5e_Layout:
NesPrgRom:17cc7::; Map 1x1
NesPrgRom:17cc8-17cca:MapData_5e_Graphics:
NesPrgRom:17ccf-17cd2:MapData_5e_Entrances:
NesPrgRom:17cd3-17cd6:MapData_5e_Exits:
NesPrgRom:17cdc:MapData_5e_Flags:
NesPrgRom:17cdd-17cde:MapData_5f:
NesPrgRom:17ce7:MapData_5f_Layout:
NesPrgRom:17cec::; Map 1x1
NesPrgRom:17ced-17cef:MapData_5f_Graphics:
NesPrgRom:17cf4-17cf7:MapData_5f_Entrances:
NesPrgRom:17cf8:MapData_5f_Exits:
NesPrgRom:17cf9:MapData_5f_Flags:
NesPrgRom:17cfa-17cff::; UNUSED????
NesPrgRom:17e00-17e0f:DataTable_17e00:; This is read from $3cca4 when starting the Dyna fight - it appears to be initializing\\n; RAM at $6000, possibly for graphics, seeing as how the actual background is not stored\\n; in a normal way.
NesPrgRom:17f00-17f0f:undefined:; UNUSED????
NesPrgRom:18000-18001:SoundEffectData:
NesPrgRom:180b0-180bf:SoundEffectData_20:; unused?
NesPrgRom:180ce:SoundEffectData_21:Priority
NesPrgRom:180cf-180d0::Address for x=4/y=4
NesPrgRom:180d1-180d2::Address for x=5/y=c
NesPrgRom:180d3-180d7:Sfx21_Ch4:; Seems to be the pulse2 channel
NesPrgRom:180df-180e9:Sfx21_Ch5:; Seems to be the noise channel
NesPrgRom:180ea:SoundEffectData_23:Priority
NesPrgRom:180ef-180f4:Sfx23_Ch4:
NesPrgRom:18164-1816f:Sfx23_Ch5:
NesPrgRom:18172:SoundEffectData_24:Priority
NesPrgRom:18177-1817f:Sfx24_Ch4:
NesPrgRom:18180-18182:Sfx24_Ch5:
NesPrgRom:18183:SoundEffectData_25:
NesPrgRom:18188-1818f:Sfx25_Ch4:
NesPrgRom:181a0-181ab:Sfx25_Ch5:
NesPrgRom:181ac:SoundEffectData_26:
NesPrgRom:181b1-181b9:Sfx26_Ch4:
NesPrgRom:181ba-181bc:Sfx26_Ch5:
NesPrgRom:181bd:SoundEffectData_27:; unused?
NesPrgRom:181c2-181cf:Sfx27_Ch4:
NesPrgRom:181e9-181ef:Sfx27_Ch5:
NesPrgRom:181fc:SoundEffectData_28:; unused?
NesPrgRom:181fd-181fe::$18201
NesPrgRom:181ff-18200::$18211
NesPrgRom:18201-1820f:Sfx28_Ch4:
NesPrgRom:18211-1821e:Sfx28_Ch5:
NesPrgRom:1821f:SoundEffectData_29:
NesPrgRom:18220-18221::$18224
NesPrgRom:18222-18223::$18236
NesPrgRom:18224-1822f:Sfx29_Ch4:
NesPrgRom:18236-18238:Sfx29_Ch5:
NesPrgRom:18239:SoundEffectData_2a:; unused?
NesPrgRom:1823a-1823b::$1823e
NesPrgRom:1823c-1823d::$1824e
NesPrgRom:1823e-1823f:Sfx2a_Ch4:
NesPrgRom:1824e-1824f:Sfx2a_Ch5:
NesPrgRom:1825e:SoundEffectData_2b:; unused?
NesPrgRom:1825f-18260::$18263
NesPrgRom:18261-18262::$18287
NesPrgRom:18263-1826f:Sfx2b_Ch4:
NesPrgRom:18287-18289:Sfx2b_Ch5:
NesPrgRom:1828a:SoundEffectData_2c:
NesPrgRom:1828b-1828c::$1828f
NesPrgRom:1828d-1828e::$182be
NesPrgRom:1828f:Sfx2c_Ch4:
NesPrgRom:182be-182bf:Sfx2c_Ch5:
NesPrgRom:182c1:SoundEffectData_2e:
NesPrgRom:182c2-182c3::$182c6
NesPrgRom:182c4-182c5::$182de
NesPrgRom:182c6-182cf:Sfx2e_Ch4:
NesPrgRom:182de-182df:Sfx2e_Ch5:
NesPrgRom:182e1:SoundEffectData_2f:
NesPrgRom:182e2-182e3::$182e6
NesPrgRom:182e4-182e5::$182e9
NesPrgRom:182e6-182e8:Sfx2f_Ch4:
NesPrgRom:182e9-182ef:Sfx2f_Ch5:
NesPrgRom:182f5:SoundEffectData_30:
NesPrgRom:182f6-182f7::$182fa
NesPrgRom:182f8-182f9::$18307
NesPrgRom:182fa-182ff:Sfx30_Ch4:
NesPrgRom:18307-18309:Sfx30_Ch5:
NesPrgRom:1830a:SoundEffectData_31:
NesPrgRom:1830b-1830c::$1830f
NesPrgRom:1830d-1830e::$1831c
NesPrgRom:1830f:Sfx31_Ch4:
NesPrgRom:1831c-1831e:Sfx31_Ch5:
NesPrgRom:1831f:SoundEffectData_32:
NesPrgRom:18320-18321::$18324
NesPrgRom:18322-18323::$1835a
NesPrgRom:18324-1832f:Sfx32_Ch4:
NesPrgRom:1835a-1835f:Sfx32_Ch5:
NesPrgRom:18370:SoundEffectData_33:
NesPrgRom:18371-18372::$18375
NesPrgRom:18373-18374::$183aa
NesPrgRom:18375-1837f:Sfx33_Ch4:
NesPrgRom:183aa-183af:Sfx33_Ch5:
NesPrgRom:183c0:SoundEffectData_36:
NesPrgRom:183c1-183c2::$183c5
NesPrgRom:183c3-183c4::$183cf
NesPrgRom:183c5-183ce:Sfx36_Ch4:
NesPrgRom:183cf:Sfx36_Ch5:
NesPrgRom:183dc:SoundEffectData_37:
NesPrgRom:183dd-183de::$183e1
NesPrgRom:183df-183e0::$183ea
NesPrgRom:183e1-183e9:Sfx37_Ch4:
NesPrgRom:183ea-183ef:Sfx37_Ch5:
NesPrgRom:183fc-183ff::;; --------------------------------\\n; unused???
NesPrgRom:1844d:SoundEffectData_39:
NesPrgRom:1844e-1844f::$18452
NesPrgRom:18450-18451::$1847e
NesPrgRom:18452-1845f:Sfx39_Ch4:
NesPrgRom:1847e-1847f:Sfx39_Ch5:
NesPrgRom:18481:SoundEffectData_3a:
NesPrgRom:18482-18483::$18486
NesPrgRom:18484-18485::$18496
NesPrgRom:18486-1848f:Sfx3a_Ch4:
NesPrgRom:18496-1849e:Sfx3a_Ch5:
NesPrgRom:1849f:SoundEffectData_3b:
NesPrgRom:184a0-184a1::$184a4
NesPrgRom:184a2-184a3::$184b2
NesPrgRom:184a4-184af:Sfx3b_Ch4:
NesPrgRom:184b2-184b4:Sfx3b_Ch5:
NesPrgRom:184b5:SoundEffectData_3c:
NesPrgRom:184b6-184b7::$184ba
NesPrgRom:184b8-184b9::$184de
NesPrgRom:184ba-184bf:Sfx3c_Ch4:
NesPrgRom:184de-184df:Sfx3c_Ch5:
NesPrgRom:18513:SoundEffectData_3d:
NesPrgRom:18514-18515::$18518
NesPrgRom:18516-18517::$18528
NesPrgRom:18518-1851f:Sfx3d_Ch4:
NesPrgRom:18528-1852f:Sfx3d_Ch5:
NesPrgRom:18540:SoundEffectData_3e:
NesPrgRom:18541-18542::$18545
NesPrgRom:18543-18544::$185c7
NesPrgRom:18545-1854f:Sfx3e_Ch4:
NesPrgRom:185c7-185c9:Sfx3e_Ch5:
NesPrgRom:185ca:SoundEffectData_3f:
NesPrgRom:185cb-185cc::$185cf
NesPrgRom:185cd-185ce::$18611
NesPrgRom:185cf:Sfx3f_Ch4:
NesPrgRom:18611-18613:Sfx3f_Ch5:
NesPrgRom:18614:SoundEffectData_40:
NesPrgRom:18615-18616::$18619
NesPrgRom:18617-18618::$18662
NesPrgRom:18619-1861f:Sfx40_Ch4:
NesPrgRom:18662-1866f:Sfx40_Ch5:
NesPrgRom:186a5:SoundEffectData_41:
NesPrgRom:186a6-186a7::$186aa
NesPrgRom:186a8-186a9::$186e1
NesPrgRom:186aa-186af:Sfx41_Ch4:
NesPrgRom:186e1-186ef:Sfx41_Ch5:
NesPrgRom:186f0:SoundEffectData_42:
NesPrgRom:186f1-186f2::$186f5
NesPrgRom:186f3-186f4::$18713
NesPrgRom:186f5-186ff:Sfx42_Ch4:
NesPrgRom:18713-1871f:Sfx42_Ch5:
NesPrgRom:18738:SoundEffectData_43:
NesPrgRom:18739-1873a::$1873d
NesPrgRom:1873b-1873c::$18764
NesPrgRom:1873d-1873f:Sfx43_Ch4:
NesPrgRom:18757-1875f:Sfx43_Ch4_Loop:
NesPrgRom:18764-1876f:Sfx43_Ch5:
NesPrgRom:18785:SoundEffectData_45:
NesPrgRom:18786-18787::$1878a
NesPrgRom:18788-18789::$187b9
NesPrgRom:1878a-1878f:Sfx45_Ch4:
NesPrgRom:187b9-187bf:Sfx45_Ch5:
NesPrgRom:187c1:SoundEffectData_47:
NesPrgRom:187c2-187c3::$187c6
NesPrgRom:187c4-187c5::$187e1
NesPrgRom:187c6-187cf:Sfx47_Ch4:
NesPrgRom:187e1-187e3:Sfx47_Ch5:
NesPrgRom:187e4:SoundEffectData_48:
NesPrgRom:187e5-187e6::$187e9
NesPrgRom:187e7-187e8::$18802
NesPrgRom:187e9-187ef:Sfx48_Ch4:
NesPrgRom:18802-18804:Sfx48_Ch5:
NesPrgRom:18805:SoundEffectData_49:
NesPrgRom:18806-18807::$1880a
NesPrgRom:18808-18809::$1881c
NesPrgRom:1880a-1880f:Sfx49_Ch4:
NesPrgRom:1881c-1881f:Sfx49_Ch5:
NesPrgRom:1882f:SoundEffectData_4a:
NesPrgRom:18830-18831::$18834
NesPrgRom:18832-18833::$18852
NesPrgRom:18834-1883f:Sfx4a_Ch4:
NesPrgRom:18852-1885f:Sfx4a_Ch5:
NesPrgRom:1887c:SoundEffectData_4b:
NesPrgRom:1887d-1887e::$18881
NesPrgRom:1887f-18880::$1888b
NesPrgRom:18881-1888a:Sfx4b_Ch4:
NesPrgRom:1888b-1888d:Sfx4b_Ch5:
NesPrgRom:1888e:SoundEffectData_4c:
NesPrgRom:1888f-18890::$18893
NesPrgRom:18891-18892::$188a5
NesPrgRom:18893-1889f:Sfx4c_Ch4:
NesPrgRom:188a5-188a7:Sfx4c_Ch5:
NesPrgRom:188a8:SoundEffectData_4e:
NesPrgRom:188a9-188aa::$188ad
NesPrgRom:188ab-188ac::$188b9
NesPrgRom:188ad-188af:Sfx4e_Ch4:
NesPrgRom:188b9-188bb:Sfx4e_Ch5:
NesPrgRom:188bc:SoundEffectData_50:
NesPrgRom:188bd-188be::$188c1
NesPrgRom:188bf-188c0::$18901
NesPrgRom:188c1-188cf:Sfx50_Ch4:
NesPrgRom:18901-1890f:Sfx50_Ch5:
NesPrgRom:18915:SoundEffectData_51:
NesPrgRom:18916-18917::$1891a
NesPrgRom:18918-18919::$18950
NesPrgRom:1891a-1891f:Sfx51_Ch4:
NesPrgRom:18950-1895f:Sfx51_Ch5:
NesPrgRom:18966:SoundEffectData_52:
NesPrgRom:18967-18968::$1896b
NesPrgRom:18969-1896a::$18996
NesPrgRom:1896b-1896f:Sfx52_Ch4:
NesPrgRom:18996-1899f:Sfx52_Ch5:
NesPrgRom:189a8:SoundEffectData_53:
NesPrgRom:189a9-189aa::$189ad
NesPrgRom:189ab-189ac::$189f9
NesPrgRom:189ad-189af:Sfx53_Ch4:
NesPrgRom:189f9-189ff:Sfx53_Ch5:
NesPrgRom:18a4c:SoundEffectData_54:
NesPrgRom:18a4d-18a4e::$18a51
NesPrgRom:18a4f-18a50::$18a72
NesPrgRom:18a51-18a5f:Sfx54_Ch4:
NesPrgRom:18a72-18a7f:Sfx54_Ch5:
NesPrgRom:18abc:SoundEffectData_55:
NesPrgRom:18abd-18abe::$18ac1
NesPrgRom:18abf-18ac0::$18af6
NesPrgRom:18ac1-18acf:Sfx55_Ch4:
NesPrgRom:18af6-18af8:Sfx55_Ch5:
NesPrgRom:18af9:SoundEffectData_56:
NesPrgRom:18afa-18afb::$18afe
NesPrgRom:18afc-18afd::$18b0b
NesPrgRom:18afe-18aff:Sfx56_Ch4:
NesPrgRom:18b0b-18b0d:Sfx56_Ch5:
NesPrgRom:18b0e:SoundEffectData_57:
NesPrgRom:18b0f-18b10::$18b13
NesPrgRom:18b11-18b12::$18b2a
NesPrgRom:18b13-18b1f:Sfx57_Ch4:
NesPrgRom:18b2a-18b2c:Sfx57_Ch5:
NesPrgRom:18b2d:SoundEffectData_58:
NesPrgRom:18b2e-18b2f::$18b32
NesPrgRom:18b30-18b31::$18b3b
NesPrgRom:18b32-18b3a:Sfx58_Ch4:
NesPrgRom:18b3b-18b3d:Sfx58_Ch5:
NesPrgRom:18b3e:SoundEffectData_5a:
NesPrgRom:18b3f-18b40::$18b43
NesPrgRom:18b41-18b42::$18b82
NesPrgRom:18b43-18b4f:Sfx5a_Ch4:
NesPrgRom:18b82-18b8e:Sfx5a_Ch5:
NesPrgRom:18b8f:SoundEffectData_5b:
NesPrgRom:18b90-18b91::$18b94
NesPrgRom:18b92-18b93::$18bbb
NesPrgRom:18b94-18b9f:Sfx5b_Ch4:
NesPrgRom:18bbb-18bbf:Sfx5b_Ch5:
NesPrgRom:18be3:SoundEffectData_5c:
NesPrgRom:18be4-18be5::$18be8
NesPrgRom:18be6-18be7::$18c15
NesPrgRom:18be8-18bef:Sfx5c_Ch4:
NesPrgRom:18c15-18c1c:Sfx5c_Ch5:
NesPrgRom:18c1d:SoundEffectData_5d:
NesPrgRom:18c1e-18c1f::$18c22
NesPrgRom:18c20-18c21::$18c31
NesPrgRom:18c22-18c2f:Sfx5d_Ch4:
NesPrgRom:18c31-18c33:Sfx5d_Ch5:
NesPrgRom:18c34:SoundEffectData_5e:
NesPrgRom:18c35-18c36::$18c39
NesPrgRom:18c37-18c38::$18c48
NesPrgRom:18c39-18c3f:Sfx5e_Ch4:
NesPrgRom:18c48-18c4a:Sfx5e_Ch5:
NesPrgRom:18c4b:SoundEffectData_5f:
NesPrgRom:18c4c-18c4d::$18c50
NesPrgRom:18c4e-18c4f::$18c5d
NesPrgRom:18c50-18c5c:Sfx5f_Ch4:
NesPrgRom:18c5d-18c5f:Sfx5f_Ch5:
NesPrgRom:18c60:SoundEffectData_60:
NesPrgRom:18c61-18c62::$18c65
NesPrgRom:18c63-18c64::$18c9f
NesPrgRom:18c65-18c6f:Sfx60_Ch4:
NesPrgRom:18c9f:Sfx60_Ch5:
NesPrgRom:18ca2:SoundEffectData_61:
NesPrgRom:18ca3-18ca4::$18ca7
NesPrgRom:18ca5-18ca6::$18cc4
NesPrgRom:18ca7-18caf:Sfx61_Ch4:
NesPrgRom:18cc4-18ccf:Sfx61_Ch5:
NesPrgRom:18ce9::;; ----------------------------------------------------------------
NesPrgRom:18cea:SoundEffectData_62:
NesPrgRom:18ceb-18cec::$18cef
NesPrgRom:18ced-18cee::$18d1e
NesPrgRom:18cef:Sfx62_Ch4:
NesPrgRom:18d1e-18d1f:Sfx62_Ch5:
NesPrgRom:18d4c:SoundEffectData_63:
NesPrgRom:18d4d-18d4e::$18d51
NesPrgRom:18d4f-18d50::$18d5e
NesPrgRom:18d51-18d5d:Sfx63_Ch4:
NesPrgRom:18d5e-18d5f:Sfx63_Ch5:
NesPrgRom:18d79:SoundEffectData_64:
NesPrgRom:18d7a-18d7b::$18d7e
NesPrgRom:18d7c-18d7d::$18da6
NesPrgRom:18d7e-18d7f:Sfx64_Ch4:
NesPrgRom:18da6-18daf:Sfx64_Ch5:
NesPrgRom:18dd1:SoundEffectData_65:
NesPrgRom:18dd2-18dd3::$18dd6
NesPrgRom:18dd4-18dd5::$18df6
NesPrgRom:18dd6-18ddf:Sfx65_Ch4:
NesPrgRom:18df6-18dff:Sfx65_Ch5:
NesPrgRom:18e04:SoundEffectData_66:
NesPrgRom:18e05-18e06::$18e09
NesPrgRom:18e07-18e08::$18e7f
NesPrgRom:18e09-18e0f:Sfx66_Ch4:
NesPrgRom:18e7f:Sfx66_Ch5:
NesPrgRom:18e82:SoundEffectData_67:
NesPrgRom:18e83-18e84::$18e87
NesPrgRom:18e85-18e86::$18e94
NesPrgRom:18e87-18e8f:Sfx67_Ch4:
NesPrgRom:18e94-18e9f:Sfx67_Ch5:
NesPrgRom:18ead:SoundEffectData_68:
NesPrgRom:18eae-18eaf::$18eb2
NesPrgRom:18eb0-18eb1::$18edf
NesPrgRom:18eb2-18ebf:Sfx68_Ch4:
NesPrgRom:18edf:Sfx68_Ch5:
NesPrgRom:18ee2:SoundEffectData_69:
NesPrgRom:18ee3-18ee4::$18ee7
NesPrgRom:18ee5-18ee6::$18ef7
NesPrgRom:18ee7-18eef:Sfx69_Ch4:
NesPrgRom:18ef7-18eff:Sfx69_Ch5:
NesPrgRom:18f05:SoundEffectData_6a:
NesPrgRom:18f06-18f07::$18f0a
NesPrgRom:18f08-18f09::$18f27
NesPrgRom:18f0a-18f0f:Sfx6a_Ch4:
NesPrgRom:18f27-18f29:Sfx6a_Ch5:
NesPrgRom:18f2a:SoundEffectData_6b:
NesPrgRom:18f2b-18f2c::$18f2f
NesPrgRom:18f2d-18f2e::$18f46
NesPrgRom:18f2f:Sfx6b_Ch4:
NesPrgRom:18f46-18f4f:Sfx6b_Ch5:
NesPrgRom:18f6a:SoundEffectData_6c:
NesPrgRom:18f6b-18f6c::$18f6f
NesPrgRom:18f6d-18f6e::$18f88
NesPrgRom:18f6f:Sfx6c_Ch4:
NesPrgRom:18f88-18f8f:Sfx6c_Ch5:
NesPrgRom:18fad:SoundEffectData_6d:
NesPrgRom:18fae-18faf::$18fb2
NesPrgRom:18fb0-18fb1::$18ffb
NesPrgRom:18fb2-18fbf:Sfx6d_Ch4:
NesPrgRom:18ffb-18ffd:Sfx6d_Ch5:
NesPrgRom:18ffe:SoundEffectData_6e:
NesPrgRom:18fff-19000::$19003
NesPrgRom:19001-19002::$19089
NesPrgRom:19003-1900f:Sfx6e_Ch4:
NesPrgRom:19089-1908f:Sfx6e_Ch5:
NesPrgRom:190bd:SoundEffectData_6f:
NesPrgRom:190be-190bf::$190c2
NesPrgRom:190c0-190c1::$190f3
NesPrgRom:190c2-190cf:Sfx6f_Ch4:
NesPrgRom:190f3-190ff:Sfx6f_Ch5:
NesPrgRom:19111:SoundEffectData_72:
NesPrgRom:19112-19113::$19116
NesPrgRom:19114-19115::$19128
NesPrgRom:19116-1911f:Sfx72_Ch4:
NesPrgRom:19128-1912f:Sfx72_Ch5:
NesPrgRom:19148:SoundEffectData_74:
NesPrgRom:19149-1914a::$1914d
NesPrgRom:1914b-1914c::$19163
NesPrgRom:1914d-1914f:Sfx74_Ch4:
NesPrgRom:19163-19165:Sfx74_Ch5:
NesPrgRom:19166:SoundEffectData_75:
NesPrgRom:19167-19168::$1916b
NesPrgRom:19169-1916a::$19187
NesPrgRom:1916b-1916f:Sfx75_Ch4:
NesPrgRom:19187-1918f:Sfx75_Ch5:
NesPrgRom:191b1:SoundEffectData_76:
NesPrgRom:191b2-191b3::$191b6
NesPrgRom:191b4-191b5::$191fe
NesPrgRom:191b6-191bf:Sfx76_Ch4:
NesPrgRom:191fe-191ff:Sfx76_Ch5:
NesPrgRom:19201-19202:NpcData:Start
NesPrgRom:19203-19204::OutsideStart
NesPrgRom:19205-19206::Leaf
NesPrgRom:19207-19208::ValleyOfWind
NesPrgRom:19209-1920a::SealedCave1
NesPrgRom:1920b-1920c::SealedCave2
NesPrgRom:1920d-1920e::SealedCave3
NesPrgRom:1920f-19210::SealedCave4
NesPrgRom:19211-19212::SealedCave5
NesPrgRom:19213-19214::SealedCave6
NesPrgRom:19215-19216::SealedCave7
NesPrgRom:19219-1921a::SealedCave8
NesPrgRom:1921d-1921e::WindmillCave
NesPrgRom:1921f-19220::Windmill
NesPrgRom:19221-19222::ZebuCave
NesPrgRom:19223-19224::MtSabreWestCave1
NesPrgRom:19229-1922a::CordelPlainsWest
NesPrgRom:1922b-1922c::CordelPlainsEast
NesPrgRom:19231-19232::Brynmaer
NesPrgRom:19233-19234::OutsideStomHouse
NesPrgRom:19235-19236::Swamp
NesPrgRom:19237-19238::Amazones
NesPrgRom:19239-1923a::Oak
NesPrgRom:1923d-1923e::StomHouse
NesPrgRom:19241-19242::MtSabreWestLower
NesPrgRom:19243-19244::MtSabreWestUpper
NesPrgRom:19245-19246::MtSabreWestCave2
NesPrgRom:19247-19248::MtSabreWestCave3
NesPrgRom:19249-1924a::MtSabreWestCave4
NesPrgRom:1924b-1924c::MtSabreWestCave5
NesPrgRom:1924d-1924e::MtSabreWestCave6
NesPrgRom:1924f-19250::MtSabreWestCave7
NesPrgRom:19251-19252::MtSabreNorthMain
NesPrgRom:19253-19254::MtSabreNortMiddle
NesPrgRom:19255-19256::MtSabreNorthCave1
NesPrgRom:19257-19258::MtSabreNorthCave2
NesPrgRom:19259-1925a::MtSabreNorthCave3
NesPrgRom:1925b-1925c::MtSabreNorthCave4
NesPrgRom:1925d-1925e::MtSabreNorthCave5
NesPrgRom:1925f-19260::MtSabreNorthCave6
NesPrgRom:19261-19262::MtSabreNorthLeftCell
NesPrgRom:19263-19264::MtSabreNorthPrisonKeyHall
NesPrgRom:19265-19266::MtSabreNorthRightCell
NesPrgRom:19267-19268::MtSabreNorthCave7
NesPrgRom:19269-1926a::MtSabreNorthCave8
NesPrgRom:1926b-1926c::MtSabreNorthSummitCave
NesPrgRom:19271-19272::MtSabreNorthEntranceCave
NesPrgRom:19273-19274::MtSabreNorthCave5a
NesPrgRom:19281-19282::WaterfallValleyNorth
NesPrgRom:19283-19284::WaterfallValleySouth
NesPrgRom:19285-19286::LimeTreeValley
NesPrgRom:19287-19288::LimeTreeLake
NesPrgRom:19289-1928a::KirisaPlantCave1
NesPrgRom:1928b-1928c::KirisaPlantCave2
NesPrgRom:1928d-1928e::KirisaPlantCave3
NesPrgRom:1928f-19290::KirisaMeadow
NesPrgRom:19291-19292::FogLampCave1
NesPrgRom:19293-19294::FogLampCave2
NesPrgRom:19295-19296::FogLampCave3
NesPrgRom:19297-19298::FogLampCaveDeadEnd
NesPrgRom:19299-1929a::FogLampCave4
NesPrgRom:1929b-1929c::FogLampCave5
NesPrgRom:1929d-1929e::FogLampCave6
NesPrgRom:1929f-192a0::FogLampCave7
NesPrgRom:192a1-192a2::Portoa
NesPrgRom:192a3-192a4::PortoaFishermanIsland
NesPrgRom:192a5-192a6::MesiaShrine
NesPrgRom:192a9-192aa::WaterfallCave1
NesPrgRom:192ab-192ac::WaterfallCave2
NesPrgRom:192ad-192ae::WaterfallCave3
NesPrgRom:192af-192b0::WaterfallCave4
NesPrgRom:192bf-192c0::Dyna
NesPrgRom:192c1-192c2::AngrySea
NesPrgRom:192c3-192c4::BoatHouse
NesPrgRom:192c5-192c6::JoelLighthouse
NesPrgRom:192c9-192ca::UndergroundChannel
NesPrgRom:192d1-192d2::EvilSpiritIslandEntrance
NesPrgRom:192e1-192e2::JoelSecretPassage
NesPrgRom:192e3-192e4::Joel
NesPrgRom:192e5-192e6::Swan
NesPrgRom:19301-19302:NpcDataPart2:
NesPrgRom:1934d-1934e::Draygon2
NesPrgRom:1938d-1938e::BrynmaerTavern
NesPrgRom:1938f-19390::BrynmaerPawnShop
NesPrgRom:19391-19392::BrynmaerInn
NesPrgRom:19393-19394::BrynmaerArmorShop
NesPrgRom:19397-19398::BrynmaerToolShop
NesPrgRom:1939b-1939c::OakElderHouse
NesPrgRom:1939d-1939e::OakMotherHouse
NesPrgRom:1939f-193a0::OakToolShop
NesPrgRom:193a1-193a2::OakInn
NesPrgRom:193a3-193a4::AmazonesInn
NesPrgRom:193a5-193a6::AmazonesToolShop
NesPrgRom:193a7-193a8::AmazonesArmorShop
NesPrgRom:193a9-193aa::AmazonesElder
NesPrgRom:193ad-193ae::PortoaFishermanHouse
NesPrgRom:193af-193b0::PortoaPalaceEntrance
NesPrgRom:193b1-193b2::PortoaFortuneTeller
NesPrgRom:193b3-193b4::PortoaPawnShop
NesPrgRom:193b5-193b6::PortoaArmorShop
NesPrgRom:193b9-193ba::PortoaInn
NesPrgRom:193bb-193bc::PortoaToolShop
NesPrgRom:193c5-193c6::AmazonesElderDownstairs
NesPrgRom:193c7-193c8::JoelElderHouse
NesPrgRom:193c9-193ca::JoelShed
NesPrgRom:193cb-193cc::JoelToolShop
NesPrgRom:193cf-193d0::JoelInn
NesPrgRom:193f9-193fd:NpcData_f8:
NesPrgRom:19403-19407:NpcData_f9:
NesPrgRom:1940d-19411:NpcData_f5:
NesPrgRom:19417-1941b:NpcData_fb:
NesPrgRom:19421-19425:NpcData_cf:
NesPrgRom:1942b-1942f:NpcData_d0:
NesPrgRom:19435-19439:NpcData_d1:
NesPrgRom:1943f-19443:NpcData_d2:
NesPrgRom:19449-1944d:NpcData_d3:
NesPrgRom:19453-19457:NpcData_01:
NesPrgRom:19461-19465:NpcData_03:
NesPrgRom:1949e-194a1::1b Sealed cave "hitbox"
NesPrgRom:194a7-194ab:NpcData_04:
NesPrgRom:194b9-194bd:NpcData_05:
NesPrgRom:194db-194df:NpcData_06:
NesPrgRom:194e0-194e3::0d
NesPrgRom:194e4-194e7::0e
NesPrgRom:194e8-194eb::0f
NesPrgRom:194ed-194f1:NpcData_07:
NesPrgRom:1950a-1950d::13
NesPrgRom:1950e-19511::14
NesPrgRom:19512-19515::15
NesPrgRom:19517-1951b:NpcData_08:
NesPrgRom:19520-19523::0e
NesPrgRom:19525-19529:NpcData_09:
NesPrgRom:19553-19557:NpcData_0a:
NesPrgRom:1955d-19561:NpcData_0c:
NesPrgRom:19567-1956b:NpcData_10:
NesPrgRom:1956c-1956f::ice wall
NesPrgRom:19570-19573::zebu
NesPrgRom:19574-19577::abduction trigger
NesPrgRom:19578::done
NesPrgRom:19579-1957d:NpcData_0e:
NesPrgRom:19587-1958b:NpcData_0f:
NesPrgRom:19595-19599:NpcData_14:
NesPrgRom:195cb-195cf:NpcData_15:
NesPrgRom:195fc-195ff::18
NesPrgRom:19605-19609:NpcData_19:
NesPrgRom:1960b-1960f:NpcData_1a:
NesPrgRom:19649-1964d:NpcData_20:
NesPrgRom:1967a-1967d::18
NesPrgRom:1967f-19683:NpcData_21:
NesPrgRom:196ac-196af::17
NesPrgRom:196b1-196b5:NpcData_11:
NesPrgRom:196d7-196db:NpcData_22:
NesPrgRom:19715-19719:NpcData_23:
NesPrgRom:19742-19745::17
NesPrgRom:19747-1974b:NpcData_24:
NesPrgRom:1977d-19781:NpcData_25:
NesPrgRom:1978b-1978f:NpcData_26:
NesPrgRom:197b1-197b5:NpcData_27:
NesPrgRom:197e6-197e9::19
NesPrgRom:197eb-197ef:NpcData_28:
NesPrgRom:19831-19835:NpcData_29:
NesPrgRom:19863-19867:NpcData_38:
NesPrgRom:1986d-19871:NpcData_2a:
NesPrgRom:1989a-1989d::17
NesPrgRom:1989f-198a3:NpcData_2b:
NesPrgRom:198cd-198d1:NpcData_2c:
NesPrgRom:198ef-198f3:NpcData_2d:
NesPrgRom:19918-1991b::16
NesPrgRom:1991d-19921:NpcData_2e:
NesPrgRom:19943-19947:NpcData_39:
NesPrgRom:19955-19959:NpcData_2f:
NesPrgRom:19973-19977:NpcData_30:
NesPrgRom:19989-1998d:NpcData_31:
NesPrgRom:1998e-19991::0d
NesPrgRom:19993-19997:NpcData_32:
NesPrgRom:199b1-199b5:NpcData_33:
NesPrgRom:199b7-199bb:NpcData_34:
NesPrgRom:199cd-199d1:NpcData_35:
NesPrgRom:199eb-199ef:NpcData_40:
NesPrgRom:19a25-19a29:NpcData_41:
NesPrgRom:19a57-19a5b:NpcData_54:
NesPrgRom:19a89-19a8d:NpcData_55:
NesPrgRom:19a9f-19aa3:NpcData_56:
NesPrgRom:19add-19ae1:NpcData_57:
NesPrgRom:19ae2-19ae5::0d stoned akahana
NesPrgRom:19ae6-19ae9::0e akahana
NesPrgRom:19b0e-19b11::18 sword of water
NesPrgRom:19b12-19b15::19 fluteOfLime
NesPrgRom:19b17-19b1b:NpcData_42:
NesPrgRom:19b25-19b29:NpcData_43:
NesPrgRom:19b37-19b3b:NpcData_52:
NesPrgRom:19b45-19b49:NpcData_48:
NesPrgRom:19b76-19b79::18 lysis plant
NesPrgRom:19b7b-19b7f:NpcData_49:
NesPrgRom:19b89-19b8d:NpcData_4a:
NesPrgRom:19bc3-19bc7:NpcData_4b:
NesPrgRom:19be1-19be5:NpcData_4c:
NesPrgRom:19c07-19c0b:NpcData_4d:
NesPrgRom:19c35-19c39:NpcData_4e:
NesPrgRom:19c5b-19c5f:NpcData_4f:
NesPrgRom:19c78-19c7b::13 fog lamp
NesPrgRom:19c7d-19c81:NpcData_44:
NesPrgRom:19ca3-19ca7:NpcData_45:
NesPrgRom:19cd8-19cdb::19
NesPrgRom:19cdd-19ce1:NpcData_46:
NesPrgRom:19d03-19d07:NpcData_47:
NesPrgRom:19d0c-19d0f::0e
NesPrgRom:19d11-19d15:NpcData_64:
NesPrgRom:19d16-19d19::0d hurt dolphin
NesPrgRom:19d26-19d29::11 love pendant
NesPrgRom:19d2a-19d2d::12 enter underground channel
NesPrgRom:19d2f-19d33:NpcData_60:
NesPrgRom:19d71-19d75:NpcData_70:
NesPrgRom:19d77-19d7b:NpcData_68:
NesPrgRom:19d95-19d99:NpcData_69:
NesPrgRom:19dda-19ddd::1d magic ring
NesPrgRom:19ddf-19de3:NpcData_6b:
NesPrgRom:19dec-19def::0f iron necklace
NesPrgRom:19df5-19df9:NpcData_6a:
NesPrgRom:19e2a-19e2d::19 lysis plant
NesPrgRom:19e2f-19e33:NpcData_6c:
NesPrgRom:19e34-19e37::0d vampire 2
NesPrgRom:19e61-19e65:NpcData_6d:
NesPrgRom:19e7e-19e81::13 fruit of power
NesPrgRom:19eaa-19ead::1e medical herb
NesPrgRom:19eaf-19eb3:NpcData_6e:
NesPrgRom:19ec4-19ec7::11 sabera trap
NesPrgRom:19ec8-19ecb::12 reset sabera trap
NesPrgRom:19ecd-19ed1:NpcData_78:
NesPrgRom:19efb-19eff:NpcData_7c:
NesPrgRom:19f2c-19f2f::18 bow of sun
NesPrgRom:19f30-19f33::19 magic ring
NesPrgRom:19f34-19f37::1a fruit of lime
NesPrgRom:19f38-19f3b::1b trigger to be able to open styx
NesPrgRom:19f3d-19f41:NpcData_7d:
NesPrgRom:19f43-19f47:NpcData_7e:
NesPrgRom:19f61-19f65:NpcData_7f:
NesPrgRom:19f77-19f7b:NpcData_80:
NesPrgRom:19fa5-19fa9:NpcData_81:
NesPrgRom:19fbb-19fbf:NpcData_82:
NesPrgRom:19fc8-19fcb::0f medical herb
NesPrgRom:19fcd-19fd1:NpcData_83:
NesPrgRom:19fe7-19feb:NpcData_84:
NesPrgRom:1a015-1a019:NpcData_85:
NesPrgRom:1a047-1a04b:NpcData_86:
NesPrgRom:1a079-1a07d:NpcData_87:
NesPrgRom:1a097-1a09b:NpcData_88:
NesPrgRom:1a0c1-1a0c5:NpcData_89:
NesPrgRom:1a0de-1a0e1::13 mimic
NesPrgRom:1a0e2-1a0e5::14 mimic
NesPrgRom:1a0e6-1a0e9::15 mimic
NesPrgRom:1a102-1a105::1c psycho shield
NesPrgRom:1a106-1a109::1d medical herb
NesPrgRom:1a10b-1a10f:NpcData_8a:
NesPrgRom:1a148-1a14b::1b sword of thunder
NesPrgRom:1a14d-1a151:NpcData_a8:
NesPrgRom:1a16e-1a171::14
NesPrgRom:1a172-1a175::15
NesPrgRom:1a176-1a179::16
NesPrgRom:1a17b-1a17f:NpcData_a9:
NesPrgRom:1a1ad-1a1b1::;; ----------------------------------------------------------------\\n; Extra bytes, nobody points to this
NesPrgRom:1a1b7-1a1bb:NpcData_aa:
NesPrgRom:1a1c5-1a1c9:NpcData_ab:
NesPrgRom:1a1de-1a1e1::12 junk (flail guy?)
NesPrgRom:1a206-1a209::1c fruit of power
NesPrgRom:1a20a-1a20d::1d lysis plant
NesPrgRom:1a20e-1a211::1e fruit of repun
NesPrgRom:1a213-1a217:NpcData_ac:
NesPrgRom:1a21c-1a21f::0e tornel
NesPrgRom:1a225-1a229:NpcData_ad:
NesPrgRom:1a25e-1a261::1a opel statue
NesPrgRom:1a262-1a265::1b magic ring
NesPrgRom:1a267-1a26b:NpcData_ae:
NesPrgRom:1a290-1a293::16 antidote
NesPrgRom:1a294-1a297::17 magic ring
NesPrgRom:1a299-1a29d:NpcData_af:
NesPrgRom:1a2d6-1a2d9::1b magic ring
NesPrgRom:1a2db-1a2df:NpcData_b9:
NesPrgRom:1a2ed-1a2f1:NpcData_b0:
NesPrgRom:1a30f-1a313:NpcData_b1:
NesPrgRom:1a335-1a339:NpcData_b2:
NesPrgRom:1a35f-1a363:NpcData_b3:
NesPrgRom:1a375-1a379:NpcData_b4:
NesPrgRom:1a3a3-1a3a7:NpcData_ba:
NesPrgRom:1a3b9-1a3bd:NpcData_b5:
NesPrgRom:1a3be-1a3c1::0d mimic
NesPrgRom:1a3c2-1a3c5::0e mimic
NesPrgRom:1a3c6-1a3c9::0f mimic
NesPrgRom:1a3e6-1a3e9::17 magic ring
NesPrgRom:1a3ea-1a3ed::18 warp boots
NesPrgRom:1a3ef-1a3f3:NpcData_b6:
NesPrgRom:1a3f4-1a3f7::0d karmine
NesPrgRom:1a408-1a40b::12 storm bracelet
NesPrgRom:1a40d-1a411:NpcData_b8:
NesPrgRom:1a412-1a415::0d fruit of power
NesPrgRom:1a417-1a41b:NpcData_90:
NesPrgRom:1a441-1a445:NpcData_91:
NesPrgRom:1a47a-1a47d::1a leather boots
NesPrgRom:1a47e-1a481::1b fruit of power
NesPrgRom:1a482-1a485::1c battle armor
NesPrgRom:1a487-1a48b:NpcData_8f:
NesPrgRom:1a494-1a497::0f power ring
NesPrgRom:1a499-1a49d:NpcData_94:
NesPrgRom:1a49f-1a4a3:NpcData_96:
NesPrgRom:1a4b9-1a4bd:NpcData_98:
NesPrgRom:1a4e3-1a4e7:NpcData_9c:
NesPrgRom:1a4ed-1a4f1:NpcData_9d:
NesPrgRom:1a507-1a50b:NpcData_9e:
NesPrgRom:1a544-1a547::1b magic ring
NesPrgRom:1a549-1a54d:NpcData_9f:
NesPrgRom:1a54e-1a551::0d draygon 1 and 2
NesPrgRom:1a553-1a557:NpcData_92:
NesPrgRom:1a565-1a569:NpcData_95:
NesPrgRom:1a583-1a587:NpcData_a0:
NesPrgRom:1a594-1a597::10 start fighting statues
NesPrgRom:1a598-1a59b::11 start fighting statues
NesPrgRom:1a59d-1a5a1:NpcData_a1:
NesPrgRom:1a5cb-1a5cf:NpcData_a2:
NesPrgRom:1a5fd-1a601:NpcData_a3:
NesPrgRom:1a602-1a605::0d mimic
NesPrgRom:1a617-1a61b:NpcData_a4:
NesPrgRom:1a62d-1a631:NpcData_a5:
NesPrgRom:1a666-1a669::1a opel statue
NesPrgRom:1a66b-1a66f:NpcData_a6:
NesPrgRom:1a670-1a673::0d draygon 1 and 2
NesPrgRom:1a691-1a695::;; ----------------------------------------------------------------\\n; Extra bytes, nobody points to this?\\n; This looks like it was supposed to be the sages appearing\\n; after the battle, but it's never actually read.
NesPrgRom:1a6ab-1a6af:NpcData_58:
NesPrgRom:1a6b1-1a6b5:NpcData_59:
NesPrgRom:1a6e7-1a6eb:NpcData_5a:
NesPrgRom:1a721-1a725:NpcData_5b:
NesPrgRom:1a75b-1a75f:NpcData_5c:
NesPrgRom:1a765-1a769:NpcData_5d:
NesPrgRom:1a76f-1a773:NpcData_5e:
NesPrgRom:1a77d-1a781:NpcData_5f:
NesPrgRom:1a78f-1a793:NpcData_02:
NesPrgRom:1a7ad-1a7b1:NpcData_c0:
NesPrgRom:1a7bb-1a7bf:NpcData_c1:
NesPrgRom:1a7c5-1a7c9:NpcData_c5:
NesPrgRom:1a7cf-1a7d3:NpcData_18:
NesPrgRom:1a7f1-1a7f5:NpcData_c6:
NesPrgRom:1a807-1a80b:NpcData_1e:
NesPrgRom:1a819-1a81d::;; ----------------------------------------------------------------\\n; Extra bytes, nobody points to this?
NesPrgRom:1a82f-1a833:NpcData_1c:
NesPrgRom:1a851-1a855:NpcData_cd:
NesPrgRom:1a85b-1a85f:NpcData_ce:
NesPrgRom:1a869-1a86d:NpcData_1b:
NesPrgRom:1a872-1a875::unused
NesPrgRom:1a893-1a897:NpcData_d4:
NesPrgRom:1a8a5-1a8a9:NpcData_e2:
NesPrgRom:1a8aa-1a8ad::0d blizzard bracelet
NesPrgRom:1a8af-1a8b3:NpcData_d5:
NesPrgRom:1a8c5-1a8c9:NpcData_3e:
NesPrgRom:1a8d3-1a8d7:NpcData_50:
NesPrgRom:1a8f9-1a8fd:NpcData_51:
NesPrgRom:1a907-1a90b:NpcData_de:
NesPrgRom:1a91d-1a921:NpcData_e0:
NesPrgRom:1a92f-1a933:NpcData_df:
NesPrgRom:1a93d-1a941:NpcData_d8:
NesPrgRom:1a947-1a94b:NpcData_d6:
NesPrgRom:1a955-1a959:NpcData_e1:
NesPrgRom:1a963-1a967:NpcData_d7:
NesPrgRom:1a96c-1a96f::unused
NesPrgRom:1a97d-1a981:NpcData_61:
NesPrgRom:1a98b-1a98f:NpcData_71:
NesPrgRom:1a9a9-1a9ad:NpcData_e3:
NesPrgRom:1a9bb-1a9bf:NpcData_e4:
NesPrgRom:1a9c9-1a9cd:NpcData_62:
NesPrgRom:1a9d7-1a9db:NpcData_e9:
NesPrgRom:1a9e1-1a9e5:NpcData_65:
NesPrgRom:1aa0f-1aa13:NpcData_e8:
NesPrgRom:1aa19-1aa1d:NpcData_72:
NesPrgRom:1aa37-1aa3b:NpcData_ec:
NesPrgRom:1aa41-1aa45:NpcData_f1:
NesPrgRom:1aa5f-1aa63:NpcData_ef:
NesPrgRom:1aa81-1aa85:NpcData_73:
NesPrgRom:1aa97-1aa9b:NpcData_8c:
NesPrgRom:1aa9c-1aa9f::0d stom
NesPrgRom:1aaa0-1aaa3::0e akahana
NesPrgRom:1aaa4-1aaa7::0f stom gf
NesPrgRom:1aaa8-1aaab::10 red man in middle
NesPrgRom:1aaac-1aaaf::11 welcome person
NesPrgRom:1aab0-1aab3::12 entrance trigger
NesPrgRom:1aab4-1aab7::13 dead stom
NesPrgRom:1aab8-1aabb::14 dead akahana
NesPrgRom:1aabc-1aabf::15 dead stom gf
NesPrgRom:1aac0-1aac3::16 dead
NesPrgRom:1aac4-1aac7::17 dead
NesPrgRom:1aac8-1aacb::18 entrance trigger
NesPrgRom:1aacd-1aad1:NpcData_f3:
NesPrgRom:1aae3-1aae7:NpcData_f4:
NesPrgRom:1aaf5-1aaf9:NpcData_f2:
NesPrgRom:1ab13-1ab1b::; Extra bytes
NesPrgRom:1ab25-1ab29:NpcData_8e:
NesPrgRom:1ab5b-1ab5f:NpcData_bf:
NesPrgRom:1ab6d-1ab71:NpcData_bb:
NesPrgRom:1ab77-1ab7b:NpcData_93:
NesPrgRom:1ab95-1ab99:NpcData_fa:
NesPrgRom:1aba3-1aba4::;; UNUSED
NesPrgRom:1ac00-1ac01:ObjectData:00
NesPrgRom:1ac08-1ac09::04
NesPrgRom:1ac0c-1ac0d::06
NesPrgRom:1ac10-1ac11::08
NesPrgRom:1ac12-1ac13::09
NesPrgRom:1ac14-1ac15::0a
NesPrgRom:1ac16-1ac17::0b
NesPrgRom:1ac18-1ac19::0c
NesPrgRom:1ac1a-1ac1b::0d
NesPrgRom:1ac1c-1ac1d::0e
NesPrgRom:1ac1e-1ac1f::0f
NesPrgRom:1ac20-1ac21::10
NesPrgRom:1ac22-1ac23::11
NesPrgRom:1ac24-1ac25::12
NesPrgRom:1ac26-1ac27::13
NesPrgRom:1ac28-1ac29::14
NesPrgRom:1ac2a-1ac2b::15
NesPrgRom:1ac2c-1ac2d::16
NesPrgRom:1ac2e-1ac2f::17
NesPrgRom:1ac30-1ac31::18
NesPrgRom:1ac32-1ac33::19
NesPrgRom:1ac34-1ac35::1a
NesPrgRom:1ac36-1ac37::1b
NesPrgRom:1ac38-1ac39::1c
NesPrgRom:1ac3a-1ac3b::1d
NesPrgRom:1ac3c-1ac3d::1e
NesPrgRom:1ac3e-1ac3f::1f
NesPrgRom:1ac40-1ac41::20
NesPrgRom:1ac42-1ac43::21
NesPrgRom:1ac44-1ac45::22
NesPrgRom:1ac4e-1ac4f::27
NesPrgRom:1ac50-1ac51::28
NesPrgRom:1ac52-1ac53::29
NesPrgRom:1ac54-1ac55::2a
NesPrgRom:1ac56-1ac57::2b
NesPrgRom:1ac58-1ac59::2c
NesPrgRom:1ac60-1ac61::30
NesPrgRom:1ac62-1ac63::31
NesPrgRom:1ac64-1ac65::32
NesPrgRom:1ac66-1ac67::33
NesPrgRom:1ac70-1ac71::38
NesPrgRom:1ac72-1ac73::39
NesPrgRom:1ac74-1ac75::3a
NesPrgRom:1ac7e-1ac7f::3f Sorcerer_Missle
NesPrgRom:1ac80-1ac81::40
NesPrgRom:1ac82-1ac83::41
NesPrgRom:1ac84-1ac85::42
NesPrgRom:1ac86-1ac87::43
NesPrgRom:1ac88-1ac89::44
NesPrgRom:1ac8a-1ac8b::45
NesPrgRom:1ac8c-1ac8d::46
NesPrgRom:1ac8e-1ac8f::47
NesPrgRom:1ac90-1ac91::48
NesPrgRom:1ac96-1ac97::4b
NesPrgRom:1ac9a-1ac9b::4d
NesPrgRom:1ac9c-1ac9d::4e
NesPrgRom:1ac9e-1ac9f::4f
NesPrgRom:1aca0-1aca1::50 BlueSlime
NesPrgRom:1aca2-1aca3::51 Weretiger
NesPrgRom:1aca4-1aca5::52 GreenJelly
NesPrgRom:1aca6-1aca7::53 RedSlime
NesPrgRom:1aca8-1aca9::54 RockGolem
NesPrgRom:1acaa-1acab::55 BlueBat
NesPrgRom:1acac-1acad::56 GreenWyvern
NesPrgRom:1acae-1acaf::57 Vampire1
NesPrgRom:1acb0-1acb1::58 Orc
NesPrgRom:1acb2-1acb3::59 RedFlyingSwampInsect
NesPrgRom:1acb4-1acb5::5a BlueMushroom
NesPrgRom:1acb6-1acb7::5b RedSwampInsect
NesPrgRom:1acb8-1acb9::5c FlyingMeadowInsect
NesPrgRom:1acba-1acbb::5d
NesPrgRom:1acbc-1acbd::5e GiantSwampInsect
NesPrgRom:1acbe-1acbf::5f LargeBlueSlime
NesPrgRom:1acc0-1acc1::60 IceZombie
NesPrgRom:1acc2-1acc3::61 GreenLivingRock
NesPrgRom:1acc4-1acc5::62 GreenGiantSpider
NesPrgRom:1acc6-1acc7::63 RedOrPurpleWyvern
NesPrgRom:1acc8-1acc9::64 DraygoniaSoldier
NesPrgRom:1acca-1accb::65 IceEntity
NesPrgRom:1accc-1accd::66 RedLivingRock
NesPrgRom:1acce-1accf::67 IceGolem
NesPrgRom:1acd0-1acd1::68 Kelbesque1
NesPrgRom:1acd2-1acd3::69 GiantRedSlime
NesPrgRom:1acd4-1acd5::6a Troll
NesPrgRom:1acd6-1acd7::6b RedJelly
NesPrgRom:1acd8-1acd9::6c Medusa
NesPrgRom:1acda-1acdb::6d RedCrab
NesPrgRom:1acdc-1acdd::6e MedusaHead
NesPrgRom:1acde-1acdf::6f EvilBird
NesPrgRom:1ace0-1ace1::70
NesPrgRom:1ace2-1ace3::71 RedOrPurpleMushroom
NesPrgRom:1ace4-1ace5::72 VioletEarthEntity
NesPrgRom:1ace6-1ace7::73 Mimic
NesPrgRom:1ace8-1ace9::74 RedGiantSpider
NesPrgRom:1acea-1aceb::75 Fishman
NesPrgRom:1acec-1aced::76 Jellyfish
NesPrgRom:1acee-1acef::77 Kraken
NesPrgRom:1acf0-1acf1::78 DarkGreenWyvern
NesPrgRom:1acf2-1acf3::79 SandMonster
NesPrgRom:1acf6-1acf7::7b Shadow1
NesPrgRom:1acf8-1acf9::7c KillerMoth
NesPrgRom:1acfa-1acfb::7d Sabera1
NesPrgRom:1acfc-1acfd::7e MovingPlatformVertical
NesPrgRom:1acfe-1acff::7f MovingPlatformHorizontal
NesPrgRom:1ad00-1ad01:ObjectDataPart2:80 DraygoniaArcher
NesPrgRom:1ad02-1ad03::81 EvilBomberBird
NesPrgRom:1ad04-1ad05::82 Lavaman
NesPrgRom:1ad08-1ad09::84 LizardMan
NesPrgRom:1ad0a-1ad0b::85 GiantEye
NesPrgRom:1ad0c-1ad0d::86 Salamander
NesPrgRom:1ad0e-1ad0f::87 Sorcerer
NesPrgRom:1ad10-1ad11::88 Mado1
NesPrgRom:1ad12-1ad13::89 DragoniaKnight
NesPrgRom:1ad14-1ad15::8a Devil
NesPrgRom:1ad16-1ad17::8b Kelbesque2
NesPrgRom:1ad18-1ad19::8c Shadow2
NesPrgRom:1ad1c-1ad1d::8e used to be shooting iron walls?
NesPrgRom:1ad1e-1ad1f::8f Guardian statue
NesPrgRom:1ad20-1ad21::90 Sabera2
NesPrgRom:1ad22-1ad23::91 Tarantula
NesPrgRom:1ad24-1ad25::92 Skeleton
NesPrgRom:1ad26-1ad27::93 Mado2
NesPrgRom:1ad28-1ad29::94
NesPrgRom:1ad2a-1ad2b::95 BlackKnight
NesPrgRom:1ad2c-1ad2d::96
NesPrgRom:1ad2e-1ad2f::97 Karmine
NesPrgRom:1ad30-1ad31::98 Sandman
NesPrgRom:1ad32-1ad33::99 Mummy
NesPrgRom:1ad34-1ad35::9a TombGuardian
NesPrgRom:1ad36-1ad37::9b Draygon1
NesPrgRom:1ad38-1ad39::9c StatueOfSun
NesPrgRom:1ad3a-1ad3b::9d StatueOfMoon
NesPrgRom:1ad3c-1ad3d::9e Draygon2
NesPrgRom:1ad3e-1ad3f::9f
NesPrgRom:1ad40-1ad41::a0 GroundSentry
NesPrgRom:1ad42-1ad43::a1 TowerDefenseMech
NesPrgRom:1ad44-1ad45::a2
NesPrgRom:1ad46-1ad47::a3 AirSentry
NesPrgRom:1ad48-1ad49::a4 Dyna
NesPrgRom:1ad4a-1ad4b::a5
NesPrgRom:1ad60-1ad61::b0 Windmill blades
NesPrgRom:1ad62-1ad63::b1 Windmill gears
NesPrgRom:1ad64-1ad65::b2
NesPrgRom:1ad66-1ad67::b3
NesPrgRom:1ad68-1ad69::b4
NesPrgRom:1ad6a-1ad6b::b5
NesPrgRom:1ad70-1ad71::b8
NesPrgRom:1ad72-1ad73::b9 DynaEyeLaser
NesPrgRom:1ad74-1ad75::ba DynaPodLaser
NesPrgRom:1ad78-1ad79::bc Vampire2_Bat
NesPrgRom:1ad7c-1ad7d::be
NesPrgRom:1ad7e-1ad7f::bf Draygon2_Fireball
NesPrgRom:1ad80-1ad81::c0
NesPrgRom:1ad82-1ad83::c1 Vampire1_Bat
NesPrgRom:1ad84-1ad85::c2
NesPrgRom:1ad86-1ad87::c3 GiantSwampInsect_PoisonSpit
NesPrgRom:1ad88-1ad89::c4 GiantSwampInsect_SummonedInsect
NesPrgRom:1ad8a-1ad8b::c5 Kelbesque1_Rock
NesPrgRom:1ad8c-1ad8d::c6 Sabera1_Fireballs
NesPrgRom:1ad8e-1ad8f::c7 Kelbesque2_Fire
NesPrgRom:1ad90-1ad91::c8 Sabera2_OrbitFlame
NesPrgRom:1ad92-1ad93::c9 Sabera2_Fireballs
NesPrgRom:1ad94-1ad95::ca
NesPrgRom:1ad96-1ad97::cb SunAndMoonStatueFireball
NesPrgRom:1ad98-1ad99::cc Draygon1_Lightning
NesPrgRom:1ad9a-1ad9b::cd Draygon2_Laser
NesPrgRom:1ad9c-1ad9d::ce Draygon2_Breath
NesPrgRom:1ad9e-1ad9f::cf
NesPrgRom:1ada0-1ada1::d0 RockWall
NesPrgRom:1ada2-1ada3::d1 IceWall
NesPrgRom:1ada4-1ada5::d2 WaterChannel
NesPrgRom:1ada6-1ada7::d3 IronWall
NesPrgRom:1ada8-1ada9::d4 WallExplosion
NesPrgRom:1adaa-1adab::d5
NesPrgRom:1adac-1adad::d6
NesPrgRom:1adae-1adaf::d7
NesPrgRom:1adb0-1adb1::d8 (unused alias of b0)
NesPrgRom:1adb2-1adb3::d9 (unused alias of b1)
NesPrgRom:1adb4-1adb5::da
NesPrgRom:1adb6-1adb7::db
NesPrgRom:1adb8-1adb9::dc
NesPrgRom:1adba-1adbb::dd
NesPrgRom:1adbc-1adbd::de
NesPrgRom:1adbe-1adbf::df
NesPrgRom:1adc0-1adc1::e0 EvilBomberBird_Bomb
NesPrgRom:1adc2-1adc3::e1
NesPrgRom:1adc4-1adc5::e2 GiantSwampInsect_SummonedInsect_Bomb
NesPrgRom:1adc6-1adc7::e3 Beam_Paralysis
NesPrgRom:1adc8-1adc9::e4 Beam_StoneGaze
NesPrgRom:1adca-1adcb::e5 RockGolem_Rock
NesPrgRom:1adcc-1adcd::e6 Beam_Curse
NesPrgRom:1adce-1adcf::e7
NesPrgRom:1add0-1add1::e8 Fishman_Trident
NesPrgRom:1add2-1add3::e9 Orc_Axe
NesPrgRom:1add4-1add5::ea SwampPlant_Pollen
NesPrgRom:1add6-1add7::eb
NesPrgRom:1add8-1add9::ec DraygoniaSoldier_Sword
NesPrgRom:1adda-1addb::ed IceGolem_Rock
NesPrgRom:1addc-1addd::ee Troll_Axe
NesPrgRom:1adde-1addf::ef Kraken_Ink
NesPrgRom:1ade0-1ade1::f0 DraygoniaArcher_Arrow
NesPrgRom:1ade2-1ade3::f1
NesPrgRom:1ade4-1ade5::f2 DraygoniaKnight_Sword
NesPrgRom:1ade6-1ade7::f3
NesPrgRom:1ade8-1ade9::f4 GroundSentry_Laser
NesPrgRom:1adea-1adeb::f5 TowerDefenseMech_Laser
NesPrgRom:1adec-1aded::f6 TowerSentinel_Laser
NesPrgRom:1adee-1adef::f7
NesPrgRom:1adf0-1adf1::f8
NesPrgRom:1adf2-1adf3::f9 BlackKnight_Flail
NesPrgRom:1adf4-1adf5::fa LizardMan_Flail
NesPrgRom:1adf6-1adf7::fb
NesPrgRom:1adf8-1adf9::fc Mado_Shuriken
NesPrgRom:1adfa-1adfb::fd GuardianStatue_Missile
NesPrgRom:1adfc-1adfd::fe DemonWall_Fire
NesPrgRom:1ae00:ObjectData_Object00:
NesPrgRom:1ae05:ObjectData_SpawnSlot0:; 06, 04, and 0a below seem to only trigger at the very start of the\\n; game, while the screen is flashing before the door opens.  This is\\n; what populates spawn slots 0..3.  Note that slot 2 is zeroed out\\n; via objectdata 05, which is hardlinked to empty (00).
NesPrgRom:1ae15:ObjectData_SpawnSlot1:
NesPrgRom:1ae24:ObjectData_SpawnSlot3:
NesPrgRom:1ae2f:ObjectData_Object27:
NesPrgRom:1ae3f:ObjectData_Object0D:
NesPrgRom:1ae4a:ObjectData_Object0F:
NesPrgRom:1ae55:ObjectData_Object0E:
NesPrgRom:1ae60:ObjectData_Object28:
NesPrgRom:1ae6c:ObjectData_Object2C:
NesPrgRom:1ae78:ObjectData_ObjectD8:
NesPrgRom:1ae86:ObjectData_ObjectD9:
NesPrgRom:1ae94:ObjectData_Person:
NesPrgRom:1aea2:ObjectData_Object31:
NesPrgRom:1aea9:ObjectData_Object40:
NesPrgRom:1aeb7:ObjectData_Object41:
NesPrgRom:1aec5:ObjectData_Object42:
NesPrgRom:1aed3:ObjectData_Object43:
NesPrgRom:1aee1:ObjectData_Object44:
NesPrgRom:1aeef:ObjectData_Object45:
NesPrgRom:1aefd:ObjectData_Object46:
NesPrgRom:1af0b:ObjectData_Object47:
NesPrgRom:1af19:ObjectData_Object48:
NesPrgRom:1af27:ObjectData_Object4E:
NesPrgRom:1af35:ObjectData_Object38:
NesPrgRom:1af47:ObjectData_Object39:
NesPrgRom:1af55:ObjectData_Object3A:
NesPrgRom:1af63:ObjectData_Object29:
NesPrgRom:1af6b:ObjectData_Object2A:
NesPrgRom:1af77:ObjectData_Object2B:
NesPrgRom:1af80:ObjectData_ObjectB2:
NesPrgRom:1af89:ObjectData_ObjectB3:
NesPrgRom:1af92:ObjectData_ObjectDA:
NesPrgRom:1af9a:ObjectData_ObjectC0:
NesPrgRom:1afa7:ObjectData_ObjectC2:
NesPrgRom:1afb5:ObjectData_ObjectDC:
NesPrgRom:1afbe::missing a byte here
NesPrgRom:1afbf:ObjectData_ObjectDD:
NesPrgRom:1afc8::missing a byte again
NesPrgRom:1afc9:ObjectData_ObjectCF:
NesPrgRom:1afd1::; This is a whole other item - unused?
NesPrgRom:1afda::extra byte?
NesPrgRom:1afdb:ObjectData_Object0B:
NesPrgRom:1afe6:ObjectData_WindAttack1:; Level 1 shot from the Sword of Wind
NesPrgRom:1afe7-1afef::;                            SPR 32  SPD 36  38  3a  HP  DMG
NesPrgRom:1aff0-1aff8::;                            40  42  44  46  48  4a  4c  4e
NesPrgRom:1afff:ObjectData_WindAttack2:; Level 2 shot from Sword of Wind
NesPrgRom:1b019:ObjectData_TornadoAttack:; Level 3 shot from Sword of Wind
NesPrgRom:1b032:ObjectData_WaterAttack1:; Level 1 shot from Sword of Water
NesPrgRom:1b04b:ObjectData_WaterAttack2:; Level 2 shot from Sword of Water
NesPrgRom:1b064:ObjectData_BlizzardAttack:; Level 3 shot from Sword of Water
NesPrgRom:1b082:ObjectData_FireAttack1:; Level 1 shot from Sword of Fire
NesPrgRom:1b09b:ObjectData_FireAttack2:; Level 2 shot from Sword of Fire
NesPrgRom:1b0b4:ObjectData_FlameAttack:; Level 3 shot from Sword of Fire
NesPrgRom:1b0cd:ObjectData_FireAttack2Child:; Level 2 fire attack spawns a single object (19) that in\\n; turn spawns 6-7 of these children.
NesPrgRom:1b0eb:ObjectData_FlameAttackChild:; Level 3 flame attack spawns a single object (1a) that in\\n; turn spawns 6-7 of these children.
NesPrgRom:1b10a:ObjectData_ThunderAttack1:; Level 1 shot from Sword of Thunder
NesPrgRom:1b123:ObjectData_ThunderAttack2:; Level 2 shot from Sword of Thunder\\n; Also used when Rage kicks the player out for not having water sword
NesPrgRom:1b13c:ObjectData_StormAttack:; Read once during the Level 3 storm attack
NesPrgRom:1b155:ObjectData_StormAttackChild:; Related to storm attack - read many times during duration
NesPrgRom:1b16c:ObjectData_CrystalisShot1:
NesPrgRom:1b184:ObjectData_CrystalisShot2:; Note shooting Crystalis spawns two different objects at once.\\n; I don't know which is which, but it's not too important.
NesPrgRom:1b19c:ObjectData_RockWall:
NesPrgRom:1b1b8:ObjectData_IceWall:
NesPrgRom:1b1d4:ObjectData_WaterChannel:
NesPrgRom:1b1f0:ObjectData_IronWall:
NesPrgRom:1b20c:ObjectData_WallExplosion:; Explosion animation
NesPrgRom:1b217:ObjectData_ObjectD5:
NesPrgRom:1b222:ObjectData_BridgeFormation:; Animation for making a bridge
NesPrgRom:1b22d:ObjectData_ObjectD7:
NesPrgRom:1b238:ObjectData_ObjectDB:door top?
NesPrgRom:1b243:ObjectData_Object20:; Spawn sfx is for player's paralysis magic - paralysis beam?
NesPrgRom:1b256:ObjectData_Object21:; Spawn sfx is for barrier magic, so maybe this is the barrier sprite?
NesPrgRom:1b265:ObjectData_RefreshMagicAnimation:
NesPrgRom:1b271:ObjectData_ObjectDF:
NesPrgRom:1b27f:ObjectData_ObjectDE:
NesPrgRom:1b287:ObjectData_Object4D:
NesPrgRom:1b290:ObjectData_Object0C:
NesPrgRom:1b2a0:ObjectData_BlueSlime:
NesPrgRom:1b2a1-1b2a9::;  80=300,x sprite ($64), 20=340,x speed (1)\\n;  02=3c0,x HP (2),       01=3e0,x damage (9)\\n;                            SPR 32  SPD 36  38  3a  HP  DMG
NesPrgRom:1b2aa-1b2b2::;  80=400,x defense (0),  40=420,x&1f lvl to hurt (1)\\n;  420,x&40 is also hitbox\\n;                            DEF LVL 44  46  48  4a  4c  4e
NesPrgRom:1b2b3-1b2b5::;                            50  52
NesPrgRom:1b2b6-1b2b7::;                            6e
NesPrgRom:1b2b8:ObjectData_Weretiger:
NesPrgRom:1b2b9-1b2c1::;                            SPR 32  SPD 36  38  3a  HP  DMG
NesPrgRom:1b2c2-1b2ca::;                            DEF LVL
NesPrgRom:1b2d0:ObjectData_GreenJelly:
NesPrgRom:1b2e7:ObjectData_RedSlime:
NesPrgRom:1b2ff:ObjectData_RockGolem:
NesPrgRom:1b317:ObjectData_BlueBat:
NesPrgRom:1b32e:ObjectData_GreenWyvern:
NesPrgRom:1b346:ObjectData_Vampire1:
NesPrgRom:1b35e:ObjectData_Orc:
NesPrgRom:1b377:ObjectData_RedFlyingSwampInsect:
NesPrgRom:1b38f:ObjectData_BlueMushroom:
NesPrgRom:1b3a6:ObjectData_RedSwampInsect:
NesPrgRom:1b3bd:ObjectData_FlyingMeadowInsect:
NesPrgRom:1b3d5:ObjectData_SwampPlant:
NesPrgRom:1b3ec:ObjectData_GiantSwampInsect:
NesPrgRom:1b403:ObjectData_LargeBlueSlime:
NesPrgRom:1b41c:ObjectData_IceZombie:
NesPrgRom:1b435:ObjectData_GreenLivingRock:
NesPrgRom:1b44c:ObjectData_GreenGiantSpider:
NesPrgRom:1b463:ObjectData_RedOrPurpleWyvern:
NesPrgRom:1b47b:ObjectData_DraygoniaSoldier:
NesPrgRom:1b496:ObjectData_IceEntity:; This is the weird purple plant-like things that we level-up on
NesPrgRom:1b4ad:ObjectData_RedLivingRock:
NesPrgRom:1b4c4:ObjectData_IceGolem:
NesPrgRom:1b4dc:ObjectData_Kelbesque1:
NesPrgRom:1b4f3:ObjectData_GiantRedSlime:
NesPrgRom:1b50c:ObjectData_Troll:
NesPrgRom:1b525:ObjectData_RedJelly:
NesPrgRom:1b53c:ObjectData_Medusa:
NesPrgRom:1b554:ObjectData_RedCrab:
NesPrgRom:1b56b:ObjectData_MedusaHead:; Red medusa-haired/spinning flyers in waterfall valley
NesPrgRom:1b582:ObjectData_EvilBird:
NesPrgRom:1b599:ObjectData_Rage:; In lime tree lake
NesPrgRom:1b5a9:ObjectData_RedOrPurpleMushroom:
NesPrgRom:1b5c0:ObjectData_VioletEarthEntity:
NesPrgRom:1b5d7:ObjectData_Mimic:
NesPrgRom:1b5f1:ObjectData_RedGiantSpider:
NesPrgRom:1b60a:ObjectData_Fishman:
NesPrgRom:1b623:ObjectData_Jellyfish:
NesPrgRom:1b63a:ObjectData_Kraken:
NesPrgRom:1b651:ObjectData_DarkGreenWyvern:
NesPrgRom:1b66a:ObjectData_SandMonster:
NesPrgRom:1b683:ObjectData_Shadow1:
NesPrgRom:1b697:ObjectData_Wraith:; This is what (both) shadows turn into when hit with magic
NesPrgRom:1b6b4:ObjectData_KillerMoth:; Moth from fortress and sabera
NesPrgRom:1b6cb:ObjectData_Sabera1:
NesPrgRom:1b6e4:ObjectData_MovingPlatformVertical:
NesPrgRom:1b6f4:ObjectData_MovingPlatformHorizontal:
NesPrgRom:1b704:ObjectData_DraygoniaArcher:
NesPrgRom:1b71d:ObjectData_EvilBomberBird:
NesPrgRom:1b734:ObjectData_Lavaman:
NesPrgRom:1b74b:ObjectData_LizardMan:
NesPrgRom:1b764:ObjectData_GiantEye:
NesPrgRom:1b77c:ObjectData_Salamander:
NesPrgRom:1b795:ObjectData_Sorcerer:; These are the ones at the top of the two rooms in Styx,\\n; which fire a flurry of shots in all diretions
NesPrgRom:1b7ad:ObjectData_Mado1:
NesPrgRom:1b7c6:ObjectData_DraygoniaKnight:
NesPrgRom:1b7df:ObjectData_Devil:
NesPrgRom:1b7f6:ObjectData_Kelbesque2:
NesPrgRom:1b80d:ObjectData_Shadow2:
NesPrgRom:1b821:ObjectData_Object4B:; never covered...? looks like some sort of wraith?
NesPrgRom:1b83e:ObjectData_Sabera2:
NesPrgRom:1b855:ObjectData_Sabera2_OrbitFlame:; Fire(s) that orbits around Sabera.
NesPrgRom:1b86e:ObjectData_Tarantula:
NesPrgRom:1b887:ObjectData_GuardianStatue:; Shooting statue in Styx and fortress entrance
NesPrgRom:1b896:ObjectData_Skeleton:
NesPrgRom:1b8af:ObjectData_Mado2:
NesPrgRom:1b8c8:ObjectData_PurpleGiantEye:; These are the ones in the pyramid
NesPrgRom:1b8e0:ObjectData_BlackKnight:
NesPrgRom:1b8f9:ObjectData_Scorpion:
NesPrgRom:1b910:ObjectData_Karmine:
NesPrgRom:1b927:ObjectData_Sandman:
NesPrgRom:1b93e:ObjectData_Mummy:
NesPrgRom:1b957:ObjectData_TombGuardian:; These are the funny thing that shoot curse beams
NesPrgRom:1b970:ObjectData_Draygon1:
NesPrgRom:1b988:ObjectData_StatueOfSun:
NesPrgRom:1b99f:ObjectData_StatueOfMoon:
NesPrgRom:1b9b6:ObjectData_Draygon2:
NesPrgRom:1b9cf:ObjectData_PyramidMoth:
NesPrgRom:1b9e4:ObjectData_GroundSentry:; First wave of robots
NesPrgRom:1b9fd:ObjectData_TowerDefenseMech:; Second wave of robots
NesPrgRom:1ba16:ObjectData_TowerSentinel:; Cannon on the rail above one of the doors
NesPrgRom:1ba2d:ObjectData_AirSentry:; Flyer
NesPrgRom:1ba44:ObjectData_DynaEye:; This is the main hit box for dyna, which shoots the purple laser
NesPrgRom:1ba5c:ObjectData_DynaPod:; Looks like this is each of the two circles on the arches to\\n; either side of Dyna, which shoots the tons of blue balls and\\n; the purple counterattack
NesPrgRom:1ba73:ObjectData_ObjectB5:
NesPrgRom:1ba80:ObjectData_Vampire2:
NesPrgRom:1ba98:ObjectData_GroundSentry_Harpoon:; This is the first child from the brown robots.  It further\\n; spawns $f4 (GroundSentry_Laser, adhoc $54).
NesPrgRom:1baa5:ObjectData_Vampire1_Bat:
NesPrgRom:1bab5:ObjectData_Vampire2_Bat:
NesPrgRom:1bac5:ObjectData_GiantSwampInsect_SummonedInsect:
NesPrgRom:1badf:ObjectData_GiantSwampInsect_PoisonSpit:
NesPrgRom:1baf3:ObjectData_Kelbesque1_Rock:
NesPrgRom:1bb08:ObjectData_Kelbesque2_Fireball:; The green fireballs he shoots
NesPrgRom:1bb1c:ObjectData_Sabera1_Fireball:
NesPrgRom:1bb30:ObjectData_Sabera2_Fireball:; Bouncing fireballs
NesPrgRom:1bb44:ObjectData_Karmine_Fireball:; Bouncing fireballs
NesPrgRom:1bb59:ObjectData_SunAndMoonStatue_Fireball:
NesPrgRom:1bb6d:ObjectData_Draygon1_Lightning:
NesPrgRom:1bb81:ObjectData_Draygon2_Laser:
NesPrgRom:1bb95:ObjectData_Draygon2_Breath:
NesPrgRom:1bba9:ObjectData_Draygon2_Fireball:
NesPrgRom:1bbbe:ObjectData_DynaCounterattack:; Pair of purple shots fired out of side pods whenever eye hit
NesPrgRom:1bbd3:ObjectData_DynaEyeLaser:; Vertical projectile from dyna's main eye
NesPrgRom:1bbe8:ObjectData_DynaPodBubble:; Bubbles sprayed out from side pods
NesPrgRom:1bbfd:ObjectData_Sorcerer_Missile:
NesPrgRom:1bc12:ObjectData_EvilBomberBird_Bomb:
NesPrgRom:1bc27:ObjectData_ObjectE1:; Looks like some sort og projectile, same data as the bomber\\n; bird's bomb and summoned insect's bomb, but with in-between\\n; ATK stat (and a different $320, whatever that is).\\n; Spawned by adhoc spawn $41, but only violet earth entity\\n; has this as a child, and it doesn't seem to shoot anything?
NesPrgRom:1bc3c:ObjectData_GiantSwampInsect_SummonedInsect_Bomb:; I think this may be the x-shaped shot
NesPrgRom:1bc51:ObjectData_Beam_Paralysis:
NesPrgRom:1bc65:ObjectData_Beam_StoneGaze:
NesPrgRom:1bc79:ObjectData_RockGolem_Rock:
NesPrgRom:1bc8e:ObjectData_Beam_Curse:
NesPrgRom:1bca2:ObjectData_Beam_MPDrain:; This appears to be the web/missile that causes MP drain\\n; it's unclear how this differs from f1, f7, and f8 (the\\n; latter of which are identical to this).
NesPrgRom:1bcb7:ObjectData_Fishman_Trident:
NesPrgRom:1bccb:ObjectData_Orc_Axe:
NesPrgRom:1bce0:ObjectData_SwampPlant_Pollen:
NesPrgRom:1bcf4:ObjectData_ParalysisPowder:; Dropped by flying bugs in desert cave
NesPrgRom:1bd08:ObjectData_DraygoniaSoldier_Sword:
NesPrgRom:1bd1d:ObjectData_IceGolem_Rock:
NesPrgRom:1bd32:ObjectData_Troll_Axe:
NesPrgRom:1bd47:ObjectData_Kraken_Ink:
NesPrgRom:1bd5c:ObjectData_DraygoniaArcher_Arrow:
NesPrgRom:1bd70:ObjectData_ObjectF1:; uncovered???\\n; ad hoc spawn $51, but nothing has this as child.
NesPrgRom:1bd85:ObjectData_DraygoniaKnight_Sword:
NesPrgRom:1bd9a:ObjectData_KillerMothResidue:
NesPrgRom:1bdae:ObjectData_GroundSentry_Laser:
NesPrgRom:1bdc2:ObjectData_TowerDefenseMech_Laser:
NesPrgRom:1bdd6:ObjectData_TowerSentinel_Laser:
NesPrgRom:1bdea:ObjectData_Skeleton_Shot:; This is an MP-draining shot, identical to E7 (spider web)
NesPrgRom:1bdff:ObjectData_Lavaman_Shot:; Lavamen under karmine, same MP drain as spider/skeleton,\\n; though they shoot 4 in close succession
NesPrgRom:1be14:ObjectData_BlackKnight_Flail:
NesPrgRom:1be2a:ObjectData_LizardMan_Flail:
NesPrgRom:1be40:ObjectData_StomSword:; Spawns during stom duel
NesPrgRom:1be55:ObjectData_Mado_Shuriken:
NesPrgRom:1be69:ObjectData_GuardianStatue_Missile:
NesPrgRom:1be7d:ObjectData_DemonWall_Fire:
NesPrgRom:1be91-1bea0::; UNUSED?
NesPrgRom:1bff0-1bff4:NpcData_00:
NesPrgRom:1c000:InitiateDialog:
NesPrgRom:1c006::$1c95d
NesPrgRom:1c00b::$1c95e
NesPrgRom:1c016::$1ca5e
NesPrgRom:1c01b::; At this point, $24$25 now points to this character's dialog script
NesPrgRom:1c022::; We've found a matching condition, so jump.
NesPrgRom:1c02a::; Keep looping as long as the first byte was positive.
NesPrgRom:1c02f::Done looping through locations.
NesPrgRom:1c052::; Done with two-byte add
NesPrgRom:1c05a::$1c071
NesPrgRom:1c05c::; Found matching flags.\\nload up $20$21$22 from next two bytes.
NesPrgRom:1c061::store the 3rd byte -> future non-matching locations?
NesPrgRom:1c066::; $40 in the first byte indicates we have flag(s) to toggle.  So toggle them.
NesPrgRom:1c076::$1c057 - uncond, should never be minus (failsafe?)
NesPrgRom:1c078:PrepareMessageFrom24y:; This appears to be displaying some dialog, or something.\\n; NOTE this is an entry point, too, from ItemUse and ItemGet\\n; read [2] and [3] from ItemUseData[item]\\n;   $21 gets the low 3 bits from [2], $22 gets the high 5 (shifted)\\n;   $20 gets [3]\\n; Ordinary dialog -> ($24) => $1cf26 @@@@@@\\n; This is clearly doing something with a 256-bit set.\\n; For dialog, this is entered when we found a matched flag in $24$25.
NesPrgRom:1c07b::NOOP
NesPrgRom:1c08e:SkipThreeBytesAndContinuationPairs:
NesPrgRom:1c08f:SkipTwoBytesAndContinuationPairs:; Entry point here when searching for correct dialog\\n; Skip the first two, which are read by $1c078 on a match.
NesPrgRom:1c095::$1c09f
NesPrgRom:1c09d::$1c097
NesPrgRom:1c0a0:CheckNpcSpawnCondition:; Loops through a list of flags to determine if certain conditions\\n; are true when entering a new location (affects NPC spawning, etc).\\n; Input\\n;   $23 - ID of NPC to spawn\\n; Output\\n;   $20 - zero if it should spawn, nonzero to skip spawn\\n; NOTE This includes boss spawns (c0..cc)
NesPrgRom:1c0a9::$1c0b6
NesPrgRom:1c0ab::$1c5e0
NesPrgRom:1c0b0::$1c5e1
NesPrgRom:1c0b3::$1c0be
NesPrgRom:1c0bb::$1c6e1
NesPrgRom:1c0c5::; ff indicates that there are no more conditions, so spawn should happen.
NesPrgRom:1c0c7::; Otherwise, each condition block is preceded by the location.
NesPrgRom:1c0c9::$1c0d9
NesPrgRom:1c0ce::$1c0d3
NesPrgRom:1c0d0::; flag did not match -> don't spawn
NesPrgRom:1c0d5::$1c0cb
NesPrgRom:1c0d7::$1c0c0 unconditional
NesPrgRom:1c0d9:NpcSpawnConditionLoop_NextLocation:; ----\\n; Advance y until we get to the end of this condition\\n$24 was set in $1c0ae, at least in one case
NesPrgRom:1c0de::$1c0d9
NesPrgRom:1c0e0::$1c0c0 unconditional
NesPrgRom:1c0e2::; ----
NesPrgRom:1c0e3:TriggerSquare:ID of trigger
NesPrgRom:1c0e5::always >= $80 so high bit irrelevant
NesPrgRom:1c0e8::no-op (just jumps to next instruction)
NesPrgRom:1c0eb::condition not yet met
NesPrgRom:1c0f0::Y = 0
NesPrgRom:1c0f1::X = trigger ID << 1
NesPrgRom:1c0fe::do the action
NesPrgRom:1c106::one (or more) condition failed - do nothing
NesPrgRom:1c107:TriggerSquare_ConditionMet:first byte positive -> check another condition
NesPrgRom:1c109::$1c0fb
NesPrgRom:1c10d::condition met
NesPrgRom:1c112:SetOrClearFlagsFromBytePair_24y:
NesPrgRom:1c117::$1c124
NesPrgRom:1c119::; SET
NesPrgRom:1c121::$1c12e
NesPrgRom:1c135:ReadFlagFromBytePair_24y:
NesPrgRom:1c138::; The 20 bit of the first byte determines whether we're looking for\\n; the flag to be set or cleared.
NesPrgRom:1c141::$1c145
NesPrgRom:1c148:ParseFlagFromBytePair_24y:
NesPrgRom:1c159::$28 <- 1 << $24[1]&7
NesPrgRom:1c167-1c16e:PowersOfTwo_1c:
NesPrgRom:1c16f:_1c16f:; Cast telepathy - select message?!?
NesPrgRom:1c175::$1c18b
NesPrgRom:1c177::; not enough MP
NesPrgRom:1c179:Telepathy_ShowMessage:; At this point, x is in 0..3.\\n;   0 = insufficient mp ????\\n;   1 = got free mp (result was 0)\\n;   2 = "don't rely on others so much"\\n;   3 = use location (result was 2..7), level < minimum\\n; $23 is sage index 0 = tornel, 1 = zebu, 2 = asina, 3 = kensu
NesPrgRom:1c17c::which sage?
NesPrgRom:1c180::; This looks like a 32-byte data table - 8 per value of X
NesPrgRom:1c18e::0 = MP,
NesPrgRom:1c195::$1c1af
NesPrgRom:1c197::; give 32 free MP
NesPrgRom:1c19d::$1c1a4
NesPrgRom:1c1a2::$1c1a7
NesPrgRom:1c1b1::$1c1b8
NesPrgRom:1c1be::-> 0..6
NesPrgRom:1c1c4::expected level per area
NesPrgRom:1c1ca::$1c1d1
NesPrgRom:1c1cc::; Player's level is lower than expected
NesPrgRom:1c1d5::which sage
NesPrgRom:1c1e8::$1c200
NesPrgRom:1c1ea::; Flag didn't match
NesPrgRom:1c1ee::$1c1f6
NesPrgRom:1c1f0::; Flag had a 40 bit -> $29 is a random bit\\n; from the results table.
NesPrgRom:1c1f2::$1c1f6
NesPrgRom:1c206::$1c20a
NesPrgRom:1c20c::$1c1e5
NesPrgRom:1c213-1c219:TelepathyMinimumLevel:; expected level for the different game areas
NesPrgRom:1c21a-1c221:TelepathyResultMap:; maps telepathy result (1c222/1c22f) from 0..7 to 0..3\\n; (but why not just store 0..3 directly?)
NesPrgRom:1c222:CheckTelepathyResult:
NesPrgRom:1c22f-1c23e:TelepathyResults:
NesPrgRom:1c278::$1db00
NesPrgRom:1c27d::$1db01
NesPrgRom:1c285::$29 <- the actual item ID
NesPrgRom:1c28c::$1c28f
NesPrgRom:1c28e::; TODO - failed to gain item, give a message about what was there
NesPrgRom:1c291::; Read [2] and [3] from $24$25.  [2] is a bitset address -> $21$22.  [3] is zero -> $20\\n; Essentially just skips y+=2 and loads $20,$21,$22
NesPrgRom:1c294::;
NesPrgRom:1c297::should always be ff ???
NesPrgRom:1c299::$1c29f
NesPrgRom:1c29b::DEAD???
NesPrgRom:1c29d::$1c26f  ; DEAD???
NesPrgRom:1c2a0:ItemGet_PickSlotAndAdd:; Inputs\\n;   $23 is is itemget slot | $80.\\n;   $24$25 points to one of the tables starting at $1dde6, via $1db00\\n;   $29 is the item ID to gain\\n; Outputs\\n;   $23 <- 0 if successful, <- $ff if failed
NesPrgRom:1c2a2::[0] First slot to check
NesPrgRom:1c2a6::[1] Number of slots to try
NesPrgRom:1c2ab:ItemGet_AddWeaponBallOrBracelet:
NesPrgRom:1c2b7:ItemGet_Crystalis:
NesPrgRom:1c2c1::; Clear out all the rest of the swords and bracelets.
NesPrgRom:1c2de:ItemGet_WeaponBallOrBracelet_NotCrystalis:
NesPrgRom:1c2e5::$1c2f4
NesPrgRom:1c2e9::$1c2f4
NesPrgRom:1c2ed::$1c2f4
NesPrgRom:1c2f1::$1c2f4
NesPrgRom:1c2fb::$1c307
NesPrgRom:1c30d::$1c314
NesPrgRom:1c311::$1c308
NesPrgRom:1c313::No empty slot found
NesPrgRom:1c31e:ItemUse:
NesPrgRom:1c322::ItemUseData
NesPrgRom:1c32c::$1c399
NesPrgRom:1c331::$1c39a
NesPrgRom:1c338::; Call the jump table routine\\n$1c351 - effectively jsr ($26)
NesPrgRom:1c33b::; If the item ID in $23 is switched out for #$ff then the item cannot\\n; be used - bail out (TODO - who displays the dialog?).
NesPrgRom:1c341::; Item actually did something -> ?\\nread next two from ItemData[id] -> $20..$22
NesPrgRom:1c34b::$1c350
NesPrgRom:1c34d::don't discard shell flute
NesPrgRom:1c354:ItemUse_TradeIn:; This happens afterwards when using anything other than shell flute
NesPrgRom:1c36a::; Look for the item in the inventory
NesPrgRom:1c374::$1c36a
NesPrgRom:1c377:DeleteUsedItem:; ----
NesPrgRom:1c379::$1c383
NesPrgRom:1c37b::; was not the last item in the column\\n; in that case, move the one to the right into its place\\n; NOTE - this looks broken, it's missing the 'inx' to\\n; actually work correctly.  But it's irrelevant since it\\n; ultimately just writes #$ff into the spot anyway.
NesPrgRom:1c389::which row was it in?
NesPrgRom:1c390::unselect that row
NesPrgRom:1c399-1c39a:ItemUseJumpTable:
NesPrgRom:1c3a1-1c3a2::04 crystalis
NesPrgRom:1c3d3-1c3d4::1d medical herb
NesPrgRom:1c3d5-1c3d6::1e antidote
NesPrgRom:1c3d7-1c3d8::1f lysis plant
NesPrgRom:1c3d9-1c3da::20 fruit of lime
NesPrgRom:1c3db-1c3dc::21 fruit of power
NesPrgRom:1c3dd-1c3de::22 magic ring
NesPrgRom:1c3df-1c3e0::23 fruit of repun
NesPrgRom:1c3e1-1c3e2::24 warp boots -> rts
NesPrgRom:1c3e3-1c3e4::25 statue of onyx
NesPrgRom:1c3e5-1c3e6::26 opel statue
NesPrgRom:1c3e7-1c3e8::27 insect flute
NesPrgRom:1c3e9-1c3ea::28 flute of lime
NesPrgRom:1c3fb-1c3fc::31 alarm flute
NesPrgRom:1c3fd-1c3fe::32 windmill key
NesPrgRom:1c3ff-1c400::33 key to prison
NesPrgRom:1c401-1c402::34 key to styx
NesPrgRom:1c403-1c404::35 fog lamp
NesPrgRom:1c405-1c406::36 shell flute
NesPrgRom:1c407-1c408::37 eye glasses
NesPrgRom:1c40b-1c40c::39 glowing lamp
NesPrgRom:1c40d-1c40e::3a statue of gold
NesPrgRom:1c40f-1c410::3b love pendant
NesPrgRom:1c411-1c412::3c kirisa plant
NesPrgRom:1c413-1c414::3d ivory statue
NesPrgRom:1c415-1c416::3e bow of moon
NesPrgRom:1c417-1c418::3f bow of sun
NesPrgRom:1c419-1c41a::40 bow of truth
NesPrgRom:1c439:ItemUseJump_3b:; Don't give kensu the love pendant when he wants the alarm flute.
NesPrgRom:1c442:ItemUseJump_40:Bow of Sun
NesPrgRom:1c450:ItemUseJump_26_Rts:
NesPrgRom:1c451:ItemUseJump_3e:
NesPrgRom:1c45c:ItemUseJump_InvalidRelay:
NesPrgRom:1c45f:ItemUseJump_32:
NesPrgRom:1c469:CheckBowUsage:
NesPrgRom:1c478::$1c489
NesPrgRom:1c47f::$1c489
NesPrgRom:1c486::$1c489
NesPrgRom:1c48c::$1c475
NesPrgRom:1c491:ItemUseJump_GiveItem:; Called for items that are given to an NPC
NesPrgRom:1c497:ItemUse_CheckRequiredNPC:; Compares the 560 byte of the currently-facing NPC against the first\\n; byte of the ItemUseData table.  If they're equal, check $540,x\\n; against the second, returning the result in the Z flag (Z = match)\\n; -- the second byte is the type (1 for NPC, 2 for trigger)
NesPrgRom:1c4a0::$1c4a8
NesPrgRom:1c4a9:ItemUseJump_AlarmFlute:
NesPrgRom:1c4ac::$1c4af
NesPrgRom:1c4b1::uncond
NesPrgRom:1c4b3:ItemUseJump_InsectFlute:
NesPrgRom:1c4d0:ItemUseJump_StatueOfGold:
NesPrgRom:1c4d7::Clear the already loaded flag, too.
NesPrgRom:1c4db:ItemUseJump_Invalid:
NesPrgRom:1c4e0:ItemUseJump_MedicalHerb:; Check for dolphin and bail out from healing (flag set later when\\n; ItemUse calls $1c112).
NesPrgRom:1c4e3::$1c4e6
NesPrgRom:1c4ee::$1c4f2
NesPrgRom:1c4f0::don't overflow -> clamp to #$ff
NesPrgRom:1c4f5::$1c4fa
NesPrgRom:1c4f7::also clamp to MaxHP
NesPrgRom:1c507:ItemUseJump_FruitOfPower:
NesPrgRom:1c50d::$1c511
NesPrgRom:1c514::$1c519
NesPrgRom:1c51d:ItemUseJump_MagicRing:
NesPrgRom:1c524:ItemUseJump_Antidote:
NesPrgRom:1c52d::uncond
NesPrgRom:1c52f:ItemUseJump_LysisPlant:
NesPrgRom:1c538::uncond
NesPrgRom:1c53a:ItemUseJump_FruitOfLime:
NesPrgRom:1c548::uncond
NesPrgRom:1c54a:ItemUseJump_FruitOfRepun:
NesPrgRom:1c553:ItemUse_RecoverStatus:
NesPrgRom:1c564:ItemUseJump_24_Rts:
NesPrgRom:1c565:ItemUseJump_StatueOfOnyx:
NesPrgRom:1c568::jmp ItemUseJump_Invalid
NesPrgRom:1c56b:ItemUseJump_ShellFlute:; ----
NesPrgRom:1c56f::$1c57c
NesPrgRom:1c573::$1c57c
NesPrgRom:1c577::$1c57c
NesPrgRom:1c57f::$1c584
NesPrgRom:1c585:ItemUseJump_39:; Look for broken statue in inventory\\n; NOTE the game loops through 3x as much inventory as necessary\\n; because something later expects X to offset $643f, not $6450???
NesPrgRom:1c58c::$1c594
NesPrgRom:1c58f::$1c587
NesPrgRom:1c59e:ItemUseJump_FluteOfLime:
NesPrgRom:1c5a1::$1c5a4
NesPrgRom:1c5a9::$1c5ac
NesPrgRom:1c5b1::$1c5b4
NesPrgRom:1c5b9::$1c5bc
NesPrgRom:1c5bf:_1c5bf:; may have been called by $3e38d\\n; Check whether the given chest should load.\\n; Returns zero in $20 if it should not load.\\nassume no spawn until proven otherwise
NesPrgRom:1c5c8::; NOTE $24 is read by $1c148, called via $1c135
NesPrgRom:1c5d5::$1c5da
NesPrgRom:1c5d7::yes spawn
NesPrgRom:1c5dc::$1c5d2 try the next condition (never fires)
NesPrgRom:1c5df::;; --------------------------------
NesPrgRom:1c5e0-1c5e1:NpcSpawnConditionTable:00 portoa pink man on fortune teller island; sahara orange man left
NesPrgRom:1c5e2-1c5e3::01 sahara grey bearded man by well, brynmaer barkeep
NesPrgRom:1c5e4-1c5e5::02 portoa light blue lower left walker, brynmaer tavern top left
NesPrgRom:1c5e6-1c5e7::03 portoa pink stationary lower left man; sahara grey man mid-right
NesPrgRom:1c5e8-1c5e9::04 woman in dress at front of amazones, sahara; portoa lady in waiting right
NesPrgRom:1c5ea-1c5eb::05 headband lady at right of amazones, portoa welcome
NesPrgRom:1c5ec-1c5ed::06 portoa pink dress lady below castle bridge; sahara grey dress lady right
NesPrgRom:1c5ee-1c5ef::07 portoa barracks guard top
NesPrgRom:1c5f0-1c5f1::08 blue man at front of brynmaer, red man top of nadare
NesPrgRom:1c5f2-1c5f3::09 zombietown man on left
NesPrgRom:1c5f4-1c5f5::0a zombietown woman on right
NesPrgRom:1c5f6-1c5f7::0b goa soldier
NesPrgRom:1c5f8-1c5f9::0c swan soldier
NesPrgRom:1c5fa-1c5fb::0d leaf elder
NesPrgRom:1c5fc-1c5fd::0e startled green man inside leaf (cf. $65)
NesPrgRom:1c5fe-1c5ff::0f red man at top of leaf
NesPrgRom:1c600-1c601::10 red woman outside leaf shops
NesPrgRom:1c602-1c603::11 leaf elder's daughter
NesPrgRom:1c604-1c605::12 red girl in leaf
NesPrgRom:1c606-1c607::13 leaf rabbit
NesPrgRom:1c608-1c609::14 windmill guard, zebu's student
NesPrgRom:1c60a-1c60b::15 sleeping windmill guard
NesPrgRom:1c60c-1c60d::16 akahana
NesPrgRom:1c60e-1c60f::17 red bearded man beneath brynmaer inn
NesPrgRom:1c610-1c611::18 blue woman beneath brynmaer armor shop
NesPrgRom:1c612-1c613::19 red cloaked man beneath brynmaer pawn
NesPrgRom:1c614-1c615::1a blue woman at far end of brynmaer
NesPrgRom:1c616-1c617::1b blue treasure hunter in brynmaer tavern
NesPrgRom:1c618-1c619::1c yellow treasure hunter in brynmaer tavern
NesPrgRom:1c61a-1c61b::1d oak elder
NesPrgRom:1c61c-1c61d::1e oak mother
NesPrgRom:1c61e-1c61f::1f dwarf child in swamp
NesPrgRom:1c620-1c621::20 oak inn guard (post-telepathy)
NesPrgRom:1c622-1c623::21 oak tool shop guard (post-telepathy)
NesPrgRom:1c624-1c625::22 oak top-right dwarf
NesPrgRom:1c626-1c627::23 aryllis (amazones queen)
NesPrgRom:1c628-1c629::24 long-haired woman at left of amazones
NesPrgRom:1c62a-1c62b::25 amazones guard
NesPrgRom:1c62c-1c62d::26 aryllis right attendant
NesPrgRom:1c62e-1c62f::27 aryllis left attendant
NesPrgRom:1c630-1c631::28 nadare
NesPrgRom:1c632-1c633::29 nadare back room red woman (right)
NesPrgRom:1c634-1c635::2a green bearded man bottom-left nadare
NesPrgRom:1c636-1c637::2b nadare back room gray man (left)
NesPrgRom:1c638-1c639::2c dying man at foot of mt sabre north
NesPrgRom:1c63a-1c63b::2d mt sabre guard soldiers (both)
NesPrgRom:1c63c-1c63d::2e leaf shopkeeper ?
NesPrgRom:1c63e-1c63f::2f leaf shopkeeper ?
NesPrgRom:1c640-1c641::30 leaf shopkeeper ?
NesPrgRom:1c642-1c643::31 UNUSED
NesPrgRom:1c644-1c645::32 portoa barracks guard right
NesPrgRom:1c646-1c647::33 portoa throne room back door guard
NesPrgRom:1c648-1c649::34 portoa palace guard (throme room front)
NesPrgRom:1c64a-1c64b::35 portoa barracks evans
NesPrgRom:1c64c-1c64d::36 portoa pink lady in waiting at table left
NesPrgRom:1c64e-1c64f::37 portoa red lady in waiting at table top
NesPrgRom:1c650-1c651::38 portoa queen
NesPrgRom:1c652-1c653::39 fortune teller
NesPrgRom:1c654-1c655::3a de-stoned people in waterfall cave
NesPrgRom:1c656-1c657::3b UNUSED
NesPrgRom:1c658-1c659::3c UNUSED
NesPrgRom:1c65a-1c65b::3d joel elder
NesPrgRom:1c65c-1c65d::3e joel brown lady left of elder
NesPrgRom:1c65e-1c65f::3f joel blue lady right of elder
NesPrgRom:1c660-1c661::40 joel welcome
NesPrgRom:1c662-1c663::41 joel top-right bearded green man
NesPrgRom:1c664-1c665::42 joel top-left watchman
NesPrgRom:1c666-1c667::43 joel bottom-right red woman
NesPrgRom:1c668-1c669::44 clark
NesPrgRom:1c66a-1c66b::45 zombietown human top
NesPrgRom:1c66c-1c66d::46 zombietown human bottom
NesPrgRom:1c66e-1c66f::47 zombietown child in clark house
NesPrgRom:1c670-1c671::48 swan blue bearded man outside armor shop
NesPrgRom:1c672-1c673::49 swan barkeep
NesPrgRom:1c674-1c675::4a swan tavern soldiers
NesPrgRom:1c676-1c677::4b swan dancing ladies
NesPrgRom:1c678-1c679::4c swan dance instructor
NesPrgRom:1c67a-1c67b::4d swan dancing man
NesPrgRom:1c67c-1c67d::4e shyron guards
NesPrgRom:1c67e-1c67f::4f shyron welcome
NesPrgRom:1c680-1c681::50 shyron red man middle
NesPrgRom:1c682-1c683::51 shyron training men
NesPrgRom:1c684-1c685::52 stom's girlfriend
NesPrgRom:1c686-1c687::53 shyron sick men
NesPrgRom:1c688-1c689::54 akahana friend
NesPrgRom:1c68a-1c68b::55 goa cloaked man right
NesPrgRom:1c68c-1c68d::56 goa pink blouse lady middle
NesPrgRom:1c68e-1c68f::57 goa tavern lady
NesPrgRom:1c690-1c691::58 goa barkeep
NesPrgRom:1c692-1c693::59 sahara generic bunny
NesPrgRom:1c694-1c695::5a deo
NesPrgRom:1c696-1c697::5b sahara elder
NesPrgRom:1c698-1c699::5c sahara elder's daughter
NesPrgRom:1c69a-1c69b::5d shyron generic dead person
NesPrgRom:1c69c-1c69d::5e zebu
NesPrgRom:1c69e-1c69f::5f tornel
NesPrgRom:1c6a0-1c6a1::60 stom
NesPrgRom:1c6a2-1c6a3::61 mesia in shrine
NesPrgRom:1c6a4-1c6a5::62 asina
NesPrgRom:1c6a6-1c6a7::63 hurt dolphin
NesPrgRom:1c6a8-1c6a9::64 portoa fisherman
NesPrgRom:1c6aa-1c6ab::65 startled green man outside leaf cave
NesPrgRom:1c6ac-1c6ad::66 UNUSED
NesPrgRom:1c6ae-1c6af::67 UNUSED
NesPrgRom:1c6b0-1c6b1::68 kensu (in cabin)
NesPrgRom:1c6b2-1c6b3::69 dolphin
NesPrgRom:1c6b4-1c6b5::6a UNUSED
NesPrgRom:1c6b6-1c6b7::6b kensu (asleep in lighthouse)
NesPrgRom:1c6b8-1c6b9::6c kensu in swan dance hall
NesPrgRom:1c6ba-1c6bb::6d kensu soldier
NesPrgRom:1c6bc-1c6bd::6e azteca in shyron temple
NesPrgRom:1c6be-1c6bf::6f swan blue cloaked man outside hut
NesPrgRom:1c6c0-1c6c1::70 dead akahana
NesPrgRom:1c6c2-1c6c3::71 dead stom's girlfriend
NesPrgRom:1c6c4-1c6c5::72 dead stom
NesPrgRom:1c6c6-1c6c7::73 UNUSED
NesPrgRom:1c6c8-1c6c9::74 kensu ???
NesPrgRom:1c6ca-1c6cb::75 kensu slime
NesPrgRom:1c6cc-1c6cd::76 dead shyron guard
NesPrgRom:1c6ce-1c6cf::77 swan yellow man right
NesPrgRom:1c6d0-1c6d1::78 goa pink welcomer
NesPrgRom:1c6d2-1c6d3::79 swan yellow woman left
NesPrgRom:1c6d4-1c6d5::7a goa pink dress lady near house
NesPrgRom:1c6d6-1c6d7::7b portoa fisherman's daughter
NesPrgRom:1c6d8-1c6d9::7c oak inn guard (pre-telepathy)
NesPrgRom:1c6da-1c6db::7d oak tool shop guard (pre-telepathy)
NesPrgRom:1c6dc-1c6dd::7e kensu ??? lighthouse/tavern/dance
NesPrgRom:1c6de-1c6df::7f zombie in zombietown
NesPrgRom:1c6e0-1c6e1:NpcSpawnConditionTablePart2:80 goa shop guards (stationary)
NesPrgRom:1c6e2-1c6e3::81 goa shop guards (moving)
NesPrgRom:1c6e4-1c6e5::82 UNUSED
NesPrgRom:1c6e6-1c6e7::83 azteca temple front
NesPrgRom:1c6e8-1c6e9::84 sabera posing as mesia
NesPrgRom:1c6ea-1c6eb::85 stoned pair in waterfall cave
NesPrgRom:1c6ec-1c6ed::86 UNUSED
NesPrgRom:1c6ee-1c6ef::87 UNUSED
NesPrgRom:1c6f0-1c6f1::88 stoned akahana
NesPrgRom:1c6f2-1c6f3::89 UNUSED -- REPURPOSED in preshuffle.s
NesPrgRom:1c6f4-1c6f5::8a UNUSED          |
NesPrgRom:1c6f6-1c6f7::8b UNUSED      |
NesPrgRom:1c6f8-1c6f9::8c UNUSED          |
NesPrgRom:1c6fa-1c6fb::8d UNUSED _________v_________
NesPrgRom:1c6fc-1c6fd::8e mesia
NesPrgRom:1c6fe-1c6ff::8f
NesPrgRom:1c700-1c701::90
NesPrgRom:1c702-1c703::91
NesPrgRom:1c704-1c705::92
NesPrgRom:1c706-1c707::93
NesPrgRom:1c708-1c709::94
NesPrgRom:1c70a-1c70b::95
NesPrgRom:1c70c-1c70d::96
NesPrgRom:1c70e-1c70f::97
NesPrgRom:1c710-1c711::98
NesPrgRom:1c712-1c713::99
NesPrgRom:1c714-1c715::9a
NesPrgRom:1c716-1c717::9b
NesPrgRom:1c718-1c719::9c
NesPrgRom:1c71a-1c71b::9d
NesPrgRom:1c71c-1c71d::9e
NesPrgRom:1c71e-1c71f::9f
NesPrgRom:1c720-1c721::a0
NesPrgRom:1c722-1c723::a1
NesPrgRom:1c724-1c725::a2
NesPrgRom:1c726-1c727::a3
NesPrgRom:1c728-1c729::a4
NesPrgRom:1c72a-1c72b::a5
NesPrgRom:1c72c-1c72d::a6
NesPrgRom:1c72e-1c72f::a7
NesPrgRom:1c730-1c731::a8
NesPrgRom:1c732-1c733::a9
NesPrgRom:1c734-1c735::aa
NesPrgRom:1c736-1c737::ab
NesPrgRom:1c738-1c739::ac
NesPrgRom:1c73a-1c73b::ad
NesPrgRom:1c73c-1c73d::ae
NesPrgRom:1c73e-1c73f::af
NesPrgRom:1c740-1c741::b0
NesPrgRom:1c742-1c743::b1
NesPrgRom:1c744-1c745::b2
NesPrgRom:1c746-1c747::b3
NesPrgRom:1c748-1c749::b4
NesPrgRom:1c74a-1c74b::b5
NesPrgRom:1c74c-1c74d::b6
NesPrgRom:1c74e-1c74f::b7
NesPrgRom:1c750-1c751::b8
NesPrgRom:1c752-1c753::b9
NesPrgRom:1c754-1c755::ba
NesPrgRom:1c756-1c757::bb
NesPrgRom:1c758-1c759::bc
NesPrgRom:1c75a-1c75b::bd
NesPrgRom:1c75c-1c75d::be
NesPrgRom:1c75e-1c75f::bf
NesPrgRom:1c760-1c761::c0 vampire 1
NesPrgRom:1c762-1c763::c1 insect
NesPrgRom:1c764-1c765::c2 kelbesque 1
NesPrgRom:1c766-1c767::c3 rage
NesPrgRom:1c768-1c769::c4 mado 1
NesPrgRom:1c76a-1c76b::c5 sabera 1
NesPrgRom:1c76c-1c76d::c6 sabera 2
NesPrgRom:1c76e-1c76f::c7 mado 2
NesPrgRom:1c770-1c771::c8 karmine
NesPrgRom:1c772-1c773::c9 statue of moon
NesPrgRom:1c774-1c775::ca statue of sun
NesPrgRom:1c776-1c777::cb draygon 1 and 2
NesPrgRom:1c778-1c779::cc vampire 2
NesPrgRom:1c77a-1c77b::; NOTE The last three entries have been REMOVED in the rando\\ncd  -- note no flag for draygon 2
NesPrgRom:1c77c-1c77d::ce
NesPrgRom:1c77e-1c77f::cf
NesPrgRom:1c780:NpcSpawnCondition_Always:
NesPrgRom:1c781:NpcSpawnCondition_3b:Mezame Shrine
NesPrgRom:1c782-1c783::000 unused
NesPrgRom:1c785:NpcSpawnCondition_80:Goa
NesPrgRom:1c786-1c787::026 NOT entered shyron
NesPrgRom:1c789:NpcSpawnCondition_81:Goa
NesPrgRom:1c78a-1c78b::026 entered shyron
NesPrgRom:1c78c-1c78d::024 NOT
NesPrgRom:1c78f:NpcSpawnCondition_7f:Zombie Town
NesPrgRom:1c790-1c791::013 NOT sabera defeated
NesPrgRom:1c793::; UNUSED\\nAmazones
NesPrgRom:1c794-1c795::099 NOT amazones guard paralyzed
NesPrgRom:1c79b:NpcSpawnCondition_64:Portoa - Fisherman House
NesPrgRom:1c79c-1c79d::08b got shell flute
NesPrgRom:1c79f:NpcSpawnCondition_09:Zombie Town
NesPrgRom:1c7a0-1c7a1::013 sabera defeated
NesPrgRom:1c7a3:NpcSpawnCondition_47:Zombie Town - House
NesPrgRom:1c7a4-1c7a5::013 sabera defeated
NesPrgRom:1c7a7:NpcSpawnCondition_0c:Swan - Tavern
NesPrgRom:1c7a8-1c7a9::024 NOT
NesPrgRom:1c7aa::Swan
NesPrgRom:1c7ab-1c7ac::024 NOT
NesPrgRom:1c7ae:NpcSpawnCondition_0b:Goa - Tavern
NesPrgRom:1c7af-1c7b0::024 NOT
NesPrgRom:1c7b1::Goa
NesPrgRom:1c7b2-1c7b3::024 NOT
NesPrgRom:1c7b5:NpcSpawnCondition_4a:Swan - Tavern
NesPrgRom:1c7b6-1c7b7::024 NOT
NesPrgRom:1c7b9:NpcSpawnCondition_8a:
NesPrgRom:1c7ba:NpcSpawnCondition_0d:Leaf - Elder House
NesPrgRom:1c7bb-1c7bc::085 NOT leaf elder currently abducted
NesPrgRom:1c7bd::Mt Sabre North - Summit Cave
NesPrgRom:1c7be-1c7bf::085 leaf elder currently abducted
NesPrgRom:1c7c1:NpcSpawnCondition_11:Leaf - Elder House
NesPrgRom:1c7c2-1c7c3::084 NOT leaf villagers currently abducted
NesPrgRom:1c7c4::Mt Sabre North - Right Cell
NesPrgRom:1c7c5-1c7c6::084 leaf villagers currently abducted
NesPrgRom:1c7c8:NpcSpawnCondition_0e:Leaf
NesPrgRom:1c7c9-1c7ca::084 NOT leaf villagers currently abducted
NesPrgRom:1c7cb::Mt Sabre North - Right Cell
NesPrgRom:1c7cc-1c7cd::084 leaf villagers currently abducted
NesPrgRom:1c7cf:NpcSpawnCondition_14:Leaf - Student House
NesPrgRom:1c7d0-1c7d1::03a NOT talked to zebu in cave
NesPrgRom:1c7d2::Windmill Cave
NesPrgRom:1c7d3-1c7d4::00f woke windmill guard
NesPrgRom:1c7d5-1c7d6::038 NOT leaf abducted
NesPrgRom:1c7d8:NpcSpawnCondition_15:Windmill Cave
NesPrgRom:1c7d9-1c7da::03a talked to zebu in cave
NesPrgRom:1c7db-1c7dc::00f NOT woke windmill guard
NesPrgRom:1c7de:NpcSpawnCondition_16:Brynmaer
NesPrgRom:1c7df-1c7e0::050 NOT given statue to akahana
NesPrgRom:1c7e1::Waterfall Cave 4
NesPrgRom:1c7e2-1c7e3::051 NOT learned barrier
NesPrgRom:1c7e4-1c7e5::035 cured akahana
NesPrgRom:1c7e6-1c7e7::034 NOT akahana left waterfall cave
NesPrgRom:1c7e8::Shyron
NesPrgRom:1c7e9-1c7ea::027 NOT shyron massacre
NesPrgRom:1c7ec:NpcSpawnCondition_88:Waterfall Cave 4
NesPrgRom:1c7ed-1c7ee::035 NOT cured akahana
NesPrgRom:1c7ef-1c7f0::051 NOT learned barrier
NesPrgRom:1c7f2:NpcSpawnCondition_1b:Brynmaer - Tavern
NesPrgRom:1c7f3-1c7f4::048 NOT
NesPrgRom:1c7f6:NpcSpawnCondition_1f:Oak - Mother House
NesPrgRom:1c7f7-1c7f8::045
NesPrgRom:1c7f9::Swamp
NesPrgRom:1c7fa-1c7fb::052 talked to dwarf mother
NesPrgRom:1c7fc-1c7fd::053 NOT followed by child
NesPrgRom:1c7fe-1c7ff::045 NOT rescued child
NesPrgRom:1c801:NpcSpawnCondition_2c:Mt Sabre North - Main
NesPrgRom:1c802-1c803::066 NOT
NesPrgRom:1c804-1c805::048
NesPrgRom:1c806-1c807::012 NOT
NesPrgRom:1c809:NpcSpawnCondition_2d:Mt Sabre North - Main
NesPrgRom:1c80a-1c80b::05b NOT mt sabre guards gone
NesPrgRom:1c80c::Swan - Gate
NesPrgRom:1c80d-1c80e::08c NOT swan guards disappeared
NesPrgRom:1c810:NpcSpawnCondition_2e:Mt Sabre North - Left Cell
NesPrgRom:1c811-1c812::084 leaf villagers currently abducted
NesPrgRom:1c814:NpcSpawnCondition_33:Portoa - Palace Throne Room
NesPrgRom:1c815-1c816::020 NOT queen not in throne room
NesPrgRom:1c817::Portoa - Palace Left
NesPrgRom:1c818-1c819::020 queen not in throne room
NesPrgRom:1c81b:NpcSpawnCondition_38:Portoa - Palace Throne Room
NesPrgRom:1c81c-1c81d::020 NOT queen not in throne room
NesPrgRom:1c81e-1c81f::01f NOT got ball of water
NesPrgRom:1c820::Portoa - Asina Room
NesPrgRom:1c821-1c822::01f got ball of water
NesPrgRom:1c823-1c824::01e NOT queen revealed as asina
NesPrgRom:1c826:NpcSpawnCondition_39:Portoa - Fortune Teller
NesPrgRom:1c827-1c828::020 queen not in throne room
NesPrgRom:1c829-1c82a::01f NOT got ball of water
NesPrgRom:1c82c:NpcSpawnCondition_87:Waterfall Cave 1
NesPrgRom:1c82d-1c82e::06b NOT
NesPrgRom:1c830:NpcSpawnCondition_3c:Waterfall Cave 1
NesPrgRom:1c831-1c832::06b
NesPrgRom:1c833-1c834::091 NOT
NesPrgRom:1c836:NpcSpawnCondition_85:Waterfall Cave 2
NesPrgRom:1c837-1c838::06a NOT stoned people cured ?
NesPrgRom:1c83a:NpcSpawnCondition_3a:Waterfall Cave 2
NesPrgRom:1c83b-1c83c::06a stoned people cured ?
NesPrgRom:1c83d-1c83e::090 NOT stoned people gone
NesPrgRom:1c840:NpcSpawnCondition_44:Zombie Town - House Basement
NesPrgRom:1c841-1c842::08f NOT used statue of gold
NesPrgRom:1c843::Joel - Shed
NesPrgRom:1c844-1c845::08f use statue of gold
NesPrgRom:1c847:NpcSpawnCondition_4e:Shyron
NesPrgRom:1c848-1c849::027 NOT shyron massacre
NesPrgRom:1c84a::Mt Hydra - Outside Shyron
NesPrgRom:1c84b-1c84c::027 NOT shyron massacre
NesPrgRom:1c84d::Shyron - Training Hall
NesPrgRom:1c84e-1c84f::027 NOT shyron massacre
NesPrgRom:1c850::Shyron - Hospital
NesPrgRom:1c851-1c852::027 NOT shyron massacre
NesPrgRom:1c854::; UNUSED\\nMt Hydra - Outside Shyron
NesPrgRom:1c855-1c856::09f NOT
NesPrgRom:1c857-1c858::027 NOT shyron massacre
NesPrgRom:1c85a::Mt Hydra - Outside Shyron
NesPrgRom:1c85b-1c85c::09f
NesPrgRom:1c85d-1c85e::027 NOT shyron massacre
NesPrgRom:1c860:NpcSpawnCondition_76:Shyron
NesPrgRom:1c861-1c862::027 shyron massacre
NesPrgRom:1c863::Mt Hydra - Outside Shyron
NesPrgRom:1c864-1c865::027 shyron massacre
NesPrgRom:1c866-1c867::0e9 NOT
NesPrgRom:1c869:NpcSpawnCondition_5d:Shyron
NesPrgRom:1c86a-1c86b::027 shyron massacre
NesPrgRom:1c86c-1c86d::0e8 NOT
NesPrgRom:1c86f:NpcSpawnCondition_70:Shyron
NesPrgRom:1c870-1c871::027 shyron massacre
NesPrgRom:1c872-1c873::0e0 NOT spoken to dead akahana
NesPrgRom:1c875:NpcSpawnCondition_71:Shyron
NesPrgRom:1c876-1c877::027 shyron massacre
NesPrgRom:1c878-1c879::089 NOT spoken to dead stom's girlfriend
NesPrgRom:1c87b:NpcSpawnCondition_72:Shyron
NesPrgRom:1c87c-1c87d::027 shyron massacre
NesPrgRom:1c87e-1c87f::08a NOT spoken to dead stom
NesPrgRom:1c881:NpcSpawnCondition_5e:Zebu Cave
NesPrgRom:1c882-1c883::0a5 talked to zebu student
NesPrgRom:1c884-1c885::00b talked to leaf elder
NesPrgRom:1c886-1c887::051 NOT learned barrier
NesPrgRom:1c888::Shyron - Temple
NesPrgRom:1c889-1c88a::027 NOT shyron massacre
NesPrgRom:1c88b::Goa Fortress - Zebu
NesPrgRom:1c88c-1c88d::055 NOT zebu rescued
NesPrgRom:1c88e::Pyramid Back - Draygon Revisited
NesPrgRom:1c88f-1c890::05e
NesPrgRom:1c892:NpcSpawnCondition_5f:Stom House
NesPrgRom:1c893-1c894::2f7 warpoak
NesPrgRom:1c895-1c896::00e NOT learned telepathy
NesPrgRom:1c897::Mt Sabre West - Upper
NesPrgRom:1c898-1c899::051 NOT learned barrier
NesPrgRom:1c89a::Shyron - Training Hall
NesPrgRom:1c89b-1c89c::05f NOT chest03sword of thunder
NesPrgRom:1c89d-1c89e::027 NOT shyron massacre
NesPrgRom:1c89f::Shyron - Temple
NesPrgRom:1c8a0-1c8a1::05f chest03sword of thunder
NesPrgRom:1c8a2-1c8a3::027 NOT shyron massacre
NesPrgRom:1c8a4::Goa Fortress - Tornel
NesPrgRom:1c8a5-1c8a6::056 NOT tornel rescued
NesPrgRom:1c8a7::Pyramid Back - Draygon Revisited
NesPrgRom:1c8a8-1c8a9::05e
NesPrgRom:1c8ab:NpcSpawnCondition_60:Stom House
NesPrgRom:1c8ac-1c8ad::051 NOT learned barrier
NesPrgRom:1c8ae::Swan - Stom Hut
NesPrgRom:1c8af-1c8b0::061 NOT talked to stom in swan hut
NesPrgRom:1c8b1::Shyron
NesPrgRom:1c8b2-1c8b3::027 NOT shyron massacre
NesPrgRom:1c8b5:NpcSpawnCondition_62:Portoa - Asina Room
NesPrgRom:1c8b6-1c8b7::01e queen revealed as asina
NesPrgRom:1c8b8-1c8b9::08f NOT defeated sabera 1 ???
NesPrgRom:1c8ba::Shyron - Hospital
NesPrgRom:1c8bb-1c8bc::05f NOT chest03sword of thunder
NesPrgRom:1c8bd-1c8be::027 NOT shyron massacre
NesPrgRom:1c8bf::Shyron - Temple
NesPrgRom:1c8c0-1c8c1::05f chest03sword of thunder
NesPrgRom:1c8c2-1c8c3::027 NOT shyron massacre
NesPrgRom:1c8c4::Goa Fortress - Asina
NesPrgRom:1c8c5-1c8c6::057 NOT asina rescued
NesPrgRom:1c8c7::Pyramid Back - Draygon Revisited
NesPrgRom:1c8c8-1c8c9::05e
NesPrgRom:1c8cb:NpcSpawnCondition_74:Joel - Lighthouse
NesPrgRom:1c8cc-1c8cd::0a4 woke kensu
NesPrgRom:1c8ce-1c8cf::075 NOT talked to kensu in lighthouse
NesPrgRom:1c8d0::Swan - Tavern
NesPrgRom:1c8d1-1c8d2::072 found kensu in tavern
NesPrgRom:1c8d3-1c8d4::0da NOT kensu gone from tavern
NesPrgRom:1c8d5::Swan - Dance Hall
NesPrgRom:1c8d6-1c8d7::03e finished chasing kensu
NesPrgRom:1c8d8-1c8d9::063 NOT learned change
NesPrgRom:1c8da::Goa Fortress - Kensu
NesPrgRom:1c8db-1c8dc::065 cured kensu
NesPrgRom:1c8dd-1c8de::0d8 NOT kensu rescued
NesPrgRom:1c8e0:NpcSpawnCondition_63:Underground Channel
NesPrgRom:1c8e1-1c8e2::025 NOT healed dolphin
NesPrgRom:1c8e3-1c8e4::01e queen revealed as asina
NesPrgRom:1c8e6:NpcSpawnCondition_65:Leaf - Outside Start
NesPrgRom:1c8e7-1c8e8::073 NOT
NesPrgRom:1c8ea:NpcSpawnCondition_6a:Sabera Palace 3
NesPrgRom:1c8eb-1c8ec::013 NOT sabera defeated
NesPrgRom:1c8ee:NpcSpawnCondition_6e:Shyron - Temple
NesPrgRom:1c8ef-1c8f0::05f chest03sword of thunder
NesPrgRom:1c8f1-1c8f2::02d NOT talked with wise men in shyron
NesPrgRom:1c8f4:NpcSpawnCondition_73:Pyramid Back - Draygon Revisited
NesPrgRom:1c8f5-1c8f6::05e
NesPrgRom:1c8f8:NpcSpawnCondition_68:Cabin
NesPrgRom:1c8f9-1c8fa::2fb NOT warpjoel
NesPrgRom:1c8fc:NpcSpawnCondition_6b:Joel - Lighthouse
NesPrgRom:1c8fd-1c8fe::0a4 NOT woke kensu
NesPrgRom:1c900:NpcSpawnCondition_6d:Swan - Tavern
NesPrgRom:1c901-1c902::061 talked to stom in swan hut
NesPrgRom:1c903-1c904::072 NOT found kensu in tavern
NesPrgRom:1c905::Goa
NesPrgRom:1c906-1c907::027 NOT shyron massacre
NesPrgRom:1c909:NpcSpawnCondition_6c:Swan - Dance Hall
NesPrgRom:1c90a-1c90b::072 found kensu in tavern
NesPrgRom:1c90c-1c90d::03e NOT finished chasing kensu
NesPrgRom:1c90f:NpcSpawnCondition_75:Goa Fortress - Kensu
NesPrgRom:1c910-1c911::065 NOT cured kensu
NesPrgRom:1c913:NpcSpawnCondition_83:Pyramid Front - Entrance
NesPrgRom:1c914-1c915::06c defeated draygon 1
NesPrgRom:1c916-1c917::079 NOT chest40bow of truth
NesPrgRom:1c919:NpcSpawnCondition_84:Sabera Palace 3
NesPrgRom:1c91a-1c91b::013 NOT sabera defeated
NesPrgRom:1c91d:NpcSpawnCondition_8e:Sabera Palace 3
NesPrgRom:1c91e-1c91f::013 NOT sabera defeated
NesPrgRom:1c920::fall-through always spawn in tower
NesPrgRom:1c921:NpcSpawnCondition_20:Oak
NesPrgRom:1c922-1c923::045 rescued child
NesPrgRom:1c925:NpcSpawnCondition_7c:Oak
NesPrgRom:1c926-1c927::045 NOT rescued child
NesPrgRom:1c929:NpcSpawnCondition_c0:Sealed Cave 7
NesPrgRom:1c92a-1c92b::100 NOT defeated vampire 1
NesPrgRom:1c92d:NpcSpawnCondition_c1:Swamp
NesPrgRom:1c92e-1c92f::101 NOT defeated insect
NesPrgRom:1c931:NpcSpawnCondition_c2:Mt Sabre North - Main
NesPrgRom:1c932-1c933::102 NOT defeated kelbesque 1
NesPrgRom:1c935:NpcSpawnCondition_c3:Lime Tree Lake
NesPrgRom:1c936-1c937::103 NOT got item from rage
NesPrgRom:1c939:NpcSpawnCondition_c4:; Note 104 is always false so mado always spawns, it's just that\\n; the trigger to turn him on doesn't fire if 067 is set.\\nShyron - Temple
NesPrgRom:1c93a-1c93b::104 NOT defeated mado 1 -- UNUSED
NesPrgRom:1c93d:NpcSpawnCondition_c5:Goa Fortress - Kelbesque
NesPrgRom:1c93e-1c93f::105 NOT defeated kelbesque 2
NesPrgRom:1c941:NpcSpawnCondition_c6:Goa Fortress - Tornel
NesPrgRom:1c942-1c943::106 NOT defeated sabera 2
NesPrgRom:1c945:NpcSpawnCondition_c7:Goa Fortress - Asina
NesPrgRom:1c946-1c947::107 NOT defeated mado 2
NesPrgRom:1c949:NpcSpawnCondition_c8:Goa Fortress - Karmine 7
NesPrgRom:1c94a-1c94b::108 NOT defeated karmine
NesPrgRom:1c94d:NpcSpawnCondition_c9:Pyramid Back - Entrance
NesPrgRom:1c94e-1c94f::109 NOT defeated statue of moon
NesPrgRom:1c951:NpcSpawnCondition_ca:Pyramid Back - Entrance
NesPrgRom:1c952-1c953::10a NOT defeated statue of sun
NesPrgRom:1c955:NpcSpawnCondition_cb:Pyramid Front - Draygon
NesPrgRom:1c956-1c957::10b NOT defeated draygon 1
NesPrgRom:1c959:NpcSpawnCondition_cc:Sabera Palace 1
NesPrgRom:1c95a-1c95b::10c NOT defeated vampire 2
NesPrgRom:1c95d-1c95e:NpcDialogTable:00 portoa pink man on fortune teller island; sahara orange man left
NesPrgRom:1c95f-1c960::01 sahara grey bearded man by well, brynmaer barkeep
NesPrgRom:1c961-1c962::02 portoa light blue lower left walker, brynmaer tavern top left
NesPrgRom:1c963-1c964::03 portoa pink stationary lower left man; sahara grey man mid-right
NesPrgRom:1c965-1c966::04 woman in dress at front of amazones, sahara; portoa lady in waiting right
NesPrgRom:1c967-1c968::05 headband lady at right of amazones, portoa welcome
NesPrgRom:1c969-1c96a::06 portoa pink dress lady below castle bridge; sahara grey dress lady right
NesPrgRom:1c96b-1c96c::07 portoa barracks guard top
NesPrgRom:1c96d-1c96e::08 blue man at front of brynmaer, red man top of nadare
NesPrgRom:1c96f-1c970::09 zombietown man on left
NesPrgRom:1c971-1c972::0a zombietown woman on right
NesPrgRom:1c973-1c974::0b goa soldier
NesPrgRom:1c975-1c976::0c swan soldier
NesPrgRom:1c977-1c978::0d leaf elder
NesPrgRom:1c979-1c97a::0e startled green man inside leaf (cf. $65)
NesPrgRom:1c97b-1c97c::0f red man at top of leaf
NesPrgRom:1c97d-1c97e::10 red woman outside leaf shops
NesPrgRom:1c97f-1c980::11 leaf elder's daughter
NesPrgRom:1c981-1c982::12 red girl in leaf
NesPrgRom:1c983-1c984::13 leaf rabbit
NesPrgRom:1c985-1c986::14 windmill guard, zebu's student
NesPrgRom:1c987-1c988::15 sleeping windmill guard
NesPrgRom:1c989-1c98a::16 akahana
NesPrgRom:1c98b-1c98c::17 red bearded man beneath brynmaer inn
NesPrgRom:1c98d-1c98e::18 blue woman beneath brynmaer armor shop
NesPrgRom:1c98f-1c990::19 red cloaked man beneath brynmaer pawn
NesPrgRom:1c991-1c992::1a blue woman at far end of brynmaer
NesPrgRom:1c993-1c994::1b blue treasure hunter in brynmaer tavern
NesPrgRom:1c995-1c996::1c yellow treasure hunter in brynmaer tavern
NesPrgRom:1c997-1c998::1d oak elder
NesPrgRom:1c999-1c99a::1e oak mother
NesPrgRom:1c99b-1c99c::1f dwarf child in swamp
NesPrgRom:1c99d-1c99e::20 oak inn guard (post-telepathy)
NesPrgRom:1c99f-1c9a0::21 oak tool shop guard (post-telepathy)
NesPrgRom:1c9a1-1c9a2::22 oak top-right dwarf
NesPrgRom:1c9a3-1c9a4::23 aryllis
NesPrgRom:1c9a5-1c9a6::24 long-haired woman at left of amazones
NesPrgRom:1c9a7-1c9a8::25 amazones guard
NesPrgRom:1c9a9-1c9aa::26 aryllis right attendant
NesPrgRom:1c9ab-1c9ac::27 aryllis left attendant
NesPrgRom:1c9ad-1c9ae::28 nadare
NesPrgRom:1c9af-1c9b0::29 nadare back room red woman (right)
NesPrgRom:1c9b1-1c9b2::2a green bearded man bottom-left nadare
NesPrgRom:1c9b3-1c9b4::2b nadare back room gray man (left)
NesPrgRom:1c9b5-1c9b6::2c dying man at foot of mt sabre north
NesPrgRom:1c9b7-1c9b8::2d mt sabre guard soldiers (both)
NesPrgRom:1c9b9-1c9ba::2e leaf shopkeeper ?
NesPrgRom:1c9bb-1c9bc::2f leaf shopkeeper ?
NesPrgRom:1c9bd-1c9be::30 leaf shopkeeper ?
NesPrgRom:1c9bf-1c9c0::31 UNUSED
NesPrgRom:1c9c1-1c9c2::32 portoa barracks guard right
NesPrgRom:1c9c3-1c9c4::33 portoa throne room back door guard
NesPrgRom:1c9c5-1c9c6::34 portoa palace guard (throme room front)
NesPrgRom:1c9c7-1c9c8::35 portoa barracks evans
NesPrgRom:1c9c9-1c9ca::36 portoa pink lady in waiting at table left
NesPrgRom:1c9cb-1c9cc::37 portoa red lady in waiting at table top
NesPrgRom:1c9cd-1c9ce::38 portoa queen
NesPrgRom:1c9cf-1c9d0::39 fortune teller
NesPrgRom:1c9d1-1c9d2::3a de-stoned people in waterfall cave
NesPrgRom:1c9d3-1c9d4::3b UNUSED
NesPrgRom:1c9d5-1c9d6::3c UNUSED
NesPrgRom:1c9d7-1c9d8::3d joel elder
NesPrgRom:1c9d9-1c9da::3e joel brown lady left of elder
NesPrgRom:1c9db-1c9dc::3f joel blue lady right of elder
NesPrgRom:1c9dd-1c9de::40 joel welcome
NesPrgRom:1c9df-1c9e0::41 joel top-right bearded green man
NesPrgRom:1c9e1-1c9e2::42 joel top-left watchman
NesPrgRom:1c9e3-1c9e4::43 joel bottom-right red woman
NesPrgRom:1c9e5-1c9e6::44 clark
NesPrgRom:1c9e7-1c9e8::45 zombietown human top
NesPrgRom:1c9e9-1c9ea::46 zombietown human bottom
NesPrgRom:1c9eb-1c9ec::47 zombietown child in clark house
NesPrgRom:1c9ed-1c9ee::48 swan blue bearded man outside armor shop
NesPrgRom:1c9ef-1c9f0::49 swan barkeep
NesPrgRom:1c9f1-1c9f2::4a swan tavern soldiers
NesPrgRom:1c9f3-1c9f4::4b swan dancing ladies
NesPrgRom:1c9f5-1c9f6::4c swan dance instructor
NesPrgRom:1c9f7-1c9f8::4d swan dancing man
NesPrgRom:1c9f9-1c9fa::4e shyron guards
NesPrgRom:1c9fb-1c9fc::4f shyron welcome
NesPrgRom:1c9fd-1c9fe::50 shyron red man middle
NesPrgRom:1c9ff-1ca00::51 shyron training men
NesPrgRom:1ca01-1ca02::52 stom's girlfriend
NesPrgRom:1ca03-1ca04::53 shyron sick men
NesPrgRom:1ca05-1ca06::54 akahana friend
NesPrgRom:1ca07-1ca08::55 goa cloaked man right
NesPrgRom:1ca09-1ca0a::56 goa pink blouse lady middle
NesPrgRom:1ca0b-1ca0c::57 goa tavern lady
NesPrgRom:1ca0d-1ca0e::58 goa barkeep
NesPrgRom:1ca0f-1ca10::59 sahara generic bunny
NesPrgRom:1ca11-1ca12::5a deo
NesPrgRom:1ca13-1ca14::5b sahara elder
NesPrgRom:1ca15-1ca16::5c sahara elder's daughter
NesPrgRom:1ca17-1ca18::5d shyron generic dead person
NesPrgRom:1ca19-1ca1a::5e zebu
NesPrgRom:1ca1b-1ca1c::5f tornel
NesPrgRom:1ca1d-1ca1e::60 stom
NesPrgRom:1ca1f-1ca20::61 mesia in shrine
NesPrgRom:1ca21-1ca22::62 asina
NesPrgRom:1ca23-1ca24::63 hurt dolphin
NesPrgRom:1ca25-1ca26::64 portoa fisherman
NesPrgRom:1ca27-1ca28::65 startled green man outside leaf cave
NesPrgRom:1ca29-1ca2a::66 UNUSED
NesPrgRom:1ca2b-1ca2c::67 UNUSED
NesPrgRom:1ca2d-1ca2e::68 kensu (in cabin)
NesPrgRom:1ca2f-1ca30::69 dolphin
NesPrgRom:1ca31-1ca32::6a UNUSED
NesPrgRom:1ca33-1ca34::6b kensu (asleep in lighthouse)
NesPrgRom:1ca35-1ca36::6c kensu in swan dance hall
NesPrgRom:1ca37-1ca38::6d kensu soldier
NesPrgRom:1ca39-1ca3a::6e azteca in shyron temple
NesPrgRom:1ca3b-1ca3c::6f swan blue cloaked man outside hut
NesPrgRom:1ca3d-1ca3e::70 dead akahana
NesPrgRom:1ca3f-1ca40::71 dead stom's girlfriend
NesPrgRom:1ca41-1ca42::72 dead stom
NesPrgRom:1ca43-1ca44::73 UNUSED
NesPrgRom:1ca45-1ca46::74 kensu ???
NesPrgRom:1ca47-1ca48::75 kensu slime
NesPrgRom:1ca49-1ca4a::76 dead shyron guard
NesPrgRom:1ca4b-1ca4c::77 swan yellow man right
NesPrgRom:1ca4d-1ca4e::78 goa pink welcomer
NesPrgRom:1ca4f-1ca50::79 swan yellow woman left
NesPrgRom:1ca51-1ca52::7a goa pink dress lady near house
NesPrgRom:1ca53-1ca54::7b portoa fisherman's daughter
NesPrgRom:1ca55-1ca56::7c oak inn guard (pre-telepathy)
NesPrgRom:1ca57-1ca58::7d oak tool shop guard (pre-telepathy)
NesPrgRom:1ca59-1ca5a::7e kensu ??? lighthouse/tavern/dance
NesPrgRom:1ca5b-1ca5c::7f zombie in zombietown
NesPrgRom:1ca5d-1ca5e:NpcDialogTablePart2:80 goa shop guards (stationary)
NesPrgRom:1ca5f-1ca60::81 goa shop guards (moving)
NesPrgRom:1ca61-1ca62::82 UNUSED
NesPrgRom:1ca63-1ca64::83 azteca temple front
NesPrgRom:1ca65-1ca66::84 sabera posing as mesia
NesPrgRom:1ca67-1ca68::85 stoned pair in waterfall cave
NesPrgRom:1ca69-1ca6a::86 UNUSED
NesPrgRom:1ca6b-1ca6c::87 UNUSED
NesPrgRom:1ca6d-1ca6e::88 stoned akahana
NesPrgRom:1ca6f-1ca70::89 UNUSED
NesPrgRom:1ca71-1ca72::8a UNUSED
NesPrgRom:1ca73-1ca74::8b UNUSED
NesPrgRom:1ca75-1ca76::8c UNUSED
NesPrgRom:1ca77-1ca78::8d UNUSED
NesPrgRom:1ca79-1ca7a::8e mesia
NesPrgRom:1ca7b-1ca7c::8f
NesPrgRom:1ca7d-1ca7e::90
NesPrgRom:1ca7f-1ca80::91
NesPrgRom:1ca81-1ca82::92
NesPrgRom:1ca83-1ca84::93
NesPrgRom:1ca85-1ca86::94
NesPrgRom:1ca87-1ca88::95
NesPrgRom:1ca89-1ca8a::96
NesPrgRom:1ca8b-1ca8c::97
NesPrgRom:1ca8d-1ca8e::98
NesPrgRom:1ca8f-1ca90::99
NesPrgRom:1ca91-1ca92::9a
NesPrgRom:1ca93-1ca94::9b
NesPrgRom:1ca95-1ca96::9c
NesPrgRom:1ca97-1ca98::9d
NesPrgRom:1ca99-1ca9a::9e
NesPrgRom:1ca9b-1ca9c::9f
NesPrgRom:1ca9d-1ca9e::a0
NesPrgRom:1ca9f-1caa0::a1
NesPrgRom:1caa1-1caa2::a2
NesPrgRom:1caa3-1caa4::a3
NesPrgRom:1caa5-1caa6::a4
NesPrgRom:1caa7-1caa8::a5
NesPrgRom:1caa9-1caaa::a6
NesPrgRom:1caab-1caac::a7
NesPrgRom:1caad-1caae::a8
NesPrgRom:1caaf-1cab0::a9
NesPrgRom:1cab1-1cab2::aa
NesPrgRom:1cab3-1cab4::ab
NesPrgRom:1cab5-1cab6::ac
NesPrgRom:1cab7-1cab8::ad
NesPrgRom:1cab9-1caba::ae
NesPrgRom:1cabb-1cabc::af
NesPrgRom:1cabd-1cabe::b0
NesPrgRom:1cabf-1cac0::b1
NesPrgRom:1cac1-1cac2::b2
NesPrgRom:1cac3-1cac4::b3
NesPrgRom:1cac5-1cac6::b4
NesPrgRom:1cac7-1cac8::b5
NesPrgRom:1cac9-1caca::b6
NesPrgRom:1cacb-1cacc::b7
NesPrgRom:1cacd-1cace::b8
NesPrgRom:1cacf-1cad0::b9
NesPrgRom:1cad1-1cad2::ba
NesPrgRom:1cad3-1cad4::bb
NesPrgRom:1cad5-1cad6::bc
NesPrgRom:1cad7-1cad8::bd
NesPrgRom:1cad9-1cada::be
NesPrgRom:1cadb-1cadc::bf
NesPrgRom:1cadd-1cade::c0 vampire 1???
NesPrgRom:1cadf-1cae0::c1 giant insect???
NesPrgRom:1cae1-1cae2::c2 kelbesque???
NesPrgRom:1cae3-1cae4::c3 rage
NesPrgRom:1cae5-1cae9:NpcDialog_80:
NesPrgRom:1caea-1caee::026 -> 1e14
NesPrgRom:1caef-1caf3::default -> 1e13
NesPrgRom:1caf4-1caf8:NpcDialog_6e:
NesPrgRom:1caf9-1cafd::default -> 1601
NesPrgRom:1cafe-1cb02:NpcDialog_7f:
NesPrgRom:1cb03-1cb07::default -> 0d02
NesPrgRom:1cb08-1cb0c:NpcDialog_49:
NesPrgRom:1cb0d-1cb11::default -> 1e0f
NesPrgRom:1cb12-1cb16:NpcDialog_4b:
NesPrgRom:1cb17-1cb1b::0a7 NOT -> 1311
NesPrgRom:1cb1c-1cb1d::Set 0a7
NesPrgRom:1cb1e-1cb22::default -> 0a0b
NesPrgRom:1cb23-1cb24::Clear 0a7
NesPrgRom:1cb25-1cb29:NpcDialog_4c:
NesPrgRom:1cb2a-1cb2e::default -> 1312
NesPrgRom:1cb2f-1cb33:NpcDialog_4d:
NesPrgRom:1cb34-1cb38::default -> 1310
NesPrgRom:1cb39-1cb3d:NpcDialog_61:; "Tell me of your travels someday."
NesPrgRom:1cb3e-1cb42::default -> 1e03
NesPrgRom:1cb43-1cb46:NpcDialog_0d:028 changewoman -> 0012
NesPrgRom:1cb47-1cb4a::02a changesoldier -> 0013
NesPrgRom:1cb4b-1cb4e::02b changestom -> 0012
NesPrgRom:1cb4f-1cb52::029 changeakahana -> 0012
NesPrgRom:1cb58-1cb5c::; 00 c0 Leaf - Elder House\\n047 rescued leaf elder -> 0011
NesPrgRom:1cb5d-1cb61::00a windmill key used -> 000f
NesPrgRom:1cb62-1cb66::00b NOT talked to leaf elder -> 000e (action 03)
NesPrgRom:1cb67-1cb68::Set 00b talked to leaf elder
NesPrgRom:1cb69-1cb6d::default -> 000f
NesPrgRom:1cb6e-1cb72::; 16 35 Mt Sabre North - Summit Cave\\n083 NOT rescued leaf elder ?? -> 0709
NesPrgRom:1cb73-1cb74::Set 083 rescued leaf elder ??
NesPrgRom:1cb75-1cb79::default -> 070a
NesPrgRom:1cb7a-1cb7d:NpcDialog_65:
NesPrgRom:1cb7f-1cb83::default -> 0009
NesPrgRom:1cb84-1cb85::Set 073
NesPrgRom:1cb86-1cb89:NpcDialog_0e:028 changewoman -> 1e02
NesPrgRom:1cb8a-1cb8d::02a changesoldier -> 1e09
NesPrgRom:1cb8e-1cb91::02b changestom -> 1e02
NesPrgRom:1cb92-1cb95::029 changeakahana -> 1e02
NesPrgRom:1cb9b-1cb9f::; 00 02 Leaf\\n00d leaf villagers rescued -> 000d
NesPrgRom:1cba0-1cba4::00a windmill key used -> 000b
NesPrgRom:1cba5-1cba9::00c NOT -> 000a
NesPrgRom:1cbaa-1cbab::Set 00c
NesPrgRom:1cbac-1cbb0::default -> 000b
NesPrgRom:1cbb1-1cbb5::; 16 32 Mt Sabre North - Right Cell\\n00d leaf villagers rescued -> 000d
NesPrgRom:1cbb6-1cbba::default -> 0701
NesPrgRom:1cbbb-1cbbe:NpcDialog_0f:028 changewoman -> 1e00
NesPrgRom:1cbbf-1cbc2::02a changesoldier -> 1e07
NesPrgRom:1cbc3-1cbc6::02b changestom -> 1e00
NesPrgRom:1cbc7-1cbca::029 changeakahana -> 1e00
NesPrgRom:1cbd0-1cbd4::; 00 02 Leaf\\n00d leaf villagers rescued -> 0002
NesPrgRom:1cbd5-1cbd9::097 local -> 0001
NesPrgRom:1cbda-1cbdb::Clear 097 local
NesPrgRom:1cbdc-1cbe0::default -> 0000
NesPrgRom:1cbe1-1cbe2::Set 097 local
NesPrgRom:1cbe3-1cbe7::; 13 32 Mt Sabre North - Right Cell\\n00d leaf villagers rescued -> 0002
NesPrgRom:1cbe8-1cbec::default -> 0700
NesPrgRom:1cbed-1cbf0:NpcDialog_10:028 changewoman -> 1e01
NesPrgRom:1cbf1-1cbf4::02a changesoldier -> 1e08
NesPrgRom:1cbf5-1cbf8::02b changestom -> 1e01
NesPrgRom:1cbf9-1cbfc::029 changeakahana -> 1e01
NesPrgRom:1cc02-1cc06::; 00 02 Leaf\\n00d leaf villagers rescued -> 0008
NesPrgRom:1cc07-1cc0b::00a windmill key used -> 0007
NesPrgRom:1cc0c-1cc10::default -> 0006
NesPrgRom:1cc11-1cc15::; 0f 32 Mt Sabre North - Right Cell\\n00d leaf villagers rescued -> 0008
NesPrgRom:1cc16-1cc1a::default -> 0702
NesPrgRom:1cc1b-1cc1e:NpcDialog_11:028 changewoman -> 1e04
NesPrgRom:1cc1f-1cc22::02a changesoldier -> 1e0b
NesPrgRom:1cc23-1cc26::02b changestom -> 1e04
NesPrgRom:1cc27-1cc2a::029 changeakahana -> 1e04
NesPrgRom:1cc30-1cc34::; 00 02 Leaf\\n00d leaf villagers rescued -> 0005
NesPrgRom:1cc35-1cc39::096 -> 0004
NesPrgRom:1cc3a-1cc3b::Clear 096
NesPrgRom:1cc3c-1cc40::default -> 0003
NesPrgRom:1cc41-1cc42::Set 096
NesPrgRom:1cc43-1cc47::; 13 32 Mt Sabre North - Right Cell\\n00d leaf villagers rescued -> 0005
NesPrgRom:1cc48-1cc4c::default -> 0703
NesPrgRom:1cc4d-1cc50:NpcDialog_12:028 changewoman -> 0018
NesPrgRom:1cc51-1cc54::02a changesoldier -> 1e0c
NesPrgRom:1cc55-1cc58::02b changestom -> 0018
NesPrgRom:1cc59-1cc5c::029 changeakahana -> 0018
NesPrgRom:1cc62-1cc66::; 00 02 Leaf\\n00d leaf villagers rescued -> 0019
NesPrgRom:1cc67-1cc6b::default -> 0018
NesPrgRom:1cc6c-1cc70::; 0a 32 Mt Sabre North - Right Cell\\n00d leaf villagers rescued -> 0019
NesPrgRom:1cc71-1cc75::default -> 0706
NesPrgRom:1cc76-1cc79:NpcDialog_13:028 changewoman -> 0014
NesPrgRom:1cc7a-1cc7d::02a changesoldier -> 0014
NesPrgRom:1cc7e-1cc81::02b changestom -> 0014
NesPrgRom:1cc82-1cc85::029 changeakahana -> 0014
NesPrgRom:1cc87-1cc8b::00e NOT telepathy -> 0014
NesPrgRom:1cc8c-1cc90::038 NOT leaf abducted -> 0015
NesPrgRom:1cc91-1cc95::00d leaf villagers rescued -> 0017
NesPrgRom:1cc96-1cc9a::default -> 0016
NesPrgRom:1cc9b-1cc9c::Set 0a9 talked to leaf rabbit
NesPrgRom:1cc9d-1cca0:NpcDialog_30:02a changesoldier -> 1e0f
NesPrgRom:1cca2-1cca6::default -> 0707
NesPrgRom:1cca7-1ccaa:NpcDialog_31:02a changesoldier -> 1e0f
NesPrgRom:1ccac-1ccb0::default -> 0708
NesPrgRom:1ccb1-1ccb4:NpcDialog_2e:02a changesoldier -> 1e10
NesPrgRom:1ccb6-1ccba::default -> 0707
NesPrgRom:1ccbb-1ccbe:NpcDialog_2f:02a changesoldier -> 1e0f
NesPrgRom:1ccc0-1ccc4::default -> 0705
NesPrgRom:1ccc5-1ccc8:NpcDialog_14:028 changewoman -> 0104
NesPrgRom:1ccc9-1cccc::02a changesoldier -> 0105
NesPrgRom:1cccd-1ccd0::02b changestom -> 0104
NesPrgRom:1ccd1-1ccd4::029 changeakahana -> 0104
NesPrgRom:1ccda-1ccde::; 00 0e Windmill Cave\\n088 got windmill key NOT -> 0101 (action 03)
NesPrgRom:1ccdf-1cce0::Set 088 got windmill key
NesPrgRom:1cce1-1cce5::default -> 0103
NesPrgRom:1cce6-1ccea::; 0c c5 Leaf - Student House\\n0a5 NOT -> 000c (action 09)
NesPrgRom:1cceb-1ccec::Set 0a5 talked to zebu student
NesPrgRom:1cced-1ccf1::default -> 020a -> @ 0c
NesPrgRom:1ccf2-1ccf5:NpcDialog_15:
NesPrgRom:1ccf7-1ccfb::default -> 0100
NesPrgRom:1ccfc-1ccff:NpcDialog_1b:
NesPrgRom:1cd01-1cd05::default -> 0208 (action 0d)
NesPrgRom:1cd06-1cd07::Set 048
NesPrgRom:1cd08-1cd0b:NpcDialog_1c:028 changewoman -> 1e10
NesPrgRom:1cd0c-1cd0f::02a changesoldier -> 1e09
NesPrgRom:1cd10-1cd13::02b changestom -> 1e10
NesPrgRom:1cd14-1cd17::029 changeakahana -> 1e10
NesPrgRom:1cd19-1cd1d::048 NOT -> 0209
NesPrgRom:1cd1e-1cd22::012 -> 020c
NesPrgRom:1cd23-1cd27::default -> 0209
NesPrgRom:1cd28-1cd2b:NpcDialog_2c:
NesPrgRom:1cd2d-1cd31::012 NOT -> 050e (action 04)
NesPrgRom:1cd32-1cd33::Set 012
NesPrgRom:1cd34-1cd38::default -> 2010
NesPrgRom:1cd39-1cd3c:NpcDialog_17:02a changesoldier -> 1e09
NesPrgRom:1cd3e-1cd42::default -> 0203
NesPrgRom:1cd43-1cd46:NpcDialog_18:02a changesoldier -> 1e08
NesPrgRom:1cd48-1cd4c::default -> 0204
NesPrgRom:1cd4d-1cd50:NpcDialog_19:02a changesoldier -> 1e0a
NesPrgRom:1cd52-1cd56::default -> 0205
NesPrgRom:1cd57-1cd5a:NpcDialog_1a:02a changesoldier -> 1e08
NesPrgRom:1cd5c-1cd60::default -> 0207
NesPrgRom:1cd61-1cd64:NpcDialog_01:
NesPrgRom:1cd6a-1cd6e::; 00 c6 Brynmaer - Tavern\\n028 changewoman -> 1e0f
NesPrgRom:1cd6f-1cd73::02a changesoldier -> 1e0e
NesPrgRom:1cd74-1cd78::02b changestom -> 1e0f
NesPrgRom:1cd79-1cd7d::029 changeakahana -> 1e0f
NesPrgRom:1cd7e-1cd82::default -> 1e0f
NesPrgRom:1cd83-1cd87::; 19 93 Sahara\\n028 changewoman -> 1a04
NesPrgRom:1cd88-1cd8c::02a changesoldier -> 1e0a -> @ 19
NesPrgRom:1cd8d-1cd91::02b changestom -> 1a0d -> @ 19
NesPrgRom:1cd92-1cd96::029 changeakahana -> 1a04 -> @ 19
NesPrgRom:1cd97-1cd9b::default -> 1a04 -> @ 19
NesPrgRom:1cd9c-1cd9f:NpcDialog_02:02a changesoldier -> 1e07
NesPrgRom:1cda5-1cda9::; 00 c6 Brynmaer - Tavern\\ndefault -> 0206
NesPrgRom:1cdaa-1cdae::; 05 50 Portoa\\ndefault -> 0811
NesPrgRom:1cdaf-1cdb2:NpcDialog_1d:00e NOT telepathy -> 041a
NesPrgRom:1cdb3-1cdb6::028 changewoman -> 1e17
NesPrgRom:1cdb7-1cdba::02a changesoldier -> 1e17
NesPrgRom:1cdbb-1cdbe::02b changestom -> 1e17
NesPrgRom:1cdbf-1cdc2::029 changeakahana -> 1e17
NesPrgRom:1cdc4-1cdc8::043 -> 0419
NesPrgRom:1cdc9-1cdcd::0a6 -> 0418
NesPrgRom:1cdce-1cdcf::Set 0a8
NesPrgRom:1cdd0-1cdd4::044 -> 0417 got ball of fire
NesPrgRom:1cdd5-1cdd6::Set 0a6
NesPrgRom:1cdd7-1cddb::049 -> 0416
NesPrgRom:1cddc-1cde0::045 -> 0415 (action 03)
NesPrgRom:1cde1-1cde2::Set 049
NesPrgRom:1cde3-1cde7::default -> 0414
NesPrgRom:1cde8-1cdeb:NpcDialog_1e:00e NOT telepathy -> 041a
NesPrgRom:1cdec-1cdef::028 changewoman -> 041a
NesPrgRom:1cdf0-1cdf3::02a changesoldier -> 041a
NesPrgRom:1cdf4-1cdf7::02b changestom -> 041a
NesPrgRom:1cdf8-1cdfb::029 changeakahana -> 041a
NesPrgRom:1cdfd-1ce01::041 -> 0403 got ball of fire
NesPrgRom:1ce02-1ce06::0a0 -> 0402 got insect flute
NesPrgRom:1ce07-1ce0b::045 -> 0401 (action 03) rescued child
NesPrgRom:1ce0c-1ce0d::Set 0a0 got insect flute
NesPrgRom:1ce0e-1ce12::default -> 0400
NesPrgRom:1ce13-1ce14::Set 052
NesPrgRom:1ce15-1ce18:NpcDialog_1f:00e NOT telepathy -> 041a
NesPrgRom:1ce19-1ce1c::028 changewoman -> 041a
NesPrgRom:1ce1d-1ce20::02a changesoldier -> 041a
NesPrgRom:1ce21-1ce24::02b changestom -> 041a
NesPrgRom:1ce25-1ce28::029 changeakahana -> 041a
NesPrgRom:1ce2a-1ce2e::044 -> 0407
NesPrgRom:1ce2f-1ce33::045 NOT -> 0405 (action 0c)
NesPrgRom:1ce34-1ce35::Set 053
NesPrgRom:1ce36-1ce3a::default -> 0406
NesPrgRom:1ce3b-1ce3e:NpcDialog_20:00e NOT telepathy -> 041a
NesPrgRom:1ce3f-1ce42::028 changewoman -> 041a
NesPrgRom:1ce43-1ce46::02a changesoldier -> 041a
NesPrgRom:1ce47-1ce4a::02b changestom -> 041a
NesPrgRom:1ce4b-1ce4e::029 changeakahana -> 041a
NesPrgRom:1ce50-1ce54::041 -> 040b
NesPrgRom:1ce55-1ce59::045 -> 040a
NesPrgRom:1ce5a-1ce5e::default -> 0409
NesPrgRom:1ce5f-1ce62:NpcDialog_21:00e NOT telepathy -> 041a
NesPrgRom:1ce63-1ce66::028 changewoman -> 041a
NesPrgRom:1ce67-1ce6a::02a changesoldier -> 041a
NesPrgRom:1ce6b-1ce6e::02b changestom -> 041a
NesPrgRom:1ce6f-1ce72::029 changeakahana -> 041a
NesPrgRom:1ce74-1ce78::041 -> 040f
NesPrgRom:1ce79-1ce7d::045 -> 040e
NesPrgRom:1ce7e-1ce82::default -> 040d
NesPrgRom:1ce83-1ce86:NpcDialog_22:00e NOT telepathy -> 041a
NesPrgRom:1ce87-1ce8a::028 changewoman -> 041a
NesPrgRom:1ce8b-1ce8e::02a changesoldier -> 041a
NesPrgRom:1ce8f-1ce92::02b changestom -> 041a
NesPrgRom:1ce93-1ce96::029 changeakahana -> 041a
NesPrgRom:1ce98-1ce9c::041 -> 0412
NesPrgRom:1ce9d-1cea1::045 -> 0411
NesPrgRom:1cea2-1cea6::default -> 0410
NesPrgRom:1cea7-1ceaa:NpcDialog_23:
NesPrgRom:1ceac-1ceb0::028 NOT changewoman -> 1212 (action 15)
NesPrgRom:1ceb1-1ceb5::010 gave kirisa to aryllis -> 1211
NesPrgRom:1ceb6-1ceba::011 NOT welcomed to amazones -> 120e
NesPrgRom:1cebb-1cebc::Set 011 welcomed to amazones
NesPrgRom:1cebd-1cec1::default -> 120f
NesPrgRom:1cec2-1cec5:NpcDialog_05:
NesPrgRom:1cecb-1cecf::; 00 1b Amazones\\n028 NOT changewoman -> 1202
NesPrgRom:1ced0-1ced4::default -> 1203
NesPrgRom:1ced5-1ced9::; 0a 50 Portoa\\n02a changesoldier -> 1e08
NesPrgRom:1ceda-1cede::default -> 0810 -> @ 0a
NesPrgRom:1cedf-1cee2:NpcDialog_24:028 NOT changewoman -> 1204
NesPrgRom:1cee4-1cee8::default -> 1205
NesPrgRom:1cee9-1ceec:NpcDialog_26:028 NOT changewoman -> 120b
NesPrgRom:1ceee-1cef2::default -> 1209
NesPrgRom:1cef3-1cef6:NpcDialog_27:028 NOT changewoman -> 120b
NesPrgRom:1cef8-1cefc::default -> 120a
NesPrgRom:1cefd-1cf00:NpcDialog_25:028 NOT changewoman -> 1206
NesPrgRom:1cf02-1cf06::default -> 1207
NesPrgRom:1cf07-1cf08::Clear 000 unused
NesPrgRom:1cf09-1cf0c::;; --------------------------------\\n; unused\\n028 NOT changewoman -> 1206
NesPrgRom:1cf0e-1cf12::default -> 1207
NesPrgRom:1cf13-1cf16:NpcDialog_28:02a changesoldier -> 0501
NesPrgRom:1cf18-1cf1c::default -> 0500
NesPrgRom:1cf1d-1cf20:NpcDialog_08:02a changesoldier -> 1e07
NesPrgRom:1cf26-1cf2a::; 00 d5 Nadare\\ndefault -> 0508
NesPrgRom:1cf2b-1cf2f::; 05 18 Brynmaer\\ndefault -> 0200
NesPrgRom:1cf30-1cf33:NpcDialog_2b:02a changesoldier -> 1e09
NesPrgRom:1cf35-1cf39::default -> 0509
NesPrgRom:1cf3a-1cf3d:NpcDialog_2a:028 changewoman -> 0507
NesPrgRom:1cf3e-1cf41::02a changesoldier -> 1e09
NesPrgRom:1cf42-1cf45::02b changestom -> 0507
NesPrgRom:1cf46-1cf49::029 changeakahana -> 0507
NesPrgRom:1cf4b-1cf4f::00d leaf villagers rescued -> 0506
NesPrgRom:1cf50-1cf54::default -> 0505
NesPrgRom:1cf55-1cf58:NpcDialog_29:028 changewoman -> 1e01
NesPrgRom:1cf59-1cf5c::02a changesoldier -> 1e08
NesPrgRom:1cf5d-1cf60::02b changestom -> 1e01
NesPrgRom:1cf61-1cf64::029 changeakahana -> 1e01
NesPrgRom:1cf66-1cf6a::098 -> 0504
NesPrgRom:1cf6b-1cf6f::012 -> 1e19
NesPrgRom:1cf70-1cf71::Set 098
NesPrgRom:1cf72-1cf76::default -> 0502
NesPrgRom:1cf77-1cf78::Set 098
NesPrgRom:1cf79-1cf7c:NpcDialog_2d:
NesPrgRom:1cf82-1cf86::; 00 28 Mt Sabre North - Main\\ndefault -> 0510 (action 01)
NesPrgRom:1cf87-1cf8b::; 05 73 Swan - Gate\\n02a changesoldier -> 1315 (action 08)
NesPrgRom:1cf8c-1cf90::default -> 1314 (action 01) -> @ 05
NesPrgRom:1cf91-1cf94:NpcDialog_38:
NesPrgRom:1cf96-1cf9a::01e -> 0b02
NesPrgRom:1cf9b-1cf9f::01f -> 0b00 (action 10)
NesPrgRom:1cfa0-1cfa1::Set 01e
NesPrgRom:1cfa2-1cfa6::016 -> 0a0e
NesPrgRom:1cfa7-1cfa8::Set 09c
NesPrgRom:1cfa9-1cfad::017 -> 0a0d
NesPrgRom:1cfae-1cfaf::Set 016
NesPrgRom:1cfb0-1cfb1::Set 09c
NesPrgRom:1cfb2-1cfb6::092 -> 0a0e
NesPrgRom:1cfb7-1cfbb::018 entered channel -> 0a0c (action 03)
NesPrgRom:1cfbc-1cfbd::Set 092
NesPrgRom:1cfbe-1cfbf::Set 0a3
NesPrgRom:1cfc0-1cfc1::Set 09c
NesPrgRom:1cfc2-1cfc6::019 -> 0a0a
NesPrgRom:1cfc7-1cfc8::Set 09c
NesPrgRom:1cfc9-1cfcd::01a NOT -> 0a04 (action 0e)
NesPrgRom:1cfce-1cfcf::Set 09c
NesPrgRom:1cfd0-1cfd1::Set 019
NesPrgRom:1cfd2-1cfd3::Set 01a
NesPrgRom:1cfd4-1cfd8::0d7 -> 0a09
NesPrgRom:1cfd9-1cfda::Clear 0d7
NesPrgRom:1cfdb-1cfdc::Clear 0d6
NesPrgRom:1cfdd-1cfde::Clear 0d5
NesPrgRom:1cfdf-1cfe0::Set 09c
NesPrgRom:1cfe1-1cfe2::Set 019
NesPrgRom:1cfe3-1cfe7::0d6 -> 0a08
NesPrgRom:1cfe8-1cfe9::Set 0d7
NesPrgRom:1cfea-1cfeb::Set 09c
NesPrgRom:1cfec-1cfed::Set 019
NesPrgRom:1cfee-1cff2::0d5 -> 0a07
NesPrgRom:1cff3-1cff4::Set 0d6
NesPrgRom:1cff5-1cff6::Set 09c
NesPrgRom:1cff7-1cff8::Set 019
NesPrgRom:1cff9-1cffd::default -> 0a06
NesPrgRom:1cffe-1cfff::Set 0d5
NesPrgRom:1d000-1d001::Set 09c
NesPrgRom:1d002-1d003::Set 019
NesPrgRom:1d004-1d007:NpcDialog_39:
NesPrgRom:1d009-1d00d::01b mesia recording played -> 0a01
NesPrgRom:1d00e-1d00f::Set 020
NesPrgRom:1d010-1d011::Set 01f
NesPrgRom:1d012-1d016::017 -> 0a03
NesPrgRom:1d017-1d018::Clear 020
NesPrgRom:1d019-1d01d::0a3 -> 0a02
NesPrgRom:1d01e-1d01f::Clear 020
NesPrgRom:1d020-1d024::01d -> 0a01
NesPrgRom:1d025-1d026::Clear 020
NesPrgRom:1d027-1d02b::default -> 0a00
NesPrgRom:1d02c-1d02d::Clear 020
NesPrgRom:1d02e-1d02f::Set 01d
NesPrgRom:1d030-1d033:NpcDialog_34:028 changewoman -> 0806
NesPrgRom:1d034-1d037::02a changesoldier -> 1e0d
NesPrgRom:1d038-1d03b::02b changestom -> 0806
NesPrgRom:1d03c-1d03f::029 changeakahana -> 0806
NesPrgRom:1d041-1d045::01e -> 0807
NesPrgRom:1d046-1d04a::01f -> 0805
NesPrgRom:1d04b-1d04f::020 NOT -> 0804
NesPrgRom:1d050-1d054::default -> 0806
NesPrgRom:1d055-1d058:NpcDialog_33:028 changewoman -> 0802
NesPrgRom:1d059-1d05c::02a changesoldier -> 1e0d
NesPrgRom:1d05d-1d060::02b changestom -> 0802
NesPrgRom:1d061-1d064::029 changeakahana -> 0802
NesPrgRom:1d066-1d06a::020 NOT -> 0803
NesPrgRom:1d06b-1d06f::default -> 0802
NesPrgRom:1d070-1d073:NpcDialog_07:
NesPrgRom:1d079-1d07d::; 00 de Portoa - Palace Left\\n028 changewoman -> 0800
NesPrgRom:1d07e-1d082::02a changesoldier -> 1e0d
NesPrgRom:1d083-1d087::02b changestom -> 0800
NesPrgRom:1d088-1d08c::029 changeakahana -> 0800
NesPrgRom:1d08d-1d091::default -> 0800
NesPrgRom:1d092-1d096::; 19 61 Cabin\\n028 changewoman -> 1100
NesPrgRom:1d097-1d09b::02a changesoldier -> 1e0d -> @ 19
NesPrgRom:1d09c-1d0a0::02b changestom -> 1100 -> @ 19
NesPrgRom:1d0a1-1d0a5::029 changeakahana -> 1100 -> @ 19
NesPrgRom:1d0a6-1d0aa::default -> 1100 -> @ 19
NesPrgRom:1d0ab-1d0ae:NpcDialog_32:028 changewoman -> 0801
NesPrgRom:1d0af-1d0b2::02a changesoldier -> 1e0d
NesPrgRom:1d0b3-1d0b6::02b changestom -> 0801
NesPrgRom:1d0b7-1d0ba::029 changeakahana -> 0801
NesPrgRom:1d0bc-1d0c0::default -> 0801
NesPrgRom:1d0c1-1d0c4:NpcDialog_04:
NesPrgRom:1d0cc-1d0d0::; 00 e0 Portoa - Palace Right\\n028 changewoman -> 0808
NesPrgRom:1d0d1-1d0d5::02a changesoldier -> 1e08
NesPrgRom:1d0d6-1d0da::02b changestom -> 0808
NesPrgRom:1d0db-1d0df::029 changeakahana -> 0808
NesPrgRom:1d0e0-1d0e4::default -> 0808
NesPrgRom:1d0e5-1d0e9::; 19 93 Sahara\\n02b changestom -> 1a0b
NesPrgRom:1d0ea-1d0ee::02a changesoldier -> 1e08 -> @ 19
NesPrgRom:1d0ef-1d0f3::default -> 1a00 -> @ 19
NesPrgRom:1d0f4-1d0f8::; 28 1b Amazones\\n028 NOT changewoman -> 1200
NesPrgRom:1d0f9-1d0fd::default -> 1201 -> @ 28
NesPrgRom:1d0fe-1d101:NpcDialog_35:028 changewoman -> 080e
NesPrgRom:1d102-1d105::02a changesoldier -> 1e07
NesPrgRom:1d106-1d109::02b changestom -> 080e
NesPrgRom:1d10a-1d10d::029 changeakahana -> 080e
NesPrgRom:1d10f-1d113::01b NOT mesia recording played -> 080e
NesPrgRom:1d114-1d118::default -> 080f
NesPrgRom:1d119-1d11c:NpcDialog_36:028 changewoman -> 080a
NesPrgRom:1d11d-1d120::02a changesoldier -> 1e08
NesPrgRom:1d121-1d124::02b changestom -> 080a
NesPrgRom:1d125-1d128::029 changeakahana -> 080a
NesPrgRom:1d12a-1d12e::01e -> 080a
NesPrgRom:1d12f-1d133::default -> 0809
NesPrgRom:1d134-1d137:NpcDialog_37:028 changewoman -> 080a
NesPrgRom:1d138-1d13b::02a changesoldier -> 1e08
NesPrgRom:1d13c-1d13f::02b changestom -> 080a
NesPrgRom:1d140-1d143::029 changeakahana -> 080a
NesPrgRom:1d145-1d149::01b mesia recording played -> 080c
NesPrgRom:1d14a-1d14e::default -> 080b
NesPrgRom:1d14f-1d152:NpcDialog_06:02a changesoldier -> 1e08
NesPrgRom:1d158-1d15c::; 00 50 Portoa\\ndefault -> 0812
NesPrgRom:1d15d-1d161::; 05 93 Sahara\\n02b changestom -> 1a0b
NesPrgRom:1d162-1d166::default -> 1a03 -> @ 05
NesPrgRom:1d167-1d16a:NpcDialog_03:02a changesoldier -> 1e07
NesPrgRom:1d172-1d176::; 00 50 Portoa\\ndefault -> 0813
NesPrgRom:1d177-1d17b::; 05 ef Swan - Tavern\\ndefault -> 1e0f
NesPrgRom:1d17c-1d180::; 0a 93 Sahara\\n02b changestom -> 1a09
NesPrgRom:1d181-1d185::default -> 1a01 -> @ 0a
NesPrgRom:1d186-1d189:NpcDialog_00:02a changesoldier -> 1e09
NesPrgRom:1d18f-1d193::; 00 50 Portoa\\n01e -> 0815
NesPrgRom:1d194-1d198::default -> 0814
NesPrgRom:1d199-1d19d::; 0a 93 Sahara\\n02b changestom -> 1a0c
NesPrgRom:1d19e-1d1a2::default -> 1a02 -> @ 0a
NesPrgRom:1d1a3-1d1a6:NpcDialog_64:028 changewoman -> 0900
NesPrgRom:1d1a7-1d1aa::02a changesoldier -> 1e0a
NesPrgRom:1d1ab-1d1ae::02b changestom -> 0900
NesPrgRom:1d1af-1d1b2::029 changeakahana -> 0900
NesPrgRom:1d1b4-1d1b8::021 -> 0902
NesPrgRom:1d1b9-1d1bd::04a NOT -> 0900
NesPrgRom:1d1be-1d1bf::Set 04a
NesPrgRom:1d1c0-1d1c4::default -> 0903
NesPrgRom:1d1c5-1d1c8:NpcDialog_7b:028 changewoman -> 0905
NesPrgRom:1d1c9-1d1cc::02a changesoldier -> 1e0c
NesPrgRom:1d1cd-1d1d0::02b changestom -> 0905
NesPrgRom:1d1d1-1d1d4::029 changeakahana -> 0905
NesPrgRom:1d1d6-1d1da::08b NOT got shell flute -> 0906
NesPrgRom:1d1db-1d1df::021 -> 0905
NesPrgRom:1d1e0-1d1e4::default -> 0904
NesPrgRom:1d1e5-1d1e8:NpcDialog_3a:02a changesoldier -> 1e07
NesPrgRom:1d1ea-1d1ee::06a NOT -> 1e07
NesPrgRom:1d1ef-1d1f3::0d9 -> 0d00
NesPrgRom:1d1f4-1d1f5::Clear 0d9
NesPrgRom:1d1f6-1d1fa::default -> 0d03
NesPrgRom:1d1fb-1d1fc::Set 0d9
NesPrgRom:1d1fd-1d200:NpcDialog_3b:02a changesoldier -> 1e08
NesPrgRom:1d202-1d206::06a -> 0d02
NesPrgRom:1d207-1d20b::default -> 1e08
NesPrgRom:1d20c-1d20f:NpcDialog_3c:02a changesoldier -> 1e09
NesPrgRom:1d211-1d215::06b -> 0d03
NesPrgRom:1d216-1d21a::default -> 1e09
NesPrgRom:1d21b-1d21e:NpcDialog_3d:028 changewoman -> 0f03
NesPrgRom:1d21f-1d222::02a changesoldier -> 0f04
NesPrgRom:1d223-1d226::02b changestom -> 0f03
NesPrgRom:1d227-1d22a::029 changeakahana -> 0f03
NesPrgRom:1d22c-1d230::013 NOT -> 0f00
NesPrgRom:1d231-1d235::08f -> 0f02
NesPrgRom:1d236-1d23a::default -> 0f01
NesPrgRom:1d23b-1d23e:NpcDialog_42:028 changewoman -> 1e02
NesPrgRom:1d23f-1d242::02a changesoldier -> 1e09
NesPrgRom:1d243-1d246::02b changestom -> 1e02
NesPrgRom:1d247-1d24a::029 changeakahana -> 1e02
NesPrgRom:1d24c-1d250::013 NOT -> 0f0f
NesPrgRom:1d251-1d255::08f -> 0f11
NesPrgRom:1d256-1d25a::default -> 0f10
NesPrgRom:1d25b-1d25e:NpcDialog_41:028 changewoman -> 1e02
NesPrgRom:1d25f-1d262::02a changesoldier -> 1e09
NesPrgRom:1d263-1d266::02b changestom -> 1e02
NesPrgRom:1d267-1d26a::029 changeakahana -> 1e02
NesPrgRom:1d26c-1d270::013 NOT -> 0f0c
NesPrgRom:1d271-1d275::08f -> 0f0e
NesPrgRom:1d276-1d27a::default -> 0f0d
NesPrgRom:1d27b-1d27e:NpcDialog_3e:028 changewoman -> 1e01
NesPrgRom:1d27f-1d282::02a changesoldier -> 1e08
NesPrgRom:1d283-1d286::02b changestom -> 1e01
NesPrgRom:1d287-1d28a::029 changeakahana -> 1e01
NesPrgRom:1d28c-1d290::013 NOT -> 0f05
NesPrgRom:1d291-1d295::08f -> 0f07
NesPrgRom:1d296-1d29a::default -> 0f06
NesPrgRom:1d29b-1d29e:NpcDialog_3f:028 changewoman -> 1e01
NesPrgRom:1d29f-1d2a2::02a changesoldier -> 1e08
NesPrgRom:1d2a3-1d2a6::02b changestom -> 1e01
NesPrgRom:1d2a7-1d2aa::029 changeakahana -> 1e01
NesPrgRom:1d2ac-1d2b0::013 NOT -> 0f08
NesPrgRom:1d2b1-1d2b5::08f -> 1e01
NesPrgRom:1d2b6-1d2ba::default -> 0f09
NesPrgRom:1d2bb-1d2be:NpcDialog_40:028 changewoman -> 1e02
NesPrgRom:1d2bf-1d2c2::02a changesoldier -> 1e09
NesPrgRom:1d2c3-1d2c6::02b changestom -> 1e02
NesPrgRom:1d2c7-1d2ca::029 changeakahana -> 1e02
NesPrgRom:1d2cc-1d2d0::013 NOT -> 0f0a
NesPrgRom:1d2d1-1d2d5::08f -> 1e02
NesPrgRom:1d2d6-1d2da::default -> 0f0b
NesPrgRom:1d2db-1d2de:NpcDialog_43:028 changewoman -> 1e01
NesPrgRom:1d2df-1d2e2::02a changesoldier -> 1e08
NesPrgRom:1d2e3-1d2e6::02b changestom -> 1e01
NesPrgRom:1d2e7-1d2ea::029 changeakahana -> 1e01
NesPrgRom:1d2ec-1d2f0::013 NOT -> 0f12
NesPrgRom:1d2f1-1d2f5::08f -> 0f14
NesPrgRom:1d2f6-1d2fa::default -> 0f13
NesPrgRom:1d2fb-1d2fe:NpcDialog_45:028 changewoman -> 1e03
NesPrgRom:1d2ff-1d302::02a changesoldier -> 1e0a
NesPrgRom:1d303-1d306::02b changestom -> 1e03
NesPrgRom:1d307-1d30a::029 changeakahana -> 1e03
NesPrgRom:1d30c-1d310::08f -> 1e03
NesPrgRom:1d311-1d315::030 NOT -> 1003
NesPrgRom:1d316-1d31a::030 -> 0000 (action 14)
NesPrgRom:1d31b-1d31c::Set 400
NesPrgRom:1d31d-1d320:NpcDialog_46:028 changewoman -> 1e02
NesPrgRom:1d321-1d324::02a changesoldier -> 1e09
NesPrgRom:1d325-1d328::02b changestom -> 1e02
NesPrgRom:1d329-1d32c::029 changeakahana -> 1e02
NesPrgRom:1d32e-1d332::08f -> 1007
NesPrgRom:1d333-1d337::031 NOT -> 1005
NesPrgRom:1d338-1d339::Set 031
NesPrgRom:1d33a-1d33e::default -> 1006
NesPrgRom:1d33f-1d342:NpcDialog_09:028 changewoman -> 1e00
NesPrgRom:1d343-1d346::02a changesoldier -> 1e09
NesPrgRom:1d347-1d34a::02b changestom -> 1e00
NesPrgRom:1d34b-1d34e::029 changeakahana -> 1e00
NesPrgRom:1d350-1d354::08f -> 1009
NesPrgRom:1d355-1d359::default -> 1008
NesPrgRom:1d35a-1d35d:NpcDialog_0a:028 changewoman -> 1e01
NesPrgRom:1d35e-1d361::02a changesoldier -> 1e08
NesPrgRom:1d362-1d365::02b changestom -> 1e01
NesPrgRom:1d366-1d369::029 changeakahana -> 1e01
NesPrgRom:1d36b-1d36f::08f -> 100b
NesPrgRom:1d370-1d374::default -> 100a
NesPrgRom:1d375-1d378:NpcDialog_47:028 changewoman -> 1e04
NesPrgRom:1d379-1d37c::02a changesoldier -> 1e0b
NesPrgRom:1d37d-1d380::02b changestom -> 1e04
NesPrgRom:1d381-1d384::029 changeakahana -> 1e04
NesPrgRom:1d386-1d38a::08f -> 100d
NesPrgRom:1d38b-1d38f::default -> 100c
NesPrgRom:1d390-1d393:NpcDialog_44:028 changewoman -> 0f16
NesPrgRom:1d394-1d397::02a changesoldier -> 0f17
NesPrgRom:1d398-1d39b::02b changestom -> 0f16
NesPrgRom:1d39c-1d39f::029 changeakahana -> 0f16
NesPrgRom:1d3a5-1d3a9::; 00 e4 Joel - Shed\\ndefault -> 0f15
NesPrgRom:1d3aa-1d3ae::; 05 e9 Zombie Town - House Basement\\n013 NOT defeated sabera -> 1000
NesPrgRom:1d3af-1d3b3::08d NOT -> 1001 (action 03) -> @ 05
NesPrgRom:1d3b4-1d3b5::Set 08d
NesPrgRom:1d3b6-1d3b7::Set 032
NesPrgRom:1d3b8-1d3bc::default -> 1002 -> @ 05
NesPrgRom:1d3bd-1d3c0:NpcDialog_77:028 changewoman -> 1e00
NesPrgRom:1d3c1-1d3c4::02a changesoldier -> 1e07
NesPrgRom:1d3c5-1d3c8::02b changestom -> 1e00
NesPrgRom:1d3c9-1d3cc::029 changeakahana -> 1e00
NesPrgRom:1d3ce-1d3d2::024 -> 1308
NesPrgRom:1d3d3-1d3d7::default -> 1307
NesPrgRom:1d3d8-1d3db:NpcDialog_48:028 changewoman -> 1e02
NesPrgRom:1d3dc-1d3df::02a changesoldier -> 1e09
NesPrgRom:1d3e0-1d3e3::02b changestom -> 1e02
NesPrgRom:1d3e4-1d3e7::029 changeakahana -> 1e02
NesPrgRom:1d3e9-1d3ed::024 -> 130a
NesPrgRom:1d3ee-1d3f2::default -> 1309
NesPrgRom:1d3f3-1d3f6:NpcDialog_6f:028 changewoman -> 1e03
NesPrgRom:1d3f7-1d3fa::02a changesoldier -> 1e0a
NesPrgRom:1d3fb-1d3fe::02b changestom -> 1e03
NesPrgRom:1d3ff-1d402::029 changeakahana -> 1e03
NesPrgRom:1d404-1d408::024 -> 130c
NesPrgRom:1d409-1d40d::default -> 130b
NesPrgRom:1d40e-1d411:NpcDialog_79:028 changewoman -> 1e01
NesPrgRom:1d412-1d415::02a changesoldier -> 1e08
NesPrgRom:1d416-1d419::02b changestom -> 1e01
NesPrgRom:1d41a-1d41d::029 changeakahana -> 1e01
NesPrgRom:1d41f-1d423::024 -> 130e
NesPrgRom:1d424-1d428::default -> 130d
NesPrgRom:1d429-1d42c:NpcDialog_0c:
NesPrgRom:1d434-1d438::; 00 ef Swan - Tavern\\n02a changesoldier -> 1e12
NesPrgRom:1d439-1d43d::default -> 1e14
NesPrgRom:1d43e-1d442::; 0a 72 Swan\\n02a changesoldier -> 1e12
NesPrgRom:1d443-1d447::default -> 1e14 -> @ 0a
NesPrgRom:1d448-1d44c::; 14 f1 Swan - Dance Hall (UNUSED)\\ndefault -> 1e11
NesPrgRom:1d44d-1d450:NpcDialog_4a:028 changewoman -> 1e13
NesPrgRom:1d451-1d454::02a changesoldier -> 1e12
NesPrgRom:1d455-1d458::02b changestom -> 1e13
NesPrgRom:1d459-1d45c::029 changeakahana -> 1e13
NesPrgRom:1d45e-1d462::default -> 1e13
NesPrgRom:1d463-1d467::02a changesoldier -> 1e12 -> @ ff
NesPrgRom:1d468-1d46c::default -> 1310
NesPrgRom:1d46d-1d471::000 unused -> 0000 -> @ ff
NesPrgRom:1d472-1d476::default -> 1311 (action 0b)
NesPrgRom:1d477-1d47a:NpcDialog_4e:028 changewoman -> 1400
NesPrgRom:1d47b-1d47e::02a changesoldier -> 1402
NesPrgRom:1d47f-1d482::02b changestom -> 1401
NesPrgRom:1d483-1d486::029 changeakahana -> 1400
NesPrgRom:1d488-1d48c::026 entered shyron -> 1404
NesPrgRom:1d48d-1d491::default -> 1400
NesPrgRom:1d492-1d4a1::; ----\\n; UNUSED
NesPrgRom:1d4ad-1d4b0:NpcDialog_76:
NesPrgRom:1d4b2-1d4b6::default -> 2010
NesPrgRom:1d4b7-1d4b8::Set 0e9
NesPrgRom:1d4b9-1d4bc:NpcDialog_51:
NesPrgRom:1d4be-1d4c2::04d -> 140f
NesPrgRom:1d4c3-1d4c4::Clear 04d
NesPrgRom:1d4c5-1d4c6::Clear 04c
NesPrgRom:1d4c7-1d4cb::04c -> 140e
NesPrgRom:1d4cc-1d4cd::Set 04d
NesPrgRom:1d4ce-1d4d2::default -> 140e
NesPrgRom:1d4d3-1d4d4::Set 04c
NesPrgRom:1d4d5-1d4d8:NpcDialog_53:
NesPrgRom:1d4da-1d4de::04b -> 1415
NesPrgRom:1d4df-1d4e0::Clear 04b
NesPrgRom:1d4e1-1d4e5::default -> 1416
NesPrgRom:1d4e6-1d4e7::Set 04b
NesPrgRom:1d4e8-1d4eb:NpcDialog_4f:028 changewoman -> 1405
NesPrgRom:1d4ec-1d4ef::02a changesoldier -> 1402
NesPrgRom:1d4f0-1d4f3::02b changestom -> 1405
NesPrgRom:1d4f4-1d4f7::029 changeakahana -> 1405
NesPrgRom:1d4f9-1d4fd::02d -> 1404
NesPrgRom:1d4fe-1d502::default -> 1405
NesPrgRom:1d503-1d506:NpcDialog_50:028 changewoman -> 1406
NesPrgRom:1d507-1d50a::02a changesoldier -> 1403
NesPrgRom:1d50b-1d50e::02b changestom -> 1406
NesPrgRom:1d50f-1d512::029 changeakahana -> 1406
NesPrgRom:1d514-1d518::02d -> 1404
NesPrgRom:1d519-1d51d::default -> 1406
NesPrgRom:1d51e-1d521:NpcDialog_5d:
NesPrgRom:1d523-1d527::default -> 2010
NesPrgRom:1d528-1d529::Set 0e8
NesPrgRom:1d52a-1d52d:NpcDialog_52:028 changewoman -> 1509
NesPrgRom:1d52e-1d531::02a changesoldier -> 150a
NesPrgRom:1d532-1d535::02b changestom -> 150b
NesPrgRom:1d536-1d539::029 changeakahana -> 1509
NesPrgRom:1d53b-1d53f::02d -> 1414
NesPrgRom:1d540-1d544::default -> 1413
NesPrgRom:1d545-1d548:NpcDialog_71:
NesPrgRom:1d54a-1d54e::089 spoken to dead stom's gf -> 2010
NesPrgRom:1d54f-1d553::02b changestom -> 1902
NesPrgRom:1d554-1d555::Set 089 spoken to dead stom's gf
NesPrgRom:1d556-1d55a::default -> 1901
NesPrgRom:1d55b-1d55c::Set 089 spoken to dead stom's gf
NesPrgRom:1d55d-1d560:NpcDialog_72:
NesPrgRom:1d562-1d566::08a NOT spoken to dead stom -> 1903
NesPrgRom:1d567-1d568::Set 08a spoken to dead stom
NesPrgRom:1d569-1d56d::default -> 2010
NesPrgRom:1d56e-1d571:NpcDialog_56:028 changewoman -> 1e01
NesPrgRom:1d572-1d575::02a changesoldier -> 1e08
NesPrgRom:1d576-1d579::02b changestom -> 1e01
NesPrgRom:1d57a-1d57d::029 changeakahana -> 1e01
NesPrgRom:1d57f-1d583::024 -> 170d
NesPrgRom:1d584-1d588::default -> 170c
NesPrgRom:1d589-1d58c:NpcDialog_57:028 changewoman -> 1e0f
NesPrgRom:1d58d-1d590::02a changesoldier -> 1e0e
NesPrgRom:1d591-1d594::02b changestom -> 1e0f
NesPrgRom:1d595-1d598::029 changeakahana -> 1e0f
NesPrgRom:1d59a-1d59e::024 -> 170b
NesPrgRom:1d59f-1d5a3::default -> 170a
NesPrgRom:1d5a4-1d5a7:NpcDialog_58:028 changewoman -> 1e01
NesPrgRom:1d5a8-1d5ab::02a changesoldier -> 1e08
NesPrgRom:1d5ac-1d5af::02b changestom -> 1e01
NesPrgRom:1d5b0-1d5b3::029 changeakahana -> 1e01
NesPrgRom:1d5b5-1d5b9::024 -> 1709
NesPrgRom:1d5ba-1d5be::default -> 1708
NesPrgRom:1d5bf-1d5c2:NpcDialog_54:02a changesoldier -> 1e09
NesPrgRom:1d5c3-1d5c6::028 changewoman -> 1e02
NesPrgRom:1d5c7-1d5ca::02b changestom -> 1e02
NesPrgRom:1d5cc-1d5d0::024 NOT generals defeated -> 1704
NesPrgRom:1d5d1-1d5d5::029 NOT changeakahana -> 1705
NesPrgRom:1d5d6-1d5da::04f NOT received warrior ring -> 1706 (action 03)
NesPrgRom:1d5db-1d5dc::Set 04f received warrior ring
NesPrgRom:1d5dd-1d5e1::default -> 1707
NesPrgRom:1d5e2-1d5e5:NpcDialog_78:028 changewoman -> 1e00
NesPrgRom:1d5e6-1d5e9::02a changesoldier -> 1e07
NesPrgRom:1d5ea-1d5ed::02b changestom -> 1e00
NesPrgRom:1d5ee-1d5f1::029 changeakahana -> 1e00
NesPrgRom:1d5f3-1d5f7::024 -> 1701
NesPrgRom:1d5f8-1d5fc::default -> 1700
NesPrgRom:1d5fd-1d600:NpcDialog_55:028 changewoman -> 1e03
NesPrgRom:1d601-1d604::02a changesoldier -> 1e0a
NesPrgRom:1d605-1d608::02b changestom -> 1e03
NesPrgRom:1d609-1d60c::029 changeakahana -> 1e03
NesPrgRom:1d60e-1d612::024 -> 1710
NesPrgRom:1d613-1d617::default -> 170f
NesPrgRom:1d618-1d61b:NpcDialog_7a:028 changewoman -> 1e01
NesPrgRom:1d61c-1d61f::02a changesoldier -> 1e08
NesPrgRom:1d620-1d623::02b changestom -> 1e01
NesPrgRom:1d624-1d627::029 changeakahana -> 1e01
NesPrgRom:1d629-1d62d::024 -> 1703
NesPrgRom:1d62e-1d632::default -> 1702
NesPrgRom:1d633-1d636:NpcDialog_0b:
NesPrgRom:1d63c-1d640::; 00 8e Goa\\n02a changesoldier -> 1e12
NesPrgRom:1d641-1d645::default -> 1e13
NesPrgRom:1d646-1d64a::; 0a bf Goa - Tavern\\ndefault -> 1e11
NesPrgRom:1d64b-1d64e:NpcDialog_5a:028 changewoman -> 1a13
NesPrgRom:1d64f-1d652::02a changesoldier -> 1a13
NesPrgRom:1d653-1d656::029 changeakahana -> 1a13
NesPrgRom:1d658-1d65c::02e chest2ddeo's pendant -> 1a11
NesPrgRom:1d65d-1d661::02b changestom -> 1a10 (action 03)
NesPrgRom:1d662-1d663::Set 02e chest2ddeo's pendant
NesPrgRom:1d664-1d668::default -> 1a0f
NesPrgRom:1d669-1d66c:NpcDialog_59:028 changewoman -> 1a12
NesPrgRom:1d66d-1d670::02a changesoldier -> 1a12
NesPrgRom:1d671-1d674::02b changestom -> 1a12
NesPrgRom:1d675-1d678::029 changeakahana -> 1a12
NesPrgRom:1d67a-1d67e::default -> 1a0e
NesPrgRom:1d67f-1d682:NpcDialog_5b:028 changewoman -> 1e03
NesPrgRom:1d683-1d686::02a changesoldier -> 1e0a
NesPrgRom:1d687-1d68a::02b changestom -> 1a0d
NesPrgRom:1d68b-1d68e::029 changeakahana -> 1e03
NesPrgRom:1d690-1d694::022 NOT -> 1a05
NesPrgRom:1d695-1d696::Set 022
NesPrgRom:1d697-1d69b::default -> 1a06
NesPrgRom:1d69c-1d69f:NpcDialog_5c:028 changewoman -> 1e05
NesPrgRom:1d6a0-1d6a3::02a changesoldier -> 1e0c
NesPrgRom:1d6a4-1d6a7::02b changestom -> 1e05
NesPrgRom:1d6a8-1d6ab::029 changeakahana -> 1e05
NesPrgRom:1d6ad-1d6b1::023 NOT -> 1a08
NesPrgRom:1d6b2-1d6b3::Set 023
NesPrgRom:1d6b4-1d6b8::default -> 1a07
NesPrgRom:1d6b9-1d6bc:NpcDialog_63:
NesPrgRom:1d6be-1d6c2::default -> 0c00
NesPrgRom:1d6c3-1d6c6:NpcDialog_69:
NesPrgRom:1d6c8-1d6cc::default -> 0c02 (action 18)
NesPrgRom:1d6cd-1d6d0:NpcDialog_16:028 changewoman -> 1501
NesPrgRom:1d6d1-1d6d4::02a changesoldier -> 1502
NesPrgRom:1d6d5-1d6d8::02b changestom -> 1501
NesPrgRom:1d6d9-1d6dc::029 changeakahana -> 1500
NesPrgRom:1d6e4-1d6e8::; 00 18 Brynmaer\\ndefault -> 0201
NesPrgRom:1d6e9-1d6ed::; 05 57 Waterfall Cave 4\\n035 -> 0d01 (action 19)
NesPrgRom:1d6ee-1d6ef::Set 034
NesPrgRom:1d6f0-1d6f4::default -> 0d04
NesPrgRom:1d6f5-1d6f9::; 11 8c Shyron\\n02d -> 1409
NesPrgRom:1d6fa-1d6fe::036 NOT -> 1407
NesPrgRom:1d6ff-1d700::Set 036
NesPrgRom:1d701-1d705::default -> 1408
NesPrgRom:1d706-1d707::Set 036 (UNUSED)
NesPrgRom:1d708-1d70b:NpcDialog_70:
NesPrgRom:1d70d-1d711::0e0 NOT spoken to dead akahana -> 1900
NesPrgRom:1d712-1d713::Set 0e0 spoken to dead akahana
NesPrgRom:1d714-1d718::default -> 2010
NesPrgRom:1d719-1d71c:NpcDialog_60:028 changewoman -> 1505
NesPrgRom:1d71d-1d720::02a changesoldier -> 1505
NesPrgRom:1d721-1d724::02b changestom -> 1506
NesPrgRom:1d725-1d728::029 changeakahana -> 1505
NesPrgRom:1d730-1d734::; 00 1e Stom House\\n041 -> 0305
NesPrgRom:1d735-1d739::2f7 -> 0306
NesPrgRom:1d73a-1d73e::default -> 0304
NesPrgRom:1d73f-1d743::; 0f ec Swan - Stom Hut\\ndefault -> 130f (action 02)
NesPrgRom:1d744-1d745::Set 061
NesPrgRom:1d746-1d74a::; 16 8c Shyron\\n027 shyron massacre -> 1903 (action 04)
NesPrgRom:1d74b-1d74f::02d -> 140d -> @ 16
NesPrgRom:1d750-1d754::default -> 140c -> @ 16
NesPrgRom:1d755-1d758:NpcDialog_5e:028 changewoman -> 150c
NesPrgRom:1d759-1d75c::02a changesoldier -> 150c
NesPrgRom:1d75d-1d760::02b changestom -> 150c
NesPrgRom:1d761-1d764::029 changeakahana -> 150c
NesPrgRom:1d76c-1d770::; 00 10 Zebu Cave\\n00d leaf villagers rescued -> 001d
NesPrgRom:1d771-1d775::038 leaf abducted -> 001c
NesPrgRom:1d776-1d77a::039 learned refresh -> 001d
NesPrgRom:1d77b-1d77f::00a windmill key used -> 001b (action 03)
NesPrgRom:1d780-1d781::Set 039 learned refresh
NesPrgRom:1d782-1d786::03a NOT talked to zebu in cave -> 001a
NesPrgRom:1d787-1d788::Set 03a talked to zebu in cave
NesPrgRom:1d789-1d78d::default -> 001d
NesPrgRom:1d78e-1d792::; 22 f2 Shyron - Temple\\n02d -> 1603
NesPrgRom:1d793-1d797::03b NOT -> 1417 (action 11)
NesPrgRom:1d798-1d799::Set 03b talked to zebu in shyron
NesPrgRom:1d79a-1d79e::default -> 1418
NesPrgRom:1d79f-1d7a3::; 33 aa Goa Fortress - Zebu\\ndefault -> 1801 (action 17)
NesPrgRom:1d7a4-1d7a5::Set 055 zebu rescued
NesPrgRom:1d7a6-1d7a9:NpcDialog_5f:028 changewoman -> 1503
NesPrgRom:1d7aa-1d7ad::02a changesoldier -> 1504
NesPrgRom:1d7ae-1d7b1::02b changestom -> 1503
NesPrgRom:1d7b2-1d7b5::029 changeakahana -> 1503
NesPrgRom:1d7c1-1d7c5::; 00 1e Stom House\\ndefault -> 0302
NesPrgRom:1d7c6-1d7ca::; 05 21 Mt Sabre West - Upper\\n03f learned teleport -> 050d
NesPrgRom:1d7cb-1d7cf::04e tornado bracelet -> 050b (action 03) -> @ 05
NesPrgRom:1d7d0-1d7d1::Set 03f learned teleport
NesPrgRom:1d7d2-1d7d6::default -> 050a -> @ 05
NesPrgRom:1d7d7-1d7db::; 16 f3 Shyron - Training Hall\\n02d -> 1605
NesPrgRom:1d7dc-1d7e0::; 1b f2 Shyron - Temple\\n040 -> 140b -> @ 16
NesPrgRom:1d7e1-1d7e5::default -> 140a -> @ 16
NesPrgRom:1d7e6-1d7e7::Set 040
NesPrgRom:1d7e8-1d7ec::; 27 ac Goa Fortress - Tornel\\ndefault -> 1803 (action 17)
NesPrgRom:1d7ed-1d7ee::Set 056 tornel rescued
NesPrgRom:1d7ef-1d7f2:NpcDialog_62:028 changewoman -> 1507
NesPrgRom:1d7f3-1d7f6::02a changesoldier -> 1508
NesPrgRom:1d7f7-1d7fa::02b changestom -> 1507
NesPrgRom:1d7fb-1d7fe::029 changeakahana -> 1507
NesPrgRom:1d808-1d80c::; 00 e1 Portoa - Asina Room\\n03c -> 0b03
NesPrgRom:1d80d-1d811::01e NOT -> 0b00 (action 10)
NesPrgRom:1d812-1d813::Set 01e
NesPrgRom:1d814-1d818::default -> 0b02
NesPrgRom:1d819-1d81d::; 11 f4 Shyron - Hospital\\n; 11 f2 Shyron - Temple\\n02d -> 1607
NesPrgRom:1d81e-1d822::03b -> 1412 -> @ 11
NesPrgRom:1d823-1d827::03d NOT -> 1410 -> @ 11
NesPrgRom:1d828-1d829::Set 03d
NesPrgRom:1d82a-1d82e::default -> 1411 -> @ 11
NesPrgRom:1d82f-1d833::; 27 b9 Goa Fortress - Asina\\ndefault -> 1805 (action 17)
NesPrgRom:1d834-1d835::Set 057
NesPrgRom:1d836-1d839:NpcDialog_7e:; NOTE these are glitched - the location table points to different\\n; locations than are actually disjoint - the tavern one bleeds into\\n; the dance hall once, setting random flags.  But it doesn't look like\\n; it's actually use there.
NesPrgRom:1d843-1d847::; 00 ef Swan - Tavern --- UNUSED\\ndefault -> 1306 (action 13)
NesPrgRom:1d848-1d84c::; 05 f1 Swan - Dance Hall\\ndefault -> 1301
NesPrgRom:1d84d-1d851::; 0a 62 Joel - Lighthouse\\n0a4 woke kensu -> 0f18 (action 0a)
NesPrgRom:1d852-1d853::Set 075 talked to kensu in lighthouse
NesPrgRom:1d854-1d858::default -> 1f00
NesPrgRom:1d859-1d85d::; 16 ba Goa Fortress - Kensu\\ndefault -> 1807 (action 14)
NesPrgRom:1d85e-1d85f::Set 0d8 kensu rescued
NesPrgRom:1d860-1d863:NpcDialog_68:
NesPrgRom:1d865-1d869::default -> 1101
NesPrgRom:1d86a-1d86b::Set 09b
NesPrgRom:1d86c-1d86f:NpcDialog_6b:
NesPrgRom:1d871-1d875::default -> 1f00
NesPrgRom:1d876-1d879:NpcDialog_6d:
NesPrgRom:1d87f-1d883::; 00 ef Swan - Tavern\\n070 kensu paralyzed in tavern -> 1306 (action 13)
NesPrgRom:1d884-1d885::Set 072 found kensu in tavern
NesPrgRom:1d886-1d88a::default -> 1305
NesPrgRom:1d88b-1d88f::; 0c 8e Goa\\n026 NOT entered shyron -> 1e1a
NesPrgRom:1d890-1d891::Set 076
NesPrgRom:1d892-1d896::default -> 170e
NesPrgRom:1d897-1d89a:NpcDialog_6c:
NesPrgRom:1d89c-1d8a0::03e found kensu in dance hall -> 1301
NesPrgRom:1d8a1-1d8a5::071 kensu paralyzed in dance hall -> 1306 (action 16)
NesPrgRom:1d8a6-1d8a7::Set 03e found kensu in dance hall
NesPrgRom:1d8a8-1d8ac::default -> 1303
NesPrgRom:1d8ad-1d8b0:NpcDialog_75:
NesPrgRom:1d8b2-1d8b6::default -> 1806 (action 05)
NesPrgRom:1d8b7-1d8ba:NpcDialog_8e:
NesPrgRom:1d8bc-1d8c0::0ed NOT -> 1b0c
NesPrgRom:1d8c1-1d8c2::Set 0ed
NesPrgRom:1d8c3-1d8c7::default -> 1b0d
NesPrgRom:1d8c8-1d8cb:NpcDialog_84:
NesPrgRom:1d8cd-1d8d1::default -> 100f
NesPrgRom:1d8d2-1d8d5:NpcDialog_83:
NesPrgRom:1d8d7-1d8db::082 NOT -> 1b01 (action 03)
NesPrgRom:1d8dc-1d8dd::Set 079
NesPrgRom:1d8de-1d8df::Set 082
NesPrgRom:1d8e0-1d8e4::default -> 1b02
NesPrgRom:1d8e5-1d8e8:NpcDialog_c3:
NesPrgRom:1d8ea-1d8ee::017 -> 0e03 (action 1a)
NesPrgRom:1d8ef-1d8f3::default -> 0e00 (action 1b)
NesPrgRom:1d8f4-1d903:TelepathyLocations:
NesPrgRom:1d9f4-1d9f5:TelepathyTable:00 tornel 0
NesPrgRom:1d9f6-1d9f7::01 zebu 0
NesPrgRom:1d9f8-1d9f9::02 asina 0
NesPrgRom:1d9fa-1d9fb::03 kensu 0
NesPrgRom:1d9fc-1d9fd::04 tornel 1
NesPrgRom:1d9fe-1d9ff::05 zebu 1
NesPrgRom:1da00-1da01::06 asina 1
NesPrgRom:1da02-1da03::07 kensu 1
NesPrgRom:1da04-1da05::08 tornel 2
NesPrgRom:1da06-1da07::09 zebu 2
NesPrgRom:1da08-1da09::0a asina 2
NesPrgRom:1da0a-1da0b::0b kensu 2
NesPrgRom:1da0c-1da0d::0c tornel 3
NesPrgRom:1da0e-1da0f::0d zebu 3
NesPrgRom:1da10-1da11::0e asina 3
NesPrgRom:1da12-1da13::0f kensu 3
NesPrgRom:1da14-1da15::10 tornel 4
NesPrgRom:1da16-1da17::11 zebu 4
NesPrgRom:1da18-1da19::12 asina 4
NesPrgRom:1da1a-1da1b::13 kensu 4
NesPrgRom:1da1c-1da1d::14 tornel 5
NesPrgRom:1da1e-1da1f::15 zebu 5
NesPrgRom:1da20-1da21::16 asina 5
NesPrgRom:1da22-1da23::17 kensu 5
NesPrgRom:1da24-1da25::18 tornel 6
NesPrgRom:1da26-1da27::19 zebu 6
NesPrgRom:1da28-1da29::1a asina 6
NesPrgRom:1da2a-1da2b::1b kensu 6
NesPrgRom:1da2c-1da2d:Telepathy_InsufficientMP:; 200e messages -> magic power too low\\ntornel
NesPrgRom:1da2e-1da2f::zebu
NesPrgRom:1da30-1da31::asina
NesPrgRom:1da32-1da33::kensu
NesPrgRom:1da34-1da35:Telepathy_RestoreMagic:; "I will restore your magic" messages\\ntornel 1d01
NesPrgRom:1da36-1da37::zebu   1c0d
NesPrgRom:1da38-1da39::asina  1d0e
NesPrgRom:1da3a-1da3b::kensu  1d1c
NesPrgRom:1da3c-1da3d:Telepathy_Rude:; "Don't rely on others so much"\\ntornel 1d02
NesPrgRom:1da3e-1da3f::zebu   1c0e
NesPrgRom:1da40-1da41::asina  1d0f
NesPrgRom:1da42-1da43::kensu  1d1d
NesPrgRom:1da44-1da45:Telepathy_Default:; Default message when there's no new info to give,\\n; or the player is underleveled.\\ntornel 050c
NesPrgRom:1da46-1da47::zebu   1313
NesPrgRom:1da48-1da49::asina  1a0a
NesPrgRom:1da4a-1da4b::kensu  1304
NesPrgRom:1da4c-1da4d:Telepathy_01_Zebu0:; 01 zebu 0\\n04e tornado bracelet (branch)
NesPrgRom:1da4e-1da4f::1c00
NesPrgRom:1da50-1da51::1c01
NesPrgRom:1da52-1da53:Telepathy_05_Zebu1:; 05 zebu 1 (fall-through)\\n077 flame bracelet (last)
NesPrgRom:1da54-1da55::1c02
NesPrgRom:1da56-1da57:Telepathy_09_Zebu2:; 09 zebu 2\\n01e queen revealed as asina
NesPrgRom:1da58-1da59::1c03
NesPrgRom:1da5a-1da5b::1c04
NesPrgRom:1da5c-1da5d:Telepathy_0d_Zebu3:; 0d zebu 3, 11 zebu 4\\n075 talked to kensu in lighthouse
NesPrgRom:1da5e-1da5f::1c05
NesPrgRom:1da60-1da61::063 learned change
NesPrgRom:1da62-1da63::1c06
NesPrgRom:1da64-1da65::027 shyron massacre
NesPrgRom:1da66-1da67::1c07
NesPrgRom:1da68-1da69::1c08
NesPrgRom:1da6a-1da6b:Telepathy_15_Zebu5:; 15 zebu 5\\n055 zebu rescued
NesPrgRom:1da6c-1da6d::1c09
NesPrgRom:1da6e-1da6f::02e deo's pendant
NesPrgRom:1da70-1da71::1c0a
NesPrgRom:1da72-1da73:Telepathy_19_Zebu6:; 19 zebu 6\\n079 bow of truth
NesPrgRom:1da74-1da75::1c0b
NesPrgRom:1da76-1da77::05e draygon 2 defeated
NesPrgRom:1da78-1da79::1c0c
NesPrgRom:1da7a-1da7b::1c0a
NesPrgRom:1da7c-1da7d:Telepathy_00_Tornel0:; 00 tornel 0\\n041 ball of fire
NesPrgRom:1da7e-1da7f::1c13
NesPrgRom:1da80-1da81::1c14
NesPrgRom:1da82-1da83:Telepathy_04_Tornel1:; 04 tornel 1\\n077 flame bracelet
NesPrgRom:1da84-1da85::1c15
NesPrgRom:1da86-1da87:Telepathy_08_Tornel2:; 08 tornel 2\\n07b ball of water
NesPrgRom:1da88-1da89::1c16
NesPrgRom:1da8a-1da8b::1c17
NesPrgRom:1da8c-1da8d::07a blizzard bracelet
NesPrgRom:1da8e-1da8f::1c18
NesPrgRom:1da90-1da91:Telepathy_0c_Tornel3:; 0c tornel 3, 10 tornel 4\\n013 broken statue
NesPrgRom:1da92-1da93::1c19
NesPrgRom:1da94-1da95::063 change
NesPrgRom:1da96-1da97::1c1a
NesPrgRom:1da98-1da99::027 massacre
NesPrgRom:1da9a-1da9b::1c1b
NesPrgRom:1da9c-1da9d:Telepathy_14_Tornel5:; 14 tornel 5\\n056 rescued tornel
NesPrgRom:1da9e-1da9f::1c1d
NesPrgRom:1daa0-1daa1::065 unslimed kensu
NesPrgRom:1daa2-1daa3::1c1e
NesPrgRom:1daa4-1daa5::07c UNUSED (always false)
NesPrgRom:1daa6-1daa7::1c1c
NesPrgRom:1daa8-1daa9:Telepathy_18_Tornel6:; 18 tornel 6\\n02e deo's pendant
NesPrgRom:1daaa-1daab::1c1f
NesPrgRom:1daac-1daad::079 bow of truth
NesPrgRom:1daae-1daaf::1c1c
NesPrgRom:1dab0-1dab1::05e defeated draygon 2 (always false)
NesPrgRom:1dab2-1dab3::1d00
NesPrgRom:1dab4-1dab5:Telepathy_02_Asina0:; 02 asina 0, 06 asina 1\\n01e queen revealed
NesPrgRom:1dab6-1dab7::1d03
NesPrgRom:1dab8-1dab9:Telepathy_0a_Asina2:; 0a asina 2\\n08b shell flute
NesPrgRom:1daba-1dabb::1d05
NesPrgRom:1dabc-1dabd::010 turned in kirisa plant
NesPrgRom:1dabe-1dabf::1d04
NesPrgRom:1dac0-1dac1:Telepathy_0e_Asina3:; 0e asina 3, 12 asina 4\\n063 change
NesPrgRom:1dac2-1dac3::1d07
NesPrgRom:1dac4-1dac5::1d06
NesPrgRom:1dac6-1dac7::027 massacre
NesPrgRom:1dac8-1dac9::1d08
NesPrgRom:1daca-1dacb::1d09
NesPrgRom:1dacc-1dacd:Telepathy_16_Asina5:; 16 asina 5\\n057 asina rescued
NesPrgRom:1dace-1dacf::1d0a
NesPrgRom:1dad0-1dad1::07d bow of sun
NesPrgRom:1dad2-1dad3::1d0b
NesPrgRom:1dad4-1dad5:Telepathy_1a_Asina6:; 1a asina 6\\n07d bow of sun
NesPrgRom:1dad6-1dad7::1d0b
NesPrgRom:1dad8-1dad9::079 bow of truth
NesPrgRom:1dada-1dadb::1d0c
NesPrgRom:1dadc-1dadd::05e draygon 2 defeated (always false)
NesPrgRom:1dade-1dadf::1d0d
NesPrgRom:1dae0-1dae1:Telepathy_03_Kensu0:; 03 kensu 0, 07 kensu 1, 0b kensu 2, 0f kensu 3, 13 kensu 4\\n01e recover
NesPrgRom:1dae2-1dae3::1d14
NesPrgRom:1dae4-1dae5::1d15
NesPrgRom:1dae6-1dae7::063 change
NesPrgRom:1dae8-1dae9::1d16
NesPrgRom:1daea-1daeb::05f sword of thunder
NesPrgRom:1daec-1daed::1d17
NesPrgRom:1daee-1daef::027 massacre
NesPrgRom:1daf0-1daf1::1d18
NesPrgRom:1daf2-1daf3::1d19
NesPrgRom:1daf4-1daf5:Telepathy_17_Kensu5:; 17 kensu 5 (fall-through)\\n065 unslimed kensu
NesPrgRom:1daf6-1daf7::1d14
NesPrgRom:1daf8-1daf9:Telepathy_1b_Kensu6:; 1b kensu 6\\n079 bow of truth
NesPrgRom:1dafa-1dafb::1d1a
NesPrgRom:1dafc-1dafd::05e defeated draygon 2 (always false)
NesPrgRom:1dafe-1daff::1d1b
NesPrgRom:1db00-1db01:ItemGetDataTable:; Another data table\\n00 sword of wind
NesPrgRom:1db02-1db03::01 sword of fire
NesPrgRom:1db04-1db05::02 sword of water
NesPrgRom:1db06-1db07::03 sword of thunder
NesPrgRom:1db08-1db09::04 crystalis
NesPrgRom:1db0a-1db0b::05 ball of wind
NesPrgRom:1db0c-1db0d::06 tornado bracelet
NesPrgRom:1db0e-1db0f::07 ball of fire
NesPrgRom:1db10-1db11::08 flame bracelet
NesPrgRom:1db12-1db13::09 ball of water
NesPrgRom:1db14-1db15::0a blizzard bracelet
NesPrgRom:1db16-1db17::0b ball of thunder
NesPrgRom:1db18-1db19::0c storm bracelet
NesPrgRom:1db1a-1db1b::0d carapace shield
NesPrgRom:1db1c-1db1d::0e bronze shield
NesPrgRom:1db1e-1db1f::0f platinum shield
NesPrgRom:1db20-1db21::10 mirrored shield
NesPrgRom:1db22-1db23::11 ceramic shield
NesPrgRom:1db24-1db25::12 sacred shield
NesPrgRom:1db26-1db27::13 battle shield
NesPrgRom:1db28-1db29::14 psycho shield
NesPrgRom:1db2a-1db2b::15 tanned hide
NesPrgRom:1db2c-1db2d::16 leather armor
NesPrgRom:1db2e-1db2f::17 bronze armor
NesPrgRom:1db30-1db31::18 platinum armor
NesPrgRom:1db32-1db33::19 soldier suit
NesPrgRom:1db34-1db35::1a ceramic suit
NesPrgRom:1db36-1db37::1b battle armor
NesPrgRom:1db38-1db39::1c psycho armor
NesPrgRom:1db3a-1db3b::1d medical herb
NesPrgRom:1db3c-1db3d::1e antidote
NesPrgRom:1db3e-1db3f::1f lysis plant
NesPrgRom:1db40-1db41::20 fruit of lime
NesPrgRom:1db42-1db43::21 fruit of power
NesPrgRom:1db44-1db45::22 magic ring
NesPrgRom:1db46-1db47::23 fruit of repun
NesPrgRom:1db48-1db49::24 warp boots
NesPrgRom:1db4a-1db4b::25 statue of onyx
NesPrgRom:1db4c-1db4d::26 opel statue
NesPrgRom:1db4e-1db4f::27 insect flute
NesPrgRom:1db50-1db51::28 flute of lime
NesPrgRom:1db52-1db53::29 gas mask
NesPrgRom:1db54-1db55::2a power ring
NesPrgRom:1db56-1db57::2b warrior ring
NesPrgRom:1db58-1db59::2c iron necklace
NesPrgRom:1db5a-1db5b::2d deos pendant
NesPrgRom:1db5c-1db5d::2e rabbit boots
NesPrgRom:1db5e-1db5f::2f leather boots
NesPrgRom:1db60-1db61::30 shield ring
NesPrgRom:1db62-1db63::31 alarm flute
NesPrgRom:1db64-1db65::32 windmill key
NesPrgRom:1db66-1db67::33 key to prison
NesPrgRom:1db68-1db69::34 key to styx
NesPrgRom:1db6a-1db6b::35 fog lamp
NesPrgRom:1db6c-1db6d::36 shell flute
NesPrgRom:1db6e-1db6f::37 eye glasses
NesPrgRom:1db70-1db71::38 broken statue
NesPrgRom:1db72-1db73::39 glowing lamp
NesPrgRom:1db74-1db75::3a statue of gold
NesPrgRom:1db76-1db77::3b love pendant
NesPrgRom:1db78-1db79::3c kirisa plant
NesPrgRom:1db7a-1db7b::3d ivory statue
NesPrgRom:1db7c-1db7d::3e bow of moon
NesPrgRom:1db7e-1db7f::3f bow of sun
NesPrgRom:1db80-1db81::40 bow of truth
NesPrgRom:1db82-1db83::41 refresh
NesPrgRom:1db84-1db85::42 paralysis
NesPrgRom:1db86-1db87::43 telepathy
NesPrgRom:1db88-1db89::44 teleport
NesPrgRom:1db8a-1db8b::45 recover
NesPrgRom:1db8c-1db8d::46 barrier
NesPrgRom:1db8e-1db8f::47 change
NesPrgRom:1db90-1db91::48 flight
NesPrgRom:1db92-1db93::49
NesPrgRom:1db94-1db95::4a
NesPrgRom:1db96-1db97::4b
NesPrgRom:1db98-1db99::4c
NesPrgRom:1db9a-1db9b::4d
NesPrgRom:1db9c-1db9d::4e
NesPrgRom:1db9e-1db9f::4f
NesPrgRom:1dba0-1dba1::50 medical herb
NesPrgRom:1dba2-1dba3::51 sacred shield
NesPrgRom:1dba4-1dba5::52 medical herb
NesPrgRom:1dba6-1dba7::53 medical herb
NesPrgRom:1dba8-1dba9::54 magic ring
NesPrgRom:1dbaa-1dbab::55 medical herb
NesPrgRom:1dbac-1dbad::56 medical herb
NesPrgRom:1dbae-1dbaf::57 medical herb
NesPrgRom:1dbb0-1dbb1::58 magic ring
NesPrgRom:1dbb2-1dbb3::59 medical herb
NesPrgRom:1dbb4-1dbb5::5a fruit of power
NesPrgRom:1dbb6-1dbb7::5b flute of lime
NesPrgRom:1dbb8-1dbb9::5c lysis plant
NesPrgRom:1dbba-1dbbb::5d lysis plant
NesPrgRom:1dbbc-1dbbd::5e antidote
NesPrgRom:1dbbe-1dbbf::5f antidote
NesPrgRom:1dbc0-1dbc1::60 antidote
NesPrgRom:1dbc2-1dbc3::61 fruit of power
NesPrgRom:1dbc4-1dbc5::62 fruit of power
NesPrgRom:1dbc6-1dbc7::63 opel statue
NesPrgRom:1dbc8-1dbc9::64 fruit of power
NesPrgRom:1dbca-1dbcb::65 magic ring
NesPrgRom:1dbcc-1dbcd::66 fruit of repun
NesPrgRom:1dbce-1dbcf::67 magic ring
NesPrgRom:1dbd0-1dbd1::68 magic ring
NesPrgRom:1dbd2-1dbd3::69 magic ring
NesPrgRom:1dbd4-1dbd5::6a warp boots
NesPrgRom:1dbd6-1dbd7::6b magic ring
NesPrgRom:1dbd8-1dbd9::6c magic ring
NesPrgRom:1dbda-1dbdb::6d opel statue
NesPrgRom:1dbdc-1dbdd::6e warp boots
NesPrgRom:1dbde-1dbdf::6f magic ring
NesPrgRom:1dbe0-1dbe1::70 mimic
NesPrgRom:1dbe2-1dbe3:ItemUseDataTable:
NesPrgRom:1dc1c-1dc1d::1d medical herb
NesPrgRom:1dc1e-1dc1f::1e antidote
NesPrgRom:1dc20-1dc21::1f lysis plant
NesPrgRom:1dc22-1dc23::20 fruit of lime
NesPrgRom:1dc24-1dc25::21 fruit of power
NesPrgRom:1dc26-1dc27::22 magic ring
NesPrgRom:1dc28-1dc29::23 fruit of repun
NesPrgRom:1dc2a-1dc2b::24 warp boots
NesPrgRom:1dc2c-1dc2d::25 statue of onyx
NesPrgRom:1dc2e-1dc2f::26 opel statue
NesPrgRom:1dc30-1dc31::27 insect flute
NesPrgRom:1dc32-1dc33::28 flute of lime
NesPrgRom:1dc44-1dc45::31 alarm flute
NesPrgRom:1dc46-1dc47::32 windmill key
NesPrgRom:1dc48-1dc49::33 key to prison
NesPrgRom:1dc4a-1dc4b::34 key to styx
NesPrgRom:1dc4c-1dc4d::35 fog lamp
NesPrgRom:1dc4e-1dc4f::36 shell flute
NesPrgRom:1dc50-1dc51::37 eye glasses
NesPrgRom:1dc54-1dc55::39 glowing lamp
NesPrgRom:1dc56-1dc57::3a statue of gold
NesPrgRom:1dc58-1dc59::3b love pendant
NesPrgRom:1dc5a-1dc5b::3c kirisa plant
NesPrgRom:1dc5c-1dc5d::3d ivory statue
NesPrgRom:1dc5e-1dc5f::3e bow of moon
NesPrgRom:1dc60-1dc61::3f bow of sun
NesPrgRom:1dc62-1dc63::40 bow of truth
NesPrgRom:1dc80-1dc81::4f
NesPrgRom:1dc82-1dc83:TreasureChestSpawnTable:
NesPrgRom:1dc86-1dc87::02
NesPrgRom:1dc88-1dc89::03
NesPrgRom:1dc8c-1dc8d::05
NesPrgRom:1dc8e-1dc8f::06
NesPrgRom:1dc96-1dc97::0a
NesPrgRom:1dc9a-1dc9b::0c
NesPrgRom:1dcaa-1dcab::14
NesPrgRom:1dcb8-1dcb9::1b
NesPrgRom:1dcba-1dcbb::1c
NesPrgRom:1dcbc-1dcbd::1d
NesPrgRom:1dcbe-1dcbf::1e
NesPrgRom:1dcc0-1dcc1::1f
NesPrgRom:1dcc2-1dcc3::20
NesPrgRom:1dcc4-1dcc5::21
NesPrgRom:1dcc6-1dcc7::22
NesPrgRom:1dcc8-1dcc9::23
NesPrgRom:1dcca-1dccb::24
NesPrgRom:1dccc-1dccd::25
NesPrgRom:1dcce-1dccf::26
NesPrgRom:1dcd2-1dcd3::28
NesPrgRom:1dcd6-1dcd7::2a
NesPrgRom:1dcd8-1dcd9::2b
NesPrgRom:1dcda-1dcdb::2c
NesPrgRom:1dce0-1dce1::2f
NesPrgRom:1dce8-1dce9::33
NesPrgRom:1dcec-1dced::35
NesPrgRom:1dcf8-1dcf9::3b
NesPrgRom:1dcfa-1dcfb::3c
NesPrgRom:1dcfc-1dcfd::3d
NesPrgRom:1dd00-1dd01::3f
NesPrgRom:1dd22-1dd23::50
NesPrgRom:1dd26-1dd27::52
NesPrgRom:1dd28-1dd29::53
NesPrgRom:1dd2a-1dd2b::54
NesPrgRom:1dd2c-1dd2d::55
NesPrgRom:1dd2e-1dd2f::56
NesPrgRom:1dd30-1dd31::57
NesPrgRom:1dd32-1dd33::58
NesPrgRom:1dd36-1dd37::5a
NesPrgRom:1dd38-1dd39::5b
NesPrgRom:1dd3a-1dd3b::5c
NesPrgRom:1dd3c-1dd3d::5d
NesPrgRom:1dd3e-1dd3f::5e
NesPrgRom:1dd40-1dd41::5f
NesPrgRom:1dd42-1dd43::60
NesPrgRom:1dd46-1dd47::62
NesPrgRom:1dd48-1dd49::63
NesPrgRom:1dd4a-1dd4b::64
NesPrgRom:1dd4c-1dd4d::65
NesPrgRom:1dd4e-1dd4f::66
NesPrgRom:1dd54-1dd55::69
NesPrgRom:1dd56-1dd57::6a
NesPrgRom:1dd58-1dd59::6b
NesPrgRom:1dd5a-1dd5b::6c
NesPrgRom:1dd5c-1dd5d::6d
NesPrgRom:1dd5e-1dd5f::6e
NesPrgRom:1dd60-1dd61::6f
NesPrgRom:1dd66-1dd75:ItemGetTable:0
NesPrgRom:1dd76-1dd85::1
NesPrgRom:1dd86-1dd95::2
NesPrgRom:1dd96-1dda5::3
NesPrgRom:1dda6-1ddb5::4
NesPrgRom:1ddb6-1ddc5::5
NesPrgRom:1ddc6-1ddd5::6
NesPrgRom:1ddd6-1dde5::7
NesPrgRom:1dde6-1dde7:ItemGetData_6d:
NesPrgRom:1ddea-1ddeb::Set 0e6 chest6dopel statue
NesPrgRom:1dded-1ddee:ItemGetData_6e:
NesPrgRom:1ddf1-1ddf2::Set 0e5 chest6ewarp boots
NesPrgRom:1ddf4-1ddf5:ItemGetData_3c:
NesPrgRom:1ddf8-1ddf9::Set 0e4 chest3ckirisa plant
NesPrgRom:1ddfb-1ddfc:ItemGetData_69:
NesPrgRom:1ddff-1de00::Set 0d2 chest69magic ring
NesPrgRom:1de02-1de03:ItemGetData_5b:
NesPrgRom:1de06-1de07::Set 0d4 chest5bflute of lime
NesPrgRom:1de09-1de0a:ItemGetData_1d:
NesPrgRom:1de0d-1de0e::Set 0aa chest1dmedical herb
NesPrgRom:1de10-1de11:ItemGetData_50:
NesPrgRom:1de14-1de15::Set 0ab chest50merical herb
NesPrgRom:1de17-1de18:ItemGetData_52:
NesPrgRom:1de1b-1de1c::Set 0ad chest52medical herb
NesPrgRom:1de1e-1de1f:ItemGetData_53:
NesPrgRom:1de22-1de23::Set 0ae chest53medical herb
NesPrgRom:1de25-1de26:ItemGetData_54:
NesPrgRom:1de29-1de2a::Set 0af chest54magic ring
NesPrgRom:1de2c-1de2d:ItemGetData_55:
NesPrgRom:1de30-1de31::Set 0b0 chest55medical herb
NesPrgRom:1de33-1de34:ItemGetData_56:
NesPrgRom:1de37-1de38::Set 0b1 chest56medical herb
NesPrgRom:1de3a-1de3b:ItemGetData_57:
NesPrgRom:1de3e-1de3f::Set 0b2 chest57medical herb
NesPrgRom:1de41-1de42:ItemGetData_58:
NesPrgRom:1de45-1de46::Set 0b3 chest58magic ring
NesPrgRom:1de48-1de49:ItemGetData_59:
NesPrgRom:1de4c-1de4d::Set 0b4 chest59medical herb
NesPrgRom:1de4f-1de50:ItemGetData_5a:
NesPrgRom:1de53-1de54::Set 0b5 chest5afruit of power
NesPrgRom:1de56-1de57:ItemGetData_1f:
NesPrgRom:1de5a-1de5b::Set 0b6 chest1flysis plant
NesPrgRom:1de5d-1de5e:ItemGetData_5c:
NesPrgRom:1de61-1de62::Set 0b7 chest5clysis plant
NesPrgRom:1de64-1de65:ItemGetData_5d:
NesPrgRom:1de68-1de69::Set 0b8 chest5dlysis plant
NesPrgRom:1de6b-1de6c:ItemGetData_1e:
NesPrgRom:1de6f-1de70::Set 0b9 chest1eantidote
NesPrgRom:1de72-1de73:ItemGetData_5e:
NesPrgRom:1de76-1de77::Set 0ba chest5eantidote
NesPrgRom:1de79-1de7a:ItemGetData_5f:
NesPrgRom:1de7d-1de7e::Set 0bb chest5fantidote
NesPrgRom:1de80-1de81:ItemGetData_60:
NesPrgRom:1de84-1de85::Set 0bc chest60antidote
NesPrgRom:1de87-1de88:ItemGetData_20:
NesPrgRom:1de8b-1de8c::Set 0bd chest20fruit of lime
NesPrgRom:1de8e-1de8f:ItemGetData_21:
NesPrgRom:1de92-1de93::Set 0be chest21fruit of power
NesPrgRom:1de95-1de96:ItemGetData_61:
NesPrgRom:1de99-1de9a::Set 10c defeated vampire 2
NesPrgRom:1de9c-1de9d:ItemGetData_62:
NesPrgRom:1dea0-1dea1::Set 0bf chest62fruit of power
NesPrgRom:1dea3-1dea4:ItemGetData_63:
NesPrgRom:1dea7-1dea8::Set 0c0 chest63opel statue
NesPrgRom:1deaa-1deab:ItemGetData_64:
NesPrgRom:1deae-1deaf::Set 0c1 chest64fruit of power
NesPrgRom:1deb1-1deb2:ItemGetData_22:
NesPrgRom:1deb5-1deb6::Set 0c2 chest22magic ring
NesPrgRom:1deb8-1deb9:ItemGetData_65:
NesPrgRom:1debc-1debd::Set 0c3 chest65magic ring
NesPrgRom:1debf-1dec0:ItemGetData_66:
NesPrgRom:1dec3-1dec4::Set 0c4 chest66fruit of repun
NesPrgRom:1dec6-1dec7:ItemGetData_6b:
NesPrgRom:1deca-1decb::Set 0c5 chest6bmagic ring
NesPrgRom:1decd-1dece:ItemGetData_6c:
NesPrgRom:1ded1-1ded2::Set 0c6 chest6cmagic ring
NesPrgRom:1ded4-1ded5:ItemGetData_23:
NesPrgRom:1ded8-1ded9::Set 106 defeated sabera 2
NesPrgRom:1deda-1dedb::Set 0c7 chest23fruit of repun
NesPrgRom:1dedd-1dede:ItemGetData_24:
NesPrgRom:1dee1-1dee2::Set 0c8 chest24warp boots
NesPrgRom:1dee4-1dee5:ItemGetData_6a:
NesPrgRom:1dee8-1dee9::Set 0c9 chest6awarp boots
NesPrgRom:1deeb-1deec:ItemGetData_3d:
NesPrgRom:1deef-1def0::Set 108 defeated karmine
NesPrgRom:1def1-1def2::Set 024 generals defeated
NesPrgRom:1def3-1def4::Set 0ca chest3divory statue
NesPrgRom:1def6-1def7:ItemGetData_2a:
NesPrgRom:1defa-1defb::Set 0cb chest2apower ring
NesPrgRom:1defd-1defe:ItemGetData_15:
NesPrgRom:1df01-1df02::Clear 000
NesPrgRom:1df04-1df05:ItemGetData_1c:
NesPrgRom:1df08-1df09::Set 10b defeated draygon 1
NesPrgRom:1df0a-1df0b::Set 0cc chest1cpsycho armor
NesPrgRom:1df0c-1df0d::Set 06c defeated draygon 1
NesPrgRom:1df0f-1df10:ItemGetData_14:
NesPrgRom:1df13-1df14::Set 0cd chest14psycho shield
NesPrgRom:1df16-1df17:ItemGetData_1b:
NesPrgRom:1df1a-1df1b::Set 0df chest1bbattle armor
NesPrgRom:1df1d-1df1e:ItemGetData_51:
NesPrgRom:1df21-1df22::Set 062 chest51sacred shield
NesPrgRom:1df23-1df24:ItemGetData_33:
NesPrgRom:1df27-1df28::Set 0cf chest33key to prison
NesPrgRom:1df2a-1df2b:ItemGetData_35:
NesPrgRom:1df2e-1df2f::Set 0d1 chest35fog lamp
NesPrgRom:1df31-1df32:ItemGetData_26:
NesPrgRom:1df35-1df36::Set 105 defeated kelbesque 2
NesPrgRom:1df37-1df38::Set 0d3 chest26opel statue
NesPrgRom:1df3a-1df3b:ItemGetData_00:
NesPrgRom:1df3e-1df3f::Set 00b talked to leaf elder
NesPrgRom:1df41-1df42:ItemGetData_01:
NesPrgRom:1df45-1df46::Set 049 fire sword from oak elder
NesPrgRom:1df48-1df49:ItemGetData_02:
NesPrgRom:1df4c-1df4d::Set 017 chest02sword of water
NesPrgRom:1df4f-1df50:ItemGetData_03:
NesPrgRom:1df53-1df54::Set 05f chest03sword of thunder
NesPrgRom:1df56-1df57:ItemGetData_04:
NesPrgRom:1df5a-1df5b::Clear 000
NesPrgRom:1df5d-1df5e:ItemGetData_05:
NesPrgRom:1df61-1df62::Set 087 chest05ball of wind
NesPrgRom:1df64-1df65:ItemGetData_07:
NesPrgRom:1df68-1df69::Set 041
NesPrgRom:1df6a-1df6b::Set 044
NesPrgRom:1df6c-1df6d::Set 101 defeated insect
NesPrgRom:1df6f-1df70:ItemGetData_09:
NesPrgRom:1df73-1df74::Set 103 got item from rage
NesPrgRom:1df75-1df76::Set 01f got ball of water
NesPrgRom:1df77-1df78::Set 020
NesPrgRom:1df79-1df7a::Set 07b
NesPrgRom:1df7c-1df7d:ItemGetData_0b:
NesPrgRom:1df80-1df81::Set 067 defeated mado 1
NesPrgRom:1df83-1df84:ItemGetData_06:
NesPrgRom:1df87-1df88::Set 04e chest06tornado bracelet
NesPrgRom:1df8a-1df8b:ItemGetData_08:
NesPrgRom:1df8e-1df8f::Set 077 chest08flame bracelet
NesPrgRom:1df90-1df91::Set 102 defeated kelbesque 1
NesPrgRom:1df93-1df94:ItemGetData_0a:
NesPrgRom:1df97-1df98::Set 07a chest0ablizzard bracelet
NesPrgRom:1df9a-1df9b:ItemGetData_0c:
NesPrgRom:1df9e-1df9f::Set 078 chest0cstorm bracelet
NesPrgRom:1dfa1-1dfa2:ItemGetData_10:
NesPrgRom:1dfa5-1dfa6::Set 01c
NesPrgRom:1dfa8-1dfa9:ItemGetData_25:
NesPrgRom:1dfac-1dfad::Set 0ce chest25statue of onyx
NesPrgRom:1dfaf-1dfb0:ItemGetData_27:
NesPrgRom:1dfb3-1dfb4::Clear 000 unused
NesPrgRom:1dfb6-1dfb7:ItemGetData_28:
NesPrgRom:1dfba-1dfbb::Set 0d0 chest28flute of lime
NesPrgRom:1dfbd-1dfbe:ItemGetData_2d:
NesPrgRom:1dfc1-1dfc2::Set 02e chest2ddeo's pendant / talk to deo
NesPrgRom:1dfc4-1dfc5:ItemGetData_2e:
NesPrgRom:1dfc8-1dfc9::Set 100 vampire 1 defeated
NesPrgRom:1dfcb-1dfcc:ItemGetData_3b:
NesPrgRom:1dfcf-1dfd0::Set 03c chest3blove pendant
NesPrgRom:1dfd2-1dfd3:ItemGetData_40:
NesPrgRom:1dfd6-1dfd7::Set 079
NesPrgRom:1dfd9-1dfda:ItemGetData_2b:
NesPrgRom:1dfdd-1dfde::Clear 000 unused
NesPrgRom:1dfe0-1dfe1:ItemGetData_2f:
NesPrgRom:1dfe4-1dfe5::Set 0e7 chest2fleather boots
NesPrgRom:1dfe7-1dfe8:ItemGetData_3f:
NesPrgRom:1dfeb-1dfec::Set 07d chest3fbow of sun
NesPrgRom:1dfee-1dfef:ItemGetData_38:
NesPrgRom:1dff2-1dff3::Set 013 sabera defeated
NesPrgRom:1dff5-1dff6:ItemGetData_36:
NesPrgRom:1dff9-1dffa::Set 08b got shell flute
NesPrgRom:1dffc-1dffd:ItemGetData_31:
NesPrgRom:1e000-1e001::Clear 000 unused
NesPrgRom:1e003-1e004:ItemGetData_6f:
NesPrgRom:1e007-1e008::Set 0dc chest6fmagic ring
NesPrgRom:1e00a-1e00b:ItemGetData_70:
NesPrgRom:1e00e-1e00f::Set 0dd UNUSED
NesPrgRom:1e011-1e012:ItemGetData_2c:
NesPrgRom:1e015-1e016::Set 0de chest2ciron necklace
NesPrgRom:1e018-1e019:ItemGetData_29:
NesPrgRom:1e01c-1e01d::Clear 000 unused
NesPrgRom:1e01f-1e020:ItemGetData_32:
NesPrgRom:1e023-1e024::Clear 000 unused
NesPrgRom:1e026-1e027:ItemGetData_12:
NesPrgRom:1e02a-1e02b::Set 107 defeated mado 2
NesPrgRom:1e02d-1e02e:ItemGetData_0d:
NesPrgRom:1e031-1e032::Clear 000 unused
NesPrgRom:1e034-1e035:ItemGetData_45:
NesPrgRom:1e038-1e039::Clear 000 unused
NesPrgRom:1e03b-1e03c:ItemGetData_41:
NesPrgRom:1e03f-1e040::Set 039 learned refresh
NesPrgRom:1e042-1e043:ItemGetData_42:
NesPrgRom:1e046-1e047::Set 037 learned paralysis
NesPrgRom:1e049-1e04a:ItemGetData_43:
NesPrgRom:1e04d-1e04e::Set 00e learned telepathy
NesPrgRom:1e050-1e051:ItemGetData_44:
NesPrgRom:1e054-1e055::Set 03f learned teleport
NesPrgRom:1e057-1e058:ItemGetData_47:
NesPrgRom:1e05b-1e05c::Set 063 learned change
NesPrgRom:1e05e-1e05f:ItemGetData_46:
NesPrgRom:1e062-1e063::Clear 000 unused
NesPrgRom:1e065-1e066:ItemUseData_1d:Expect NPC 63 hurt dolphin
NesPrgRom:1e067-1e068::Message 0c01 (action 02 -> dialog 11 and 0d)
NesPrgRom:1e069-1e06a::Set 025 healed dolphin
NesPrgRom:1e06b-1e06c::; normal usage\\nMessage 2000 (action 05 -> rts)
NesPrgRom:1e06d-1e06e::Clear 000 unused
NesPrgRom:1e06f-1e070:ItemUseData_21:Message 2001 (action 05 -> rts)
NesPrgRom:1e073-1e074:ItemUseData_20:Message 2002 (action 05 -> rts)
NesPrgRom:1e077-1e078:ItemUseData_1e:Message 2002 (action 05 -> rts)
NesPrgRom:1e07b-1e07c:ItemUseData_26:action 05 (rts)
NesPrgRom:1e07f:ItemUseData_27:UNUSED (wanted location $1a)
NesPrgRom:1e080-1e081::action 03 (rts)
NesPrgRom:1e084-1e085:ItemUseData_24:action 04 (rts)
NesPrgRom:1e088-1e089:ItemUseData_25:Expect NPC 16 akahana
NesPrgRom:1e08a-1e08b::0202 (action 1c)
NesPrgRom:1e08c-1e08d::Set 050 given statue to akahana
NesPrgRom:1e08e-1e08f:ItemUseData_31:Expect NPC 15 windmill guard asleep
NesPrgRom:1e090-1e091::action 6 (ReloadNpcDataForCurrentLocation)
NesPrgRom:1e092-1e093::Set 00f woke windmill guard
NesPrgRom:1e094-1e095::; try again with another NPC if the first one failed\\nExpect NPC 6b kensu in lighthouse asleep
NesPrgRom:1e096-1e097::action 6 (ReloadNpcDataForCurrentLocation)
NesPrgRom:1e098-1e099::Set 0a4 woke kensu
NesPrgRom:1e09a:ItemUseData_32:Expect location $0f (windmill)
NesPrgRom:1e09b-1e09c::2004 (action 5 - rts)
NesPrgRom:1e09d-1e09e::Set 00a started windmill
NesPrgRom:1e09f-1e0a0:ItemUseData_33:Expect Trigger ad
NesPrgRom:1e0a1-1e0a2::2003 (action 10)
NesPrgRom:1e0a3-1e0a4::Clear 084 leaf villagers currently abducted
NesPrgRom:1e0a5-1e0a6::Set 00d leaf villagers rescued
NesPrgRom:1e0a7-1e0a8:ItemUseData_34:Expect Trigger
NesPrgRom:1e0a9-1e0aa::2003 (action 10)
NesPrgRom:1e0ad-1e0ae:ItemUseData_35:Expect NPC 64 fisherman
NesPrgRom:1e0af-1e0b0::0901
NesPrgRom:1e0b1-1e0b2::Set 021 returned fog lamp
NesPrgRom:1e0b3-1e0b4:ItemUseData_36:Expect Flag 09b can ride dolphin
NesPrgRom:1e0b5-1e0b6::0000 (action 09)
NesPrgRom:1e0b7-1e0b8::Set 054
NesPrgRom:1e0b9-1e0ba:ItemUseData_39:2006 (action 5 - rts)
NesPrgRom:1e0bd-1e0be:ItemUseData_3a:Expect trigger square $af (on altar)
NesPrgRom:1e0bf-1e0c0::2008 (action 0a)
NesPrgRom:1e0c1-1e0c2::Set 283 calmed sea
NesPrgRom:1e0c3-1e0c4::Set 08f used statue of gold
NesPrgRom:1e0c5:ItemUseData_37:Expect location $e4 (joel shed)
NesPrgRom:1e0c6-1e0c7::2007 (action 10)
NesPrgRom:1e0ca-1e0cb:ItemUseData_3b:Expect NPC 7e kensu
NesPrgRom:1e0cc-1e0cd::1302 (action 0c)
NesPrgRom:1e0ce-1e0cf::Set 03c chest3blove pendant
NesPrgRom:1e0d0-1e0d1:ItemUseData_3c:Expect NPC 23 aryllis
NesPrgRom:1e0d2-1e0d3::1210 (action 0d)
NesPrgRom:1e0d4-1e0d5::Set 010 gave kirisa plant to aryllis
NesPrgRom:1e0d6-1e0d7:ItemUseData_3d:Expect NPC 75 kensu slime
NesPrgRom:1e0d8-1e0d9::0000 (action 0e)
NesPrgRom:1e0da-1e0db::Set 065 cured kensu
NesPrgRom:1e0dc-1e0dd:ItemUseData_28:Expect NPC 87 unused?
NesPrgRom:1e0de-1e0df::2005 (action 6 - reload npcs)
NesPrgRom:1e0e0-1e0e1::Set 06b UNUSED stoned people cured
NesPrgRom:1e0e2-1e0e3::Expect NPC 86 unused?
NesPrgRom:1e0e4-1e0e5::2005 (action 6 - reload npcs)
NesPrgRom:1e0e6-1e0e7::Set 069 UNUSED stoned people cured
NesPrgRom:1e0e8-1e0e9::Expect NPC 85 stoned pair
NesPrgRom:1e0ea-1e0eb::2005 (action 06) reload npcs
NesPrgRom:1e0ec-1e0ed::Set 06a stoned people cured
NesPrgRom:1e0ee-1e0ef::Expect NPC 88 stoned akahana
NesPrgRom:1e0f0-1e0f1::2005 (action 06) reload npcs
NesPrgRom:1e0f2-1e0f3::Set 035 cured akahana
NesPrgRom:1e0f4-1e0f5:ItemUseData_3e:Expect on screen NPC c9 (statue of moon)
NesPrgRom:1e0f6-1e0f7::200a (action 13)
NesPrgRom:1e0f8-1e0f9::Set 109 defeated statue of moon
NesPrgRom:1e0fa-1e0fb:ItemUseData_3f:Expect on screen NPC ca (statue of sun)
NesPrgRom:1e0fc-1e0fd::2009 (action 14)
NesPrgRom:1e0fe-1e0ff::Set 10a defeated statue of sun
NesPrgRom:1e100-1e101:ItemUseData_40:Expect on screen NPC cb (draygon)
NesPrgRom:1e102-1e103::200b (action 15)
NesPrgRom:1e104-1e105::Set 086 used bow of truth
NesPrgRom:1e106-1e107:TreasureChestSpawnFlags_2f:; NOTE This table is pointless since we coopted the 200..27f flags for\\n; itemgets.  We instead fill it with a bunch of new code.  It would also\\n; be possible to expand the triggers table if we wanted to.\\n2f
NesPrgRom:1e108-1e109:TreasureChestSpawnFlags_6d:6d
NesPrgRom:1e10a-1e10b:TreasureChestSpawnFlags_6e:6e
NesPrgRom:1e10c-1e10d:TreasureChestSpawnFlags_58:58
NesPrgRom:1e10e-1e10f:TreasureChestSpawnFlags_54:54
NesPrgRom:1e110-1e111:TreasureChestSpawnFlags_00:DEFAULT (00, ...) -> always true
NesPrgRom:1e112-1e113:TreasureChestSpawnFlags_1d:1d
NesPrgRom:1e114-1e115:TreasureChestSpawnFlags_50:50
NesPrgRom:1e116-1e117:TreasureChestSpawnFlags_52:52
NesPrgRom:1e118-1e119:TreasureChestSpawnFlags_53:53
NesPrgRom:1e11a-1e11b:TreasureChestSpawnFlags_55:55
NesPrgRom:1e11c-1e11d:TreasureChestSpawnFlags_56:56
NesPrgRom:1e11e-1e11f:TreasureChestSpawnFlags_57:57
NesPrgRom:1e120-1e121:TreasureChestSpawnFlags_5a:5a
NesPrgRom:1e122-1e123:TreasureChestSpawnFlags_1f:1f
NesPrgRom:1e124-1e125:TreasureChestSpawnFlags_5c:5c
NesPrgRom:1e126-1e127:TreasureChestSpawnFlags_5d:5d
NesPrgRom:1e128-1e129:TreasureChestSpawnFlags_1e:1e
NesPrgRom:1e12a-1e12b:TreasureChestSpawnFlags_5e:5e
NesPrgRom:1e12c-1e12d:TreasureChestSpawnFlags_5f:5f
NesPrgRom:1e12e-1e12f:TreasureChestSpawnFlags_60:60
NesPrgRom:1e130-1e131:TreasureChestSpawnFlags_6f:6f
NesPrgRom:1e132-1e133:TreasureChestSpawnFlags_20:20
NesPrgRom:1e134-1e135:TreasureChestSpawnFlags_21:21
NesPrgRom:1e136-1e137:TreasureChestSpawnFlags_62:62
NesPrgRom:1e138-1e139:TreasureChestSpawnFlags_63:63
NesPrgRom:1e13a-1e13b:TreasureChestSpawnFlags_64:64
NesPrgRom:1e13c-1e13d:TreasureChestSpawnFlags_22:22
NesPrgRom:1e13e-1e13f:TreasureChestSpawnFlags_65:65
NesPrgRom:1e140-1e141:TreasureChestSpawnFlags_66:66
NesPrgRom:1e142-1e143:TreasureChestSpawnFlags_6b:6b
NesPrgRom:1e144-1e145:TreasureChestSpawnFlags_6c:6c
NesPrgRom:1e146-1e147:TreasureChestSpawnFlags_23:23
NesPrgRom:1e148-1e149:TreasureChestSpawnFlags_24:24
NesPrgRom:1e14a-1e14b:TreasureChestSpawnFlags_6a:6a
NesPrgRom:1e14c-1e14d:TreasureChestSpawnFlags_3d:3d
NesPrgRom:1e14e-1e14f:TreasureChestSpawnFlags_2a:2a
NesPrgRom:1e150-1e151:TreasureChestSpawnFlags_1b:1b
NesPrgRom:1e152-1e153:TreasureChestSpawnFlags_1c:1c
NesPrgRom:1e154-1e155:TreasureChestSpawnFlags_14:14
NesPrgRom:1e156-1e157:TreasureChestSpawnFlags_25:25
NesPrgRom:1e158-1e159:TreasureChestSpawnFlags_33:33
NesPrgRom:1e15a-1e15b:TreasureChestSpawnFlags_28:28
NesPrgRom:1e15c-1e15d:TreasureChestSpawnFlags_35:35
NesPrgRom:1e15e-1e15f:TreasureChestSpawnFlags_26:26
NesPrgRom:1e160-1e161:TreasureChestSpawnFlags_3b:3b
NesPrgRom:1e162-1e163:TreasureChestSpawnFlags_0c:0c
NesPrgRom:1e164-1e165:TreasureChestSpawnFlags_05:05
NesPrgRom:1e166-1e167:TreasureChestSpawnFlags_03:03
NesPrgRom:1e168-1e169:TreasureChestSpawnFlags_3f:3f
NesPrgRom:1e16a-1e16b:TreasureChestSpawnFlags_06:06
NesPrgRom:1e16c-1e16d:TreasureChestSpawnFlags_02:02
NesPrgRom:1e16e-1e16f:TreasureChestSpawnFlags_69:69
NesPrgRom:1e170-1e171:TreasureChestSpawnFlags_5b:5b
NesPrgRom:1e172-1e173:TreasureChestSpawnFlags_2c:2c
NesPrgRom:1e174-1e175:TreasureChestSpawnFlags_0a:0a
NesPrgRom:1e176-1e177:TreasureChestSpawnFlags_2b:2b
NesPrgRom:1e178-1e179:TreasureChestSpawnFlags_3c:3c
NesPrgRom:1e17a-1e17b:TriggerTable:
NesPrgRom:1e200-1e201:Trigger_80:; 80 shyron massacre\\nCondition 027 NOT shyron massacre
NesPrgRom:1e202-1e203::Condition 05f sword of thunder
NesPrgRom:1e204-1e205::Message 1d13
NesPrgRom:1e206-1e207::Set 027 shyron massacre
NesPrgRom:1e208-1e209:Trigger_81:; 81 enter shyron\\nCondition 03b NOT
NesPrgRom:1e20c-1e20d::Set 026 entered shyron
NesPrgRom:1e20e-1e20f::Set 2fd warpshyron
NesPrgRom:1e210-1e211:Trigger_82:; 82 teleported to shyron\\nCondition 05f thunder sword
NesPrgRom:1e212-1e213::Condition 02d NOT talked with wise men in shyron
NesPrgRom:1e214-1e215::Action 17
NesPrgRom:1e216-1e217::Set 02d talked with wise men in shyron
NesPrgRom:1e218-1e219:Trigger_83:; 83 enter draygonia fortress (TODO when is this used?)\\nCondition 064 NOT
NesPrgRom:1e21c-1e21d::Set 064
NesPrgRom:1e21e-1e21f:Trigger_84:; 84 learn barrier\\nCondition 051 NOT learned barrier
NesPrgRom:1e220-1e221::Message 1d12  Action 0b
NesPrgRom:1e222-1e223::Set 051 learned barrier
NesPrgRom:1e224-1e225:Trigger_85:; 85 enter stom's house -> initiate fight scene\\nCondition 2f7 warpoak
NesPrgRom:1e226-1e227::Condition 00e NOT defeated stom
NesPrgRom:1e228-1e229::Message 0300  Action 18
NesPrgRom:1e22c-1e22d:Trigger_86:; 86 try to climb mt sabre north (mt sabre side)\\nCondition 0a9 NOT talked to leaf rabbit
NesPrgRom:1e22e-1e22f::Message 1c0f  Action 19
NesPrgRom:1e232-1e233:Trigger_87:; 87 rescue zebu (UNUSED => co-opted as start of game trigger)\\nCondition 055 NOT zebu rescued
NesPrgRom:1e234-1e235::Message 1801  Action 1a
NesPrgRom:1e238-1e239:Trigger_88:; 88 rescue tornel (UNUSED => co-opted as zombie town warp point)\\nCondition 056 NOT tornel rescued
NesPrgRom:1e23a-1e23b::Message 1803  Action 1a
NesPrgRom:1e23e-1e23f:Trigger_89:; 89 rescue asina (UNUSED)\\nCondition 057 NOT asina rescued
NesPrgRom:1e240-1e241::Message 1805  Action 1a
NesPrgRom:1e244-1e245:Trigger_8a:; 8a try to enter evil spirit island (blocked until entered joel)\\n; NOTE This shows up both at the entrance in Angry Sea, as well as\\n; right when you enter Zombie Town.  The latter is pointless, so we\\n; repurpose that spawn (in addition to changing the condition to\\n; check for riding the dolphin to enter the cave).\\nCondition 2fb NOT warpjoel
NesPrgRom:1e246-1e247::Message 1d10  Action 19
NesPrgRom:1e24a-1e24b:Trigger_8b:; 8b entered joel
NesPrgRom:1e24e-1e24f::Set 2fb warpjoel
NesPrgRom:1e250-1e251:Trigger_8c:; 8c leaf abduction\\nCondition 038 NOT leaf abducted
NesPrgRom:1e254-1e255::Set 085 leaf elder missing
NesPrgRom:1e256-1e257::Set 038 leaf abducted
NesPrgRom:1e258-1e259::Set 084 leaf villagers missing
NesPrgRom:1e25a-1e25b:Trigger_8d:; 8d restore leaf elder\\nCondition 037 learned paralysis
NesPrgRom:1e25c-1e25d::Condition 047 NOT rescued leaf elder
NesPrgRom:1e260-1e261::Set 047 rescued leaf elder
NesPrgRom:1e262-1e263::Clear 085 leaf elder missing
NesPrgRom:1e264-1e265:Trigger_8e:; 8e enter oak
NesPrgRom:1e268-1e269::Set 2f7 warpoak
NesPrgRom:1e26a-1e26b:Trigger_8f:; 8f UNUSED\\nCondition 053
NesPrgRom:1e26c-1e26d::Action 1b
NesPrgRom:1e26e-1e26f::Set 045
NesPrgRom:1e270-1e271::Clear 053
NesPrgRom:1e272-1e273:Trigger_90:; 90 enter amazones
NesPrgRom:1e276-1e277::Clear 0a1
NesPrgRom:1e278-1e279::Set 2fa warpamazones
NesPrgRom:1e27a-1e27b:Trigger_a5:; a5 mt sabre guard conversation\\nCondition 07e NOT guard conversation heard
NesPrgRom:1e27c-1e27d::Message 050f
NesPrgRom:1e27e-1e27f::Set 07e guard conversation heard
NesPrgRom:1e280-1e281:Trigger_92:; 92 enter underground channel
NesPrgRom:1e284-1e285::Set 018 entered underground channel
NesPrgRom:1e286-1e287:Trigger_93:; 93 UNUSED\\nCondition 020 NOT
NesPrgRom:1e288-1e289::Message 0a0f
NesPrgRom:1e28c-1e28d:Trigger_94:; 94 enter mt sabre north cave
NesPrgRom:1e290-1e291::Set 05b mt sabre guards gone
NesPrgRom:1e292-1e293:Trigger_95:; 95 enter mesia shrine
NesPrgRom:1e294-1e295::Action 07
NesPrgRom:1e296-1e297::Set 01b mesia recording played
NesPrgRom:1e298-1e299:Trigger_96:; 96 UNUSED\\nCondition 013
NesPrgRom:1e29c-1e29d::Set 02f
NesPrgRom:1e29e-1e29f:Trigger_97:; 97 enter portoa palace
NesPrgRom:1e2a2-1e2a3::Clear 019
NesPrgRom:1e2a4-1e2a5:Trigger_98:; 98 UNUSED\\nCondition 066 NOT
NesPrgRom:1e2a6-1e2a7::Action 1d (0600)
NesPrgRom:1e2aa-1e2ab:Trigger_99:; 99 enter leaf
NesPrgRom:1e2ae-1e2af::Set 2f5 warpleaf
NesPrgRom:1e2b0-1e2b1:Trigger_9a:; 9a fight mado\\nCondition 027 shyron massacre
NesPrgRom:1e2b2-1e2b3::Condition 067 NOT defeated mado 1
NesPrgRom:1e2b4-1e2b5::Action 1d (1904)
NesPrgRom:1e2b8-1e2b9:Trigger_9b:; 9b UNUSED\\nCondition 05d NOT
NesPrgRom:1e2ba-1e2bb::Action 1d (1800)
NesPrgRom:1e2be-1e2bf:Trigger_9c:; 9c UNUSED\\nCondition 060 NOT
NesPrgRom:1e2c0-1e2c1::Message 1802  Action 1d
NesPrgRom:1e2c4-1e2c5:Trigger_9d:; 9d UNUSED\\nCondition 062 NOT
NesPrgRom:1e2c6-1e2c7::Message 1804  Action 1d
NesPrgRom:1e2ca-1e2cb:Trigger_9e:; 9e UNUSED\\nCondition 05c NOT
NesPrgRom:1e2cc-1e2cd::Message 1808  Action 1d
NesPrgRom:1e2d0-1e2d1:Trigger_9f:; 9f UNUSED\\nCondition 06c NOT
NesPrgRom:1e2d2-1e2d3::Message 1b00  Action 1d
NesPrgRom:1e2d6-1e2d7:Trigger_a0:; a0 UNUSED\\nCondition 05e NOT
NesPrgRom:1e2d8-1e2d9::Message 1b04  Action 1d
NesPrgRom:1e2dc-1e2dd:Trigger_a1:; a1 tower message 1\\nCondition 0ea NOT received tower message 1
NesPrgRom:1e2de-1e2df::Message 1b08
NesPrgRom:1e2e0-1e2e1::Set 0ea received tower message 1
NesPrgRom:1e2e2-1e2e3:Trigger_a2:; a2 tower message 2\\nCondition 0eb NOT received tower message 2
NesPrgRom:1e2e4-1e2e5::Message 1b09
NesPrgRom:1e2e6-1e2e7::Set 0eb received tower message 2
NesPrgRom:1e2e8-1e2e9:Trigger_a3:; a3 tower message 3\\nCondition 0ec NOT received tower message 3
NesPrgRom:1e2ea-1e2eb::Message 1b0a
NesPrgRom:1e2ec-1e2ed::Set 0ec received tower message 3
NesPrgRom:1e2ee-1e2ef:Trigger_a4:; a4 forge crystalis\\nCondition 068 NOT forged crystalis
NesPrgRom:1e2f0-1e2f1::Message 1b0b  Action 1e
NesPrgRom:1e2f2-1e2f3::Set 068 forged crystalis
NesPrgRom:1e2f4-1e2f5:Trigger_91:; 91 hear mt sabre guards talking\\nCondition 07f NOT heard mt sabre guards
NesPrgRom:1e2f6-1e2f7::Message 2012
NesPrgRom:1e2f8-1e2f9::Set 07f heard mt sabre guards
NesPrgRom:1e2fa-1e2fb:Trigger_a6:; a6 enter brynmaer
NesPrgRom:1e2fe-1e2ff::Set 2f6 warpbrynmaer
NesPrgRom:1e300-1e301:Trigger_a7:; a7 enter nadare
NesPrgRom:1e304-1e305::Set 2f8 warpnadare
NesPrgRom:1e306-1e307:Trigger_a8:; a8 enter portoa
NesPrgRom:1e30a-1e30b::Set 2f9 warpportoa
NesPrgRom:1e30c-1e30d:Trigger_a9:; a9 enter swan
NesPrgRom:1e310-1e311::Set 2fc warpswan
NesPrgRom:1e312-1e313:Trigger_aa:; aa enter oak after insect\\nCondition 0a8
NesPrgRom:1e316-1e317::Set 043 entered oak AFTER insect
NesPrgRom:1e318-1e319::Set 2f7 warpoak
NesPrgRom:1e31a-1e31b:Trigger_ab:; ab enter goa
NesPrgRom:1e31e-1e31f::Set 2fe warpgoa
NesPrgRom:1e320-1e321:Trigger_ac:; ac enter sahara
NesPrgRom:1e324-1e325::Set 2ff warpsahara
NesPrgRom:1e326-1e327:Trigger_ad:; ad allow opening mt sabre prison door ?
NesPrgRom:1e32a-1e32b::Set 093
NesPrgRom:1e32c-1e32d:Trigger_ae:; ae allow opening styx door ?
NesPrgRom:1e330-1e331::Set 094
NesPrgRom:1e332-1e333:Trigger_af:; af allow repairing broken statue ?
NesPrgRom:1e336-1e337::Set 095
NesPrgRom:1e338-1e339:Trigger_b0:; b0 board boat\\nCondition 021 returned fog lamp
NesPrgRom:1e33a-1e33b::Action 1f
NesPrgRom:1e33e-1e33f:Trigger_b1:; b1 start fighting statues
NesPrgRom:1e340-1e341::Action 1d
NesPrgRom:1e344-1e345:Trigger_b2:; b2 learn paralysis in summit cave\\nCondition 037 NOT learned paralysis
NesPrgRom:1e346-1e347::Message 1c10  Action 08
NesPrgRom:1e348-1e349::Set 037 learned paralysis
NesPrgRom:1e34a-1e34b::Set 083 rescued leaf elder ??
NesPrgRom:1e34c-1e34d:Trigger_b3:; b3 despawn swan guards
NesPrgRom:1e350-1e351::Set 08c swan guards disappeared
NesPrgRom:1e352-1e353:Trigger_b4:; b4 learn refresh\\nCondition 00a windmill key used
NesPrgRom:1e354-1e355::Condition 039 NOT learned refresh
NesPrgRom:1e356-1e357::Action 0f learn refresh $3d70d
NesPrgRom:1e358-1e359::Set 039 learned refresh
NesPrgRom:1e35a-1e35b:Trigger_b5:; b5 learn teleport (UNUSED)\\nCondition 03f NOT learned teleport
NesPrgRom:1e35c-1e35d::Action 0f
NesPrgRom:1e35e-1e35f::Set 03f learned teleport
NesPrgRom:1e360-1e361:Trigger_b6:; b6 sabera trap\\nCondition 013 NOT sabera defeated
NesPrgRom:1e362-1e363::Condition 0db NOT in sabera's trap
NesPrgRom:1e364-1e365::Message 100e
NesPrgRom:1e366-1e367::Set 0db in sabera's trap
NesPrgRom:1e368-1e369::Set 08e
NesPrgRom:1e36a-1e36b:Trigger_b7:; b7 outside portoa castle\\nCondition 09c
NesPrgRom:1e36e-1e36f::Clear 09c
NesPrgRom:1e370-1e371::Clear 0a2
NesPrgRom:1e372-1e373::Set 020
NesPrgRom:1e374-1e375:Trigger_b8:; b8 outside portoa fortune teller (do nothing!)
NesPrgRom:1e37a-1e37b:Trigger_b9:; b9 UNUSED
NesPrgRom:1e37e-1e37f::Clear 09f
NesPrgRom:1e380-1e381:Trigger_ba:; ba try to climb mt sabre north (cordel side)\\nCondition 03f learned teleport
NesPrgRom:1e382-1e383::Message 1c0f  Action 19
NesPrgRom:1e386-1e387:Trigger_bb:; bb portoa palace guard moves\\nCondition 09e NOT
NesPrgRom:1e388-1e389::Condition 01f NOT got ball of water
NesPrgRom:1e38a-1e38b::Condition 020 queen not in throne room
NesPrgRom:1e38c-1e38d::Action 1b
NesPrgRom:1e390-1e391:Trigger_bc:; bc amazones guards move\\nCondition 099 NOT amazones guard paralyzed
NesPrgRom:1e392-1e393::Condition 028 NOT changewoman
NesPrgRom:1e394-1e395::Action 1b
NesPrgRom:1e398-1e399:Trigger_bd:; bd shyron guards move\\nCondition 02b NOT changestom
NesPrgRom:1e39a-1e39b::Condition 026 NOT entered shyron
NesPrgRom:1e39c-1e39d::Condition 027 NOT shyron massacre
NesPrgRom:1e39e-1e39f::Action 1b
NesPrgRom:1e3a2-1e3a3:Trigger_be:; be UNUSED\\nCondition 07b NOT
NesPrgRom:1e3a4-1e3a5::Action 0a
NesPrgRom:1e3a8-1e3a9:Trigger_bf:; bf despawn stoned people\\nCondition 06a stoned people cured
NesPrgRom:1e3ac-1e3ad::Set 090 stoned people gone
NesPrgRom:1e3ae-1e3af:Trigger_c0:; c0 UNUSED\\nCondition 06b
NesPrgRom:1e3b2-1e3b3::Set 091
NesPrgRom:1e3b4-1e3b5:Trigger_c1:; c1 enter swan tavern\\nCondition 072
NesPrgRom:1e3b8-1e3b9::Set 0da kensu gone from tavern
NesPrgRom:1e3ba-1e3bb:Trigger_c2:; c2 reset sabera trap
NesPrgRom:1e3be-1e3bf::Clear 0db in sabera's trap
NesPrgRom:1e3c0-1e3cf::;; --------------------------------\\n;; Unused?????
NesPrgRom:1e3f0-1e3ff::;; --------------------------------
NesPrgRom:1e400:ExecuteBossPattern:A = 0, 8, $a, $f, $17, $1b, $21, $24, @27, $2b
NesPrgRom:1e401::X = $d or $e
NesPrgRom:1e413-1e414:BossPatternJump:00 Vampire 0
NesPrgRom:1e415-1e416::01 Vampire 1
NesPrgRom:1e417-1e418::02 Vampire 2
NesPrgRom:1e419-1e41a::03 Vampire 3
NesPrgRom:1e41b-1e41c::04 Vampire 4
NesPrgRom:1e41d-1e41e::05 Vampire 5
NesPrgRom:1e41f-1e420::06 Vampire 6
NesPrgRom:1e421-1e422::07 Vampire 7
NesPrgRom:1e423-1e424::08 Insect 0
NesPrgRom:1e425-1e426::09 Insect 1
NesPrgRom:1e427-1e428::0a Kelbesque 0
NesPrgRom:1e429-1e42a::0b Kelbesque 1
NesPrgRom:1e42b-1e42c::0c Kelbesque 2
NesPrgRom:1e42d-1e42e::0d Kelbesque 3
NesPrgRom:1e42f-1e430::0e Kelbesque 4
NesPrgRom:1e431-1e432::0f Rage 0
NesPrgRom:1e433-1e434::10 Rage 1
NesPrgRom:1e435-1e436::11 Rage 2
NesPrgRom:1e437-1e438::12 Rage 3
NesPrgRom:1e439-1e43a::13 Rage 4
NesPrgRom:1e43b-1e43c::14 Rage 5
NesPrgRom:1e43d-1e43e::15 Rage 6
NesPrgRom:1e43f-1e440::16 Rage 7
NesPrgRom:1e441-1e442::17 Sabera 0
NesPrgRom:1e443-1e444::18 Sabera 1
NesPrgRom:1e449-1e44a::1b Mado 0
NesPrgRom:1e44b-1e44c::1c Mado 1
NesPrgRom:1e44d-1e44e::1d Mado 2
NesPrgRom:1e44f-1e450::1e Mado 3
NesPrgRom:1e451-1e452::1f Mado 4
NesPrgRom:1e453-1e454::20 Mado 5
NesPrgRom:1e455-1e456::21 Karmine 0
NesPrgRom:1e457-1e458::22 Karmine 1
NesPrgRom:1e459-1e45a::23 Karmine 2
NesPrgRom:1e45b-1e45c::24 Statues 0
NesPrgRom:1e45d-1e45e::25 Statues 1
NesPrgRom:1e45f-1e460::26 Statues 2
NesPrgRom:1e461-1e462::27 Draygon 0
NesPrgRom:1e463-1e464::28 Draygon 1
NesPrgRom:1e465-1e466::29 Draygon 2
NesPrgRom:1e467-1e468::2a Draygon 3
NesPrgRom:1e469-1e46a::2b Draygon2 0
NesPrgRom:1e46b-1e46c::2c Draygon2 1
NesPrgRom:1e46d-1e46e::2d Draygon2 2
NesPrgRom:1e46f-1e470::2e Draygon2 3
NesPrgRom:1e471-1e472::2f Draygon2 4
NesPrgRom:1e473-1e474::30 Draygon2 5
NesPrgRom:1e475-1e476::31 Draygon2 6
NesPrgRom:1e477:ObjectActionJump_60_Vampire:
NesPrgRom:1e47f::$1e486
NesPrgRom:1e481::; If the fight has started...
NesPrgRom:1e483::Suppress screen scroll?
NesPrgRom:1e48b:BossPatternJump_00:; Start
NesPrgRom:1e493::; Vampire appears set up patterns and palettes.
NesPrgRom:1e495::palette 2
NesPrgRom:1e498::palette 3
NesPrgRom:1e49d::pattern bank 4
NesPrgRom:1e4a0::pattern bank 5
NesPrgRom:1e4a8::; Lock the screen
NesPrgRom:1e4bc::; Start in mode 2
NesPrgRom:1e4c3:BossPatternJump_01:; Appears to be unused?
NesPrgRom:1e4cc:BossPatternJump_02:; Initial mode after fight starts, lasts 2 frames => 3\\n; When hit, switches to 2
NesPrgRom:1e4d4::-> 3
NesPrgRom:1e4d8:BossPatternJump_03:; Getting ready to disappear.
NesPrgRom:1e4e2::; After 16 frames, zero out the collision plane and disappear.\\n; Then go to mode 4.
NesPrgRom:1e4fb-1e502:VampireTeleportLocations:; x tile in upper nibble, y tile in lower. Indexed by global counter.\\n; ......|  |......\\n; ......|  |......\\n; ......|  |......\\n; ./8---/ f\\--0-\\.\\n; .|  d         |.\\n; .|    4  7    |.\\n; .|          9 |.\\n; .| 1     b    |.\\n; .|     6      |.\\n; .|         2  |.\\n; .|       5    |.\\n; .\\c-3\\ e  /--a/.\\n; .....|    |.....\\n;    0/8 1/9 2/a 3/b 4/c 5/d 6/e 7/f
NesPrgRom:1e50b:BossPatternJump_04:; Disappeared.  1-12 frames => 5
NesPrgRom:1e518::$1e524
NesPrgRom:1e54a:BossPatternJump_05:; Reappearing.  2 frames => 6
NesPrgRom:1e54f::; Restore the collision plane
NesPrgRom:1e565:BossPatternJump_06:; Wait for smoke to subside after reappeared.\\n; Wait 16 frames
NesPrgRom:1e56f::; Reset animation counter to exactly 0, rather than just 0 low nibble.
NesPrgRom:1e572::; Use the current HP to determine length of time in a spot.
NesPrgRom:1e581:BossPatternJump_07:; Reappearing, waiting to either be hit (knockback negative) or for\\n; the animation counter to go to zero, then teleport away.
NesPrgRom:1e584::$1e592
NesPrgRom:1e58b::zero
NesPrgRom:1e58e::still zero...?
NesPrgRom:1e590::never happens?
NesPrgRom:1e5a2:BossPattern_Vampire_MaybeSpawnBats:; Look at 660, which was incremented while invisible.\\n; If the invisibility ended because 660 his $0c, then\\n; this will pass the first test and not return.  Only\\n; returns if we bailed out from 480 hitting $80.
NesPrgRom:1e5b5::spawn failed (occupied?)
NesPrgRom:1e5c9::$1e5cd
NesPrgRom:1e5d2::$1e5ad
NesPrgRom:1e5d5:BossPattern_Vampire_SpawnSmoke:; Attempts to spawn up to 8 smoke objects
NesPrgRom:1e5db::Vampire smoke
NesPrgRom:1e5e2::newly spawned slot
NesPrgRom:1e5e6::different delay for each
NesPrgRom:1e5eb::$1e5d9
NesPrgRom:1e5ee:ObjectActionJump_61:
NesPrgRom:1e602:_1e602:; ----
NesPrgRom:1e61c::$1e658
NesPrgRom:1e627::$1e62d
NesPrgRom:1e62b::$1e62f
NesPrgRom:1e644::$1e64a
NesPrgRom:1e648::$1e64c
NesPrgRom:1e665:_1e665:$1e66e
NesPrgRom:1e669::$1e66d
NesPrgRom:1e670::$1e674
NesPrgRom:1e675:ObjectActionJump_62_GiantInsect:
NesPrgRom:1e684:BossPatternJump_08:
NesPrgRom:1e68c::$1e68f
NesPrgRom:1e706::$1e6fd
NesPrgRom:1e711::$1e70a
NesPrgRom:1e73c:_1e73c:
NesPrgRom:1e767::$1e73e
NesPrgRom:1e76f::$1e773
NesPrgRom:1e77c-1e78b:DataTable_1e77c:
NesPrgRom:1e814-1e823:DataTable_1e814:
NesPrgRom:1e84d:_1e84d:
NesPrgRom:1e85a::$1e87d
NesPrgRom:1e85f::$1e868
NesPrgRom:1e86d::$1e87d
NesPrgRom:1e87e:BossPatternJump_09:
NesPrgRom:1e88f::$1e8bc
NesPrgRom:1e8a3::$1e8aa
NesPrgRom:1e8b4::$1e8b8
NesPrgRom:1e8c2::$1e8c6
NesPrgRom:1e8c8::$1e8cc
NesPrgRom:1e8cd::$1e8d2
NesPrgRom:1e8ff:_1e8ff:
NesPrgRom:1e91e::$1e912
NesPrgRom:1e95d:ObjectActionJump_63_GeneralKelbesque:
NesPrgRom:1e960::$1e967
NesPrgRom:1e971:BossPatternJump_0a:
NesPrgRom:1e974::$1e9c5
NesPrgRom:1e993::$1e9c5
NesPrgRom:1e9ad::$1e9b4
NesPrgRom:1e9c6:BossPatternJump_0b:
NesPrgRom:1e9c9::$1e9fa
NesPrgRom:1e9cf::$1e9fa
NesPrgRom:1e9d4::$1e9fa
NesPrgRom:1e9e9::; Kelbesque 1 -> stop\\n$1e9c5
NesPrgRom:1ea11::$1ea19
NesPrgRom:1ea37:_1ea37:
NesPrgRom:1ea46:BossPatternJump_0c:
NesPrgRom:1ea4c::$1ea5a
NesPrgRom:1ea7e::$1ea84
NesPrgRom:1ea89:_1ea89:
NesPrgRom:1ea97-1ea9e:DataTable_1ea97:
NesPrgRom:1ea9f-1eaa6:DataTable_1ea9f:
NesPrgRom:1eaa7:BossPatternJump_0d:
NesPrgRom:1eaaa::$1eab2
NesPrgRom:1eac6::$1eacb
NesPrgRom:1ead2::$1eae5
NesPrgRom:1ead9::unknown
NesPrgRom:1eae5::; ----
NesPrgRom:1eae6:BossPatternJump_0e:
NesPrgRom:1eaee::$1eaf8
NesPrgRom:1eafd::$1eb24
NesPrgRom:1eb08::$1eb24
NesPrgRom:1eb0f::$1eb1c
NesPrgRom:1eb24::; ----
NesPrgRom:1eb25:_1eb25:
NesPrgRom:1eb3e:ObjectActionJump_64:
NesPrgRom:1eb8a:_1eb8a:
NesPrgRom:1eb91::$1eb95
NesPrgRom:1eb96:_1eb96:A was loaded from $600,x
NesPrgRom:1eb98::$1ebad
NesPrgRom:1eb9a::; $600,x == 1
NesPrgRom:1eb9d::$1ebac
NesPrgRom:1ebb2::$1ebac
NesPrgRom:1ebd6-1ebd9:DataTable_1ebd6:
NesPrgRom:1ebda:ObjectActionJump_65_LimeTreeGuardian:
NesPrgRom:1ebe4:BossPatternJump_0f:; Ripples in the pool
NesPrgRom:1ebf1::$1ebfb
NesPrgRom:1ebfc:BossPatternJump_10:; Rising up out of the pool
NesPrgRom:1ebff::$1ebfb
NesPrgRom:1ec0f:BossPatternJump_11:; Starting to say something
NesPrgRom:1ec1a:BossPatternJump_12:
NesPrgRom:1ec1e:BossPatternJump_13:; "Welcome"
NesPrgRom:1ec31:BossPatternJump_14:; Descending
NesPrgRom:1ec39::$1ebfb
NesPrgRom:1ec41:BossPatternJump_15:; "Be gone"
NesPrgRom:1ec5b:BossPatternJump_16:; Shooting stuff at player
NesPrgRom:1ec5e::$1ebfb
NesPrgRom:1ec6e::$1ebfb
NesPrgRom:1ec7b:ObjectActionJump_66_Sabera:
NesPrgRom:1ec7e::$1ec85
NesPrgRom:1ec8f:BossPatternJump_17:
NesPrgRom:1ec92::; If the boss is not on screen, bail out\\n$1ecf4
NesPrgRom:1eca9::$1ecf4
NesPrgRom:1ecc2::$1ecf4
NesPrgRom:1ece4::$1ecf4
NesPrgRom:1ecf5:BossPatternJump_18:
NesPrgRom:1ecf9::$1ed08
NesPrgRom:1ecff::$1ed08
NesPrgRom:1ed0b::$1ed10
NesPrgRom:1ed18::$1ed5e
NesPrgRom:1ed4c::$1ed5e
NesPrgRom:1ed67::$1ed70
NesPrgRom:1ed82-1ed85:DataTable_1ed82:; NOTE These are 16-dir speeds for sabera at different HPs.
NesPrgRom:1ed86-1ed91:DataTable_1ed86:
NesPrgRom:1ed96:_1ed96:
NesPrgRom:1eda3::$1edaf
NesPrgRom:1edba::$1edbd
NesPrgRom:1edd4:ObjectActionJump_67_Mado:
NesPrgRom:1edd7::$1edde
NesPrgRom:1ede8:BossPatternJump_1b:
NesPrgRom:1edeb::$1ee34
NesPrgRom:1ee07::$1ee34
NesPrgRom:1ee24::$1ee34
NesPrgRom:1ee35:BossPatternJump_1c:
NesPrgRom:1ee3d::Wait 15 cycles in mode 2
NesPrgRom:1ee43:BossPatternJump_1d:
NesPrgRom:1ee46::$1ee34
NesPrgRom:1ee48::Switch to pattern 3
NesPrgRom:1ee5a:BossPatternJump_1e:
NesPrgRom:1ee66::; Check if Mado should bounce off a wall\\ntop wall
NesPrgRom:1ee6c::$1ee82
NesPrgRom:1ee6e::bottom wall
NesPrgRom:1ee72::$1ee82
NesPrgRom:1ee74::left wall
NesPrgRom:1ee7a::$1ee82
NesPrgRom:1ee7c::rigt wall
NesPrgRom:1ee80::$1ee9e
NesPrgRom:1ee84::TODO - what is this?
NesPrgRom:1eea5::$1eeb9
NesPrgRom:1eeaa::$1eeb9
NesPrgRom:1eeba:_1eeba:
NesPrgRom:1eec9:BossPatternJump_1f:
NesPrgRom:1eed1::$1eeb9
NesPrgRom:1eeec:BossPatternJump_20:
NesPrgRom:1eeef::$1ef22
NesPrgRom:1eefa::$1eefe
NesPrgRom:1ef01::$1ef27
NesPrgRom:1ef18::$1ef27
NesPrgRom:1ef28-1ef2f:DataTable_1ef28:; Top wall
NesPrgRom:1ef30-1ef37::; Right wall
NesPrgRom:1ef38-1ef3f::; Bottom wall
NesPrgRom:1ef40-1ef47::; Left wall
NesPrgRom:1ef48:ObjectActionJump_68_Karmine:
NesPrgRom:1ef4b::$1ef52
NesPrgRom:1ef5c:BossPatternJump_21:
NesPrgRom:1ef5f::$1efac
NesPrgRom:1ef7b::$1efac
NesPrgRom:1efad:BossPatternJump_22:
NesPrgRom:1efcb::$1efdc
NesPrgRom:1efde::$1efec
NesPrgRom:1f01c::$1f022
NesPrgRom:1f020::$1f02a
NesPrgRom:1f02b-1f03a:DataTable_1f02b:
NesPrgRom:1f051:BossPatternJump_23:
NesPrgRom:1f056::$1f08a
NesPrgRom:1f065::$1f089
NesPrgRom:1f072::karmine fireball
NesPrgRom:1f097::$1f089
NesPrgRom:1f0a0::curse beam
NesPrgRom:1f0a5:_1f0a5:
NesPrgRom:1f0b6:ObjectActionJump_69_Statues:
NesPrgRom:1f0b9::$1f0c0
NesPrgRom:1f0c5:BossPatternJump_24:
NesPrgRom:1f0c8::$1f0f3
NesPrgRom:1f0d7::$1f0f3
NesPrgRom:1f0e3::$1f0f3
NesPrgRom:1f0f4:BossPatternJump_25:
NesPrgRom:1f0fd::$1f104
NesPrgRom:1f105:BossPatternJump_26:
NesPrgRom:1f110::$1f104
NesPrgRom:1f12c-1f12f:DataTable_1f12c:
NesPrgRom:1f130:ObjectActionJump_6a_Draygon:
NesPrgRom:1f139::$1f140
NesPrgRom:1f143::$1f14a
NesPrgRom:1f14f:BossPatternJump_27:
NesPrgRom:1f152::$1f1a4
NesPrgRom:1f170::$1f1a4
NesPrgRom:1f191::$1f195
NesPrgRom:1f1a5:BossPatternJump_28:
NesPrgRom:1f1a8::$1f1ad
NesPrgRom:1f1c4::$1f1d5
NesPrgRom:1f1c8::$1f1e6
NesPrgRom:1f1ce::$1f1d5
NesPrgRom:1f1df::$1f1e3
NesPrgRom:1f1f4::$1f1fb
NesPrgRom:1f203:_1f203:; ----
NesPrgRom:1f215:BossPatternJump_29:
NesPrgRom:1f219::$1f21f
NesPrgRom:1f22c:BossPatternJump_2a:
NesPrgRom:1f242::$1f26b
NesPrgRom:1f24b::$1f252
NesPrgRom:1f256::$1f26b
NesPrgRom:1f263::$1f267
NesPrgRom:1f278:_1f278:; ----
NesPrgRom:1f280::$1f290
NesPrgRom:1f2a7::$1f2d1
NesPrgRom:1f2c0::$1f2d1
NesPrgRom:1f2cf::$1f2ad
NesPrgRom:1f2d2-1f2d9:DataTable_1f2d2:
NesPrgRom:1f2da:ObjectActionJump_6b_Draygon2:
NesPrgRom:1f2e2::$1f2f3
NesPrgRom:1f2ed::$1f2f3
NesPrgRom:1f2f8:_1f2f8:
NesPrgRom:1f2fe::$1f2fa
NesPrgRom:1f301:BossPatternJump_2b:
NesPrgRom:1f355::$1f34a
NesPrgRom:1f362::$1f359
NesPrgRom:1f37c::$1f375
NesPrgRom:1f3bc:BossPatternJump_2c:
NesPrgRom:1f3c7::some long routine at end?
NesPrgRom:1f3d1::$1f3f7
NesPrgRom:1f3d7::$1f3f7
NesPrgRom:1f3d9::; Random number was odd start a timer at 192
NesPrgRom:1f3e0::$1f3f7
NesPrgRom:1f3e2::; Global counter < $80
NesPrgRom:1f3e7::$1f3ec
NesPrgRom:1f3e9::; X+Y is even
NesPrgRom:1f3ff::; Maybe compute a new direction
NesPrgRom:1f402::Draygon's current x on screen
NesPrgRom:1f406::$1f40a
NesPrgRom:1f408::If x < $40 then point right
NesPrgRom:1f40c::$1f410
NesPrgRom:1f40e::If x > $c0 then point left
NesPrgRom:1f413::;
NesPrgRom:1f41f::$1f424
NesPrgRom:1f424::; ----
NesPrgRom:1f425:_1f425:; ----
NesPrgRom:1f42a::$1f42f
NesPrgRom:1f439::$1f48a
NesPrgRom:1f454::$1f48a
NesPrgRom:1f45f::fireballs
NesPrgRom:1f464::$1f48a
NesPrgRom:1f480::$1f484
NesPrgRom:1f48b-1f48c:DataTable_1f48b:
NesPrgRom:1f493:_1f493:
NesPrgRom:1f49a::$1f4ba
NesPrgRom:1f4a1::; Pick a random 16-direction from the table
NesPrgRom:1f4a5::1f4bb
NesPrgRom:1f4ab::; Add D2's x-position to player's
NesPrgRom:1f4b0::; Look at the 06 bits to pick a random speed
NesPrgRom:1f4b4::1f4c4
NesPrgRom:1f4bb-1f4c3::; ----\\n;    ESE ESE SE  SSE S   SSW SW  WSW WSW
NesPrgRom:1f4c8:_1f4c8:; Runs if Draygon2 has $80 or more HP
NesPrgRom:1f4d4::$1f4d8
NesPrgRom:1f4dd:BossPatternJump_2d:
NesPrgRom:1f4e6::$1f4eb
NesPrgRom:1f4f2::$1f4f7
NesPrgRom:1f4f4::update nametable and return?
NesPrgRom:1f500::1f51c
NesPrgRom:1f51c-1f523:Code:; 16-dirs for D2\\n;    N   WNW NW  NNW N   NNE NE  ENE
NesPrgRom:1f524:BossPatternJump_2e:
NesPrgRom:1f52d::$1f532
NesPrgRom:1f539::$1f53e
NesPrgRom:1f541:Draygon2_InitiateLasers:
NesPrgRom:1f552:BossPatternJump_2f:
NesPrgRom:1f557::$1f55c
NesPrgRom:1f564::$1f572
NesPrgRom:1f56d::curse beam
NesPrgRom:1f57a::$1f586
NesPrgRom:1f587:BossPatternJump_30:
NesPrgRom:1f58f::$1f594
NesPrgRom:1f597::$1f5b0
NesPrgRom:1f599:_1f599:
NesPrgRom:1f59f::$1f5a3
NesPrgRom:1f5c0::$1f5f8
NesPrgRom:1f5cc::y in 0..f
NesPrgRom:1f5d0::y is 0, 1, or 2
NesPrgRom:1f5da::y is 0, 4, or 8
NesPrgRom:1f5f8::;; --------------------------------
NesPrgRom:1f5f9-1f608:DataTable_1f5f9:
NesPrgRom:1f609-1f60b:DataTable_1f609:
NesPrgRom:1f60c-1f60f:DataTable_1f60c:
NesPrgRom:1f618:_1f618:; Fill elemental defense with #$0f ?
NesPrgRom:1f620::$1f61a
NesPrgRom:1f623:_1f623:
NesPrgRom:1f627::$1f641
NesPrgRom:1f641::; ----
NesPrgRom:1f642:_1f642:
NesPrgRom:1f654::$1f641
NesPrgRom:1f660::$1f665
NesPrgRom:1f672-1f679:DataTable_1f672:
NesPrgRom:1f67a:BossPatternJump_31:
NesPrgRom:1f682::$1f687
NesPrgRom:1f68c::$1f6a2
NesPrgRom:1f68e::fire breath
NesPrgRom:1f695::$1f6a2
NesPrgRom:1f6a3:_1f6a3:
NesPrgRom:1f6a8::$1f6b1
NesPrgRom:1f6ae::$1f6b7
NesPrgRom:1f6b5::$1f6c0
NesPrgRom:1f6ba::1f50c
NesPrgRom:1f50c-1f51b::;    00 1f 2e 3d 4c 5b 6a 79 88 97 a6 b5 c4 d3 e2 f1
NesPrgRom:1f6c1:_1f6c1:; Probably just updating graphics?
NesPrgRom:1f6da::8000 -> e000
NesPrgRom:1f6eb::$1f6f5
NesPrgRom:1f6f7::$1f6e3
NesPrgRom:1f709-1f70a:DataTable_1f709:
NesPrgRom:1f71d:_1f71d:
NesPrgRom:1f728:ObjectActionJump_6c:; These objects seem to only show up after a boss is killed,\\n; excluding draygon 2 or dyna.  So 600,x will be the same index\\n; as it is in BossKillDataTable.  This happens after the initial\\n; explosion or escaping animation is done (so a few frames after\\n; BossKillDataTable).\\n; This also happens when Kensu drops his chest in the lighthouse,\\n; taking up Rage's spot since Rage doesn't have a chest (it's set\\n; explicitly by the dialog followup action).
NesPrgRom:1f72b::$1f736
NesPrgRom:1f739::$1f73e
NesPrgRom:1f744::$1f761
NesPrgRom:1f74b::$1f761
NesPrgRom:1f74f::$1f761
NesPrgRom:1f753::$1f761
NesPrgRom:1f757::$1f761
NesPrgRom:1f75b::$1f761
NesPrgRom:1f764::$1f740
NesPrgRom:1f766::; no matching object found
NesPrgRom:1f769::skip Kensu chest
NesPrgRom:1f76b::$1f77b
NesPrgRom:1f7b2::$1f7b8
NesPrgRom:1f7bb:_1f7bb:
NesPrgRom:1f7c1-1f7c5:DataTable_1f7c1:; 1st byte is foreground pal3 (2nd NPC palette)\\n; 2nd byte is foreground pat1 (2nd NPC pattern), seems to be\\n;     used for treasure chest, and maybe overwrites a temporary\\n;     value used for the escape animation.  This seems to actually\\n;     matter more than the one in 1f987 table.\\n; 3rd byte goes into 320,x (sprite ID offset)\\n; 4th and 5th byte are a status message to display
NesPrgRom:1f7c6-1f7ca::01 insect
NesPrgRom:1f7cb-1f7cf::02 kelbesque 1
NesPrgRom:1f7d0-1f7d4::; The pat1=$62 kind of pointless - the chest loads from pat0\\n03 kensu lighthouse
NesPrgRom:1f7d5-1f7d9::04 sabera 1
NesPrgRom:1f7da-1f7de::05 mado 1
NesPrgRom:1f7df-1f7e3::06 kelbbesque 2
NesPrgRom:1f7e4-1f7e8::07 sabera 2
NesPrgRom:1f7e9-1f7ed::08 mado 2
NesPrgRom:1f7ee-1f7f2::09 karmine
NesPrgRom:1f7fd-1f801::0c vampire 2
NesPrgRom:1f807:ObjectActionJump_6f:; This is the action for $CF which spawns after some (all?) bosses die
NesPrgRom:1f81f::$1f824
NesPrgRom:1f822::$1f81a
NesPrgRom:1f849::$1f84e
NesPrgRom:1f85a::restore music from y=3
NesPrgRom:1f860::boss drop at y=4
NesPrgRom:1f864::loop from y=[5, c]
NesPrgRom:1f86a::$1f86f
NesPrgRom:1f86c::[$7e0..$7e7] - restore palettes
NesPrgRom:1f872::$1f868
NesPrgRom:1f874::loop from y=[d, 12]
NesPrgRom:1f87a::$1f87f
NesPrgRom:1f87c::[$7f0..$7f5] - restore patterns
NesPrgRom:1f882::$1f878
NesPrgRom:1f886::restore map animation
NesPrgRom:1f88a::if 1 then explode??
NesPrgRom:1f88c::$1f8cc
NesPrgRom:1f895::$1f8c7
NesPrgRom:1f899::$1f8c7
NesPrgRom:1f89d::$1f8c7
NesPrgRom:1f8a1::$1f8c7
NesPrgRom:1f8a5::$1f8c7
NesPrgRom:1f8a9::$1f8c7
NesPrgRom:1f8b1::replace most objects w/ explosion
NesPrgRom:1f8ca::$1f890
NesPrgRom:1f8cf:BossKillJump_Insect:; Runs when insect defeated
NesPrgRom:1f8da::$1f8d4
NesPrgRom:1f8eb::$1f8e5
NesPrgRom:1f8ee:BossKillJump_Draygon1:; Runs when Draygon 1 defeated
NesPrgRom:1f8fd:BossKillJump_Draygon2:; Runs when Draygon 2 defeated
NesPrgRom:1f90b::$1f903
NesPrgRom:1f919::$1f912
NesPrgRom:1f947:BossKillJump_Dyna:; Runs when dyna defeated
NesPrgRom:1f95d:BossKillLocations:00 vampire 1
NesPrgRom:1f95e::01 insect
NesPrgRom:1f95f::02 kelbesque 1
NesPrgRom:1f961::04 sabera 1
NesPrgRom:1f962::05 mado 1
NesPrgRom:1f963::06 kelbesque 2
NesPrgRom:1f964::07 sabera 2
NesPrgRom:1f965::08 mado 2
NesPrgRom:1f966::09 karmine
NesPrgRom:1f967::0a draygon 1
NesPrgRom:1f968::0b draygon 2
NesPrgRom:1f969::0c vampure 2
NesPrgRom:1f96a::0d dyna
NesPrgRom:1f96b-1f96c:BossKillDataTable:; boss death, BossDrop
NesPrgRom:1f971-1f972::03 rage (unused)
NesPrgRom:1f987-1f988:BossKillData_00_Vampire1:subroutine to run
NesPrgRom:1f99c-1f99d:BossKillData_01_Insect:
NesPrgRom:1f9b1-1f9b2:BossKillData_02_Kelbesque1:1fa98 - general escapes
NesPrgRom:1f9c6-1f9c7:BossKillData_04_Sabera1:1fa98 - general escapes
NesPrgRom:1f9db-1f9dc:BossKillData_05_Mado1:1fa98 - general escapes
NesPrgRom:1f9f0-1f9f1:BossKillData_06_Kelbesque2:
NesPrgRom:1fa05-1fa06:BossKillData_07_Sabera2:
NesPrgRom:1fa1a-1fa1b:BossKillData_08_Mado2:
NesPrgRom:1fa2f-1fa30:BossKillData_09_Karmine:
NesPrgRom:1fa44-1fa45:BossKillData_0a_Draygon1:
NesPrgRom:1fa59-1fa5a:BossKillData_0b_Draygon2:
NesPrgRom:1fa6e-1fa6f:BossKillData_0c_Vampire2:
NesPrgRom:1fa83-1fa84:BossKillData_0d_Dyna:
NesPrgRom:1fa98:BossKillJump_GeneralEscapes:; Runs when generals defeated for first time.\\n; $600,x seems to have come from $1f828
NesPrgRom:1fac8::a = 2,4,5
NesPrgRom:1fad7::why is this 1 and not 0?
NesPrgRom:1fafe-1faff:EscapedGeneralDataTable:
NesPrgRom:1fb02-1fb03::02 kelbesque 1
NesPrgRom:1fb06-1fb07::04 sabera 1
NesPrgRom:1fb08-1fb09::05 mado 1
NesPrgRom:1fb1a:EscapedGeneralData_Kelbesque:unread
NesPrgRom:1fb1b-1fb1e::kelbesque 1 0601
NesPrgRom:1fb1f:EscapedGeneralData_Sabera:unread
NesPrgRom:1fb20-1fb23::sabera 1 1013
NesPrgRom:1fb24:EscapedGeneralData_Mado:unread
NesPrgRom:1fb25-1fb28::mado 1 1905
NesPrgRom:1fb29:_1fb29:
NesPrgRom:1fb2f::$1fb49
NesPrgRom:1fb36::$1fb49
NesPrgRom:1fb3a::$1fb49
NesPrgRom:1fb3e::$1fb49
NesPrgRom:1fb42::$1fb49
NesPrgRom:1fb4c::$1fb2b
NesPrgRom:1fb58::$1fb52
NesPrgRom:1fb5b:_1fb5b:
NesPrgRom:1fb8f-1fb9e:DataTable_1fb8f:
NesPrgRom:1fbaf-1fbbe::;; --------------------------------\\n;; UNUSED
NesPrgRom:1fc40:MainGameModeJump_0c_DisplayStartMenu:
NesPrgRom:1fc62::$1fc5e
NesPrgRom:1fc75::$1fc66
NesPrgRom:1fc96::$1fc83
NesPrgRom:1fcbd::$1fcb9
NesPrgRom:1fcf7::$1fcf0
NesPrgRom:1fd10::$1fd03
NesPrgRom:1fd20::$1fd19
NesPrgRom:1fd27::LV (menu)
NesPrgRom:1fd2c::HP
NesPrgRom:1fd31::Max HP
NesPrgRom:1fd36::Atk
NesPrgRom:1fd3b::Def-A
NesPrgRom:1fd40::Def-S
NesPrgRom:1fd63::$1fd5b
NesPrgRom:1fd73::$1fd51
NesPrgRom:1fd84-1fd93:DataTable_1fd84:
NesPrgRom:1fdcb-1fdd3:DataTable_1fdcb:
NesPrgRom:1fddb:MainGameModeJump_0d_StartScreen:
NesPrgRom:1fdeb::$1fddb
NesPrgRom:1fdf5::$1fdf1
NesPrgRom:1fe11:_1fe11:
NesPrgRom:1fe27::$1fe1d
NesPrgRom:1fe2a-1fe39:DataTable_1fe2a:
NesPrgRom:1fe7a:_1fe7a:
NesPrgRom:1fe92::$1fe9e
NesPrgRom:1feb0::$1fea7
NesPrgRom:1feb7-1feb8:DataTable_1feb7:
NesPrgRom:1febf:_1febf:
NesPrgRom:1fecb::$1fed1
NesPrgRom:1fecf::$1ff0e
NesPrgRom:1fee0::$1fee4
NesPrgRom:1feec::$1fef0
NesPrgRom:1ff0a:_1ff0a:; ----
NesPrgRom:1ff1a::$1ff10
NesPrgRom:1ff1c::$1ff03
NesPrgRom:1ff1e-1ff2d:DataTable_1ff1e:
NesPrgRom:1ff46:MaybeCheckForDebugInputs:
NesPrgRom:1ff47::; ----
NesPrgRom:1ff49::$1ff4c
NesPrgRom:1ff50::$1ff70
NesPrgRom:1ff52::; Some direction pressed on ctrl2
NesPrgRom:1ff57::$1ff5f
NesPrgRom:1ff59::; Nothing there - so populate it from the table below.
NesPrgRom:1ff60::$1ff54
NesPrgRom:1ff62::; Set level to 15.
NesPrgRom:1ff67::; Max out MP.
NesPrgRom:1ff76::; A pressed on ctrl2
NesPrgRom:1ff7f-1ff8e:DataTable_1ff7f:
NesPrgRom:1ff97-1ffa6::;; From here on out, it looks totally unused.
NesPrgRom:20000:PlayerInventoryMenu:
NesPrgRom:20015::$2000d
NesPrgRom:20017::; Write the following for hardcoded bytes to $5a-$5f
NesPrgRom:2007a:_2007a:
NesPrgRom:2007c::$20080
NesPrgRom:2007e:_2007e:
NesPrgRom:20088::$20092
NesPrgRom:20094::$200a1
NesPrgRom:200a3::$200a9
NesPrgRom:200a7::$20098
NesPrgRom:200d1:_200d1:
NesPrgRom:200db::$200f7
NesPrgRom:200e1::$200f4 --> $20171
NesPrgRom:200eb::$200ef
NesPrgRom:200fb::$20119
NesPrgRom:20103::$20116
NesPrgRom:2010d::$20111
NesPrgRom:2011d::$2012a
NesPrgRom:20121::$20127
NesPrgRom:2012e::$20140
NesPrgRom:20139::$2013d
NesPrgRom:20144::$20149
NesPrgRom:20146::just an rts
NesPrgRom:20160::$20165
NesPrgRom:20169::$2016e
NesPrgRom:20171:InventoryMenu_HandleControllerInput:
NesPrgRom:2017f::$2018b
NesPrgRom:20188::$20193
NesPrgRom:2019e::$201e4
NesPrgRom:201a2::(spaces)
NesPrgRom:201aa::$201b4
NesPrgRom:201ac::(item name)
NesPrgRom:201b9::(item name)
NesPrgRom:201d4::$201d8
NesPrgRom:201d9::"$" in two diff spots
NesPrgRom:201ec:_201ec:
NesPrgRom:201ed:_201ed:(spaces)
NesPrgRom:201f5::$201fa
NesPrgRom:201fd:_201fd:
NesPrgRom:2021f:_2021f:
NesPrgRom:2022f::$20225
NesPrgRom:20232-20233:DataTable_20232:
NesPrgRom:20234-20235:DataTable_20234:
NesPrgRom:20236-20237:DataTable_20236:
NesPrgRom:20238-20239:InventoryMenu_RowSizes:
NesPrgRom:2023a:_2023a:"@"
NesPrgRom:20242::$20253
NesPrgRom:20244::"\`"
NesPrgRom:20249::???
NesPrgRom:2024e::???
NesPrgRom:20258::???
NesPrgRom:2025d::???
NesPrgRom:20262::???
NesPrgRom:20267::???
NesPrgRom:2026c:InventoryMenu_LoadSelectedPage1:
NesPrgRom:2026f:_2026f:
NesPrgRom:20276::$20296
NesPrgRom:2027a::x = 0..3
NesPrgRom:2027d::$2028d
NesPrgRom:20293::$20278
NesPrgRom:20296:InventoryMenu_LoadSelectedPage2:
NesPrgRom:20298::x = 0..3
NesPrgRom:2029b::$202ae
NesPrgRom:202b4::$20296
NesPrgRom:202b7:_202b7:
NesPrgRom:202ba::$202bf
NesPrgRom:202c4::$202d0
NesPrgRom:202cb::(spaces)
NesPrgRom:202d3::$202d7
NesPrgRom:202df::$20304
NesPrgRom:202e4::$20304
NesPrgRom:202ff::(spaces)
NesPrgRom:2031c::$20326
NesPrgRom:2031e::"now using (item)"
NesPrgRom:20323::$2032b
NesPrgRom:2033a-20341:DataTable_2033a:
NesPrgRom:20342:Inventory_DropItem:
NesPrgRom:20347::; When does this happen?  Uncovered.\\n; It's set to nonzero in $2154d right before sorting,\\n; and then back to zero in $216cb.
NesPrgRom:2034c::(spaces)
NesPrgRom:20351::"anything else?"
NesPrgRom:20356::"YES NO"
NesPrgRom:2035e:_2035e:; ----
NesPrgRom:20363::$2036a
NesPrgRom:20365::nothing to drop
NesPrgRom:20377::$20392
NesPrgRom:2037e::(spaces)
NesPrgRom:20386::$2038d
NesPrgRom:20388::"you cannot drop!"
NesPrgRom:20397::(spaces)
NesPrgRom:2039f::$203ae
NesPrgRom:203a1::"do you wish to drop?"
NesPrgRom:203a6::"YES NO"
NesPrgRom:203ab::$203b8
NesPrgRom:203b3::"YES NO"
NesPrgRom:203c4::(spaces)
NesPrgRom:203c9:SellCurrentItem:
NesPrgRom:203db:_203db:
NesPrgRom:203de::$203e2
NesPrgRom:203fd::$20423
NesPrgRom:2042b::$20432
NesPrgRom:2042d::"$"
NesPrgRom:20469::$2046c
NesPrgRom:20471::"Anything else?"
NesPrgRom:20476::"YES NO"
NesPrgRom:2047b:_2047b:
NesPrgRom:20480::$2049e
NesPrgRom:20487::(spaces)
NesPrgRom:2048c::"Please come again"
NesPrgRom:20499::$20491
NesPrgRom:204a3::(spaces)
NesPrgRom:204ad::$204b0
NesPrgRom:204b2::(item name)
NesPrgRom:204bc::$204c0
NesPrgRom:204c1::"$" in diff spots
NesPrgRom:204da:Menu_ReadYesNo_CarrySetIfNo:Probably y-position of menu??
NesPrgRom:204dc::$204e0
NesPrgRom:204de::$41 -> $49
NesPrgRom:204e2::1=No
NesPrgRom:204e4::Result of yes/no
NesPrgRom:204f1::Direction key change result
NesPrgRom:204f3::$204fc
NesPrgRom:204f5::; If it's a direction
NesPrgRom:204fe::A or B
NesPrgRom:20500::$204e6
NesPrgRom:20502::; A or B was pressed
NesPrgRom:2050a::if it was 1 (no) then CS else CC
NesPrgRom:2050d:Menu_UpdateYesNoCursorSprite:
NesPrgRom:20518::y position for this menu
NesPrgRom:2052f::1 triangular cursor
NesPrgRom:20532-20533:Menu_YesNoXPositions:; X position of cursor sprite position for "yes" and "no" respectively
NesPrgRom:20534:Inventory_SortRows:
NesPrgRom:20548::$60e0,y
NesPrgRom:2054f::$20545
NesPrgRom:20564::$2055b
NesPrgRom:20575::$2055b
NesPrgRom:20593::$20589
NesPrgRom:20595::TODO(sdh) skip the 1st and 4th rows only?
NesPrgRom:2059b::$20538
NesPrgRom:2059e-205a5:Inventory_RowWidths:
NesPrgRom:205a6-205ad:Inventory_RowStarts:
NesPrgRom:205ae:_205ae:
NesPrgRom:205b2::$205b5
NesPrgRom:205ba::$205be
NesPrgRom:205cd::$205c6
NesPrgRom:205d2::$205d6
NesPrgRom:205de::$205e2
NesPrgRom:205e6:Inventory_ReadCurrentHoveredItem:
NesPrgRom:205e9::$205ed
NesPrgRom:205eb::1 -> 10, 0 -> 0
NesPrgRom:205f6:_205f6:
NesPrgRom:205f9::$205fd
NesPrgRom:20605:ClearSpriteMemory:
NesPrgRom:20610::$2060c
NesPrgRom:20613:DisplayNumberInShop:
NesPrgRom:2061e::$20616
NesPrgRom:2062e::$20626
NesPrgRom:20631:_20631:
NesPrgRom:20649::$20653
NesPrgRom:20660:_20660:; Highlight an item in inventory? maybe only conditionally
NesPrgRom:20665::$20668
NesPrgRom:20683::$2068f
NesPrgRom:2068c::3
NesPrgRom:20696::2
NesPrgRom:20699:_20699:
NesPrgRom:206ac::0 four corners cursor
NesPrgRom:206af:_206af:
NesPrgRom:206b2::$206b6
NesPrgRom:206d3:Menu_UpdateSprite:; This is a common exit point for a number of routines\\n; Input $12 0..3 routine to run\\n;        $2e sprite index to start at
NesPrgRom:206f5::sprite OAM ram
NesPrgRom:2071c::$206ef
NesPrgRom:2071f:DrawInventorySwordScreen:
NesPrgRom:2072c::$20724
NesPrgRom:2073c::$20732
NesPrgRom:20740::$20730
NesPrgRom:20754::$2075c
NesPrgRom:20759::$20762
NesPrgRom:20767::$2076f
NesPrgRom:20776:_20776:
NesPrgRom:2077f::$2074d
NesPrgRom:2078a::number of rows to draw
NesPrgRom:2078c::$2074a
NesPrgRom:20795:_20795:
NesPrgRom:207b8:LoadInventoryTiles:
NesPrgRom:207ea:_207ea:
NesPrgRom:2081e:DrawInventoryBorder:; This function seems to only be called for the Inventory, but it\\n; calls common functions for other menus as well.
NesPrgRom:20825::; Draw two blank rows of background tiles
NesPrgRom:2082a::; Draw the top two rows of the menu border
NesPrgRom:2082f::; loop 9 times drawing two rows of the menu middle each time
NesPrgRom:2083a::$20833
NesPrgRom:2083c::; finally draw the bottom border of the menu and wait for it to flush
NesPrgRom:20844::; Now write over ??? with #$ff (i *think* its the middle where the items go)
NesPrgRom:2084c::$20848
NesPrgRom:2084e::; and push another update to the nametable buffer
NesPrgRom:20864:DrawInventoryMenuBorderRow:; Writes 6 bytes from an offset into the background menu table in a 9-patch style\\n; Example of calling with offset zero\\n; $00       $01      ... $1d      $1e\\n; (byte 0)  (byte 1) ... (byte 1) (byte 2)\\n; (byte 3)  (byte 4) ... (byte 4) (byte 5)\\n;\\n; [in]  x   - offset into the Menu Background Tile table\\n; [out] $20 - (16 bit) updated by the number of tiles written (+ #$40)\\n; [out] $21 - The upper bits of $20\\n; NOTICE theres even more parameters that are expected further into the callstack\\n; so also see WriteHeaderToNametableQueue\\n;\\n; Scratches $2e and $2f as loop counter variables
NesPrgRom:20869::; Prepare the outer loop to run twice
NesPrgRom:20873::; Write the first byte of the triplet
NesPrgRom:2087b::; Then write 30 of the second byte of the triplet
NesPrgRom:20888::$2087f
NesPrgRom:2088a::; And then the last byte of the triplet.
NesPrgRom:20895::; Loop back to write the second row of data. (Byte offsets 3, 4, 5)\\n$2086d
NesPrgRom:2089a::; Add the amount written to $20 placing the overflow into $21
NesPrgRom:208a8:Shop_DrawItemBackground:
NesPrgRom:208d1::$208fb
NesPrgRom:208d9:_208d9:
NesPrgRom:208e8::$208de
NesPrgRom:20905:_20905:
NesPrgRom:20917::$2090a
NesPrgRom:2092a-20932:DataTable_2092a:
NesPrgRom:20933:ShowMenuMessage:Save A for later
NesPrgRom:20965::$2096a
NesPrgRom:20967::done with row?
NesPrgRom:2096c::$20974
NesPrgRom:20971::$2095f
NesPrgRom:20976::$2097e
NesPrgRom:2097b::$2095f
NesPrgRom:20980::$20988
NesPrgRom:20985::$2095f
NesPrgRom:2098b::$2095f
NesPrgRom:2098e:_2098e:; Done with row - read $ff
NesPrgRom:20994:MenuMessage_SaveGameName:
NesPrgRom:20995::looks like just temp space?
NesPrgRom:209af::$209a8
NesPrgRom:209b6-209b7:SaveFileLocationTable:
NesPrgRom:209b8:MenuMessage_SaveGameLevel:
NesPrgRom:209be::$209c6
NesPrgRom:209c3::$209c9
NesPrgRom:209d0::inc's y
NesPrgRom:209e0-209e1:SaveGameLevelHexToDecimalTable:
NesPrgRom:20a02:RenderSaveGameDataToNametable:
NesPrgRom:20a0d:MenuMessage_ItemName:
NesPrgRom:20a14::$20a18
NesPrgRom:20a2c::$20a34
NesPrgRom:20a31::$20a26
NesPrgRom:20a37::;; --------------------------------\\n; UNUSED
NesPrgRom:20a5a:_20a5a:
NesPrgRom:20a5d::$20a61
NesPrgRom:20a9c::$20a8b
NesPrgRom:20a9f:PlayAudioBlip:; Write A to $103, then 1 to $100 and $101, then immediately zero $101\\n; That's a weird thing to do - why write and then zero?\\n; I think this just plays a "blip"
NesPrgRom:20ab0:WriteHeaderToNametableQueue:; General function used to write data to the nametable queue\\n; See WriteNametableDataToPpu for more information about what each input means\\n; [in] $20 - Data for $6201\\n; [in] $21 - Data for $6200\\n; [in] $24 - Data for $6202\\n; [in] $25 - Data for $6203\\n; Checks $01 PPUCTRL shadow to see if rendering is enabled or not
NesPrgRom:20ac9::; Bump the write head for the nametable buffer
NesPrgRom:20ad1::; Check if the callee requested to re-enable NMI after
NesPrgRom:20ad5::$20ada
NesPrgRom:20add:EnableNMI_20add:
NesPrgRom:20ae5:DisableNMI_20ae5:
NesPrgRom:20aed-20afc:InventoryMenuPrecalculatedHeader:; Precalculated header information for writing the menu to the nametable buffer\\n; The drawing methods use several scratch memory spaces, these extra zeroes\\n; are used to clear them out as well.\\n; byte 0 - $6201\\n; byte 1 - $6200\\n; byte 2 - $6202\\n; byte 3 - $6203
NesPrgRom:20afd-20b0c:DataTable_20afd:
NesPrgRom:20b0d-20b0f:MenuBackgroundTileTable:; #$00
NesPrgRom:20b13-20b15::; #$06
NesPrgRom:20b16-20b18::; #$09
NesPrgRom:20b19-20b1b::; #$0C
NesPrgRom:20b1f-20b20:MenuSpritesTable:
NesPrgRom:20b27:MenuSprites_00:
NesPrgRom:20b38:MenuSprites_01:
NesPrgRom:20b3d:MenuSprites_02:
NesPrgRom:20b4e:MenuSprites_03:
NesPrgRom:20b73-20b74:DataTable_20b73:
NesPrgRom:20bd3-20be2:DataTable_20bd3:
NesPrgRom:20bf3-20bfa:DataTable_20bf3:
NesPrgRom:20bfb-20c0a:DataTable_20bfb:; These 16 bytes are copied into $6150,x in $2021f for the first page of inventory
NesPrgRom:20c0b-20c1a:DataTable_20c0b:; These 16 bytes are copied into $6150,x in $2021f for the second page of inventory
NesPrgRom:20c1b-20c1c:MenuMessageTable:; 00
NesPrgRom:20c1f-20c20::; 01
NesPrgRom:20c23-20c24::; 02
NesPrgRom:20c27-20c28::; 03
NesPrgRom:20c2b-20c2c::; 04
NesPrgRom:20c2f-20c30::; 05
NesPrgRom:20c33-20c34::; 06
NesPrgRom:20c37-20c38::; 07
NesPrgRom:20c3b-20c3c::; 08
NesPrgRom:20c3f-20c40::; 09
NesPrgRom:20c43-20c44::; 0a
NesPrgRom:20c47-20c48::; 0b
NesPrgRom:20c4b-20c4c::; 0c
NesPrgRom:20c4f-20c50::; 0d
NesPrgRom:20c53-20c54::; 0e
NesPrgRom:20c57-20c58::; 0f
NesPrgRom:20c5b-20c5c::; 10
NesPrgRom:20c5f-20c60::; 11
NesPrgRom:20c63-20c64::; 12
NesPrgRom:20c67-20c68::; 13
NesPrgRom:20c6b-20c6c::; 14
NesPrgRom:20c6f-20c70::; 15
NesPrgRom:20c73-20c74::; 16
NesPrgRom:20c77-20c78::; 17
NesPrgRom:20c7b-20c7c::; 18
NesPrgRom:20c7f-20c80::; 19
NesPrgRom:20c83-20c84::; 1a
NesPrgRom:20c87-20c88::; 1b
NesPrgRom:20c8b-20c8c::; 1c
NesPrgRom:20c8f-20c90::; 1d
NesPrgRom:20c93-20c94::; 1e
NesPrgRom:20c97-20c98::; 1f
NesPrgRom:20c9b-20c9c::; 20
NesPrgRom:20c9f-20ca0::; 21
NesPrgRom:20ca3-20ca4::; 22
NesPrgRom:20ca7-20ca8::; 23
NesPrgRom:20cab-20cac::; 24
NesPrgRom:20caf-20cb0::; 25
NesPrgRom:20cb3-20cb4::; 26
NesPrgRom:20cb7-20cb8::; 27
NesPrgRom:20cbb-20cbc::; 28
NesPrgRom:20cbf-20cc0::; 29
NesPrgRom:20cc3-20cc4::; 2a
NesPrgRom:20cc7-20cc8::; 2b
NesPrgRom:20ccb-20ccc::; 2c
NesPrgRom:20ccf-20cd0::; 2d
NesPrgRom:20cd3-20cd4::; 2e
NesPrgRom:20cd7-20cd8::; 2f
NesPrgRom:20cdb-20cdc::; 30
NesPrgRom:20cdf-20ce0::; 31
NesPrgRom:20ce3-20ce4::; 32
NesPrgRom:20ce7-20ce8::; 33
NesPrgRom:20ceb-20cec::; 34
NesPrgRom:20cef-20cf0::; 35
NesPrgRom:20cf3-20cf4::; 36
NesPrgRom:20cf7-20cf8::; 37
NesPrgRom:20cfb-20cfc::; 38
NesPrgRom:20cff-20d00::; 39
NesPrgRom:20d03-20d04::; 3a
NesPrgRom:20d07-20d0a:MenuMessage_00:
NesPrgRom:20d0b-20d0e:MenuMessage_01:
NesPrgRom:20d0f-20d12:MenuMessage_02:
NesPrgRom:20d13-20d16:MenuMessage_03:
NesPrgRom:20d17-20d1a:MenuMessage_04:
NesPrgRom:20d1b-20d1e:MenuMessage_05:
NesPrgRom:20d1f-20d20:MenuMessage_06:
NesPrgRom:20d21-20d35:MenuMessage_07:
NesPrgRom:20d36-20d46:MenuMessage_08:
NesPrgRom:20d47-20d53:MenuMessage_09:
NesPrgRom:20d54-20d5b:MenuMessage_0b:
NesPrgRom:20d5c-20d6a:MenuMessage_0c:
NesPrgRom:20d6b-20d7c:MenuMessage_0d:
NesPrgRom:20d7d-20d7e:MenuMessage_10:
NesPrgRom:20d7f-20d80:MenuMessage_11:
NesPrgRom:20d81-20d8e:MenuMessage_14:
NesPrgRom:20d8f-20d9c:MenuMessage_15:
NesPrgRom:20d9d-20d9e:MenuMessage_35:
NesPrgRom:20d9f-20daa:MenuMessage_13:
NesPrgRom:20dab-20db5:MenuMessage_18:
NesPrgRom:20db6-20dbf:MenuMessage_19:
NesPrgRom:20dc0-20dc3:MenuMessage_1a:
NesPrgRom:20dc4-20dcd:MenuMessage_1b:
NesPrgRom:20dce-20de1:MenuMessage_1c:
NesPrgRom:20de2-20ded::; UNUSED
NesPrgRom:20dee-20dfc:MenuMessage_1e:
NesPrgRom:20dfd-20dfe:MenuMessage_12:
NesPrgRom:20dff-20e11:MenuMessage_20:
NesPrgRom:20e12-20e2c:MenuMessage_21:
NesPrgRom:20e2d-20e46:MenuMessage_22:
NesPrgRom:20e47-20e61:MenuMessage_23:
NesPrgRom:20e62-20e74:MenuMessage_24:
NesPrgRom:20e75-20e87:MenuMessage_25:
NesPrgRom:20e88-20e89:MenuMessage_34:
NesPrgRom:20e8a-20ea3:MenuMessage_27:
NesPrgRom:20eb8-20eb9::; UNUSED
NesPrgRom:20eba-20ec0:MenuMessage_0e:
NesPrgRom:20ec1-20edc:MenuMessage_0f:
NesPrgRom:20efe-20eff::; UNUSED
NesPrgRom:20f00-20f0f:MenuMessage_36:
NesPrgRom:20f10-20f1f:MenuMessage_37:
NesPrgRom:20f20-20f2c:MenuMessage_16:
NesPrgRom:20f2d-20f3a:MenuMessage_39:
NesPrgRom:20f3b-20f48:MenuMessage_3a:
NesPrgRom:20f49-20f59:MenuMessage_2e:
NesPrgRom:20f5a-20f5e:ItemPatternIconTileIds:; Swords
NesPrgRom:20f5f-20f66::; Balls and bracelets
NesPrgRom:20f67-20f6e::; Shields
NesPrgRom:20f6f-20f76::; Armors
NesPrgRom:20f77-20f86::; Consumables, etc
NesPrgRom:20f9b-20fa4::; Magic
NesPrgRom:20fa5-20fa6:DataTable_20fa5:
NesPrgRom:20ff0-20fff:Inventory_ItemData:; The 40 bit indicates that it's not allowed to be dropped\\n; Other bits probably have something to do with gfx.\\n;   03 looks like a palette select\\n;   80 seems to only indicate swords and magic\\n;   20 seems to apply to everything but consumables and quest items
NesPrgRom:2103b-2104a:Inventory_EquippedId:; This table stores the value that's stored in $711..$715 for various\\n; types of equipment
NesPrgRom:21086-21087:MenuItemNameTable:00
NesPrgRom:21088-21089::01
NesPrgRom:2108a-2108b::02
NesPrgRom:2108c-2108d::03
NesPrgRom:2108e-2108f::04
NesPrgRom:21090-21091::05
NesPrgRom:21092-21093::06
NesPrgRom:21094-21095::07
NesPrgRom:21096-21097::08
NesPrgRom:21098-21099::09
NesPrgRom:2109a-2109b::0a
NesPrgRom:2109c-2109d::0b
NesPrgRom:2109e-2109f::0c
NesPrgRom:210a0-210a1::0d
NesPrgRom:210a2-210a3::0e
NesPrgRom:210a4-210a5::0f
NesPrgRom:210a6-210a7::10
NesPrgRom:210a8-210a9::11
NesPrgRom:210aa-210ab::12
NesPrgRom:210ac-210ad::13
NesPrgRom:210ae-210af::14
NesPrgRom:210b0-210b1::15
NesPrgRom:210b2-210b3::16
NesPrgRom:210b4-210b5::17
NesPrgRom:210b6-210b7::18
NesPrgRom:210b8-210b9::19
NesPrgRom:210ba-210bb::1a
NesPrgRom:210bc-210bd::1b
NesPrgRom:210be-210bf::1c
NesPrgRom:210c0-210c1::1d
NesPrgRom:210c2-210c3::1e
NesPrgRom:210c4-210c5::1f
NesPrgRom:210c6-210c7::20
NesPrgRom:210c8-210c9::21
NesPrgRom:210ca-210cb::22
NesPrgRom:210cc-210cd::23
NesPrgRom:210ce-210cf::24
NesPrgRom:210d0-210d1::25
NesPrgRom:210d2-210d3::26
NesPrgRom:210d4-210d5::27
NesPrgRom:210d6-210d7::28
NesPrgRom:210d8-210d9::29
NesPrgRom:210da-210db::2a
NesPrgRom:210dc-210dd::2b
NesPrgRom:210de-210df::2c
NesPrgRom:210e0-210e1::2d
NesPrgRom:210e2-210e3::2e
NesPrgRom:210e4-210e5::2f
NesPrgRom:210e6-210e7::30
NesPrgRom:210e8-210e9::31
NesPrgRom:210ea-210eb::32
NesPrgRom:210ec-210ed::33
NesPrgRom:210ee-210ef::34
NesPrgRom:210f0-210f1::35
NesPrgRom:210f2-210f3::36
NesPrgRom:210f4-210f5::37
NesPrgRom:210f6-210f7::38
NesPrgRom:210f8-210f9::39
NesPrgRom:210fa-210fb::3a
NesPrgRom:210fc-210fd::3b
NesPrgRom:210fe-210ff::3c
NesPrgRom:21100-21101::3d
NesPrgRom:21102-21103::3e
NesPrgRom:21104-21105::3f
NesPrgRom:21106-21107::40
NesPrgRom:21108-21109::41
NesPrgRom:2110a-2110b::42
NesPrgRom:2110c-2110d::43
NesPrgRom:2110e-2110f::44
NesPrgRom:21110-21111::45
NesPrgRom:21112-21113::46
NesPrgRom:21114-21115::47
NesPrgRom:21116-21117::48
NesPrgRom:21118-21119::49
NesPrgRom:2111a-21123:MenuItemName_00:00
NesPrgRom:21124-2112d:MenuItemName_01:01
NesPrgRom:2112e-21138:MenuItemName_02:02
NesPrgRom:21139-21145:MenuItemName_03:03
NesPrgRom:21146-2114f:MenuItemName_04:04
NesPrgRom:21150-2115a:MenuItemName_05:05
NesPrgRom:2115b-21165:MenuItemName_07:07
NesPrgRom:21166-21171:MenuItemName_09:09
NesPrgRom:21172-2117f:MenuItemName_0b:0b
NesPrgRom:21180-2118c:MenuItemName_06:06
NesPrgRom:2118d-21197:MenuItemName_08:08
NesPrgRom:21198-211a5:MenuItemName_0a:0a
NesPrgRom:211a6-211b0:MenuItemName_0c:0c
NesPrgRom:211b1-211bd:MenuItemName_0d:0d
NesPrgRom:211be-211c8:MenuItemName_0e:0e
NesPrgRom:211c9-211d5:MenuItemName_0f:0f
NesPrgRom:211d6-211e2:MenuItemName_10:10
NesPrgRom:211e3-211ee:MenuItemName_11:11
NesPrgRom:211ef-211f9:MenuItemName_12:12
NesPrgRom:211fa-21204:MenuItemName_13:13
NesPrgRom:21205-2120f:MenuItemName_14:14
NesPrgRom:21210-2121b:MenuItemName_15:15
NesPrgRom:2121c-21227:MenuItemName_16:16
NesPrgRom:21228-21232:MenuItemName_17:17
NesPrgRom:21233-2123f:MenuItemName_18:18
NesPrgRom:21240-2124c:MenuItemName_19:19
NesPrgRom:2124d-21259:MenuItemName_1a:1a
NesPrgRom:2125a-21264:MenuItemName_1b:1b
NesPrgRom:21265-2126f:MenuItemName_1c:1c
NesPrgRom:21270-2127c:MenuItemName_1d:1d
NesPrgRom:2127d-21285:MenuItemName_1e:1e
NesPrgRom:21286-21291:MenuItemName_1f:1f
NesPrgRom:21292-2129d:MenuItemName_20:20
NesPrgRom:2129e-212aa:MenuItemName_21:21
NesPrgRom:212ab-212b5:MenuItemName_22:22
NesPrgRom:212b6-212c2:MenuItemName_23:23
NesPrgRom:212c3-212cd:MenuItemName_24:24
NesPrgRom:212ce-212da:MenuItemName_25:25
NesPrgRom:212db-212e6:MenuItemName_26:26
NesPrgRom:212e7-212f3:MenuItemName_27:27
NesPrgRom:212f4-212ff:MenuItemName_28:28
NesPrgRom:21300-21308:MenuItemName_29:29
NesPrgRom:21309-21313:MenuItemName_2a:2a
NesPrgRom:21314-21320:MenuItemName_2b:2b
NesPrgRom:21321-2132e:MenuItemName_2c:2c
NesPrgRom:2132f-2133c:MenuItemName_2d:2d
NesPrgRom:2133d-21349:MenuItemName_2e:2e
NesPrgRom:2134a-21357:MenuItemName_2f:2f
NesPrgRom:21358-21363:MenuItemName_30:30
NesPrgRom:21364-2136f:MenuItemName_31:31
NesPrgRom:21370-2137c:MenuItemName_32:32
NesPrgRom:2137d-2138a:MenuItemName_33:33
NesPrgRom:2138b-21396:MenuItemName_34:34
NesPrgRom:21397-2139f:MenuItemName_35:35
NesPrgRom:213a0-213ab:MenuItemName_36:36
NesPrgRom:213ac-213b7:MenuItemName_37:37
NesPrgRom:213b8-213c5:MenuItemName_38:38
NesPrgRom:213c6-213d2:MenuItemName_39:39
NesPrgRom:213d3-213df:MenuItemName_3a:3a
NesPrgRom:213e0-213ec:MenuItemName_3b:3b
NesPrgRom:213ed-213f9:MenuItemName_3c:3c
NesPrgRom:213fa-21406:MenuItemName_3d:3d
NesPrgRom:21407-21410:MenuItemName_3e:3e
NesPrgRom:21411-21419:MenuItemName_3f:3f
NesPrgRom:2141a-21424:MenuItemName_40:40
NesPrgRom:21425-2142c:MenuItemName_41:41
NesPrgRom:2142d-21436:MenuItemName_42:42
NesPrgRom:21437-21440:MenuItemName_43:43
NesPrgRom:21441-21449:MenuItemName_44:44
NesPrgRom:2144a-21451:MenuItemName_45:45
NesPrgRom:21452-21459:MenuItemName_46:46
NesPrgRom:2145a-21460:MenuItemName_47:47
NesPrgRom:21461-21467:MenuItemName_48:48
NesPrgRom:21468-21470:MenuItemName_49:49
NesPrgRom:21471-21480::;; --------------------------------\\n; The following bytes were all uncovered in a full run.
NesPrgRom:21500:_21500:
NesPrgRom:21503:_21503:
NesPrgRom:21506:_21506:
NesPrgRom:21509:_21509:
NesPrgRom:2150c:_2150c:
NesPrgRom:21558:_21558:
NesPrgRom:21562::"ARMOR SHOP"
NesPrgRom:21567::"Do you wish to buy?"
NesPrgRom:2156c::"YES NO"
NesPrgRom:2157a:_2157a:
NesPrgRom:21584::"TOOL SHOP"
NesPrgRom:21589::"Do you wish to buy?"
NesPrgRom:2158e::"YES NO"
NesPrgRom:2159c:_2159c:
NesPrgRom:215b7::"INN"
NesPrgRom:215bc::"Need to rest? Please stay"
NesPrgRom:215c1::"It will cost you $"
NesPrgRom:215c6::"YES NO"
NesPrgRom:215e6::$215f0
NesPrgRom:215ed::$21665
NesPrgRom:21608::$2164e
NesPrgRom:21612::(spaces)
NesPrgRom:21617::(spaces)
NesPrgRom:2161c::"How do you feel today?"
NesPrgRom:21621::"Please come agian"
NesPrgRom:21653::(spaces)
NesPrgRom:21658::"You haven't enough money"
NesPrgRom:2166a::(spaces)
NesPrgRom:2166f::"Please come again"
NesPrgRom:21674:_21674:
NesPrgRom:2167a:_2167a:
NesPrgRom:21689::"PAWN SHOP"
NesPrgRom:2168e::"Is there anything you wish to sell?"
NesPrgRom:21693::(spaces)
NesPrgRom:21698::"YES NO"
NesPrgRom:216a2::$216be
NesPrgRom:216a9::(spaces)
NesPrgRom:216ae::(spaces)
NesPrgRom:216b3::"Please come again"
NesPrgRom:216c6:_216c6:
NesPrgRom:216cf:Shop_Main:; Just entered a shop
NesPrgRom:216d1::"Do you wish to buy?"
NesPrgRom:216d4::$216d9
NesPrgRom:216d6::no buy -> exit
NesPrgRom:216e4::(spaces)
NesPrgRom:216e9::Beginning of shop inventory
NesPrgRom:216ee::(item name)
NesPrgRom:216f3::"$"
NesPrgRom:216f8:Shop_Main_Loop:
NesPrgRom:216fb::Currently selected index
NesPrgRom:216ff::Currently selected item id
NesPrgRom:21709::$21719
NesPrgRom:2170b::; On left decrement index
NesPrgRom:2171d::$2172d
NesPrgRom:2171f::; On right increment index
NesPrgRom:21731::$21734
NesPrgRom:21733::; On select exit
NesPrgRom:21738::$2174c
NesPrgRom:2173a:Shop_AskAnythingElse:; On B, give "anything else?" prompt\\n(spaces)
NesPrgRom:2173f::"Anything else?"
NesPrgRom:21744::"YES NO"
NesPrgRom:21750::$21755
NesPrgRom:21764::$21769
NesPrgRom:2176c::$2177e
NesPrgRom:2176e::(spaces)
NesPrgRom:21773::"You haven't enough money"
NesPrgRom:21780::$21792
NesPrgRom:21782::(spaces)
NesPrgRom:21787::"You have too many already"
NesPrgRom:21797::"You purchased"
NesPrgRom:217a4:Shop_AskAnythingElse2:(spaces)
NesPrgRom:217a9::"Anything else?"
NesPrgRom:217ae::"YES NO"
NesPrgRom:217b3:Shop_AskedAnythingElse:; Same as enter shop, but "Anything else"
NesPrgRom:217bf::(spaces)
NesPrgRom:217c4::(item name)
NesPrgRom:217cd:Shop_NothingPressed:
NesPrgRom:217d0::Cost to buy current item
NesPrgRom:217d5::"$"
NesPrgRom:217dd:Shop_Exit:; "Please come again", then exit
NesPrgRom:217e2::(spaces)
NesPrgRom:217e7::"Please come again"
NesPrgRom:217ef:Shop_UpdatePrice:; Update the item name, price, etc
NesPrgRom:217fa::(spaces)
NesPrgRom:21808::(item name)
NesPrgRom:2180d::"$"
NesPrgRom:21815:Shop_UpdateSelectionSprite:
NesPrgRom:21834::0 four corners cursor
NesPrgRom:21837:_21837:
NesPrgRom:21840::$21843
NesPrgRom:21867::2
NesPrgRom:21874-21877:DataTable_21874:
NesPrgRom:21878:_21878:
NesPrgRom:21884:_21884:
NesPrgRom:2188a:InitializeArmorShop:; Initialize $6470..f for armor shops
NesPrgRom:2189f::$21895
NesPrgRom:218b4::$218aa
NesPrgRom:218b6:PostInitializeShop:; Draw the item boxes and outlines
NesPrgRom:218c5::current shop's item selection
NesPrgRom:218ca::$218d1
NesPrgRom:218ce::$218d7
NesPrgRom:218e0::$218ba
NesPrgRom:218e3:InitializeToolShop:; Initialize $6470..f when entering an item shop
NesPrgRom:218f1::y = 0..3
NesPrgRom:218f8::$218ee
NesPrgRom:21906::y = 0..7
NesPrgRom:2190d::$21903
NesPrgRom:21912:_21912:
NesPrgRom:21930::$21929
NesPrgRom:21942::$2193e
NesPrgRom:21953:FindCurrentShopIndex:
NesPrgRom:2195b::$21965
NesPrgRom:21960::$21958
NesPrgRom:21962::$2196c
NesPrgRom:21970:ComputeMoneyAfterBuyingSelectedItem:; Subtracts the price of the currently selected item\\n; from the player's cash, stores in $6476[7].  If it's\\n; negative then
NesPrgRom:21983::$21988
NesPrgRom:21985::; Player didn't have enough cash
NesPrgRom:2198c::$219bf
NesPrgRom:21993::$219aa
NesPrgRom:219a5::$2199b
NesPrgRom:219ba::$219b0
NesPrgRom:219c4::$219c9
NesPrgRom:219d9::$219cf
NesPrgRom:219de:_219de:; ----
NesPrgRom:219fb:_219fb:
NesPrgRom:21a06::$21a0f
NesPrgRom:21a0b::$21a01
NesPrgRom:21a12:_21a12:
NesPrgRom:21a27::$21a1d
NesPrgRom:21a2a:_21a2a:; ----
NesPrgRom:21a37:Shop_ReadCurrentItemPrice:; Read current item's price, store in $6474\\nCurrently selected index
NesPrgRom:21a3e::Is current slot empty?
NesPrgRom:21a40::$21a54
NesPrgRom:21a42::Currently selected index
NesPrgRom:21a47::Reads a current shop price
NesPrgRom:21a62:Inventory_Organize:
NesPrgRom:21a79::$21a80
NesPrgRom:21a7d::$21a83
NesPrgRom:21a8e::$21a66
NesPrgRom:21a91:_21a91:
NesPrgRom:21aaa::$21aaf
NesPrgRom:21aba::$21a95
NesPrgRom:21abd:_21abd:
NesPrgRom:21ac7::$21acd
NesPrgRom:21ad3::$21adc
NesPrgRom:21ad8::$21acf
NesPrgRom:21ade-21aed:DataTable_21ade:
NesPrgRom:21aee:DrawSaveMenu:
NesPrgRom:21afe::display Save/Load sprite???
NesPrgRom:21b03::Render name or level??
NesPrgRom:21b06::"GAME ______ LVL ##"
NesPrgRom:21b0b::(fewer spaces)
NesPrgRom:21b10::; draw the background tiles for the Save / Load buttons\\n; (The highlight is a sprite, the unhighlighted version is bg)
NesPrgRom:21b2e::$21b14
NesPrgRom:21b30::"1 ______ LV ##"
NesPrgRom:21b35::"2 ______ LV ##"
NesPrgRom:21b49::$21b4e
NesPrgRom:21b52::$21b63
NesPrgRom:21b60::$21b3a
NesPrgRom:21b67::$21b86
NesPrgRom:21b6f::$21b73
NesPrgRom:21b71::"GAME ______ LV ##"
NesPrgRom:21b83::$21b3a
NesPrgRom:21b8a::$21b94
NesPrgRom:21b98::$21b3a
NesPrgRom:21ba1::"Load this game?"
NesPrgRom:21ba6::"YES or NO?"
NesPrgRom:21bb2::(spaces)
NesPrgRom:21bb7::$21b3a
NesPrgRom:21bba:LoadGame:
NesPrgRom:21bbf::$21bd1
NesPrgRom:21be1:_21be1:
NesPrgRom:21be8::$2ff00
NesPrgRom:21bec::$21c12
NesPrgRom:21bf3::(spaces)
NesPrgRom:21bf8::"Cannot save"
NesPrgRom:21c01::$21bff
NesPrgRom:21c04::$21bff
NesPrgRom:21c17::$21c2b
NesPrgRom:21c1e::(spaces)
NesPrgRom:21c23::"1 ______ LV ##"
NesPrgRom:21c28::$21bfd
NesPrgRom:21c30::"YES NO"
NesPrgRom:21c3c::(spaces)
NesPrgRom:21c44:SaveGame:
NesPrgRom:21c49::$21c64
NesPrgRom:21c7a:_21c7a:
NesPrgRom:21c7d::$21c82
NesPrgRom:21c85:_21c85:
NesPrgRom:21ca6::3
NesPrgRom:21cae:_21cae:
NesPrgRom:21cde-21cdf:DataTable_21cde:
NesPrgRom:21ce0:CopyThreePagesOfBytesByLookup:Copies three pages of bytes from src to dst.\\na - index into the list at $21d32
NesPrgRom:21ceb::$21ce3
NesPrgRom:21cfd::$21cf3
NesPrgRom:21d0f::$21d13
NesPrgRom:21d15::$21d19
NesPrgRom:21d1b::$21d09
NesPrgRom:21d23::$21d09
NesPrgRom:21d25::Restore the previous values in $10-$15
NesPrgRom:21d2f::$21d27
NesPrgRom:21d32-21d35:CopyPageBytesTable:list of .word(srcbytes) .word(destbytes)
NesPrgRom:21d52:ClearInventoryMenuScreen:; Overwrites the data in the nametable with a blank inventory screen
NesPrgRom:21d55::(spaces)
NesPrgRom:21d5a::(spaces 2)
NesPrgRom:21d5f::(space)
NesPrgRom:21d6f::; Prepare the menu border nametable buffer header information
NesPrgRom:21d7f::; Draw the middle section menu borders
NesPrgRom:21d8a::$21d83
NesPrgRom:21d8d-21d8e:SaveLoadBackgroundTile_XPos:
NesPrgRom:21d8f-21d91::; UNUSED?
NesPrgRom:21d92-21d93:SaveLoadBackgroundTile_YPos:
NesPrgRom:21d94-21d96::; UNUSED?
NesPrgRom:21d97-21d98:SaveLoadBackgroundTile_PatternID:
NesPrgRom:21d99-21d9b::; UNUSED?
NesPrgRom:21d9c-21d9d:DataTable_21d9c:
NesPrgRom:21d9e-21d9f:DataTable_21d9e:
NesPrgRom:21da0-21da1:DataTable_21da0:
NesPrgRom:21da2-21da3:DataTable_21da2:
NesPrgRom:21da4-21da7:ArmorShopIdTable:
NesPrgRom:21dd0-21dd1:ArmorShopPriceTable:; 0 Leaf\\n100  Tanned Hide
NesPrgRom:21dd2-21dd3::80   Carapace Shield
NesPrgRom:21dd4-21dd5::0
NesPrgRom:21dd6-21dd7::0
NesPrgRom:21dd8-21dd9::; 1 Brynmaer\\n140  Leather Armor
NesPrgRom:21dda-21ddb::70   Carapace Shield
NesPrgRom:21ddc-21ddd::220  Bronze Shield
NesPrgRom:21dde-21ddf::0
NesPrgRom:21de0-21de1::;\\n0
NesPrgRom:21de2-21de3::0
NesPrgRom:21de4-21de5::0
NesPrgRom:21de6-21de7::0
NesPrgRom:21de8-21de9::; 3 Amazones\\n1800 Platinum Armor
NesPrgRom:21dea-21deb::1300 Platinum Shield
NesPrgRom:21dec-21ded::2000 Mirror Shield
NesPrgRom:21dee-21def::9000 Sacred Shield
NesPrgRom:21df0-21df1::;\\n0
NesPrgRom:21df2-21df3::0
NesPrgRom:21df4-21df5::0
NesPrgRom:21df6-21df7::0
NesPrgRom:21df8-21df9::; 5 Portoa\\n600  Bronze
NesPrgRom:21dfa-21dfb::2000 Platinum Armor
NesPrgRom:21dfc-21dfd::1500 Platinum Shield
NesPrgRom:21dfe-21dff::0
NesPrgRom:21e00-21e01::;\\n0
NesPrgRom:21e02-21e03::0
NesPrgRom:21e04-21e05::0
NesPrgRom:21e06-21e07::0
NesPrgRom:21e08-21e09::; 7 Swan\\n3000 Soldier Suit
NesPrgRom:21e0a-21e0b::6500 Ceramic Suit
NesPrgRom:21e0c-21e0d::2500 Ceramic Shield
NesPrgRom:21e0e-21e0f::6000 Battle Shield
NesPrgRom:21e10-21e11::;\\n0
NesPrgRom:21e12-21e13::0
NesPrgRom:21e14-21e15::0
NesPrgRom:21e16-21e17::0
NesPrgRom:21e18-21e19::; 9 Shyron\\n5500 Ceramic Suit
NesPrgRom:21e1a-21e1b::6000 Sacred Shield
NesPrgRom:21e1c-21e1d::5000 Battle Shield
NesPrgRom:21e1e-21e1f::0
NesPrgRom:21e20-21e21::;\\n0
NesPrgRom:21e22-21e23::0
NesPrgRom:21e24-21e25::0
NesPrgRom:21e26-21e27::0
NesPrgRom:21e28-21e2b:ToolShopIdTable:Leaf Herb, Antidote, Warp boots, Alarm flute
NesPrgRom:21e2c-21e2f::Brynmaer ...
NesPrgRom:21e54-21e55:ToolShopPriceTable:; 00 Leaf\\n30
NesPrgRom:21e56-21e57::40
NesPrgRom:21e58-21e59::60
NesPrgRom:21e5a-21e5b::50
NesPrgRom:21e5c-21e5d::; 01 Brynmaer\\n35
NesPrgRom:21e5e-21e5f::45
NesPrgRom:21e60-21e61::65
NesPrgRom:21e62-21e63::0
NesPrgRom:21e64-21e65::; 02 Oak\\n50
NesPrgRom:21e66-21e67::60
NesPrgRom:21e68-21e69::80
NesPrgRom:21e6a-21e6b::0
NesPrgRom:21e6c-21e6d::; 03 Amazones\\n100
NesPrgRom:21e6e-21e6f::150
NesPrgRom:21e70-21e71::150
NesPrgRom:21e72-21e73::0
NesPrgRom:21e74-21e75::; 04 Nadare\\n60
NesPrgRom:21e76-21e77::70
NesPrgRom:21e78-21e79::100
NesPrgRom:21e7a-21e7b::80
NesPrgRom:21e7c-21e7d::; 05 Portoa\\n90
NesPrgRom:21e7e-21e7f::120
NesPrgRom:21e80-21e81::200
NesPrgRom:21e82-21e83::180
NesPrgRom:21e84-21e85::; 06 Joel\\n120
NesPrgRom:21e86-21e87::150
NesPrgRom:21e88-21e89::180
NesPrgRom:21e8a-21e8b::300
NesPrgRom:21e8c-21e8d::; 07 Swan\\n180
NesPrgRom:21e8e-21e8f::200
NesPrgRom:21e90-21e91::300
NesPrgRom:21e92-21e93::350
NesPrgRom:21e94-21e95::; 08 Goa\\n500
NesPrgRom:21e96-21e97::600
NesPrgRom:21e98-21e99::700
NesPrgRom:21e9a-21e9b::800
NesPrgRom:21e9c-21e9d::; 09 Shyron\\n180
NesPrgRom:21e9e-21e9f::200
NesPrgRom:21ea0-21ea1::300
NesPrgRom:21ea2-21ea3::800
NesPrgRom:21ea4-21ea5::; 0a Sahara\\n1000
NesPrgRom:21ea6-21ea7::4000
NesPrgRom:21ea8-21ea9::3000
NesPrgRom:21eaa-21eab::1500
NesPrgRom:21eac-21ead:InnPrices:16  Leaf
NesPrgRom:21eae-21eaf::20  Brynmaer
NesPrgRom:21eb0-21eb1::40  Oak
NesPrgRom:21eb2-21eb3::80  Amazones
NesPrgRom:21eb4-21eb5::50  Nadare
NesPrgRom:21eb6-21eb7::100 Portoa
NesPrgRom:21eb8-21eb9::120 Joel
NesPrgRom:21eba-21ebb::150 Shyron
NesPrgRom:21ebc-21ebd::300 Goa
NesPrgRom:21ebe-21ebf::150 Swan
NesPrgRom:21ec0-21ec1::500 Sahara
NesPrgRom:21ec2-21ec3:PawnShopPrices:00 sword of wind
NesPrgRom:21ec4-21ec5::01 sword of fire
NesPrgRom:21ec6-21ec7::02 sword of water
NesPrgRom:21ec8-21ec9::03 sword of thunder
NesPrgRom:21eca-21ecb::04 crystalis
NesPrgRom:21ecc-21ecd::05 ball of wind
NesPrgRom:21ece-21ecf::06 tornado bracelet
NesPrgRom:21ed0-21ed1::07 ball of fire
NesPrgRom:21ed2-21ed3::08 flame bracelet
NesPrgRom:21ed4-21ed5::09 ball of water
NesPrgRom:21ed6-21ed7::0a blizzard bracelet
NesPrgRom:21ed8-21ed9::0b ball of thunder
NesPrgRom:21eda-21edb::0c storm bracelet
NesPrgRom:21edc-21edd::0d carapace shield
NesPrgRom:21ede-21edf::0e bronze shield
NesPrgRom:21ee0-21ee1::0f platinum shield
NesPrgRom:21ee2-21ee3::10 mirrored shield
NesPrgRom:21ee4-21ee5::11 ceramic shield
NesPrgRom:21ee6-21ee7::12 sacred shield
NesPrgRom:21ee8-21ee9::13 battle shield
NesPrgRom:21eea-21eeb::14 psycho shield
NesPrgRom:21eec-21eed::15 tanned hide
NesPrgRom:21eee-21eef::16 leather armor
NesPrgRom:21ef0-21ef1::17 bronze armor
NesPrgRom:21ef2-21ef3::18 platinum armor
NesPrgRom:21ef4-21ef5::19 soldier suit
NesPrgRom:21ef6-21ef7::1a ceramic suit
NesPrgRom:21ef8-21ef9::1b battle armor
NesPrgRom:21efa-21efb::1c psycho armor
NesPrgRom:21efc-21efd::1d medical herb     10
NesPrgRom:21efe-21eff::1e antidote         20
NesPrgRom:21f00-21f01::1f lysis plant      95
NesPrgRom:21f02-21f03::20 fruit of lime    90
NesPrgRom:21f04-21f05::21 fruit of power   65
NesPrgRom:21f06-21f07::22 magic ring      500
NesPrgRom:21f08-21f09::23 fruit of repun 1000
NesPrgRom:21f0a-21f0b::24 warp boots       30
NesPrgRom:21f0c-21f0d::25 statue of onyx
NesPrgRom:21f0e-21f0f::26 opel statue     300
NesPrgRom:21f10-21f11::27 insect flute
NesPrgRom:21f12-21f13::28 flute of lime
NesPrgRom:21f14-21f15::29 gas mask
NesPrgRom:21f16-21f17::2a power ring
NesPrgRom:21f18-21f19::2b warrior ring
NesPrgRom:21f1a-21f1b::2c iron necklace
NesPrgRom:21f1c-21f1d::2d deos pendant
NesPrgRom:21f1e-21f1f::2e rabbit boots
NesPrgRom:21f20-21f21::2f leather boots
NesPrgRom:21f22-21f23::30 shield ring
NesPrgRom:21f24-21f25::31 alarm flute      25
NesPrgRom:21f26-21f27::32 windmill key
NesPrgRom:21f28-21f29::33 key to prison
NesPrgRom:21f2a-21f2b::34 key to styx
NesPrgRom:21f2c-21f2d::35 fog lamp
NesPrgRom:21f2e-21f2f::36 shell flute
NesPrgRom:21f30-21f31::37 eye glasses
NesPrgRom:21f32-21f33::38 broken statue
NesPrgRom:21f34-21f35::39 glowing lamp
NesPrgRom:21f36-21f37::3a statue of gold
NesPrgRom:21f38-21f39::3b love pendant
NesPrgRom:21f3a-21f3b::3c kirisa plant
NesPrgRom:21f3c-21f3d::3d ivory statue
NesPrgRom:21f3e-21f3f::3e bow of moon
NesPrgRom:21f40-21f41::3f bow of sun
NesPrgRom:21f42-21f43::40 bow of truth
NesPrgRom:21f44-21f45::41 refresh
NesPrgRom:21f46-21f47::42 paralysis
NesPrgRom:21f48-21f49::43 telepathy
NesPrgRom:21f4a-21f4b::44 teleport
NesPrgRom:21f4c-21f4d::45 recover
NesPrgRom:21f4e-21f4f::46 barrier
NesPrgRom:21f50-21f51::47 change
NesPrgRom:21f52-21f53::48 flight
NesPrgRom:21f54-21f63:ShopLocations:
NesPrgRom:21f75-21f84:ShopIndices:
NesPrgRom:21f96-21f99:ShopItemHorizontalPositions:
NesPrgRom:21f9a-21fa9::;; --------------------------------\\n; UNUSED?
NesPrgRom:22000:MainLoop_PrepareEndingSequence:
NesPrgRom:22056:JumpTable_22140_01:
NesPrgRom:22062::$22065
NesPrgRom:22069:JumpTable_22140_02:
NesPrgRom:22075::$22078
NesPrgRom:2207c:_2207c:
NesPrgRom:2208f::$22097
NesPrgRom:22094::$2209a
NesPrgRom:220a2:JumpTable_22140_03:
NesPrgRom:220b5::$220b8
NesPrgRom:220bc:JumpTable_22140_04:
NesPrgRom:220c8::$220cb
NesPrgRom:220cf:_220cf:
NesPrgRom:220d4::$220dc
NesPrgRom:220d9::$220e6
NesPrgRom:220df::$220e3
NesPrgRom:220eb:CreditsWaitForTimer:Countdown for ending credits
NesPrgRom:220ee::$220f1
NesPrgRom:220f3::604 stores frames, 605 stores seconds
NesPrgRom:220f9::$220fc
NesPrgRom:22100:MainLoop_EndingSequence:; Run OAM sprite updates every frame
NesPrgRom:22104::; $8c appears to be a timer thats only updated here
NesPrgRom:2211a-2211b:CreditsModeTable:
NesPrgRom:22120:_22120:
NesPrgRom:22124::$22127
NesPrgRom:22140-22141:JumpTable_22140:
NesPrgRom:2214a:CreditsModeRunScene:
NesPrgRom:2214d::$22152
NesPrgRom:22166-22167:EndCreditsSceneTable:00
NesPrgRom:22168-22169::01
NesPrgRom:2216a-2216b::02
NesPrgRom:2216c-2216d::03
NesPrgRom:2216e-2216f::04
NesPrgRom:22170-22171::05
NesPrgRom:22172-22173::06
NesPrgRom:22174-22175::07
NesPrgRom:22176-22177::08
NesPrgRom:22178-22179::09
NesPrgRom:2217a-2217b::0a
NesPrgRom:2217c-2217d::0b
NesPrgRom:2217e-2217f::0c
NesPrgRom:22180-22181::0d
NesPrgRom:22182-22183::0e
NesPrgRom:22184-22185::0f
NesPrgRom:22186-22187::10
NesPrgRom:22188-22189::11
NesPrgRom:2218a-2218b::12
NesPrgRom:2218c-2218d::13
NesPrgRom:2218e-2218f::14
NesPrgRom:22190-22191::15
NesPrgRom:22192-22193::16
NesPrgRom:22194-22195::17
NesPrgRom:22196-22197::18
NesPrgRom:22198-22199::19
NesPrgRom:2219a-2219b::1a
NesPrgRom:2219c-2219d::1b
NesPrgRom:2219e-2219f::1c
NesPrgRom:221a0-221a1::1d
NesPrgRom:221a2:_221a2:
NesPrgRom:221ab:_221ab:
NesPrgRom:221bc:CreditScene_00:
NesPrgRom:22209:CreditScene_02:
NesPrgRom:22212:CreditScene_03:
NesPrgRom:22216::$2221b
NesPrgRom:22222::$2222c
NesPrgRom:22229::$22220
NesPrgRom:2226f::$22283
NesPrgRom:22277::$22283
NesPrgRom:2228b::$22287
NesPrgRom:222be::$222d2
NesPrgRom:222c6::$222d2
NesPrgRom:222d7::$22301
NesPrgRom:222e1::$222dd
NesPrgRom:2230c::$22321
NesPrgRom:22317::$22321
NesPrgRom:22326::$22329
NesPrgRom:22337:_22337:
NesPrgRom:22346::$2234b
NesPrgRom:22384::$22363
NesPrgRom:2238f:CreditScene_05:
NesPrgRom:22398::$2239c
NesPrgRom:2239e::$223a1
NesPrgRom:223a5::$223a8
NesPrgRom:223ba::$223bd
NesPrgRom:223cb:CreditScene_07:
NesPrgRom:2241a::$2240c
NesPrgRom:2247a:CreditScene_08:
NesPrgRom:22483:CreditScene_0b:
NesPrgRom:224a8:CreditScene_0d:
NesPrgRom:224af:CreditScene_0e:
NesPrgRom:224e3-224e4:DataTable_224e3:
NesPrgRom:224e5-224eb:DataTable_224e5:
NesPrgRom:224ec:CreditScene_11:
NesPrgRom:224f3:CreditScene_12:
NesPrgRom:2257a-2257b:DataTable_2257a:
NesPrgRom:2257c-22589:DataTable_2257c:
NesPrgRom:2258e:CreditScene_0f:
NesPrgRom:22597:CreditScene_13:; This is all of the scenes with a "half width" background on the left\\n; So thats Simea fighting Draygon 2 through oasis credit scenes.\\n; $8d holds which scene is used
NesPrgRom:2259e::Exits the scene
NesPrgRom:225ba:CreditScene_13_DrawNames:
NesPrgRom:225fa:_225fa:
NesPrgRom:22603:CreditScene_15:This scene resets the scene back to 13. Its used to fade back in after the timer\\nfinished and incremented the mode to 15
NesPrgRom:22613:CreditScene_16:
NesPrgRom:2261e::$2261a
NesPrgRom:22657:CreditScene_18:
NesPrgRom:2265e-2266d:DataTable_2265e:;; Control bytes for CreditScene_13\\n;; Nonzero redraws the names on the right\\n;; negative ends the mode and fades out.
NesPrgRom:22696:CreditScene_19:
NesPrgRom:226d8:CreditScene_1a:
NesPrgRom:226e1::$226e6
NesPrgRom:226ea::$226ed
NesPrgRom:226fb:CreditsDisplayTheEND:; Copy a new palete for the THE END sprites
NesPrgRom:2271b:EndingCreditsFinished:
NesPrgRom:2271c-2271d:DataTable_2271c:
NesPrgRom:2271e-2271f::;; --------------------------------\\n;; UNUSED
NesPrgRom:22720:DisableNMI_altbank11:
NesPrgRom:22728:EnableNMI_altbank11:
NesPrgRom:22730:_22730:
NesPrgRom:2273a:_2273a:
NesPrgRom:22744:WaitForOAMDMA_altbank11:
NesPrgRom:2274a::$22748
NesPrgRom:22751:_22751:
NesPrgRom:22771::$2276d
NesPrgRom:22775::$2276b
NesPrgRom:2277f::$2277b
NesPrgRom:22788:_22788:
NesPrgRom:227a0:_227a0:
NesPrgRom:227cb::$227c4
NesPrgRom:22802::$22806
NesPrgRom:22819::$227c0
NesPrgRom:2281c:CreditWriteScreenFromB000:;; Writes the data to the name table with the following parameters\\n;; $88-$89 address to read the stored data from. Format of the data is below\\n;; $8a-$8b nametable address to draw at\\n;;\\n;; Internal variables\\n;; $84-$85 copy of the read address\\n;; $80-$81 first two bytes at ($88) are read into\\n;;         outer loop counter $88, and the inner loop counter $89
NesPrgRom:2283c:CreditsCopyTileLoop:
NesPrgRom:2286d::$22846
NesPrgRom:228dc::$228e1
NesPrgRom:228de::$2283c
NesPrgRom:228ec::$228e5
NesPrgRom:22922::$22919
NesPrgRom:2292f::$22926
NesPrgRom:2293c::$22933
NesPrgRom:2294b:CreditsAnimateSpriteFromTable:
NesPrgRom:22956::$22952
NesPrgRom:22967:CreditsLoadSpriteUntilFF:
NesPrgRom:2296d::$22970
NesPrgRom:22976::$22980
NesPrgRom:2297b::$22990
NesPrgRom:2298b::$2298e ; jumps past the 4c c9 a9 is cmp #$a9
NesPrgRom:22996::$229a0
NesPrgRom:2299b::$229b0
NesPrgRom:229ab::$229ae ; !! c9 a9 is \`cmp #$a9\`, irrelevant?
NesPrgRom:229b7::$229ba ; skips next instruction
NesPrgRom:229bc::; ----
NesPrgRom:229c9:_229c9:
NesPrgRom:229d7:WriteOAMDataFromTable:
NesPrgRom:229d9::Clear out OAM before writing
NesPrgRom:229e2::$229de
NesPrgRom:229f7::229fa
NesPrgRom:22a17:_22a17:
NesPrgRom:22a1f::$22a1b
NesPrgRom:22a22:_22a22:
NesPrgRom:22a27::$22a2b
NesPrgRom:22a41::$22a37
NesPrgRom:22a52::$22a4a
NesPrgRom:22a55:CopyPaletteFrom0618AndReturn:
NesPrgRom:22a5e::$22a57
NesPrgRom:22a61:CopyPaletteFrom0618:
NesPrgRom:22a6c::$22a63
NesPrgRom:22a74:CreditsMode_01:;; This appears to be the fade in mode\\n;; since its writing to the palette every 8 frames and increasing the value of the colors
NesPrgRom:22a78::$22a7b
NesPrgRom:22a88::$22a90
NesPrgRom:22a8d::$22a96
NesPrgRom:22a97::$22a82
NesPrgRom:22a9e::$22aa1
NesPrgRom:22aa7:CreditsChangeToMode2:
NesPrgRom:22aad:CreditsMode_02:;; This appears to be a fade out mode that updates the palette.\\n;; $6140 - $615f is the address range used for palette updates
NesPrgRom:22ab1::$22ab4
NesPrgRom:22ac0::$22ac8
NesPrgRom:22ac5::$22adc
NesPrgRom:22acb::$22ad5
NesPrgRom:22ad2::$22adc
NesPrgRom:22add::$22abb
NesPrgRom:22ae4::$22ae7
NesPrgRom:22aed-22aef:DataTable_22aed:
NesPrgRom:22b1d:_22b1d:
NesPrgRom:22b48::$22b41
NesPrgRom:22b92::$22b3d
NesPrgRom:22b95-22b96:DataTable_22b95:
NesPrgRom:22b97-22b9f:DataTable_22b97:
NesPrgRom:22bd9-22bda:DataTable_22bd9:
NesPrgRom:22bdb-22bdf:DataTable_22bdb:
NesPrgRom:22c83-22c84:DataTable_22c83:;; Simea fighting Draygon 2 scene
NesPrgRom:22c85-22c8f:DataTable_22c85:
NesPrgRom:22d38-22d3f::;;-------------------
NesPrgRom:22deb-22def::;;-------------------
NesPrgRom:22e9e-22e9f::;;-------------------\\nRabbit jumping through the field lookup offsets\\nThe address for this is looked up through ????\\nBut whatever its still an offset into $23004
NesPrgRom:22eeb-22eef::Rabbit jumping attribute data
NesPrgRom:22f2b-22f2f::Rabbit jumping bg palette data
NesPrgRom:22f3b-22f3f::Rabbit jumping sprite palette data
NesPrgRom:22f4b-22f50::Rabbit jumping CHR banks
NesPrgRom:22f51-22f5f::;;--------------------
NesPrgRom:23004-23013:EndCreditsTileIds_TopLeft:
NesPrgRom:230c4-230d3:EndCreditsTileIds_TopRight:
NesPrgRom:23184-23193:EndCreditsTileIds_BottomLeft:
NesPrgRom:23244-23253:EndCreditsTileIds_BottomRight:
NesPrgRom:23304-23305:DataTable_23304:; THE END credit scene nmt data\\n; Address to read the data from
NesPrgRom:23306-23307:DataTable_23306:; Copied into $80 (inner loop counter) and $81 (outer loop counter)
NesPrgRom:23308-2330f::; The following bytes are offsets from these addresses and are drawn\\n; in a 2x2 square as follows.\\n; (16x16 pixels probably to match the attribute table)\\n; $23004 - top left\\n; $230c4 - top right\\n; $23184 - bottom left\\n; $23244 - bottom right
NesPrgRom:233f8-233ff::; attribute data for the nametable
NesPrgRom:23438-23447::; background palette data
NesPrgRom:23448-23457::; sprite palette data
NesPrgRom:23458-2345d::; CHR banks (bg 0,1 then sprite 0,1,2,3)
NesPrgRom:2345e-2345f:OAMWriteTable:; Each entry is a pointer to a complete OAM update. The order is Byte 2, 3, 0, 1
NesPrgRom:2346c-2346d::THE END
NesPrgRom:23472:OAMWriteTable_04:
NesPrgRom:23473-2347f:OAMWriteTable_00:
NesPrgRom:23540-2354f:OAMWriteTable_01:
NesPrgRom:235b1-235bf:OAMWriteTable_02:
NesPrgRom:23602-2360f:OAMWriteTable_03:
NesPrgRom:2363f:OAMWriteTable_05:
NesPrgRom:236c0-236cf:OAMWriteTable_06:
NesPrgRom:236d9-236df:OAMWriteTable_07:;; THE END sprite
NesPrgRom:23746-2374f:OAMWriteTable_08:
NesPrgRom:2382f:OAMWriteTable_09:
NesPrgRom:23854-23855:DataTable_23854:
NesPrgRom:23856-2385f:DataTable_23856:
NesPrgRom:238d2-238d3:CreditScene_13_AddrTable:unused
NesPrgRom:238e6-238ef:CreditScene_13_01:;;--------------------
NesPrgRom:23968-2396f:CreditScene_13_02:;;--------------------
NesPrgRom:239ea-239ef:CreditScene_13_03:;;--------------------
NesPrgRom:23a6c-23a6f:CreditScene_13_04:;;--------------------
NesPrgRom:23aee-23aef:CreditScene_13_05:;;--------------------
NesPrgRom:23b70-23b7f:CreditScene_13_06:;;--------------------
NesPrgRom:23bf2-23bff:CreditScene_13_07:;;--------------------
NesPrgRom:23c74-23c7f:CreditScene_13_08:;;--------------------
NesPrgRom:23cf6-23cff:CreditScene_13_09:;;--------------------
NesPrgRom:23d78-23d79:DataTable_23d78:
NesPrgRom:23d7a-23d7f:DataTable_23d7a:
NesPrgRom:23e37-23e38:DataTable_23e37:
NesPrgRom:23e39-23e3f:DataTable_23e39:
NesPrgRom:23fc0-23fcf::;; ----------------\\n;; UNUSED?
NesPrgRom:24000-24001:SNKLogoRectanglePointer:$02,$80
NesPrgRom:24002-24003:SNKLogoRectangle:12 columns, 3 rows
NesPrgRom:24028:AnimateSNKLogo:
NesPrgRom:2402e::; Select Pattern tables.
NesPrgRom:24038::probably the SNK logo animation?
NesPrgRom:2405f::; Tile data at $24002
NesPrgRom:24069::; PPUADDR start $21ca (11.25, 10) to NT0
NesPrgRom:24071::; 12 columns, 3 rows
NesPrgRom:240a3::$24097
NesPrgRom:240b0::$240a5
NesPrgRom:240b8::$240a5
NesPrgRom:240cb::$240c5
NesPrgRom:240dc::$240d0
NesPrgRom:240de::animation finished, return.
NesPrgRom:240df:_240df:
NesPrgRom:240e7:_240e7:
NesPrgRom:240f1:_240f1:
NesPrgRom:24131::$24134
NesPrgRom:24153::$2416a
NesPrgRom:2415b::$24162
NesPrgRom:24160::$2416a
NesPrgRom:24167::$2416e
NesPrgRom:24171::$2412d
NesPrgRom:24174:DisableNMI_alt2:
NesPrgRom:2417c:EnableNMI_alt2:
NesPrgRom:24184:DisableSpritesAndLeftColumnRendering:
NesPrgRom:2418e:EnableSpritesAndLeftColumnRendering:
NesPrgRom:2419a::$24198
NesPrgRom:241a1:BlankNametable:
NesPrgRom:241b2::$2006
NesPrgRom:241b5::; Writes $72 to PPUDATA 4 * 240 times, filling the nametable.
NesPrgRom:241c1::$241bd
NesPrgRom:241c5::$241bb
NesPrgRom:241c7::; Write $73 to PPUDATA 4 * 16 times, filling the attribute table.
NesPrgRom:241cf::$241cb
NesPrgRom:241d8:ClearSpriteOAMSpace:
NesPrgRom:241de::$241e6
NesPrgRom:241e2::$241e6
NesPrgRom:241e4::; Screen mode was neither 0 (normal) or 3 (intro movie)
NesPrgRom:241ed::$241e6
NesPrgRom:241f0:WriteRectangleToNametable:
NesPrgRom:241f6::; Read 2 bytes from 8e8f
NesPrgRom:24201::; Add 2 to 8e8f
NesPrgRom:2421c::; Add 32 to PPUADDR for next time (i.e. next row)
NesPrgRom:24232::$24227
NesPrgRom:24235::; Advance 8e8f by the amount we've read, to keep up
NesPrgRom:24242::$2420e
NesPrgRom:2424b::;; --------------------------------\\n;; UNUSED
NesPrgRom:24271::$2426a
NesPrgRom:242b0::$24263
NesPrgRom:242b3:ClearMapPaletteSpace:
NesPrgRom:242bb::$242b7
NesPrgRom:242be:LoadTitleMoviePalette:
NesPrgRom:242c3::$242c7
NesPrgRom:242cf::; Copy the A-th 16 bytes from the table into 6d0 or 6e0\\n; (depending on the sign of A).
NesPrgRom:242dd::$242d3
NesPrgRom:242df::; Copy some more??? TODO - what?
NesPrgRom:242ee::$242e6
NesPrgRom:242f1:_242f1:
NesPrgRom:242fa::$242f3
NesPrgRom:242fd:TitleScreenFadeIn:
NesPrgRom:24308::$242ff
NesPrgRom:24310:TitleScreenJump_1:
NesPrgRom:24315::$24318
NesPrgRom:24325::$2432d
NesPrgRom:2432a::$24333
NesPrgRom:24334::$2431f
NesPrgRom:2433e:TitleScreenResumeMovie:
NesPrgRom:24344:TitleScreenFadeOut:
NesPrgRom:2434a:TitleScreenJump_2:
NesPrgRom:2434f::$24352
NesPrgRom:2435e::$24366
NesPrgRom:24363::$2437a
NesPrgRom:24369::$24373
NesPrgRom:24370::$2437a
NesPrgRom:2437b::$24359
NesPrgRom:24382::$24385
NesPrgRom:2438b-2439a:TitleMoviePaletteTable:
NesPrgRom:2447b-2447c:DataTable_2447b:
NesPrgRom:2447d-2447f:DataTable_2447d:
NesPrgRom:24607-24608:DataTable_24607:
NesPrgRom:24609-2460f:DataTable_24609:
NesPrgRom:24793-24794:DataTable_24793:
NesPrgRom:24795-2479f:DataTable_24795:
NesPrgRom:2491f-24920:DataTable_2491f:
NesPrgRom:24921-2492f:DataTable_24921:
NesPrgRom:24aab-24aac:DataTable_24aab:
NesPrgRom:24aad-24aaf:DataTable_24aad:
NesPrgRom:24c37-24c38:DataTable_24c37:
NesPrgRom:24c39-24c3f:DataTable_24c39:
NesPrgRom:24c5b-24c5c:DataTable_24c5b:
NesPrgRom:24c5d-24c5f:DataTable_24c5d:
NesPrgRom:24c7f-24c80:DataTable_24c7f:
NesPrgRom:24c81-24c8f:DataTable_24c81:
NesPrgRom:24d73-24d74:DataTable_24d73:
NesPrgRom:24d75-24d7f:DataTable_24d75:
NesPrgRom:24e67-24e68:DataTable_24e67:
NesPrgRom:24e69-24e6f:DataTable_24e69:
NesPrgRom:24e8b-24e8c:DataTable_24e8b:
NesPrgRom:24e8d-24e8f:DataTable_24e8d:
NesPrgRom:24eaf-24eb0:DataTable_24eaf:
NesPrgRom:24eb1-24ebf:DataTable_24eb1:
NesPrgRom:24ef3-24ef4:DataTable_24ef3:
NesPrgRom:24ef5-24eff:DataTable_24ef5:
NesPrgRom:24f17-24f18:DataTable_24f17:$8f19
NesPrgRom:24f19-24f1f:DataTable_24f19:
NesPrgRom:24f3b-24f3c:DataTable_24f3b:NOTE loaded from 8000 page
NesPrgRom:24f52-24f5f:DataTable_24f3b_00:
NesPrgRom:24f90-24f91:DataTable_24f3b_01:
NesPrgRom:24f95-24f96:DataTable_24f3b_02:
NesPrgRom:24f9a-24f9b:DataTable_24f3b_03:
NesPrgRom:24fa2-24fa3:DataTable_24f3b_04:
NesPrgRom:24fad-24fae:DataTable_24f3b_05:
NesPrgRom:24fbb-24fbc:DataTable_24f3b_06:
NesPrgRom:24fcf-24fd0:DataTable_24f3b_07:
NesPrgRom:24fe6-24fe7:DataTable_24f3b_08:
NesPrgRom:25006-25007:DataTable_24f3b_09:
NesPrgRom:2501d-2501e:DataTable_24f3b_0a:
NesPrgRom:25052-2505f::;; --------------------------------
NesPrgRom:254be-254bf:DataTable_254be:
NesPrgRom:254c0-254cf:DataTable_254c0:
NesPrgRom:258c2-258c6:DataTable_258c2:
NesPrgRom:25908-2590f:DataTable_25908:
NesPrgRom:259d0-259d1:DataTable_259d0:Loaded from 8000 bank
NesPrgRom:259d2-259df:DataTable_259d2:
NesPrgRom:25dd4-25dd5:DataTable_25dd4:
NesPrgRom:25dd6-25ddf:DataTable_25dd6:
NesPrgRom:25ec2-25ed1:DataTable_25ec2:
NesPrgRom:25f02-25f0f:DataTable_25f02:
NesPrgRom:25f42-25f4f:DataTable_25f42:
NesPrgRom:25fc2:TitleScreen00SubJump_Delay:
NesPrgRom:25fc5::$25fc8
NesPrgRom:25fcc:MainLoop_PrepareTitleScreen:
NesPrgRom:25fe3::$25fdd
NesPrgRom:25feb::$25fe7
NesPrgRom:26015:MainLoop_TitleScreen:
NesPrgRom:26018::$2601d
NesPrgRom:26038-26039:TitleScreenJumpTable:0 $2603e MovieScene
NesPrgRom:2603a-2603b::1 $24310 FadeIn
NesPrgRom:2603c-2603d::2 $2434a FadeOut
NesPrgRom:2603e:TitleScreenJump_0:
NesPrgRom:26052-26053:TitleMovieJumpTable:0 $2679f Title loop
NesPrgRom:26054-26055::1 $26bb4 Switching to start movie
NesPrgRom:26056-26057::2 $26bea Start movie
NesPrgRom:26058-26059::3 $260b5 Switching to computer
NesPrgRom:2605a-2605b::4 $26176 Booting/running computer
NesPrgRom:2605c-2605d::5 $26653 Switching to title page
NesPrgRom:2605e-2605f::6 $266df Title page
NesPrgRom:26064:TitleLoopSceneJump_FadeOut:
NesPrgRom:26070:TitleLoopSceneJump_00:
NesPrgRom:26075::Title screen delay timer
NesPrgRom:2607c:TitleMovieFlushSound:
NesPrgRom:26096::$26092
NesPrgRom:260a5:_260a5:
NesPrgRom:260b5:TitleMovieJump_3:
NesPrgRom:26157::$26137
NesPrgRom:2616a-2616d:DataTable_2616a:
NesPrgRom:2616e-26171:DataTable_2616e:
NesPrgRom:26172-26175:DataTable_26172:
NesPrgRom:26176:TitleMovieJump_4:
NesPrgRom:26193-26194:JumpTable_26193:NOTE Read from a000 bank
NesPrgRom:261a1:JumpTable_26193_00:
NesPrgRom:261aa:_261aa:
NesPrgRom:261de::$261ec
NesPrgRom:261e9::$26207
NesPrgRom:261ef::$26207
NesPrgRom:261ff::$26207
NesPrgRom:2620f::$261be
NesPrgRom:26212:_26212:
NesPrgRom:26215::$26218
NesPrgRom:2624f::$2622b
NesPrgRom:26256::$26259
NesPrgRom:26264::$26267
NesPrgRom:2626b:JumpTable_26193_01:
NesPrgRom:26270::$26273
NesPrgRom:2627c:JumpTable_26193_02:
NesPrgRom:2627f::$26282
NesPrgRom:2628c:_2628c:
NesPrgRom:26290::this is just always #$16
NesPrgRom:262d3::$262cf
NesPrgRom:26349-2634d:DataTable_26349:
NesPrgRom:2634e:JumpTable_26193_03:
NesPrgRom:26353::$26356
NesPrgRom:26359::$263bd
NesPrgRom:263b4::$263b7
NesPrgRom:263c0::$263c3
NesPrgRom:263c7::$263cc
NesPrgRom:263dd:JumpTable_26193_04:
NesPrgRom:263eb::$263e4
NesPrgRom:263f6:JumpTable_26193_05:
NesPrgRom:2641b::$26420
NesPrgRom:26424::$26429
NesPrgRom:2642d::$26430
NesPrgRom:26435::$2643a
NesPrgRom:2643c::$26441
NesPrgRom:26443::$26448
NesPrgRom:26466::$2646a
NesPrgRom:2646e::#$0d
NesPrgRom:26475::#$21
NesPrgRom:264b1-264b2:DataTable_264b1:
NesPrgRom:264b3::;; --------------------------------\\n;; UNUSED??? (12 bytes)
NesPrgRom:264bf:_264bf:
NesPrgRom:264c8::$264cc
NesPrgRom:264d0:_264d0:
NesPrgRom:264db::$264df
NesPrgRom:264e3:_264e3:
NesPrgRom:264ea::$264f2
NesPrgRom:264ed::$264e5
NesPrgRom:264ef::; Player name was empty
NesPrgRom:26502::$26511
NesPrgRom:26506::$26520
NesPrgRom:2650e::$26528
NesPrgRom:2651d::$26528
NesPrgRom:2652d::$264fd
NesPrgRom:2653b:_2653b:
NesPrgRom:26550::$26559
NesPrgRom:26556::$2654b
NesPrgRom:26560::$26569
NesPrgRom:26566::$2655b
NesPrgRom:2656c-2656d:DataTableAddress_2656e:$a56e
NesPrgRom:2656e-26574:DataTable_2656e:; Default player name (stored in $6418)
NesPrgRom:26575-2657b::; Secondary name or maybe placeholder (stored in $6410)
NesPrgRom:2657c:JumpTable_26193_06:
NesPrgRom:26585:_26585:
NesPrgRom:26589::$26590
NesPrgRom:26598::$265b3
NesPrgRom:265a0::$265a4
NesPrgRom:265ae::$2659a
NesPrgRom:265b6::$265cf
NesPrgRom:265bc::$265c0
NesPrgRom:265ca::$265b8
NesPrgRom:265d2::$265ef
NesPrgRom:265dc::$265e0
NesPrgRom:265ea::$265d4
NesPrgRom:265fc::$26600
NesPrgRom:2660a::$265f4
NesPrgRom:2660c:_2660c:
NesPrgRom:2663c::$2663f
NesPrgRom:26644::$26647
NesPrgRom:26649::$2664c
NesPrgRom:26653:TitleMovieJump_5:
NesPrgRom:266dd-266de:DataTable_266dd:$258c2
NesPrgRom:266df:TitleMovieJump_6:
NesPrgRom:266e4::$266f3
NesPrgRom:266ea::$266f4
NesPrgRom:266f3-266f4:TitleMenuJumpTable:
NesPrgRom:266f7-266f8::2 $26796
NesPrgRom:266f9:_266f9:
NesPrgRom:2672a::$266fe
NesPrgRom:26749:TitleMenuJump_01:;; --------------------------------\\n;; Look for select/start while on main menu
NesPrgRom:26758::$2675b
NesPrgRom:2675e::$26761
NesPrgRom:26768:TitleMenuHandleSelect:
NesPrgRom:2677b-2677c:DataTable_2677b:
NesPrgRom:2677d:TitleMenuHandleStart:
NesPrgRom:26789::$26790
NesPrgRom:26796:TitleMenuJump_02:
NesPrgRom:2679f:TitleMovieJump_0:
NesPrgRom:267a1::Select|Start
NesPrgRom:267a3::$267a8
NesPrgRom:267bc-267bd:TitleLoopSceneJumpTable:00
NesPrgRom:267be-267bf::01
NesPrgRom:267c0-267c1::02
NesPrgRom:267c2-267c3::03
NesPrgRom:267c4-267c5::04
NesPrgRom:267c6-267c7::05
NesPrgRom:267c8-267c9::06
NesPrgRom:267ca-267cb::07
NesPrgRom:267cc-267cd::08
NesPrgRom:267ce-267cf::09
NesPrgRom:267d0-267d1::0a
NesPrgRom:267d2-267d3::0b
NesPrgRom:267d4-267d5::0c
NesPrgRom:267d6-267d7::0d
NesPrgRom:267d8-267d9::0e
NesPrgRom:267da-267db::0f
NesPrgRom:267dc-267dd::10
NesPrgRom:267de-267df::11
NesPrgRom:267e0-267e1::12
NesPrgRom:267e2-267e3::13
NesPrgRom:267e4-267e5::14
NesPrgRom:267e6-267e7::15
NesPrgRom:267e8-267e9::16
NesPrgRom:267ea-267eb::17
NesPrgRom:267ec-267ed::18
NesPrgRom:267ee:TitleLoop_Button:
NesPrgRom:267f6:TitleLoopSceneJump_02:
NesPrgRom:26843:TitleLoopSceneJump_06:
NesPrgRom:268a8::row 0 -> bg
NesPrgRom:268ad::row 0 -> fg
NesPrgRom:268c8-268cc:DataTable_268c8:; Maybe durations/times for the different sounds???
NesPrgRom:268cd-268d1:DataTable_268cd:; Sound effects for thundercracks
NesPrgRom:268d2:TitleLoopSceneJump_07:
NesPrgRom:268ed::$268fb
NesPrgRom:268f8::$2692c
NesPrgRom:268fe::$2692c
NesPrgRom:2690e::$26919
NesPrgRom:26916::play thunder sound
NesPrgRom:26922::$2692c
NesPrgRom:2692d:TitleLoopSceneJump_08:
NesPrgRom:26944::$26947
NesPrgRom:26953:TitleLoopSceneJump_0b:
NesPrgRom:26a16:TitleLoopSceneJump_0c:
NesPrgRom:26a24::$26a27
NesPrgRom:26a30:TitleLoopSceneJump_10:
NesPrgRom:26ac2:TitleLoopSceneJump_11:
NesPrgRom:26ac7::$26acc
NesPrgRom:26ae4::$26ae7
NesPrgRom:26aea::$26aed
NesPrgRom:26af1:TitleLoopSceneJump_14:
NesPrgRom:26b81:TitleLoopSceneJump_15:
NesPrgRom:26b86::$26b89
NesPrgRom:26ba4::$26ba7
NesPrgRom:26bab:TitleLoopSceneJump_18:
NesPrgRom:26bb4:TitleMovieJump_1:
NesPrgRom:26bea:TitleMovieJump_2:
NesPrgRom:26bee::$26bf3
NesPrgRom:26c07-26c08:JumpTable_26c07:00
NesPrgRom:26c09-26c0a::01
NesPrgRom:26c0b-26c0c::02
NesPrgRom:26c0d-26c0e::03
NesPrgRom:26c0f-26c10::04
NesPrgRom:26c11-26c12::05
NesPrgRom:26c13-26c14::06
NesPrgRom:26c15-26c16::07
NesPrgRom:26c17-26c18::08
NesPrgRom:26c19-26c1a::09
NesPrgRom:26c1b-26c1c::0a
NesPrgRom:26c1d-26c1e::0b
NesPrgRom:26c1f-26c20::0c
NesPrgRom:26c21-26c22::0d
NesPrgRom:26c23-26c24::0e
NesPrgRom:26c25-26c26::0f
NesPrgRom:26c27-26c28::10
NesPrgRom:26c29-26c2a::11
NesPrgRom:26c2b-26c2c::12
NesPrgRom:26c2d-26c2e::13
NesPrgRom:26c2f-26c30::14
NesPrgRom:26c31-26c32::15
NesPrgRom:26c33-26c34::16
NesPrgRom:26c35-26c36::17
NesPrgRom:26c37-26c38::18
NesPrgRom:26c39-26c3a::19
NesPrgRom:26c3b-26c3c::1a
NesPrgRom:26c3d-26c3e::1b
NesPrgRom:26c3f:JumpTable_26c07_00:
NesPrgRom:26cd7::$26cb9
NesPrgRom:26cda-26cde:DataTable_26cda:
NesPrgRom:26cdf-26ce3:DataTable_26cdf:
NesPrgRom:26ce4-26ce8:DataTable_26ce4:
NesPrgRom:26ce9:JumpTable_26c07_01:
NesPrgRom:26cf2::$26cf5
NesPrgRom:26cf9:JumpTable_26c07_02:
NesPrgRom:26d20::$26d23
NesPrgRom:26d27:JumpTable_26c07_03:
NesPrgRom:26d5e:JumpTable_26c07_04:
NesPrgRom:26d8b::$26d99
NesPrgRom:26d96::$26db4
NesPrgRom:26d9c::$26db4
NesPrgRom:26dac::$26db4
NesPrgRom:26db9::$26de1
NesPrgRom:26dd3::$26de1
NesPrgRom:26de9::$26d6b
NesPrgRom:26dee::$26df1
NesPrgRom:26df5-26df9:DataTable_26df5:
NesPrgRom:26dfa-26dfe:DataTable_26dfa:
NesPrgRom:26dff:JumpTable_26c07_05:
NesPrgRom:26e06:JumpTable_26c07_06:
NesPrgRom:26e3d:JumpTable_26c07_0a:
NesPrgRom:26ebf::$26e9b
NesPrgRom:26ec2-26ec9:DataTable_26ec2:
NesPrgRom:26eca-26ed1:DataTable_26eca:
NesPrgRom:26ed2-26ed9:DataTable_26ed2:
NesPrgRom:26eda-26ee1:DataTable_26eda:
NesPrgRom:26ee2-26ee9:DataTable_26ee2:
NesPrgRom:26eea:JumpTable_26c07_0b:
NesPrgRom:26ef3::$26ef6
NesPrgRom:26f14:JumpTable_26c07_0c:
NesPrgRom:26f21:_26f21:
NesPrgRom:26f41::$26f4f
NesPrgRom:26f4c::$26f6a
NesPrgRom:26f52::$26f6a
NesPrgRom:26f62::$26f6a
NesPrgRom:26f6f::$26f9e
NesPrgRom:26f89::$26f92
NesPrgRom:26f90::$26f9e
NesPrgRom:26fa6::$26fab
NesPrgRom:26fae::$26fb1
NesPrgRom:26fb4::$26fb7
NesPrgRom:26fbb-26fc2:DataTable_26fbb:
NesPrgRom:26fc3-26fca:DataTable_26fc3:
NesPrgRom:26fcb:JumpTable_26c07_0d:
NesPrgRom:26fd2:JumpTable_26c07_0e:
NesPrgRom:27009:JumpTable_26c07_12:
NesPrgRom:27092:JumpTable_26c07_13:
NesPrgRom:270ad::$270bb
NesPrgRom:270be::$270c3
NesPrgRom:270d1::$270d6
NesPrgRom:270eb:_270eb:
NesPrgRom:270ee::$270f1
NesPrgRom:270f4::$270f7
NesPrgRom:270fb:JumpTable_26c07_16:
NesPrgRom:2715c:JumpTable_26c07_1b:
NesPrgRom:27162-27163:DataTable_27162:
NesPrgRom:27164-2716f:DataTable_27164:
NesPrgRom:271c0-271c1:DataTable_271c0:
NesPrgRom:271c2-271cf:DataTable_271c2:
NesPrgRom:2725a-2725b:DataTable_2725a:
NesPrgRom:2725c-2725f:DataTable_2725c:
NesPrgRom:27337-27338:DataTable_27337:
NesPrgRom:27339-2733f:DataTable_27339:
NesPrgRom:2740d-2740e:DataTable_2740d:
NesPrgRom:2740f:DataTable_2740f:
NesPrgRom:2742f-27430:DataTable_2742f:
NesPrgRom:27431-2743f:DataTable_27431:
NesPrgRom:27505-27506:DataTable_27505:
NesPrgRom:27507-2750f:DataTable_27507:
NesPrgRom:275db-275dc:DataTable_275db:
NesPrgRom:275dd-275df:DataTable_275dd:
NesPrgRom:276ed-276ee:DataTable_276ed:
NesPrgRom:276ef:DataTable_276ef:
NesPrgRom:277c3-277c6:DataTable_277c3:
NesPrgRom:277c7-277c8:DataTable_277c7:
NesPrgRom:277cf-277fe:DataTable_277c7_00:
NesPrgRom:277ff-2782e:DataTable_277c7_01:
NesPrgRom:2782f-2785e:DataTable_277c7_02:
NesPrgRom:2785f-2788c:DataTable_277c7_03:
NesPrgRom:2788d-2789c::;; --------------------------------\\n;; USUSED???
NesPrgRom:27900:MainGameModeJump_03_DeathAnimation:
NesPrgRom:27917::$2791c
NesPrgRom:27944::$2793e
NesPrgRom:279b0:ActivateOpelStatue:
NesPrgRom:279d0::$279dc
NesPrgRom:279d4::$279c7
NesPrgRom:279d9::$279bd
NesPrgRom:279df::MP
NesPrgRom:279fb:UpdateHPDisplayForOpelStatue:
NesPrgRom:27a03:_27a03:
NesPrgRom:27a0f:_27a0f:
NesPrgRom:27a1b::NOTE 8000 bank paged to 34000 here
NesPrgRom:27a27::$27a20
NesPrgRom:27a3a::$27a40
NesPrgRom:27a3e::$27a32
NesPrgRom:27a45-27a4f:DataTable_27a45:
NesPrgRom:27a65:InitializeStatusBarNametable:
NesPrgRom:27a6f::; and a row of bottom border
NesPrgRom:27a74::; Clear out the memory in the other area (just to be safe?)
NesPrgRom:27a82::$27a6a
NesPrgRom:27a84::; Draw the top left corner (#$18) and the top right corner (#$1a)
NesPrgRom:27a8e::; Use the precomputed lookup table for writing these common segments
NesPrgRom:27a93::; Draw the bottom left corner (#$1b) and the bottom right corner (#$1d)
NesPrgRom:27aaf::; Start writing the information into the status bar based on the contents\\n; of the StatusBarDataTable
NesPrgRom:27ab8::$27ab1
NesPrgRom:27abf::8000 -> 34000
NesPrgRom:27aca::LV, Money, EXP, EXP left, MP, and Max MP
NesPrgRom:27ad4::$27acc
NesPrgRom:27ad9-27ada:StatusBarDataTable:; first line\\nleft border
NesPrgRom:27adb-27ade::LIFE
NesPrgRom:27aeb-27aef::filler space for the hp bar
NesPrgRom:27af2-27af3::01
NesPrgRom:27af4-27af8::empty space and right border
NesPrgRom:27af9-27afa::; second line\\nleft border
NesPrgRom:27afb-27afe::FORCE
NesPrgRom:27aff-27b05::>>>>>>>
NesPrgRom:27b06-27b08::(1) lit up
NesPrgRom:27b09-27b0b::(_) not lit up
NesPrgRom:27b0c-27b0e::(_) not lit up
NesPrgRom:27b0f::space
NesPrgRom:27b10::$
NesPrgRom:27b11::space
NesPrgRom:27b12-27b16::00000
NesPrgRom:27b17-27b18::right border
NesPrgRom:27b19-27b1a::; third line\\nleft bar
NesPrgRom:27b1b-27b1e::space
NesPrgRom:27b21-27b25::00000
NesPrgRom:27b26::/
NesPrgRom:27b27-27b2b::00000
NesPrgRom:27b2c-27b2d::space
NesPrgRom:27b30-27b32::000
NesPrgRom:27b33::/
NesPrgRom:27b34-27b36::000
NesPrgRom:27b37-27b38::right border
NesPrgRom:27b39:MainGameModeJump_18_RecoverMagicAnimation:
NesPrgRom:27b7e::$27b75
NesPrgRom:27b9d:MainGameModeJump_19_ChangeMagicRevertAnimation:
NesPrgRom:27ba8::$27bac
NesPrgRom:27bf0::$27be7
NesPrgRom:27c04:MainGameModeJump_1a_SwordInAir:
NesPrgRom:27c4b::$27c42
NesPrgRom:27c6b:MainGameModeJump_1b_ForgeCrystalis:
NesPrgRom:27c9e::34000 loaded at 8000
NesPrgRom:27cb0:_27cb0:
NesPrgRom:27cbd::$27d00
NesPrgRom:27cc1::$27cc4
NesPrgRom:27cea::$27cf1
NesPrgRom:27cf9::$27cdc
NesPrgRom:27d20::$27d12
NesPrgRom:27d31::... and restore banks afterward
NesPrgRom:27d51:_27d51:
NesPrgRom:27d59-27d68:DataTable_27d59:; This data seems to be read pretty haphazardly? We read 5 bytes at a time, but they're\\n; not nicely aligned in multiples of 5.
NesPrgRom:27d91:_27d91:
NesPrgRom:27dad::$27d95
NesPrgRom:27dd4::$27dc3
NesPrgRom:27ddc:_27ddc:
NesPrgRom:27de2::$27dde
NesPrgRom:27df2:MainGameModeJump_1e_ThrustCrystalis:
NesPrgRom:27dfc::$27df6
NesPrgRom:27e34::$27e2e
NesPrgRom:27e52::$27e4e
NesPrgRom:27e65::$27e5e
NesPrgRom:27e88::$27e96
NesPrgRom:27ea5::$27e74
NesPrgRom:27ec4::$27eb1
NesPrgRom:27ee3::$27ed5
NesPrgRom:27efc::... and restore banks afterward
NesPrgRom:27f49::... and restore banks afterward
NesPrgRom:27f65::$27f56
NesPrgRom:27f92::$27fa1
NesPrgRom:27f9e::$27fa4
NesPrgRom:27fb5::$27fb9
NesPrgRom:27fbd::$27f8c
NesPrgRom:27fc9:_27fc9:
NesPrgRom:27fe8-27fe9:DataTable_27fe8:; Message partindex pairs for endgame\\n201d crystalis thust into reactor
NesPrgRom:27fea-27feb::1b0f confirmed meltdown
NesPrgRom:27fec-27fed::1b10 mesia simea! ... threat of evil
NesPrgRom:27fee-27fef::1b11 final countdown
NesPrgRom:27ff0-27ff1::1b12 simea time to leave
NesPrgRom:27ff2-27fff:DataTable_27ff2:; UNUSED?
NesPrgRom:28000-28001:MessageTable_Part00:00
NesPrgRom:28002-28003::01
NesPrgRom:28004-28005::02
NesPrgRom:28006-28007::03
NesPrgRom:28008-28009::04
NesPrgRom:2800a-2800b::05
NesPrgRom:2800c-2800d::06
NesPrgRom:2800e-2800f::07
NesPrgRom:28010-28011::08
NesPrgRom:28012-28013::09
NesPrgRom:28014-28015::0a
NesPrgRom:28016-28017::0b
NesPrgRom:28018-28019::0c
NesPrgRom:2801a-2801b::0d
NesPrgRom:2801c-2801d::0e
NesPrgRom:2801e-2801f::0f
NesPrgRom:28020-28021::10
NesPrgRom:28022-28023::11
NesPrgRom:28024-28025::12
NesPrgRom:28026-28027::13
NesPrgRom:28028-28029::14
NesPrgRom:2802a-2802b::15
NesPrgRom:2802c-2802d::16
NesPrgRom:2802e-2802f::17
NesPrgRom:28030-28031::18
NesPrgRom:28032-28033::19
NesPrgRom:28034-28035::1a
NesPrgRom:28036-28037::1b
NesPrgRom:28038-28039::1c
NesPrgRom:2803a-2803b::1d
NesPrgRom:2803c-2803d:MessageTable_Part01:00
NesPrgRom:2803e-2803f::01
NesPrgRom:28040-28041::02
NesPrgRom:28042-28043::03
NesPrgRom:28044-28045::04
NesPrgRom:28046-28047::05
NesPrgRom:28048-28049:MessageTable_Part02:00
NesPrgRom:2804a-2804b::01
NesPrgRom:2804c-2804d::02
NesPrgRom:2804e-2804f::03
NesPrgRom:28050-28051::04
NesPrgRom:28052-28053::05
NesPrgRom:28054-28055::06
NesPrgRom:28056-28057::07
NesPrgRom:28058-28059::08
NesPrgRom:2805a-2805b::09
NesPrgRom:2805c-2805d::0a
NesPrgRom:2805e-2805f::0b
NesPrgRom:28060-28061::0c
NesPrgRom:28062-28063:MessageTable_Part03:00
NesPrgRom:28064-28065::01
NesPrgRom:28066-28067::02
NesPrgRom:28068-28069::03
NesPrgRom:2806a-2806b::04
NesPrgRom:2806c-2806d::05
NesPrgRom:2806e-2806f::06
NesPrgRom:28070-28071:MessageTable_Part04:00
NesPrgRom:28072-28073::01
NesPrgRom:28074-28075::02
NesPrgRom:28076-28077::03
NesPrgRom:28078-28079::04
NesPrgRom:2807a-2807b::05
NesPrgRom:2807c-2807d::06
NesPrgRom:2807e-2807f::07
NesPrgRom:28080-28081::08
NesPrgRom:28082-28083::09
NesPrgRom:28084-28085::0a
NesPrgRom:28086-28087::0b
NesPrgRom:28088-28089::0c
NesPrgRom:2808a-2808b::0d
NesPrgRom:2808c-2808d::0e
NesPrgRom:2808e-2808f::0f
NesPrgRom:28090-28091::10
NesPrgRom:28092-28093::11
NesPrgRom:28094-28095::12
NesPrgRom:28096-28097::13
NesPrgRom:28098-28099::14
NesPrgRom:2809a-2809b::15
NesPrgRom:2809c-2809d::16
NesPrgRom:2809e-2809f::17
NesPrgRom:280a0-280a1::18
NesPrgRom:280a2-280a3::19
NesPrgRom:280a4-280a5::1a
NesPrgRom:280a6-280a7:MessageTable_Part05:00
NesPrgRom:280a8-280a9::01
NesPrgRom:280aa-280ab::02
NesPrgRom:280ac-280ad::03
NesPrgRom:280ae-280af::04
NesPrgRom:280b0-280b1::05
NesPrgRom:280b2-280b3::06
NesPrgRom:280b4-280b5::07
NesPrgRom:280b6-280b7::08
NesPrgRom:280b8-280b9::09
NesPrgRom:280ba-280bb::0a
NesPrgRom:280bc-280bd::0b
NesPrgRom:280be-280bf::0c
NesPrgRom:280c0-280c1::0d
NesPrgRom:280c2-280c3::0e
NesPrgRom:280c4-280c5::0f
NesPrgRom:280c6-280c7::10
NesPrgRom:280c8-280c9:MessageTable_Part06:00
NesPrgRom:280ca-280cb::01
NesPrgRom:280cc-280cd:MessageTable_Part07:00
NesPrgRom:280ce-280cf::01
NesPrgRom:280d0-280d1::02
NesPrgRom:280d2-280d3::03
NesPrgRom:280d4-280d5::04
NesPrgRom:280d6-280d7::05
NesPrgRom:280d8-280d9::06
NesPrgRom:280da-280db::07
NesPrgRom:280dc-280dd::08
NesPrgRom:280de-280df::09
NesPrgRom:280e0-280e1::0a
NesPrgRom:280e2-280e3:MessageTable_Part08:00
NesPrgRom:280e4-280e5::01
NesPrgRom:280e6-280e7::02
NesPrgRom:280e8-280e9::03
NesPrgRom:280ea-280eb::04
NesPrgRom:280ec-280ed::05
NesPrgRom:280ee-280ef::06
NesPrgRom:280f0-280f1::07
NesPrgRom:280f2-280f3::08
NesPrgRom:280f4-280f5::09
NesPrgRom:280f6-280f7::0a
NesPrgRom:280f8-280f9::0b
NesPrgRom:280fa-280fb::0c
NesPrgRom:280fc-280fd::0d
NesPrgRom:280fe-280ff::0e
NesPrgRom:28100-28101::0f
NesPrgRom:28102-28103::10
NesPrgRom:28104-28105::11
NesPrgRom:28106-28107::12
NesPrgRom:28108-28109::13
NesPrgRom:2810a-2810b::14
NesPrgRom:2810c-2810d::15
NesPrgRom:2810e-2810f:MessageTable_Part09:00
NesPrgRom:28110-28111::01
NesPrgRom:28112-28113::02
NesPrgRom:28114-28115::03
NesPrgRom:28116-28117::04
NesPrgRom:28118-28119::05
NesPrgRom:2811a-2811b::06
NesPrgRom:2811c-2811d:MessageTable_Part0a:00
NesPrgRom:2811e-2811f::01
NesPrgRom:28120-28121::02
NesPrgRom:28122-28123::03
NesPrgRom:28124-28125::04
NesPrgRom:28126-28127::05
NesPrgRom:28128-28129::06
NesPrgRom:2812a-2812b::07
NesPrgRom:2812c-2812d::08
NesPrgRom:2812e-2812f::09
NesPrgRom:28130-28131::0a
NesPrgRom:28132-28133::0b
NesPrgRom:28134-28135::0c
NesPrgRom:28136-28137::0d
NesPrgRom:28138-28139::0e
NesPrgRom:2813a-2813b::0f
NesPrgRom:2813c-2813d:MessageTable_Part0b:00
NesPrgRom:2813e-2813f::01
NesPrgRom:28140-28141::02
NesPrgRom:28142-28143::03
NesPrgRom:28144-28145:MessageTable_Part0c:00
NesPrgRom:28146-28147::01
NesPrgRom:28148-28149::02
NesPrgRom:2814a-2814b::03
NesPrgRom:2814c-2814d::04
NesPrgRom:2814e-2814f::05
NesPrgRom:28150-28151:MessageTable_Part0d:00
NesPrgRom:28152-28153::01
NesPrgRom:28154-28155::02
NesPrgRom:28156-28157::03
NesPrgRom:28158-28159::04
NesPrgRom:2815a-2815b:MessageTable_Part0e:00
NesPrgRom:2815c-2815d::01
NesPrgRom:2815e-2815f::02
NesPrgRom:28160-28161::03
NesPrgRom:28162-28163::04
NesPrgRom:28164-28165::05
NesPrgRom:28166-28167:MessageTable_Part0f:00
NesPrgRom:28168-28169::01
NesPrgRom:2816a-2816b::02
NesPrgRom:2816c-2816d::03
NesPrgRom:2816e-2816f::04
NesPrgRom:28170-28171::05
NesPrgRom:28172-28173::06
NesPrgRom:28174-28175::07
NesPrgRom:28176-28177::08
NesPrgRom:28178-28179::09
NesPrgRom:2817a-2817b::0a
NesPrgRom:2817c-2817d::0b
NesPrgRom:2817e-2817f::0c
NesPrgRom:28180-28181::0d
NesPrgRom:28182-28183::0e
NesPrgRom:28184-28185::0f
NesPrgRom:28186-28187::10
NesPrgRom:28188-28189::11
NesPrgRom:2818a-2818b::12
NesPrgRom:2818c-2818d::13
NesPrgRom:2818e-2818f::14
NesPrgRom:28190-28191::15
NesPrgRom:28192-28193::16
NesPrgRom:28194-28195::17
NesPrgRom:28196-28197::18
NesPrgRom:28198-28199:MessageTable_Part10:00
NesPrgRom:2819a-2819b::01
NesPrgRom:2819c-2819d::02
NesPrgRom:2819e-2819f::03
NesPrgRom:281a0-281a1::04
NesPrgRom:281a2-281a3::05
NesPrgRom:281a4-281a5::06
NesPrgRom:281a6-281a7::07
NesPrgRom:281a8-281a9::08
NesPrgRom:281aa-281ab::09
NesPrgRom:281ac-281ad::0a
NesPrgRom:281ae-281af::0b
NesPrgRom:281b0-281b1::0c
NesPrgRom:281b2-281b3::0d
NesPrgRom:281b4-281b5::0e
NesPrgRom:281b6-281b7::0f
NesPrgRom:281b8-281b9::10
NesPrgRom:281ba-281bb::11
NesPrgRom:281bc-281bd::12
NesPrgRom:281be-281bf::13
NesPrgRom:281c0-281c1:MessageTable_Part11:00
NesPrgRom:281c2-281c3::01
NesPrgRom:281c4-281c5:MessageTable_Part12:00
NesPrgRom:281c6-281c7::01
NesPrgRom:281c8-281c9::02
NesPrgRom:281ca-281cb::03
NesPrgRom:281cc-281cd::04
NesPrgRom:281ce-281cf::05
NesPrgRom:281d0-281d1::06
NesPrgRom:281d2-281d3::07
NesPrgRom:281d4-281d5::08
NesPrgRom:281d6-281d7::09
NesPrgRom:281d8-281d9::0a
NesPrgRom:281da-281db::0b
NesPrgRom:281dc-281dd::0c
NesPrgRom:281de-281df::0d
NesPrgRom:281e0-281e1::0e
NesPrgRom:281e2-281e3::0f
NesPrgRom:281e4-281e5::10
NesPrgRom:281e6-281e7::11
NesPrgRom:281e8-281e9::12
NesPrgRom:281ea-281eb:MessageTable_Part13:00
NesPrgRom:281ec-281ed::01
NesPrgRom:281ee-281ef::02
NesPrgRom:281f0-281f1::03
NesPrgRom:281f2-281f3::04
NesPrgRom:281f4-281f5::05
NesPrgRom:281f6-281f7::06
NesPrgRom:281f8-281f9::07
NesPrgRom:281fa-281fb::08
NesPrgRom:281fc-281fd::09
NesPrgRom:281fe-281ff::0a
NesPrgRom:28200-28201::0b
NesPrgRom:28202-28203::0c
NesPrgRom:28204-28205::0d
NesPrgRom:28206-28207::0e
NesPrgRom:28208-28209::0f
NesPrgRom:2820a-2820b::10
NesPrgRom:2820c-2820d::11
NesPrgRom:2820e-2820f::12
NesPrgRom:28210-28211::13
NesPrgRom:28212-28213::14
NesPrgRom:28214-28215::15
NesPrgRom:28216-28217:MessageTable_Part14:00
NesPrgRom:28218-28219::01
NesPrgRom:2821a-2821b::02
NesPrgRom:2821c-2821d::03
NesPrgRom:2821e-2821f::04
NesPrgRom:28220-28221::05
NesPrgRom:28222-28223::06
NesPrgRom:28224-28225::07
NesPrgRom:28226-28227::08
NesPrgRom:28228-28229::09
NesPrgRom:2822a-2822b::0a
NesPrgRom:2822c-2822d::0b
NesPrgRom:2822e-2822f::0c
NesPrgRom:28230-28231::0d
NesPrgRom:28232-28233::0e
NesPrgRom:28234-28235::0f
NesPrgRom:28236-28237::10
NesPrgRom:28238-28239::11
NesPrgRom:2823a-2823b::12
NesPrgRom:2823c-2823d::13
NesPrgRom:2823e-2823f::14
NesPrgRom:28240-28241::15
NesPrgRom:28242-28243::16
NesPrgRom:28244-28245::17
NesPrgRom:28246-28247::18
NesPrgRom:28248-28249:MessageTable_Part15:00
NesPrgRom:2824a-2824b::01
NesPrgRom:2824c-2824d::02
NesPrgRom:2824e-2824f::03
NesPrgRom:28250-28251::04
NesPrgRom:28252-28253::05
NesPrgRom:28254-28255::06
NesPrgRom:28256-28257::07
NesPrgRom:28258-28259::08
NesPrgRom:2825a-2825b::09
NesPrgRom:2825c-2825d::0a
NesPrgRom:2825e-2825f::0b
NesPrgRom:28260-28261::0c
NesPrgRom:28262-28263:MessageTable_Part16:00
NesPrgRom:28264-28265::01
NesPrgRom:28266-28267::02
NesPrgRom:28268-28269::03
NesPrgRom:2826a-2826b::04
NesPrgRom:2826c-2826d::05
NesPrgRom:2826e-2826f::06
NesPrgRom:28270-28271::07
NesPrgRom:28272-28273:MessageTable_Part17:00
NesPrgRom:28274-28275::01
NesPrgRom:28276-28277::02
NesPrgRom:28278-28279::03
NesPrgRom:2827a-2827b::04
NesPrgRom:2827c-2827d::05
NesPrgRom:2827e-2827f::06
NesPrgRom:28280-28281::07
NesPrgRom:28282-28283::08
NesPrgRom:28284-28285::09
NesPrgRom:28286-28287::0a
NesPrgRom:28288-28289::0b
NesPrgRom:2828a-2828b::0c
NesPrgRom:2828c-2828d::0d
NesPrgRom:2828e-2828f::0e
NesPrgRom:28290-28291::0f
NesPrgRom:28292-28293::10
NesPrgRom:28294-28295:MessageTable_Part18:00
NesPrgRom:28296-28297::01
NesPrgRom:28298-28299::02
NesPrgRom:2829a-2829b::03
NesPrgRom:2829c-2829d::04
NesPrgRom:2829e-2829f::05
NesPrgRom:282a0-282a1::06
NesPrgRom:282a2-282a3::07
NesPrgRom:282a4-282a5::08
NesPrgRom:282a6-282a7:MessageTable_Part19:00
NesPrgRom:282a8-282a9::01
NesPrgRom:282aa-282ab::02
NesPrgRom:282ac-282ad::03
NesPrgRom:282ae-282af::04
NesPrgRom:282b0-282b1::05
NesPrgRom:282b2-282b3:MessageTable_Part1a:00
NesPrgRom:282b4-282b5::01
NesPrgRom:282b6-282b7::02
NesPrgRom:282b8-282b9::03
NesPrgRom:282ba-282bb::04
NesPrgRom:282bc-282bd::05
NesPrgRom:282be-282bf::06
NesPrgRom:282c0-282c1::07
NesPrgRom:282c2-282c3::08
NesPrgRom:282c4-282c5::09
NesPrgRom:282c6-282c7::0a
NesPrgRom:282c8-282c9::0b
NesPrgRom:282ca-282cb::0c
NesPrgRom:282cc-282cd::0d
NesPrgRom:282ce-282cf::0e
NesPrgRom:282d0-282d1::0f
NesPrgRom:282d2-282d3::10
NesPrgRom:282d4-282d5::11
NesPrgRom:282d6-282d7::12
NesPrgRom:282d8-282d9::13
NesPrgRom:282da-282db:MessageTable_Part1b:00
NesPrgRom:282dc-282dd::01
NesPrgRom:282de-282df::02
NesPrgRom:282e0-282e1::03
NesPrgRom:282e2-282e3::04
NesPrgRom:282e4-282e5::05
NesPrgRom:282e6-282e7::06
NesPrgRom:282e8-282e9::07
NesPrgRom:282ea-282eb::08
NesPrgRom:282ec-282ed::09
NesPrgRom:282ee-282ef::0a
NesPrgRom:282f0-282f1::0b
NesPrgRom:282f2-282f3::0c
NesPrgRom:282f4-282f5::0d
NesPrgRom:282f6-282f7::0e
NesPrgRom:282f8-282f9::0f
NesPrgRom:282fa-282fb::10
NesPrgRom:282fc-282fd::11
NesPrgRom:282fe-282ff::12
NesPrgRom:28300-28301:MessageTable_Part1c:00
NesPrgRom:28302-28303::01
NesPrgRom:28304-28305::02
NesPrgRom:28306-28307::03
NesPrgRom:28308-28309::04
NesPrgRom:2830a-2830b::05
NesPrgRom:2830c-2830d::06
NesPrgRom:2830e-2830f::07
NesPrgRom:28310-28311::08
NesPrgRom:28312-28313::09
NesPrgRom:28314-28315::0a
NesPrgRom:28316-28317::0b
NesPrgRom:28318-28319::0c
NesPrgRom:2831a-2831b::0d
NesPrgRom:2831c-2831d::0e
NesPrgRom:2831e-2831f::0f
NesPrgRom:28320-28321::10
NesPrgRom:28322-28323::11
NesPrgRom:28324-28325::12
NesPrgRom:28326-28327::13
NesPrgRom:28328-28329::14
NesPrgRom:2832a-2832b::15
NesPrgRom:2832c-2832d::16
NesPrgRom:2832e-2832f::17
NesPrgRom:28330-28331::18
NesPrgRom:28332-28333::19
NesPrgRom:28334-28335::1a
NesPrgRom:28336-28337::1b
NesPrgRom:28338-28339::1c
NesPrgRom:2833a-2833b::1d
NesPrgRom:2833c-2833d::1e
NesPrgRom:2833e-2833f::1f
NesPrgRom:28340-28341:MessageTable_Part1d:00
NesPrgRom:28342-28343::01
NesPrgRom:28344-28345::02
NesPrgRom:28346-28347::03
NesPrgRom:28348-28349::04
NesPrgRom:2834a-2834b::05
NesPrgRom:2834c-2834d::06
NesPrgRom:2834e-2834f::07
NesPrgRom:28350-28351::08
NesPrgRom:28352-28353::09
NesPrgRom:28354-28355::0a
NesPrgRom:28356-28357::0b
NesPrgRom:28358-28359::0c
NesPrgRom:2835a-2835b::0d
NesPrgRom:2835c-2835d::0e
NesPrgRom:2835e-2835f::0f
NesPrgRom:28360-28361::10
NesPrgRom:28362-28363::11
NesPrgRom:28364-28365::12
NesPrgRom:28366-28367::13
NesPrgRom:28368-28369::14
NesPrgRom:2836a-2836b::15
NesPrgRom:2836c-2836d::16
NesPrgRom:2836e-2836f::17
NesPrgRom:28370-28371::18
NesPrgRom:28372-28373::19
NesPrgRom:28374-28375::1a
NesPrgRom:28376-28377::1b
NesPrgRom:28378-28379::1c
NesPrgRom:2837a-2837b::1d
NesPrgRom:2837c-2837d:MessageTable_Part1e:00
NesPrgRom:2837e-2837f::01
NesPrgRom:28380-28381::02
NesPrgRom:28382-28383::03
NesPrgRom:28384-28385::04
NesPrgRom:28386-28387::05
NesPrgRom:28388-28389::06
NesPrgRom:2838a-2838b::07
NesPrgRom:2838c-2838d::08
NesPrgRom:2838e-2838f::09
NesPrgRom:28390-28391::0a
NesPrgRom:28392-28393::0b
NesPrgRom:28394-28395::0c
NesPrgRom:28396-28397::0d
NesPrgRom:28398-28399::0e
NesPrgRom:2839a-2839b::0f
NesPrgRom:2839c-2839d::10
NesPrgRom:2839e-2839f::11
NesPrgRom:283a0-283a1::12
NesPrgRom:283a2-283a3::13
NesPrgRom:283a4-283a5::14
NesPrgRom:283a6-283a7::15
NesPrgRom:283a8-283a9::16
NesPrgRom:283aa-283ab::17
NesPrgRom:283ac-283ad::18
NesPrgRom:283ae-283af::19
NesPrgRom:283b0-283b1::1a
NesPrgRom:283b2-283b3::1b
NesPrgRom:283b4-283b5::1c
NesPrgRom:283b6-283b7::1d
NesPrgRom:283b8-283b9::1e
NesPrgRom:283ba-283bb:MessageTable_Part1f:00
NesPrgRom:283bc-283bd:MessageTable_Part20:00
NesPrgRom:283be-283bf::01
NesPrgRom:283c0-283c1::02
NesPrgRom:283c2-283c3::03
NesPrgRom:283c4-283c5::04
NesPrgRom:283c6-283c7::05
NesPrgRom:283c8-283c9::06
NesPrgRom:283ca-283cb::07
NesPrgRom:283cc-283cd::08
NesPrgRom:283ce-283cf::09
NesPrgRom:283d0-283d1::0a
NesPrgRom:283d2-283d3::0b
NesPrgRom:283d4-283d5::0c
NesPrgRom:283d6-283d7::0d
NesPrgRom:283d8-283d9::0e
NesPrgRom:283da-283db::0f
NesPrgRom:283dc-283dd::10
NesPrgRom:283de-283df::11
NesPrgRom:283e0-283e1::12
NesPrgRom:283e2-283e3::13
NesPrgRom:283e4-283e5::14
NesPrgRom:283e6-283e7::15
NesPrgRom:283e8-283e9::16
NesPrgRom:283ea-283eb::17
NesPrgRom:283ec-283ed::18
NesPrgRom:283ee-283ef::19
NesPrgRom:283f0-283f1::1a
NesPrgRom:283f2-283f3::1b
NesPrgRom:283f4-283f5::1c
NesPrgRom:283f6-283f7::1d
NesPrgRom:283f8-283f9:MessageTable_Part21:00
NesPrgRom:283fa-283fb::01
NesPrgRom:283fc-283fd::02
NesPrgRom:283fe-28401:MessageTableBanks:00..03
NesPrgRom:28402-28405::04..07
NesPrgRom:28406-28409::08..0b
NesPrgRom:2840a-2840d::0c..0f
NesPrgRom:2840e-28411::10..13
NesPrgRom:28412-28415::14..17
NesPrgRom:28416-28419::18..1b
NesPrgRom:2841a-2841d::1c..1f
NesPrgRom:2841e-28421::20..23
NesPrgRom:28422-28423:MessageTableParts:00
NesPrgRom:28424-28425::01
NesPrgRom:28426-28427::02
NesPrgRom:28428-28429::03
NesPrgRom:2842a-2842b::04
NesPrgRom:2842c-2842d::05
NesPrgRom:2842e-2842f::06
NesPrgRom:28430-28431::07
NesPrgRom:28432-28433::08
NesPrgRom:28434-28435::09
NesPrgRom:28436-28437::0a
NesPrgRom:28438-28439::0b
NesPrgRom:2843a-2843b::0c
NesPrgRom:2843c-2843d::0d
NesPrgRom:2843e-2843f::0e
NesPrgRom:28440-28441::0f
NesPrgRom:28442-28443::10
NesPrgRom:28444-28445::11
NesPrgRom:28446-28447::12
NesPrgRom:28448-28449::13
NesPrgRom:2844a-2844b::14
NesPrgRom:2844c-2844d::15
NesPrgRom:2844e-2844f::16
NesPrgRom:28450-28451::17
NesPrgRom:28452-28453::18
NesPrgRom:28454-28455::19
NesPrgRom:28456-28457::1a
NesPrgRom:28458-28459::1b
NesPrgRom:2845a-2845b::1c
NesPrgRom:2845c-2845d::1d
NesPrgRom:2845e-2845f::1e
NesPrgRom:28460-28461::1f
NesPrgRom:28462-28463::20
NesPrgRom:28464-28465::21
NesPrgRom:28466-2846f::;; --------------------------------\\n;; UNUSED
NesPrgRom:28500:DrawMessageBoxBackground:; Initialize $20..$2f for drawing message box background.
NesPrgRom:2850c::; Copy all the data
NesPrgRom:28515::; Clear the nametable staging area completely
NesPrgRom:28520-28527:DataTable_28520:
NesPrgRom:28528:ShowMessage:
NesPrgRom:2853a:LookupMessageInternal:; Look up both the bank and the part offset from $7df
NesPrgRom:28555::; Look up the $7de'th address from this part
NesPrgRom:2856e::$28576
NesPrgRom:28570::; Control byte (00..09)
NesPrgRom:28573::$2856a
NesPrgRom:28578::$28580
NesPrgRom:2857a::; Abbreviation (80..ff)
NesPrgRom:2857d::$2856a
NesPrgRom:28583::$2856a
NesPrgRom:28586::;; --------------------------------\\n;; UNUSED?
NesPrgRom:2858c::$28592
NesPrgRom:28593:DecodeMessageControlByte:
NesPrgRom:285a2-285a3:MessageDecodeJump:00 end of message
NesPrgRom:285a4-285a5::01 start of page
NesPrgRom:285a6-285a7::02 new line
NesPrgRom:285a8-285a9::03 continue on next page
NesPrgRom:285aa-285ab::04 player name
NesPrgRom:285ac-285ad::05 less common words (arg follows)
NesPrgRom:285ae-285af::06 person names (arg follows)
NesPrgRom:285b0-285b1::07 item names (arg follows)
NesPrgRom:285b2-285b3::08 currently gained item name
NesPrgRom:285b4-285b5::09 spaces (arg follows for count)
NesPrgRom:285b6:MessageDecodeJump_00:
NesPrgRom:285b8:_285b8:
NesPrgRom:285f2:MessageDecodeJump_01_StartMessage:
NesPrgRom:285fb::$285f7
NesPrgRom:28602::$28606
NesPrgRom:28607:MessageDecodeJump_02_EndLine:
NesPrgRom:28614::$28618
NesPrgRom:28619:MessageDecodeJump_03_EndPage:
NesPrgRom:28623::$2861f
NesPrgRom:28643::$28641
NesPrgRom:28655::$28660
NesPrgRom:2865b::$28660
NesPrgRom:2865d::$28641
NesPrgRom:28663::$28667
NesPrgRom:2866b:MessageDecodeJump_04_PlayerName:
NesPrgRom:28672::$2867a
NesPrgRom:28677::$2866f
NesPrgRom:2867d::$28681
NesPrgRom:28682:MessageDecodeJump_05_UncommonWord:
NesPrgRom:28693:CopyWordToMessageBuffer:; Copies the word at ($2a) to the message buffer.
NesPrgRom:28697::$2869f
NesPrgRom:2869c::$28695
NesPrgRom:286a2::; 2c is probably the jump table... -/ ?
NesPrgRom:286a6::$286bd
NesPrgRom:286aa::$286b4
NesPrgRom:286ae::$286bd
NesPrgRom:286b2::$286bd
NesPrgRom:286c0::$286c4
NesPrgRom:286cd:MessageDecodeJump_06_PersonName:
NesPrgRom:286e1:MessageDecodeJump_07_ItemName:
NesPrgRom:286f5:LookupCommonWord:
NesPrgRom:28710:_28710:
NesPrgRom:28719::$2871d
NesPrgRom:28720:_28720:
NesPrgRom:28726::$28722
NesPrgRom:28742::$2873c
NesPrgRom:2874a::$2872a
NesPrgRom:28753:MessageDecodeJump_09_Spaces:
NesPrgRom:28763::$2875b
NesPrgRom:28768::$2876c
NesPrgRom:2876d::$28771
NesPrgRom:28772:MessageDecodeJump_08_CurrentItemName:
NesPrgRom:28782::$28786
NesPrgRom:28784::blank name if nothing
NesPrgRom:28796::$2879e
NesPrgRom:2879b::$28794
NesPrgRom:287a1::$287a5
NesPrgRom:287ae:WriteCharacterToMessageBuffer:
NesPrgRom:287b7:DrawMessageBoxBackgroundAllRows:
NesPrgRom:287b9::rows 0-1
NesPrgRom:287be::rows 2-3
NesPrgRom:287c3::rows 4-5
NesPrgRom:287c8::rows 6-7
NesPrgRom:287cd::rows 8-9
NesPrgRom:287d6::; Write two rows of $ff
NesPrgRom:287f5::; Stage 64 bytes (two rows) to the nametable, as given by two\\n; triples in $28899,x.  For each triple, the first byte is written\\n; once, then 30 copies of the second byte, then the third byte.\\n; This makes 3 different possible writes (x=0, 3, or 6).\\nstart writing directly to $6000
NesPrgRom:287f9::$2f = loop index -> 2 times
NesPrgRom:28816::$2880d
NesPrgRom:28823::$287fb
NesPrgRom:28829::; Increment PPUADDR by $22$23 (who sets that?)
NesPrgRom:28836:StageNametableWriteForMessage:
NesPrgRom:2885a:BankSwitch8k_a000_alt:
NesPrgRom:28869:EnableNMI_alt:
NesPrgRom:28871:DisableNMI_alt:
NesPrgRom:28879-2887a:MessageBoxBackgroundParameters:$20$21 - initial value for PPUADDR
NesPrgRom:2887b-2887c::$22$23 - PPUADDR increment between frames
NesPrgRom:2887d::$24    - byte count to write per frame
NesPrgRom:2887e::$25    - $6000,x offset to write
NesPrgRom:2887f::$26
NesPrgRom:28880::$27
NesPrgRom:28881::$28
NesPrgRom:28882::$29
NesPrgRom:28883::$2a
NesPrgRom:28884::$2b
NesPrgRom:28885::$2c
NesPrgRom:28886::$2d
NesPrgRom:28887::$2e
NesPrgRom:28888::$2f
NesPrgRom:28889-2888a:MessageBoxTextParameters:$20$21 - initial value for PPUADDR
NesPrgRom:2888b-2888c::$22$23 - PPUADDR increment between frames
NesPrgRom:2888d::$24    - byte count to write per frame
NesPrgRom:2888e::$25    - $6000,x offset to write
NesPrgRom:2888f::$26
NesPrgRom:28890::$27
NesPrgRom:28891::$28
NesPrgRom:28892::$29
NesPrgRom:28893::$2a
NesPrgRom:28894::$2b
NesPrgRom:28895::$2c
NesPrgRom:28896::$2d
NesPrgRom:28897::$2e
NesPrgRom:28898::$2f
NesPrgRom:28899-2889b:MessageBoxBackgroundSprites:00
NesPrgRom:2889c-2889e::03
NesPrgRom:2889f-288a1::06
NesPrgRom:288a2-288a4::09
NesPrgRom:288a5::;; --------------------------------\\n;; This appears to be an unused scrap that was duplicated from elsewhere.
NesPrgRom:28900-28901:CommonWords:80
NesPrgRom:28902-28903::81
NesPrgRom:28904-28905::82
NesPrgRom:28906-28907::83
NesPrgRom:28908-28909::84
NesPrgRom:2890a-2890b::85
NesPrgRom:2890c-2890d::86
NesPrgRom:2890e-2890f::87
NesPrgRom:28910-28911::88
NesPrgRom:28912-28913::89
NesPrgRom:28914-28915::8a
NesPrgRom:28916-28917::8b
NesPrgRom:28918-28919::8c
NesPrgRom:2891a-2891b::8d
NesPrgRom:2891c-2891d::8e
NesPrgRom:2891e-2891f::8f
NesPrgRom:28920-28921::90
NesPrgRom:28922-28923::91
NesPrgRom:28924-28925::92
NesPrgRom:28926-28927::93
NesPrgRom:28928-28929::94
NesPrgRom:2892a-2892b::95
NesPrgRom:2892c-2892d::96
NesPrgRom:2892e-2892f::97
NesPrgRom:28930-28931::98
NesPrgRom:28932-28933::99
NesPrgRom:28934-28935::9a
NesPrgRom:28936-28937::9b
NesPrgRom:28938-28939::9c
NesPrgRom:2893a-2893b::9d
NesPrgRom:2893c-2893d::9e
NesPrgRom:2893e-2893f::9f
NesPrgRom:28940-28941::a0
NesPrgRom:28942-28943::a1
NesPrgRom:28944-28945::a2
NesPrgRom:28946-28947::a3
NesPrgRom:28948-28949::a4
NesPrgRom:2894a-2894b::a5
NesPrgRom:2894c-2894d::a6
NesPrgRom:2894e-2894f::a7
NesPrgRom:28950-28951::a8
NesPrgRom:28952-28953::a9
NesPrgRom:28954-28955::aa
NesPrgRom:28956-28957::ab
NesPrgRom:28958-28959::ac
NesPrgRom:2895a-2895b::ad
NesPrgRom:2895c-2895d::ae
NesPrgRom:2895e-2895f::af
NesPrgRom:28960-28961::b0
NesPrgRom:28962-28963::b1
NesPrgRom:28964-28965::b2
NesPrgRom:28966-28967::b3
NesPrgRom:28968-28969::b4
NesPrgRom:2896a-2896b::b5
NesPrgRom:2896c-2896d::b6
NesPrgRom:2896e-2896f::b7
NesPrgRom:28970-28971::b8
NesPrgRom:28972-28973::b9
NesPrgRom:28974-28975::ba
NesPrgRom:28976-28977::bb
NesPrgRom:28978-28979::bc
NesPrgRom:2897a-2897b::bd
NesPrgRom:2897c-2897d::be
NesPrgRom:2897e-2897f::bf
NesPrgRom:28980-28981::c0
NesPrgRom:28982-28983::c1
NesPrgRom:28984-28985::c2
NesPrgRom:28986-28987::c3
NesPrgRom:28988-28989::c4
NesPrgRom:2898a-2898b::c5
NesPrgRom:2898c-2898d::c6
NesPrgRom:2898e-2898f::c7
NesPrgRom:28990-28991::c8
NesPrgRom:28992-28993::c9
NesPrgRom:28994-28995::ca
NesPrgRom:28996-28997::cb
NesPrgRom:28998-28999::cc
NesPrgRom:2899a-2899b::cd
NesPrgRom:2899c-2899d::ce
NesPrgRom:2899e-2899f::cf
NesPrgRom:289a0-289a1::d0
NesPrgRom:289a2-289a3::d1
NesPrgRom:289a4-289a5::d2
NesPrgRom:289a6-289a7::d3
NesPrgRom:289a8-289a9::d4
NesPrgRom:289aa-289ab::d5
NesPrgRom:289ac-289ad::d6
NesPrgRom:289ae-289af::d7
NesPrgRom:289b0-289b1::d8
NesPrgRom:289b2-289b3::d9
NesPrgRom:289b4-289b5::da
NesPrgRom:289b6-289b7::db
NesPrgRom:289b8-289b9::dc
NesPrgRom:289ba-289bb::dd
NesPrgRom:289bc-289bd::de
NesPrgRom:289be-289bf::df
NesPrgRom:289c0-289c1::e0
NesPrgRom:289c2-289c3::e1
NesPrgRom:289c4-289c5::e2
NesPrgRom:289c6-289c7::e3
NesPrgRom:289c8-289c9::e4
NesPrgRom:289ca-289cb::e5
NesPrgRom:289cc-289cd::e6
NesPrgRom:289ce-289cf::e7
NesPrgRom:289d0-289d1::e8
NesPrgRom:289d2-289d3::e9
NesPrgRom:289d4-289d5::ea
NesPrgRom:289d6-289d7::eb
NesPrgRom:289d8-289d9::ec
NesPrgRom:289da-289db::ed
NesPrgRom:289dc-289dd::ee
NesPrgRom:289de-289df::ef
NesPrgRom:289e0-289e1::f0
NesPrgRom:289e2-289e3::f1
NesPrgRom:289e4-289e5::f2
NesPrgRom:289e6-289e7::f3
NesPrgRom:289e8-289e9::f4
NesPrgRom:289ea-289eb::f5
NesPrgRom:289ec-289ed::f6
NesPrgRom:289ee-289ef::f7
NesPrgRom:289f0-289f1::f8
NesPrgRom:289f2-289f3::f9
NesPrgRom:289f4-289f5::fa
NesPrgRom:289f6-289f7::fb
NesPrgRom:289f8-289f9::fc
NesPrgRom:289fa-289fb::fd
NesPrgRom:289fc-289fd::fe
NesPrgRom:289fe-289ff::ff
NesPrgRom:28a00-28a01:UncommonWords:00
NesPrgRom:28a02-28a03::01
NesPrgRom:28a04-28a05::02
NesPrgRom:28a06-28a07::03
NesPrgRom:28a08-28a09::04
NesPrgRom:28a0a-28a0b::05
NesPrgRom:28a0c-28a0d::06
NesPrgRom:28a0e-28a0f::07
NesPrgRom:28a10-28a11::08
NesPrgRom:28a12-28a13::09
NesPrgRom:28a14-28a15:PersonNames:00
NesPrgRom:28a16-28a17::01
NesPrgRom:28a18-28a19::02
NesPrgRom:28a1a-28a1b::03
NesPrgRom:28a1c-28a1d::04
NesPrgRom:28a1e-28a1f::05
NesPrgRom:28a20-28a21::06
NesPrgRom:28a22-28a23::07
NesPrgRom:28a24-28a25::08
NesPrgRom:28a26-28a27::09
NesPrgRom:28a28-28a29::0a
NesPrgRom:28a2a-28a2b::0b
NesPrgRom:28a2c-28a2d::0c
NesPrgRom:28a2e-28a2f::0d
NesPrgRom:28a30-28a31::0e
NesPrgRom:28a32-28a33::0f
NesPrgRom:28a34-28a35::10
NesPrgRom:28a36-28a37::11
NesPrgRom:28a38-28a39::12
NesPrgRom:28a3a-28a3b::13
NesPrgRom:28a3c-28a3d::14
NesPrgRom:28a3e-28a3f::15
NesPrgRom:28a40-28a41::16
NesPrgRom:28a42-28a43::17
NesPrgRom:28a44-28a45::18
NesPrgRom:28a46-28a47::19
NesPrgRom:28a48-28a49::1a
NesPrgRom:28a4a-28a4b::1b
NesPrgRom:28a4c-28a4d::1c
NesPrgRom:28a4e-28a4f::1d
NesPrgRom:28a50-28a51::1e
NesPrgRom:28a52-28a53::1f
NesPrgRom:28a54-28a55::20
NesPrgRom:28a56-28a57::21
NesPrgRom:28a58-28a59::22
NesPrgRom:28a5a-28a5b::23
NesPrgRom:28a5c-28a5d:ItemNames:00
NesPrgRom:28a5e-28a5f::01
NesPrgRom:28a60-28a61::02
NesPrgRom:28a62-28a63::03
NesPrgRom:28a64-28a65::04
NesPrgRom:28a66-28a67::05
NesPrgRom:28a68-28a69::06
NesPrgRom:28a6a-28a6b::07
NesPrgRom:28a6c-28a6d::08
NesPrgRom:28a6e-28a6f::09
NesPrgRom:28a70-28a71::0a
NesPrgRom:28a72-28a73::0b
NesPrgRom:28a74-28a75::0c
NesPrgRom:28a76-28a77::0d
NesPrgRom:28a78-28a79::0e
NesPrgRom:28a7a-28a7b::0f
NesPrgRom:28a7c-28a7d::10
NesPrgRom:28a7e-28a7f::11
NesPrgRom:28a80-28a81::12
NesPrgRom:28a82-28a83::13
NesPrgRom:28a84-28a85::14
NesPrgRom:28a86-28a87::15
NesPrgRom:28a88-28a89::16
NesPrgRom:28a8a-28a8b::17
NesPrgRom:28a8c-28a8d::18
NesPrgRom:28a8e-28a8f::19
NesPrgRom:28a90-28a91::1a
NesPrgRom:28a92-28a93::1b
NesPrgRom:28a94-28a95::1c
NesPrgRom:28a96-28a97::1d
NesPrgRom:28a98-28a99::1e
NesPrgRom:28a9a-28a9b::1f
NesPrgRom:28a9c-28a9d::20
NesPrgRom:28a9e-28a9f::21
NesPrgRom:28aa0-28aa1::22
NesPrgRom:28aa2-28aa3::23
NesPrgRom:28aa4-28aa5::24
NesPrgRom:28aa6-28aa7::25
NesPrgRom:28aa8-28aa9::26
NesPrgRom:28aaa-28aab::27
NesPrgRom:28aac-28aad::28
NesPrgRom:28aae-28aaf::29
NesPrgRom:28ab0-28ab1::2a
NesPrgRom:28ab2-28ab3::2b
NesPrgRom:28ab4-28ab5::2c
NesPrgRom:28ab6-28ab7::2d
NesPrgRom:28ab8-28ab9::2e
NesPrgRom:28aba-28abb::2f
NesPrgRom:28abc-28abd::30
NesPrgRom:28abe-28abf::31
NesPrgRom:28ac0-28ac1::32
NesPrgRom:28ac2-28ac3::33
NesPrgRom:28ac4-28ac5::34
NesPrgRom:28ac6-28ac7::35
NesPrgRom:28ac8-28ac9::36
NesPrgRom:28aca-28acb::37
NesPrgRom:28acc-28acd::38
NesPrgRom:28ace-28acf::39
NesPrgRom:28ad0-28ad1::3a
NesPrgRom:28ad2-28ad3::3b
NesPrgRom:28ad4-28ad5::3c
NesPrgRom:28ad6-28ad7::3d
NesPrgRom:28ad8-28ad9::3e
NesPrgRom:28ada-28adb::3f
NesPrgRom:28adc-28add::40
NesPrgRom:28ade-28adf::41
NesPrgRom:28ae0-28ae1::42
NesPrgRom:28ae2-28ae3::43
NesPrgRom:28ae4-28ae5::44
NesPrgRom:28ae6-28ae7::45
NesPrgRom:28ae8-28ae9::46
NesPrgRom:28aea-28aeb::47
NesPrgRom:28aec-28aed::48
NesPrgRom:28aee-28aef::49
NesPrgRom:28af0-28af2:CommonWord_80:80
NesPrgRom:28af3-28af5:CommonWord_81:81
NesPrgRom:28af6-28af8:CommonWord_82:82
NesPrgRom:28af9-28afc:CommonWord_83:83
NesPrgRom:28afd-28b01:CommonWord_84:84
NesPrgRom:28b02-28b05:CommonWord_85:85
NesPrgRom:28b06-28b08:CommonWord_86:86
NesPrgRom:28b09-28b0b:CommonWord_87:87
NesPrgRom:28b0c-28b0f:CommonWord_88:88
NesPrgRom:28b10-28b13:CommonWord_89:89
NesPrgRom:28b14-28b19:CommonWord_8a:8a
NesPrgRom:28b1a-28b20:CommonWord_8b:8b
NesPrgRom:28b21-28b25:CommonWord_8c:8c
NesPrgRom:28b26-28b2a:CommonWord_8d:8d
NesPrgRom:28b2b-28b2d:CommonWord_8e:8e
NesPrgRom:28b2e-28b30:CommonWord_8f:8f
NesPrgRom:28b31-28b35:CommonWord_90:90
NesPrgRom:28b36-28b3b:CommonWord_91:91
NesPrgRom:28b3c-28b3f:CommonWord_92:92
NesPrgRom:28b40-28b43:CommonWord_93:93
NesPrgRom:28b44-28b48:CommonWord_94:94
NesPrgRom:28b49-28b4d:CommonWord_95:95
NesPrgRom:28b4e-28b53:CommonWord_96:96
NesPrgRom:28b54-28b56:CommonWord_97:97
NesPrgRom:28b57-28b59:CommonWord_98:98
NesPrgRom:28b5a-28b5d:CommonWord_99:99
NesPrgRom:28b5e-28b62:CommonWord_9a:9a
NesPrgRom:28b63-28b67:CommonWord_9b:9b
NesPrgRom:28b68-28b6c:CommonWord_9c:9c
NesPrgRom:28b6d-28b71:CommonWord_9d:9d
NesPrgRom:28b72-28b76:CommonWord_9e:9e
NesPrgRom:28b77-28b7a:CommonWord_9f:9f
NesPrgRom:28b7b-28b7f:CommonWord_a0:a0
NesPrgRom:28b80-28b83:CommonWord_a1:a1
NesPrgRom:28b84-28b87:CommonWord_a2:a2
NesPrgRom:28b88-28b8b:CommonWord_a3:a3
NesPrgRom:28b8c-28b90:CommonWord_a4:a4
NesPrgRom:28b91-28b95:CommonWord_a5:a5
NesPrgRom:28b96-28b9a:CommonWord_a6:a6
NesPrgRom:28b9b-28b9f:CommonWord_a7:a7
NesPrgRom:28ba0-28ba4:CommonWord_a8:a8
NesPrgRom:28ba5-28ba9:CommonWord_a9:a9
NesPrgRom:28baa-28bb1:CommonWord_aa:aa
NesPrgRom:28bb2-28bb4:CommonWord_ab:ab
NesPrgRom:28bb5-28bb8:CommonWord_ac:ac
NesPrgRom:28bb9-28bbb:CommonWord_ad:ad
NesPrgRom:28bbc-28bc0:CommonWord_ae:ae
NesPrgRom:28bc1-28bc5:CommonWord_af:af
NesPrgRom:28bc6-28bc9:CommonWord_b0:b0
NesPrgRom:28bca-28bcc:CommonWord_b1:b1
NesPrgRom:28bcd-28bd1:CommonWord_b2:b2
NesPrgRom:28bd2-28bd6:CommonWord_b3:b3
NesPrgRom:28bd7-28bdc:CommonWord_b4:b4
NesPrgRom:28bdd-28be1:CommonWord_b5:b5
NesPrgRom:28be2-28be6:CommonWord_b6:b6
NesPrgRom:28be7-28beb:CommonWord_b7:b7
NesPrgRom:28bec-28bf0:CommonWord_b8:b8
NesPrgRom:28bf1-28bf5:CommonWord_b9:b9
NesPrgRom:28bf6-28bfa:CommonWord_ba:ba
NesPrgRom:28bfb-28bff:CommonWord_bb:bb
NesPrgRom:28c00-28c04:CommonWord_bc:bc
NesPrgRom:28c05-28c07:CommonWord_bd:bd
NesPrgRom:28c08-28c0c:CommonWord_be:be
NesPrgRom:28c0d-28c11:CommonWord_bf:bf
NesPrgRom:28c12-28c16:CommonWord_c0:c0
NesPrgRom:28c17-28c1b:CommonWord_c1:c1
NesPrgRom:28c1c-28c20:CommonWord_c2:c2
NesPrgRom:28c21-28c25:CommonWord_c3:c3
NesPrgRom:28c26-28c2a:CommonWord_c4:c4
NesPrgRom:28c2b-28c2d:CommonWord_c5:c5
NesPrgRom:28c2e-28c31:CommonWord_c6:c6
NesPrgRom:28c32-28c35:CommonWord_c7:c7
NesPrgRom:28c36-28c39:CommonWord_c8:c8
NesPrgRom:28c3a-28c3e:CommonWord_c9:c9
NesPrgRom:28c3f-28c43:CommonWord_ca:ca
NesPrgRom:28c44-28c48:CommonWord_cb:cb
NesPrgRom:28c49-28c4e:CommonWord_cc:cc
NesPrgRom:28c4f-28c51:CommonWord_cd:cd
NesPrgRom:28c52-28c54:CommonWord_ce:ce
NesPrgRom:28c55-28c57:CommonWord_cf:cf
NesPrgRom:28c58-28c5b:CommonWord_d0:d0
NesPrgRom:28c5c-28c5f:CommonWord_d1:d1
NesPrgRom:28c60-28c64:CommonWord_d2:d2
NesPrgRom:28c65-28c69:CommonWord_d3:d3
NesPrgRom:28c6a-28c6f:CommonWord_d4:d4
NesPrgRom:28c70-28c74:CommonWord_d5:d5
NesPrgRom:28c75-28c79:CommonWord_d6:d6
NesPrgRom:28c7a-28c7f:CommonWord_d7:d7
NesPrgRom:28c80-28c82:CommonWord_d8:d8
NesPrgRom:28c83-28c86:CommonWord_d9:d9
NesPrgRom:28c87-28c8a:CommonWord_da:da
NesPrgRom:28c8b-28c8f:CommonWord_db:db
NesPrgRom:28c90-28c94:CommonWord_dc:dc
NesPrgRom:28c95-28c99:CommonWord_dd:dd
NesPrgRom:28c9a-28c9e:CommonWord_de:de
NesPrgRom:28c9f-28ca3:CommonWord_df:df
NesPrgRom:28ca4-28ca8:CommonWord_e0:e0
NesPrgRom:28ca9-28cad:CommonWord_e1:e1
NesPrgRom:28cae-28cb3:CommonWord_e2:e2
NesPrgRom:28cb4-28cb6:CommonWord_e3:e3
NesPrgRom:28cb7-28cb9:CommonWord_e4:e4
NesPrgRom:28cba-28cbd:CommonWord_e5:e5
NesPrgRom:28cbe-28cc2:CommonWord_e6:e6
NesPrgRom:28cc3-28cc7:CommonWord_e7:e7
NesPrgRom:28cc8-28ccb:CommonWord_e8:e8
NesPrgRom:28ccc-28ccf:CommonWord_e9:e9
NesPrgRom:28cd0-28cd4:CommonWord_ea:ea
NesPrgRom:28cd5-28cd9:CommonWord_eb:eb
NesPrgRom:28cda-28cde:CommonWord_ec:ec
NesPrgRom:28cdf-28ce3:CommonWord_ed:ed
NesPrgRom:28ce4-28ce8:CommonWord_ee:ee
NesPrgRom:28ce9-28ced:CommonWord_ef:ef
NesPrgRom:28cee-28cf2:CommonWord_f0:f0
NesPrgRom:28cf3-28cf7:CommonWord_f1:f1
NesPrgRom:28cf8-28cfd:CommonWord_f2:f2
NesPrgRom:28cfe-28d01:CommonWord_f3:f3
NesPrgRom:28d02-28d06:CommonWord_f4:f4
NesPrgRom:28d07-28d0d:CommonWord_f5:f5
NesPrgRom:28d0e-28d14:CommonWord_f6:f6
NesPrgRom:28d15-28d18:CommonWord_f7:f7
NesPrgRom:28d19-28d1c:CommonWord_f8:f8
NesPrgRom:28d1d-28d21:CommonWord_f9:f9
NesPrgRom:28d22-28d24:CommonWord_fa:fa
NesPrgRom:28d25-28d26:CommonWord_fb:fb
NesPrgRom:28d27-28d2b:CommonWord_fc:fc
NesPrgRom:28d2c-28d30:CommonWord_fd:fd
NesPrgRom:28d31-28d34:CommonWord_fe:fe
NesPrgRom:28d35-28d37:CommonWord_ff:ff
NesPrgRom:28d38-28d3e:UncommonWord_00:05 00
NesPrgRom:28d3f-28d45:UncommonWord_01:05 01
NesPrgRom:28d46-28d49:UncommonWord_02:05 02
NesPrgRom:28d4a-28d4f:UncommonWord_03:05 03
NesPrgRom:28d50-28d55:UncommonWord_04:05 04
NesPrgRom:28d56-28d5d:UncommonWord_05:05 05
NesPrgRom:28d5e-28d64:UncommonWord_06:05 06
NesPrgRom:28d65-28d6b:UncommonWord_07:05 07
NesPrgRom:28d6c-28d76:UncommonWord_08:05 08
NesPrgRom:28d77-28d7f:UncommonWord_09:05 09
NesPrgRom:28d80-28d8d::05 0a
NesPrgRom:28d8e-28d95:PersonName_00:06 00
NesPrgRom:28d96-28d9d:PersonName_01:06 01
NesPrgRom:28d9e-28da3:PersonName_02:06 02
NesPrgRom:28da4-28daa:PersonName_03:06 03
NesPrgRom:28dab-28db0:PersonName_04:06 04
NesPrgRom:28db1-28db4:PersonName_05:06 05
NesPrgRom:28db5-28dba:PersonName_06:06 06
NesPrgRom:28dbb-28dc1:PersonName_07:06 07
NesPrgRom:28dc2-28dc7:PersonName_08:06 08
NesPrgRom:28dc8-28dd1:PersonName_09:06 09
NesPrgRom:28dd2-28dd7:PersonName_0a:06 0a
NesPrgRom:28dd8-28ddf:PersonName_0b:06 0b
NesPrgRom:28de0-28de6:PersonName_0c:06 0c
NesPrgRom:28de7-28deb:PersonName_0d:06 0d
NesPrgRom:28dec-28df0:PersonName_0e:06 0e
NesPrgRom:28df1-28df6:PersonName_0f:06 0f
NesPrgRom:28df7-28dfd:PersonName_10:06 10
NesPrgRom:28dfe-28e02:PersonName_11:06 11
NesPrgRom:28e03-28e09:PersonName_12:06 12
NesPrgRom:28e0a-28e0e:PersonName_13:06 13
NesPrgRom:28e0f-28e17:PersonName_14:06 14
NesPrgRom:28e18-28e21:PersonName_15:06 15
NesPrgRom:28e22-28e2a:PersonName_16:06 16
NesPrgRom:28e2b-28e34:PersonName_17:06 17
NesPrgRom:28e35-28e38:PersonName_18:06 18
NesPrgRom:28e39-28e3d:PersonName_19:06 19
NesPrgRom:28e3e-28e42:PersonName_1a:06 1a
NesPrgRom:28e43-28e4b:PersonName_1b:06 1b
NesPrgRom:28e4c-28e54:PersonName_1c:06 1c
NesPrgRom:28e55-28e58:PersonName_1d:06 1d
NesPrgRom:28e59-28e5f:PersonName_1e:06 1e
NesPrgRom:28e60-28e67:PersonName_1f:06 1f
NesPrgRom:28e68-28e6c:PersonName_20:06 20
NesPrgRom:28e6d-28e73:PersonName_21:06 21
NesPrgRom:28e74-28e79:PersonName_22:06 22
NesPrgRom:28e7a-28e80:PersonName_23:06 23
NesPrgRom:28e81-28e8e:ItemName_00:00
NesPrgRom:28e8f-28e9c:ItemName_01:01
NesPrgRom:28e9d-28eab:ItemName_02:02
NesPrgRom:28eac-28ebc:ItemName_03:03
NesPrgRom:28ebd-28ec6:ItemName_04:04
NesPrgRom:28ec7-28ed3:ItemName_05:05
NesPrgRom:28ed4-28ee4:ItemName_06:06
NesPrgRom:28ee5-28ef1:ItemName_07:07
NesPrgRom:28ef2-28f00:ItemName_08:08
NesPrgRom:28f01-28f0e:ItemName_09:09
NesPrgRom:28f0f-28f20:ItemName_0a:0a
NesPrgRom:28f21-28f30:ItemName_0b:0b
NesPrgRom:28f31-28f3f:ItemName_0c:0c
NesPrgRom:28f40-28f4f:ItemName_0d:0d
NesPrgRom:28f50-28f5d:ItemName_0e:0e
NesPrgRom:28f5e-28f6d:ItemName_0f:0f
NesPrgRom:28f6e-28f7d:ItemName_10:10
NesPrgRom:28f7e-28f8c:ItemName_11:11
NesPrgRom:28f8d-28f9a:ItemName_12:12
NesPrgRom:28f9b-28fa8:ItemName_13:13
NesPrgRom:28fa9-28fb6:ItemName_14:14
NesPrgRom:28fb7-28fc2:ItemName_15:15
NesPrgRom:28fc3-28fd0:ItemName_16:16
NesPrgRom:28fd1-28fdd:ItemName_17:17
NesPrgRom:28fde-28fec:ItemName_18:18
NesPrgRom:28fed-28ff9:ItemName_19:19
NesPrgRom:28ffa-29006:ItemName_1a:1a
NesPrgRom:29007-29013:ItemName_1b:1b
NesPrgRom:29014-29020:ItemName_1c:1c
NesPrgRom:29021-2902d:ItemName_1d:1d
NesPrgRom:2902e-29036:ItemName_1e:1e
NesPrgRom:29037-29042:ItemName_1f:1f
NesPrgRom:29043-29050:ItemName_20:20
NesPrgRom:29051-2905f:ItemName_21:21
NesPrgRom:29060-2906a:ItemName_22:22
NesPrgRom:2906b-29079:ItemName_23:23
NesPrgRom:2907a-29084:ItemName_24:24
NesPrgRom:29085-29093:ItemName_25:25
NesPrgRom:29094-2909f:ItemName_26:26
NesPrgRom:290a0-290ac:ItemName_27:27
NesPrgRom:290ad-290ba:ItemName_28:28
NesPrgRom:290bb-290c3:ItemName_29:29
NesPrgRom:290c4-290ce:ItemName_2a:2a
NesPrgRom:290cf-290db:ItemName_2b:2b
NesPrgRom:290dc-290e9:ItemName_2c:2c
NesPrgRom:290ea-290f7:ItemName_2d:2d
NesPrgRom:290f8-29104:ItemName_2e:2e
NesPrgRom:29105-29112:ItemName_2f:2f
NesPrgRom:29113-2911e:ItemName_30:30
NesPrgRom:2911f-2912a:ItemName_31:31
NesPrgRom:2912b-29137:ItemName_32:32
NesPrgRom:29138-29145:ItemName_33:33
NesPrgRom:29146-29151:ItemName_34:34
NesPrgRom:29152-2915a:ItemName_35:35
NesPrgRom:2915b-29166:ItemName_36:36
NesPrgRom:29167-29172:ItemName_37:37
NesPrgRom:29173-29180:ItemName_38:38
NesPrgRom:29181-2918d:ItemName_39:39
NesPrgRom:2918e-2919c:ItemName_3a:3a
NesPrgRom:2919d-291a9:ItemName_3b:3b
NesPrgRom:291aa-291b6:ItemName_3c:3c
NesPrgRom:291b7-291c3:ItemName_3d:3d
NesPrgRom:291c4-291cf:ItemName_3e:3e
NesPrgRom:291d0-291da:ItemName_3f:3f
NesPrgRom:291db-291e7:ItemName_40:40
NesPrgRom:291e8-291ef:ItemName_41:41
NesPrgRom:291f0-291f9:ItemName_42:42
NesPrgRom:291fa-29203:ItemName_43:43
NesPrgRom:29204-2920c:ItemName_44:44
NesPrgRom:2920d-29214:ItemName_45:45
NesPrgRom:29215-2921c:ItemName_46:46
NesPrgRom:2921d-29223:ItemName_47:47
NesPrgRom:29224-2922a:ItemName_48:48
NesPrgRom:2922b-2923c:ItemName_49:;; Everything from here down to _29400 appears to be uncovered
NesPrgRom:2923d-2923f::;; --------------------------------
NesPrgRom:29400:_29400:
NesPrgRom:2940f::$29406
NesPrgRom:29441::$2945f
NesPrgRom:29448::$29458
NesPrgRom:2944c::$29451
NesPrgRom:2944e::$29435
NesPrgRom:29455::$29435
NesPrgRom:2945c::$29435
NesPrgRom:29481:_29481:
NesPrgRom:29485::$29483
NesPrgRom:29488::$29483
NesPrgRom:2948f:_2948f:
NesPrgRom:294a3::$29499
NesPrgRom:294a6:_294a6:
NesPrgRom:294c0:_294c0:
NesPrgRom:294c4::$294c2
NesPrgRom:294c7::$294c2
NesPrgRom:294f5:_294f5:
NesPrgRom:294fd::$294f9
NesPrgRom:29500:_29500:
NesPrgRom:2950d::$29524
NesPrgRom:2953a::$29548
NesPrgRom:29540::$2955d
NesPrgRom:2954c::$2955d
NesPrgRom:29551:_29551:
NesPrgRom:2955a::$29509
NesPrgRom:29565:_29565:
NesPrgRom:2957a::$2956f
NesPrgRom:295b5::$295aa
NesPrgRom:295b8:_295b8:
NesPrgRom:295d5:_295d5:
NesPrgRom:295fa:_295fa:
NesPrgRom:29648::$29659
NesPrgRom:29675-29676:DataTable_29675:
NesPrgRom:2967d-2967e:DataTable_2967d:
NesPrgRom:29685-2968f::;; --------------------------------\\n; UNUSED
NesPrgRom:29706:_29706:
NesPrgRom:29717:_29717:
NesPrgRom:29724::$2971a
NesPrgRom:2972d-2972f:DataTable_2972d:
NesPrgRom:2973d:_2973d:
NesPrgRom:2974c:_2974c:
NesPrgRom:29750::$2974e
NesPrgRom:29753::$2974e
NesPrgRom:29756:_29756:
NesPrgRom:29767-2976f:DataTable_29767:
NesPrgRom:29a6a-29a6b:DataTable_29a6a:00
NesPrgRom:29a6c-29a6d::01
NesPrgRom:29a6e-29a6f::02
NesPrgRom:29a70-29a71::03
NesPrgRom:29a72-29a73::04
NesPrgRom:29a74-29a75::05
NesPrgRom:29a76-29a77::06
NesPrgRom:29a78-29a79::07
NesPrgRom:29a7a-29a7b::08
NesPrgRom:29a7c-29a7d::09
NesPrgRom:29a7e-29a7f::0a
NesPrgRom:29a80-29a81::0b
NesPrgRom:29a82-29a8f:DataTable_29a6a_07:
NesPrgRom:29a92-29a9f:DataTable_29a6a_00:
NesPrgRom:29aa2-29aaf:DataTable_29a6a_01:
NesPrgRom:29ab2-29abf:DataTable_29a6a_02:
NesPrgRom:29ac2-29acf:DataTable_29a6a_03:
NesPrgRom:29ad2-29adf:DataTable_29a6a_0a:
NesPrgRom:29ae2-29aef:DataTable_29a6a_09:
NesPrgRom:29af2-29aff:DataTable_29a6a_08:
NesPrgRom:29b02-29b0d:DataTable_29b02:
NesPrgRom:29b0e-29b0f:DataTable_29b0e:
NesPrgRom:29b4e-29b4f::;; This appears to be unused from here down to AdHocSpawns
NesPrgRom:29c00-29c03:AdHocSpawns:
NesPrgRom:29c04-29c07::01 Wind attack 1
NesPrgRom:29c08-29c0b::02 Wind attack 2
NesPrgRom:29c0c-29c0f::03 Tornado attack
NesPrgRom:29c14-29c17::05 Fire attack 1
NesPrgRom:29c18-29c1b::06 Fire attack 2
NesPrgRom:29c1c-29c1f::07 Flame attack
NesPrgRom:29c24-29c27::09 Water attack 1
NesPrgRom:29c28-29c2b::0a Water attack 2
NesPrgRom:29c2c-29c2f::0b Blizzard attack
NesPrgRom:29c34-29c37::0d Thunder attack 1
NesPrgRom:29c38-29c3b::0e Thunder attack 2
NesPrgRom:29c3c-29c3f::0f Storm attack
NesPrgRom:29c40-29c43::10 Paralysis magic
NesPrgRom:29c44-29c47::11 Barrier magic
NesPrgRom:29c48-29c4b::12 Refresh magic animation
NesPrgRom:29c4c-29c4f::13 Crystalis shot 1
NesPrgRom:29c50-29c53::14 Crystalis shot 2
NesPrgRom:29c58-29c5b::16 Monster paralysis beam
NesPrgRom:29c5c-29c5f::17 Flame attack child
NesPrgRom:29c64-29c67::19 Sword stab ??
NesPrgRom:29c68-29c6b::1a ?? also a stab ??
NesPrgRom:29c6c-29c6f::1b ?? during start flashing
NesPrgRom:29c70-29c73::1c Fire attack 2 child
NesPrgRom:29c74-29c77::1d Flame attack child (?)
NesPrgRom:29c78-29c7b::1e Storm attack child
NesPrgRom:29c80-29c83::20 - 0b appears to be the web when it's on the player???
NesPrgRom:29c84-29c87::21
NesPrgRom:29c88-29c8b::22
NesPrgRom:29c8c-29c8f::23
NesPrgRom:29c90-29c93::24
NesPrgRom:29c94-29c97::25
NesPrgRom:29c98-29c9b::26
NesPrgRom:29c9c-29c9f::27
NesPrgRom:29ca0-29ca3::28 Dyna counter attack
NesPrgRom:29ca4-29ca7::29 Dyna laser
NesPrgRom:29ca8-29cab::2a Dyna bubble
NesPrgRom:29cac-29caf::2b
NesPrgRom:29cb0-29cb3::2c
NesPrgRom:29cb4-29cb7::2d
NesPrgRom:29cb8-29cbb::2e Draygon2 Fireballs
NesPrgRom:29cbc-29cbf::2f Draygon2 Fire breath
NesPrgRom:29cc0-29cc3::30 Draygon2 Laser
NesPrgRom:29cc4-29cc7::31 Draygon1 Lightning
NesPrgRom:29cc8-29ccb::32 Statue Fireball
NesPrgRom:29ccc-29ccf::33 Karmine Fireball
NesPrgRom:29cd0-29cd3::34
NesPrgRom:29cd4-29cd7::35
NesPrgRom:29cd8-29cdb::36
NesPrgRom:29cdc-29cdf::37
NesPrgRom:29ce0-29ce3::38
NesPrgRom:29ce4-29ce7::39
NesPrgRom:29ce8-29ceb::3a
NesPrgRom:29cec-29cef::3b
NesPrgRom:29cf0-29cf3::3c
NesPrgRom:29cf4-29cf7::3d
NesPrgRom:29cf8-29cfb::3e
NesPrgRom:29cfc-29cff::3f Coin
NesPrgRom:29d00-29d03:AdHocSpawnsPart2:40
NesPrgRom:29d04-29d07::41
NesPrgRom:29d08-29d0b::42
NesPrgRom:29d0c-29d0f::43
NesPrgRom:29d10-29d13::44
NesPrgRom:29d14-29d17::45
NesPrgRom:29d18-29d1b::46 Curse beam
NesPrgRom:29d1c-29d1f::47
NesPrgRom:29d20-29d23::48
NesPrgRom:29d24-29d27::49
NesPrgRom:29d28-29d2b::4a
NesPrgRom:29d2c-29d2f::4b
NesPrgRom:29d30-29d33::4c
NesPrgRom:29d34-29d37::4d
NesPrgRom:29d38-29d3b::4e
NesPrgRom:29d3c-29d3f::4f
NesPrgRom:29d40-29d43::50
NesPrgRom:29d44-29d47::51
NesPrgRom:29d48-29d4b::52
NesPrgRom:29d4c-29d4f::53
NesPrgRom:29d50-29d53::54
NesPrgRom:29d54-29d57::55
NesPrgRom:29d58-29d5b::56
NesPrgRom:29d5c-29d5f::57
NesPrgRom:29d60-29d63::58
NesPrgRom:29d64-29d67::59
NesPrgRom:29d68-29d6b::5a Flail
NesPrgRom:29d6c-29d6f::5b
NesPrgRom:29d70-29d73::5c
NesPrgRom:29d74-29d77::5d
NesPrgRom:29d78-29d7b::5e
NesPrgRom:29d7c-29d7f::5f
NesPrgRom:29d80-29d81:AdHocSpawnDisplacements:; 0 no displacement\\n0, up
NesPrgRom:29d82-29d83::0, up-right
NesPrgRom:29d84-29d85::0, right
NesPrgRom:29d88-29d89::0, down
NesPrgRom:29d8c-29d8d::0, left
NesPrgRom:29d90-29d91::; 1 paralysis powder, axes\\n1, up
NesPrgRom:29d94-29d95::1, right
NesPrgRom:29d98-29d99::1, down
NesPrgRom:29d9c-29d9d::1, left
NesPrgRom:29da0-29da1::2, up
NesPrgRom:29da4-29da5::2, right
NesPrgRom:29da8-29da9::2, down
NesPrgRom:29dac-29dad::2, left
NesPrgRom:29db0-29db1::3, up
NesPrgRom:29db4-29db5::3, right
NesPrgRom:29db8-29db9::3, down
NesPrgRom:29dbc-29dbd::3, left
NesPrgRom:29dc0-29dc1::; 4 flails, stab\\n4, up
NesPrgRom:29dc4-29dc5::4, right
NesPrgRom:29dc8-29dc9::4, down
NesPrgRom:29dcc-29dcd::4, left
NesPrgRom:29dd0-29dd1::; 5 fire 3\\n5, up
NesPrgRom:29dd4-29dd5::5, right
NesPrgRom:29dd8-29dd9::5, down
NesPrgRom:29ddc-29ddd::5, left
NesPrgRom:29de0-29de1::6, up
NesPrgRom:29de4-29de5::6, right
NesPrgRom:29de8-29de9::6, down
NesPrgRom:29dec-29ded::6, left
NesPrgRom:29df0-29df1::7, up
NesPrgRom:29df4-29df5::7, right
NesPrgRom:29df8-29df9::7, down
NesPrgRom:29dfc-29dfd::7, left
NesPrgRom:29e00-29e01::8, up
NesPrgRom:29e04-29e05::8, right
NesPrgRom:29e08-29e09::8, down
NesPrgRom:29e0c-29e0d::8, left
NesPrgRom:29e10-29e11::9, up
NesPrgRom:29e14-29e15::9, right
NesPrgRom:29e18-29e19::9, down
NesPrgRom:29e1c-29e1d::9, left
NesPrgRom:29e20-29e21::a, up
NesPrgRom:29e24-29e25::a, right
NesPrgRom:29e28-29e29::a, down
NesPrgRom:29e2c-29e2d::a, left
NesPrgRom:29e30-29e31::b, up
NesPrgRom:29e34-29e35::b, right
NesPrgRom:29e38-29e39::b, down
NesPrgRom:29e3c-29e3d::b, left
NesPrgRom:29e40-29e41::c, up
NesPrgRom:29e44-29e45::c, right
NesPrgRom:29e48-29e49::c, down
NesPrgRom:29e4c-29e4d::c, left
NesPrgRom:29e50-29e51::d, up
NesPrgRom:29e54-29e55::d, right
NesPrgRom:29e58-29e59::d, down
NesPrgRom:29e5c-29e5d::d, left
NesPrgRom:29e60-29e61::e, up
NesPrgRom:29e64-29e65::e, right
NesPrgRom:29e68-29e69::e, down
NesPrgRom:29e6c-29e6d::e, left
NesPrgRom:29e70-29e71::f, up
NesPrgRom:29e74-29e75::f, right
NesPrgRom:29e78-29e79::f, down
NesPrgRom:29e7c-29e7d::f, left
NesPrgRom:29e80-29e8f::;; --------------------------------\\n; UNUSED ???
NesPrgRom:2a000-2a013:Message_00_00:
NesPrgRom:2a01c-2a02b:Message_00_01:
NesPrgRom:2a036-2a045:Message_00_02:
NesPrgRom:2a046-2a059:Message_00_03:
NesPrgRom:2a077-2a087:Message_00_04:
NesPrgRom:2a0ab-2a0ba:Message_00_06:
NesPrgRom:2a0cb-2a0d6:Message_00_07:
NesPrgRom:2a0e6-2a0fa:Message_00_09:
NesPrgRom:2a101-2a115:Message_00_0a:
NesPrgRom:2a12a-2a13b:Message_00_0b:
NesPrgRom:2a16a-2a17c:Message_00_0c:
NesPrgRom:2a1a3-2a1b8:Message_00_0e:
NesPrgRom:2a243-2a254:Message_00_0f:
NesPrgRom:2a267-2a274:Message_00_10:
NesPrgRom:2a284-2a292:Message_00_13:
NesPrgRom:2a293-2a29e:Message_00_14:
NesPrgRom:2a29f-2a2b6:Message_00_15:
NesPrgRom:2a2c4-2a2d6:Message_00_16:
NesPrgRom:2a2ea-2a2fb:Message_00_17:
NesPrgRom:2a30c-2a31b:Message_00_18:
NesPrgRom:2a34a-2a357:Message_00_1a:
NesPrgRom:2a39f-2a3aa:Message_00_1b:
NesPrgRom:2a3bc-2a3ca:Message_00_1c:
NesPrgRom:2a3e4-2a3f3:Message_00_1d:
NesPrgRom:2a3f7-2a3fc:Message_01_00:
NesPrgRom:2a3fd-2a40b:Message_01_01:
NesPrgRom:2a412-2a420:Message_01_02:
NesPrgRom:2a43f-2a457:Message_01_03:
NesPrgRom:2a48b-2a49c:Message_01_04:
NesPrgRom:2a49d-2a4a4:Message_01_05:
NesPrgRom:2a4a5-2a4b3:Message_02_00:
NesPrgRom:2a4d2-2a4db:Message_02_01:
NesPrgRom:2a538-2a539:Message_02_02:
NesPrgRom:2a59b-2a5a9:Message_02_03:
NesPrgRom:2a5dc-2a5ee:Message_02_04:
NesPrgRom:2a60f-2a620:Message_02_05:
NesPrgRom:2a657-2a669:Message_02_06:
NesPrgRom:2a680-2a690:Message_02_07:
NesPrgRom:2a6c3-2a6cf:Message_02_08:
NesPrgRom:2a6e2-2a6f3:Message_02_09:
NesPrgRom:2a727-2a737:Message_02_0a:
NesPrgRom:2a751-2a767:Message_02_0b:
NesPrgRom:2a790-2a79e:Message_03_00:
NesPrgRom:2a802-2a813:Message_03_01:
NesPrgRom:2a8b2-2a8c5:Message_03_02:
NesPrgRom:2a8e3-2a8f1:Message_03_03:
NesPrgRom:2a904-2a914:Message_03_04:
NesPrgRom:2a93c-2a941:Message_03_05:
NesPrgRom:2a964-2a971:Message_03_06:
NesPrgRom:2a972-2a984:Message_04_00:
NesPrgRom:2a9a3-2a9b6:Message_04_01:
NesPrgRom:2a9ca-2a9d7:Message_04_02:
NesPrgRom:2a9e0-2a9f5:Message_04_04:
NesPrgRom:2aa13-2aa1b:Message_04_06:
NesPrgRom:2aa24-2aa36:Message_04_08:
NesPrgRom:2aa4c-2aa52:Message_04_0a:
NesPrgRom:2aa93-2aaa3:Message_04_0b:
NesPrgRom:2aad9-2aae9:Message_04_0c:
NesPrgRom:2aaf8-2ab0b:Message_04_0e:
NesPrgRom:2ab22-2ab32:Message_04_0f:
NesPrgRom:2ab3b-2ab3e:Message_04_10:
NesPrgRom:2ab3f-2ab47:Message_04_11:
NesPrgRom:2ab5c-2ab71:Message_04_12:
NesPrgRom:2ab7e-2ab90:Message_04_13:
NesPrgRom:2aba5-2abb4:Message_04_15:
NesPrgRom:2ac7e-2ac84:Message_04_16:
NesPrgRom:2ac85-2ac95:Message_04_17:
NesPrgRom:2ad10-2ad21:Message_04_18:
NesPrgRom:2ad52-2ad69:Message_04_19:
NesPrgRom:2ad72-2ad7d:Message_04_1a:
NesPrgRom:2ad7e-2ad90:Message_05_00:
NesPrgRom:2adb1-2adbd:Message_05_01:
NesPrgRom:2adbe-2adcd:Message_05_02:
NesPrgRom:2ae03-2ae10:Message_05_03:
NesPrgRom:2ae41-2ae4d:Message_05_04:
NesPrgRom:2ae4e-2ae5e:Message_05_05:
NesPrgRom:2ae86-2ae99:Message_05_06:
NesPrgRom:2aeb7-2aeca:Message_05_07:
NesPrgRom:2aefb-2af0c:Message_05_08:
NesPrgRom:2af2b-2af3e:Message_05_09:
NesPrgRom:2af98-2afa5:Message_05_0a:
NesPrgRom:2afc4-2afcb:Message_05_0b:
NesPrgRom:2b02e-2b03a:Message_05_0c:
NesPrgRom:2b043-2b047:Message_05_0d:
NesPrgRom:2b05f-2b076:Message_05_0e:
NesPrgRom:2b157-2b16f:Message_05_0f:
NesPrgRom:2b236-2b244:Message_05_10:
NesPrgRom:2b255-2b265:Message_06_00:
NesPrgRom:2b29e-2b2b1:Message_06_01:
NesPrgRom:2b2e3-2b2f6:Message_07_00:
NesPrgRom:2b322-2b32a:Message_07_01:
NesPrgRom:2b353-2b363:Message_07_02:
NesPrgRom:2b381-2b390:Message_07_03:
NesPrgRom:2b3a0-2b3af:Message_07_05:
NesPrgRom:2b3b0-2b3c6:Message_07_04:
NesPrgRom:2b3c7-2b3d9:Message_07_09:
NesPrgRom:2b45e-2b470:Message_07_0a:
NesPrgRom:2b471-2b47c:Message_08_00:
NesPrgRom:2b485-2b495:Message_08_01:
NesPrgRom:2b499-2b4ab:Message_08_02:
NesPrgRom:2b4bb-2b4cd:Message_08_03:
NesPrgRom:2b4d9-2b4e5:Message_08_04:
NesPrgRom:2b4e6-2b4f7:Message_08_05:
NesPrgRom:2b520-2b531:Message_08_06:
NesPrgRom:2b543-2b54f:Message_08_07:
NesPrgRom:2b55f-2b566:Message_08_08:
NesPrgRom:2b574-2b580:Message_08_09:
NesPrgRom:2b5c0-2b5ca:Message_08_0a:
NesPrgRom:2b5e5-2b5fa:Message_08_0b:
NesPrgRom:2b61c-2b62f:Message_08_0c:
NesPrgRom:2b662-2b66e:Message_08_0d:
NesPrgRom:2b67c-2b68c:Message_08_0f:
NesPrgRom:2b6b2-2b6c3:Message_08_10:
NesPrgRom:2b6eb-2b6fc:Message_08_11:
NesPrgRom:2b722-2b72c:Message_08_12:
NesPrgRom:2b793-2b7a1:Message_08_13:
NesPrgRom:2b7c3-2b7d5:Message_08_14:
NesPrgRom:2b7f3-2b806:Message_08_15:
NesPrgRom:2b82a-2b83a:Message_09_00:
NesPrgRom:2b844-2b845:Message_09_01:
NesPrgRom:2b892-2b8a3:Message_09_02:
NesPrgRom:2b8ac-2b8ba:Message_09_03:
NesPrgRom:2b8bb-2b8c9:Message_09_04:
NesPrgRom:2b8ed-2b8f7:Message_09_05:
NesPrgRom:2b903-2b910:Message_09_06:
NesPrgRom:2b931-2b946:Message_0a_00:
NesPrgRom:2b977-2b98d:Message_0a_01:
NesPrgRom:2b9a4-2b9b7:Message_0a_02:
NesPrgRom:2b9db-2b9ec:Message_0a_03:
NesPrgRom:2b9fc-2ba04:Message_0a_04:
NesPrgRom:2ba8f-2ba9a:Message_0a_05:
NesPrgRom:2bac6-2bad5:Message_0a_07:
NesPrgRom:2bb15-2bb32:Message_0a_08:
NesPrgRom:2bb62-2bb72:Message_0a_09:
NesPrgRom:2bbca-2bbe3:Message_0a_0a:
NesPrgRom:2bbf9-2bc01:Message_0a_0b:
NesPrgRom:2bc02-2bc10:Message_0a_0c:
NesPrgRom:2bc52-2bc62:Message_0a_0d:
NesPrgRom:2bc9d-2bca9:Message_0a_0e:
NesPrgRom:2bcaa-2bcb0:Message_0a_0f:
NesPrgRom:2bcb1-2bcc2:Message_0b_00:
NesPrgRom:2bd61-2bd6e:Message_0b_01:
NesPrgRom:2bdca-2bdd9:Message_0b_02:
NesPrgRom:2bde0-2bdf1:Message_0b_03:
NesPrgRom:2be14-2be24:Message_0c_00:
NesPrgRom:2be3b-2be4f:Message_0c_01:
NesPrgRom:2be84-2be94:Message_0c_02:
NesPrgRom:2bea5-2beac:Message_0c_04:
NesPrgRom:2bead-2bebb:Message_0d_00:
NesPrgRom:2bee3-2bef3:Message_0d_01:
NesPrgRom:2bf1c-2bf23:Message_0d_02:
NesPrgRom:2bf24-2bf2b:Message_0d_03:
NesPrgRom:2bf2c-2bf30:Message_0d_04:
NesPrgRom:2bf31-2bf3f::; UNUSED
NesPrgRom:2c000-2c00f:Message_0e_00:
NesPrgRom:2c031-2c037:Message_0e_01:
NesPrgRom:2c038-2c03e:Message_0e_02:
NesPrgRom:2c03f-2c04a:Message_0e_03:
NesPrgRom:2c0fb-2c110:Message_0e_04:
NesPrgRom:2c15b-2c174:Message_0f_00:
NesPrgRom:2c201-2c218:Message_0f_01:
NesPrgRom:2c21f-2c234:Message_0f_02:
NesPrgRom:2c235-2c244:Message_0f_03:
NesPrgRom:2c24c-2c25b:Message_0f_04:
NesPrgRom:2c265-2c272:Message_0f_05:
NesPrgRom:2c28f-2c298:Message_0f_06:
NesPrgRom:2c2a9-2c2b8:Message_0f_08:
NesPrgRom:2c2d8-2c2e8:Message_0f_09:
NesPrgRom:2c2e9-2c2f8:Message_0f_0a:
NesPrgRom:2c315-2c31e:Message_0f_0b:
NesPrgRom:2c31f-2c335:Message_0f_0c:
NesPrgRom:2c388-2c39c:Message_0f_0d:
NesPrgRom:2c3c1-2c3d4:Message_0f_0e:
NesPrgRom:2c3f7-2c40b:Message_0f_0f:
NesPrgRom:2c428-2c438:Message_0f_10:
NesPrgRom:2c440-2c45a:Message_0f_11:
NesPrgRom:2c463-2c474:Message_0f_12:
NesPrgRom:2c489-2c499:Message_0f_13:
NesPrgRom:2c49a-2c4aa:Message_0f_14:
NesPrgRom:2c4b0-2c4c4:Message_0f_15:
NesPrgRom:2c4e1-2c4f3:Message_0f_16:
NesPrgRom:2c4f4-2c505:Message_0f_18:
NesPrgRom:2c543-2c550:Message_10_00:
NesPrgRom:2c5b2-2c5c6:Message_10_01:
NesPrgRom:2c5dd-2c5eb:Message_10_02:
NesPrgRom:2c608-2c619:Message_10_03:
NesPrgRom:2c660-2c675:Message_10_04:
NesPrgRom:2c684-2c698:Message_10_05:
NesPrgRom:2c6df-2c6f0:Message_10_06:
NesPrgRom:2c720-2c733:Message_10_07:
NesPrgRom:2c73b-2c74a:Message_10_08:
NesPrgRom:2c766-2c771:Message_10_09:
NesPrgRom:2c781-2c794:Message_10_0a:
NesPrgRom:2c7b3-2c7c1:Message_10_0b:
NesPrgRom:2c7ce-2c7d9:Message_10_0c:
NesPrgRom:2c807-2c815:Message_10_0d:
NesPrgRom:2c816-2c825:Message_10_0e:
NesPrgRom:2c838-2c84b:Message_10_0f:
NesPrgRom:2c85e-2c870:Message_10_10:
NesPrgRom:2c871-2c884:Message_10_11:
NesPrgRom:2c88b-2c897:Message_10_12:
NesPrgRom:2c907-2c914:Message_10_13:
NesPrgRom:2c95b-2c969:Message_11_00:
NesPrgRom:2c978-2c986:Message_11_01:
NesPrgRom:2c99f-2c9b3:Message_12_00:
NesPrgRom:2c9bb-2c9c7:Message_12_01:
NesPrgRom:2c9ce-2c9e4:Message_12_02:
NesPrgRom:2c9e5-2c9f7:Message_12_03:
NesPrgRom:2ca0c-2ca20:Message_12_04:
NesPrgRom:2ca30-2ca3c:Message_12_05:
NesPrgRom:2ca58-2ca62:Message_12_06:
NesPrgRom:2ca84-2ca90:Message_12_07:
NesPrgRom:2ca91-2ca9b:Message_12_08:
NesPrgRom:2cabd-2cac7:Message_12_09:
NesPrgRom:2cad5-2cadf:Message_12_0a:
NesPrgRom:2caf1-2cb03:Message_12_0b:
NesPrgRom:2cb12-2cb1d:Message_12_0c:
NesPrgRom:2cb5a-2cb6d:Message_12_0f:
NesPrgRom:2cb81-2cb82:Message_12_10:
NesPrgRom:2cbd7-2cbeb:Message_12_11:
NesPrgRom:2cc16-2cc27:Message_12_12:
NesPrgRom:2cc34-2cc3e:Message_13_00:
NesPrgRom:2cc76-2cc86:Message_13_01:
NesPrgRom:2cc90-2cc91:Message_13_02:
NesPrgRom:2cd15-2cd24:Message_13_03:
NesPrgRom:2cd2e-2cd38:Message_13_04:
NesPrgRom:2cd39-2cd46:Message_13_05:
NesPrgRom:2cd62-2cd6d:Message_13_06:
NesPrgRom:2cd6e-2cd79:Message_13_07:
NesPrgRom:2cdbb-2cdc7:Message_13_08:
NesPrgRom:2cde7-2cdf8:Message_13_09:
NesPrgRom:2ce23-2ce2d:Message_13_0a:
NesPrgRom:2ce38-2ce4a:Message_13_0b:
NesPrgRom:2cea2-2ceb2:Message_13_0c:
NesPrgRom:2ced4-2cedb:Message_13_0d:
NesPrgRom:2cef2-2cf08:Message_13_0e:
NesPrgRom:2cf2b-2cf39:Message_13_0f:
NesPrgRom:2cf87-2cf99:Message_13_10:
NesPrgRom:2cfae-2cfb9:Message_13_11:
NesPrgRom:2cfba-2cfd1:Message_13_12:
NesPrgRom:2cfd2-2cfdf:Message_13_13:
NesPrgRom:2cff4-2d002:Message_13_14:
NesPrgRom:2d016-2d027:Message_13_15:
NesPrgRom:2d028-2d036:Message_14_00:
NesPrgRom:2d04c-2d05e:Message_14_01:
NesPrgRom:2d05f-2d066:Message_14_03:
NesPrgRom:2d070-2d077:Message_14_04:
NesPrgRom:2d078-2d087:Message_14_05:
NesPrgRom:2d0c1-2d0d1:Message_14_06:
NesPrgRom:2d0e2-2d0ed:Message_14_07:
NesPrgRom:2d13d-2d14a:Message_14_08:
NesPrgRom:2d172-2d17b:Message_14_09:
NesPrgRom:2d17c-2d18c:Message_14_0a:
NesPrgRom:2d20a-2d217:Message_14_0b:
NesPrgRom:2d224-2d232:Message_14_0c:
NesPrgRom:2d24b-2d257:Message_14_0d:
NesPrgRom:2d283-2d296:Message_14_0e:
NesPrgRom:2d297-2d2a0:Message_14_0f:
NesPrgRom:2d2a1-2d2ac:Message_14_10:
NesPrgRom:2d2dc-2d2e5:Message_14_12:
NesPrgRom:2d2ea-2d2f4:Message_14_13:
NesPrgRom:2d30a-2d30e:Message_14_14:
NesPrgRom:2d30f-2d31b:Message_14_15:
NesPrgRom:2d31c-2d334:Message_14_16:
NesPrgRom:2d335-2d344:Message_14_17:
NesPrgRom:2d3f5-2d409:Message_15_00:
NesPrgRom:2d40a-2d415:Message_15_01:
NesPrgRom:2d41c-2d42a:Message_15_02:
NesPrgRom:2d436-2d441:Message_15_03:
NesPrgRom:2d45e-2d474:Message_15_04:
NesPrgRom:2d488-2d499:Message_15_05:
NesPrgRom:2d4a8-2d4b4:Message_15_06:
NesPrgRom:2d4d4-2d4e8:Message_15_07:
NesPrgRom:2d4f5-2d502:Message_15_08:
NesPrgRom:2d51c-2d523:Message_15_09:
NesPrgRom:2d524-2d530:Message_15_0a:
NesPrgRom:2d531-2d540:Message_15_0b:
NesPrgRom:2d541-2d550:Message_15_0c:
NesPrgRom:2d566-2d573:Message_16_00:
NesPrgRom:2d5f6-2d605:Message_16_01:
NesPrgRom:2d60b-2d624:Message_16_02:
NesPrgRom:2d6be-2d6c7:Message_14_18:
NesPrgRom:2d6c8-2d6d5:Message_16_04:
NesPrgRom:2d720-2d72d:Message_16_05:
NesPrgRom:2d737-2d748:Message_16_06:
NesPrgRom:2d794-2d7a5:Message_16_07:
NesPrgRom:2d7af-2d7bf:Message_17_00:
NesPrgRom:2d7c4-2d7d8:Message_17_01:
NesPrgRom:2d7e2-2d7f1:Message_17_02:
NesPrgRom:2d811-2d824:Message_17_03:
NesPrgRom:2d83e-2d84b:Message_17_04:
NesPrgRom:2d876-2d88a:Message_17_05:
NesPrgRom:2d8ac-2d8b9:Message_17_06:
NesPrgRom:2d8d2-2d8eb:Message_17_07:
NesPrgRom:2d8f5-2d90c:Message_17_08:
NesPrgRom:2d92a-2d940:Message_17_09:
NesPrgRom:2d96d-2d981:Message_17_0a:
NesPrgRom:2d98e-2d99e:Message_17_0b:
NesPrgRom:2d9b2-2d9c2:Message_17_0c:
NesPrgRom:2d9de-2d9ee:Message_17_0d:
NesPrgRom:2da0b-2da1a:Message_17_0e:
NesPrgRom:2daca-2dadc:Message_17_0f:
NesPrgRom:2daf7-2dafd:Message_17_10:
NesPrgRom:2db0b-2db1c:Message_18_00:
NesPrgRom:2db32-2db44:Message_18_01:
NesPrgRom:2db74-2db86:Message_18_02:
NesPrgRom:2dba6-2dbb6:Message_18_03:
NesPrgRom:2dc10-2dc20:Message_18_04:
NesPrgRom:2dc4f-2dc5f:Message_18_05:
NesPrgRom:2dcb1-2dcc4:Message_18_06:
NesPrgRom:2dd1c-2dd21:Message_18_07:
NesPrgRom:2ddd2-2dddd:Message_18_08:
NesPrgRom:2de0f-2de20:Message_19_00:
NesPrgRom:2de54-2de68:Message_19_01:
NesPrgRom:2de69-2de7a:Message_19_02:
NesPrgRom:2de83-2de93:Message_19_03:
NesPrgRom:2df1f-2df35:Message_19_04:
NesPrgRom:2df66-2df70:Message_19_05:
NesPrgRom:2df90-2df9f::; UNUSED
NesPrgRom:2e000-2e00f:Message_1a_00:
NesPrgRom:2e03b-2e051:Message_1a_01:
NesPrgRom:2e082-2e091:Message_1a_02:
NesPrgRom:2e0af-2e0c4:Message_1a_03:
NesPrgRom:2e0e1-2e0f2:Message_1a_04:
NesPrgRom:2e106-2e10e:Message_1a_05:
NesPrgRom:2e1c8-2e1d8:Message_1a_06:
NesPrgRom:2e1ee-2e201:Message_1a_08:
NesPrgRom:2e231-2e23c:Message_1a_07:
NesPrgRom:2e253-2e269:Message_1a_09:
NesPrgRom:2e278-2e283:Message_1a_0a:
NesPrgRom:2e288-2e296:Message_1a_0b:
NesPrgRom:2e297-2e2ac:Message_1a_0c:
NesPrgRom:2e2b3-2e2c7:Message_1a_0d:
NesPrgRom:2e2dd-2e2e9:Message_1a_0e:
NesPrgRom:2e2ea-2e2fb:Message_1a_0f:
NesPrgRom:2e32c-2e344:Message_1a_10:
NesPrgRom:2e3bf-2e3d4:Message_1a_11:
NesPrgRom:2e3d9-2e3e4:Message_1a_12:
NesPrgRom:2e3e5-2e3ef:Message_1b_00:
NesPrgRom:2e40c-2e41a:Message_1b_01:
NesPrgRom:2e4cc-2e4dd:Message_1b_02:
NesPrgRom:2e4ea-2e4fc:Message_1b_03:
NesPrgRom:2e518-2e524:Message_1b_04:
NesPrgRom:2e556-2e569:Message_1b_05:
NesPrgRom:2e654-2e668:Message_1b_06:
NesPrgRom:2e708-2e713:Message_1b_07:
NesPrgRom:2e741-2e750:Message_1b_08:
NesPrgRom:2e83f-2e84e:Message_1b_09:
NesPrgRom:2e906-2e917:Message_1b_0a:
NesPrgRom:2e9c9-2e9d1:Message_1b_0b:
NesPrgRom:2ea23-2ea36:Message_1b_0c:
NesPrgRom:2ea72-2ea82:Message_1b_0d:
NesPrgRom:2ea9f-2eaa9:Message_1b_0e:
NesPrgRom:2eaaa-2eac0:Message_1b_0f:
NesPrgRom:2eae5-2eaee:Message_1b_10:
NesPrgRom:2eb77-2eb94:Message_1b_11:
NesPrgRom:2ebd9-2ebe9:Message_1b_12:
NesPrgRom:2ebf5-2ebff:Message_1c_00:
NesPrgRom:2ec03-2ec14:Message_1c_01:
NesPrgRom:2ec20-2ec25:Message_1c_02:
NesPrgRom:2ec47-2ec55:Message_1c_03:
NesPrgRom:2ec77-2ec86:Message_1c_04:
NesPrgRom:2ecad-2ecbb:Message_1c_05:
NesPrgRom:2ecdd-2ece5:Message_1c_06:
NesPrgRom:2ed0c-2ed25:Message_1c_07:
NesPrgRom:2ed4b-2ed5a:Message_1c_08:
NesPrgRom:2ed70-2ed81:Message_1c_09:
NesPrgRom:2ed92-2eda1:Message_1c_0a:
NesPrgRom:2edc3-2edd1:Message_1c_0b:
NesPrgRom:2edfe-2ee06:Message_1c_0c:
NesPrgRom:2ee1e-2ee2e:Message_1c_0d:
NesPrgRom:2ee36-2ee49:Message_1c_0e:
NesPrgRom:2ee50-2ee5e:Message_1c_0f:
NesPrgRom:2ee7e-2ee8c:Message_1c_10:
NesPrgRom:2eee6-2eef3:Message_1c_11:
NesPrgRom:2ef4f-2ef55:Message_1c_12:
NesPrgRom:2ef56-2ef64:Message_1c_13:
NesPrgRom:2ef80-2ef95:Message_1c_14:
NesPrgRom:2efa7-2efbb:Message_1c_15:
NesPrgRom:2efc8-2efd9:Message_1c_16:
NesPrgRom:2efea-2f000:Message_1c_17:
NesPrgRom:2f006-2f018:Message_1c_18:
NesPrgRom:2f03c-2f052:Message_1c_19:
NesPrgRom:2f065-2f076:Message_1c_1a:
NesPrgRom:2f0b3-2f0c2:Message_1c_1b:
NesPrgRom:2f0dd-2f0e6:Message_1c_1c:
NesPrgRom:2f0ff-2f110:Message_1c_1d:
NesPrgRom:2f135-2f141:Message_1c_1e:
NesPrgRom:2f152-2f167:Message_1c_1f:
NesPrgRom:2f18c-2f19d:Message_1d_00:
NesPrgRom:2f1bb-2f1c5:Message_1d_01:
NesPrgRom:2f1ec-2f1fc:Message_1d_02:
NesPrgRom:2f220-2f22c:Message_1d_03:
NesPrgRom:2f23d-2f246:Message_1d_04:
NesPrgRom:2f257-2f262:Message_1d_05:
NesPrgRom:2f274-2f281:Message_1d_06:
NesPrgRom:2f2b4-2f2c7:Message_1d_07:
NesPrgRom:2f2e5-2f2ed:Message_1d_08:
NesPrgRom:2f2f2-2f2f6:Message_1d_09:
NesPrgRom:2f30e-2f321:Message_1d_0a:
NesPrgRom:2f348-2f355:Message_1d_0b:
NesPrgRom:2f37c-2f393:Message_1d_0c:
NesPrgRom:2f394-2f3a9:Message_1d_0d:
NesPrgRom:2f3b8-2f3c7:Message_1d_0e:
NesPrgRom:2f3ce-2f3dc:Message_1d_0f:
NesPrgRom:2f3e0-2f3ef:Message_1d_10:
NesPrgRom:2f3fa-2f409:Message_1d_11:
NesPrgRom:2f4ae-2f4b9:Message_1d_13:
NesPrgRom:2f4fb-2f4ff:Message_1d_14:
NesPrgRom:2f500-2f517:Message_1d_15:
NesPrgRom:2f518-2f52b:Message_1d_16:
NesPrgRom:2f564-2f573:Message_1d_17:
NesPrgRom:2f574-2f586:Message_1d_18:
NesPrgRom:2f592-2f5a8:Message_1d_19:
NesPrgRom:2f5c3-2f5d4:Message_1d_1a:
NesPrgRom:2f5ea-2f5f7:Message_1d_1b:
NesPrgRom:2f5f8-2f60c:Message_1d_1c:
NesPrgRom:2f62b-2f63b:Message_1d_1d:
NesPrgRom:2f661-2f678:Message_1e_00:
NesPrgRom:2f689-2f69b:Message_1e_01:
NesPrgRom:2f69c-2f6ab:Message_1e_02:
NesPrgRom:2f6b6-2f6c7:Message_1e_03:
NesPrgRom:2f6d2-2f6da:Message_1e_04:
NesPrgRom:2f6db-2f6e0:Message_1e_07:
NesPrgRom:2f6e1-2f6eb:Message_1e_0f:
NesPrgRom:2f6fb-2f703:Message_1e_10:
NesPrgRom:2f704-2f714:Message_1e_12:
NesPrgRom:2f734-2f744:Message_1e_13:
NesPrgRom:2f745-2f757:Message_1e_14:
NesPrgRom:2f758-2f75e:Message_1e_15:
NesPrgRom:2f75f-2f770:Message_1e_17:
NesPrgRom:2f771-2f77d:Message_1e_18:
NesPrgRom:2f77e-2f78b:Message_1e_19:
NesPrgRom:2f7b9-2f7c8:Message_1e_1a:
NesPrgRom:2f7f0-2f7f6:Message_1e_1b:
NesPrgRom:2f7f7-2f7fd:Message_1f_00:
NesPrgRom:2f7fe-2f7ff:Message_20_00:
NesPrgRom:2f814-2f815:Message_20_01:
NesPrgRom:2f830-2f831:Message_20_02:
NesPrgRom:2f851-2f852:Message_20_03:
NesPrgRom:2f869-2f86a:Message_20_04:
NesPrgRom:2f884-2f885:Message_20_05:
NesPrgRom:2f8a7-2f8a8:Message_20_06:
NesPrgRom:2f8d8-2f8d9:Message_20_07:
NesPrgRom:2f8ef-2f8f0:Message_20_08:
NesPrgRom:2f914-2f915:Message_20_09:
NesPrgRom:2f931-2f932:Message_20_0a:
NesPrgRom:2f94f-2f962:Message_20_0b:
NesPrgRom:2f992-2f993:Message_20_0c:
NesPrgRom:2f99f-2f9a0:Message_20_0d:
NesPrgRom:2f9c5-2f9c6:Message_20_0e:
NesPrgRom:2f9dc-2f9ed:Message_20_0f:
NesPrgRom:2f9ee-2f9ef:Message_20_10:
NesPrgRom:2fa05-2fa06:Message_20_11:
NesPrgRom:2fa15-2fa2a:Message_20_12:
NesPrgRom:2fa2b-2fa2c:Message_20_13:
NesPrgRom:2fa3d-2fa3e:Message_20_14:
NesPrgRom:2fa62-2fa63:Message_20_15:
NesPrgRom:2fa82-2fa83:Message_20_16:
NesPrgRom:2faa2-2faa3:Message_20_17:
NesPrgRom:2fac2-2fac3:Message_20_18:
NesPrgRom:2fae5-2fae6:Message_20_19:
NesPrgRom:2faf7-2faf8:Message_20_1a:
NesPrgRom:2fb0f-2fb10:Message_20_1b:
NesPrgRom:2fb2c-2fb2d:Message_20_1c:
NesPrgRom:2fb46-2fb47:Message_20_1d:
NesPrgRom:2fb61-2fb70:Message_21_00:
NesPrgRom:2fb9d-2fbb1:Message_21_01:
NesPrgRom:2fbb2-2fbc6:Message_21_02:
NesPrgRom:2fbd5:RevertChangeMagic:; Remove the status bits used by change magic
NesPrgRom:2fbdd::; Play the revert sound
NesPrgRom:2fbe2::; Was this supposed to remove *all* sprites? It doesn't seem to work.\\ntotally unused
NesPrgRom:2fbed::Player step count, set to $1f at start of animation
NesPrgRom:2fbf0::$2fbe7
NesPrgRom:2fc00:MaybeSetCheckpoint:
NesPrgRom:2fc03:_2fc03:
NesPrgRom:2fc06:_2fc06:
NesPrgRom:2fc09:MaybeSetCheckpointActual:
NesPrgRom:2fc21::$2fc19
NesPrgRom:2fc26::$2fc65
NesPrgRom:2fc35::$2fc2b
NesPrgRom:2fc53::$2fc4a
NesPrgRom:2fc5e::$2fc3e
NesPrgRom:2fc60::compute checksum => 70f4
NesPrgRom:2fc63::; Copy checkpoint from main location to backup
NesPrgRom:2fc78::$2fc65
NesPrgRom:2fc82::$2fc7a
NesPrgRom:2fc8e:_2fc8e:
NesPrgRom:2fc9d::$2fc95
NesPrgRom:2fcb8::$2fcaf
NesPrgRom:2fcc3::$2fca3
NesPrgRom:2fcd2::$2fcca
NesPrgRom:2fcda:_2fcda:; This looks like it's involved in restoring saved games
NesPrgRom:2fcec::$2fcdf
NesPrgRom:2fcf7:CopyBytes:
NesPrgRom:2fcff::$2fd03
NesPrgRom:2fd05::$2fd09
NesPrgRom:2fd0f::$2fd14
NesPrgRom:2fd11::$2fcf9
NesPrgRom:2fd1c::$2fcf9
NesPrgRom:2fd1f:StageGameDataForSave_7df0:; Copy relevant state into the savegame
NesPrgRom:2fd50::; This looks like a magic number?
NesPrgRom:2fd60:CopyExtraStateFromCheckpoint:; Copy relevant state from the savegame
NesPrgRom:2fd92:ComputeChecksumForCheckpoint:; Compute a checksum of the save data??\\n; TODO - this is really inefficient, we could get back several\\n; bytes if we just used zero-page addresses here.
NesPrgRom:2fdbd::$2fd9b
NesPrgRom:2fdc0-2fdc5:CopyMemoryToCheckpointTable:; Memory copy data for checkpointing\\n.word (src), .word (dest), .word(length)
NesPrgRom:2fdde-2fde3:CopyCheckpointToMemoryTable:; Memory copy data for loading
NesPrgRom:2fdf6:SetCarryIfCheckpoint:
NesPrgRom:2fdf8::$2ff00
NesPrgRom:2fdfd-2fdff:DataTable_2fdfd:
NesPrgRom:2fe00-2fe0f:InitialPrg_6400:
NesPrgRom:2ff00-2ff0f:CheckpointLocations:
NesPrgRom:30000-30001:AudioJumpTable:00
NesPrgRom:30002-30003::01
NesPrgRom:30004-30005::02
NesPrgRom:30006-30007::03
NesPrgRom:30008-30009::04
NesPrgRom:3000a-3000b::05
NesPrgRom:3000c-3000d::06
NesPrgRom:3000e-3000f::07
NesPrgRom:30010-30011::08
NesPrgRom:30012-30013::09
NesPrgRom:30014-30015::0a
NesPrgRom:30016-30017::0b
NesPrgRom:30018-30019::0c
NesPrgRom:3001a-3001b::0d
NesPrgRom:3001c-3001d::0e
NesPrgRom:3001e-3001f::0f
NesPrgRom:30020:InitializeAudio:
NesPrgRom:30048:StartAudio:
NesPrgRom:30058:StartAudioInner:
NesPrgRom:3005d::$30064
NesPrgRom:30067::$30071
NesPrgRom:3006b::$30094
NesPrgRom:3006d::$300e4
NesPrgRom:30070::; ----
NesPrgRom:30074::$30070 (but could be >rts)
NesPrgRom:30083::$30086
NesPrgRom:30091::$30088
NesPrgRom:30094:StartSfx:; Map $18000 -> $a000
NesPrgRom:300a0::; As far as I can tell, there is no data below x=$40.\\n; So all this data actually comes from the 18000 bank\\n; in the $a000-$bfff block.  This is consistent with\\n; sound effects starting at $20.\\nSoundEffectData-$40
NesPrgRom:300a5::SoundEffectData-$3f
NesPrgRom:300ac::no sound effect bail out
NesPrgRom:300bb::; The first byte appears to be a priority, stored in\\n; $0112.  If a track with a smaller (higher) priority\\n; plays, it will override a larger (lower) priority\\n; SFX in progress.\\n$300bf
NesPrgRom:300e2::;; --------------------------------\\nunused
NesPrgRom:300e3::unused
NesPrgRom:300e4:StartBgm:
NesPrgRom:300e7::$30102
NesPrgRom:300eb::$30102
NesPrgRom:300f6::$300fb
NesPrgRom:300fd::$30102
NesPrgRom:30103:_30103:
NesPrgRom:3012a:_3012a:
NesPrgRom:30132:_30132:
NesPrgRom:30164::uncond
NesPrgRom:30169:_30169:
NesPrgRom:30177:_30177:
NesPrgRom:30186:ResumeAudio:
NesPrgRom:30189::$3018c
NesPrgRom:30197::$301ae
NesPrgRom:301a2::$301ae
NesPrgRom:301b0::$301d0
NesPrgRom:301b5::$301d0
NesPrgRom:301d3::$301de
NesPrgRom:301d9::$301de
NesPrgRom:301e1::$301ec
NesPrgRom:301e7::$301ec
NesPrgRom:301f3:ResumeBgm:
NesPrgRom:301f8::$301ff
NesPrgRom:301fa::; DMC active, has bytes remaining\\n; Zero out the DMC sample length
NesPrgRom:30213::; Check all the 114..117 registers.  If ANY has 01 set then return.
NesPrgRom:30220::$3022f
NesPrgRom:30222::; All channels in 0..3 have 114,x01 clear
NesPrgRom:30228::$30230
NesPrgRom:30233::$3022a
NesPrgRom:30255::$30239
NesPrgRom:30258:ResumeSfx:; Map $18000 -> $a000 (misaligned!)
NesPrgRom:3026e::$30275
NesPrgRom:30270::; fb zero -> sfx done, reset 112 to ff
NesPrgRom:30276:RunAudioCommandsForChannel:; Check channel timer if it's already zero, nothing to do
NesPrgRom:3027a::$30275
NesPrgRom:30284::; Decrement the channel timer only run commands if it hits 0
NesPrgRom:30287::$302b3
NesPrgRom:30289::; We're going to run audio commands for this channel.\\n; Load up the current position into $f5$f6, and stash the\\n; channel index in $fa.  Loop until $f2>0
NesPrgRom:3029c::$30295
NesPrgRom:3029e::; Done running commands now save $150,x into $14a,x and\\n; increment $11a,x and $120,x past already-read commands
NesPrgRom:302be::$302d8
NesPrgRom:302dd::$302f3
NesPrgRom:302e4::$302e9
NesPrgRom:302ee::$302f3
NesPrgRom:302f5::$30307
NesPrgRom:302f9::$30300
NesPrgRom:302fd::$30307
NesPrgRom:3030a::$30346
NesPrgRom:3030c::ApuChannelRegisterGroupOffset
NesPrgRom:30311::$30319
NesPrgRom:3031b::$30323
NesPrgRom:30325::$3032d
NesPrgRom:3032f::$30346
NesPrgRom:30347:RunNextAudioCommandForChannel:
NesPrgRom:30364:AudioJumpTable_1X:
NesPrgRom:30373::$3037d
NesPrgRom:30384::$307a6
NesPrgRom:30388:_30388:
NesPrgRom:3038b::$30394
NesPrgRom:30395:AudioJumpTable_cX:
NesPrgRom:30398::$303ae
NesPrgRom:303b6:_303b6:
NesPrgRom:303c2:AudioJumpTable_dX:
NesPrgRom:303c7::$303cc
NesPrgRom:303d4::$303da
NesPrgRom:303da-303e1:AudioPitchBendTable:
NesPrgRom:303e2:AudioJumpTable_bX:
NesPrgRom:303e5:AudioJumpTable_2X:; Set the pitch (and update mask) and indicate final op
NesPrgRom:303e7:_303e7:
NesPrgRom:303f8:LoadPitchFromTable:$307a6
NesPrgRom:303ff::$3040d
NesPrgRom:30401::; This is a noise channel, store subcmd nibble\\n; directly since noise only has 16 "pitches"
NesPrgRom:3040b::$30421 (unconditional)
NesPrgRom:30421::; A ends up being stored into 17a,x
NesPrgRom:30422:AudioJumpTable_3X:
NesPrgRom:3042e-30435:AudioOctaveTable:
NesPrgRom:30436:AudioJumpTable_4X:
NesPrgRom:3044b::$30457
NesPrgRom:30450::$30457
NesPrgRom:30454::$30457
NesPrgRom:30465:MaybeSilenceCurrentChannel:
NesPrgRom:30468::$3047c
NesPrgRom:30471::$307b2
NesPrgRom:3047d:AudioJumpTable_6X:
NesPrgRom:30483::$30ab8
NesPrgRom:3048a:AudioJumpTable_7X:
NesPrgRom:30498::$304ae
NesPrgRom:304a5::$304a9
NesPrgRom:304a7::; Flag 4002,y and 4003,y for update if changed
NesPrgRom:304af:AudioOutputVolume:
NesPrgRom:304b2::$304f0
NesPrgRom:304bc::$304db
NesPrgRom:304c6::$304ce
NesPrgRom:304cb::$304d1
NesPrgRom:304d9::$304f1
NesPrgRom:304dd::$304e8
NesPrgRom:304e5::$304b4
NesPrgRom:3050a::$30522
NesPrgRom:30532:AudioJumpTable_8X:
NesPrgRom:30534::>rts ($3054c)
NesPrgRom:30536::The 8x command is in $f3, so remove the \`8\` (upper 4 bits)
NesPrgRom:3053c::now $f3 has just the new volume max setting,\\nwrite the new max to $168
NesPrgRom:30546::Mark that a new volume max was set?
NesPrgRom:3054d:AudioJumpTable_9X:;; Seems to set the volume with a different mechanism than the eX command\\nLoad which instrument we are into y
NesPrgRom:30550::original bits look like abcd efgh
NesPrgRom:30556::now we have a = efgh 0000 ie command value bits in the upper 4 bits\\nif this is for the triangle channel
NesPrgRom:30558::$30571
NesPrgRom:3055a::otherwise (its for square or noise etc)
NesPrgRom:3055b::write only the lowest bit ( bit h ) back to $f3
NesPrgRom:3055f::$30569
NesPrgRom:30561::if the command value is even (bit h == 1)\\nDisable volume envelope (sets bit 6 to 0) because $#bf == ~$#40
NesPrgRom:3056b::only 3 bits at this point remain (bits fgh the lowest of command bits)\\nbit 4 was used to disable volume envelope. Now we drop that one so we only have\\ntwo bits left of the command value. gh00 0000
NesPrgRom:3056d::or it with low bit of $f3 (so now we have gh0h)
NesPrgRom:3056f::and always set the 5th bit (gh1h 0000)
NesPrgRom:30573::set the upper 4 bits of $0168 and flag volume changed
NesPrgRom:30584:AudioJumpTable_aX:
NesPrgRom:3058e::$3059b
NesPrgRom:30598::; Subcommands other than 0,1,2,4 (3 or 5+?)
NesPrgRom:3059e::$305ae
NesPrgRom:305af:AudioCommand_a2:
NesPrgRom:305b2:AudioCommand_a1:; Sets the start of a repeat, up to a4\\n; Takes a single byte argument (repeat count + 1)
NesPrgRom:305c9:AudioCommand_a0:; Reads next two bytes as an address -> jumps to it\\n; Also does some stuff with 144,x; 12c,x; and 138,x
NesPrgRom:305e7::$305eb
NesPrgRom:305e9::x>=4 (sfx)
NesPrgRom:305f1:Add6ToX:
NesPrgRom:305f7:AudioJumpTable_eX:Write the specific envelope into the upper 4 bits of $15c
NesPrgRom:30600::set flag in $114 to denote that this has a volume envelope
NesPrgRom:30609:_30609:
NesPrgRom:30610::$30634
NesPrgRom:3061a::$30626
NesPrgRom:30629::$30634
NesPrgRom:30638::$3060b
NesPrgRom:3063b:StartDMC:; Starts DMC channel
NesPrgRom:3063e::$3065e
NesPrgRom:30640::; BGM only
NesPrgRom:30644::$3064c
NesPrgRom:30651:_30651:
NesPrgRom:30654::; SFX -> return\\n$3065e
NesPrgRom:3065a::$3065f
NesPrgRom:30685:AudioJumpTable_fX:
NesPrgRom:30691::$306a1
NesPrgRom:30693::$30698
NesPrgRom:306aa:AudioOutputTimer:
NesPrgRom:306ad::$30713
NesPrgRom:306b1::$306bc
NesPrgRom:306ba::$30713
NesPrgRom:306d4::$306d8
NesPrgRom:306eb::$306f6
NesPrgRom:306ee::subtracts two
NesPrgRom:30709::$30713
NesPrgRom:30714-30723:EvenOnlyMaskTableMaybe:
NesPrgRom:30724-30733:PitchEnvelopeTable:
NesPrgRom:307a6-307ab:ApuChannelRegisterGroupIndex:
NesPrgRom:307ac-307b1:ApuChannelRegisterGroupOffset:
NesPrgRom:307b2-307b7:ApuChannelStatusMask:; Mask of bits for all _other_ tracks in APU_STATUS
NesPrgRom:307b8-307c7:AudioPitchTableLo:
NesPrgRom:30838-30847:AudioPitchTableHi:
NesPrgRom:308b8-308bf:AudioVolumeEnvelopeTable:
NesPrgRom:309b8-309bf:AudioVolumeEnvelopeForSquare2Table:
NesPrgRom:30ab8-30abf:AudioDelayTable:
NesPrgRom:30ad8-30adf:AudioVolumeLookupTable:
NesPrgRom:30bd8-30bdb:DmcTable:; Sample address is e8 => 3fa00, length 3e\\n; As far as I can tell, only d1 is used?  We could just as well\\n; hardcode these values directly into the dX opcode
NesPrgRom:30c0c-30c0d:BackgroundMusicData:$30c4c 00 Silence
NesPrgRom:30c0e-30c0f::$30c61 01 Plains
NesPrgRom:30c12-30c13::$310bc 03 Swamp
NesPrgRom:30c14-30c15::$311b6 04 Desert
NesPrgRom:30c18-30c19::$31314 06 Sea
NesPrgRom:30c1a-30c1b::$31695 07 Cave 3 (ESI, Stxy, Hydra)
NesPrgRom:30c1c-30c1d::$3188d 08 Fortress
NesPrgRom:30c1e-30c1f::$31a8b 09 Start movie
NesPrgRom:30c20-30c21::$31c6d 0a Intro
NesPrgRom:30c22-30c23::$31e8e 0b Title
NesPrgRom:30c24-30c25::$31f4b 0c Draygon 2
NesPrgRom:30c26-30c27::$320e5 0d Shyron
NesPrgRom:30c28-30c29::$32247 0e Fortune teller
NesPrgRom:30c2a-30c2b::$323ce 0f Portoa queen
NesPrgRom:30c2e-30c2f::$32470 11 Cave (wind, etc)
NesPrgRom:30c30-30c31::$325db 12 Boss
NesPrgRom:30c32-30c33::$32796 13 Fanfare
NesPrgRom:30c34-30c35::$327e7 14 Dyna
NesPrgRom:30c36-30c37::$329af 15 Tower
NesPrgRom:30c38-30c39::$32d3d 16 Town
NesPrgRom:30c3a-30c3b::$3302a 17 Cave 2 (waterfall)
NesPrgRom:30c3c-30c3d::$33255 18 Mountain
NesPrgRom:30c3e-30c3f::$33658 19 Crypt
NesPrgRom:30c40-30c41::$33814 1a Ending credits ?
NesPrgRom:30c42-30c43::$339f2 1b Wise men
NesPrgRom:30c44-30c45::$33a8e 1c Ending credits ?
NesPrgRom:30c46-30c47::$33dde 1d Ending credits ?
NesPrgRom:30c48-30c49::$33ed1 1e Heartbeat (dyna prelude)
NesPrgRom:30c4a-30c4b::$33f3a 1f Computer boot (at start)
NesPrgRom:30c4c-30c4f:BackgroundMusicData_00:
NesPrgRom:30c61:BackgroundMusicData_01:
NesPrgRom:30c6a-30c6e:Bgm01_Ch0:
NesPrgRom:30d77-30d79:Bgm01_Ch0_Loop1:jumped to here from first line
NesPrgRom:30dad-30daf:Bgm01_Ch0_Loop2:
NesPrgRom:30db7-30dbf:Bgm01_Ch0_Loop3:
NesPrgRom:30dc6-30dcf:Bgm01_Ch0_Loop4:
NesPrgRom:30ddc-30de0:Bgm01_Ch1:
NesPrgRom:30de1-30de2::$30ee8
NesPrgRom:30ee8-30eea:Bgm01_Ch1_Loop1:jumped to here from first line
NesPrgRom:30f1e-30f1f:Bgm01_Ch1_Loop2:
NesPrgRom:30f28-30f2f:Bgm01_Ch1_Loop3:
NesPrgRom:30f37-30f39:Bgm01_Ch2:
NesPrgRom:31030-3103f:Bgm01_Ch2_Loop1:
NesPrgRom:3105c-3105f:Bgm01_Ch2_Loop2:
NesPrgRom:3106d-3106f:Bgm01_Ch3:
NesPrgRom:310bc:BackgroundMusicData_03:
NesPrgRom:310c5-310ce:Bgm03_Ch0:
NesPrgRom:31114-3111f:Bgm03_Ch1:
NesPrgRom:31165-3116f:Bgm03_Ch2:
NesPrgRom:311b3-311b5:Bgm03_Ch3:
NesPrgRom:311b6:BackgroundMusicData_04:
NesPrgRom:311bf:Bgm04_Ch0:
NesPrgRom:31200-3120f:Bgm04_Ch0_Loop:
NesPrgRom:3122d-3122f:Bgm04_Ch1:
NesPrgRom:3126d-3126f:Bgm04_Ch1_Loop:
NesPrgRom:312a0-312af:Bgm04_Ch2:
NesPrgRom:31311-31313:Bgm04_Ch3:
NesPrgRom:31314:BackgroundMusicData_06:
NesPrgRom:3131d-3131f:Bgm06_Ch0:
NesPrgRom:31423-3142f:Bgm06_Ch1:
NesPrgRom:31510-31512:Bgm06_Ch2:
NesPrgRom:315de-315df:Bgm06_Ch2_Loop1:
NesPrgRom:315f6-315ff:Bgm06_Ch2_Loop2:
NesPrgRom:3160e-3160f:Bgm06_Ch2_Loop3:
NesPrgRom:31624-31626:Bgm06_Ch3:
NesPrgRom:3164e-3164f:Bgm06_Ch3_Loop1:
NesPrgRom:31677-3167f:Bgm06_Ch3_Loop2:
NesPrgRom:31695:BackgroundMusicData_07:
NesPrgRom:3169e-3169f:Bgm07_Ch0:
NesPrgRom:3173e-3173f:Bgm07_Ch1:
NesPrgRom:317db:Bgm07_Ch2:
NesPrgRom:3182b-3182f:Bgm07_Ch2_Loop:
NesPrgRom:31853-3185f:Bgm07_Ch3:
NesPrgRom:3188d:BackgroundMusicData_08:
NesPrgRom:31896-3189f:Bgm08_Ch0:
NesPrgRom:31909-3190f:Bgm08_Ch1:
NesPrgRom:31983-3198f:Bgm08_Ch2:
NesPrgRom:31a41-31a4f:Bgm08_Ch3:
NesPrgRom:31a8b:BackgroundMusicData_09:
NesPrgRom:31a94-31a98:Bgm09_Ch0:
NesPrgRom:31b0d-31b0f:Bgm09_Ch0_Loop:
NesPrgRom:31b3c-31b3f:Bgm09_Ch1:
NesPrgRom:31bd0-31bdf:Bgm09_Ch1_Loop:
NesPrgRom:31bf7-31bff:Bgm09_Ch2:
NesPrgRom:31c6a-31c6c:Bgm09_Ch3:
NesPrgRom:31c6d:BackgroundMusicData_0a:
NesPrgRom:31c76-31c7f:Bgm0a_Ch0:
NesPrgRom:31d24-31d2f:Bgm0a_Ch1:
NesPrgRom:31de2-31def:Bgm0a_Ch2:
NesPrgRom:31e8b-31e8d:Bgm0a_Ch3:
NesPrgRom:31e8e:BackgroundMusicData_0b:
NesPrgRom:31e97-31e9e:Bgm0b_Ch0:
NesPrgRom:31ed6-31edf:Bgm0b_Ch1:
NesPrgRom:31f19-31f28:Bgm0b_Ch2:
NesPrgRom:31f2f-31f3e:Bgm0b_Ch3:
NesPrgRom:31f4b:BackgroundMusicData_0c:
NesPrgRom:31f54-31f5f:Bgm0c_Ch0:
NesPrgRom:31fd2-31fdf:Bgm0c_Ch1:
NesPrgRom:32051-3205f:Bgm0c_Ch2:
NesPrgRom:320e2-320e4:Bgm0c_Ch3:
NesPrgRom:320e5:BackgroundMusicData_0d:
NesPrgRom:320ee-320ef:Bgm0d_Ch0:
NesPrgRom:3216b-3216f:Bgm0d_Ch1:
NesPrgRom:321db-321df:Bgm0d_Ch2:
NesPrgRom:32244-32246:Bgm0d_Ch3:
NesPrgRom:32247:BackgroundMusicData_0e:
NesPrgRom:32250-3225f:Bgm0e_Ch0:
NesPrgRom:322bf:Bgm0e_Ch1:
NesPrgRom:32357-3235f:Bgm0e_Ch2:
NesPrgRom:323cb-323cd:Bgm0e_Ch3:
NesPrgRom:323ce:BackgroundMusicData_0f:
NesPrgRom:323d7-323de:Bgm0f_Ch0:
NesPrgRom:32414-3241f:Bgm0f_Ch1:
NesPrgRom:3244b-3244f:Bgm0f_Ch2:
NesPrgRom:3246d-3246f:Bgm0f_Ch3:
NesPrgRom:32470:BackgroundMusicData_11:
NesPrgRom:32479-3247f:Bgm11_Ch0:
NesPrgRom:324f4-324ff:Bgm11_Ch1:
NesPrgRom:32572-3257f:Bgm11_Ch2:
NesPrgRom:325d8-325da:Bgm11_Ch3:
NesPrgRom:325db:BackgroundMusicData_12:
NesPrgRom:325e4-325ef:Bgm12_Ch0:
NesPrgRom:32668-3266f:Bgm12_Ch1:
NesPrgRom:326dc-326df:Bgm12_Ch2:
NesPrgRom:3272a-3272f:Bgm12_Ch3:
NesPrgRom:32796:BackgroundMusicData_13:
NesPrgRom:3279f:Bgm13_Ch0:
NesPrgRom:327b6-327bf:Bgm13_Ch1:
NesPrgRom:327ce-327cf:Bgm13_Ch2:
NesPrgRom:327e4-327e6:Bgm13_Ch3:
NesPrgRom:327e7:BackgroundMusicData_14:
NesPrgRom:327f0-327ff:Bgm14_Ch0:
NesPrgRom:32879-3287f:Bgm14_Ch1:
NesPrgRom:32904-3290f:Bgm14_Ch2:
NesPrgRom:32954-3295f:Bgm14_Ch3:
NesPrgRom:329af:BackgroundMusicData_15:
NesPrgRom:329b8-329bf:Bgm15_Ch0:
NesPrgRom:32aaa-32aaf:Bgm15_Ch0_Loop1:
NesPrgRom:32aba-32abf:Bgm15_Ch0_Loop2:
NesPrgRom:32ad3-32adf:Bgm15_Ch1:
NesPrgRom:32bdb-32bdf:Bgm15_Ch1_Loop1:
NesPrgRom:32beb-32bef:Bgm15_Ch1_Loop2:
NesPrgRom:32c04-32c0f:Bgm15_Ch2:
NesPrgRom:32caf:Bgm15_Ch2_Loop1:
NesPrgRom:32cd4-32cdf:Bgm15_Ch2_Loop2:
NesPrgRom:32ce3-32ceb:Bgm15_Ch2_Loop3:
NesPrgRom:32cec-32cef:Bgm15_Ch3:
NesPrgRom:32d31-32d3c:Bgm15_Ch3_Loop:
NesPrgRom:32d3d:BackgroundMusicData_16:
NesPrgRom:32d46-32d4f:Bgm16_Ch0:
NesPrgRom:32e15-32e1b:Bgm16_Ch1:
NesPrgRom:32ebb-32ebf:Bgm16_Ch1_Loop1:
NesPrgRom:32ec8-32ecf:Bgm16_Ch1_Loop2:
NesPrgRom:32edb-32edf:Bgm16_Ch1_Loop3:
NesPrgRom:32ee8-32eea:Bgm16_Ch2:
NesPrgRom:32fad-32faf:Bgm16_Ch2_Loop1:
NesPrgRom:32fc1-32fcd:Bgm16_Ch2_Loop2:
NesPrgRom:32fce-32fcf:Bgm16_Ch2_Loop3:
NesPrgRom:33006-3300f:Bgm16_Ch2_Loop4:
NesPrgRom:33011-3301b:Bgm16_Ch2_Loop5:
NesPrgRom:3301c-3301f:Bgm16_Ch2_Loop6:
NesPrgRom:33027-33029:Bgm16_Ch3:
NesPrgRom:3302a:BackgroundMusicData_17:
NesPrgRom:33033-33037:Bgm17_Ch0:
NesPrgRom:330a2-330af:Bgm17_Ch0_Loop:
NesPrgRom:330e2-330e7:Bgm17_Ch1:
NesPrgRom:33158-3315f:Bgm17_Ch1_Loop:
NesPrgRom:33198-3319b:Bgm17_Ch2:
NesPrgRom:331e7-331ef:Bgm17_Ch2_Loop:
NesPrgRom:33252-33254:Bgm17_Ch3:
NesPrgRom:33255:BackgroundMusicData_18:
NesPrgRom:3325e-3325f:Bgm18_Ch0:
NesPrgRom:33379-3337f:Bgm18_Ch1:
NesPrgRom:334b2-334bf:Bgm18_Ch2:
NesPrgRom:335b1-335bf:Bgm18_Ch3:
NesPrgRom:33658:BackgroundMusicData_19:
NesPrgRom:33661-3366e:Bgm19_Ch0:
NesPrgRom:336e3-336ef:Bgm19_Ch1:
NesPrgRom:3379d-3379f:Bgm19_Ch2:
NesPrgRom:33811-33813:Bgm19_Ch3:
NesPrgRom:33814:BackgroundMusicData_1a:
NesPrgRom:3381d-3381f:Bgm1a_Ch0:
NesPrgRom:338b3-338bf:Bgm1a_Ch0_Loop:
NesPrgRom:338ca-338cf:Bgm1a_Ch1:
NesPrgRom:33974-3397f:Bgm1a_Ch1_Loop:
NesPrgRom:33988-3398a:Bgm1a_Ch2:
NesPrgRom:339c9-339cf:Bgm1a_Ch3:
NesPrgRom:339f2:BackgroundMusicData_1b:
NesPrgRom:339fb-339ff:Bgm1b_Ch0:
NesPrgRom:33a4d-33a4f:Bgm1b_Ch1:
NesPrgRom:33a88-33a8a:Bgm1b_Ch2:
NesPrgRom:33a8b-33a8d:Bgm1b_Ch3:
NesPrgRom:33a8e:BackgroundMusicData_1c:
NesPrgRom:33a97-33a9e:Bgm1c_Ch0:
NesPrgRom:33b79-33b7f:Bgm1c_Ch0_Loop:
NesPrgRom:33b8a-33b8f:Bgm1c_Ch1:
NesPrgRom:33c8c-33c8f:Bgm1c_Ch1_Loop:
NesPrgRom:33c9d-33c9f:Bgm1c_Ch2:
NesPrgRom:33d0a-33d0f:Bgm1c_Ch2_Loop1:
NesPrgRom:33d1c-33d1f:Bgm1c_Ch2_Loop2:
NesPrgRom:33d2e-33d2f:Bgm1c_Ch2_Loop3:
NesPrgRom:33d40-33d4d:Bgm1c_Ch2_Loop4:
NesPrgRom:33d4e-33d4f:Bgm1c_Ch2_Loop5:
NesPrgRom:33d5c-33d5f:Bgm1c_Ch2_Loop6:
NesPrgRom:33d6e-33d6f:Bgm1c_Ch3:
NesPrgRom:33dbd-33dbf:Bgm1c_Ch3_Loop1:
NesPrgRom:33dc9-33dcf:Bgm1c_Ch3_Loop2:
NesPrgRom:33dde:BackgroundMusicData_1d:
NesPrgRom:33de7-33deb:Bgm1d_Ch0:
NesPrgRom:33e13-33e1b:Bgm1d_Ch0_Loop:
NesPrgRom:33e1c-33e1f:Bgm1d_Ch1:
NesPrgRom:33e75-33e7f:Bgm1d_Ch1_Loop1:
NesPrgRom:33e85-33e8f:Bgm1d_Ch1_Loop2:
NesPrgRom:33e9a-33e9c:Bgm1d_Ch2:
NesPrgRom:33ec2-33ecd:Bgm1d_Ch2_Loop:
NesPrgRom:33ece-33ed0:Bgm1d_Ch3:
NesPrgRom:33ed1:BackgroundMusicData_1e:
NesPrgRom:33eda-33edf:Bgm1e_Ch0:
NesPrgRom:33ef6-33eff:Bgm1e_Ch1:
NesPrgRom:33f12-33f1f:Bgm1e_Ch2:
NesPrgRom:33f2d-33f2f:Bgm1e_Ch3:
NesPrgRom:33f3a:BackgroundMusicData_1f:
NesPrgRom:33f43-33f4e:Bgm1f_Ch0:
NesPrgRom:33f84-33f8f:Bgm1f_Ch1:
NesPrgRom:33fc7-33fcf:Bgm1f_Ch2:
NesPrgRom:33fd7-33fdf:Bgm1f_Ch3:
NesPrgRom:33ff1-33fff::;; --------------------------------\\n;; UNUSED
NesPrgRom:34000-3400f:DisplacementToDirectionTable:
NesPrgRom:34400::;; --------------------------------\\n;; UNUSED
NesPrgRom:34409:VectorBetweenObjectsXY:
NesPrgRom:34418::$3441c
NesPrgRom:3441a::; if dx < 0 then take the ones complement (so 0 and -1 both => 0)
NesPrgRom:3441e::; x coordinates don't line up - so $11 definitely != 0
NesPrgRom:34420::$34430 uncond
NesPrgRom:34437::; Repeat the operation with y coordinates.
NesPrgRom:34445::$34449
NesPrgRom:3444b::; yhi diff is nonzero shift hi left 1 nibble -> $11, lo right 1 nibble -> y
NesPrgRom:34461::; Looks like $10 is now two nibbles? dy in hi, dx in lo?\\n; Except we just wrote 5 bits for dx. ?\\n; We're assembling an address - $10$11 - in the range [$8000,$83ff],\\n; which translates to the current bank ($34000..$343ff).\\n;   This looks like a 1k space, so 32x32 should be fine.
NesPrgRom:3447e-3447f::;; --------------------------------\\nunused?
NesPrgRom:34480:ComputeDisplacementVector:; Stash the direction (times 8) in $12
NesPrgRom:34485::; Read the speed into Y
NesPrgRom:3448b::; Check for "slow terrain" (grass, swamp, etc)
NesPrgRom:3448f::$34497
NesPrgRom:34491::; Slow terrain decrease speed by two increments
NesPrgRom:34493::$34497
NesPrgRom:344bc-344cb:SpeedTableLo:
NesPrgRom:344cc-344db:SpeedTableHi:
NesPrgRom:344dc-344eb:SpeedTable_Widths:
NesPrgRom:344ec-344f3:SpeedTable_00:dy0 (dx6)
NesPrgRom:344f4-344fb::dy1 (dx7)
NesPrgRom:344fc-34503::dy2  dx0
NesPrgRom:34504-3450b::dy3  dx1
NesPrgRom:3450c-34513::dy4  dx2
NesPrgRom:34514-3451b::dy5  dx3
NesPrgRom:3451c-34523::dy6  dx4
NesPrgRom:34524-3452b::dy7  dx5
NesPrgRom:3452c-34533::dx6 (dy0)
NesPrgRom:34534-3453b::dx7 (dy1)
NesPrgRom:3453c-34543:SpeedTable_01:dy0 (dx6)
NesPrgRom:34544-3454b::dy1 (dx7)
NesPrgRom:3454c-34553::dy2  dx0
NesPrgRom:34554-3455b::dy3  dx1
NesPrgRom:3455c-34563::dy4  dx2
NesPrgRom:34564-3456b::dy5  dx3
NesPrgRom:3456c-34573::dy6  dx4
NesPrgRom:34574-3457b::dy7  dx5
NesPrgRom:3457c-34583::dx6 (dy0)
NesPrgRom:34584-3458b::dx7 (dy1)
NesPrgRom:3458c-34593:SpeedTable_02:dy0 (dx6)
NesPrgRom:34594-3459b::dy1 (dx7)
NesPrgRom:3459c-345a3::dy2  dx0
NesPrgRom:345a4-345ab::dy3  dx1
NesPrgRom:345ac-345b3::dy4  dx2
NesPrgRom:345b4-345bb::dy5  dx3
NesPrgRom:345bc-345c3::dy6  dx4
NesPrgRom:345c4-345cb::dy7  dx5
NesPrgRom:345cc-345d3::dx6 (dy0)
NesPrgRom:345d4-345db::dx7 (dy1)
NesPrgRom:345dc-345e3:SpeedTable_03:dy0 (dx6)
NesPrgRom:345e4-345eb::dy1 (dx7)
NesPrgRom:345ec-345f3::dy2  dx0
NesPrgRom:345f4-345fb::dy3  dx1
NesPrgRom:345fc-34603::dy4  dx2
NesPrgRom:34604-3460b::dy5  dx3
NesPrgRom:3460c-34613::dy6  dx4
NesPrgRom:34614-3461b::dy7  dx5
NesPrgRom:3461c-34623::dx6 (dy0)
NesPrgRom:34624-3462b::dx7 (dy1)
NesPrgRom:3462c-34633:SpeedTable_04:dy0 (dx6)
NesPrgRom:34634-3463b::dy1 (dx7)
NesPrgRom:3463c-34643::dy2  dx0
NesPrgRom:34644-3464b::dy3  dx1
NesPrgRom:3464c-34653::dy4  dx2
NesPrgRom:34654-3465b::dy5  dx3
NesPrgRom:3465c-34663::dy6  dx4
NesPrgRom:34664-3466b::dy7  dx5
NesPrgRom:3466c-34673::dx6 (dy0)
NesPrgRom:34674-3467b::dx7 (dy1)
NesPrgRom:3467c-34683:SpeedTable_05:dy0 (dx6)
NesPrgRom:34684-3468b::dy1 (dx7)
NesPrgRom:3468c-34693::dy2  dx0
NesPrgRom:34694-3469b::dy3  dx1
NesPrgRom:3469c-346a3::dy4  dx2
NesPrgRom:346a4-346ab::dy5  dx3
NesPrgRom:346ac-346b3::dy6  dx4
NesPrgRom:346b4-346bb::dy7  dx5
NesPrgRom:346bc-346c3::dx6 (dy0)
NesPrgRom:346c4-346cb::dx7 (dy1)
NesPrgRom:346cc-346d3:SpeedTable_06:dy0 (dx6)
NesPrgRom:346d4-346db::dy1 (dx7)
NesPrgRom:346dc-346e3::dy2  dx0
NesPrgRom:346e4-346eb::dy3  dx1
NesPrgRom:346ec-346f3::dy4  dx2
NesPrgRom:346f4-346fb::dy5  dx3
NesPrgRom:346fc-34703::dy6  dx4
NesPrgRom:34704-3470b::dy7  dx5
NesPrgRom:3470c-34713::dx6 (dy0)
NesPrgRom:34714-3471b::dx7 (dy1)
NesPrgRom:3471c-34723:SpeedTable_07:dy0 (dx6)
NesPrgRom:34724-3472b::dy1 (dx7)
NesPrgRom:3472c-34733::dy2  dx0
NesPrgRom:34734-3473b::dy3  dx1
NesPrgRom:3473c-34743::dy4  dx2
NesPrgRom:34744-3474b::dy5  dx3
NesPrgRom:3474c-34753::dy6  dx4
NesPrgRom:34754-3475b::dy7  dx5
NesPrgRom:3475c-34763::dx6 (dy0)
NesPrgRom:34764-3476b::dx7 (dy1)
NesPrgRom:3476c-34773:SpeedTable_08:dy0 (dx6)
NesPrgRom:34774-3477b::dy1 (dx7)
NesPrgRom:3477c-34783::dy2  dx0
NesPrgRom:34784-3478b::dy3  dx1
NesPrgRom:3478c-34793::dy4  dx2
NesPrgRom:34794-3479b::dy5  dx3
NesPrgRom:3479c-347a3::dy6  dx4
NesPrgRom:347a4-347ab::dy7  dx5
NesPrgRom:347ac-347b3::dx6 (dy0)
NesPrgRom:347b4-347bb::dx7 (dy1)
NesPrgRom:347bc-347c3:SpeedTable_09:dy0 (dx6)
NesPrgRom:347c4-347cb::dy1 (dx7)
NesPrgRom:347cc-347d3::dy2  dx0
NesPrgRom:347d4-347db::dy3  dx1
NesPrgRom:347dc-347e3::dy4  dx2
NesPrgRom:347e4-347eb::dy5  dx3
NesPrgRom:347ec-347f3::dy6  dx4
NesPrgRom:347f4-347fb::dy7  dx5
NesPrgRom:347fc-34803::dx6 (dy0)
NesPrgRom:34804-3480b::dx7 (dy1)
NesPrgRom:3480c-34813:SpeedTable_0a:dy0 (dx6)
NesPrgRom:34814-3481b::dy1 (dx7)
NesPrgRom:3481c-34823::dy2  dx0
NesPrgRom:34824-3482b::dy3  dx1
NesPrgRom:3482c-34833::dy4  dx2
NesPrgRom:34834-3483b::dy5  dx3
NesPrgRom:3483c-34843::dy6  dx4
NesPrgRom:34844-3484b::dy7  dx5
NesPrgRom:3484c-34853::dx6 (dy0)
NesPrgRom:34854-3485b::dx7 (dy1)
NesPrgRom:3485c-34863:SpeedTable_0b:dy0 (dxC)
NesPrgRom:34864-3486b::dy1 (dxD)
NesPrgRom:3486c-34873::dy2 (dxE)
NesPrgRom:34874-3487b::dy3 (dxF)
NesPrgRom:3487c-34883::dy4  dx0
NesPrgRom:34884-3488b::dy5  dx1
NesPrgRom:3488c-34893::dy6  dx2
NesPrgRom:34894-3489b::dy7  dx3
NesPrgRom:3489c-348a3::dy8  dx4
NesPrgRom:348a4-348ab::dy9  dx5
NesPrgRom:348ac-348b3::dyA  dx6
NesPrgRom:348b4-348bb::dyB  dx7
NesPrgRom:348bc-348c3::dyC  dx8
NesPrgRom:348c4-348cb::dyD  dx9
NesPrgRom:348cc-348d3::dyE  dxA
NesPrgRom:348d4-348db::dyF  dxB
NesPrgRom:348dc-348e3::dxC (dy0)
NesPrgRom:348e4-348eb::dxD (dy1)
NesPrgRom:348ec-348f3::dxE (dy2)
NesPrgRom:348f4-348fb::dxF (dy3)
NesPrgRom:348fc-34903:SpeedTable_0c:dy0 (dxC)
NesPrgRom:34904-3490b::dy1 (dxD)
NesPrgRom:3490c-34913::dy2 (dxE)
NesPrgRom:34914-3491b::dy3 (dxF)
NesPrgRom:3491c-34923::dy4  dx0
NesPrgRom:34924-3492b::dy5  dx1
NesPrgRom:3492c-34933::dy6  dx2
NesPrgRom:34934-3493b::dy7  dx3
NesPrgRom:3493c-34943::dy8  dx4
NesPrgRom:34944-3494b::dy9  dx5
NesPrgRom:3494c-34953::dyA  dx6
NesPrgRom:34954-3495b::dyB  dx7
NesPrgRom:3495c-34963::dyC  dx8
NesPrgRom:34964-3496b::dyD  dx9
NesPrgRom:3496c-34973::dyE  dxA
NesPrgRom:34974-3497b::dyF  dxB
NesPrgRom:3497c-34983::dxC (dy0)
NesPrgRom:34984-3498b::dxD (dy1)
NesPrgRom:3498c-34993::dxE (dy2)
NesPrgRom:34994-3499b::dxF (dy3)
NesPrgRom:3499c-349a3:SpeedTable_0d:dy0 (dxC)
NesPrgRom:349a4-349ab::dy1 (dxD)
NesPrgRom:349ac-349b3::dy2 (dxE)
NesPrgRom:349b4-349bb::dy3 (dxF)
NesPrgRom:349bc-349c3::dy4  dx0
NesPrgRom:349c4-349cb::dy5  dx1
NesPrgRom:349cc-349d3::dy6  dx2
NesPrgRom:349d4-349db::dy7  dx3
NesPrgRom:349dc-349e3::dy8  dx4
NesPrgRom:349e4-349eb::dy9  dx5
NesPrgRom:349ec-349f3::dyA  dx6
NesPrgRom:349f4-349fb::dyB  dx7
NesPrgRom:349fc-34a03::dyC  dx8
NesPrgRom:34a04-34a0b::dyD  dx9
NesPrgRom:34a0c-34a13::dyE  dxA
NesPrgRom:34a14-34a1b::dyF  dxB
NesPrgRom:34a1c-34a23::dxC (dy0)
NesPrgRom:34a24-34a2b::dxD (dy1)
NesPrgRom:34a2c-34a33::dxE (dy2)
NesPrgRom:34a34-34a3b::dxF (dy3)
NesPrgRom:34a3c-34a43:SpeedTable_0e:dy0 (dxC)
NesPrgRom:34a44-34a4b::dy1 (dxD)
NesPrgRom:34a4c-34a53::dy2 (dxE)
NesPrgRom:34a54-34a5b::dy3 (dxF)
NesPrgRom:34a5c-34a63::dy4  dx0
NesPrgRom:34a64-34a6b::dy5  dx1
NesPrgRom:34a6c-34a73::dy6  dx2
NesPrgRom:34a74-34a7b::dy7  dx3
NesPrgRom:34a7c-34a83::dy8  dx4
NesPrgRom:34a84-34a8b::dy9  dx5
NesPrgRom:34a8c-34a93::dyA  dx6
NesPrgRom:34a94-34a9b::dyB  dx7
NesPrgRom:34a9c-34aa3::dyC  dx8
NesPrgRom:34aa4-34aab::dyD  dx9
NesPrgRom:34aac-34ab3::dyE  dxA
NesPrgRom:34ab4-34abb::dyF  dxB
NesPrgRom:34abc-34ac3::dxC (dy0)
NesPrgRom:34ac4-34acb::dxD (dy1)
NesPrgRom:34acc-34ad3::dxE (dy2)
NesPrgRom:34ad4-34adb::dxF (dy3)
NesPrgRom:34adc-34ae3:SpeedTable_0f:dy0 (dxC)
NesPrgRom:34ae4-34aeb::dy1 (dxD)
NesPrgRom:34aec-34af3::dy2 (dxE)
NesPrgRom:34af4-34afb::dy3 (dxF)
NesPrgRom:34afc-34b03::dy4  dx0
NesPrgRom:34b04-34b0b::dy5  dx1
NesPrgRom:34b0c-34b13::dy6  dx2
NesPrgRom:34b14-34b1b::dy7  dx3
NesPrgRom:34b1c-34b23::dy8  dx4
NesPrgRom:34b24-34b2b::dy9  dx5
NesPrgRom:34b2c-34b33::dyA  dx6
NesPrgRom:34b34-34b3b::dyB  dx7
NesPrgRom:34b3c-34b43::dyC  dx8
NesPrgRom:34b44-34b4b::dyD  dx9
NesPrgRom:34b4c-34b53::dyE  dxA
NesPrgRom:34b54-34b5b::dyF  dxB
NesPrgRom:34b5c-34b63::dxC (dy0)
NesPrgRom:34b64-34b6b::dxD (dy1)
NesPrgRom:34b6c-34b73::dxE (dy2)
NesPrgRom:34b74-34b7b::dxF (dy3)
NesPrgRom:34b7c-34b7e::;; --------------------------------\\nnever used?
NesPrgRom:34b7f-34b8e:MaxHPByLevel:
NesPrgRom:34b8f-34b9e:MaxMPByLevel:
NesPrgRom:34b9f:NextLevelExpByLevel:
NesPrgRom:34bc0-34bc8:ArmorDefense:
NesPrgRom:34bc9-34bd1:ShieldDefense:
NesPrgRom:34bd2-34bd7:SwordStabDamage:
NesPrgRom:34bd8-34bdd:SwordMagicCost:
NesPrgRom:34bde-34bdf:CoinAmounts:0 0
NesPrgRom:34be0-34be1::1 1
NesPrgRom:34be2-34be3::2 2
NesPrgRom:34be4-34be5::3 4
NesPrgRom:34be6-34be7::4 8
NesPrgRom:34be8-34be9::5 16
NesPrgRom:34bea-34beb::6 30
NesPrgRom:34bec-34bed::7 50
NesPrgRom:34bee-34bef::8 100
NesPrgRom:34bf0-34bf1::9 200
NesPrgRom:34bf2-34bf3::a 400
NesPrgRom:34bf4-34bf5::b 50
NesPrgRom:34bf6-34bf7::c 100
NesPrgRom:34bf8-34bf9::d 200
NesPrgRom:34bfa-34bfb::e 400
NesPrgRom:34bfc-34bfd::f 500
NesPrgRom:34bfe-34c0d:CoinMetasprites:; The first 11 are a8, then the reset back to 50 is a9, then mimic at 500.
NesPrgRom:34c0e:LoadPalettesForLocation:; Prepares a write of palettes indexed by $7e0..$7e7.
NesPrgRom:34c12:LoadPalettesForCustomLocation:; When changing screens, some will set $11 before jmping straight to this location
NesPrgRom:34c1a::"dimmer" ?
NesPrgRom:34c2a::$34c1e
NesPrgRom:34c32:_34c32:
NesPrgRom:34c3a::$34c36
NesPrgRom:34c3d:_34c3d:
NesPrgRom:34c47::$34c53
NesPrgRom:34c49:_34c49:
NesPrgRom:34c69::$34c57
NesPrgRom:34c6e:PreparePaletteData:
NesPrgRom:34c70::$34c75
NesPrgRom:34c73::Sprite palettes are +$b0
NesPrgRom:34c7d::$1a <- %1111 gh00
NesPrgRom:34c7f::;  - $1b <- ($1c & 7c) >> 2 | $a0\\n;    This is %.abcde..  =>  %101abcde\\n;    The a, (b?). and c bits may have been jiggered by the -$50.
NesPrgRom:34c87::$1b <- %101b cdef, i.e. Axxx or Bxxx
NesPrgRom:34c8d::a <- %a0000000
NesPrgRom:34c8f::$34c92
NesPrgRom:34c98::push $11; we may temporarily zero it.
NesPrgRom:34c9b::$34ca1
NesPrgRom:34ca7::$34cac
NesPrgRom:34caf::$34cb3
NesPrgRom:34cba::$34ca3
NesPrgRom:34cc0:UpdateHPDisplayInternal:; Seems to initialize everything for the PPU interaction
NesPrgRom:34cc7::; start by clearing out all of the tiles where the bar will be drawn
NesPrgRom:34cc9::#$20 is the blue menu background tile
NesPrgRom:34ccf::$34ccb
NesPrgRom:34cd1::; Load the player's max HP
NesPrgRom:34cd7::$34cdb
NesPrgRom:34cd9::; ? if they have negative max HP set it to zero?
NesPrgRom:34cdf::; maxHP / 16 is used as the number of tiles to the right that we need\\n; to go in order to draw end of the current HP.
NesPrgRom:34ce0::#$8d is the terminator tile for the hp bar
NesPrgRom:34ce2::; the address is offset by one here to account for the terminator tile
NesPrgRom:34ce5::; fill the space from the terminating tile to the start of the bar\\n; with the empty bar tile\\n@$8c is the empty hp bar tile
NesPrgRom:34ceb::$34ce7
NesPrgRom:34ced::; now start drawing the current hp bar (complete filled in tiles)
NesPrgRom:34cf3::$34cf7
NesPrgRom:34cfb::; This time we keep copies of the (currentHP / 16) in both x and y\\n; x will get decremented here, but we'll use y again later
NesPrgRom:34cfd::; if we have "no health" (ie our health is too low to display full tiles)\\n; then skip drawing any of the full bars\\n$34d07
NesPrgRom:34cff::#$88 is the full hp bar tile
NesPrgRom:34d05::$34d01
NesPrgRom:34d0d::$34d11
NesPrgRom:34d14::; use a precomputed lookup table to find which of the tiles should\\n; be used for the leftover hp (ie currentHp % 16)
NesPrgRom:34d17::; and store it at the spot we calculated earlier (currentHp / 16)
NesPrgRom:34d1d::; write the update header information to the nametable buffer\\n; see the comments in WriteNametableDataToPpu for more information
NesPrgRom:34d33::; bump the nametable buffer write head
NesPrgRom:34d3d::If rendering is off, do immediate write
NesPrgRom:34d3f::$34d44
NesPrgRom:34d49-34d58:HPDisplayTileLookup:; Each tile represents 16 HP, this is the mapping for currentHp % 16\\n; to the corresponding amount of "hp" is shown\\n; $8c - empty\\n; $8b - 1 bar\\n; $8a - 2 bars\\n; $89 - 3 bars\\n; $88 - 4 bars (full)
NesPrgRom:34d59:ChargeIndicatorDisplay:
NesPrgRom:34d68::$34d64
NesPrgRom:34d70::$34d7a
NesPrgRom:34d78::$34d74
NesPrgRom:34d85::$34d91
NesPrgRom:34dab::$34da1
NesPrgRom:34dd2::$34dd7
NesPrgRom:34ddd-34ddf:DataTable_34ddd:
NesPrgRom:34df5-34dfd:DataTable_34df5:
NesPrgRom:34e46:DisplayNumberInternal:stash until exit
NesPrgRom:34e71::$34e77
NesPrgRom:34e73::; zero in last column indicates 8-bit value, so zero MSB
NesPrgRom:34e7c::digits to skip ???
NesPrgRom:34e8c::$34e85
NesPrgRom:34eb9::if rendering is disabled, write immediate
NesPrgRom:34ebb::$34ec0
NesPrgRom:34ec5-34eca:NumericDisplays:0 Level    -> nt2r25c25
NesPrgRom:34ecb-34ed0::1 Money    -> nt2r26c25
NesPrgRom:34ed1-34ed6::2 Exp      -> nt2r27c08
NesPrgRom:34ed7-34edc::3 Exp left -> nt2r27c14
NesPrgRom:34edd-34ee2::4 MP       -> nt2r27c23
NesPrgRom:34ee3-34ee8::5 Max MP   -> nt2r27c27
NesPrgRom:34ee9-34eee::6 Level    -> nt2r09c09
NesPrgRom:34eef-34ef4::7 HP       -> nt2r11c09
NesPrgRom:34ef5-34efa::8 Max HP   -> nt2r11c13
NesPrgRom:34efb-34f00::9 Attack   -> nt2r09c25
NesPrgRom:34f01-34f06::A Def1 (A) -> nt2r11c25
NesPrgRom:34f07-34f0c::; The next three are all the same value, but with different width and position\\nB Buy cost -> nt2r07c25
NesPrgRom:34f0d-34f12::C Inn cost -> nt2r07c23
NesPrgRom:34f13-34f18::D Pawn $$  -> nt2r20c25
NesPrgRom:34f19-34f1e::; These two are odd - $7d[ef] seems to change based on who was last spoken to\\n; Moreover, it was not covered in full2.mov!  I assume these are for debugging\\nE ??       -> nt2r08c03
NesPrgRom:34f1f-34f24::F ??       -> nt2r06c25
NesPrgRom:34f25-34f2a::10 Def2(S) -> nt2r11c29
NesPrgRom:34f2b:ConvertToDecimal:
NesPrgRom:34f2d::ten-thousands digit
NesPrgRom:34f2f::thousands digit
NesPrgRom:34f31::hundreds digit
NesPrgRom:34f33::tens digit
NesPrgRom:34f35::ones digit
NesPrgRom:34f3d::the 16-bit number
NesPrgRom:34f49::$34f5d
NesPrgRom:34f5a::$34f3b
NesPrgRom:34f61::$34f3b
NesPrgRom:34f64-34f65:PowersOfTen:1
NesPrgRom:34f66-34f67::10
NesPrgRom:34f68-34f69::100
NesPrgRom:34f6a-34f6b::1000
NesPrgRom:34f6c-34f6d::10000
NesPrgRom:34f6e:CheckAllObjectCollisions:
NesPrgRom:34f76::; Even frames $2f = 7, $2e = 8
NesPrgRom:34f7d::$34f83
NesPrgRom:34f7f::; Odd frames $2f = #$e, $2e = 7
NesPrgRom:34fac::set carry if hit
NesPrgRom:34fb8::$34f87
NesPrgRom:34fbb-34fbc:CollisionJump:
NesPrgRom:34fc3::;; --------------------------------
NesPrgRom:34fc4:CollisionJump_03_ParalysisBeam:
NesPrgRom:34fc9::$34fce
NesPrgRom:34fd1::$34fc3
NesPrgRom:34fd8::$34fc3
NesPrgRom:34fe4::$34fc3
NesPrgRom:34fe9::NPC ID
NesPrgRom:34fed::set paralysis flag
NesPrgRom:34ffb::$35044
NesPrgRom:34ffd::; Check immunity to paralysis
NesPrgRom:35004::$3500e
NesPrgRom:3500f::$34fff
NesPrgRom:35011:SetOrClearParalysisFlag:; Input $12 = FF to set, 00 to clear\\n;        $13 = NPC ID to handle
NesPrgRom:35016::$35044
NesPrgRom:3501a::$35020
NesPrgRom:3501d::$35013
NesPrgRom:35045-3504e:DataTable_35045:; 10 bytes (terminated by 00)\\n; This is the key to a map => person ID of paralysis target
NesPrgRom:3504f-35057:DataTable_3504f:; This next line (9 bytes) appears to reference flags?
NesPrgRom:35058-35059:ParalysisImmuneNpcList:; 20 NPC IDs that are immune to paralysis\\nkensu
NesPrgRom:3505a-3505b::asina in various forms
NesPrgRom:3505c::unused
NesPrgRom:3505d-3505e::azteca
NesPrgRom:3505f-35060::shyron guards
NesPrgRom:35061-35062::dolphin
NesPrgRom:35063-35065::dead shyron people
NesPrgRom:35066-35068::kensu in various places
NesPrgRom:35069::mesia
NesPrgRom:3506a-3506b::aryllis attendants
NesPrgRom:3506c:_3506c:
NesPrgRom:3506f::$3507b
NesPrgRom:3507c:_3507c:
NesPrgRom:35082:PlayerHitInvisibleShadow:
NesPrgRom:35089::; Object was hit with a level 3 shot.
NesPrgRom:35093::;; --------------------------------
NesPrgRom:35094:PlayerHitFlagWallOrChannel:; If elements don't match, do nothing.
NesPrgRom:3509e::; If level is 1 (bare sword or lvl1 shot), do nothing.
NesPrgRom:350a5::never taken
NesPrgRom:350aa:CollisionJump_00_SwordHitsEnemy:; Entry point??? - $34fb1
NesPrgRom:350ae::$350bb
NesPrgRom:350b0::; Dyna-only handling
NesPrgRom:350c3::$350e4
NesPrgRom:350c5::; This happens for the Stom fight $4a0,x == #$52\\n; Note persons' 4a0 and 6e0 both come from PersonData[id][2]7f,\\n; provided that [2] is negative; if it's negative then it's stored\\n; in $6e0 but not $4a0.  Given that this looks like it's shifting\\n; two objects' up one tile, that's consistent with this actually\\n; being the code for hitting Stom.
NesPrgRom:350cd::$350df
NesPrgRom:350e9::$350ec
NesPrgRom:350eb::; Don't do anything for hitting an object with action #$10.\\n; This seems to mainly include enemies' swords and projectiles.
NesPrgRom:350fa::; Done with special cases - now compute damage
NesPrgRom:350fd::Required level to inflict damage
NesPrgRom:35108::; $421 >= $420,y so level is high enough to damage.\\n; Now figure out the attack vs defense.  Add the player's attack with\\n; the actual shot's attack.  This player's attack already takes into\\n; account the sword, as does the object attack.
NesPrgRom:35111::; Check elemental defenses - 500,x is a single bit, 500,y bits are set\\n; if the enemy is immune to that element.
NesPrgRom:35125:AttackEnemy_Immune:; Remove the attacking object
NesPrgRom:35131::$35136
NesPrgRom:3513b:AttackEnemy_DealDamage:; ----\\n; Deal damage to an enemy
NesPrgRom:35152:KillObject:; ----\\n; Kills object Y, awarding experience and/or performing any death actions.
NesPrgRom:35158::$35160
NesPrgRom:3515a::; If no replacement then do standard monster death animation
NesPrgRom:35177::$351ef
NesPrgRom:35186::$351ef
NesPrgRom:3519a::; Add the delta of the max HP/MP to the current
NesPrgRom:351b6::; Load the exp to next level
NesPrgRom:351c7::; Update the display
NesPrgRom:351ca::LV (status bar)
NesPrgRom:351cf::EXP left
NesPrgRom:351d4::MP
NesPrgRom:351d9::Max MP
NesPrgRom:351fa:StartMonsterDeathAnimation:
NesPrgRom:35229:CheckThunderSwordReaction:
NesPrgRom:35238::pointless? shouldn't the bne cover this?
NesPrgRom:35248::; Double-return
NesPrgRom:3524b:AwardExperiencePoints:
NesPrgRom:3524e::$3525d
NesPrgRom:35250::; exp < $80 are as-is.
NesPrgRom:35257::$3525c
NesPrgRom:3527e:PlayerHit_ApplyStatus:
NesPrgRom:3528c::poison stored in sign bit of lvl
NesPrgRom:3529a::50% chance of doing nothing
NesPrgRom:3529c::; add poison status
NesPrgRom:352bf:PlayerHit_ApplyProjectileStatus:
NesPrgRom:352c7:PlayerHit_CheckParalysis:; ----
NesPrgRom:352cb::; Projectile causes paralysis (prevented by certain shields),\\n; but no damage, so don't return back to damage calculation.
NesPrgRom:352d0::and return
NesPrgRom:352d4::and return
NesPrgRom:352f3::uncond, but irrelevant
NesPrgRom:352f5:RemoveObjectY:; ----
NesPrgRom:352fb:PlayerHit_CheckStone:; ----
NesPrgRom:352ff::; Projectile causes stone (prevented by certain shields),\\n; but no damage, so don't return back to damage calculation.
NesPrgRom:35306::already stone
NesPrgRom:3533d::unconditional
NesPrgRom:3533f:PlayerHit_CheckMPDrain:; ----\\nfor a projectile, indicates MP drain.
NesPrgRom:35345::MP drain web
NesPrgRom:35349::; Replace the projectile with the MP drain web, keeping same position.
NesPrgRom:3534c:PlayerHit_Curse:; ----\\n; If it wasn't one of the above, then it's a curse beam.
NesPrgRom:35357:CollisionJump_01_EnemyHitsPlayer:
NesPrgRom:3535e::; 540,y == $ff -> do something else
NesPrgRom:35361:PlayerHit_CalculateDamage:; ----
NesPrgRom:35367::Stom
NesPrgRom:35369::$35388
NesPrgRom:3536b::; This is the Stom fight.  $661 tracks how many times the player's been hit.\\n; Presumably once it gets really low, Stom basically just stops attacking,\\n; but I can't find where this happens.
NesPrgRom:35373::$35383
NesPrgRom:3538f::$353fd
NesPrgRom:35393::$353fd
NesPrgRom:35397::$3539c
NesPrgRom:353a4::; Done with special cases?
NesPrgRom:353a9::$353ac
NesPrgRom:353b7::$353c6
NesPrgRom:353bc::$353c6
NesPrgRom:353be::note X=1
NesPrgRom:353d7::$401 is armor def
NesPrgRom:353df::projectile -> shield
NesPrgRom:353e1::$353e8
NesPrgRom:353e3::$400 is shield def
NesPrgRom:353ea::twos complement
NesPrgRom:353fa::$35422
NesPrgRom:353fd::; ----
NesPrgRom:353fe:PlayerHit_ApplyKnockback_Relay:; ----
NesPrgRom:35401:PlayerHit_SubtractDamage:; ----\\n; Input\\n;   A = damage to subtract\\n;   X = 1 (player HP)\\n; Note this checks the player's level against 17. It's not\\n; clear when this should ever happen, except as some sort of\\n; cheat mode where damage is not dealt.
NesPrgRom:35408::$35422
NesPrgRom:35413::$3541a
NesPrgRom:35415::; Subtraction crossed zero - player is dead
NesPrgRom:35427::$3542e
NesPrgRom:35429::; projectiles despawn after dealing damage.
NesPrgRom:35431:SetTemporaryInvincibility:
NesPrgRom:3543f:PlayerHit_ApplyKnockback:; Knock object x back at speed 2 (.75/step?) in y's direction
NesPrgRom:35442::$3546c
NesPrgRom:3544a::$3546c
NesPrgRom:3546d:PlayerHitCoin_GetMoney:
NesPrgRom:3549d::Money
NesPrgRom:354a2:PlayerHitTrigger_SetGameMode:
NesPrgRom:354b0:CollisionJump_02_PlayerInFrontOfNpcOrTrigger:
NesPrgRom:354ba::$354cb
NesPrgRom:354be::$354cb
NesPrgRom:354c8::$354ce
NesPrgRom:354d0::$35534
NesPrgRom:354d7::$354df
NesPrgRom:354d9::; Statue
NesPrgRom:354dc::$35508
NesPrgRom:354e2::$35534
NesPrgRom:354e7::$354ee
NesPrgRom:354ec::$35534
NesPrgRom:35506::$35534
NesPrgRom:35517::$35534
NesPrgRom:3551e::$35534
NesPrgRom:35535:_35535:
NesPrgRom:35556::$35568
NesPrgRom:35560::$355b6
NesPrgRom:3556d::$35585
NesPrgRom:35574::$35585
NesPrgRom:3557b::$35585
NesPrgRom:355ab::$35589
NesPrgRom:355b4::$35539
NesPrgRom:355b7-355bf::;; --------------------------------
NesPrgRom:355c0:KnockbackObject:
NesPrgRom:355cb::$355d4
NesPrgRom:355dc::$355df
NesPrgRom:355f4:DoneCheckHitbox:
NesPrgRom:355f8:CheckHitbox:
NesPrgRom:355fd::off screen => no hit
NesPrgRom:35602::being knocked back => no hit
NesPrgRom:35609::no hit (not spawned? exploding walls have zero)
NesPrgRom:3560b::collision plane
NesPrgRom:3561e::sprite x-coordinate on screen
NesPrgRom:3562d::sprite y-coordinate on screen
NesPrgRom:3563c::; For each object, check same conditions\\nlower bound of range to check
NesPrgRom:3563f::upper bound of range
NesPrgRom:35646::$3563e
NesPrgRom:3564b::same collision plane?
NesPrgRom:3564d::$3563e
NesPrgRom:35652::$3563e
NesPrgRom:35654::don't check the object against itself
NesPrgRom:35656::$3563e
NesPrgRom:35658::; Both objs are eligible for collisions
NesPrgRom:3568d::; fall through out of loop
NesPrgRom:35691-35694:Hitboxes:00 player
NesPrgRom:35695-35698::01
NesPrgRom:35699-3569c::02
NesPrgRom:3569d-356a0::03
NesPrgRom:356a1-356a4::04
NesPrgRom:356a5-356a8::05
NesPrgRom:356a9-356ac::06 UNUSED
NesPrgRom:356ad-356b0::07 UNUSED
NesPrgRom:356b1-356b4::08
NesPrgRom:356b5-356b8::09
NesPrgRom:356b9-356bc::0a trigger
NesPrgRom:356bd-356c0::0b
NesPrgRom:356c1-356c4::0c sword
NesPrgRom:356c5-356c8::0d
NesPrgRom:356c9-356cc::0e
NesPrgRom:356cd-356d0::0f
NesPrgRom:356d1-356d4::10
NesPrgRom:356d5-356d8::11
NesPrgRom:356d9-356dc::12
NesPrgRom:356dd-356e0::13
NesPrgRom:356e1-356e4::14
NesPrgRom:356e5-356e8::15 UNUSED?
NesPrgRom:356e9-356ec::16
NesPrgRom:356ed-356f0::17
NesPrgRom:356f1-356f4:CollisionTable:00 sword blast hits enemy
NesPrgRom:356f5-356f8::01 " "
NesPrgRom:356f9-356fc::02 " "
NesPrgRom:356fd-35700::03 " "
NesPrgRom:35701-35704::04 " "
NesPrgRom:35705-35708::05 paralysis beam hits npc/enemy
NesPrgRom:35709-3570c::06 enemy hits player
NesPrgRom:3570d-35710::07 front of player hits npc/trigger
NesPrgRom:35711-35714::08 sword blast hits enemy
NesPrgRom:35715-35718::09 " "
NesPrgRom:35719-3571c::0a " "
NesPrgRom:3571d-35720::0b paralysis beam hits npc/enemy
NesPrgRom:35721-35724::0c sword hits enemy
NesPrgRom:35725-35728::0d enemy hits player
NesPrgRom:35729-3572c::0e front of player hits npc/trigger
NesPrgRom:3572d:AdHocSpawnObject:; Spawn a projectile or some sort?
NesPrgRom:35735::A000 -> 28000
NesPrgRom:35752::$35768
NesPrgRom:3576b::; a few entries in 29c00 have #$ff for $21 -> return right away
NesPrgRom:3577c::restore bank, return
NesPrgRom:3577e::load into the empty slot
NesPrgRom:35783::; Save X on stack - will soon point to new object
NesPrgRom:3578b::$12 <- parent's terrain
NesPrgRom:35791::; Now X points to the new object, rather than the old one.
NesPrgRom:357a1::direction
NesPrgRom:357b5::; Y looks like %aaaa_ddd0 where aaaa is the low nibble of\\n; the spawned object's $6e0, and xddd is the direction (ignoring\\n; any upper bit)
NesPrgRom:357c8::$23 will have sign bit -> asl sets carry
NesPrgRom:357d7:GenerateRandomNumber:
NesPrgRom:357e4-357f3:RandomNumbers:
NesPrgRom:35824:AddDisplacementVectorLong:
NesPrgRom:35826::$35833
NesPrgRom:3582d::$3583c
NesPrgRom:35831::$3583c
NesPrgRom:35838::$3583c
NesPrgRom:3583e::$35850
NesPrgRom:35840::; dy >= 0
NesPrgRom:35843::$35849
NesPrgRom:35845::; Carry not set, so check if we're in the exclusion zone
NesPrgRom:35847::$3584d
NesPrgRom:35853::$3585a
NesPrgRom:35855::; Carry clear, check
NesPrgRom:35857::$3585e
NesPrgRom:35861:AddDisplacementVectorShort:
NesPrgRom:35863::$35870
NesPrgRom:3586a::$35879
NesPrgRom:3586e::$35879 - uncond
NesPrgRom:35875::$35879
NesPrgRom:3587e::Note special handling for 240px.
NesPrgRom:35880::$35885
NesPrgRom:35887::$35890
NesPrgRom:35897:WriteObjectCoordinatesFrom_34_37:
NesPrgRom:358a8:ReadObjectCoordinatesInto_34_37:
NesPrgRom:358bc::> sec, then rts
NesPrgRom:358c1::$358b9
NesPrgRom:358c7:ClearSpawnSlot:
NesPrgRom:358cd:_358cd:
NesPrgRom:358d4::... and restore banks afterward
NesPrgRom:358d7:MoveObjectWithSpeedAndDirection:
NesPrgRom:358e7::$35900
NesPrgRom:358e9::; diagonal direction check either adjacent cardinal dir, too
NesPrgRom:35907-3590e:DataTable_35907:; U-L     U-R\\nup
NesPrgRom:3590f-35916::; U-L     U-R     D-R\\nup-right
NesPrgRom:35917-3591e::; U-R     D-R\\nright
NesPrgRom:3591f-35926::; U-R     D-R     D-L\\ndown-right
NesPrgRom:35927-3592e::; D-L     D-R\\ndown
NesPrgRom:3592f-35936::; D-R     D-L     U-L\\ndown-left
NesPrgRom:35937-3593e::; U-L     D-L\\nleft
NesPrgRom:3593f-35946::; U-R     U-L     D-L\\nup-left
NesPrgRom:35947:CheckDirectionAgainstTerrain:why is this not just jsr $358a8 ???
NesPrgRom:35962::temp, loaded back into y
NesPrgRom:35967::initialize $30,$31 from SPD,DIR,48x
NesPrgRom:3596a::presumably uses $30,$31???
NesPrgRom:3596d::; move new displaced position into $1c..$1f.
NesPrgRom:3598b::; Stop looking and double-return if we get to a (0,0) pair in the row.\\n; At this point we're going with whatever was stored in $1c..$1f.\\n$359d4
NesPrgRom:35996::$359bf
NesPrgRom:35998::; special handling for player only here (x=0)
NesPrgRom:3599b::$359be -> rts
NesPrgRom:3599d::; screen position okay, check terrain\\nforce terrain lookup, no update $380,x
NesPrgRom:359a4::$25 always starts zero
NesPrgRom:359a8::; Only proceed straight if $340,x == #$8 exactly (what does this mean?)\\n;   - not being knocked back, certain speed ??? why not just cmp?\\n; (potentially this is looking for dolphin speed? but why?)
NesPrgRom:359ad::$359c4
NesPrgRom:359af::; Check if we're riding on a dolphin - jump away if *not*
NesPrgRom:359b2::$359c4
NesPrgRom:359b4::; At this point we know we're on a dolphin - so water becomes passable.\\n$3597d
NesPrgRom:359b6::; Carry clear - if no terrain blockers, return directly.
NesPrgRom:359b8::$359be -> rts
NesPrgRom:359ba::; Carry was clear, but the terrain was non-zero.  If the terrain is a\\n; waterfall or a solid wall (impassible even flying) then loop back,\\n; otherwise return with clear carry.
NesPrgRom:359bc::$3597d
NesPrgRom:359c8::$359cc
NesPrgRom:359d1::; this AND means that either if the feature wasn't there or the object\\n; isn't susceptible to it, then we end up with zero, allowing another\\n; loop - this seems backwards.\\n$3597d
NesPrgRom:359d6::; Copy positions from $1c..$1f into the actual position *and* $34..$37
NesPrgRom:359ee::; ???\\ndo update $380,x
NesPrgRom:359f3::; Swap $360,x and $23 - why?
NesPrgRom:359fd::signal that we double-returned
NesPrgRom:359ff:ApplyInvisibleWallAtScreenEdge:
NesPrgRom:35a06::$35a25
NesPrgRom:35a0a::$35a25
NesPrgRom:35a11::$35a15
NesPrgRom:35a17::$35a25
NesPrgRom:35a1b::$35a25
NesPrgRom:35a30:CheckTerrainUnderObject:; Called by e.g. $35f06, $35947\\n; Input\\n;   A --> bitset\\n;           40 copy the 50 bits to $380,x (masked by $460,x)\\n;           80 force lookup (otherwise skipped if unchanged)\\n;   Object's true coordinates in $[79bd]0,x\\n;   Object's new coordinates new $34..$37 -> these are used for terrain\\n; Output\\n;   Carry bit set if not moved, cleared if moved\\n;   $20 gets $380,x50 (the slow and behind bits) or else the current terrain\\n;   $380.x updated as appropriate (masked by $460,x)\\n;\\n; Appears to be called for every (mobile?) object on the screen, regardless\\n; of whether it's actually moved or not.  Probably determines tile effects.
NesPrgRom:35a32::; Did the object move from last frame's 70,x by a full tile?\\n$35a4d
NesPrgRom:35a34::yl
NesPrgRom:35a3a::$35a4d
NesPrgRom:35a3c::xl
NesPrgRom:35a42::$35a4d
NesPrgRom:35a44::; Object is on the same tile as last time, copy $380,x50 to $20 and sec
NesPrgRom:35a52::xh
NesPrgRom:35a5c::$11 is offset within the page
NesPrgRom:35a65::A is PRG page to load
NesPrgRom:35a69::$a000 -> 0, 2, 4, 6, 8, a, c, or e
NesPrgRom:35a81::$10 = (y)(x) tile indexes in nibbles
NesPrgRom:35a85::load the metatile ID
NesPrgRom:35a89::$a000 -> $12000
NesPrgRom:35a99::; $68 = metatile ID, $69 = MapData[i].Graphics[4], page = $12000, y = 0
NesPrgRom:35a9d::; $20 <- tile effect of current tile
NesPrgRom:35a9f::$35ab9
NesPrgRom:35aa1::yh
NesPrgRom:35aa6::xh
NesPrgRom:35aab::$35ab9
NesPrgRom:35aad::; This map screen has a flag set.
NesPrgRom:35ac9::$35ade
NesPrgRom:35acb::; Copy some bits from ($68),y into $380,x conditional on $460,x
NesPrgRom:35ace::overwrite the 50 bits no matter what.
NesPrgRom:35ad4::Use 460,x as a mask for copying.
NesPrgRom:35ad7::only rewriting 50 (in front, slow)
NesPrgRom:35ae0-35ae7:PowersOfTwo_35ae0:
NesPrgRom:35ae8:SpendMPOrDoubleReturn:
NesPrgRom:35aed::$35af7
NesPrgRom:35af5::$35afe
NesPrgRom:35b01::MP
NesPrgRom:35b07:LoadBossPalettes:; Input A = #$c0 for most bosses, #$c7 for insect and draygon 2\\n;        X = index of boss object
NesPrgRom:35b0c::$35b11
NesPrgRom:35b14::$35b40
NesPrgRom:35b1b::$35b34
NesPrgRom:35b1f::$35b28
NesPrgRom:35b26::$35b2d
NesPrgRom:35b30::$35b18
NesPrgRom:35b32::$35b40
NesPrgRom:35b36::$35b1d
NesPrgRom:35b3e::$35b18
NesPrgRom:35b41-35b44:DataTable_35b41:
NesPrgRom:35b45:ObjectActionJump_01:
NesPrgRom:35b49::$35b5a
NesPrgRom:35b4b::; Just pressed B - check if there's a consumable item to use
NesPrgRom:35b4e::$35b5a
NesPrgRom:35b54::$35b5a
NesPrgRom:35b6f::$35b7d
NesPrgRom:35b71::; Mutated
NesPrgRom:35b76::metasprite for blue slime
NesPrgRom:35b7b::$35bd2 - unconditional
NesPrgRom:35b80::$35bd2
NesPrgRom:35b82::; Riding on dolphin
NesPrgRom:35b8f::$35b9c
NesPrgRom:35b91::; Remove the dolphin-riding bit (because we're on land now?)
NesPrgRom:35b99::$35bd2
NesPrgRom:35ba5::this should be shadow metasprite???
NesPrgRom:35bb6::$35bcc
NesPrgRom:35bbf::$35bd2
NesPrgRom:35bc3::$35bd2
NesPrgRom:35bca::$35bd2
NesPrgRom:35bd5::not changed
NesPrgRom:35bd7::; Player is changed
NesPrgRom:35bde::(y << 2) + $2c
NesPrgRom:35bf2-35bf5:DataTable_35bf2:
NesPrgRom:35bf6:SetPlayer340Lower:
NesPrgRom:35c03:_35c03:; Handle various player status effects (ailments, dolphin, change)
NesPrgRom:35c06::$35c1f
NesPrgRom:35c08::; If there is no shield, look at the current player sprite direction\\n; shifted to 8..b, unless it's already swinging the sword, in which\\n; case it;'s just 4c.  This is stored in 580 - I don't know what this\\n; does yet, it seems to be temporarily swapped into $300,x during\\n; sprite drawing if $380,x02 is set (cf _3822e).\\nX=1 -> player
NesPrgRom:35c1d::unconditional
NesPrgRom:35c30::Y = current direction
NesPrgRom:35c31::Countdown timer for sword swing
NesPrgRom:35c36::$35c6c
NesPrgRom:35c38::$35c65
NesPrgRom:35c3c::$35c65
NesPrgRom:35c43::$35c4c
NesPrgRom:35c4a::$35c65
NesPrgRom:35c51::sword stab
NesPrgRom:35c5c::Sword's Element
NesPrgRom:35c66-35c6b:DataTable_35c66:; ----\\n; Sword elements
NesPrgRom:35c6f::no sword equipped
NesPrgRom:35c7b::; $10 holds the level
NesPrgRom:35c7d::$35c91
NesPrgRom:35c7f::; If not charged AND not paralyzed AND wearing warrior ring => level 1
NesPrgRom:35c86::$35c91
NesPrgRom:35c8d:CheckWarriorRing:$35c91
NesPrgRom:35c95::$35ca7
NesPrgRom:35c97::; Firing a level 3 shot spend the MP or decrease the level
NesPrgRom:35ca0::$35ca7
NesPrgRom:35cb1::; A <- sword<<2 | level
NesPrgRom:35cb9::; Y <- direction << 1
NesPrgRom:35cba::; Spawn the sword charge
NesPrgRom:35cda:SwordSwingCrystalis:; ----
NesPrgRom:35cde::$35cd1
NesPrgRom:35cec::$35cd1
NesPrgRom:35cef:UpdatePlayerFalling:current jump/fall position
NesPrgRom:35cf7::$35d11
NesPrgRom:35cf9::; Fall is in progress (nonzero displacement).\\nfalling hitbox?
NesPrgRom:35d01::update $380,x
NesPrgRom:35d09::clear the "slow" bit.
NesPrgRom:35d0e::$35d27
NesPrgRom:35d2b::$35d3a
NesPrgRom:35d2d::falling sound?!?
NesPrgRom:35d4d-35d5c:FallDisplacements:
NesPrgRom:35d7e-35d80:DataTable_35d7e:
NesPrgRom:35d81:ObjectActionJump_02:
NesPrgRom:35d8f::$35d9a
NesPrgRom:35d9d::$35db7 - changed
NesPrgRom:35da3::$35db7
NesPrgRom:35db0::$35db9
NesPrgRom:35db5::$35db9
NesPrgRom:35dc0::$35de1
NesPrgRom:35dca::$35dd1
NesPrgRom:35dd6::$35de1
NesPrgRom:35dda::$35de1
NesPrgRom:35ddf::$35de1
NesPrgRom:35de7::$35e39
NesPrgRom:35ded::$35e39
NesPrgRom:35df3::$35e39
NesPrgRom:35df5::; holding down B
NesPrgRom:35dfa::$35e03
NesPrgRom:35dfe::$35e03
NesPrgRom:35e00::$35e39
NesPrgRom:35e06::$35e39
NesPrgRom:35e11::$35e39
NesPrgRom:35e1b::$35e22
NesPrgRom:35e24::$35e2b
NesPrgRom:35e34::$35e39
NesPrgRom:35e3c::$35e6f
NesPrgRom:35e40::$35e57
NesPrgRom:35e44::$35e57
NesPrgRom:35e48::$35e6f
NesPrgRom:35e4d::$35e57
NesPrgRom:35e54::$35e62
NesPrgRom:35e65::$35e85
NesPrgRom:35e6c::$35e85
NesPrgRom:35e77::$35e85
NesPrgRom:35e80::$35e85
NesPrgRom:35e88::$35e8f
NesPrgRom:35e92::$35e9e
NesPrgRom:35e9c::$35eef
NesPrgRom:35ea5::; If we're not moving, this is where we bail out\\n$35eef
NesPrgRom:35eaa::$35eba
NesPrgRom:35eb6::$35eef
NesPrgRom:35ec5::$35ed8
NesPrgRom:35ed6::$35eef - uncond
NesPrgRom:35edb::$35eef
NesPrgRom:35ee8::$35eef
NesPrgRom:35ef3::$35efa
NesPrgRom:35f02::$35f06
NesPrgRom:35f04::update $380,x only if $620,x is zero
NesPrgRom:35f0e::$35f37
NesPrgRom:35f17::$35f37
NesPrgRom:35f22::$35f37
NesPrgRom:35f2a::$35f37
NesPrgRom:35f30::$35f37
NesPrgRom:35f3a::$35f4c
NesPrgRom:35f5b::$35f95
NesPrgRom:35f62::$35f7b
NesPrgRom:35f69::$35f7b
NesPrgRom:35f83::$35f70
NesPrgRom:35f89::$35f8e
NesPrgRom:35fa2::$35fb4
NesPrgRom:35fa7::$35fd1
NesPrgRom:35fac::$35fc4
NesPrgRom:35fb2::$35fd1
NesPrgRom:35fb8::$35fc4
NesPrgRom:35fbf::$35fc4
NesPrgRom:35fcc::$35fd1
NesPrgRom:35fd2:_35fd2:
NesPrgRom:35ff4::$36002
NesPrgRom:3600f-36016:DataTable_3600f:
NesPrgRom:36017-3601e:DataTable_36017:;; Optional directions to maybe store in 360,x (if positive)
NesPrgRom:3601f:ErrorBuzzRelay:
NesPrgRom:36022:_36022:; This is about jumping
NesPrgRom:36025::$36030
NesPrgRom:3602c::$36030
NesPrgRom:3602e::rabbit boots "magic"
NesPrgRom:36032::0 or 8
NesPrgRom:36036::$43 or $4b
NesPrgRom:36039::$3603c
NesPrgRom:36049::$36054
NesPrgRom:3604d::$36054
NesPrgRom:36059::$3605e
NesPrgRom:3605b::currently changed
NesPrgRom:36071::;; --------------------------------\\nUNUSED
NesPrgRom:36072-36073:UseMagicJump:just rts
NesPrgRom:36084-36085::rabbit boots?
NesPrgRom:36092-3609f:DataTable_36092:
NesPrgRom:360a2:UseMagicJump_00_Nothing:
NesPrgRom:360a3:UseMagicJump_01_Refresh:
NesPrgRom:360ab::$360b0
NesPrgRom:360b3::; Run this twice (jsr then again normally, unless double-returned?)
NesPrgRom:360b6::x=0 always here? MaxHP
NesPrgRom:360be::+1 HP
NesPrgRom:360c4::$360ca
NesPrgRom:360c6::each bar is 4 HP
NesPrgRom:360d4::(unconditional)
NesPrgRom:360d6::; ----
NesPrgRom:360d7:UseMagicJump_02_Paralysis:
NesPrgRom:360e6:UseMagic_EndWithSpawn:; Spawns the adhoc spawn in A with direction from $301
NesPrgRom:360f4:UseMagicJump_06_Barrier:
NesPrgRom:360f7::$360fc
NesPrgRom:36103::spend 1MP every 8 frames (8/sec)
NesPrgRom:36105::$3610c
NesPrgRom:36110::unconditional
NesPrgRom:36112:UseMagicJump_08_Flight:
NesPrgRom:36115::if on dolphin
NesPrgRom:3611b::$36122
NesPrgRom:36125::$36133
NesPrgRom:36131::$3614d
NesPrgRom:36138::$3613d
NesPrgRom:36143:UseMagicJump_09:
NesPrgRom:36146::if on dolphin
NesPrgRom:3615c:UseMagic_InsufficientMP:
NesPrgRom:36161:UseMagicJump_07_Change:
NesPrgRom:36165::inside the tower
NesPrgRom:36167::-> error and return, no message
NesPrgRom:3616f::$36172
NesPrgRom:36175::20
NesPrgRom:3617b::unconditional
NesPrgRom:3617d:UseMagicJump_05_Recover:
NesPrgRom:36182::skip unless there's status to recover
NesPrgRom:36184::24
NesPrgRom:3618b::unconditional
NesPrgRom:3618d::;; --------------------------------
NesPrgRom:3618e:UseMagicJump_03_Telepathy:
NesPrgRom:3619f::unconditional
NesPrgRom:361a1:UseMagicJump_04_Teleport:
NesPrgRom:361a7::20 MP
NesPrgRom:361ad:UseMagic_SetGameMode:
NesPrgRom:361b0:UseMagic_CheckCurse:
NesPrgRom:361b7::$361c0
NesPrgRom:361bb:ErrorBuzz:
NesPrgRom:361c1::;; --------------------------------\\n;; UNUSED
NesPrgRom:361c9:_361c9:; NOTE x=1 always
NesPrgRom:361cd::$361dd
NesPrgRom:361d2::$361dd
NesPrgRom:361d4::; Dyna, with $600 nonzero (in practice, it's 1..$12)\\nwas 0 or 4 in full2.mov?
NesPrgRom:361e2::$361f9
NesPrgRom:361e4::; 6e0 is nonzero
NesPrgRom:361e9::twos complement ~x+1
NesPrgRom:361f3::A = 2*$301 - ($6e0 & $f)
NesPrgRom:361f5::; bail out for A&7 in {0, 1, 7}
NesPrgRom:36211-36218:DataTable_36211:
NesPrgRom:36219:ObjectActionJump_05:
NesPrgRom:3621c::$36221
NesPrgRom:36241::;; --------------------------------
NesPrgRom:36242-36249:DataTable_36242:
NesPrgRom:3624a:ObjectActionJump_0b:$362b4
NesPrgRom:36263::$36275
NesPrgRom:3626a::$36270
NesPrgRom:3626e::$36275
NesPrgRom:3627d::$3628b
NesPrgRom:3628d::$362ab
NesPrgRom:3629b::$3629f
NesPrgRom:362a1::$362a5
NesPrgRom:362ac-362b3:DataTable_362ac:
NesPrgRom:362b4:StomFight_CheckExitCondition:; Check the player's Y-coordinate within the screen
NesPrgRom:362b8::$362e8  - "below" (>=) $98 => player loses
NesPrgRom:362bc::$362bf  - "above" (<) $58 => player wins
NesPrgRom:362be::- else return
NesPrgRom:362cc::; This looks like it hard-codes a reference to 0301 which\\n; is the message for defeating stom and learning telepathy.
NesPrgRom:362e5::$362fc
NesPrgRom:362fc:StomFight_Exit:
NesPrgRom:36314-36315:ObjectActionJumpTable:
NesPrgRom:36316-36317::01
NesPrgRom:36318-36319::02
NesPrgRom:3631a-3631b::03
NesPrgRom:3631c-3631d::04
NesPrgRom:3631e-3631f::05
NesPrgRom:36320-36321::06
NesPrgRom:36322-36323::07
NesPrgRom:36324-36325::08
NesPrgRom:36328-36329::0a
NesPrgRom:3632a-3632b::0b
NesPrgRom:3632c-3632d::0c
NesPrgRom:3632e-3632f::0d
NesPrgRom:36330-36331::0e
NesPrgRom:36332-36333::0f
NesPrgRom:36334-36335::10
NesPrgRom:36336-36337::11 Wind 1/2, Water 1/2, Fire 1
NesPrgRom:36338-36339::12
NesPrgRom:3633a-3633b::13
NesPrgRom:3633c-3633d::14
NesPrgRom:3633e-3633f::15
NesPrgRom:36340-36341::16
NesPrgRom:36342-36343::17
NesPrgRom:36344-36345::18
NesPrgRom:36346-36347::19
NesPrgRom:36348-36349::1a
NesPrgRom:3634a-3634b::1b
NesPrgRom:3634c-3634d::1c
NesPrgRom:3634e-3634f::1d
NesPrgRom:36350-36351::1e
NesPrgRom:36352-36353::1f
NesPrgRom:36354-36355::20 monster
NesPrgRom:36356-36357::21 monster
NesPrgRom:36358-36359::22 monster
NesPrgRom:3635c-3635d::24 monster
NesPrgRom:3635e-3635f::25 monster
NesPrgRom:36360-36361::26 monster
NesPrgRom:36362-36363::27 monster
NesPrgRom:36364-36365::28 monster
NesPrgRom:36366-36367::29 monster
NesPrgRom:36368-36369::2a monster
NesPrgRom:3636a-3636b::2b mimic
NesPrgRom:3636c-3636d::2c
NesPrgRom:36370-36371::2e monster
NesPrgRom:36372-36373::2f
NesPrgRom:36374-36375::30
NesPrgRom:36376-36377::31
NesPrgRom:36378-36379::32
NesPrgRom:3637a-3637b::33
NesPrgRom:3637c-3637d::34 monster
NesPrgRom:36380-36381::36
NesPrgRom:36384-36385::38 monster
NesPrgRom:36386-36387::39
NesPrgRom:36388-36389::3a
NesPrgRom:3638c-3638d::3c monster
NesPrgRom:36392-36393::3f
NesPrgRom:36394-36395::40 monster
NesPrgRom:36396-36397::41 monster (c1)
NesPrgRom:3639c-3639d::44 monster
NesPrgRom:3639e-3639f::45 monster
NesPrgRom:363a4-363a5::48
NesPrgRom:363ac-363ad::4c monster (cc)
NesPrgRom:363ae-363af::4d monster (cd)
NesPrgRom:363b0-363b1::4e monster (ce)
NesPrgRom:363b4-363b5::50
NesPrgRom:363b6-363b7::51
NesPrgRom:363b8-363b9::52
NesPrgRom:363ba-363bb::53
NesPrgRom:363bc-363bd::54
NesPrgRom:363be-363bf::55
NesPrgRom:363c2-363c3::57
NesPrgRom:363c4-363c5::58
NesPrgRom:363cc-363cd::5c monster (dc)
NesPrgRom:363ce-363cf::5d monster
NesPrgRom:363d0-363d1::5e monster
NesPrgRom:363d2-363d3::5f
NesPrgRom:363d4-363d5::; These (60..6f) reference routines on a different page a000=>1e000.\\n; NOTE we can't really push the segment here because both this index\\n; table _and_ the actual code are loaded (at different times) into the\\n; same bank!\\n60 vammpire
NesPrgRom:363d6-363d7::61
NesPrgRom:363d8-363d9::62 giant insect
NesPrgRom:363da-363db::63 general kelbesque
NesPrgRom:363dc-363dd::64
NesPrgRom:363de-363df::65 lime tree guardian
NesPrgRom:363e0-363e1::66 sabera
NesPrgRom:363e2-363e3::67 mado
NesPrgRom:363e4-363e5::68 karmine
NesPrgRom:363e6-363e7::69 guardian statues
NesPrgRom:363e8-363e9::6a draygon
NesPrgRom:363ea-363eb::6b draygon 2
NesPrgRom:363ec-363ed::6c
NesPrgRom:363ee-363ef::6d
NesPrgRom:363f0-363f1::6e
NesPrgRom:363f2-363f3::6f
NesPrgRom:363f4-363f5::; Back to the same page from here out.\\n70
NesPrgRom:363fc-363fd::74
NesPrgRom:36400-36401::76
NesPrgRom:36402-36403::77
NesPrgRom:36404-36405::78
NesPrgRom:36406-36407::79
NesPrgRom:3640a-3640b::7b
NesPrgRom:3640c-3640d::7c
NesPrgRom:3640e-3640f::7d - shaking for 16 frames or so btw death and coin
NesPrgRom:36410-36411::7e --> custom insect waiting
NesPrgRom:36412-36413::7f
NesPrgRom:36414:ObjectActionJump_3f:
NesPrgRom:36419:ObjectActionJump_7f:
NesPrgRom:3641a:ObjectActionJump_5f:; Check if all the white robots are killed, and if so,\\n; unlock the escalator.  Loops over all spawn slots to\\n; check if all the following are true\\n;  1. on the same Y
NesPrgRom:3641d::$36422
NesPrgRom:36429::$3643b
NesPrgRom:3642e::$3643b
NesPrgRom:36435::$3648b
NesPrgRom:36439::$3648b
NesPrgRom:3643e::$36424
NesPrgRom:36459:SpawnTowerEscalator:
NesPrgRom:3648c:TowerEscalatorCheckInitialSetup:; Note this is called by actionscript 5f, which only exists\\n; on the main tower floors (59, 5a, 5b) and on the final floor\\n; outside Mesia's room (5c).  It runs whenever $600,x is zero,\\n; which apparently happens only once, right after initially\\n; populating the room.
NesPrgRom:36492::5c -> ff, ..., 59 -> fc
NesPrgRom:36494::5c -> 00, ..., 59 -> 03
NesPrgRom:36497::5c -> 01, ..., 59 -> 04
NesPrgRom:3649a::NOTE should have just cpy #$01
NesPrgRom:3649e::$364b2
NesPrgRom:364a0::; Special handling for 5c (outside mesia).  Check the inventory\\n; for Crystalis and if it's owned then spawn the escalator\\n; (skipping the audio cue).  Then self-destruct since there's no\\n; need to continue checking anymore.
NesPrgRom:364a5::$364aa
NesPrgRom:364af::; Double-return all the way out of the 5f action script.
NesPrgRom:364b6::$364b9
NesPrgRom:364bb::$364c5
NesPrgRom:364c6:ObjectActionJump_33:
NesPrgRom:364ce::$364db
NesPrgRom:364dc:ObjectActionJump_76:
NesPrgRom:364de::$364e2
NesPrgRom:364e0:ObjectActionJump_77:
NesPrgRom:364e9::$36502
NesPrgRom:364f8::$36502
NesPrgRom:364fd::MP
NesPrgRom:36506::$3650a
NesPrgRom:36511::$36518
NesPrgRom:36519:ObjectActionJump_39:; This appears in the hallway above zebu (and other wise men)\\n; in the fortress.\\n; It MUST spawn in the slot immediately following zebu\\n; (cf. $049f,x is actually $04a0,(x-1)) and locks the screen\\n; as long as zebu's slot is still occupied.  we should just\\n; delete this object.
NesPrgRom:3651c::$36525
NesPrgRom:36528::$3653f
NesPrgRom:3652d::$3653e
NesPrgRom:36534::$3653e
NesPrgRom:36542::$3654f
NesPrgRom:36555:ObjectActionJump_3a:; fake mesia?
NesPrgRom:36558::$3655e
NesPrgRom:36563::$36576
NesPrgRom:36565::; Actually spawn sabera.  Zero out the spawns before and after.\\n; The next time this action script runs, it would get zeroed too,\\n; except we replace ourselves with object $7d first.
NesPrgRom:36585::$3658b
NesPrgRom:3658e::$365bf
NesPrgRom:36594::$365bf
NesPrgRom:3659a::$365bf
NesPrgRom:3659e::$365bf
NesPrgRom:365a0::; fake mesia was hit progress the dialog
NesPrgRom:365c0:ObjectActionJump_0e:
NesPrgRom:365c5:ObjectActionJump_0f:values range from $20..$23 - shops
NesPrgRom:365cb:ObjectActionJump_0c:
NesPrgRom:365d1::$365d7
NesPrgRom:365ed:ObjectActionJump_0d:
NesPrgRom:365f5::$365fb
NesPrgRom:36606::$36609
NesPrgRom:36616:ObjectActionJump_55:; Check location and entrance - do nothing if mismatch.
NesPrgRom:3661a::$36624
NesPrgRom:3661e::$3665f
NesPrgRom:36622::$3665f
NesPrgRom:36626::$3662a
NesPrgRom:3662f::; Save X temporarily while we track 00/01 (player) along with object X.
NesPrgRom:3663f::; Zero out a few higher registers
NesPrgRom:3664a::; Stop at x=680
NesPrgRom:3664e::$3665f
NesPrgRom:36654::$3665f
NesPrgRom:36656::; Once we've stopped, kick the player out and reset action back to ff
NesPrgRom:36660:ObjectActionJump_50:
NesPrgRom:36663::$3667a
NesPrgRom:3666e::... and restore banks afterward
NesPrgRom:3667c::$3669e
NesPrgRom:36681::$36689
NesPrgRom:366a1::$366c4
NesPrgRom:366be::$366c4
NesPrgRom:366c5:ObjectActionJump_51:Double returns unless flag set
NesPrgRom:366c8::; Windmill is running at this point.  Cycle the animation (via Metasprite).
NesPrgRom:366cb::; Bail out of not on screen
NesPrgRom:366ce::$366fa
NesPrgRom:366d0::; Check if the flag was loaded on the map as being set.
NesPrgRom:366d3::$366ee
NesPrgRom:366d9::$366ee
NesPrgRom:366db::; We're in Valley of Wind and on screen - maybe spawn an explosion\\n; if we haven't spawned one yet already.  The explosion will figure out\\n; the relevant flag to set halfway through.
NesPrgRom:366e0::$366ee
NesPrgRom:366f3::$366fa
NesPrgRom:366fa::; ----
NesPrgRom:366fb:CheckStartedWindmill:; Literally just look for "started windmill" flag, since that's the only place\\n; this action is ever used.
NesPrgRom:366fe::note this is flag space
NesPrgRom:36709::$3670d
NesPrgRom:3670b::; Do a "double return"
NesPrgRom:3670e:ObjectActionJump_0a:
NesPrgRom:36711::$36725
NesPrgRom:36735::$36752
NesPrgRom:36753:ObjectActionJump_52:; Stom during fight
NesPrgRom:36756::$36774
NesPrgRom:3676b::$367cc
NesPrgRom:3677d::$36799
NesPrgRom:36781::$36785
NesPrgRom:3678c::$36790
NesPrgRom:36792::$36796
NesPrgRom:3679d::$367cc
NesPrgRom:367b5::$367cc
NesPrgRom:367bc::$367c3
NesPrgRom:367c5::$367cc
NesPrgRom:367cd:ObjectActionJump_53:
NesPrgRom:367d0::$367ea
NesPrgRom:367e2::$367e9
NesPrgRom:367ee::$367e9
NesPrgRom:36802:ObjectActionJump_54:
NesPrgRom:36805::$3680b
NesPrgRom:36809::$3685e
NesPrgRom:3680f::$36849
NesPrgRom:36829::$3682d
NesPrgRom:36830::$36834
NesPrgRom:3685e::; ----
NesPrgRom:3685f:ObjectActionJump_07:; breakable wall/bridgeable channel
NesPrgRom:36862::$368b0
NesPrgRom:36864::; Check for two hard-coded locations for spitting fire.
NesPrgRom:36868::$36875
NesPrgRom:3686c::$36875
NesPrgRom:36873::$368b0
NesPrgRom:36878::$368a6
NesPrgRom:36886::$368b0
NesPrgRom:36890::$368b0
NesPrgRom:368a0::$368b0 - unconditional?!?
NesPrgRom:368a2-368a5:DataTable_368a2:; ----
NesPrgRom:368a9::$368b0
NesPrgRom:368be::$368c5
NesPrgRom:368ce::$368fb
NesPrgRom:368d9::$368fb
NesPrgRom:368e1::$368fb
NesPrgRom:368e9::$368fb
NesPrgRom:368f1::$368fb
NesPrgRom:368fc-368ff:DataTable_368fc:
NesPrgRom:36900-36903:DataTable_36900:
NesPrgRom:36904-36907:DataTable_36904:
NesPrgRom:36908-3690b:DataTable_36908:
NesPrgRom:3690c:ObjectActionJump_79:
NesPrgRom:36914:ObjectActionJump_78_TriggerSquare:
NesPrgRom:36915:ObjectActionJump_20_RandomMovement:
NesPrgRom:36918::$36923
NesPrgRom:3691a::; $380,x80 is set (object is off screen) - only move every 4th frame,\\n; staggered by object index.
NesPrgRom:36920::$36923
NesPrgRom:36926::$36936
NesPrgRom:36930::$36935
NesPrgRom:36939::$3693e
NesPrgRom:3693b::; After we've taken the pre-determined number of steps, stop and turn.
NesPrgRom:36947::; If we just tried to move onto an impassible tile, then stop and turn.
NesPrgRom:3694a:ObjectAction_RandomMovement_PickNewDirection:
NesPrgRom:36969:ObjectActionJump_21_StoneGazer:
NesPrgRom:3696c::unused / redundant.
NesPrgRom:3696f::$36998
NesPrgRom:36978::every other frame do nothing
NesPrgRom:36987::Shoot in the direct middle of the wait
NesPrgRom:3698b::; Use the metasprite ID to determine direction, rather than $360,x ...?
NesPrgRom:369ae::no delay between directions
NesPrgRom:369b4:ObjectActionJump_2e:
NesPrgRom:369b7::$369cf
NesPrgRom:369c1::$369cf
NesPrgRom:369d2:ObjectActionJump_25_MushroomMovement:; Mushrooms and mt sabre plants ("ice entity")
NesPrgRom:369da::; ----
NesPrgRom:369db:ObjectActionJump_27_TrollMoveOrThrow:
NesPrgRom:369e3::; ----
NesPrgRom:369e4:ObjectActionJump_26_OrcMoveOrThrow:
NesPrgRom:369e9:ObjectAction_OrcThrowing:; At this point we're throwing.\\n; Check 38008, whether this is a directional sprite.\\n; If it's clear then it is directional so read direction into A,\\n; otherwise set A to zero.
NesPrgRom:369ee::$369f4
NesPrgRom:369f2::$369fa - uncond
NesPrgRom:36a00::; Now check if we're ready to actually throw the object. Also\\n; reset the animation timer to line up with the spawn timing.
NesPrgRom:36a16::$36a25 (instead beq $3698b, delete branch)
NesPrgRom:36a18::; Pull direction from the sprite (note redundant with $3698b)\\n; This is for directional sprites
NesPrgRom:36a31:ObjectAction_OrcMove:; ----\\n; $300 <- $6c0
NesPrgRom:36a36::$36a3c
NesPrgRom:36a3a::$36a42
NesPrgRom:36a48::; After setting sprite, we muck with 320...? it's unclear who\\n; set it before or who else reads it.\\nunused?!?
NesPrgRom:36a50::; Maybe shoot (and double-return), else move.
NesPrgRom:36a56::; ----
NesPrgRom:36a57:ObjectActionJump_24_HomingMovement:; weretiger, wyvern, large slime, earth entity (cave plants)\\n; Update every 8 frames if off screen, every frame if on screen
NesPrgRom:36a5c::$36a60
NesPrgRom:36a66::update frequency
NesPrgRom:36a68::$36a6b
NesPrgRom:36a74::;
NesPrgRom:36a7e::$36a96
NesPrgRom:36a85::presumably this is a direction - maybe return?
NesPrgRom:36a87::normalize diagonals into cardinal direction
NesPrgRom:36a91::$36a96
NesPrgRom:36a9b::movement was clear, return
NesPrgRom:36a9c:ObjectAction_HomingMovement_Bumped:; ----
NesPrgRom:36aa8::0 or 1
NesPrgRom:36aab:ObjectAction_HomingMovement_PickOppositeDirection:
NesPrgRom:36ab0:ObjectAction_HomingMovement_PickDirection:
NesPrgRom:36ab5::$36ab9
NesPrgRom:36ac0:ObjectAction_HomingMovement_Swerving:; ----
NesPrgRom:36ac8::$36ae0
NesPrgRom:36aca::; Turn every four frames.
NesPrgRom:36ad3::$36aef
NesPrgRom:36adb::$36ae0
NesPrgRom:36ae3::zero if clear? why not just bcs?
NesPrgRom:36ae5::$36aec
NesPrgRom:36ae7::update direction with what was actually moved
NesPrgRom:36ae9::(if it was clear ahead)
NesPrgRom:36afa:CheckMovementInDirection:; This reads the coords, saves them in $2b..$2f, makes a call, then restores.\\n; It's sometimes called twice.
NesPrgRom:36b2d:UpdateMetaspriteForDirectionChange:
NesPrgRom:36b32::$36b35
NesPrgRom:36b34::; sprite doesn't need to update $300,x to change direction
NesPrgRom:36b42:ObjectActionJump_22_BuriedMonster:; Ice zombie and sand monster, both of which become $25 after waking up
NesPrgRom:36b4c::; After $4e0,x frames, load $4a0,x <- $6a0,x
NesPrgRom:36b61:ObjectActionJump_28_Golem:
NesPrgRom:36b64::$36b6f
NesPrgRom:36b66::; If 660 is zero, just tick some counters and return.
NesPrgRom:36b6b::; Only tick 660 once 4e0 hits zero.
NesPrgRom:36b77::$36b98
NesPrgRom:36b79::temporarily change to #$91 to when shooting
NesPrgRom:36b87::sync animation with shooting sequence
NesPrgRom:36b9e:ObjectActionJump_29_AmorphousBlob:; e.g. the acid/lava creatures that can't be hit unless head is up
NesPrgRom:36ba6::; If $620 is nonzero, object is unhittable.
NesPrgRom:36bac:ObjectAction_AmorphousBlob_Main:cannot be hit by sword
NesPrgRom:36bb1::submerged
NesPrgRom:36bb6::maybe shoot
NesPrgRom:36bbb::standard ground monster
NesPrgRom:36bc0::up
NesPrgRom:36bca::$36bd9
NesPrgRom:36bd1::direction to player
NesPrgRom:36be6::; Every other frame decrement 640
NesPrgRom:36bea-36bf1:DataTable_36bea:; NOTE - uncovered
NesPrgRom:36bf2:ObjectAction_AmorphousBlob_MaybeShoot:
NesPrgRom:36bf8:ObjectActionJump_2a_Soldier:
NesPrgRom:36bfd::no update when off screen
NesPrgRom:36c03:ObjectAction_Soldier_Shooting:
NesPrgRom:36c23::get dir from metasprite id
NesPrgRom:36c26::cardinal directions only
NesPrgRom:36c30:ObjectAction_Soldier_Move:
NesPrgRom:36c40:ObjectAction_Soldier_CheckShoot:; slightly different criterion than normal shooters - shorter distance,\\n; but will swing a lot more often, and specifically lines up the shot\\n; directly toward the player - i.e. basically only swings/shoots if\\n; reasonably confident that it will land.
NesPrgRom:36c49::only shoot if very close (within 4 tiles)
NesPrgRom:36c4e::also only 1 in 8
NesPrgRom:36c52::Line up with player
NesPrgRom:36c60:ObjectActionJump_2b:
NesPrgRom:36c63::$36cae
NesPrgRom:36c7e::$36c8c
NesPrgRom:36c95::$36ca3
NesPrgRom:36cba::$36cbf
NesPrgRom:36cc0:ObjectActionJump_2c:
NesPrgRom:36cd0::$36cc4
NesPrgRom:36cd8::;; --------------------------------
NesPrgRom:36cd9:ObjectActionJump_30:
NesPrgRom:36cdc::$36ce2
NesPrgRom:36ce7::$36cec
NesPrgRom:36ce9::statue
NesPrgRom:36cf7::$36cd8
NesPrgRom:36cfe::$36d03
NesPrgRom:36d0c::$36d1e
NesPrgRom:36d15::$36d1e
NesPrgRom:36d37::no force, no update $380,x
NesPrgRom:36d43::$36d60
NesPrgRom:36d47::$36d4a
NesPrgRom:36d51::$36d57
NesPrgRom:36d5d::$36d1e
NesPrgRom:36d90::force terrain lookup, do update $380,x
NesPrgRom:36d9c-36d9d:DataTable_36d9c:; Data table seems to be keyed by ($360,x) & 6
NesPrgRom:36da4:_36da4:
NesPrgRom:36dbe::will run twice
NesPrgRom:36dc8:_36dc8:
NesPrgRom:36dca::$36dfe
NesPrgRom:36dd1::$36dfe
NesPrgRom:36de2::$36dfe
NesPrgRom:36df5::$36dfe
NesPrgRom:36e07:_36e07:
NesPrgRom:36e16:ObjectActionJump_31:; Entry point object action 30 if a statue (6e004 set)
NesPrgRom:36e1b::$36e25
NesPrgRom:36e28::$36e30
NesPrgRom:36e31:ObjectActionJump_32:
NesPrgRom:36e41::$36e7a ; -> rts
NesPrgRom:36e4b::$36eb7
NesPrgRom:36e61::$36e66
NesPrgRom:36e63::$36eb1
NesPrgRom:36e68::$36e7b
NesPrgRom:36e6c::$36e9c
NesPrgRom:36e72::$36e76
NesPrgRom:36edc::$36f03
NesPrgRom:36ee7::$36f03
NesPrgRom:36f04-36f05:MovementScriptTable:
NesPrgRom:36f24-36f2b:MovementScriptTable_00:
NesPrgRom:36f2c-36f33:MovementScriptTable_01_AkahanaBrynmaer:
NesPrgRom:36f34-36f35:MovementScriptTable_02:
NesPrgRom:36f36-36f37:MovementScriptTable_03:
NesPrgRom:36f38-36f41:MovementScriptTable_04:
NesPrgRom:36f42-36f4d:MovementScriptTable_05_DolphinCabin:
NesPrgRom:36f4e-36f5d:MovementScriptTable_06_DolphinUndergroundChannel:
NesPrgRom:36f64-36f6d:MovementScriptTable_07_DolphinEvilSpirit:
NesPrgRom:36f6e-36f78:MovementScriptTable_08_DolphinJoel:
NesPrgRom:36f79-36f84:MovementScriptTable_09_DolphinSwan:
NesPrgRom:36f85-36f89:MovementScriptTable_0a:
NesPrgRom:36f8a-36f8e:MovementScriptTable_0b:
NesPrgRom:36f8f-36f9a:MovementScriptTable_0c:
NesPrgRom:36f9b-36fa2:MovementScriptTable_0d_AkahanaWaterfall:
NesPrgRom:36fa3-36fa4:MovementScriptTable_0e:
NesPrgRom:36fa5-36fa8:MovementScriptTable_0f:
NesPrgRom:36fa9:ObjectActionJump_38:
NesPrgRom:36fc2::no force, no update $380,x
NesPrgRom:36fcb::$36fdc
NesPrgRom:36fed-36fee:DataTable_36fed:
NesPrgRom:36ff5:ObjectActionJump_3c:
NesPrgRom:36ffb:_36ffb:
NesPrgRom:36ffe::$37006
NesPrgRom:3700b::$37012
NesPrgRom:3700d::some sort of weird explosion sound
NesPrgRom:37015::$37005
NesPrgRom:37024::$37005
NesPrgRom:3702c:ObjectActionJump_1d:
NesPrgRom:3702f::$37037
NesPrgRom:3703b::$37047
NesPrgRom:37047::; ----
NesPrgRom:37048:ObjectActionJump_2f:
NesPrgRom:37059::$3705e
NesPrgRom:37068::$3706f
NesPrgRom:37070:ObjectActionJump_36:
NesPrgRom:37094:ObjectActionJump_1e:
NesPrgRom:370a2:ObjectActionJump_1f:
NesPrgRom:370a8:ObjectActionJump_11:; The first frame, set the correct sprite for the direction
NesPrgRom:370b5:ObjectActionJump_10:; Subsequent frames, do normal thing\\n;  1. subtract 4 from 4e0\\n;  2.
NesPrgRom:370be:ObjectActionJump_57:
NesPrgRom:370c1::$370c6
NesPrgRom:370c9::$370ce
NesPrgRom:370dd::$370e2
NesPrgRom:370ee::$370f3
NesPrgRom:370f6:ObjectActionJump_16:
NesPrgRom:37101::$37118
NesPrgRom:37105::$3710d
NesPrgRom:3711b:ObjectActionJump_17:
NesPrgRom:3712d:ObjectActionJump_1b:
NesPrgRom:37130::$37135
NesPrgRom:37132::despawn
NesPrgRom:3713f::$3716e
NesPrgRom:37150::update $380,x
NesPrgRom:3715c::$37173
NesPrgRom:3716b::$37139
NesPrgRom:37174:ObjectActionJump_12:; Tornado attack
NesPrgRom:37177::$371bc
NesPrgRom:37182::$37187
NesPrgRom:3719d::$371a7
NesPrgRom:371d4::$371dc
NesPrgRom:371e5-371e8:DataTable_371e5:
NesPrgRom:371e9-371ec:DataTable_371e9:
NesPrgRom:371ed-371f4:DataTable_371ed:
NesPrgRom:371f5-371ff:DataTable_371f5:
NesPrgRom:37235:ObjectActionJump_13:
NesPrgRom:37246::$3726b
NesPrgRom:3724b::$37250
NesPrgRom:37265::$3726b
NesPrgRom:3727a:ObjectActionJump_15:
NesPrgRom:3727d::$37282
NesPrgRom:37287::$37292
NesPrgRom:372a4:ObjectActionJump_1c:
NesPrgRom:372ab::$372ae
NesPrgRom:372b3::$372ba
NesPrgRom:372c5:ObjectActionJump_14:
NesPrgRom:372cf::$372d4
NesPrgRom:372d4::; ----
NesPrgRom:372d5:ObjectActionJump_18:
NesPrgRom:372e2:ObjectActionJump_19:
NesPrgRom:372e7::x ranges from 4..a
NesPrgRom:372f4:ObjectActionJump_1a:
NesPrgRom:372f5-372fb:DataTable_372f5:
NesPrgRom:372fc:ObjectActionJump_04:
NesPrgRom:37310::$37317
NesPrgRom:37318:ObjectActionJump_34:
NesPrgRom:37320::$37323
NesPrgRom:37326::$37322
NesPrgRom:37339:ObjectActionJump_41:
NesPrgRom:3733c::$37364
NesPrgRom:37341::$37346
NesPrgRom:37367::$37383
NesPrgRom:3736b::$3737d
NesPrgRom:37375::$3737c
NesPrgRom:3739e:ObjectActionJump_40:
NesPrgRom:373a4::$373d0
NesPrgRom:373f9:_373f9:
NesPrgRom:3740e-3741d:DataTable_3740e:
NesPrgRom:3741e-37421:DataTable_3741e:
NesPrgRom:37436:ObjectActionJump_44:
NesPrgRom:3743b::$37479
NesPrgRom:37443::$3744e
NesPrgRom:37451::$37479
NesPrgRom:37458::$37462
NesPrgRom:37477::$374a9
NesPrgRom:3747c::update $380,x
NesPrgRom:374aa-374b1:DataTable_374aa:
NesPrgRom:374b2-374b9:DataTable_374b2:
NesPrgRom:374ba:ObjectActionJump_45_BasicFlyer:; The summoned insect ($c4) sets 560 to 1 indicating that it needs to\\n; despawn when the giant insect (position $d) is killed.
NesPrgRom:374bf::$374d3
NesPrgRom:374c1::redundant - just checked this!
NesPrgRom:374c6::$374d3
NesPrgRom:374cb::$374d3
NesPrgRom:374cf::despawn
NesPrgRom:374d6::; Remove the 10 bit of 380. (unknown what this does)
NesPrgRom:374de::; Only change direction every 16 frames
NesPrgRom:374e3::$3750e
NesPrgRom:374e5:_374e5:
NesPrgRom:374ea::direction
NesPrgRom:374f5::$374fd
NesPrgRom:374f7::; direction turned
NesPrgRom:3754b::; ----
NesPrgRom:3754c-3754f:DataTable_3754c:
NesPrgRom:37550-37555:DataTable_37550:
NesPrgRom:37556-37559:DataTable_37556:
NesPrgRom:3755a:ObjectActionJump_48:
NesPrgRom:3755d::$37586
NesPrgRom:37570::$37573
NesPrgRom:3758f::$37594
NesPrgRom:37594::; ----
NesPrgRom:37595:ObjectActionJump_4c:
NesPrgRom:37598::$375d3
NesPrgRom:375a6::$375af
NesPrgRom:375ad::$375b0
NesPrgRom:375cf-375d2:DataTable_375cf:; ----
NesPrgRom:375d9:ObjectActionJump_4e:
NesPrgRom:375e1::$375f2
NesPrgRom:375f2::; ----
NesPrgRom:375f3:ObjectActionJump_5e:; First look at high nibble of spawn slot (0 or 1) and mix in\\n; the global timer so that each slot only spawns on a\\n; specific out of each 64 frames.  Since the white robots\\n; generally occupy slots 0d..12, this effectively splits\\n; the work in half across two back-to-back frames.
NesPrgRom:375fd::$37625
NesPrgRom:375ff::; Next, loop over slots d..1f - if we find any satisfying all of\\n;   (1) non-null action script,\\n;   (2) on the same vertical screen as the player, and\\n;   (3) 560,y == #$50 (which is the case for brown robots, since\\n;       the NpcData loader populates it with the monster ID).\\nunnecessary
NesPrgRom:37606::$37616
NesPrgRom:3760d::$37616
NesPrgRom:37614::$37625
NesPrgRom:37619::$37603
NesPrgRom:3761b::; If there are no brown robots left, then switch action script\\n; to 2a and fix the hitbox.
NesPrgRom:37626:ObjectActionJump_5c:
NesPrgRom:3762e::$3766e
NesPrgRom:37639::$3763f
NesPrgRom:3763d::$3764a
NesPrgRom:3765f:FinishRobotMovement:
NesPrgRom:37680::$3768f
NesPrgRom:3768f::; ----
NesPrgRom:37690:ObjectActionJump_5d:
NesPrgRom:3769b::$376a7
NesPrgRom:376aa:ObjectActionJump_58:
NesPrgRom:376df::$376f3
NesPrgRom:376e4::$376f3
NesPrgRom:376f3::; ----
NesPrgRom:376f4-37703:DataTable_376f4:
NesPrgRom:37714:CheckToShootProjectile:
NesPrgRom:37717::do nothing if off-screen
NesPrgRom:37723::only go past here twice a second
NesPrgRom:37728:MaybeShootProjectile:and then 1/8 from there
NesPrgRom:37733::why not bcs >rts ???
NesPrgRom:37735::skip if distance > 10 metatiles
NesPrgRom:3773b::double-return
NesPrgRom:3773e:ObjectAction_BasicFlyer_AdjustDirectionTowardPlayer:; twos complement
NesPrgRom:37749::; A = current direction minus twice the direction to player\\n; This looks like some sort of calculus to account for acceleration?\\n; Or maybe geometry for the double angle of a circle?\\n; Either way, we only adjust direction by 1, simulating inertia.
NesPrgRom:37753::why is this $f instead of 7?
NesPrgRom:37759-37768:DataTable_37759:
NesPrgRom:37769:ReturnEveryOtherFrameIfOffScreen:
NesPrgRom:37775::double return
NesPrgRom:37778:ObjectActionJump_7b:
NesPrgRom:37781::$37786
NesPrgRom:3778b::$37798
NesPrgRom:3779d::$377c5
NesPrgRom:3779f:_3779f:
NesPrgRom:377aa::$377b0
NesPrgRom:377c5::; ----
NesPrgRom:377c6-377d5:DataTable_377c6:
NesPrgRom:377e6-377f5:DataTable_377e6:
NesPrgRom:377f6:ObjectActionJump_08:
NesPrgRom:37801::$3783a
NesPrgRom:37805:_37805:
NesPrgRom:37833::$37838
NesPrgRom:3783b:ObjectActionJump_74:; This is the action for object $DC which is the death\\n; replacement for the vampire
NesPrgRom:37850:DoExplosion:
NesPrgRom:37858::$3785b
NesPrgRom:37860::$37879
NesPrgRom:3787d::$37896
NesPrgRom:37881::$37896
NesPrgRom:37885::$3788b
NesPrgRom:37889::$3788f
NesPrgRom:3788d::$37896
NesPrgRom:37894::$378a8
NesPrgRom:378a2::$378bc
NesPrgRom:378b8::$378bf
NesPrgRom:378e6-378e9:DataTable_378e6:; Table of quads
NesPrgRom:3793e:ObjectActionJump_06:
NesPrgRom:3794e::$3799d
NesPrgRom:37955:_37955:
NesPrgRom:3795d::$37980
NesPrgRom:37983::$37993
NesPrgRom:3798d::$37992
NesPrgRom:37996::$3799d
NesPrgRom:379a4::$379a9
NesPrgRom:379a9::; ----
NesPrgRom:379aa:ObjectActionJump_7d:; ----
NesPrgRom:379ad::$3799e
NesPrgRom:379b9::±4
NesPrgRom:379ce::$379d1
NesPrgRom:379f2::$379f5
NesPrgRom:379fc::$37a14
NesPrgRom:37a12::$37a2b
NesPrgRom:37a2c-37a2d:DataTable_37a2c:
NesPrgRom:37a2e:ObjectActionJump_70:
NesPrgRom:37a40-37a41:ObjectAction70JumpTable:00 object $b2
NesPrgRom:37a42-37a43::01 object $b3
NesPrgRom:37a44-37a45::02
NesPrgRom:37a46-37a47::03
NesPrgRom:37a48-37a49::04
NesPrgRom:37a4a-37a4b::05
NesPrgRom:37a4c-37a4d::06 dyna eye (a4)
NesPrgRom:37a50-37a51::08 dyna pod (b4)
NesPrgRom:37a52-37a53::09 object b5
NesPrgRom:37a54-37a55::0a
NesPrgRom:37a58-37a59::0c flail
NesPrgRom:37a5a:ObjectActionJump_70_00:
NesPrgRom:37a71:_37a71:
NesPrgRom:37a92::$37a7b
NesPrgRom:37a9a-37aa1:DataTable_37a9a:
NesPrgRom:37aa2:_37aa2:
NesPrgRom:37aa7::$37aae
NesPrgRom:37ab8:_37ab8:
NesPrgRom:37ac0::$37aba
NesPrgRom:37ad4::$37ac4
NesPrgRom:37aea::$37ada
NesPrgRom:37af5:ObjectActionJump_70_01:
NesPrgRom:37afd::$37b03
NesPrgRom:37b0b::$37b78
NesPrgRom:37b18::$37b79
NesPrgRom:37b20::$37b26
NesPrgRom:37b42::$37b32
NesPrgRom:37b67::MP
NesPrgRom:37bce-37bd1:DataTable_37bce:
NesPrgRom:37be7:ObjectActionJump_70_02:
NesPrgRom:37bf2::$37bee
NesPrgRom:37bfd::$37bf6
NesPrgRom:37c0c:ObjectActionJump_70_03:
NesPrgRom:37c26::$37c13
NesPrgRom:37c34-37c36:DataTable_37c34:
NesPrgRom:37c37:ObjectActionJump_70_04:
NesPrgRom:37c61-37c70:DataTable_37c61:
NesPrgRom:37c71:ObjectActionJump_70_05:
NesPrgRom:37c77::$37c60
NesPrgRom:37c89::$37c60
NesPrgRom:37c94:ObjectActionJump_70_06:
NesPrgRom:37c9c::$37cc1
NesPrgRom:37ca2::$37cc1
NesPrgRom:37ca4::; shoot laser downward
NesPrgRom:37ca6::Dyna Laser
NesPrgRom:37cab::$37cc1
NesPrgRom:37cc4::$37c60
NesPrgRom:37ccf::$37c60
NesPrgRom:37cd7:_37cd7:
NesPrgRom:37ce4::$37cf5
NesPrgRom:37cf3::$37cec
NesPrgRom:37cf6:ObjectActionJump_70_09:
NesPrgRom:37d0a::$37d03
NesPrgRom:37d19:ObjectActionJump_70_0a:
NesPrgRom:37d1c::$37d1f
NesPrgRom:37d29:ObjectActionJump_70_08:eye knockback - was it just hit?
NesPrgRom:37d2c::$37d68
NesPrgRom:37d30::$37d35
NesPrgRom:37d32::; Once every 8 seconds, if eye wasn't hit, increment 640,x
NesPrgRom:37d39::; a = 0 or 4, effectively (38 or 3c, actually)
NesPrgRom:37d3e::$37d41
NesPrgRom:37d45::$37d40
NesPrgRom:37d50::$37d40
NesPrgRom:37d53::Dyna Bubble
NesPrgRom:37d58-37d67:DataTable_37d58:; ----
NesPrgRom:37d6c::$37d40
NesPrgRom:37d84::Dyna counter attack
NesPrgRom:37d89-37d98:DataTable_37d89:
NesPrgRom:37da9:ObjectActionJump_70_0c:this is the object index of the parent
NesPrgRom:37dac::check that the parent still exists
NesPrgRom:37db3::if the parent is gone, then despawn
NesPrgRom:37dbe::; When the parent's 5a0 is zero, update the flail
NesPrgRom:37dc0::not on any collision plane
NesPrgRom:37dc5::hard-code sprite as #$f4
NesPrgRom:37dc8::; Tick the animation counter by 4 every frame (that 5a0 is zero)
NesPrgRom:37dd1::; Play sound every 32 frames (since $4e0 ticks by 4) if on-screen
NesPrgRom:37de1::parent index
NesPrgRom:37de8::parent shooting? maybe triggers spin?
NesPrgRom:37dfa::$37e20
NesPrgRom:37e17::pick appropriate hitbox
NesPrgRom:37e30-37e31:DataTable_37e30:
NesPrgRom:37e40-37e41::;; --------------------------------\\n;; UNUSED until end of bank
NesPrgRom:38000:_38000:
NesPrgRom:38009-3800d:DataTable_38009:
NesPrgRom:3800e:DrawAllObjectSpritesInternal:
NesPrgRom:38014::$38018
NesPrgRom:38028::; Loop over all $20 objects
NesPrgRom:3802c::; Start at $0204 (skip sprite 0)
NesPrgRom:38039::$3809a - $4a0,x == 0 => do not show
NesPrgRom:38045::$3809a - not on screen
NesPrgRom:38055::$3809a
NesPrgRom:3805c::$38060
NesPrgRom:38066::$3809a
NesPrgRom:38081::$3808b
NesPrgRom:38092::$38030
NesPrgRom:380a5:_380a5:
NesPrgRom:380a7::$380b4
NesPrgRom:380b2::$380ab
NesPrgRom:380b7::$380d5
NesPrgRom:380bf::$380c3
NesPrgRom:380d3::$380c6
NesPrgRom:380d6:_380d6:
NesPrgRom:380d9::$38145
NesPrgRom:380e0::$380e3
NesPrgRom:380fa::$38101
NesPrgRom:3810f::$3813c
NesPrgRom:38127::sprite data
NesPrgRom:38142::$380e9
NesPrgRom:38148::$381a4
NesPrgRom:3814f::$381a4
NesPrgRom:3816d::$3819c
NesPrgRom:3818b::$3819c
NesPrgRom:381a2::$38157
NesPrgRom:381a5:_381a5:
NesPrgRom:381ac::this is in the object region but not indexed?
NesPrgRom:381b3::$381b9
NesPrgRom:381ba-381c9:DataTable_381ba:
NesPrgRom:381da-381de:DataTable_381da:
NesPrgRom:381df:DataTable_381df:
NesPrgRom:381fe-381ff:DataTable_381fe:
NesPrgRom:3822e:_3822e:; Input $17 is a $380,x << 1 (for some x, presumably this one,\\n;        unless we're on the start (status) screen, in which case\\n;        it's $39f)
NesPrgRom:38231::$38239
NesPrgRom:3823f::; If $380,x02 is set then draw a second different metasprite with\\n;   $380 (clearing 20, setting 01 - so no offset at all)\\n;   $300 <- $580
NesPrgRom:38247::; $380,x gets 20 unset and 01 set\\n; $300,x <- $580,x and draw a bonus
NesPrgRom:38268:DrawMetasprite:
NesPrgRom:3826a::$38271
NesPrgRom:3827e::$38283
NesPrgRom:38285::$38293
NesPrgRom:38291::$3829d (uncond)
NesPrgRom:382a1::$382b8
NesPrgRom:382a3::$382b9
NesPrgRom:382a5::; Negative tile count indicates a horizontal flip of\\n; the tile at the given address.  Setting $1c to #$80\\n; records the fact that the tile is flipped.
NesPrgRom:382b5::$3829d
NesPrgRom:382be::countdown step timer
NesPrgRom:382c8::; Multiply the number of tiles by the second byte, ANDed with\\n; $4e0,x (step counter), to determine animation frame
NesPrgRom:382cc::$382d1
NesPrgRom:382d5::$382da
NesPrgRom:382de::$382e3
NesPrgRom:382e7::$382ec
NesPrgRom:382ed::$382f3
NesPrgRom:382f4::$382f8
NesPrgRom:382f9::; Add to $15 (with carry into $16, obv)
NesPrgRom:382fd::$38301
NesPrgRom:3830f::This is pointless, $1a is always zero here
NesPrgRom:38311::$1a <- $320,x
NesPrgRom:38316::not sure what this bit does - it's slide in ($68),y
NesPrgRom:3831c::$1a <- ($320,x) + ($380,x20 << 1)
NesPrgRom:3831e::; This next block seems to store either #0 or $1e into $1d, but\\n; as far as I can tell, nobody ever actually reads the value, so\\n; it all seems kind of pointless.
NesPrgRom:38323::$38327
NesPrgRom:38325::written e.g. $38018 - was 3 or 0 based on $08 counter
NesPrgRom:38329::probably current sprite index?
NesPrgRom:38335::$3836b - nothing else to do - last tile
NesPrgRom:38338::clearly the x coord of the object (cf 38047)
NesPrgRom:38340::$3836e
NesPrgRom:3834f::priority bit (#$20 if behind background, from $380,x)
NesPrgRom:38356::$38379
NesPrgRom:3835b::Add $320,x, plus $#40 if $380,x20 set
NesPrgRom:38365::$3836b
NesPrgRom:38369::$38331
NesPrgRom:38370::$3836b
NesPrgRom:38372::queue up the next subtile? but returing right away
NesPrgRom:38376::$38331
NesPrgRom:3837b::$38358 - back-jump if we're at normal speed
NesPrgRom:38380:DrawMirroredMetasprite:
NesPrgRom:38396::$383c6
NesPrgRom:383ae::$383d1
NesPrgRom:383d3::$383b0
NesPrgRom:383d8-383db:ObjectSpriteOrderEntranceTable:
NesPrgRom:383dc-383eb:ObjectSpriteOrderTable:
NesPrgRom:3845c-3845d:MetaspriteTable:00
NesPrgRom:3845e-3845f::01
NesPrgRom:38460-38461::02
NesPrgRom:38462-38463::03
NesPrgRom:38464-38465::04
NesPrgRom:38466-38467::05
NesPrgRom:38468-38469::06
NesPrgRom:3846a-3846b::07
NesPrgRom:3846c-3846d::08
NesPrgRom:3846e-3846f::09
NesPrgRom:38470-38471::0a
NesPrgRom:38472-38473::0b
NesPrgRom:38474-38475::0c
NesPrgRom:38476-38477::0d
NesPrgRom:38478-38479::0e
NesPrgRom:3847a-3847b::0f
NesPrgRom:3847c-3847d::10
NesPrgRom:3847e-3847f::11
NesPrgRom:38480-38481::12
NesPrgRom:38482-38483::13
NesPrgRom:38484-38485::14
NesPrgRom:38486-38487::15
NesPrgRom:38488-38489::16
NesPrgRom:3848a-3848b::17
NesPrgRom:3848c-3848d::18
NesPrgRom:3848e-3848f::19
NesPrgRom:38490-38491::1a
NesPrgRom:38492-38493::1b
NesPrgRom:38494-38495::1c
NesPrgRom:38496-38497::1d
NesPrgRom:38498-38499::1e
NesPrgRom:3849a-3849b::1f
NesPrgRom:3849c-3849d::20
NesPrgRom:3849e-3849f::21
NesPrgRom:384a0-384a1::22
NesPrgRom:384a2-384a3::23
NesPrgRom:384a4-384a5::24
NesPrgRom:384a6-384a7::25
NesPrgRom:384a8-384a9::26
NesPrgRom:384aa-384ab::27
NesPrgRom:384ac-384ad::28
NesPrgRom:384ae-384af::29
NesPrgRom:384b0-384b1::2a
NesPrgRom:384b2-384b3::2b
NesPrgRom:384b4-384b5::2c
NesPrgRom:384b6-384b7::2d
NesPrgRom:384b8-384b9::2e
NesPrgRom:384ba-384bb::2f
NesPrgRom:384bc-384bd::30
NesPrgRom:384be-384bf::31
NesPrgRom:384c0-384c1::32
NesPrgRom:384c2-384c3::33
NesPrgRom:384c4-384c5::34
NesPrgRom:384c6-384c7::35
NesPrgRom:384c8-384c9::36
NesPrgRom:384ca-384cb::37
NesPrgRom:384cc-384cd::38
NesPrgRom:384ce-384cf::39
NesPrgRom:384d0-384d1::3a
NesPrgRom:384d2-384d3::3b
NesPrgRom:384d4-384d5::3c
NesPrgRom:384d6-384d7::3d
NesPrgRom:384d8-384d9::3e
NesPrgRom:384da-384db::3f
NesPrgRom:384dc-384dd::40
NesPrgRom:384de-384df::41
NesPrgRom:384e0-384e1::42
NesPrgRom:384e2-384e3::43
NesPrgRom:384e4-384e5::44
NesPrgRom:384e6-384e7::45
NesPrgRom:384e8-384e9::46
NesPrgRom:384ea-384eb::47
NesPrgRom:384ec-384ed::48
NesPrgRom:384ee-384ef::49
NesPrgRom:384f0-384f1::4a
NesPrgRom:384f2-384f3::4b
NesPrgRom:384f4-384f5::4c
NesPrgRom:384f6-384f7::4d
NesPrgRom:384f8-384f9::4e
NesPrgRom:384fa-384fb::4f
NesPrgRom:384fc-384fd::50
NesPrgRom:384fe-384ff::51
NesPrgRom:38500-38501::52
NesPrgRom:38502-38503::53
NesPrgRom:38504-38505::54
NesPrgRom:38506-38507::55
NesPrgRom:38508-38509::56
NesPrgRom:3850a-3850b::57
NesPrgRom:3850c-3850d::58
NesPrgRom:3850e-3850f::59
NesPrgRom:38510-38511::5a
NesPrgRom:38512-38513::5b
NesPrgRom:38514-38515::5c
NesPrgRom:38516-38517::5d
NesPrgRom:38518-38519::5e
NesPrgRom:3851a-3851b::5f
NesPrgRom:3851c-3851d::60
NesPrgRom:3851e-3851f::61
NesPrgRom:38520-38521::62
NesPrgRom:38522-38523::63
NesPrgRom:38524-38525::64
NesPrgRom:38526-38527::65
NesPrgRom:38528-38529::66
NesPrgRom:3852a-3852b::67
NesPrgRom:3852c-3852d::68
NesPrgRom:3852e-3852f::69
NesPrgRom:38530-38531::6a
NesPrgRom:38532-38533::6b
NesPrgRom:38534-38535::6c
NesPrgRom:38536-38537::6d
NesPrgRom:38538-38539::6e
NesPrgRom:3853a-3853b::6f
NesPrgRom:3853c-3853d::70
NesPrgRom:3853e-3853f::71
NesPrgRom:38540-38541::72
NesPrgRom:38542-38543::73
NesPrgRom:38544-38545::74
NesPrgRom:38546-38547::75
NesPrgRom:38548-38549::76
NesPrgRom:3854a-3854b::77
NesPrgRom:3854c-3854d::78
NesPrgRom:3854e-3854f::79
NesPrgRom:38550-38551::7a
NesPrgRom:38552-38553::7b
NesPrgRom:38554-38555::7c
NesPrgRom:38556-38557::7d
NesPrgRom:38558-38559::7e
NesPrgRom:3855a-3855b::7f
NesPrgRom:3855c-3855d:MetaspriteTablePart2:80
NesPrgRom:3855e-3855f::81
NesPrgRom:38560-38561::82
NesPrgRom:38562-38563::83
NesPrgRom:38564-38565::84
NesPrgRom:38566-38567::85
NesPrgRom:38568-38569::86
NesPrgRom:3856a-3856b::87
NesPrgRom:3856c-3856d::88
NesPrgRom:3856e-3856f::89
NesPrgRom:38570-38571::8a
NesPrgRom:38572-38573::8b
NesPrgRom:38574-38575::8c
NesPrgRom:38576-38577::8d
NesPrgRom:38578-38579::8e
NesPrgRom:3857a-3857b::8f
NesPrgRom:3857c-3857d::90
NesPrgRom:3857e-3857f::91
NesPrgRom:38580-38581::92
NesPrgRom:38582-38583::93
NesPrgRom:38584-38585::94
NesPrgRom:38586-38587::95
NesPrgRom:38588-38589::96
NesPrgRom:3858a-3858b::97
NesPrgRom:3858c-3858d::98
NesPrgRom:3858e-3858f::99
NesPrgRom:38592-38593::9b
NesPrgRom:38594-38595::9c
NesPrgRom:38596-38597::9d
NesPrgRom:38598-38599::9e
NesPrgRom:3859a-3859b::9f
NesPrgRom:3859c-3859d::a0
NesPrgRom:3859e-3859f::a1
NesPrgRom:385a0-385a1::a2
NesPrgRom:385a2-385a3::a3
NesPrgRom:385a4-385a5::a4
NesPrgRom:385a6-385a7::a5
NesPrgRom:385a8-385a9::a6
NesPrgRom:385aa-385ab::a7
NesPrgRom:385ac-385ad::a8
NesPrgRom:385ae-385af::a9
NesPrgRom:385b0-385b1::aa
NesPrgRom:385b2-385b3::ab
NesPrgRom:385b4-385b5::ac
NesPrgRom:385b6-385b7::ad
NesPrgRom:385b8-385b9::ae
NesPrgRom:385ba-385bb::af
NesPrgRom:385bc-385bd::b0
NesPrgRom:385be-385bf::b1
NesPrgRom:385c0-385c1::b2
NesPrgRom:385c2-385c3::b3
NesPrgRom:385c4-385c5::b4
NesPrgRom:385c6-385c7::b5
NesPrgRom:385c8-385c9::b6
NesPrgRom:385ca-385cb::b7
NesPrgRom:385cc-385cd::b8
NesPrgRom:385ce-385cf::b9
NesPrgRom:385d0-385d1::ba
NesPrgRom:385d2-385d3::bb
NesPrgRom:385d4-385d5::bc
NesPrgRom:385d6-385d7::bd
NesPrgRom:385d8-385d9::be
NesPrgRom:385da-385db::bf
NesPrgRom:385dc-385dd::c0
NesPrgRom:385de-385df::c1
NesPrgRom:385e0-385e1::c2
NesPrgRom:385e2-385e3::c3
NesPrgRom:385e4-385e5::c4
NesPrgRom:385e6-385e7::c5
NesPrgRom:385e8-385e9::c6
NesPrgRom:385ea-385eb::c7
NesPrgRom:385ec-385ed::c8
NesPrgRom:385ee-385ef::c9
NesPrgRom:385f0-385f1::ca
NesPrgRom:385f2-385f3::cb
NesPrgRom:385f4-385f5::cc
NesPrgRom:385f6-385f7::cd
NesPrgRom:385f8-385f9::ce
NesPrgRom:385fa-385fb::cf
NesPrgRom:385fc-385fd::d0
NesPrgRom:385fe-385ff::d1
NesPrgRom:38600-38601::d2
NesPrgRom:38602-38603::d3
NesPrgRom:38604-38605::d4
NesPrgRom:38606-38607::d5
NesPrgRom:38608-38609::d6
NesPrgRom:3860a-3860b::d7
NesPrgRom:3860c-3860d::d8
NesPrgRom:3860e-3860f::d9
NesPrgRom:38610-38611::da
NesPrgRom:38612-38613::db
NesPrgRom:38614-38615::dc
NesPrgRom:38616-38617::dd
NesPrgRom:38618-38619::de
NesPrgRom:3861a-3861b::df
NesPrgRom:3861c-3861d::e0
NesPrgRom:3861e-3861f::e1
NesPrgRom:38620-38621::e2
NesPrgRom:38622-38623::e3
NesPrgRom:38624-38625::e4
NesPrgRom:38626-38627::e5
NesPrgRom:38628-38629::e6
NesPrgRom:3862a-3862b::e7
NesPrgRom:3862c-3862d::e8
NesPrgRom:3862e-3862f::e9
NesPrgRom:38630-38631::ea
NesPrgRom:38632-38633::eb
NesPrgRom:38634-38635::ec
NesPrgRom:38636-38637::ed
NesPrgRom:38638-38639::ee
NesPrgRom:3863a-3863b::ef
NesPrgRom:3863c-3863d::f0
NesPrgRom:3863e-3863f::f1
NesPrgRom:38640-38641::f2
NesPrgRom:38642-38643::f3
NesPrgRom:38644-38645::f4
NesPrgRom:38646-38647::f5
NesPrgRom:38648-38649::f6
NesPrgRom:3864a-3864b::f7
NesPrgRom:3864c-3864d::f8
NesPrgRom:3864e-3864f::f9
NesPrgRom:38650-38651::fa
NesPrgRom:38652-38653::fb
NesPrgRom:38654-38655::fc
NesPrgRom:38656-38657::fd
NesPrgRom:38658-38659::fe
NesPrgRom:3865a-3865b::ff
NesPrgRom:3865c-3865d:Metasprite_02:; Player facing south
NesPrgRom:3865e-38661::; Variant 0
NesPrgRom:38676-38679::; Variant 1
NesPrgRom:3868e-3868f:Metasprite_00:; Player facing north ?
NesPrgRom:38690-38693::; Variant 0
NesPrgRom:386a8-386ab::; Variant 1
NesPrgRom:386c0-386c1:Metasprite_01:; Player facing east
NesPrgRom:386c2-386c5::; Variant 0
NesPrgRom:386da-386dd::; Variant 1
NesPrgRom:386f2:Metasprite_03:; Player facing west
NesPrgRom:386f5-386f6:Metasprite_0e:
NesPrgRom:386f7-386fa::; Variant 0
NesPrgRom:386ff-38702::; Variant 1
NesPrgRom:38707-38708:Metasprite_0c:
NesPrgRom:38709-3870c::; Variant 0
NesPrgRom:38711-38714::; Variant 1
NesPrgRom:38719-3871a:Metasprite_0d:
NesPrgRom:3871b-3871e::; Variant 0
NesPrgRom:38727-3872a::; Variant 1
NesPrgRom:38733:Metasprite_0f:
NesPrgRom:38736-38739::;; ----------------------------------------------------------------\\nUnused bytes?
NesPrgRom:3873a:Metasprite_0b:
NesPrgRom:3873d-3873e:Metasprite_09:
NesPrgRom:3873f-38742::; Variant 0
NesPrgRom:38743-38746::; Variant 1
NesPrgRom:38747-38748:Metasprite_08:
NesPrgRom:38749-3874a:Metasprite_0a:
NesPrgRom:3874b-3874c:Metasprite_04:; Player sword thrust north
NesPrgRom:3874d-38750::; Variant 0
NesPrgRom:3876d-38770::; Variant 1
NesPrgRom:3878d-38790::; Variant 2
NesPrgRom:387ad-387b0::; Variant 3
NesPrgRom:387b1-387b2:Metasprite_10:
NesPrgRom:387b3-387b6::; Variant 0
NesPrgRom:387bb-387be::; Variant 1
NesPrgRom:387c3-387c6::; Variant 2
NesPrgRom:387cb-387ce::; Variant 3
NesPrgRom:387cf-387d0:Metasprite_06:; Player sword thrust south
NesPrgRom:387d1-387d4::; Variant 0
NesPrgRom:387f1-387f4::; Variant 1
NesPrgRom:38811-38814::; Variant 2
NesPrgRom:38831-38834::; Variant 3
NesPrgRom:38835-38836:Metasprite_12:
NesPrgRom:38837-3883a::; Variant 0
NesPrgRom:3883f-38842::; Variant 1
NesPrgRom:38847-3884a::; Variant 2
NesPrgRom:3884f-38852::; Variant 3
NesPrgRom:38853:Metasprite_07:; Player sword thrust west
NesPrgRom:38856:Metasprite_13:
NesPrgRom:38859-3885a:Metasprite_05:; Player sword thrust east
NesPrgRom:3885b-3885e::; Variant 0
NesPrgRom:3887b-3887e::; Variant 1
NesPrgRom:3889b-3889e::; Variant 2
NesPrgRom:388bb-388be::; Variant 3
NesPrgRom:388bf-388c0:Metasprite_11:
NesPrgRom:388c1-388c4::; Variant 0
NesPrgRom:388c9-388cc::; Variant 1
NesPrgRom:388d1-388d4::; Variant 2
NesPrgRom:388d9-388dc::; Variant 3
NesPrgRom:388dd-388de::;; ----------------------------------------------------------------\\n;; Unused. Looks like a metasprite for the floating orb when charging sword\\n;; but the final game uses AdhocSpawnObject instead of a metasprite
NesPrgRom:388e3-388e4::;; ----------------------------------------------------------------\\n;; Unused. Some sort of metasprite that uses the refresh animation tiles\\n;; but the final game uses AdhocSpawnObject instead of a metasprite
NesPrgRom:38904-38905:Metasprite_1c:
NesPrgRom:38906-38909::; Variant 0
NesPrgRom:38916-38917:Metasprite_18:
NesPrgRom:38918-3891b::; Variant 0
NesPrgRom:38930-38933::; Variant 1
NesPrgRom:38948-38949:Metasprite_19:
NesPrgRom:3894a-3894d::; Variant 0
NesPrgRom:38962-38965::; Variant 1
NesPrgRom:3897a-3897b:Metasprite_1a:
NesPrgRom:3897c-3897f::; Variant 0
NesPrgRom:38994-38997::; Variant 1
NesPrgRom:389ac:Metasprite_1b:
NesPrgRom:389af-389b0:Metasprite_1d:
NesPrgRom:389b1-389b4::; Variant 0
NesPrgRom:389c1-389c4::; Variant 1
NesPrgRom:389d1-389d2:Metasprite_2b:
NesPrgRom:389d3-389d6::; Variant 0
NesPrgRom:389db-389de::; Variant 1
NesPrgRom:389e3-389e6::; Variant 2
NesPrgRom:389eb-389ee::; Variant 3
NesPrgRom:389f3-389f4:Metasprite_28:
NesPrgRom:389f5-389f8::; Variant 0
NesPrgRom:38a05-38a06:Metasprite_29:
NesPrgRom:38a07-38a0a::; Variant 0
NesPrgRom:38a3f-38a42::; Variant 1
NesPrgRom:38a77-38a7a::; Variant 2
NesPrgRom:38aaf-38ab2::; Variant 3
NesPrgRom:38ae7-38aea::; Variant 4
NesPrgRom:38b1f-38b22::; Variant 5
NesPrgRom:38b57-38b5a::; Variant 6
NesPrgRom:38b8f-38b92::; Variant 7
NesPrgRom:38b9b-38b9c:Metasprite_2a:
NesPrgRom:38b9d-38ba0::; Variant 0
NesPrgRom:38bad-38bb0::; Variant 1
NesPrgRom:38bbd-38bc0::; Variant 2
NesPrgRom:38bcd-38bd0::; Variant 3
NesPrgRom:38bdd-38be0::; Variant 4
NesPrgRom:38bed-38bf0::; Variant 5
NesPrgRom:38bfd-38c00::; Variant 6
NesPrgRom:38c0d-38c10::; Variant 7
NesPrgRom:38c1d-38c20::; Variant 8
NesPrgRom:38c2d-38c30::; Variant 9
NesPrgRom:38c3d-38c40::; Variant 10
NesPrgRom:38c4d-38c50::; Variant 11
NesPrgRom:38c5d-38c60::; Variant 12
NesPrgRom:38c6d-38c70::; Variant 13
NesPrgRom:38c7d-38c80::; Variant 14
NesPrgRom:38c8d-38c90::; Variant 15
NesPrgRom:38c9d-38c9e:Metasprite_14:
NesPrgRom:38c9f-38ca2::; Variant 0
NesPrgRom:38ca7-38ca8:Metasprite_15:
NesPrgRom:38ca9-38cac::; Variant 0
NesPrgRom:38cb1-38cb2:Metasprite_16:
NesPrgRom:38cb3-38cb6::; Variant 0
NesPrgRom:38cbb:Metasprite_17:
NesPrgRom:38cbe-38cbf:Metasprite_20:
NesPrgRom:38cc0-38cc3::; Variant 0
NesPrgRom:38cd8:Metasprite_23:
NesPrgRom:38cdb-38cdc:Metasprite_22:
NesPrgRom:38cdd-38ce0::; Variant 0
NesPrgRom:38cf5-38cf6:Metasprite_21:
NesPrgRom:38cf7-38cfa::; Variant 0
NesPrgRom:38d0f-38d10:Metasprite_1f:
NesPrgRom:38d11-38d14::; Variant 0
NesPrgRom:38d21-38d22:Metasprite_26:
NesPrgRom:38d23-38d26::; Variant 0
NesPrgRom:38d2f-38d30:Metasprite_27:
NesPrgRom:38d31-38d34::; Variant 0
NesPrgRom:38d3d-38d3e:Metasprite_53:
NesPrgRom:38d3f-38d42::; Variant 0
NesPrgRom:38d57-38d5a::; Variant 1
NesPrgRom:38d6f-38d70:Metasprite_f2:
NesPrgRom:38d71-38d74::; Variant 0
NesPrgRom:38db1-38db4::; Variant 1
NesPrgRom:38df1-38df4::; Variant 2
NesPrgRom:38e31-38e34::; Variant 3
NesPrgRom:38e71-38e72:Metasprite_f3:
NesPrgRom:38e73-38e76::; Variant 0
NesPrgRom:38e7b-38e7e::; Variant 1
NesPrgRom:38e83-38e86::; Variant 2
NesPrgRom:38e8b-38e8e::; Variant 3
NesPrgRom:38e93-38e96::; Variant 4
NesPrgRom:38e9b-38e9e::; Variant 5
NesPrgRom:38ea3-38ea6::; Variant 6
NesPrgRom:38eab-38eae::; Variant 7
NesPrgRom:38eb3-38eb4:Metasprite_f4:
NesPrgRom:38eb5-38eb8::; Variant 0
NesPrgRom:38ec5-38ec8::; Variant 1
NesPrgRom:38ed5-38ed8::; Variant 2
NesPrgRom:38ee5-38ee8::; Variant 3
NesPrgRom:38ef5-38ef8::; Variant 4
NesPrgRom:38f05-38f08::; Variant 5
NesPrgRom:38f15-38f18::; Variant 6
NesPrgRom:38f25-38f28::; Variant 7
NesPrgRom:38f35-38f36:Metasprite_f5:
NesPrgRom:38f37-38f3a::; Variant 0
NesPrgRom:38f4b-38f4c:Metasprite_f6:
NesPrgRom:38f4d-38f50::; Variant 0
NesPrgRom:38f61-38f62:Metasprite_f7:
NesPrgRom:38f63-38f66::; Variant 0
NesPrgRom:38f77-38f78:Metasprite_f8:
NesPrgRom:38f79-38f7c::; Variant 0
NesPrgRom:38f8d-38f8e:Metasprite_f9:
NesPrgRom:38f8f-38f92::; Variant 0
NesPrgRom:38fb3-38fb6::; Variant 1
NesPrgRom:38fd7-38fd8:Metasprite_fa:
NesPrgRom:38fd9-38fdc::; Variant 0
NesPrgRom:38fe5-38fe6:Metasprite_fb:
NesPrgRom:38fe7-38fea::; Variant 0
NesPrgRom:38fef-38ff0:Metasprite_fc:
NesPrgRom:38ff1-38ff4::; Variant 0
NesPrgRom:38ff9-38ffc::; Variant 1
NesPrgRom:39001-39004::; Variant 2
NesPrgRom:39009-3900c::; Variant 3
NesPrgRom:39011-39012:Metasprite_fd:
NesPrgRom:39013-39016::; Variant 0
NesPrgRom:39017-3901a::; Variant 1
NesPrgRom:3901b-3901c:Metasprite_fe:
NesPrgRom:3901d-39020::; Variant 0
NesPrgRom:39029-3902c::; Variant 1 - unused?
NesPrgRom:39035-39038::; Variant 2
NesPrgRom:39041-39042:Metasprite_ff:
NesPrgRom:39043-39046::; Variant 0
NesPrgRom:39067-3906a::; Variant 1
NesPrgRom:3908b-3908e::; Variant 2
NesPrgRom:390af-390b2::; Variant 3
NesPrgRom:390d3-390d6::; Variant 4
NesPrgRom:390f7-390fa::; Variant 5
NesPrgRom:3911b-3911e::; Variant 6
NesPrgRom:3913f-39142::; Variant 7
NesPrgRom:39163-39164:Metasprite_4c:
NesPrgRom:39165-39168::; Variant 0
NesPrgRom:39169-3916a:Metasprite_2c:; mesia north
NesPrgRom:3916b-3916e::; Variant 0
NesPrgRom:39183-39186::; Variant 1
NesPrgRom:3919b-3919c:Metasprite_2d:; mesia east
NesPrgRom:3919d-391a0::; Variant 0
NesPrgRom:391b5-391b8::; Variant 1
NesPrgRom:391cd-391ce:Metasprite_2e:; mesia south (pattern bank $47, palette $06)\\n; as opposed to simea pattern bank $41 palette $01
NesPrgRom:391cf-391d2::; Variant 0
NesPrgRom:391e7-391ea::; Variant 1
NesPrgRom:391ff:Metasprite_2f:; mesia west
NesPrgRom:39202-39203:Metasprite_30:
NesPrgRom:39204-39207::; Variant 0
NesPrgRom:3921c-3921f::; Variant 1
NesPrgRom:39234-39235:Metasprite_31:
NesPrgRom:39236-39239::; Variant 0
NesPrgRom:3924e-39251::; Variant 1
NesPrgRom:39266-39267:Metasprite_32:
NesPrgRom:39268-3926b::; Variant 0
NesPrgRom:39280-39283::; Variant 1
NesPrgRom:39298:Metasprite_33:
NesPrgRom:3929b-3929c:Metasprite_34:
NesPrgRom:3929d-392a0::; Variant 0
NesPrgRom:392b5-392b8::; Variant 1
NesPrgRom:392cd-392ce:Metasprite_35:
NesPrgRom:392cf-392d2::; Variant 0
NesPrgRom:392e7-392ea::; Variant 1
NesPrgRom:392ff-39300:Metasprite_36:
NesPrgRom:39301-39304::; Variant 0
NesPrgRom:39319-3931c::; Variant 1
NesPrgRom:39331:Metasprite_37:
NesPrgRom:39334-39335:Metasprite_38:
NesPrgRom:39336-39339::; Variant 0
NesPrgRom:3934e-39351::; Variant 1
NesPrgRom:39366-39367:Metasprite_39:
NesPrgRom:39368-3936b::; Variant 0
NesPrgRom:39380-39383::; Variant 1
NesPrgRom:39398-39399:Metasprite_3a:
NesPrgRom:3939a-3939d::; Variant 0
NesPrgRom:393b2-393b5::; Variant 1
NesPrgRom:393ca:Metasprite_3b:
NesPrgRom:393cd-393ce:Metasprite_44:
NesPrgRom:393cf-393d2::; Variant 0
NesPrgRom:393e7-393ea::; Variant 1
NesPrgRom:393ff-39400:Metasprite_45:
NesPrgRom:39401-39404::; Variant 0
NesPrgRom:39419-3941c::; Variant 1
NesPrgRom:39431-39432:Metasprite_46:
NesPrgRom:39433-39436::; Variant 0
NesPrgRom:3944b-3944e::; Variant 1
NesPrgRom:39463:Metasprite_47:
NesPrgRom:39466-39467:Metasprite_4d:
NesPrgRom:39468-3946b::; Variant 0
NesPrgRom:39480-39481:Metasprite_4e:
NesPrgRom:39482-39485::; Variant 0
NesPrgRom:3949a-3949b:Metasprite_3c:
NesPrgRom:3949c-3949f::; Variant 0
NesPrgRom:394ac-394af::; Variant 1
NesPrgRom:394bc-394bd:Metasprite_3d:
NesPrgRom:394be-394c1::; Variant 0
NesPrgRom:394ce-394d1::; Variant 1
NesPrgRom:394de-394df:Metasprite_3e:
NesPrgRom:394e0-394e3::; Variant 0
NesPrgRom:394f0-394f3::; Variant 1
NesPrgRom:39500:Metasprite_3f:
NesPrgRom:39503-39504:Metasprite_40:
NesPrgRom:39505-39508::; Variant 0
NesPrgRom:39515-39518::; Variant 1
NesPrgRom:39525-39526:Metasprite_41:
NesPrgRom:39527-3952a::; Variant 0
NesPrgRom:39537-3953a::; Variant 1
NesPrgRom:39547-39548:Metasprite_42:
NesPrgRom:39549-3954c::; Variant 0
NesPrgRom:39559-3955c::; Variant 1
NesPrgRom:39569:Metasprite_43:
NesPrgRom:3956c-3956d:Metasprite_48:
NesPrgRom:3956e-39571::; Variant 0
NesPrgRom:3957e-39581::; Variant 1
NesPrgRom:3958e-3958f:Metasprite_49:
NesPrgRom:39590-39593::; Variant 0
NesPrgRom:395a0-395a3::; Variant 1
NesPrgRom:395b0-395b1:Metasprite_4a:
NesPrgRom:395b2-395b5::; Variant 0
NesPrgRom:395c2-395c5::; Variant 1
NesPrgRom:395d2:Metasprite_4b:
NesPrgRom:395d5-395d6:Metasprite_4f:
NesPrgRom:395d7-395da::; Variant 0
NesPrgRom:395ef-395f2::; Variant 1
NesPrgRom:39607-39608:Metasprite_50:
NesPrgRom:39609-3960c::; Variant 0
NesPrgRom:39621-39622:Metasprite_ad:
NesPrgRom:39623-39626::; Variant 0
NesPrgRom:3963b-3963c:Metasprite_51:
NesPrgRom:3963d-39640::; Variant 0
NesPrgRom:3964d-39650::; Variant 1
NesPrgRom:3965d:Metasprite_54:
NesPrgRom:39660-39661:Metasprite_55:
NesPrgRom:39662-39665::; Variant 0
NesPrgRom:3967a-3967d::; Variant 1
NesPrgRom:39692-39693:Metasprite_56:
NesPrgRom:39694-39697::; Variant 0
NesPrgRom:396b0-396b3::; Variant 1
NesPrgRom:396cc-396cd:Metasprite_57:
NesPrgRom:396ce-396d1::; Variant 0
NesPrgRom:396e6-396e9::; Variant 1
NesPrgRom:396fe-396ff:Metasprite_58:; weretiger walking up
NesPrgRom:39700-39703::; Variant 0
NesPrgRom:39718-3971b::; Variant 1
NesPrgRom:39730-39731:Metasprite_59:; weretiger walking right
NesPrgRom:39732-39735::; Variant 0
NesPrgRom:3974a-3974d::; Variant 1
NesPrgRom:39762-39763:Metasprite_5a:; weretiger walking down
NesPrgRom:39764-39767::; Variant 0
NesPrgRom:3977c-3977f::; Variant 1
NesPrgRom:39794:Metasprite_5b:; weretiger walking left
NesPrgRom:39797-39798:Metasprite_64:; slime, jelly\\n; Variant 0
NesPrgRom:397a9-397ac::; Variant 1
NesPrgRom:397b9-397ba:Metasprite_65:
NesPrgRom:397bb-397be::; Variant 0
NesPrgRom:397df-397e2::; Variant 1
NesPrgRom:39803-39804:Metasprite_66:
NesPrgRom:39805-39808::; Variant 0
NesPrgRom:39829-3982c::; Variant 1
NesPrgRom:3984d-3984e:Metasprite_67:
NesPrgRom:3984f-39852::; Variant 0
NesPrgRom:39873-39876::; Variant 1
NesPrgRom:39897-3989a::; Variant 2
NesPrgRom:398bb-398be::; Variant 3
NesPrgRom:398df-398e0:Metasprite_68:
NesPrgRom:398e1-398e4::; Variant 0
NesPrgRom:398f9-398fc::; Variant 1
NesPrgRom:39911-39914::; Variant 2
NesPrgRom:39929-3992c::; Variant 3
NesPrgRom:39941-39942:Metasprite_69:
NesPrgRom:39943-39946::; Variant 0
NesPrgRom:3995b-3995e::; Variant 1
NesPrgRom:39973-39976::; Variant 2
NesPrgRom:3998b-3998e::; Variant 3
NesPrgRom:3999f-399a0:Metasprite_6a:
NesPrgRom:399a1-399a4::; Variant 0
NesPrgRom:399a9-399ac::; Variant 1
NesPrgRom:399b1-399b2:Metasprite_6b:
NesPrgRom:399b3-399b6::; Variant 0
NesPrgRom:399cf-399d2::; Variant 1
NesPrgRom:399eb-399ec:Metasprite_60:
NesPrgRom:399ed-399f0::; Variant 0
NesPrgRom:39a11-39a14::; Variant 1
NesPrgRom:39a35-39a36:Metasprite_61:
NesPrgRom:39a37-39a3a::; Variant 0
NesPrgRom:39a5b-39a5e::; Variant 1
NesPrgRom:39a7f-39a80:Metasprite_62:
NesPrgRom:39a81-39a84::; Variant 0
NesPrgRom:39aa5-39aa8::; Variant 1
NesPrgRom:39ac9:Metasprite_63:
NesPrgRom:39acc-39acd:Metasprite_98:
NesPrgRom:39ace-39ad1::; Variant 0
NesPrgRom:39ae6-39ae9::; Variant 1
NesPrgRom:39afe-39aff:Metasprite_5c:
NesPrgRom:39b00-39b03::; Variant 0
NesPrgRom:39b20-39b23::; Variant 1
NesPrgRom:39b40-39b41:Metasprite_5d:
NesPrgRom:39b42-39b45::; Variant 0
NesPrgRom:39b62-39b65::; Variant 1
NesPrgRom:39b82-39b83:Metasprite_5e:
NesPrgRom:39b84-39b87::; Variant 0
NesPrgRom:39ba4-39ba7::; Variant 1
NesPrgRom:39bc4:Metasprite_5f:
NesPrgRom:39bc7-39bc8:Metasprite_52:
NesPrgRom:39bc9-39bcc::; Variant 0
NesPrgRom:39bf5-39bf8::; Variant 1
NesPrgRom:39c21-39c22:Metasprite_6c:
NesPrgRom:39c23-39c26::; Variant 0
NesPrgRom:39c43-39c46::; Variant 1
NesPrgRom:39c63-39c64:Metasprite_6d:
NesPrgRom:39c65-39c68::; Variant 0
NesPrgRom:39c85-39c88::; Variant 1
NesPrgRom:39ca5-39ca6:Metasprite_6e:
NesPrgRom:39ca7-39caa::; Variant 0
NesPrgRom:39cc7-39cca::; Variant 1
NesPrgRom:39ce7:Metasprite_6f:
NesPrgRom:39cea-39ceb:Metasprite_70:
NesPrgRom:39cec-39cef::; Variant 0
NesPrgRom:39d08-39d0b::; Variant 1
NesPrgRom:39d24-39d25:Metasprite_71:
NesPrgRom:39d26-39d29::; Variant 0
NesPrgRom:39d4e-39d51::; Variant 1
NesPrgRom:39d76-39d77:Metasprite_72:
NesPrgRom:39d78-39d7b::; Variant 0
NesPrgRom:39d90-39d93::; Variant 1
NesPrgRom:39da8:Metasprite_73:
NesPrgRom:39dab-39dac:Metasprite_74:
NesPrgRom:39dad-39db0::; Variant 0
NesPrgRom:39dcd-39dd0::; Variant 1
NesPrgRom:39ded-39dee:Metasprite_75:
NesPrgRom:39def-39df2::; Variant 0
NesPrgRom:39e0f-39e12::; Variant 1
NesPrgRom:39e2f-39e30:Metasprite_76:
NesPrgRom:39e31-39e34::; Variant 0
NesPrgRom:39e51-39e54::; Variant 1
NesPrgRom:39e71:Metasprite_77:
NesPrgRom:39e74-39e75:Metasprite_90:
NesPrgRom:39e76-39e79::; Variant 0
NesPrgRom:39e8e-39e91::; Variant 1
NesPrgRom:39ea2-39ea3:Metasprite_91:
NesPrgRom:39ea4-39ea7::; Variant 0
NesPrgRom:39ed0-39ed3::; Variant 1
NesPrgRom:39efc-39eff::; Variant 2
NesPrgRom:39f28-39f2b::; Variant 3
NesPrgRom:39f50-39f51:Metasprite_8c:
NesPrgRom:39f52-39f55::; Variant 0
NesPrgRom:39f72-39f75::; Variant 1
NesPrgRom:39f92-39f93:Metasprite_8d:
NesPrgRom:39f94-39f97::; Variant 0
NesPrgRom:39fb4-39fb7::; Variant 1
NesPrgRom:39fd4-39fd5:Metasprite_8e:
NesPrgRom:39fd6-39fd9::; Variant 0
NesPrgRom:39ff6-39ff9::; Variant 1
NesPrgRom:3a016:Metasprite_8f:
NesPrgRom:3a019-3a01a:Metasprite_92:
NesPrgRom:3a01b-3a01e::; Variant 0
NesPrgRom:3a03f-3a042::; Variant 1
NesPrgRom:3a063-3a064:Metasprite_78:
NesPrgRom:3a065-3a068::; Variant 0
NesPrgRom:3a089-3a08c::; Variant 1
NesPrgRom:3a0ad-3a0ae:Metasprite_79:
NesPrgRom:3a0af-3a0b2::; Variant 0
NesPrgRom:3a0d3-3a0d6::; Variant 1
NesPrgRom:3a0f7-3a0f8:Metasprite_7a:
NesPrgRom:3a0f9-3a0fc::; Variant 0
NesPrgRom:3a11d-3a120::; Variant 1
NesPrgRom:3a141:Metasprite_7b:
NesPrgRom:3a144-3a145:Metasprite_7c:
NesPrgRom:3a146-3a149::; Variant 0
NesPrgRom:3a16a-3a16b:Metasprite_7d:
NesPrgRom:3a16c-3a16f::; Variant 0
NesPrgRom:3a190-3a191:Metasprite_7e:
NesPrgRom:3a192-3a195::; Variant 0
NesPrgRom:3a1b6:Metasprite_7f:
NesPrgRom:3a1b9-3a1ba:Metasprite_94:
NesPrgRom:3a1bb-3a1be::; Variant 0
NesPrgRom:3a1df-3a1e0:Metasprite_95:
NesPrgRom:3a1e1-3a1e4::; Variant 0
NesPrgRom:3a1f1-3a1f4::; Variant 1
NesPrgRom:3a201-3a202:Metasprite_93:
NesPrgRom:3a203-3a206::; Variant 0
NesPrgRom:3a22f-3a232::; Variant 1
NesPrgRom:3a25b-3a25e::; Variant 2
NesPrgRom:3a287-3a28a::; Variant 3
NesPrgRom:3a2b3-3a2b4:Metasprite_97:
NesPrgRom:3a2b5-3a2b8::; Variant 0
NesPrgRom:3a2d5-3a2d8::; Variant 1
NesPrgRom:3a2f5-3a2f8::; Variant 2
NesPrgRom:3a315-3a318::; Variant 3
NesPrgRom:3a335-3a336:Metasprite_9b:
NesPrgRom:3a337-3a33a::; Variant 0
NesPrgRom:3a35b-3a35e::; Variant 1
NesPrgRom:3a37f-3a382::; Variant 2
NesPrgRom:3a3a3-3a3a6::; Variant 3
NesPrgRom:3a3b3-3a3b4:Metasprite_9c:
NesPrgRom:3a3b5-3a3b8::; Variant 0
NesPrgRom:3a3cd-3a3d0::; Variant 1
NesPrgRom:3a3e5-3a3e8::; Variant 2
NesPrgRom:3a3fd-3a400::; Variant 3
NesPrgRom:3a409-3a40a:Metasprite_9d:
NesPrgRom:3a40b-3a40e::; Variant 0
NesPrgRom:3a423-3a426::; Variant 1
NesPrgRom:3a43b-3a43e::; Variant 2
NesPrgRom:3a453-3a456::; Variant 3
NesPrgRom:3a46b-3a46e::; Variant 4
NesPrgRom:3a483-3a486::; Variant 5
NesPrgRom:3a49b-3a49e::; Variant 6
NesPrgRom:3a4b3-3a4b6::; Variant 7
NesPrgRom:3a4cb-3a4cc:Metasprite_9e:
NesPrgRom:3a4cd-3a4d0::; Variant 0
NesPrgRom:3a4d1-3a4d4::; Variant 1
NesPrgRom:3a4d5-3a4d6:Metasprite_80:
NesPrgRom:3a4d7-3a4da::; Variant 0
NesPrgRom:3a4eb-3a4ec:Metasprite_81:
NesPrgRom:3a4ed-3a4f0::; Variant 0
NesPrgRom:3a501-3a502:Metasprite_82:
NesPrgRom:3a503-3a506::; Variant 0
NesPrgRom:3a517:Metasprite_83:
NesPrgRom:3a51a-3a51b:Metasprite_9f:
NesPrgRom:3a51c-3a51f::; Variant 0
NesPrgRom:3a52c-3a52f::; Variant 1
NesPrgRom:3a53c-3a53d:Metasprite_a0:
NesPrgRom:3a53e-3a541::; Variant 0
NesPrgRom:3a546-3a549::; Variant 1
NesPrgRom:3a54e-3a551::; Variant 2
NesPrgRom:3a556-3a559::; Variant 3
NesPrgRom:3a55e-3a55f:Metasprite_a1:
NesPrgRom:3a560-3a563::; Variant 0
NesPrgRom:3a574-3a577::; Variant 1
NesPrgRom:3a588-3a58b::; Variant 2
NesPrgRom:3a59c-3a59f::; Variant 3
NesPrgRom:3a5b0-3a5b1:Metasprite_a2:
NesPrgRom:3a5b2-3a5b5::; Variant 0
NesPrgRom:3a5c2-3a5c5::; Variant 1
NesPrgRom:3a5d2-3a5d5::; Variant 2
NesPrgRom:3a5e2-3a5e5::; Variant 3
NesPrgRom:3a5f2-3a5f3:Metasprite_84:
NesPrgRom:3a5f4-3a5f7::; Variant 0
NesPrgRom:3a5fc-3a5fd:Metasprite_85:
NesPrgRom:3a5fe-3a601::; Variant 0
NesPrgRom:3a606-3a607:Metasprite_86:
NesPrgRom:3a608-3a60b::; Variant 0
NesPrgRom:3a610:Metasprite_87:
NesPrgRom:3a613-3a614:Metasprite_a3:
NesPrgRom:3a615-3a618::; Variant 0
NesPrgRom:3a625-3a628::; Variant 1
NesPrgRom:3a635-3a636:Metasprite_a4:
NesPrgRom:3a637-3a63a::; Variant 0
NesPrgRom:3a63f-3a642::; Variant 1
NesPrgRom:3a647-3a64a::; Variant 2
NesPrgRom:3a64f-3a652::; Variant 3
NesPrgRom:3a657-3a658:Metasprite_a5:
NesPrgRom:3a659-3a65c::; Variant 0
NesPrgRom:3a65d-3a65e:Metasprite_a6:
NesPrgRom:3a65f-3a662::; Variant 0
NesPrgRom:3a677-3a67a::; Variant 1
NesPrgRom:3a68f-3a692::; Variant 2
NesPrgRom:3a6a7-3a6aa::; Variant 3
NesPrgRom:3a6bf-3a6c0:Metasprite_99:
NesPrgRom:3a6c1-3a6c4::; Variant 0
NesPrgRom:3a6cd-3a6d0::; Variant 1
NesPrgRom:3a6d9-3a6dc::; Variant 2
NesPrgRom:3a6e5-3a6e8::; Variant 3
NesPrgRom:3a6f1-3a6f2:Metasprite_a8:
NesPrgRom:3a6f3-3a6f6::; Variant 0
NesPrgRom:3a6f7-3a6fa::; Variant 1
NesPrgRom:3a6fb-3a6fe::; Variant 2
NesPrgRom:3a6ff-3a702::; Variant 3
NesPrgRom:3a703-3a704:Metasprite_a9:
NesPrgRom:3a705-3a708::; Variant 0
NesPrgRom:3a715-3a718::; Variant 1
NesPrgRom:3a725-3a728::; Variant 2
NesPrgRom:3a735-3a738::; Variant 3
NesPrgRom:3a741-3a742:Metasprite_aa:
NesPrgRom:3a743-3a746::; Variant 0
NesPrgRom:3a753-3a754:Metasprite_ab:
NesPrgRom:3a755-3a758::; Variant 0
NesPrgRom:3a76d-3a770::; Variant 1
NesPrgRom:3a785-3a788::; Variant 2
NesPrgRom:3a79d-3a7a0::; Variant 3
NesPrgRom:3a7b5-3a7b6:Metasprite_ac:
NesPrgRom:3a7b7-3a7ba::; Variant 0
NesPrgRom:3a7cf-3a7d2::; Variant 1
NesPrgRom:3a7e7-3a7ea::; Variant 2
NesPrgRom:3a7ff-3a802::; Variant 3
NesPrgRom:3a817-3a81a::; Variant 4
NesPrgRom:3a82f-3a832::; Variant 5
NesPrgRom:3a847-3a84a::; Variant 6
NesPrgRom:3a85f-3a862::; Variant 7
NesPrgRom:3a877-3a878:Metasprite_a7:; Player shadow and shade/wraith shadow. Randomizer adds a new\\n; shade metasprite in the empty slot in 9a (and unused space at $88e3)
NesPrgRom:3a879-3a87c::; Variant 0
NesPrgRom:3a881-3a882:Metasprite_ae:
NesPrgRom:3a883-3a886::; Variant 0
NesPrgRom:3a8b7-3a8ba::; Variant 1
NesPrgRom:3a8eb-3a8ec:Metasprite_af:
NesPrgRom:3a8ed-3a8f0::; Variant 0
NesPrgRom:3a8fd-3a900::; Variant 1
NesPrgRom:3a90d-3a910::; Variant 2
NesPrgRom:3a91d-3a920::; Variant 3
NesPrgRom:3a92d-3a92e:Metasprite_b0:
NesPrgRom:3a92f-3a932::; Variant 0
NesPrgRom:3a95f-3a962::; Variant 1
NesPrgRom:3a98f-3a990:Metasprite_b1:
NesPrgRom:3a991-3a994::; Variant 0
NesPrgRom:3a9c1-3a9c2:Metasprite_b2:
NesPrgRom:3a9c3-3a9c6::; Variant 0
NesPrgRom:3a9e7-3a9ea::; Variant 1
NesPrgRom:3aa0b-3aa0e::; Variant 2
NesPrgRom:3aa2f-3aa32::; Variant 3
NesPrgRom:3aa53-3aa56::; Variant 4
NesPrgRom:3aa77-3aa78:Metasprite_b3:
NesPrgRom:3aa79-3aa7c::; Variant 0
NesPrgRom:3aab5-3aab8::; Variant 1
NesPrgRom:3aaf1-3aaf4::; Variant 2 - unused?
NesPrgRom:3aaf5-3aaf6:Metasprite_b4:
NesPrgRom:3aaf7-3aafa::; Variant 0
NesPrgRom:3ab53-3ab56::; Variant 1
NesPrgRom:3abaf-3abb2::; Variant 2
NesPrgRom:3ac0b-3ac0e::; Variant 3
NesPrgRom:3ac67-3ac68:Metasprite_b5:
NesPrgRom:3ac69-3ac6c::; Variant 0
NesPrgRom:3ac89-3ac8c::; Variant 1
NesPrgRom:3aca9-3acac::; Variant 2
NesPrgRom:3acc9-3accc::; Variant 3
NesPrgRom:3ace9-3acea:Metasprite_b6:
NesPrgRom:3aceb-3acee::; Variant 0
NesPrgRom:3ad2b-3ad2c:Metasprite_b7:
NesPrgRom:3ad2d-3ad30::; Variant 0
NesPrgRom:3ad81-3ad84::; Variant 1
NesPrgRom:3add5-3add8::; Variant 2
NesPrgRom:3ae29-3ae2c::; Variant 3
NesPrgRom:3ae7d-3ae7e:Metasprite_b8:
NesPrgRom:3ae7f-3ae82::; Variant 0
NesPrgRom:3aea3-3aea6::; Variant 1
NesPrgRom:3aec7-3aec8:Metasprite_b9:
NesPrgRom:3aec9-3aecc::; Variant 0
NesPrgRom:3af05-3af08::; Variant 1
NesPrgRom:3af41-3af42:Metasprite_ba:
NesPrgRom:3af43-3af46::; Variant 0
NesPrgRom:3af5b-3af5e::; Variant 1
NesPrgRom:3af73-3af76::; Variant 2
NesPrgRom:3af8b-3af8e::; Variant 3
NesPrgRom:3afa3-3afa4:Metasprite_bb:
NesPrgRom:3afa5-3afa8::; Variant 0
NesPrgRom:3afc9-3afcc::; Variant 1
NesPrgRom:3afed-3aff0::; Variant 2
NesPrgRom:3b011-3b014::; Variant 3
NesPrgRom:3b035-3b036:Metasprite_bc:
NesPrgRom:3b037-3b03a::; Variant 0
NesPrgRom:3b04f-3b052::; Variant 1
NesPrgRom:3b067-3b06a::; Variant 2
NesPrgRom:3b07f-3b082::; Variant 3
NesPrgRom:3b097-3b098:Metasprite_bd:
NesPrgRom:3b099-3b09c::; Variant 0
NesPrgRom:3b0a9-3b0aa:Metasprite_88:
NesPrgRom:3b0ab-3b0ae::; Variant 0
NesPrgRom:3b0bb-3b0be::; Variant 1
NesPrgRom:3b0cb:Metasprite_c2:
NesPrgRom:3b0ce-3b0cf:Metasprite_8a:
NesPrgRom:3b0d0-3b0d3::; Variant 0
NesPrgRom:3b0e8-3b0eb::; Variant 1
NesPrgRom:3b100-3b101:Metasprite_ef:
NesPrgRom:3b102-3b105::; Variant 0
NesPrgRom:3b122-3b125::; Variant 1
NesPrgRom:3b142-3b143:Metasprite_be:
NesPrgRom:3b144-3b147::; Variant 0
NesPrgRom:3b14c-3b14d:Metasprite_bf:
NesPrgRom:3b14e-3b151::; Variant 0
NesPrgRom:3b166-3b167:Metasprite_c0:
NesPrgRom:3b168-3b16b::; Variant 0
NesPrgRom:3b188-3b189:Metasprite_c1:
NesPrgRom:3b18a-3b18d::; Variant 0
NesPrgRom:3b1aa-3b1ab:Metasprite_8b:
NesPrgRom:3b1ac-3b1af::; Variant 0
NesPrgRom:3b1cc-3b1cf::; Variant 1
NesPrgRom:3b1ec:Metasprite_89:
NesPrgRom:3b1ef-3b1f0:Metasprite_96:
NesPrgRom:3b1f1-3b1f4::; Variant 0
NesPrgRom:3b20d-3b210::; Variant 1
NesPrgRom:3b229-3b22c::; Variant 2
NesPrgRom:3b245-3b246:Metasprite_c4:
NesPrgRom:3b247-3b24a::; Variant 0
NesPrgRom:3b257:Metasprite_c3:
NesPrgRom:3b25a-3b25b:Metasprite_c5:
NesPrgRom:3b25c-3b25f::; Variant 0
NesPrgRom:3b274-3b275:Metasprite_c6:
NesPrgRom:3b276-3b279::; Variant 0
NesPrgRom:3b282-3b285::; Variant 1
NesPrgRom:3b28e-3b291::; Variant 2
NesPrgRom:3b29a-3b29d::; Variant 3
NesPrgRom:3b2a6:Metasprite_c7:
NesPrgRom:3b2a9-3b2aa:Metasprite_c8:
NesPrgRom:3b2ab-3b2ae::; Variant 0
NesPrgRom:3b2bb-3b2be::; Variant 1
NesPrgRom:3b2cb-3b2cc:Metasprite_c9:
NesPrgRom:3b2cd-3b2d0::; Variant 0
NesPrgRom:3b2d9-3b2da:Metasprite_ca:
NesPrgRom:3b2db-3b2de::; Variant 0
NesPrgRom:3b31b-3b31e::; Variant 1
NesPrgRom:3b35b-3b35e::; Variant 2
NesPrgRom:3b39b-3b39e::; Variant 3
NesPrgRom:3b3db-3b3dc:Metasprite_cb:
NesPrgRom:3b3dd-3b3e0::; Variant 0
NesPrgRom:3b3f1-3b3f4::; Variant 1
NesPrgRom:3b405-3b408::; Variant 2
NesPrgRom:3b419-3b41c::; Variant 3
NesPrgRom:3b42d-3b430::; Variant 4
NesPrgRom:3b441-3b444::; Variant 5
NesPrgRom:3b455-3b458::; Variant 6
NesPrgRom:3b469-3b46c::; Variant 7
NesPrgRom:3b47d-3b47e:Metasprite_cc:
NesPrgRom:3b47f-3b482::; Variant 0
NesPrgRom:3b497-3b49a::; Variant 1
NesPrgRom:3b4af-3b4b0:Metasprite_cd:
NesPrgRom:3b4b1-3b4b4::; Variant 0
NesPrgRom:3b4d9-3b4dc::; Variant 1
NesPrgRom:3b501-3b502:Metasprite_ce:
NesPrgRom:3b503-3b506::; Variant 0
NesPrgRom:3b51b-3b51e::; Variant 1
NesPrgRom:3b533-3b536::; Variant 2
NesPrgRom:3b54b-3b54e::; Variant 3
NesPrgRom:3b563-3b566::; Variant 4
NesPrgRom:3b57b-3b57e::; Variant 5
NesPrgRom:3b593-3b596::; Variant 6
NesPrgRom:3b5ab-3b5ae::; Variant 7
NesPrgRom:3b5c3-3b5c4:Metasprite_cf:
NesPrgRom:3b5c5-3b5c8::; Variant 0
NesPrgRom:3b5e5-3b5e8::; Variant 1
NesPrgRom:3b605-3b606:Metasprite_d0:
NesPrgRom:3b607-3b60a::; Variant 0
NesPrgRom:3b62b-3b62e::; Variant 1
NesPrgRom:3b64f-3b652::; Variant 2
NesPrgRom:3b673-3b676::; Variant 3
NesPrgRom:3b697-3b698:Metasprite_d1:
NesPrgRom:3b699-3b69c::; Variant 0
NesPrgRom:3b6e5-3b6e6:Metasprite_d2:
NesPrgRom:3b6e7-3b6ea::; Variant 0
NesPrgRom:3b6f3-3b6f6::; Variant 1
NesPrgRom:3b6ff-3b700:Metasprite_ee:
NesPrgRom:3b701-3b704::; Variant 0
NesPrgRom:3b711-3b714::; Variant 1
NesPrgRom:3b721-3b724::; Variant 2
NesPrgRom:3b731-3b734::; Variant 3
NesPrgRom:3b741-3b742:Metasprite_d3:
NesPrgRom:3b743-3b746::; Variant 0
NesPrgRom:3b773-3b776::; Variant 1
NesPrgRom:3b7a3-3b7a4:Metasprite_d4:
NesPrgRom:3b7a5-3b7a8::; Variant 0
NesPrgRom:3b7d9-3b7da:Metasprite_d5:
NesPrgRom:3b7db-3b7de::; Variant 0
NesPrgRom:3b80b-3b80e::; Variant 1
NesPrgRom:3b83b-3b83c:Metasprite_d6:
NesPrgRom:3b83d-3b840::; Variant 0
NesPrgRom:3b841-3b844::; Variant 1
NesPrgRom:3b845-3b846:Metasprite_d7:
NesPrgRom:3b847-3b84a::; Variant 0
NesPrgRom:3b867-3b86a::; Variant 1
NesPrgRom:3b887-3b888:Metasprite_d8:
NesPrgRom:3b889-3b88c::; Variant 0
NesPrgRom:3b8a9-3b8ac::; Variant 1
NesPrgRom:3b8c9-3b8ca:Metasprite_d9:
NesPrgRom:3b8cb-3b8ce::; Variant 0
NesPrgRom:3b90b-3b90c:Metasprite_da:
NesPrgRom:3b90d-3b910::; Variant 0
NesPrgRom:3b911-3b914::; Variant 1
NesPrgRom:3b915-3b916:Metasprite_db:
NesPrgRom:3b917-3b91a::; Variant 0
NesPrgRom:3b947-3b948:Metasprite_dc:
NesPrgRom:3b949-3b94c::; Variant 0
NesPrgRom:3b979-3b97c::; Variant 1
NesPrgRom:3b9a9-3b9aa:Metasprite_dd:
NesPrgRom:3b9ab-3b9ae::; Variant 0
NesPrgRom:3b9bf-3b9c2::; Variant 1
NesPrgRom:3b9d3-3b9d6::; Variant 2
NesPrgRom:3b9e7-3b9ea::; Variant 3
NesPrgRom:3b9fb-3b9fc:Metasprite_de:
NesPrgRom:3b9fd-3ba00::; Variant 0
NesPrgRom:3ba2d-3ba2e:Metasprite_f1:
NesPrgRom:3ba2f-3ba32::; Variant 0
NesPrgRom:3ba47-3ba4a::; Variant 1
NesPrgRom:3ba5f-3ba62::; Variant 2
NesPrgRom:3ba77-3ba7a::; Variant 3
NesPrgRom:3ba8f-3ba90:Metasprite_f0:
NesPrgRom:3ba91-3ba94::; Variant 0
NesPrgRom:3baa1-3baa2:Metasprite_df:
NesPrgRom:3baa3-3baa6::; Variant 0
NesPrgRom:3bacf-3bad0:Metasprite_e0:
NesPrgRom:3bad1-3bad4::; Variant 0
NesPrgRom:3bb15-3bb18::; Variant 1
NesPrgRom:3bb59-3bb5a:Metasprite_e1:
NesPrgRom:3bb5b-3bb5e::; Variant 0
NesPrgRom:3bb73-3bb76::; Variant 1
NesPrgRom:3bb8b-3bb8e::; Variant 2
NesPrgRom:3bba3-3bba6::; Variant 3
NesPrgRom:3bbbb-3bbbc:Metasprite_e2:
NesPrgRom:3bbbd-3bbc0::; Variant 0
NesPrgRom:3bc09-3bc0a:Metasprite_e3:
NesPrgRom:3bc0b-3bc0e::; Variant 0
NesPrgRom:3bc23-3bc24:Metasprite_e4:
NesPrgRom:3bc25-3bc28::; Variant 0
NesPrgRom:3bc3d-3bc40::; Variant 1
NesPrgRom:3bc55-3bc56:Metasprite_e5:
NesPrgRom:3bc57-3bc5a::; Variant 0
NesPrgRom:3bc5b:Metasprite_e6:
NesPrgRom:3bc5e:Metasprite_e7:
NesPrgRom:3bc61-3bc62:Metasprite_e8:
NesPrgRom:3bc63-3bc66::; Variant 0
NesPrgRom:3bc7f-3bc80:Metasprite_e9:
NesPrgRom:3bc81-3bc84::; Variant 0
NesPrgRom:3bc9d-3bc9e:Metasprite_ea:
NesPrgRom:3bc9f-3bca2::; Variant 0
NesPrgRom:3bccf-3bcd2::; Variant 1
NesPrgRom:3bcff-3bd02::; Variant 2
NesPrgRom:3bd2f-3bd32::; Variant 3
NesPrgRom:3bd5f-3bd60:Metasprite_eb:
NesPrgRom:3bd61-3bd64::; Variant 0
NesPrgRom:3bd85-3bd88::; Variant 1
NesPrgRom:3bda9-3bdac::; Variant 2
NesPrgRom:3bdcd-3bdd0::; Variant 3
NesPrgRom:3bdf1-3bdf2:Metasprite_ec:
NesPrgRom:3bdf3-3bdf6::; Variant 0
NesPrgRom:3be03-3be06::; Variant 1
NesPrgRom:3be13-3be16::; Variant 2
NesPrgRom:3be23-3be26::; Variant 3
NesPrgRom:3be33-3be34:Metasprite_ed:
NesPrgRom:3be35-3be38::; Variant 0
NesPrgRom:3be75-3be78::; Variant 1
NesPrgRom:3beb5-3beb8::; Variant 2
NesPrgRom:3bef5-3bef8::; Variant 3
NesPrgRom:3bf35-3bf44::;; --------------------------------
NesPrgRom:3c000-3c007:PowersOfTwo:
NesPrgRom:3c008:UpdateEquipmentAndStatus:; Refreshes everything on a status or equipment change.\\n; This includes palettes for changing swords, pattern\\n; tables for mutation or change, updating NPC's dialog\\n; and behavior due to change magic, etc.
NesPrgRom:3c00b::8000 -> 34000
NesPrgRom:3c018::$3c01b
NesPrgRom:3c02d::$3c030
NesPrgRom:3c042::$3c045
NesPrgRom:3c05c::$3c060
NesPrgRom:3c063::"change" flags
NesPrgRom:3c06d::$3c073
NesPrgRom:3c071::$3c07d
NesPrgRom:3c085::$3c08a
NesPrgRom:3c08e::$3c100
NesPrgRom:3c0af::$3c0b3
NesPrgRom:3c0bd::$3c0c0
NesPrgRom:3c0c8::$3c0cc
NesPrgRom:3c0cd::$3c0d0
NesPrgRom:3c0d7::sword patterns
NesPrgRom:3c0e0::8000 -> 34000
NesPrgRom:3c0e8::$3c0ed
NesPrgRom:3c105::$3c10c
NesPrgRom:3c107:_3c107:
NesPrgRom:3c11e::$3c0da
NesPrgRom:3c121-3c124:DataTable_3c121:
NesPrgRom:3c125:StartAudioTrack:; TODO - figure out what these even are\\n; first stash y, then look at a.\\n; if it's >= #$80 but < #$a0 then AND it with #$7f\\n; if it's < #$20 and == $0102 then do nothing (already playing)\\n; save any other < #$20 in $0102\\n; $101 <- #$01\\n; if $100 != #$05 or $108 >= #$20\\n;   then write a to $103,y, where y=$100\\n; if $100 != #$05 then increment it\\n; restore registers and return\\n; FTR, $0100 is written here and $3f865 - both\\n; decrement it by one unless it's exactly 5 and\\n; certain circumstances align\\nlooks like maybe temp space?
NesPrgRom:3c12a::$3c13f  >=a0
NesPrgRom:3c12c::$3c13d   >=80 but <a0
NesPrgRom:3c130::$3c13f  >=20 but <80
NesPrgRom:3c132::Do we need to play a different music track?
NesPrgRom:3c135::$3c165
NesPrgRom:3c13a::$3c13f
NesPrgRom:3c149::$3c154
NesPrgRom:3c150::$3c160
NesPrgRom:3c169:WaitForOAMDMA:
NesPrgRom:3c17d:RemoveSpritesBehindMessageBox:
NesPrgRom:3c17f::fine Y offset of screen
NesPrgRom:3c188:ClearSpritesLessThanA:Second entrypoint used to remove all sprites by setting A = $f0\\n$10 <- #$58 - (ScreenYLo & #$07)
NesPrgRom:3c193::; spriteY <= 58-yf
NesPrgRom:3c19f:SetSprite0_F0:
NesPrgRom:3c1ae:_3c1ae:; This seems to run every frame of the 'start' status screen\\n; Also runs every frame of "change" menu.
NesPrgRom:3c1b4::$38000 -> $8000
NesPrgRom:3c203::$3c1bd
NesPrgRom:3c210:_3c210:
NesPrgRom:3c217::$3c21f
NesPrgRom:3c21a::$3c214
NesPrgRom:3c222-3c229:PowersOfTwoInReverse:
NesPrgRom:3c22a::;; --------------------------------\\n;; UNUSED
NesPrgRom:3c233::$3c239
NesPrgRom:3c237::$3c23b
NesPrgRom:3c246::$3c24b
NesPrgRom:3c24d::$3c256
NesPrgRom:3c25d:LoadOneObjectDataInternal:
NesPrgRom:3c261::$3c264
NesPrgRom:3c27b::$3c287
NesPrgRom:3c28b::$3c290
NesPrgRom:3c28d::; Start any associated audio track
NesPrgRom:3c2a7::$3c295
NesPrgRom:3c2ab::; if object id is #$ff then restore and return (why diff from #$01 above?)
NesPrgRom:3c2ad::$3c2b4
NesPrgRom:3c2af::; Bail out after zeroing if ID is $ff
NesPrgRom:3c2b7::$11 <- mnst[1] << 1
NesPrgRom:3c2bc::y = 2
NesPrgRom:3c2bd::$3c2c5
NesPrgRom:3c2c1::$0300,x <- mnst[1]80 ? mnst[y++]
NesPrgRom:3c2c7::$3c2cf
NesPrgRom:3c2cb::$0320,x <- mnst[1]40 ? mnst[y++]
NesPrgRom:3c2d1::$3c2d9
NesPrgRom:3c2d5::$0340,x <- mmst[1]20 ? mnst[y++]
NesPrgRom:3c2db::$3c2e3
NesPrgRom:3c2df::$0360,x <- mmst[1]10 ? mnst[y++]
NesPrgRom:3c2e5::$3c2ed
NesPrgRom:3c2e9::$0380,x <- mmst[1]8 ? mnst[y++]
NesPrgRom:3c2ef::$3c2f7
NesPrgRom:3c2f3::$03a0,x <- mmst[1]4 ? mnst[y++]
NesPrgRom:3c2f9::$3c301
NesPrgRom:3c2fd::$03c0,x <- mmst[1]2 ? mnst[y++]
NesPrgRom:3c303::$3c30b
NesPrgRom:3c307::$03e0,x <- mmst[1]1
NesPrgRom:3c30e::Next counter is just the next byte.
NesPrgRom:3c311::$3c319
NesPrgRom:3c315::$0400,x <- mnst[y']80 ? mnst[y++]
NesPrgRom:3c31b::$3c323
NesPrgRom:3c31f::$0420,x <- mnst[y']40 ? mnst[y++]
NesPrgRom:3c325::$3c32d
NesPrgRom:3c329::$0440,x <- mnst[y']20 ? mnst[y++]
NesPrgRom:3c32f::$3c337
NesPrgRom:3c333::$0460,x <- mnst[y']10 ? mnst[y++]
NesPrgRom:3c339::$3c341
NesPrgRom:3c33d::ObjectTimer,x <- mnst[y']20 ? mnst[y++]
NesPrgRom:3c343::$3c34b
NesPrgRom:3c34d::$3c355
NesPrgRom:3c357::$3c35f
NesPrgRom:3c365::$3c36d
NesPrgRom:3c36f::$3c377
NesPrgRom:3c379::$3c381
NesPrgRom:3c383::$3c38b
NesPrgRom:3c38d::$3c395
NesPrgRom:3c397::$3c39f
NesPrgRom:3c3a1::$3c3a9
NesPrgRom:3c3ab::$3c3b3
NesPrgRom:3c3b9::$3c3c1
NesPrgRom:3c3c3::$3c3cb
NesPrgRom:3c3cd::$3c3d5
NesPrgRom:3c3d7::$3c3df
NesPrgRom:3c3e1::$3c3e9
NesPrgRom:3c3eb::$3c3f3
NesPrgRom:3c3f5::$3c3fd
NesPrgRom:3c3ff::$3c406
NesPrgRom:3c40e:BankSwitch16k:; Swap in the 16k bank number in register A.
NesPrgRom:3c418:BankSwitch8k_8000:; Swap in the 8k bank number in register A.\\n; May run during IRQ.
NesPrgRom:3c427:BankSwitch8k_a000:; Swap in the 8k bank number in register A.\\n; May run during IRQ.
NesPrgRom:3c436:EnableNMI:
NesPrgRom:3c43e:DisableNMI:
NesPrgRom:3c446:DisableRendering:
NesPrgRom:3c450:EnableRendering:
NesPrgRom:3c45a:DisableBackgroundRendering:
NesPrgRom:3c464:EnableBackgroundRendering:
NesPrgRom:3c46e:DisableSpriteRendering:
NesPrgRom:3c478:EnableSpriteRendering:
NesPrgRom:3c482:StageNametableWriteFromTable:
NesPrgRom:3c48b::; Shift left twice (multiply by four) and then add to original value\\n; aka multiply by 5. This is a 16 bit multiply (upper bits in $26)
NesPrgRom:3c49d::; If we overflowed on the addition, add one to $26\\n$3c4a1
NesPrgRom:3c4ac::; At this point, $25,$26 = 5*A + #$c518\\n; We needed to multiply A by 5 to get the correct offset into the table\\n; Now load the header information into $20...$24\\n; The values $20, $21, $22, $23 directly correspond to the parameters\\n; used in the nametablebuffer header (See WriteNametableDataToPpu)
NesPrgRom:3c4b6::$3c4ae
NesPrgRom:3c4b8::; $25 gets the low 7 bits of $24...?
NesPrgRom:3c4c1::; Write the first four bytes from the data table to $6200,x
NesPrgRom:3c4d7::; Update $b
NesPrgRom:3c4df::; Check the PPUMASK - if rendering is disabled (both bg and sprites)\\n; then do an immediate write - not sure how this happens, but it does.
NesPrgRom:3c4e3::$3c4e8
NesPrgRom:3c4ef::$3c4f3
NesPrgRom:3c4f4::; A = max(#$20, $22) - this is a single row; add to $21$20 (bigendian)
NesPrgRom:3c4f8::$3c4fc
NesPrgRom:3c505::$3c50a
NesPrgRom:3c50c::$3c4be
NesPrgRom:3c510::$3c515
NesPrgRom:3c518-3c51c:NametablePrecomputedHeaderTable:00 Top row of === on the status bar
NesPrgRom:3c51d-3c521::01 Bot row of === on the status bar
NesPrgRom:3c522-3c526::02
NesPrgRom:3c527-3c52b::03 Dyna, others???
NesPrgRom:3c52c-3c530::04
NesPrgRom:3c531-3c535::05
NesPrgRom:3c536-3c53a::06
NesPrgRom:3c53b-3c53f::07
NesPrgRom:3c540-3c544::08
NesPrgRom:3c545-3c549::09
NesPrgRom:3c54a-3c54e::0a
NesPrgRom:3c54f-3c553::0b
NesPrgRom:3c554-3c558::0c
NesPrgRom:3c559-3c55d::0d
NesPrgRom:3c55e-3c562::0e
NesPrgRom:3c563-3c567::0f
NesPrgRom:3c568-3c56c::10
NesPrgRom:3c56d-3c571::11
NesPrgRom:3c572-3c576::12
NesPrgRom:3c577-3c57b::13
NesPrgRom:3c57c-3c580::14
NesPrgRom:3c581-3c585::15
NesPrgRom:3c586-3c58a::16
NesPrgRom:3c58b-3c58f::17
NesPrgRom:3c590-3c594::18
NesPrgRom:3c595-3c599::19
NesPrgRom:3c59a-3c59e::1a
NesPrgRom:3c59f-3c5a3::1b
NesPrgRom:3c5a4-3c5a8::1c
NesPrgRom:3c5a9-3c5ad::1d
NesPrgRom:3c5ae-3c5b2::1e
NesPrgRom:3c5b3-3c5b7::1f
NesPrgRom:3c5b8-3c5bc::20 Leaf warp
NesPrgRom:3c5bd-3c5c1::21 Brynmaer warp
NesPrgRom:3c5c2-3c5c6::22 Oak warp
NesPrgRom:3c5c7-3c5cb::23 Nadare warp
NesPrgRom:3c5cc-3c5d0::24 Portoa warp
NesPrgRom:3c5d1-3c5d5::25 Amazones warp
NesPrgRom:3c5d6-3c5da::26 Joel warp
NesPrgRom:3c5db-3c5df::27 Swan warp
NesPrgRom:3c5e0-3c5e4::28 Shyron warp
NesPrgRom:3c5e5-3c5e9::29 Goa warp
NesPrgRom:3c5ea-3c5ee::2a Sahara warp
NesPrgRom:3c5ef-3c5f3::2b
NesPrgRom:3c5f4-3c5f8::2c
NesPrgRom:3c5f9-3c5fd::2d
NesPrgRom:3c5fe-3c602::2e
NesPrgRom:3c603-3c607::2f
NesPrgRom:3c608-3c60c::30
NesPrgRom:3c60d-3c611::31
NesPrgRom:3c612-3c616::32
NesPrgRom:3c617-3c61b::33
NesPrgRom:3c61c-3c620::34
NesPrgRom:3c621-3c625::35
NesPrgRom:3c626-3c62a::36
NesPrgRom:3c62b-3c62f::37
NesPrgRom:3c630-3c634::38
NesPrgRom:3c635-3c639::39
NesPrgRom:3c63a-3c63e::3a
NesPrgRom:3c63f-3c643::3b
NesPrgRom:3c644-3c648::3c
NesPrgRom:3c649-3c64d::3d
NesPrgRom:3c64e-3c652::3e Dyna
NesPrgRom:3c653-3c657::3f Dyna
NesPrgRom:3c658-3c65c::40 Dyna
NesPrgRom:3c65d-3c661::41 Dyna
NesPrgRom:3c662-3c666::42 Dyna
NesPrgRom:3c667-3c66b::43 Dyna
NesPrgRom:3c66c-3c670::44
NesPrgRom:3c671-3c675::45
NesPrgRom:3c676:WaitForNametableFlush:
NesPrgRom:3c681::$3c67c -> rts
NesPrgRom:3c683::; Check bit 40 of $6200,x to see if we're writing a horizontal\\n; (clear) or vertical (set) strip to the nametable.  Fix the\\n; 04 bit of $0 and write it to PPUCTRL.
NesPrgRom:3c68a::#~$04
NesPrgRom:3c68e::$3c692
NesPrgRom:3c695::; Write the next 14 bits to PPUADDR (the c0 bits are mirrored out)
NesPrgRom:3c6a0::; This looks like it's doing some sort of run-length encoding?
NesPrgRom:3c6a8::; Mark this buffer as clear. If bit 7 of $6202 is set, then\\n; write from the memory in $6100 instead
NesPrgRom:3c6af::$3c6e7
NesPrgRom:3c6b9::$3c6d9
NesPrgRom:3c6c3::$3c6d9
NesPrgRom:3c6cd::$3c6d9
NesPrgRom:3c6d7::$3c6b1
NesPrgRom:3c6e4::$3c67d
NesPrgRom:3c71f::$3c6e9
NesPrgRom:3c721::; Bump the read offset
NesPrgRom:3c730::$3c72b
NesPrgRom:3c736::$3c72d
NesPrgRom:3c739:RequestAttributeTable0Write:; This requests an update to NT0's attribute table, reading from $6100.\\n; It seems to run any time the screen redraws or scrolls
NesPrgRom:3c751::; Bump the write offset for the nametable buffer
NesPrgRom:3c75c:_3c75c:; Look for a map flag?
NesPrgRom:3c786::$3c778
NesPrgRom:3c7a0:LoadSegments_1a_1b:
NesPrgRom:3c7a5:LoadMapData_A:; Given A, loads the A-th mapdata table for the current location
NesPrgRom:3c7af::$8300 but page set to $#5 immediately above
NesPrgRom:3c7b9::$3c7c5
NesPrgRom:3c7c6::; At this point the address of the A-th table is in $10, so ($10),y is data[A][y]
NesPrgRom:3c7d6:_3c7d6:
NesPrgRom:3c7e0::$3c7d8
NesPrgRom:3c7f0::$3c7ee
NesPrgRom:3c7f3::$3c7ee
NesPrgRom:3c809::$3c801
NesPrgRom:3c80c:_3c80c:
NesPrgRom:3c818::$3c816
NesPrgRom:3c822::$3c820
NesPrgRom:3c825::$3c820
NesPrgRom:3c831:DrawFullScreenByUsingVerticalScroll:
NesPrgRom:3c841::8000 -> 34000
NesPrgRom:3c856::$3c83e
NesPrgRom:3c861::$3c864
NesPrgRom:3c867:_3c867:
NesPrgRom:3c871::$3c86b
NesPrgRom:3c874:ClearBackgroundPaletteAndAttributes:; I'm assuming the $0f palette is all black.
NesPrgRom:3c882::$3c87b
NesPrgRom:3c88a::$3c886
NesPrgRom:3c894::$3c88e
NesPrgRom:3c896::write #$40 bytes $6000 -> v$23c0 (attr0)
NesPrgRom:3c89e:_3c89e:
NesPrgRom:3c8a2::$3c8a8
NesPrgRom:3c8a9:_3c8a9:
NesPrgRom:3c8ad::$3c8a8
NesPrgRom:3c8b2:ImmediateWriteNametableDataToPpu:
NesPrgRom:3c8b5::Disable NMI
NesPrgRom:3c8c0-3c8cf::;; --------------------------------\\n; NOTE This looks like four rows of text, more or less, including\\n; "eveal", "enjoy", "destroy", "'s finest four." It does not appear\\n; to be covered.
NesPrgRom:3c900:MainLoop:
NesPrgRom:3c91d::Note this is actually unconditional
NesPrgRom:3c91f-3c920:MainLoopJumpTable:
NesPrgRom:3c931:MainLoopJump_02_PrepareTitleScreen:
NesPrgRom:3c939:MainLoopJump_03_TitleScreen:
NesPrgRom:3c944:MainLoopJump_04_PrepareEndingSequence:
NesPrgRom:3c94c:MainLoopJump_05_EndingSequence:
NesPrgRom:3c957:MainLoopJump_00_PrepareGame:
NesPrgRom:3c95f::$3c95b
NesPrgRom:3c96b::$3c964
NesPrgRom:3c982::Initialize Next=30
NesPrgRom:3c9da:MainLoopJump_08_ContinueGame:
NesPrgRom:3c9dd::A000 -> 2E000
NesPrgRom:3c9eb::8000 -> 24000
NesPrgRom:3c9f3::Also GAME_MODE_CHANGE_LOCATION
NesPrgRom:3c9ff:PopulateInitialObjects:
NesPrgRom:3ca07::$3ca03
NesPrgRom:3ca19::$3ca27
NesPrgRom:3ca23::$3ca14
NesPrgRom:3ca26-3ca2d:InitialObjectsTable:
NesPrgRom:3ca2e:MainGameModeJump_01_LocationChange:
NesPrgRom:3ca31::8000 -> 34000
NesPrgRom:3ca36::object = player
NesPrgRom:3ca3b::update $380,x
NesPrgRom:3ca42::display mode normal
NesPrgRom:3ca4a::remove "slow" bit from player
NesPrgRom:3ca53::check exit type
NesPrgRom:3ca59::$3ca5e ; most types just return back to the main loop
NesPrgRom:3ca5b::warp skip the holding pattern
NesPrgRom:3ca5f:MainGameModeJump_00_Initialize:8000 -> 24000
NesPrgRom:3ca6a::8000 -> 34000
NesPrgRom:3caac::$3cab5
NesPrgRom:3cab5::; ----
NesPrgRom:3cab6:MainLoopJump_01_Game:
NesPrgRom:3caba::$3cac3
NesPrgRom:3cabe::$3cac3
NesPrgRom:3cade-3cadf:MainGameModeJumpTable:; The bank for these addresses is given by the same offset in $3cb2e\\n; Most are in the fixed bank, so it loads 0, but some are in banks\\n; 9 and 7.
NesPrgRom:3cae4-3cae5::b900 (16k page 09)
NesPrgRom:3cae6-3cae7::(subset of 8 it looks like)
NesPrgRom:3caea-3caeb::"Status recovered", warp message
NesPrgRom:3caee-3caef::(includes start menu, oddly)
NesPrgRom:3caf6-3caf7::0c bc40 (16k page 07)
NesPrgRom:3caf8-3caf9::bddb (16k page 07)
NesPrgRom:3cb0a-3cb0b::related to telepathy, but never used directly
NesPrgRom:3cb0e-3cb0f::bb39 (16k page 09)
NesPrgRom:3cb10-3cb11::bb9d (16k page 09)
NesPrgRom:3cb12-3cb13::bc04 (16k page 09)
NesPrgRom:3cb14-3cb15::bc6b (16k page 09)
NesPrgRom:3cb16-3cb17::"Magic power too low" message
NesPrgRom:3cb1a-3cb1b::bdf2 (16k page 09)
NesPrgRom:3cb1e-3cb1f::(mode 8->20->1->8)
NesPrgRom:3cb2e:MainGameModeJumpBank:00
NesPrgRom:3cb2f::01
NesPrgRom:3cb30::02
NesPrgRom:3cb31::03 ($09)
NesPrgRom:3cb32::04
NesPrgRom:3cb33::05
NesPrgRom:3cb34::06
NesPrgRom:3cb35::07
NesPrgRom:3cb36::08
NesPrgRom:3cb37::09
NesPrgRom:3cb38::0a
NesPrgRom:3cb39::0b
NesPrgRom:3cb3a::0c ($07)
NesPrgRom:3cb3b::0d ($07)
NesPrgRom:3cb3c::0e
NesPrgRom:3cb3d::0f
NesPrgRom:3cb3e::10
NesPrgRom:3cb3f::11
NesPrgRom:3cb40::12
NesPrgRom:3cb41::13
NesPrgRom:3cb42::14
NesPrgRom:3cb43::15
NesPrgRom:3cb44::16
NesPrgRom:3cb45::17
NesPrgRom:3cb46::18 ($09)
NesPrgRom:3cb47::19 ($09)
NesPrgRom:3cb48::1a ($09)
NesPrgRom:3cb49::1b ($09)
NesPrgRom:3cb4a::1c
NesPrgRom:3cb4b::1d
NesPrgRom:3cb4c::1e ($09)
NesPrgRom:3cb4d::1f
NesPrgRom:3cb4e::20
NesPrgRom:3cb4f::21
NesPrgRom:3cb50::22
NesPrgRom:3cb51::23
NesPrgRom:3cb52::24
NesPrgRom:3cb53::25
NesPrgRom:3cb54::26
NesPrgRom:3cb55::27
NesPrgRom:3cb62:MainGameModeJump_08_Normal:
NesPrgRom:3cb84:CheckForPlayerDeath:
NesPrgRom:3cb8d::double-return
NesPrgRom:3cb90:CheckForStartMenu:; ----
NesPrgRom:3cb96::; Trigger the start menu
NesPrgRom:3cb9d::$3cba3
NesPrgRom:3cb9f::special case for dyna's room
NesPrgRom:3cbaf::$3cb8f
NesPrgRom:3cbb1::special code for dyna's room
NesPrgRom:3cbb4:CheckForSelectMenu:; ----
NesPrgRom:3cbbe::double-return
NesPrgRom:3cbc1:CheckForController2Buttons:; ----
NesPrgRom:3cbc9::check A and B both pressed
NesPrgRom:3cbd3::; Wild Warp
NesPrgRom:3cbec-3cbfb:WildWarpLocations:
NesPrgRom:3cbfc:MainGameModeJump_04:; Looks like pause from ctrl2-B.
NesPrgRom:3cc17:MainGameModeJump_1c_ErrorMessage:
NesPrgRom:3cc2e:_3cc2e:
NesPrgRom:3cc44::TODO - what is screen mode 2? uncovered...
NesPrgRom:3cc4d:MainGameModeJump_1f_DynaAppears:
NesPrgRom:3cc8b::$3cc87
NesPrgRom:3cc96::$3cc8f
NesPrgRom:3cc98::2 full rows, $6060 -> nt2 r24
NesPrgRom:3ccab::$3cca4
NesPrgRom:3ccad::; This loop makes 6 calls to StageNametableWriteFromTable\\n;   3e 2 rows of 6, $6000 -> nt0 r6  c2  (20c2)\\n;   3f 2 rows of 6, $600c -> nt0 r6  c24 (20d8)\\n;   40 4 rows of 6, $6018 -> nt0 r10 c2  (2142)\\n;   41 4 rows of 6, $6030 -> nt0 r10 c24 (2158)\\n;   42 8 rows of 8, $6048 -> nt0 r6  c12 (20cc)\\n;   43 3 rows of 4, $6088 -> nt0 r14 c14 (21ce)\\n; All writes will flush.  This will probably take 23 frames?
NesPrgRom:3ccbc::$3ccb1
NesPrgRom:3cccc:_3cccc:
NesPrgRom:3ccd1:_3ccd1:; For each object...\\n$8000 -> $34000
NesPrgRom:3ccdb::$3cd31
NesPrgRom:3ccdd:_3ccdd:; Tick the "must wait to move" countdown timer 5a0,x\\n; If it ticks down to 0 then clear paralysis
NesPrgRom:3cce0::$3ccfa
NesPrgRom:3ccea::OBJTYPE_PERSON
NesPrgRom:3ccec::$3ccfa
NesPrgRom:3ccee::; Object is a person - clear paralysis
NesPrgRom:3ccff::ObjectUpdate_1A does not run???
NesPrgRom:3cd01::$3cd06
NesPrgRom:3cd21::$3cd28
NesPrgRom:3cd23::; Routines 60..6f are in a different page
NesPrgRom:3cd2b:_3cd2b:
NesPrgRom:3cd3c::$3cd74
NesPrgRom:3cd40::$3cd45
NesPrgRom:3cd48::$3cd74
NesPrgRom:3cd7f:_3cd7f:
NesPrgRom:3cd8a:_3cd8a:
NesPrgRom:3cdac::$3cdc0
NesPrgRom:3cdc2::$3cdd4
NesPrgRom:3cdd5:_3cdd5:
NesPrgRom:3cde1::$3ce06
NesPrgRom:3ce07:_3ce07:
NesPrgRom:3ce0f::$3ce0b
NesPrgRom:3ce12:_3ce12:
NesPrgRom:3ce28::$3ce39
NesPrgRom:3ce40::$3ceb0
NesPrgRom:3ce47::$3ceaf ; return immediately now if [1] is zero (last row)
NesPrgRom:3ce58::3rd byte from data table
NesPrgRom:3ce5f::$3ce69
NesPrgRom:3ce61::; Odd frames bail out to 34c0e instead (location palette)
NesPrgRom:3ce71::$3ce6d
NesPrgRom:3ce73::; Write straight #$30s back to all the non-background colors
NesPrgRom:3ce84::$3ce77
NesPrgRom:3ce89:_3ce89:
NesPrgRom:3cea8::$3ce8d
NesPrgRom:3ceb2::$3cee0
NesPrgRom:3cebb::$3cec0
NesPrgRom:3cedb::$3ceca
NesPrgRom:3cee2::$3cf13
NesPrgRom:3cf09::$3cef1
NesPrgRom:3cf17::$3cf1d
NesPrgRom:3cf28:_3cf28:
NesPrgRom:3cf47-3cf49:DataTable_3cf47:
NesPrgRom:3d085:MainGameModeJump_10_StatusMessage:
NesPrgRom:3d095::$3d0ae
NesPrgRom:3d09c::$3d0ae
NesPrgRom:3d0a6::Level up sfx
NesPrgRom:3d0ab::$3d0b3
NesPrgRom:3d0c8:MainGameModeJump_11_Dialog:
NesPrgRom:3d0d3::$3d100
NesPrgRom:3d0d5::; 5a0 is a nonzero countdown timer if the object is paralyzed.
NesPrgRom:3d0d8::Only do the following check on townspeople?
NesPrgRom:3d0da::$3d0f3
NesPrgRom:3d0e1::$3d100
NesPrgRom:3d0e5::$3d100
NesPrgRom:3d0e9::$3d100
NesPrgRom:3d0eb::Kensu in Swan tavern
NesPrgRom:3d0ed::$3d100
NesPrgRom:3d0ef::Kensu in Swan dance hall
NesPrgRom:3d0f1::$3d100
NesPrgRom:3d10d::0..31 from high 5 bits of first byte of dialog
NesPrgRom:3d113::low $15 $2a000, high $16 $2c000 or $18 $30000
NesPrgRom:3d116::$3d123
NesPrgRom:3d11b::$3d124
NesPrgRom:3d123-3d124:DialogFollowupActionJump:
NesPrgRom:3d125-3d126::01
NesPrgRom:3d127-3d128::02 disappear
NesPrgRom:3d129-3d12a::03 learn refresh
NesPrgRom:3d12d-3d12e::05
NesPrgRom:3d12f-3d130::06
NesPrgRom:3d131-3d132::07
NesPrgRom:3d133-3d134::08
NesPrgRom:3d135-3d136::09
NesPrgRom:3d137-3d138::0a
NesPrgRom:3d13b-3d13c::0c
NesPrgRom:3d13d-3d13e::0d
NesPrgRom:3d143-3d144::10
NesPrgRom:3d145-3d146::11
NesPrgRom:3d149-3d14a::13
NesPrgRom:3d14b-3d14c::14
NesPrgRom:3d14d-3d14e::15
NesPrgRom:3d14f-3d150::16
NesPrgRom:3d151-3d152::17 healed by wise men in fortress?
NesPrgRom:3d153-3d154::18
NesPrgRom:3d155-3d156::19
NesPrgRom:3d157-3d158::1a get ball of water
NesPrgRom:3d159-3d15a::1b ejected from lime tree ??
NesPrgRom:3d163:DialogFollowupActionJump_Noop:
NesPrgRom:3d164:DialogFollowupActionJump_05:; kensu slime
NesPrgRom:3d16d:DialogFollowupActionJump_17_HealPlayerAndDisappear:
NesPrgRom:3d186::MP
NesPrgRom:3d18e:DialogFollowupActionJump_14:
NesPrgRom:3d196::;; --------------------------------\\n;; UNUSED?!? - repurpose for WriteObjectCoordinatesAndLoadObjectData
NesPrgRom:3d19c:DialogFollowupActionJump_01:
NesPrgRom:3d1b5:DialogFollowupActionJump_13:
NesPrgRom:3d1ca:DialogFollowupActionJump_16:
NesPrgRom:3d1eb:DialogFollowupActionJump_10:; NPC reveals change magic when talked to (asina and kensu)
NesPrgRom:3d1ff:_3d1ff:
NesPrgRom:3d21d:DialogFollowupActionJump_11:; Give an item (from $6a0,y), which is the 2nd byte
NesPrgRom:3d225:DialogFollowupActionJump_03:; Give an item (from $680,y)
NesPrgRom:3d22b:GrantItemInRegisterA:
NesPrgRom:3d23f:DialogFollowupActionJump_06:; NPC walks away (treasure hunter)?
NesPrgRom:3d25a:DialogFollowupActionJump_0c:; Dwarf child starts following?
NesPrgRom:3d263:DialogFollowupActionJump_09:; Talk to Zebu student
NesPrgRom:3d268::give 100 gold
NesPrgRom:3d271::$3d276
NesPrgRom:3d27b::Money
NesPrgRom:3d280:DialogFollowupActionJump_18:
NesPrgRom:3d285::8000 -> 34000
NesPrgRom:3d2ae:DialogFollowupActionJump_19:; Give shield ring then walk out
NesPrgRom:3d2b0::hard-code rather than $680,x
NesPrgRom:3d2d3:DialogFollowupActionJump_15:
NesPrgRom:3d2d8::$3d2f3
NesPrgRom:3d2f4:DialogFollowupActionJump_0a:
NesPrgRom:3d317::"Boss ID" 3 (since rage has no chest)
NesPrgRom:3d31c:DialogFollowupActionJump_02_Disappear:
NesPrgRom:3d31f:_3d31f:
NesPrgRom:3d336:DialogFollowupActionJump_1a:
NesPrgRom:3d341:DialogFollowupActionJump_1b:
NesPrgRom:3d347:LoadAndShowDialog:
NesPrgRom:3d354:WaitForDialogToBeDismissedInternal:
NesPrgRom:3d36d::$3d371
NesPrgRom:3d37d::$3d382
NesPrgRom:3d38c::$3d38a
NesPrgRom:3d39b::$3d3a0
NesPrgRom:3d3a4::$3d38a
NesPrgRom:3d3b5::$3d3aa
NesPrgRom:3d3c2:RotateMessagePartAndIndex:@@@@@
NesPrgRom:3d3da:SpawnMimic:
NesPrgRom:3d3eb:MainGameModeJump_07_TriggerSquareOrTreasureChest:; Note this includes treasure chests
NesPrgRom:3d3f6::$3d3fb
NesPrgRom:3d3f8::$3d539
NesPrgRom:3d3ff::ItemGet
NesPrgRom:3d401::$3d834 ; ultimately calls ItemGet
NesPrgRom:3d411::non-unique checks (>= $50) indirect via the table
NesPrgRom:3d413::$3d41c
NesPrgRom:3d421::magic (anything that's $4x) gets a fanfare
NesPrgRom:3d423::$3d435
NesPrgRom:3d432::$3d43a
NesPrgRom:3d458::ItemGet message action
NesPrgRom:3d45b::;; --------------------------------
NesPrgRom:3d45c-3d46b:DataTable_3d45c:
NesPrgRom:3d47c:HandleTreasureChest_TooManyItems:; Only give a message every 16 frames.
NesPrgRom:3d480::$3d45b
NesPrgRom:3d497:MainGameModeJump_06_ItemUseMessage:; Includes status recovery, health, and warp boot town selection
NesPrgRom:3d49c::$3d4ac
NesPrgRom:3d4a1::$3d4ac
NesPrgRom:3d4b6::$3d4c8
NesPrgRom:3d4bb::$3d4c3
NesPrgRom:3d4c1::$3d4c8
NesPrgRom:3d4cf::; Use warp boots, but not while changed
NesPrgRom:3d4d2::$3d4d9
NesPrgRom:3d4e2::$3d4e7
NesPrgRom:3d4e4::; didn't go anywhere\\n$3d45b
NesPrgRom:3d4f2:ItemUse_Main:
NesPrgRom:3d4f7::$3d501
NesPrgRom:3d4fb::$3d501
NesPrgRom:3d4ff::$3d506
NesPrgRom:3d51a::ItemUse
NesPrgRom:3d51c::$3d834
NesPrgRom:3d51f::Was the item used successfully?
NesPrgRom:3d521::$3d526
NesPrgRom:3d523::ItemUse message action
NesPrgRom:3d526:ItemUseError:
NesPrgRom:3d539:ActivateTriggerSquare:
NesPrgRom:3d53f::Trigger
NesPrgRom:3d541::$3d834
NesPrgRom:3d546::$3d54b
NesPrgRom:3d548::; condition was met\\nTrigger message action
NesPrgRom:3d552:ExecuteItemOrTriggerAction:
NesPrgRom:3d563-3d564:ItemOrTriggerActionJump:00 noop (rts)
NesPrgRom:3d565-3d566::01 thunder sword get -> teleport
NesPrgRom:3d567-3d568::02 heal dolphin
NesPrgRom:3d56b-3d56c::04 noop - use warp boots
NesPrgRom:3d56d-3d56e::05 noop - use opel statue (?)
NesPrgRom:3d56f-3d570::06 reload npcs - alarm flute, flute of lime
NesPrgRom:3d571-3d572::07
NesPrgRom:3d573-3d574::08 learn paralysis
NesPrgRom:3d575-3d576::09 use shell flute
NesPrgRom:3d577-3d578::0a use statue of gold
NesPrgRom:3d579-3d57a::0b learn barrier
NesPrgRom:3d57b-3d57c::0c use love pendant (learn change)
NesPrgRom:3d57d-3d57e::0d use kirisa plant
NesPrgRom:3d57f-3d580::0e use ivory statue
NesPrgRom:3d581-3d582::0f learn refresh
NesPrgRom:3d583-3d584::10 open a door (keys, eyeglasses)
NesPrgRom:3d585-3d586::11 unused?
NesPrgRom:3d587-3d588::12 unused?
NesPrgRom:3d589-3d58a::13 use bow of moon
NesPrgRom:3d58b-3d58c::14 use bow of sun
NesPrgRom:3d58d-3d58e::15
NesPrgRom:3d58f-3d590::16 sword get
NesPrgRom:3d591-3d592::17
NesPrgRom:3d593-3d594::18
NesPrgRom:3d595-3d596::19
NesPrgRom:3d597-3d598::1a rescue wise man unused?
NesPrgRom:3d599-3d59a::1b
NesPrgRom:3d59b-3d59c::1c return statue of onyx
NesPrgRom:3d59d-3d59e::1d
NesPrgRom:3d59f-3d5a0::1e
NesPrgRom:3d5a1-3d5a2::1f board boat
NesPrgRom:3d5a3:ItemOrTriggerActionJump_Noop:
NesPrgRom:3d5a4:ItemOrTriggerActionJump_01:; This runs when getting the Sword of Thunder and\\n; triggers a teleport back to Shyron Temple.
NesPrgRom:3d5d6:ItemOrTriggerActionJump_02:
NesPrgRom:3d5e6:ItemOrTriggerActionJump_07:; Play message from Mesia in shrine
NesPrgRom:3d61b::... and restore
NesPrgRom:3d62e:_3d62e:
NesPrgRom:3d63a:ItemOrTriggerActionJump_0a:
NesPrgRom:3d63f:DialogFollowupActionJump_08:
NesPrgRom:3d644::$3d652
NesPrgRom:3d653:ItemOrTriggerActionJump_04:
NesPrgRom:3d654:ItemOrTriggerActionJump_08:
NesPrgRom:3d659:ItemOrTriggerActionJump_09:
NesPrgRom:3d65c::$3d6a7
NesPrgRom:3d661::$3d6a7
NesPrgRom:3d669::$3d679
NesPrgRom:3d66f::$3d679
NesPrgRom:3d67e::$3d6a7
NesPrgRom:3d6a7::; ----
NesPrgRom:3d6a8-3d6ac:DolphinSpawnTable:;; The first four bytes are entrance coordinates (70,x .. d0,x).\\n;; The fifth byte is an index into the MovementScriptTable.\\n;; Indexed by either the last entrance ($6d) or else hardcoded\\n;; above for some locations ($64 and $68).\\n00 on boat
NesPrgRom:3d6ad-3d6b1::01 underground channel
NesPrgRom:3d6b2-3d6b6::02 evil spirit island
NesPrgRom:3d6bc-3d6c0::04 joel beach
NesPrgRom:3d6cb-3d6cf::07 swan beach
NesPrgRom:3d6d0-3d6d4::08 cabin
NesPrgRom:3d6d5:ItemOrTriggerActionJump_06:; reload NpcData for location
NesPrgRom:3d6d8:ItemOrTriggerActionJump_0b:
NesPrgRom:3d6dd:ItemOrTriggerActionJump_0c:
NesPrgRom:3d6e7:ItemOrTriggerActionJump_0d:
NesPrgRom:3d6ec:ItemOrTriggerActionJump_0e:
NesPrgRom:3d70d:ItemOrTriggerActionJump_0f:;  Learn refresh
NesPrgRom:3d718:ItemOrTriggerActionJump_13:
NesPrgRom:3d71d::$3d724 ; uncond
NesPrgRom:3d71f:ItemOrTriggerActionJump_14:
NesPrgRom:3d72c::action scripts
NesPrgRom:3d732::$3d745
NesPrgRom:3d734::; Both statues destroyed
NesPrgRom:3d736::explosion timer
NesPrgRom:3d745::; ----
NesPrgRom:3d746:ItemOrTriggerActionJump_15:; Begin fight with Draygon 2 (post Bow of Truth)\\nSFX_6B - unknown
NesPrgRom:3d74b::nothing?
NesPrgRom:3d75e:ItemOrTriggerActionJump_18:
NesPrgRom:3d78c:ItemOrTriggerActionJump_16:
NesPrgRom:3d791:ItemOrTriggerActionJump_17:
NesPrgRom:3d7b4::$3d7a6
NesPrgRom:3d7b7:ItemOrTriggerActionJump_19:
NesPrgRom:3d7be::$3d7c2
NesPrgRom:3d7c9::$3d7cd
NesPrgRom:3d7ce:ItemOrTriggerActionJump_1b:
NesPrgRom:3d7db::$3d7f7
NesPrgRom:3d7df::$3d7f7
NesPrgRom:3d7e1::must wait to move
NesPrgRom:3d7e4::$3d7f7
NesPrgRom:3d7fa::$3d7d8
NesPrgRom:3d7fd:ItemOrTriggerActionJump_1c:
NesPrgRom:3d805:ItemOrTriggerActionJump_1d:
NesPrgRom:3d811::$3d826
NesPrgRom:3d813::; Spawn Mado 1 (88) into slot 0d at a specific location.
NesPrgRom:3d826::; ----
NesPrgRom:3d827:ItemOrTriggerActionJump_1e:
NesPrgRom:3d82e:ItemOrTriggerActionJump_1f:; Set the action of the boat spawn (slot d => 439) to 55
NesPrgRom:3d834:HandleItemOrTrigger:
NesPrgRom:3d843::; NOTE This is the chest entry point
NesPrgRom:3d849::ItemGet, ItemUse, or TriggerSquare
NesPrgRom:3d856::; Handle the output
NesPrgRom:3d858::$3d880
NesPrgRom:3d85e::$3d880
NesPrgRom:3d860::; There's non-empty dialog
NesPrgRom:3d885-3d886:JumpTable_3d885:
NesPrgRom:3d88b:WaitForAudio:
NesPrgRom:3d88e::; Wait for an audio cue to finish???
NesPrgRom:3d893::$3d88b
NesPrgRom:3d896:_3d896:
NesPrgRom:3d8aa::$3d89a
NesPrgRom:3d8ad::;; --------------------------------\\n;; UNUSED
NesPrgRom:3d8bc::$3d8b1
NesPrgRom:3d8be:_3d8be:
NesPrgRom:3d8c7:MainGameModeJump_12_Inventory:
NesPrgRom:3d8cb::$3d8d1
NesPrgRom:3d8d8::$10
NesPrgRom:3d8f5::$3d8f1
NesPrgRom:3d907::$3d90c
NesPrgRom:3d910::$3d915
NesPrgRom:3d91d::$3d930
NesPrgRom:3d91f:_3d91f:
NesPrgRom:3d985:MainGameModeJump_20_ArmorShop:
NesPrgRom:3d98e:MainGameModeJump_21_ToolShop:
NesPrgRom:3d997:MainGameModeJump_22_Inn:
NesPrgRom:3d9a2::MP
NesPrgRom:3d9ad:MainGameModeJump_23_PawnShop:
NesPrgRom:3d9b6:MainGameModeJump_13_StartGameFlash:
NesPrgRom:3d9c1:MainGameModeJump_24_EmptyShop:
NesPrgRom:3d9d8:_3d9d8:
NesPrgRom:3d9db::$3d9fb
NesPrgRom:3d9e0::$3d9fc
NesPrgRom:3d9f8::$3d9fb
NesPrgRom:3da01::$3da06
NesPrgRom:3da0c:_3da0c:; Walk into shop?
NesPrgRom:3da59::$3da46
NesPrgRom:3da6b::$3da60
NesPrgRom:3da72:_3da72:
NesPrgRom:3daa3::$3da98
NesPrgRom:3dabf:_3dabf:
NesPrgRom:3dada:_3dada:
NesPrgRom:3dadf::$3daf6
NesPrgRom:3dae6::$3daec
NesPrgRom:3daea::$3daf6
NesPrgRom:3daef::$3daf6
NesPrgRom:3daf9::$3dadc
NesPrgRom:3dafc:_3dafc:
NesPrgRom:3db0b::$3db05
NesPrgRom:3db0e:SetEquippedConsumableItem:
NesPrgRom:3db11::$3db19
NesPrgRom:3db16::$3db21
NesPrgRom:3db1c::$3db27
NesPrgRom:3db28:MainGameModeJump_14_TeleportMenu:; Prevent teleporting if (a) the screen is locked, (b)\\n; we're in the tower, or (c) the player is slimed.
NesPrgRom:3db2b::$3db4a
NesPrgRom:3db30::$3db45
NesPrgRom:3db38::$3db45
NesPrgRom:3db41::$3db45
NesPrgRom:3db43::$3db4f
NesPrgRom:3dbac:_3dbac:
NesPrgRom:3dbb5::$3dbb9
NesPrgRom:3dbc8::does something w/ searching for controller input
NesPrgRom:3dbdc-3dbdd:JumpTable_3dbdc:; jump table for ... ?\\n00
NesPrgRom:3dbde-3dbdf::01
NesPrgRom:3dbe0-3dbe1::02
NesPrgRom:3dbe2-3dbe3::03
NesPrgRom:3dbe4-3dbe5::04
NesPrgRom:3dbe6-3dbe7::05
NesPrgRom:3dbe8-3dbe9::06
NesPrgRom:3dbea-3dbeb::07
NesPrgRom:3dbec:_3dbec:
NesPrgRom:3dbf4:JumpTable_3dbdc_04:
NesPrgRom:3dbfd::$3dc04
NesPrgRom:3dc0c:JumpTable_3dbdc_05:
NesPrgRom:3dc17::$3dc1e
NesPrgRom:3dc26:JumpTable_3dbdc_06:
NesPrgRom:3dc2f::$3dc36
NesPrgRom:3dc3e:JumpTable_3dbdc_07:
NesPrgRom:3dc49::$3dc50
NesPrgRom:3dc58-3dc63:TownWarpTable:
NesPrgRom:3dc64:JumpTable_3dbdc_01:
NesPrgRom:3dc70:JumpTable_3dbdc_00:
NesPrgRom:3dc7d::$3dc82
NesPrgRom:3dc85::$3dc8a
NesPrgRom:3dc9d::$3dca9
NesPrgRom:3dca4::20
NesPrgRom:3dcac::$3dca9
NesPrgRom:3dccd::$03b1 with mirroring
NesPrgRom:3dcd8::$3dcd2
NesPrgRom:3dcdf::normally this is $41
NesPrgRom:3dce1::sprite pattern bank 0..3f, normally the player
NesPrgRom:3dcf1::$3dce8
NesPrgRom:3dcf3::player metasprite??? (normally $a7. $00)
NesPrgRom:3dd26::$3dd1d
NesPrgRom:3dd36:BuildWarpMenu:
NesPrgRom:3dd3e::$3dd3a
NesPrgRom:3dd49::$3dd53
NesPrgRom:3dd55::$3dd44
NesPrgRom:3dd58:CheckWarpPointFlag:
NesPrgRom:3dd59::explicit offset
NesPrgRom:3dd6b:MainGameModeJump_15_TelepathyMenu:
NesPrgRom:3dd8f::$3dd88
NesPrgRom:3dd9a:JumpTable_3ddbd_04:
NesPrgRom:3ddac::$3dd9a
NesPrgRom:3ddbd-3ddbe:JumpTable_3ddbd:00
NesPrgRom:3ddbf-3ddc0::01
NesPrgRom:3ddc1-3ddc2::02
NesPrgRom:3ddc3-3ddc4::03
NesPrgRom:3ddc5-3ddc6::04
NesPrgRom:3ddc7-3ddc8::05
NesPrgRom:3ddc9-3ddca::06
NesPrgRom:3ddcb-3ddcc::07
NesPrgRom:3ddcd:_3ddcd:
NesPrgRom:3ddd9::$3dddd
NesPrgRom:3dde1:JumpTable_3ddbd_07:
NesPrgRom:3dde5:JumpTable_3ddbd_06:
NesPrgRom:3dded:_3dded:
NesPrgRom:3de04:JumpTable_3ddbd_00:; NOTE game mode 16 is never used, but this is entered via\\n; the jump table at 3ddbd when telepathy is used
NesPrgRom:3de0f::$07
NesPrgRom:3de24::28000 -> 8000
NesPrgRom:3de4f::$3de2f
NesPrgRom:3de51:JumpTable_3df0e_01:
NesPrgRom:3de72:_3de72:
NesPrgRom:3de77::$3de71
NesPrgRom:3de7e:_3de7e:
NesPrgRom:3de90::$3de86
NesPrgRom:3dea1-3deb0:DataTable_3dea1:
NesPrgRom:3dec1:MainGameModeJump_17_ChangeMagicMenu:
NesPrgRom:3dee4:JumpTable_3df0e_04:
NesPrgRom:3df0e-3df0f:JumpTable_3df0e:
NesPrgRom:3df1e:JumpTable_3df0e_07:
NesPrgRom:3df22:JumpTable_3df0e_06:
NesPrgRom:3df2f:JumpTable_3df0e_00:
NesPrgRom:3df56::$3df47
NesPrgRom:3df8f:_3df8f:
NesPrgRom:3dfce:_3dfce:
NesPrgRom:3dfd4:_3dfd4:
NesPrgRom:3dfdd::$3dfd6
NesPrgRom:3dffd:_3dffd:
NesPrgRom:3e023::$3e026
NesPrgRom:3e033::$3e037
NesPrgRom:3e038:_3e038:
NesPrgRom:3e05e::$3e061
NesPrgRom:3e077:_3e077:
NesPrgRom:3e085::$3e079
NesPrgRom:3e088-3e08f:DataTable_3e088:; TODO - what is this data table? who reads it?
NesPrgRom:3e0a8-3e0af:DataTable_3e0a8:
NesPrgRom:3e0b8:AnimateBackgroundAndRespawn:
NesPrgRom:3e0f7::e.g. if NpcData[$6c] is $0000
NesPrgRom:3e0f9::; Start at byte 5, slot $d, look for the slot to spawn in.\\n; The loop is just to get to the right pair (x,y) and ensure\\n; it's valid (not past the last entry).
NesPrgRom:3e103::$fx in first slot => quit (why the and?)
NesPrgRom:3e105::$13 is (GlobalCounter>>4)+$d
NesPrgRom:3e109::; global counter $0x -> spawn slot $d; $1x -> slot $e; ... $fx -> slot $1c
NesPrgRom:3e10a::80 bit set in 2nd element => timer spawn
NesPrgRom:3e118::; Don't spawn an object on screen - so if it's on screen "unspawn" it.
NesPrgRom:3e123::objects $1d..$1f are never respawned.
NesPrgRom:3e12a::; ----
NesPrgRom:3e12b:ClcIfObjectIsOnScreen:
NesPrgRom:3e12e::set carry flag for next SBC
NesPrgRom:3e134::$3e142
NesPrgRom:3e13e::$3e142
NesPrgRom:3e144:ReloadNpcDataForCurrentLocation:
NesPrgRom:3e146::$3e14a - unconditional
NesPrgRom:3e148:ReloadLocationGraphics:
NesPrgRom:3e14c::; Load the NpcData table for the current location\\n$3e3d4
NesPrgRom:3e15d::$3e169
NesPrgRom:3e16b::$3e1ae rts bail out if no table entry
NesPrgRom:3e16f::; Zeroth element of the entry is always zero.  This seems like an odd\\n; defensive assertion, since it never actually fires.
NesPrgRom:3e171::$3e174
NesPrgRom:3e175::y=1
NesPrgRom:3e17b::y=2
NesPrgRom:3e181::y=3
NesPrgRom:3e187::y=4
NesPrgRom:3e18c::; Iterate over the spawnable objects, starting at x=$0d ($7d).\\n; Terminate once we hit a $ff in the first element.
NesPrgRom:3e191::npc[0] == $ff => break out of loop
NesPrgRom:3e193::$3e1ae rts ; on ff in slot 5, 9, ... => done
NesPrgRom:3e195::; $fe in the first spot means something - not sure what\\n;     used 6x in A6 (draygon's room), once in amazones,\\n;          and once in D7 (portoa castle entrance)\\n; Actually it looks like it's just a "commented-out" spawn.\\nnpc[0] == $fe => skip to the next one
NesPrgRom:3e197::$3e1af
NesPrgRom:3e19a::a <- npc[1]
NesPrgRom:3e19c::y <- &npc[0]
NesPrgRom:3e19d::a <- npc[1] << 1
NesPrgRom:3e19e::$3e1a7 - npc[1] < $80 => try to spawn the NPC
NesPrgRom:3e1a0::; This looks pretty redundant with ++ below, but covers the case where\\n; npc[1] is negative (a timer spawn), rather than npc[0] == $fe (a comment).\\n; But there's no reason we can't just jmp to 3e1af and save a few bytes.
NesPrgRom:3e1a5::$3e18f - this is unconditional
NesPrgRom:3e1ab::$3e18f
NesPrgRom:3e1ae::; ----\\nbail out (via >rts jumps)
NesPrgRom:3e1b4::$3e18f - try next spawn slot, looks unconditional
NesPrgRom:3e1b6:TryNpcSpawn:y=5, 9, ...
NesPrgRom:3e1ca::; NOTE(randomizer) we inject \`jsr RandomizeFlyerSpawnPosition\` here\\n; npc[0] is y-coordinate (shifted by a nibble)
NesPrgRom:3e1d1::redundant?
NesPrgRom:3e1da::fine-y is always #$c ?
NesPrgRom:3e1dc::Writes NPC y-position
NesPrgRom:3e1de::; npc[2]40 is half-tile horizontal position.
NesPrgRom:3e1e7::; npc[1] is x-coordinate (shifted by a nibble)
NesPrgRom:3e1f9::Add a half-tile if npc[2]40 was set.
NesPrgRom:3e1fb::Writes NPC x-position
NesPrgRom:3e1fd::save REG_Y temporarily to check conditions
NesPrgRom:3e1ff::; npc[2]07 is jump pointer index\\n;   - should be 0..4\\n; [old note where $80 and $00 only differ in carry flag --- ?]
NesPrgRom:3e218-3e219:NpcDataJump:
NesPrgRom:3e220-3e221::animations, explosions, etc
NesPrgRom:3e222:NpcDataJump_4_Misc:id
NesPrgRom:3e228::$3e239
NesPrgRom:3e239:SpawnShopkeeper:
NesPrgRom:3e24c::$3e264
NesPrgRom:3e250::$3e264
NesPrgRom:3e254::$3e264
NesPrgRom:3e25a::$3e264
NesPrgRom:3e25e::$3e264
NesPrgRom:3e262::$3e22a
NesPrgRom:3e277::$3e22a
NesPrgRom:3e27d::$3e22a
NesPrgRom:3e27f:NpcDataJump_0_Enemy:
NesPrgRom:3e284::object ID = $2f + #$50
NesPrgRom:3e286::store in position 'x'
NesPrgRom:3e28e:NpcDataJump_Finish:
NesPrgRom:3e29c::Stack seems to last have been written at $3e20f?
NesPrgRom:3e2a3:NpcDataJump_3_Wall:
NesPrgRom:3e2a8::object ID = $2f + #$d0
NesPrgRom:3e2aa::store in position 'x'
NesPrgRom:3e2b5:NpcDataJump_1_PersonOrBoss:$08000..$0c000
NesPrgRom:3e2c2::$24 = %1111 bb00
NesPrgRom:3e2ca::$25 = %10AA AAAA
NesPrgRom:3e2cc::; Copy 4 bytes from the bth quad beneath the bottom row of tile (128+a)\\n; into $20..$23.
NesPrgRom:3e2d4::$3e2ce
NesPrgRom:3e2df:LoadPersonObjectData:$3e3d4
NesPrgRom:3e2e2::All people are apparently object 30?
NesPrgRom:3e2ee::; Patch some of the object attributes based on the PersonData
NesPrgRom:3e2fa::$3e307
NesPrgRom:3e304::$3e311
NesPrgRom:3e30a::no-op
NesPrgRom:3e316::$3e323
NesPrgRom:3e318::spawn[3]
NesPrgRom:3e31d::speed table
NesPrgRom:3e325::why 8? seems backwards
NesPrgRom:3e327::$3e32f
NesPrgRom:3e329::; Statue - adjust position a little?
NesPrgRom:3e340:_3e340:person's ID
NesPrgRom:3e344::push temporarily
NesPrgRom:3e34b::$1c0a0
NesPrgRom:3e353::output from CheckConditionForPersonSpawn
NesPrgRom:3e355::$3e35c
NesPrgRom:3e357::; $20 was nonzero -> despawn the NPC.
NesPrgRom:3e35f-3e362:DataTable_3e35f:
NesPrgRom:3e363:LoadBossObjectData:
NesPrgRom:3e375:NpcDataJump_2_TreasureChestOrTrigger:last data item in quadruplet
NesPrgRom:3e377::$3e3b8
NesPrgRom:3e390::1c0004000
NesPrgRom:3e397::$3e39c
NesPrgRom:3e399::don't spawn ($4a0,x <- 0) if zero
NesPrgRom:3e39f::; Check for the three invisible chests
NesPrgRom:3e3a3::$3e3b0
NesPrgRom:3e3a7::$3e3b0
NesPrgRom:3e3ab::$3e3b0
NesPrgRom:3e3b8:NpcData_LoadTrigger:; ----
NesPrgRom:3e3c7:MaybeRecordAlternativePatternBank:; Most metasprites are written under the assumption that the relevant\\n; CHR page will be loaded into the $80..$bf bank.  If NpcData[2]80 is\\n; set, it indicates that the CHR page is actually in $c0..$ff instead.\\n; This is tracked by setting $38020, which causes the metasprite\\n; renderer to add #$40 to each tile ID.
NesPrgRom:3e3d4:BankSwitch16k_Bank6:
NesPrgRom:3e3d9-3e3da:ExitTypeJumpTable:0x - normal exit
NesPrgRom:3e3db-3e3dc::20 - large map split
NesPrgRom:3e3dd-3e3de::40 - warp
NesPrgRom:3e3df-3e3e0::60 - fall in pit, cf $3f084
NesPrgRom:3e3e7-3e3e8::e0 - ???
NesPrgRom:3e3e9:_3e3e9:
NesPrgRom:3e3f9::34000 -> 8000
NesPrgRom:3e401::$3e406
NesPrgRom:3e40f::$3e3d9
NesPrgRom:3e414::$3e3da
NesPrgRom:3e41c:ExitTypeJump_7:; No idea what triggers this... cf. $2fcda writes $6d <- #$ff
NesPrgRom:3e422:ExitTypeJump_0_Normal:
NesPrgRom:3e425::; Remove slime status
NesPrgRom:3e439:_3e439:; Read map data from new location, etc.  Note that this also\\n; sets 34..37 from the entrance coordinates.
NesPrgRom:3e43c::; Set location of object slots 0 and 1 (player and shadow)\\n; from the entrance coordinates.
NesPrgRom:3e44a:DoLocationSpecificChecks:; Do a handful of location-specific checks.  We might want to\\n; consider moving this into a location-based lookup table, or\\n; else building a jump destination into the mapdata table.\\n; NOTE these all depend on page 0d being loaded because they\\n;       call WriteObjectCoordinates and/or AddDisplacementVector.
NesPrgRom:3e473::$3e46e
NesPrgRom:3e479::$3e489
NesPrgRom:3e47d::$3e489
NesPrgRom:3e491::$3e48d
NesPrgRom:3e4a3::$3e49e
NesPrgRom:3e4cb::$3e4c3
NesPrgRom:3e4cd::8000 -> 38000
NesPrgRom:3e4e8::$3e4ef
NesPrgRom:3e4f7::$3e4fe
NesPrgRom:3e51c:ExitTypeJump_1_Seamless:; Seamless transition between maps.  Corresponds to an exit of type $20.
NesPrgRom:3e526::$3e520
NesPrgRom:3e52b::34000 -> 8000
NesPrgRom:3e533:ExitTypeJump_2_Warp:; Teleport\\n2e000 -> a000
NesPrgRom:3e547::8000 -> 34000
NesPrgRom:3e55c::update $380,x
NesPrgRom:3e564::$3e573
NesPrgRom:3e570::$3e544
NesPrgRom:3e578::MapData[$6c][5][y] -> ($10),y
NesPrgRom:3e57f::$12 <- 4
NesPrgRom:3e583::$20,x <- element; x starts at zero
NesPrgRom:3e587::$3e603 - failsafe to prevent lockups?
NesPrgRom:3e58b::$3e581
NesPrgRom:3e58d::; Check MSN of the [1] element against $90 (the player's X screen) and\\n; loop until we find the right one.
NesPrgRom:3e595::$3e57b
NesPrgRom:3e597::; Check (MSN of [2] | MSN of [3] >> 4) against $d0 (player Y screen)\\n; The MSN of this coordinate is never actually used.
NesPrgRom:3e5a7::$3e57b
NesPrgRom:3e5a9::; Move player down one tile on the screen (???)
NesPrgRom:3e5b2::; 80 bit of [2] becomes the 10 bit of $d0 - but this is always zero
NesPrgRom:3e5b9::; LSN of [3] -> $d0 (player's Y screen)
NesPrgRom:3e5c3::; LSN of [1] -> $90 (player's X screen)
NesPrgRom:3e5cb::; [0] -> $6c
NesPrgRom:3e5ce::; Cure mutation if present (presumably UpdateEquipmentAndStatus destroys $20).
NesPrgRom:3e5d5::$3e5e2
NesPrgRom:3e5e8::34000 -> 8000, 36000 -> a000
NesPrgRom:3e5ed::player
NesPrgRom:3e5f2::copy to "jump" coordinates
NesPrgRom:3e611:ClearAllObjectsOnLocationChange:34000 -> 8000
NesPrgRom:3e616::; This seems to load a specific palette?
NesPrgRom:3e61b:_3e61b:; Loops through all the objects and writes 0 to the ObjectActionScript
NesPrgRom:3e625::$3e61f
NesPrgRom:3e628:ChangeLocation:; At this point, $10 stores the *first* MapData table for the $6c location\\n; This table stores background music, scrolling map dimensions and tiles,\\n; and some CHR page information.  Stores $62fc..$62ff with the dimens.
NesPrgRom:3e62f::Load &MapData[$6c][0] into $10$11
NesPrgRom:3e632::y is 0 here (set at end of LMD_A)
NesPrgRom:3e634::destroys y
NesPrgRom:3e639::y=1
NesPrgRom:3e63b::width
NesPrgRom:3e63f::y=2
NesPrgRom:3e641::height
NesPrgRom:3e647::y=3
NesPrgRom:3e649::animation
NesPrgRom:3e64d::y=4
NesPrgRom:3e64f::extended screenset
NesPrgRom:3e653::; First zero out the map.
NesPrgRom:3e65b::$3e657
NesPrgRom:3e66c::$3e663
NesPrgRom:3e670::x=(x+7)&~7 -> round up to next 8 bytes
NesPrgRom:3e677::$3e65e
NesPrgRom:3e679::; Zero out the flags.
NesPrgRom:3e681::$3e67d
NesPrgRom:3e683::; Copy the requested flags.
NesPrgRom:3e688::MapData[$6c][2][y] -> ($10),y
NesPrgRom:3e68f::$3e69e
NesPrgRom:3e691::; If $6d is #$ff then skip reading the entrances\\n$34000 -> $8000
NesPrgRom:3e6a2::don't read entrances for seamless transitions
NesPrgRom:3e6a4::$3e6b9
NesPrgRom:3e6a6::; y = 4 * (entrance number) - copy 4 bytes from ($10),y to $34,x\\n; which is a temporary coordinate.  This will (presumably) be copied\\n; to the player's position at some point.
NesPrgRom:3e6b7::$3e6af
NesPrgRom:3e6b9:ReadMapDataGraphicsTable:; Load $10 = &MapData[loc][1], y=0\\n; Then we store the first 3 bytes in 7e0..7e2, 7f->7e3, 0->66, 0->68,\\n; the 4th and 5th bytes in 67 and 69 [probably addresses with LSB=0].\\n; $6a gets something related to $67, but &($3c), shifted <<3 and with\\n; the carry as a possible one in the MSB $6b.  Then the last two bytes\\n; go into $7f0 and $7f1, for either patterns or colormaps.
NesPrgRom:3e6bb::MapData[$6c][1][y] -> ($10),y
NesPrgRom:3e6be::; Copy palettes into $7e0..$7e2
NesPrgRom:3e6d5::; Read the next 2 bytes into $67 and $69 -----> ?
NesPrgRom:3e6e7::unnecessary? - %00ab cd00
NesPrgRom:3e6ec::; Store $6a = %bcd0 0000 and $6b = %1011 111a\\n; Refers to one of 11 or 12 32-byte blocks at $13e00 .. $13fff\\n; These are the metatile flag alternatives map, but $6a is not always\\n; used to access it.
NesPrgRom:3e6f4::; Final two bytes go into $7f0 and $7f1, which are pattern tables.
NesPrgRom:3e702:CopyMapDataFlags:; Read pairs (p, q) until a == $ff.\\n; This happens once upon entering a location.  The 'p' element\\n; is an index into a 32-byte bitset (upper five bits is the\\n; byte number, lower is the bit) at $64c0.  The 'q' element\\n; indexes a 16-byte bitset at $62f0 (the 08 bit seems unused).\\n; Upon entering the location, the 'p' bit is copied into the\\n; 'q' bit.
NesPrgRom:3e70a::MapData[$6c][4][y] -> ($10),y
NesPrgRom:3e711::$3e756
NesPrgRom:3e71a::$12 <- bit from p
NesPrgRom:3e720::NOTE y unchanged from above
NesPrgRom:3e728::$12 is now the specified bit
NesPrgRom:3e72a::$3e72e
NesPrgRom:3e72c::$ 13 <- $ff if bit was set
NesPrgRom:3e72f::cccc.ddd
NesPrgRom:3e737::$12 is now (1 << ddd)
NesPrgRom:3e739::NOTE y unchanged
NesPrgRom:3e742::a = ~(1 << ddd)
NesPrgRom:3e753::$3e70d
NesPrgRom:3e75e:AnimateBackground:
NesPrgRom:3e766::$3e778
NesPrgRom:3e779-3e780:BackgroundAnimationTable:
NesPrgRom:3e799:CheckForRidingDolphin:
NesPrgRom:3e79c::$3e7c3
NesPrgRom:3e7a4::$3e7b9
NesPrgRom:3e7a8::$3e7b9
NesPrgRom:3e7ac::$3e7b9
NesPrgRom:3e7ae::; Remove riding dolphin bit
NesPrgRom:3e7b6::$3e7c3
NesPrgRom:3e7c3::; ----
NesPrgRom:3e7c4:CheckForDwarfChild:
NesPrgRom:3e7c8::$3e822
NesPrgRom:3e7cc::if anywhere other than oak
NesPrgRom:3e7ce::; Check flag 045 rescued child - if set then remove flag
NesPrgRom:3e7d5::; Check flag 053 followed by child
NesPrgRom:3e7da::$3e822
NesPrgRom:3e7dc::; Child currently following, not previously rescued\\n; Start the animation for child walking to house,\\n; and Set 045 rescued child
NesPrgRom:3e81a:RemoveChildFollowingFlag:; Clear 053 followed by child
NesPrgRom:3e823:CheckForShyronMassacre:
NesPrgRom:3e827::$3e844
NesPrgRom:3e829::; Check flag 027 shyron massacre
NesPrgRom:3e82c::bpl... ?
NesPrgRom:3e82e::$3e844
NesPrgRom:3e830::; Shyron massacre has happened. Swap out patterns and palettes.
NesPrgRom:3e845:_3e845:
NesPrgRom:3e88d::$3e865
NesPrgRom:3e896::$3e861
NesPrgRom:3e8aa::$3e85b
NesPrgRom:3e8b2::bg palette
NesPrgRom:3e8b6-3e8bd:DataTable_3e8b6:
NesPrgRom:3e8f6:_3e8f6:
NesPrgRom:3e8f9::$3e903
NesPrgRom:3e8fb::$3e903
NesPrgRom:3e90a:_3e90a:; Copy screen coords to $34..$37, then do stuff with them.
NesPrgRom:3e923::8000 -> 34000
NesPrgRom:3e92b::Destroys $30..$3b
NesPrgRom:3e92e::further copy $34..$37 into $28..$2b  - ??
NesPrgRom:3e935::$3e930
NesPrgRom:3e937::; Re-copy the X screen coordinate and check if it changed from the value\\n; saved in $28 by a full 8-pixel tile.  If so, write to the nametable.
NesPrgRom:3e943::$3e948
NesPrgRom:3e950::; Re-copy the Y screen coordinate and check if it changed from the value\\n; saved in $2a by a full 8-pixel tile.  If so, write to the nametable.
NesPrgRom:3e95c::$3e961
NesPrgRom:3e963::$3e968
NesPrgRom:3e96b::$3e971
NesPrgRom:3e96f::$3e988
NesPrgRom:3e975::$3e979
NesPrgRom:3e977::$3e981
NesPrgRom:3e97b::$3e986
NesPrgRom:3e97e::$3e986
NesPrgRom:3e983::$3e986
NesPrgRom:3e991::$3e98a
NesPrgRom:3e993:Unknown_3e993:; This seems to be reusing AddDisplacementVectorLong\\n; to move the screen coordinates.  This is done while\\n; the screen is faded to black in between maps to\\n; redraw the screen a few rows at a time.
NesPrgRom:3e99b::34000 -> 8000
NesPrgRom:3e9aa::$3e9a5
NesPrgRom:3e9ad:KeepPlayerInCenterOfScreenIfPossible:; Output\\n;   ($30, $31) is (delta-x, delta-y) to move the screen by to get the\\n;              player back into the center.  It is clamped to ±3.
NesPrgRom:3e9b6::there's an explosion ongoing
NesPrgRom:3e9b9::$3e9be
NesPrgRom:3e9c3::$3e9c7
NesPrgRom:3e9cc::$3e9d5
NesPrgRom:3e9d3::$3e9da
NesPrgRom:3e9dd::$3e9e5
NesPrgRom:3e9e3::$3e9fe
NesPrgRom:3e9ef::$3e9f8
NesPrgRom:3e9f6::$3e9fd
NesPrgRom:3ea09::$3ea0e
NesPrgRom:3ea16::$3ea1f
NesPrgRom:3ea1d::$3ea2e
NesPrgRom:3ea26::$3ea2c
NesPrgRom:3ea2f:ClampAToPlusMinus3:$3ea40
NesPrgRom:3ea31::$3ea3a
NesPrgRom:3ea35::$3ea40
NesPrgRom:3ea3c::$3ea40
NesPrgRom:3ea41:_3ea41:
NesPrgRom:3ea44::$3ea71
NesPrgRom:3ea57::$3ea71
NesPrgRom:3ea5f:_3ea5f:; if $3c,y > 0, dec $30,x; if < 0 then inc, if == 0 then nothing
NesPrgRom:3ea62::$3ea71
NesPrgRom:3ea64::$3ea6a
NesPrgRom:3ea72:ClampScreenPosition:; Compare screen position against map geometry,\\n; presumably to either scroll or decide not to.\\n; Outputs\\n;   $30 - 0 if we clamped the x coordinate\\n;   $31 - 0 if we clamped the y coordinate
NesPrgRom:3ea77::$3ea7f
NesPrgRom:3ea79::; If width is one, fix camera to zero horizontal, then check vertical.
NesPrgRom:3ea7d::$3eaa1 - unconditional
NesPrgRom:3ea81::$3ea91
NesPrgRom:3ea83::; If the coarse x is negative, we're close up against the left edge.\\n; Clamp at $fff8 as the left-most possible screen coordinate.
NesPrgRom:3ea87::$3eaa1
NesPrgRom:3ea89::$30 <- 0
NesPrgRom:3ea8f::$3eaa1 - unconditional
NesPrgRom:3ea94::$3eaa1
NesPrgRom:3ea96::; If the corse x is > the width then clamp to (w, 0).
NesPrgRom:3ea9f::$30 <- 0
NesPrgRom:3eaa4::$3eab9
NesPrgRom:3eaa6::; If height is one then fix camera to vertical
NesPrgRom:3eaac::$3b <- #$fc
NesPrgRom:3eab2::$3eab8
NesPrgRom:3eab4::; Special case for Dyna - $3b = 0 instead of #$fc.
NesPrgRom:3eabb::$3b <-#$08
NesPrgRom:3eabf::$3eac8
NesPrgRom:3eac1::; Negative screen Y coordinate - clamp at 0. ?
NesPrgRom:3eacb::$3eade
NesPrgRom:3eacd::; Clamp vertical scroll at (h+1, $28)
NesPrgRom:3ead1::$3eade
NesPrgRom:3eadf:_3eadf:
NesPrgRom:3eae2::$3eb04
NesPrgRom:3eae7::$3eaee
NesPrgRom:3eaff::$3eafa
NesPrgRom:3eb04::; ----
NesPrgRom:3eb05-3eb08:DataTable_3eb05:
NesPrgRom:3eb09:FindExit:; Load the current tile position into ($12, $13)
NesPrgRom:3eb2d::Exit table
NesPrgRom:3eb2f::MapData[$6c][3][y] -> ($10),y
NesPrgRom:3eb32::; $10 points to the 4th map data table for the current map, which\\n; consists of quadruples of data.  ($12, $13) stores a digested version\\n; of the player's current (x, y) coordinates (see above), consisting of\\n; the low nibble of the MSB and the high nibble of the LSB (it may be\\n; that the MSB is never more than a single nibble?).  The quadruples in\\n; this table consist of (x, y, ..., ...), with a $ff at the end.\\n; Note this runs every frame to see if an exit has been triggered,\\n; in which case, we jump straight to TakeExit and update $6c and $6d
NesPrgRom:3eb40::no exit found
NesPrgRom:3eb42::$3eb54
NesPrgRom:3eb48::$3eb50
NesPrgRom:3eb52::$3eb34 ; if something went wrong, don't loop forever
NesPrgRom:3eb55:TakeExit:
NesPrgRom:3eb59::$3eb6c
NesPrgRom:3eb5d::Store new map
NesPrgRom:3eb6d:UpdatePpuScroll:
NesPrgRom:3eb91:PrepareNametableStageForVerticalScrollInternal:; Variables\\n;   $20 - current screen map ID\\n;   $21 - screen to the right's map ID\\n;   $1e - whether $20 has had a blocker destroyed\\n;   $1f - whether $21 has had a blocker destroyed
NesPrgRom:3eb96::; What direction are we scrolling? pl = down, mi = up
NesPrgRom:3eb98::$3eb9c
NesPrgRom:3eb9a::y hi - increment if scrolling down (top -> bottom)
NesPrgRom:3eba6::; Increment low 3 bits of y, with no carry into upper 5 bits.
NesPrgRom:3ebb2::; Load the screen one to the right (wrapping around a torus)
NesPrgRom:3ebbc::current map index.
NesPrgRom:3ebc1::yl of top-left of screen
NesPrgRom:3ebc3::ignore fine y
NesPrgRom:3ebc5::($10),y is now top row of screen ($20)
NesPrgRom:3ebcd::y <- xl >> 4
NesPrgRom:3ebd5::x <- y << 1
NesPrgRom:3ebdc::a <- 0 (left) or 1 (right) half of tile
NesPrgRom:3ebe0::$13 <- #$10 or #$11 (see above)
NesPrgRom:3ebe5::need to switch to 2nd map layout page?
NesPrgRom:3ebe8::$3ebef
NesPrgRom:3ebea::$8000 -> $14000 instead of what it was before
NesPrgRom:3ebf7::; Increment a single tile in the map, but two spots in the staging area\\n; This leaves space for two CHR tiles for each map tile.  $3eece is the\\n; next routine that reads the $6000,x data we write here.
NesPrgRom:3ebfc::$3ec11
NesPrgRom:3ebfe::hit the end of the row switch pages
NesPrgRom:3ec00::$3ebef
NesPrgRom:3ec0b::fill in everything we skipped at the start
NesPrgRom:3ec0f::$3ebef - unconditional?
NesPrgRom:3ec14::8000 -> a000
NesPrgRom:3ec37::; Store the instruction to write the new data at next VBL.
NesPrgRom:3ec57::$3ec5c
NesPrgRom:3ec6c:CheckMapFlag_Y:
NesPrgRom:3ec7b::a <- (1<<(y&7)) & $62f0,(y>>3)
NesPrgRom:3ec7f-3ec86:DataTable_3ec7f:
NesPrgRom:3ec87:PrepareNametableStageForHorizontalScroll:; writes data to nametable staging area
NesPrgRom:3ec96::$3ec9a
NesPrgRom:3ec98::x hi
NesPrgRom:3eca8::$3ecac
NesPrgRom:3ecae::$3ecb2
NesPrgRom:3ed06::$3ed1d
NesPrgRom:3ed0a::$3ecf5
NesPrgRom:3ed1b::$3ecf5
NesPrgRom:3ed20::8000 -> 10000
NesPrgRom:3ed64:_3ed64:
NesPrgRom:3ed89:LoadMetatileFlagAlternativesMap:; Input\\n;   $67 high byte of address into tile-to-pattern map tables.\\n;        At rest, this is a multiple of four, but we flip the low two\\n;        bits as different rows/columns are loaded.\\n; Output\\n;   ($23) 16-bit address of the alternates map for flagged tiles.\\n;          Each of the 12 different pattern groups ($67) has a $20-byte\\n;          section of $13e00..$13fff.\\n; Note This appears to just be the same thing as ($6a),<metatile ID>,\\n; which could have been used to better effect.
NesPrgRom:3ed90::$23 = ($67 & #$1c) << 3
NesPrgRom:3ed96::$24 = $#be | ($67 & #$20 ? 1  0)
NesPrgRom:3ed99:CheckMetatileAgainstFlag:
NesPrgRom:3ed9b::$3ed9e
NesPrgRom:3ed9d::; Most tiles (>= #$20) will just return right away.
NesPrgRom:3eda2::$3edb7
NesPrgRom:3eda8::$a000 -> $12000
NesPrgRom:3edba:MapMetatilesToPatterns:
NesPrgRom:3edbc::clear low 3 bits
NesPrgRom:3edbe::last written $3ec1f from $36
NesPrgRom:3ede2::$3edc6 - loop 16 times
NesPrgRom:3ede5:WriteMetatileAttributesForVerticalScroll:; Note $31 is generally close to zero for an actual scroll, though\\n; for screen redraws it can be large.  $2f is only set to nonzero\\n; in the WriteMetatileAttributesFor*Scroll routines, so it is typically\\n; zero unless this method is repeated, either to redraw the entire\\n; screen, or else due to diagonal movement when a horizontal and\\n; vertical line must both be drawn.  This is only used to indicate\\n; whether any work is needed, so it's not terribly harmful to have\\n; false positives.
NesPrgRom:3edeb::screen yl
NesPrgRom:3edf3::$3edf6
NesPrgRom:3ee00::; Store the location of the metatile-to-attribute map table in ($10).\\n; The lookup table is just ($b000 | y << 6) [b->13] but the 16-bit math\\n; is awkward enough that presumably it's worth it (vs tya; asl*6; ...)
NesPrgRom:3ee12::; NOTE this is just y = ($36 & #$e0) >> 2.
NesPrgRom:3ee31:WriteMetatileAttributesForHorizontalScroll:; Initialize ($10) and ($10),y based on $67 and $34\\n; Note the similarity to vertical, which reads $36 (ylo) instead of\\n; $34 (xlo) and then does a lookup into $3ef07 before doing some\\n; follow-up, and uses 3ef1d instead of 3ef1c.
NesPrgRom:3ee3f::$3ee42
NesPrgRom:3eea1::$3ee80
NesPrgRom:3eec9::$3eea4
NesPrgRom:3eecc:LoadMetatileAttribute:; Input\\n;   x The index into $6000 to read the metatile ID\\n;   ($10) The attribute table for this location\\n; Output\\n;   a The (2-bit) attribute for the metatile, copied 4 times\\nsave y, which we just read a bit ago
NesPrgRom:3eee0::$3eee6
NesPrgRom:3eee4::$3eede
NesPrgRom:3eeef-3eef0:TilesetBaseAddresses:; This is a table of 12 addresses (b000 -> 13000), indexed by ($67 & #$3c) >> 1,\\n; which is stored in $10 for use by the routines here.  Note that this is just\\n; the high parts of an address - the next lowest part is stored in y in the next\\n; table, so that ($10),y points to one of 12*8 blocks of 8 bytes.\\n; STRIP word=$8000\\n$67 = #$80
NesPrgRom:3eef1-3eef2::$67 = #$84
NesPrgRom:3eef3-3eef4::#$88
NesPrgRom:3eef5-3eef6::#$8c
NesPrgRom:3eef7-3eef8::#$90
NesPrgRom:3eef9-3eefa::#$94
NesPrgRom:3eefb-3eefc::#$98
NesPrgRom:3eefd-3eefe::#$9c
NesPrgRom:3eeff-3ef00::#$a0
NesPrgRom:3ef01-3ef02::#$a4
NesPrgRom:3ef03-3ef04::#$a8
NesPrgRom:3ef05-3ef06::#$ac
NesPrgRom:3ef07-3ef16:DataTable_3ef07:; indexed by $36 >> 4 and stored in y. note that the 1-bit is unused;\\n; it is used to index into 1b and 1d, stored in $12 and $13 (and the\\n; complement of these in $14).
NesPrgRom:3ef17-3ef1a:AttributeQuads:; This is for attribute selection.  These bytes apply the 0, 1, 2, or 3\\n; attribute (respectively) to the four quads of tiles in the block.\\n; By masking with 3, 30, c, or c0 we can select one or the other.  Or\\n; in other words, this is 0, 1, 2, and 3 copied 4 times each.
NesPrgRom:3ef1b-3ef1c:AttributeSelector_TopOrBottom:; These are masks for selecting attributes for a single quad of tiles\\n; within a 4x4 block of tiles that corresponds to a single attribute\\n; table byte.  $3 and $30 are the (top and bottom, respectively) left\\n; half of the block, while $c and $c0 are the right half.  That makes\\n; $3 and $c the top half and $30 and $c0 the bottom half.  If we're\\n; loading the attributes for two 16x16 metatiles, then we need to\\n; apply two of these masks to the new tiles and then use the remaining\\n; bits to mask the previous value of the attribute.  These are tored\\n; in $12, $13, and the remainder in $14 (see $3ee1b).
NesPrgRom:3ef1d-3ef1e:AttributeSelector_LeftOrRight:
NesPrgRom:3ef1f:LoadScreenMapId:; Loads the screen map ID for the screen in ($35, $37), returning the\\n; ID in the A register.  Y is the offset of the tile from $6300.\\nyh
NesPrgRom:3ef28::xh
NesPrgRom:3ef33::;; --------------------------------\\n;; UNUSED
NesPrgRom:3ef36:PrepareScreenMapRead:; This is preparing to read from the ScreenMap data - we bank in a 16k page\\n; and then store the high bits to access it in $11, so that ($10) can\\n; be used to read tiles.\\n; Input\\n;   A the screen ID.\\n;   $34, $36 tile position\\n; Output\\n;   Bank $a000..$bfff correct bank to read map data from.\\n;   $10$11 address of top-left of map ($10 is always 0).\\n;   A offset into the map for the current tile ($34, $36)
NesPrgRom:3ef41::pick one of the first four 16k - high 2 bits
NesPrgRom:3ef55:_3ef55:
NesPrgRom:3ef58::$3ef63
NesPrgRom:3ef61::$3ef8c
NesPrgRom:3ef68::$3ef77
NesPrgRom:3ef6d::$3ef77
NesPrgRom:3ef6f::?? susceptibility ?? currrent terrain ??
NesPrgRom:3ef75::$3ef8c
NesPrgRom:3ef92:_3ef92:; Every 32 frames, poison takes 4 HP
NesPrgRom:3ef98::$3ef9c
NesPrgRom:3ef9a::don't wrap past zero
NesPrgRom:3efac::$3efa6
NesPrgRom:3efbc:_3efbc:
NesPrgRom:3efc8::$3efdb
NesPrgRom:3efcf::$3efdb
NesPrgRom:3efe4::only nonzero if stoned?
NesPrgRom:3effc:CheckRecoverMagic:; ----\\n; This is a special case to allow casting recover when stoned.
NesPrgRom:3f003::; If 'recover' is equipped ...
NesPrgRom:3f009::; ... and button A was just pressed ...
NesPrgRom:3f00f::;  ... and we're in normal game mode, then try to cast 'recover'\\n8000 -> 34000
NesPrgRom:3f01d:CheckPassiveEffects:; If wearing Deo's Pendant +1 MP on 64th frame unless moving
NesPrgRom:3f022::$3f03e
NesPrgRom:3f024::$ff if still
NesPrgRom:3f026::$3f03e
NesPrgRom:3f02c::$3f03e
NesPrgRom:3f034::$3f03e
NesPrgRom:3f039::MP
NesPrgRom:3f041::Psycho Armor
NesPrgRom:3f043::$3f05f
NesPrgRom:3f045::$ff if still
NesPrgRom:3f047::$3f05f
NesPrgRom:3f04f::$3f05f
NesPrgRom:3f055::$3f05f
NesPrgRom:3f05a::ignored - stale from an earlier version?
NesPrgRom:3f063::$3f068
NesPrgRom:3f065::; If we're in Mesia's shrine, dec $4fe - why?!?\\n; This is read at 382be 7 frames later...?\\n; But this doesn't seem to matter - it's possible\\n; Mesia somehow spawns in $1e, even though there's\\n; no NpcData entry there.
NesPrgRom:3f06b::$3f089
NesPrgRom:3f071::$3f089
NesPrgRom:3f076::$3f089
NesPrgRom:3f078::; Fall down a pit set $6f60 bit.
NesPrgRom:3f08c::$3f09b
NesPrgRom:3f099::$3f0a3
NesPrgRom:3f0a4:ValidateSaveFiles:; This runs during a soft reset
NesPrgRom:3f0a6::unused
NesPrgRom:3f0ae::a000 -> 2e000
NesPrgRom:3f0b3:ValidateSaveFile1:; First check that the two copies are equal
NesPrgRom:3f0ce::$3f0b5
NesPrgRom:3f0d0::; Then check the magic numbers
NesPrgRom:3f0e5::uncond
NesPrgRom:3f0e7:CheckSaveFile1Replica1Checksum:; ----\\n; Expected sum of all $300 bytes stored in 70f0
NesPrgRom:3f0e9::sum -> $16
NesPrgRom:3f0f3::; Checksum matched recover the data. R1 -> R2, store checksum in both
NesPrgRom:3f0f5::S1 R1 -> R2
NesPrgRom:3f103:CheckSaveFile1Replica2Checksum:; ----\\n; Expected sum stored in 70f1
NesPrgRom:3f10f::; Checksum matched recover the data. R2 -> R1, store checksum in both
NesPrgRom:3f111::S1 R2 -> R1
NesPrgRom:3f11f:ResetSaveFile1:; ----
NesPrgRom:3f139::$3f121
NesPrgRom:3f13d::unused??
NesPrgRom:3f140:ValidateSaveFile2:; First check replicas
NesPrgRom:3f15b::$3f142
NesPrgRom:3f15d::; Now check magic bytes
NesPrgRom:3f172::uncond
NesPrgRom:3f174:CheckSaveFile2Replica1Checksum:; ----
NesPrgRom:3f18a:CheckSaveFile2Replica2Checksum:; ----
NesPrgRom:3f1a3:ResetSaveFile2:; ----\\n; Reset both copies of save file2 7700..79ff and 7a00..7cff
NesPrgRom:3f1bd::$3f1a5
NesPrgRom:3f1c1::unused here??
NesPrgRom:3f1c7:FinishSaveFileValidations:; ----\\n; All validations complete, switch the PRG bank back and return\\nprg bank mirror
NesPrgRom:3f1cd:UnconditionallyResetCheckpointFile:; ----
NesPrgRom:3f1d7::save PRM bank
NesPrgRom:3f1e2:ValidateCheckpointFile:; ----\\n; Check replicas identical
NesPrgRom:3f1fd::$3f1e4
NesPrgRom:3f1ff::; Check magic bytes
NesPrgRom:3f214::unconditional
NesPrgRom:3f216:ResetCheckpointFileIndirect:
NesPrgRom:3f219:ResetCheckpointFile:
NesPrgRom:3f233::$3f21b
NesPrgRom:3f237::unused??
NesPrgRom:3f23d:ChecksumSaveFile:
NesPrgRom:3f23e::71, 74, 77, 7a (7d, 7d)
NesPrgRom:3f241::11 <- (e.g.) 71
NesPrgRom:3f245::13 <- (e.g.) 72
NesPrgRom:3f249::15 <- (e.g.) 73
NesPrgRom:3f24d::10, 12, 14 <- 00
NesPrgRom:3f253::y <- 0
NesPrgRom:3f26a::$3f254
NesPrgRom:3f26d-3f272:DataTable_3f26d:
NesPrgRom:3f273:ReplicateSaveFile:
NesPrgRom:3f285::; Loop for 3 full cycles, copying $300 bytes
NesPrgRom:3f28c::$3f287
NesPrgRom:3f295::$3f287
NesPrgRom:3f298-3f2a3:SaveFileReplicationProfileTable:
NesPrgRom:3f2a4:HandleReset:
NesPrgRom:3f2b6::$3f2b3
NesPrgRom:3f2bb::$3f2b8
NesPrgRom:3f2be::$3f2b3
NesPrgRom:3f311::$3f308
NesPrgRom:3f31e::$3f317
NesPrgRom:3f320::8000 -> 30000
NesPrgRom:3f342::$3f33e
NesPrgRom:3f35f::; These memory spots are set on the first reset, and appear to be used\\n; to distinguish soft from hard resets.  It probably uses three bytes\\n; to minimize the chance of random memory values on boot conflicting.
NesPrgRom:3f374:HandleColdBoot:; Wipe the checkpoint file on cold boot, then set the magic bytes\\n; in volatile RAM to identify as a warm boot in the future.  Reset\\n; debug mode to "off".
NesPrgRom:3f38a::; If pressing start or select on hard boot,\\n; set [0f] nonzero to indicate debug mode.
NesPrgRom:3f391::$3f397
NesPrgRom:3f39f:HandleWarmBoot:
NesPrgRom:3f3a2::; Replicate the checkpoint directly into 6480..667f\\n; Except this is incorrect alignment... seems pointless.
NesPrgRom:3f3b1::$3f3a4
NesPrgRom:3f3b6:HandleNMI:
NesPrgRom:3f3b7::Clear the NMI flag
NesPrgRom:3f3bc::$3f3c6
NesPrgRom:3f3c0::$3f3c8
NesPrgRom:3f3c9::push y
NesPrgRom:3f3cb::push x
NesPrgRom:3f3ce::$3f40a
NesPrgRom:3f3d0::; Do an OAM DMA
NesPrgRom:3f3d8::; Copy the viewport coords from $[2345] into $7d[89ab]
NesPrgRom:3f3ec::; ???
NesPrgRom:3f3f0::$3f3f6
NesPrgRom:3f3f4::$3f40a
NesPrgRom:3f412::; Write PPUMASK from $01
NesPrgRom:3f41a::break holding pattern $3c16d
NesPrgRom:3f41c::pull x
NesPrgRom:3f41e::pull y
NesPrgRom:3f420::pull a
NesPrgRom:3f421:Rti_3f421:
NesPrgRom:3f422-3f423:DataTable_3f422:
NesPrgRom:3f424:SetIRQCallback:
NesPrgRom:3f433-3f434:IRQCallbackTable:
NesPrgRom:3f43b-3f43c::UNUSED
NesPrgRom:3f43d-3f43e::UNUSED
NesPrgRom:3f443:HandleIRQ:
NesPrgRom:3f452::$3f451
NesPrgRom:3f455:VerticalScreenWrapHandler:X = 9 always?
NesPrgRom:3f458::$3f451
NesPrgRom:3f45b::reset address latch
NesPrgRom:3f488:HandleStatusBarAndNextFrame:
NesPrgRom:3f48e::X = 9 always
NesPrgRom:3f4a0::reset address latch
NesPrgRom:3f4d6::$3f4db
NesPrgRom:3f4e5:MessageBoxTopHandler:
NesPrgRom:3f521::$3f527
NesPrgRom:3f525::$3f529
NesPrgRom:3f54b:MessageBoxBottomHandler:
NesPrgRom:3f56f::$3f58b
NesPrgRom:3f573::$3f58b
NesPrgRom:3f5a1-3f5b0:DataTable_3f5a1:
NesPrgRom:3f5e1:IRQCallback_04:
NesPrgRom:3f5fe::$3f60e
NesPrgRom:3f61a:InventoryUpdateCHRROMForMagic:
NesPrgRom:3f64f:SwitchCHRBankForMessageBox:; Note This seems related to SelectCHRRomBanks.\\n; Both write out all the CHR rom banks based on\\n; some part of RAM, but they use different regions\\n; This looks like it's used in the item menu.
NesPrgRom:3f691:AnimateSNKLogoScroll:
NesPrgRom:3f6ad:ExecuteScreenMode:
NesPrgRom:3f6c2-3f6c3:ScreenModeJumpTable:00 $f6d6
NesPrgRom:3f6c4-3f6c5::01 $f731
NesPrgRom:3f6c6-3f6c7::02 $f751
NesPrgRom:3f6c8-3f6c9::03 $f771
NesPrgRom:3f6ca-3f6cb::04 $f782
NesPrgRom:3f6cc-3f6cd::05 $f7c5
NesPrgRom:3f6ce-3f6cf::06 $f7db
NesPrgRom:3f6d0-3f6d1::07 $f6d6
NesPrgRom:3f6d4-3f6d5::09 $f731
NesPrgRom:3f6d6:ScreenModeJumpTable_07:
NesPrgRom:3f6d8::check that sprites and background are enabled
NesPrgRom:3f6da::$3f6df
NesPrgRom:3f6dc::if they are disabled, update music and return
NesPrgRom:3f6e9::Check if the nametable is currently set to #2 (the menu)
NesPrgRom:3f705:_3f705:; ----\\n; Set IRQ callback to the statusbar handler (01, $3f488)
NesPrgRom:3f71b:UpdatePpuScrollWrapping:
NesPrgRom:3f731:ScreenModeJumpTable_09:
NesPrgRom:3f751:ScreenModeJumpTable_02:
NesPrgRom:3f769::$3f76e
NesPrgRom:3f771:ScreenModeJumpTable_03:
NesPrgRom:3f782:ScreenModeJumpTable_04:
NesPrgRom:3f78a::$3f7aa
NesPrgRom:3f7b5:EffectTimingSelectTable:;; Lookup table for Unused Screenmode 4.\\n;; This value is the number of frames to run the effect for it seems.\\nunused
NesPrgRom:3f7c5:ScreenModeJumpTable_05:
NesPrgRom:3f7db:ScreenModeJumpTable_06:
NesPrgRom:3f7fe:MaybeUpdateMusic:;
NesPrgRom:3f800::$8000 -> $30000
NesPrgRom:3f813::$3f843
NesPrgRom:3f817::$3f82b
NesPrgRom:3f819::; OR together all the 4000,y shadows (0f bits are mainly volume,\\n; except triangle which is part of linear counter load)
NesPrgRom:3f827::$3f843
NesPrgRom:3f829::$3f832
NesPrgRom:3f830::$3f843
NesPrgRom:3f840::$3f866
NesPrgRom:3f846::$3f866
NesPrgRom:3f84b::$3f866
NesPrgRom:3f85b::Seems to be progressing something.
NesPrgRom:3f861::$3f858
NesPrgRom:3f86d::NOTE ResumeAudio may change $a000 page.
NesPrgRom:3f875::; Restore banks that were present before.
NesPrgRom:3f883:SelectCHRRomBanks:
NesPrgRom:3f8cb:WritePaletteDataToPpu:
NesPrgRom:3f8cd::$3f8d0
NesPrgRom:3f8df::$3f
NesPrgRom:3f8e1::$2006
NesPrgRom:3f8e4::$00
NesPrgRom:3f8e6::$2006
NesPrgRom:3f8ec::$2007
NesPrgRom:3f9ba-3f9bf::;; --------------------------------\\n;; NOTE The following (through $3fdf0) was not read in a full playthrough (UNUSED)
NesPrgRom:3fa00-3fa0f:DmcSample:
NesPrgRom:3fde0-3fdef::;; Maybe end of DMC data?!?\\n;; --------------------------------
NesPrgRom:3fe00:_3fe00:
NesPrgRom:3fe01::;; --------------------------------
NesPrgRom:3fe14::$3fe09
NesPrgRom:3fe17:_3fe17:
NesPrgRom:3fe18::;; --------------------------------
NesPrgRom:3fe2b::$3fe20
NesPrgRom:3fe2e-3fe2f::;; --------------------------------\\n;; UNUSED ?
NesPrgRom:3fe78-3fe7f::;; --------------------------------\\n; might actually be here on purpose?
NesPrgRom:3fe80:ReadControllersWithDirections:
NesPrgRom:3fe85::result of controller read
NesPrgRom:3fe87::dpad only
NesPrgRom:3fe8f::previously pressed buttons
NesPrgRom:3fe91::previously unpressed
NesPrgRom:3fe93::newly pressed
NesPrgRom:3fe9f::$3fea3
NesPrgRom:3fea4::$3fea8
NesPrgRom:3feab::$3feb8
NesPrgRom:3feb3::$3feb8
NesPrgRom:3feb5::; after 32 frames, keep it at $1f but set carry
NesPrgRom:3fec0::$3fec6
NesPrgRom:3fec2::; every 32 frames, y goes from 0 to #$80
NesPrgRom:3fec4::$3fec6 -> pointless???
NesPrgRom:3fecd::$3fe82
NesPrgRom:3fed0-3fedf:DirectionsByDpadBits:; 0   1   2   3   4   5   6   7   8   9   A   B   C   D   E   F\\n; -   R   L   lr  D   DR  DL  Dlr U   UR  UL  Ulr ud  udR udL *
NesPrgRom:3fee0:ReadControllersWithRepeat:
NesPrgRom:3fee7::A <- bitmask of previously-unpressed btns
NesPrgRom:3feeb::$4b,x <- newly pressed
NesPrgRom:3feef::A <- newly pressed directions only
NesPrgRom:3fef1::$3fef7
NesPrgRom:3fef3::$45,x <- #$0c if any new dpad pressed
NesPrgRom:3fefd::$3ff0f
NesPrgRom:3feff::; no change to dpad state
NesPrgRom:3ff01::$3ff0f
NesPrgRom:3ff03::; no change to dpad for 12 frames -> repeat in $4b,x
NesPrgRom:3ff14::$3fee2
NesPrgRom:3ff25::$3ff17
NesPrgRom:3ff28:SingleReadControllerX:; ----\\n; Strobe in order to start reading bits.\\n; Stores state of controller X in $4f, (MSB=A B SE ST UP DN LF RT=LSB)
NesPrgRom:3ff2a::$4016 <- 1
NesPrgRom:3ff2e::$4016 <- 0
NesPrgRom:3ff31::$4f <- 0
NesPrgRom:3ff3b::$3ff3e
NesPrgRom:3ff41::$3ff36
NesPrgRom:3ff44-3ff4f::;; --------------------------------\\n; NOTE UNCOVERED
NesPrgRom:3ff80:LoadOneObjectData:
NesPrgRom:3ff8c:DrawAllObjectSprites:
NesPrgRom:3ff92::38000 -> 8000
NesPrgRom:3ff9d:PrepareNametableStageForVerticalScroll:
NesPrgRom:3ffa9:DisplayNumber:
NesPrgRom:3ffb1::34000 -> 8000
NesPrgRom:3ffbe:UpdateHPDisplay:
NesPrgRom:3ffc4::34000 -> 8000
NesPrgRom:3ffcf:WaitForDialogToBeDismissed:
NesPrgRom:3ffdb:RestoreBanks:
NesPrgRom:3ffe3-3ffef::;; --------------------------------\\n;; NOTE NOT COVERED
NesPrgRom:3fffa-3fffb:NMIVector:
NesPrgRom:3fffc-3fffd:ResetVector:
NesPrgRom:3fffe-3ffff:IRQVector:
`;export{VANILLA_LABELS};
