#!/bin/sh

# Assumes Crystalis.nes (pass argument for other name)

mkdir -p target/vanilla
js65 vanilla/crystalis.s | xxd > target/vanilla/reassembled.prg
xxd -o -16 ${1:-Crystalis.nes} | sed 1d | head -16384 > target/vanilla/original.prg

git diff --no-index --word-diff target/vanilla/{original,reassembled}.prg
