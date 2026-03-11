import { build } from "bun";
import { execSync } from "node:child_process";
import { rmSync, mkdirSync, cpSync } from "node:fs";
import { join } from "node:path";

console.log("Building @inkscii/react-ascii-text...");

// Clean dist
rmSync("dist", { recursive: true, force: true });

// Build ESM
await build({
  entrypoints: ["src/index.tsx"],
  outdir: "dist",
  external: ["react", "figlet"],
  format: "esm",
  naming: "[name].js",
});

// Copy fonts
console.log("Copying fonts...");
mkdirSync("dist/fonts", { recursive: true });
cpSync("src/fonts", "dist/fonts", { recursive: true });

// Generate Types
console.log("Generating types...");
execSync("tsc --emitDeclarationOnly", { stdio: "inherit" });

console.log("Build complete!");
