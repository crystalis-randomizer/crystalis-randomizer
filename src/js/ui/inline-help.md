# algorithm

Item placement algorithm.
* Vanilla - no item randomization
* Assumed Fill - items completely random

# check beta

Amount of bias in check ordering. Larger numbers cause deeper checks
to be filled earlier, on average. This makes it less random overall,
but (when coupled with a larger Item Beta), can cause more powerful
items to be buried deeper. It can also cause seeds to be a bit more
linear under some conditions. If one Beta is negative, the powerful
items may be front-loaded instead.

# item beta

Amount of bias in item ordering. Larger numbers cause more powerful
items to be placed earlier on average. This makes it less random
overall, but (when coupled with a larger Check Beta), can cause more
powerful items to be buried deeper. It can also cause seeds to be a
bit more linear under some conditions. If one Beta is negative, the
powerful items may be front-loaded instead.

# check distribution

Extra cost for filling additional checks in the same area. Larger
numbers will cause items to be spread more evenly across all the
available areas.

# mimic placement

Indicates how to place mimics.
* Vanilla - mimics are in the same place as vanilla
* Shuffle - mimics are swapped with all the other (mimic-eligible)
  checks; the number of mimics is preserved
* Random - each (mimic-eligible) chest has a random probability of
  being a mimic; note that this may change the number of mimics, and
  may swap in/out consumables even if consumable placement is not
  Random

# mimic count

Number of mimics in the game (or a target, if Mimic Placement is
Random). Extra/unused mimics will swap with arbitrary consumables.

# mimics with key items

Whether mimics can be shuffled into chests that contain key items
in vanilla.
