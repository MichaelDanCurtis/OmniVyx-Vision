import { describe, expect, it } from 'vitest';
import {
  decayImpulse,
  sampleCameraShotArc,
  sampleCueHandoff,
  sampleCueMotion,
  samplePhaseWindow,
} from './motionEnvelope';

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

  it('starts a settled or first cue without synthetic handoff momentum', () => {
    expect(sampleCueHandoff(0, 0)).toEqual({
      continuity: 0,
      impactScale: 1,
    });
    expect(sampleCueHandoff(1, 1_200, 0.4)).toEqual({
      continuity: 0,
      impactScale: 1,
    });
  });

  it('bridges interrupted cues while bounding repeated impact', () => {
    expect(sampleCueHandoff(0.35, 420)).toEqual({
      continuity: 0.65,
      impactScale: 0.727,
    });
    expect(sampleCueHandoff(0.82, 900, 0.58)).toEqual({
      continuity: 0.58,
      impactScale: 0.7564,
    });
    expect(sampleCueHandoff(0, 16)).toEqual({
      continuity: 0.9,
      impactScale: 0.622,
    });
  });

  it('rejects invalid handoff samples', () => {
    expect(() => sampleCueHandoff(1.1, 200)).toThrow(/between zero and one/);
    expect(() => sampleCueHandoff(0.4, -1)).toThrow(/non-negative finite/);
    expect(() => sampleCueHandoff(0.4, 200, -0.1)).toThrow(/between zero and one/);
  });

  it('shapes a camera shot through one transient arc', () => {
    expect(sampleCameraShotArc(0)).toBe(0);
    expect(sampleCameraShotArc(0.25)).toBeCloseTo(Math.SQRT1_2, 8);
    expect(sampleCameraShotArc(0.5)).toBe(1);
    expect(sampleCameraShotArc(0.75)).toBeCloseTo(Math.SQRT1_2, 8);
    expect(sampleCameraShotArc(1)).toBe(0);
    expect(() => sampleCameraShotArc(1.1)).toThrow(/between zero and one/);
  });

  it('stages layer motion inside an authored normalized window', () => {
    expect(samplePhaseWindow(0.1, [0.2, 0.8])).toBe(0);
    expect(samplePhaseWindow(0.5, [0.2, 0.8])).toBeCloseTo(0.5, 8);
    expect(samplePhaseWindow(0.9, [0.2, 0.8])).toBe(1);
    expect(() => samplePhaseWindow(0.5, [0.8, 0.2])).toThrow(/increasing interval/);
  });
});
