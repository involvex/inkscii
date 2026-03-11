# Inkscii Examples

This directory contains example projects demonstrating how to use the various Inkscii packages.

## Examples

### 1. [CLI Demo](./cli-demo)
An interactive terminal application built with [Ink](https://github.com/vadimdemedes/ink). It showcases `@inkscii/ascii` and `@inkscii/animations`.

**How to Run:**
```bash
cd examples/cli-demo
bun run start
```
*Controls:*
- `Up/Down`: Navigate the animation menu.
- `c`: Toggle color mode.
- `q`: Quit.

### 2. [Web Font Viewer](./web-font-viewer)
A web application built with Vite and React demonstrating `@inkscii/react-ascii-text`. It allows you to preview different Figlet fonts with custom text.

**How to Run:**
```bash
cd examples/web-font-viewer
bun install
bun run dev
```

## Setup & Development

All examples are managed as Bun workspaces within the monorepo. To ensure all workspace dependencies are linked, run `bun install` from the root directory.

To build all packages required by the examples:
```bash
bun run build
```
