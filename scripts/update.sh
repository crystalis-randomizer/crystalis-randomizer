#!/bin/sh

# Usage: scripts/update.sh /path/to/rom

if [ ! -e "$1" ]; then
  echo Usage: scripts/update.sh /path/to/rom.nes
  exit 2
fi

if ! $(dirname $0)/strip Crystalis.s >| Crystalis.st; then
  echo Strip faied.
  exit 1
fi

if ! $(dirname $0)/strip -r $1 Crystalis.st >| Crystalis.s1; then
  echo Infuse failed.
  exit 1
fi

if diff -u Crystalis.s Crystalis.s1; then
  rm -f Crystalis.s1
else
  echo Differences found.
  exit 1
fi
