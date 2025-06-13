#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node build-ts-file.js <json-file-path> <output-dir>");
  process.exit(1);
}

const jsonFilePath = args[0];
const outputDir = args[1];

// Type mappings based on type/subtype combinations
const TYPE_MAPPINGS = {
  unit: "Unit",
  building: "Building",
  "add-on": "AddOn",
  ability: "Ability",
  "faction-ability": "FactionAbility",
  faction: "Faction",
  map: "RTSMap",
  "coop-mission": "CoopMission",
  "coop-level": "CoopLevel",
  "coop-commander": "CoopCommander",
  upgrade: "Upgrade",
  mutator: "Entity", // fallback to base Entity
};

function getTypeScriptType(entity) {
  // Check for specific subtype mappings first
  if (entity.type === "faction-ability") {
    if (entity.subtype === "talent") return "FactionTalent";
    if (entity.subtype === "topbar") return "FactionTopbar";
    if (entity.subtype === "passive") return "FactionPassive";
  }

  // Use main type mapping
  return TYPE_MAPPINGS[entity.type] || "Entity";
}

function getImportPath(tsType) {
  // All types are exported from the main d.ts file
  return "../gg-iolin";
}

function sanitizeForTypeScript(obj) {
  // Handle any special cases where JSON might not be valid TS
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "object" && !Array.isArray(obj)) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeForTypeScript(value);
    }
    return result;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForTypeScript(item));
  }

  return obj;
}

function generateTypeScriptFile(entity, tsType) {
  const importPath = getImportPath(tsType);
  const sanitizedEntity = sanitizeForTypeScript(entity);
  const entityName = entity.slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  const content = `import type { ${tsType} } from "${importPath}";

const ${entityName}: ${tsType} = ${JSON.stringify(sanitizedEntity, null, 2)} satisfies ${tsType};

export default ${entityName};
`;

  return content;
}

async function formatWithPrettier(content) {
  try {
    const prettier = require("prettier");
    const formatted = await prettier.format(content, {
      parser: "typescript",
      semi: true,
      singleQuote: false,
      trailingComma: "all",
      tabWidth: 2,
    });
    return formatted;
  } catch (error) {
    console.warn("Warning: Prettier formatting failed, using original content");
    return content;
  }
}

async function main() {
  try {
    // Read and parse JSON file
    const jsonContent = fs.readFileSync(jsonFilePath, "utf8");
    const entity = JSON.parse(jsonContent);

    // Skip meta files (tags, release, idx, all, tagged) - they're handled in index script
    const fileName = path.basename(jsonFilePath, ".json");
    if (["tags", "release", "idx", "all", "tagged"].includes(fileName)) {
      console.log(`Skipping meta file: ${jsonFilePath}`);
      return;
    }

    if (!entity.type || !entity.slug) {
      console.error(`Invalid entity in ${jsonFilePath}: missing type or slug`);
      process.exit(1);
    }

    // Determine TypeScript type
    const tsType = getTypeScriptType(entity);

    // Generate TypeScript content
    const tsContent = generateTypeScriptFile(entity, tsType);
    const formattedContent = await formatWithPrettier(tsContent);

    // Determine output path - replace .json with .ts and put in typescript subdir
    const jsonDir = path.join(outputDir, "json");
    const relativeJsonPath = path.relative(jsonDir, jsonFilePath);
    const tsFileName = relativeJsonPath.replace(/\.json$/, ".ts");
    const outputPath = path.join(outputDir, "typescript", tsFileName);

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Write TypeScript file
    fs.writeFileSync(outputPath, formattedContent);

    console.log(`Generated: ${outputPath}`);
  } catch (error) {
    console.error(`Error processing ${jsonFilePath}:`, error.message);
    process.exit(1);
  }
}

main();
