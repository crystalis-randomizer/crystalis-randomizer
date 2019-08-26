#!/bin/sh

# No point cloning the repo if not on a travis branch.
if [ -z "$TRAVIS_BRANCH" ]; then
  echo "Nothing to do" >&2
  exit 0
fi

# 7-char abbreviated commit
commit="$(echo $TRAVIS_COMMIT | cut -c1-7)"

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
    label="$dir $commit"
    ;;
  (*)
    echo "Bad travis tag: $TRAVIS_TAG" >&2
    exit 1
    ;;
esac

# Build up the build_info.js file.
{
  # Note: we need to explicitly type STATUS as a string so that
  # TypeScript doesn't complain on unnecessary checks.
  echo "var __VERSION__ = {"
  echo "  'STATUS': '$status',"
  echo "  'VERSION': '$dir',"
  echo "  'LABEL': '$label',"
  echo "  'HASH': '$TRAVIS_COMMIT',"
  echo "  'DATE': new Date($(date +%s000)),"
  echo "};"
  echo "if (typeof global !== 'undefined') global['__VERSION__'] = __VERSION__;"
} >| "src/js/build_info.js"

# Intended use: 'eval $(build_info.sh)'
echo "export dir='$dir';"
echo "export status='$status';"
echo "export label='$label';"
echo "export commit='$commit';"
