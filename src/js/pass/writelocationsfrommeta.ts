import {Rom} from '../rom';

export function writeLocationsFromMeta(rom: Rom) {
  const {locations} = rom;
  const {CordelPlainEast, CordelPlainWest,
         WaterfallValleyNorth, WaterfallValleySouth,
         MezameShrine, MtSabreWest_Cave1} = locations;

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
    loc.meta.writeEntrance0();
  }
  // Need to make sure Mezame entrance 1 exists, since (unless no-bow mode is
  // on) nothing actually leads to it.
  if (!MezameShrine.meta.getExit(0, 'door')) {
    MezameShrine.meta.attach(0, MezameShrine.meta, 0, 'door', 'door');
  }
  // Then write each one.
  for (const loc of locations) {
    if (!loc.used) continue;
    // NOTE: the entrance order for Mt Sabre W Lower is changed because
    // the back of Zebu Cave (Sabre W Cave 1) is written before Cordel W.
    // To help get the entrances back in the right order, we do a quick
    // special case to defer writing the zebu cave read until after cordel.
    if (loc === MtSabreWest_Cave1) continue;
    loc.meta.write();
    if (loc === CordelPlainWest && MtSabreWest_Cave1.used) {
      MtSabreWest_Cave1.meta.write();
    }
  }
}
