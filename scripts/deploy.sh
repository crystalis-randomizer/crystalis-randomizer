#!/bin/sh

set -ex

# Does slightly different things based on what branch
# was just tested.  Assumes a valid ssh-agent for pushing.

pages="index.html check.html track.html help.html"
subdirs="js css images"

# Clone the existing gh-pages repo
git clone --depth=1 -b gh-pages "git@github.com:$TRAVIS_REPO_SLUG" deploy

# At this point we have $dir, $status, and $label.  Start copying to the dir.

# Just pull favicon straight from master...?
if [ "$TRAVIS_BRANCH" = master ]; then
  cp src/favicon.ico "deploy/"
fi

# If the branch exists, wipe it out.
if [ -d "deploy/$dir" ]; then
  rm -rf "deploy/$dir"
fi

# Make directories and copy the relevant files.
mkdir -p "deploy/$dir/view"
mkdir -p "deploy/$dir/css/view"
mkdir -p "deploy/$dir/js/view"
mkdir -p "deploy/$dir/images"

cp src/js/view/*.js "deploy/$dir/js/view/"
cp src/js/*.js "deploy/$dir/js/"
cp src/js/*.s "deploy/$dir/js/"
cp src/css/*.css "deploy/$dir/css/"
cp src/css/view/*.css "deploy/$dir/css/view/"
cp src/images/* "deploy/$dir/images/"
# Clobber the *.min.js files.
cp dist/*.js "deploy/$dir/js/"
# Prepend the analytics tag to each .html file.
for a in src/*.html src/view/*.html; do
  cat src/ga.tag ${a} >| "deploy/$dir/${a#src/}"
done

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
  # Do an NPM release - first update package.json
  sed -i '3 s/0\.0\.0/'"$dir"'/' package.json
  npm publish
fi

if $link_current; then
  for a in $pages $subdirs; do
    rm -f deploy/$a
    ln -s "$dir/$a" deploy/$a
  done
fi

cd deploy
git add .
git commit -m "Release $dir"
git push origin gh-pages
