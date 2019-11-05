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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFyZC1tb2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2ZsYWdzL2hhcmQtbW9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQWdCO0lBQzFDLE9BQU8sRUFBRSxXQUFXO0lBQ3BCLE1BQU0sRUFBRSxHQUFHO0lBRVgsS0FBSyxFQUFFO1FBQ0w7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLDZCQUE2QjtZQUNuQyxJQUFJLEVBQUU7O29FQUV3RDtTQUMvRDtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSx3QkFBd0I7WUFDOUIsSUFBSSxFQUNBOztrQ0FFd0I7U0FDN0I7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsNENBQTRDO1lBQ2xELElBQUksRUFDQTs7c0NBRTRCO1lBQ2hDLFFBQVEsRUFBRSxJQUFJO1NBQ2Y7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUseUJBQXlCO1lBQy9CLElBQUksRUFDQTs4REFDb0Q7U0FDekQ7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsK0JBQStCO1lBQ3JDLElBQUksRUFBRTt1RUFDMkQ7U0FPbEU7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsMEJBQTBCO1lBQ2hDLElBQUksRUFBRSxrRUFBa0U7WUFDeEUsUUFBUSxFQUFFLElBQUk7U0FDZjtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxtQkFBbUI7WUFDekIsSUFBSSxFQUFFLCtEQUErRDtTQUN0RTtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxXQUFXO1lBQ2pCLElBQUksRUFDQTs7eUVBRStEO1NBQ3BFO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLGVBQWU7WUFDckIsSUFBSSxFQUFFLGdEQUFnRDtTQUN2RDtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxlQUFlO1lBQ3JCLElBQUksRUFBRSxvQ0FBb0M7U0FDM0M7S0FDRjtDQXNCRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtGbGFnU2VjdGlvbn0gZnJvbSAnLi9mbGFnLmpzJztcblxuZXhwb3J0IGNvbnN0IEhBUkRfTU9ERV9GTEFHUzogRmxhZ1NlY3Rpb24gPSB7XG4gIHNlY3Rpb246ICdIYXJkIG1vZGUnLFxuICBwcmVmaXg6ICdIJyxcblxuICBmbGFnczogW1xuICAgIHtcbiAgICAgIGZsYWc6ICdIdycsXG4gICAgICBoYXJkOiB0cnVlLFxuICAgICAgbmFtZTogJ0JhdHRsZSBtYWdpYyBub3QgZ3VhcmFudGVlZCcsXG4gICAgICB0ZXh0OiBgTm9ybWFsbHksIHRoZSBsb2dpYyB3aWxsIGd1YXJhbnRlZSB0aGF0IGxldmVsIDMgc3dvcmQgY2hhcmdlcyBhcmVcbiAgICAgICAgICAgICBhdmFpbGFibGUgYmVmb3JlIGZpZ2h0aW5nIHRoZSB0ZXRyYXJjaHMgKHdpdGggdGhlIGV4Y2VwdGlvbiBvZiBLYXJtaW5lLFxuICAgICAgICAgICAgIHdobyBvbmx5IHJlcXVpcmVzIGxldmVsIDIpLiAgVGhpcyBkaXNhYmxlcyB0aGF0IGNoZWNrLmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnSGInLFxuICAgICAgaGFyZDogdHJ1ZSxcbiAgICAgIG5hbWU6ICdCYXJyaWVyIG5vdCBndWFyYW50ZWVkJyxcbiAgICAgIHRleHQ6XG4gICAgICAgICAgYE5vcm1hbGx5LCB0aGUgbG9naWMgd2lsbCBndWFyYW50ZWUgQmFycmllciAob3IgZWxzZSByZWZyZXNoIGFuZCBzaGllbGRcbiAgICAgICAgICAgICByaW5nKSBiZWZvcmUgZW50ZXJpbmcgU3R4eSwgdGhlIEZvcnRyZXNzLCBvciBmaWdodGluZyBLYXJtaW5lLiAgVGhpc1xuICAgICAgICAgICAgIGRpc2FibGVzIHRoYXQgY2hlY2suYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdIbScsXG4gICAgICBoYXJkOiB0cnVlLFxuICAgICAgbmFtZTogJ0RvblxcJ3QgYnVmZiBtZWRpY2FsIGhlcmIgb3IgZnJ1aXQgb2YgcG93ZXInLFxuICAgICAgdGV4dDpcbiAgICAgICAgICBgTWVkaWNhbCBIZXJiIGlzIG5vdCBidWZmZWQgdG8gaGVhbCA2NCBkYW1hZ2UsIHdoaWNoIGlzIGhlbHBmdWwgdG8gbWFrZVxuICAgICAgICAgICAgIHVwIGZvciBjYXNlcyB3aGVyZSBSZWZyZXNoIGlzIHVuYXZhaWxhYmxlIGVhcmx5LiAgRnJ1aXQgb2YgUG93ZXIgaXMgbm90XG4gICAgICAgICAgICAgYnVmZmVkIHRvIHJlc3RvcmUgNDggTVAuYCxcbiAgICAgIGNvbmZsaWN0OiAvRW0vXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnSGcnLFxuICAgICAgaGFyZDogdHJ1ZSxcbiAgICAgIG5hbWU6ICdHYXMgbWFzayBub3QgZ3VhcmFudGVlZCcsXG4gICAgICB0ZXh0OlxuICAgICAgICAgIGBUaGUgbG9naWMgd2lsbCBub3QgZ3VhcmFudGVlIGdhcyBtYXNrIGJlZm9yZSBuZWVkaW5nIHRvIGVudGVyIHRoZSBzd2FtcC5cbiAgICAgICAgICAgICBHYXMgbWFzayBpcyBzdGlsbCBndWFyYW50ZWVkIHRvIGtpbGwgdGhlIGluc2VjdC5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ0hzJyxcbiAgICAgIGhhcmQ6IHRydWUsXG4gICAgICBuYW1lOiAnTWF0Y2hpbmcgc3dvcmQgbm90IGd1YXJhbnRlZWQnLFxuICAgICAgdGV4dDogYFBsYXllciBtYXkgYmUgcmVxdWlyZWQgdG8gZmlnaHQgYm9zc2VzIHdpdGggdGhlIHdyb25nIHN3b3JkLCB3aGljaFxuICAgICAgICAgICAgIG1heSByZXF1aXJlIHVzaW5nIFwidGluayBzdHJhdHNcIiBkZWFsaW5nIDEgZGFtYWdlIHBlciBoaXQuYCxcbiAgICAgIC8vIH0sIHtcbiAgICAgIC8vICAgZmxhZzogJ0h0JyxcbiAgICAgIC8vICAgaGFyZDogdHJ1ZSxcbiAgICAgIC8vICAgbmFtZTogJ01heCBvdXQgc2NhbGluZyBsZXZlbCBpbiB0b3dlcicsXG4gICAgICAvLyAgIHRleHQ6IGBTY2FsaW5nIGxldmVsIGltbWVkaWF0ZWx5IG1heGVzIG91dCB1cG9uIHN0ZXBwaW5nIGludG9cbiAgICAgIC8vICAgdG93ZXIuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdIeCcsXG4gICAgICBoYXJkOiB0cnVlLFxuICAgICAgbmFtZTogJ0V4cGVyaWVuY2Ugc2NhbGVzIHNsb3dlcicsXG4gICAgICB0ZXh0OiBgTW9yZSBncmluZGluZyB3aWxsIGJlIHJlcXVpcmVkIHRvIFwia2VlcCB1cFwiIHdpdGggdGhlIGRpZmZpY3VsdHkuYCxcbiAgICAgIGNvbmZsaWN0OiAvRXgvXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnSGMnLFxuICAgICAgaGFyZDogdHJ1ZSxcbiAgICAgIG5hbWU6ICdDaGFyZ2Ugc2hvdHMgb25seScsXG4gICAgICB0ZXh0OiBgU3RhYmJpbmcgaXMgY29tcGxldGVseSBpbmVmZmVjdGl2ZS4gIE9ubHkgY2hhcmdlZCBzaG90cyB3b3JrLmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnSGQnLFxuICAgICAgaGFyZDogdHJ1ZSxcbiAgICAgIG5hbWU6ICdCdWZmIER5bmEnLFxuICAgICAgdGV4dDpcbiAgICAgICAgICBgTWFrZXMgdGhlIER5bmEgZmlnaHQgYSBiaXQgbW9yZSBvZiBhIGNoYWxsZW5nZS4gIFNpZGUgcG9kcyB3aWxsIGZpcmVcbiAgICAgICAgICAgICBzaWduaWZpY2FudGx5IG1vcmUuICBUaGUgc2FmZSBzcG90IGhhcyBiZWVuIHJlbW92ZWQuICBUaGUgY291bnRlclxuICAgICAgICAgICAgIGF0dGFja3MgcGFzcyB0aHJvdWdoIGJhcnJpZXIuICBTaWRlIHBvZHMgY2FuIG5vdyBiZSBraWxsZWQuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdIeicsXG4gICAgICBoYXJkOiB0cnVlLFxuICAgICAgbmFtZTogJ0JsYWNrb3V0IG1vZGUnLFxuICAgICAgdGV4dDogYEFsbCBjYXZlcyBhbmQgZm9ydHJlc3NlcyBhcmUgcGVybWFuZW50bHkgZGFyay5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ0hoJyxcbiAgICAgIGhhcmQ6IHRydWUsXG4gICAgICBuYW1lOiAnSGFyZGNvcmUgbW9kZScsXG4gICAgICB0ZXh0OiBgQ2hlY2twb2ludHMgYW5kIHNhdmVzIGFyZSByZW1vdmVkLmAsXG4gICAgfVxuICBdLFxuICAvLyB9LCB7XG4gIC8vICAgc2VjdGlvbjogJ1dlYXBvbnMsIGFybW9yLCBhbmQgaXRlbSBiYWxhbmNlJyxcbiAgLy8gICAgIDxkaXYgY2xhc3M9XCJjaGVja2JveFwiPlc6IE5vcm1hbGl6ZSB3ZWFwb25zIGFuZCBhcm1vcjwvZGl2PlxuICAvLyAgICAgICA8ZGl2IGNsYXNzPVwiZmxhZy1ib2R5XCI+XG4gIC8vICAgICAgICAgU3dvcmQgYXR0YWNrIHZhbHVlcyBubyBsb25nZXIgZGVwZW5kIG9uIGVsZW1lbnQsIGJ1dCBpbnN0ZWFkIG9uIHRoZVxuICAvLyAgICAgICAgIG51bWJlciBvZiBvcmIvYnJhY2VsZXQgdXBncmFkZXM6IGp1c3QgdGhlIHN3b3JkIGlzIDI7IHN3b3JkIHBsdXNcbiAgLy8gICAgICAgICBvbmUgdXBncmFkZSBpcyA0OyBzd29yZCBwbHVzIGJvdGggdXBncmFkZXMgaXMgOC4gIFN0YWIgZGFtYWdlIGlzXG4gIC8vICAgICAgICAgYWx3YXlzIGZpeGVkIGF0IDIsIHJhdGhlciB0aGFuIGVmZmVjdGl2ZWx5IGRvdWJsaW5nIHRoZSBzd29yZCdzXG4gIC8vICAgICAgICAgYmFzZSBkYW1hZ2UuIEVuZW1pZXMgbm8gbG9uZ2VyIGhhdmUgbWluaW11bSBwbGF5ZXIgbGV2ZWxcbiAgLy8gICAgICAgICByZXF1aXJlbWVudHMuICBBbGwgc3dvcmQgaGl0cyB3aWxsIG5vdyBkbyBhdCBsZWFzdCBvbmUgZGFtYWdlICh3aGVuXG4gIC8vICAgICAgICAgYSBoaXQgXCJwaW5nc1wiLCBleGFjdGx5IG9uZSBkYW1hZ2UgaXMgZGVhbHQpLCBzbyBubyBlbmVteSBpc1xuICAvLyAgICAgICAgIHVua2lsbGFibGUuIDxwPkJhc2UgYXJtb3Ivc2hpZWxkIGRlZmVuc2UgaXMgaGFsdmVkLCBhbmQgY2FwcGVkIGF0XG4gIC8vICAgICAgICAgdHdpY2UgdGhlIHBsYXllciBsZXZlbCwgc28gdGhhdCAoYSkgcGxheWVyIGxldmVsIGhhcyBtb3JlIGltcGFjdCxcbiAgLy8gICAgICAgICBhbmQgKGIpIHJlYWxseSBnb29kIGFybW9ycyBhcmVuJ3Qgb3ZlcnBvd2VyZWQgaW4gZWFybHkgZ2FtZS5cbiAgLy8gICAgICAgPC9kaXY+XG4gIC8vICAgICAgIDxkaXYgY2xhc3M9XCJjaGVja2JveFwiPldwOiBOZXJmIHBvd2VyIHJpbmc8L2Rpdj5cbiAgLy8gICAgICAgPGRpdiBjbGFzcz1cImZsYWctYm9keVwiPlxuICAvLyAgICAgICAgIFRPRE8gLSBkb24ndCBuZWNlc3NhcmlseSB3YW50IHRvIHJlcXVpcmUgY2xpY2tpbmcgdGhyb3VnaCB0byBnZXRcbiAgLy8gICAgICAgICBmdWxsIGxpc3Qgb2YgY2hhbmdlcywgYnV0IGFsc28gd2FudCB0byBkb2N1bWVudCBpbiB2YXJpb3VzIHBsYWNlc1xuICAvLyAgICAgICAgIGFuZCB3YW50IHJlYXNvbmFibGUgZGVmYXVsdHMuXG4gIC8vICAgICAgIDwvZGl2PlxufTtcbiJdfQ==