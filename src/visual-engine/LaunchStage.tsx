import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { DepthOfField, EffectComposer } from '@react-three/postprocessing';
import { AdaptiveDpr, PerformanceMonitor, RoundedBox } from '@react-three/drei';
import { Maximize2, Minimize2 } from 'lucide-react';
import { BlendFunction, BloomEffect, VignetteEffect } from 'postprocessing';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ComponentRef,
  type RefObject,
} from 'react';
import {
  AdditiveBlending,
  BackSide,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  PointsMaterial,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { getCinematicCue, type CinematicCue } from './cinematicScore';
import {
  decayImpulse,
  sampleCameraShotArc,
  sampleCueHandoff,
  sampleCueMotion,
  sampleOpticalHandoff,
  samplePhaseWindow,
  type CueMotionSample,
} from './motionEnvelope';
import { CinematicMediaPlate } from './CinematicMediaPlate';
import {
  createFrameTimeHistogram,
  readFrameTimePercentile,
  recordFrameDuration,
  resetFrameTimeHistogram,
} from './renderTelemetry';
import type { StageEventId, StageState } from './stageScore';
import type { PresenterEnergySignal } from '../domain/presenterAudio';
import {
  createOrganicNetworkGeometry,
  ORGANIC_NETWORK_NODE_COUNT,
} from './organicNetwork';
import { resolveCuePace, scaleCueDuration } from './cuePacing';
import { launchEvidence, normalizeEvidenceValues } from './evidenceScore';
import {
  buildKineticHeadline,
  writeKineticSpeechStyle,
  type KineticSpeechStyle,
} from './kineticCopy';

interface StageMotionBus extends CueMotionSample {
  actorArrival: number;
  cameraArrival: number;
  elapsedMs: number;
  handoff: number;
  impactScale: number;
  mediaArrival: number;
  voiceImpulse: number;
  voiceLevel: number;
  voicePeak: number;
}

interface RenderTelemetry {
  calls: number;
  frameTimeP95: number;
  fps: number;
  longFrames: number;
  pixelRatio: number;
  triangles: number;
}

const OPTICAL_PANEL_LAYOUT = [
  { position: [-2.9, 0.5, -1.2], rotation: [0.08, 0.42, -0.08], scale: [1.9, 1.2], phase: 0, opacity: 0.92 },
  { position: [2.7, 0.85, -1.7], rotation: [0.02, -0.42, 0.08], scale: [1.9, 1.2], phase: 1.73, opacity: 0.88 },
  { position: [0.45, -1.15, -0.65], rotation: [-0.12, -0.14, 0.02], scale: [1.9, 1.2], phase: 3.46, opacity: 0.78 },
  { position: [-1.35, 1.72, -2.45], rotation: [0.16, 0.22, -0.16], scale: [1.34, 0.82], phase: 5.19, opacity: 0.52 },
  { position: [3.55, -0.58, -2.82], rotation: [-0.08, -0.58, 0.14], scale: [1.52, 0.92], phase: 6.92, opacity: 0.46 },
  { position: [-3.72, -1.02, -3.18], rotation: [0.04, 0.64, -0.12], scale: [1.46, 0.88], phase: 8.65, opacity: 0.42 },
  { position: [1.28, 1.92, -3.35], rotation: [0.18, -0.18, 0.1], scale: [1.18, 0.72], phase: 10.38, opacity: 0.36 },
] as const;

const EVIDENCE_HEIGHTS = normalizeEvidenceValues(launchEvidence);
const EVIDENCE_COLUMN_X = new Float32Array([-0.87, -0.29, 0.29, 0.87]);
const EVIDENCE_BASE_Y = -0.78;
const EVIDENCE_COLUMN_PHASES = new Float32Array([0, 0.22, 0.44, 0.66]);
const EVIDENCE_CURVE = new CatmullRomCurve3(
  Array.from(EVIDENCE_HEIGHTS, (height, index) => new Vector3(
    EVIDENCE_COLUMN_X[index],
    EVIDENCE_BASE_Y + 0.55 + height * 1.35,
    0.08 + index * 0.018,
  )),
);

const OPTICAL_CORE_FIN_LAYOUT = [
  { position: [-0.52, 0.82, 0.16], rotation: Math.PI / 2 - 0.04, scale: [0.18, 0.34, 0.22], phase: 0 },
  { position: [0.52, 0.82, 0.16], rotation: Math.PI / 2 + 0.04, scale: [0.18, 0.34, 0.22], phase: 0.8 },
  { position: [-0.52, -0.82, 0.16], rotation: Math.PI / 2 + 0.04, scale: [0.18, 0.34, 0.22], phase: 1.6 },
  { position: [0.52, -0.82, 0.16], rotation: Math.PI / 2 - 0.04, scale: [0.18, 0.34, 0.22], phase: 2.4 },
  { position: [-0.82, -0.52, 0.16], rotation: 0.04, scale: [0.18, 0.34, 0.22], phase: 3.2 },
  { position: [-0.82, 0.52, 0.16], rotation: -0.04, scale: [0.18, 0.34, 0.22], phase: 4 },
  { position: [0.82, -0.52, 0.16], rotation: -0.04, scale: [0.18, 0.34, 0.22], phase: 4.8 },
  { position: [0.82, 0.52, 0.16], rotation: 0.04, scale: [0.18, 0.34, 0.22], phase: 5.6 },
] as const;

const OPTICAL_CORE_DRAW_CALLS = 4;

interface LaunchStageProps {
  presenterEnergy?: PresenterEnergySignal;
  presenterPulse?: number;
  presenting?: boolean;
  state: StageState;
  onTogglePresenting?: () => void;
}

export function LaunchStage({
  onTogglePresenting,
  presenterEnergy,
  presenterPulse = 0,
  presenting = false,
  state,
}: LaunchStageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const copyMotionRef = useRef<HTMLDivElement>(null);
  const cue = getCinematicCue(state.activeEvent);
  // Freeze the sampled presenter pace for this cue so a decaying waveform cannot retime it mid-transition.
  const cuePace = useMemo(
    () => resolveCuePace(
      cue.transition.pacing,
      presenterEnergy?.level ?? 0,
      presenterEnergy?.peak ?? 0,
    ),
    [cue],
  );
  const [performanceProfile, setPerformanceProfile] = useState({
    factor: state.quality === 'high' ? 0.72 : 0,
    fps: 0,
  });
  const [renderTelemetry, setRenderTelemetry] = useState<RenderTelemetry>({
    calls: 0,
    frameTimeP95: 0,
    fps: 0,
    longFrames: 0,
    pixelRatio: 0,
    triangles: 0,
  });
  const adaptiveDpr = state.quality === 'high'
    ? roundToStep(0.92 + performanceProfile.factor * 0.78, 0.05)
    : 1;
  const effectsEnabled = state.effectsEnabled;
  const measuredFps = renderTelemetry.fps || performanceProfile.fps;

  useEffect(() => {
    setPerformanceProfile({
      factor: state.quality === 'high' ? 0.72 : 0,
      fps: 0,
    });
  }, [state.quality]);

  return (
    <section
      ref={stageRef}
      className="visual-engine-stage"
      data-stage-event={state.activeEvent}
      data-quality={state.quality}
      data-dpr-mode={state.quality === 'high' ? 'adaptive' : 'fixed'}
      data-render-scale={adaptiveDpr.toFixed(2)}
      data-fps={measuredFps}
      data-frame-p95={renderTelemetry.frameTimeP95}
      data-long-frames={renderTelemetry.longFrames}
      data-lens-bloom={cue.lens.bloom.toFixed(2)}
      data-lens-bokeh={cue.lens.bokehScale.toFixed(2)}
      data-lens-exposure={cue.lens.exposure.toFixed(2)}
      data-lens-focus-range={cue.lens.focusRange.toFixed(2)}
      data-shot-dolly={cue.camera.shot.positionArc[2].toFixed(2)}
      data-shot-roll={cue.camera.shot.roll.toFixed(3)}
      data-glass-instances={OPTICAL_PANEL_LAYOUT.length}
      data-optical-core-draws={OPTICAL_CORE_DRAW_CALLS}
      data-optical-core-fins={OPTICAL_CORE_FIN_LAYOUT.length}
      data-optical-handoff-budget="1"
      data-organic-nodes={ORGANIC_NETWORK_NODE_COUNT}
      data-organic-scale={cue.composition.growthScale.toFixed(2)}
      data-evidence-active={state.dynamicChartVisible}
      data-evidence-points={launchEvidence.points.length}
      data-media-flow={cue.environment.ribbons.toFixed(2)}
      data-media-spectral={cue.media.tintStrength.toFixed(2)}
      data-media-structure={cue.environment.grid.toFixed(2)}
      data-cue-effective-duration={Math.round(scaleCueDuration(cue.transition.durationMs, cuePace))}
      data-cue-pace={cuePace.toFixed(3)}
      data-world-drift={cue.environment.drift.toFixed(2)}
      data-world-glow={cue.environment.glow.toFixed(2)}
      data-world-grid={cue.environment.grid.toFixed(2)}
      data-world-ribbons={cue.environment.ribbons.toFixed(2)}
      data-draw-calls={renderTelemetry.calls}
      data-pixel-ratio={renderTelemetry.pixelRatio.toFixed(2)}
      data-triangles={renderTelemetry.triangles}
      data-media-tempo={state.mediaPlaybackRate.toFixed(2)}
      data-presenter-pulse={presenterPulse}
      style={{
        '--stage-primary': cue.palette.primary,
        '--stage-accent': cue.palette.accent,
        '--cue-panel-duration': `${clamp(
          scaleCueDuration(cue.transition.durationMs * 0.34, cuePace),
          240,
          620,
        )}ms`,
      } as CSSProperties}
    >
      <Canvas
        camera={{ position: [0, 1.65, 7.4], fov: 42 }}
        dpr={adaptiveDpr}
        gl={{ antialias: state.quality === 'high', alpha: false, powerPreference: 'high-performance' }}
        performance={{ min: 0.78, max: 1, debounce: 420 }}
      >
        <PerformanceMonitor
          key={state.quality}
          bounds={(refreshRate) => [Math.min(48, refreshRate * 0.78), Math.min(58, refreshRate * 0.96)]}
          iterations={6}
          ms={300}
          threshold={0.7}
          factor={state.quality === 'high' ? 0.72 : 0}
          onChange={({ factor, fps }) => {
            const next = {
              factor: roundToStep(factor, 0.05),
              fps: Math.round(fps),
            };
            setPerformanceProfile((current) => (
              current.factor === next.factor && current.fps === next.fps
                ? current
                : next
            ));
          }}
        >
          {state.quality === 'high' ? <AdaptiveDpr /> : null}
          <TransitionPerformanceRegressor eventId={state.activeEvent} />
          <RenderTelemetryProbe effectsEnabled={effectsEnabled} onChange={setRenderTelemetry} />
          <LaunchScene
            copyElementRef={copyMotionRef}
            cue={cue}
            effectsEnabled={effectsEnabled}
            presenterEnergy={presenterEnergy}
            presenterPulse={presenterPulse}
            pace={cuePace}
            stageElementRef={stageRef}
            state={state}
          />
        </PerformanceMonitor>
      </Canvas>

      <KineticStageCopy
        cue={cue}
        eventId={state.activeEvent}
        motionRef={copyMotionRef}
        pace={cuePace}
      />

      <div
        className="stage-performance"
        aria-label={state.quality === 'high' ? 'Adaptive render performance' : 'Fixed render performance'}
      >
        <span>{state.quality === 'high' ? 'AUTO' : 'FIXED'}</span>
        <strong>{measuredFps > 0 ? `${measuredFps} FPS` : 'CALIBRATING'}</strong>
        <i>
          {(renderTelemetry.pixelRatio || adaptiveDpr).toFixed(2)}x
          {' / '}p95 {renderTelemetry.frameTimeP95 || '-'}ms
          {' / '}{renderTelemetry.calls || '-'} calls
        </i>
      </div>

      {onTogglePresenting ? (
        <button
          className="stage-presentation-toggle"
          type="button"
          title={presenting ? 'Exit presentation view' : 'Enter presentation view'}
          aria-label={presenting ? 'Exit presentation view' : 'Enter presentation view'}
          onClick={onTogglePresenting}
        >
          {presenting ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      ) : null}

      <EvidenceReadout visible={state.dynamicChartVisible} />
    </section>
  );
}

interface CopyLayerState {
  cue: CinematicCue;
  eventId: StageEventId;
  exitDurationMs: number;
  pace: number;
}

function KineticStageCopy({
  cue,
  eventId,
  motionRef,
  pace,
}: {
  cue: CinematicCue;
  eventId: StageEventId;
  motionRef: RefObject<HTMLDivElement | null>;
  pace: number;
}) {
  const previousRef = useRef({ cue, eventId, pace, startedAtMs: Date.now() });
  const [interrupted, setInterrupted] = useState(false);
  const [outgoing, setOutgoing] = useState<CopyLayerState | null>(null);

  useLayoutEffect(() => {
    const previous = previousRef.current;
    const changedAtMs = Date.now();
    previousRef.current = { cue, eventId, pace, startedAtMs: changedAtMs };
    if (previous.eventId === eventId) return;

    const wasInterrupted = changedAtMs - previous.startedAtMs < scaleCueDuration(
      previous.cue.transition.durationMs,
      previous.pace,
    );
    const authoredExitDurationMs = clamp(
      scaleCueDuration(previous.cue.transition.durationMs * 0.34, previous.pace),
      240,
      680,
    );
    const exitDurationMs = wasInterrupted
      ? clamp(authoredExitDurationMs * 0.58, 180, 320)
      : authoredExitDurationMs;
    setInterrupted(wasInterrupted);
    setOutgoing({ ...previous, exitDurationMs });
    const timer = window.setTimeout(() => setOutgoing(null), exitDurationMs);
    return () => window.clearTimeout(timer);
  }, [cue, eventId, pace]);

  return (
    <div className="stage-copy-stack" ref={motionRef}>
      {outgoing ? (
        <StageCopyLayer
          cue={outgoing.cue}
          eventId={outgoing.eventId}
          exitDurationMs={outgoing.exitDurationMs}
          key={`${outgoing.eventId}-out`}
          outgoing
          pace={outgoing.pace}
        />
      ) : null}
      <StageCopyLayer
        cue={cue}
        eventId={eventId}
        interrupted={interrupted}
        key={`${eventId}-in`}
        pace={pace}
      />
    </div>
  );
}

function StageCopyLayer({
  cue,
  eventId,
  exitDurationMs = 0,
  interrupted = false,
  outgoing = false,
  pace,
}: {
  cue: CinematicCue;
  eventId: StageEventId;
  exitDurationMs?: number;
  interrupted?: boolean;
  outgoing?: boolean;
  pace: number;
}) {
  const copyWindow = cue.transition.staging.copy;
  const authoredDurationMs = clamp(
    scaleCueDuration(
      cue.transition.durationMs * (copyWindow[1] - copyWindow[0]) * 1.25,
      pace,
    ),
    360,
    960,
  );
  const authoredDelayMs = scaleCueDuration(
    cue.transition.copyDelayMs + cue.transition.durationMs * copyWindow[0],
    pace,
  );
  const copyDurationMs = interrupted
    ? clamp(authoredDurationMs * 0.62, 300, 480)
    : authoredDurationMs;
  const copyDelayMs = interrupted
    ? clamp(authoredDelayMs * 0.12, 28, 64)
    : authoredDelayMs;
  const lineStaggerMs = clamp(
    scaleCueDuration(cue.transition.durationMs * (interrupted ? 0.032 : 0.055), pace),
    interrupted ? 28 : 42,
    interrupted ? 52 : 96,
  );
  const wordStaggerMs = clamp(lineStaggerMs * (interrupted ? 0.42 : 0.56), 16, 38);
  const kineticLines = useMemo(
    () => buildKineticHeadline(cue.copy.headlineLines),
    [cue.copy.headlineLines],
  );
  const style = {
    '--cue-copy-duration': `${copyDurationMs}ms`,
    '--cue-copy-delay': `${copyDelayMs}ms`,
    '--cue-copy-x': `${cue.transition.copyOffset[0]}px`,
    '--cue-copy-y': `${cue.transition.copyOffset[1]}px`,
    '--cue-line-stagger': `${lineStaggerMs}ms`,
    '--cue-body-delay': `${copyDelayMs + (interrupted ? 84 : 180)}ms`,
    '--cue-exit-duration': `${exitDurationMs}ms`,
    '--cue-exit-x': `${cue.transition.copyOffset[0] * -0.32}px`,
    '--cue-exit-y': `${cue.transition.copyOffset[1] * -0.24 - 6}px`,
  } as CSSProperties;

  return (
    <div
      aria-hidden={outgoing || undefined}
      className={outgoing
        ? 'visual-engine-copy stage-copy-outgoing'
        : interrupted
          ? 'visual-engine-copy stage-copy-current stage-copy-interrupted'
          : 'visual-engine-copy stage-copy-current'}
      data-copy-event={eventId}
      data-copy-interrupted={interrupted || undefined}
      style={style}
    >
      <p className="eyebrow">{cue.copy.eyebrow}</p>
      <h2 aria-label={outgoing ? undefined : cue.copy.headline}>
        {kineticLines.map((line) => (
          <span className="stage-copy-line" key={line.text} aria-hidden="true">
            <span
              className="stage-copy-line-inner"
              style={{ '--line-index': line.index } as CSSProperties}
            >
              {line.words.map((word) => (
                <span
                  className="stage-copy-word-mask"
                  key={`${word.globalIndex}-${word.text}`}
                  style={{
                    '--cue-word-delay': `${copyDelayMs
                      + line.index * lineStaggerMs
                      + word.index * wordStaggerMs}ms`,
                    '--word-glint-offset': `${((word.globalIndex % 4) - 1.5) * 9}%`,
                  } as CSSProperties}
                >
                  <span className="stage-copy-word" data-word={word.text}>{word.text}</span>
                </span>
              ))}
            </span>
          </span>
        ))}
      </h2>
      <p>{cue.copy.body}</p>
    </div>
  );
}

function EvidenceReadout({ visible }: { visible: boolean }) {
  return (
    <aside
      aria-hidden={!visible}
      aria-label={launchEvidence.title}
      aria-live="polite"
      className={visible ? 'stage-evidence-readout visible' : 'stage-evidence-readout'}
    >
      <div className="stage-evidence-heading">
        <span>{launchEvidence.kicker}</span>
        <small>{launchEvidence.range}</small>
      </div>
      <strong>{launchEvidence.title}</strong>
      <div className="stage-evidence-metric">
        <b>{launchEvidence.metric}</b>
        <span>{launchEvidence.metricLabel}</span>
      </div>
      <ol className="stage-evidence-series">
        {launchEvidence.points.map((point, index) => (
          <li key={point.label} style={{ '--evidence-index': index } as CSSProperties}>
            <small>{point.label}</small>
            <b>{point.displayValue}</b>
          </li>
        ))}
      </ol>
    </aside>
  );
}

interface LaunchSceneProps {
  copyElementRef: RefObject<HTMLDivElement | null>;
  cue: CinematicCue;
  effectsEnabled: boolean;
  pace: number;
  presenterEnergy?: PresenterEnergySignal;
  presenterPulse: number;
  stageElementRef: RefObject<HTMLElement | null>;
  state: StageState;
}

function LaunchScene({
  copyElementRef,
  cue,
  effectsEnabled,
  pace,
  presenterEnergy,
  presenterPulse,
  stageElementRef,
  state,
}: LaunchSceneProps) {
  const motion = useMemo<StageMotionBus>(() => ({
    actorArrival: 0,
    cameraArrival: 0,
    elapsedMs: 0,
    handoff: 0,
    impactScale: 1,
    mediaArrival: 0,
    progress: 0,
    arrival: 0,
    impact: 1,
    overshoot: 0,
    voiceImpulse: 0,
    voiceLevel: 0,
    voicePeak: 0,
  }), []);

  return (
    <>
      <color attach="background" args={['#03060d']} />
      <fog attach="fog" args={['#050914', 6.8, 17]} />
      <ambientLight intensity={0.45} />
      <MotionDirector
        copyElementRef={copyElementRef}
        cue={cue}
        eventId={state.activeEvent}
        motion={motion}
        pace={pace}
        presenterEnergy={presenterEnergy}
        presenterPulse={presenterPulse}
        stageElementRef={stageElementRef}
      />
      <CinematicLighting cue={cue} motion={motion} />

      <CameraRig cue={cue} motion={motion} />
      <OpticalHandoff cue={cue} motion={motion} />
      <StageEnvironment cue={cue} motion={motion} />
      <CinematicMediaPlate
        cue={cue}
        enabled={state.quality === 'high'}
        motion={motion}
        playbackRate={state.mediaPlaybackRate}
      />
      <SilkField cue={cue} motion={motion} />
      <SilkField cue={cue} foreground motion={motion} />
      <OpticalArray cue={cue} motion={motion} />
      <EvidenceField cue={cue} enabled={state.dynamicChartVisible} motion={motion} />
      <HeroOpticalCore cue={cue} motion={motion} />
      <NetworkBloom cue={cue} motion={motion} />

      {effectsEnabled ? <CinematicPost cue={cue} motion={motion} /> : null}
    </>
  );
}

function CinematicPost({ cue, motion }: { cue: CinematicCue; motion: StageMotionBus }) {
  const gl = useThree((threeState) => threeState.gl);
  const depthOfFieldRef = useRef<ComponentRef<typeof DepthOfField>>(null);
  const bloomEffect = useMemo(
    () => new BloomEffect({
      blendFunction: BlendFunction.ADD,
      intensity: 0.42,
      luminanceThreshold: 0.28,
      mipmapBlur: true,
    }),
    [],
  );
  const vignetteEffect = useMemo(
    () => new VignetteEffect({
      darkness: 0.44,
      eskil: false,
      offset: 0.2,
    }),
    [],
  );

  useEffect(() => () => {
    gl.toneMappingExposure = 1;
    bloomEffect.dispose();
    vignetteEffect.dispose();
  }, [bloomEffect, gl, vignetteEffect]);

  useFrame((_, delta) => {
    const damping = phaseDamping(cue.transition.damping, motion.mediaArrival, motion.handoff);
    bloomEffect.intensity = MathUtils.damp(
      bloomEffect.intensity,
      cue.lens.bloom
        + motion.impact * 0.05
        + motion.voiceLevel * 0.16
        + motion.voicePeak * 0.08,
      damping,
      delta,
    );
    if (depthOfFieldRef.current) {
      depthOfFieldRef.current.bokehScale = MathUtils.damp(
        depthOfFieldRef.current.bokehScale,
        cue.lens.bokehScale
          + motion.impact * 0.18
          + motion.voicePeak * 0.08,
        damping,
        delta,
      );
      depthOfFieldRef.current.cocMaterial.focusDistance = MathUtils.damp(
        depthOfFieldRef.current.cocMaterial.focusDistance,
        cue.lens.focusDistance - motion.voiceLevel * 0.04,
        damping,
        delta,
      );
      depthOfFieldRef.current.cocMaterial.focusRange = MathUtils.damp(
        depthOfFieldRef.current.cocMaterial.focusRange,
        cue.lens.focusRange,
        damping,
        delta,
      );
    }
    vignetteEffect.darkness = MathUtils.damp(
      vignetteEffect.darkness,
      cue.lens.vignetteDarkness
        + motion.impact * 0.03
        - motion.voiceLevel * 0.04,
      damping,
      delta,
    );
    vignetteEffect.offset = MathUtils.damp(
      vignetteEffect.offset,
      cue.lens.vignetteOffset,
      damping,
      delta,
    );
    gl.toneMappingExposure = MathUtils.damp(
      gl.toneMappingExposure,
      cue.lens.exposure
        + motion.impact * 0.05
        + motion.voiceLevel * 0.035
        + motion.voicePeak * 0.02,
      damping,
      delta,
    );
  }, 1);

  return (
    <EffectComposer>
      <primitive object={bloomEffect} />
      <DepthOfField
        ref={depthOfFieldRef}
        bokehScale={0.78}
        focusDistance={6.4}
        focusRange={4.2}
        resolutionScale={0.5}
      />
      <primitive object={vignetteEffect} />
    </EffectComposer>
  );
}

function MotionDirector({
  copyElementRef,
  cue,
  eventId,
  motion,
  presenterEnergy,
  presenterPulse,
  pace,
  stageElementRef,
}: {
  copyElementRef: RefObject<HTMLDivElement | null>;
  cue: CinematicCue;
  eventId: StageEventId;
  motion: StageMotionBus;
  presenterEnergy?: PresenterEnergySignal;
  presenterPulse: number;
  pace: number;
  stageElementRef: RefObject<HTMLElement | null>;
}) {
  const energyReportFrameRef = useRef(0);
  const lastReportedActiveRef = useRef<boolean | null>(null);
  const lastReportedEnergyRef = useRef(-1);
  const lastReportedHandoffRef = useRef(-1);
  const lastReportedPeakRef = useRef(-1);
  const lastReportedProgressRef = useRef(-1);
  const speechStyle = useMemo<KineticSpeechStyle>(() => ({
    brightness: '1.000',
    glint: '0.080',
    glintPosition: '34%',
    lift: '0.0000em',
    scale: '1.0000',
  }), []);

  useEffect(() => {
    const handoff = sampleCueHandoff(motion.progress, motion.elapsedMs, motion.handoff);
    motion.handoff = handoff.continuity;
    motion.impactScale = handoff.impactScale;
    motion.elapsedMs = 0;
    motion.progress = 0;
    motion.arrival = 0;
    motion.impact = handoff.impactScale;
    motion.overshoot = 0;
    motion.actorArrival = 0;
    motion.cameraArrival = 0;
    motion.mediaArrival = 0;
    stageElementRef.current?.setAttribute(
      'data-cue-interrupted',
      handoff.continuity > 0 ? 'true' : 'false',
    );
    stageElementRef.current?.setAttribute(
      'data-cue-handoff',
      handoff.continuity.toFixed(3),
    );
    stageElementRef.current?.setAttribute('data-cue-progress', '0.000');
    lastReportedHandoffRef.current = handoff.continuity;
    lastReportedProgressRef.current = 0;
  }, [eventId, motion, stageElementRef]);

  useEffect(() => {
    if (presenterPulse > 0) motion.voiceImpulse = 1;
  }, [motion, presenterPulse]);

  useFrame((_, delta) => {
    sampleCueMotion(motion.elapsedMs, cue.transition.durationMs, motion);
    motion.impact *= motion.impactScale;
    motion.overshoot *= 1 - motion.handoff * 0.36;
    motion.cameraArrival = samplePhaseWindow(
      motion.progress,
      cue.transition.staging.camera,
    );
    motion.mediaArrival = samplePhaseWindow(
      motion.progress,
      cue.transition.staging.media,
    );
    motion.actorArrival = samplePhaseWindow(
      motion.progress,
      cue.transition.staging.actors,
    );
    const levelTarget = presenterEnergy?.level ?? 0;
    const peakTarget = presenterEnergy?.peak ?? 0;
    motion.voiceLevel = MathUtils.damp(
      motion.voiceLevel,
      levelTarget,
      levelTarget > motion.voiceLevel ? 18 : 5.2,
      delta,
    );
    motion.voicePeak = Math.max(
      peakTarget,
      motion.voicePeak * Math.exp(-7.5 * delta),
    );
    motion.elapsedMs += delta * 1_000 * pace;
    motion.handoff = decayImpulse(motion.handoff, delta, 3.2);
    motion.voiceImpulse = decayImpulse(motion.voiceImpulse, delta, 4.8);

    energyReportFrameRef.current = (energyReportFrameRef.current + 1) % 6;
    if (energyReportFrameRef.current !== 0 || !stageElementRef.current) return;
    const audioActive = presenterEnergy?.active ?? false;
    if (audioActive !== lastReportedActiveRef.current) {
      lastReportedActiveRef.current = audioActive;
      stageElementRef.current.setAttribute(
        'data-presenter-audio',
        audioActive ? 'active' : 'idle',
      );
    }
    const energyChanged = Math.abs(motion.voiceLevel - lastReportedEnergyRef.current) >= 0.01;
    const peakChanged = Math.abs(motion.voicePeak - lastReportedPeakRef.current) >= 0.01;
    if ((energyChanged || peakChanged) && copyElementRef.current) {
      writeKineticSpeechStyle(motion.voiceLevel, motion.voicePeak, speechStyle);
      copyElementRef.current.style.setProperty(
        '--presenter-word-lift',
        speechStyle.lift,
      );
      copyElementRef.current.style.setProperty(
        '--presenter-word-brightness',
        speechStyle.brightness,
      );
      copyElementRef.current.style.setProperty(
        '--presenter-word-glint',
        speechStyle.glint,
      );
      copyElementRef.current.style.setProperty(
        '--presenter-word-scale',
        speechStyle.scale,
      );
      copyElementRef.current.style.setProperty(
        '--presenter-glint-position',
        speechStyle.glintPosition,
      );
    }
    if (energyChanged) {
      lastReportedEnergyRef.current = motion.voiceLevel;
      stageElementRef.current.setAttribute(
        'data-presenter-energy',
        motion.voiceLevel.toFixed(2),
      );
    }
    if (peakChanged) {
      lastReportedPeakRef.current = motion.voicePeak;
      stageElementRef.current.setAttribute(
        'data-presenter-peak',
        motion.voicePeak.toFixed(2),
      );
    }
    if (
      Math.abs(motion.progress - lastReportedProgressRef.current) >= 0.025
      || (motion.progress === 1 && lastReportedProgressRef.current !== 1)
    ) {
      lastReportedProgressRef.current = motion.progress;
      stageElementRef.current.setAttribute(
        'data-cue-progress',
        motion.progress.toFixed(3),
      );
    }
    if (Math.abs(motion.handoff - lastReportedHandoffRef.current) >= 0.01) {
      lastReportedHandoffRef.current = motion.handoff;
      stageElementRef.current.setAttribute(
        'data-cue-handoff',
        motion.handoff.toFixed(3),
      );
      if (motion.handoff <= 0.01) {
        stageElementRef.current.setAttribute('data-cue-interrupted', 'false');
      }
    }
  });

  return null;
}

function TransitionPerformanceRegressor({ eventId }: { eventId: StageEventId }) {
  const regress = useThree((threeState) => threeState.performance.regress);

  useEffect(() => {
    regress();
  }, [eventId, regress]);

  return null;
}

function RenderTelemetryProbe({
  effectsEnabled,
  onChange,
}: {
  effectsEnabled: boolean;
  onChange: (telemetry: RenderTelemetry) => void;
}) {
  const gl = useThree((threeState) => threeState.gl);
  const frameHistogram = useMemo(createFrameTimeHistogram, []);
  const lastReportRef = useRef(0);
  const frameCountRef = useRef(0);
  const longFrameCountRef = useRef(0);
  const lastCallsRef = useRef(-1);
  const lastFrameTimeP95Ref = useRef(-1);
  const lastFpsRef = useRef(-1);
  const lastLongFramesRef = useRef(-1);
  const lastPixelRatioRef = useRef(-1);
  const lastTrianglesRef = useRef(-1);

  useEffect(() => {
    gl.info.autoReset = !effectsEnabled;
    gl.info.reset();
    frameCountRef.current = 0;
    longFrameCountRef.current = 0;
    lastReportRef.current = 0;
    resetFrameTimeHistogram(frameHistogram);
    return () => {
      gl.info.autoReset = true;
      gl.info.reset();
    };
  }, [effectsEnabled, frameHistogram, gl]);

  useFrame(({ clock }, delta) => {
    const now = clock.getElapsedTime();
    frameCountRef.current += 1;
    recordFrameDuration(frameHistogram, delta);
    if (delta > 0.024) longFrameCountRef.current += 1;
    const calls = gl.info.render.calls;
    const triangles = gl.info.render.triangles;
    if (effectsEnabled) gl.info.reset();
    if (lastReportRef.current === 0) {
      lastReportRef.current = now;
      frameCountRef.current = 0;
      longFrameCountRef.current = 0;
      resetFrameTimeHistogram(frameHistogram);
      return;
    }

    const elapsed = now - lastReportRef.current;
    if (elapsed < 0.75) return;

    lastReportRef.current = now;
    const fps = Math.round(frameCountRef.current / elapsed);
    frameCountRef.current = 0;
    const frameTimeP95 = readFrameTimePercentile(frameHistogram, 0.95);
    const longFrames = longFrameCountRef.current;
    const pixelRatio = Math.round(gl.getPixelRatio() * 100) / 100;
    longFrameCountRef.current = 0;
    resetFrameTimeHistogram(frameHistogram);
    if (
      calls === lastCallsRef.current
      && frameTimeP95 === lastFrameTimeP95Ref.current
      && fps === lastFpsRef.current
      && longFrames === lastLongFramesRef.current
      && pixelRatio === lastPixelRatioRef.current
      && triangles === lastTrianglesRef.current
    ) return;

    lastCallsRef.current = calls;
    lastFrameTimeP95Ref.current = frameTimeP95;
    lastFpsRef.current = fps;
    lastLongFramesRef.current = longFrames;
    lastPixelRatioRef.current = pixelRatio;
    lastTrianglesRef.current = triangles;
    onChange({ calls, frameTimeP95, fps, longFrames, pixelRatio, triangles });
  }, effectsEnabled ? 2 : 0);

  return null;
}

const opticalHandoffVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const opticalHandoffFragmentShader = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uAngle;
  uniform float uAspect;
  uniform float uImpact;
  uniform float uOpacity;
  uniform vec3 uPrimary;
  uniform float uProgress;
  uniform vec3 uSecondary;
  uniform float uTime;
  uniform float uVoice;
  uniform float uWidth;
  varying vec2 vUv;

  void main() {
    vec2 point = vUv - 0.5;
    point.x *= uAspect;
    vec2 axis = vec2(cos(uAngle), sin(uAngle));
    vec2 crossAxis = vec2(-axis.y, axis.x);
    float along = dot(point, axis);
    float across = dot(point, crossAxis);
    float travel = smoothstep(0.015, 0.9, uProgress);
    float span = 0.76 + max(0.0, uAspect - 1.0) * 0.42;
    float center = mix(-span, span, travel);
    float curl = sin(across * 12.0 + uTime * 0.62) * 0.015 * uWidth
      + sin(across * 31.0 - uTime * 0.38) * 0.005;
    float signedDistance = along - center + curl;
    float distanceToSweep = abs(signedDistance);

    float body = exp(-pow(distanceToSweep * 17.0 / uWidth, 1.45));
    float core = exp(-pow(distanceToSweep * 82.0 / uWidth, 1.32));
    float fringeA = exp(-pow(abs(signedDistance - 0.026 * uWidth) * 98.0 / uWidth, 1.4));
    float fringeB = exp(-pow(abs(signedDistance + 0.034 * uWidth) * 88.0 / uWidth, 1.4));
    float caustic = exp(-pow(abs(signedDistance - sin(across * 19.0 + uTime) * 0.009)
      * 48.0 / uWidth, 1.5));
    float aperture = 0.45 + 0.55 * exp(-across * across * 2.8);
    float weave = sin(across * 73.0 - uTime * (0.9 + uVoice * 0.5)) * 0.5 + 0.5;
    float fibers = pow(weave, 8.0) * body;
    vec3 spectrum = 0.5 + 0.5 * cos(
      6.28318 * (signedDistance * 7.5 + across * 0.13 + vec3(0.0, 0.16, 0.34))
    );

    vec3 color = mix(uPrimary, uAccent, smoothstep(-0.45, 0.45, across)) * body * 0.32;
    color += uSecondary * core * (1.2 + uImpact * 0.38);
    color += uAccent * fringeA * 0.62;
    color += uPrimary * fringeB * 0.58;
    color += spectrum * (fringeA + fringeB) * 0.36;
    color += mix(uPrimary, uSecondary, weave) * caustic * (0.16 + uVoice * 0.12);
    color += uSecondary * fibers * (0.12 + uVoice * 0.18);
    float alpha = uOpacity * aperture * (
      body * 0.045
      + core * 0.2
      + (fringeA + fringeB) * 0.075
      + caustic * 0.04
      + fibers * 0.03
    );
    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

function OpticalHandoff({ cue, motion }: { cue: CinematicCue; motion: StageMotionBus }) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const paletteTargets = useMemo(
    () => ({
      primary: new Color(cue.palette.primary),
      secondary: new Color(cue.palette.secondary),
      accent: new Color(cue.palette.accent),
    }),
    [],
  );
  const handoffSample = useMemo(
    () => ({ active: false, opacity: 0, width: 1 }),
    [],
  );
  const uniforms = useMemo(() => ({
    uAccent: { value: new Color(cue.palette.accent) },
    uAngle: { value: cue.transition.sweepAngle },
    uAspect: { value: 1 },
    uImpact: { value: 0 },
    uOpacity: { value: 0 },
    uPrimary: { value: new Color(cue.palette.primary) },
    uProgress: { value: 0 },
    uSecondary: { value: new Color(cue.palette.secondary) },
    uTime: { value: 0 },
    uVoice: { value: 0 },
    uWidth: { value: 1 },
  }), []);

  useFrame(({ camera, clock, size }, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    sampleOpticalHandoff(
      motion.progress,
      motion.handoff,
      cue.transition.sweepIntensity,
      handoffSample,
    );
    const paletteAlpha = 1 - Math.exp(-cue.transition.damping * delta);
    paletteTargets.primary.set(cue.palette.primary);
    paletteTargets.secondary.set(cue.palette.secondary);
    paletteTargets.accent.set(cue.palette.accent);
    materialRef.current.uniforms.uPrimary.value.lerp(paletteTargets.primary, paletteAlpha);
    materialRef.current.uniforms.uSecondary.value.lerp(paletteTargets.secondary, paletteAlpha);
    materialRef.current.uniforms.uAccent.value.lerp(paletteTargets.accent, paletteAlpha);
    meshRef.current.visible = handoffSample.active;
    if (!handoffSample.active) return;

    const perspectiveCamera = camera as PerspectiveCamera;
    const distance = 0.8;
    const viewHeight = 2 * Math.tan(MathUtils.degToRad(perspectiveCamera.fov * 0.5)) * distance;
    const viewWidth = viewHeight * (size.width / size.height);
    meshRef.current.position.copy(camera.position);
    meshRef.current.quaternion.copy(camera.quaternion);
    meshRef.current.translateZ(-distance);
    meshRef.current.scale.set(viewWidth * 0.54, viewHeight * 0.54, 1);

    materialRef.current.uniforms.uAngle.value = cue.transition.sweepAngle;
    materialRef.current.uniforms.uAspect.value = size.width / size.height;
    materialRef.current.uniforms.uImpact.value = motion.impact;
    materialRef.current.uniforms.uOpacity.value = handoffSample.opacity;
    materialRef.current.uniforms.uProgress.value = motion.progress;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uVoice.value = Math.min(
      1.4,
      motion.voiceLevel + motion.voiceImpulse * 0.48 + motion.voicePeak * 0.22,
    );
    materialRef.current.uniforms.uWidth.value = handoffSample.width;
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={100} visible={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        args={[{
          uniforms,
          vertexShader: opticalHandoffVertexShader,
          fragmentShader: opticalHandoffFragmentShader,
        }]}
        blending={AdditiveBlending}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}

function CinematicLighting({ cue, motion }: { cue: CinematicCue; motion: StageMotionBus }) {
  const keyRef = useRef<DirectionalLight>(null);
  const rimRef = useRef<PointLight>(null);
  const accentRef = useRef<PointLight>(null);
  const keyTarget = useMemo(() => new Color(cue.palette.secondary), []);
  const rimTarget = useMemo(() => new Color(cue.palette.primary), []);
  const accentTarget = useMemo(() => new Color(cue.palette.accent), []);

  useFrame((_, delta) => {
    const damping = phaseDamping(cue.transition.damping, motion.actorArrival, motion.handoff);
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    keyTarget.set(cue.palette.secondary);
    rimTarget.set(cue.palette.primary);
    accentTarget.set(cue.palette.accent);
    if (keyRef.current) {
      keyRef.current.intensity = MathUtils.damp(
        keyRef.current.intensity,
        cue.lighting.key + motion.impact * 0.28,
        damping,
        delta,
      );
      keyRef.current.color.lerp(keyTarget, paletteAlpha);
    }
    if (rimRef.current) {
      rimRef.current.intensity = MathUtils.damp(
        rimRef.current.intensity,
        cue.lighting.rim
          + motion.impact * 1.1
          + motion.voiceImpulse * 0.65
          + motion.voiceLevel * 1.15
          + motion.voicePeak * 0.28,
        damping,
        delta,
      );
      rimRef.current.color.lerp(rimTarget, paletteAlpha);
    }
    if (accentRef.current) {
      accentRef.current.intensity = MathUtils.damp(
        accentRef.current.intensity,
        cue.lighting.accent
          + motion.impact * 1.45
          + motion.voiceImpulse * 0.72
          + motion.voiceLevel * 0.92
          + motion.voicePeak * 0.38,
        damping,
        delta,
      );
      accentRef.current.color.lerp(accentTarget, paletteAlpha);
    }
  });

  return (
    <>
      <directionalLight ref={keyRef} position={[4, 4, 5]} intensity={cue.lighting.key} color={cue.palette.secondary} />
      <pointLight ref={rimRef} position={[-3.8, 2.2, 2.4]} intensity={cue.lighting.rim} color={cue.palette.primary} />
      <pointLight ref={accentRef} position={[3.4, -0.8, 2.4]} intensity={cue.lighting.accent} color={cue.palette.accent} />
    </>
  );
}

function CameraRig({ cue, motion }: { cue: CinematicCue; motion: StageMotionBus }) {
  const camera = useThree((threeState) => threeState.camera) as PerspectiveCamera;
  const rollRef = useRef(0);
  const target = useMemo(() => new Vector3(0, 0.05, 0), []);

  useFrame(({ clock, size }, delta) => {
    const elapsed = clock.getElapsedTime();
    const damping = phaseDamping(cue.transition.damping, motion.cameraArrival, motion.handoff);
    const drift = cue.motionEnergy;
    const shotArc = sampleCameraShotArc(motion.cameraArrival);
    const portraitMix = 1 - MathUtils.smoothstep(size.width / size.height, 0.72, 1.25);
    const lateralShotScale = 1 - portraitMix * 0.65;
    const opticalShotScale = 1 - portraitMix * 0.55;
    camera.position.x = MathUtils.damp(
      camera.position.x,
      cue.camera.position[0]
        + cue.camera.shot.positionArc[0] * shotArc * lateralShotScale
        + Math.sin(elapsed * 0.22) * 0.1 * drift
        + motion.overshoot * 0.14 * drift,
      damping,
      delta,
    );
    camera.position.y = MathUtils.damp(
      camera.position.y,
      cue.camera.position[1]
        + cue.camera.shot.positionArc[1] * shotArc
        + Math.sin(elapsed * 0.16) * 0.05 * drift
        + motion.voiceImpulse * 0.018
        + motion.voiceLevel * 0.026,
      damping,
      delta,
    );
    camera.position.z = MathUtils.damp(
      camera.position.z,
      cue.camera.position[2]
        + cue.camera.portrait.pullback * portraitMix
        + cue.camera.shot.positionArc[2] * shotArc
        + motion.impact * 0.18
        - motion.voiceLevel * 0.035,
      damping,
      delta,
    );
    target.x = MathUtils.damp(
      target.x,
      cue.camera.target[0]
        + cue.camera.portrait.targetOffset[0] * portraitMix
        + cue.camera.shot.targetArc[0] * shotArc,
      damping,
      delta,
    );
    target.y = MathUtils.damp(
      target.y,
      cue.camera.target[1]
        + cue.camera.portrait.targetOffset[1] * portraitMix
        + cue.camera.shot.targetArc[1] * shotArc,
      damping,
      delta,
    );
    target.z = MathUtils.damp(
      target.z,
      cue.camera.target[2]
        + cue.camera.portrait.targetOffset[2] * portraitMix
        + cue.camera.shot.targetArc[2] * shotArc,
      damping,
      delta,
    );
    const nextFov = MathUtils.damp(
      camera.fov,
      cue.camera.fov + cue.camera.shot.fovArc * shotArc * opticalShotScale,
      damping,
      delta,
    );
    if (Math.abs(nextFov - camera.fov) > 0.0001) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
    rollRef.current = MathUtils.damp(
      rollRef.current,
      cue.camera.shot.roll * shotArc * opticalShotScale,
      damping,
      delta,
    );
    camera.lookAt(target);
    camera.rotateZ(rollRef.current);
  });

  return null;
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function phaseDamping(base: number, arrival: number, handoff: number): number {
  const continuityArrival = handoff * 0.45;
  const effectiveArrival = Math.max(arrival, continuityArrival);
  return effectiveArrival <= 0 ? 0 : base * (0.32 + effectiveArrival * 1.08);
}

const worldVertexShader = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const worldFragmentShader = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uDrift;
  uniform float uGlow;
  uniform vec2 uGlowPosition;
  uniform float uGrid;
  uniform float uHorizon;
  uniform vec3 uPrimary;
  uniform float uRibbons;
  uniform vec3 uSecondary;
  uniform vec3 uSurface;
  uniform float uTime;
  uniform float uVoice;
  varying vec3 vDirection;

  const float PI = 3.14159265359;

  void main() {
    vec3 direction = normalize(vDirection);
    vec2 field = vec2(
      atan(direction.z, direction.x) / PI,
      asin(clamp(direction.y, -1.0, 1.0)) / (PI * 0.5)
    );
    float time = uTime * (0.018 + uDrift * 0.055);
    vec2 glowDelta = (field - uGlowPosition) * vec2(1.16, 1.0);
    float studioGlow = exp(-dot(glowDelta, glowDelta) * 3.8) * uGlow;
    float horizonCenter = -0.12 + sin(field.x * 4.2 + time * 1.7) * 0.055;
    float horizon = exp(-pow(field.y - horizonCenter, 2.0) * 19.0) * uHorizon;
    float ribbonWave = 0.5 + 0.5 * sin(
      field.x * 10.0
      + sin(field.y * 7.0 - time * 2.1) * 2.0
      + time * 2.8
    );
    float ribbon = pow(smoothstep(0.58, 1.0, ribbonWave), 2.0)
      * smoothstep(-0.86, 0.72, field.y)
      * uRibbons;
    float gridX = pow(1.0 - abs(sin((field.x + time * 0.08) * PI * 12.0)), 28.0);
    float gridY = pow(1.0 - abs(sin((field.y - time * 0.04) * PI * 8.0)), 28.0);
    float gridMask = smoothstep(-0.74, 0.48, field.y) * (1.0 - smoothstep(0.62, 0.96, field.y));
    float grid = (gridX + gridY) * gridMask * uGrid;
    float interference = 0.5 + 0.5 * sin(
      field.x * 21.0
      - field.y * 13.0
      + sin(field.y * 9.0 + time) * 1.8
    );
    float voiceLift = 1.0 + uVoice * 0.22;
    vec3 color = uSurface * (0.72 + interference * 0.08);
    color += uPrimary * (studioGlow * 0.2 + horizon * 0.13 + ribbon * 0.09) * voiceLift;
    color += uAccent * (studioGlow * 0.08 + ribbon * 0.12 + horizon * 0.035) * voiceLift;
    color += uSecondary * grid * 0.055;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function StageEnvironment({ cue, motion }: { cue: CinematicCue; motion: StageMotionBus }) {
  const worldMaterialRef = useRef<ShaderMaterial>(null);
  const particleGroupRef = useRef<Group>(null);
  const pointsMaterialRef = useRef<PointsMaterial>(null);
  const paletteTargets = useMemo(() => ({
    accent: new Color(cue.palette.accent),
    primary: new Color(cue.palette.primary),
    secondary: new Color(cue.palette.secondary),
    surface: new Color(cue.palette.surface),
  }), []);
  const worldUniforms = useMemo(() => ({
    uAccent: { value: new Color(cue.palette.accent) },
    uDrift: { value: cue.environment.drift },
    uGlow: { value: cue.environment.glow },
    uGlowPosition: { value: new Vector2(...cue.environment.glowPosition) },
    uGrid: { value: cue.environment.grid },
    uHorizon: { value: cue.environment.horizon },
    uPrimary: { value: new Color(cue.palette.primary) },
    uRibbons: { value: cue.environment.ribbons },
    uSecondary: { value: new Color(cue.palette.secondary) },
    uSurface: { value: new Color(cue.palette.surface) },
    uTime: { value: 0 },
    uVoice: { value: 0 },
  }), []);
  const particles = useMemo(() => {
    const positions: number[] = [];
    for (let index = 0; index < 120; index += 1) {
      const angle = index * 1.618;
      const radius = 2.2 + (index % 17) * 0.18;
      positions.push(Math.cos(angle) * radius, ((index % 31) - 15) * 0.08, Math.sin(angle) * radius - 2.8);
    }
    return new Float32Array(positions);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!worldMaterialRef.current || !particleGroupRef.current || !pointsMaterialRef.current) return;
    const damping = phaseDamping(cue.transition.damping, motion.mediaArrival, motion.handoff);
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    const elapsed = clock.getElapsedTime();
    const voice = Math.min(1.4, motion.voiceLevel + motion.voiceImpulse * 0.42 + motion.voicePeak * 0.28);
    paletteTargets.primary.set(cue.palette.primary);
    paletteTargets.secondary.set(cue.palette.secondary);
    paletteTargets.accent.set(cue.palette.accent);
    paletteTargets.surface.set(cue.palette.surface);
    worldMaterialRef.current.uniforms.uPrimary.value.lerp(paletteTargets.primary, paletteAlpha);
    worldMaterialRef.current.uniforms.uSecondary.value.lerp(paletteTargets.secondary, paletteAlpha);
    worldMaterialRef.current.uniforms.uAccent.value.lerp(paletteTargets.accent, paletteAlpha);
    worldMaterialRef.current.uniforms.uSurface.value.lerp(paletteTargets.surface, paletteAlpha);
    worldMaterialRef.current.uniforms.uTime.value = elapsed;
    worldMaterialRef.current.uniforms.uVoice.value = MathUtils.damp(
      worldMaterialRef.current.uniforms.uVoice.value,
      voice,
      voice > worldMaterialRef.current.uniforms.uVoice.value ? 14 : 4.4,
      delta,
    );
    worldMaterialRef.current.uniforms.uGlow.value = MathUtils.damp(
      worldMaterialRef.current.uniforms.uGlow.value,
      cue.environment.glow + motion.impact * 0.08 + voice * 0.12,
      damping,
      delta,
    );
    worldMaterialRef.current.uniforms.uHorizon.value = MathUtils.damp(
      worldMaterialRef.current.uniforms.uHorizon.value,
      cue.environment.horizon + voice * 0.07,
      damping,
      delta,
    );
    worldMaterialRef.current.uniforms.uRibbons.value = MathUtils.damp(
      worldMaterialRef.current.uniforms.uRibbons.value,
      cue.environment.ribbons + voice * 0.13,
      damping,
      delta,
    );
    worldMaterialRef.current.uniforms.uGrid.value = MathUtils.damp(
      worldMaterialRef.current.uniforms.uGrid.value,
      cue.environment.grid,
      damping,
      delta,
    );
    worldMaterialRef.current.uniforms.uDrift.value = MathUtils.damp(
      worldMaterialRef.current.uniforms.uDrift.value,
      cue.environment.drift + voice * 0.06,
      damping,
      delta,
    );
    worldMaterialRef.current.uniforms.uGlowPosition.value.x = MathUtils.damp(
      worldMaterialRef.current.uniforms.uGlowPosition.value.x,
      cue.environment.glowPosition[0],
      damping,
      delta,
    );
    worldMaterialRef.current.uniforms.uGlowPosition.value.y = MathUtils.damp(
      worldMaterialRef.current.uniforms.uGlowPosition.value.y,
      cue.environment.glowPosition[1],
      damping,
      delta,
    );
    particleGroupRef.current.rotation.y = elapsed * cue.environment.drift * 0.012;
    particleGroupRef.current.rotation.z = Math.sin(elapsed * 0.04) * cue.environment.drift * 0.025;
    pointsMaterialRef.current.color.lerp(
      paletteTargets.primary,
      paletteAlpha,
    );
    pointsMaterialRef.current.opacity = MathUtils.damp(
      pointsMaterialRef.current.opacity,
      cue.environment.particles + motion.impact * 0.1 + voice * 0.12,
      damping,
      delta,
    );
    pointsMaterialRef.current.size = MathUtils.damp(
      pointsMaterialRef.current.size,
      cue.environment.particleSize + motion.voiceImpulse * 0.004 + motion.voicePeak * 0.006,
      damping,
      delta,
    );
  });

  return (
    <>
      <mesh scale={[30, 30, 30]}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          ref={worldMaterialRef}
          args={[{ uniforms: worldUniforms, vertexShader: worldVertexShader, fragmentShader: worldFragmentShader }]}
          side={BackSide}
        />
      </mesh>
      <group ref={particleGroupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particles, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={pointsMaterialRef}
            color={cue.palette.primary}
            opacity={cue.environment.particles}
            size={cue.environment.particleSize}
            sizeAttenuation
            transparent
          />
        </points>
      </group>
    </>
  );
}

const silkVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uEnergy;
  varying vec2 vUv;
  varying float vWave;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vUv = uv;
    vec3 displaced = position;
    float broad = sin(position.x * 0.72 + uTime * 0.38) * 0.52;
    float crossWave = cos(position.y * 1.16 - uTime * 0.29) * 0.28;
    float fold = sin(position.x * 1.74 + position.y * 0.64 - uTime * 0.52) * 0.13;
    float wave = broad + crossWave + fold;
    float amplitude = 0.42 + uEnergy * 0.22;
    displaced.z += wave * amplitude;
    displaced.y += sin(position.x * 0.46 - uTime * 0.2) * 0.13 * uEnergy;

    float waveDx = cos(position.x * 0.72 + uTime * 0.38) * 0.3744
      + cos(position.x * 1.74 + position.y * 0.64 - uTime * 0.52) * 0.2262;
    float waveDy = -sin(position.y * 1.16 - uTime * 0.29) * 0.3248
      + cos(position.x * 1.74 + position.y * 0.64 - uTime * 0.52) * 0.0832;
    vec3 foldedNormal = normalize(vec3(-waveDx * amplitude, -waveDy * amplitude, 1.0));

    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWave = wave;
    vNormal = normalize(normalMatrix * foldedNormal);
    vView = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const silkFragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uAccent;
  uniform vec3 uSurface;
  varying vec2 vUv;
  varying float vWave;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    float ridge = smoothstep(0.12, 0.86, abs(vWave));
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float sheen = pow(1.0 - facing, 2.2);
    float highlight = pow(max(dot(normalize(vNormal), normalize(vec3(-0.3, 0.55, 1.0))), 0.0), 7.0);
    float colorShift = smoothstep(0.12, 0.9, vUv.x + vWave * 0.14);
    vec3 iridescence = mix(uPrimary, uAccent, colorShift);
    vec3 color = mix(uSurface, iridescence, ridge * 0.58 + sheen * 0.46);
    color = mix(color, uSecondary, highlight * 0.52 + sheen * ridge * 0.28);
    float edgeFade = smoothstep(0.0, 0.18, vUv.x)
      * (1.0 - smoothstep(0.82, 1.0, vUv.x))
      * smoothstep(0.0, 0.16, vUv.y)
      * (1.0 - smoothstep(0.84, 1.0, vUv.y));
    float alpha = (0.2 + ridge * 0.34 + sheen * 0.34) * edgeFade * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

function SilkField({
  cue,
  foreground = false,
  motion,
}: {
  cue: CinematicCue;
  foreground?: boolean;
  motion: StageMotionBus;
}) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const paletteTargets = useMemo(
    () => ({
      primary: new Color(cue.palette.primary),
      secondary: new Color(cue.palette.secondary),
      accent: new Color(cue.palette.accent),
      surface: new Color(cue.palette.surface),
    }),
    [],
  );
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEnergy: { value: cue.motionEnergy },
      uOpacity: { value: foreground ? 0.9 : 1.05 },
      uPrimary: { value: new Color(cue.palette.primary) },
      uSecondary: { value: new Color(cue.palette.secondary) },
      uAccent: { value: new Color(cue.palette.accent) },
      uSurface: { value: new Color(cue.palette.surface) },
    }),
    [],
  );

  useFrame(({ clock }, delta) => {
    if (!materialRef.current || !meshRef.current) return;
    const damping = phaseDamping(cue.transition.damping, motion.actorArrival, motion.handoff);
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    paletteTargets.primary.set(cue.palette.primary);
    paletteTargets.secondary.set(cue.palette.secondary);
    paletteTargets.accent.set(cue.palette.accent);
    paletteTargets.surface.set(cue.palette.surface);
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uEnergy.value = MathUtils.damp(
      materialRef.current.uniforms.uEnergy.value,
      cue.motionEnergy
        + motion.impact * 0.42
        + motion.voiceImpulse * 0.3
        + motion.voiceLevel * 0.36
        + motion.voicePeak * 0.08,
      damping,
      delta,
    );
    materialRef.current.uniforms.uOpacity.value = MathUtils.damp(
      materialRef.current.uniforms.uOpacity.value,
      (cue.composition.chartScale > 0.5
        ? (foreground ? 0.38 : 0.72)
        : (foreground ? 0.88 : 1.08))
        + motion.voiceImpulse * 0.06
        + motion.voiceLevel * 0.06
        + motion.impact * 0.05,
      damping,
      delta,
    );
    materialRef.current.uniforms.uPrimary.value.lerp(paletteTargets.primary, paletteAlpha);
    materialRef.current.uniforms.uSecondary.value.lerp(paletteTargets.secondary, paletteAlpha);
    materialRef.current.uniforms.uAccent.value.lerp(paletteTargets.accent, paletteAlpha);
    materialRef.current.uniforms.uSurface.value.lerp(paletteTargets.surface, paletteAlpha);
    meshRef.current.position.y = MathUtils.damp(
      meshRef.current.position.y,
      (foreground ? 0.72 : 0.05)
        + cue.composition.ribbonLift * (foreground ? 0.72 : 0.18)
        + motion.overshoot * (foreground ? 0.16 : 0.05),
      damping,
      delta,
    );
  });

  return (
    <mesh
      ref={meshRef}
      position={foreground ? [0, 0.72, -0.58] : [0, 0.05, -1.95]}
      rotation={foreground ? [0.12, -0.06, -0.08] : [0.02, -0.04, -0.035]}
    >
      <planeGeometry args={foreground ? [8.6, 1.2, 128, 20] : [10.5, 6.2, 112, 68]} />
      <shaderMaterial
        ref={materialRef}
        depthWrite={false}
        fragmentShader={silkFragmentShader}
        side={DoubleSide}
        transparent
        uniforms={uniforms}
        vertexShader={silkVertexShader}
      />
    </mesh>
  );
}

const opticalArrayVertexShader = /* glsl */ `
  attribute float aOpacity;
  attribute float aPhase;
  uniform float uTime;
  varying float vOpacity;
  varying float vPhase;
  varying vec2 vUv;

  void main() {
    vOpacity = aOpacity;
    vPhase = aPhase;
    vUv = uv;
    vec3 displaced = position;
    displaced.z += sin(position.y * 2.4 + uTime * 0.22 + aPhase) * 0.035;
    displaced.z += cos(position.x * 1.8 - uTime * 0.16 + aPhase) * 0.018;
    vec4 instancePosition = instanceMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * instancePosition;
  }
`;

const opticalArrayFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uAccent;
  varying float vOpacity;
  varying float vPhase;
  varying vec2 vUv;

  void main() {
    vec2 q = abs(vUv * 2.0 - 1.0) - vec2(0.78, 0.68);
    float distanceToEdge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.18;
    float mask = 1.0 - smoothstep(-0.005, 0.018, distanceToEdge);
    float border = 1.0 - smoothstep(0.012, 0.055, abs(distanceToEdge));
    float sweepInput = sin((vUv.x * 1.35 + vUv.y * 0.72 + uTime * 0.045 + vPhase) * 6.28318);
    float sweep = pow(smoothstep(0.62, 1.0, sweepInput * 0.5 + 0.5), 2.0);
    float cornerGlow = smoothstep(0.48, 0.96, length(vUv - vec2(0.5)) * 1.42);
    vec3 glassColor = mix(uPrimary, uSecondary, vUv.y * 0.56 + sweep * 0.18);
    glassColor = mix(glassColor, uAccent, cornerGlow * 0.18);
    float alpha = mask * (0.018 + border * 0.25 + sweep * 0.075 + cornerGlow * 0.025) * uOpacity * vOpacity;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(glassColor, alpha);
  }
`;

function OpticalArray({ cue, motion }: { cue: CinematicCue; motion: StageMotionBus }) {
  const arrayRef = useRef<InstancedMesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const panels = useMemo(
    () => OPTICAL_PANEL_LAYOUT.map((layout) => {
      const panel = new Object3D();
      panel.position.set(layout.position[0], layout.position[1], layout.position[2]);
      panel.rotation.set(layout.rotation[0], layout.rotation[1], layout.rotation[2]);
      panel.scale.set(layout.scale[0], layout.scale[1], 1);
      panel.updateMatrix();
      return panel;
    }),
    [],
  );
  const phases = useMemo(
    () => new Float32Array(OPTICAL_PANEL_LAYOUT.map((layout) => layout.phase)),
    [],
  );
  const opacities = useMemo(
    () => new Float32Array(OPTICAL_PANEL_LAYOUT.map((layout) => layout.opacity)),
    [],
  );
  const paletteTargets = useMemo(
    () => ({
      primary: new Color(cue.palette.primary),
      secondary: new Color(cue.palette.secondary),
      accent: new Color(cue.palette.accent),
    }),
    [],
  );
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0.6 },
      uPrimary: { value: new Color(cue.palette.primary) },
      uSecondary: { value: new Color(cue.palette.secondary) },
      uAccent: { value: new Color(cue.palette.accent) },
    }),
    [],
  );

  useLayoutEffect(() => {
    if (!arrayRef.current) return;
    arrayRef.current.instanceMatrix.setUsage(DynamicDrawUsage);
    panels.forEach((panel, index) => arrayRef.current?.setMatrixAt(index, panel.matrix));
    arrayRef.current.instanceMatrix.needsUpdate = true;
  }, [panels]);

  useFrame(({ clock }, delta) => {
    if (!arrayRef.current || !materialRef.current) return;
    const elapsed = clock.getElapsedTime();
    const damping = phaseDamping(cue.transition.damping, motion.actorArrival, motion.handoff);
    const energy = cue.motionEnergy;
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    const chartYield = cue.composition.chartScale > 0.5 ? 0.82 : 1;
    panels.forEach((panel, index) => {
      const layout = OPTICAL_PANEL_LAYOUT[index];
      const panelTime = elapsed + layout.phase;
      const direction = (index - (OPTICAL_PANEL_LAYOUT.length - 1) * 0.5) / 3;
      panel.position.x = MathUtils.damp(
        panel.position.x,
        layout.position[0] * cue.composition.glassSpread
          + Math.sin(panelTime * 0.19) * 0.08 * energy
          + direction * motion.impact * 0.24,
        damping,
        delta,
      );
      panel.position.y = MathUtils.damp(
        panel.position.y,
        layout.position[1]
          + Math.sin(panelTime * 0.41) * 0.14 * energy
          + motion.overshoot * direction * 0.09,
        damping,
        delta,
      );
      panel.position.z = MathUtils.damp(
        panel.position.z,
        layout.position[2] + Math.cos(panelTime * 0.17) * 0.12 * energy,
        damping,
        delta,
      );
      panel.rotation.x = MathUtils.damp(
        panel.rotation.x,
        layout.rotation[0] + Math.cos(panelTime * 0.23) * 0.025 * energy,
        damping,
        delta,
      );
      panel.rotation.y = MathUtils.damp(
        panel.rotation.y,
        layout.rotation[1]
          + Math.sin(panelTime * 0.29) * 0.07 * energy
          + direction * motion.impact * 0.08,
        damping,
        delta,
      );
      panel.rotation.z = MathUtils.damp(
        panel.rotation.z,
        layout.rotation[2] + Math.sin(panelTime * 0.16) * 0.025 * energy,
        damping,
        delta,
      );
      panel.scale.x = MathUtils.damp(panel.scale.x, layout.scale[0] * chartYield, damping, delta);
      panel.scale.y = MathUtils.damp(panel.scale.y, layout.scale[1] * chartYield, damping, delta);
      panel.updateMatrix();
      arrayRef.current?.setMatrixAt(index, panel.matrix);
    });
    arrayRef.current.instanceMatrix.needsUpdate = true;
    paletteTargets.primary.set(cue.palette.primary);
    paletteTargets.secondary.set(cue.palette.secondary);
    paletteTargets.accent.set(cue.palette.accent);
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uOpacity.value = MathUtils.damp(
      materialRef.current.uniforms.uOpacity.value,
      0.52
        + energy * 0.12
        + motion.impact * 0.1
        + motion.voiceImpulse * 0.08
        + motion.voiceLevel * 0.11
        + motion.voicePeak * 0.03,
      damping,
      delta,
    );
    materialRef.current.uniforms.uPrimary.value.lerp(paletteTargets.primary, paletteAlpha);
    materialRef.current.uniforms.uSecondary.value.lerp(paletteTargets.secondary, paletteAlpha);
    materialRef.current.uniforms.uAccent.value.lerp(paletteTargets.accent, paletteAlpha);
  });

  return (
    <instancedMesh
      ref={arrayRef}
      args={[undefined, undefined, OPTICAL_PANEL_LAYOUT.length]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1, 16, 10]}>
        <instancedBufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
        <instancedBufferAttribute attach="attributes-aOpacity" args={[opacities, 1]} />
      </planeGeometry>
      <shaderMaterial
        ref={materialRef}
        blending={AdditiveBlending}
        depthWrite={false}
        fragmentShader={opticalArrayFragmentShader}
        side={DoubleSide}
        transparent
        uniforms={uniforms}
        vertexShader={opticalArrayVertexShader}
      />
    </instancedMesh>
  );
}

const evidenceColumnVertexShader = /* glsl */ `
  attribute float aPhase;
  varying float vHeight;
  varying float vPhase;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vHeight = position.y + 0.5;
    vPhase = aPhase;
    vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
    vec4 viewPosition = modelViewMatrix * instancePosition;
    vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const evidenceColumnFragmentShader = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uOpacity;
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform float uTime;
  varying float vHeight;
  varying float vPhase;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(-vViewPosition);
    float fresnel = pow(1.0 - clamp(abs(dot(normal, viewDirection)), 0.0, 1.0), 1.75);
    float vertical = smoothstep(0.0, 1.0, vHeight);
    float scanWave = sin(vHeight * 26.0 - uTime * 1.8 + vPhase * 6.28318) * 0.5 + 0.5;
    float scan = pow(smoothstep(0.72, 1.0, scanWave), 4.0);
    float cap = smoothstep(0.82, 1.0, vHeight);
    vec3 color = mix(uPrimary, uSecondary, vertical * 0.58);
    color = mix(color, uAccent, cap * 0.72 + scan * 0.16);
    float alpha = (0.09 + fresnel * 0.42 + cap * 0.2 + scan * 0.08) * uOpacity;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

const evidenceCurveVertexShader = /* glsl */ `
  varying float vAlong;

  void main() {
    vAlong = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const evidenceCurveFragmentShader = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uOpacity;
  uniform vec3 uPrimary;
  uniform float uReveal;
  uniform float uTime;
  varying float vAlong;

  void main() {
    float edge = 1.0 - smoothstep(uReveal - 0.035, uReveal + 0.012, vAlong);
    float pulsePosition = fract(uTime * 0.16);
    float pulseDistance = min(abs(vAlong - pulsePosition), 1.0 - abs(vAlong - pulsePosition));
    float pulse = exp(-pulseDistance * pulseDistance * 420.0);
    vec3 color = mix(uPrimary, uAccent, vAlong * 0.7 + pulse * 0.3);
    gl_FragColor = vec4(color, (0.52 + pulse * 0.48) * edge * uOpacity);
  }
`;

function EvidenceField({
  cue,
  enabled,
  motion,
}: {
  cue: CinematicCue;
  enabled: boolean;
  motion: StageMotionBus;
}) {
  const groupRef = useRef<Group>(null);
  const columnsRef = useRef<InstancedMesh>(null);
  const curveRef = useRef<Mesh>(null);
  const columnMaterialRef = useRef<ShaderMaterial>(null);
  const curveMaterialRef = useRef<ShaderMaterial>(null);
  const revealRef = useRef(0);
  const columns = useMemo(
    () => Array.from(EVIDENCE_HEIGHTS, (_, index) => {
      const column = new Object3D();
      column.position.set(EVIDENCE_COLUMN_X[index], EVIDENCE_BASE_Y, index * 0.018);
      column.scale.set(0.001, 0.001, 0.001);
      column.updateMatrix();
      return column;
    }),
    [],
  );
  const paletteTargets = useMemo(
    () => ({
      primary: new Color(cue.palette.primary),
      secondary: new Color(cue.palette.secondary),
      accent: new Color(cue.palette.accent),
    }),
    [],
  );
  const columnUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uPrimary: { value: new Color(cue.palette.primary) },
    uSecondary: { value: new Color(cue.palette.secondary) },
    uAccent: { value: new Color(cue.palette.accent) },
  }), []);
  const curveUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uReveal: { value: 0 },
    uOpacity: { value: 0 },
    uPrimary: { value: new Color(cue.palette.primary) },
    uAccent: { value: new Color(cue.palette.accent) },
  }), []);

  useLayoutEffect(() => {
    if (!columnsRef.current) return;
    columnsRef.current.instanceMatrix.setUsage(DynamicDrawUsage);
    columns.forEach((column, index) => columnsRef.current?.setMatrixAt(index, column.matrix));
    columnsRef.current.instanceMatrix.needsUpdate = true;
  }, [columns]);

  useFrame(({ clock, size }, delta) => {
    if (
      !groupRef.current
      || !columnsRef.current
      || !curveRef.current
      || !columnMaterialRef.current
      || !curveMaterialRef.current
    ) return;

    const damping = phaseDamping(cue.transition.damping, motion.actorArrival, motion.handoff);
    const actorDamping = enabled ? damping : Math.max(damping, 8);
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    const elapsed = clock.getElapsedTime();
    const targetScale = enabled ? cue.composition.chartScale : 0;
    if (enabled) {
      revealRef.current = Math.max(
        revealRef.current,
        MathUtils.smoothstep(motion.actorArrival, 0.04, 0.9),
      );
    } else {
      revealRef.current = 0;
    }
    const reveal = revealRef.current;
    const portraitMix = 1 - MathUtils.smoothstep(size.width / size.height, 0.72, 1.25);
    const responsiveScale = 1 - portraitMix * 0.2;
    const targetX = MathUtils.lerp(cue.evidence.position[0], 0, portraitMix);
    const targetY = MathUtils.lerp(cue.evidence.position[1], 0.98, portraitMix);
    const targetZ = cue.evidence.position[2] - portraitMix * 0.15;

    groupRef.current.position.x = MathUtils.damp(groupRef.current.position.x, targetX, damping, delta);
    groupRef.current.position.y = MathUtils.damp(groupRef.current.position.y, targetY, damping, delta);
    groupRef.current.position.z = MathUtils.damp(groupRef.current.position.z, targetZ, damping, delta);
    groupRef.current.rotation.x = MathUtils.damp(
      groupRef.current.rotation.x,
      cue.evidence.rotation[0],
      damping,
      delta,
    );
    groupRef.current.rotation.y = MathUtils.damp(
      groupRef.current.rotation.y,
      cue.evidence.rotation[1] * (1 - portraitMix * 0.65),
      damping,
      delta,
    );
    groupRef.current.rotation.z = MathUtils.damp(
      groupRef.current.rotation.z,
      cue.evidence.rotation[2],
      damping,
      delta,
    );
    const groupScale = MathUtils.damp(
      groupRef.current.scale.x,
      responsiveScale,
      damping,
      delta,
    );
    groupRef.current.scale.setScalar(groupScale);

    for (let index = 0; index < columns.length; index += 1) {
      const column = columns[index];
      const stagger = MathUtils.smoothstep(
        reveal,
        index * 0.115,
        0.62 + index * 0.075,
      );
      const baseHeight = 0.55 + EVIDENCE_HEIGHTS[index] * 1.35;
      const targetHeight = Math.max(0.001, baseHeight * targetScale * stagger);
      const targetWidth = Math.max(0.001, 0.34 * targetScale * (0.7 + stagger * 0.3));
      column.position.x = MathUtils.damp(
        column.position.x,
        EVIDENCE_COLUMN_X[index] * cue.evidence.spread,
        damping,
        delta,
      );
      column.position.y = MathUtils.damp(
        column.position.y,
        EVIDENCE_BASE_Y + targetHeight * 0.5 + motion.voiceLevel * 0.018 * (index + 1),
        actorDamping,
        delta,
      );
      column.position.z = MathUtils.damp(
        column.position.z,
        index * 0.018 + Math.sin(elapsed * 0.24 + index) * 0.018 * cue.motionEnergy,
        damping,
        delta,
      );
      column.scale.x = MathUtils.damp(column.scale.x, targetWidth, actorDamping, delta);
      column.scale.y = MathUtils.damp(column.scale.y, targetHeight, actorDamping, delta);
      column.scale.z = MathUtils.damp(column.scale.z, targetWidth * 0.72, actorDamping, delta);
      column.updateMatrix();
      columnsRef.current.setMatrixAt(index, column.matrix);
    }
    columnsRef.current.instanceMatrix.needsUpdate = true;

    curveRef.current.scale.x = MathUtils.damp(
      curveRef.current.scale.x,
      cue.evidence.spread,
      actorDamping,
      delta,
    );
    const curveHeightScale = MathUtils.damp(
      curveRef.current.scale.y,
      targetScale,
      actorDamping,
      delta,
    );
    curveRef.current.scale.y = curveHeightScale;
    curveRef.current.scale.z = MathUtils.damp(curveRef.current.scale.z, 1, actorDamping, delta);
    curveRef.current.position.y = MathUtils.damp(
      curveRef.current.position.y,
      EVIDENCE_BASE_Y * (1 - targetScale),
      actorDamping,
      delta,
    );
    groupRef.current.visible = curveHeightScale > 0.018 || columns[3].scale.y > 0.018;

    paletteTargets.primary.set(cue.palette.primary);
    paletteTargets.secondary.set(cue.palette.secondary);
    paletteTargets.accent.set(cue.palette.accent);
    columnMaterialRef.current.uniforms.uTime.value = elapsed;
    columnMaterialRef.current.uniforms.uOpacity.value = MathUtils.damp(
      columnMaterialRef.current.uniforms.uOpacity.value,
      enabled ? 0.82 + motion.voiceLevel * 0.1 : 0,
      actorDamping,
      delta,
    );
    columnMaterialRef.current.uniforms.uPrimary.value.lerp(paletteTargets.primary, paletteAlpha);
    columnMaterialRef.current.uniforms.uSecondary.value.lerp(paletteTargets.secondary, paletteAlpha);
    columnMaterialRef.current.uniforms.uAccent.value.lerp(paletteTargets.accent, paletteAlpha);
    curveMaterialRef.current.uniforms.uTime.value = elapsed;
    curveMaterialRef.current.uniforms.uReveal.value = MathUtils.damp(
      curveMaterialRef.current.uniforms.uReveal.value,
      reveal,
      actorDamping,
      delta,
    );
    curveMaterialRef.current.uniforms.uOpacity.value = MathUtils.damp(
      curveMaterialRef.current.uniforms.uOpacity.value,
      enabled ? 0.9 + motion.voicePeak * 0.08 : 0,
      actorDamping,
      delta,
    );
    curveMaterialRef.current.uniforms.uPrimary.value.lerp(paletteTargets.primary, paletteAlpha);
    curveMaterialRef.current.uniforms.uAccent.value.lerp(paletteTargets.accent, paletteAlpha);
  });

  return (
    <group
      ref={groupRef}
      position={cue.evidence.position}
      rotation={cue.evidence.rotation}
    >
      <instancedMesh
        ref={columnsRef}
        args={[undefined, undefined, launchEvidence.points.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]}>
          <instancedBufferAttribute
            attach="attributes-aPhase"
            args={[EVIDENCE_COLUMN_PHASES, 1]}
          />
        </boxGeometry>
        <shaderMaterial
          ref={columnMaterialRef}
          blending={AdditiveBlending}
          depthWrite={false}
          fragmentShader={evidenceColumnFragmentShader}
          transparent
          uniforms={columnUniforms}
          vertexShader={evidenceColumnVertexShader}
        />
      </instancedMesh>
      <mesh ref={curveRef} frustumCulled={false} renderOrder={8} scale={[1, 0.001, 1]}>
        <tubeGeometry args={[EVIDENCE_CURVE, 48, 0.018, 6, false]} />
        <shaderMaterial
          ref={curveMaterialRef}
          blending={AdditiveBlending}
          depthWrite={false}
          fragmentShader={evidenceCurveFragmentShader}
          transparent
          uniforms={curveUniforms}
          vertexShader={evidenceCurveVertexShader}
        />
      </mesh>
    </group>
  );
}

const opticalCoreVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const opticalCoreFragmentShader = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uAssembly;
  uniform float uEnergy;
  uniform float uImpact;
  uniform float uOpacity;
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uSurface;
  uniform float uTime;
  uniform float uVoice;
  varying vec2 vUv;

  float roundedBoxDistance(vec2 point, vec2 bounds, float radius) {
    vec2 offset = abs(point) - bounds + radius;
    return min(max(offset.x, offset.y), 0.0) + length(max(offset, 0.0)) - radius;
  }

  float ringBand(float distanceToCenter, float radius, float width) {
    return 1.0 - smoothstep(width, width * 2.2, abs(distanceToCenter - radius));
  }

  float angularPulse(float angle, float center, float width) {
    float delta = abs(atan(sin(angle - center), cos(angle - center)));
    return 1.0 - smoothstep(width * 0.45, width, delta);
  }

  void main() {
    vec2 point = vUv - 0.5;
    float panelDistance = roundedBoxDistance(point, vec2(0.485), 0.075);
    float panel = 1.0 - smoothstep(-0.004, 0.008, panelDistance);
    if (panel < 0.003) discard;

    float radius = length(point);
    float angle = atan(point.y, point.x);
    float time = uTime * (0.13 + uEnergy * 0.035);
    float assembly = smoothstep(0.04, 0.92, uAssembly);
    float cavityDistance = roundedBoxDistance(point, vec2(0.415), 0.105);
    float cavity = 1.0 - smoothstep(-0.002, 0.014, cavityDistance);
    float cavityRim = 1.0 - smoothstep(0.002, 0.016, abs(cavityDistance));
    float edge = 1.0 - smoothstep(0.008, 0.04, abs(panelDistance));
    float ringOne = ringBand(radius, 0.132 + sin(time * 0.8) * 0.004, 0.006);
    float ringTwo = ringBand(radius, 0.225, 0.007);
    float ringThree = ringBand(radius, 0.318 + sin(time * 0.55) * 0.006, 0.0055);
    float ringFour = ringBand(radius, 0.386, 0.0035);
    float segmentOne = angularPulse(angle, time * 0.72, 0.82);
    float segmentTwo = angularPulse(angle, -time * 0.54 + 2.35, 0.64);
    float segmentThree = angularPulse(angle, time * 0.38 - 2.15, 0.52);
    float aperture = ringOne * (0.42 + segmentOne * 0.58)
      + ringTwo * (0.24 + segmentTwo * 0.76)
      + ringThree * segmentThree
      + ringFour * (0.08 + segmentOne * 0.2);

    float sweepPosition = sin(time * 0.46) * 0.34;
    float sweep = exp(-pow(point.x + point.y * 0.28 - sweepPosition, 2.0) * 180.0);
    float broadSweep = exp(-pow(point.x * 0.78 + point.y * 0.42 - sweepPosition, 2.0) * 16.0);
    float interference = sin((point.x + point.y) * 82.0 - time * 2.1)
      * sin((point.x - point.y) * 59.0 + time * 1.4) * 0.5 + 0.5;
    float lens = 1.0 - smoothstep(0.27, 0.32, radius);
    float lensFalloff = exp(-radius * radius * 14.0);
    float lensRim = ringBand(radius, 0.294, 0.008);
    float iris = (1.0 - smoothstep(0.13, 0.27, radius))
      * (0.45 + 0.55 * pow(0.5 + 0.5 * cos(angle * 12.0 - time * 1.8), 8.0));
    float depthDisc = exp(-radius * radius * 38.0);
    float centralHalo = exp(-radius * radius * 72.0);
    float centralVoid = 1.0 - smoothstep(0.025, 0.085, radius);
    float horizon = exp(-pow(point.y + 0.018, 2.0) * 210.0) * (0.2 + sweep * 0.8);
    float traceOne = exp(-pow(point.y - sin(point.x * 5.0 + time) * 0.018, 2.0) * 4200.0)
      * smoothstep(0.2, 0.42, abs(point.x));
    float traceTwo = exp(-pow(point.x + cos(point.y * 5.0 - time * 0.8) * 0.014, 2.0) * 5200.0)
      * smoothstep(0.22, 0.42, abs(point.y));
    float microTicks = pow(0.5 + 0.5 * cos(angle * 48.0 + time * 0.44), 18.0)
      * ringBand(radius, 0.348, 0.012);
    float facet = sin(angle * 6.0 + radius * 38.0 - time * 0.8) * 0.5 + 0.5;
    float pulse = 0.5 + 0.5 * sin(uTime * 0.64 + radius * 20.0);

    vec3 color = uSurface * (0.42 + cavity * 0.12);
    color = mix(color, uPrimary * (0.09 + facet * 0.025), cavity * lensFalloff);
    color += uPrimary * (aperture * (0.68 + uVoice * 0.36) + lensRim * 0.26) * assembly;
    color += uSecondary * (
      broadSweep * 0.075
      + sweep * 0.22
      + horizon * 0.16
      + cavityRim * 0.12
      + traceOne * 0.2
      + traceTwo * 0.14
    ) * (0.48 + assembly * 0.52);
    color += uAccent * (
      ringThree * segmentThree * 0.78
      + iris * 0.09
      + microTicks * 0.2
      + centralHalo * (0.32 + pulse * 0.16)
    );
    color += mix(uPrimary, uAccent, facet) * interference * lens * 0.055;
    color += mix(uSecondary, uAccent, vUv.x) * depthDisc * (0.06 + uVoice * 0.045);
    color += uSecondary * uImpact * centralHalo * 0.42;
    color *= 1.0 - centralVoid * 0.34;
    color += uAccent * centralVoid * (0.08 + uImpact * 0.22);
    color += mix(uPrimary, uSecondary, vUv.y) * edge * (0.09 + broadSweep * 0.12);

    float alpha = panel * uOpacity * (0.76 + cavity * 0.12 + lens * 0.06 + edge * 0.05);
    gl_FragColor = vec4(color, alpha);
  }
`;

function HeroOpticalCore({ cue, motion }: { cue: CinematicCue; motion: StageMotionBus }) {
  const groupRef = useRef<Group>(null);
  const shellMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const faceMaterialRef = useRef<ShaderMaterial>(null);
  const finsRef = useRef<InstancedMesh>(null);
  const finMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const prismRef = useRef<Mesh>(null);
  const prismMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const fins = useMemo(
    () => OPTICAL_CORE_FIN_LAYOUT.map(() => new Object3D()),
    [],
  );
  const paletteTargets = useMemo(
    () => ({
      primary: new Color(cue.palette.primary),
      secondary: new Color(cue.palette.secondary),
      accent: new Color(cue.palette.accent),
      surface: new Color(cue.palette.surface),
    }),
    [],
  );
  const faceUniforms = useMemo(() => ({
    uAccent: { value: new Color(cue.palette.accent) },
    uAssembly: { value: 0 },
    uEnergy: { value: cue.motionEnergy },
    uImpact: { value: 0 },
    uOpacity: { value: 0.82 },
    uPrimary: { value: new Color(cue.palette.primary) },
    uSecondary: { value: new Color(cue.palette.secondary) },
    uSurface: { value: new Color(cue.palette.surface) },
    uTime: { value: 0 },
    uVoice: { value: 0 },
  }), []);

  useLayoutEffect(() => {
    if (!finsRef.current) return;
    finsRef.current.instanceMatrix.setUsage(DynamicDrawUsage);
    fins.forEach((fin, index) => {
      const layout = OPTICAL_CORE_FIN_LAYOUT[index];
      fin.position.set(layout.position[0], layout.position[1], layout.position[2]);
      fin.rotation.z = layout.rotation;
      fin.scale.set(layout.scale[0], layout.scale[1], layout.scale[2]);
      fin.updateMatrix();
      finsRef.current?.setMatrixAt(index, fin.matrix);
    });
    finsRef.current.instanceMatrix.needsUpdate = true;
  }, [fins]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !faceMaterialRef.current || !finsRef.current) return;
    const damping = phaseDamping(cue.transition.damping, motion.actorArrival, motion.handoff);
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    const elapsed = clock.getElapsedTime();
    const voice = Math.min(
      1.4,
      motion.voiceLevel + motion.voiceImpulse * 0.5 + motion.voicePeak * 0.22,
    );
    groupRef.current.position.x = MathUtils.damp(
      groupRef.current.position.x,
      cue.composition.heroX,
      damping,
      delta,
    );
    groupRef.current.position.y = MathUtils.damp(
      groupRef.current.position.y,
      cue.composition.heroY
        + motion.overshoot * 0.1
        + motion.voiceImpulse * 0.025
        + motion.voiceLevel * 0.035,
      damping,
      delta,
    );
    groupRef.current.rotation.y = MathUtils.damp(
      groupRef.current.rotation.y,
      cue.composition.heroYaw + Math.sin(elapsed * 0.18) * 0.028 * cue.motionEnergy,
      damping,
      delta,
    );
    groupRef.current.rotation.x = MathUtils.damp(
      groupRef.current.rotation.x,
      -0.04 + (cue.composition.coreScale - 0.9) * 0.08 + motion.impact * 0.055,
      damping,
      delta,
    );
    groupRef.current.rotation.z = MathUtils.damp(
      groupRef.current.rotation.z,
      (cue.composition.coreScale - 0.9) * -0.12,
      damping,
      delta,
    );
    const scale = MathUtils.damp(
      groupRef.current.scale.x,
      cue.composition.coreScale * (
        1
        + motion.overshoot * 0.08
        + motion.voiceImpulse * 0.035
        + motion.voiceLevel * 0.028
      ),
      damping,
      delta,
    );
    groupRef.current.scale.setScalar(scale);
    groupRef.current.visible = scale > 0.075;

    paletteTargets.primary.set(cue.palette.primary);
    paletteTargets.secondary.set(cue.palette.secondary);
    paletteTargets.accent.set(cue.palette.accent);
    paletteTargets.surface.set(cue.palette.surface);
    shellMaterialRef.current?.color.lerp(paletteTargets.surface, paletteAlpha);
    shellMaterialRef.current?.emissive.lerp(paletteTargets.primary, paletteAlpha);
    finMaterialRef.current?.color.lerp(paletteTargets.secondary, paletteAlpha);
    finMaterialRef.current?.emissive.lerp(paletteTargets.primary, paletteAlpha);
    prismMaterialRef.current?.color.lerp(paletteTargets.accent, paletteAlpha);
    prismMaterialRef.current?.emissive.lerp(paletteTargets.accent, paletteAlpha);
    if (shellMaterialRef.current) {
      shellMaterialRef.current.emissiveIntensity = MathUtils.damp(
        shellMaterialRef.current.emissiveIntensity,
        0.015 + cue.motionEnergy * 0.015 + motion.impact * 0.045 + voice * 0.02,
        damping,
        delta,
      );
      shellMaterialRef.current.roughness = MathUtils.damp(
        shellMaterialRef.current.roughness,
        0.15 - cue.motionEnergy * 0.025 - motion.impact * 0.02 - voice * 0.008,
        damping,
        delta,
      );
      shellMaterialRef.current.iridescence = MathUtils.damp(
        shellMaterialRef.current.iridescence,
        0.3 + cue.motionEnergy * 0.16 + voice * 0.07,
        damping,
        delta,
      );
    }
    if (finMaterialRef.current) {
      finMaterialRef.current.emissiveIntensity = MathUtils.damp(
        finMaterialRef.current.emissiveIntensity,
        0.22 + cue.motionEnergy * 0.2 + motion.impact * 0.6 + voice * 0.28,
        damping,
        delta,
      );
      finMaterialRef.current.roughness = MathUtils.damp(
        finMaterialRef.current.roughness,
        0.14 - cue.motionEnergy * 0.03 - motion.impact * 0.018,
        damping,
        delta,
      );
      finMaterialRef.current.iridescence = MathUtils.damp(
        finMaterialRef.current.iridescence,
        0.24 + cue.motionEnergy * 0.14 + voice * 0.06,
        damping,
        delta,
      );
    }
    if (prismMaterialRef.current) {
      prismMaterialRef.current.emissiveIntensity = MathUtils.damp(
        prismMaterialRef.current.emissiveIntensity,
        0.16
          + motion.impact * 0.72
          + motion.voiceImpulse * 0.46
          + motion.voiceLevel * 0.55
          + motion.voicePeak * 0.22,
        damping,
        delta,
      );
      prismMaterialRef.current.roughness = MathUtils.damp(
        prismMaterialRef.current.roughness,
        0.11 - cue.motionEnergy * 0.025 - motion.impact * 0.018,
        damping,
        delta,
      );
      prismMaterialRef.current.iridescence = MathUtils.damp(
        prismMaterialRef.current.iridescence,
        0.54 + cue.motionEnergy * 0.18 + voice * 0.08,
        damping,
        delta,
      );
    }

    const faceUniformValues = faceMaterialRef.current.uniforms;
    faceUniformValues.uPrimary.value.lerp(paletteTargets.primary, paletteAlpha);
    faceUniformValues.uSecondary.value.lerp(paletteTargets.secondary, paletteAlpha);
    faceUniformValues.uAccent.value.lerp(paletteTargets.accent, paletteAlpha);
    faceUniformValues.uSurface.value.lerp(paletteTargets.surface, paletteAlpha);
    faceUniformValues.uTime.value = elapsed;
    faceUniformValues.uEnergy.value = MathUtils.damp(
      faceUniformValues.uEnergy.value,
      cue.motionEnergy,
      damping,
      delta,
    );
    faceUniformValues.uAssembly.value = MathUtils.damp(
      faceUniformValues.uAssembly.value,
      motion.actorArrival,
      damping,
      delta,
    );
    faceUniformValues.uImpact.value = MathUtils.damp(
      faceUniformValues.uImpact.value,
      motion.impact + motion.voiceImpulse * 0.52,
      damping,
      delta,
    );
    faceUniformValues.uVoice.value = MathUtils.damp(
      faceUniformValues.uVoice.value,
      voice,
      damping,
      delta,
    );
    faceUniformValues.uOpacity.value = MathUtils.damp(
      faceUniformValues.uOpacity.value,
      0.8 + cue.motionEnergy * 0.06 + voice * 0.035,
      damping,
      delta,
    );
    if (!groupRef.current.visible) return;

    const assembly = MathUtils.smoothstep(motion.actorArrival, 0.04, 0.9);
    const railExpansion = (1 - assembly) * 0.075
      + cue.motionEnergy * 0.02
      + motion.impact * 0.045
      + voice * 0.012;
    for (let index = 0; index < fins.length; index += 1) {
      const fin = fins[index];
      const layout = OPTICAL_CORE_FIN_LAYOUT[index];
      const railPulse = Math.sin(elapsed * 0.42 + layout.phase) * 0.5 + 0.5;
      const radialScale = 0.9 + assembly * 0.1;
      fin.position.x = layout.position[0] * radialScale
        + Math.sign(layout.position[0]) * (railExpansion + railPulse * 0.007);
      fin.position.y = layout.position[1] * radialScale
        + Math.sign(layout.position[1]) * (railExpansion + (1 - railPulse) * 0.007);
      fin.position.z = layout.position[2]
        + motion.impact * 0.045
        + Math.sin(elapsed * 0.36 + layout.phase) * 0.008 * cue.motionEnergy;
      fin.rotation.z = layout.rotation
        + Math.sin(elapsed * 0.28 + layout.phase) * 0.025 * cue.motionEnergy;
      const revealScale = 0.46 + assembly * 0.54;
      fin.scale.set(
        layout.scale[0] * revealScale,
        layout.scale[1] * revealScale,
        layout.scale[2] * (0.7 + assembly * 0.3),
      );
      fin.updateMatrix();
      finsRef.current?.setMatrixAt(index, fin.matrix);
    }
    finsRef.current.instanceMatrix.needsUpdate = true;

    if (prismRef.current) {
      prismRef.current.rotation.x = 0.38 + Math.sin(elapsed * 0.24) * 0.1;
      prismRef.current.rotation.y += delta * (0.16 + cue.motionEnergy * 0.22 + voice * 0.08);
      prismRef.current.rotation.z = 0.18 + Math.sin(elapsed * 0.31) * 0.12;
      prismRef.current.position.z = 0.21 + motion.impact * 0.06 + voice * 0.012;
      const prismScale = 0.88 + motion.impact * 0.14 + voice * 0.07;
      prismRef.current.scale.setScalar(prismScale);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[0.08, 0.18, 0.14]}
      scale={cue.composition.coreScale}
      visible={cue.composition.coreScale > 0.075}
    >
      <RoundedBox args={[1.88, 1.88, 0.28]} radius={0.3} smoothness={8} position={[0, 0, -0.04]}>
        <meshPhysicalMaterial
          ref={shellMaterialRef}
          clearcoat={1}
          clearcoatRoughness={0.08}
          color={cue.palette.surface}
          emissive={cue.palette.primary}
          emissiveIntensity={0.02}
          iridescence={0.42}
          iridescenceIOR={1.36}
          iridescenceThicknessRange={[180, 460]}
          metalness={0.88}
          roughness={0.13}
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.125]} renderOrder={7}>
        <planeGeometry args={[1.64, 1.64]} />
        <shaderMaterial
          ref={faceMaterialRef}
          args={[{
            uniforms: faceUniforms,
            vertexShader: opticalCoreVertexShader,
            fragmentShader: opticalCoreFragmentShader,
          }]}
          depthWrite={false}
          toneMapped={false}
          transparent
        />
      </mesh>
      <instancedMesh
        ref={finsRef}
        args={[undefined, undefined, OPTICAL_CORE_FIN_LAYOUT.length]}
        frustumCulled={false}
      >
        <capsuleGeometry args={[0.08, 0.84, 4, 8]} />
        <meshPhysicalMaterial
          ref={finMaterialRef}
          clearcoat={1}
          clearcoatRoughness={0.06}
          color={cue.palette.secondary}
          emissive={cue.palette.primary}
          emissiveIntensity={0.22}
          iridescence={0.34}
          iridescenceIOR={1.32}
          iridescenceThicknessRange={[150, 380]}
          metalness={0.72}
          roughness={0.12}
        />
      </instancedMesh>
      <mesh ref={prismRef} position={[0, 0, 0.21]} rotation={[0.38, 0.42, 0.18]}>
        <icosahedronGeometry args={[0.16, 0]} />
        <meshPhysicalMaterial
          ref={prismMaterialRef}
          clearcoat={1}
          clearcoatRoughness={0.04}
          color={cue.palette.accent}
          emissive={cue.palette.accent}
          emissiveIntensity={0.16}
          flatShading
          iridescence={0.68}
          iridescenceIOR={1.44}
          iridescenceThicknessRange={[180, 520]}
          metalness={0.72}
          roughness={0.09}
        />
      </mesh>
    </group>
  );
}

const organicLineVertexShader = /* glsl */ `
  attribute float aGrowth;
  attribute float aSeed;
  attribute float aSide;
  uniform float uEnergy;
  uniform float uTime;
  varying float vGrowth;
  varying float vDepth;
  varying float vSeed;
  varying float vSide;

  void main() {
    vGrowth = aGrowth;
    vSeed = aSeed;
    vSide = aSide;
    vec3 animated = position;
    float sway = sin(uTime * 0.31 + aGrowth * 8.0) * 0.018 * (0.35 + uEnergy);
    float torsion = sin(uTime * 0.19 + aGrowth * 11.0 + aSeed * 6.28318) * 0.012;
    animated.x += sway * aGrowth;
    animated.y += cos(uTime * 0.17 + aGrowth * 7.0) * 0.006 * aGrowth * uEnergy;
    animated.z += cos(uTime * 0.23 + aGrowth * 6.0) * 0.012 * aGrowth * (0.4 + uEnergy);
    animated.z += aSide * torsion * (0.35 + aGrowth);
    vDepth = animated.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(animated, 1.0);
  }
`;

const organicLineFragmentShader = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uOpacity;
  uniform vec3 uPrimary;
  uniform float uReveal;
  uniform vec3 uSecondary;
  uniform float uTime;
  uniform float uVoice;
  varying float vGrowth;
  varying float vDepth;
  varying float vSeed;
  varying float vSide;

  void main() {
    float reveal = 1.0 - smoothstep(uReveal - 0.02, uReveal + 0.045, vGrowth);
    float travel = fract(uTime * (0.055 + uVoice * 0.025) + vSeed * 0.16);
    float pulseDistance = min(abs(vGrowth - travel), 1.0 - abs(vGrowth - travel));
    float pulse = exp(-pulseDistance * pulseDistance * 260.0);
    float side = abs(vSide);
    float body = 1.0 - smoothstep(0.7, 1.0, side);
    float core = 1.0 - smoothstep(0.08, 0.34, side);
    float rim = smoothstep(0.28, 0.66, side) * (1.0 - smoothstep(0.7, 1.0, side));
    float striation = pow(sin(vGrowth * 54.0 + vSeed * 24.0 - uTime * 0.12) * 0.5 + 0.5, 3.0);
    float depthLight = 0.66 + smoothstep(-0.22, 0.3, vDepth) * 0.34;
    float tip = smoothstep(0.72, 1.0, vGrowth);
    vec3 color = mix(uPrimary, uAccent, tip * 0.72 + rim * 0.2);
    color = mix(color, uSecondary, core * 0.32 + pulse * (0.64 + uVoice * 0.18));
    color += uAccent * striation * 0.08;
    float alpha = reveal
      * body
      * (0.1 + core * 0.42 + rim * 0.16 + striation * 0.08 + pulse * 0.58)
      * depthLight
      * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

const organicPointVertexShader = /* glsl */ `
  attribute float aGrowth;
  attribute float aSeed;
  attribute float aTerminal;
  uniform float uEnergy;
  uniform float uReveal;
  uniform float uScale;
  uniform float uTime;
  uniform float uVoice;
  varying float vPulse;
  varying float vReveal;
  varying float vSeed;
  varying float vTerminal;

  void main() {
    vReveal = 1.0 - smoothstep(uReveal - 0.015, uReveal + 0.04, aGrowth);
    float travel = fract(uTime * (0.055 + uVoice * 0.025) + aSeed * 0.16);
    float pulseDistance = min(abs(aGrowth - travel), 1.0 - abs(aGrowth - travel));
    vPulse = exp(-pulseDistance * pulseDistance * 240.0);
    vSeed = aSeed;
    vTerminal = aTerminal;
    vec3 animated = position;
    animated.x += sin(uTime * 0.31 + aGrowth * 8.0) * 0.018 * aGrowth * (0.35 + uEnergy);
    animated.y += cos(uTime * 0.17 + aGrowth * 7.0) * 0.006 * aGrowth * uEnergy;
    animated.z += cos(uTime * 0.23 + aGrowth * 6.0) * 0.012 * aGrowth * (0.4 + uEnergy);
    vec4 viewPosition = modelViewMatrix * vec4(animated, 1.0);
    float size = 4.8 + aTerminal * 8.0 + vPulse * 5.8 + uVoice * 3.8;
    gl_PointSize = size * uScale * (8.5 / max(1.0, -viewPosition.z));
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const organicPointFragmentShader = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uOpacity;
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  varying float vPulse;
  varying float vReveal;
  varying float vSeed;
  varying float vTerminal;

  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float angle = vSeed * 6.28318;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 lensPoint = rotation * point;
    float distanceToCenter = length(point);
    float lensDistance = length(vec2(lensPoint.x * 0.82, lensPoint.y * 1.42));
    float diamondDistance = abs(lensPoint.x) + abs(lensPoint.y);
    float halo = 1.0 - smoothstep(0.2, 0.5, distanceToCenter);
    float lens = 1.0 - smoothstep(0.18, 0.44, lensDistance);
    float ring = smoothstep(0.11, 0.2, lensDistance) * (1.0 - smoothstep(0.28, 0.4, lensDistance));
    float core = 1.0 - smoothstep(0.04, 0.16, diamondDistance);
    vec3 color = mix(uPrimary, uAccent, 0.28 + vTerminal * 0.5 + ring * 0.16);
    color = mix(color, uSecondary, vPulse * 0.72 + core * 0.28);
    float alpha = (halo * 0.18 + lens * 0.3 + ring * 0.36 + core * 0.82)
      * vReveal
      * (0.45 + vTerminal * 0.55)
      * uOpacity;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

function NetworkBloom({ cue, motion }: { cue: CinematicCue; motion: StageMotionBus }) {
  const groupRef = useRef<Group>(null);
  const lineMaterialRef = useRef<ShaderMaterial>(null);
  const pointsMaterialRef = useRef<ShaderMaterial>(null);
  const targetPrimary = useMemo(() => new Color(cue.palette.primary), []);
  const targetSecondary = useMemo(() => new Color(cue.palette.secondary), []);
  const targetAccent = useMemo(() => new Color(cue.palette.accent), []);
  const geometry = useMemo(createOrganicNetworkGeometry, []);
  const lineUniforms = useMemo(() => ({
    uAccent: { value: new Color(cue.palette.accent) },
    uEnergy: { value: cue.motionEnergy },
    uOpacity: { value: 0.52 },
    uPrimary: { value: new Color(cue.palette.primary) },
    uReveal: { value: 0 },
    uSecondary: { value: new Color(cue.palette.secondary) },
    uTime: { value: 0 },
    uVoice: { value: 0 },
  }), []);
  const pointUniforms = useMemo(() => ({
    uAccent: { value: new Color(cue.palette.accent) },
    uEnergy: { value: cue.motionEnergy },
    uOpacity: { value: 0.92 },
    uPrimary: { value: new Color(cue.palette.primary) },
    uReveal: { value: 0 },
    uScale: { value: 0.03 },
    uSecondary: { value: new Color(cue.palette.secondary) },
    uTime: { value: 0 },
    uVoice: { value: 0 },
  }), []);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !lineMaterialRef.current || !pointsMaterialRef.current) return;
    const damping = phaseDamping(cue.transition.damping, motion.actorArrival, motion.handoff);
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    const voice = Math.min(1.4, motion.voiceLevel + motion.voiceImpulse * 0.45 + motion.voicePeak * 0.25);
    const actorPresence = MathUtils.smoothstep(cue.composition.growthScale, 0.08, 0.24);
    const scale = MathUtils.damp(
      groupRef.current.scale.x,
      cue.composition.growthScale * (
        1
        + motion.overshoot * 0.07
        + motion.voiceImpulse * 0.025
        + motion.voiceLevel * 0.03
      ),
      damping,
      delta,
    );
    groupRef.current.scale.setScalar(scale);
    const elapsed = clock.getElapsedTime();
    groupRef.current.rotation.y = Math.sin(elapsed * 0.16) * 0.1 * cue.motionEnergy;
    groupRef.current.rotation.z = Math.sin(elapsed * 0.11) * 0.018 * cue.motionEnergy;
    targetPrimary.set(cue.palette.primary);
    targetSecondary.set(cue.palette.secondary);
    targetAccent.set(cue.palette.accent);
    lineMaterialRef.current.uniforms.uPrimary.value.lerp(targetPrimary, paletteAlpha);
    lineMaterialRef.current.uniforms.uSecondary.value.lerp(targetSecondary, paletteAlpha);
    lineMaterialRef.current.uniforms.uAccent.value.lerp(targetAccent, paletteAlpha);
    lineMaterialRef.current.uniforms.uTime.value = elapsed;
    lineMaterialRef.current.uniforms.uVoice.value = voice;
    lineMaterialRef.current.uniforms.uEnergy.value = cue.motionEnergy + voice * 0.32;
    lineMaterialRef.current.uniforms.uReveal.value = motion.actorArrival;
    const lineOpacity = MathUtils.damp(
      lineMaterialRef.current.uniforms.uOpacity.value,
      (0.56 + motion.impact * 0.12 + voice * 0.16) * actorPresence,
      damping,
      delta,
    );
    lineMaterialRef.current.uniforms.uOpacity.value = lineOpacity;
    pointsMaterialRef.current.uniforms.uPrimary.value.lerp(targetPrimary, paletteAlpha);
    pointsMaterialRef.current.uniforms.uSecondary.value.lerp(targetSecondary, paletteAlpha);
    pointsMaterialRef.current.uniforms.uAccent.value.lerp(targetAccent, paletteAlpha);
    pointsMaterialRef.current.uniforms.uTime.value = elapsed;
    pointsMaterialRef.current.uniforms.uVoice.value = voice;
    pointsMaterialRef.current.uniforms.uEnergy.value = cue.motionEnergy + voice * 0.32;
    pointsMaterialRef.current.uniforms.uReveal.value = motion.actorArrival;
    const pointScaleUniform = pointsMaterialRef.current.uniforms.uScale;
    if (pointScaleUniform) pointScaleUniform.value = scale;
    const pointOpacity = MathUtils.damp(
      pointsMaterialRef.current.uniforms.uOpacity.value,
      (0.86 + motion.impact * 0.08 + voice * 0.1) * actorPresence,
      damping,
      delta,
    );
    pointsMaterialRef.current.uniforms.uOpacity.value = pointOpacity;
    groupRef.current.visible = scale > 0.075 && Math.max(lineOpacity, pointOpacity) > 0.004;
  });

  return (
    <group ref={groupRef} position={[2.0, -1.12, 0.18]} scale={0.03}>
      <mesh>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.edgePositions, 3]} />
          <bufferAttribute attach="attributes-aGrowth" args={[geometry.edgeGrowth, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[geometry.edgeSeeds, 1]} />
          <bufferAttribute attach="attributes-aSide" args={[geometry.edgeSides, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={lineMaterialRef}
          args={[{ uniforms: lineUniforms, vertexShader: organicLineVertexShader, fragmentShader: organicLineFragmentShader }]}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
          transparent
        />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.nodePositions, 3]} />
          <bufferAttribute attach="attributes-aGrowth" args={[geometry.nodeGrowth, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[geometry.nodeSeeds, 1]} />
          <bufferAttribute attach="attributes-aTerminal" args={[geometry.nodeTerminal, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={pointsMaterialRef}
          args={[{ uniforms: pointUniforms, vertexShader: organicPointVertexShader, fragmentShader: organicPointFragmentShader }]}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          transparent
        />
      </points>
    </group>
  );
}
