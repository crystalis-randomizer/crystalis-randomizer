import {Rom} from '../rom.js';

export function writeLocationsFromMeta(rom: Rom) {
  const {locations} = rom;
  const {CordelPlainEast, CordelPlainWest,
         WaterfallValleyNorth, WaterfallValleySouth} = locations;

  // First sync up Cordel's exits.
  CordelPlainEast.meta.reconcileExits(CordelPlainWest.meta);

  // Copy the non-empty screens between the Waterfall Valley pair.  Without
  // this, everything on the other side of the seam is filled in as mountains,
  // which causes very minor graphical artifacts when walking south through
  // the pass.
  for (const pos of WaterfallValleyNorth.meta.allPos()) {
    const north = WaterfallValleyNorth.meta.get(pos);
    const south = WaterfallValleySouth.meta.get(pos);
    if (north.isEmpty() && !south.isEmpty()) {
      WaterfallValleyNorth.meta.set(pos, south);
    } else if (south.isEmpty() && !north.isEmpty()) {
      WaterfallValleySouth.meta.set(pos, north);
    }
  }

  // Now do the actual copy.  Start by wiping out all the entrances and exits.
  // This needs to be done as a separate pass
  for (const loc of locations) {
    if (!loc.used) continue;
    loc.exits = [];
    loc.entrances = [];
  }
  // Then write each one.
  for (const loc of locations) {
    if (!loc.used) continue;
    loc.meta.write();
  }
}
