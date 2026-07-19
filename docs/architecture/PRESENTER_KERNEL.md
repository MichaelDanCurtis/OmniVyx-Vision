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
- product core, organic system, dynamic slot, glass, and hybrid-media composition targets;
- key, rim, and accent light levels;
- bloom, depth focus, bokeh, vignette, and exposure targets;
- continuous motion energy.

Stage components consume those targets with frame-rate-independent exponential damping. Cue handlers never mutate Three.js objects directly and render-loop code does not allocate target vectors per frame.

The visual grammar is cue-directed rather than globally decorative. Each cue authors a palette plus hero position, scale, and yaw. Product, network, and dynamic-data moments enforce a single dominant actor so supporting geometry yields instead of accumulating. The current premium material set consists of a layered optical monolith, shader-based liquid-glass panels, palette-driven procedural cloth, and a two-draw-call organic constellation. The constellation builds one deterministic curved ribbon geometry and one node geometry at mount time. GPU growth masks reveal it from root to branch tips, while traveling light, terminal-node emphasis, and presenter energy animate the same fixed buffers without render-loop allocation. Dormant cues suppress branch and node opacity, and the product monolith leaves the render path below its visibility threshold, so scaled-down actors cannot leave pixel-sized residue in another composition.

Semantic transitions and presenter energy are separate control channels. An accepted intent changes the deterministic stage event, while every accepted presenter utterance may also emit a bounded transient pulse that affects camera, lighting, cloth, glass, and hero motion without mutating the active event. Cue arrival, impact, and overshoot values plus the presenter pulse live on one stable mutable motion bus, keeping choreography synchronized without React state updates or render-loop allocations.

Continuous presenter energy now enters through a second stable mutable signal. The browser/native-webview proof requests a mono microphone stream, reuses one 512-sample PCM buffer, and applies frame-rate-independent attack and release before the WebGL director samples it. Camera breathing, media refraction, cloth energy, glass, product highlights, network bloom, and cinematic lighting respond without React state updates. A manual cue or finalized transcript emits a bounded 220 ms fallback kick only when waveform capture is inactive; runtime attributes distinguish that fallback (`audio: idle`) from a real microphone signal (`audio: active`). Recognition sessions keep current show context in a ref so relative commands are never evaluated against the state from when listening began.

The macOS bundle declares microphone and speech-recognition usage descriptions. The native audio-energy surface is implemented as Web Audio hosted in WKWebView but remains `planned` until microphone device preflight and capture are verified in the packaged app. A future Core Audio adapter can write the same signal contract without changing the stage. Streaming transcription remains planned behind the separate Apple SpeechAnalyzer adapter.

Show schema version 5 combines authored phase windows with a cue-directed optical lens. Every phase window is a normalized interval within the cue duration, allowing the director to lead with camera intent, hand motion to the media and live actors, then reveal copy instead of making every layer chase a target simultaneously. Bloom, focus distance and range, bokeh, vignette, and exposure are damped on the same motion bus: reveal and resolve moments gain dimensional depth, while dynamic-data and hold moments preserve a wide, crisp focus plane. Presenter energy adds bounded optical response without changing the cue or allocating effects in the render loop. The previous copy remains as one temporary, inert DOM layer during its authored exit and is removed after the handoff. Reduced-motion environments suppress that outgoing layer.

The media target controls asset, opacity, depth, scale, offset, drift, palette tint, and tempo. The current optical master is a project-local 1672x941 generated plate composited as one cached, depth-displaced shader surface behind the live 3D actors; presenter energy and cue tempo modulate its motion without recreating the texture.

The renderer interprets transition values as masked kinetic typography plus a camera-space transition veil, so each beat has deliberate editorial motion while the veil remains one draw call. Render telemetry samples after the post-processing composer and reports actual frame rate, renderer pixel ratio, calls, triangles, p95 frame time, and frames slower than 24 ms. Frame timing uses a fixed 0-80 ms histogram that is allocated once and reset in place. Three.js counters are explicitly reset without taking over the low-quality render loop. Low quality fades and hides the media surface before removing it from the draw count.

## Render Quality Contract

High quality is adaptive rather than a fixed pixel ratio. The stage measures sustained frame performance, selects a bounded device pixel ratio, and temporarily regresses resolution during scored transitions. The manual low-quality gate remains available as a deterministic fallback and disables post-processing.

The operator preview uses a stable aspect ratio. Presentation view expands the same stage to the full native window, hides operator controls and telemetry, advances authored cues with left and right arrow keys, and exits with Escape. Speech and native semantic signals continue to use the same event path in both views.

## Build Order

1. Expand the versioned cinematic show document into persisted authoring and rehearsal documents.
2. Promote the Web Audio energy proof to a native Core Audio adapter with device selection and preflight.
3. Apple SpeechAnalyzer adapter with partial and final transcript channels.
4. Local semantic candidate engine with confidence, hysteresis, and cooldown controls.
5. Rehearsal capture that binds presenter language to authored show intent.
6. Asset preflight, GPU/memory quality gates, and failure-safe presentation controls.
7. Authoring surfaces for story, production, additive dynamics, rehearsal, and live presentation.
