#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node generate-ts.mjs <dist-dir>");
  process.exit(1);
}

const distDir = args[0];
const jsonDir = path.join(distDir, "json");
const tsDir = path.join(distDir, "typescript");

// Load prettier once for all operations
let prettier;
async function loadPrettier() {
  if (!prettier) {
    try {
      prettier = await import("prettier");
    } catch (error) {
      console.error(
        "❌ ERROR: Prettier not available - this is required for consistent formatting",
      );
      process.exit(1);
      prettier = null;
    }
  }
  return prettier;
}

async function formatWithPrettier(content) {
  const prettierInstance = await loadPrettier();
  if (!prettierInstance) {
    return content;
  }

  try {
    const formatted = await prettierInstance.format(content, {
      parser: "typescript",
      semi: true,
      singleQuote: false,
      trailingComma: "all",
      tabWidth: 2,
    });
    return formatted;
  } catch (error) {
    console.error("❌ ERROR: Prettier formatting failed:", error.message);
    process.exit(1);
  }
}

// Type mappings based on type/subtype combinations
function getTypeScriptType(entity) {
  // Check for specific subtype mappings first
  if (entity.type === "faction-ability") {
    if (entity.subtype === "talent") return "FactionTalent";
    if (entity.subtype === "topbar") return "FactionTopbar";
    if (entity.subtype === "passive") return "FactionPassive";
  }

  if (entity.type === "unit" && entity.subtype === "coop-commander") {
    return "CoopCommander";
  }

  // Use main type mapping
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
    upgrade: "Upgrade",
    mutator: "Entity", // fallback to base Entity
  };

  return TYPE_MAPPINGS[entity.type] || "Entity";
}

function sanitizeForTypeScript(obj) {
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

function generateEntityName(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

async function generateEntityFile(jsonFilePath, entity, outputPath) {
  const tsType = getTypeScriptType(entity);
  const sanitizedEntity = sanitizeForTypeScript(entity);
  const entityName = generateEntityName(entity.slug);

  // Calculate relative path from the output file to gg-iolin.d.ts
  const outputDir = path.dirname(outputPath);
  const typeDefsPath = path.join(tsDir, "gg-iolin.d.ts");
  let relativePath = path
    .relative(outputDir, typeDefsPath)
    .replace(/\\/g, "/")
    .replace(/\.d\.ts$/, "");

  // Ensure relative path starts with ./
  if (!relativePath.startsWith(".")) {
    relativePath = "./" + relativePath;
  }

  const content = `import type { ${tsType} } from "${relativePath}";

const ${entityName}: ${tsType} = ${JSON.stringify(sanitizedEntity, null, 2)} satisfies ${tsType};

export default ${entityName};
`;

  return await formatWithPrettier(content);
}

function getTypeScriptTypeFromSummary(type, subtype) {
  if (type === "faction-ability") {
    if (subtype === "talent") return "FactionTalent";
    if (subtype === "topbar") return "FactionTopbar";
    if (subtype === "passive") return "FactionPassive";
  }

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
    mutator: "Entity",
  };

  return TYPE_MAPPINGS[type] || "Entity";
}

function generateCollectionFile(
  typeKey,
  groupData,
  allEntries,
  collectionPath,
) {
  const imports = [];
  const entries = [];

  const exportNames = {
    unit: "Units",
    building: "Buildings",
    "add-on": "AddOns",
    ability: "Abilities",
    "faction-ability": "FactionAbilities",
    faction: "Factions",
    map: "Maps",
    "coop-mission": "CoopMissions",
    "coop-level": "CoopLevels",
    "coop-commander": "CoopCommanders",
    upgrade: "Upgrades",
    mutator: "Mutators",
  };

  const exportName =
    exportNames[typeKey] ||
    typeKey.charAt(0).toUpperCase() + typeKey.slice(1) + "s";

  // Calculate relative path from collection file to gg-iolin.d.ts
  const collectionDir = path.dirname(collectionPath);
  const typeDefsPath = path.join(tsDir, "gg-iolin.d.ts");
  let typeDefsRelativePath = path
    .relative(collectionDir, typeDefsPath)
    .replace(/\\/g, "/")
    .replace(/\.d\.ts$/, "");

  // Ensure relative path starts with ./
  if (!typeDefsRelativePath.startsWith(".")) {
    typeDefsRelativePath = "./" + typeDefsRelativePath;
  }

  groupData.entries.forEach((entry) => {
    const importName = generateEntityName(entry.slug);
    const relativePath = "./" + entry.id.replace(/\//g, "/");

    imports.push(`import ${importName} from "${relativePath}";`);
    entries.push({
      id: entry.id,
      importName: importName,
    });
  });

  const entriesStr = entries
    .map((entry) => `  "${entry.id}": ${entry.importName}`)
    .join(",\n");

  const content = `// Auto-generated ${exportName} collection
// This file is generated by generate-ts.mjs - do not edit manually

import type { ${groupData.tsType} } from "${typeDefsRelativePath}";

${imports.join("\n")}

export const ${exportName}: Record<string, ${groupData.tsType}> = {
${entriesStr}
};

export default ${exportName};
`;

  return content;
}

function generateIolinIndexFile(idxData, idxPath) {
  const idEntries = Object.entries(idxData.all).map(([id, summary]) => ({
    slug: summary.slug,
    id: id,
  }));

  const idEntriesStr = idEntries
    .map((entry) => `  "${entry.slug}": "${entry.id}"`)
    .join(",\n");

  const allEntriesStr = Object.entries(idxData.all)
    .map(
      ([id, summary]) =>
        `  "${id}": ${JSON.stringify(summary, null, 2).replace(/\n/g, "\n  ")}`,
    )
    .join(",\n");

  // Calculate relative path from idx file to gg-iolin.d.ts
  const idxDir = path.dirname(idxPath);
  const typeDefsPath = path.join(tsDir, "gg-iolin.d.ts");
  let typeDefsRelativePath = path
    .relative(idxDir, typeDefsPath)
    .replace(/\\/g, "/")
    .replace(/\.d\.ts$/, "");

  // Ensure relative path starts with ./
  if (!typeDefsRelativePath.startsWith(".")) {
    typeDefsRelativePath = "./" + typeDefsRelativePath;
  }

  const content = `// Auto-generated index - main entry point
// This file is generated by generate-ts.mjs - do not edit manually

import type { MetaIdx, MetaIdxSummary } from "${typeDefsRelativePath}";

// All entity summaries by ID
export const All: Record<string, MetaIdxSummary> = {
${allEntriesStr}
};

// Slug to ID mapping
export const Ids: Record<string, string> = {
${idEntriesStr}
};

const IolinIndex: MetaIdx = {
  all: All,
  ids: Ids,
};

export default IolinIndex;
`;

  return content;
}

function generateMetaFile(data, fileName, typeName, metaPath) {
  const exportName = fileName.charAt(0).toUpperCase() + fileName.slice(1);

  // Calculate relative path from meta file to gg-iolin.d.ts
  const metaDir = path.dirname(metaPath);
  const typeDefsPath = path.join(tsDir, "gg-iolin.d.ts");
  let typeDefsRelativePath = path
    .relative(metaDir, typeDefsPath)
    .replace(/\\/g, "/")
    .replace(/\.d\.ts$/, "");

  // Ensure relative path starts with ./
  if (!typeDefsRelativePath.startsWith(".")) {
    typeDefsRelativePath = "./" + typeDefsRelativePath;
  }

  const content = `// Auto-generated from ${fileName}.json

import type { ${typeName} } from "${typeDefsRelativePath}";

const ${exportName}: ${typeName} = ${JSON.stringify(data, null, 2)};

export default ${exportName};
`;

  return content;
}

function generateIndexFile() {
  const content = `// Auto-generated main index file
// This file is generated by generate-ts.mjs - do not edit manually

import Tags from "./tags";
import Release from "./release";
import IolinIndex from "./iolin-index";

// Export meta files
export { Tags, Release, IolinIndex };

// Default export with meta
export default {
  Tags,
  Release,
  IolinIndex,
};
`;

  return content;
}

function generateAllFile(typeGroups) {
  const imports = [];
  const exports = [];
  const loadFunctions = [];

  // Generate imports and exports for each collection
  Object.entries(typeGroups).forEach(([typeKey, groupData]) => {
    const fileName =
      typeKey === "add-on"
        ? "addons"
        : typeKey === "faction-ability"
          ? "factionabilities"
          : typeKey === "coop-mission"
            ? "coop-missions"
            : typeKey === "coop-level"
              ? "coop-levels"
              : typeKey === "coop-commander"
                ? "coop-commanders"
                : typeKey + "s";

    const exportName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
    const safeName = exportName.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    imports.push(`import ${safeName} from "./${fileName}";`);
    exports.push(safeName);

    // Create load function name
    const singularName =
      typeKey === "add-on"
        ? "AddOn"
        : typeKey === "faction-ability"
          ? "FactionAbility"
          : typeKey === "coop-mission"
            ? "CoopMission"
            : typeKey === "coop-level"
              ? "CoopLevel"
              : typeKey === "coop-commander"
                ? "CoopCommander"
                : typeKey.charAt(0).toUpperCase() + typeKey.slice(1);

    const functionName = `load${singularName}`;
    const safeExportName = exportName.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    loadFunctions.push(`
export function ${functionName}(id: string): ${groupData.tsType} | undefined {
  return ${safeExportName}[id];
}`);
  });

  const content = `// Auto-generated all collections and load API
// This file is generated by generate-ts.mjs - do not edit manually

import type { ${Object.values(typeGroups)
    .map((g) => g.tsType)
    .join(", ")} } from "./gg-iolin";

${imports.join("\n")}

// Export all collections
export {
  ${exports.join(",\n  ")}
};

// Load functions for each entity type${loadFunctions.join("")}

// Generic load function that searches all collections
export function loadEntity(id: string): any {
  const collections = [${exports.join(", ")}];
  for (const collection of collections) {
    if (collection[id]) {
      return collection[id];
    }
  }
  return undefined;
}

// All collections in one object
export const All = {
  ${exports.join(",\n  ")}
};

export default All;
`;

  return content;
}

async function copyTypeDefinitions() {
  const sourceTypes = path.join(
    __dirname,
    "..",
    "tooling",
    "iolin-npm",
    "gg-iolin.d.ts",
  );
  const destTypes = path.join(tsDir, "gg-iolin.d.ts");

  try {
    await fs.copyFile(sourceTypes, destTypes);
  } catch (error) {
    console.error(`❌ ERROR: Could not copy type definitions:`, error.message);
    process.exit(1);
  }
}

async function findAllJsonFiles(dir, prefix = "") {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = prefix ? path.join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      const subFiles = await findAllJsonFiles(fullPath, relativePath);
      files.push(...subFiles);
    } else if (entry.name.endsWith(".json") && !entry.name.endsWith(".d.ts")) {
      files.push({
        name: entry.name,
        path: fullPath,
        relativePath: relativePath,
      });
    }
  }

  return files;
}

async function main() {
  let typeGroups = {};

  try {
    // Ensure typescript directory exists
    await fs.mkdir(tsDir, { recursive: true });

    // Copy type definitions
    await copyTypeDefinitions();

    // Find all JSON files recursively
    const allJsonFiles = await findAllJsonFiles(jsonDir);
    const metaFiles = [
      "tags",
      "release",
      "iolin-index",
      "all",
      "tags",
      "tagged",
    ];

    // Filter out meta files
    const entityJsonFiles = allJsonFiles.filter(
      (file) => !metaFiles.some((meta) => file.name === `${meta}.json`),
    );

    if (entityJsonFiles.length === 0) {
      console.error("❌ ERROR: No entity JSON files found to process");
      process.exit(1);
    }

    // Process individual entity files concurrently
    const entityPromises = entityJsonFiles.map(async (jsonFile) => {
      try {
        const jsonContent = await fs.readFile(jsonFile.path, "utf8");
        const entity = JSON.parse(jsonContent);

        // Skip meta files that shouldn't have TypeScript files
        const fileName = path.basename(jsonFile.name, ".json");
        if (metaFiles.includes(fileName)) {
          return;
        }

        if (!entity.type || !entity.slug) {
          console.error(
            `❌ ERROR: Invalid entity in ${jsonFile.name}: missing type or slug`,
          );
          process.exit(1);
        }

        // Determine output path based on entity.id
        const outputPath = path.join(tsDir, `${entity.id}.ts`);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Generate TypeScript content
        const tsContent = await generateEntityFile(
          jsonFile.path,
          entity,
          outputPath,
        );

        // Write TypeScript file
        await fs.writeFile(outputPath, tsContent);
      } catch (error) {
        console.error(
          `❌ ERROR: Failed processing ${jsonFile.name}:`,
          error.message,
        );
        process.exit(1);
      }
    });

    // Process all entity files concurrently
    const results = await Promise.allSettled(entityPromises);
    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      console.error(
        `❌ ERROR: ${failures.length} entity files failed to process`,
      );
      failures.forEach((f) => console.error(f.reason));
      process.exit(1);
    }

    // Load iolin-index data for collections
    const idxJsonPath = path.join(jsonDir, "iolin-index.json");
    try {
      const idxJsonContent = await fs.readFile(idxJsonPath, "utf8");
      const idxData = JSON.parse(idxJsonContent);

      // Generate collections
      Object.entries(idxData.all).forEach(([id, summary]) => {
        const tsType = getTypeScriptTypeFromSummary(
          summary.type,
          summary.subtype,
        );
        const typeKey = summary.type;

        if (!typeGroups[typeKey]) {
          typeGroups[typeKey] = {
            entries: [],
            tsType: tsType,
          };
        }

        typeGroups[typeKey].entries.push({
          id: id,
          slug: summary.slug,
        });
      });

      // Generate collection files
      const collectionPromises = Object.entries(typeGroups).map(
        async ([typeKey, groupData]) => {
          const fileName =
            typeKey === "add-on"
              ? "addons"
              : typeKey === "faction-ability"
                ? "factionabilities"
                : typeKey === "coop-mission"
                  ? "coop-missions"
                  : typeKey === "coop-level"
                    ? "coop-levels"
                    : typeKey === "coop-commander"
                      ? "coop-commanders"
                      : typeKey + "s";

          const collectionPath = path.join(tsDir, `${fileName}.ts`);
          const collectionContent = generateCollectionFile(
            typeKey,
            groupData,
            idxData.all,
            collectionPath,
          );
          const formattedContent = await formatWithPrettier(collectionContent);
          await fs.writeFile(collectionPath, formattedContent);
        },
      );

      const collectionResults = await Promise.allSettled(collectionPromises);
      const collectionFailures = collectionResults.filter(
        (r) => r.status === "rejected",
      );
      if (collectionFailures.length > 0) {
        console.error(
          `❌ ERROR: ${collectionFailures.length} collection files failed to generate`,
        );
        collectionFailures.forEach((f) => console.error(f.reason));
        process.exit(1);
      }

      // Generate iolin-index.ts
      const idxPath = path.join(tsDir, "iolin-index.ts");
      const idxContent = generateIolinIndexFile(idxData, idxPath);
      const formattedIdxContent = await formatWithPrettier(idxContent);
      await fs.writeFile(idxPath, formattedIdxContent);
    } catch (error) {
      console.error(
        `❌ ERROR: Could not process iolin-index data: ${error.message}`,
      );
      process.exit(1);
    }

    // Generate meta files
    const metaFileConfigs = [
      { file: "tags", type: "TagsInfo" },
      { file: "tagged", type: "TaggedInfo" },
      { file: "release", type: "MetaRelease" },
    ];

    const metaPromises = metaFileConfigs.map(async ({ file, type }) => {
      const jsonPath = path.join(jsonDir, `${file}.json`);
      try {
        const jsonContent = await fs.readFile(jsonPath, "utf8");
        const data = JSON.parse(jsonContent);
        const metaPath = path.join(tsDir, `${file}.ts`);
        const content = generateMetaFile(data, file, type, metaPath);
        const formattedContent = await formatWithPrettier(content);
        await fs.writeFile(metaPath, formattedContent);
      } catch (error) {
        console.error(
          `❌ ERROR: Could not generate ${file}.ts:`,
          error.message,
        );
        process.exit(1);
      }
    });

    const metaResults = await Promise.allSettled(metaPromises);
    const metaFailures = metaResults.filter((r) => r.status === "rejected");
    if (metaFailures.length > 0) {
      console.error(
        `❌ ERROR: ${metaFailures.length} meta files failed to generate`,
      );
      metaFailures.forEach((f) => console.error(f.reason));
      process.exit(1);
    }

    // Generate all.ts with collections and load API
    const allContent = generateAllFile(typeGroups);
    const formattedAllContent = await formatWithPrettier(allContent);
    await fs.writeFile(path.join(tsDir, "all.ts"), formattedAllContent);

    // Generate main index.ts
    const indexContent = generateIndexFile();
    const formattedIndexContent = await formatWithPrettier(indexContent);
    await fs.writeFile(path.join(tsDir, "index.ts"), formattedIndexContent);

    // Final validation
    const requiredFiles = [
      path.join(tsDir, "index.ts"),
      path.join(tsDir, "all.ts"),
      path.join(tsDir, "gg-iolin.d.ts"),
      path.join(tsDir, "iolin-index.ts"),
    ];

    for (const file of requiredFiles) {
      try {
        await fs.access(file);
      } catch (error) {
        console.error(`❌ ERROR: Required file not generated: ${file}`);
        process.exit(1);
      }
    }

    // Silent success - only output on failure
  } catch (error) {
    console.error("Error generating TypeScript files:", error.message);
    process.exit(1);
  }
}

main();
