export const GLITCH_FIX_FLAGS = {
    section: 'Glitch Fixes',
    prefix: 'F',
    text: `Alternatively, glitches may be patched out of the game and made unusable.
         These flags are exclusive with the flags that require the glitch.`,
    flags: [
        {
            flag: 'Fs',
            name: 'Disable shop glitch',
            text: `Items may no longer be purchased for neighboring prices.  This makes
           money actually mean something.  To compensate, gold drops money
           will be scaled up somewhat.`,
        },
        {
            flag: 'Fc',
            name: 'Disable sword charge glitch',
            text: `Sword charge glitch will no longer work.  It will be impossible to
           achieve charge levels without having correct inventory.`,
            conflict: /Gc/
        },
        {
            flag: 'Fp',
            name: 'Disable teleport skip',
            text: `Mt Sabre North cannot be entered from Cordel Plans without the
           Teleport spell, even via glitch.`,
            conflict: /Gp/
        },
        {
            flag: 'Fr',
            name: 'Disable rabbit skip',
            text: `Mt Sabre North cannot be entered from Cordel Plans without talking to
           the rabbit in leaf.`,
            conflict: /Gr/
        },
        {
            flag: 'Ft',
            name: 'Disable statue glitch',
            text: `Statues will instead always push downwards, making it impossible to
           glitch through statues for progression.`,
            conflict: /Gt/
        },
        {
            flag: 'Fw',
            name: 'Disable wild warp',
            text: `Wild warp will only teleport back to Mezame shrine (to prevent
           game-breaking soft-locks).`,
            conflict: /[GT]w/
        }
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xpdGNoLWZpeGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2ZsYWdzL2dsaXRjaC1maXhlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBZ0I7SUFDM0MsT0FBTyxFQUFFLGNBQWM7SUFDdkIsTUFBTSxFQUFFLEdBQUc7SUFDWCxJQUFJLEVBQ0E7MkVBQ3FFO0lBRXpFLEtBQUssRUFBRTtRQUNMO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUscUJBQXFCO1lBQzNCLElBQUksRUFDQTs7dUNBRTZCO1NBQ2xDO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSw2QkFBNkI7WUFDbkMsSUFBSSxFQUFFO21FQUN1RDtZQUM3RCxRQUFRLEVBQUUsSUFBSTtTQUNmO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSx1QkFBdUI7WUFDN0IsSUFBSSxFQUFFOzRDQUNnQztZQUN0QyxRQUFRLEVBQUUsSUFBSTtTQUNmO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxxQkFBcUI7WUFDM0IsSUFBSSxFQUNBOytCQUNxQjtZQUN6QixRQUFRLEVBQUUsSUFBSTtTQUNmO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSx1QkFBdUI7WUFDN0IsSUFBSSxFQUNBO21EQUN5QztZQUM3QyxRQUFRLEVBQUUsSUFBSTtTQUNmO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxtQkFBbUI7WUFDekIsSUFBSSxFQUFFO3NDQUMwQjtZQUNoQyxRQUFRLEVBQUUsT0FBTztTQUNsQjtLQUNGO0NBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RmxhZ1NlY3Rpb259IGZyb20gJy4vZmxhZy5qcyc7XG5cbmV4cG9ydCBjb25zdCBHTElUQ0hfRklYX0ZMQUdTOiBGbGFnU2VjdGlvbiA9IHtcbiAgc2VjdGlvbjogJ0dsaXRjaCBGaXhlcycsXG4gIHByZWZpeDogJ0YnLFxuICB0ZXh0OlxuICAgICAgYEFsdGVybmF0aXZlbHksIGdsaXRjaGVzIG1heSBiZSBwYXRjaGVkIG91dCBvZiB0aGUgZ2FtZSBhbmQgbWFkZSB1bnVzYWJsZS5cbiAgICAgICAgIFRoZXNlIGZsYWdzIGFyZSBleGNsdXNpdmUgd2l0aCB0aGUgZmxhZ3MgdGhhdCByZXF1aXJlIHRoZSBnbGl0Y2guYCxcblxuICBmbGFnczogW1xuICAgIHtcbiAgICAgIGZsYWc6ICdGcycsXG4gICAgICBuYW1lOiAnRGlzYWJsZSBzaG9wIGdsaXRjaCcsXG4gICAgICB0ZXh0OlxuICAgICAgICAgIGBJdGVtcyBtYXkgbm8gbG9uZ2VyIGJlIHB1cmNoYXNlZCBmb3IgbmVpZ2hib3JpbmcgcHJpY2VzLiAgVGhpcyBtYWtlc1xuICAgICAgICAgICBtb25leSBhY3R1YWxseSBtZWFuIHNvbWV0aGluZy4gIFRvIGNvbXBlbnNhdGUsIGdvbGQgZHJvcHMgbW9uZXlcbiAgICAgICAgICAgd2lsbCBiZSBzY2FsZWQgdXAgc29tZXdoYXQuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdGYycsXG4gICAgICBuYW1lOiAnRGlzYWJsZSBzd29yZCBjaGFyZ2UgZ2xpdGNoJyxcbiAgICAgIHRleHQ6IGBTd29yZCBjaGFyZ2UgZ2xpdGNoIHdpbGwgbm8gbG9uZ2VyIHdvcmsuICBJdCB3aWxsIGJlIGltcG9zc2libGUgdG9cbiAgICAgICAgICAgYWNoaWV2ZSBjaGFyZ2UgbGV2ZWxzIHdpdGhvdXQgaGF2aW5nIGNvcnJlY3QgaW52ZW50b3J5LmAsXG4gICAgICBjb25mbGljdDogL0djL1xuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ0ZwJyxcbiAgICAgIG5hbWU6ICdEaXNhYmxlIHRlbGVwb3J0IHNraXAnLFxuICAgICAgdGV4dDogYE10IFNhYnJlIE5vcnRoIGNhbm5vdCBiZSBlbnRlcmVkIGZyb20gQ29yZGVsIFBsYW5zIHdpdGhvdXQgdGhlXG4gICAgICAgICAgIFRlbGVwb3J0IHNwZWxsLCBldmVuIHZpYSBnbGl0Y2guYCxcbiAgICAgIGNvbmZsaWN0OiAvR3AvXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnRnInLFxuICAgICAgbmFtZTogJ0Rpc2FibGUgcmFiYml0IHNraXAnLFxuICAgICAgdGV4dDpcbiAgICAgICAgICBgTXQgU2FicmUgTm9ydGggY2Fubm90IGJlIGVudGVyZWQgZnJvbSBDb3JkZWwgUGxhbnMgd2l0aG91dCB0YWxraW5nIHRvXG4gICAgICAgICAgIHRoZSByYWJiaXQgaW4gbGVhZi5gLFxuICAgICAgY29uZmxpY3Q6IC9Hci9cbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdGdCcsXG4gICAgICBuYW1lOiAnRGlzYWJsZSBzdGF0dWUgZ2xpdGNoJyxcbiAgICAgIHRleHQ6XG4gICAgICAgICAgYFN0YXR1ZXMgd2lsbCBpbnN0ZWFkIGFsd2F5cyBwdXNoIGRvd253YXJkcywgbWFraW5nIGl0IGltcG9zc2libGUgdG9cbiAgICAgICAgICAgZ2xpdGNoIHRocm91Z2ggc3RhdHVlcyBmb3IgcHJvZ3Jlc3Npb24uYCxcbiAgICAgIGNvbmZsaWN0OiAvR3QvXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnRncnLFxuICAgICAgbmFtZTogJ0Rpc2FibGUgd2lsZCB3YXJwJyxcbiAgICAgIHRleHQ6IGBXaWxkIHdhcnAgd2lsbCBvbmx5IHRlbGVwb3J0IGJhY2sgdG8gTWV6YW1lIHNocmluZSAodG8gcHJldmVudFxuICAgICAgICAgICBnYW1lLWJyZWFraW5nIHNvZnQtbG9ja3MpLmAsXG4gICAgICBjb25mbGljdDogL1tHVF13L1xuICAgIH1cbiAgXSxcbn07XG4iXX0=