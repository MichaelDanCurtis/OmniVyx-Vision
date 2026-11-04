import { useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Color,
  MathUtils,
  Mesh,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
} from 'three';
import type { CinematicCue } from './cinematicScore';
import { sceneSignatureIndex, sceneSignatureShader } from './sceneSignature';

interface MediaMotionState {
  impact: number;
  mediaArrival: number;
  overshoot: number;
  voiceCadence: number;
  voiceEmphasis: number;
  voiceImpulse: number;
  voiceLevel: number;
  voicePeak: number;
}

interface CinematicMediaPlateProps {
  cue: CinematicCue;
  enabled: boolean;
  motion: MediaMotionState;
  playbackRate: number;
  reducedMotion: boolean;
}

const mediaPlateVertexShader = /* glsl */ `
  uniform float uEnergy;
  uniform float uFlow;
  uniform float uImpact;
  uniform float uStructure;
  uniform float uTime;
  varying float vFold;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 displaced = position;
    float envelope = sin(uv.x * 3.14159) * sin(uv.y * 3.14159);
    float broadFold = sin(uv.x * 7.2 + uTime * 0.12) * 0.72;
    float crossFold = cos(uv.y * 8.4 - uTime * 0.09) * 0.28;
    float membrane = sin((uv.x + uv.y * 0.38) * 12.0 + uTime * 0.16) * 0.54;
    float flowWeight = uFlow * (1.0 - uStructure * 0.48);
    float fold = broadFold + crossFold + membrane * flowWeight;
    vFold = fold * envelope;
    displaced.z += fold * (0.085 + flowWeight * 0.055 + uImpact * 0.025) * uEnergy * envelope;
    displaced.x += sin(uv.y * 9.0 - uTime * 0.1) * 0.015 * flowWeight * uEnergy * envelope;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const mediaPlateFragmentShader = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uClarity;
  uniform float uCopyShield;
  uniform float uEnergy;
  uniform float uFlow;
  uniform vec2 uFocus;
  uniform sampler2D uImage;
  uniform float uImpact;
  uniform float uOpacity;
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform float uSignatureFrom;
  uniform float uSignatureMix;
  uniform float uSignatureMotion;
  uniform float uSignatureTo;
  uniform float uSpectral;
  uniform float uStructure;
  uniform float uTime;
  uniform float uTintStrength;
  uniform float uVoice;
  varying float vFold;
  varying vec2 vUv;

  ${sceneSignatureShader}

  void main() {
    vec2 uv = vUv;
    vec2 drift = vec2(
      sin(uv.y * 9.0 + uTime * (0.09 + uFlow * 0.035)),
      cos(uv.x * 7.0 - uTime * (0.07 + uFlow * 0.025))
    );
    float refraction = 0.0014 + uFlow * 0.0022 + uVoice * 0.00045;
    uv += drift * refraction * uEnergy;
    uv = clamp(uv, vec2(0.002), vec2(0.998));

    vec2 splitAxis = normalize(vec2(0.84, 0.38 + sin(uTime * 0.12) * 0.08));
    float splitAmount = (0.00035 + uSpectral * 0.0021) * (0.72 + uEnergy * 0.28);
    vec3 centerSample = texture2D(uImage, uv).rgb;
    vec3 positiveSample = texture2D(
      uImage,
      clamp(uv + splitAxis * splitAmount, vec2(0.002), vec2(0.998))
    ).rgb;
    float oppositeBlue = clamp(
      centerSample.b + (centerSample.b - positiveSample.b),
      0.0,
      1.2
    );
    vec3 spectralSample = vec3(positiveSample.r, centerSample.g, oppositeBlue);
    vec3 source = mix(centerSample, spectralSample, smoothstep(0.08, 0.62, uSpectral));
    float luminance = dot(source, vec3(0.2126, 0.7152, 0.0722));
    vec3 tint = mix(vec3(1.0), uPrimary, uTintStrength * 0.24);
    vec3 color = source * tint;
    color += uAccent * smoothstep(0.48, 0.96, luminance) * uTintStrength * 0.075;

    float membrane = sin((vUv.x * 1.18 + vUv.y) * 18.0 + uTime * 0.22) * 0.5 + 0.5;
    membrane = pow(membrane, 9.0) * uFlow;
    float verticalStrata = smoothstep(
      0.46,
      0.5,
      abs(fract(vUv.x * 11.0 + uTime * 0.006) - 0.5)
    );
    float horizontalStrata = smoothstep(
      0.47,
      0.5,
      abs(fract(vUv.y * 8.0 - uTime * 0.004) - 0.5)
    );
    float structure = max(verticalStrata * 0.58, horizontalStrata) * uStructure;
    vec3 spectrum = 0.5 + 0.5 * cos(
      6.28318 * (luminance * 0.34 + vFold * 0.11 + vec3(0.0, 0.14, 0.31))
    );
    color += mix(uPrimary, uSecondary, vUv.y) * membrane * (0.025 + uVoice * 0.012);
    color += uSecondary * structure * (0.035 + uImpact * 0.018);
    color = mix(color, color * (0.86 + spectrum * 0.24), uSpectral * 0.16);
    float sceneStrength = clamp(
      0.42 + uFlow * 0.38 + uStructure * 0.3 + uVoice * 0.12,
      0.0,
      1.4
    );
    vec3 sceneMotif = sampleSceneSignature(
      uSignatureTo,
      vUv,
      uFocus,
      1.77778,
      uTime * uSignatureMotion,
      sceneStrength,
      uPrimary,
      uSecondary,
      uAccent
    );
    if (uSignatureMix < 0.999) {
      vec3 previousMotif = sampleSceneSignature(
        uSignatureFrom,
        vUv,
        uFocus,
        1.77778,
        uTime * uSignatureMotion,
        sceneStrength,
        uPrimary,
        uSecondary,
        uAccent
      );
      sceneMotif = mix(previousMotif, sceneMotif, smoothstep(0.0, 1.0, uSignatureMix));
    }
    color += sceneMotif;
    float contrast = 0.88 + uClarity * 0.2;
    color = max(vec3(0.0), (color - 0.5) * contrast + 0.5);

    float copyShield = mix(
      1.0 - uCopyShield * 0.62,
      1.0,
      smoothstep(0.08, 0.72, vUv.x)
    );
    float edgeFade = smoothstep(0.0, 0.045, vUv.x)
      * (1.0 - smoothstep(0.955, 1.0, vUv.x))
      * smoothstep(0.0, 0.045, vUv.y)
      * (1.0 - smoothstep(0.955, 1.0, vUv.y));
    float foldLight = 0.94 + smoothstep(-0.4, 0.8, vFold) * 0.08;
    gl_FragColor = vec4(color * copyShield * foldLight, uOpacity * edgeFade);
    #include <colorspace_fragment>
  }
`;

export function CinematicMediaPlate({
  cue,
  enabled,
  motion,
  playbackRate,
  reducedMotion,
}: CinematicMediaPlateProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const playbackRateRef = useRef(playbackRate);
  const signatureIndex = sceneSignatureIndex(cue.environment.signature);
  const signatureTargetRef = useRef(signatureIndex);
  const texture = useTexture(cue.media.asset);
  const gl = useThree((threeState) => threeState.gl);
  const paletteTargets = useMemo(
    () => ({
      primary: new Color(cue.palette.primary),
      secondary: new Color(cue.palette.secondary),
      accent: new Color(cue.palette.accent),
    }),
    [],
  );
  const uniforms = useMemo(() => ({
    uImage: { value: texture },
    uTime: { value: 0 },
    uEnergy: { value: cue.media.drift },
    uFlow: { value: cue.environment.ribbons },
    uFocus: { value: new Vector2(...cue.lighting.focus) },
    uImpact: { value: 0 },
    uOpacity: { value: enabled ? cue.media.opacity : 0 },
    uClarity: { value: 1 - Math.min(1, cue.lens.bokehScale / 1.4) },
    uCopyShield: { value: cue.lighting.negativeSpace },
    uSpectral: { value: cue.media.tintStrength },
    uStructure: { value: cue.environment.grid },
    uSignatureFrom: { value: signatureIndex },
    uSignatureMix: { value: 1 },
    uSignatureMotion: { value: reducedMotion ? 0 : 1 },
    uSignatureTo: { value: signatureIndex },
    uTintStrength: { value: cue.media.tintStrength },
    uPrimary: { value: new Color(cue.palette.primary) },
    uSecondary: { value: new Color(cue.palette.secondary) },
    uAccent: { value: new Color(cue.palette.accent) },
    uVoice: { value: 0 },
  }), [texture]);

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
  }, [gl, texture]);

  useEffect(() => {
    if (!materialRef.current) return;
    const uniforms = materialRef.current.uniforms;
    uniforms.uSignatureFrom.value = signatureTargetRef.current;
    uniforms.uSignatureTo.value = signatureIndex;
    uniforms.uSignatureMix.value = 0;
    signatureTargetRef.current = signatureIndex;
  }, [signatureIndex]);

  useFrame((_, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const damping = motion.mediaArrival <= 0
      ? 0
      : cue.transition.damping * (0.32 + motion.mediaArrival * 1.08);
    const paletteAlpha = 1 - Math.exp(-damping * delta);
    const targetOpacity = enabled ? cue.media.opacity : 0;
    const voice = Math.min(
      1.4,
      motion.voiceLevel
        + motion.voiceImpulse * 0.48
        + motion.voicePeak * 0.22
        + motion.voiceEmphasis * 0.28
        + motion.voiceCadence * 0.1,
    );
    paletteTargets.primary.set(cue.palette.primary);
    paletteTargets.secondary.set(cue.palette.secondary);
    paletteTargets.accent.set(cue.palette.accent);

    playbackRateRef.current = MathUtils.damp(
      playbackRateRef.current,
      playbackRate,
      damping,
      delta,
    );
    materialRef.current.uniforms.uTime.value += delta * playbackRateRef.current;
    materialRef.current.uniforms.uSignatureMix.value = reducedMotion
      ? 1
      : MathUtils.smoothstep(motion.mediaArrival, 0.04, 0.96);
    materialRef.current.uniforms.uSignatureMotion.value = reducedMotion ? 0 : 1;
    materialRef.current.uniforms.uEnergy.value = MathUtils.damp(
      materialRef.current.uniforms.uEnergy.value,
      cue.media.drift
        + motion.impact * 0.36
        + motion.voiceImpulse * 0.22
        + motion.voiceLevel * 0.3
        + motion.voicePeak * 0.08
        + motion.voiceEmphasis * 0.2
        + motion.voiceCadence * 0.1,
      damping,
      delta,
    );
    materialRef.current.uniforms.uOpacity.value = MathUtils.damp(
      materialRef.current.uniforms.uOpacity.value,
      targetOpacity,
      damping,
      delta,
    );
    materialRef.current.uniforms.uFlow.value = MathUtils.damp(
      materialRef.current.uniforms.uFlow.value,
      cue.environment.ribbons,
      damping,
      delta,
    );
    materialRef.current.uniforms.uImpact.value = MathUtils.damp(
      materialRef.current.uniforms.uImpact.value,
      motion.impact + motion.voiceImpulse * 0.28 + motion.voiceEmphasis * 0.2,
      damping,
      delta,
    );
    materialRef.current.uniforms.uClarity.value = MathUtils.damp(
      materialRef.current.uniforms.uClarity.value,
      1 - Math.min(1, cue.lens.bokehScale / 1.4),
      damping,
      delta,
    );
    materialRef.current.uniforms.uCopyShield.value = MathUtils.damp(
      materialRef.current.uniforms.uCopyShield.value,
      cue.lighting.negativeSpace,
      damping,
      delta,
    );
    materialRef.current.uniforms.uFocus.value.x = MathUtils.damp(
      materialRef.current.uniforms.uFocus.value.x,
      cue.lighting.focus[0],
      damping,
      delta,
    );
    materialRef.current.uniforms.uFocus.value.y = MathUtils.damp(
      materialRef.current.uniforms.uFocus.value.y,
      cue.lighting.focus[1],
      damping,
      delta,
    );
    materialRef.current.uniforms.uSpectral.value = MathUtils.damp(
      materialRef.current.uniforms.uSpectral.value,
      cue.media.tintStrength,
      damping,
      delta,
    );
    materialRef.current.uniforms.uStructure.value = MathUtils.damp(
      materialRef.current.uniforms.uStructure.value,
      cue.environment.grid,
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
    materialRef.current.uniforms.uSecondary.value.lerp(paletteTargets.secondary, paletteAlpha);
    materialRef.current.uniforms.uAccent.value.lerp(paletteTargets.accent, paletteAlpha);
    materialRef.current.uniforms.uVoice.value = MathUtils.damp(
      materialRef.current.uniforms.uVoice.value,
      voice,
      damping,
      delta,
    );

    meshRef.current.visible = enabled || materialRef.current.uniforms.uOpacity.value > 0.004;
    meshRef.current.position.x = MathUtils.damp(
      meshRef.current.position.x,
      cue.media.offset[0]
        + motion.overshoot * (0.08 - cue.spatial.parallax * 0.05),
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
      cue.media.depth - motion.overshoot * cue.spatial.parallax * 0.1,
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
