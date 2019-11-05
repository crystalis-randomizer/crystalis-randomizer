export const WORLD_FLAGS = {
    section: 'World',
    prefix: 'W',
    flags: [
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvZmxhZ3Mvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFnQjtJQUN0QyxPQUFPLEVBQUUsT0FBTztJQUNoQixNQUFNLEVBQUUsR0FBRztJQUVYLEtBQUssRUFBRTtRQUNMO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsMEJBQTBCO1lBQ2hDLElBQUksRUFBRTs7O3FFQUd5RDtTQUNoRTtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSx3QkFBd0I7WUFDOUIsSUFBSSxFQUFFO3dEQUM0QztTQUNuRDtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsbUNBQW1DO1lBQ3pDLElBQUksRUFBRTs7Ozs7O3dEQU00QztTQUNuRDtLQUNGO0NBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RmxhZ1NlY3Rpb259IGZyb20gJy4vZmxhZy5qcyc7XG5cbmV4cG9ydCBjb25zdCBXT1JMRF9GTEFHUzogRmxhZ1NlY3Rpb24gPSB7XG4gIHNlY3Rpb246ICdXb3JsZCcsXG4gIHByZWZpeDogJ1cnLFxuXG4gIGZsYWdzOiBbXG4gICAge1xuICAgICAgZmxhZzogJ1d0JyxcbiAgICAgIG5hbWU6ICdSYW5kb21pemUgdHJhZGUtaW4gaXRlbXMnLFxuICAgICAgdGV4dDogYEl0ZW1zIGV4cGVjdGVkIGJ5IHZhcmlvdXMgTlBDcyB3aWxsIGJlIHNodWZmbGVkOiBzcGVjaWZpY2FsbHksXG4gICAgICAgICAgICAgU3RhdHVlIG9mIE9ueXgsIEtpcmlzYSBQbGFudCwgTG92ZSBQZW5kYW50LCBJdm9yeSBTdGF0dWUsIEZvZ1xuICAgICAgICAgICAgIExhbXAsIGFuZCBGbHV0ZSBvZiBMaW1lIChmb3IgQWthaGFuYSkuICBSYWdlIHdpbGwgZXhwZWN0IGFcbiAgICAgICAgICAgICByYW5kb20gc3dvcmQsIGFuZCBUb3JuZWwgd2lsbCBleHBlY3QgYSByYW5kb20gYnJhY2VsZXQuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdXdScsXG4gICAgICBoYXJkOiB0cnVlLFxuICAgICAgbmFtZTogJ1VuaWRlbnRpZmllZCBrZXkgaXRlbXMnLFxuICAgICAgdGV4dDogYEl0ZW0gbmFtZXMgd2lsbCBiZSBnZW5lcmljIGFuZCBlZmZlY3RzIHdpbGwgYmUgc2h1ZmZsZWQuICBUaGlzXG4gICAgICAgICAgICAgaW5jbHVkZXMga2V5cywgZmx1dGVzLCBsYW1wcywgYW5kIHN0YXR1ZXMuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdXdycsXG4gICAgICBuYW1lOiAnUmFuZG9taXplIGVsZW1lbnRzIHRvIGJyZWFrIHdhbGxzJyxcbiAgICAgIHRleHQ6IGBXYWxscyB3aWxsIHJlcXVpcmUgYSByYW5kb21pemVkIGVsZW1lbnQgdG8gYnJlYWsuICBOb3JtYWwgcm9jayBhbmRcbiAgICAgICAgICAgICBpY2Ugd2FsbHMgd2lsbCBpbmRpY2F0ZSB0aGUgcmVxdWlyZWQgZWxlbWVudCBieSB0aGUgY29sb3IgKGxpZ2h0XG4gICAgICAgICAgICAgZ3JleSBvciB5ZWxsb3cgZm9yIHdpbmQsIGJsdWUgZm9yIGZpcmUsIGJyaWdodCBvcmFuZ2UgKFwiZW1iZXJzXCIpIGZvclxuICAgICAgICAgICAgIHdhdGVyLCBvciBkYXJrIGdyZXkgKFwic3RlZWxcIikgZm9yIHRodW5kZXIuICBUaGUgZWxlbWVudCB0byBicmVha1xuICAgICAgICAgICAgIHRoZXNlIHdhbGxzIGlzIHRoZSBzYW1lIHRocm91Z2hvdXQgYW4gYXJlYS4gIElyb24gd2FsbHMgcmVxdWlyZSBhXG4gICAgICAgICAgICAgb25lLW9mZiByYW5kb20gZWxlbWVudCwgd2l0aCBubyB2aXN1YWwgY3VlLCBhbmQgdHdvIHdhbGxzIGluIHRoZVxuICAgICAgICAgICAgIHNhbWUgYXJlYSBtYXkgaGF2ZSBkaWZmZXJlbnQgcmVxdWlyZW1lbnRzLmAsXG4gICAgfVxuICBdLFxufTtcbiJdfQ==