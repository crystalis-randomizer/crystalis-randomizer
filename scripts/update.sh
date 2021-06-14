#!/bin/sh

# Usage: scripts/update.sh [--rom=/path/to/rom] [out|in|check]
#   out:
#     Expects Crystalis.s to be non-writable.
#     Reassembles it from the rom.
#   in:
#     Expects Crystalis.s to be writable.
#     Rebuilds the Crystalis.st template file.
#     Does a validity check to ensure it's correct.
#   check:
#     Fails if there's un-checked in changes
# If the rom is not specified, looks at all *.nes files in the current
# directory to find something with the correct crc32.

top=$(git rev-parse --show-toplevel)
source="$top/Crystalis.s"
template="$top/Crystalis.st"
strip="$top/scripts/strip"
rom=
action=

while [ $# -gt 0 ]; do
  case "$1" in
    (--rom)   shift; rom=$1   ;;
    (--rom=*) rom=${1#--rom=} ;;
    (out)     action=out      ;;
    (in)      action=in       ;;
    (check)   action=check    ;;
    (*) echo "Bad option: $1" >& 2; exit 1 ;;
  esac
  shift
done

# Pick a default rom if present
if [ -z "$rom" ]; then
  rom=$(crc32 *.nes | grep ^1bd39032 | head -1)
  rom=$(echo ${rom#1bd39032})
fi

if [ ! -f "$rom" ]; then
  echo "Could not find valid rom image" >& 2
  exit 2
fi

# Now do the action
case "$action" in
  (out)
    if [ -w "$source" ]; then
      echo "$source is already checked out: refusing to overwrite" >& 2
      exit 3
    fi
    chmod +w "$source"
    "$strip" -r "$rom" "$template" >| "$source"
    ;;
  (in)
    if [ ! -e "$source" ]; then
      echo "$source is not checked out: nothing to do" >& 2
      exit 4
    fi
    if ! "$strip" "$source" >| "$template"; then
      echo "Strip failed." >& 2
      exit 5
    fi
    tmp=$(mktemp "$source.check.XXXX")
    if ! "$strip" -r "$rom" "$template" >| "$tmp"; then
      echo "Infuse failed."
      rm -f "$tmp"
      exit 6
    fi
    if ! diff --ignore-space-change -u "$source" "$tmp"; then
      echo "Differences found.  Leaving $(basename "$tmp") for comparison" >& 2
      exit 7
    fi
    rm -f "$tmp"
    chmod -w "$source"
    ;;
  (check)
    tmp=$(mktemp "$source.check.XXXX")
    if ! "$strip" -r "$rom" "$template" >| "$tmp"; then
      echo "Infuse failed."
      rm -f "$tmp"
      exit 8
    fi
    if ! diff --ignore-space-change -u "$source" "$tmp" > /dev/null 2> /dev/null; then
      echo "$source appears to be checked out.
"'Please run `npm run checkin` to ensure consistency.' >& 2
      rm -f "$tmp"
      exit 255
    fi
    rm -f "$tmp"
    chmod -w "$source"
    ;;
  (*)
    echo "No action given" >& 2
    exit 1
    ;;
esac
