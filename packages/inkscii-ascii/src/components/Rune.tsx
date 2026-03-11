import {
  useCallback,
  useRef,
  useState,
  useEffect,
  type CSSProperties,
} from "react";
import { useIsomorphicLayoutEffect } from "../hooks/useIsomorphicLayoutEffect";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import { parseFrames, parseColoredFrameSet } from "../core/parser";
import { RuneRenderer, type RenderMode } from "../core/renderer";
import { getAnimationUrl, type RuneSize } from "../core/cdn";
import type { RuneAnimation } from "../core/types";

export interface RuneProps {
  name?: string;
  size?: RuneSize;
  data?: RuneAnimation;
  animation?: RuneAnimation; // Alias for data
  src?: string;
  fps?: number;
  renderMode?: RenderMode;
  playing?: boolean;
  loop?: boolean;
  colorOverlay?: string;
  colored?: boolean; // Toggle color output
  className?: string;
  style?: CSSProperties;
  onFrame?: (index: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

const containerStyle: CSSProperties = {
  position: "relative",
  fontFamily: "monospace",
  whiteSpace: "pre",
  overflow: "hidden",
  fontSize: "10px",
  lineHeight: 1,
};

const overlayStyle = (colorOverlay: string): CSSProperties => ({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  borderRadius: "12px",
  background: colorOverlay,
  mixBlendMode: "color",
});

export function Rune({
  name,
  size = "m",
  data,
  animation,
  src,
  fps,
  renderMode = "auto",
  playing = true,
  loop = true,
  colorOverlay,
  colored = true,
  className,
  style,
  onFrame,
  onComplete,
  onError,
}: RuneProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [ansiFrame, setAnsiFrame] = useState("");
  const displayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RuneRenderer | null>(null);
  const animationDataRef = useRef<RuneAnimation | null>(null);
  const hasLoadedRef = useRef(false);

  const effectiveData = data || animation;

  const isBrowser = typeof window !== "undefined";
  const effectiveRenderMode: RenderMode = !isBrowser ? "ansi" : renderMode;

  const initRenderer = useCallback(
    (animData: RuneAnimation) => {
      animationDataRef.current = animData;
      const effectiveFps = fps ?? animData.meta.fps;

      const renderer = new RuneRenderer({
        fps: effectiveFps,
        loop,
        colored: colored && animData.meta.colored,
        renderMode: effectiveRenderMode,
        columns: animData.meta.columns,
        rows: animData.meta.rows,
        avgSegmentsPerFrame: animData.meta.performance?.avgSegmentsPerFrame,
        onFrame: (idx) => {
          if (effectiveRenderMode === "ansi") {
            const frame = renderer.renderCurrentFrame();
            if (typeof frame === "string") setAnsiFrame(frame);
          }
          onFrame?.(idx);
        },
        onComplete,
      });

      if (animData.meta.colored) {
        const parsed = parseColoredFrameSet(animData);
        renderer.setColoredFrames(parsed.frames, parsed.changedRowsByFrame);
      } else {
        renderer.setFrames(parseFrames(animData));
      }

      rendererRef.current = renderer;
      setStatus("ready");

      if (effectiveRenderMode === "ansi") {
        const frame = renderer.renderCurrentFrame();
        if (typeof frame === "string") setAnsiFrame(frame);
      }
    },
    [fps, loop, onFrame, onComplete, effectiveRenderMode, colored],
  );

  const resolveUrl = useCallback((): string | null => {
    if (src) return src;
    if (name) return getAnimationUrl(name, size);
    return null;
  }, [src, name, size]);

  const load = useCallback(async () => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    if (effectiveData) {
      initRenderer(effectiveData);
      return;
    }

    const url = resolveUrl();
    if (url) {
      setStatus("loading");
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load animation: ${response.status}`);
        }
        const animData: RuneAnimation = await response.json();
        initRenderer(animData);
      } catch (err) {
        setStatus("error");
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [effectiveData, resolveUrl, initRenderer, onError]);

  // Use useEffect for initial load in non-browser env
  useEffect(() => {
    if (!isBrowser && effectiveData) {
      load();
    }
  }, [isBrowser, effectiveData, load]);

  useIntersectionObserver(containerRef, load, { rootMargin: "400px" });

  useIsomorphicLayoutEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || status !== "ready") return;

    if (displayRef.current && effectiveRenderMode !== "ansi") {
      renderer.attach(displayRef.current);
      renderer.renderCurrentFrame();
    }

    if (!isBrowser) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    const container = containerRef.current;
    if (!container) return;

    let isVisible = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (entry.isIntersecting && playing && document.hasFocus()) {
          renderer.start();
        } else {
          renderer.stop();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(container);

    const handleFocus = () => {
      if (isVisible && playing) renderer.start();
    };
    const handleBlur = () => renderer.stop();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      renderer.stop();
    };
  }, [status, playing, isBrowser, effectiveRenderMode]);

  useIsomorphicLayoutEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.updateOptions({
      fps: fps ?? animationDataRef.current?.meta.fps ?? 30,
      loop,
      renderMode: effectiveRenderMode,
      colored,
      onFrame: (idx) => {
        if (effectiveRenderMode === "ansi") {
          const frame = renderer.renderCurrentFrame();
          if (typeof frame === "string") setAnsiFrame(frame);
        }
        onFrame?.(idx);
      },
      onComplete,
    });
  }, [fps, loop, onFrame, onComplete, effectiveRenderMode, colored]);

  useIsomorphicLayoutEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || status !== "ready") return;
    if (playing) {
      renderer.start();
    } else {
      renderer.stop();
    }
  }, [playing, status]);

  if (effectiveRenderMode === "ansi") {
    // In Ink, we just return a Text component or similar. 
    // But since this package is shared, we should probably return 
    // something that works in both. In Node/Ink, we just want the string.
    // However, React components must return ReactElements.
    // For Ink, we'll use a fragment with the string which Ink's 
    // reconciler will handle if it's inside a <Text> component.
    // To make it easy, let's wrap it in a div for browser and let Ink handle the string.
    return isBrowser ? (
      <div
        ref={containerRef}
        className={className}
        style={{ ...containerStyle, ...style }}
      >
        {ansiFrame}
      </div>
    ) : (
      (ansiFrame as any)
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...containerStyle, ...style }}
    >
      {status === "loading" && <div style={{ color: "#666" }}>Loading...</div>}
      <div style={{ position: "relative" }}>
        <div ref={displayRef} />
        {colorOverlay && <div style={overlayStyle(colorOverlay)} />}
      </div>
    </div>
  );
}
