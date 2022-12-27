#!/bin/sh

set -ex

mkdir -p target/build
case "$GITHUB_REF" in
  (refs/tags/*) GITHUB_TAG=${GITHUB_REF#refs/tags/} ;;
  (refs/heads/*) GITHUB_BRANCH=${GITHUB_REF#refs/heads/} ;;
  (*)
    # No point cloning the repo if not on a branch or tag
    echo "Nothing to do" >&2
    touch target/build/build_info.js
    exit 0
    ;;
esac

# 7-char abbreviated commit
commit="$(echo $GITHUB_SHA | cut -c1-7)"

# Tags should be of the form "v1.0.0" for a stable release,
# or "v1.0.0-rc1" for a pre-release.  For stable releases,
# update the 'stable' symlink to point to that version.
# For pre-releases. update 'rc' symlink to point to the
# version, and add an indicator to the page.
case "$GITHUB_TAG" in
  (v*-rc*)
    dir=${GITHUB_TAG#v}
    status=rc
    label=$dir
    ;;
  (v*)
    dir=${GITHUB_TAG#v}
    status=stable
    label=$dir
    ;;
  ('')
    case "$GITHUB_BRANCH" in
      (master) dir=latest ;;
      (*)      dir=$GITHUB_BRANCH ;;
    esac
    status=unstable
    label="$dir $commit"
    ;;
  (*)
    echo "Bad tag: $GITHUB_TAG" >&2
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
  echo "  'HASH': '$GITHUB_SHA',"
  echo "  'DATE': new Date($(date +%s000)),"
  echo "};"
  echo "if (typeof global !== 'undefined') global['__VERSION__'] = __VERSION__;"
} >| "target/build/build_info.js"

# Intended use: 'eval $(build_info.sh)'
if [ -n "$GITHUB_ENV" ]; then
  echo "dir=$dir" >> "$GITHUB_ENV"
  echo "status=$status" >> "$GITHUB_ENV"
  echo "label=$label" >> "$GITHUB_ENV"
  echo "commit=$commit" >> "$GITHUB_ENV"
else
  echo "export dir='$dir';"
  echo "export status='$status';"
  echo "export label='$label';"
  echo "export commit='$commit';"
fi
