import"./chunk-PIDEUWOP.js";var m=t=>{window.onspawn=()=>{},window.onspawned=()=>{},window.onlocation=()=>{},window.slots=[],t.debug.breakAt(246365,"prg","x",()=>{let a=t.cpu.ram[17],r=t.cpu.ram[16];return window.spawningId=a,window.spawningSlot=r,window.slots[r]=a,window.onspawn(a,r)}),window.neverDie=()=>{t.debug.patchRom(248713,173),t.debug.patchRom(248714,192),t.debug.patchRom(248715,3),t.debug.patchRom(248716,141),t.debug.patchRom(248717,193),t.debug.patchRom(248718,3),t.debug.patchRom(248719,234),t.debug.patchRom(248751,208),t.debug.patchRom(248752,15),t.debug.patchRom(248768,96)},t.debug.breakAt(246371,"prg","x",()=>window.onspawned(window.spawningId,window.spawningSlot)),t.debug.breakAt(246451,"prg","x",()=>window.onspawned(window.spawningId,window.spawningSlot)),t.debug.breakAt(246797,"prg","x",()=>window.onspawned(window.spawningId,window.spawningSlot)),t.debug.breakAt(108,"ram","w",()=>window.onlocation(t.cpu.ram[108])),window.levelUp=(a=0)=>{t.cpu.ram[1798]=1,t.cpu.ram[1799]=0,t.cpu.ram[1057]=Math.min(t.cpu.ram[1057]+a,15)},window.max=()=>{window.levelUp(14),t.cpu.ram[961]=t.cpu.ram[1800]=255,t.cpu.ram[1794]=t.cpu.ram[1795]=255,t.cpu.write(25648,0),t.cpu.write(25649,1),t.cpu.write(25650,2),t.cpu.write(25651,3),t.cpu.write(25652,25),t.cpu.write(25653,26),t.cpu.write(25654,27),t.cpu.write(25655,28),t.cpu.write(25656,17),t.cpu.write(25657,18),t.cpu.write(25658,19),t.cpu.write(25659,20),t.cpu.write(25660,6),t.cpu.write(25661,8),t.cpu.write(25662,10),t.cpu.write(25663,12)},window.hex=a=>"$"+a.toString(16).padStart(2,0),window.seq=(a,r)=>new Array(a).fill(0).map((x,i)=>r(i)),window.watchSpawns=()=>{window.onspawned=(a,r)=>console.log(`spawned ${hex(a)} at ${hex(r)}: ${seq(32,x=>hex(t.cpu.ram[768+32*x+r]))}`)},window.watchDamage=()=>{t.debug.breakAt(217943,"prg","x",()=>console.log(`hit by ${hex(t.cpu.REG_Y)}: ${hex(slots[t.cpu.REG_Y])}`))},t.debug.breakpoints=null,window.warp=(a,r=0)=>{t.cpu.ram[108]=a,t.cpu.ram[109]=r,t.cpu.ram[65]=1};class w{constructor(r,x,i){this.id=r,this.addr=(r>>3)+25728,this.mask=1<<(r&7)}get(){return!!(t.cpu.load(this.addr)&this.mask)}set(){t.cpu.write(this.addr,t.cpu.load(this.addr)|this.mask)}clear(){t.cpu.write(this.addr,t.cpu.load(this.addr)&~this.mask)}toString(){return`Flag ${this.id.toString(16).padStart(3,0)} (${this.addr.toString(16)}:${this.mask.toString(16).padStart(2,0)}): ${this.get()}`}}window.flag=a=>new w(a),window.itemget={swordOfWind:()=>o(t,0),swordOfFire:()=>o(t,1),swordOfWater:()=>o(t,2),swordOfThunder:()=>o(t,3),crystalis:()=>o(t,4),ballOfWind:()=>o(t,5),tornadoBracelet:()=>o(t,6),ballOfFire:()=>o(t,7),flameBracelet:()=>o(t,8),ballOfWater:()=>o(t,9),blizzardBracelet:()=>o(t,10),ballOfThunder:()=>o(t,11),stormBracelet:()=>o(t,12),carapaceShield:()=>o(t,13),bronzeShield:()=>o(t,14),platinumShield:()=>o(t,15),mirroredShield:()=>o(t,16),ceramicShield:()=>o(t,17),sacredShield:()=>o(t,18),battleShield:()=>o(t,19),psychoShield:()=>o(t,20),tannedHide:()=>o(t,21),leatherArmor:()=>o(t,22),bronzeArmor:()=>o(t,23),platinumArmor:()=>o(t,24),soldierSuit:()=>o(t,25),ceramicSuit:()=>o(t,26),battleArmor:()=>o(t,27),psychoArmor:()=>o(t,28),medicalHerb:()=>o(t,29),antidote:()=>o(t,30),lysisPlant:()=>o(t,31),fruitOfLime:()=>o(t,32),fruitOfPower:()=>o(t,33),magicRing:()=>o(t,34),fruitOfRepun:()=>o(t,35),warpBoots:()=>o(t,36),statueOfOnyx:()=>o(t,37),opelStatue:()=>o(t,38),insectFlute:()=>o(t,39),fluteOfLime:()=>o(t,40),gasMask:()=>o(t,41),powerRing:()=>o(t,42),warriorRing:()=>o(t,43),ironNecklace:()=>o(t,44),deosPendant:()=>o(t,45),rabbitBoots:()=>o(t,46),leatherBoots:()=>o(t,47),shieldRing:()=>o(t,48),alarmFlute:()=>o(t,49),windmillKey:()=>o(t,50),keyToPrison:()=>o(t,51),keyToStyx:()=>o(t,52),fogLamp:()=>o(t,53),shellFlute:()=>o(t,54),eyeGlasses:()=>o(t,55),brokenStatue:()=>o(t,56),glowingLamp:()=>o(t,57),statueOfGold:()=>o(t,58),lovePendant:()=>o(t,59),kirisaPlant:()=>o(t,60),ivoryStatue:()=>o(t,61),bowOfMoon:()=>o(t,62),bowOfSun:()=>o(t,63),bowOfTruth:()=>o(t,64),refresh:()=>o(t,65),paralysis:()=>o(t,66),telepathy:()=>o(t,67),teleport:()=>o(t,68),recover:()=>o(t,69),barrier:()=>o(t,70),change:()=>o(t,71),flight:()=>o(t,72)},window.show=(a,r=8)=>{let x=["        -0 -1 -2 -3 -4 -5 -6 -7 -8 -9 -a -b -c -d -e -f"],i=null;for(let c=a;x.length<r+1;c++)i||(i=`$${(c>>>4).toString(16).padStart(4,0)}x ${"   ".repeat(c&15)}`),i=`${i} ${t.rom.rom[c].toString(16).padStart(2,0)}`,(c&15)===15&&(x.push(i),i=null);console.log(x.join(`
`))},show.trigger=(a,...r)=>p(123258,81920,a&127,...r),show.dialog=(a,...r)=>p(117085,81920,a,...r),show.spawnCondition=(a,...r)=>p(116192,81920,a,...r),show.npcData=(a,...r)=>p(102913,65536,a,...r),show.object=a=>p(109568,65536,a,3),show.mapData=(a,r,...x)=>{let i=l(82688,49152,a);p(i,49152,r,...x)},show.mapData.layout=(a,...r)=>show.mapData(a,0,...r),show.mapData.graphics=(a,...r)=>show.mapData(a,1,...r),show.mapData.entrances=(a,...r)=>show.mapData(a,2,...r),show.mapData.exits=(a,...r)=>show.mapData(a,3,...r),show.mapData.flags=(a,...r)=>show.mapData(a,4,...r),show.mapData.pits=(a,...r)=>show.mapData(a,5,...r);function l(a,r,x){let i=t.rom.rom[a+2*x];return(t.rom.rom[a+2*x+1]<<8|i)+r}function p(a,r,x,...i){show(l(a,r,x),...i)}window.watchFlags=()=>{let a=new Array(768);for(let x=0;x<768;x++)a[x]=window.flag(x).get();let r=t.debug.logMem;t.debug.logMem=(...x)=>{if((x[1]&1048448)==25728){let i=(x[1]&127)<<3;if(i<768)for(let c=0;c<8;c++){let u=i+c,e=window.flag(i+c).get();e!=a[u]&&(a[u]=e,console.log(`Flag ${u.toString(16).padStart(3,0)} <- ${e}`))}}r.apply(t.debug,x)}},window.watchCallsTo=(a,r=()=>{})=>{t.debug.breakAt(a,"prg","x",()=>(console.log(`call $${a.toString(16)} from $${t.mmap.prgRomAddress(null,t.cpu.ram[t.cpu.REG_SP+1]|t.cpu.ram[t.cpu.REG_SP+2]<<8).toString(16).padStart(4,0)} A=$${t.cpu.REG_ACC.toString(16)}, X=$${t.cpu.REG_X.toString(16)}, Y=$${t.cpu.REG_Y.toString(16)}`),r()))},window.heal=()=>{for(let a of[1800,1801,960,961])t.cpu.ram[a]=255},window.alwaysHeal=()=>{window.heal(),window.setTimeout(window.alwaysHeal,500)},window.noClip=()=>{t.debug.patchRom(219696,24),t.debug.patchRom(219697,96)};function d(a,...r){(a&1032192)===245760&&t.rom.rom.length>262144&&(a|=262144),t.debug.patchRom(a,...r)}},o=(t,w)=>{let l=(t.rom.rom[121600+2*w]|t.rom.rom[121601+2*w]<<8)+81920,p=25648+t.rom.rom[l];for(let d=0;d<t.rom.rom[l+1];d++)if(t.cpu.load(p+d)==255){t.cpu.write(p+d,w);break}};window.strictCpu=()=>{for(let t=0;t<524288;t++)nes.rom.rom[t]===0&&nes.debug.breakAt(t,"prg","x");nes.debug.breakAt([128,32767],"ram","x")};window.installChunks=()=>{if(!nes.debug.chunkMap)return;let t=new Map([...sourcesContents].map(([w,l])=>[w,l.split(`
`)]));for(let w of window.linkChunks||[]){if(w.overlaps)continue;let l=new Map;for(let[d,a]of w.labelIndex||[])l.set(a,d);let p=w.name;for(let d=0;d<w.size;d++){p=l.get(d)||p;let a=w.sourceMap?.get(d);if(!a)continue;let{file:r,line:x}=a;x--;let i="",c=t.get(r);if(c){let u=x;do u--;while(u>=0&&/^(\s*;|\W:)/.test(c[u]));i=c.slice(u+1,x+1).join(`
`)}nes.debug.chunkMap.mapping[w.offset+d]={name:p,offset:d,file:r,line:x,code:i}}}};setTimeout(function(){strictCpu(),installChunks()},1e3);export{m as default};
