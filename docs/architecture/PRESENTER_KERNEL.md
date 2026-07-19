# OmniVyx Vision Presenter Kernel

OmniVyx Vision is a live, AI-directed visual performance environment. The presenter and the AI author, rehearse, and perform a scored cinematic show together.

The native Presenter Kernel is the authority boundary between perception systems and the visual stage.

## Runtime Path

```text
native audio capture
  -> streaming transcript
  -> semantic intent candidates
  -> show-context arbitration
  -> validated presenter signal
  -> deterministic show transition
  -> WebGL stage render
```

## Invariants

1. The semantic engine proposes intent; it does not directly mutate the stage.
2. The show runtime remains deterministic for a given show document and accepted signal sequence.
3. Every accepted presenter signal receives a monotonically increasing native sequence number.
4. Presentation-time improvisation is bounded by the visual grammar and dynamic slots authored before the show.
5. Native speech, local models, and cloud models are adapters behind stable contracts rather than dependencies of stage components.
6. The browser build remains functional as a fallback, but it does not define the quality ceiling of the native presenter.

## Current Kernel Contract

Tauri exposes two commands:

- `get_presenter_capabilities`: reports the native shell, platform, architecture, and subsystem readiness.
- `accept_presenter_signal`: validates a typed signal and returns a sequenced receipt.

Supported signal kinds are:

- `transcriptFinal`
- `intentCandidate`
- `manualCue`
- `hold`
- `resume`

The current React proof submits transcript or intent signals through this contract. In a browser, the bridge resolves to a no-op fallback. In the Tauri app, Rust accepts and sequences the signal.

## Cinematic Show Document

`src/visual-engine/cinematicScore.ts` is the versioned visual contract for the current launch performance. Every accepted stage event resolves to one cue containing:

- authored copy and semantic emphasis;
- camera position, target, field of view, and transition character;
- product core, organic system, dynamic slot, glass, and video composition targets;
- key, rim, and accent light levels;
- continuous motion energy.

Stage components consume those targets with frame-rate-independent exponential damping. Cue handlers never mutate Three.js objects directly and render-loop code does not allocate target vectors per frame.

The visual grammar is cue-directed rather than globally decorative. Each cue authors a palette plus hero position, scale, and yaw. Product, network, and dynamic-data moments enforce a single dominant actor so supporting geometry yields instead of accumulating. The current premium material set consists of a layered optical monolith, shader-based liquid-glass panels, palette-driven procedural cloth, and a two-draw-call network bloom.

Semantic transitions and presenter energy are separate control channels. An accepted intent changes the deterministic stage event, while every accepted presenter utterance may also emit a bounded transient pulse that affects camera, lighting, cloth, glass, and hero motion without mutating the active event. Cue arrival, impact, and overshoot values plus the presenter pulse live on one stable mutable motion bus, keeping choreography synchronized without React state updates or render-loop allocations.

Show schema version 2 adds authored headline lines, copy entrance vectors, copy timing, and optical sweep direction and intensity to every cue. The renderer interprets those values as masked kinetic typography plus a camera-space transition veil, so each beat has deliberate editorial motion while the veil remains one draw call. Render telemetry samples after the post-processing composer, reports actual frame rate, calls, and triangles, and explicitly resets Three.js counters without taking over the low-quality render loop.

## Render Quality Contract

High quality is adaptive rather than a fixed pixel ratio. The stage measures sustained frame performance, selects a bounded device pixel ratio, and temporarily regresses resolution during scored transitions. The manual low-quality gate remains available as a deterministic fallback and disables post-processing.

The operator preview uses a stable aspect ratio. Presentation view expands the same stage to the full native window, hides operator controls and telemetry, advances authored cues with left and right arrow keys, and exits with Escape. Speech and native semantic signals continue to use the same event path in both views.

## Build Order

1. Expand the versioned cinematic show document into persisted authoring and rehearsal documents.
2. Native microphone capture and audio-level telemetry.
3. Apple SpeechAnalyzer adapter with partial and final transcript channels.
4. Local semantic candidate engine with confidence, hysteresis, and cooldown controls.
5. Rehearsal capture that binds presenter language to authored show intent.
6. Asset preflight, GPU/memory quality gates, and failure-safe presentation controls.
7. Authoring surfaces for story, production, additive dynamics, rehearsal, and live presentation.
