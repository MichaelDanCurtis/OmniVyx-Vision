# OmniVyx Visual Engine Design

## Goal

Prove that OmniVyx can render a presentation scene that feels closer to a premium product launch than a decorated slide deck.

The first proof is not the whole app. It is a 45-second reusable visual engine demo that shows video, WebGL depth, cinematic motion, dynamic overlays, and speaker-triggerable stage events working together.

The proof targets desktop Chrome first, at a 1440px-wide presentation viewport. Mobile responsiveness is useful but not a gate for this proof.

## Product Principle

OmniVyx should make Hollywood-quality presentation production feel easy, but the live system should not improvise expensive visuals from scratch during a presentation.

The engine should separate:

- Prepared cinematic assets: generated loops, brand films, WebGL scenes, charts, diagrams, and dynamic overlays.
- Live intent routing: the AI listens to the presenter and chooses the next score event, hold, recovery point, or dynamic content summon.
- Stage playback: the renderer executes predetermined movements, material changes, camera moves, and video controls.

## First Proof Scene

Build one premium stage preset called `LaunchStage`.

The scene should contain:

- A dark cinematic 3D environment.
- Moving glass panes in real depth.
- One or more video-textured planes that can be moved, faded, masked, and speed-ramped.
- A cloth or ribbon-like motion layer.
- A central product-core object with orbital motion.
- An organic growth element, such as a luminous tree or branching structure.
- A dynamic chart panel that can be summoned on cue.
- A camera path with at least three beats: opening, reveal, and resolved hold.
- Post-processing such as bloom, depth-of-field, vignette, and subtle color grading.

The scene should be controllable by stage events rather than button-only UI.

## Stage Events

The proof should support these events:

- `open_brand`: establish the scene and ambient motion.
- `reveal_product`: move product identity into the foreground and shift the previous brand mark aside.
- `explain_value`: organize glass/video layers into a clearer composition.
- `grow_system`: reveal the organic growth element.
- `summon_dynamic_chart`: bring in a preloaded chart panel without breaking the cinematic composition.
- `hold`: keep the scene alive without advancing.
- `resolve`: land on a polished final tableau.

These events can be triggered manually at first. Later, Presentation Mode will map live transcript intent to the same events.

## Video Model

Video is a first-class stage asset, not just a background.

Supported first-proof behavior:

- Use pre-rendered or generated videos as textures inside the WebGL scene.
- Control playback rate for slow, normal, and fast motion.
- Pause, resume, loop, fade, and crossfade video layers.
- Place video on 3D planes with camera parallax.
- Apply masks, opacity, blur, and color treatment.

Live camera or screen streams are in scope for the architecture, but not required in the first proof. True live slow motion requires a rolling buffer because future frames do not exist yet.

## Depth Model

The engine should support three levels of depth:

- True 3D: mesh objects, cameras, lights, video planes, charts, and product cores in a shared scene.
- Layered 2.5D: foreground, midground, and background elements with parallax and blur.
- Future depth assets: generated depth maps, segmentation masks, Gaussian splats, or NeRF-like scene captures.

The first proof should focus on true 3D plus layered 2.5D.

## Recommended Stack

Use the current Vite/React app as the host.

Add:

- React Three Fiber for the WebGL stage renderer.
- drei for helper primitives, loading hooks, and high-end materials.
- Three.js video textures for pre-rendered loops and generated video assets.
- react-postprocessing for bloom, depth-of-field, vignette, and cinematic finishing.
- Theatre.js or GSAP for the stage score. Theatre.js is preferred once visual keyframe editing matters; GSAP is acceptable for the first coded proof if it moves faster.

Do not add a full authoring system in this proof.

## Engine Components

The implementation should introduce these boundaries:

- `VisualStage`: owns the canvas, renderer settings, camera, lights, and postprocessing.
- `StageScore`: maps named stage events to timeline changes.
- `VideoLayer`: wraps a video source as a controllable texture.
- `GlassLayer`: reusable glass pane primitive with motion parameters.
- `MotionRibbon`: cloth-like shader or mesh effect.
- `DynamicSlot`: a summonable surface for charts, diagrams, or generated media.
- `StageControls`: temporary manual controls for testing stage events.

These components should be reusable by later Story, Production, Additive Dynamics, and Presentation modes.

## Pass/Fail Criteria

The proof passes only if:

- The first impression is cinematic, not dashboard-like.
- The scene has visible depth, camera movement, and material quality.
- Video behaves like a spatial object in the stage.
- A dynamic chart can enter without looking like a pasted UI card.
- The scene can hold without becoming visually dead.
- The implementation maintains at least one lower-quality fallback path for performance.
- The event model can later be driven by transcript intent without changing the visual engine.
- The scene maintains roughly interactive playback on the target desktop browser, with no blank canvas, runaway memory use, or obvious frame stalls during normal event playback.

The proof fails if:

- It reads as a CSS hero section.
- The video is only a flat background.
- The dynamic chart looks disconnected from the scene.
- The motion cannot be controlled by named events.
- The scene is too expensive to run in the target desktop browser.

## Non-Goals

- No full Story Mode UI.
- No full Production Mode editor.
- No real speech/AI integration.
- No live camera slow-motion buffer.
- No export/render pipeline.
- No arbitrary user asset import UI.

## Verification

The proof should be verified with:

- Unit tests for event-to-score state transitions.
- A production build.
- Browser verification that the WebGL canvas is nonblank.
- Browser verification that each named event changes visible scene state.
- A basic performance observation during live playback.
- Browser verification that the lower-quality fallback can be selected or automatically activated.

## Open Design Notes

The strongest production direction is likely hybrid:

- Real-time WebGL for presentation responsiveness.
- Pre-rendered/generated loops for costly cinematic atmosphere.
- Cached render assets for weak machines or export workflows.

The first proof should start with live WebGL plus at least one video texture. If performance or visual quality is weak, add render-cache behavior next rather than expanding app features.
