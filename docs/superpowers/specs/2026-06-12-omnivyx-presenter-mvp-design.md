# OmniVyx Presenter MVP Design

## Goal

Build a first runnable OmniVyx self-demo: a live presenter surface where a human can trigger a six-moment motion presentation with natural phrases or explicit commands.

## Product Shape

OmniVyx v1 is a presenter tool first, not a full authoring suite. The user starts with a prebuilt self-demo show about OmniVyx. The app displays a live visual canvas, a motion timeline, a cue map, transcript/command input, and manual fallback controls.

## Core Model

The app uses a `ShowGraph`:

- `moments`: ordered presentation moments with title, narration, visual style, cue phrases, and duration.
- `commands`: explicit controls such as next, back, hold, and jump.
- `runtime`: active moment, hold state, detected cue, and transcript history.

## MVP Features

- Six OmniVyx self-demo moments.
- Manual controls: previous, next, hold/resume, restart.
- Text-based voice simulator: type a phrase and run cue detection.
- Optional Web Speech API mic control when the browser supports it.
- Live canvas that changes typography, background, diagram/visual elements, and status as moments change.
- Cue map sidebar showing natural phrases and command phrases.

## Non-Goals

- No lasso editor.
- No full authoring timeline editor.
- No real OpenAI/OmniVoice integration in this first slice.
- No MP4 export in the app yet; `html-video` remains a reference path.

## Technical Approach

Use Vite, React, TypeScript, and Vitest. Keep runtime behavior in pure TypeScript modules so cue matching and reducer transitions are testable without a browser. Keep visual components separate from show data.

