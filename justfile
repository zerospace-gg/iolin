# Justfile for iolin build system
# Run `just --list` to see all available commands

# Variables
gg_version := `pkl eval -x package.version PklProject`
gg_at := `date -Iseconds`
gg_ts := `date +%s`

# Internal build mode flags
_batch_mode := "false"
_compact_json := "false"

# Default recipe - builds everything
default: json typescript npm build-report

# Build all JSON files from Pkl sources
json:
    @echo "📦 Building JSON files{{ if _batch_mode == "true" { " (batch mode)" } else { "" } }}{{ if _compact_json == "true" { " (compact)" } else { "" } }}"
    @mkdir -p dist/json
    @./tooling/build/json-build.sh "{{_batch_mode}}" "{{gg_version}}" "{{gg_at}}" "{{gg_ts}}" "{{ if _compact_json == "true" { "" } else { "  " } }}"
    @echo "   • dist/json/gg-iolin.d.ts"
    @cp tooling/iolin-npm/gg-iolin.d.ts dist/json/gg-iolin.d.ts
    @echo "📦 JSON files built{{ if _compact_json == "true" { " (compact)" } else { "" } }}"

# Generate TypeScript files (depends on JSON files)
typescript: json
    @echo "🔧 Generating TypeScript files"
    @node scripts/generate-ts.mjs dist > /dev/null 2>&1
    @echo "🔧 TypeScript files generated"

# Build NPM package (depends on TypeScript files)
npm: typescript
    @echo "📦 Building NPM package"
    @mkdir -p dist/npm
    @echo "   • dist/npm/package.json"
    @pkl eval -m dist/npm tooling/iolin-npm/npm-pkg.pkl \
        -p gg_version="{{gg_version}}" \
        -p gg_at="{{gg_at}}" \
        -p gg_ts="{{gg_ts}}" \
        -p gg_indent="{{ if _compact_json == "true" { "" } else { "  " } }}" > /dev/null
    @echo "   • TypeScript compilation"
    @npm run tsc > /dev/null 2>&1
    @cp dist/typescript/gg-iolin.d.ts dist/npm/gg-iolin.d.ts
    @echo "📦 NPM package built"

# Run Pkl tests
test:
    @echo "   • pkl tests"
    @pkl test > /dev/null 2>&1
    @echo "✅ Tests passed"

# Show build report
build-report:
    @echo "🚀 Build completed"
    @echo "Release Details:"
    @jq -C . dist/json/release.json 2>/dev/null || echo "No release.json found"

# Clean all build artifacts
clean:
    @echo "🧹 Cleaning dist directory"
    @rm -rf dist
    @echo "✨ Clean completed"

# Clean only NPM build artifacts
clean-npm:
    @echo "🧹 Cleaning npm directory"
    @rm -rf dist/npm
    @echo "✨ NPM clean completed"

# Clean and rebuild everything
force: clean default

# Build everything including tests
all: json test typescript npm build-report

# Build for distribution (compact JSON, batch mode)
dist:
    @just _batch_mode=true _compact_json=true json typescript npm build-report

# Development workflow - quick rebuild of just the parts that changed
dev: json typescript
    @echo "🚀 Development build completed"

# Watch mode for TypeScript (useful for development)
watch:
    @echo "👀 Starting TypeScript watch mode"
    npm run tsc:watch

# Debug: dump all environment variables that Just can see
debug-env:
    @env | sort
