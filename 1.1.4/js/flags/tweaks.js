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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHdlYWtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2ZsYWdzL3R3ZWFrcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQWdCO0lBQ3RDLE9BQU8sRUFBRSxRQUFRO0lBQ2pCLE1BQU0sRUFBRSxHQUFHO0lBRVgsS0FBSyxFQUFFO1FBQ0w7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSx3Q0FBd0M7WUFDOUMsSUFBSSxFQUFFO2tFQUNzRDtTQUM3RDtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsa0JBQWtCO1lBQ3hCLElBQUksRUFDQTs7Ozs7Z0RBS3NDO1NBQzNDO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxpQkFBaUI7U0FDeEI7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLDJCQUEyQjtTQUNsQztRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUscUJBQXFCO1lBQzNCLElBQUksRUFBRSxtRUFBbUU7WUFDekUsUUFBUSxFQUFFLElBQUk7U0FDZjtLQUNGO0NBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RmxhZ1NlY3Rpb259IGZyb20gJy4vZmxhZy5qcyc7XG5cbmV4cG9ydCBjb25zdCBUV0VBS19GTEFHUzogRmxhZ1NlY3Rpb24gPSB7XG4gIHNlY3Rpb246ICdUd2Vha3MnLFxuICBwcmVmaXg6ICdUJyxcblxuICBmbGFnczogW1xuICAgIHtcbiAgICAgIGZsYWc6ICdUYScsXG4gICAgICBuYW1lOiAnQXV0b21hdGljYWxseSBlcXVpcCBvcmJzIGFuZCBicmFjZWxldHMnLFxuICAgICAgdGV4dDogYEFkZHMgYSBxdWFsaXR5LW9mLWxpZmUgaW1wcm92ZW1lbnQgdG8gYXV0b21hdGljYWxseSBlcXVpcCB0aGVcbiAgICAgICAgICAgICBjb3JyZXNwb25kaW5nIG9yYi9icmFjZWxldCB3aGVuZXZlciBjaGFuZ2luZyBzd29yZHMuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdUYicsXG4gICAgICBuYW1lOiAnQnVmZiBib251cyBpdGVtcycsXG4gICAgICB0ZXh0OlxuICAgICAgICAgIGBMZWF0aGVyIEJvb3RzIGFyZSBjaGFuZ2VkIHRvIFNwZWVkIEJvb3RzLCB3aGljaCBpbmNyZWFzZSBwbGF5ZXIgd2Fsa2luZ1xuICAgICAgICAgICAgIHNwZWVkICh0aGlzIGFsbG93cyBjbGltYmluZyB1cCB0aGUgc2xvcGUgdG8gYWNjZXNzIHRoZSBUb3JuYWRvIEJyYWNlbGV0XG4gICAgICAgICAgICAgY2hlc3QsIHdoaWNoIGlzIHRha2VuIGludG8gY29uc2lkZXJhdGlvbiBieSB0aGUgbG9naWMpLiAgRGVvJ3MgcGVuZGFudFxuICAgICAgICAgICAgIHJlc3RvcmVzIE1QIHdoaWxlIG1vdmluZy4gIFJhYmJpdCBib290cyBlbmFibGUgc3dvcmQgY2hhcmdpbmcgdXAgdG9cbiAgICAgICAgICAgICBsZXZlbCAyIHdoaWxlIHdhbGtpbmcgKGxldmVsIDMgc3RpbGwgcmVxdWlyZXMgYmVpbmcgc3RhdGlvbmFyeSwgc28gYXNcbiAgICAgICAgICAgICB0byBwcmV2ZW50IHdhc3RpbmcgdG9ucyBvZiBtYWdpYykuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdUbScsXG4gICAgICBuYW1lOiAnUmFuZG9taXplIG11c2ljJyxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdUcCcsXG4gICAgICBuYW1lOiAnUmFuZG9taXplIHNwcml0ZSBwYWxldHRlcycsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnVHcnLFxuICAgICAgbmFtZTogJ1JhbmRvbWl6ZSB3aWxkIHdhcnAnLFxuICAgICAgdGV4dDogYFdpbGQgd2FycCB3aWxsIGdvIHRvIE1lemFtZSBTaHJpbmUgYW5kIDE1IG90aGVyIHJhbmRvbSBsb2NhdGlvbnMuYCxcbiAgICAgIGNvbmZsaWN0OiAvRncvXG4gICAgfVxuICBdLFxufTtcbiJdfQ==