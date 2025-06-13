# Makefile for iolin build system
#
# This Makefile provides a complete build system for the pkl project with two main modes:
#
# DEVELOPMENT MODE (make dev or make all):
#   - Builds files individually for better debugging and development workflow
#   - Uses default version values from versioning.pkl (no timestamp parameters)
#   - Outputs to dev-dist/ directory
#   - Better for iterative development and debugging individual files
#
# PRODUCTION MODE (make dist):
#   - Builds all files in batch mode for faster performance
#   - Uses actual version from PklProject and current timestamps
#   - Outputs to dist/ directory
#   - Optimized for production builds and CI/CD
#
# AVAILABLE TARGETS:
#   all          - Default target, runs dev build
#   dev          - Development build (individual files, dev-dist output)
#   dist         - Production build (batch mode, dist output)
#   test         - Run pkl tests
#   clean        - Remove all build artifacts
#   force        - Clean and rebuild
#   build-report - Show build statistics and release info
#
# DEPENDENCIES:
#   - pkl: PKL language runtime
#   - jq: JSON processor for build reports
#   - standard Unix tools: date, find, etc.
#
# VERSION MANAGEMENT:
#   - zs_version: Defined in version.pkl and imported by versioning.pkl
#   - gg_version: Extracted from PklProject package.version using pkl
#   - Timestamps: Generated using date command at build time for production builds

# Version extraction from PklProject package block using pkl (for gg_version)
GG_VERSION := $(shell pkl eval -x package.version PklProject)

# Timestamp variables
AT := $(shell date -Iseconds)
TS := $(shell date +%s)

# PKL executable
PKL := $(shell which pkl)

# Find pkl files
PKL_FILES := $(shell find zerospace meta -name '*.pkl' | sort)

# Generate target lists
DEV_TARGETS := $(PKL_FILES:%.pkl=dev-dist/json/%.json)
DIST_TARGETS := $(PKL_FILES:%.pkl=dist/json/%.json)

.PHONY: all dev dist clean test build-report force

# Default target points to dev build
all: dev

# Development build (individual file processing)
dev: $(DEV_TARGETS) dev-dist/json/gg-iolin.d.ts build-report-dev

# Production build (batch mode - faster)
dist: dist/json copy-types-dist build-report-dist

# Pattern rule for dev builds (no version parameters)
dev-dist/json/%.json: %.pkl
	@mkdir -p $(dir $@)
	$(PKL) eval -m dev-dist/json $<

# Pattern rule for dist builds (batch mode with version parameters)
dist/json: $(PKL_FILES)
	@mkdir -p dist/json
	$(PKL) eval $(PKL_FILES) -m dist/json -p gg_version="$(GG_VERSION)" -p gg_at="$(AT)" -p gg_ts="$(TS)"

# Run pkl tests
test:
	$(PKL) test

# Copy TypeScript type definitions for dev
dev-dist/json/gg-iolin.d.ts: ext/gg-iolin.d.ts
	@mkdir -p $(dir $@)
	cp -av $< $@

# Copy TypeScript type definitions for dist
copy-types-dist: dist/json
	cp -av ext/gg-iolin.d.ts dist/json/gg-iolin.d.ts

# Generate build report for dev
build-report-dev:
	@echo "Build completed successfully"
	@echo ""
	@echo "Total bytes of JSON rendered:"
	@find dev-dist/json -name '*.json' -type f -exec cat {} \; 2>/dev/null | wc -c || echo "0"
	@echo ""
	@echo "Total number of JSON files rendered:"
	@find dev-dist/json -name '*.json' -type f 2>/dev/null | wc -l || echo "0"
	@echo ""
	@echo "Release Details:"
	@jq -C . dev-dist/json/release.json 2>/dev/null || echo "No release.json found"

# Generate build report for dist
build-report-dist:
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

# Generic build report (for manual invocation)
build-report:
	@echo "Build completed successfully"
	@echo ""
	@echo "Specify DIST_DIR to see details, e.g.: make build-report DIST_DIR=dist"

# Clean all distribution directories
clean:
	rm -rf dist dev-dist

# Force rebuild
force: clean all
