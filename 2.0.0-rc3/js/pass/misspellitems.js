const MISSPELLINGS = new Map([
    ['Sword of Wind', ['Sord of Wind', 'Sowrd of Wind', 'Sword of Wien']],
    ['Sword of Fire', ['Sword of Frirer']],
    ['Sword of Water', ['Horde of Otters']],
    ['Sword of Thunder', ['Sorg of Chunker']],
    ['Flame Bracelet', ['Fame Bracelet']],
    ['Storm Bracelet', ['Stom Bracelet']],
    ['Sacred Shield', ['Scared Shield']],
    ['Bow of Truth', ['Bow of Strewth']],
    ['Statue of Onyx', ['Statue of Onxy']],
    ['Fog Lamp', ['Frog Lamp', 'Smog Lamp', 'Dog Lamp']],
    ['Key to Stxy', ['Key to Styx']],
    ['Insect Flute', ['Bug Flute']],
    ['Flute of Lime', ['Flute of Grime']],
    ['Iron Necklace', ['I Ron Necklace']],
    ['Shield Ring', ['Sho Ring']],
    ['Deo\'s Pendant', ['Rabbit Necklace', 'Bunny Pendant']],
    ['Speed Boots', ['Hermes Sandals']],
    ['Rabbit Boots', ['Deo\'s Boots', 'Jumping Boots', 'Rabid Boots']],
    ['Alarm Flute', ['Pocket Rooster', 'Alarm Clock']],
    ['Shell Flute', ['Conch Shell']],
    ['Eye Glasses', ['3D Glasses', 'X-Ray Goggles']],
    ['Kirisa Plant', ['Kilika Plant']],
    ['Refresh', ['Cure', 'Cura', 'Curaga']],
    ['Recover', ['Esuna']],
    ['Paralysis', ['Stop', 'Pew Pew']],
    ['Telepathy', ['Clairvoyance', 'ESP', 'Head Talk']],
    ['Teleport', ['Warp', 'Go Place Fast']],
    ['Change', ['Transform', 'Disguise']],
    ['Barrier', ['Protect', 'Wall', 'Shield']],
    ['Flight', ['Blight', 'Super Jump']],
    ['Fruit of Lime', ['Fruit of Crime', 'Gold Needle', 'Soft']],
    ['Medical Herb', ['Potion', 'Hi Potion']],
    ['Fruit of Repun', ['Anti-Slime Pill', 'Maiden\'s Kiss']],
]);
export function misspellItems(rom, flags, random) {
    if (flags.unidentifiedItems())
        return;
    const item = rom.items[random.nextInt(0x48)];
    if (!item)
        return;
    const newName = MISSPELLINGS.get(item.messageName) || [];
    const index = Math.floor(random.nextInt(3 * newName.length + 1) / 3);
    if (index < newName.length) {
        item.messageName = item.menuName = newName[index];
    }
    else if (item.messageName === item.menuName) {
        const name = item.messageName.split('');
        const pos = random.nextInt(name.length - 1);
        if (name[pos] === ' ' || name[pos + 1] === ' ') {
            return;
        }
        else if (name[pos].toUpperCase() === name[pos]) {
            name.splice(pos + 1, 1);
        }
        else {
            [name[pos], name[pos + 1]] = [name[pos + 1], name[pos]];
        }
        item.messageName = item.menuName = name.join('');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzc3BlbGxpdGVtcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL21pc3NwZWxsaXRlbXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsTUFBTSxZQUFZLEdBQWtDLElBQUksR0FBRyxDQUFDO0lBQzFELENBQUMsZUFBZSxFQUFFLENBQUMsY0FBYyxFQUFFLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUNyRSxDQUFDLGVBQWUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDdEMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDdkMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDekMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3JDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNyQyxDQUFDLGVBQWUsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3BDLENBQUMsY0FBYyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNwQyxDQUFDLGdCQUFnQixFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN0QyxDQUFDLFVBQVUsRUFBRSxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDcEQsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNoQyxDQUFDLGNBQWMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQy9CLENBQUMsZUFBZSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNyQyxDQUFDLGVBQWUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDckMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM3QixDQUFDLGdCQUFnQixFQUFFLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLENBQUM7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QUVoRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDekI7YUFBTTtZQUVMLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDekQ7UUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNsRDtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcblxuY29uc3QgTUlTU1BFTExJTkdTOiBSZWFkb25seU1hcDxzdHJpbmcsIHN0cmluZ1tdPiA9IG5ldyBNYXAoW1xuICBbJ1N3b3JkIG9mIFdpbmQnLCBbJ1NvcmQgb2YgV2luZCcsICdTb3dyZCBvZiBXaW5kJywgJ1N3b3JkIG9mIFdpZW4nXV0sXG4gIFsnU3dvcmQgb2YgRmlyZScsIFsnU3dvcmQgb2YgRnJpcmVyJ11dLFxuICBbJ1N3b3JkIG9mIFdhdGVyJywgWydIb3JkZSBvZiBPdHRlcnMnXV0sXG4gIFsnU3dvcmQgb2YgVGh1bmRlcicsIFsnU29yZyBvZiBDaHVua2VyJ11dLFxuICBbJ0ZsYW1lIEJyYWNlbGV0JywgWydGYW1lIEJyYWNlbGV0J11dLFxuICBbJ1N0b3JtIEJyYWNlbGV0JywgWydTdG9tIEJyYWNlbGV0J11dLFxuICBbJ1NhY3JlZCBTaGllbGQnLCBbJ1NjYXJlZCBTaGllbGQnXV0sXG4gIFsnQm93IG9mIFRydXRoJywgWydCb3cgb2YgU3RyZXd0aCddXSxcbiAgWydTdGF0dWUgb2YgT255eCcsIFsnU3RhdHVlIG9mIE9ueHknXV0sXG4gIFsnRm9nIExhbXAnLCBbJ0Zyb2cgTGFtcCcsICdTbW9nIExhbXAnLCAnRG9nIExhbXAnXV0sXG4gIFsnS2V5IHRvIFN0eHknLCBbJ0tleSB0byBTdHl4J11dLFxuICBbJ0luc2VjdCBGbHV0ZScsIFsnQnVnIEZsdXRlJ11dLFxuICBbJ0ZsdXRlIG9mIExpbWUnLCBbJ0ZsdXRlIG9mIEdyaW1lJ11dLFxuICBbJ0lyb24gTmVja2xhY2UnLCBbJ0kgUm9uIE5lY2tsYWNlJ11dLFxuICBbJ1NoaWVsZCBSaW5nJywgWydTaG8gUmluZyddXSxcbiAgWydEZW9cXCdzIFBlbmRhbnQnLCBbJ1JhYmJpdCBOZWNrbGFjZScsICdCdW5ueSBQZW5kYW50J11dLFxuICBbJ1NwZWVkIEJvb3RzJywgWydIZXJtZXMgU2FuZGFscyddXSxcbiAgWydSYWJiaXQgQm9vdHMnLCBbJ0Rlb1xcJ3MgQm9vdHMnLCAnSnVtcGluZyBCb290cycsICdSYWJpZCBCb290cyddXSxcbiAgWydBbGFybSBGbHV0ZScsIFsnUG9ja2V0IFJvb3N0ZXInLCAnQWxhcm0gQ2xvY2snXV0sXG4gIFsnU2hlbGwgRmx1dGUnLCBbJ0NvbmNoIFNoZWxsJ11dLFxuICBbJ0V5ZSBHbGFzc2VzJywgWyczRCBHbGFzc2VzJywgJ1gtUmF5IEdvZ2dsZXMnXV0sXG4gIFsnS2lyaXNhIFBsYW50JywgWydLaWxpa2EgUGxhbnQnXV0sXG4gIFsnUmVmcmVzaCcsIFsnQ3VyZScsICdDdXJhJywgJ0N1cmFnYSddXSxcbiAgWydSZWNvdmVyJywgWydFc3VuYSddXSxcbiAgWydQYXJhbHlzaXMnLCBbJ1N0b3AnLCAnUGV3IFBldyddXSxcbiAgWydUZWxlcGF0aHknLCBbJ0NsYWlydm95YW5jZScsICdFU1AnLCAnSGVhZCBUYWxrJ11dLFxuICBbJ1RlbGVwb3J0JywgWydXYXJwJywgJ0dvIFBsYWNlIEZhc3QnXV0sXG4gIFsnQ2hhbmdlJywgWydUcmFuc2Zvcm0nLCAnRGlzZ3Vpc2UnXV0sXG4gIFsnQmFycmllcicsIFsnUHJvdGVjdCcsICdXYWxsJywgJ1NoaWVsZCddXSxcbiAgWydGbGlnaHQnLCBbJ0JsaWdodCcsICdTdXBlciBKdW1wJ11dLFxuICBbJ0ZydWl0IG9mIExpbWUnLCBbJ0ZydWl0IG9mIENyaW1lJywgJ0dvbGQgTmVlZGxlJywgJ1NvZnQnXV0sXG4gIFsnTWVkaWNhbCBIZXJiJywgWydQb3Rpb24nLCAnSGkgUG90aW9uJ11dLFxuICBbJ0ZydWl0IG9mIFJlcHVuJywgWydBbnRpLVNsaW1lIFBpbGwnLCAnTWFpZGVuXFwncyBLaXNzJ11dLFxuXSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBtaXNzcGVsbEl0ZW1zKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pIHtcbiAgaWYgKGZsYWdzLnVuaWRlbnRpZmllZEl0ZW1zKCkpIHJldHVybjtcbiAgLy8gUGljayBhIHNpbmdsZSBpdGVtIHRvIG1pc3NwZWxsLlxuICBjb25zdCBpdGVtID0gcm9tLml0ZW1zW3JhbmRvbS5uZXh0SW50KDB4NDgpXTtcbiAgaWYgKCFpdGVtKSByZXR1cm47XG4gIGNvbnN0IG5ld05hbWUgPSBNSVNTUEVMTElOR1MuZ2V0KGl0ZW0ubWVzc2FnZU5hbWUpIHx8IFtdO1xuICAvLyBVc2UgY3VzdG9tIG1pc3NwZWxsaW5nIDN4IG1vcmUgb2Z0ZW4gdGhhbiBhIHJhbmRvbSBvbmVcbiAgY29uc3QgaW5kZXggPSBNYXRoLmZsb29yKHJhbmRvbS5uZXh0SW50KDMgKiBuZXdOYW1lLmxlbmd0aCArIDEpIC8gMyk7XG4gIGlmIChpbmRleCA8IG5ld05hbWUubGVuZ3RoKSB7XG4gICAgLy8gVXNlIG9uZSBvZiB0aGUgY3VzdG9tIG1pc3NwZWxsaW5nc1xuICAgIGl0ZW0ubWVzc2FnZU5hbWUgPSBpdGVtLm1lbnVOYW1lID0gbmV3TmFtZVtpbmRleF07XG4gIH0gZWxzZSBpZiAoaXRlbS5tZXNzYWdlTmFtZSA9PT0gaXRlbS5tZW51TmFtZSkge1xuICAgIC8vIE1ha2UgYSByYW5kb20gZXJyb3IgYnkgc3dhcHBpbmcgdHdvIGxldHRlcnMgb3IgZGVsZXRpbmcgb25lIGxldHRlci5cbiAgICBjb25zdCBuYW1lID0gaXRlbS5tZXNzYWdlTmFtZS5zcGxpdCgnJyk7XG4gICAgY29uc3QgcG9zID0gcmFuZG9tLm5leHRJbnQobmFtZS5sZW5ndGggLSAxKTtcbiAgICBpZiAobmFtZVtwb3NdID09PSAnICcgfHwgbmFtZVtwb3MgKyAxXSA9PT0gJyAnKSB7XG4gICAgICAvLyBOb3QgbXVjaCB3ZSBjYW4gZG8gd2l0aCBhIHNwYWNlLCBzbyBqdXN0IGdpdmUgdXAuXG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChuYW1lW3Bvc10udG9VcHBlckNhc2UoKSA9PT0gbmFtZVtwb3NdKSB7XG4gICAgICAvLyBEb24ndCBzd2FwIHVwcGVyY2FzZSBsZXR0ZXJzIHdpdGggdGhlIG9uZSBhZnRlcjogaW5zdGVhZCBkZWxldGUgbmV4dFxuICAgICAgbmFtZS5zcGxpY2UocG9zICsgMSwgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFN3YXAgdHdvIGFkamFjZW50IGxldHRlcnNcbiAgICAgIFtuYW1lW3Bvc10sIG5hbWVbcG9zICsgMV1dID0gW25hbWVbcG9zICsgMV0sIG5hbWVbcG9zXV07XG4gICAgfVxuICAgIGl0ZW0ubWVzc2FnZU5hbWUgPSBpdGVtLm1lbnVOYW1lID0gbmFtZS5qb2luKCcnKTtcbiAgfVxufVxuIl19