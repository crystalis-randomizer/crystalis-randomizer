#!/bin/sh

echo "dir=$dir"
echo "status=$status"
echo "label=$label"
echo "commit=$commit"
set -ex

# Bail out if (1) there's a NO_DEPLOY file, or (2) the commit message
# contains "NO_DEPLOY".

if [ -e NO_DEPLOY ]; then
  exit 0
fi
COMMIT_MESSAGE="$(git log -n 1 "$GITHUB_SHA")"
case "$COMMIT_MESSAGE" in
  (*NO_DEPLOY*) exit 0 ;;
esac

# Does slightly different things based on what branch
# was just tested.  Assumes a valid ssh-agent for pushing.

pages="index.html check.html help.html"
subdirs="assets"

# Clone the existing gh-pages repo
git clone --depth=1 -b gh-pages "git@github.com:$GITHUB_REPOSITORY" deploy

# At this point we have $dir, $status, and $label.  Start copying to the dir.

# Just pull favicon straight from master...?
if [ "$GITHUB_REF" = refs/heads/master ]; then
  cp src/favicon.ico "deploy/"
fi

# If the branch exists, wipe it out.
if [ -d "deploy/$dir" ]; then
  # but first, make a note of its hash
  prev=$(grep HASH "deploy/$dir/js/build_info.js" || true)
  prev=${prev#*: \'}
  suffix=${prev#???????}
  prev=${prev%$suffix}
  if [ -d "deploy/sha/$prev" ]; then
    perl -i -pe "print \"  'PREV': '$prev',\n\" if /\\}/;" \
         target/build/build_info.js
  fi
  rm -rf "deploy/$dir"
fi

# Copy the bundled site (pages, plus hashed files under assets/).
cp -r target/web/. "deploy/$dir/"
# Only kept so that the next deploy can find PREV (above).
mkdir -p "deploy/$dir/js"
cp target/build/build_info.js "deploy/$dir/js/"
cat target/build/build_info.js >&2

# Prepend the analytics tag and the build info to each .html file.
for a in target/web/*.html target/web/view/*.html; do
  {
    cat src/ga.tag
    echo '<script>'
    cat target/build/build_info.js
    echo '</script>'
    cat "$a"
  } >| "deploy/$dir/${a#target/web/}"
done

# Also make the minimum necessary dirs for permalinks
sha=sha/$commit
mkdir -p "deploy/$sha"
echo '<script>var CR_PERMALINK = true;</script>' > deploy/$sha/index.html
echo '<script type="module">document.body.classList.add("permalink")</script>' \
     > deploy/$sha/help.html
cat deploy/$dir/index.html >> deploy/$sha/index.html
cat deploy/$dir/help.html >> deploy/$sha/help.html
cp -r deploy/$dir/assets deploy/$sha/
scripts/dedupe.sh deploy/$sha deploy/sha/files

# Link stable and current if necessary.
link_stable=false
link_current=false
case "$status" in
  (stable)
    link_stable=true
    link_current=true
    ;;
  (rc)
    link_current=true
    ;;
esac

if $link_stable; then
  rm -f deploy/stable
  ln -s "$dir" deploy/stable
fi

if $link_current; then
  for a in $pages $subdirs; do
    rm -f deploy/$a
    ln -s "$dir/$a" deploy/$a
  done
fi

(
  cd deploy
  git add .
  git commit -m "Release $label"
  git push origin gh-pages
)

if $link_stable; then
  # Do an NPM release - first update package.json
  rm -rf deploy
  sed -i '3 s/0\.0\.0/'"$dir"'/' package.json
  bun publish
fi
