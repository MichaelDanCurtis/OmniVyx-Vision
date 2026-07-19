# OmniVyx Vision

OmniVyx Vision is a live, AI-directed visual performance environment. A presenter and an AI co-author, rehearse, and perform a scored cinematic show together.

The current prototype focuses on a presenter-first motion deck and the next major proof: a premium WebGL visual engine that treats video, 3D depth, generated motion loops, and dynamic overlays as controllable stage assets.

## Current Shape

- Tauri 2 native presenter shell with a Rust Presenter Kernel.
- Vite, React, and TypeScript authoring/stage surface.
- Text/voice cue simulation plus low-latency level, peak, emphasis, and cadence response.
- Typed native signal intake for transcripts, intent candidates, holds, resumes, and manual cues.
- Design specs for the presenter MVP and visual engine proof.
- Local reference experiments are intentionally ignored from git.

## Scripts

```bash
pnpm install
pnpm test -- --run
pnpm build
pnpm dev -- --port 5173
pnpm native:check
pnpm desktop:dev
pnpm desktop:build
```

## Visual Engine Direction

The current proof is a `LaunchStage` scene with WebGL depth, video-as-stage-object, cinematic motion, dynamic chart summon, and named stage events driven by transcript intent. The native Presenter Kernel is the attachment point for Apple speech recognition, local semantic scoring, and deterministic show arbitration.
