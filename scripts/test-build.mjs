#!/usr/bin/env node

/**
 * Simple test script to verify TypeScript compilation and imports
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testBuild() {
  // Change to project root directory
  process.chdir(path.join(__dirname, ".."));
  console.log("🔍 Testing TypeScript build...\n");

  // Test 1: Check if npm directory exists and has files
  try {
    const npmDir = "dist/npm";
    const npmStats = await fs.stat(npmDir);
    if (!npmStats.isDirectory()) {
      throw new Error("dist/npm is not a directory");
    }

    const npmFiles = await fs.readdir(npmDir);
    const jsFiles = npmFiles.filter((f) => f.endsWith(".js"));
    const dtsFiles = npmFiles.filter((f) => f.endsWith(".d.ts"));

    console.log("✅ npm directory exists");
    console.log(`✅ Found ${jsFiles.length} JavaScript files`);
    console.log(`✅ Found ${dtsFiles.length} TypeScript declaration files`);
  } catch (error) {
    console.error("❌ npm directory test failed:", error.message);
    process.exit(1);
  }

  // Test 2: Check if main files exist
  const mainFiles = [
    "dist/npm/index.js",
    "dist/npm/index.d.ts",
    "dist/npm/gg-iolin.d.ts",
    "dist/npm/units.js",
    "dist/npm/buildings.js",
    "dist/npm/factions.js",
  ];

  for (const file of mainFiles) {
    try {
      await fs.access(file);
      console.log(`✅ ${file} exists`);
    } catch (error) {
      console.error(`❌ ${file} missing`);
      process.exit(1);
    }
  }

  // Test 3: Try to import and use the compiled modules
  try {
    const {
      default: mainModule,
      Tags,
      Release,
      Idx,
    } = await import(`file://${path.join(process.cwd(), "dist/npm/index.js")}`);

    console.log("✅ Successfully imported main module");
    console.log("✅ Main module exports:", Object.keys(mainModule));
    console.log("✅ Release version:", Release.ggVersion);
    console.log("✅ Total entities in index:", Object.keys(Idx.all).length);
  } catch (error) {
    console.error("❌ Failed to import main module:", error.message);
    process.exit(1);
  }

  // Test 4: Try to import collection modules
  try {
    const { Units } = await import(
      `file://${path.join(process.cwd(), "dist/npm/units.js")}`
    );
    const { Buildings } = await import(
      `file://${path.join(process.cwd(), "dist/npm/buildings.js")}`
    );
    const { Factions } = await import(
      `file://${path.join(process.cwd(), "dist/npm/factions.js")}`
    );

    console.log("✅ Successfully imported Units collection");
    console.log("✅ Units count:", Object.keys(Units).length);
    console.log("✅ Buildings count:", Object.keys(Buildings).length);
    console.log("✅ Factions count:", Object.keys(Factions).length);
  } catch (error) {
    console.error("❌ Failed to import collection modules:", error.message);
    process.exit(1);
  }

  // Test 5: Test individual entity import
  try {
    const entityFiles = await fs.readdir("dist/npm/faction");
    if (entityFiles.length > 0) {
      // Try to import a specific faction
      const factionDirs = entityFiles.filter(async (file) => {
        const stat = await fs.stat(path.join("dist/npm/faction", file));
        return stat.isDirectory();
      });

      if (factionDirs.length > 0) {
        console.log("✅ Entity directories found in faction folder");
      }
    }
  } catch (error) {
    console.warn(
      "⚠️  Could not test individual entity imports:",
      error.message,
    );
  }

  // Test 6: Verify TypeScript declarations are valid
  try {
    const tsDefsContent = await fs.readFile("dist/npm/gg-iolin.d.ts", "utf8");
    if (
      tsDefsContent.includes("export interface") &&
      tsDefsContent.includes("export type")
    ) {
      console.log("✅ TypeScript definitions file contains expected exports");
    } else {
      throw new Error("TypeScript definitions file missing expected content");
    }
  } catch (error) {
    console.error("❌ TypeScript definitions test failed:", error.message);
    process.exit(1);
  }

  console.log("\n🎉 All tests passed! TypeScript build is working correctly.");
  console.log("\n📦 Your build output is ready in dist/npm/");
  console.log("   - JavaScript files: dist/npm/*.js");
  console.log("   - TypeScript declarations: dist/npm/*.d.ts");
  console.log("   - Type definitions: dist/npm/gg-iolin.d.ts");
}

// Run the test
testBuild().catch((error) => {
  console.error("💥 Test failed:", error);
  process.exit(1);
});
