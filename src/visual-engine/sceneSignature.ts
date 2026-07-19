export const sceneSignatures = [
  'listening_field',
  'aperture_chamber',
  'vector_flow',
  'living_canopy',
  'evidence_matrix',
  'quiet_vault',
  'final_convergence',
] as const;

export type SceneSignature = (typeof sceneSignatures)[number];

const sceneSignatureIndices: Readonly<Record<SceneSignature, number>> = {
  listening_field: 0,
  aperture_chamber: 1,
  vector_flow: 2,
  living_canopy: 3,
  evidence_matrix: 4,
  quiet_vault: 5,
  final_convergence: 6,
};

export function sceneSignatureIndex(signature: SceneSignature): number {
  return sceneSignatureIndices[signature];
}

export const sceneSignatureShader = /* glsl */ `
  float sceneLine(float value, float frequency, float sharpness) {
    return pow(max(0.0, 1.0 - abs(sin(value * frequency))), sharpness);
  }

  vec3 sampleSceneSignature(
    float signature,
    vec2 uv,
    vec2 focus,
    float aspect,
    float time,
    float strength,
    vec3 primary,
    vec3 secondary,
    vec3 accent
  ) {
    vec2 point = uv - focus;
    point.x *= aspect;
    float radius = length(point);
    float envelope = exp(-radius * 1.45);

    if (signature < 0.5) {
      float echo = sceneLine(radius - time * 0.018, 22.0, 24.0) * envelope;
      float listener = exp(-dot(point * vec2(0.72, 1.28), point * vec2(0.72, 1.28)) * 4.2);
      float horizon = exp(-pow(point.y + 0.12 + sin(point.x * 4.0 + time * 0.12) * 0.035, 2.0) * 92.0);
      return mix(primary, secondary, 0.6) * echo * (0.055 + strength * 0.04)
        + primary * listener * 0.018 * strength
        + accent * horizon * 0.025 * strength;
    }

    if (signature < 1.5) {
      float angle = atan(point.y, point.x);
      float chamber = sceneLine(radius - 0.25 - sin(time * 0.16) * 0.012, 34.0, 32.0);
      float iris = pow(max(0.0, cos(angle * 6.0 - time * 0.08)), 18.0)
        * smoothstep(0.08, 0.22, radius)
        * (1.0 - smoothstep(0.42, 0.78, radius));
      float lens = exp(-radius * radius * 18.0);
      return secondary * chamber * envelope * (0.07 + strength * 0.045)
        + primary * iris * 0.065 * strength
        + accent * lens * 0.055 * strength;
    }

    if (signature < 2.5) {
      float railA = sceneLine(point.x + point.y * 0.42 - time * 0.025, 18.0, 28.0);
      float railB = sceneLine(point.x - point.y * 0.68 + time * 0.018, 26.0, 34.0);
      float vectorPulse = exp(-pow(fract(point.x * 0.72 - point.y * 0.18 - time * 0.035) - 0.5, 2.0) * 92.0);
      float directionGate = smoothstep(-0.58, 0.42, point.x) * envelope;
      return primary * railA * directionGate * (0.045 + strength * 0.035)
        + accent * railB * directionGate * 0.04 * strength
        + secondary * vectorPulse * railA * 0.055 * strength;
    }

    if (signature < 3.5) {
      float branchWarp = sin(point.x * 5.8 + time * 0.09) * 0.16
        + sin(point.x * 11.0 - time * 0.06) * 0.045;
      float branchA = sceneLine(point.y + branchWarp, 29.0, 30.0);
      float branchB = sceneLine(point.y - point.x * 0.36 - branchWarp * 0.7, 37.0, 34.0);
      float canopy = smoothstep(-0.46, 0.24, point.y) * envelope;
      float seed = exp(-radius * radius * 34.0);
      return primary * branchA * canopy * (0.045 + strength * 0.04)
        + secondary * branchB * canopy * 0.035 * strength
        + accent * seed * 0.04 * strength;
    }

    if (signature < 4.5) {
      float gridX = sceneLine(point.x + time * 0.004, 38.0, 42.0);
      float gridY = sceneLine(point.y - time * 0.003, 31.0, 42.0);
      float scan = exp(-pow(fract((point.y + 0.7) * 0.82 - time * 0.045) - 0.5, 2.0) * 180.0);
      float dataGate = smoothstep(-0.62, 0.2, point.x) * smoothstep(-0.72, 0.44, point.y);
      return secondary * max(gridX * 0.62, gridY) * dataGate * (0.035 + strength * 0.03)
        + primary * scan * dataGate * 0.05 * strength
        + accent * gridX * scan * 0.06 * strength;
    }

    if (signature < 5.5) {
      float vault = exp(-point.x * point.x * 3.4) * exp(-abs(point.y + 0.04) * 1.9);
      float breath = 0.82 + sin(time * 0.22) * 0.18;
      float quietRing = exp(-pow(abs(radius - 0.34) * 18.0, 1.45));
      return mix(primary, secondary, 0.72) * vault * 0.025 * strength * breath
        + accent * quietRing * envelope * 0.018 * strength;
    }

    float beamWidth = 0.018 + strength * 0.012;
    float beamA = exp(-pow(abs(point.x + point.y * 0.48) / beamWidth, 1.35));
    float beamB = exp(-pow(abs(point.x - point.y * 0.7) / beamWidth, 1.35));
    float beamC = exp(-pow(abs(point.y + point.x * 0.16) / (beamWidth * 0.76), 1.35));
    float convergence = (beamA + beamB + beamC * 0.68) * envelope;
    float finalRing = sceneLine(radius - time * 0.012, 27.0, 32.0) * envelope;
    float core = exp(-radius * radius * 42.0);
    return primary * convergence * (0.055 + strength * 0.04)
      + secondary * core * 0.07 * strength
      + accent * finalRing * 0.045 * strength;
  }
`;
