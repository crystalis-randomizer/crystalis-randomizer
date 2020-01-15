export const EASY_MODE_FLAGS = {
    section: 'Easy Mode',
    text: `The following options make parts of the game easier.`,
    prefix: 'E',
    flags: [
        {
            flag: 'Ed',
            name: 'Decrease enemy damage',
            text: `Enemy attack power will be significantly decreased in the early game
           (by a factor of 3).  The gap will narrow in the mid-game and eventually
           phase out at scaling level 40.`,
        },
        {
            flag: 'Es',
            name: 'Guarantee starting sword',
            text: `The Leaf elder is guaranteed to give a sword.  It will not be
           required to deal with any enemies before finding the first sword.`,
        },
        {
            flag: 'Er',
            name: 'Guarantee refresh',
            text: `Guarantees the Refresh spell will be available before fighting Tetrarchs.`,
        },
        {
            flag: 'Em',
            name: 'Extra buff medical herb',
            text: `Buff Medical Herb to heal 96 instead of 64 and Fruit of Power to
           restore 64 MP instead of 48.`,
            conflict: /Hm/
        },
        {
            flag: 'Ex',
            name: 'Experience scales faster',
            text: `Less grinding will be required to "keep up" with the game difficulty.`,
            conflict: /Hx/
        }
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWFzeS1tb2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2ZsYWdzL2Vhc3ktbW9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQWdCO0lBQzFDLE9BQU8sRUFBRSxXQUFXO0lBQ3BCLElBQUksRUFBRSxzREFBc0Q7SUFDNUQsTUFBTSxFQUFFLEdBQUc7SUFFWCxLQUFLLEVBQUU7UUFDTDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLHVCQUF1QjtZQUM3QixJQUFJLEVBQ0E7OzBDQUVnQztTQUNyQztRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsMEJBQTBCO1lBQ2hDLElBQUksRUFBRTs2RUFDaUU7U0FDeEU7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLG1CQUFtQjtZQUN6QixJQUFJLEVBQ0EsMkVBQTJFO1NBQ2hGO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSx5QkFBeUI7WUFDL0IsSUFBSSxFQUFFO3dDQUM0QjtZQUNsQyxRQUFRLEVBQUUsSUFBSTtTQUNmO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSwwQkFBMEI7WUFDaEMsSUFBSSxFQUNBLHVFQUF1RTtZQUMzRSxRQUFRLEVBQUUsSUFBSTtTQUNmO0tBQ0Y7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtGbGFnU2VjdGlvbn0gZnJvbSAnLi9mbGFnLmpzJztcblxuZXhwb3J0IGNvbnN0IEVBU1lfTU9ERV9GTEFHUzogRmxhZ1NlY3Rpb24gPSB7XG4gIHNlY3Rpb246ICdFYXN5IE1vZGUnLFxuICB0ZXh0OiBgVGhlIGZvbGxvd2luZyBvcHRpb25zIG1ha2UgcGFydHMgb2YgdGhlIGdhbWUgZWFzaWVyLmAsXG4gIHByZWZpeDogJ0UnLFxuXG4gIGZsYWdzOiBbXG4gICAge1xuICAgICAgZmxhZzogJ0VkJyxcbiAgICAgIG5hbWU6ICdEZWNyZWFzZSBlbmVteSBkYW1hZ2UnLFxuICAgICAgdGV4dDpcbiAgICAgICAgICBgRW5lbXkgYXR0YWNrIHBvd2VyIHdpbGwgYmUgc2lnbmlmaWNhbnRseSBkZWNyZWFzZWQgaW4gdGhlIGVhcmx5IGdhbWVcbiAgICAgICAgICAgKGJ5IGEgZmFjdG9yIG9mIDMpLiAgVGhlIGdhcCB3aWxsIG5hcnJvdyBpbiB0aGUgbWlkLWdhbWUgYW5kIGV2ZW50dWFsbHlcbiAgICAgICAgICAgcGhhc2Ugb3V0IGF0IHNjYWxpbmcgbGV2ZWwgNDAuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdFcycsXG4gICAgICBuYW1lOiAnR3VhcmFudGVlIHN0YXJ0aW5nIHN3b3JkJyxcbiAgICAgIHRleHQ6IGBUaGUgTGVhZiBlbGRlciBpcyBndWFyYW50ZWVkIHRvIGdpdmUgYSBzd29yZC4gIEl0IHdpbGwgbm90IGJlXG4gICAgICAgICAgIHJlcXVpcmVkIHRvIGRlYWwgd2l0aCBhbnkgZW5lbWllcyBiZWZvcmUgZmluZGluZyB0aGUgZmlyc3Qgc3dvcmQuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdFcicsXG4gICAgICBuYW1lOiAnR3VhcmFudGVlIHJlZnJlc2gnLFxuICAgICAgdGV4dDpcbiAgICAgICAgICBgR3VhcmFudGVlcyB0aGUgUmVmcmVzaCBzcGVsbCB3aWxsIGJlIGF2YWlsYWJsZSBiZWZvcmUgZmlnaHRpbmcgVGV0cmFyY2hzLmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnRW0nLFxuICAgICAgbmFtZTogJ0V4dHJhIGJ1ZmYgbWVkaWNhbCBoZXJiJyxcbiAgICAgIHRleHQ6IGBCdWZmIE1lZGljYWwgSGVyYiB0byBoZWFsIDk2IGluc3RlYWQgb2YgNjQgYW5kIEZydWl0IG9mIFBvd2VyIHRvXG4gICAgICAgICAgIHJlc3RvcmUgNjQgTVAgaW5zdGVhZCBvZiA0OC5gLFxuICAgICAgY29uZmxpY3Q6IC9IbS9cbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdFeCcsXG4gICAgICBuYW1lOiAnRXhwZXJpZW5jZSBzY2FsZXMgZmFzdGVyJyxcbiAgICAgIHRleHQ6XG4gICAgICAgICAgYExlc3MgZ3JpbmRpbmcgd2lsbCBiZSByZXF1aXJlZCB0byBcImtlZXAgdXBcIiB3aXRoIHRoZSBnYW1lIGRpZmZpY3VsdHkuYCxcbiAgICAgIGNvbmZsaWN0OiAvSHgvXG4gICAgfVxuICBdLFxufTtcbi8vXG4iXX0=