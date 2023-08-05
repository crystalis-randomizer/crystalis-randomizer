const KEY_NAMES = [
    '!Random Key',
    '!Curious Key',
    '!Bronze Key',
    '!Silver Key',
    '!Golden Key',
    '!Ancient Key',
    '!Small Key',
    '!Shiny Key',
    '!Mysterious Key',
    '!Magic Key',
    '!Backdoor Key',
    '!Skeleton Key',
    'Piano Key',
    'Encryption Key',
    'Private Key',
    'Public Key',
    'Key Card',
    'Any Key',
    'Space Bar',
    'Return Key',
    'Imaginary Key',
    'Giant Key',
    'Out of Key',
    'Key of C',
    'Key of G',
    'Key of B Flat',
    'Key of F Sharp',
    'Lockpick',
    'Transponder Key',
    'Sharp Key',
    'Flat Key',
    'Locke and Key',
    'Major Key',
    'Minor Key',
    'Cookie',
    'Turkey',
    'Monkey',
    'Ctrl Key',
    'Escape Key',
    'Car Key',
    'Clock Key',
    'Florida Key',
    'Key Lime Pie',
    'Keystone',
    'Answer Key',
];
const FLUTE_NAMES = [
    '!Random Flute',
    '!Wooden Flute',
    '!Metal Flute',
    '!Piccolo',
    'Horn of Plenty',
    '!Ocarina',
    'Fairy Ocarina',
    'Ocarina of Time',
    '!Pan Pipes',
    '!Bugle',
    '!Bagpipes',
    'Kazoo',
    'Lute',
    'Harp',
    'Guitar',
    'Electric Guitar',
    '!Tin Whistle',
    'Magic Whistle',
    'Dog Whistle',
    '!Recorder',
    '!Accordion',
    '!Harmonica',
    'Sousaphone',
    'Trumpet',
    'French Horn',
    'Trombone',
    'Euphonium',
    'Tuba',
    'Clarinet',
    'Saxophone',
    'Oboe',
    'Bassoon',
    'Violin',
    'Viola',
    'Cello',
    'Theramin',
    'Synthesizer',
    'Moog Synth',
    'Piano',
    'Harpsichord',
    'Pipe Organ',
    'Note Block',
    'Snare Drum',
    'Xylophone',
    'Marimba',
    'Tambourine',
    'Tornelsbane',
    'Flute of Power',
];
const LAMP_NAMES = [
    '!Random Lamp',
    '!Bronze Lamp',
    '!Silver Lamp',
    '!Gold Lamp',
    '!Oil Lamp',
    '!Magic Lamp',
    'Genie Lamp',
    'Dull Lamp',
    'Desk Lamp',
    'Shimmering Lamp',
    'Broken Lamp',
    'Brass Lantern',
    'Overhead Lamp',
    'Pedestal Lamp',
    'Incubation Lamp',
    'Fluorescent Lamp',
    'Ultraviolet Lamp',
    'Heat Lamp',
    'Recessed Lighting',
    'Laser Pointer',
    'Spotlight',
    'Flashlight',
    'Search Light',
    'Batsignal',
    'Candelabra',
    'Chandelier',
    'Birthday Candle',
    'Tallow Candle',
    'Wax Candle',
    'Tanning Bed',
    'CRT',
];
const STATUE_NAMES = [
    '!Random Statue',
    '!Rusty Statue',
    '!Forbidden Statue',
    'Golden Idol',
    '!Strange Statue',
    '!Glass Statue',
    '!Copper Statue',
    '!White Statue',
    'Invisible Statue',
    'Burt Figurine',
    'Draygon Figurine',
    'Karmine Figurine',
    'Mado Figurine',
    'Sabera Figurine',
    'Kelbesque Figurine',
    'Flail Guy Trophy',
    'Metroid Amiibo',
    'Model of Dyna',
    'Jeff Peters Statue',
    'M. Toki Statue',
    'Statue of Liberty',
    'Colossus of Rhodes',
    'Mattrick Figurine',
    'Dragondarch Statue',
    'Overswarm Statue',
    'Trueblue83 Statue',
    'TheAxeMan Idol',
    'Acmlm Figurine',
    'CodeGorilla Trophy',
];
const BOW_NAMES = [
    '!Random Bow',
    'Crossbow',
    'Autocrossbow',
    'Long Bow',
    'Compound Bow',
    'Silver Arrows',
    'Wooden Bow',
    'Violin Bow',
    'Tae Bo',
    'Botox',
    'Bo Derek',
    'Bo Diddley',
    'Bo Dallas',
    'Rainbow',
    'Hair Bow',
    'Bow Tie',
    '!Bow of Earth',
    '!Bow of Stars',
    '!Bow of Wind',
    '!Bow of Fire',
    '!Bow of Water',
    '!Bow of Thunder',
    '!Bow of Light',
    '!Bow of Darkness',
    'Bow of Lies',
    'Bow of Life',
    'Bow of Death',
    'Bow of Freedom',
    'JBowe',
    'KLINGSBO',
    'LILLABO',
    'SVALBO',
    'Buriza-Do Kyanon',
    'Windforce',
    'Eaglehorn',
];
export function unidentifiedItems(rom, flags, random) {
    if (!flags.unidentifiedItems())
        return;
    const items = (...ids) => ids.map(id => rom.items[id]);
    const keys = items(0x32, 0x33, 0x34);
    const flutes = items(0x27, 0x28, 0x31, 0x36);
    const lamps = items(0x35, 0x39);
    const statues = items(0x25, 0x38, 0x3a, 0x3d);
    const bows = items(0x3e, 0x3f, 0x40);
    for (const [list, [...names]] of [[keys, KEY_NAMES],
        [flutes, FLUTE_NAMES],
        [lamps, LAMP_NAMES],
        [statues, STATUE_NAMES],
        [bows, BOW_NAMES],
    ]) {
        const filteredNames = (flags.communityJokes() ? names : names.filter(n => n.startsWith('!')))
            .map(n => n.replace(/^!/, ''));
        random.shuffle(filteredNames);
        const palettes = random.shuffle([0, 1, 2, 3]);
        for (const item of list) {
            const name = filteredNames.pop();
            if (rom.spoiler)
                rom.spoiler.addUnidentifiedItem(item.id, item.messageName, name);
            item.menuName = item.messageName = name;
            item.palette = palettes.pop();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pZGVudGlmaWVkaXRlbXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcGFzcy91bmlkZW50aWZpZWRpdGVtcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFTQSxNQUFNLFNBQVMsR0FBRztJQUNoQixhQUFhO0lBQ2IsY0FBYztJQUNkLGFBQWE7SUFDYixhQUFhO0lBQ2IsYUFBYTtJQUNiLGNBQWM7SUFDZCxZQUFZO0lBQ1osWUFBWTtJQUNaLGlCQUFpQjtJQUNqQixZQUFZO0lBQ1osZUFBZTtJQUNmLGVBQWU7SUFDZixXQUFXO0lBQ1gsZ0JBQWdCO0lBQ2hCLGFBQWE7SUFDYixZQUFZO0lBQ1osVUFBVTtJQUNWLFNBQVM7SUFDVCxXQUFXO0lBQ1gsWUFBWTtJQUNaLGVBQWU7SUFDZixXQUFXO0lBQ1gsWUFBWTtJQUNaLFVBQVU7SUFDVixVQUFVO0lBQ1YsZUFBZTtJQUNmLGdCQUFnQjtJQUNoQixVQUFVO0lBQ1YsaUJBQWlCO0lBQ2pCLFdBQVc7SUFDWCxVQUFVO0lBQ1YsZUFBZTtJQUNmLFdBQVc7SUFDWCxXQUFXO0lBQ1gsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsVUFBVTtJQUNWLFlBQVk7SUFDWixTQUFTO0lBQ1QsV0FBVztJQUNYLGFBQWE7SUFDYixjQUFjO0lBQ2QsVUFBVTtJQUNWLFlBQVk7Q0FDYixDQUFDO0FBQ0YsTUFBTSxXQUFXLEdBQUc7SUFDbEIsZUFBZTtJQUNmLGVBQWU7SUFDZixjQUFjO0lBQ2QsVUFBVTtJQUNWLGdCQUFnQjtJQUNoQixVQUFVO0lBQ1YsZUFBZTtJQUNmLGlCQUFpQjtJQUNqQixZQUFZO0lBQ1osUUFBUTtJQUNSLFdBQVc7SUFDWCxPQUFPO0lBQ1AsTUFBTTtJQUNOLE1BQU07SUFDTixRQUFRO0lBQ1IsaUJBQWlCO0lBQ2pCLGNBQWM7SUFDZCxlQUFlO0lBQ2YsYUFBYTtJQUNiLFdBQVc7SUFDWCxZQUFZO0lBQ1osWUFBWTtJQUNaLFlBQVk7SUFDWixTQUFT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QU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbEYsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztZQUN4QyxJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLEVBQUcsQ0FBQztTQUNoQztLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi4vcmFuZG9tLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuXG4vLyBOT1RFOiB0aGUgISBwcmVmaXggaW5kaWNhdGVzIGl0IGlzIHVzZWQgd2hlbiBjb21tdW5pdHkgam9rZXMgYXJlXG4vLyBub3QgZW5hYmxlZC4gIFRoaXMgaXMgYSBtdWNoIHNtYWxsZXIgc2V0LiAgRXZlcnl0aGluZyBXSVRIT1VUIGFuXG4vLyBleGNsYW1hdGlvbiBwb2ludCBpcyByZXNlcnZlZCBhcyBhIGpva2UgYW5kIHdpbGwgbm90IGNvbWUgdXAgaW5cbi8vIGVhc3kgbW9kZS5cblxuY29uc3QgS0VZX05BTUVTID0gW1xuICAnIVJhbmRvbSBLZXknLFxuICAnIUN1cmlvdXMgS2V5JyxcbiAgJyFCcm9uemUgS2V5JyxcbiAgJyFTaWx2ZXIgS2V5JyxcbiAgJyFHb2xkZW4gS2V5JyxcbiAgJyFBbmNpZW50IEtleScsXG4gICchU21hbGwgS2V5JyxcbiAgJyFTaGlueSBLZXknLFxuICAnIU15c3RlcmlvdXMgS2V5JyxcbiAgJyFNYWdpYyBLZXknLFxuICAnIUJhY2tkb29yIEtleScsXG4gICchU2tlbGV0b24gS2V5JyxcbiAgJ1BpYW5vIEtleScsXG4gICdFbmNyeXB0aW9uIEtleScsXG4gICdQcml2YXRlIEtleScsXG4gICdQdWJsaWMgS2V5JyxcbiAgJ0tleSBDYXJkJyxcbiAgJ0FueSBLZXknLFxuICAnU3BhY2UgQmFyJyxcbiAgJ1JldHVybiBLZXknLFxuICAnSW1hZ2luYXJ5IEtleScsXG4gICdHaWFudCBLZXknLFxuICAnT3V0IG9mIEtleScsXG4gICdLZXkgb2YgQycsXG4gICdLZXkgb2YgRycsXG4gICdLZXkgb2YgQiBGbGF0JyxcbiAgJ0tleSBvZiBGIFNoYXJwJyxcbiAgJ0xvY2twaWNrJyxcbiAgJ1RyYW5zcG9uZGVyIEtleScsXG4gICdTaGFycCBLZXknLFxuICAnRmxhdCBLZXknLFxuICAnTG9ja2UgYW5kIEtleScsXG4gICdNYWpvciBLZXknLFxuICAnTWlub3IgS2V5JyxcbiAgJ0Nvb2tpZScsXG4gICdUdXJrZXknLFxuICAnTW9ua2V5JyxcbiAgJ0N0cmwgS2V5JyxcbiAgJ0VzY2FwZSBLZXknLFxuICAnQ2FyIEtleScsXG4gICdDbG9jayBLZXknLFxuICAnRmxvcmlkYSBLZXknLFxuICAnS2V5IExpbWUgUGllJyxcbiAgJ0tleXN0b25lJyxcbiAgJ0Fuc3dlciBLZXknLFxuXTtcbmNvbnN0IEZMVVRFX05BTUVTID0gW1xuICAnIVJhbmRvbSBGbHV0ZScsXG4gICchV29vZGVuIEZsdXRlJyxcbiAgJyFNZXRhbCBGbHV0ZScsXG4gICchUGljY29sbycsXG4gICdIb3JuIG9mIFBsZW50eScsXG4gICchT2NhcmluYScsXG4gICdGYWlyeSBPY2FyaW5hJyxcbiAgJ09jYXJpbmEgb2YgVGltZScsXG4gICchUGFuIFBpcGVzJyxcbiAgJyFCdWdsZScsXG4gICchQmFncGlwZXMnLFxuICAnS2F6b28nLFxuICAnTHV0ZScsXG4gICdIYXJwJyxcbiAgJ0d1aXRhcicsXG4gICdFbGVjdHJpYyBHdWl0YXInLFxuICAnIVRpbiBXaGlzdGxlJyxcbiAgJ01hZ2ljIFdoaXN0bGUnLFxuICAnRG9nIFdoaXN0bGUnLFxuICAnIVJlY29yZGVyJyxcbiAgJyFBY2NvcmRpb24nLFxuICAnIUhhcm1vbmljYScsXG4gICdTb3VzYXBob25lJyxcbiAgJ1RydW1wZXQnLFxuICAnRnJlbmNoIEhvcm4nLFxuICAnVHJvbWJvbmUnLFxuICAnRXVwaG9uaXVtJyxcbiAgJ1R1YmEnLFxuICAnQ2xhcmluZXQnLFxuICAnU2F4b3Bob25lJyxcbiAgJ09ib2UnLFxuICAnQmFzc29vbicsXG4gICdWaW9saW4nLFxuICAnVmlvbGEnLFxuICAnQ2VsbG8nLFxuICAnVGhlcmFtaW4nLFxuICAnU3ludGhlc2l6ZXInLFxuICAnTW9vZyBTeW50aCcsXG4gICdQaWFubycsXG4gICdIYXJwc2ljaG9yZCcsXG4gICdQaXBlIE9yZ2FuJyxcbiAgJ05vdGUgQmxvY2snLFxuICAnU25hcmUgRHJ1bScsXG4gICdYeWxvcGhvbmUnLFxuICAnTWFyaW1iYScsXG4gICdUYW1ib3VyaW5lJyxcbiAgJ1Rvcm5lbHNiYW5lJyxcbiAgJ0ZsdXRlIG9mIFBvd2VyJyxcbl07XG5jb25zdCBMQU1QX05BTUVTID0gW1xuICAnIVJhbmRvbSBMYW1wJyxcbiAgJyFCcm9uemUgTGFtcCcsXG4gICchU2lsdmVyIExhbXAnLFxuICAnIUdvbGQgTGFtcCcsXG4gICchT2lsIExhbXAnLFxuICAnIU1hZ2ljIExhbXAnLFxuICAnR2VuaWUgTGFtcCcsXG4gICdEdWxsIExhbXAnLFxuICAnRGVzayBMYW1wJyxcbiAgJ1NoaW1tZXJpbmcgTGFtcCcsXG4gICdCcm9rZW4gTGFtcCcsXG4gICdCcmFzcyBMYW50ZXJuJyxcbiAgJ092ZXJoZWFkIExhbXAnLFxuICAnUGVkZXN0YWwgTGFtcCcsXG4gICdJbmN1YmF0aW9uIExhbXAnLFxuICAnRmx1b3Jlc2NlbnQgTGFtcCcsXG4gICdVbHRyYXZpb2xldCBMYW1wJyxcbiAgJ0hlYXQgTGFtcCcsXG4gICdSZWNlc3NlZCBMaWdodGluZycsXG4gICdMYXNlciBQb2ludGVyJyxcbiAgJ1Nwb3RsaWdodCcsXG4gICdGbGFzaGxpZ2h0JyxcbiAgJ1NlYXJjaCBMaWdodCcsXG4gICdCYXRzaWduYWwnLFxuICAnQ2FuZGVsYWJyYScsXG4gICdDaGFuZGVsaWVyJyxcbiAgJ0JpcnRoZGF5IENhbmRsZScsXG4gICdUYWxsb3cgQ2FuZGxlJyxcbiAgJ1dheCBDYW5kbGUnLFxuICAnVGFubmluZyBCZWQnLFxuICAnQ1JUJyxcbl07XG5jb25zdCBTVEFUVUVfTkFNRVMgPSBbXG4gICchUmFuZG9tIFN0YXR1ZScsXG4gICchUnVzdHkgU3RhdHVlJyxcbiAgJyFGb3JiaWRkZW4gU3RhdHVlJyxcbiAgJ0dvbGRlbiBJZG9sJyxcbiAgJyFTdHJhbmdlIFN0YXR1ZScsXG4gICchR2xhc3MgU3RhdHVlJyxcbiAgJyFDb3BwZXIgU3RhdHVlJyxcbiAgJyFXaGl0ZSBTdGF0dWUnLFxuICAnSW52aXNpYmxlIFN0YXR1ZScsXG4gICdCdXJ0IEZpZ3VyaW5lJyxcbiAgJ0RyYXlnb24gRmlndXJpbmUnLFxuICAnS2FybWluZSBGaWd1cmluZScsXG4gICdNYWRvIEZpZ3VyaW5lJyxcbiAgJ1NhYmVyYSBGaWd1cmluZScsXG4gICdLZWxiZXNxdWUgRmlndXJpbmUnLFxuICAnRmxhaWwgR3V5IFRyb3BoeScsXG4gICdNZXRyb2lkIEFtaWlibycsXG4gICdNb2RlbCBvZiBEeW5hJyxcbiAgJ0plZmYgUGV0ZXJzIFN0YXR1ZScsXG4gICdNLiBUb2tpIFN0YXR1ZScsXG4gICdTdGF0dWUgb2YgTGliZXJ0eScsXG4gICdDb2xvc3N1cyBvZiBSaG9kZXMnLFxuICAnTWF0dHJpY2sgRmlndXJpbmUnLCAgLy8gIzIgc3BlZWRydW4gMjAxNyAoMWgwNG0wNHMpXG4gICdEcmFnb25kYXJjaCBTdGF0dWUnLCAvLyAjMSBzcGVlZHJ1biAyMDE2ICg1OG0xNHMpXG4gICdPdmVyc3dhcm0gU3RhdHVlJywgICAvLyAjMSBzcGVlZHJ1biAyMDE5LTIwMjEgKDUybTUzcylcbiAgJ1RydWVibHVlODMgU3RhdHVlJywgIC8vICMzIHNwZWVkcnVuIDIwMTkgKDU5bTI5cylcbiAgJ1RoZUF4ZU1hbiBJZG9sJywgICAgIC8vICM0IHNwZWVkcnVuIDIwMjAgKDU5aDU5bSksIFRBU1xuICAnQWNtbG0gRmlndXJpbmUnLCAgICAgLy8gIzIgc3BlZWRydW4gMjAyMSAoNTZtMDBzKVxuICAnQ29kZUdvcmlsbGEgVHJvcGh5JywgLy8gRnVsbCBTdHVwaWQgMjAyMS8xMS8yMVxuXTtcbi8vIFRPRE8gLSBzZXQgdXAgY29tYmluYXRpb25zIHRoYXQgc2hvdWxkIGFwcGVhciB0b2dldGhlclxuY29uc3QgQk9XX05BTUVTID0gW1xuICAnIVJhbmRvbSBCb3cnLFxuICAnQ3Jvc3Nib3cnLFxuICAnQXV0b2Nyb3NzYm93JyxcbiAgJ0xvbmcgQm93JyxcbiAgJ0NvbXBvdW5kIEJvdycsXG4gICdTaWx2ZXIgQXJyb3dzJyxcbiAgJ1dvb2RlbiBCb3cnLFxuICAnVmlvbGluIEJvdycsXG4gICdUYWUgQm8nLFxuICAnQm90b3gnLFxuICAnQm8gRGVyZWsnLFxuICAnQm8gRGlkZGxleScsXG4gICdCbyBEYWxsYXMnLFxuICAnUmFpbmJvdycsXG4gICdIYWlyIEJvdycsXG4gICdCb3cgVGllJyxcbiAgJyFCb3cgb2YgRWFydGgnLFxuICAnIUJvdyBvZiBTdGFycycsXG4gICchQm93IG9mIFdpbmQnLFxuICAnIUJvdyBvZiBGaXJlJyxcbiAgJyFCb3cgb2YgV2F0ZXInLFxuICAnIUJvdyBvZiBUaHVuZGVyJyxcbiAgJyFCb3cgb2YgTGlnaHQnLFxuICAnIUJvdyBvZiBEYXJrbmVzcycsXG4gICdCb3cgb2YgTGllcycsXG4gICdCb3cgb2YgTGlmZScsXG4gICdCb3cgb2YgRGVhdGgnLFxuICAnQm93IG9mIEZyZWVkb20nLFxuICAnSkJvd2UnLFxuICAnS0xJTkdTQk8nLFxuICAnTElMTEFCTycsXG4gICdTVkFMQk8nLFxuICAnQnVyaXphLURvIEt5YW5vbicsXG4gICdXaW5kZm9yY2UnLFxuICAnRWFnbGVob3JuJyxcbl07XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHVuaWRlbnRpZmllZEl0ZW1zKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pIHtcbiAgaWYgKCFmbGFncy51bmlkZW50aWZpZWRJdGVtcygpKSByZXR1cm47XG4gIGNvbnN0IGl0ZW1zID0gKC4uLmlkczogbnVtYmVyW10pID0+IGlkcy5tYXAoaWQgPT4gcm9tLml0ZW1zW2lkXSk7XG4gIGNvbnN0IGtleXMgPSBpdGVtcygweDMyLCAweDMzLCAweDM0KTtcbiAgY29uc3QgZmx1dGVzID0gaXRlbXMoMHgyNywgMHgyOCwgMHgzMSwgMHgzNik7XG4gIGNvbnN0IGxhbXBzID0gaXRlbXMoMHgzNSwgMHgzOSk7XG4gIGNvbnN0IHN0YXR1ZXMgPSBpdGVtcygweDI1LCAvKiBvcGVsIDB4MjYsICovIDB4MzgsIDB4M2EsIDB4M2QpO1xuICBjb25zdCBib3dzID0gaXRlbXMoMHgzZSwgMHgzZiwgMHg0MCk7XG5cbiAgZm9yIChjb25zdCBbbGlzdCwgWy4uLm5hbWVzXV0gb2YgW1trZXlzLCBLRVlfTkFNRVNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW2ZsdXRlcywgRkxVVEVfTkFNRVNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW2xhbXBzLCBMQU1QX05BTUVTXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtzdGF0dWVzLCBTVEFUVUVfTkFNRVNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW2Jvd3MsIEJPV19OQU1FU10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0gYXMgY29uc3QpIHtcbiAgICAvLyBwYWxldHRlcyBhcmUgOjAzIGJpdCBvZiBpdGVtLml0ZW1EYXRhVmFsdWVcbiAgICBjb25zdCBmaWx0ZXJlZE5hbWVzID1cbiAgICAgICAgKGZsYWdzLmNvbW11bml0eUpva2VzKCkgPyBuYW1lcyA6IG5hbWVzLmZpbHRlcihuID0+IG4uc3RhcnRzV2l0aCgnIScpKSlcbiAgICAgICAgICAgIC5tYXAobiA9PiBuLnJlcGxhY2UoL14hLywgJycpKTtcbiAgICByYW5kb20uc2h1ZmZsZShmaWx0ZXJlZE5hbWVzKTtcbiAgICBjb25zdCBwYWxldHRlcyA9IHJhbmRvbS5zaHVmZmxlKFswLCAxLCAyLCAzXSk7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGxpc3QpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBmaWx0ZXJlZE5hbWVzLnBvcCgpITtcbiAgICAgIGlmIChyb20uc3BvaWxlcikgcm9tLnNwb2lsZXIuYWRkVW5pZGVudGlmaWVkSXRlbShpdGVtLmlkLCBpdGVtLm1lc3NhZ2VOYW1lLCBuYW1lKTtcbiAgICAgIGl0ZW0ubWVudU5hbWUgPSBpdGVtLm1lc3NhZ2VOYW1lID0gbmFtZTtcbiAgICAgIGl0ZW0ucGFsZXR0ZSA9IHBhbGV0dGVzLnBvcCgpITtcbiAgICB9XG4gIH1cbn1cbiJdfQ==