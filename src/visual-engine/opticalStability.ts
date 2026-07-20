export const CINEMATIC_BLOOM_THRESHOLD = 0.46;
export const CINEMATIC_BLOOM_SMOOTHING = 0.18;
export const PRISM_ROUGHNESS_FLOOR = 0.17;

export function resolvePrismRoughness(motionEnergy: number, impact: number): number {
  assertNonNegativeFinite('Prism motion energy', motionEnergy);
  assertNonNegativeFinite('Prism impact', impact);
  return Math.max(
    PRISM_ROUGHNESS_FLOOR,
    0.205 - Math.min(1, motionEnergy) * 0.018 - Math.min(1.2, impact) * 0.012,
  );
}

export function resolvePrismEmissiveIntensity(
  impact: number,
  impulse: number,
  level: number,
  peak: number,
  emphasis: number,
  cadence: number,
): number {
  assertNonNegativeFinite('Prism impact', impact);
  assertNonNegativeFinite('Prism impulse', impulse);
  assertNonNegativeFinite('Prism level', level);
  assertNonNegativeFinite('Prism peak', peak);
  assertNonNegativeFinite('Prism emphasis', emphasis);
  assertNonNegativeFinite('Prism cadence', cadence);
  return Math.min(
    0.72,
    0.11
      + boundSignal(impact) * 0.36
      + boundSignal(impulse) * 0.16
      + boundSignal(level) * 0.19
      + boundSignal(peak) * 0.08
      + boundSignal(emphasis) * 0.2
      + boundSignal(cadence) * 0.06,
  );
}

function boundSignal(value: number): number {
  return Math.min(1.4, value);
}

function assertNonNegativeFinite(label: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number.`);
  }
}
