export interface ConvertOptions {
  thresholdLow: number;
  thresholdHigh: number;
  chars: string;
  colored: boolean;
  colorStep: number;
}

interface Pixel {
  row: number;
  col: number;
  r: number;
  g: number;
  b: number;
}

function luminance(r: number, g: number, b: number): number {
  return Math.floor(0.2126 * r + 0.7152 * g + 0.0722 * b);
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
 * Per-row gap-aware background detection. For each row, content pixels are
 * always kept. Runs of background-candidate pixels between two content
 * pixels are filled as content only if the run is short (an interior detail
 * like the robot's eyes). Long runs (like the gap between the lamp and
 * the head) stay as background.
 */
function buildBackgroundMask(
  pixels: Pixel[],
  bg: "light" | "dark",
  thresholdLow: number,
  thresholdHigh: number,
): Uint8Array {
  let maxRow = 0;
  let maxCol = 0;
  for (const p of pixels) {
    if (p.row > maxRow) maxRow = p.row;
    if (p.col > maxCol) maxCol = p.col;
  }
  const rows = maxRow + 1;
  const cols = maxCol + 1;

  const lumGrid = new Uint8Array(rows * cols);
  for (const p of pixels) {
    lumGrid[p.row * cols + p.col] = luminance(p.r, p.g, p.b);
  }

  const isCandidate = (lum: number): boolean =>
    bg === "dark" ? lum < thresholdLow : lum > thresholdHigh;

  // Pure per-pixel: only actual non-background pixels are content.
  // No gap filling -- cleanest possible background separation.
  const mask = new Uint8Array(rows * cols).fill(1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isCandidate(lumGrid[r * cols + c])) {
        mask[r * cols + c] = 0;
      }
    }
  }

  return mask;
}

export function convertPixelsToAscii(
  pixelText: string,
  options: ConvertOptions,
): [string, string[]][] {
  const pixels = parsePixelData(pixelText);
  if (pixels.length === 0) return [];

  const bg = detectBackground(pixels);
  const { thresholdLow, thresholdHigh, chars, colored, colorStep } = options;

  const bgMask = buildBackgroundMask(pixels, bg, thresholdLow, thresholdHigh);

  let maxCol = 0;
  for (const p of pixels) {
    if (p.col > maxCol) maxCol = p.col;
  }
  const cols = maxCol + 1;

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
  return sortedRows.map((key) => {
    const row = rowMap.get(key)!;
    return [row.text, row.colors];
  });
}
