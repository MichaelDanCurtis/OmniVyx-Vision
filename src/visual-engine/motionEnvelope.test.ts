import { describe, expect, it } from 'vitest';
import { decayImpulse, sampleCueMotion } from './motionEnvelope';

describe('motionEnvelope', () => {
  it('starts with impact and settles on the authored target', () => {
    expect(sampleCueMotion(0, 1_000)).toEqual({
      progress: 0,
      arrival: 0,
      impact: 1,
      overshoot: 0,
    });

    const settled = sampleCueMotion(1_500, 1_000);
    expect(settled.progress).toBe(1);
    expect(settled.arrival).toBe(1);
    expect(settled.impact).toBe(0);
    expect(settled.overshoot).toBeCloseTo(0, 8);
  });

  it('produces a bounded arrival overshoot during the transition', () => {
    const sample = sampleCueMotion(320, 1_200);

    expect(sample.progress).toBeGreaterThan(0);
    expect(sample.progress).toBeLessThan(1);
    expect(sample.arrival).toBeGreaterThan(sample.progress);
    expect(sample.impact).toBeGreaterThan(0);
    expect(sample.overshoot).toBeGreaterThan(0);
    expect(sample.overshoot).toBeLessThan(1);
  });

  it('decays voice impulses independently of frame rate', () => {
    const oneFrame = decayImpulse(1, 1 / 30);
    const twoHalfFrames = decayImpulse(decayImpulse(1, 1 / 60), 1 / 60);

    expect(twoHalfFrames).toBeCloseTo(oneFrame, 10);
    expect(() => decayImpulse(-1, 1 / 60)).toThrow(/non-negative finite/);
  });
});
