#!/bin/sh

# Usage: scripts/generate_testdata.sh original.nes
#
# Regenerates the test/testdata file by pulling only the necessary
# parts out of the original image.  The remainder of the testdata
# file is just random.

encrypt=false
if [ "$1" = "-e" ]; then encrypt=true; shift; fi

head -c 393232 /dev/urandom > test/testdata
scripts/inject.js "$1" test/testdata +10 \
  0:10000 \
  13300:13f80 \
  14000:17cfa \
  19201:1aba3 \
  1ac00:1be91 \
  1bff0:1c000 \
  1c22f:1c26f \
  1c399:1c439 \
  1c5e0:1e3c0 \
  1f95d:1fa98 \
  1fafe:1fb29 \
  20c1b:21471 \
  21da4:21f9a \
  28000:28466 \
  2868a:28790 \
  28900:2923d \
  29c00:29e80 \
  2a000:2fbd5 \
  34b7f:34c0e \
  34ec5:34f2b \
  35691:3572d \
  357e4:35824 \
  3845c:3bf35 \
  3cbec:3cbfc \
  3e3a2:3e3ab \
  3e779:3e799 \
  367f4 3d18f 3d1f9 3d2af 3d30e 3d337 3d655 3d6d9 3d6de 3d6e8 3d711 3d7fe

if [ "$2" = "-e" ]; then encrypt=true; fi

if $encrypt; then
  # Now re-encrypt the data.
  KEY=$(echo $(openssl rand -base64 218) | sed 's/ //g')
  openssl enc -aes-256-cbc -a -salt -in test/testdata -out test/testdata.enc -pass "pass:$KEY"
  echo
  echo "Replace TESTDATA key with the following:"
  echo $KEY
else
  echo "Use scripts/generate_testdata.sh -e to re-encrypt the data."
fi
