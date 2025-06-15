# Build Scripts

This directory contains scripts for the TypeScript build pipeline.

## Scripts

### `generate-ts.mjs`

The main TypeScript generation script that converts JSON files from PKL output into fully-typed TypeScript modules.

**Usage:**
```bash
node tooling/build/generate-ts.mjs <dist-dir>
```

**Example:**
```bash
node tooling/build/generate-ts.mjs dist
```

This processes all JSON files in `dist/json/` and generates:
- Individual entity TypeScript files with proper type annotations
- Collection files (units.ts, buildings.ts, factions.ts, etc.)
- Main index.ts file with all exports
- Metadata files (tags.ts, release.ts, idx.ts)

### `test-build.mjs`

Automated test script that verifies the complete TypeScript build pipeline is working correctly.

**Usage:**
```bash
node tooling/build/test-build.mjs
# or via npm script:
npm test
```

This script validates:
- All expected files are generated
- JavaScript compilation was successful
- Generated modules can be imported correctly
- TypeScript definitions are valid

## Just Integration

The scripts are integrated into the main build system:

```bash
just typescript    # Generate TypeScript files
just npm          # Compile TypeScript to JavaScript
just all          # Complete build pipeline
```

## Generated Structure

The build pipeline creates two output directories:

### TypeScript Output (`dist/typescript/`)
```
dist/typescript/
├── index.ts              # Main exports file
├── gg-iolin.d.ts         # Type definitions
├── tags.ts               # Tags metadata
├── release.ts            # Release info
├── idx.ts                # Index metadata
├── units.ts              # Units collection
├── buildings.ts          # Buildings collection
├── factions.ts           # Factions collection
└── faction/
    ├── grell/
    │   ├── hero/
    │   │   └── vynthra.ts
    │   └── unit/
    │       └── seedling.ts
    └── legion/
        └── hero/
            └── galavax.ts
```

### JavaScript Output (`dist/npm/`)
```
dist/npm/
├── index.js              # Compiled main exports
├── index.d.ts            # Generated declarations
├── gg-iolin.d.ts         # Core type definitions
├── units.js              # Compiled units collection
├── units.d.ts            # Units declarations
└── faction/              # Compiled entity files
    └── ...
```

## Usage Examples

### TypeScript (from dist/typescript/)
```typescript
// Import everything
import GameData from "./dist/typescript";

// Import specific collections
import { Units, Buildings, Factions } from "./dist/typescript";

// Import specific entities
import Galavax from "./dist/typescript/faction/legion/hero/galavax";
```

### JavaScript/Node.js (from dist/npm/)
```javascript
// CommonJS
const { Units, Buildings, Factions } = require('./dist/npm');

// ES Modules
import { Units, Buildings, Factions } from './dist/npm/index.js';

// Access data
const allUnits = Units;
const grellFaction = Factions["faction/grell"];
```

## Features

### Type Inference
The generation script automatically infers TypeScript types:

1. **Data source**: Uses `meta/idx.pkl` output to determine types for all entities
2. **Primary type mapping**: `unit` → `Unit`, `building` → `Building`, etc.
3. **Subtype specialization**: 
   - `faction-ability` + `talent` → `FactionTalent`
   - `faction-ability` + `topbar` → `FactionTopbar`
   - `faction-ability` + `passive` → `FactionPassive`
4. **Strong typing**: Each collection is properly typed
   - `Units: Record<string, Unit>`
   - `Buildings: Record<string, Building>`
   - `Factions: Record<string, Faction>`

### Code Quality
- All TypeScript files are formatted with Prettier
- Uses `satisfies` operator for type safety while preserving literal types
- Import paths are automatically calculated
- Full source map generation for debugging

### Build Integration
- Integrated with Makefile dependency tracking
- Only rebuilds changed files
- Automatic copying of type definitions
- Build verification tests

## Dependencies

Install required packages:
```bash
npm install
```

Required:
- **typescript**: TypeScript compiler
- **prettier**: Code formatting
- **@types/node**: Node.js type definitions