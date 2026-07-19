import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import { AdaptiveDpr, Edges, PerformanceMonitor } from '@react-three/drei';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  BackSide,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  PointLight,
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
        <div className="stage-chart-bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
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
      <StageEnvironment />
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
      <GlassPane cue={cue} index={0} position={[-2.9, 0.5, -1.2]} rotation={[0.08, 0.42, -0.08]} />
      <GlassPane cue={cue} index={1} position={[2.7, 0.85, -1.7]} rotation={[0.02, -0.42, 0.08]} />
      <GlassPane cue={cue} index={2} position={[0.45, -1.15, -0.65]} rotation={[-0.12, -0.14, 0.02]} />
      <MotionRibbon cue={cue} />
      <ProductCore cue={cue} />
      <OrganicGrowth cue={cue} />
      <DynamicChart3D cue={cue} />

      {effectsEnabled ? (
        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.22} mipmapBlur />
          <DepthOfField focusDistance={0.03} focalLength={0.035} bokehScale={2.4} />
          <Vignette darkness={0.62} eskil={false} offset={0.18} />
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

  useFrame((_, delta) => {
    const damping = cue.transition.damping;
    if (keyRef.current) keyRef.current.intensity = MathUtils.damp(keyRef.current.intensity, cue.lighting.key, damping, delta);
    if (rimRef.current) rimRef.current.intensity = MathUtils.damp(rimRef.current.intensity, cue.lighting.rim, damping, delta);
    if (accentRef.current) accentRef.current.intensity = MathUtils.damp(accentRef.current.intensity, cue.lighting.accent, damping, delta);
  });

  return (
    <>
      <directionalLight ref={keyRef} position={[4, 4, 5]} intensity={cue.lighting.key} color="#dff7ff" />
      <pointLight ref={rimRef} position={[-3.8, 2.2, 2.4]} intensity={cue.lighting.rim} color="#67e8f9" />
      <pointLight ref={accentRef} position={[3.4, -0.8, 2.4]} intensity={cue.lighting.accent} color="#f8d48a" />
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

function StageEnvironment() {
  const particles = useMemo(() => {
    const positions: number[] = [];
    for (let index = 0; index < 120; index += 1) {
      const angle = index * 1.618;
      const radius = 2.2 + (index % 17) * 0.18;
      positions.push(Math.cos(angle) * radius, ((index % 31) - 15) * 0.08, Math.sin(angle) * radius - 2.8);
    }
    return new Float32Array(positions);
  }, []);

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
          color="#8be9ff"
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
    displaced.z += wave * (0.42 + uEnergy * 0.22);
    displaced.y += sin(position.x * 0.46 - uTime * 0.2) * 0.13 * uEnergy;

    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWave = wave;
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const silkFragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vWave;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vec3 midnight = vec3(0.008, 0.018, 0.045);
    vec3 cyan = vec3(0.12, 0.72, 0.82);
    vec3 gold = vec3(0.96, 0.63, 0.22);
    vec3 pearl = vec3(0.76, 0.9, 0.96);
    float ridge = smoothstep(0.12, 0.86, abs(vWave));
    float sheen = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
    float colorShift = smoothstep(0.12, 0.9, vUv.x + vWave * 0.14);
    vec3 iridescence = mix(cyan, gold, colorShift);
    vec3 color = mix(midnight, iridescence, ridge * 0.62 + sheen * 0.5);
    color = mix(color, pearl, sheen * ridge * 0.42);
    float edgeFade = smoothstep(0.0, 0.18, vUv.x)
      * smoothstep(1.0, 0.82, vUv.x)
      * smoothstep(0.0, 0.16, vUv.y)
      * smoothstep(1.0, 0.84, vUv.y);
    float alpha = (0.2 + ridge * 0.34 + sheen * 0.34) * edgeFade * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

function SilkField({ cue, foreground = false }: { cue: CinematicCue; foreground?: boolean }) {
  const materialRef = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEnergy: { value: cue.motionEnergy },
      uOpacity: { value: foreground ? 0.9 : 1.05 },
    }),
    [],
  );

  useFrame(({ clock }, delta) => {
    if (!materialRef.current) return;
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
  });

  return (
    <mesh
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

interface GlassPaneProps {
  cue: CinematicCue;
  index: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

function GlassPane({ cue, index, position, rotation }: GlassPaneProps) {
  const paneRef = useRef<Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (!paneRef.current) return;
    const elapsed = clock.getElapsedTime() + index * 1.7;
    const damping = cue.transition.damping;
    const energy = cue.motionEnergy;
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
  });

  return (
    <mesh ref={paneRef} position={position} rotation={rotation}>
      <boxGeometry args={[1.85, 1.18, 0.035]} />
      <meshPhysicalMaterial
        clearcoat={1}
        color="#a9d8e5"
        depthWrite={false}
        metalness={0.14}
        opacity={0.055}
        roughness={0.16}
        side={DoubleSide}
        transparent
      />
      <Edges
        color="#9fe8f6"
        lineWidth={0.65}
        opacity={0.42}
        scale={1.01}
        threshold={20}
        transparent
      />
    </mesh>
  );
}

function MotionRibbon({ cue }: { cue: CinematicCue }) {
  const ribbonRef = useRef<Group>(null);
  const curve = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(-3.8, -0.25, -0.6),
        new Vector3(-1.4, 0.35, -1.1),
        new Vector3(0.9, 0.18, -0.8),
        new Vector3(3.8, 0.52, -1.4),
      ]),
    [],
  );

  useFrame(({ clock }, delta) => {
    if (!ribbonRef.current) return;
    const elapsed = clock.getElapsedTime();
    const energy = cue.motionEnergy;
    ribbonRef.current.position.y = MathUtils.damp(
      ribbonRef.current.position.y,
      Math.sin(elapsed * 0.55) * 0.07 * energy + cue.composition.ribbonLift,
      cue.transition.damping,
      delta,
    );
    ribbonRef.current.rotation.z = MathUtils.damp(
      ribbonRef.current.rotation.z,
      Math.sin(elapsed * 0.24) * 0.045 * energy,
      cue.transition.damping,
      delta,
    );
  });

  return (
    <group ref={ribbonRef}>
      <mesh>
        <tubeGeometry args={[curve, 96, 0.12, 12, false]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          color="#67e8f9"
          opacity={0.34}
          transparent
        />
      </mesh>
      <mesh position={[0, -0.12, 0.08]}>
        <tubeGeometry args={[curve, 96, 0.08, 12, false]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          color="#ff8ecb"
          opacity={0.2}
          transparent
        />
      </mesh>
    </group>
  );
}

function ProductCore({ cue }: { cue: CinematicCue }) {
  const groupRef = useRef<Group>(null);
  const coreColor = useMemo(() => new Color('#0b1220'), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.24 * cue.motionEnergy;
    const scale = MathUtils.damp(
      groupRef.current.scale.x,
      cue.composition.coreScale,
      cue.transition.damping,
      delta,
    );
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} position={[0.05, 0.15, 0.12]}>
      <mesh>
        <sphereGeometry args={[0.64, 64, 64]} />
        <meshPhysicalMaterial
          color={coreColor}
          clearcoat={0.95}
          metalness={0.36}
          roughness={0.2}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.8, 0, 0]}>
        <torusGeometry args={[1.18, 0.006, 12, 180]} />
        <meshBasicMaterial color="#f8d48a" opacity={0.52} transparent />
      </mesh>
      <mesh rotation={[Math.PI / 2.25, 0.15, 0.35]}>
        <torusGeometry args={[1.44, 0.004, 12, 180]} />
        <meshBasicMaterial color="#67e8f9" opacity={0.36} transparent />
      </mesh>
    </group>
  );
}

function OrganicGrowth({ cue }: { cue: CinematicCue }) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const scale = MathUtils.damp(
      groupRef.current.scale.x,
      cue.composition.growthScale,
      cue.transition.damping,
      delta,
    );
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} position={[2.0, -1.42, 0.25]}>
      <Branch height={1.8} rotation={[0, 0, 0]} position={[0, 0.9, 0]} />
      <Branch height={1.1} rotation={[0, 0, -0.78]} position={[0, 1.25, 0]} />
      <Branch height={1.05} rotation={[0, 0, 0.7]} position={[0, 1.45, 0]} />
      <Branch height={0.9} rotation={[0, 0, -0.18]} position={[0, 1.72, 0]} />
      {[
        [-0.72, 1.95, 0],
        [0.82, 2.06, 0],
        [0.3, 2.32, 0],
        [-0.2, 1.65, 0],
      ].map((position) => (
        <mesh key={position.join(':')} position={position as [number, number, number]}>
          <sphereGeometry args={[0.07, 20, 20]} />
          <meshBasicMaterial color="#8ef2b5" opacity={0.85} transparent />
        </mesh>
      ))}
    </group>
  );
}

interface BranchProps {
  height: number;
  rotation: [number, number, number];
  position: [number, number, number];
}

function Branch({ height, rotation, position }: BranchProps) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[0.015, 0.026, height, 12]} />
      <meshBasicMaterial color="#8ef2b5" opacity={0.72} transparent />
    </mesh>
  );
}

function DynamicChart3D({ cue }: { cue: CinematicCue }) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const scale = MathUtils.damp(
      groupRef.current.scale.x,
      cue.composition.chartScale,
      cue.transition.damping,
      delta,
    );
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} position={[2.55, -1.1, 1.05]} rotation={[0.02, -0.34, 0]}>
      <mesh position={[0, 0.4, -0.04]}>
        <boxGeometry args={[1.22, 0.82, 0.035]} />
        <meshBasicMaterial color="#07111f" opacity={0.78} transparent />
      </mesh>
      {[0.28, 0.48, 0.66, 0.86].map((height, index) => (
        <mesh key={height} position={[-0.42 + index * 0.28, -0.02 + height / 2, 0]}>
          <boxGeometry args={[0.16, height, 0.09]} />
          <meshBasicMaterial
            color={index > 2 ? '#f8d48a' : '#67e8f9'}
            opacity={0.86}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}
