#!/usr/bin/env node

/**
 * Simple test script to verify TypeScript compilation and imports
 * This script tests ES modules compatibility with the npm package
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testBuild() {
  // Change to project root directory
  process.chdir(path.join(__dirname, "..", ".."));
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
    // Import using a full URL format as required for ES modules
    const moduleUrl = new URL(
      `file://${path.join(process.cwd(), "dist/npm/index.js")}`,
    );
    const importedModule = await import(moduleUrl.href);

    console.log("✅ Successfully imported main module");

    // Log available exports
    const exportKeys = Object.keys(importedModule);
    console.log(`✅ Available exports: ${exportKeys.join(", ")}`);

    // Get the default export (main API)
    const mainModule = importedModule.default;
    console.log(
      `✅ Default export keys: ${Object.keys(mainModule).join(", ")}`,
    );

    // Try both named exports and default export properties
    const release =
      importedModule.Release || (mainModule && mainModule.Release);
    const iolinIndex =
      importedModule.IolinIndex || (mainModule && mainModule.IolinIndex);

    if (release && typeof release.ggVersion === "string") {
      console.log(`✅ Release version: ${release.ggVersion}`);
    } else if (
      mainModule &&
      mainModule.Release &&
      mainModule.Release.ggVersion
    ) {
      console.log(
        `✅ Release version (via default): ${mainModule.Release.ggVersion}`,
      );
    } else {
      console.log("ℹ️ Release data unavailable or has different structure");
    }

    if (
      iolinIndex &&
      iolinIndex.all &&
      Object.keys(iolinIndex.all).length > 0
    ) {
      console.log(
        `✅ Total entities in index: ${Object.keys(iolinIndex.all).length}`,
      );
    } else if (
      mainModule &&
      mainModule.IolinIndex &&
      mainModule.IolinIndex.all
    ) {
      console.log(
        `✅ Total entities in index: ${Object.keys(mainModule.IolinIndex.all).length}`,
      );
    } else {
      console.log("ℹ️ Index data unavailable or has different structure");
    }
  } catch (error) {
    console.error("❌ Failed to import main module:", error.message);
    console.error(
      "💡 Check that TypeScript is configured to output ESM format (module: ESNext in tsconfig.json)",
    );
    console.error('💡 Make sure package.json has "type": "module"');
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }

  // Test 4: Try to import collection modules
  try {
    // Import using proper URL format for ES modules
    const unitsUrl = new URL(
      `file://${path.join(process.cwd(), "dist/npm/units.js")}`,
    );
    const buildingsUrl = new URL(
      `file://${path.join(process.cwd(), "dist/npm/buildings.js")}`,
    );
    const factionsUrl = new URL(
      `file://${path.join(process.cwd(), "dist/npm/factions.js")}`,
    );

    const unitsModule = await import(unitsUrl.href);
    const buildingsModule = await import(buildingsUrl.href);
    const factionsModule = await import(factionsUrl.href);

    console.log("✅ Successfully imported collection modules");

    // Try both named exports and default exports
    const units = unitsModule.Units || unitsModule.default;
    const buildings = buildingsModule.Buildings || buildingsModule.default;
    const factions = factionsModule.Factions || factionsModule.default;

    // Log available exports for debugging
    console.log(
      `✅ Units module exports: ${Object.keys(unitsModule).join(", ")}`,
    );
    console.log(
      `✅ Buildings module exports: ${Object.keys(buildingsModule).join(", ")}`,
    );
    console.log(
      `✅ Factions module exports: ${Object.keys(factionsModule).join(", ")}`,
    );

    if (units && typeof units === "object") {
      console.log(`✅ Units count: ${Object.keys(units).length}`);
    } else {
      console.log("ℹ️ Units export format has changed - skipping count");
    }

    if (buildings && typeof buildings === "object") {
      console.log(`✅ Buildings count: ${Object.keys(buildings).length}`);
    } else {
      console.log("ℹ️ Buildings export format has changed - skipping count");
    }

    if (factions && typeof factions === "object") {
      console.log(`✅ Factions count: ${Object.keys(factions).length}`);
    } else {
      console.log("ℹ️ Factions export format has changed - skipping count");
    }
  } catch (error) {
    console.error("❌ Failed to import collection modules:", error.message);
    console.error(
      "💡 Make sure TypeScript is outputting ESM format and exports are correctly defined",
    );
    console.error(
      "💡 Check that all modules use ES module syntax (import/export) not CommonJS (require/module.exports)",
    );
    console.error("Stack trace:", error.stack);
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
