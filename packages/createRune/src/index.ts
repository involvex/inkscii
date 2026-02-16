import { Command } from "commander";
import { basename, resolve } from "node:path";
import { mkdirSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkDeps } from "./checkDeps.js";
import { extractFrames, getPixelData } from "./extractFrames.js";
import { convertPixelsToAscii } from "./convertFrame.js";
import { bundleAnimation } from "./bundle.js";
import { resolveOutputPath, printUsage } from "./output.js";

const SUPPORTED_FORMATS = ["mp4", "mkv", "mov", "avi", "webm"];
type AsciiFrame = [string, string[]][];

function colorDistance(hexA: string, hexB: string): number {
  if (hexA.length !== 6 || hexB.length !== 6) return 9999;
  const ar = parseInt(hexA.slice(0, 2), 16);
  const ag = parseInt(hexA.slice(2, 4), 16);
  const ab = parseInt(hexA.slice(4, 6), 16);
  const br = parseInt(hexB.slice(0, 2), 16);
  const bg = parseInt(hexB.slice(2, 4), 16);
  const bb = parseInt(hexB.slice(4, 6), 16);
  if (
    Number.isNaN(ar) || Number.isNaN(ag) || Number.isNaN(ab) ||
    Number.isNaN(br) || Number.isNaN(bg) || Number.isNaN(bb)
  ) {
    return 9999;
  }
  return Math.abs(ar - br) + Math.abs(ag - bg) + Math.abs(ab - bb);
}

function applyTemporalHold(
  currentFrame: AsciiFrame,
  previousFrame: AsciiFrame,
  holdThreshold: number,
): AsciiFrame {
  if (holdThreshold <= 0) return currentFrame;
  const rows = Math.min(currentFrame.length, previousFrame.length);
  const stabilized: AsciiFrame = currentFrame.map(([text, colors]) => [text, [...colors]]);
  for (let row = 0; row < rows; row++) {
    const [currentText, currentColors] = stabilized[row];
    const [previousText, previousColors] = previousFrame[row];
    const cols = Math.min(
      currentText.length,
      previousText.length,
      currentColors.length,
      previousColors.length,
    );
    for (let col = 0; col < cols; col++) {
      const currentColor = currentColors[col];
      const previousColor = previousColors[col];
      if (currentText[col] !== previousText[col]) continue;
      if (!currentColor || !previousColor) continue;
      if (currentColor === previousColor) continue;
      if (colorDistance(currentColor, previousColor) <= holdThreshold) {
        currentColors[col] = previousColor;
      }
    }
  }
  return stabilized;
}

const program = new Command();

program
  .name("create-rune")
  .description("Generate ASCII art animations from video files")
  .argument("<video>", "Path to the video file")
  .option("--name <name>", "Animation name (default: video filename)")
  .option("--fps <number>", "Frames per second", "30")
  .option("--columns <number>", "Width in characters", "90")
  .option("--thresholdLow <number>", "Dark background cutoff", "5")
  .option("--thresholdHigh <number>", "Light background cutoff", "235")
  .option("--chars <string>", "Character ramp", " -=+*%#0oOxX@$")
  .option(
    "--fontRatio <number>",
    "Character aspect ratio (charWidth/lineHeight)",
    "0.6",
  )
  .option(
    "--colorStep <number>",
    "Quantize RGB channels to this step size (1 disables quantization)",
    "1",
  )
  .option(
    "--temporalHold <number>",
    "Suppress tiny frame-to-frame color flicker (0 disables)",
    "0",
  )
  .option("--no-colored", "Disable per-character color")
  .option("--output <path>", "Output directory (default: auto-detect public/)")
  .action(async (videoArg: string, opts: Record<string, string | boolean>) => {
    const videoPath = resolve(videoArg);
    const ext = videoPath.split(".").pop()?.toLowerCase() ?? "";

    if (!SUPPORTED_FORMATS.includes(ext)) {
      console.error(`Error: Unsupported format ".${ext}"`);
      console.error(`Supported: ${SUPPORTED_FORMATS.join(", ")}`);
      process.exit(1);
    }

    const name =
      (opts.name as string) ??
      basename(videoPath, `.${ext}`).replace(/[^a-zA-Z0-9]/g, "");
    const fps = parseInt(opts.fps as string, 10);
    const columns = parseInt(opts.columns as string, 10);
    const thresholdLow = parseInt(opts.thresholdLow as string, 10);
    const thresholdHigh = parseInt(opts.thresholdHigh as string, 10);
    const chars = opts.chars as string;
    const fontRatio = parseFloat(opts.fontRatio as string);
    const colorStep = parseInt(opts.colorStep as string, 10);
    const temporalHold = parseInt(opts.temporalHold as string, 10);
    const colored = opts.colored !== false;

    if (!Number.isFinite(colorStep) || colorStep < 1 || colorStep > 255) {
      console.error("Error: --colorStep must be an integer between 1 and 255");
      process.exit(1);
    }

    if (!Number.isFinite(temporalHold) || temporalHold < 0 || temporalHold > 765) {
      console.error("Error: --temporalHold must be an integer between 0 and 765");
      process.exit(1);
    }

    await checkDeps();

    const tempDir = join(tmpdir(), `rune-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    const framePaths = await extractFrames(videoPath, tempDir, {
      fps,
      columns,
      fontRatio,
    });

    console.log(`Processing ${framePaths.length} frames into ASCII...`);

    const allFrames: [string, string[]][][] = [];

    for (let i = 0; i < framePaths.length; i++) {
      const pixelText = await getPixelData(framePaths[i]);
      const asciiFrame = convertPixelsToAscii(pixelText, {
        thresholdLow,
        thresholdHigh,
        chars,
        colored,
        colorStep,
      });
      const previousFrame = allFrames.at(-1);
      const stableFrame = previousFrame
        ? applyTemporalHold(asciiFrame, previousFrame, temporalHold)
        : asciiFrame;
      allFrames.push(stableFrame);

      process.stdout.write(`\r[${i + 1}/${framePaths.length}]`);
    }
    console.log(" Done");

    const tempOutput = join(tempDir, `${name}.rune.json`);
    const { rows, cols, sizeMB } = bundleAnimation(allFrames, tempOutput, {
      name,
      fps,
      columns,
      colored,
      thresholdLow,
      thresholdHigh,
      chars,
      fontRatio,
      colorStep,
      temporalHold,
    });

    const finalPath = resolveOutputPath(
      name,
      opts.output as string | undefined,
    );

    const { copyFileSync } = await import("node:fs");
    copyFileSync(tempOutput, finalPath);

    rmSync(tempDir, { recursive: true, force: true });

    printUsage(finalPath, name, allFrames.length, cols, rows, sizeMB);
  });

program.parse();
