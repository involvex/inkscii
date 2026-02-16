import type { RuneAnimation, RuneColoredFrame, RunePlainFrame } from "./types";

export interface ColoredRunSegment {
  text: string;
  color: string;
}

export interface ParsedColoredFrames {
  frames: ColoredRunSegment[][][];
  changedRowsByFrame: number[][];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildColoredHtml(frame: RuneColoredFrame): string {
  const lines: string[] = [];
  for (const [text, colors] of frame) {
    let html = "";
    let i = 0;
    while (i < text.length) {
      const color = colors[i] || "";
      let j = i + 1;
      while (j < text.length && (colors[j] || "") === color) j++;
      const chunk = escapeHtml(text.slice(i, j));
      html += color ? `<span style="color:#${color}">${chunk}</span>` : chunk;
      i = j;
    }
    lines.push(html);
  }
  return lines.join("\n");
}

function buildPlainText(frame: RunePlainFrame): string {
  return frame.join("\n");
}

export function parseFrames(animation: RuneAnimation): string[] {
  if (animation.meta.colored) {
    return animation.frames.map((f) => buildColoredHtml(f as RuneColoredFrame));
  }
  return animation.frames.map((f) => buildPlainText(f as RunePlainFrame));
}

function buildColoredSegments(frame: RuneColoredFrame): ColoredRunSegment[][] {
  return frame.map(([text, colors]) => {
    const segments: ColoredRunSegment[] = [];
    let i = 0;
    while (i < text.length) {
      const color = colors[i] || "";
      let j = i + 1;
      while (j < text.length && (colors[j] || "") === color) j++;
      segments.push({ text: text.slice(i, j), color });
      i = j;
    }
    return segments;
  });
}

export function parseColoredFrames(
  animation: RuneAnimation,
): ColoredRunSegment[][][] {
  return parseColoredFrameSet(animation).frames;
}

function buildRowSignature([text, colors]: [string, string[]]): string {
  return `${text}\u0001${colors.join("\u0002")}`;
}

function buildChangedRowsByFrame(frames: RuneColoredFrame[]): number[][] {
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

function normalizeChangedRowsHint(
  hint: number[][] | undefined,
  frameCount: number,
): number[][] | null {
  if (!hint || hint.length !== frameCount) return null;
  const normalized: number[][] = [];
  for (let frameIndex = 0; frameIndex < hint.length; frameIndex++) {
    const rows = hint[frameIndex];
    if (!Array.isArray(rows)) return null;
    const filtered: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!Number.isInteger(row) || row < 0) return null;
      filtered.push(row);
    }
    normalized.push(filtered);
  }
  return normalized;
}

export function parseColoredFrameSet(
  animation: RuneAnimation,
): ParsedColoredFrames {
  const rawFrames = animation.frames.map((frame) => frame as RuneColoredFrame);
  const frames = rawFrames.map((frame) => buildColoredSegments(frame));
  const hinted = normalizeChangedRowsHint(
    animation.runtimeHints?.changedRowsByFrame,
    rawFrames.length,
  );
  const changedRowsByFrame = hinted ?? buildChangedRowsByFrame(rawFrames);
  return { frames, changedRowsByFrame };
}
