export interface ConvertOptions {
  thresholdLow: number;
  thresholdHigh: number;
  chars: string;
  colored: boolean;
  colorStep: number;
  maskHysteresis: number;
}

interface Pixel {
  row: number;
  col: number;
  r: number;
  g: number;
  b: number;
}

interface MaskState {
  candidateMask: Uint8Array;
  finalMask: Uint8Array;
  rows: number;
  cols: number;
  bg: "light" | "dark";
}

let previousMaskState: MaskState | null = null;

export function resetMaskStabilizer(): void {
  previousMaskState = null;
}

function luminance(r: number, g: number, b: number): number {
  return Math.floor(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

function quantizeChannel(value: number, step: number): number {
  if (step <= 1) return value;
  const quantized = Math.round(value / step) * step;
  if (quantized < 0) return 0;
  if (quantized > 255) return 255;
  return quantized;
}

function parsePixelData(text: string): Pixel[] {
  const pixels: Pixel[] = [];
  const lines = text.split("\n");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const posMatch = line.match(/^(\d+),(\d+):/);
    if (!posMatch) continue;

    const col = parseInt(posMatch[1], 10);
    const row = parseInt(posMatch[2], 10);

    const rgbMatch = line.match(/\((\d+),(\d+),(\d+)/);
    if (!rgbMatch) {
      const grayMatch = line.match(/\((\d+)\)/);
      if (grayMatch) {
        const g = parseInt(grayMatch[1], 10);
        pixels.push({ row, col, r: g, g, b: g });
      }
      continue;
    }

    pixels.push({
      row,
      col,
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    });
  }

  return pixels;
}

function detectBackground(pixels: Pixel[]): "light" | "dark" {
  const sample = pixels.filter((p) => p.row === 0).slice(0, 10);
  if (sample.length === 0) return "dark";

  let total = 0;
  for (const p of sample) {
    total += luminance(p.r, p.g, p.b);
  }

  return total / sample.length > 200 ? "light" : "dark";
}

/**
 * Flood-fills thresholded background candidates from the frame border.
 * Only border-connected candidates are considered transparent background;
 * enclosed candidate islands are kept as visible content.
 */
function computeBorderConnectedMask(
  candidateMask: Uint8Array,
  rows: number,
  cols: number,
): Uint8Array {
  const mask = new Uint8Array(candidateMask.length);
  const queue = new Uint32Array(candidateMask.length);
  let head = 0;
  let tail = 0;

  const enqueue = (index: number): void => {
    if (candidateMask[index] !== 1 || mask[index] === 1) return;
    mask[index] = 1;
    queue[tail++] = index;
  };

  for (let col = 0; col < cols; col++) {
    enqueue(col);
    enqueue((rows - 1) * cols + col);
  }
  for (let row = 0; row < rows; row++) {
    enqueue(row * cols);
    enqueue(row * cols + (cols - 1));
  }

  while (head < tail) {
    const index = queue[head++];
    const row = Math.floor(index / cols);
    const col = index - row * cols;

    if (row > 0) enqueue(index - cols);
    if (row + 1 < rows) enqueue(index + cols);
    if (col > 0) enqueue(index - 1);
    if (col + 1 < cols) enqueue(index + 1);
    if (row > 0 && col > 0) enqueue(index - cols - 1);
    if (row > 0 && col + 1 < cols) enqueue(index - cols + 1);
    if (row + 1 < rows && col > 0) enqueue(index + cols - 1);
    if (row + 1 < rows && col + 1 < cols) enqueue(index + cols + 1);
  }

  return mask;
}

/**
 * Builds a stable threshold-based candidate mask, then derives the final
 * transparent background mask via border connectivity.
 */
function buildBackgroundMask(
  pixels: Pixel[],
  bg: "light" | "dark",
  thresholdLow: number,
  thresholdHigh: number,
  maskHysteresis: number,
): {
  candidateMask: Uint8Array;
  finalMask: Uint8Array;
  rows: number;
  cols: number;
} {
  let maxRow = 0;
  let maxCol = 0;
  for (const p of pixels) {
    if (p.row > maxRow) maxRow = p.row;
    if (p.col > maxCol) maxCol = p.col;
  }
  const rows = maxRow + 1;
  const cols = maxCol + 1;

  const lumGrid = new Uint8Array(rows * cols);
  const rGrid = new Uint8Array(rows * cols);
  const gGrid = new Uint8Array(rows * cols);
  const bGrid = new Uint8Array(rows * cols);
  for (const p of pixels) {
    const index = p.row * cols + p.col;
    lumGrid[index] = luminance(p.r, p.g, p.b);
    rGrid[index] = p.r;
    gGrid[index] = p.g;
    bGrid[index] = p.b;
  }

  let borderR = 0;
  let borderG = 0;
  let borderB = 0;
  let borderCount = 0;
  for (let col = 0; col < cols; col++) {
    const topIdx = col;
    const bottomIdx = (rows - 1) * cols + col;
    borderR += rGrid[topIdx] + rGrid[bottomIdx];
    borderG += gGrid[topIdx] + gGrid[bottomIdx];
    borderB += bGrid[topIdx] + bGrid[bottomIdx];
    borderCount += 2;
  }
  for (let row = 1; row < rows - 1; row++) {
    const leftIdx = row * cols;
    const rightIdx = row * cols + (cols - 1);
    borderR += rGrid[leftIdx] + rGrid[rightIdx];
    borderG += gGrid[leftIdx] + gGrid[rightIdx];
    borderB += bGrid[leftIdx] + bGrid[rightIdx];
    borderCount += 2;
  }
  const bgRefR = Math.round(borderR / Math.max(borderCount, 1));
  const bgRefG = Math.round(borderG / Math.max(borderCount, 1));
  const bgRefB = Math.round(borderB / Math.max(borderCount, 1));
  const relaxedThreshold = Math.max(
    0,
    thresholdHigh - Math.max(12, maskHysteresis * 4),
  );
  const colorTolerance = 48;
  const relaxedColorTolerance =
    colorTolerance + Math.max(8, maskHysteresis * 3);

  const candidateMask = new Uint8Array(rows * cols).fill(1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      const lum = lumGrid[index];
      let isBgCandidate: boolean;
      if (bg === "dark") {
        isBgCandidate = lum < thresholdLow;
      } else {
        const dist = colorDistance(
          rGrid[index],
          gGrid[index],
          bGrid[index],
          bgRefR,
          bgRefG,
          bgRefB,
        );
        isBgCandidate =
          lum > thresholdHigh ||
          (lum > relaxedThreshold && dist <= colorTolerance);
      }
      if (!isBgCandidate) {
        candidateMask[index] = 0;
      }
    }
  }

  // Hysteresis stabilizes near-threshold pixels on light-background footage.
  // It prevents tiny luminance jitter from flipping white details in/out.
  if (
    bg === "light" &&
    maskHysteresis > 0 &&
    previousMaskState &&
    previousMaskState.bg === bg &&
    previousMaskState.rows === rows &&
    previousMaskState.cols === cols
  ) {
    const previousMask = previousMaskState.candidateMask;
    const enterBg = Math.min(255, thresholdHigh + maskHysteresis);
    for (let i = 0; i < candidateMask.length; i++) {
      const lum = lumGrid[i];
      const dist = colorDistance(
        rGrid[i],
        gGrid[i],
        bGrid[i],
        bgRefR,
        bgRefG,
        bgRefB,
      );
      if (previousMask[i] === 1) {
        candidateMask[i] =
          lum >= relaxedThreshold && dist <= relaxedColorTolerance ? 1 : 0;
      } else {
        candidateMask[i] =
          lum > enterBg || (lum > thresholdHigh && dist <= colorTolerance)
            ? 1
            : 0;
      }
    }
  }

  const floodMask = computeBorderConnectedMask(candidateMask, rows, cols);

  // Temporal carry-forward: if a candidate pixel was background in the
  // previous frame's final mask (or adjacent to one), keep it as background
  // even when the current flood fill can't reach it (e.g. the subject's arm
  // temporarily closed a gap). The 1-pixel dilation catches thin strips of
  // newly-exposed background at motion edges. True enclosed content like
  // eyes is safe because it was NEVER background in any previous frame.
  const finalMask = new Uint8Array(floodMask);
  if (
    previousMaskState &&
    previousMaskState.bg === bg &&
    previousMaskState.rows === rows &&
    previousMaskState.cols === cols
  ) {
    const prevFinal = previousMaskState.finalMask;

    // Dilate previous background by 1 pixel so edge strips are covered.
    const dilated = new Uint8Array(prevFinal);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (prevFinal[r * cols + c] === 1) continue;
        let hasBgNeighbor = false;
        for (let dr = -1; dr <= 1 && !hasBgNeighbor; dr++) {
          for (let dc = -1; dc <= 1 && !hasBgNeighbor; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (prevFinal[nr * cols + nc] === 1) hasBgNeighbor = true;
            }
          }
        }
        if (hasBgNeighbor) dilated[r * cols + c] = 1;
      }
    }

    for (let i = 0; i < finalMask.length; i++) {
      if (finalMask[i] === 0 && candidateMask[i] === 1 && dilated[i] === 1) {
        finalMask[i] = 1;
      }
    }
  }

  return { candidateMask, finalMask, rows, cols };
}

export function convertPixelsToAscii(
  pixelText: string,
  options: ConvertOptions,
): [string, string[]][] {
  const pixels = parsePixelData(pixelText);
  if (pixels.length === 0) return [];

  const bg = detectBackground(pixels);
  const {
    thresholdLow,
    thresholdHigh,
    chars,
    colored,
    colorStep,
    maskHysteresis,
  } = options;

  const {
    candidateMask,
    finalMask: bgMask,
    rows,
    cols,
  } = buildBackgroundMask(
    pixels,
    bg,
    thresholdLow,
    thresholdHigh,
    maskHysteresis,
  );

  let contentMax = 0;
  let contentMin = 255;
  for (const p of pixels) {
    const lum = luminance(p.r, p.g, p.b);
    const isBg = bgMask[p.row * cols + p.col] === 1;
    if (!isBg) {
      if (lum > contentMax) contentMax = lum;
      if (lum < contentMin) contentMin = lum;
    }
  }
  if (contentMax === 0) contentMax = 255;
  if (contentMin === 255) contentMin = 0;

  const lumFloor = contentMin;
  const lumCeil = contentMax;
  const lumRange = Math.max(lumCeil - lumFloor, 1);
  const numChars = chars.length;

  const rowMap = new Map<number, { text: string; colors: string[] }>();

  for (const p of pixels) {
    const lum = luminance(p.r, p.g, p.b);
    const isBg = bgMask[p.row * cols + p.col] === 1;

    let char: string;
    let color: string;

    if (isBg) {
      char = " ";
      color = "";
    } else {
      let idx: number;
      if (bg === "light") {
        idx = Math.floor(((lumCeil - lum) * (numChars - 1)) / lumRange);
      } else {
        idx = Math.floor(((lum - lumFloor) * (numChars - 1)) / lumRange);
      }
      idx = Math.max(1, Math.min(numChars - 1, idx));
      char = chars[idx];
      if (!colored) {
        color = "";
      } else {
        const r = quantizeChannel(p.r, colorStep);
        const g = quantizeChannel(p.g, colorStep);
        const b = quantizeChannel(p.b, colorStep);
        color = `${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      }
    }

    let row = rowMap.get(p.row);
    if (!row) {
      row = { text: "", colors: [] };
      rowMap.set(p.row, row);
    }
    row.text += char;
    row.colors.push(color);
  }

  const sortedRows = [...rowMap.keys()].sort((a, b) => a - b);
  const frame: [string, string[]][] = sortedRows.map(
    (key): [string, string[]] => {
      const row = rowMap.get(key)!;
      return [row.text, row.colors];
    },
  );
  previousMaskState = {
    candidateMask: new Uint8Array(candidateMask),
    finalMask: new Uint8Array(bgMask),
    rows,
    cols,
    bg,
  };
  return frame;
}
