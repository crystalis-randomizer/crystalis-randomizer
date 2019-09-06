#!/bin/sh

# Link all files in src/ to dist/ so that we can serve out of there.

copy=false
if [ "$1" = "--copy" ]; then
  copy=true
fi

find src -type f | while read src; do
  dist=dist/${src#src/}
  count=$(dirname "$dist")
  ts=${src%.map}
  ts=${ts%.ts}
  ts=${ts%.js}.ts
  if [ -e "$ts" ]; then
    # Don't link js/map files if a ts file exists
    continue
  fi
  # echo "src: $src ; dist: $dist ; count: $count ; ts: $ts"
  rel=$src
  while [ "$count" != "$(dirname "$count")" ]; do
    count=$(dirname "$count")
    rel=../$rel
  done
  mkdir -p "$(dirname "$dist")"
  if $copy; then
    cp "$src" "$dist"
  else
    ln -s "$rel" "$dist"
  fi
done

if ! $copy; then
  for file in main check tracker edit/index; do
    mkdir -p "$(dirname "dist/js/$file")"
    ln -s "$file.js" "dist/js/$file.min.js"
  done
  # Test needs cli to not be a symlink
  rm dist/js/cli.js
  cp src/js/cli.js dist/js/
fi
