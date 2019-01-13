#!/bin/sh

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
(
  cd "$TMP"
  git clone --depth=1 git@github.com:shicks/crystalis-randomizer r -b gh-pages
  cd r
  mkdir -p "$HASH/view"
)
(
  cp -f notes/depgraph.svg "$TMP/r/"
  cp -f notes/locations.svg "$TMP/r/"
  cp -f notes/traversal.txt "$TMP/r/"
  cd src
  cp *.js *.css "$DIR"
  cp view/*.js view/*.css "$DIR/view/"
  # TODO - add a datestamp or commit stamp into the HTML somehow
  #      - maybe use sed to replace a placeholder?
  for a in *.html view/*.html; do
    cat ga.tag $a >| "$DIR/$a"
  done
  sed -e "/BUILD_HASH/ s/latest/$HASH/" -e "/BUILD_DATE/ s/current/$DATE/" \
      patch.js >| "$DIR/patch.js"
  echo "<a href=\"$HASH/\">$HASH: $DATE</a><br>" >> "$TMP/r/versions.html"
  sed "s,main.js,$HASH/main.js,g" index.html >| "$TMP/r/index.html"
)
(
  cd $TMP/r
  git add .
  git commit -am "Publish: $(date)"
  git push origin gh-pages
  cd ../..
  rm -rf $TMP
)
