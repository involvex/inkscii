import type { ColoredRunSegment } from "./parser";

export type RenderMode = "auto" | "dom" | "canvas" | "ansi";

export interface RendererOptions {
  fps: number;
  loop: boolean;
  colored: boolean;
  onFrame?: (index: number) => void;
  onComplete?: () => void;
  renderMode?: RenderMode;
  columns?: number;
  rows?: number;
  avgSegmentsPerFrame?: number;
}

export class RuneRenderer {
  private plainFrames: string[] = [];
  private coloredFrames: ColoredRunSegment[][][] = [];
  private changedRowsByFrame: number[][] = [];
  private frameIndex = 0;
  private animationId: any = null;
  private lastFrameTime = -1;
  private lastRenderedFrameIndex = -1;
  private forceFullFrameRender = true;
  private element: any = null;
  private options: RendererOptions;

  private lineEls: any[] = [];
  private spanEls: any[][] = [];
  private cachedText: string[][] = [];
  private cachedColors: string[][] = [];
  private rowVisible: boolean[] = [];
  private spanVisible: boolean[][] = [];

  private usingCanvas = false;
  private canvasEl: any = null;
  private canvasCtx: any = null;
  private canvasCharWidth = 0;
  private canvasLineHeight = 0;
  private canvasWidthCss = 0;
  private canvasHeightCss = 0;
  private canvasDefaultColor = "#000000";

  constructor(options: RendererOptions) {
    this.options = options;
  }

  setFrames(frames: string[]) {
    this.plainFrames = frames;
    this.coloredFrames = [];
    this.changedRowsByFrame = [];
    this.resetFrameProgress();
  }

  setPlainFrames(frames: string[]) {
    this.plainFrames = frames;
    this.coloredFrames = [];
    this.changedRowsByFrame = [];
    this.resetFrameProgress();
  }

  setColoredFrames(
    frames: ColoredRunSegment[][][],
    changedRowsByFrame: number[][] = [],
  ) {
    this.coloredFrames = frames;
    this.plainFrames = [];
    this.changedRowsByFrame = changedRowsByFrame;
    this.resetFrameProgress();
  }

  attach(element: any) {
    this.element = element;
    if (this.options.renderMode !== "ansi") {
      if (element && typeof element.textContent !== "undefined") {
        element.textContent = "";
      }
      this.resetDomCaches();
      this.destroyCanvas();
      this.usingCanvas =
        this.resolveRenderMode() === "canvas" && this.coloredFrames.length > 0;
      if (this.usingCanvas) {
        this.setupCanvas();
      }
    }
  }

  detach() {
    this.stop();
    this.element = null;
    if (this.options.renderMode !== "ansi") {
      this.resetDomCaches();
      this.destroyCanvas();
    }
  }

  renderCurrentFrame(): string | void {
    if (this.options.renderMode === "ansi") {
      return this.renderAnsiFrame();
    }

    if (!this.element) return;
    if (this.usingCanvas && this.coloredFrames.length > 0) {
      this.renderColoredFrameCanvas();
      return;
    }
    if (this.coloredFrames.length > 0) {
      this.renderColoredFrameDom();
      return;
    }
    if (this.options.colored) {
      this.renderColoredPlainFrame();
    } else {
      this.renderPlainFrame();
    }
  }

  start() {
    if (this.animationId !== null) return;
    this.lastFrameTime = -1;
    if (typeof requestAnimationFrame !== "undefined") {
      this.animationId = requestAnimationFrame(this.tick);
    } else {
      // Fallback for Node
      const start = Date.now();
      this.animationId = setInterval(() => {
        this.tick(Date.now() - start);
      }, 1000 / this.options.fps);
    }
  }

  stop() {
    if (this.animationId === null) return;
    if (typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.animationId);
    } else {
      clearInterval(this.animationId);
    }
    this.animationId = null;
  }

  isPlaying() {
    return this.animationId !== null;
  }

  updateOptions(partial: Partial<RendererOptions>) {
    const wasUsingCanvas = this.usingCanvas;
    Object.assign(this.options, partial);
    if (!this.element || this.coloredFrames.length === 0) return;
    const shouldUseCanvas = this.resolveRenderMode() === "canvas";
    if (wasUsingCanvas !== shouldUseCanvas) {
      this.attach(this.element);
      this.forceFullFrameRender = true;
      this.renderCurrentFrame();
    }
  }

  private renderPlainFrame() {
    if (!this.element || this.plainFrames.length === 0) return;
    this.element.textContent = this.plainFrames[this.frameIndex];
  }

  private renderColoredPlainFrame() {
    if (!this.element || this.plainFrames.length === 0) return;
    this.element.innerHTML = this.plainFrames[this.frameIndex];
  }

  private renderAnsiFrame(): string {
    if (this.coloredFrames.length > 0) {
      const frame = this.coloredFrames[this.frameIndex];
      return frame
        .map((row) => {
          return row
            .map((seg) => {
              if (this.options.colored && seg.color) {
                const r = parseInt(seg.color.slice(0, 2), 16);
                const g = parseInt(seg.color.slice(2, 4), 16);
                const b = parseInt(seg.color.slice(4, 6), 16);
                return `\x1b[38;2;${r};${g};${b}m${seg.text}\x1b[0m`;
              }
              return seg.text;
            })
            .join("");
        })
        .join("\n");
    } else if (this.plainFrames.length > 0) {
      return this.plainFrames[this.frameIndex];
    }
    return "";
  }

  private renderColoredFrameDom() {
    if (!this.element || this.coloredFrames.length === 0) return;
    const frame = this.coloredFrames[this.frameIndex];
    this.ensureRowCapacity(frame.length);
    const rowsToRender = this.getRowsToRender(frame.length);
    if (rowsToRender.length === 0) {
      this.lastRenderedFrameIndex = this.frameIndex;
      this.forceFullFrameRender = false;
      return;
    }
    for (let i = 0; i < rowsToRender.length; i++) {
      const row = rowsToRender[i];
      this.renderDomRow(row, frame[row]);
    }
    this.lastRenderedFrameIndex = this.frameIndex;
    this.forceFullFrameRender = false;
  }

  private ensureRowCapacity(rowCount: number) {
    if (!this.element) return;
    while (this.lineEls.length < rowCount) {
      const div = document.createElement("div");
      this.element.appendChild(div);
      this.lineEls.push(div);
      this.spanEls.push([]);
      this.cachedText.push([]);
      this.cachedColors.push([]);
      this.rowVisible.push(true);
      this.spanVisible.push([]);
    }
    for (let i = rowCount; i < this.lineEls.length; i++) {
      if (this.rowVisible[i]) {
        this.lineEls[i].style.display = "none";
        this.rowVisible[i] = false;
      }
    }
  }

  private renderDomRow(row: number, segments: ColoredRunSegment[]) {
    const lineDiv = this.lineEls[row];
    if (!this.rowVisible[row]) {
      lineDiv.style.display = "";
      this.rowVisible[row] = true;
    }
    const spans = this.spanEls[row];
    const textCache = this.cachedText[row];
    const colorCache = this.cachedColors[row];
    const visibleCache = this.spanVisible[row];

    while (spans.length < segments.length) {
      const span = document.createElement("span");
      lineDiv.appendChild(span);
      spans.push(span);
      textCache.push("");
      colorCache.push("");
      visibleCache.push(true);
    }
    for (let i = segments.length; i < spans.length; i++) {
      if (visibleCache[i]) {
        spans[i].style.display = "none";
        visibleCache[i] = false;
      }
    }

    for (let col = 0; col < segments.length; col++) {
      const seg = segments[col];
      const span = spans[col];

      if (!visibleCache[col]) {
        span.style.display = "";
        visibleCache[col] = true;
      }

      if (textCache[col] !== seg.text) {
        span.textContent = seg.text;
        textCache[col] = seg.text;
      }

      const wantColor = seg.color ? `#${seg.color}` : "";
      if (colorCache[col] !== wantColor) {
        span.style.color = wantColor;
        colorCache[col] = wantColor;
      }
    }
  }

  private renderColoredFrameCanvas() {
    if (!this.canvasCtx || !this.canvasEl || this.coloredFrames.length === 0)
      return;
    const frame = this.coloredFrames[this.frameIndex];
    const rowsToRender = this.getRowsToRender(frame.length);
    if (rowsToRender.length === 0) {
      this.lastRenderedFrameIndex = this.frameIndex;
      this.forceFullFrameRender = false;
      return;
    }
    if (rowsToRender.length === frame.length) {
      this.canvasCtx.clearRect(0, 0, this.canvasWidthCss, this.canvasHeightCss);
    }
    for (let i = 0; i < rowsToRender.length; i++) {
      const row = rowsToRender[i];
      const y = row * this.canvasLineHeight;
      this.canvasCtx.clearRect(
        0,
        y,
        this.canvasWidthCss,
        this.canvasLineHeight,
      );
      let x = 0;
      const segments = frame[row];
      for (
        let segmentIndex = 0;
        segmentIndex < segments.length;
        segmentIndex++
      ) {
        const segment = segments[segmentIndex];
        this.canvasCtx.fillStyle = segment.color
          ? `#${segment.color}`
          : this.canvasDefaultColor;
        this.canvasCtx.fillText(segment.text, x, y);
        x += this.canvasCharWidth * segment.text.length;
      }
    }
    this.lastRenderedFrameIndex = this.frameIndex;
    this.forceFullFrameRender = false;
  }

  private setupCanvas() {
    if (!this.element) return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      this.usingCanvas = false;
      return;
    }
    const computed = getComputedStyle(this.element);
    const fontSize = Number.parseFloat(computed.fontSize) || 10;
    const parsedLineHeight = Number.parseFloat(computed.lineHeight);
    const lineHeight = Number.isFinite(parsedLineHeight)
      ? parsedLineHeight
      : fontSize;
    context.font = `${fontSize}px ${computed.fontFamily}`;
    context.textBaseline = "top";
    this.canvasCharWidth = context.measureText("M").width || fontSize * 0.6;
    this.canvasLineHeight = lineHeight;
    const columns = this.options.columns ?? this.inferColumns();
    const rows = this.options.rows ?? this.inferRows();
    this.canvasWidthCss = Math.max(1, this.canvasCharWidth * columns);
    this.canvasHeightCss = Math.max(1, this.canvasLineHeight * rows);
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.style.width = `${this.canvasWidthCss}px`;
    canvas.style.height = `${this.canvasHeightCss}px`;
    canvas.width = Math.max(1, Math.round(this.canvasWidthCss * dpr));
    canvas.height = Math.max(1, Math.round(this.canvasHeightCss * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.font = `${fontSize}px ${computed.fontFamily}`;
    context.textBaseline = "top";
    this.canvasDefaultColor = computed.color || "#000000";
    this.element.appendChild(canvas);
    this.canvasEl = canvas;
    this.canvasCtx = context;
  }

  private destroyCanvas() {
    if (this.canvasEl && this.canvasEl.parentElement) {
      this.canvasEl.parentElement.removeChild(this.canvasEl);
    }
    this.canvasEl = null;
    this.canvasCtx = null;
    this.canvasCharWidth = 0;
    this.canvasLineHeight = 0;
    this.canvasWidthCss = 0;
    this.canvasHeightCss = 0;
    this.canvasDefaultColor = "#000000";
  }

  private inferColumns(): number {
    if (this.options.columns) return this.options.columns;
    const firstFrame = this.coloredFrames[0];
    if (!firstFrame || firstFrame.length === 0) return 1;
    let columns = 0;
    for (let i = 0; i < firstFrame[0].length; i++) {
      columns += firstFrame[0][i].text.length;
    }
    return Math.max(1, columns);
  }

  private inferRows(): number {
    if (this.options.rows) return this.options.rows;
    const firstFrame = this.coloredFrames[0];
    return Math.max(1, firstFrame ? firstFrame.length : 1);
  }

  private getRowsToRender(frameRowCount: number): number[] {
    if (
      this.forceFullFrameRender ||
      this.lastRenderedFrameIndex === -1 ||
      this.lastRenderedFrameIndex === this.frameIndex
    ) {
      return Array.from({ length: frameRowCount }, (_, row) => row);
    }
    const changedRows = this.changedRowsByFrame[this.frameIndex];
    if (!changedRows) {
      return Array.from({ length: frameRowCount }, (_, row) => row);
    }
    const rows: number[] = [];
    for (let i = 0; i < changedRows.length; i++) {
      const row = changedRows[i];
      if (row >= 0 && row < frameRowCount) {
        rows.push(row);
      }
    }
    return rows;
  }

  private resolveRenderMode(): "dom" | "canvas" {
    const mode = this.options.renderMode ?? "auto";
    if (mode === "dom" || mode === "canvas") return mode;
    if (mode === "ansi") return "dom"; // Should not happen with current logic
    const columns = this.options.columns ?? this.inferColumns();
    const rows = this.options.rows ?? this.inferRows();
    const avgSegments = this.options.avgSegmentsPerFrame ?? 0;
    const cellCount = columns * rows;
    if (cellCount >= 12000 || avgSegments >= 5000 || columns >= 140) {
      return "canvas";
    }
    return "dom";
  }

  private resetDomCaches() {
    this.lineEls = [];
    this.spanEls = [];
    this.cachedText = [];
    this.cachedColors = [];
    this.rowVisible = [];
    this.spanVisible = [];
  }

  private resetFrameProgress() {
    this.frameIndex = 0;
    this.lastRenderedFrameIndex = -1;
    this.forceFullFrameRender = true;
  }

  private tick = (time: number) => {
    const frameTime = 1000 / this.options.fps;
    const totalFrames =
      this.coloredFrames.length > 0
        ? this.coloredFrames.length
        : this.plainFrames.length;

    if (this.lastFrameTime === -1) {
      this.lastFrameTime = time;
    } else {
      const delta = time - this.lastFrameTime;
      if (delta >= frameTime && totalFrames > 0) {
        const framesToAdvance = Math.floor(delta / frameTime);
        if (framesToAdvance > 1) {
          this.forceFullFrameRender = true;
        }
        const nextIndex = this.frameIndex + framesToAdvance;

        if (nextIndex >= totalFrames && !this.options.loop) {
          this.frameIndex = totalFrames - 1;
          this.renderCurrentFrame();
          this.options.onComplete?.();
          this.animationId = null;
          return;
        }

        this.frameIndex = nextIndex % totalFrames;
        this.renderCurrentFrame();
        this.options.onFrame?.(this.frameIndex);
        this.lastFrameTime += framesToAdvance * frameTime;
      }
    }

    if (typeof requestAnimationFrame !== "undefined") {
      this.animationId = requestAnimationFrame(this.tick);
    }
  };
}
