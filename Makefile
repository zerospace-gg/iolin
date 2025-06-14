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
	@echo "📦 JSON files built"

# Build TypeScript files (depends on JSON files being built first)
typescript: json
	@echo "   • TypeScript generation"
	@node scripts/generate-ts.mjs dist > /dev/null 2>&1
	@echo "🔧 TypeScript files generated"

# Compile TypeScript to JavaScript (depends on TypeScript files being built first)
npm: typescript dist/npm/package.json
	@echo "   • TypeScript compilation"
	@npm run tsc > /dev/null 2>&1
	@cp dist/typescript/gg-iolin.d.ts dist/npm/gg-iolin.d.ts
	@echo "📦 NPM package built"

# Pattern rule for JSON files from zerospace
dist/json/%.json: zerospace/%.pkl
	@mkdir -p $(dir $@)
	@echo "   • $@"
	@$(PKL) eval -m dist/json $< -p gg_version="$(GG_VERSION)" -p gg_at="$(AT)" -p gg_ts="$(TS)" > /dev/null

# Pattern rule for JSON files from meta
dist/json/%.json: meta/%.pkl
	@mkdir -p $(dir $@)
	@echo "   • $@"
	@$(PKL) eval -m dist/json $< -p gg_version="$(GG_VERSION)" -p gg_at="$(AT)" -p gg_ts="$(TS)" > /dev/null

# Copy TypeScript type definitions
dist/json/gg-iolin.d.ts: tooling/iolin-npm/gg-iolin.d.ts
	@mkdir -p $(dir $@)
	@echo "   • $@"
	@cp $< $@

# Generate package.json for npm package
dist/npm/package.json: tooling/iolin-npm/npm-pkg.pkl
	@mkdir -p $(dir $@)
	@echo "   • $@"
	@$(PKL) eval -m dist/npm $< -p gg_version="$(GG_VERSION)" -p gg_at="$(AT)" -p gg_ts="$(TS)" > /dev/null

# Run pkl tests
pkl-test:
	@echo "   • pkl tests"
	@$(PKL) test > /dev/null 2>&1
	@echo "✅ Tests passed"

# Generate build report
build-report:
	@echo "🚀 Build completed"
	@echo "Release Details:"
	@jq -C . dist/json/release.json 2>/dev/null || echo "No release.json found"

# Clean distribution directory
clean:
	@echo "🧹 Cleaning dist directory"
	@rm -rf dist
	@echo "✨ Clean completed"

# Clean only npm directory
clean-npm:
	@echo "🧹 Cleaning npm directory"
	@rm -rf dist/npm
	@echo "✨ NPM clean completed"

# Force rebuild
force:
	@echo "🔄 Force rebuild"
	@$(MAKE) clean
	@$(MAKE) all
