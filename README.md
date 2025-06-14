# Data Engine for ZeroSpace

This will be open source soon, I'm just too busy to do the associated work right now, but wanted to show it off to the pkl community :)

This is an unconventional (not that pkl's old enough to have a lot of conventions, perhaps unintentional?) use case.

I'm making a dataset for [the upcoming RTS ZeroSpace](https://playzerospace.com) currently in backer-only Alpha phases, and [our fan site](https://zerospace.gg) to support the community.

## Build System

The project uses a multi-stage build system that generates:

1. **JSON files** (`dist/json/`) - Raw data output from PKL files
2. **TypeScript files** (`dist/typescript/`) - Generated TypeScript modules with proper typing
3. **JavaScript files** (`dist/npm/`) - Compiled JavaScript ready for npm distribution

### Available Build Targets

```bash
# Complete build (JSON + TypeScript + JavaScript)
make all

# Individual build stages
make json        # Build JSON files only
make typescript  # Generate TypeScript files (requires JSON)
make npm         # Compile to JavaScript (requires TypeScript)

# Utility targets
make clean       # Remove all dist/ files
make clean-npm   # Remove only dist/npm/ files  
make test        # Run build verification tests
make build-report # Show build statistics
```

### NPM Scripts

```bash
# TypeScript compilation only
npm run tsc              # Compile TypeScript to JavaScript
npm run tsc:watch        # Watch mode compilation

# Full builds
npm run build:npm        # Clean + compile + copy definitions
npm run build:full       # Complete build via make

# Testing and cleanup
npm test                 # Run build verification
npm run clean:npm        # Clean npm output
npm run clean:all        # Clean all output
```

### Output Structure

- `dist/json/` - PKL-generated JSON files
- `dist/typescript/` - Generated TypeScript modules with full type safety
- `dist/npm/` - Compiled JavaScript with declaration files, ready for import

The TypeScript generation creates strongly-typed modules for all game entities (units, buildings, factions, etc.) with proper type definitions from `gg-iolin.d.ts`.
