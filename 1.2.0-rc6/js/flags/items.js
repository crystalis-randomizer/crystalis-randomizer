export const ITEM_FLAGS = {
    section: 'Items',
    prefix: 'S',
    text: `Items are broken into five pools: <i>key items</i> includes all
            unique items; <i>consumable items</i> includes anything that can be
            dropped; <i>magic</i> is the eight spells; and <i>traps</i> are the
            12 trap chests found in various places. These pools can be shuffled
            together, kept separate, or left unshuffled.`,
    flags: [
        {
            flag: 'Sk',
            name: 'Shuffle key items',
        },
        {
            flag: 'Sm',
            name: 'Shuffle magics',
        },
        {
            flag: 'Sc',
            name: 'Shuffle consumables',
        },
        {
            flag: 'Sct',
            name: 'Shuffle consumables with traps',
        },
        {
            flag: 'Skm',
            name: 'Shuffle key items with magic',
        },
        {
            flag: 'Skt',
            name: 'Shuffle key items with traps',
        },
        {
            flag: 'Sck',
            hard: true,
            name: 'Shuffle consumables with key items',
        },
        {
            flag: 'Scm',
            hard: true,
            name: 'Shuffle consumables with magic',
        },
        {
            flag: 'Skmt',
            hard: true,
            name: 'Shuffle key, magic, and traps',
        },
        {
            flag: 'Sckm',
            hard: true,
            name: 'Shuffle key, consumables, and magic',
        },
        {
            flag: 'Sckt',
            hard: true,
            name: 'Shuffle key, consumables, and traps',
        },
        {
            flag: 'Sckmt',
            hard: true,
            name: 'Shuffle all items and traps together',
        }
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlbXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvZmxhZ3MvaXRlbXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFnQjtJQUNyQyxPQUFPLEVBQUUsT0FBTztJQUNoQixNQUFNLEVBQUUsR0FBRztJQUNYLElBQUksRUFBRTs7Ozt5REFJaUQ7SUFFdkQsS0FBSyxFQUFFO1FBQ0w7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxtQkFBbUI7U0FDMUI7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLGdCQUFnQjtTQUN2QjtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUscUJBQXFCO1NBQzVCO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsS0FBSztZQUNYLElBQUksRUFBRSxnQ0FBZ0M7U0FDdkM7UUFDRDtZQUNFLElBQUksRUFBRSxLQUFLO1lBQ1gsSUFBSSxFQUFFLDhCQUE4QjtTQUNyQztRQUNEO1lBQ0UsSUFBSSxFQUFFLEtBQUs7WUFDWCxJQUFJLEVBQUUsOEJBQThCO1NBQ3JDO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsS0FBSztZQUNYLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLG9DQUFvQztTQUMzQztRQUNEO1lBQ0UsSUFBSSxFQUFFLEtBQUs7WUFDWCxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxnQ0FBZ0M7U0FDdkM7UUFDRDtZQUNFLElBQUksRUFBRSxNQUFNO1lBQ1osSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsK0JBQStCO1NBQ3RDO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsTUFBTTtZQUNaLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLHFDQUFxQztTQUM1QztRQUNEO1lBQ0UsSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxxQ0FBcUM7U0FDNUM7UUFDRDtZQUNFLElBQUksRUFBRSxPQUFPO1lBQ2IsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsc0NBQXNDO1NBQzdDO0tBQ0Y7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtGbGFnU2VjdGlvbn0gZnJvbSAnLi9mbGFnLmpzJztcblxuZXhwb3J0IGNvbnN0IElURU1fRkxBR1M6IEZsYWdTZWN0aW9uID0ge1xuICBzZWN0aW9uOiAnSXRlbXMnLFxuICBwcmVmaXg6ICdTJyxcbiAgdGV4dDogYEl0ZW1zIGFyZSBicm9rZW4gaW50byBmaXZlIHBvb2xzOiA8aT5rZXkgaXRlbXM8L2k+IGluY2x1ZGVzIGFsbFxuICAgICAgICAgICAgdW5pcXVlIGl0ZW1zOyA8aT5jb25zdW1hYmxlIGl0ZW1zPC9pPiBpbmNsdWRlcyBhbnl0aGluZyB0aGF0IGNhbiBiZVxuICAgICAgICAgICAgZHJvcHBlZDsgPGk+bWFnaWM8L2k+IGlzIHRoZSBlaWdodCBzcGVsbHM7IGFuZCA8aT50cmFwczwvaT4gYXJlIHRoZVxuICAgICAgICAgICAgMTIgdHJhcCBjaGVzdHMgZm91bmQgaW4gdmFyaW91cyBwbGFjZXMuIFRoZXNlIHBvb2xzIGNhbiBiZSBzaHVmZmxlZFxuICAgICAgICAgICAgdG9nZXRoZXIsIGtlcHQgc2VwYXJhdGUsIG9yIGxlZnQgdW5zaHVmZmxlZC5gLFxuXG4gIGZsYWdzOiBbXG4gICAge1xuICAgICAgZmxhZzogJ1NrJyxcbiAgICAgIG5hbWU6ICdTaHVmZmxlIGtleSBpdGVtcycsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnU20nLFxuICAgICAgbmFtZTogJ1NodWZmbGUgbWFnaWNzJyxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdTYycsXG4gICAgICBuYW1lOiAnU2h1ZmZsZSBjb25zdW1hYmxlcycsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnU2N0JyxcbiAgICAgIG5hbWU6ICdTaHVmZmxlIGNvbnN1bWFibGVzIHdpdGggdHJhcHMnLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ1NrbScsXG4gICAgICBuYW1lOiAnU2h1ZmZsZSBrZXkgaXRlbXMgd2l0aCBtYWdpYycsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnU2t0JyxcbiAgICAgIG5hbWU6ICdTaHVmZmxlIGtleSBpdGVtcyB3aXRoIHRyYXBzJyxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdTY2snLFxuICAgICAgaGFyZDogdHJ1ZSxcbiAgICAgIG5hbWU6ICdTaHVmZmxlIGNvbnN1bWFibGVzIHdpdGgga2V5IGl0ZW1zJyxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdTY20nLFxuICAgICAgaGFyZDogdHJ1ZSxcbiAgICAgIG5hbWU6ICdTaHVmZmxlIGNvbnN1bWFibGVzIHdpdGggbWFnaWMnLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ1NrbXQnLFxuICAgICAgaGFyZDogdHJ1ZSxcbiAgICAgIG5hbWU6ICdTaHVmZmxlIGtleSwgbWFnaWMsIGFuZCB0cmFwcycsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnU2NrbScsXG4gICAgICBoYXJkOiB0cnVlLFxuICAgICAgbmFtZTogJ1NodWZmbGUga2V5LCBjb25zdW1hYmxlcywgYW5kIG1hZ2ljJyxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdTY2t0JyxcbiAgICAgIGhhcmQ6IHRydWUsXG4gICAgICBuYW1lOiAnU2h1ZmZsZSBrZXksIGNvbnN1bWFibGVzLCBhbmQgdHJhcHMnLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ1Nja210JyxcbiAgICAgIGhhcmQ6IHRydWUsXG4gICAgICBuYW1lOiAnU2h1ZmZsZSBhbGwgaXRlbXMgYW5kIHRyYXBzIHRvZ2V0aGVyJyxcbiAgICB9XG4gIF0sICAvLyBUT0RPOiBTcyB0byBzaHVmZmxlIHNob3BzP1xufTtcbiJdfQ==