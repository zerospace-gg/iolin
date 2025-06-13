# Makefile for iolin build system
#
# This Makefile provides a streamlined build system for the pkl project.
# It builds files individually with consistent versioning and outputs to dist/ directory.
#
# AVAILABLE TARGETS:
#   all          - Default target, runs complete build (includes TypeScript)
#   json         - Build JSON files only
#   typescript   - Build TypeScript files only
#   test         - Run pkl tests
#   clean        - Remove dist directory
#   force        - Clean and rebuild
#   build-report - Show build statistics and release info
#
# DEPENDENCIES:
#   - pkl: PKL language runtime
#   - jq: JSON processor for build reports
#   - node: Node.js runtime for TypeScript generation
#   - prettier: Code formatter (dev dependency via npm)
#   - standard Unix tools: date, find, etc.

# Version and timestamp variables
GG_VERSION := $(shell pkl eval -x package.version PklProject)
AT := $(shell date -Iseconds)
TS := $(shell date +%s)

# PKL executable
PKL := $(shell which pkl)

# Source and target definitions
PKL_SOURCES := $(shell find zerospace meta -name '*.pkl' | sort)
# PKL strips the source directories (zerospace/meta) from output paths
ZEROSPACE_TARGETS := $(shell find zerospace -name '*.pkl' | sed 's|zerospace/||' | sed 's|\.pkl$$|.json|' | sed 's|^|dist/json/|')
META_TARGETS := $(shell find meta -name '*.pkl' | sed 's|meta/||' | sed 's|\.pkl$$|.json|' | sed 's|^|dist/json/|')
JSON_TARGETS := $(ZEROSPACE_TARGETS) $(META_TARGETS)

.PHONY: all json typescript clean test build-report force

# Default target
all: json typescript build-report

# Build JSON files
json: $(JSON_TARGETS) dist/json/gg-iolin.d.ts

# Build TypeScript files (depends on JSON files being built first)
typescript: json
	@echo "Generating TypeScript files..."
	@node scripts/generate-ts.mjs dist

# Pattern rule for JSON files from zerospace
dist/json/%.json: zerospace/%.pkl
	@mkdir -p $(dir $@)
	$(PKL) eval -m dist/json $< -p gg_version="$(GG_VERSION)" -p gg_at="$(AT)" -p gg_ts="$(TS)"

# Pattern rule for JSON files from meta
dist/json/%.json: meta/%.pkl
	@mkdir -p $(dir $@)
	$(PKL) eval -m dist/json $< -p gg_version="$(GG_VERSION)" -p gg_at="$(AT)" -p gg_ts="$(TS)"

# Copy TypeScript type definitions
dist/json/gg-iolin.d.ts: ext/gg-iolin.d.ts
	@mkdir -p $(dir $@)
	cp -av $< $@



# Run pkl tests
test:
	$(PKL) test

# Generate build report
build-report:
	@echo "Build completed successfully"
	@echo ""
	@echo "Total bytes of JSON rendered:"
	@find dist/json -name '*.json' -type f -exec cat {} \; 2>/dev/null | wc -c || echo "0"
	@echo ""
	@echo "Total number of JSON files rendered:"
	@find dist/json -name '*.json' -type f 2>/dev/null | wc -l || echo "0"
	@echo ""
	@echo "Release Details:"
	@jq -C . dist/json/release.json 2>/dev/null || echo "No release.json found"

# Clean distribution directory
clean:
	rm -rf dist

# Force rebuild
force: clean all
