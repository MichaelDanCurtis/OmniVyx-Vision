import { describe, expect, it } from 'vitest';
import {
  CINEMATIC_BLOOM_SMOOTHING,
  CINEMATIC_BLOOM_THRESHOLD,
  PRISM_ROUGHNESS_FLOOR,
  resolvePrismEmissiveIntensity,
  resolvePrismRoughness,
} from './opticalStability';

describe('opticalStability', () => {
  it('uses a feathered bloom gate instead of a near-black hard threshold', () => {
    expect(CINEMATIC_BLOOM_THRESHOLD).toBeGreaterThanOrEqual(0.4);
    expect(CINEMATIC_BLOOM_SMOOTHING).toBeGreaterThanOrEqual(0.15);
  });

  it('keeps the rotating prism rough enough to prevent specular strobing', () => {
    expect(resolvePrismRoughness(0, 0)).toBeCloseTo(0.205, 8);
    expect(resolvePrismRoughness(1, 1.2)).toBeGreaterThanOrEqual(PRISM_ROUGHNESS_FLOOR);
  });

  it('responds to performance energy without allowing an emissive flash', () => {
    const idle = resolvePrismEmissiveIntensity(0, 0, 0, 0, 0, 0);
    const energized = resolvePrismEmissiveIntensity(1.4, 1.4, 1.4, 1.4, 1.4, 1.4);

    expect(idle).toBe(0.11);
    expect(energized).toBeGreaterThan(idle);
    expect(energized).toBeLessThanOrEqual(0.72);
  });

  it('rejects invalid optical energy', () => {
    expect(() => resolvePrismRoughness(-0.1, 0)).toThrow(/motion energy/);
    expect(() => resolvePrismEmissiveIntensity(0, 0, 0, 0, Number.NaN, 0))
      .toThrow(/emphasis/);
  });
});
