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
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
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
import { createOrganicNetworkGeometry } from './organicNetwork';
import { resolveCuePace, scaleCueDuration } from './cuePacing';

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
          <AdaptiveDpr />
          <TransitionPerformanceRegressor eventId={state.activeEvent} />
          <RenderTelemetryProbe effectsEnabled={effectsEnabled} onChange={setRenderTelemetry} />
          <LaunchScene
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

      <KineticStageCopy cue={cue} eventId={state.activeEvent} pace={cuePace} />

      <div className="stage-performance" aria-label="Adaptive render performance">
        <span>AUTO</span>
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

      <aside className={state.dynamicChartVisible ? 'stage-dynamic-panel visible' : 'stage-dynamic-panel'}>
        <span>Summoned dynamic</span>
        <strong>Year-over-year projections</strong>
        <div className="stage-chart-summary">
          <b>+38%</b>
          <small>projected growth</small>
        </div>
        <div className="stage-chart-bars" aria-label="Projected revenue increases from fiscal year 2024 through 2027">
          {['FY24', 'FY25', 'FY26', 'FY27'].map((year) => (
            <div key={year}>
              <i />
              <small>{year}</small>
            </div>
          ))}
        </div>
      </aside>
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
  pace,
}: {
  cue: CinematicCue;
  eventId: StageEventId;
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
    <>
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
    </>
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
  const style = {
    '--cue-copy-duration': `${copyDurationMs}ms`,
    '--cue-copy-delay': `${copyDelayMs}ms`,
    '--cue-copy-x': `${cue.transition.copyOffset[0]}px`,
    '--cue-copy-y': `${cue.transition.copyOffset[1]}px`,
    '--cue-line-stagger': `${clamp(
      scaleCueDuration(cue.transition.durationMs * (interrupted ? 0.032 : 0.055), pace),
      interrupted ? 28 : 42,
      interrupted ? 52 : 96,
    )}ms`,
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
        {cue.copy.headlineLines.map((line, index) => (
          <span className="stage-copy-line" key={line} aria-hidden="true">
            <span style={{ '--line-index': index } as CSSProperties}>{line}</span>
          </span>
        ))}
      </h2>
      <p>{cue.copy.body}</p>
    </div>
  );
}

interface LaunchSceneProps {
  cue: CinematicCue;
  effectsEnabled: boolean;
  pace: number;
  presenterEnergy?: PresenterEnergySignal;
  presenterPulse: number;
  stageElementRef: RefObject<HTMLElement | null>;
  state: StageState;
}

function LaunchScene({
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
      <TransitionVeil cue={cue} motion={motion} />
      <StageEnvironment cue={cue} motion={motion} />
      <CinematicMediaPlate
        cue={cue}
        enabled={state.quality === 'high'}
        motion={motion}
        playbackRate={state.mediaPlaybackRate}
      />
      <SilkField cue={cue} motion={motion} />
      <SilkField cue={cue} foreground motion={motion} />
      <OpticalPanel cue={cue} index={0} motion={motion} position={[-2.9, 0.5, -1.2]} rotation={[0.08, 0.42, -0.08]} />
      <OpticalPanel cue={cue} index={1} motion={motion} position={[2.7, 0.85, -1.7]} rotation={[0.02, -0.42, 0.08]} />
      <OpticalPanel cue={cue} index={2} motion={motion} position={[0.45, -1.15, -0.65]} rotation={[-0.12, -0.14, 0.02]} />
      <HeroMonolith cue={cue} motion={motion} />
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
  cue,
  eventId,
  motion,
  presenterEnergy,
  presenterPulse,
  pace,
  stageElementRef,
}: {
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
    lastReportedHandoffRef.current = handoff.continuity;
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
    if (Math.abs(motion.voiceLevel - lastReportedEnergyRef.current) >= 0.01) {
      lastReportedEnergyRef.current = motion.voiceLevel;
      stageElementRef.current.setAttribute(
        'data-presenter-energy',
        motion.voiceLevel.toFixed(2),
      );
    }
    if (Math.abs(motion.voicePeak - lastReportedPeakRef.current) >= 0.01) {
      lastReportedPeakRef.current = motion.voicePeak;
      stageElementRef.current.setAttribute(
        'data-presenter-peak',
        motion.voicePeak.toFixed(2),
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

const transitionVeilVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const transitionVeilFragmentShader = /* glsl */ `
  uniform float uAngle;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uIntensity;
  uniform float uProgress;
  varying vec2 vUv;

  void main() {
    vec2 axis = vec2(cos(uAngle), sin(uAngle));
    float coordinate = dot(vUv - 0.5, axis) + 0.5;
    float travel = smoothstep(0.0, 0.78, uProgress);
    float center = mix(-0.28, 1.28, travel);
    float distanceToSweep = abs(coordinate - center);
    float filament = exp(-pow(distanceToSweep * 17.0, 1.55));
    float aura = exp(-pow(distanceToSweep * 5.0, 2.0));
    float enter = smoothstep(0.01, 0.1, uProgress);
    float exit = 1.0 - smoothstep(0.64, 0.96, uProgress);
    float interference = 0.9 + 0.1 * sin(vUv.y * 28.0 + sin(vUv.x * 9.0) * 2.0);
    vec3 color = mix(uColor, uAccent, smoothstep(0.15, 0.86, vUv.y));
    float alpha = (filament * 0.14 + aura * 0.04) * uIntensity * enter * exit * interference;

    gl_FragColor = vec4(color, alpha);
  }
`;

function TransitionVeil({ cue, motion }: { cue: CinematicCue; motion: StageMotionBus }) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const paletteTargets = useMemo(
    () => ({
      color: new Color(cue.palette.primary),
      accent: new Color(cue.palette.accent),
    }),
    [],
  );
  const uniforms = useMemo(() => ({
    uAngle: { value: cue.transition.sweepAngle },
    uColor: { value: new Color(cue.palette.primary) },
    uAccent: { value: new Color(cue.palette.accent) },
    uIntensity: { value: cue.transition.sweepIntensity },
    uProgress: { value: 0 },
  }), []);

  useFrame(({ camera, size }, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const perspectiveCamera = camera as PerspectiveCamera;
    const distance = 0.8;
    const viewHeight = 2 * Math.tan(MathUtils.degToRad(perspectiveCamera.fov * 0.5)) * distance;
    const viewWidth = viewHeight * (size.width / size.height);
    meshRef.current.position.copy(camera.position);
    meshRef.current.quaternion.copy(camera.quaternion);
    meshRef.current.translateZ(-distance);
    meshRef.current.scale.set(viewWidth * 0.54, viewHeight * 0.54, 1);

    const paletteAlpha = 1 - Math.exp(-cue.transition.damping * delta);
    paletteTargets.color.set(cue.palette.primary);
    paletteTargets.accent.set(cue.palette.accent);
    materialRef.current.uniforms.uColor.value.lerp(paletteTargets.color, paletteAlpha);
    materialRef.current.uniforms.uAccent.value.lerp(paletteTargets.accent, paletteAlpha);
    materialRef.current.uniforms.uAngle.value = cue.transition.sweepAngle;
    materialRef.current.uniforms.uIntensity.value = cue.transition.sweepIntensity;
    materialRef.current.uniforms.uProgress.value = motion.progress;
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={100}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        args={[{ uniforms, vertexShader: transitionVeilVertexShader, fragmentShader: transitionVeilFragmentShader }]}
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

const opticalPanelVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 displaced = position;
    displaced.z += sin(position.y * 2.4 + uTime * 0.22 + uPhase) * 0.035;
    displaced.z += cos(position.x * 1.8 - uTime * 0.16 + uPhase) * 0.018;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const opticalPanelFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uOpacity;
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uAccent;
  varying vec2 vUv;

  void main() {
    vec2 q = abs(vUv * 2.0 - 1.0) - vec2(0.78, 0.68);
    float distanceToEdge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.18;
    float mask = 1.0 - smoothstep(-0.005, 0.018, distanceToEdge);
    float border = 1.0 - smoothstep(0.012, 0.055, abs(distanceToEdge));
    float sweepInput = sin((vUv.x * 1.35 + vUv.y * 0.72 + uTime * 0.045 + uPhase) * 6.28318);
    float sweep = pow(smoothstep(0.62, 1.0, sweepInput * 0.5 + 0.5), 2.0);
    float cornerGlow = smoothstep(0.48, 0.96, length(vUv - vec2(0.5)) * 1.42);
    vec3 glassColor = mix(uPrimary, uSecondary, vUv.y * 0.56 + sweep * 0.18);
    glassColor = mix(glassColor, uAccent, cornerGlow * 0.18);
    float alpha = mask * (0.018 + border * 0.25 + sweep * 0.075 + cornerGlow * 0.025) * uOpacity;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(glassColor, alpha);
  }
`;

interface OpticalPanelProps {
  cue: CinematicCue;
  index: number;
  motion: StageMotionBus;
  position: [number, number, number];
  rotation: [number, number, number];
}

function OpticalPanel({ cue, index, motion, position, rotation }: OpticalPanelProps) {
  const paneRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
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
      uPhase: { value: index * 1.73 },
      uOpacity: { value: 0.6 },
      uPrimary: { value: new Color(cue.palette.primary) },
      uSecondary: { value: new Color(cue.palette.secondary) },
      uAccent: { value: new Color(cue.palette.accent) },
    }),
    [],
  );

  useFrame(({ clock }, delta) => {
    if (!paneRef.current || !materialRef.current) return;
    const elapsed = clock.getElapsedTime() + index * 1.7;
    const damping = phaseDamping(cue.transition.damping, motion.actorArrival, motion.handoff);
    const energy = cue.motionEnergy;
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    paneRef.current.position.x = MathUtils.damp(
      paneRef.current.position.x,
      position[0] * cue.composition.glassSpread + (index - 1) * motion.impact * 0.22,
      damping,
      delta,
    );
    paneRef.current.position.y = MathUtils.damp(
      paneRef.current.position.y,
      position[1]
        + Math.sin(elapsed * 0.48) * 0.14 * energy
        + motion.overshoot * (index === 1 ? 0.1 : -0.07),
      damping,
      delta,
    );
    paneRef.current.rotation.y = MathUtils.damp(
      paneRef.current.rotation.y,
      rotation[1]
        + Math.sin(elapsed * 0.32) * 0.07 * energy
        + (index - 1) * motion.impact * 0.1,
      damping,
      delta,
    );
    paneRef.current.rotation.z = MathUtils.damp(
      paneRef.current.rotation.z,
      rotation[2] + Math.sin(elapsed * 0.2) * 0.025 * energy,
      damping,
      delta,
    );
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
    <mesh ref={paneRef} position={position} rotation={rotation}>
      <planeGeometry args={[1.9, 1.2, 16, 10]} />
      <shaderMaterial
        ref={materialRef}
        blending={AdditiveBlending}
        depthWrite={false}
        fragmentShader={opticalPanelFragmentShader}
        side={DoubleSide}
        transparent
        uniforms={uniforms}
        vertexShader={opticalPanelVertexShader}
      />
    </mesh>
  );
}

function HeroMonolith({ cue, motion }: { cue: CinematicCue; motion: StageMotionBus }) {
  const groupRef = useRef<Group>(null);
  const outerMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const faceMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const glassMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const apertureMaterialRef = useRef<MeshBasicMaterial>(null);
  const prismMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const arcMaterialRef = useRef<MeshBasicMaterial>(null);
  const innerRingMaterialRef = useRef<MeshBasicMaterial>(null);
  const paletteTargets = useMemo(
    () => ({
      primary: new Color(cue.palette.primary),
      secondary: new Color(cue.palette.secondary),
      accent: new Color(cue.palette.accent),
      surface: new Color(cue.palette.surface),
    }),
    [],
  );

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const damping = phaseDamping(cue.transition.damping, motion.actorArrival, motion.handoff);
    const paletteAlpha = 1 - Math.exp(-damping * delta);
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
      cue.composition.heroYaw + Math.sin(clock.getElapsedTime() * 0.18) * 0.025 * cue.motionEnergy,
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
    outerMaterialRef.current?.color.lerp(paletteTargets.surface, paletteAlpha);
    faceMaterialRef.current?.color.lerp(paletteTargets.surface, paletteAlpha);
    glassMaterialRef.current?.color.lerp(paletteTargets.primary, paletteAlpha);
    apertureMaterialRef.current?.color.lerp(paletteTargets.primary, paletteAlpha);
    prismMaterialRef.current?.color.lerp(paletteTargets.accent, paletteAlpha);
    prismMaterialRef.current?.emissive.lerp(paletteTargets.accent, paletteAlpha);
    arcMaterialRef.current?.color.lerp(paletteTargets.accent, paletteAlpha);
    innerRingMaterialRef.current?.color.lerp(paletteTargets.secondary, paletteAlpha);
    if (glassMaterialRef.current) {
      glassMaterialRef.current.opacity = MathUtils.damp(
        glassMaterialRef.current.opacity,
        0.12
          + cue.motionEnergy * 0.035
          + motion.voiceImpulse * 0.025
          + motion.voiceLevel * 0.025,
        damping,
        delta,
      );
    }
    if (apertureMaterialRef.current) {
      apertureMaterialRef.current.opacity = MathUtils.damp(
        apertureMaterialRef.current.opacity,
        0.42
          + cue.motionEnergy * 0.12
          + motion.impact * 0.18
          + motion.voiceImpulse * 0.1
          + motion.voiceLevel * 0.12
          + motion.voicePeak * 0.04,
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
    }
  });

  return (
    <group
      ref={groupRef}
      position={[0.08, 0.18, 0.14]}
      scale={cue.composition.coreScale}
      visible={cue.composition.coreScale > 0.075}
    >
      <RoundedBox args={[1.62, 1.96, 0.24]} radius={0.24} smoothness={5} position={[0, 0, -0.13]}>
        <meshPhysicalMaterial
          ref={outerMaterialRef}
          clearcoat={1}
          color={cue.palette.surface}
          metalness={0.82}
          roughness={0.2}
        />
      </RoundedBox>
      <RoundedBox args={[1.42, 1.76, 0.28]} radius={0.2} smoothness={5} position={[0, 0, 0.02]}>
        <meshPhysicalMaterial
          ref={faceMaterialRef}
          clearcoat={1}
          color={cue.palette.surface}
          metalness={0.38}
          roughness={0.11}
        />
      </RoundedBox>
      <RoundedBox args={[1.18, 1.5, 0.055]} radius={0.17} smoothness={4} position={[0, 0, 0.2]}>
        <meshPhysicalMaterial
          ref={glassMaterialRef}
          clearcoat={1}
          color={cue.palette.primary}
          depthWrite={false}
          metalness={0.12}
          opacity={0.14}
          roughness={0.04}
          transparent
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.25]}>
        <torusGeometry args={[0.37, 0.012, 16, 96]} />
        <meshBasicMaterial
          ref={apertureMaterialRef}
          color={cue.palette.primary}
          opacity={0.54}
          transparent
        />
      </mesh>
      <mesh position={[0, 0, 0.27]} rotation={[0.25, 0.42, 0.16]}>
        <octahedronGeometry args={[0.15, 0]} />
        <meshPhysicalMaterial
          ref={prismMaterialRef}
          clearcoat={1}
          color={cue.palette.accent}
          emissive={cue.palette.accent}
          emissiveIntensity={0.16}
          metalness={0.72}
          roughness={0.13}
        />
      </mesh>
      <mesh position={[0, 0, 0.255]} rotation={[0, 0, 0.76]}>
        <torusGeometry args={[0.58, 0.006, 8, 96, Math.PI * 1.3]} />
        <meshBasicMaterial
          ref={arcMaterialRef}
          color={cue.palette.accent}
          opacity={0.28}
          transparent
        />
      </mesh>
      <mesh position={[0, 0, 0.26]}>
        <torusGeometry args={[0.25, 0.004, 8, 72]} />
        <meshBasicMaterial
          ref={innerRingMaterialRef}
          color={cue.palette.secondary}
          opacity={0.3}
          transparent
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
  varying float vSeed;
  varying float vSide;

  void main() {
    vGrowth = aGrowth;
    vSeed = aSeed;
    vSide = aSide;
    vec3 animated = position;
    float sway = sin(uTime * 0.31 + aGrowth * 8.0) * 0.018 * (0.35 + uEnergy);
    animated.x += sway * aGrowth;
    animated.z += cos(uTime * 0.23 + aGrowth * 6.0) * 0.012 * aGrowth * (0.4 + uEnergy);
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
  varying float vSeed;
  varying float vSide;

  void main() {
    float reveal = 1.0 - smoothstep(uReveal - 0.02, uReveal + 0.045, vGrowth);
    float travel = fract(uTime * (0.055 + uVoice * 0.025) + vSeed * 0.16);
    float pulseDistance = min(abs(vGrowth - travel), 1.0 - abs(vGrowth - travel));
    float pulse = exp(-pulseDistance * pulseDistance * 260.0);
    vec3 color = mix(uPrimary, uAccent, smoothstep(0.18, 0.94, vGrowth));
    color = mix(color, uSecondary, pulse * (0.68 + uVoice * 0.2));
    float branchTexture = 0.82 + sin(vSeed * 31.0) * 0.18;
    float edge = 1.0 - smoothstep(0.58, 1.0, abs(vSide));
    float alpha = reveal * (0.38 + pulse * 0.72) * branchTexture * edge * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

const organicPointVertexShader = /* glsl */ `
  attribute float aGrowth;
  attribute float aSeed;
  attribute float aTerminal;
  uniform float uReveal;
  uniform float uScale;
  uniform float uTime;
  uniform float uVoice;
  varying float vPulse;
  varying float vReveal;
  varying float vTerminal;

  void main() {
    vReveal = 1.0 - smoothstep(uReveal - 0.015, uReveal + 0.04, aGrowth);
    float travel = fract(uTime * (0.055 + uVoice * 0.025) + aSeed * 0.16);
    float pulseDistance = min(abs(aGrowth - travel), 1.0 - abs(aGrowth - travel));
    vPulse = exp(-pulseDistance * pulseDistance * 240.0);
    vTerminal = aTerminal;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float size = 4.0 + aTerminal * 3.0 + vPulse * 4.8 + uVoice * 3.2;
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
  varying float vTerminal;

  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    float halo = 1.0 - smoothstep(0.16, 0.5, distanceToCenter);
    float core = 1.0 - smoothstep(0.0, 0.14, distanceToCenter);
    vec3 color = mix(uPrimary, uAccent, 0.35 + vTerminal * 0.45);
    color = mix(color, uSecondary, vPulse * 0.82 + core * 0.18);
    float alpha = (halo * 0.62 + core * 0.72) * vReveal * uOpacity;
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
    uScale: { value: 0.03 },
    uSecondary: { value: new Color(cue.palette.secondary) },
    uTime: { value: 0 },
    uVoice: { value: 0 },
  }), []);
  const pointUniforms = useMemo(() => ({
    uAccent: { value: new Color(cue.palette.accent) },
    uOpacity: { value: 0.92 },
    uPrimary: { value: new Color(cue.palette.primary) },
    uReveal: { value: 0 },
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
    lineMaterialRef.current.uniforms.uOpacity.value = MathUtils.damp(
      lineMaterialRef.current.uniforms.uOpacity.value,
      (0.56 + motion.impact * 0.12 + voice * 0.16) * actorPresence,
      damping,
      delta,
    );
    pointsMaterialRef.current.uniforms.uPrimary.value.lerp(targetPrimary, paletteAlpha);
    pointsMaterialRef.current.uniforms.uSecondary.value.lerp(targetSecondary, paletteAlpha);
    pointsMaterialRef.current.uniforms.uAccent.value.lerp(targetAccent, paletteAlpha);
    pointsMaterialRef.current.uniforms.uTime.value = elapsed;
    pointsMaterialRef.current.uniforms.uVoice.value = voice;
    pointsMaterialRef.current.uniforms.uReveal.value = motion.actorArrival;
    const pointScaleUniform = pointsMaterialRef.current.uniforms.uScale;
    if (pointScaleUniform) pointScaleUniform.value = scale;
    pointsMaterialRef.current.uniforms.uOpacity.value = MathUtils.damp(
      pointsMaterialRef.current.uniforms.uOpacity.value,
      (0.86 + motion.impact * 0.08 + voice * 0.1) * actorPresence,
      damping,
      delta,
    );
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
