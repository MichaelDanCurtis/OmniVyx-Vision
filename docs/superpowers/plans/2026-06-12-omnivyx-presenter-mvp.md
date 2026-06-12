# OmniVyx Presenter MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable presenter-first OmniVyx self-demo with voice/cue simulation, manual controls, and a motion canvas.

**Architecture:** Pure TypeScript modules own the show graph, cue matching, and runtime reducer. React components render the live presenter shell and call those modules. CSS handles the motion and cinematic presentation styling.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library optional later.

---

### File Structure

- Create `package.json`: scripts and dependencies.
- Create `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`: Vite app setup.
- Create `src/domain/showGraph.ts`: typed data model and OmniVyx demo content.
- Create `src/domain/cueEngine.ts`: phrase normalization and cue matching.
- Create `src/domain/runtime.ts`: reducer for next/back/hold/restart/jump/cue actions.
- Create `src/domain/*.test.ts`: unit tests for cue and runtime behavior.
- Create `src/App.tsx`: app shell and presenter state wiring.
- Create `src/components/*.tsx`: live canvas, controls, cue panel, timeline.
- Create `src/styles.css`: responsive presenter UI and motion styling.

### Task 1: Project Bootstrap

- [ ] Create package/config files.
- [ ] Install dependencies with `pnpm install`.
- [ ] Run `pnpm test -- --run`; expected initial state is no tests or test setup ready.

### Task 2: Cue Engine TDD

- [ ] Write tests for exact command matching, natural cue matching, and no-match behavior.
- [ ] Run cue tests and verify they fail before implementation.
- [ ] Implement `normalizePhrase`, `findCueMatch`, and `findCommandMatch`.
- [ ] Run cue tests and verify they pass.

### Task 3: Runtime Reducer TDD

- [ ] Write tests for next/back/hold/restart and cue-triggered jumps.
- [ ] Run runtime tests and verify they fail before implementation.
- [ ] Implement the reducer and initial runtime state.
- [ ] Run runtime tests and verify they pass.

### Task 4: React Presenter UI

- [ ] Build the app shell around the tested domain modules.
- [ ] Render six moments in a timeline.
- [ ] Render live canvas with active moment styles and transcript status.
- [ ] Add manual controls and text cue input.
- [ ] Add optional Web Speech API mic button with graceful fallback.

### Task 5: Verification

- [ ] Run `pnpm test -- --run`.
- [ ] Run `pnpm build`.
- [ ] Start Vite dev server.
- [ ] Verify the app in browser at the local Vite URL.

