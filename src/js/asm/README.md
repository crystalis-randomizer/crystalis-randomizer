# Patching assembler and linker

This package is effectively a "patching assembler and linker".  This
gives it somewhat different requirements from a normal assembler,
which outputs contiguous segments.  Design goals include:

 * code and data are relocatable
 * relocatable code can be dynamically sliced into arbitrary "patching
   segments".
 * full support for macros, labels, conditional assembly, etc.

The design is primarily inspired by cc65, but we deviate from their
decisions in various places where it makes sense.

## Basic structure

The basic structure is as follows:
 1. parser - given a source file, parse it into an AST with no further
    interpretation or processing.
 2. preprocessor - apply certain directives (conditional assembly,
    macro expansion) but leave others (.org, .reloc, etc).
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
    
