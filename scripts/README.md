# TypeScript Generation Scripts

These scripts automatically generate TypeScript files from PKL/JSON output, providing type-safe access to game data.

## Scripts

### `build-ts-file.js`

Converts individual JSON files to TypeScript with proper type annotations.

**Usage:**
```bash
node scripts/build-ts-file.js <json-file-path> <output-dir>
```

**Example:**
```bash
node scripts/build-ts-file.js dev-dist/json/faction/legion/hero/galavax.json dev-dist
```

This generates `dev-dist/typescript/faction/legion/hero/galavax.ts` with content like:
```typescript
import type { Unit } from "../gg-iolin";

const Galavax: Unit = {
  // ... JSON data ...
} satisfies Unit;

export default Galavax;
```

### `build-ts-index.js`

Generates the main TypeScript index file that exports all entities organized by type.

**Usage:**
```bash
node scripts/build-ts-index.js <dist-dir>
```

**Example:**
```bash
node scripts/build-ts-index.js dev-dist
```

This creates:
- `dev-dist/typescript/index.ts` - Main exports with proper typing
- `dev-dist/typescript/tags.ts` - Tags metadata
- `dev-dist/typescript/release.ts` - Release info
- `dev-dist/typescript/idx.ts` - Index metadata (used for type inference)
- Copies `ext/gg-iolin.d.ts` to the typescript directory

## Makefile Integration

The scripts are integrated into the Makefile for easy use:

### Development Build with TypeScript
```bash
make dev-ts
# or
make ts-dev
```

### Production Build with TypeScript
```bash
make dist-ts
# or  
make ts-dist
```

## Generated Structure

The TypeScript build creates:

```
DIST_DIR/typescript/
├── index.ts              # Main exports file
├── gg-iolin.d.ts         # Type definitions
├── tags.ts               # Tags metadata
├── release.ts            # Release info
├── idx.ts                # Index metadata
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

## Usage in TypeScript Projects

```typescript
// Import everything
import GameData from "./dist/typescript";

// Import specific collections
import { Units, Buildings, Factions } from "./dist/typescript";

// Import specific entities
import Galavax from "./dist/typescript/faction/legion/hero/galavax";

// Access by ID
const galavax = GameData.All["faction/legion/hero/galavax"];

// Get slug from ID
const slug = GameData.Ids["galavax"]; // "faction/legion/hero/galavax"
```

## Type Inference

The scripts automatically infer TypeScript types using the idx metadata:

1. **Data source**: Uses `meta/idx.pkl` output to determine types for all entities
2. **Primary type mapping**: `unit` → `Unit`, `building` → `Building`, etc.
3. **Subtype specialization**: 
   - `faction-ability` + `talent` → `FactionTalent`
   - `faction-ability` + `topbar` → `FactionTopbar`
   - `faction-ability` + `passive` → `FactionPassive`
4. **Proper typing**: Each collection is strongly typed (no `any` types)
   - `Units: Record<string, Unit>`
   - `Buildings: Record<string, Building>`
   - `Factions: Record<string, Faction>`

## Dependencies

- **prettier**: Used for code formatting
- **Node.js**: Runtime for the scripts

Install with:
```bash
npm install
```

## File Pattern Matching

The Makefile uses pattern rules for efficient builds:

- `dev-dist/typescript/%.ts: dev-dist/json/%.json` - Individual file conversion
- TypeScript index depends on all JSON files being built first
- Make's dependency tracking ensures only changed files are rebuilt

## Notes

- All TypeScript files are formatted with Prettier
- The `satisfies` operator ensures type safety while preserving literal types
- Import paths are automatically calculated relative to the index file
- Meta files (tags, release, idx) are converted from their respective JSON files
- Type collections are generated dynamically from idx data, ensuring proper typing
- Each export group (`Units`, `Buildings`, etc.) uses specific TypeScript interfaces