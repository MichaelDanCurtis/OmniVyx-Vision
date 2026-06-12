# OmniVyx

OmniVyx is an experimental voice-scored presentation platform.

The current prototype focuses on a presenter-first motion deck and the next major proof: a premium WebGL visual engine that treats video, 3D depth, generated motion loops, and dynamic overlays as controllable stage assets.

## Current Shape

- Vite, React, and TypeScript app.
- Text/voice cue simulation for live presentation flow.
- Design specs for the presenter MVP and visual engine proof.
- Local reference experiments are intentionally ignored from git.

## Scripts

```bash
pnpm install
pnpm test -- --run
pnpm build
pnpm dev -- --port 5173
```

## Visual Engine Direction

The next proof is a 45-second `LaunchStage` scene with WebGL depth, video-as-stage-object, cinematic motion, dynamic chart summon, and named stage events that can later be driven by live transcript intent.
