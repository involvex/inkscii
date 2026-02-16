import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const exec = promisify(execFile);

export interface ExtractOptions {
  fps: number;
  columns: number;
  fontRatio: number;
}

export async function extractFrames(
  videoPath: string,
  tempDir: string,
  options: ExtractOptions,
): Promise<string[]> {
  const framesDir = join(tempDir, "frames");
  mkdirSync(framesDir, { recursive: true });

  console.log(
    `Extracting frames at ${options.fps}fps, ${options.columns} columns...`,
  );

  // Bake the font-ratio height correction into the scale filter so each
  // frame already has the correct dimensions for terminal display.
  // height = round_even( columns / input_aspect * fontRatio )
  const scaleExpr = `scale=${options.columns}:trunc(ow/a*${options.fontRatio}/2)*2`;

  await exec("ffmpeg", [
    "-loglevel",
    "error",
    "-i",
    videoPath,
    "-vf",
    `${scaleExpr},fps=${options.fps}`,
    join(framesDir, "frame_%04d.png"),
  ]);

  const pngFiles = readdirSync(framesDir)
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => join(framesDir, f));

  console.log(`Extracted ${pngFiles.length} frames`);
  return pngFiles;
}

export async function getPixelData(framePath: string): Promise<string> {
  // Frames are already scaled with font-ratio correction by extractFrames,
  // so just read the pixel data directly — no extra resize needed.
  const { stdout: pixelText } = await exec(
    "magick",
    [framePath, "txt:-"],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  return pixelText;
}
