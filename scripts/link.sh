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
  rm -f .git/hooks/pre-push
  ln -s ../../scripts/pre-push .git/hooks/pre-push
fi

find src -type f | while read src; do
  case "$src" in
    (*build_info.js) ;; # keep this one...
    (*.ts|*.js|*.map|*#|*.scrap|*.md|*draft-dot-ts) continue ;;
  esac
  dist=dist/${src#src/}
  count=$(dirname "$dist")
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

mkdir -p dist/js

# TODO - make bundles for view/*, handle cli.js
# if ! $copy; then
#   for file in main check tracker edit/index; do
#     mkdir -p "$(dirname "dist/js/$file")"
#     ln -s "$file.js" "dist/js/$file.min.js"
#   done
#   # CLI files need to be executable, but typescript won't preserve that
#   touch dist/js/cli.js
#   chmod +x dist/js/cli.js
# fi
