#!/bin/sh

set -ex

# By default, use testdata, which is a fake rom with mostly random bytes, but
# a few tables whose structure (particularly addresses and delimiters) can be
# parsed in a reasonable way by the rom parser.  The original rom may also be
# passed directly.
file=${1-test/testdata.enc}

# Try all the presets
for preset in $(node src/js/cli.js --list-presets); do
  # Now run the CLI on it.
  node --max-old-space-size=8192 src/js/cli.js --preset=$preset --output=test/test_out --force "$file"

  # Make sure the output has the right size.
  wc -c test/test_out.nes | grep -q 393232
  rm -f test/test_out.nes
done
