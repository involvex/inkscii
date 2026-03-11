# Monorepo Migration & Build System Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a comprehensive monorepo setup, migrate from `tsup` to `bun` build runtime, sync module types, and update all dependencies.

**Architecture:** 
- Use Bun workspaces for monorepo management.
- Replace `tsup` with `bun build` for bundling and `tsc` for type generation.
- Standardize `tsconfig.json` and `package.json` structures across all packages.
- Centralize scripts in the root `package.json`.

**Tech Stack:** Bun, TypeScript, React 19, Ink.

---

### Phase 1: Monorepo & Dependency Standardization

#### Task 1: Update Root `package.json`
**Files:**
- Modify: `package.json`

**Step 1: Standardize dependencies and scripts**
- Update all dependencies to latest (React 19, Ink 6, etc.).
- Add workspace-wide scripts using `bun --filter`.

**Step 2: Run `bun install`**
- Run: `bun install`
- Verify: `bun.lock` is updated and all dependencies are resolved.

#### Task 2: Standardize `tsconfig.json`
**Files:**
- Modify: `tsconfig.json` (root)
- Modify: `packages/*/tsconfig.json`

**Step 1: Update root `tsconfig.json`**
- Ensure it has a robust base configuration.

**Step 2: Update package-specific `tsconfig.json`**
- Extend the root config.
- Set `rootDir` and `outDir` consistently.

---

### Phase 2: Build System Migration (tsup -> bun build)

#### Task 3: Implement Bun Build Script for `@inkscii/ascii`
**Files:**
- Create: `packages/inkscii-ascii/build.ts` (or update package.json to use `bun build`)
- Modify: `packages/inkscii-ascii/package.json`

**Step 1: Replace tsup scripts**
- Use `bun build` for ESM and CJS outputs.
- Use `tsc --emitDeclarationOnly` for types.

**Step 2: Verify Build**
- Run: `bun run build` in `packages/inkscii-ascii`
- Expected: `dist/` contains `index.js`, `index.cjs`, and `index.d.ts`.

#### Task 4: Implement Bun Build Script for `@inkscii/cli`
**Files:**
- Modify: `packages/cli/package.json`

**Step 1: Replace tsup scripts**
- Use `bun build` with `--compile` or just bundling for Node/Bun.
- Ensure shebang `#!/usr/bin/env node` or `#!/usr/bin/env bun` is preserved.

#### Task 5: Implement Bun Build Script for `@inkscii/react-ascii-text`
**Files:**
- Modify: `packages/react-ascii-text/package.json`

**Step 1: Replace tsup scripts**
- Use `bun build`.
- Add step to copy fonts from `src/fonts` to `dist/fonts`.

---

### Phase 3: Module Type Syncing & Final Verification

#### Task 6: Sync `package.json` Exports
**Files:**
- Modify: `packages/*/package.json`

**Step 1: Update `exports`, `main`, `module`, `types`**
- Ensure consistent mapping to `dist/` files.

#### Task 7: Root Build & Verification
**Step 1: Run full build from root**
- Run: `bun build:all` (new root script)
- Expected: All packages build successfully.

**Step 2: Lint and Typecheck**
- Run: `bun lint`, `bun typecheck`
- Expected: No errors.

#### Task 8: Update `Plan.md`
**Files:**
- Modify: `Plan.md`

**Step 1: Mark migration as complete**
- Update the Todo section.
