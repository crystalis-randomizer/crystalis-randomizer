#!/bin/sh

# Usage: dedupe.sh SOURCE TARGET
# Dedupes all files in the given source directory by making symlinks to
# sha-hashed files in the given target directory.

relpath() {
  local source=$(cd $1; pwd)
  local target=$(cd $2; pwd)

  local common=$source
  local back=
  while [ "${target#$common}" = "${target}" ]; do
    common=$(dirname $common)
    back="../${back}"
  done

  echo ${back}${target#$common/}
}

if [ ! -d "$1" -o ! -d "$2" ]; then
  echo "Not a directory ($1) or ($2)" >&2
  exit 1
fi

from=$(cd $1; pwd)
to=$(cd $2; pwd)

find "$from" -type f |
while read file; do
  sha=$(shasum "$file" | cut -d\  -f1)
  prefix=$(echo "$sha" | head -c2)
  sha="$prefix/$(echo "$sha" | tail -c +3)"
  dir=$(dirname "$file")
  mkdir -p "$to/$prefix"
  cp "$file" "$to/$sha"
  rm "$file"
  ln -s "$(relpath "$dir" "$to")/$sha" "$file"
done

echo "$(basename "$from") -- $(date)" >> "$to/manifest"
