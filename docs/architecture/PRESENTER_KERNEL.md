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
- camera position, target, field of view, transient shot arc, focal arc, roll, and portrait framing;
- bounded idle, minimum, maximum, energy, and peak pacing targets;
- product core, organic system, dynamic slot, glass, and hybrid-media composition targets;
- key, rim, and accent light levels;
- atmosphere glow position, horizon, ribbons, evidence grid, particles, and drift;
- bloom, depth focus, bokeh, vignette, and exposure targets;
- continuous motion energy.

Stage components consume those targets with frame-rate-independent exponential damping. Cue handlers never mutate Three.js objects directly and render-loop code does not allocate target vectors per frame.

The visual grammar is cue-directed rather than globally decorative. Each cue authors a palette plus hero position, scale, and yaw. Product, network, and dynamic-data moments enforce a single dominant actor so supporting geometry yields instead of accumulating. The current premium material set consists of a four-draw optical core, one seven-plane instanced liquid-glass array, palette-driven procedural cloth, a two-draw-call organic constellation, and a two-draw-call cinematic evidence actor. The optical core combines one thin iridescent shell, one recessed procedural iris surface, one suspended faceted lens, and one instanced draw containing eight rounded perimeter rails. The iris synthesizes a layered cavity, segmented aperture, depth disc, micro-traces, radial ticks, and moving caustics in one fragment pass. Shell roughness and iridescence, rail assembly, lens rotation, palette, and emissive response follow the same damped cue and presenter-energy bus without render-loop allocation. The product cue uses the full authored portrait pullback and a hero-biased focal target so the complete optical instrument remains visible beside the narrative copy at narrow aspect ratios. Live direction turns the core to expose its depth; hold makes it the sole quiet actor and drops the dormant network. The optical array shares one subdivided geometry and one shader material; seven persistent transform composers update one dynamic instance-matrix buffer, giving the stage more varied scale, depth, drift, and impact response while replacing three draw calls with one. The constellation expands its authored skeleton into a deterministic 61-node secondary canopy, then builds one curved ribbon geometry and one node geometry at mount time. The ribbon shader uses a twisted side profile, depth-aware color, core and rim light, restrained striation, and traveling energy to read as a dimensional conduit rather than a flat line. The point pass now receives its missing scale uniform, follows the same branch sway, and renders terminal lenses at the generated tips. GPU growth masks reveal both buffers from root to canopy without render-loop allocation. The evidence actor uses one four-column instanced mesh and one fixed tube curve. Its matrices, reveal mask, palette, and voice response animate existing buffers, and its faster release envelope removes both draws after the editorial handoff. Dormant organic and product actors now leave the draw path after their damped scale and opacity fall below visibility thresholds, preventing pixel residue while returning the network's two-draw budget to compositions that do not need it.

Prepared dynamic content now has one shared evidence contract. `src/visual-engine/evidenceScore.ts` owns the exact series metadata, values, display labels, and normalization used by both the WebGL actor and the accessible DOM readout. The readout is open editorial typography rather than a dashboard card; the GPU columns and curve provide depth behind it. The runtime exposes evidence activity and point count for audits, and direct evidence-to-resolve transitions preserve the prepared slot while other cue paths yield it.

Semantic transitions and presenter energy are separate control channels. An accepted intent changes the deterministic stage event, while every accepted presenter utterance may also emit a bounded transient pulse that affects camera, lighting, cloth, glass, and hero motion without mutating the active event. Cue arrival, impact, and overshoot values plus the presenter pulse live on one stable mutable motion bus, keeping choreography synchronized without React state updates or render-loop allocations.

An accepted intent can interrupt a cue without restarting the stage from rest. The director samples the unfinished cue once, carries a bounded continuity value into the next score, and decays that value independently of frame rate. While continuity is active it gives camera, media, lighting, and actors enough damping to move from their current transforms toward the new authored targets, while reducing the new cue's impact and overshoot. Repeated commands preserve the strongest unfinished handoff, never stack visual actors, and expose `data-cue-handoff` plus `data-cue-interrupted` for runtime audits. Interrupted typography uses a compressed handoff profile with a shorter outgoing tail and earlier legibility; uninterrupted cues retain their full authored copy delay and reveal.

Continuous presenter energy now enters through a second stable mutable signal. The browser/native-webview proof requests a mono microphone stream, reuses one 512-sample PCM buffer, and applies frame-rate-independent attack and release before the WebGL director samples it. Camera breathing, media refraction, cloth energy, glass, product highlights, the organic constellation, cue-authored atmosphere, and cinematic lighting respond without React state updates. A manual cue or finalized transcript emits a bounded 220 ms fallback kick only when waveform capture is inactive; runtime attributes distinguish that fallback (`audio: idle`) from a real microphone signal (`audio: active`). Recognition sessions keep current show context in a ref so relative commands are never evaluated against the state from when listening began.

The macOS bundle declares microphone and speech-recognition usage descriptions. The native audio-energy surface is implemented as Web Audio hosted in WKWebView but remains `planned` until microphone device preflight and capture are verified in the packaged app. A future Core Audio adapter can write the same signal contract without changing the stage. Streaming transcription remains planned behind the separate Apple SpeechAnalyzer adapter.

Show schema version 9 combines authored phase windows with cue-directed pacing, optical lens, world, camera-shot, and evidence-layout scores. Every camera shot defines a transient position arc, focal-target arc, roll, and field-of-view arc that return to the cue's settled camera target. Product reveal dollies inward, growth orbits upward, evidence shifts toward its data plane, hold breathes backward, and resolve converges. Each cue also authors a portrait focal offset and pullback. The renderer blends those targets from landscape through portrait while attenuating lateral travel, roll, and FOV tightening on narrow stages, keeping dominant actors composed rather than cropped. Evidence position, rotation, and spread are authored in the same cue, then reframed above the narrative copy on portrait stages. The camera and evidence actor sample those paths from the existing normalized phase envelope using persistent vectors and scalar math, so no objects are allocated in the render loop. Every phase window remains a normalized interval within the cue duration, allowing the director to lead with camera intent, hand motion to the media and live actors, then reveal copy instead of making every layer chase a target simultaneously. Bloom, focus distance and range, bokeh, vignette, and exposure are damped on the same motion bus: reveal and resolve moments gain dimensional depth, while dynamic-data and hold moments preserve a wide, crisp focus plane. The world score adds continuously interpolable studio glow, horizon light, atmospheric ribbons, evidence grid, particles, and drift. Presenter energy adds bounded optical and atmospheric response without changing the cue or allocating effects in the render loop. The previous copy remains as one temporary, inert DOM layer during its authored exit and is removed after the handoff. Reduced-motion environments suppress that outgoing layer.

Cue pacing is sampled exactly once when an accepted semantic event selects a new cue. The resolver combines the cue's idle rate with bounded presenter level and peak gains, then clamps the result to the authored range. That frozen rate scales WebGL motion progress, incoming and outgoing copy duration, copy delay, line stagger, and panel handoff. Waveform decay therefore cannot retime a transition halfway through it, and switching render quality cannot change performance timing. Runtime attributes expose the frozen pace and effective cue duration. In the launch score an energetic product reveal resolves to 1.24x and 927 ms, an energetic evidence summon can reach 1.32x and 682 ms, and the same fallback pulse holds at 0.915x and 2077 ms.

The environment keeps a fixed two-draw-call contract. One inside-sphere shader synthesizes the cue world from the palette and world score; one fixed 120-point buffer provides depth particles. Product reveal uses a bright studio field, growth uses organic aurora energy, evidence exposes a restrained structural grid, hold reduces motion and contrast, and resolve restores the full luminous field. The renderer damps uniforms and rotates the existing particle group in place. Runtime attributes expose the authored glow, ribbons, grid, and drift targets for visual and performance audits.

The media target controls asset, opacity, depth, scale, offset, drift, palette tint, and tempo. The current optical master is a project-local 1672x941 generated plate composited as one cached, depth-displaced shader surface behind the live 3D actors. The single-pass material derives four interpolable treatments from the existing cue score: environment ribbons drive membrane flow, media tint drives restrained two-tap spectral separation, evidence grid drives structural strata, and lens bokeh drives optical clarity. The second spectral direction is estimated from the center and offset samples, avoiding a third full-screen texture read. Growth therefore becomes fluid and iridescent, evidence becomes flatter and crisper, direction gains controlled spectral depth, and hold softens without loading or crossfading additional assets. Runtime attributes expose flow, spectral, and structure targets; presenter energy and cue tempo modulate the same persistent uniforms without recreating the texture.

The renderer interprets transition values as masked kinetic typography plus a one-draw camera-space optical handoff. Headline lines remain author-controlled and unbreakable, while their words resolve through independently timed masks inside the same stable line geometry. The semantic headline remains one accessible label; outgoing layers are inert, and reduced-motion environments disable line and word animation while suppressing outgoing copy. Presenter level and peak update a bounded set of inherited CSS variables every six render frames, giving settled words a subtle lift, brightness, scale, and cue-colored spectral glint without React renders, layout movement, WebGL draw calls, or loop-time allocations. The handoff synthesizes a broad cue-colored caustic, narrow white core, chromatic fringes, and voice-responsive fibers without sampling or copying the scene framebuffer. Its tested envelope reduces flash while widening interrupted handoffs, exposes normalized cue progress for runtime audits, and culls the mesh when the envelope closes so settled scenes recover the draw call. Render telemetry samples after the post-processing composer and reports actual frame rate, renderer pixel ratio, calls, triangles, p95 frame time, and frames slower than 24 ms. Frame timing uses a fixed 0-80 ms histogram that is allocated once and reset in place. Three.js counters are explicitly reset without taking over the low-quality render loop. Low quality fades and hides the media surface before removing it from the draw count.

## Render Quality Contract

High quality is adaptive rather than a fixed pixel ratio. The stage measures sustained frame performance, selects a bounded device pixel ratio, and temporarily regresses resolution during scored transitions. The manual low-quality gate is a deterministic fallback: it removes the adaptive-DPR controller, fixes renderer DPR at `1.0`, disables post-processing, and fades the media plate out of the draw list.

The operator preview uses a stable aspect ratio. Presentation view expands the same stage to the full native window, hides operator controls and telemetry, advances authored cues with left and right arrow keys, and exits with Escape. Speech and native semantic signals continue to use the same event path in both views.

## Build Order

1. Expand the versioned cinematic show document into persisted authoring and rehearsal documents.
2. Promote the Web Audio energy proof to a native Core Audio adapter with device selection and preflight.
3. Apple SpeechAnalyzer adapter with partial and final transcript channels.
4. Local semantic candidate engine with confidence, hysteresis, and cooldown controls.
5. Rehearsal capture that binds presenter language to authored show intent.
6. Asset preflight, GPU/memory quality gates, and failure-safe presentation controls.
7. Authoring surfaces for story, production, additive dynamics, rehearsal, and live presentation.
