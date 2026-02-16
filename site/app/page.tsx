"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Rune, setRuneCdn } from "rune-ascii";

setRuneCdn("/animations");

type Theme = "dark" | "light";

function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = document.documentElement.getAttribute("data-theme");
    if (stored === "light") setThemeState("light");
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("rune-theme", t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, toggle };
}

interface AnimationEntry {
  name: string;
  colorOverlay?: string;
}

const animations: AnimationEntry[] = [
  {
    name: "fire",
    colorOverlay:
      "linear-gradient(90deg, rgba(247,70,5,0.6) 0%, rgba(255,140,0,1) 100%)",
  },
  { name: "ghost" },
  { name: "flame" },
  { name: "flowerSpinner" },
  { name: "coin" },
  { name: "earth1" },
  { name: "saturn" },
  { name: "orangutan" },
  { name: "shoes" },
  { name: "sleepEmoji" },
  { name: "angryEmoji" },
  { name: "geekedEmoji" },
  { name: "successCheck1" },
  { name: "error" },
  // { name: "tuxLaptop" },
  { name: "rocket" },
  { name: "sideFlames" },
  { name: "glassStar" },
  { name: "aitBot" },
];

type Size = "s" | "m" | "l";

const COLUMNS: Record<Size, number> = { s: 50, m: 90, l: 160 };
const SIZE_LABELS: Record<Size, string> = { s: "Low", m: "Med", l: "High" };

/** Monospace char width is roughly 0.6 × font-size. */
const CHAR_WIDTH_RATIO = 0.6;

function getSrc(name: string, size: Size): string {
  if (size === "m") return `/animations/${name}.rune.json`;
  return `/animations/${name}.${size}.rune.json`;
}

/** Measure the card body width and compute a font-size so the animation
 *  (which is COLUMNS[size] chars wide) fills the available space. */
function useFitFontSize(columns: number, padding: number = 24) {
  const ref = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const available = el.clientWidth - padding;
      const fs = available / (columns * CHAR_WIDTH_RATIO);
      setFontSize(fs);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [columns, padding]);

  return { ref, fontSize };
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 6,
        border: "1px solid var(--card-border)",
        background: "var(--toggle-bg)",
        color: "var(--toggle-fg)",
        cursor: "pointer",
        fontSize: 15,
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      {theme === "dark" ? "\u2600" : "\u263E"}
    </button>
  );
}

function Navbar({
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 32px",
        borderBottom: "1px solid var(--card-border)",
        backdropFilter: "blur(12px)",
        backgroundColor: "var(--nav-bg)",
        transition: "background-color 0.25s, border-color 0.25s",
      }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--accent)",
          letterSpacing: 2,
        }}
      >
        RUNE
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <a
          href="https://github.com/zekejohn/rune"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
          style={{
            fontFamily: "monospace",
            fontSize: 16,
            color: "var(--fg)",
            padding: "5px 12px",
            transition: "color 0.15s",
          }}
        >
          Github
        </a>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </nav>
  );
}

function DetailToggle({
  active,
  onChange,
}: {
  active: Size;
  onChange: (s: Size) => void;
}) {
  const sizes: Size[] = ["s", "m", "l"];
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {sizes.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 8px",
            border: "none",
            borderRadius: 3,
            cursor: "pointer",
            background: active === s ? "var(--btn-active)" : "var(--btn-bg)",
            color: active === s ? "#fff" : "var(--muted)",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {SIZE_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

function AnimationCard({
  name,
  colorOverlay,
}: {
  name: string;
  colorOverlay?: string;
}) {
  const [size, setSize] = useState<Size>("m");
  const { ref: bodyRef, fontSize } = useFitFontSize(COLUMNS[size]);

  return (
    <div
      style={{
        border: "1px solid var(--card-border)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--card-bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          borderBottom: "1px solid var(--card-border)",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: "var(--fg)",
            letterSpacing: 2,
          }}
        >
          {name}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: "var(--muted)",
              opacity: 0.5,
            }}
          >
            {COLUMNS[size]} cols
          </span>
          <DetailToggle active={size} onChange={setSize} />
        </div>
      </div>
      <div
        ref={bodyRef}
        style={{
          padding: 12,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {fontSize !== null && (
          <Rune
            key={`${name}-${size}`}
            src={getSrc(name, size)}
            colorOverlay={colorOverlay}
            renderMode="auto"
            style={{ fontSize }}
          />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { theme, toggle } = useTheme();

  return (
    <>
      <Navbar theme={theme} onToggleTheme={toggle} />
      <main
        style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 96px" }}
      >
        <div
          style={{
            marginBottom: 28,
            padding: "20px 0",
          }}
        >
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              color: "var(--muted)",
              maxWidth: 460,
              lineHeight: 1.6,
            }}
          >
            Composable ASCII art animations for React. Drop in mesmerizing text
            animations the same way you would use an icon pack.
          </p>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 8,
              padding: "8px 16px",
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: 6,
              display: "inline-block",
            }}
          >
            npm install rune-ascii
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {animations.map((anim) => (
            <AnimationCard
              key={anim.name}
              name={anim.name}
              colorOverlay={anim.colorOverlay}
            />
          ))}
        </div>
      </main>
    </>
  );
}
