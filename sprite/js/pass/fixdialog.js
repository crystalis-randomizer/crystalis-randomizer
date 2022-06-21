import { Item } from '../rom/item.js';
import { hex } from '../rom/util.js';
import { buildTradeInMap } from './shuffletrades.js';
import { fail } from '../assert.js';
export function fixDialog(rom) {
    const { flags: { AkahanaStatueOfOnyxTradein, AsinaInBackRoom, BehindWhirlpool, KensuInSwan, MtSabreNorthSummit, MtSabreWestTornel, PortoaQueen, Rage, RepairedStatue, SlimedKensu, StomFightReward, ZebuAtWindmill, }, npcs: { AkahanaInBrynmaer, Aryllis, Fisherman, }, } = rom;
    replaceMessage('03:06', ',', '');
    const tradeIns = buildTradeInMap(rom);
    function tradeIn(npc) {
        const trade = tradeIns.get(npc.id);
        if (!trade)
            throw new Error(`No trade-in for ${npc.name}`);
        return rom.items[trade];
    }
    if (!ZebuAtWindmill.item.isMagic())
        unmagic('00:1b');
    replaceMessage('00:1b', '[41:Refresh]', item(ZebuAtWindmill.item));
    const akahanaWant = tradeIn(AkahanaInBrynmaer);
    replaceMessage('02:01', 'an unusual statue', vague(akahanaWant));
    replaceMessage('02:02', 'a statue', `the ${commonNoun(akahanaWant)}`);
    replaceMessage('02:02', '[29:Gas Mask]', item(AkahanaStatueOfOnyxTradein));
    if (!StomFightReward.item.isMagic())
        unmagic('03:01');
    replaceMessage('03:01', '[43:Telepathy]', item(StomFightReward));
    const tornelWant = findTornelTradeIn(rom);
    replaceMessage('03:01', '[06:Tornado Bracelet]', item(tornelWant));
    replaceMessage('05:0a', '[06:Tornado Bracelet]', item(tornelWant));
    replaceMessage('05:0a', '[44:Teleport]', item(MtSabreWestTornel));
    const fogLampWant = tradeIn(Fisherman);
    replaceMessage('09:01', '[35:Fog Lamp]', item(fogLampWant));
    replaceMessage('09:04', '[35:Fog Lamp]', item(fogLampWant));
    replaceMessage('09:05', '[35:Fog Lamp]', item(fogLampWant));
    replaceMessage('09:06', 'lamp', commonNoun(fogLampWant));
    const queenWant = rom.npcs.PortoaQueen.dialog()[3].condition;
    replaceMessage('0a:0c', '[28:Flute of Lime]', item(PortoaQueen));
    replaceMessage('0a:0d', '[02:Sword of Water]', item(queenWant));
    if (!AsinaInBackRoom.item.isMagic())
        unmagic('0b:01');
    replaceMessage('0b:01', '[45:Recover]', item(AsinaInBackRoom));
    if (!BehindWhirlpool.item.isMagic()) {
        unmagic('0b:01');
        unmagic('1d:12');
    }
    replaceMessage('0b:01', '[46:Barrier]', item(BehindWhirlpool));
    replaceMessage('1d:12', '[46:Barrier]', item(BehindWhirlpool));
    let fogLampCaveLoot = findLoot(0x4f, 0x4e, 0x4d, 0x4c, 0x47, 0x46, 0x45, 0x44, 0x4b, 0x4a, 0x49, 0x48);
    if (fogLampCaveLoot) {
        replaceMessage('0d:00', '[35:Fog Lamp]', item(fogLampCaveLoot));
    }
    else {
        replaceMessage('0d:00', 'that a [35:Fog Lamp] was', 'there was treasure');
    }
    const rageWant = rom.npcs.Rage.dialog()[0].condition;
    replaceMessage('0e:03', '[02:Sword of Water]', item(rageWant));
    replaceMessage('0e:03', '[09:Ball of Water]', item(Rage));
    replaceMessage('10:0c', 'that\'s', 'is');
    replaceMessage('10:0c', /, is in the\+lighthouse/, '');
    const aryllisWant = tradeIn(Aryllis);
    replaceMessage('12:05', '[3c:Kirisa Plant]', item(aryllisWant));
    replaceMessage('12:10', 'the plant', `the ${commonNoun(aryllisWant)}`);
    replaceMessage('12:10', '[3c:Kirisa Plant]', item(aryllisWant));
    const aryllisClue = `Our illustrious chief seeks ${vague(aryllisWant)}.`;
    replaceMessage('12:09', /[^]*/, aryllisClue);
    replaceMessage('12:0a', /[^]*/, aryllisClue);
    const lovePendantWant = tradeIn(rom.npcs.KensuInSwan);
    replaceMessage('13:02', '[3b:Love Pendant]', item(lovePendantWant));
    replaceMessage('13:00', 'pendant', commonNoun(lovePendantWant));
    if (!KensuInSwan.item.isMagic()) {
        unmagic('13:02');
    }
    replaceMessage('13:02', '[47:Change]', item(KensuInSwan));
    const ivoryStatueWant = tradeIn(rom.npcs.SlimedKensu);
    replaceMessage('18:06', '[3d:Ivory Statue]', item(ivoryStatueWant));
    replaceMessage('18:07', '[3d:Ivory Statue]', item(ivoryStatueWant));
    replaceMessage('18:06', `It's in a room`, '{0b:Karmine} is');
    if (!SlimedKensu.item.isMagic())
        replaceMessage('18:07', 'teach', 'give');
    replaceMessage('18:07', '[48:Flight]', item(SlimedKensu));
    if (!MtSabreNorthSummit.item.isMagic())
        unmagic('1c:10');
    replaceMessage('1c:10', '[42:Paralysis]', item(MtSabreNorthSummit));
    replaceMessage('20:06', 'Statue of Gold', item(RepairedStatue));
    function unmagic(mid) {
        replaceMessage(mid, /teach\s+you\s+the\s+magic\s+of/, 'bestow upon you the');
    }
    function item(item) {
        if (typeof item === 'number') {
            item = rom.items[rom.itemGets[item & 0xff].itemId];
        }
        else if (!(item instanceof Item))
            item = item.item;
        return `[${hex(item.id)}:${item.messageName}]`;
    }
    function replaceMessage(mid, pat, repl) {
        const [part, index] = mid.split(':').map(x => parseInt(x, 16));
        const msg = rom.messages.parts[part][index];
        msg.text = msg.text.replace(pat, repl);
    }
    function findLoot(...locs) {
        const conditions = [
            (item) => BOWS.has(item),
            (item) => SWORD_OR_MAGIC.has(item),
            (item) => itemget(item).unique,
        ];
        for (const cond of conditions) {
            for (const id of locs) {
                const loc = rom.locations[id];
                for (const spawn of loc.spawns) {
                    if (!spawn.isChest())
                        continue;
                    const item = rom.slots[spawn.id];
                    if (item <= 0x48 && cond(item)) {
                        return rom.items[item];
                    }
                }
            }
        }
        return undefined;
    }
    function itemget(id) {
        const itemget = rom.itemGets[id];
        return rom.items[itemget.itemId];
    }
}
const BOWS = new Set([0x3e, 0x3f, 0x40]);
const SWORD_OR_MAGIC = new Set([0x00, 0x01, 0x02, 0x03, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48]);
function findTornelTradeIn(rom) {
    const { Tornel } = rom.npcs;
    for (const ds of Tornel.localDialogs.values()) {
        for (let i = 2; i < ds.length; i++) {
            const item = ~ds[i].condition;
            if (item > 0x204 && item <= 0x20c && !(item & 1)) {
                return rom.items[item & 0xff];
            }
        }
    }
    return rom.items.TornadoBracelet;
}
function vague(item) {
    const items = item.rom.items;
    switch (item) {
        case items.StatueOfOnyx: return 'an unusual statue';
        case items.FluteOfLime: return 'a rare instrument';
        case items.FogLamp: return 'a brilliant lamp';
        case items.LovePendant: return 'a beautiful charm';
        case items.KirisaPlant: return 'a fragrant plant';
        case items.IvoryStatue: return 'an exotic statue';
    }
    fail();
    return 'a valuable item';
}
function commonNoun(item) {
    const items = item.rom.items;
    switch (item) {
        case items.StatueOfOnyx: return 'statue';
        case items.FluteOfLime: return 'instrument';
        case items.FogLamp: return 'lamp';
        case items.LovePendant: return 'pendant';
        case items.KirisaPlant: return 'plant';
        case items.IvoryStatue: return 'statue';
    }
    fail();
    return 'item';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4ZGlhbG9nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3Bhc3MvZml4ZGlhbG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVwQyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDbkMsT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFHbEMsTUFBTSxVQUFVLFNBQVMsQ0FBQyxHQUFRO0lBQ2hDLE1BQU0sRUFDSixLQUFLLEVBQUUsRUFDTCwwQkFBMEIsRUFDMUIsZUFBZSxFQUNmLGVBQWUsRUFDZixXQUFXLEVBQ1gsa0JBQWtCLEVBQ2xCLGlCQUFpQixFQUNqQixXQUFXLEVBQ1gsSUFBSSxFQUNKLGNBQWMsRUFDZCxXQUFXLEVBQ1gsZUFBZSxFQUNmLGNBQWMsR0FDZixFQUNELElBQUksRUFBRSxFQUNKLGlCQUFpQixFQUNqQixPQUFPLEVBQ1AsU0FBUyxHQUNWLEdBQ0YsR0FBRyxHQUFHLENBQUM7SUFHUixjQUFjLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVqQyxNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEMsU0FBUyxPQUFPLENBQUMsR0FBUTtRQUN2QixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsS0FBSztZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBR0QsSUFBSSxDQUFDLGNB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RCxLQUFLLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBRSxPQUFPLG1CQUFtQixDQUFDO1FBQ3BELEtBQUssS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFNLE9BQU8sa0JBQWtCLENBQUM7UUFDbkQsS0FBSyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUUsT0FBTyxtQkFBbUIsQ0FBQztRQUNwRCxLQUFLLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBRSxPQUFPLGtCQUFrQixDQUFDO1FBQ25ELEtBQUssS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFFLE9BQU8sa0JBQWtCLENBQUM7S0FFcEQ7SUFDRCxJQUFJLEVBQUUsQ0FBQztJQUNQLE9BQU8saUJBQWlCLENBQUM7QUFDM0IsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLElBQVU7SUFDNUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDN0IsUUFBUSxJQUFJLEVBQUU7UUFDWixLQUFLLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQztRQUN6QyxLQUFLLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBRSxPQUFPLFlBQVksQ0FBQztRQUM3QyxLQUFLLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBTSxPQUFPLE1BQU0sQ0FBQztRQUN2QyxLQUFLLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBRSxPQUFPLFNBQVMsQ0FBQztRQUMxQyxLQUFLLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBRSxPQUFPLE9BQU8sQ0FBQztRQUN4QyxLQUFLLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBRSxPQUFPLFFBQVEsQ0FBQztLQUMxQztJQUNELElBQUksRUFBRSxDQUFDO0lBQ1AsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtGbGFnfSBmcm9tICcuLi9yb20vZmxhZ3MuanMnO1xuaW1wb3J0IHtJdGVtfSBmcm9tICcuLi9yb20vaXRlbS5qcyc7XG5pbXBvcnQge05wY30gZnJvbSAnLi4vcm9tL25wYy5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHtidWlsZFRyYWRlSW5NYXB9IGZyb20gJy4vc2h1ZmZsZXRyYWRlcy5qcyc7XG5pbXBvcnQge2ZhaWx9IGZyb20gJy4uL2Fzc2VydC5qcyc7XG5cbi8qKiBGaW5kcyByZWZlcmVuY2VzIHRvIGdpdmVuIGl0ZW1zIGFuZCByZXBsYWNlcyBpdCB3aXRoIHRoZSBhY3R1YWwgaXRlbXMuICovXG5leHBvcnQgZnVuY3Rpb24gZml4RGlhbG9nKHJvbTogUm9tKSB7XG4gIGNvbnN0IHtcbiAgICBmbGFnczoge1xuICAgICAgQWthaGFuYVN0YXR1ZU9mT255eFRyYWRlaW4sXG4gICAgICBBc2luYUluQmFja1Jvb20sXG4gICAgICBCZWhpbmRXaGlybHBvb2wsXG4gICAgICBLZW5zdUluU3dhbixcbiAgICAgIE10U2FicmVOb3J0aFN1bW1pdCxcbiAgICAgIE10U2FicmVXZXN0VG9ybmVsLFxuICAgICAgUG9ydG9hUXVlZW4sXG4gICAgICBSYWdlLFxuICAgICAgUmVwYWlyZWRTdGF0dWUsXG4gICAgICBTbGltZWRLZW5zdSxcbiAgICAgIFN0b21GaWdodFJld2FyZCxcbiAgICAgIFplYnVBdFdpbmRtaWxsLFxuICAgIH0sXG4gICAgbnBjczoge1xuICAgICAgQWthaGFuYUluQnJ5bm1hZXIsXG4gICAgICBBcnlsbGlzLFxuICAgICAgRmlzaGVybWFuLFxuICAgIH0sXG4gIH0gPSByb207XG5cbiAgLy8gU3RvbSdzIFwiSSdsbCwgYmUgd2FpdGluZy4uLlwiIGRpYWxvZyAtIHRoZSBjb21tYSBpcyBqdXN0IHdyb25nLlxuICByZXBsYWNlTWVzc2FnZSgnMDM6MDYnLCAnLCcsICcnKTtcblxuICBjb25zdCB0cmFkZUlucyA9IGJ1aWxkVHJhZGVJbk1hcChyb20pO1xuICBmdW5jdGlvbiB0cmFkZUluKG5wYzogTnBjKTogSXRlbSB7XG4gICAgY29uc3QgdHJhZGUgPSB0cmFkZUlucy5nZXQobnBjLmlkKTtcbiAgICBpZiAoIXRyYWRlKSB0aHJvdyBuZXcgRXJyb3IoYE5vIHRyYWRlLWluIGZvciAke25wYy5uYW1lfWApO1xuICAgIHJldHVybiByb20uaXRlbXNbdHJhZGVdO1xuICB9XG4gIC8vIE5PVEU6IHdlIG5lZWQgdG8gaGFyZGNvZGUgb3JpZ2luYWwgbmFtZXMgaW4gY2FzZSB0aGV5IHdlcmUgc2h1ZmZsZWQuXG5cbiAgaWYgKCFaZWJ1QXRXaW5kbWlsbC5pdGVtLmlzTWFnaWMoKSkgdW5tYWdpYygnMDA6MWInKTtcbiAgcmVwbGFjZU1lc3NhZ2UoJzAwOjFiJywgJ1s0MTpSZWZyZXNoXScsIGl0ZW0oWmVidUF0V2luZG1pbGwuaXRlbSkpO1xuXG4gIGNvbnN0IGFrYWhhbmFXYW50ID0gdHJhZGVJbihBa2FoYW5hSW5CcnlubWFlcik7XG4gIHJlcGxhY2VNZXNzYWdlKCcwMjowMScsICdhbiB1bnVzdWFsIHN0YXR1ZScsIHZhZ3VlKGFrYWhhbmFXYW50KSk7XG4gIHJlcGxhY2VNZXNzYWdlKCcwMjowMicsICdhIHN0YXR1ZScsIGB0aGUgJHtjb21tb25Ob3VuKGFrYWhhbmFXYW50KX1gKTtcbiAgcmVwbGFjZU1lc3NhZ2UoJzAyOjAyJywgJ1syOTpHYXMgTWFza10nLCBpdGVtKEFrYWhhbmFTdGF0dWVPZk9ueXhUcmFkZWluKSk7XG5cbiAgaWYgKCFTdG9tRmlnaHRSZXdhcmQuaXRlbS5pc01hZ2ljKCkpIHVubWFnaWMoJzAzOjAxJyk7XG4gIHJlcGxhY2VNZXNzYWdlKCcwMzowMScsICdbNDM6VGVsZXBhdGh5XScsIGl0ZW0oU3RvbUZpZ2h0UmV3YXJkKSk7XG5cbiAgY29uc3QgdG9ybmVsV2FudCA9IGZpbmRUb3JuZWxUcmFkZUluKHJvbSk7XG4gIHJlcGxhY2VNZXNzYWdlKCcwMzowMScsICdbMDY6VG9ybmFkbyBCcmFjZWxldF0nLCBpdGVtKHRvcm5lbFdhbnQpKTtcbiAgcmVwbGFjZU1lc3NhZ2UoJzA1OjBhJywgJ1swNjpUb3JuYWRvIEJyYWNlbGV0XScsIGl0ZW0odG9ybmVsV2FudCkpO1xuICByZXBsYWNlTWVzc2FnZSgnMDU6MGEnLCAnWzQ0OlRlbGVwb3J0XScsIGl0ZW0oTXRTYWJyZVdlc3RUb3JuZWwpKTtcblxuICBjb25zdCBmb2dMYW1wV2FudCA9IHRyYWRlSW4oRmlzaGVybWFuKTtcbiAgcmVwbGFjZU1lc3NhZ2UoJzA5OjAxJywgJ1szNTpGb2cgTGFtcF0nLCBpdGVtKGZvZ0xhbXBXYW50KSk7XG4gIHJlcGxhY2VNZXNzYWdlKCcwOTowNCcsICdbMzU6Rm9nIExhbXBdJywgaXRlbShmb2dMYW1wV2FudCkpO1xuICByZXBsYWNlTWVzc2FnZSgnMDk6MDUnLCAnWzM1OkZvZyBMYW1wXScsIGl0ZW0oZm9nTGFtcFdhbnQpKTtcbiAgcmVwbGFjZU1lc3NhZ2UoJzA5OjA2JywgJ2xhbXAnLCBjb21tb25Ob3VuKGZvZ0xhbXBXYW50KSk7XG5cbiAgY29uc3QgcXVlZW5XYW50ID0gcm9tLm5wY3MuUG9ydG9hUXVlZW4uZGlhbG9nKClbM10uY29uZGl0aW9uO1xuICByZXBsYWNlTWVzc2FnZSgnMGE6MGMnLCAnWzI4OkZsdXRlIG9mIExpbWVdJywgaXRlbShQb3J0b2FRdWVlbikpO1xuICByZXBsYWNlTWVzc2FnZSgnMGE6MGQnLCAnWzAyOlN3b3JkIG9mIFdhdGVyXScsIGl0ZW0ocXVlZW5XYW50KSk7XG4gIC8vIFRPRE8gLSBjb25zaWRlciByZXBsYWNpbmcgMGE6MGQgYnV0IHdlIG5lZWQgdG8gYWxzbyByZXBsYWNlIGNvbmRpdGlvbj9cbiAgaWYgKCFBc2luYUluQmFja1Jvb20uaXRlbS5pc01hZ2ljKCkpIHVubWFnaWMoJzBiOjAxJyk7XG4gIHJlcGxhY2VNZXNzYWdlKCcwYjowMScsICdbNDU6UmVjb3Zlcl0nLCBpdGVtKEFzaW5hSW5CYWNrUm9vbSkpO1xuXG4gIGlmICghQmVoaW5kV2hpcmxwb29sLml0ZW0uaXNNYWdpYygpKSB7XG4gICAgdW5tYWdpYygnMGI6MDEnKTtcbiAgICB1bm1hZ2ljKCcxZDoxMicpO1xuICB9XG4gIHJlcGxhY2VNZXNzYWdlKCcwYjowMScsICdbNDY6QmFycmllcl0nLCBpdGVtKEJlaGluZFdoaXJscG9vbCkpO1xuICByZXBsYWNlTWVzc2FnZSgnMWQ6MTInLCAnWzQ2OkJhcnJpZXJdJywgaXRlbShCZWhpbmRXaGlybHBvb2wpKTtcblxuICAvLyBMb29rIGZvciBhIGtleSBpdGVtIGluIHRoZSBmb2cgbGFtcC9raXJpc2EgcGxhbnQgY2F2ZXMuXG4gIC8vIE9yZGVyIGlzIGJhY2sgb2YgZm9nIGxhbXAsIGtpcmlzYSBiYWNrLXRvLWZyb250LCB0aGVuIGZyb250IG9mIGZvZyBsYW1wXG4gIGxldCBmb2dMYW1wQ2F2ZUxvb3QgPSBmaW5kTG9vdCgweDRmLCAweDRlLCAweDRkLCAweDRjLCAweDQ3LCAweDQ2LCAweDQ1LCAweDQ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMHg0YiwgMHg0YSwgMHg0OSwgMHg0OCk7XG4gIGlmIChmb2dMYW1wQ2F2ZUxvb3QpIHtcbiAgICByZXBsYWNlTWVzc2FnZSgnMGQ6MDAnLCAnWzM1OkZvZyBMYW1wXScsIGl0ZW0oZm9nTGFtcENhdmVMb290KSk7XG4gIH0gZWxzZSB7XG4gICAgcmVwbGFjZU1lc3NhZ2UoJzBkOjAwJywgJ3RoYXQgYSBbMzU6Rm9nIExhbXBdIHdhcycsICd0aGVyZSB3YXMgdHJlYXN1cmUnKTtcbiAgfVxuXG4gIGNvbnN0IHJhZ2VXYW50ID0gcm9tLm5wY3MuUmFnZS5kaWFsb2coKVswXS5jb25kaXRpb247XG4gIHJlcGxhY2VNZXNzYWdlKCcwZTowMycsICdbMDI6U3dvcmQgb2YgV2F0ZXJdJywgaXRlbShyYWdlV2FudCkpO1xuICByZXBsYWNlTWVzc2FnZSgnMGU6MDMnLCAnWzA5OkJhbGwgb2YgV2F0ZXJdJywgaXRlbShSYWdlKSk7XG5cbiAgLy8gVE9ETyAtIG1lc3NhZ2UgMTA6MGMgaXMgb25seSBoYWxmLWNvcnJlY3QuICBJZiBpdGVtIG5hbWVzIGFyZSByYW5kb21pemVkXG4gIC8vIHRoZW4gZXZlbiB3aXRob3V0IGEgbG9jYXRpb24gdGhlIG1lc3NhZ2UgaXMgc3RpbGwgdXNlZnVsLiAgU28ganVzdCBkbyB0aGF0XG4gIC8vIGZvciBub3csIGFuZCB3ZSBjYW4gZmluZCBhIHdheSB0byBoaW50IGxhdGVyLlxuICByZXBsYWNlTWVzc2FnZSgnMTA6MGMnLCAndGhhdFxcJ3MnLCAnaXMnKTtcbiAgcmVwbGFjZU1lc3NhZ2UoJzEwOjBjJywgLywgaXMgaW4gdGhlXFwrbGlnaHRob3VzZS8sICcnKTtcblxuICBjb25zdCBhcnlsbGlzV2FudCA9IHRyYWRlSW4oQXJ5bGxpcyk7XG4gIHJlcGxhY2VNZXNzYWdlKCcxMjowNScsICdbM2M6S2lyaXNhIFBsYW50XScsIGl0ZW0oYXJ5bGxpc1dhbnQpKTtcbiAgcmVwbGFjZU1lc3NhZ2UoJzEyOjEwJywgJ3RoZSBwbGFudCcsIGB0aGUgJHtjb21tb25Ob3VuKGFyeWxsaXNXYW50KX1gKTtcbiAgcmVwbGFjZU1lc3NhZ2UoJzEyOjEwJywgJ1szYzpLaXJpc2EgUGxhbnRdJywgaXRlbShhcnlsbGlzV2FudCkpO1xuICAvLyBUT0RPIC0gcmVmcyBpbiAxMjowOSBhbmQgMTI6MGEgaGF2ZSBsb2NhdGlvbiwgdG9vLlxuICAvLyByZXBsYWNlTWVzc2FnZSgnMTI6MDknLCAvXFxzKlxcbi4qLywgJy4nKTtcbiAgLy8gcmVwbGFjZU1lc3NhZ2UoJzEyOjBhJywgL1xccypcXG4uKi8sICcuJyk7XG4gIGNvbnN0IGFyeWxsaXNDbHVlID0gYE91ciBpbGx1c3RyaW91cyBjaGllZiBzZWVrcyAke3ZhZ3VlKGFyeWxsaXNXYW50KX0uYDtcbiAgcmVwbGFjZU1lc3NhZ2UoJzEyOjA5JywgL1teXSovLCBhcnlsbGlzQ2x1ZSk7XG4gIHJlcGxhY2VNZXNzYWdlKCcxMjowYScsIC9bXl0qLywgYXJ5bGxpc0NsdWUpO1xuXG4gIGNvbnN0IGxvdmVQZW5kYW50V2FudCA9IHRyYWRlSW4ocm9tLm5wY3MuS2Vuc3VJblN3YW4pO1xuICByZXBsYWNlTWVzc2FnZSgnMTM6MDInLCAnWzNiOkxvdmUgUGVuZGFudF0nLCBpdGVtKGxvdmVQZW5kYW50V2FudCkpO1xuICByZXBsYWNlTWVzc2FnZSgnMTM6MDAnLCAncGVuZGFudCcsIGNvbW1vbk5vdW4obG92ZVBlbmRhbnRXYW50KSk7XG4gIGlmICghS2Vuc3VJblN3YW4uaXRlbS5pc01hZ2ljKCkpIHtcbiAgICB1bm1hZ2ljKCcxMzowMicpO1xuICB9XG4gIHJlcGxhY2VNZXNzYWdlKCcxMzowMicsICdbNDc6Q2hhbmdlXScsIGl0ZW0oS2Vuc3VJblN3YW4pKTtcblxuICBjb25zdCBpdm9yeVN0YXR1ZVdhbnQgPSB0cmFkZUluKHJvbS5ucGNzLlNsaW1lZEtlbnN1KTtcbiAgcmVwbGFjZU1lc3NhZ2UoJzE4OjA2JywgJ1szZDpJdm9yeSBTdGF0dWVdJywgaXRlbShpdm9yeVN0YXR1ZVdhbnQpKTtcbiAgcmVwbGFjZU1lc3NhZ2UoJzE4OjA3JywgJ1szZDpJdm9yeSBTdGF0dWVdJywgaXRlbShpdm9yeVN0YXR1ZVdhbnQpKTtcbiAgcmVwbGFjZU1lc3NhZ2UoJzE4OjA2JywgYEl0J3MgaW4gYSByb29tYCwgJ3swYjpLYXJtaW5lfSBpcycpO1xuICBpZiAoIVNsaW1lZEtlbnN1Lml0ZW0uaXNNYWdpYygpKSByZXBsYWNlTWVzc2FnZSgnMTg6MDcnLCAndGVhY2gnLCAnZ2l2ZScpO1xuICByZXBsYWNlTWVzc2FnZSgnMTg6MDcnLCAnWzQ4OkZsaWdodF0nLCBpdGVtKFNsaW1lZEtlbnN1KSk7XG5cbiAgaWYgKCFNdFNhYnJlTm9ydGhTdW1taXQuaXRlbS5pc01hZ2ljKCkpIHVubWFnaWMoJzFjOjEwJyk7XG4gIHJlcGxhY2VNZXNzYWdlKCcxYzoxMCcsICdbNDI6UGFyYWx5c2lzXScsIGl0ZW0oTXRTYWJyZU5vcnRoU3VtbWl0KSk7XG5cbiAgLy8gVE9ETyAtIHNodWZmbGUgd2hpY2ggaXRlbSByZWNvbnN0cnVjdHMgd2hpY2ggb3RoZXI/XG4gIHJlcGxhY2VNZXNzYWdlKCcyMDowNicsICdTdGF0dWUgb2YgR29sZCcsIGl0ZW0oUmVwYWlyZWRTdGF0dWUpKTtcblxuICAvLyBUT0RPIC0gY29uc2lkZXIgd2FycGluZyBvbiBhIHJhbmRvbSBzd29yZD8gLSBtZXNzYWdlIDFjOjExXG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4gIGZ1bmN0aW9uIHVubWFnaWMobWlkOiBzdHJpbmcpIHtcbiAgICByZXBsYWNlTWVzc2FnZShtaWQsIC90ZWFjaFxccyt5b3VcXHMrdGhlXFxzK21hZ2ljXFxzK29mLywgJ2Jlc3RvdyB1cG9uIHlvdSB0aGUnKTtcbiAgfVxuICBmdW5jdGlvbiBpdGVtKGl0ZW06IG51bWJlcnxGbGFnfEl0ZW0pOiBzdHJpbmcge1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGl0ZW0gPSByb20uaXRlbXNbcm9tLml0ZW1HZXRzW2l0ZW0gJiAweGZmXS5pdGVtSWRdO1xuICAgIH0gZWxzZSBpZiAoIShpdGVtIGluc3RhbmNlb2YgSXRlbSkpIGl0ZW0gPSBpdGVtLml0ZW0gYXMgSXRlbTtcbiAgICByZXR1cm4gYFske2hleChpdGVtLmlkKX06JHtpdGVtLm1lc3NhZ2VOYW1lfV1gO1xuICB9XG4gIGZ1bmN0aW9uIHJlcGxhY2VNZXNzYWdlKG1pZDogc3RyaW5nLCBwYXQ6IHN0cmluZyB8IFJlZ0V4cCwgcmVwbDogc3RyaW5nKSB7XG4gICAgY29uc3QgW3BhcnQsIGluZGV4XSA9IG1pZC5zcGxpdCgnOicpLm1hcCh4ID0+IHBhcnNlSW50KHgsIDE2KSk7XG4gICAgY29uc3QgbXNnID0gcm9tLm1lc3NhZ2VzLnBhcnRzW3BhcnRdW2luZGV4XTtcbiAgICBtc2cudGV4dCA9IG1zZy50ZXh0LnJlcGxhY2UocGF0LCByZXBsKTtcbiAgfVxuICBmdW5jdGlvbiBmaW5kTG9vdCguLi5sb2NzOiBudW1iZXJbXSk6IEl0ZW18dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb25kaXRpb25zID0gW1xuICAgICAgKGl0ZW06IG51bWJlcikgPT4gQk9XUy5oYXMoaXRlbSksXG4gICAgICAoaXRlbTogbnVtYmVyKSA9PiBTV09SRF9PUl9NQUdJQy5oYXMoaXRlbSksXG4gICAgICAoaXRlbTogbnVtYmVyKSA9PiBpdGVtZ2V0KGl0ZW0pLnVuaXF1ZSxcbiAgICBdO1xuXG4gICAgZm9yIChjb25zdCBjb25kIG9mIGNvbmRpdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3QgaWQgb2YgbG9jcykge1xuICAgICAgICBjb25zdCBsb2MgPSByb20ubG9jYXRpb25zW2lkXTtcbiAgICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2Muc3Bhd25zKSB7XG4gICAgICAgICAgaWYgKCFzcGF3bi5pc0NoZXN0KCkpIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IGl0ZW0gPSByb20uc2xvdHNbc3Bhd24uaWRdO1xuICAgICAgICAgIGlmIChpdGVtIDw9IDB4NDggJiYgY29uZChpdGVtKSkge1xuICAgICAgICAgICAgcmV0dXJuIHJvbS5pdGVtc1tpdGVtXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBmdW5jdGlvbiBpdGVtZ2V0KGlkOiBudW1iZXIpOiBJdGVtIHtcbiAgICBjb25zdCBpdGVtZ2V0ID0gcm9tLml0ZW1HZXRzW2lkXTtcbiAgICByZXR1cm4gcm9tLml0ZW1zW2l0ZW1nZXQuaXRlbUlkXTtcbiAgfVxufVxuXG5jb25zdCBCT1dTID0gbmV3IFNldChbMHgzZSwgMHgzZiwgMHg0MF0pO1xuY29uc3QgU1dPUkRfT1JfTUFHSUMgPSBuZXcgU2V0KFsweDAwLCAweDAxLCAweDAyLCAweDAzLCAweDQxLCAweDQyLCAweDQzLCAweDQ0LCAweDQ1LCAweDQ2LCAweDQ3LCAweDQ4XSk7XG5cbmZ1bmN0aW9uIGZpbmRUb3JuZWxUcmFkZUluKHJvbTogUm9tKTogSXRlbSB7XG4gIC8vIEV4cGVjdGVkIHN0cnVjdHVyZTpcbiAgLy8gICAuLi5cbiAgLy8gICBOT1QgYnJhY2VsZXQgLT4gLi4uXG4gIC8vICAgTk9UIGJhbGwgLT4gLi4uXG4gIC8vICAgLT4gZ2l2ZSBpdGVtXG4gIGNvbnN0IHtUb3JuZWx9ID0gcm9tLm5wY3M7XG4gIGZvciAoY29uc3QgZHMgb2YgVG9ybmVsLmxvY2FsRGlhbG9ncy52YWx1ZXMoKSkge1xuICAgIGZvciAobGV0IGkgPSAyOyBpIDwgZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSB+ZHNbaV0uY29uZGl0aW9uO1xuICAgICAgLy8gTG9vayBmb3IgYW55IG5lZ2F0aXZlIGNvbmRpdGlvbiBvbiBhIGJyYWNlbGV0IChkb2Vzbid0IG1hdHRlciB3aGVyZSlcbiAgICAgIGlmIChpdGVtID4gMHgyMDQgJiYgaXRlbSA8PSAweDIwYyAmJiAhKGl0ZW0gJiAxKSkge1xuICAgICAgICByZXR1cm4gcm9tLml0ZW1zW2l0ZW0gJiAweGZmXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJvbS5pdGVtcy5Ub3JuYWRvQnJhY2VsZXQ7IC8vIGRlZmF1bHQgdG8gdG9ybmFkbyBicmFjZWxldFxufVxuXG5mdW5jdGlvbiB2YWd1ZShpdGVtOiBJdGVtKTogc3RyaW5nIHtcbiAgY29uc3QgaXRlbXMgPSBpdGVtLnJvbS5pdGVtcztcbiAgc3dpdGNoIChpdGVtKSB7XG4gICAgY2FzZSBpdGVtcy5TdGF0dWVPZk9ueXg6IHJldHVybiAnYW4gdW51c3VhbCBzdGF0dWUnO1xuICAgIGNhc2UgaXRlbXMuRmx1dGVPZkxpbWU6ICByZXR1cm4gJ2EgcmFyZSBpbnN0cnVtZW50JztcbiAgICBjYXNlIGl0ZW1zLkZvZ0xhbXA6ICAgICAgcmV0dXJuICdhIGJyaWxsaWFudCBsYW1wJztcbiAgICBjYXNlIGl0ZW1zLkxvdmVQZW5kYW50OiAgcmV0dXJuICdhIGJlYXV0aWZ1bCBjaGFybSc7XG4gICAgY2FzZSBpdGVtcy5LaXJpc2FQbGFudDogIHJldHVybiAnYSBmcmFncmFudCBwbGFudCc7XG4gICAgY2FzZSBpdGVtcy5Jdm9yeVN0YXR1ZTogIHJldHVybiAnYW4gZXhvdGljIHN0YXR1ZSc7XG4gICAgLy8gVE9ETyAtIHN0YXR1ZSBvZiBnb2xkXG4gIH1cbiAgZmFpbCgpO1xuICByZXR1cm4gJ2EgdmFsdWFibGUgaXRlbSc7XG59XG5cbmZ1bmN0aW9uIGNvbW1vbk5vdW4oaXRlbTogSXRlbSk6IHN0cmluZyB7XG4gIGNvbnN0IGl0ZW1zID0gaXRlbS5yb20uaXRlbXM7XG4gIHN3aXRjaCAoaXRlbSkge1xuICAgIGNhc2UgaXRlbXMuU3RhdHVlT2ZPbnl4OiByZXR1cm4gJ3N0YXR1ZSc7XG4gICAgY2FzZSBpdGVtcy5GbHV0ZU9mTGltZTogIHJldHVybiAnaW5zdHJ1bWVudCc7XG4gICAgY2FzZSBpdGVtcy5Gb2dMYW1wOiAgICAgIHJldHVybiAnbGFtcCc7XG4gICAgY2FzZSBpdGVtcy5Mb3ZlUGVuZGFudDogIHJldHVybiAncGVuZGFudCc7XG4gICAgY2FzZSBpdGVtcy5LaXJpc2FQbGFudDogIHJldHVybiAncGxhbnQnO1xuICAgIGNhc2UgaXRlbXMuSXZvcnlTdGF0dWU6ICByZXR1cm4gJ3N0YXR1ZSc7XG4gIH1cbiAgZmFpbCgpO1xuICByZXR1cm4gJ2l0ZW0nO1xufVxuXG4vLyBmdW5jdGlvbiByZXBsYWNlRGlhbG9nKG5wYzogTnBjLCBvcmlnOiBudW1iZXIgfCBSZWdFeHAsIHJlcGxhY2VtZW50SWQ6IG51bWJlcikge1xuLy8gICBjb25zdCByb20gPSBucGMucm9tO1xuLy8gICBjb25zdCBwYXQgPSBvcmlnIGluc3RhbmNlb2YgUmVnRXhwID8gb3JpZyA6IHBhdHRlcm4ocm9tLml0ZW1zW29yaWddKTtcbi8vICAgY29uc3QgcmVwbCA9IHJlcGxhY2VtZW50KHJvbS5pdGVtc1tyZXBsYWNlbWVudElkXSk7XG4vLyAgIGZvciAoY29uc3QgZHMgb2YgbnBjLmxvY2FsRGlhbG9ncy52YWx1ZXMoKSkge1xuLy8gICAgIGZvciAoY29uc3QgZCBvZiBkcykge1xuLy8gICAgICAgY29uc3QgbWlkID0gZC5tZXNzYWdlO1xuLy8gICAgICAgcmVwbGFjZU1lc3NhZ2Uocm9tLCBtaWQucGFydCwgbWlkLmluZGV4LCBwYXQsIHJlcGwpO1xuLy8gICAgIH1cbi8vICAgfVxuLy8gfVxuXG4vLyBjb25zdCBwYXR0ZXJuOiB7KGlkOiBudW1iZXIsIG5hbWU6IHN0cmluZyk6IFJlZ0V4cDtcbi8vICAgICAgICAgICAgICAgICAoaXRlbTogSXRlbSk6IFJlZ0V4cH0gPVxuLy8gICAgIChpdGVtOiBudW1iZXIgfCBJdGVtLCBuYW1lPzogc3RyaW5nKSA9PiB7XG4vLyAgICAgICBuYW1lID0gbmFtZSB8fCAoaXRlbSBhcyBJdGVtKS5tZXNzYWdlTmFtZTtcbi8vICAgICAgIGNvbnN0IGlkID0gaGV4KGl0ZW0gaW5zdGFuY2VvZiBJdGVtID8gaXRlbS5pZCA6IGl0ZW0pO1xuLy8gICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoYFxcXFxbJHtpZH06W15cXFxcXV0qXFxcXF18JHtuYW1lLnJlcGxhY2UoL1xccysvZywgJ1xcXFxzKycpfWAsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAnZycpO1xuLy8gICAgIH07XG5cbi8vIGZ1bmN0aW9uIHJlcGxhY2VtZW50KGl0ZW06IEl0ZW0pOiBzdHJpbmcge1xuLy8gICByZXR1cm4gYFske2hleChpdGVtLmlkKX06JHtpdGVtLm1lc3NhZ2VOYW1lfV1gO1xuLy8gfVxuIl19