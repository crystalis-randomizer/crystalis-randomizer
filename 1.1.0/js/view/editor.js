// Plans for a complete editor...

// Avoid tons of JS input widgets
// Instead, just use keyboard
//   - arrow keys navigate "selected" screen (e.g.)
//   - [/] to adjust number, {/} for +/-16.
//   - ? to show help dialog w/ all keys
//   - various modes
//     layout editor, screen editor, metatile, effects, (meta)sprites, etc
//     - export/import???  bulk sprite operations?
// Lots of tables might want to edit... may not be practical for GUI?
//   - gold drop editor -> no graphics, just text
//     - maybe build up a form??? save button at bottom to push back?
// probably need a menu of some sort... maybe not all keyboard?

// OR just go old-school... ESC to go back to main menu.
//

// any way to leverage google sheets???
//  - apps script to read/parse sheet, etc?
//  - conditional formatting?
// powerful table tool built in
//  - could use back pages for raw data, but then front page
//    is dynamic with buttons, etc, for interactive edits?
//  - decent headings could go a long way to making the back sheets readable, too.
//
// Locations
// Id  Name  Width  Height  Palette1  Palette2  ...
// 0   Start  1      1       ...
// 1   ...

// Exits
// Id  Name      X   Y   Loc   Entrance
// 0   [copied]  3   42  

// would be slick, but there's just not enough hex suppot to be viable
//  - insert/delete rows/cols is a powerful thing, want it in some tables
//  - freeform editing is nice - selected cell w/ arrow key movements
//    letter/number to change, enter to type in normal field
//  - formulas of less use
// could we get by with some metadata on the table classes, and then
// just expose a simple table editor for each?  but fields...

class Location {
  constructor() {
    this.blah = 1;
    this.width = 3;
    this.height = 2;
    this.screens = [[1,3,4],[5,6,7]];
    this.palettes = [1,2,3];
  }

  static get editor() {
    return /** @lends {Location} */ {
      screens: table('screens', 0, 0),
      palettes: table('palettes', 1, ['0', '1', '2']),
      // ...
      exits: table('exits', 0, ['xm', 'ym', 'loc', 'entrance']), // variable rows
      entrances: table('entrances', 0, ['xl', 'xh', 'yl', 'yh']),
    };
  }
}

// Basic idea would be that we have decent GUI for main bits, but
// all tables are editable with simple/dumb "backside" UI, that
// *does not do any live updates*.

// getting fancier, we could label the columns - e.g. location
//   - then better UI for selection??? links??? is that worth it? maybe no
//   - tooltips, etc?
// if we ever had any nested structures then we'd need a way to edit those.
