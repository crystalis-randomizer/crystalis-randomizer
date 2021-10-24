#!/bin/sh

# Link all files in src/ to dist/ so that we can serve out of there.

if [ ! -d src ]; then
  echo "Must run link.sh from repository root."
fi

rm -rf dist/ tsconfig.tsbuildinfo

copy=false
if [ "$1" = "--copy" ]; then
  copy=true
fi

if [ -d .git/hooks ]; then
  rm -f .git/hooks/pre-{commit,push}
  ln -s ../../scripts/pre-commit .git/hooks/pre-commit
  ln -s ../../scripts/pre-push .git/hooks/pre-push
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
  # CLI files need to be executable, but typescript won't preserve that
  touch dist/js/cli.js
  chmod +x dist/js/cli.js
fi
