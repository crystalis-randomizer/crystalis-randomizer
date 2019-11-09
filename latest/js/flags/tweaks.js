export const TWEAK_FLAGS = {
    section: 'Tweaks',
    prefix: 'T',
    flags: [
        {
            flag: 'Ta',
            name: 'Automatically equip orbs and bracelets',
            text: `Adds a quality-of-life improvement to automatically equip the
             corresponding orb/bracelet whenever changing swords.`,
        },
        {
            flag: 'Tb',
            name: 'Buff bonus items',
            text: `Leather Boots are changed to Speed Boots, which increase player walking
             speed (this allows climbing up the slope to access the Tornado Bracelet
             chest, which is taken into consideration by the logic).  Deo's pendant
             restores MP while moving.  Rabbit boots enable sword charging up to
             level 2 while walking (level 3 still requires being stationary, so as
             to prevent wasting tons of magic).`,
        },
        {
            flag: 'Tc',
            name: 'Disable controller shortcuts',
            text: `By default, we disable second controller input and instead enable
             some new shortcuts on controller 1: Start+A+B for wild warp, and
             Select+B to quickly change swords.  To support this, the action of
             the start and select buttons is changed slightly.  This flag
             disables this change and retains normal behavior.`,
        },
        {
            flag: 'Tm',
            name: 'Randomize music',
        },
        {
            flag: 'Tp',
            name: 'Randomize sprite palettes',
        },
        {
            flag: 'Tw',
            name: 'Randomize wild warp',
            text: `Wild warp will go to Mezame Shrine and 15 other random locations.`,
            conflict: /Fw/
        }
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHdlYWtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2ZsYWdzL3R3ZWFrcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQWdCO0lBQ3RDLE9BQU8sRUFBRSxRQUFRO0lBQ2pCLE1BQU0sRUFBRSxHQUFHO0lBRVgsS0FBSyxFQUFFO1FBQ0w7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSx3Q0FBd0M7WUFDOUMsSUFBSSxFQUFFO2tFQUNzRDtTQUM3RDtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsa0JBQWtCO1lBQ3hCLElBQUksRUFBRTs7Ozs7Z0RBS29DO1NBQzNDO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsSUFBSSxFQUFFOzs7OytEQUltRDtTQUMxRDtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsaUJBQWlCO1NBQ3hCO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSwyQkFBMkI7U0FDbEM7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLHFCQUFxQjtZQUMzQixJQUFJLEVBQUUsbUVBQW1FO1lBQ3pFLFFBQVEsRUFBRSxJQUFJO1NBQ2Y7S0FDRjtDQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0ZsYWdTZWN0aW9ufSBmcm9tICcuL2ZsYWcuanMnO1xuXG5leHBvcnQgY29uc3QgVFdFQUtfRkxBR1M6IEZsYWdTZWN0aW9uID0ge1xuICBzZWN0aW9uOiAnVHdlYWtzJyxcbiAgcHJlZml4OiAnVCcsXG5cbiAgZmxhZ3M6IFtcbiAgICB7XG4gICAgICBmbGFnOiAnVGEnLFxuICAgICAgbmFtZTogJ0F1dG9tYXRpY2FsbHkgZXF1aXAgb3JicyBhbmQgYnJhY2VsZXRzJyxcbiAgICAgIHRleHQ6IGBBZGRzIGEgcXVhbGl0eS1vZi1saWZlIGltcHJvdmVtZW50IHRvIGF1dG9tYXRpY2FsbHkgZXF1aXAgdGhlXG4gICAgICAgICAgICAgY29ycmVzcG9uZGluZyBvcmIvYnJhY2VsZXQgd2hlbmV2ZXIgY2hhbmdpbmcgc3dvcmRzLmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnVGInLFxuICAgICAgbmFtZTogJ0J1ZmYgYm9udXMgaXRlbXMnLFxuICAgICAgdGV4dDogYExlYXRoZXIgQm9vdHMgYXJlIGNoYW5nZWQgdG8gU3BlZWQgQm9vdHMsIHdoaWNoIGluY3JlYXNlIHBsYXllciB3YWxraW5nXG4gICAgICAgICAgICAgc3BlZWQgKHRoaXMgYWxsb3dzIGNsaW1iaW5nIHVwIHRoZSBzbG9wZSB0byBhY2Nlc3MgdGhlIFRvcm5hZG8gQnJhY2VsZXRcbiAgICAgICAgICAgICBjaGVzdCwgd2hpY2ggaXMgdGFrZW4gaW50byBjb25zaWRlcmF0aW9uIGJ5IHRoZSBsb2dpYykuICBEZW8ncyBwZW5kYW50XG4gICAgICAgICAgICAgcmVzdG9yZXMgTVAgd2hpbGUgbW92aW5nLiAgUmFiYml0IGJvb3RzIGVuYWJsZSBzd29yZCBjaGFyZ2luZyB1cCB0b1xuICAgICAgICAgICAgIGxldmVsIDIgd2hpbGUgd2Fsa2luZyAobGV2ZWwgMyBzdGlsbCByZXF1aXJlcyBiZWluZyBzdGF0aW9uYXJ5LCBzbyBhc1xuICAgICAgICAgICAgIHRvIHByZXZlbnQgd2FzdGluZyB0b25zIG9mIG1hZ2ljKS5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ1RjJyxcbiAgICAgIG5hbWU6ICdEaXNhYmxlIGNvbnRyb2xsZXIgc2hvcnRjdXRzJyxcbiAgICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBkaXNhYmxlIHNlY29uZCBjb250cm9sbGVyIGlucHV0IGFuZCBpbnN0ZWFkIGVuYWJsZVxuICAgICAgICAgICAgIHNvbWUgbmV3IHNob3J0Y3V0cyBvbiBjb250cm9sbGVyIDE6IFN0YXJ0K0ErQiBmb3Igd2lsZCB3YXJwLCBhbmRcbiAgICAgICAgICAgICBTZWxlY3QrQiB0byBxdWlja2x5IGNoYW5nZSBzd29yZHMuICBUbyBzdXBwb3J0IHRoaXMsIHRoZSBhY3Rpb24gb2ZcbiAgICAgICAgICAgICB0aGUgc3RhcnQgYW5kIHNlbGVjdCBidXR0b25zIGlzIGNoYW5nZWQgc2xpZ2h0bHkuICBUaGlzIGZsYWdcbiAgICAgICAgICAgICBkaXNhYmxlcyB0aGlzIGNoYW5nZSBhbmQgcmV0YWlucyBub3JtYWwgYmVoYXZpb3IuYCxcbiAgICB9LCAgICAgICAgICAgICBcbiAgICB7XG4gICAgICBmbGFnOiAnVG0nLFxuICAgICAgbmFtZTogJ1JhbmRvbWl6ZSBtdXNpYycsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnVHAnLFxuICAgICAgbmFtZTogJ1JhbmRvbWl6ZSBzcHJpdGUgcGFsZXR0ZXMnLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ1R3JyxcbiAgICAgIG5hbWU6ICdSYW5kb21pemUgd2lsZCB3YXJwJyxcbiAgICAgIHRleHQ6IGBXaWxkIHdhcnAgd2lsbCBnbyB0byBNZXphbWUgU2hyaW5lIGFuZCAxNSBvdGhlciByYW5kb20gbG9jYXRpb25zLmAsXG4gICAgICBjb25mbGljdDogL0Z3L1xuICAgIH1cbiAgXSxcbn07XG4iXX0=