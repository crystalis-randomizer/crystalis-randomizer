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

pages="index.html check.html track.html help.html"
subdirs="js css images"

# Clone the existing gh-pages repo
git clone --depth=1 -b gh-pages "git@github.com:$GITHUB_REPOSITORY" deploy

# At this point we have $dir, $status, and $label.  Start copying to the dir.

# Just pull favicon straight from master...?
if [ "$GITHUB_REF" = refs/heads/master ]; then
  cp dist/favicon.ico "deploy/"
fi

# If the branch exists, wipe it out.
if [ -d "deploy/$dir" ]; then
  rm -rf "deploy/$dir"
fi

# Make directories and copy the relevant files.
mkdir -p "deploy/$dir/view"
mkdir -p "deploy/$dir/js/view"
mkdir -p "deploy/$dir/css/view"
mkdir -p "deploy/$dir/images/spritesheets"
cp dist/js/*.js "deploy/$dir/js/"
cp dist/css/*.css "deploy/$dir/css/"
cp dist/css/view/*.css "deploy/$dir/css/view/"
cp dist/images/*.png "deploy/$dir/images/"
cp dist/images/spritesheets/*.nss "deploy/$dir/images/spritesheets/"

# Prepend the analytics tag to each .html file.
for a in dist/*.html dist/view/*.html; do
  cat dist/ga.tag ${a} >| "deploy/$dir/${a#dist/}"
done

# Also make the minimum necessary dirs for permalinks
sha=sha/$commit
mkdir -p "deploy/$sha/js"
mkdir -p "deploy/$sha/css"
echo '<script>var CR_PERMALINK = true;</script>' > deploy/$sha/index.html
echo '<script type="module">document.body.classList.add("permalink")</script>' \
     > deploy/$sha/help.html
cat deploy/$dir/index.html >> deploy/$sha/index.html
cat deploy/$dir/help.html >> deploy/$sha/help.html
cp deploy/$dir/js/main.js deploy/$sha/js/
cp deploy/$dir/js/build_info.js deploy/$sha/js/
cp deploy/$dir/js/chunk-*.js deploy/$sha/js/
cp deploy/$dir/css/main.css deploy/$sha/css/main.css
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
  npm publish
fi
