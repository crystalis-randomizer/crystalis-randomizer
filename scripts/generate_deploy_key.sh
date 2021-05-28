#!/bin/sh

# Usage: scripts/generate_deploy_key.sh
#
# Regenerates deploy_key.enc and prints the secret.

ssh-keygen -q -t rsa -b 4096 -C '' -N '' -f id_rsa
KEY=$(echo $(openssl rand -base64 218) | sed 's/ //g')
openssl enc -aes-256-cbc -a -salt -in id_rsa -out deploy_key.enc -pass "pass:$KEY"
rm -f id_rsa

echo
echo "====================================================================="
echo "Authorize the following deploy key for crystalis-randomizer gh_pages:"
echo
cat id_rsa.pub
echo
echo "================================================="
echo "Replace the DEPLOY_KEY secret with the following:"
echo
echo $KEY

rm -f id_rsa.pub
