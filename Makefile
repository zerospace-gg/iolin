# Makefile for iolin build system
#
# This Makefile provides a streamlined build system for the pkl project.
# It builds files individually with consistent versioning and outputs to dist/ directory.
#
# AVAILABLE TARGETS:
#   all          - Default target, runs complete build (includes TypeScript and npm)
#   json         - Build JSON files only
#   typescript   - Build TypeScript files only
#   npm          - Compile TypeScript to JavaScript in dist/npm
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

.PHONY: all json typescript npm clean clean-npm test build-report force

# Default target
all: json pkl-test typescript npm build-report

# Build JSON files
json: $(JSON_TARGETS) dist/json/gg-iolin.d.ts

# Build TypeScript files (depends on JSON files being built first)
typescript: json
	node scripts/generate-ts.mjs dist

# Compile TypeScript to JavaScript (depends on TypeScript files being built first)
npm: typescript
	npm run tsc
	cp dist/typescript/gg-iolin.d.ts dist/npm/gg-iolin.d.ts

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
pkl-test:
	$(PKL) test

# Generate build report
build-report:
	@echo "Release Details:"
	@jq -C . dist/json/release.json 2>/dev/null || echo "No release.json found"

# Clean distribution directory
clean:
	rm -rf dist
	@echo "Cleaned all distribution directories"

# Clean only npm directory
clean-npm:
	rm -rf dist/npm
	@echo "Cleaned npm distribution directory"

# Force rebuild
force: clean all
