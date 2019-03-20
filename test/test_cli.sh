#!/bin/sh

set -ex

# Prepares a fake ROM for testing, which contains only the minimal table
# structures that are necessary for the randomizer to not crash (i.e.
# address tables, terminations, etc.)
{
  # Pad the test data on either side, then chop down to the right size
  head -c 81919 /dev/urandom
  cat test/testdata
  head -c 300000 /dev/urandom
} | head -c 393232 > test/test.nes

# Now run the CLI on it.
node src/js/cli.js --output=test/test_out --force test/test.nes

# Make sure the output has the right size.
wc -c test/test_out.nes | grep -q 393232

# Clean up.
rm -f test/test{,_out}.nes
