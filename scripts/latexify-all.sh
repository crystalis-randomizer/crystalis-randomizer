#!/bin/sh

for a in theory/*.md; do
  bun scripts/latexify < $a >| ${a%.md}.ipynb
done
