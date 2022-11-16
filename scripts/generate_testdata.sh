#!/bin/bash

# Usage: scripts/generate_testdata.sh original.nes
#
# Regenerates the test/testdata file by pulling only the necessary
# parts out of the original image.  The remainder of the testdata
# file is just random.

encrypt=false
if [ "$1" = "-e" ]; then encrypt=true; shift; fi

head -c 393232 /dev/urandom > test/testdata

keep=(
  4:8         # bank count from header
  +10         # set offset for actual PRG data
  0:10000     # screen data necessary for logic
  13300:13f80 # terrain effect tables
  14000:17cfa # shops, map data
  19201:1aba3 # spawn tables because monster placement in logic
  1ac00:1be91 # object data would break things if in bad format
  1bff0:1c000 # mezame spawns
  1c22f:1c26f # telepathy table (just needs to be 0..7)
  1c399:1c439 # item use (needed for trade-ins)
  1c5e0:1e3c0 # spawn conditions
  1f95d:1fa98 # boss data
  1fafe:1fb29 #  "    "
  20c1b:21471 # menu messages (just need to be valid addrs/text)
  21da4:21f9a # shops (just need to not break things)
  28000:28466 # message indexes
  28541:2854e # message table references
  2868a:28790 #  "    "
  28900:2923d # message indexes
  29c00:29e80 # adhoc spawns (need reasonable projectile data)
  2a000:2fbd5 # messages (just need valid parse)
  34b7f:34c0e # character data tables (for scaling?)
  34ec5:34f2b # numeric displays (?)
  35691:3572d # hitboxes (for world graph building)
  357e4:35824 # random number table (just need 0..7)
  36e53:36e55 # movement script table ref (just need valid addr)
  36f04:36f24 # movement script table pointers (just need valid addrs)
  3845c:3bf35 # metasprites (just need valid parse)
  3cbec:3cbfc # wild warp (need valid locations for logic)
  3e3a2:3e3ab # invisible chests (just need valid item ids)
  3e779:3e799 # animation table (just need valid parse?)
  3d664:3d6d5 # dolphin spawn table
  3dc58:3dc64 # town warps (just need to be valid locations)
  # various triggers, itemgets, etc
  367f4 3d18f 3d1f9 3d2af 3d30e 3d337 3d655 3d6d9 3d6de 3d6e8 3d711 3d7fe
)

scripts/inject.js "$1" test/testdata "${keep[@]}"

if [ "$2" = "-e" ]; then encrypt=true; fi

if $encrypt; then
  # Now re-encrypt the data.
  KEY=$(echo $(openssl rand -base64 218) | sed 's/ //g')
  openssl enc -aes-256-cbc -a -salt -in test/testdata -out test/testdata.enc -pass "pass:$KEY" -md sha256
  echo
  echo "Replace TESTDATA key with the following:"
  echo $KEY
else
  echo "Use scripts/generate_testdata.sh -e to re-encrypt the data."
fi
