import { describe, expect, it } from 'vitest';
import {
  createPresenterEnergySignal,
  kickPresenterEnergySignal,
  measurePresenterEnergy,
  releasePresenterEnergySignal,
  resetPresenterEnergySignal,
  updatePresenterEnergySignal,
} from './presenterAudio';

describe('presenterAudio', () => {
  it('measures RMS and peak into reusable storage', () => {
    const target = { peak: 0, rms: 0 };
    const measured = measurePresenterEnergy(
      new Float32Array([0, 0.5, -0.5, 0.25]),
      target,
    );

    expect(measured).toBe(target);
    expect(measured.rms).toBeCloseTo(0.375, 6);
    expect(measured.peak).toBe(0.5);
  });

  it('applies frame-rate-independent attack to the shared signal', () => {
    const measurement = { peak: 0.36, rms: 0.08 };
    const oneFrame = createPresenterEnergySignal();
    const twoFrames = createPresenterEnergySignal();

    updatePresenterEnergySignal(oneFrame, measurement, 1 / 30);
    updatePresenterEnergySignal(twoFrames, measurement, 1 / 60);
    updatePresenterEnergySignal(twoFrames, measurement, 1 / 60);

    expect(twoFrames.level).toBeCloseTo(oneFrame.level, 10);
    expect(twoFrames.level).toBeGreaterThan(0);
    expect(twoFrames.peak).toBeGreaterThan(0);
  });

  it('resets activity and energy when capture stops', () => {
    const signal = createPresenterEnergySignal();
    updatePresenterEnergySignal(signal, { peak: 0.4, rms: 0.1 }, 1 / 30);
    resetPresenterEnergySignal(signal);

    expect(signal).toEqual({ active: false, level: 0, peak: 0 });
  });

  it('supports a bounded fallback kick without claiming capture is active', () => {
    const signal = createPresenterEnergySignal();
    kickPresenterEnergySignal(signal, 2);

    expect(signal).toEqual({ active: false, level: 1, peak: 1 });
    releasePresenterEnergySignal(signal);
    expect(signal).toEqual({ active: false, level: 0, peak: 0 });
  });
});
