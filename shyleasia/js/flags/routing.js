export const ROUTING_FLAGS = {
    section: 'Routing',
    prefix: 'R',
    flags: [
        {
            flag: 'Rs',
            name: 'Story Mode',
            text: `Draygon 2 won't spawn unless you have all four swords and have
           defeated all major bosses of the tetrarchy.`,
        },
        {
            flag: 'Rt',
            name: 'Sword of Thunder teleports to Shyron',
            text: `Normally when acquiring the thunder sword, the player is instantly
           teleported to Shyron. This flag maintains that behavior regardless of
           where it is found (immediately activating the warp point; talking
           to Asina will teleport back to the Shrine of Mezame, in case no other
           means of return is available).  Disabling this flag means that the
           Sword of Thunder will act like all other items and not teleport.`,
        },
        {
            flag: 'Rd',
            name: 'Require healing dolphin to return fog lamp',
            text: `Normally the fog lamp cannot be returned without healing the dolphin
           to acquire the shell flute (so as not to be stranded).  Continuity
           suggests that actually healing the dolphin should also be required,
           but we've found that this makes the dolphin a lot less useful.  By
           default the fog lamp can be returned before healing the dolphin.  This
           flag adds the extra requirement for better continuity.`,
        },
        {
            flag: 'Rp',
            name: 'Wind-waterfall passage',
            text: `Opens a passage between Valley of Wind (lower right side) and
           Lime Tree Valley.`,
        },
        {
            flag: 'Rr',
            name: 'Deo requires telepathy',
            text: `Deo's item is additionally blocked on telepathy.`,
        },
        {
            flag: 'Ro',
            name: 'Orbs not required to break walls',
            text: `Walls can be broken and bridges formed with level 1 shots.  Orbs and
           bracelets are no longer considered progression items (except for
           Tornado bracelet for Tornel on Mt Sabre).`,
        },
        {
            flag: 'Rb',
            name: 'No Bow mode',
            text: `No items are required to finish the game.  An exit is added from
          Mezame shrine directly to the Draygon 2 fight (and the normal entrance
          is removed).  Draygon 2 spawns automatically with no Bow of Truth.`,
        },
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9mbGFncy9yb3V0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBZ0I7SUFDeEMsT0FBTyxFQUFFLFNBQVM7SUFDbEIsTUFBTSxFQUFFLEdBQUc7SUFFWCxLQUFLLEVBQUU7UUFDTDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLFlBQVk7WUFDbEIsSUFBSSxFQUFFO3VEQUMyQztTQUNsRDtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsc0NBQXNDO1lBQzVDLElBQUksRUFBRTs7Ozs7NEVBS2dFO1NBQ3ZFO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSw0Q0FBNEM7WUFDbEQsSUFBSSxFQUNBOzs7OztrRUFLd0Q7U0FDN0Q7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLHdCQUF3QjtZQUM5QixJQUFJLEVBQUU7NkJBQ2lCO1NBQ3hCO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSx3QkFBd0I7WUFDOUIsSUFBSSxFQUFFLGtEQUFrRDtTQUN6RDtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsa0NBQWtDO1lBQ3hDLElBQUksRUFDQTs7cURBRTJDO1NBQ2hEO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxhQUFhO1lBQ25CLElBQUksRUFBRTs7NkVBRWlFO1NBQ3hFO0tBQ0Y7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtGbGFnU2VjdGlvbn0gZnJvbSAnLi9mbGFnJztcblxuZXhwb3J0IGNvbnN0IFJPVVRJTkdfRkxBR1M6IEZsYWdTZWN0aW9uID0ge1xuICBzZWN0aW9uOiAnUm91dGluZycsXG4gIHByZWZpeDogJ1InLFxuXG4gIGZsYWdzOiBbXG4gICAge1xuICAgICAgZmxhZzogJ1JzJyxcbiAgICAgIG5hbWU6ICdTdG9yeSBNb2RlJyxcbiAgICAgIHRleHQ6IGBEcmF5Z29uIDIgd29uJ3Qgc3Bhd24gdW5sZXNzIHlvdSBoYXZlIGFsbCBmb3VyIHN3b3JkcyBhbmQgaGF2ZVxuICAgICAgICAgICBkZWZlYXRlZCBhbGwgbWFqb3IgYm9zc2VzIG9mIHRoZSB0ZXRyYXJjaHkuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdSdCcsXG4gICAgICBuYW1lOiAnU3dvcmQgb2YgVGh1bmRlciB0ZWxlcG9ydHMgdG8gU2h5cm9uJyxcbiAgICAgIHRleHQ6IGBOb3JtYWxseSB3aGVuIGFjcXVpcmluZyB0aGUgdGh1bmRlciBzd29yZCwgdGhlIHBsYXllciBpcyBpbnN0YW50bHlcbiAgICAgICAgICAgdGVsZXBvcnRlZCB0byBTaHlyb24uIFRoaXMgZmxhZyBtYWludGFpbnMgdGhhdCBiZWhhdmlvciByZWdhcmRsZXNzIG9mXG4gICAgICAgICAgIHdoZXJlIGl0IGlzIGZvdW5kIChpbW1lZGlhdGVseSBhY3RpdmF0aW5nIHRoZSB3YXJwIHBvaW50OyB0YWxraW5nXG4gICAgICAgICAgIHRvIEFzaW5hIHdpbGwgdGVsZXBvcnQgYmFjayB0byB0aGUgU2hyaW5lIG9mIE1lemFtZSwgaW4gY2FzZSBubyBvdGhlclxuICAgICAgICAgICBtZWFucyBvZiByZXR1cm4gaXMgYXZhaWxhYmxlKS4gIERpc2FibGluZyB0aGlzIGZsYWcgbWVhbnMgdGhhdCB0aGVcbiAgICAgICAgICAgU3dvcmQgb2YgVGh1bmRlciB3aWxsIGFjdCBsaWtlIGFsbCBvdGhlciBpdGVtcyBhbmQgbm90IHRlbGVwb3J0LmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnUmQnLFxuICAgICAgbmFtZTogJ1JlcXVpcmUgaGVhbGluZyBkb2xwaGluIHRvIHJldHVybiBmb2cgbGFtcCcsXG4gICAgICB0ZXh0OlxuICAgICAgICAgIGBOb3JtYWxseSB0aGUgZm9nIGxhbXAgY2Fubm90IGJlIHJldHVybmVkIHdpdGhvdXQgaGVhbGluZyB0aGUgZG9scGhpblxuICAgICAgICAgICB0byBhY3F1aXJlIHRoZSBzaGVsbCBmbHV0ZSAoc28gYXMgbm90IHRvIGJlIHN0cmFuZGVkKS4gIENvbnRpbnVpdHlcbiAgICAgICAgICAgc3VnZ2VzdHMgdGhhdCBhY3R1YWxseSBoZWFsaW5nIHRoZSBkb2xwaGluIHNob3VsZCBhbHNvIGJlIHJlcXVpcmVkLFxuICAgICAgICAgICBidXQgd2UndmUgZm91bmQgdGhhdCB0aGlzIG1ha2VzIHRoZSBkb2xwaGluIGEgbG90IGxlc3MgdXNlZnVsLiAgQnlcbiAgICAgICAgICAgZGVmYXVsdCB0aGUgZm9nIGxhbXAgY2FuIGJlIHJldHVybmVkIGJlZm9yZSBoZWFsaW5nIHRoZSBkb2xwaGluLiAgVGhpc1xuICAgICAgICAgICBmbGFnIGFkZHMgdGhlIGV4dHJhIHJlcXVpcmVtZW50IGZvciBiZXR0ZXIgY29udGludWl0eS5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ1JwJyxcbiAgICAgIG5hbWU6ICdXaW5kLXdhdGVyZmFsbCBwYXNzYWdlJyxcbiAgICAgIHRleHQ6IGBPcGVucyBhIHBhc3NhZ2UgYmV0d2VlbiBWYWxsZXkgb2YgV2luZCAobG93ZXIgcmlnaHQgc2lkZSkgYW5kXG4gICAgICAgICAgIExpbWUgVHJlZSBWYWxsZXkuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdScicsXG4gICAgICBuYW1lOiAnRGVvIHJlcXVpcmVzIHRlbGVwYXRoeScsXG4gICAgICB0ZXh0OiBgRGVvJ3MgaXRlbSBpcyBhZGRpdGlvbmFsbHkgYmxvY2tlZCBvbiB0ZWxlcGF0aHkuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdSbycsXG4gICAgICBuYW1lOiAnT3JicyBub3QgcmVxdWlyZWQgdG8gYnJlYWsgd2FsbHMnLFxuICAgICAgdGV4dDpcbiAgICAgICAgICBgV2FsbHMgY2FuIGJlIGJyb2tlbiBhbmQgYnJpZGdlcyBmb3JtZWQgd2l0aCBsZXZlbCAxIHNob3RzLiAgT3JicyBhbmRcbiAgICAgICAgICAgYnJhY2VsZXRzIGFyZSBubyBsb25nZXIgY29uc2lkZXJlZCBwcm9ncmVzc2lvbiBpdGVtcyAoZXhjZXB0IGZvclxuICAgICAgICAgICBUb3JuYWRvIGJyYWNlbGV0IGZvciBUb3JuZWwgb24gTXQgU2FicmUpLmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnUmInLFxuICAgICAgbmFtZTogJ05vIEJvdyBtb2RlJyxcbiAgICAgIHRleHQ6IGBObyBpdGVtcyBhcmUgcmVxdWlyZWQgdG8gZmluaXNoIHRoZSBnYW1lLiAgQW4gZXhpdCBpcyBhZGRlZCBmcm9tXG4gICAgICAgICAgTWV6YW1lIHNocmluZSBkaXJlY3RseSB0byB0aGUgRHJheWdvbiAyIGZpZ2h0IChhbmQgdGhlIG5vcm1hbCBlbnRyYW5jZVxuICAgICAgICAgIGlzIHJlbW92ZWQpLiAgRHJheWdvbiAyIHNwYXducyBhdXRvbWF0aWNhbGx5IHdpdGggbm8gQm93IG9mIFRydXRoLmAsXG4gICAgfSxcbiAgXSxcbn07XG4iXX0=