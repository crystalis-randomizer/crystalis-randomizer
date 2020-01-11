export const EASY_MODE_FLAGS = {
    section: 'Easy Mode',
    text: `The following options make parts of the game easier.`,
    prefix: 'E',
    flags: [
        {
            flag: 'Et',
            name: `Don't shuffle mimics.`,
        },
        {
            flag: 'Eu',
            name: 'Keep unique items and consumables separate',
            text: `Normally all items and mimics are shuffled into a single pool and
             distributed from there.  If this flag is set, unique items
             (specifically, anything that cannot be sold) will only be found in
             either (a) checks that held unique items in vanilla, or (b) boss
             drops.  Chests containing consumables in vanilla may be safely
             ignored, but chests containing unique items in vanilla may still
             end up with non-unique items because of bosses like Vampire 2 that
             drop consumables.  If mimics are shuffled, they will only be in
             consumable locations.`,
        },
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
            conflict: /Hm/,
        },
        {
            flag: 'Ex',
            name: 'Experience scales faster',
            text: `Less grinding will be required to "keep up" with the game difficulty.`,
            conflict: /Hx/,
        }
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWFzeS1tb2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2ZsYWdzL2Vhc3ktbW9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQWdCO0lBQzFDLE9BQU8sRUFBRSxXQUFXO0lBQ3BCLElBQUksRUFBRSxzREFBc0Q7SUFDNUQsTUFBTSxFQUFFLEdBQUc7SUFDWCxLQUFLLEVBQUU7UUFDTDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLHVCQUF1QjtTQUM5QjtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsNENBQTRDO1lBQ2xELElBQUksRUFBRTs7Ozs7Ozs7bUNBUXVCO1NBQzlCO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSx1QkFBdUI7WUFDN0IsSUFBSSxFQUNBOzswQ0FFZ0M7U0FDckM7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLDBCQUEwQjtZQUNoQyxJQUFJLEVBQUU7NkVBQ2lFO1NBQ3hFO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxtQkFBbUI7WUFDekIsSUFBSSxFQUNBLDJFQUEyRTtTQUNoRjtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUseUJBQXlCO1lBQy9CLElBQUksRUFBRTt3Q0FDNEI7WUFDbEMsUUFBUSxFQUFFLElBQUk7U0FDZjtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsMEJBQTBCO1lBQ2hDLElBQUksRUFDQSx1RUFBdUU7WUFDM0UsUUFBUSxFQUFFLElBQUk7U0FDZjtLQUNGO0NBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RmxhZ1NlY3Rpb259IGZyb20gJy4vZmxhZy5qcyc7XG5cbmV4cG9ydCBjb25zdCBFQVNZX01PREVfRkxBR1M6IEZsYWdTZWN0aW9uID0ge1xuICBzZWN0aW9uOiAnRWFzeSBNb2RlJyxcbiAgdGV4dDogYFRoZSBmb2xsb3dpbmcgb3B0aW9ucyBtYWtlIHBhcnRzIG9mIHRoZSBnYW1lIGVhc2llci5gLFxuICBwcmVmaXg6ICdFJyxcbiAgZmxhZ3M6IFtcbiAgICB7XG4gICAgICBmbGFnOiAnRXQnLFxuICAgICAgbmFtZTogYERvbid0IHNodWZmbGUgbWltaWNzLmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnRXUnLFxuICAgICAgbmFtZTogJ0tlZXAgdW5pcXVlIGl0ZW1zIGFuZCBjb25zdW1hYmxlcyBzZXBhcmF0ZScsXG4gICAgICB0ZXh0OiBgTm9ybWFsbHkgYWxsIGl0ZW1zIGFuZCBtaW1pY3MgYXJlIHNodWZmbGVkIGludG8gYSBzaW5nbGUgcG9vbCBhbmRcbiAgICAgICAgICAgICBkaXN0cmlidXRlZCBmcm9tIHRoZXJlLiAgSWYgdGhpcyBmbGFnIGlzIHNldCwgdW5pcXVlIGl0ZW1zXG4gICAgICAgICAgICAgKHNwZWNpZmljYWxseSwgYW55dGhpbmcgdGhhdCBjYW5ub3QgYmUgc29sZCkgd2lsbCBvbmx5IGJlIGZvdW5kIGluXG4gICAgICAgICAgICAgZWl0aGVyIChhKSBjaGVja3MgdGhhdCBoZWxkIHVuaXF1ZSBpdGVtcyBpbiB2YW5pbGxhLCBvciAoYikgYm9zc1xuICAgICAgICAgICAgIGRyb3BzLiAgQ2hlc3RzIGNvbnRhaW5pbmcgY29uc3VtYWJsZXMgaW4gdmFuaWxsYSBtYXkgYmUgc2FmZWx5XG4gICAgICAgICAgICAgaWdub3JlZCwgYnV0IGNoZXN0cyBjb250YWluaW5nIHVuaXF1ZSBpdGVtcyBpbiB2YW5pbGxhIG1heSBzdGlsbFxuICAgICAgICAgICAgIGVuZCB1cCB3aXRoIG5vbi11bmlxdWUgaXRlbXMgYmVjYXVzZSBvZiBib3NzZXMgbGlrZSBWYW1waXJlIDIgdGhhdFxuICAgICAgICAgICAgIGRyb3AgY29uc3VtYWJsZXMuICBJZiBtaW1pY3MgYXJlIHNodWZmbGVkLCB0aGV5IHdpbGwgb25seSBiZSBpblxuICAgICAgICAgICAgIGNvbnN1bWFibGUgbG9jYXRpb25zLmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnRWQnLFxuICAgICAgbmFtZTogJ0RlY3JlYXNlIGVuZW15IGRhbWFnZScsXG4gICAgICB0ZXh0OlxuICAgICAgICAgIGBFbmVteSBhdHRhY2sgcG93ZXIgd2lsbCBiZSBzaWduaWZpY2FudGx5IGRlY3JlYXNlZCBpbiB0aGUgZWFybHkgZ2FtZVxuICAgICAgICAgICAoYnkgYSBmYWN0b3Igb2YgMykuICBUaGUgZ2FwIHdpbGwgbmFycm93IGluIHRoZSBtaWQtZ2FtZSBhbmQgZXZlbnR1YWxseVxuICAgICAgICAgICBwaGFzZSBvdXQgYXQgc2NhbGluZyBsZXZlbCA0MC5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ0VzJyxcbiAgICAgIG5hbWU6ICdHdWFyYW50ZWUgc3RhcnRpbmcgc3dvcmQnLFxuICAgICAgdGV4dDogYFRoZSBMZWFmIGVsZGVyIGlzIGd1YXJhbnRlZWQgdG8gZ2l2ZSBhIHN3b3JkLiAgSXQgd2lsbCBub3QgYmVcbiAgICAgICAgICAgcmVxdWlyZWQgdG8gZGVhbCB3aXRoIGFueSBlbmVtaWVzIGJlZm9yZSBmaW5kaW5nIHRoZSBmaXJzdCBzd29yZC5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ0VyJyxcbiAgICAgIG5hbWU6ICdHdWFyYW50ZWUgcmVmcmVzaCcsXG4gICAgICB0ZXh0OlxuICAgICAgICAgIGBHdWFyYW50ZWVzIHRoZSBSZWZyZXNoIHNwZWxsIHdpbGwgYmUgYXZhaWxhYmxlIGJlZm9yZSBmaWdodGluZyBUZXRyYXJjaHMuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdFbScsXG4gICAgICBuYW1lOiAnRXh0cmEgYnVmZiBtZWRpY2FsIGhlcmInLFxuICAgICAgdGV4dDogYEJ1ZmYgTWVkaWNhbCBIZXJiIHRvIGhlYWwgOTYgaW5zdGVhZCBvZiA2NCBhbmQgRnJ1aXQgb2YgUG93ZXIgdG9cbiAgICAgICAgICAgcmVzdG9yZSA2NCBNUCBpbnN0ZWFkIG9mIDQ4LmAsXG4gICAgICBjb25mbGljdDogL0htLyxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdFeCcsXG4gICAgICBuYW1lOiAnRXhwZXJpZW5jZSBzY2FsZXMgZmFzdGVyJyxcbiAgICAgIHRleHQ6XG4gICAgICAgICAgYExlc3MgZ3JpbmRpbmcgd2lsbCBiZSByZXF1aXJlZCB0byBcImtlZXAgdXBcIiB3aXRoIHRoZSBnYW1lIGRpZmZpY3VsdHkuYCxcbiAgICAgIGNvbmZsaWN0OiAvSHgvLFxuICAgIH1cbiAgXSxcbn07XG4vL1xuIl19