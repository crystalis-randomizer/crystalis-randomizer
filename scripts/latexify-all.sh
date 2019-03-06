#!/bin/sh

for a in theory/*.md; do
  node scripts/latexify < $a >| ${a%.md}.ipynb
done
