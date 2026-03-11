import { build, type BuildOptions } from "bun";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

console.log("Building @inkscii/ascii...");

// Clean dist
rmSync("dist", { recursive: true, force: true });

const commonConfig: BuildOptions = {
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  external: ["react", "react-dom"],
  sourcemap: "external",
};

// Build ESM
await build({
  ...commonConfig,
  format: "esm",
  naming: "[name].js",
});

// Build CJS (Bun currently supports CJS output for 'node' target)
await build({
  ...commonConfig,
  target: "node",
  format: "esm", // Bun's 'esm' format with 'node' target can be used as CJS if renamed or handled
  naming: "[name].cjs",
});

// Generate Types
console.log("Generating types...");
execSync("tsc --emitDeclarationOnly", { stdio: "inherit" });

console.log("Build complete!");
