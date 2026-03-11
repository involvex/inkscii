# Inkscii

> A modern, comprehensive ASCII art and animation ecosystem for React, Ink, and the Terminal.

Inkscii is a collection of packages designed to make ASCII art animations as easy to use as icon packs. Whether you're building a sleek terminal UI with [Ink](https://github.com/vadimdemedes/ink) or a retro-styled web application, Inkscii provides the tools to generate, render, and animate ASCII content with ease.

## 📦 Packages

| Package | Description |
| :--- | :--- |
| [`@inkscii/ascii`](./packages/inkscii-ascii) | Core rendering component for React (Web) and Ink (CLI). |
| [`@inkscii/react-ascii-text`](./packages/react-ascii-text) | React hook for animating Figlet fonts with high-quality transitions. |
| [`@inkscii/cli`](./packages/cli) | CLI tool to convert video files into `.rune.json` ASCII animations. |
| [`@inkscii/animations`](./packages/inkscii-animations) | A library of pre-generated ASCII animations ready for use. |

## 🚀 Quick Start

### Installation

```bash
bun install @inkscii/ascii @inkscii/animations
```

### Basic Usage (Web)

```tsx
import { Rune } from "@inkscii/ascii";
import fire from "@inkscii/animations/fire.rune.json";

function App() {
  return <Rune data={fire} colored={true} />;
}
```

### Basic Usage (Terminal with Ink)

```tsx
import React from "react";
import { render, Box } from "ink";
import { Rune } from "@inkscii/ascii";
import ghost from "@inkscii/animations/ghost.s.rune.json";

const App = () => (
  <Box padding={2} borderStyle="round">
    <Rune animation={ghost} />
  </Box>
);

render(<App />);
```

## 🛠️ Monorepo Commands

This project uses [Bun](https://bun.sh) workspaces.

- **Install dependencies:** `bun install`
- **Build all packages:** `bun run build`
- **Lint all packages:** `bun run lint`
- **Typecheck all packages:** `bun run typecheck`

## 🌟 Examples

Check out the [`examples/`](./examples) directory for ready-to-run projects:

1. **[CLI Demo](./examples/cli-demo):** An interactive terminal animation selector built with Ink.
2. **[Web Font Viewer](./examples/web-font-viewer):** A Vite-powered web app to preview all available Figlet fonts.

To run an example:
```bash
cd examples/cli-demo
bun run start
```

## 🎨 Core Concepts

### .rune.json
The standard format for Inkscii animations. It contains frame-by-frame character and color data, optimized for incremental updates and low memory footprint.

### Multi-Environment Rendering
`@inkscii/ascii` detects its environment and automatically switches between:
- **DOM:** High-performance incremental updates for the web.
- **Canvas:** Optimized rendering for large or complex animations.
- **ANSI:** Colorized string output for terminal-based applications.

## 📄 License

MIT © [involvex](https://github.com/involvex)
