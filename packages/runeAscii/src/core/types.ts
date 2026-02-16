export type RuneFrameRow = [text: string, colors: string[]];

export type RuneColoredFrame = RuneFrameRow[];

export type RunePlainFrame = string[];

export type RuneFrame = RuneColoredFrame | RunePlainFrame;

export interface RuneGenerationSettings {
  thresholdLow: number;
  thresholdHigh: number;
  chars: string;
  fontRatio: number;
  colorStep?: number;
  temporalHold?: number;
}

export interface RunePerformanceStats {
  avgSegmentsPerFrame: number;
  maxSegmentsPerFrame: number;
  avgCharChangesPerFrame: number;
  avgColorChangesPerFrame: number;
  avgRowsWithCharChangesPerFrame: number;
  avgRowsWithColorChangesPerFrame: number;
}

export interface RuneRuntimeHints {
  changedRowsByFrame?: number[][];
}

export interface RuneMeta {
  name: string;
  fps: number;
  columns: number;
  rows: number;
  frameCount: number;
  colored: boolean;
  generatedWith: RuneGenerationSettings;
  performance?: RunePerformanceStats;
}

export interface RuneAnimation {
  version: 1;
  meta: RuneMeta;
  frames: RuneFrame[];
  runtimeHints?: RuneRuntimeHints;
}
