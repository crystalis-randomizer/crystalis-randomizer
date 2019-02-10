#!/bin/sh

set -ex

shopt -s nullglob

# Publish to github-pages

# Make sure there are not pending changes
if git diff | grep -q diff; then
  git status >&2
  echo "Refusing to publish with pending changes." >&2
  exit 1
fi

# Start by checking out the repo in a subdirectory
HASH=$(git rev-parse HEAD | head -c 7)
DATE=$(date)
TMP=$(mktemp -d)
DIR="$TMP/r/$HASH"
DEPTH=1
REPLACE=false
FORCE=
if [ "$1" = "--replace" ]; then
  REPLACE=true
  DEPTH=2
  FORCE=-f
fi
(
  cd "$TMP"
  git clone --depth=$DEPTH git@github.com:shicks/crystalis-randomizer r -b gh-pages
  cd r
  if $REPLACE; then
    git reset --hard HEAD^
  fi
  mkdir -p "$HASH/js/view"
  mkdir -p "$HASH/css/view"
  mkdir -p "$HASH/view"
  mkdir -p "$HASH/images"
  mkdir -p "$HASH/track"
)
(
  cp -f notes/depgraph.svg "$TMP/r/"
  cp -f notes/locations.svg "$TMP/r/"
  cp -f notes/traversal.txt "$TMP/r/"
  cp -f src/favicon.ico "$TMP/r/"
  gulp
  cp src/js/*.js "$DIR/js"
  cp src/css/*.css "$DIR/css"
  (
    # clobber some of src
    cd dist
    for a in *.js; do
      cp "$a" "$DIR/${a/.min/}"
    done
  )
  cd src
  cp js/view/*.js "$DIR/js/view/"
  cp css/view/*.css "$DIR/css/view/"
  cp images/* "$DIR/images/"
  # TODO - add a datestamp or commit stamp into the HTML somehow
  #      - maybe use sed to replace a placeholder?
  for a in *.html view/*.html track/*.html; do
    cat ga.tag $a >| "$DIR/$a"
  done

  sed -e "/BUILD_HASH/ s/latest/$HASH/" -e "/BUILD_DATE/ s/current/$DATE/" \
      js/patch.js >| "$DIR/js/patch.js"
  echo "<a href=\"$HASH/\">$HASH: $DATE</a><br>" >> "$TMP/r/versions.html"
  rm -f "$TMP"/r/{index,track,check,help}.html
  ln -s $HASH/{index,track,check,help}.html "$TMP/r/"
)
(
  cd $TMP/r
  rm -f latest stable js css images
  ln -s $HASH latest
  ln -s $HASH stable # TODO - don't mark everything stable!!! - use branch!
  ln -s $HASH/js js
  ln -s $HASH/css css
  ln -s $HASH/images images

  git add .
  git commit -am "Publish: $(date)"
  git push $FORCE origin gh-pages
  cd ../..
  rm -rf $TMP
)
