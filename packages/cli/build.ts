import { build } from "bun";
import { rmSync } from "node:fs";

console.log("Building @inkscii/cli...");

// Clean dist
rmSync("dist", { recursive: true, force: true });

await build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  target: "node",
  format: "esm",
  naming: "[name].js",
  banner: "#!/usr/bin/env node",
});

console.log("Build complete!");
