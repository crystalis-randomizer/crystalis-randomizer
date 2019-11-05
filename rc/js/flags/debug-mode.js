export const DEBUG_MODE_FLAGS = {
    section: 'Debug Mode',
    prefix: 'D',
    text: `These options are helpful for exploring or debugging.  Note that,
      while they do not directly affect any randomization, they
      <i>do</i> factor into the seed to prevent cheating, and they
      will remove the option to generate a seed for racing.`,
    flags: [
        {
            flag: 'Ds',
            name: 'Generate a spoiler log',
            text: `Note: <b>this will change the placement of items</b> compared to a
      seed generated without this flag turned on.`
        },
        {
            flag: 'Dt',
            name: 'Trainer mode',
            text: `Installs a trainer for practicing certain parts of the game.
      At the start of the game, the player will have all swords, basic armors
      and shields, all worn items and magics, a selection of consumables,
      bow of truth, maximum cash, all warp points activated, and the Shyron
      massacre will have been triggered.  Wild warp is reconfigured to provide
      easy access to all bosses.  Additionally, the following button
      combinations are recognized:<ul>
       <li>Start+Up: increase player level
       <li>Start+Down: increase scaling level
       <li>Start+Left: get all balls
       <li>Start+Right: get all bracelets
       <li>Start+B+Down: get a full set of consumable items
       <li>Start+B+Left: get all advanced armors
       <li>Start+B+Right: get all advanced shields
      </ul>`,
        },
        {
            flag: 'Di',
            name: 'Player never dies',
        },
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWctbW9kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9mbGFncy9kZWJ1Zy1tb2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFnQjtJQUMzQyxPQUFPLEVBQUUsWUFBWTtJQUNyQixNQUFNLEVBQUUsR0FBRztJQUNYLElBQUksRUFBRTs7OzREQUdvRDtJQUUxRCxLQUFLLEVBQUU7UUFDTDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLHdCQUF3QjtZQUM5QixJQUFJLEVBQUU7a0RBQ3NDO1NBQzdDO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxjQUFjO1lBQ3BCLElBQUksRUFBRTs7Ozs7Ozs7Ozs7Ozs7WUFjQTtTQUNQO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxtQkFBbUI7U0FDMUI7S0FDRjtDQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0ZsYWdTZWN0aW9ufSBmcm9tICcuL2ZsYWcuanMnO1xuXG5leHBvcnQgY29uc3QgREVCVUdfTU9ERV9GTEFHUzogRmxhZ1NlY3Rpb24gPSB7XG4gIHNlY3Rpb246ICdEZWJ1ZyBNb2RlJyxcbiAgcHJlZml4OiAnRCcsXG4gIHRleHQ6IGBUaGVzZSBvcHRpb25zIGFyZSBoZWxwZnVsIGZvciBleHBsb3Jpbmcgb3IgZGVidWdnaW5nLiAgTm90ZSB0aGF0LFxuICAgICAgd2hpbGUgdGhleSBkbyBub3QgZGlyZWN0bHkgYWZmZWN0IGFueSByYW5kb21pemF0aW9uLCB0aGV5XG4gICAgICA8aT5kbzwvaT4gZmFjdG9yIGludG8gdGhlIHNlZWQgdG8gcHJldmVudCBjaGVhdGluZywgYW5kIHRoZXlcbiAgICAgIHdpbGwgcmVtb3ZlIHRoZSBvcHRpb24gdG8gZ2VuZXJhdGUgYSBzZWVkIGZvciByYWNpbmcuYCxcblxuICBmbGFnczogW1xuICAgIHtcbiAgICAgIGZsYWc6ICdEcycsXG4gICAgICBuYW1lOiAnR2VuZXJhdGUgYSBzcG9pbGVyIGxvZycsXG4gICAgICB0ZXh0OiBgTm90ZTogPGI+dGhpcyB3aWxsIGNoYW5nZSB0aGUgcGxhY2VtZW50IG9mIGl0ZW1zPC9iPiBjb21wYXJlZCB0byBhXG4gICAgICBzZWVkIGdlbmVyYXRlZCB3aXRob3V0IHRoaXMgZmxhZyB0dXJuZWQgb24uYFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ0R0JyxcbiAgICAgIG5hbWU6ICdUcmFpbmVyIG1vZGUnLFxuICAgICAgdGV4dDogYEluc3RhbGxzIGEgdHJhaW5lciBmb3IgcHJhY3RpY2luZyBjZXJ0YWluIHBhcnRzIG9mIHRoZSBnYW1lLlxuICAgICAgQXQgdGhlIHN0YXJ0IG9mIHRoZSBnYW1lLCB0aGUgcGxheWVyIHdpbGwgaGF2ZSBhbGwgc3dvcmRzLCBiYXNpYyBhcm1vcnNcbiAgICAgIGFuZCBzaGllbGRzLCBhbGwgd29ybiBpdGVtcyBhbmQgbWFnaWNzLCBhIHNlbGVjdGlvbiBvZiBjb25zdW1hYmxlcyxcbiAgICAgIGJvdyBvZiB0cnV0aCwgbWF4aW11bSBjYXNoLCBhbGwgd2FycCBwb2ludHMgYWN0aXZhdGVkLCBhbmQgdGhlIFNoeXJvblxuICAgICAgbWFzc2FjcmUgd2lsbCBoYXZlIGJlZW4gdHJpZ2dlcmVkLiAgV2lsZCB3YXJwIGlzIHJlY29uZmlndXJlZCB0byBwcm92aWRlXG4gICAgICBlYXN5IGFjY2VzcyB0byBhbGwgYm9zc2VzLiAgQWRkaXRpb25hbGx5LCB0aGUgZm9sbG93aW5nIGJ1dHRvblxuICAgICAgY29tYmluYXRpb25zIGFyZSByZWNvZ25pemVkOjx1bD5cbiAgICAgICA8bGk+U3RhcnQrVXA6IGluY3JlYXNlIHBsYXllciBsZXZlbFxuICAgICAgIDxsaT5TdGFydCtEb3duOiBpbmNyZWFzZSBzY2FsaW5nIGxldmVsXG4gICAgICAgPGxpPlN0YXJ0K0xlZnQ6IGdldCBhbGwgYmFsbHNcbiAgICAgICA8bGk+U3RhcnQrUmlnaHQ6IGdldCBhbGwgYnJhY2VsZXRzXG4gICAgICAgPGxpPlN0YXJ0K0IrRG93bjogZ2V0IGEgZnVsbCBzZXQgb2YgY29uc3VtYWJsZSBpdGVtc1xuICAgICAgIDxsaT5TdGFydCtCK0xlZnQ6IGdldCBhbGwgYWR2YW5jZWQgYXJtb3JzXG4gICAgICAgPGxpPlN0YXJ0K0IrUmlnaHQ6IGdldCBhbGwgYWR2YW5jZWQgc2hpZWxkc1xuICAgICAgPC91bD5gLFxuICAgIH0sXG4gICAge1xuICAgICAgZmxhZzogJ0RpJyxcbiAgICAgIG5hbWU6ICdQbGF5ZXIgbmV2ZXIgZGllcycsXG4gICAgfSxcbiAgXSwgIC8vIFRPRE8gLSBxdWljayBpdGVtZ2V0L3RlbGVwb3J0IG9wdGlvbnM/XG59O1xuIl19