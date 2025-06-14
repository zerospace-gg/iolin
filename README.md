# iolin - ZeroSpace Data Engine

A comprehensive data processing engine for [ZeroSpace](https://playzerospace.com), the upcoming real-time strategy game. This is a community project by baby shoGGoth and [ZeroSpace.gg](https://zerospace.gg) and is not officially affiliated with the game developers. This repository contains the tooling and data definitions that power community tools and fan sites.

## What is iolin?

iolin is a [Pkl](https://pkl-lang.org/)-based data engine that extracts, validates, and transforms ZeroSpace game data into multiple formats for community use. It generates:

- **JSON data files** for web applications and APIs
- **TypeScript modules** with full type safety for JavaScript/Node.js projects
- **NPM package** (`@zerospacegg/iolin`) for easy integration

## Quick Start

### Using the NPM Package

```bash
npm install @zerospacegg/iolin
```

```typescript
import { IolinIndex } from '@zerospacegg/iolin';
import { loadUnit, loadBuilding, Units, Buildings } from '@zerospacegg/iolin/all';

// Load specific entities
const commando = loadUnit('faction/protectorate/unit/commando');
const barracks = loadBuilding('faction/protectorate/building/prot-barracks');

// Access all collections
console.log(Object.keys(Units)); // All unit IDs
console.log(Buildings['faction/protectorate/building/operating-tower']); // Specific building data
// load an entity's metadata from the index.
console.log(IolinIndex.all['faction/protectorate/commander/mera-coop'])
```

### Development Setup

```bash
# Install dependencies
npm install

# Install just (build tool)
brew install just  # macOS
# or curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash

# Run full build
just all

# Development workflow
just dev          # Quick rebuild
just watch        # TypeScript watch mode
just clean        # Clean all outputs
```

## Build System

The project uses a multi-stage build pipeline:

### Available Commands

```bash
# Main builds
just all          # Complete build: JSON + tests + TypeScript + NPM
just json         # Generate JSON files from Pkl sources
just typescript   # Generate TypeScript modules (requires json)
just npm          # Build NPM package (requires typescript)

# Development
just dev          # Quick development build (json + typescript)
just watch        # TypeScript watch mode
just test         # Run Pkl tests

# Utilities
just clean        # Remove all build artifacts
just clean-npm    # Remove only NPM artifacts
just verify       # Verify build integrity
just stats        # Show build statistics
just force        # Clean + rebuild everything
```

### Output Structure

```
dist/
├── json/              # Pkl-generated JSON files
│   ├── units/         # Unit data files
│   ├── buildings/     # Building data files
│   ├── factions/      # Faction data files
│   └── ...
├── typescript/        # Generated TypeScript modules
│   ├── index.ts       # Main entry point
│   ├── all.ts         # Collections + load API
│   ├── units.ts       # Unit collection
│   └── ...
└── npm/               # Compiled NPM package
    ├── package.json
    ├── index.js
    ├── *.d.ts         # Type definitions
    └── ...
```

## Data Schema

All game entities follow a consistent structure with strong typing:

```typescript
interface Unit {
  id: string;
  slug: string;
  name: string;
  type: "unit";
  subtype?: string;
  faction: string;
  stats: UnitStats;
  abilities: string[];
  // ... and more
}
```

Entity types include:
- **Units** - All game units (marines, workers, etc.)
- **Buildings** - Structures and production facilities
- **Factions** - Playable factions (Protectorate, Grell, Legion, Xol), as well as mercenary and non-player factions
- **Abilities** - Unit and faction abilities
- **Maps** - Multiplayer and campaign maps
- **Upgrades** - Research upgrades
- **Coop Content** - Cooperative mission data

## GitHub Actions

Automated CI/CD pipeline handles:

- **CI**: Tests, builds, and validates on every PR/push
- **Auto-versioning**: Patch version bumps on main branch merges
- **NPM Publishing**: Automatic releases to `@zerospacegg/iolin`
- **GitHub Releases**: Release artifacts including JSON data bundles

## Contributing

This is primarily a data extraction and processing repository maintained by the ZeroSpace.gg community. The game data itself comes from ZeroSpace's files and is not editable here.

For bugs or feature requests related to the tooling:
1. Open an issue describing the problem
2. PRs welcome for build system improvements
3. See existing issues for contribution opportunities

## Licensing

- **Code & Tooling**: ISC License (see [LICENSE](LICENSE))
- **Game Data**: CC0 Public Domain (see npm package for details)

The extracted ZeroSpace game data is released under CC0 to enable community tool development, while the processing code and tooling remain under ISC license. This is a community project and is not officially affiliated with ZeroSpace or Industrial Annihilation.

## Related Projects

- [ZeroSpace Official Site](https://playzerospace.com) - The game itself
- [zerospace.gg](https://zerospace.gg) - Community fan site powered by iolin
- [Pkl Language](https://pkl-lang.org/) - The configuration language powering this engine

---

Built with ❤️ by baby shoGGoth and ZeroSpace.gg for the ZeroSpace community
