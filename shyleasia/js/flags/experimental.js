export const EXPERIMENTAL_FLAGS = {
    section: 'Experimental',
    prefix: 'X',
    flags: [
        {
            flag: 'Xb',
            name: 'Remove one early wall',
            text: `Remove either the wall in East Cave or the wall behind Zebu.`,
        },
        {
            flag: 'Xc',
            name: 'Extra checks',
            text: `Add two extra checks in the initial area.  This requires Re and
             results in an item on the student, as well as two chests in the
             East Cave.`,
        },
        {
            flag: 'Xe',
            name: 'East Cave (GBC)',
            text: `Add the "East Cave" from the GBC version.  If this is selected
             then the initial Alarm Flute will be found in a chest on the
             second floor of this cave.  If Rp is also selected, then there
             will be a second exit from this cave leading to Lime Tree Valley.`,
        },
        {
            flag: 'Xf',
            name: 'Fog Lamp not required for dolphin',
            text: `Can summon dolphin immediately with only shell flute.  Fog lamp
             provides one point of access to the sea, which comes with an item
             under Kensu.  Talking to Kensu is not required for dolphin.`,
        },
        {
            flag: 'Xg',
            name: 'Goa passage',
            text: `Add a passage between East Cave and Goa Valley.  There will be an
             "ember wall" (requires water) blocking the exit.  Requires Xe`,
        },
        {
            flag: 'Xw',
            name: 'Random thunder warp',
            text: `Randomize warp location for Sword of Thunder.  Instead of warping
             to Shyron, the player may instead be warped to any of the 12 towns,
             chosen randomly when the seed is rolled.  Access to that town will
             be considered "in-logic" once Sword of Thunder is acquired.`,
        },
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZXJpbWVudGFsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2ZsYWdzL2V4cGVyaW1lbnRhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBZ0I7SUFDN0MsT0FBTyxFQUFFLGNBQWM7SUFDdkIsTUFBTSxFQUFFLEdBQUc7SUFFWCxLQUFLLEVBQUU7UUFDTDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLHVCQUF1QjtZQUM3QixJQUFJLEVBQUUsOERBQThEO1NBQ3JFO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxjQUFjO1lBQ3BCLElBQUksRUFBRTs7d0JBRVk7U0FDbkI7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixJQUFJLEVBQUU7OzsrRUFHbUU7U0FDMUU7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLG1DQUFtQztZQUN6QyxJQUFJLEVBQUU7O3lFQUU2RDtTQUNwRTtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsYUFBYTtZQUNuQixJQUFJLEVBQUU7MkVBQytEO1NBQ3RFO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxxQkFBcUI7WUFDM0IsSUFBSSxFQUFFOzs7eUVBRzZEO1NBQ3BFO0tBQ0Y7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtGbGFnU2VjdGlvbn0gZnJvbSAnLi9mbGFnJztcblxuZXhwb3J0IGNvbnN0IEVYUEVSSU1FTlRBTF9GTEFHUzogRmxhZ1NlY3Rpb24gPSB7XG4gIHNlY3Rpb246ICdFeHBlcmltZW50YWwnLFxuICBwcmVmaXg6ICdYJyxcblxuICBmbGFnczogW1xuICAgIHtcbiAgICAgIGZsYWc6ICdYYicsXG4gICAgICBuYW1lOiAnUmVtb3ZlIG9uZSBlYXJseSB3YWxsJyxcbiAgICAgIHRleHQ6IGBSZW1vdmUgZWl0aGVyIHRoZSB3YWxsIGluIEVhc3QgQ2F2ZSBvciB0aGUgd2FsbCBiZWhpbmQgWmVidS5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ1hjJyxcbiAgICAgIG5hbWU6ICdFeHRyYSBjaGVja3MnLFxuICAgICAgdGV4dDogYEFkZCB0d28gZXh0cmEgY2hlY2tzIGluIHRoZSBpbml0aWFsIGFyZWEuICBUaGlzIHJlcXVpcmVzIFJlIGFuZFxuICAgICAgICAgICAgIHJlc3VsdHMgaW4gYW4gaXRlbSBvbiB0aGUgc3R1ZGVudCwgYXMgd2VsbCBhcyB0d28gY2hlc3RzIGluIHRoZVxuICAgICAgICAgICAgIEVhc3QgQ2F2ZS5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ1hlJyxcbiAgICAgIG5hbWU6ICdFYXN0IENhdmUgKEdCQyknLFxuICAgICAgdGV4dDogYEFkZCB0aGUgXCJFYXN0IENhdmVcIiBmcm9tIHRoZSBHQkMgdmVyc2lvbi4gIElmIHRoaXMgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICB0aGVuIHRoZSBpbml0aWFsIEFsYXJtIEZsdXRlIHdpbGwgYmUgZm91bmQgaW4gYSBjaGVzdCBvbiB0aGVcbiAgICAgICAgICAgICBzZWNvbmQgZmxvb3Igb2YgdGhpcyBjYXZlLiAgSWYgUnAgaXMgYWxzbyBzZWxlY3RlZCwgdGhlbiB0aGVyZVxuICAgICAgICAgICAgIHdpbGwgYmUgYSBzZWNvbmQgZXhpdCBmcm9tIHRoaXMgY2F2ZSBsZWFkaW5nIHRvIExpbWUgVHJlZSBWYWxsZXkuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdYZicsXG4gICAgICBuYW1lOiAnRm9nIExhbXAgbm90IHJlcXVpcmVkIGZvciBkb2xwaGluJyxcbiAgICAgIHRleHQ6IGBDYW4gc3VtbW9uIGRvbHBoaW4gaW1tZWRpYXRlbHkgd2l0aCBvbmx5IHNoZWxsIGZsdXRlLiAgRm9nIGxhbXBcbiAgICAgICAgICAgICBwcm92aWRlcyBvbmUgcG9pbnQgb2YgYWNjZXNzIHRvIHRoZSBzZWEsIHdoaWNoIGNvbWVzIHdpdGggYW4gaXRlbVxuICAgICAgICAgICAgIHVuZGVyIEtlbnN1LiAgVGFsa2luZyB0byBLZW5zdSBpcyBub3QgcmVxdWlyZWQgZm9yIGRvbHBoaW4uYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdYZycsXG4gICAgICBuYW1lOiAnR29hIHBhc3NhZ2UnLFxuICAgICAgdGV4dDogYEFkZCBhIHBhc3NhZ2UgYmV0d2VlbiBFYXN0IENhdmUgYW5kIEdvYSBWYWxsZXkuICBUaGVyZSB3aWxsIGJlIGFuXG4gICAgICAgICAgICAgXCJlbWJlciB3YWxsXCIgKHJlcXVpcmVzIHdhdGVyKSBibG9ja2luZyB0aGUgZXhpdC4gIFJlcXVpcmVzIFhlYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdYdycsXG4gICAgICBuYW1lOiAnUmFuZG9tIHRodW5kZXIgd2FycCcsXG4gICAgICB0ZXh0OiBgUmFuZG9taXplIHdhcnAgbG9jYXRpb24gZm9yIFN3b3JkIG9mIFRodW5kZXIuICBJbnN0ZWFkIG9mIHdhcnBpbmdcbiAgICAgICAgICAgICB0byBTaHlyb24sIHRoZSBwbGF5ZXIgbWF5IGluc3RlYWQgYmUgd2FycGVkIHRvIGFueSBvZiB0aGUgMTIgdG93bnMsXG4gICAgICAgICAgICAgY2hvc2VuIHJhbmRvbWx5IHdoZW4gdGhlIHNlZWQgaXMgcm9sbGVkLiAgQWNjZXNzIHRvIHRoYXQgdG93biB3aWxsXG4gICAgICAgICAgICAgYmUgY29uc2lkZXJlZCBcImluLWxvZ2ljXCIgb25jZSBTd29yZCBvZiBUaHVuZGVyIGlzIGFjcXVpcmVkLmAsXG4gICAgfSxcbiAgXSxcbn07XG4iXX0=