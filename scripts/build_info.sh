#!/bin/sh

# No point cloning the repo if not on a travis branch.
if [ -z "$TRAVIS_BRANCH" ]; then
  echo "Nothing to do" >&2
  exit 0
fi

# Tags should be of the form "v1.0.0" for a stable release,
# or "v1.0.0-rc1" for a pre-release.  For stable releases,
# update the 'stable' symlink to point to that version.
# For pre-releases. update 'rc' symlink to point to the
# version, and add an indicator to the page.
case "$TRAVIS_TAG" in
  (v*-rc*)
    dir=${TRAVIS_TAG#v}
    status=rc
    label=$dir
    ;;
  (v*)
    dir=${TRAVIS_TAG#v}
    status=stable
    label=$dir
    ;;
  ('')
    case "$TRAVIS_BRANCH" in
      (master) dir=latest ;;
      (*)      dir=$TRAVIS_BRANCH ;;
    esac
    status=unstable
    label="$dir $(echo $TRAVIS_COMMIT | cut -c1-7)"
    ;;
  (*)
    echo "Bad travis tag: $TRAVIS_TAG" >&2
    exit 1
    ;;
esac

# Build up the version.js file.
{
  echo "export const STATUS = '$status';"
  echo "export const VERSION = '$dir';"
  echo "export const LABEL = '$label';"
  echo "export const HASH = '$TRAVIS_COMMIT';"
  echo "export const DATE = new Date($(date +%s000));"
} >| "src/js/version.js"

# Intended use: 'eval $(build_info.sh)'
echo "export dir='$dir';"
echo "export status='$status';"
echo "export label='$label';"
