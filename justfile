# Justfile for iolin build system
# Run `just --list` to see all available commands
# Variables

gg_version := `pkl eval -x package.version PklProject`
gg_at := `date -Iseconds`
gg_ts := `date +%s`

# Internal build mode flags

[private]
_batch_mode := "false"
[private]
_compact_json := "false"

# Default recipe - builds everything
default: json typescript npm build-report

# Build all JSON files from Pkl sources
json:
    @echo "📦 Building JSON files{{ if _batch_mode == "true" { " (batch mode)" } else { "" } }}{{ if _compact_json == "true" { " (compact)" } else { "" } }}"
    @mkdir -p dist/json
    @./tooling/build/json-build.sh "{{ _batch_mode }}" "{{ gg_version }}" "{{ gg_at }}" "{{ gg_ts }}" "{{ if _compact_json == "true" { "" } else { "  " } }}"
    @echo "   • dist/json/gg-iolin.d.ts"
    @cp tooling/iolin-npm/gg-iolin.d.ts dist/json/gg-iolin.d.ts
    @echo "📦 JSON files built{{ if _compact_json == "true" { " (compact)" } else { "" } }}"

# Generate TypeScript files (depends on JSON files)
typescript: json
    @echo "🔧 Generating TypeScript files"
    @node scripts/generate-ts.mjs dist > /dev/null
    @# Verify TypeScript files were actually generated
    @if [ ! -f "dist/typescript/index.ts" ]; then echo "❌ ERROR: TypeScript generation failed - no index.ts generated"; exit 1; fi
    @if [ ! -f "dist/typescript/gg-iolin.d.ts" ]; then echo "❌ ERROR: TypeScript generation failed - no type definitions copied"; exit 1; fi
    @# Count generated .ts files to ensure we have content
    @ts_count=$(find dist/typescript -name "*.ts" | wc -l) && if [ "$ts_count" -lt 5 ]; then echo "❌ ERROR: TypeScript generation failed - only $ts_count files generated (expected at least 5)"; exit 1; fi
    @echo "🔧 TypeScript files generated"

# Build NPM package (depends on TypeScript files)
npm: typescript
    @echo "📦 Building NPM package"
    @mkdir -p dist/npm
    @echo "   • dist/npm/package.json"
    @pkl eval -m dist/npm tooling/iolin-npm/npm-pkg.pkl \
        -p gg_version="{{ gg_version }}" \
        -p gg_at="{{ gg_at }}" \
        -p gg_ts="{{ gg_ts }}" \
        -p gg_indent="{{ if _compact_json == "true" { "" } else { "  " } }}" > /dev/null
    @# Verify package.json was generated
    @if [ ! -f "dist/npm/package.json" ]; then echo "❌ ERROR: NPM package.json generation failed"; exit 1; fi
    @echo "   • TypeScript compilation"
    @npx tsc > /dev/null 2>&1
    @# Verify TypeScript compilation succeeded
    @if [ ! -f "dist/npm/index.js" ]; then echo "❌ ERROR: TypeScript compilation failed - no index.js generated"; exit 1; fi
    @cp dist/typescript/gg-iolin.d.ts dist/npm/gg-iolin.d.ts
    @echo "   • Copying LICENSE and README"
    @cp tooling/iolin-npm/LICENSE dist/npm/LICENSE
    @cp tooling/iolin-npm/README.md dist/npm/README.md
    @# Verify npm package structure
    @if [ ! -f "dist/npm/gg-iolin.d.ts" ]; then echo "❌ ERROR: NPM package build failed - missing type definitions"; exit 1; fi
    @if [ ! -f "dist/npm/package.json" ]; then echo "❌ ERROR: NPM package build failed - missing package.json"; exit 1; fi
    @if [ ! -f "dist/npm/LICENSE" ]; then echo "❌ ERROR: NPM package build failed - missing LICENSE"; exit 1; fi
    @if [ ! -f "dist/npm/README.md" ]; then echo "❌ ERROR: NPM package build failed - missing README.md"; exit 1; fi
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
    @if [ -f "dist/json/release.json" ]; then jq -C . dist/json/release.json; else echo "⚠️  Warning: No release.json found"; fi


# Run build verification tests
test-build:
    @echo "🧪 Running build verification tests"
    @node scripts/test-build.mjs
    @echo "✅ Build tests passed"# Clean all build artifacts
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

# Verify build integrity - run comprehensive checks
verify:
    @echo "🔍 Verifying build integrity..."
    @# Check dist directory structure
    @if [ ! -d "dist/json" ]; then echo "❌ ERROR: dist/json directory missing"; exit 1; fi
    @if [ ! -d "dist/typescript" ]; then echo "❌ ERROR: dist/typescript directory missing"; exit 1; fi
    @if [ ! -d "dist/npm" ]; then echo "❌ ERROR: dist/npm directory missing"; exit 1; fi
    @# Check critical files exist
    @if [ ! -f "dist/json/release.json" ]; then echo "❌ ERROR: release.json missing"; exit 1; fi
    @if [ ! -f "dist/typescript/index.ts" ]; then echo "❌ ERROR: TypeScript index.ts missing"; exit 1; fi
    @if [ ! -f "dist/npm/package.json" ]; then echo "❌ ERROR: NPM package.json missing"; exit 1; fi
    @# Validate JSON syntax
    @echo "   • Validating JSON files..."
    @find dist/json -name "*.json" -exec jq empty {} \; || (echo "❌ ERROR: Invalid JSON found"; exit 1)
    @# Check TypeScript compilation
    @echo "   • Checking TypeScript compilation..."
    @if [ -d "dist/typescript" ] && [ -f "dist/typescript/index.ts" ]; then npx tsc --noEmit || (echo "❌ ERROR: TypeScript type checking failed"; exit 1); else echo "   ✓ No TypeScript files to check"; fi
    @# Validate package.json
    @echo "   • Validating package.json..."
    @cd dist/npm && node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" || (echo "❌ ERROR: Invalid package.json"; exit 1)
    @echo "✅ Build integrity verified"

# Debug: dump all environment variables that Just can see
debug-env:
    @env | sort

# Show build statistics
stats:
    @echo "📊 Build Statistics"
    @echo "==================="
    @if [ -d "dist/json" ]; then echo "JSON files: $(find dist/json -name '*.json' | wc -l | tr -d ' ')"; fi
    @if [ -d "dist/typescript" ]; then echo "TypeScript files: $(find dist/typescript -name '*.ts' | wc -l | tr -d ' ')"; fi
    @if [ -d "dist/npm" ]; then echo "JavaScript files: $(find dist/npm -name '*.js' | wc -l | tr -d ' ')"; fi
    @if [ -f "dist/npm/package.json" ]; then echo "NPM package version: $(jq -r .version dist/npm/package.json)"; fi
    @echo "PklProject version: {{ gg_version }}"
    @echo "Build timestamp: {{ gg_at }}"
