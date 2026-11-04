import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BackSide,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three';
import { VideoLayer } from './VideoLayer';
import type { StageState } from './stageScore';

interface LaunchStageProps {
  state: StageState;
}

export function LaunchStage({ state }: LaunchStageProps) {
  return (
    <section
      className="visual-engine-stage"
      data-stage-event={state.activeEvent}
      data-quality={state.quality}
    >
      <Canvas
        camera={{ position: [0, 1.65, 7.4], fov: 42 }}
        dpr={state.quality === 'high' ? [1, 1.8] : 1}
        gl={{ antialias: state.quality === 'high', alpha: false, powerPreference: 'high-performance' }}
      >
        <LaunchScene state={state} />
      </Canvas>

      <div className="visual-engine-copy">
        <p className="eyebrow">LaunchStage proof</p>
        <h2>{state.activeEvent === 'resolve' ? 'Resolved tableau.' : 'Managed video space.'}</h2>
        <p>
          Video planes, glass, organic growth, product core, and dynamic content share one scored 3D stage.
        </p>
      </div>

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

function LaunchScene({ state }: LaunchStageProps) {
  return (
    <>
      <color attach="background" args={['#03060d']} />
      <fog attach="fog" args={['#050914', 6.8, 17]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 4, 5]} intensity={2.3} color="#dff7ff" />
      <pointLight position={[-3.8, 2.2, 2.4]} intensity={4.5} color="#67e8f9" />
      <pointLight position={[3.4, -0.8, 2.4]} intensity={3.2} color="#f8d48a" />

      <CameraRig state={state} />
      <StageEnvironment />
      <VideoLayer
        src="/engine/launch-loop.webm"
        playbackRate={state.videoPlaybackRate}
        opacity={state.quality === 'high' ? 0.78 : 0.55}
        position={[-1.95, 0.75, -0.9]}
        rotation={[0.08, 0.44, -0.04]}
        scale={[1.15, 1.15, 1]}
      />
      <VideoLayer
        src="/engine/launch-loop.webm"
        playbackRate={Math.min(2, state.videoPlaybackRate * 1.35)}
        opacity={state.activeEvent === 'explain_value' ? 0.58 : 0.34}
        position={[2.55, 0.15, -1.55]}
        rotation={[0.04, -0.58, 0.05]}
        scale={[0.72, 1.18, 1]}
      />
      <GlassPane index={0} position={[-2.9, 0.5, -1.2]} rotation={[0.08, 0.42, -0.08]} />
      <GlassPane index={1} position={[2.7, 0.85, -1.7]} rotation={[0.02, -0.42, 0.08]} />
      <GlassPane index={2} position={[0.45, -1.15, -0.65]} rotation={[-0.12, -0.14, 0.02]} />
      <MotionRibbon state={state} />
      <ProductCore state={state} />
      <OrganicGrowth state={state} />
      <DynamicChart3D visible={state.dynamicChartVisible} />

      {state.effectsEnabled ? (
        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.22} mipmapBlur />
          <DepthOfField focusDistance={0.03} focalLength={0.035} bokehScale={2.4} />
          <Vignette darkness={0.62} eskil={false} offset={0.18} />
        </EffectComposer>
      ) : null}
    </>
  );
}

function CameraRig({ state }: LaunchStageProps) {
  const { camera } = useThree();
  const target = useMemo(() => new Vector3(0, 0.05, 0), []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const eventOffset = {
      open_brand: new Vector3(0, 1.55, 7.5),
      reveal_product: new Vector3(-0.6, 1.35, 6.1),
      explain_value: new Vector3(0.35, 1.42, 6.7),
      grow_system: new Vector3(0.9, 1.2, 6.2),
      summon_dynamic_chart: new Vector3(0.45, 1.28, 5.8),
      hold: new Vector3(0.15, 1.35, 6.8),
      resolve: new Vector3(0, 1.45, 6.4),
    }[state.activeEvent];
    eventOffset.x += Math.sin(elapsed * 0.22) * 0.1;
    eventOffset.y += Math.sin(elapsed * 0.16) * 0.05;
    camera.position.lerp(eventOffset, 0.035);
    camera.lookAt(target);
  });

  return null;
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

interface GlassPaneProps {
  index: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

function GlassPane({ index, position, rotation }: GlassPaneProps) {
  const paneRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!paneRef.current) return;
    const elapsed = clock.getElapsedTime() + index * 1.7;
    paneRef.current.position.y = position[1] + Math.sin(elapsed * 0.48) * 0.16;
    paneRef.current.rotation.y = rotation[1] + Math.sin(elapsed * 0.32) * 0.08;
  });

  return (
    <mesh ref={paneRef} position={position} rotation={rotation}>
      <boxGeometry args={[1.85, 1.18, 0.035]} />
      <MeshTransmissionMaterial
        anisotropicBlur={0.24}
        chromaticAberration={0.06}
        color="#d9f7ff"
        distortion={0.18}
        distortionScale={0.22}
        ior={1.3}
        opacity={0.42}
        roughness={0.18}
        thickness={0.18}
        transmission={0.72}
        transparent
      />
    </mesh>
  );
}

function MotionRibbon({ state }: LaunchStageProps) {
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

  useFrame(({ clock }) => {
    if (!ribbonRef.current) return;
    const elapsed = clock.getElapsedTime();
    const eventLift = state.activeEvent === 'reveal_product' || state.activeEvent === 'resolve' ? 0.22 : 0;
    ribbonRef.current.position.y = Math.sin(elapsed * 0.55) * 0.08 + eventLift;
    ribbonRef.current.rotation.z = Math.sin(elapsed * 0.24) * 0.05;
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

function ProductCore({ state }: LaunchStageProps) {
  const groupRef = useRef<Group>(null);
  const coreColor = useMemo(() => new Color('#0b1220'), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const elapsed = clock.getElapsedTime();
    const revealScale = state.activeEvent === 'open_brand' ? 0.74 : 1;
    groupRef.current.rotation.y = elapsed * 0.24;
    groupRef.current.scale.lerp(new Vector3(revealScale, revealScale, revealScale), 0.04);
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

function OrganicGrowth({ state }: LaunchStageProps) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const visible = state.activeEvent === 'grow_system'
      || state.activeEvent === 'summon_dynamic_chart'
      || state.activeEvent === 'resolve';
    const targetScale = visible ? 1 : 0.04;
    groupRef.current.scale.lerp(new Vector3(targetScale, targetScale, targetScale), 0.045);
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

function DynamicChart3D({ visible }: { visible: boolean }) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const scale = visible ? 1 : 0.02;
    groupRef.current.scale.lerp(new Vector3(scale, scale, scale), 0.06);
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
