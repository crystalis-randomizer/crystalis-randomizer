export const HARD_MODE_FLAGS = {
    section: 'Hard mode',
    prefix: 'H',
    flags: [
        {
            flag: 'Hw',
            hard: true,
            name: 'Battle magic not guaranteed',
            text: `Normally, the logic will guarantee that level 3 sword charges are
             available before fighting the tetrarchs (with the exception of Karmine,
             who only requires level 2).  This disables that check.`,
        },
        {
            flag: 'Hb',
            hard: true,
            name: 'Barrier not guaranteed',
            text: `Normally, the logic will guarantee Barrier (or else refresh and shield
             ring) before entering Stxy, the Fortress, or fighting Karmine.  This
             disables that check.`,
        },
        {
            flag: 'Hm',
            hard: true,
            name: 'Don\'t buff medical herb or fruit of power',
            text: `Medical Herb is not buffed to heal 64 damage, which is helpful to make
             up for cases where Refresh is unavailable early.  Fruit of Power is not
             buffed to restore 48 MP.`,
            conflict: /Em/
        },
        {
            flag: 'Hg',
            hard: true,
            name: 'Gas mask not guaranteed',
            text: `The logic will not guarantee gas mask before needing to enter the swamp.
             Gas mask is still guaranteed to kill the insect.`,
        },
        {
            flag: 'Hs',
            hard: true,
            name: 'Matching sword not guaranteed',
            text: `Player may be required to fight bosses with the wrong sword, which
             may require using "tink strats" dealing 1 damage per hit.`,
        },
        {
            flag: 'Ht',
            hard: true,
            name: 'Max scaling level in tower',
            text: `Enemies in the tower spawn at max scaling level.`,
        },
        {
            flag: 'Hx',
            hard: true,
            name: 'Experience scales slower',
            text: `More grinding will be required to "keep up" with the difficulty.`,
            conflict: /Ex/
        },
        {
            flag: 'Hc',
            hard: true,
            name: 'Charge shots only',
            text: `Stabbing is completely ineffective.  Only charged shots work.`,
        },
        {
            flag: 'Hd',
            hard: true,
            name: 'Buff Dyna',
            text: `Makes the Dyna fight a bit more of a challenge.  Side pods will fire
             significantly more.  The safe spot has been removed.  The counter
             attacks pass through barrier.  Side pods can now be killed.`,
        },
        {
            flag: 'Hz',
            hard: true,
            name: 'Blackout mode',
            text: `All caves and fortresses are permanently dark.`,
        },
        {
            flag: 'Hh',
            hard: true,
            name: 'Hardcore mode',
            text: `Checkpoints and saves are removed.`,
        }
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFyZC1tb2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2ZsYWdzL2hhcmQtbW9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQWdCO0lBQzFDLE9BQU8sRUFBRSxXQUFXO0lBQ3BCLE1BQU0sRUFBRSxHQUFHO0lBRVgsS0FBSyxFQUFFO1FBQ0w7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLDZCQUE2QjtZQUNuQyxJQUFJLEVBQUU7O29FQUV3RDtTQUMvRDtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSx3QkFBd0I7WUFDOUIsSUFBSSxFQUNBOztrQ0FFd0I7U0FDN0I7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsNENBQTRDO1lBQ2xELElBQUksRUFDQTs7c0NBRTRCO1lBQ2hDLFFBQVEsRUFBRSxJQUFJO1NBQ2Y7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUseUJBQXlCO1lBQy9CLElBQUksRUFDQTs4REFDb0Q7U0FDekQ7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsK0JBQStCO1lBQ3JDLElBQUksRUFBRTt1RUFDMkQ7U0FDbEU7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsNEJBQTRCO1lBQ2xDLElBQUksRUFBRSxrREFBa0Q7U0FDekQ7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsMEJBQTBCO1lBQ2hDLElBQUksRUFBRSxrRUFBa0U7WUFDeEUsUUFBUSxFQUFFLElBQUk7U0FDZjtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxtQkFBbUI7WUFDekIsSUFBSSxFQUFFLCtEQUErRDtTQUN0RTtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxXQUFXO1lBQ2pCLElBQUksRUFDQTs7eUVBRStEO1NBQ3BFO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLGVBQWU7WUFDckIsSUFBSSxFQUFFLGdEQUFnRDtTQUN2RDtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxlQUFlO1lBQ3JCLElBQUksRUFBRSxvQ0FBb0M7U0FDM0M7S0FDRjtDQXNCRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtGbGFnU2VjdGlvbn0gZnJvbSAnLi9mbGFnLmpzJztcblxuZXhwb3J0IGNvbnN0IEhBUkRfTU9ERV9GTEFHUzogRmxhZ1NlY3Rpb24gPSB7XG4gIHNlY3Rpb246ICdIYXJkIG1vZGUnLFxuICBwcmVmaXg6ICdIJyxcblxuICBmbGFnczogW1xuICAgIHtcbiAgICAgIGZsYWc6ICdIdycsXG4gICAgICBoYXJkOiB0cnVlLFxuICAgICAgbmFtZTogJ0JhdHRsZSBtYWdpYyBub3QgZ3VhcmFudGVlZCcsXG4gICAgICB0ZXh0OiBgTm9ybWFsbHksIHRoZSBsb2dpYyB3aWxsIGd1YXJhbnRlZSB0aGF0IGxldmVsIDMgc3dvcmQgY2hhcmdlcyBhcmVcbiAgICAgICAgICAgICBhdmFpbGFibGUgYmVmb3JlIGZpZ2h0aW5nIHRoZSB0ZXRyYXJjaHMgKHdpdGggdGhlIGV4Y2VwdGlvbiBvZiBLYXJtaW5lLFxuICAgICAgICAgICAgIHdobyBvbmx5IHJlcXVpcmVzIGxldmVsIDIpLiAgVGhpcyBkaXNhYmxlcyB0aGF0IGNoZWNrLmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnSGInLFxuICAgICAgaGFyZDogdHJ1ZSxcbiAgICAgIG5hbWU6ICdCYXJyaWVyIG5vdCBndWFyYW50ZWVkJyxcbiAgICAgIHRleHQ6XG4gICAgICAgICAgYE5vcm1hbGx5LCB0aGUgbG9naWMgd2lsbCBndWFyYW50ZWUgQmFycmllciAob3IgZWxzZSByZWZyZXNoIGFuZCBzaGllbGRcbiAgICAgICAgICAgICByaW5nKSBiZWZvcmUgZW50ZXJpbmcgU3R4eSwgdGhlIEZvcnRyZXNzLCBvciBmaWdodGluZyBLYXJtaW5lLiAgVGhpc1xuICAgICAgICAgICAgIGRpc2FibGVzIHRoYXQgY2hlY2suYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdIbScsXG4gICAgICBoYXJkOiB0cnVlLFxuICAgICAgbmFtZTogJ0RvblxcJ3QgYnVmZiBtZWRpY2FsIGhlcmIgb3IgZnJ1aXQgb2YgcG93ZXInLFxuICAgICAgdGV4dDpcbiAgICAgICAgICBgTWVkaWNhbCBIZXJiIGlzIG5vdCBidWZmZWQgdG8gaGVhbCA2NCBkYW1hZ2UsIHdoaWNoIGlzIGhlbHBmdWwgdG8gbWFrZVxuICAgICAgICAgICAgIHVwIGZvciBjYXNlcyB3aGVyZSBSZWZyZXNoIGlzIHVuYXZhaWxhYmxlIGVhcmx5LiAgRnJ1aXQgb2YgUG93ZXIgaXMgbm90XG4gICAgICAgICAgICAgYnVmZmVkIHRvIHJlc3RvcmUgNDggTVAuYCxcbiAgICAgIGNvbmZsaWN0OiAvRW0vXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnSGcnLFxuICAgICAgaGFyZDogdHJ1ZSxcbiAgICAgIG5hbWU6ICdHYXMgbWFzayBub3QgZ3VhcmFudGVlZCcsXG4gICAgICB0ZXh0OlxuICAgICAgICAgIGBUaGUgbG9naWMgd2lsbCBub3QgZ3VhcmFudGVlIGdhcyBtYXNrIGJlZm9yZSBuZWVkaW5nIHRvIGVudGVyIHRoZSBzd2FtcC5cbiAgICAgICAgICAgICBHYXMgbWFzayBpcyBzdGlsbCBndWFyYW50ZWVkIHRvIGtpbGwgdGhlIGluc2VjdC5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ0hzJyxcbiAgICAgIGhhcmQ6IHRydWUsXG4gICAgICBuYW1lOiAnTWF0Y2hpbmcgc3dvcmQgbm90IGd1YXJhbnRlZWQnLFxuICAgICAgdGV4dDogYFBsYXllciBtYXkgYmUgcmVxdWlyZWQgdG8gZmlnaHQgYm9zc2VzIHdpdGggdGhlIHdyb25nIHN3b3JkLCB3aGljaFxuICAgICAgICAgICAgIG1heSByZXF1aXJlIHVzaW5nIFwidGluayBzdHJhdHNcIiBkZWFsaW5nIDEgZGFtYWdlIHBlciBoaXQuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdIdCcsXG4gICAgICBoYXJkOiB0cnVlLFxuICAgICAgbmFtZTogJ01heCBzY2FsaW5nIGxldmVsIGluIHRvd2VyJyxcbiAgICAgIHRleHQ6IGBFbmVtaWVzIGluIHRoZSB0b3dlciBzcGF3biBhdCBtYXggc2NhbGluZyBsZXZlbC5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ0h4JyxcbiAgICAgIGhhcmQ6IHRydWUsXG4gICAgICBuYW1lOiAnRXhwZXJpZW5jZSBzY2FsZXMgc2xvd2VyJyxcbiAgICAgIHRleHQ6IGBNb3JlIGdyaW5kaW5nIHdpbGwgYmUgcmVxdWlyZWQgdG8gXCJrZWVwIHVwXCIgd2l0aCB0aGUgZGlmZmljdWx0eS5gLFxuICAgICAgY29uZmxpY3Q6IC9FeC9cbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdIYycsXG4gICAgICBoYXJkOiB0cnVlLFxuICAgICAgbmFtZTogJ0NoYXJnZSBzaG90cyBvbmx5JyxcbiAgICAgIHRleHQ6IGBTdGFiYmluZyBpcyBjb21wbGV0ZWx5IGluZWZmZWN0aXZlLiAgT25seSBjaGFyZ2VkIHNob3RzIHdvcmsuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdIZCcsXG4gICAgICBoYXJkOiB0cnVlLFxuICAgICAgbmFtZTogJ0J1ZmYgRHluYScsXG4gICAgICB0ZXh0OlxuICAgICAgICAgIGBNYWtlcyB0aGUgRHluYSBmaWdodCBhIGJpdCBtb3JlIG9mIGEgY2hhbGxlbmdlLiAgU2lkZSBwb2RzIHdpbGwgZmlyZVxuICAgICAgICAgICAgIHNpZ25pZmljYW50bHkgbW9yZS4gIFRoZSBzYWZlIHNwb3QgaGFzIGJlZW4gcmVtb3ZlZC4gIFRoZSBjb3VudGVyXG4gICAgICAgICAgICAgYXR0YWNrcyBwYXNzIHRocm91Z2ggYmFycmllci4gIFNpZGUgcG9kcyBjYW4gbm93IGJlIGtpbGxlZC5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ0h6JyxcbiAgICAgIGhhcmQ6IHRydWUsXG4gICAgICBuYW1lOiAnQmxhY2tvdXQgbW9kZScsXG4gICAgICB0ZXh0OiBgQWxsIGNhdmVzIGFuZCBmb3J0cmVzc2VzIGFyZSBwZXJtYW5lbnRseSBkYXJrLmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnSGgnLFxuICAgICAgaGFyZDogdHJ1ZSxcbiAgICAgIG5hbWU6ICdIYXJkY29yZSBtb2RlJyxcbiAgICAgIHRleHQ6IGBDaGVja3BvaW50cyBhbmQgc2F2ZXMgYXJlIHJlbW92ZWQuYCxcbiAgICB9XG4gIF0sXG4gIC8vIH0sIHtcbiAgLy8gICBzZWN0aW9uOiAnV2VhcG9ucywgYXJtb3IsIGFuZCBpdGVtIGJhbGFuY2UnLFxuICAvLyAgICAgPGRpdiBjbGFzcz1cImNoZWNrYm94XCI+VzogTm9ybWFsaXplIHdlYXBvbnMgYW5kIGFybW9yPC9kaXY+XG4gIC8vICAgICAgIDxkaXYgY2xhc3M9XCJmbGFnLWJvZHlcIj5cbiAgLy8gICAgICAgICBTd29yZCBhdHRhY2sgdmFsdWVzIG5vIGxvbmdlciBkZXBlbmQgb24gZWxlbWVudCwgYnV0IGluc3RlYWQgb24gdGhlXG4gIC8vICAgICAgICAgbnVtYmVyIG9mIG9yYi9icmFjZWxldCB1cGdyYWRlczoganVzdCB0aGUgc3dvcmQgaXMgMjsgc3dvcmQgcGx1c1xuICAvLyAgICAgICAgIG9uZSB1cGdyYWRlIGlzIDQ7IHN3b3JkIHBsdXMgYm90aCB1cGdyYWRlcyBpcyA4LiAgU3RhYiBkYW1hZ2UgaXNcbiAgLy8gICAgICAgICBhbHdheXMgZml4ZWQgYXQgMiwgcmF0aGVyIHRoYW4gZWZmZWN0aXZlbHkgZG91YmxpbmcgdGhlIHN3b3JkJ3NcbiAgLy8gICAgICAgICBiYXNlIGRhbWFnZS4gRW5lbWllcyBubyBsb25nZXIgaGF2ZSBtaW5pbXVtIHBsYXllciBsZXZlbFxuICAvLyAgICAgICAgIHJlcXVpcmVtZW50cy4gIEFsbCBzd29yZCBoaXRzIHdpbGwgbm93IGRvIGF0IGxlYXN0IG9uZSBkYW1hZ2UgKHdoZW5cbiAgLy8gICAgICAgICBhIGhpdCBcInBpbmdzXCIsIGV4YWN0bHkgb25lIGRhbWFnZSBpcyBkZWFsdCksIHNvIG5vIGVuZW15IGlzXG4gIC8vICAgICAgICAgdW5raWxsYWJsZS4gPHA+QmFzZSBhcm1vci9zaGllbGQgZGVmZW5zZSBpcyBoYWx2ZWQsIGFuZCBjYXBwZWQgYXRcbiAgLy8gICAgICAgICB0d2ljZSB0aGUgcGxheWVyIGxldmVsLCBzbyB0aGF0IChhKSBwbGF5ZXIgbGV2ZWwgaGFzIG1vcmUgaW1wYWN0LFxuICAvLyAgICAgICAgIGFuZCAoYikgcmVhbGx5IGdvb2QgYXJtb3JzIGFyZW4ndCBvdmVycG93ZXJlZCBpbiBlYXJseSBnYW1lLlxuICAvLyAgICAgICA8L2Rpdj5cbiAgLy8gICAgICAgPGRpdiBjbGFzcz1cImNoZWNrYm94XCI+V3A6IE5lcmYgcG93ZXIgcmluZzwvZGl2PlxuICAvLyAgICAgICA8ZGl2IGNsYXNzPVwiZmxhZy1ib2R5XCI+XG4gIC8vICAgICAgICAgVE9ETyAtIGRvbid0IG5lY2Vzc2FyaWx5IHdhbnQgdG8gcmVxdWlyZSBjbGlja2luZyB0aHJvdWdoIHRvIGdldFxuICAvLyAgICAgICAgIGZ1bGwgbGlzdCBvZiBjaGFuZ2VzLCBidXQgYWxzbyB3YW50IHRvIGRvY3VtZW50IGluIHZhcmlvdXMgcGxhY2VzXG4gIC8vICAgICAgICAgYW5kIHdhbnQgcmVhc29uYWJsZSBkZWZhdWx0cy5cbiAgLy8gICAgICAgPC9kaXY+XG59O1xuIl19