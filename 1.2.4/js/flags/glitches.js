export const GLITCH_FLAGS = {
    section: 'Glitches',
    prefix: 'G',
    text: `The routing logic can be made aware of the following
      glitches.  If selected, it will assume that the glitch can be
      performed when verifying that a game is winnable.  Enabling
      these glitches tends to increase the randomness of the shuffle,
      since there are more valid options.`,
    flags: [
        {
            flag: 'Gc',
            hard: true,
            name: 'Sword charge glitch may be required',
            text: `Progression may require using the sword charge glitch to destroy walls or
           form bridges without actually possessing the correct orb.`,
            conflict: /Fc/
        },
        {
            flag: 'Gf',
            name: 'Ghetto flight may be required',
            text: `Progression may require using Rabbit Boots and the dolphin to reach Swan
           before the Angry Sea can be calmed and before Flight is available.`,
        },
        {
            flag: 'Gp',
            name: 'Teleport skip may be required',
            text: `Progression may require entering Mt. Sabre North from Cordel Plain
           without the Teleport spell (flying over the river to avoid the
           trigger).`,
            conflict: /Fp/
        },
        {
            flag: 'Gr',
            name: 'Rabbit skip may be required',
            text: `Progression may require entering Mt. Sabre North from Cordel Plain
           without talking to the rabbit in Leaf after the abduction.`,
            conflict: /Fr/
        },
        {
            flag: 'Gt',
            name: 'Statue glitch may be required',
            text: `Progression may require glitching past guards without Change or Paralysis,
           or people turned to stone without a Flute of Lime.  The logic ensures that 
           using the Flute of Lime on the two statues will not break the game since
           it can be used twice.`,
            conflict: /Ft/
        },
        {
            flag: 'Gw',
            hard: true,
            name: 'Wild warp may be required',
            text: `Progression may require using "wild warp" (holding A and B on controller 1
           and tapping A on controller 2) to travel to parts of the game that would
           otherwise be unreachable.`,
            conflict: /Fw/
        }
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xpdGNoZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvZmxhZ3MvZ2xpdGNoZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFnQjtJQUN2QyxPQUFPLEVBQUUsVUFBVTtJQUNuQixNQUFNLEVBQUUsR0FBRztJQUNYLElBQUksRUFBRTs7OzswQ0FJa0M7SUFFeEMsS0FBSyxFQUFFO1FBQ0w7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLHFDQUFxQztZQUMzQyxJQUFJLEVBQ0E7cUVBQzJEO1lBQy9ELFFBQVEsRUFBRSxJQUFJO1NBQ2Y7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLCtCQUErQjtZQUNyQyxJQUFJLEVBQ0E7OEVBQ29FO1NBQ3pFO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSwrQkFBK0I7WUFDckMsSUFBSSxFQUFFOztxQkFFUztZQUNmLFFBQVEsRUFBRSxJQUFJO1NBQ2Y7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLDZCQUE2QjtZQUNuQyxJQUFJLEVBQUU7c0VBQzBEO1lBQ2hFLFFBQVEsRUFBRSxJQUFJO1NBQ2Y7UUFDRDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLCtCQUErQjtZQUNyQyxJQUFJLEVBQ0E7OztpQ0FHdUI7WUFDM0IsUUFBUSxFQUFFLElBQUk7U0FDZjtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSwyQkFBMkI7WUFDakMsSUFBSSxFQUNBOztxQ0FFMkI7WUFDL0IsUUFBUSxFQUFFLElBQUk7U0FDZjtLQUNGO0NBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RmxhZ1NlY3Rpb259IGZyb20gJy4vZmxhZy5qcyc7XG5cbmV4cG9ydCBjb25zdCBHTElUQ0hfRkxBR1M6IEZsYWdTZWN0aW9uID0ge1xuICBzZWN0aW9uOiAnR2xpdGNoZXMnLFxuICBwcmVmaXg6ICdHJyxcbiAgdGV4dDogYFRoZSByb3V0aW5nIGxvZ2ljIGNhbiBiZSBtYWRlIGF3YXJlIG9mIHRoZSBmb2xsb3dpbmdcbiAgICAgIGdsaXRjaGVzLiAgSWYgc2VsZWN0ZWQsIGl0IHdpbGwgYXNzdW1lIHRoYXQgdGhlIGdsaXRjaCBjYW4gYmVcbiAgICAgIHBlcmZvcm1lZCB3aGVuIHZlcmlmeWluZyB0aGF0IGEgZ2FtZSBpcyB3aW5uYWJsZS4gIEVuYWJsaW5nXG4gICAgICB0aGVzZSBnbGl0Y2hlcyB0ZW5kcyB0byBpbmNyZWFzZSB0aGUgcmFuZG9tbmVzcyBvZiB0aGUgc2h1ZmZsZSxcbiAgICAgIHNpbmNlIHRoZXJlIGFyZSBtb3JlIHZhbGlkIG9wdGlvbnMuYCxcblxuICBmbGFnczogW1xuICAgIHtcbiAgICAgIGZsYWc6ICdHYycsXG4gICAgICBoYXJkOiB0cnVlLFxuICAgICAgbmFtZTogJ1N3b3JkIGNoYXJnZSBnbGl0Y2ggbWF5IGJlIHJlcXVpcmVkJyxcbiAgICAgIHRleHQ6XG4gICAgICAgICAgYFByb2dyZXNzaW9uIG1heSByZXF1aXJlIHVzaW5nIHRoZSBzd29yZCBjaGFyZ2UgZ2xpdGNoIHRvIGRlc3Ryb3kgd2FsbHMgb3JcbiAgICAgICAgICAgZm9ybSBicmlkZ2VzIHdpdGhvdXQgYWN0dWFsbHkgcG9zc2Vzc2luZyB0aGUgY29ycmVjdCBvcmIuYCxcbiAgICAgIGNvbmZsaWN0OiAvRmMvXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnR2YnLFxuICAgICAgbmFtZTogJ0doZXR0byBmbGlnaHQgbWF5IGJlIHJlcXVpcmVkJyxcbiAgICAgIHRleHQ6XG4gICAgICAgICAgYFByb2dyZXNzaW9uIG1heSByZXF1aXJlIHVzaW5nIFJhYmJpdCBCb290cyBhbmQgdGhlIGRvbHBoaW4gdG8gcmVhY2ggU3dhblxuICAgICAgICAgICBiZWZvcmUgdGhlIEFuZ3J5IFNlYSBjYW4gYmUgY2FsbWVkIGFuZCBiZWZvcmUgRmxpZ2h0IGlzIGF2YWlsYWJsZS5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ0dwJyxcbiAgICAgIG5hbWU6ICdUZWxlcG9ydCBza2lwIG1heSBiZSByZXF1aXJlZCcsXG4gICAgICB0ZXh0OiBgUHJvZ3Jlc3Npb24gbWF5IHJlcXVpcmUgZW50ZXJpbmcgTXQuIFNhYnJlIE5vcnRoIGZyb20gQ29yZGVsIFBsYWluXG4gICAgICAgICAgIHdpdGhvdXQgdGhlIFRlbGVwb3J0IHNwZWxsIChmbHlpbmcgb3ZlciB0aGUgcml2ZXIgdG8gYXZvaWQgdGhlXG4gICAgICAgICAgIHRyaWdnZXIpLmAsXG4gICAgICBjb25mbGljdDogL0ZwL1xuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ0dyJyxcbiAgICAgIG5hbWU6ICdSYWJiaXQgc2tpcCBtYXkgYmUgcmVxdWlyZWQnLFxuICAgICAgdGV4dDogYFByb2dyZXNzaW9uIG1heSByZXF1aXJlIGVudGVyaW5nIE10LiBTYWJyZSBOb3J0aCBmcm9tIENvcmRlbCBQbGFpblxuICAgICAgICAgICB3aXRob3V0IHRhbGtpbmcgdG8gdGhlIHJhYmJpdCBpbiBMZWFmIGFmdGVyIHRoZSBhYmR1Y3Rpb24uYCxcbiAgICAgIGNvbmZsaWN0OiAvRnIvXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnR3QnLFxuICAgICAgbmFtZTogJ1N0YXR1ZSBnbGl0Y2ggbWF5IGJlIHJlcXVpcmVkJyxcbiAgICAgIHRleHQ6XG4gICAgICAgICAgYFByb2dyZXNzaW9uIG1heSByZXF1aXJlIGdsaXRjaGluZyBwYXN0IGd1YXJkcyB3aXRob3V0IENoYW5nZSBvciBQYXJhbHlzaXMsXG4gICAgICAgICAgIG9yIHBlb3BsZSB0dXJuZWQgdG8gc3RvbmUgd2l0aG91dCBhIEZsdXRlIG9mIExpbWUuICBUaGUgbG9naWMgZW5zdXJlcyB0aGF0IFxuICAgICAgICAgICB1c2luZyB0aGUgRmx1dGUgb2YgTGltZSBvbiB0aGUgdHdvIHN0YXR1ZXMgd2lsbCBub3QgYnJlYWsgdGhlIGdhbWUgc2luY2VcbiAgICAgICAgICAgaXQgY2FuIGJlIHVzZWQgdHdpY2UuYCxcbiAgICAgIGNvbmZsaWN0OiAvRnQvXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnR3cnLFxuICAgICAgaGFyZDogdHJ1ZSxcbiAgICAgIG5hbWU6ICdXaWxkIHdhcnAgbWF5IGJlIHJlcXVpcmVkJyxcbiAgICAgIHRleHQ6XG4gICAgICAgICAgYFByb2dyZXNzaW9uIG1heSByZXF1aXJlIHVzaW5nIFwid2lsZCB3YXJwXCIgKGhvbGRpbmcgQSBhbmQgQiBvbiBjb250cm9sbGVyIDFcbiAgICAgICAgICAgYW5kIHRhcHBpbmcgQSBvbiBjb250cm9sbGVyIDIpIHRvIHRyYXZlbCB0byBwYXJ0cyBvZiB0aGUgZ2FtZSB0aGF0IHdvdWxkXG4gICAgICAgICAgIG90aGVyd2lzZSBiZSB1bnJlYWNoYWJsZS5gLFxuICAgICAgY29uZmxpY3Q6IC9Gdy9cbiAgICB9XG4gIF0sXG59O1xuIl19