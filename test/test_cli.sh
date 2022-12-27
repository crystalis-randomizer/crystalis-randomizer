#!/bin/sh

set -ex

cli='node -r source-map-support/register target/debug/bin/cryr'

# Ignore tests if the most recent commit has a message NO_SQ=1
if git log -n 1 | grep -q NO_SQ=1; then exit 0; fi

# By default, use testdata, which is a fake rom with mostly random bytes, but
# a few tables whose structure (particularly addresses and delimiters) can be
# parsed in a reasonable way by the rom parser.  The original rom may also be
# passed directly.
file=${1-test/testdata}

# Try all the presets
for preset in $($cli --list-presets); do
  # Now run the CLI on it.
  $cli --seed=1 --preset=$preset --output=test/test_out --force "$file" || {
    echo "Failed to shuffle: @$preset seed 1" >&2
    exit 1
  }

  # Make sure the output has the right size.
  wc -c test/test_out.nes | grep -q 655376
  rm -f test/test_out.nes
done
