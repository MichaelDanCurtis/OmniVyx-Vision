# OmniVyx Visual Engine Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first `LaunchStage` proof that shows WebGL depth, video-as-stage-object, cinematic motion, dynamic chart summon, quality fallback, and named stage events.

**Architecture:** Keep the event/score model in pure TypeScript so it can be tested before rendering. Add a focused `visual-engine` feature folder for the WebGL proof and mount it as a first-class surface in the existing Vite app. Use generated/preloaded media as a video texture so the scene proves video can be managed as a spatial stage asset.

**Tech Stack:** Vite, React, TypeScript, Vitest, Three.js, React Three Fiber, drei, react-postprocessing.

---

## File Structure

- Create `src/visual-engine/stageScore.ts`: pure stage event state machine, event metadata, playback rates, quality settings.
- Create `src/visual-engine/stageScore.test.ts`: tests for event transitions, dynamic chart summon, hold behavior, quality fallback.
- Create `src/visual-engine/VideoLayer.tsx`: wraps a video source as a spatial Three.js texture plane.
- Create `src/visual-engine/LaunchStage.tsx`: WebGL scene, glass panes, motion ribbon, product core, organic growth, dynamic chart, camera movement.
- Create `src/visual-engine/StageControls.tsx`: temporary controls for named stage events and quality.
- Create `src/visual-engine/VisualEngineProof.tsx`: feature shell combining controls and stage.
- Modify `src/App.tsx`: add surface toggle between the current presenter MVP and visual engine proof, defaulting to visual engine.
- Modify `src/styles.css`: add shell/layout styles for the proof surface and WebGL canvas.
- Create `public/engine/launch-loop.webm`: small generated loop used as a controllable video texture.
- Modify `package.json` and `pnpm-lock.yaml`: add WebGL dependencies.

---

### Task 1: Stage Score Domain

**Files:**
- Create: `src/visual-engine/stageScore.ts`
- Test: `src/visual-engine/stageScore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  applyStageEvent,
  createInitialStageState,
  getStageEventMeta,
  setStageQuality,
  stageEvents,
} from './stageScore';

describe('stageScore', () => {
  it('starts on the open brand event with the dynamic chart hidden', () => {
    const state = createInitialStageState();

    expect(state.activeEvent).toBe('open_brand');
    expect(state.dynamicChartVisible).toBe(false);
    expect(state.videoPlaybackRate).toBe(0.7);
    expect(stageEvents.map((event) => event.id)).toEqual([
      'open_brand',
      'reveal_product',
      'explain_value',
      'grow_system',
      'summon_dynamic_chart',
      'hold',
      'resolve',
    ]);
  });

  it('turns the dynamic chart on only after the chart summon event', () => {
    const revealed = applyStageEvent(createInitialStageState(), 'reveal_product');
    const summoned = applyStageEvent(revealed, 'summon_dynamic_chart');

    expect(revealed.dynamicChartVisible).toBe(false);
    expect(summoned.dynamicChartVisible).toBe(true);
    expect(summoned.videoPlaybackRate).toBe(0.45);
  });

  it('keeps the previous event context when holding', () => {
    const grown = applyStageEvent(createInitialStageState(), 'grow_system');
    const held = applyStageEvent(grown, 'hold');

    expect(held.activeEvent).toBe('hold');
    expect(held.previousEvent).toBe('grow_system');
    expect(held.dynamicChartVisible).toBe(false);
    expect(held.videoPlaybackRate).toBe(0.25);
  });

  it('switches quality levels with deterministic feature flags', () => {
    const low = setStageQuality(createInitialStageState(), 'low');
    const high = setStageQuality(low, 'high');

    expect(low.quality).toBe('low');
    expect(low.effectsEnabled).toBe(false);
    expect(high.quality).toBe('high');
    expect(high.effectsEnabled).toBe(true);
  });

  it('provides display metadata for stage controls', () => {
    expect(getStageEventMeta('resolve').label).toBe('Resolve');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/visual-engine/stageScore.test.ts --run`

Expected: FAIL because `src/visual-engine/stageScore.ts` does not exist.

- [ ] **Step 3: Implement the stage score**

Create `StageEventId`, `StageQuality`, `StageState`, `stageEvents`, `createInitialStageState`, `applyStageEvent`, `setStageQuality`, and `getStageEventMeta`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/visual-engine/stageScore.test.ts --run`

Expected: 1 test file passes.

---

### Task 2: Dependencies and Video Asset

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `public/engine/launch-loop.webm`

- [ ] **Step 1: Install rendering dependencies**

Run:

```bash
pnpm add three @react-three/fiber @react-three/drei @react-three/postprocessing
```

Expected: dependencies are added to `package.json` and `pnpm-lock.yaml`.

- [ ] **Step 2: Generate a small local video loop**

Run:

```bash
mkdir -p public/engine
ffmpeg -y -f lavfi -i "testsrc2=size=960x540:rate=30,format=yuv420p" -t 6 -an -c:v libvpx-vp9 -b:v 700k public/engine/launch-loop.webm
```

Expected: `public/engine/launch-loop.webm` exists and is small enough to commit.

---

### Task 3: WebGL Stage Components

**Files:**
- Create: `src/visual-engine/VideoLayer.tsx`
- Create: `src/visual-engine/LaunchStage.tsx`

- [ ] **Step 1: Create `VideoLayer`**

The component should create an HTML video element, wrap it in a Three.js `VideoTexture`, expose playback rate updates, and render it on a 3D plane.

- [ ] **Step 2: Create `LaunchStage`**

The component should render:

- a `<Canvas>` with camera and lights,
- moving glass panes,
- a video-textured plane,
- a cloth/ribbon mesh,
- a central product core,
- an organic growth structure,
- a dynamic chart slot,
- postprocessing when `state.effectsEnabled` is true.

- [ ] **Step 3: Keep the canvas verifiable**

Add stable attributes:

```tsx
<section className="visual-engine-stage" data-stage-event={state.activeEvent} data-quality={state.quality}>
```

Expected browser checks can assert the event and quality directly from the DOM.

---

### Task 4: App Integration

**Files:**
- Create: `src/visual-engine/StageControls.tsx`
- Create: `src/visual-engine/VisualEngineProof.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add stage controls**

Controls should call `applyStageEvent` for every named event and `setStageQuality` for `high` / `low`.

- [ ] **Step 2: Add the proof shell**

The shell should render the `LaunchStage`, a short quality bar, and controls. It should default to `open_brand`.

- [ ] **Step 3: Mount the proof in the app**

Default the app to the visual engine surface while keeping the existing presenter MVP accessible through a surface toggle.

---

### Task 5: Verification and Publish

**Files:**
- Modify only files changed by Tasks 1-4.

- [ ] **Step 1: Run all tests**

Run: `pnpm test -- --run`

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `pnpm build`

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Verify in browser**

Open `http://127.0.0.1:5173/`, verify:

- `canvas` exists and is nonblank,
- `data-stage-event` changes after clicking `Reveal product`,
- `Summon dynamic chart` makes the dynamic chart visible,
- `Low quality` changes `data-quality` to `low`.

- [ ] **Step 4: Commit and push**

Run:

```bash
git add package.json pnpm-lock.yaml public/engine src docs
git commit -m "Build visual engine proof"
git push
```

Expected: changes are pushed to `origin/main`.
