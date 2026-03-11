# Inkscii Examples Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a comprehensive set of example projects demonstrating the Inkscii packages.

**Architecture:**
- Managed as Bun workspaces in the `examples/` directory.
- Shared dependencies from the root monorepo.
- Each example is a standalone project.

**Tech Stack:** Bun, React, Ink, Next.js, Vite.

---

### Phase 1: Infrastructure & CLI Demo

#### Task 1: Initialize Examples Workspace
**Files:**
- Modify: `package.json` (root)
- Create: `examples/package.json` (optional, if needed for common example deps)

**Step 1: Add examples to workspaces**
- Add `"examples/*"` to the `workspaces` array in the root `package.json`.
- Run: `bun install`

#### Task 2: Implement `examples/cli-demo`
**Files:**
- Create: `examples/cli-demo/package.json`
- Create: `examples/cli-demo/tsconfig.json`
- Create: `examples/cli-demo/src/index.tsx`

**Step 1: Scaffolding**
- Set up a basic Ink application with `@inkscii/ascii`, `@inkscii/animations`, and `ink-select-input`.
- Define the list of available animations (fire, ghost, saturn, etc.).

**Step 2: Implement UI**
- Add a title rendered with `ink`.
- Implement `SelectInput` for choosing animations.
- Use the `Rune` component to preview the selection.
- Add a key listener for 'c' to toggle colors.

**Step 3: Verify**
- Run: `bun run build:all` (ensure dependencies are linked)
- Run: `bun run start` (in `examples/cli-demo`)
- Verify: Interactive menu works, animations play, and color toggle functions.

---

### Phase 2: Web Examples

#### Task 3: Implement `examples/web-font-viewer` (Vite + React)
**Files:**
- Create: `examples/web-font-viewer/` (scaffolded with `bun create vite`)

**Step 1: Integrate `@inkscii/react-ascii-text`**
- Create a UI with a text input and a font selector (select dropdown).
- Use `useAsciiText` to render the preview.

#### Task 4: Implement `examples/video-to-web` (Workflow Demo)
**Files:**
- Create: `examples/video-to-web/`

**Step 1: Integration**
- Document the process of using `inkscii` CLI to generate a `.rune.json`.
- Create a simple Next.js app that loads and renders that file using `@inkscii/ascii`.

---

### Phase 3: Documentation & Cleanup

#### Task 5: Document Usage
**Files:**
- Create: `examples/README.md`
- Modify: `packages/*/README.md` (link to examples)

**Step 1: Write instructions**
- Add clear "How to Run" sections for each example.
- Update package READMEs with examples for quick start.

#### Task 6: Final Verification
- Run `bun run build:all` and verify all examples are functional.
