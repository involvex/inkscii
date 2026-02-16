import { writeFileSync } from "node:fs";
import { statSync } from "node:fs";

interface BundleOptions {
  name: string;
  fps: number;
  columns: number;
  colored: boolean;
  thresholdLow: number;
  thresholdHigh: number;
  chars: string;
  fontRatio: number;
  colorStep: number;
  temporalHold: number;
}

interface BundlePerfStats {
  avgSegmentsPerFrame: number;
  maxSegmentsPerFrame: number;
  avgCharChangesPerFrame: number;
  avgColorChangesPerFrame: number;
  avgRowsWithCharChangesPerFrame: number;
  avgRowsWithColorChangesPerFrame: number;
}

function countSegments(frame: [string, string[]][]): number {
  let count = 0;
  for (const [text, colors] of frame) {
    let i = 0;
    while (i < text.length) {
      const color = colors[i] || "";
      let j = i + 1;
      while (j < text.length && (colors[j] || "") === color) j++;
      count += 1;
      i = j;
    }
  }
  return count;
}

function buildRowSignature([text, colors]: [string, string[]]): string {
  return `${text}\u0001${colors.join("\u0002")}`;
}

function buildChangedRowsByFrame(frames: [string, string[]][][]): number[][] {
  if (frames.length === 0) return [];
  const changedRowsByFrame: number[][] = [];
  let previousSignatures: string[] = [];

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    const signatures = frame.map((row) => buildRowSignature(row));
    if (frameIndex === 0) {
      changedRowsByFrame.push(signatures.map((_, row) => row));
      previousSignatures = signatures;
      continue;
    }

    const changedRows: number[] = [];
    const rows = Math.max(previousSignatures.length, signatures.length);
    for (let row = 0; row < rows; row++) {
      if (previousSignatures[row] !== signatures[row]) {
        changedRows.push(row);
      }
    }
    changedRowsByFrame.push(changedRows);
    previousSignatures = signatures;
  }

  return changedRowsByFrame;
}

function buildPerfStats(frames: [string, string[]][][]): BundlePerfStats {
  if (frames.length === 0) {
    return {
      avgSegmentsPerFrame: 0,
      maxSegmentsPerFrame: 0,
      avgCharChangesPerFrame: 0,
      avgColorChangesPerFrame: 0,
      avgRowsWithCharChangesPerFrame: 0,
      avgRowsWithColorChangesPerFrame: 0,
    };
  }

  let totalSegments = 0;
  let maxSegments = 0;
  for (const frame of frames) {
    const segments = countSegments(frame);
    totalSegments += segments;
    if (segments > maxSegments) maxSegments = segments;
  }

  if (frames.length === 1) {
    return {
      avgSegmentsPerFrame: Math.round(totalSegments / frames.length),
      maxSegmentsPerFrame: maxSegments,
      avgCharChangesPerFrame: 0,
      avgColorChangesPerFrame: 0,
      avgRowsWithCharChangesPerFrame: 0,
      avgRowsWithColorChangesPerFrame: 0,
    };
  }

  let charChanges = 0;
  let colorChanges = 0;
  let changedRowsChar = 0;
  let changedRowsColor = 0;

  for (let frameIndex = 1; frameIndex < frames.length; frameIndex++) {
    const previousFrame = frames[frameIndex - 1];
    const currentFrame = frames[frameIndex];
    const rows = Math.min(previousFrame.length, currentFrame.length);
    let frameRowsChar = 0;
    let frameRowsColor = 0;

    for (let row = 0; row < rows; row++) {
      const [previousText, previousColors] = previousFrame[row];
      const [currentText, currentColors] = currentFrame[row];
      const cols = Math.min(
        previousText.length,
        currentText.length,
        previousColors.length,
        currentColors.length,
      );
      let rowHasCharChange = false;
      let rowHasColorChange = false;
      for (let col = 0; col < cols; col++) {
        if (currentText[col] !== previousText[col]) {
          charChanges += 1;
          rowHasCharChange = true;
        }
        if ((currentColors[col] || "") !== (previousColors[col] || "")) {
          colorChanges += 1;
          rowHasColorChange = true;
        }
      }
      if (rowHasCharChange) frameRowsChar += 1;
      if (rowHasColorChange) frameRowsColor += 1;
    }
    changedRowsChar += frameRowsChar;
    changedRowsColor += frameRowsColor;
  }

  const transitions = frames.length - 1;
  return {
    avgSegmentsPerFrame: Math.round(totalSegments / frames.length),
    maxSegmentsPerFrame: maxSegments,
    avgCharChangesPerFrame: Math.round(charChanges / transitions),
    avgColorChangesPerFrame: Math.round(colorChanges / transitions),
    avgRowsWithCharChangesPerFrame: Math.round(changedRowsChar / transitions),
    avgRowsWithColorChangesPerFrame: Math.round(changedRowsColor / transitions),
  };
}

export function bundleAnimation(
  frames: [string, string[]][][],
  outputPath: string,
  options: BundleOptions,
) {
  const firstFrame = frames[0];
  const rows = firstFrame ? firstFrame.length : 0;
  const cols = firstFrame?.[0]?.[0]?.length ?? 0;
  const perf = buildPerfStats(frames);
  const changedRowsByFrame = buildChangedRowsByFrame(frames);

  const animation = {
    version: 1,
    meta: {
      name: options.name,
      fps: options.fps,
      columns: cols,
      rows,
      frameCount: frames.length,
      colored: options.colored,
      generatedWith: {
        thresholdLow: options.thresholdLow,
        thresholdHigh: options.thresholdHigh,
        chars: options.chars,
        fontRatio: options.fontRatio,
        colorStep: options.colorStep,
        temporalHold: options.temporalHold,
      },
      performance: perf,
    },
    runtimeHints: {
      changedRowsByFrame,
    },
    frames,
  };

  writeFileSync(outputPath, JSON.stringify(animation));

  const sizeBytes = statSync(outputPath).size;
  const sizeMB = (sizeBytes / 1024 / 1024).toFixed(1);

  return { rows, cols, sizeMB };
}
