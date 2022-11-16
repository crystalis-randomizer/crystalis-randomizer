#!/bin/sh

set -e

# This script is run in the github action to initialize the various secrets into
# environment variables.
#  * To update/re-encrypt DEPLOY_KEY run scripts/generate_deploy_key.sh
#  * To update/re-encrypt TESTDATA run scripts/generate_testdata.sh -e orig.nes
#  * The current NPM_TOKEN is 39...57

AGENT=$(ssh-agent)
eval "$AGENT"
echo "$AGENT" | sed -e 's/;.*//' -e '/^echo/d' >> "$GITHUB_ENV"
openssl enc -d -aes-256-cbc -a -in deploy_key.enc -out deploy_key -pass "pass:$DEPLOY_KEY"
chmod 600 deploy_key
ssh-add deploy_key </dev/null
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> ~/.npmrc
openssl enc -d -aes-256-cbc -a -in test/testdata.enc -out test/testdata -pass "pass:$TESTDATA" -md sha256
git config --global user.email "nobody@invalid"
git config --global user.name "GitHub Actions"
