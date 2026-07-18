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

## Build Order

1. Versioned show document and deterministic show runtime.
2. Native microphone capture and audio-level telemetry.
3. Apple SpeechAnalyzer adapter with partial and final transcript channels.
4. Local semantic candidate engine with confidence, hysteresis, and cooldown controls.
5. Rehearsal capture that binds presenter language to authored show intent.
6. Asset preflight, GPU/memory quality gates, and failure-safe presentation controls.
7. Authoring surfaces for story, production, additive dynamics, rehearsal, and live presentation.
