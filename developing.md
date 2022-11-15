# Developing

There are a number of environment setups that are helpful for developing.

## Smudge

To avoid distributing any copyrighted material, we store the game's
disassembly purely as metadata on top of the original content.  This means
it is useless without _smudging_ the original data back into the
disassembly.  This is done with the `js65` tool and can be automated via
`.gitattributes`.  For the ideal development setup:

```sh
npm install
npm run build
# NOTE: install to somewhere in $PATH
install -m 755 dist/js/asm/js65.js ${PATH%%:*}/js65
```

This builds and installs `js65` somewhere accessible.  Next,

```sh
git config --local include.path ../.gitconfig
rm src/asm/crystalis.s
git checkout src/asm/crystalis.s
```

This will reconstruct the human-usable disassembly, provided the original
image (with the correct sha1 sum) is found somewhere in the root of the
git repository.  From this point on, git will treat all edits as if the
repository stored the smudged file, but GitHub will store the sanitized version.
