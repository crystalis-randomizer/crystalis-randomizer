import { Rom } from "../rom";

// Speed tables

// Reads either old or new version
// Translates from SPD number to actual pixels/step

// We can get by with a single byte per dir*spd.
// Speeds:
//  0 - 0.5
//  1 - 0.75
//  2 - 1
//  3 - 1.25
//  4 - 1.5
//  5 - 1.75
//  6 - 2
//  7 - 2.5
//  8 - 3
//  9 - 3.5
// 10 - 4
// 11 - 4.5
// 12 - 5
// 13 - 6.5
// 14 - 7
// 15 - 8

// We can only reasonably store 16 speeds because of how knockback works.
//  - this layout includes all the vanilla speeds

// Storage:
//  - only store rising edge of sin curve
//  - store 4 bytes per dir*speed -> one nibble per frame
//  - always positive for rising edge, no need to store sign

export class Speeds {

  constructor(readonly rom: Rom) {

  }

}

// We can fit 16 tables here.  The table is needed because in vanilla they're
// variable size.  It's oddly stored as low-byte in one 16-item table and
// high byte in the second.  If we can cram the whole table into 256 bytes
// (16 speeds, 16 dirs) then we don't even need that indirection.  But then
// we lose possibility of 32-dir.
const ADDRESS_TABLE = 0x344bc;

const [] = [ADDRESS_TABLE];

// What these tables actually have is a number in 8ths.  We can
// store this as a single byte: high nibble is the whole part,
// low nibble is the fraction.  Then a single 8-byte table stores
// the distribution of 1s and 0s:
//   0: 00000000
//   1: 00000001
//   2: 00010001
//   3: 01010010
//   4: 01010101
//   5: 01101010
//   6: 11101110
//   7: 11111110
// We could even splurge and use 64 bytes for this to speed it up
// Now we only need 1 byte for every four spd*dir... and we can
// fit 64 dirs into a single page!
// We could also use an extra bit of the $480,x step counter for higher
// resolution on the angles and only cost 8 (64) more bytes
//
//   0: 00000000 00000000 = 00 00
//   1: 00000000 00000001 = 00 01
//   2: 00000001 00000001 = 01 01
//   3: 00001000 01000001 = 08 41
//   4: 00010001 00010001 = 11 11
//   5: 00100100 01001001 = 24 49
//   6: 01001001 01001001 = 49 49
//   7: 01010010 10101001 = 52 a9
//   8: 01010101 01010101 = 55 55
// These are just the complement of 16-N:
//   9: 10101101 01010110 = ad 56
//  10: 10110110 10110110 = b6 b6
//  11: 11011011 10110110 = 9b b6
//  12: 11101110 11101110 = ee ee
//  13: 11110111 10111110 = f7 ce
//  14: 11111110 11111110 = fe fe
//  15: 11111111 11111110 = ff fe

// Then we just store floor(16*s*cos(t*pi/32)) for t=0..15, values of s

// Problems with more directions: anyting that can be knocked back needs
// the high nibble of $360,x to store the knockback direction...
//   - so use $340,x:70 to indicate high-res direction?
//     -> no go for flyers...
//   - need a mode for 16 directions and a mode for 64...???
// In the 16-direction case, $360,x:80 would never be nonzero, so use that.
// 64-direction objects won't be knocked back, so check $340,x:c0 == #$40
//   as a clear indication that it's 64-direction

// $355d7 checks for 16-dir mode on player hit: need to update to check
//   the right things instead.

// unclear what we can even do with more directions -
//   the DisplacementToDirectionTable only as one nibble for it anyway
//  -> use the same trig identities to store low nibble only
//     update 34458 to read from a single 256-byte table, then add in
//     the 10 or 20 bits as appropriate, then shift the two low bits into A.

// Speed table:
//   spd .5   angle 0: 10101010
//            angle 4: 10100100
//   spd .75  angle 0: 11101110
//            angle 4: 01010101
//   spd 1.0  angle 0: 11111111
//            angle 4: 11101110
//   spd 1.25 angle 0: 11121112
//            angle 4: 11111110
//   spd 1.5  angle 0: 21212121
//            angle 4: 11111112
//   spd 1.75 angle 0: 22222222
//            angle 4: 21212121
