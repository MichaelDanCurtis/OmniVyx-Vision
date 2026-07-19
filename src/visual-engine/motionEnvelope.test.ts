import { describe, expect, it } from 'vitest';
import {
  decayImpulse,
  defaultCueMotionProfile,
  motionSignatures,
  sampleCameraShotArc,
  sampleCueHandoff,
  sampleCueMotion,
  sampleOpticalHandoff,
  samplePhaseWindow,
  sampleSemanticPreflight,
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

  it('gives authored temporal signatures distinct acceleration and settle character', () => {
    const reveal = sampleCueMotion(300, 1_000, undefined, {
      arrivalPower: 5.4,
      impactAmplitude: 1.05,
      impactDecay: 5.2,
      overshootAmplitude: 0.75,
      overshootDecay: 2,
      overshootSkew: 0.82,
    });
    const hold = sampleCueMotion(300, 1_000, undefined, {
      arrivalPower: 2.2,
      impactAmplitude: 0.35,
      impactDecay: 9,
      overshootAmplitude: 0.08,
      overshootDecay: 5,
      overshootSkew: 1.2,
    });

    expect(reveal.arrival).toBeGreaterThan(hold.arrival);
    expect(reveal.impact).toBeGreaterThan(hold.impact);
    expect(reveal.overshoot).toBeGreaterThan(hold.overshoot);
    expect(new Set(motionSignatures).size).toBe(7);
    expect(defaultCueMotionProfile.arrivalPower).toBe(4);
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

  it('shapes a cullable optical handoff without amplifying interruptions', () => {
    expect(sampleOpticalHandoff(0, 0, 1)).toEqual({
      active: false,
      opacity: 0,
      width: 1,
    });

    const direct = sampleOpticalHandoff(0.3, 0, 0.9);
    const interrupted = sampleOpticalHandoff(0.3, 0.75, 0.9);
    expect(direct).toEqual({ active: true, opacity: 0.9, width: 1 });
    expect(interrupted.active).toBe(true);
    expect(interrupted.opacity).toBeLessThan(direct.opacity);
    expect(interrupted.width).toBeGreaterThan(direct.width);
    expect(sampleOpticalHandoff(1, 0, 1).active).toBe(false);
  });

  it('reuses an optical handoff target and rejects invalid samples', () => {
    const target = { active: false, opacity: 0, width: 1 };
    expect(sampleOpticalHandoff(0.4, 0.2, 1.1, target)).toBe(target);
    expect(() => sampleOpticalHandoff(-0.1, 0, 1)).toThrow(/progress/);
    expect(() => sampleOpticalHandoff(0.2, 1.1, 1)).toThrow(/continuity/);
    expect(() => sampleOpticalHandoff(0.2, 0, -1)).toThrow(/intensity/);
  });

  it('preflights a likely semantic cue as a restrained, cullable optical breath', () => {
    const idle = sampleSemanticPreflight(0, 0, 1);
    expect(idle.active).toBe(false);
    expect(idle.opacity).toBe(0);
    expect(idle.progress).toBe(0.1);
    expect(idle.width).toBeCloseTo(1.6, 8);

    const tentative = sampleSemanticPreflight(0.55, 0.4, 0.7);
    const confident = sampleSemanticPreflight(0.9, 0.4, 1.1);
    expect(tentative.active).toBe(true);
    expect(confident.opacity).toBeGreaterThan(tentative.opacity);
    expect(confident.opacity).toBeLessThanOrEqual(0.34);
    expect(confident.progress).toBeGreaterThan(0.08);
    expect(confident.progress).toBeLessThan(0.14);
  });

  it('rejects invalid semantic preflight samples', () => {
    expect(() => sampleSemanticPreflight(1.1, 0, 1)).toThrow(/anticipation/);
    expect(() => sampleSemanticPreflight(0.4, -1, 1)).toThrow(/time/);
    expect(() => sampleSemanticPreflight(0.4, 0, -1)).toThrow(/intensity/);
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
