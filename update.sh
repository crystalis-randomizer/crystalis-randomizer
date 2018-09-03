#!/bin/sh

# Usage: ./update.sh /path/to/rom

if ! ./strip Crystalis.s >| Crystalis.st; then
  echo Strip faied.
  exit 1
fi

if ! ./strip -r $1 Crystalis.st >| Crystalis.s1; then
  echo Infuse failed.
  exit 1
fi

if git diff Crystalis.s Crystalis.s1; then
  rm -f Crystalis.s1
else
  echo Differences found.
  exit 1
fi
