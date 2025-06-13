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
#   - Uses actual version from package.json and current timestamps
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
#   build-dev    - Build all pkl files individually (internal target)
#   build-dist   - Build all pkl files in batch mode (internal target)
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

# Default distribution directory
DIST_DIR ?= dev-dist

# Version extraction from PklProject package block using pkl (for gg_version)
GG_VERSION := $(shell pkl eval -x package.version PklProject)

# Timestamp variables
AT := $(shell date -Iseconds)
TS := $(shell date +%s)

# PKL executable
PKL := $(shell which pkl)

# Find pkl files
PKL_FILES := $(shell find zerospace meta -name '*.pkl' | sort)

.PHONY: all dev dist clean test build-report
.PHONY: create-dist-dir build-dev build-dist copy-types

# Default target points to dev build
all: dev

# Development build (individual file processing)
dev: DIST_DIR = dev-dist
dev: create-dist-dir build-dev copy-types build-report

# Production build (folder mode - faster)
dist: DIST_DIR = dist
dist: create-dist-dir build-dist copy-types build-report

# Create distribution directory
create-dist-dir:
	mkdir -p $(DIST_DIR)/json

# Build files individually (dev mode)
build-dev:
	@for file in $(PKL_FILES); do \
		$(PKL) eval -m $(DIST_DIR)/json $$file; \
	done

# Build files in batch mode (dist mode)
build-dist:
	$(PKL) eval $(PKL_FILES) -m $(DIST_DIR)/json -p gg_version="$(GG_VERSION)" -p gg_at="$(AT)" -p gg_ts="$(TS)"

# Run pkl tests
test:
	$(PKL) test

# Copy TypeScript type definitions
copy-types:
	cp -av ext/gg-iolin.d.ts $(DIST_DIR)/json/gg-iolin.d.ts

# Generate build report
build-report: SHELL := /bin/bash
build-report:
	@echo "Build completed successfully"
	@echo ""
	@echo "Total bytes of JSON rendered:"
	@find $(DIST_DIR)/json -name '*.json' -type f -exec cat {} \; 2>/dev/null | wc -c || echo "0"
	@echo ""
	@echo "Total number of JSON files rendered:"
	@find $(DIST_DIR)/json -name '*.json' -type f 2>/dev/null | wc -l || echo "0"
	@echo ""
	@echo "Release Details:"
	@jq -C . $(DIST_DIR)/json/release.json 2>/dev/null || echo "No release.json found"

# Clean all distribution directories
clean:
	rm -rf dist dev-dist

# Force rebuild
force: clean all
