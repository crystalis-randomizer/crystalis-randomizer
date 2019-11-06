export const ROUTING_FLAGS = {
    section: 'Routing',
    prefix: 'R',
    flags: [
        {
            flag: 'Re',
            name: '???',
        },
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
        }
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9mbGFncy9yb3V0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBZ0I7SUFDeEMsT0FBTyxFQUFFLFNBQVM7SUFDbEIsTUFBTSxFQUFFLEdBQUc7SUFFWCxLQUFLLEVBQUU7UUFDTDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLEtBQUs7U0FDWjtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsWUFBWTtZQUNsQixJQUFJLEVBQUU7dURBQzJDO1NBQ2xEO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxzQ0FBc0M7WUFDNUMsSUFBSSxFQUFFOzs7Ozs0RUFLZ0U7U0FDdkU7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLDRDQUE0QztZQUNsRCxJQUFJLEVBQ0E7Ozs7O2tFQUt3RDtTQUM3RDtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsd0JBQXdCO1lBQzlCLElBQUksRUFBRTs2QkFDaUI7U0FDeEI7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLHdCQUF3QjtZQUM5QixJQUFJLEVBQUUsa0RBQWtEO1NBQ3pEO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxrQ0FBa0M7WUFDeEMsSUFBSSxFQUNBOztxREFFMkM7U0FDaEQ7S0FDRjtDQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0ZsYWdTZWN0aW9ufSBmcm9tICcuL2ZsYWcnO1xuXG5leHBvcnQgY29uc3QgUk9VVElOR19GTEFHUzogRmxhZ1NlY3Rpb24gPSB7XG4gIHNlY3Rpb246ICdSb3V0aW5nJyxcbiAgcHJlZml4OiAnUicsXG5cbiAgZmxhZ3M6IFtcbiAgICB7XG4gICAgICBmbGFnOiAnUmUnLFxuICAgICAgbmFtZTogJz8/PycsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnUnMnLFxuICAgICAgbmFtZTogJ1N0b3J5IE1vZGUnLFxuICAgICAgdGV4dDogYERyYXlnb24gMiB3b24ndCBzcGF3biB1bmxlc3MgeW91IGhhdmUgYWxsIGZvdXIgc3dvcmRzIGFuZCBoYXZlXG4gICAgICAgICAgIGRlZmVhdGVkIGFsbCBtYWpvciBib3NzZXMgb2YgdGhlIHRldHJhcmNoeS5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ1J0JyxcbiAgICAgIG5hbWU6ICdTd29yZCBvZiBUaHVuZGVyIHRlbGVwb3J0cyB0byBTaHlyb24nLFxuICAgICAgdGV4dDogYE5vcm1hbGx5IHdoZW4gYWNxdWlyaW5nIHRoZSB0aHVuZGVyIHN3b3JkLCB0aGUgcGxheWVyIGlzIGluc3RhbnRseVxuICAgICAgICAgICB0ZWxlcG9ydGVkIHRvIFNoeXJvbi4gVGhpcyBmbGFnIG1haW50YWlucyB0aGF0IGJlaGF2aW9yIHJlZ2FyZGxlc3Mgb2ZcbiAgICAgICAgICAgd2hlcmUgaXQgaXMgZm91bmQgKGltbWVkaWF0ZWx5IGFjdGl2YXRpbmcgdGhlIHdhcnAgcG9pbnQ7IHRhbGtpbmdcbiAgICAgICAgICAgdG8gQXNpbmEgd2lsbCB0ZWxlcG9ydCBiYWNrIHRvIHRoZSBTaHJpbmUgb2YgTWV6YW1lLCBpbiBjYXNlIG5vIG90aGVyXG4gICAgICAgICAgIG1lYW5zIG9mIHJldHVybiBpcyBhdmFpbGFibGUpLiAgRGlzYWJsaW5nIHRoaXMgZmxhZyBtZWFucyB0aGF0IHRoZVxuICAgICAgICAgICBTd29yZCBvZiBUaHVuZGVyIHdpbGwgYWN0IGxpa2UgYWxsIG90aGVyIGl0ZW1zIGFuZCBub3QgdGVsZXBvcnQuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdSZCcsXG4gICAgICBuYW1lOiAnUmVxdWlyZSBoZWFsaW5nIGRvbHBoaW4gdG8gcmV0dXJuIGZvZyBsYW1wJyxcbiAgICAgIHRleHQ6XG4gICAgICAgICAgYE5vcm1hbGx5IHRoZSBmb2cgbGFtcCBjYW5ub3QgYmUgcmV0dXJuZWQgd2l0aG91dCBoZWFsaW5nIHRoZSBkb2xwaGluXG4gICAgICAgICAgIHRvIGFjcXVpcmUgdGhlIHNoZWxsIGZsdXRlIChzbyBhcyBub3QgdG8gYmUgc3RyYW5kZWQpLiAgQ29udGludWl0eVxuICAgICAgICAgICBzdWdnZXN0cyB0aGF0IGFjdHVhbGx5IGhlYWxpbmcgdGhlIGRvbHBoaW4gc2hvdWxkIGFsc28gYmUgcmVxdWlyZWQsXG4gICAgICAgICAgIGJ1dCB3ZSd2ZSBmb3VuZCB0aGF0IHRoaXMgbWFrZXMgdGhlIGRvbHBoaW4gYSBsb3QgbGVzcyB1c2VmdWwuICBCeVxuICAgICAgICAgICBkZWZhdWx0IHRoZSBmb2cgbGFtcCBjYW4gYmUgcmV0dXJuZWQgYmVmb3JlIGhlYWxpbmcgdGhlIGRvbHBoaW4uICBUaGlzXG4gICAgICAgICAgIGZsYWcgYWRkcyB0aGUgZXh0cmEgcmVxdWlyZW1lbnQgZm9yIGJldHRlciBjb250aW51aXR5LmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnUnAnLFxuICAgICAgbmFtZTogJ1dpbmQtd2F0ZXJmYWxsIHBhc3NhZ2UnLFxuICAgICAgdGV4dDogYE9wZW5zIGEgcGFzc2FnZSBiZXR3ZWVuIFZhbGxleSBvZiBXaW5kIChsb3dlciByaWdodCBzaWRlKSBhbmRcbiAgICAgICAgICAgTGltZSBUcmVlIFZhbGxleS5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ1JyJyxcbiAgICAgIG5hbWU6ICdEZW8gcmVxdWlyZXMgdGVsZXBhdGh5JyxcbiAgICAgIHRleHQ6IGBEZW8ncyBpdGVtIGlzIGFkZGl0aW9uYWxseSBibG9ja2VkIG9uIHRlbGVwYXRoeS5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ1JvJyxcbiAgICAgIG5hbWU6ICdPcmJzIG5vdCByZXF1aXJlZCB0byBicmVhayB3YWxscycsXG4gICAgICB0ZXh0OlxuICAgICAgICAgIGBXYWxscyBjYW4gYmUgYnJva2VuIGFuZCBicmlkZ2VzIGZvcm1lZCB3aXRoIGxldmVsIDEgc2hvdHMuICBPcmJzIGFuZFxuICAgICAgICAgICBicmFjZWxldHMgYXJlIG5vIGxvbmdlciBjb25zaWRlcmVkIHByb2dyZXNzaW9uIGl0ZW1zIChleGNlcHQgZm9yXG4gICAgICAgICAgIFRvcm5hZG8gYnJhY2VsZXQgZm9yIFRvcm5lbCBvbiBNdCBTYWJyZSkuYCxcbiAgICB9XG4gIF0sXG59O1xuIl19