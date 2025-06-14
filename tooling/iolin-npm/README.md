# @zerospacegg/iolin

A community data package for [ZeroSpace](https://playzerospace.com), providing comprehensive game data for community tools and applications. This is a community project by baby shoGGoth and ZeroSpace.gg and is not officially affiliated with ZeroSpace or Industrial Annihilation.

## Installation

```bash
npm install @zerospacegg/iolin
```

## Quick Start

```typescript
import { loadUnit, loadBuilding, Units, Buildings, All } from '@zerospacegg/iolin/all';

// Load specific entities by ID
const marine = loadUnit('terran-marine');
const barracks = loadBuilding('terran-barracks');

// Access complete collections
console.log(Object.keys(Units));     // All unit IDs
console.log(Buildings['terran-command-center']); // Specific building

// Generic loader
import { loadEntity } from '@zerospacegg/iolin/all';
const entity = loadEntity('terran-marine'); // Works with any entity type
```

## What's Included

This package contains complete ZeroSpace game data:

- **Units** (76 units) - All playable units with stats, abilities, and metadata
- **Buildings** (44 buildings) - Structures, production facilities, and defensive installations  
- **Factions** (13 factions) - Playable factions with unique attributes
- **Abilities** - Unit abilities, faction abilities, and special powers
- **Maps** (9 maps) - Multiplayer and campaign maps
- **Upgrades** - Research trees and upgrade paths
- **Coop Content** - Cooperative missions, commanders, and levels

## API Reference

### Collections

All entity collections are available as typed objects:

```typescript
import { Units, Buildings, Factions, Abilities, Maps } from '@zerospacegg/iolin/all';

// Each collection is a Record<string, EntityType>
Units['terran-marine']          // Unit data
Buildings['terran-barracks']    // Building data
Factions['terran']              // Faction data
```

### Load Functions

Convenient loader functions for each entity type:

```typescript
// Type-safe loaders
loadUnit(id: string): Unit | undefined
loadBuilding(id: string): Building | undefined
loadFaction(id: string): Faction | undefined
loadAbility(id: string): Ability | undefined
loadMap(id: string): RTSMap | undefined
loadUpgrade(id: string): Upgrade | undefined
loadCoopMission(id: string): CoopMission | undefined
loadCoopLevel(id: string): CoopLevel | undefined
loadCoopCommander(id: string): CoopCommander | undefined

// Generic loader (searches all collections)
loadEntity(id: string): any
```

### Entity Structure

All entities follow a consistent structure:

```typescript
interface BaseEntity {
  id: string;           // Unique identifier
  slug: string;         // URL-friendly name
  name: string;         // Display name
  type: string;         // Entity type (unit, building, etc.)
  subtype?: string;     // Optional subtype
  description?: string; // Flavor text
  // ... type-specific properties
}
```

### Example: Unit Data

```typescript
interface Unit extends BaseEntity {
  type: "unit";
  faction: string;
  stats: {
    health: number;
    shields?: number;
    armor: number;
    damage: number;
    // ... more stats
  };
  abilities: string[];
  cost: {
    minerals: number;
    gas: number;
    supply: number;
    buildTime: number;
  };
  // ... additional unit properties
}
```

## Usage Examples

### Building a Unit Browser

```typescript
import { Units, loadFaction } from '@zerospacegg/iolin/all';

// Get all Terran units
const terranUnits = Object.values(Units)
  .filter(unit => unit.faction === 'terran');

// Display unit info
terranUnits.forEach(unit => {
  console.log(`${unit.name}: ${unit.stats.health} HP, ${unit.cost.minerals} minerals`);
});
```

### Creating a Faction Overview

```typescript
import { Factions, Units, Buildings } from '@zerospacegg/iolin/all';

function getFactionInfo(factionId: string) {
  const faction = Factions[factionId];
  const units = Object.values(Units).filter(u => u.faction === factionId);
  const buildings = Object.values(Buildings).filter(b => b.faction === factionId);
  
  return {
    faction,
    unitCount: units.length,
    buildingCount: buildings.length,
    units,
    buildings
  };
}

const terranInfo = getFactionInfo('terran');
```

### Map Analysis

```typescript
import { Maps } from '@zerospacegg/iolin/all';

// Find all 2v2 maps
const team2v2Maps = Object.values(Maps)
  .filter(map => map.maxPlayers === 4);

team2v2Maps.forEach(map => {
  console.log(`${map.name}: ${map.size} - ${map.description}`);
});
```

## TypeScript Support

This package includes full TypeScript definitions for all game entities. Import types directly:

```typescript
import type { Unit, Building, Faction, Ability } from '@zerospacegg/iolin';

function processUnit(unit: Unit) {
  // Full type safety and IntelliSense
  console.log(unit.stats.health);
}
```

## Data Updates

This package is automatically updated with each ZeroSpace game update. Version numbers follow the pattern:

- **Major.Minor**: Follows ZeroSpace version updates
- **Patch**: Incremental data updates and fixes

## License

The game data content in this package is released under [CC0 Public Domain](https://creativecommons.org/publicdomain/zero/1.0/) to enable community tool development.

ZeroSpace is developed by Industrial Annihilation. This community project extracts and processes publicly available game data to enable community tool development. The game and its assets remain the property of their respective owners.

## Links

- [ZeroSpace Official Site](https://playzerospace.com)
- [Community Fan Site](https://zerospace.gg)
- [Source Repository](https://github.com/zerospace-gg/iolin)
- [Issue Tracker](https://github.com/zerospace-gg/iolin/issues)

## Support

For questions about this data package:
- Check existing [GitHub Issues](https://github.com/zerospace-gg/iolin/issues)
- Open a new issue for bugs or feature requests
- Join the ZeroSpace community for general discussion

---

*This package is a community project by baby shoGGoth and ZeroSpace.gg and is not officially affiliated with ZeroSpace or Industrial Annihilation.*