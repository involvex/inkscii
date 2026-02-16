import assert from "node:assert/strict";
import test from "node:test";
import {
  convertPixelsToAscii,
  resetMaskStabilizer,
} from "./convertFrame.js";

function toPixelText(grid: number[][]): string {
  const lines: string[] = ["# synthetic pixel dump"];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const value = grid[row][col];
      lines.push(`${col},${row}: (${value},${value},${value})`);
    }
  }
  return lines.join("\n");
}

function sampleCell(
  frame: [string, string[]][],
  row: number,
  col: number,
): { char: string; color: string } {
  return {
    char: frame[row][0][col],
    color: frame[row][1][col],
  };
}

const options = {
  thresholdLow: 20,
  thresholdHigh: 235,
  chars: " -=+*%#0oOxX@$",
  colored: true,
  colorStep: 1,
  maskHysteresis: 0,
};

test("light background keeps enclosed white content", () => {
  resetMaskStabilizer();

  const grid = Array.from(
    { length: 7 },
    () => Array.from({ length: 7 }, () => 250),
  );
  for (let row = 2; row <= 4; row++) {
    for (let col = 2; col <= 4; col++) {
      if (row === 2 || row === 4 || col === 2 || col === 4) {
        grid[row][col] = 10;
      }
    }
  }

  const frame = convertPixelsToAscii(toPixelText(grid), options);
  const center = sampleCell(frame, 3, 3);
  const border = sampleCell(frame, 0, 0);

  assert.notEqual(
    center.char,
    " ",
    "white island enclosed by content should remain visible",
  );
  assert.equal(center.color, "fafafa");
  assert.equal(border.char, " ");
  assert.equal(border.color, "");
});

test("dark background keeps enclosed dark content", () => {
  resetMaskStabilizer();

  const grid = Array.from(
    { length: 7 },
    () => Array.from({ length: 7 }, () => 0),
  );
  for (let row = 2; row <= 4; row++) {
    for (let col = 2; col <= 4; col++) {
      if (row === 2 || row === 4 || col === 2 || col === 4) {
        grid[row][col] = 245;
      }
    }
  }

  const frame = convertPixelsToAscii(toPixelText(grid), options);
  const center = sampleCell(frame, 3, 3);
  const border = sampleCell(frame, 0, 0);

  assert.notEqual(
    center.char,
    " ",
    "dark island enclosed by content should remain visible",
  );
  assert.equal(center.color, "000000");
  assert.equal(border.char, " ");
  assert.equal(border.color, "");
});

test("light background keeps near-white border transparent while preserving enclosed white", () => {
  resetMaskStabilizer();

  const grid = Array.from(
    { length: 7 },
    () => Array.from({ length: 7 }, () => 228),
  );
  for (let row = 2; row <= 4; row++) {
    for (let col = 2; col <= 4; col++) {
      if (row === 2 || row === 4 || col === 2 || col === 4) {
        grid[row][col] = 10;
      }
    }
  }
  grid[3][3] = 250;

  const frame = convertPixelsToAscii(toPixelText(grid), options);

  assert.equal(sampleCell(frame, 0, 0).char, " ");
  assert.equal(sampleCell(frame, 0, 0).color, "");
  assert.notEqual(
    sampleCell(frame, 3, 3).char,
    " ",
    "enclosed bright detail should remain visible",
  );
  assert.equal(sampleCell(frame, 3, 3).color, "fafafa");
});
