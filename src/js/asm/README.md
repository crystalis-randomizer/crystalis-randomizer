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

## Generators

Each part of the assembler is handled as a generator.  The tokenizer
emits a stream of tokens.  The output to the generator is fed into
the line splitter, which generates lines as separate token arrays.
The lines are passed to the macro subsystem, which contains a map of
identifiers to `(Define|Macro)` and expands the defines in lines
as they come in, then ...

Alternative plan: continuation passing?

```
interface Tokenizer {
  tokenize(str: string, file?: string): Generator<Token>;
}
interface Expander {
  ingestLine(line: Token[]);
}
interface Assembler {
  ingestLabel(label: string);
  ingestMnemonic(mnemonic: string, args: Expr[]);
  ingestDirective(directive: string, arg: Expr[]);
  end();
}
```

Probably want Expander to be at the top level, since it sees all directives,
while the tokenizer is dumb.  Then the Expander can configure the Tokenizer,
ask it for the next line, etc.

How to handle `.exitmacro`?

```
class Expander {
  handleCall() {
    const macroExpander = new MacroExpander({
      stopped = false,
      ingestLabel(label) { this.delegate.ingestLabel(label); },
      ingestMne(...) { this.delegate.ingestMne(...); },
      ingestDirec(...) { if (directive==='.exitmacro'){...} },
    });
    for (const line of replacement.lines) {
      if (Token.eq(line, Token.EXITMACRO)) break;
      macroExpander.ingestLine(line);
    }
  }
}
```

What about `.define` and `.macro`?  The latter is tricky because it
spans multiple lines...

What about `.proc`?  It's a label and a scope.  Scopes need to be
findable.  The assembler keeps track of the current scope chain.
When it sees a symbol definition, it assigns it a new identifier.
When it sees a reference to a symbol that's not defined in the
current scope, it likewise makes a new identifier.  There's no way
to tell until after the end of the enclosing scopes which scope
actually defined the symbol...

We can handle `+++` and `--` and `:` labels easily enough.  When
we see a label `--`, we override the current version of that and
use it whenever we see the backreference.  When we see a forward
reference `+++` we give it a label, and then delete it whenever
we see the definition.  When we see a label `:` or a reference `:+`,
we have a list of such labels and we move an index along it.  Do
these interact with scopes?  Macros?  How do local symbols work
in a macro?  There's an implicit scope for the expansion.  Scopes
don't affect anonymous labels.  Cheap local labels need to be cleared
at every real label.

Here's a difficulty:

```
.scope S1
L1:
  .scope S2
    bne L1
  L2:
    bne L2
  L1:
  .endscope
L2:
.endscope
```

When we see `L1:` in `S1` we assign a new symbol ID (0) for [`S1`,
`L1`].  When we see `bne L1` in `S2`, we can't tell if this is a new
label or not, so we assign it ID 1 for [`S1`, `S2`, `L1`].

It's very difficult to keep track of what's what when we haven't seen
all the scoped symbols yet.  The best we can do is guess and then assign
aliases for inner uses of outer symbols.  When we see an explicit scope,
we know exactly where it is, but for unscoped symbols, we need to keep
a list of ref'd but never def'd symbols in the scope, mapping to the ID
we'd assigned, and then roll them up to the higher-level scopes...?

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

An alternative syntax is `.defined NAME (PARAMS) EXPANSION`, which
enables simpler syntax: (1) params _must_ be a comma-separated list of
identifiers, (2) call sites may optionally surround all arguments with
_balanced_ parentheses, which will delimit the final argument, and (3)
parameters will optionally consume a single layer of braces if it
surrounds the entire argument, mimicking the builtin `.tcount({token
list})` style.  This affordance makes these macro rules compatible
with the ca65 style for all typical usages, while still maintaining
the possibility of more advanced usage patterns via the TeX style.

We adhere much more faithfully to ca65's rules for `.macro`-style
expansions: they must be in the mnemonic position

## Assembled object file format

The output of the assembler is a JSON object with the following format:

```
interface Object {
  // All the chunks.
  chunks: Chunk[];
  // All the symbols.
  symbols: Symbol[];
  // TODO: pagesize information
}
interface Chunk {
  // ROM bank for this chunk.
  bank?: number;
  // Absolute address (within the bank) to start.
  org?: number;
  // Region of CPU memory for relocatable chunk (i.e. $8000 or
  // $A000 will place the result in the same part of the ROM
  // image, but symbols will be exported differently).
  reloc?: number;
  // Base64-encoded data for the chunk.  This may be a Uint8Array
  // in memory.
  data: string;
  // Substitutions to insert into the data based on other chunks.
  subs?: Substitution[];
}
interface Symbol {
  // Name to export this symbol as.
  export?: string;
  // Name to import this symbol from.
  import?: string;
  // Expression for the symbol.
  expr: Expr;
  // TODO: size data?
}
interface Substitution {
  // Offset into the chunk to substitute the expression into.
  offset: number;
  // Number of bytes to substitute (little-endian).
  size: number;
  // Expression whose value to substitute.
  expr: Expr;
}
interface Expr {
  // Operator to apply to args.  Typically this is the operator
  // as a string (e.g. '+' or '.max'), and args will have one
  // or more nested expressions.  Three special operators exist
  // that use the 'num' field:
  //  * 'sym' indicates an offset into the 'symbols' array,
  //  * 'num' is a number literal,
  //  * 'off' is the address of an offset into this chunk.
  op: string;
  // Args for operators.
  args?: Expr[];
  // Numeric arg for 'sym', 'num', or 'off'.
  num?: number;
}
```

By producing this format, external applications can reuse the linker's
logic to link data from different (non-assembly) sources.

## Expansion, Evaluation, Execution

The assembler goes through a number of interleaved stages.  After
source is tokenized into a stream of tokens, expansion begins.  Each
line is expanded individually from the first token to produce a single
expanded line that can be executed.  Execution entails changing the
state of the (pre)processor.  i.e. by ingesting a directive or
mnemonic, entering a block (e.g. `.if` or `.proc`), or defining a
macro.  Expansion entails looking up `.define`d macros or processing
expandable directives (e.g. `.tcount`, `.cond`, `.concat`, or
`.ident`).  Expandable directives require statically constant inputs.

An interesting directive is `.skip`, which suppresses expansion on the
following token (and expanding the one after).  The `.define`,
`.macro`, and `.undefine` tokens have a permanent built-in `.skip`
effect, which allows prevents the to-be-defined identifier from
getting expanded before it can be defined, but this itself can be
skipped:

```
.define defFoo {n} \
    .skip .define .ident(.sprintf("foo%d", n))
defFoo 5 42
```

The above example would expand `defFoo 5` to `.define foo5` so that
the result is `.define foo5 42`.  Note that in practice this is not
necessary because the `.define` _will_ expand a directive, such as
`.ident` or `.skip`.  A better example is

```
.define unary (name, func) name (x) func
.skip .define unary(inc, x + 1)
```

This could be further improved as

```
.define unary (name, func) .define name (x) func
unary(inc, x + 1)
```

The body of a `.define` macro is not expanded at definition time,
since expansion would destroy a lot of the things that we'd want to
keep.  This allows, for instance, to define a recursive macro.  If
expansion is desired, it can be achieved by skipping ahead of both the
`.define` and the identifier to expand the body, e.g. by defining a
separate macro for the body:

```
.define body .tcount({foo})
.undefined foo
.define .skip foo body
.undefine body
```

In this example if `foo` were a list of tokens then it would get
redefined to just be the number of tokens.  This could be important
if the dependent value may potentially change.

Expression evaluation ties into expansion because there are a number
of functions that are evaluated at expansion time.  At the center is
the `.cond` directive, which takes a comma-separated list of terms
and applies an expansion-time "if-elseif-else", with proper short
circuiting so that uncovered clauses are not expanded.  Thus,

```
.cond(.def(foo), foo, .ref(bar), bar, baz > 1, baz, qux)
```

would expand to `foo` if it's defined, `bar` if it's referenced,
`baz` if it's greater than 1, and otherwise `qux`.  But because
of short-circuiting, only one "then" branch is ever expanded.

To determine what to expand, the conditions must be not only expanded,
but _evaluated_.  Evaluation during expansion requires a
back-and-forth between the evaluator, which is looking for literals
and prefix/infix operators, and the expander, which is looking for
tokens that can be expanded.  In the case of
evaluation-during-expansion, we can "cheat" because anything requiring
evaluation will always be enclosed in parentheses.  So we separately
(recursively) expand the entire contents of the balanced parentheses
(or the corresponding argument in the list).

For example, the following will define a new unique label.  It also
demonstrates mixing `.define` with `.macro` to execute multiple
lines.

```
.define trylabel(i) \
    .cond( \
        .defined(.ident(.sprintf("label%d", i))), \
        trylabel(i+1), makelabel i)
.macro makelabel i
.define .skip lastlabel .ident(.sprintf("label%d", i))
lastlabel:
.endmacro
    
.macro newlabel
trylabel(1)
.endmacro

  ldx #$07
newlabel
  dex
  bne lastlabel
```
