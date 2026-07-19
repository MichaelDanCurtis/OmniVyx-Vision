import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import { AdaptiveDpr, PerformanceMonitor, RoundedBox } from '@react-three/drei';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  AdditiveBlending,
  BackSide,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PointLight,
  PointsMaterial,
  ShaderMaterial,
  Vector3,
} from 'three';
import { getCinematicCue, type CinematicCue } from './cinematicScore';
import { VideoLayer } from './VideoLayer';
import type { StageEventId, StageState } from './stageScore';

interface LaunchStageProps {
  presenting?: boolean;
  state: StageState;
  onTogglePresenting?: () => void;
}

export function LaunchStage({ onTogglePresenting, presenting = false, state }: LaunchStageProps) {
  const cue = getCinematicCue(state.activeEvent);
  const [performanceProfile, setPerformanceProfile] = useState({
    factor: state.quality === 'high' ? 0.72 : 0,
    fps: 0,
  });
  const adaptiveDpr = state.quality === 'high'
    ? roundToStep(0.92 + performanceProfile.factor * 0.78, 0.05)
    : 1;
  const effectsEnabled = state.effectsEnabled;

  useEffect(() => {
    setPerformanceProfile({
      factor: state.quality === 'high' ? 0.72 : 0,
      fps: 0,
    });
  }, [state.quality]);

  return (
    <section
      className="visual-engine-stage"
      data-stage-event={state.activeEvent}
      data-quality={state.quality}
      data-render-scale={adaptiveDpr.toFixed(2)}
      data-fps={performanceProfile.fps}
      style={{
        '--stage-primary': cue.palette.primary,
        '--stage-accent': cue.palette.accent,
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
          <LaunchScene cue={cue} effectsEnabled={effectsEnabled} state={state} />
        </PerformanceMonitor>
      </Canvas>

      <div className="visual-engine-copy" key={state.activeEvent}>
        <p className="eyebrow">{cue.copy.eyebrow}</p>
        <h2>{cue.copy.headline}</h2>
        <p>{cue.copy.body}</p>
      </div>

      <div className="stage-performance" aria-label="Adaptive render performance">
        <span>AUTO</span>
        <strong>{performanceProfile.fps > 0 ? `${performanceProfile.fps} FPS` : 'CALIBRATING'}</strong>
        <i>{adaptiveDpr.toFixed(2)}x</i>
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

interface LaunchSceneProps {
  cue: CinematicCue;
  effectsEnabled: boolean;
  state: StageState;
}

function LaunchScene({ cue, effectsEnabled, state }: LaunchSceneProps) {
  return (
    <>
      <color attach="background" args={['#03060d']} />
      <fog attach="fog" args={['#050914', 6.8, 17]} />
      <ambientLight intensity={0.45} />
      <CinematicLighting cue={cue} />

      <CameraRig cue={cue} />
      <StageEnvironment cue={cue} />
      <SilkField cue={cue} />
      <SilkField cue={cue} foreground />
      {cue.composition.primaryVideoOpacity > 0 ? (
        <VideoLayer
          src="/engine/launch-loop.webm"
          playbackRate={state.videoPlaybackRate}
          opacity={state.quality === 'high'
            ? cue.composition.primaryVideoOpacity
            : Math.min(0.5, cue.composition.primaryVideoOpacity)}
          transitionDamping={cue.transition.damping}
          position={[-1.95, 0.75, -0.9]}
          rotation={[0.08, 0.44, -0.04]}
          scale={[1.15, 1.15, 1]}
        />
      ) : null}
      {cue.composition.secondaryVideoOpacity > 0 ? (
        <VideoLayer
          src="/engine/launch-loop.webm"
          playbackRate={Math.min(2, state.videoPlaybackRate * 1.35)}
          opacity={cue.composition.secondaryVideoOpacity}
          transitionDamping={cue.transition.damping}
          position={[2.55, 0.15, -1.55]}
          rotation={[0.04, -0.58, 0.05]}
          scale={[0.72, 1.18, 1]}
        />
      ) : null}
      <OpticalPanel cue={cue} index={0} position={[-2.9, 0.5, -1.2]} rotation={[0.08, 0.42, -0.08]} />
      <OpticalPanel cue={cue} index={1} position={[2.7, 0.85, -1.7]} rotation={[0.02, -0.42, 0.08]} />
      <OpticalPanel cue={cue} index={2} position={[0.45, -1.15, -0.65]} rotation={[-0.12, -0.14, 0.02]} />
      <HeroMonolith cue={cue} />
      <NetworkBloom cue={cue} />

      {effectsEnabled ? (
        <EffectComposer>
          <Bloom intensity={0.52} luminanceThreshold={0.28} mipmapBlur />
          <DepthOfField focusDistance={0.03} focalLength={0.026} bokehScale={1.15} />
          <Vignette darkness={0.48} eskil={false} offset={0.2} />
        </EffectComposer>
      ) : null}
    </>
  );
}

function TransitionPerformanceRegressor({ eventId }: { eventId: StageEventId }) {
  const regress = useThree((threeState) => threeState.performance.regress);

  useEffect(() => {
    regress();
  }, [eventId, regress]);

  return null;
}

function CinematicLighting({ cue }: { cue: CinematicCue }) {
  const keyRef = useRef<DirectionalLight>(null);
  const rimRef = useRef<PointLight>(null);
  const accentRef = useRef<PointLight>(null);
  const keyTarget = useMemo(() => new Color(cue.palette.secondary), []);
  const rimTarget = useMemo(() => new Color(cue.palette.primary), []);
  const accentTarget = useMemo(() => new Color(cue.palette.accent), []);

  useFrame((_, delta) => {
    const damping = cue.transition.damping;
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    keyTarget.set(cue.palette.secondary);
    rimTarget.set(cue.palette.primary);
    accentTarget.set(cue.palette.accent);
    if (keyRef.current) {
      keyRef.current.intensity = MathUtils.damp(keyRef.current.intensity, cue.lighting.key, damping, delta);
      keyRef.current.color.lerp(keyTarget, paletteAlpha);
    }
    if (rimRef.current) {
      rimRef.current.intensity = MathUtils.damp(rimRef.current.intensity, cue.lighting.rim, damping, delta);
      rimRef.current.color.lerp(rimTarget, paletteAlpha);
    }
    if (accentRef.current) {
      accentRef.current.intensity = MathUtils.damp(accentRef.current.intensity, cue.lighting.accent, damping, delta);
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

function CameraRig({ cue }: { cue: CinematicCue }) {
  const camera = useThree((threeState) => threeState.camera) as PerspectiveCamera;
  const target = useMemo(() => new Vector3(0, 0.05, 0), []);

  useFrame(({ clock }, delta) => {
    const elapsed = clock.getElapsedTime();
    const damping = cue.transition.damping;
    const drift = cue.motionEnergy;
    camera.position.x = MathUtils.damp(camera.position.x, cue.camera.position[0] + Math.sin(elapsed * 0.22) * 0.1 * drift, damping, delta);
    camera.position.y = MathUtils.damp(camera.position.y, cue.camera.position[1] + Math.sin(elapsed * 0.16) * 0.05 * drift, damping, delta);
    camera.position.z = MathUtils.damp(camera.position.z, cue.camera.position[2], damping, delta);
    target.x = MathUtils.damp(target.x, cue.camera.target[0], damping, delta);
    target.y = MathUtils.damp(target.y, cue.camera.target[1], damping, delta);
    target.z = MathUtils.damp(target.z, cue.camera.target[2], damping, delta);
    const nextFov = MathUtils.damp(camera.fov, cue.camera.fov, damping, delta);
    if (Math.abs(nextFov - camera.fov) > 0.0001) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(target);
  });

  return null;
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function StageEnvironment({ cue }: { cue: CinematicCue }) {
  const pointsMaterialRef = useRef<PointsMaterial>(null);
  const targetColor = useMemo(() => new Color(cue.palette.primary), []);
  const particles = useMemo(() => {
    const positions: number[] = [];
    for (let index = 0; index < 120; index += 1) {
      const angle = index * 1.618;
      const radius = 2.2 + (index % 17) * 0.18;
      positions.push(Math.cos(angle) * radius, ((index % 31) - 15) * 0.08, Math.sin(angle) * radius - 2.8);
    }
    return new Float32Array(positions);
  }, []);

  useFrame((_, delta) => {
    if (!pointsMaterialRef.current) return;
    targetColor.set(cue.palette.primary);
    pointsMaterialRef.current.color.lerp(
      targetColor,
      1 - Math.exp(-cue.transition.damping * delta),
    );
  });

  return (
    <>
      <mesh scale={[30, 30, 30]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#050914" side={BackSide} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={pointsMaterialRef}
          color={cue.palette.primary}
          opacity={0.34}
          size={0.018}
          sizeAttenuation
          transparent
        />
      </points>
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
      * smoothstep(1.0, 0.82, vUv.x)
      * smoothstep(0.0, 0.16, vUv.y)
      * smoothstep(1.0, 0.84, vUv.y);
    float alpha = (0.2 + ridge * 0.34 + sheen * 0.34) * edgeFade * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

function SilkField({ cue, foreground = false }: { cue: CinematicCue; foreground?: boolean }) {
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
    const paletteAlpha = 1 - Math.exp(-cue.transition.damping * delta);
    paletteTargets.primary.set(cue.palette.primary);
    paletteTargets.secondary.set(cue.palette.secondary);
    paletteTargets.accent.set(cue.palette.accent);
    paletteTargets.surface.set(cue.palette.surface);
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uEnergy.value = MathUtils.damp(
      materialRef.current.uniforms.uEnergy.value,
      cue.motionEnergy,
      cue.transition.damping,
      delta,
    );
    materialRef.current.uniforms.uOpacity.value = MathUtils.damp(
      materialRef.current.uniforms.uOpacity.value,
      cue.composition.chartScale > 0.5
        ? (foreground ? 0.38 : 0.72)
        : (foreground ? 0.88 : 1.08),
      cue.transition.damping,
      delta,
    );
    materialRef.current.uniforms.uPrimary.value.lerp(paletteTargets.primary, paletteAlpha);
    materialRef.current.uniforms.uSecondary.value.lerp(paletteTargets.secondary, paletteAlpha);
    materialRef.current.uniforms.uAccent.value.lerp(paletteTargets.accent, paletteAlpha);
    materialRef.current.uniforms.uSurface.value.lerp(paletteTargets.surface, paletteAlpha);
    meshRef.current.position.y = MathUtils.damp(
      meshRef.current.position.y,
      (foreground ? 0.72 : 0.05) + cue.composition.ribbonLift * (foreground ? 0.72 : 0.18),
      cue.transition.damping,
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
  position: [number, number, number];
  rotation: [number, number, number];
}

function OpticalPanel({ cue, index, position, rotation }: OpticalPanelProps) {
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
    const damping = cue.transition.damping;
    const energy = cue.motionEnergy;
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    paneRef.current.position.x = MathUtils.damp(
      paneRef.current.position.x,
      position[0] * cue.composition.glassSpread,
      damping,
      delta,
    );
    paneRef.current.position.y = MathUtils.damp(
      paneRef.current.position.y,
      position[1] + Math.sin(elapsed * 0.48) * 0.14 * energy,
      damping,
      delta,
    );
    paneRef.current.rotation.y = MathUtils.damp(
      paneRef.current.rotation.y,
      rotation[1] + Math.sin(elapsed * 0.32) * 0.07 * energy,
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
      0.52 + energy * 0.12,
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

function HeroMonolith({ cue }: { cue: CinematicCue }) {
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
    const damping = cue.transition.damping;
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    groupRef.current.position.x = MathUtils.damp(
      groupRef.current.position.x,
      cue.composition.heroX,
      damping,
      delta,
    );
    groupRef.current.position.y = MathUtils.damp(
      groupRef.current.position.y,
      cue.composition.heroY,
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
      -0.04 + (cue.composition.coreScale - 0.9) * 0.08,
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
      cue.composition.coreScale,
      damping,
      delta,
    );
    groupRef.current.scale.setScalar(scale);

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
        0.12 + cue.motionEnergy * 0.035,
        damping,
        delta,
      );
    }
    if (apertureMaterialRef.current) {
      apertureMaterialRef.current.opacity = MathUtils.damp(
        apertureMaterialRef.current.opacity,
        0.42 + cue.motionEnergy * 0.12,
        damping,
        delta,
      );
    }
  });

  return (
    <group ref={groupRef} position={[0.08, 0.18, 0.14]}>
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

const networkNodePositions = [
  [-0.92, 0.16, 0.02],
  [-0.62, 0.72, 0.05],
  [-0.34, 0.32, 0.08],
  [-0.08, 1.02, 0.02],
  [0.18, 0.55, 0.1],
  [0.52, 1.18, 0.04],
  [0.74, 0.42, 0.12],
  [0.98, 0.88, 0.02],
  [0.44, -0.02, 0.08],
  [-0.22, -0.18, 0.03],
] as const;

const networkEdges = [
  [0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [2, 9], [3, 4], [3, 5],
  [4, 5], [4, 6], [4, 8], [5, 7], [6, 7], [6, 8], [8, 9],
] as const;

function NetworkBloom({ cue }: { cue: CinematicCue }) {
  const groupRef = useRef<Group>(null);
  const lineMaterialRef = useRef<LineBasicMaterial>(null);
  const pointsMaterialRef = useRef<PointsMaterial>(null);
  const targetPrimary = useMemo(() => new Color(cue.palette.primary), []);
  const targetAccent = useMemo(() => new Color(cue.palette.accent), []);
  const nodePositions = useMemo(
    () => new Float32Array(networkNodePositions.flatMap((position) => position)),
    [],
  );
  const edgePositions = useMemo(
    () => new Float32Array(networkEdges.flatMap(([start, end]) => [
      ...networkNodePositions[start],
      ...networkNodePositions[end],
    ])),
    [],
  );

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const damping = cue.transition.damping;
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    const scale = MathUtils.damp(
      groupRef.current.scale.x,
      cue.composition.growthScale,
      damping,
      delta,
    );
    groupRef.current.scale.setScalar(scale);
    groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.16) * 0.12 * cue.motionEnergy;
    targetPrimary.set(cue.palette.primary);
    targetAccent.set(cue.palette.accent);
    lineMaterialRef.current?.color.lerp(targetPrimary, paletteAlpha);
    pointsMaterialRef.current?.color.lerp(targetAccent, paletteAlpha);
  });

  return (
    <group ref={groupRef} position={[2.0, -1.1, 0.18]} scale={0.03}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          ref={lineMaterialRef}
          blending={AdditiveBlending}
          color={cue.palette.primary}
          opacity={0.58}
          transparent
        />
      </lineSegments>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={pointsMaterialRef}
          blending={AdditiveBlending}
          color={cue.palette.accent}
          opacity={0.9}
          size={0.085}
          sizeAttenuation
          transparent
        />
      </points>
    </group>
  );
}
