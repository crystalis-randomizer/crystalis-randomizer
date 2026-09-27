# Developing

There are a number of environment setups that are helpful for developing.
The recommended setup is to use Linux (Windows users should consider [WSL2])
and [Bun], which is used for building, testing, and package management.

[WSL2]: https://learn.microsoft.com/en-us/windows/wsl/install
[Bun]: https://bun.sh/docs/installation

## Smudge

To avoid distributing any copyrighted material, we store the game's
disassembly purely as metadata on top of the original content.  This means
it is useless without _smudging_ the original data back into the
disassembly.  This is done with the `js65` tool and can be automated via
`.gitattributes`.  For the ideal development setup, first install the
upstream `js65` somewhere in your `$PATH`, e.g. `npm install -g js65`.  It
must be a version with the `rehydrate` and `dehydrate` subcommands used by
`.gitconfig` (tested with 2.0.23).  Next,

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

NOTE: you should have smudging set up and have run `bun install` before
proceeding.

```sh
bun run dev
```

This starts a dev server for every page under `src/` that reloads on change.
For type errors as you go, run `bun run tsc-watch` in another terminal (or rely on your editor).

## Emacs

The `elisp` directory provides some useful macros that can be loaded when
developing with emacs, particularly around TypeScript (`ts.el`) and assembly
(`asm.el` and `crystalis.el`), though the latter are somewhat obsolete due
to format changes in the assembly files (i.e. many of the macros are broken
due to no-longer-valid assumptions).  In addition, `bun run flycheck` will
run a script to help flycheck provide type errors quickly.

## Testing

`bun test` runs the unit tests, `bun run typecheck` runs the TypeScript type
checker, and `bun run test` runs the unit tests, a full build, and a CLI test.
