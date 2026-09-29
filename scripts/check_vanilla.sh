#!/bin/sh

# Assumes Crystalis.nes (pass argument for other name)

rom=${1:-Crystalis.nes}
js65=node_modules/.bin/js65

mkdir -p target/vanilla
$js65 rehydrate -r "$rom" vanilla/crystalis.s > target/vanilla/crystalis.s || exit 1
$js65 --no-lint --no-debuginfo -o target/vanilla/reassembled.bin \
      target/vanilla/crystalis.s || exit 1
xxd target/vanilla/reassembled.bin > target/vanilla/reassembled.prg
xxd -o -16 "$rom" | sed 1d | head -16384 > target/vanilla/original.prg

git diff --no-index --word-diff \
    target/vanilla/original.prg target/vanilla/reassembled.prg \
  && echo OK >& 2
