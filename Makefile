# Basic directories and tools
ESBUILD = npx esbuild
TARGET = target
RELDIR = $(TARGET)/release
DBGDIR = $(TARGET)/debug
BLDDIR = $(TARGET)/build
BROTLI = $(BLDDIR)/brotli

# Flags
NODEFLAGS   = --bundle --platform=node
WEBFLAGS    = --bundle --splitting --format=esm
DBGFLAGS    = --sourcemap=inline
RELFLAGS    = --minify
LOADERFLAGS = --loader:.br=binary

# Hand-written list of entry points (relative to src/js)
WEB_ENTRY_POINTS = main.js check.js $(addprefix view/,$(VIEW_ENTRY_POINTS))
VIEW_ENTRY_POINTS = maps.js messages.js screens.js sprites.js tileset.js

# Output directories
JS65_DBG = $(DBGDIR)/bin/js65
JS65_REL = $(RELDIR)/bin/js65
CLI_DBG = $(DBGDIR)/bin/cryr
CLI_REL = $(RELDIR)/bin/cryr
# Process entry points
WEB_ENTRY_POINTS_FULL = $(addprefix src/js/,$(WEB_ENTRY_POINTS))
WEB_ENTRY_OUTS = $(WEB_ENTRY_POINTS:.ts=.js)
WEB_JS_DBG = $(addprefix $(DBGDIR)/js/,$(WEB_ENTRY_OUTS))
WEB_JS_REL = $(addprefix $(RELDIR)/js/,$(WEB_ENTRY_OUTS))
LINK_PATTERNS = %.html %.png %.nss %.css %.ico src/ga.tag
LINK_FILES = $(filter $(LINK_PATTERNS),$(shell find src -type f))
JS_FILES = $(shell find src/js -type f -name '*.[tj]s')
ASM_FILES = $(shell find src/asm -type f -name '*.s')
ASM_TAR = $(BLDDIR)/asm.tar
ASM_TBR = $(BLDDIR)/asm.tar.br
BUILD_INFO  = $(BLDDIR)/build_info.js
DBG_LINKS = $(LINK_FILES:src/%=target/debug/%)
REL_LINKS = $(LINK_FILES:src/%=target/release/%)
DBG_OUTS = $(JS65_DBG) $(CLI_DBG) $(WEB_JS_DBG) $(DBG_LINKS)
REL_OUTS = $(JS65_REL) $(CLI_REL) $(WEB_JS_REL) $(REL_LINKS)


.PHONY: all debug release clean web-debug web-release

release: $(REL_OUTS)
debug: $(DBG_OUTS)
all: debug release
web-debug: $(WEB_JS_DBG)
web-release: $(WEB_JS_REL)

clean:
	rm -rf target

$(BROTLI): src/js/tools/brotli.js
	@mkdir -p $(@D)
	install -m 755 $< $@

# NOTE: There's not a standard cross-platform way to transform paths
# (Mac uses BSD tar, which wants `-s`, while GNU wants `--transform`)
# Instead, we use a subshell, path substitution, and pipes.
$(ASM_TAR): $(ASM_FILES)
	@mkdir -p $(@D)
	(cd src/asm; COPYFILE_DISABLE=1 tar cv $(^:src/asm/%=%)) > $@

$(ASM_TBR): $(BROTLI) $(ASM_TAR)
	$(BROTLI) < $(ASM_TAR) > $@

$(BUILD_INFO): scripts/build_info.sh
	$<

$(DBG_LINKS): target/debug/%:
	@mkdir -p $(@D)
	@rm -f $@
	@ln -s ../../src/$(@:target/debug/%=%) $@
$(REL_LINKS): target/release/%: src/%
	@mkdir -p $(@D)
	cp $< $@

$(WEB_JS_DBG): $(JS_FILES) $(ASM_TBR)
	rm -f $(DBGDIR)/js/*-????????.js
	$(ESBUILD) $(WEBFLAGS) $(DBGFLAGS) $(LOADERFLAGS) \
		--outdir=$(DBGDIR)/js $(WEB_ENTRY_POINTS_FULL)

$(WEB_JS_REL): $(JS_FILES) $(ASM_TBR)
	rm -f $(RELDIR)/js/*-????????.js
	$(ESBUILD) $(WEBFLAGS) $(RELFLAGS) $(LOADERFLAGS) \
		--outdir=$(RELDIR)/js $(WEB_ENTRY_POINTS_FULL)

$(DBGDIR)/bin/js65: $(JS_FILES)
	$(ESBUILD) $(NODEFLAGS) $(DBGFLAGS) --outfile=$@ src/js/asm/js65.ts
$(DBGDIR)/bin/cryr: $(JS_FILES) $(ASM_TBR) $(BUILD_INFO)
	$(ESBUILD) $(NODEFLAGS) $(DBGFLAGS) $(LOADERFLAGS) --outfile=$@ \
		src/js/cli.ts

$(RELDIR)/bin/js65: $(JS_FILES)
	$(ESBUILD) $(NODEFLAGS) $(RELFLAGS) --outfile=$@ src/js/asm/js65.ts
$(RELDIR)/bin/cryr: $(JS_FILES) $(ASM_TBR) $(BUILD_INFO)
	$(ESBUILD) $(NODEFLAGS) $(RELFLAGS) $(LOADERFLAGS) --outfile=$@ \
		src/js/cli.ts
