Crystalis Graphical Glitch Fix
==============================

Crystalis is known to have some aggravating graphical glitches: primarily, flickering during dialog and also occasionally visible seams between map pages. These are both caused by finicky timing in the IRQ handler, which causes the IRQ latch to occur on different scanlines from one frame to another. This patch adjusts the timing to be further away from the scaline boundary, thus removing the flicker.
