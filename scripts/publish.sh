#!/bin/sh

# Publish to github-pages

# Start by checking out the repo in a subdirectory

TMP=$(mktemp -d)
(
  cd $TMP
  git clone --depth=1 git@github.com:shicks/crystalis-randomizer r -b gh-pages
  cd r
  rm *.js *.html view/*
  mkdir -p view
)
(
  cd src
  cp *.js $TMP/
  cp view/*.js $TMP/view/
  # TODO - add a datestamp or commit stamp into the HTML somehow
  #      - maybe use sed to replace a placeholder?
  for a in *.html; do
    cat ga.tag $a >| $TMP/$a
  done
  for a in view/*.html; do
    cat ga.tag $a >| $TMP/view/$a
  done
)
(
  cd $TMP/r
  git add .
  git commit -am "Publish: $(date)"
  git push origin gh-pages
  cd ../..
  rm -rf $TMP
)
