import { useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Color,
  MathUtils,
  Mesh,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three';
import type { CinematicCue } from './cinematicScore';

interface MediaMotionState {
  impact: number;
  mediaArrival: number;
  overshoot: number;
  voiceImpulse: number;
  voiceLevel: number;
  voicePeak: number;
}

interface CinematicMediaPlateProps {
  cue: CinematicCue;
  enabled: boolean;
  motion: MediaMotionState;
  playbackRate: number;
}

const mediaPlateVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uEnergy;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 displaced = position;
    float envelope = sin(uv.x * 3.14159) * sin(uv.y * 3.14159);
    float broadFold = sin(uv.x * 7.2 + uTime * 0.12) * 0.72;
    float crossFold = cos(uv.y * 8.4 - uTime * 0.09) * 0.28;
    displaced.z += (broadFold + crossFold) * 0.11 * uEnergy * envelope;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const mediaPlateFragmentShader = /* glsl */ `
  uniform sampler2D uImage;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uOpacity;
  uniform float uTintStrength;
  uniform vec3 uPrimary;
  uniform vec3 uAccent;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 drift = vec2(
      sin(uv.y * 9.0 + uTime * 0.11),
      cos(uv.x * 7.0 - uTime * 0.08)
    );
    uv += drift * 0.0024 * uEnergy;
    uv = clamp(uv, vec2(0.002), vec2(0.998));

    vec4 source = texture2D(uImage, uv);
    float luminance = dot(source.rgb, vec3(0.2126, 0.7152, 0.0722));
    vec3 tint = mix(vec3(1.0), uPrimary, uTintStrength * 0.24);
    vec3 color = source.rgb * tint;
    color += uAccent * smoothstep(0.48, 0.96, luminance) * uTintStrength * 0.075;

    float copyShield = mix(0.7, 1.0, smoothstep(0.08, 0.68, vUv.x));
    float edgeFade = smoothstep(0.0, 0.045, vUv.x)
      * (1.0 - smoothstep(0.955, 1.0, vUv.x))
      * smoothstep(0.0, 0.045, vUv.y)
      * (1.0 - smoothstep(0.955, 1.0, vUv.y));
    gl_FragColor = vec4(color * copyShield, uOpacity * edgeFade);
    #include <colorspace_fragment>
  }
`;

export function CinematicMediaPlate({
  cue,
  enabled,
  motion,
  playbackRate,
}: CinematicMediaPlateProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const playbackRateRef = useRef(playbackRate);
  const texture = useTexture(cue.media.asset);
  const gl = useThree((threeState) => threeState.gl);
  const paletteTargets = useMemo(
    () => ({
      primary: new Color(cue.palette.primary),
      accent: new Color(cue.palette.accent),
    }),
    [],
  );
  const uniforms = useMemo(() => ({
    uImage: { value: texture },
    uTime: { value: 0 },
    uEnergy: { value: cue.media.drift },
    uOpacity: { value: enabled ? cue.media.opacity : 0 },
    uTintStrength: { value: cue.media.tintStrength },
    uPrimary: { value: new Color(cue.palette.primary) },
    uAccent: { value: new Color(cue.palette.accent) },
  }), [texture]);

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
  }, [gl, texture]);

  useFrame((_, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const damping = motion.mediaArrival <= 0
      ? 0
      : cue.transition.damping * (0.32 + motion.mediaArrival * 1.08);
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    const targetOpacity = enabled ? cue.media.opacity : 0;
    paletteTargets.primary.set(cue.palette.primary);
    paletteTargets.accent.set(cue.palette.accent);

    playbackRateRef.current = MathUtils.damp(
      playbackRateRef.current,
      playbackRate,
      damping,
      delta,
    );
    materialRef.current.uniforms.uTime.value += delta * playbackRateRef.current;
    materialRef.current.uniforms.uEnergy.value = MathUtils.damp(
      materialRef.current.uniforms.uEnergy.value,
      cue.media.drift
        + motion.impact * 0.36
        + motion.voiceImpulse * 0.22
        + motion.voiceLevel * 0.3
        + motion.voicePeak * 0.08,
      damping,
      delta,
    );
    materialRef.current.uniforms.uOpacity.value = MathUtils.damp(
      materialRef.current.uniforms.uOpacity.value,
      targetOpacity,
      damping,
      delta,
    );
    materialRef.current.uniforms.uTintStrength.value = MathUtils.damp(
      materialRef.current.uniforms.uTintStrength.value,
      cue.media.tintStrength,
      damping,
      delta,
    );
    materialRef.current.uniforms.uPrimary.value.lerp(paletteTargets.primary, paletteAlpha);
    materialRef.current.uniforms.uAccent.value.lerp(paletteTargets.accent, paletteAlpha);

    meshRef.current.visible = enabled || materialRef.current.uniforms.uOpacity.value > 0.004;
    meshRef.current.position.x = MathUtils.damp(
      meshRef.current.position.x,
      cue.media.offset[0] + motion.overshoot * 0.08,
      damping,
      delta,
    );
    meshRef.current.position.y = MathUtils.damp(
      meshRef.current.position.y,
      cue.media.offset[1]
        + 0.12
        + motion.voiceImpulse * 0.015
        + motion.voiceLevel * 0.022,
      damping,
      delta,
    );
    meshRef.current.position.z = MathUtils.damp(
      meshRef.current.position.z,
      cue.media.depth,
      damping,
      delta,
    );
    meshRef.current.rotation.y = MathUtils.damp(
      meshRef.current.rotation.y,
      -0.018 + motion.overshoot * 0.012,
      damping,
      delta,
    );
    const scale = MathUtils.damp(
      meshRef.current.scale.x,
      cue.media.scale * (1 + motion.impact * 0.025),
      damping,
      delta,
    );
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh
      ref={meshRef}
      position={[cue.media.offset[0], cue.media.offset[1] + 0.12, cue.media.depth]}
      renderOrder={-20}
      scale={cue.media.scale}
    >
      <planeGeometry args={[16, 9, 48, 27]} />
      <shaderMaterial
        ref={materialRef}
        depthWrite={false}
        fragmentShader={mediaPlateFragmentShader}
        transparent
        uniforms={uniforms}
        vertexShader={mediaPlateVertexShader}
      />
    </mesh>
  );
}

useTexture.preload('/engine/optical-master-v1.jpg');
