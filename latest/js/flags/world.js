export const WORLD_FLAGS = {
    section: 'World',
    prefix: 'W',
    flags: [
        {
            flag: 'Wm',
            name: 'Randomize maps',
            text: `Individual maps are randomized.  For now this is only a subset of
             possible maps.  A randomized map will have all the same features
             (exits, chests, NPCs, etc) except things are moved around.`,
        },
        {
            flag: 'Wt',
            name: 'Randomize trade-in items',
            text: `Items expected by various NPCs will be shuffled: specifically,
             Statue of Onyx, Kirisa Plant, Love Pendant, Ivory Statue, Fog
             Lamp, and Flute of Lime (for Akahana).  Rage will expect a
             random sword, and Tornel will expect a random bracelet.`,
        },
        {
            flag: 'Wu',
            hard: true,
            name: 'Unidentified key items',
            text: `Item names will be generic and effects will be shuffled.  This
             includes keys, flutes, lamps, and statues.`,
        },
        {
            flag: 'Ww',
            name: 'Randomize elements to break walls',
            text: `Walls will require a randomized element to break.  Normal rock and
             ice walls will indicate the required element by the color (light
             grey or yellow for wind, blue for fire, bright orange ("embers") for
             water, or dark grey ("steel") for thunder.  The element to break
             these walls is the same throughout an area.  Iron walls require a
             one-off random element, with no visual cue, and two walls in the
             same area may have different requirements.`,
        }
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvZmxhZ3Mvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFnQjtJQUN0QyxPQUFPLEVBQUUsT0FBTztJQUNoQixNQUFNLEVBQUUsR0FBRztJQUVYLEtBQUssRUFBRTtRQUNMO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsZ0JBQWdCO1lBQ3RCLElBQUksRUFBRTs7d0VBRTREO1NBQ25FO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSwwQkFBMEI7WUFDaEMsSUFBSSxFQUFFOzs7cUVBR3lEO1NBQ2hFO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLHdCQUF3QjtZQUM5QixJQUFJLEVBQUU7d0RBQzRDO1NBQ25EO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxtQ0FBbUM7WUFDekMsSUFBSSxFQUFFOzs7Ozs7d0RBTTRDO1NBQ25EO0tBQ0Y7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtGbGFnU2VjdGlvbn0gZnJvbSAnLi9mbGFnLmpzJztcblxuZXhwb3J0IGNvbnN0IFdPUkxEX0ZMQUdTOiBGbGFnU2VjdGlvbiA9IHtcbiAgc2VjdGlvbjogJ1dvcmxkJyxcbiAgcHJlZml4OiAnVycsXG5cbiAgZmxhZ3M6IFtcbiAgICB7XG4gICAgICBmbGFnOiAnV20nLFxuICAgICAgbmFtZTogJ1JhbmRvbWl6ZSBtYXBzJyxcbiAgICAgIHRleHQ6IGBJbmRpdmlkdWFsIG1hcHMgYXJlIHJhbmRvbWl6ZWQuICBGb3Igbm93IHRoaXMgaXMgb25seSBhIHN1YnNldCBvZlxuICAgICAgICAgICAgIHBvc3NpYmxlIG1hcHMuICBBIHJhbmRvbWl6ZWQgbWFwIHdpbGwgaGF2ZSBhbGwgdGhlIHNhbWUgZmVhdHVyZXNcbiAgICAgICAgICAgICAoZXhpdHMsIGNoZXN0cywgTlBDcywgZXRjKSBleGNlcHQgdGhpbmdzIGFyZSBtb3ZlZCBhcm91bmQuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdXdCcsXG4gICAgICBuYW1lOiAnUmFuZG9taXplIHRyYWRlLWluIGl0ZW1zJyxcbiAgICAgIHRleHQ6IGBJdGVtcyBleHBlY3RlZCBieSB2YXJpb3VzIE5QQ3Mgd2lsbCBiZSBzaHVmZmxlZDogc3BlY2lmaWNhbGx5LFxuICAgICAgICAgICAgIFN0YXR1ZSBvZiBPbnl4LCBLaXJpc2EgUGxhbnQsIExvdmUgUGVuZGFudCwgSXZvcnkgU3RhdHVlLCBGb2dcbiAgICAgICAgICAgICBMYW1wLCBhbmQgRmx1dGUgb2YgTGltZSAoZm9yIEFrYWhhbmEpLiAgUmFnZSB3aWxsIGV4cGVjdCBhXG4gICAgICAgICAgICAgcmFuZG9tIHN3b3JkLCBhbmQgVG9ybmVsIHdpbGwgZXhwZWN0IGEgcmFuZG9tIGJyYWNlbGV0LmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnV3UnLFxuICAgICAgaGFyZDogdHJ1ZSxcbiAgICAgIG5hbWU6ICdVbmlkZW50aWZpZWQga2V5IGl0ZW1zJyxcbiAgICAgIHRleHQ6IGBJdGVtIG5hbWVzIHdpbGwgYmUgZ2VuZXJpYyBhbmQgZWZmZWN0cyB3aWxsIGJlIHNodWZmbGVkLiAgVGhpc1xuICAgICAgICAgICAgIGluY2x1ZGVzIGtleXMsIGZsdXRlcywgbGFtcHMsIGFuZCBzdGF0dWVzLmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnV3cnLFxuICAgICAgbmFtZTogJ1JhbmRvbWl6ZSBlbGVtZW50cyB0byBicmVhayB3YWxscycsXG4gICAgICB0ZXh0OiBgV2FsbHMgd2lsbCByZXF1aXJlIGEgcmFuZG9taXplZCBlbGVtZW50IHRvIGJyZWFrLiAgTm9ybWFsIHJvY2sgYW5kXG4gICAgICAgICAgICAgaWNlIHdhbGxzIHdpbGwgaW5kaWNhdGUgdGhlIHJlcXVpcmVkIGVsZW1lbnQgYnkgdGhlIGNvbG9yIChsaWdodFxuICAgICAgICAgICAgIGdyZXkgb3IgeWVsbG93IGZvciB3aW5kLCBibHVlIGZvciBmaXJlLCBicmlnaHQgb3JhbmdlIChcImVtYmVyc1wiKSBmb3JcbiAgICAgICAgICAgICB3YXRlciwgb3IgZGFyayBncmV5IChcInN0ZWVsXCIpIGZvciB0aHVuZGVyLiAgVGhlIGVsZW1lbnQgdG8gYnJlYWtcbiAgICAgICAgICAgICB0aGVzZSB3YWxscyBpcyB0aGUgc2FtZSB0aHJvdWdob3V0IGFuIGFyZWEuICBJcm9uIHdhbGxzIHJlcXVpcmUgYVxuICAgICAgICAgICAgIG9uZS1vZmYgcmFuZG9tIGVsZW1lbnQsIHdpdGggbm8gdmlzdWFsIGN1ZSwgYW5kIHR3byB3YWxscyBpbiB0aGVcbiAgICAgICAgICAgICBzYW1lIGFyZWEgbWF5IGhhdmUgZGlmZmVyZW50IHJlcXVpcmVtZW50cy5gLFxuICAgIH1cbiAgXSxcbn07XG4iXX0=