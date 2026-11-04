import { describe, expect, it } from 'vitest';
import { resolveWorldFocusDistance, spatialSignatures } from './spatialSignature';

describe('spatialSignature', () => {
  it('keeps one authored spatial language for every show beat', () => {
    expect(new Set(spatialSignatures).size).toBe(7);
  });

  it('resolves a world-space focus pull without allocating scene objects', () => {
    expect(resolveWorldFocusDistance(
      { x: 0, y: 1.5, z: 6.5 },
      [1, 0.5, 0.5],
      -0.2,
    )).toBeCloseTo(Math.hypot(1, 1, 6) - 0.2, 6);
    expect(resolveWorldFocusDistance(
      { x: 0, y: 0, z: 0 },
      [0, 0, 0],
      -10,
    )).toBe(0.1);
  });
});
