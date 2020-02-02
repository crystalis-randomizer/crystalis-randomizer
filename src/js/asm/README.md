# Patching assembler and linker

This package is effectively a "patching assembler and linker".  This
gives it somewhat different requirements from a normal assembler,
which outputs contiguous segments.  Design goals include:

 * code and data are relocatable
 * relocatable code can be dynamically sliced into arbitrary "patching
   segments".
 * full support for macros, labels, conditional assembly, etc.

The design is primarily inspired by [ca65] and [ld65], but we deviate
from their decisions in various places where it makes sense.

[ca65]: https://cc65.github.io/doc/ca65.html
[ld65]: https://cc65.github.io/doc/ld65.html

## Basic structure

The basic structure is as follows:
 1. tokenizer - splits a source file string into a stream of tokens.
 2. parser - given a token stream, process it line-by-line, expanding
    macros and evaluating some control directives (`.define`, `.if`)
    but leaving others (`.org`, `.reloc`, etc).
 3. assembler - generate relocatable object (patch) data.
 4. linker - decide where data goes; when possible, same-looking data
    will be reused.

Since the contents of some segments depend on the location of others,
which depends in turn on their contents, this requires a dependency
graph where independent segments are allocated and written first,
which in turn makes further segments independent.  At any given time,
the largest remaining independent segment is written first.

This allows using the patching linker for both normal assembly code,
but also for patching and writing new data tables throughout the
program.
    
## Macro expansion

After studying ca65's macro expansion rules, I decided I'm not
particularly happy with them.  We instead implement something
more similar to TeX's rules for C-style (`.define`) macros.

The basic syntax is `.define NAME {PARAMS} EXPANSION`, where `PARAMS`
is a sequence of tokens: identifiers are captured as parameters, while
all other tokens are considered delimiters.  There is an implicit "end
of line" delimiter at the end of the parameter token list.  Parameter
names may not begin with `@`: this syntax is reserved for future
interpretation.  A parameter is considered to be undelimited if it is
immediately followed by another parameter token, or delimited if it is
followed by a non-identifier token (or the implicit EOL).  Undelimited
parameters will capture a single token from the token stream, unless
the following token is an open curly brace, in which case it will
capture tokens until a _balanced_ close curly brace is found, all of
which will be directly substituted into the parameter in the expansion,
without the enclosing curly braces.  Delimited parameters will capture
all tokens until the delimiter is reached.  If the delimiter is not
reached by EOL, then it is considered a failed match.  Macros may be
overloaded with multiple patterns, in which case a failed match will
fall through to the next definition.  If an undelimited parameter is
expected at EOL, it is considered a failed match, so longer and more
specific overloads should always be specified first.

An alternative syntax is `.defined NAME (PARAMS) EXPANSION`.  This has
two effects: (1) call sites may optionally surround all arguments with
_balanced_ parentheses, which will delimit the final argument, and (2)
comma-delimited parameters (including the final parameter before the
close paren) will optionally consume a single layer of braces around
passed arguments, mimicking the builtin `.tcount({token list})` style.
This affordance makes these macro rules compatible with the ca65 style
for all typical usages, while still maintaining the possibility of
more advanced usage patterns via the TeX style.

We adhere much more faithfully to ca65's rules for `.macro`-style
expansions: they must be in the mnemonic position
