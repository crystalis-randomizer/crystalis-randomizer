# Developing

There are a number of environment setups that are helpful for developing.
The recommended setup is to use Linux (Windows users should consider [WSL2])
and [NVM] to install NodeJS and npm.  GNU make is also required.

[WSL2]: https://learn.microsoft.com/en-us/windows/wsl/install
[NVM]: https://github.com/nvm-sh/nvm#installing-and-updating

## Smudge

To avoid distributing any copyrighted material, we store the game's
disassembly purely as metadata on top of the original content.  This means
it is useless without _smudging_ the original data back into the
disassembly.  This is done with the `js65` tool and can be automated via
`.gitattributes`.  For the ideal development setup:

```sh
npm install
make target/release/bin/js65
# NOTE: install to somewhere in $PATH (e.g. ~/bin)
install -m 755 target/release/bin/js65 ~/bin/js65
```

This builds and installs `js65` somewhere accessible.  Next,

```sh
git config --local include.path ../.gitconfig
rm vanilla/crystalis.s src/asm/*.s
git checkout vanilla/crystalis.s 'src/asm/*.s'
```

This will reconstruct the human-usable disassembly, provided the original
image (with the correct sha1 sum) is found somewhere in the root of the
git repository.  From this point on, git will treat all edits as if the
repository stored the smudged file, but GitHub will store the sanitized version.

Note that a valid ROM file (with sha1sum fd0dcde4...) is required for smudging
to work correctly.  This file should be in the root directory of the git repo.
Without this, `git checkout` will error with a `js65` error about not being
able to find the rom.

If smudging is successful, then vanilla/crystalis.s will have actual data in it,
rather than placeholder values like `[@0@]`.

## Running the Web UI

NOTE: you should have smudging set up and have run `npm install` before
proceeding.  You should also have an HTTP server available (e.g. by running
`npm install -g http-server`).

The easiest way to develop on the web UI is to open up three separate terminals
at the root of the repository, and run each of the following commands (one per
terminal):

```sh
npm run watch
npx tsc --watch
cd target/debug; http-server
```

Now whenever you edit a source file, the debug build will run automatically
and any TypeScript type errors will be shown.

## Emacs

The `elisp` directory provides some useful macros that can be loaded when
developing with emacs, particularly around TypeScript (`ts.el`) and assembly
(`asm.el` and `crystalis.el`), though the latter are somewhat obsolete due
to format changes in the assembly files (i.e. many of the macros are broken
due to no-longer-valid assumptions).  In addition, `npm run flycheck` will
run a script to help flycheck provide type errors quickly.
