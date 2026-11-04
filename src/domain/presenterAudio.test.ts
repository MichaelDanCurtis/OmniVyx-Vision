import { describe, expect, it } from 'vitest';
import {
  createPresenterEnergySignal,
  createPresenterProsodyState,
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
    const oneFrameProsody = createPresenterProsodyState();
    const twoFramesProsody = createPresenterProsodyState();

    updatePresenterEnergySignal(oneFrame, measurement, 1 / 30, oneFrameProsody);
    updatePresenterEnergySignal(twoFrames, measurement, 1 / 60, twoFramesProsody);
    updatePresenterEnergySignal(twoFrames, measurement, 1 / 60, twoFramesProsody);

    expect(twoFrames.level).toBeCloseTo(oneFrame.level, 10);
    expect(twoFrames.level).toBeGreaterThan(0);
    expect(twoFrames.peak).toBeGreaterThan(0);
  });

  it('resets activity and energy when capture stops', () => {
    const signal = createPresenterEnergySignal();
    updatePresenterEnergySignal(
      signal,
      { peak: 0.4, rms: 0.1 },
      1 / 30,
      createPresenterProsodyState(),
    );
    resetPresenterEnergySignal(signal);

    expect(signal).toEqual({
      active: false,
      cadence: 0,
      emphasis: 0,
      level: 0,
      peak: 0,
    });
  });

  it('supports a bounded fallback kick without claiming capture is active', () => {
    const signal = createPresenterEnergySignal();
    kickPresenterEnergySignal(signal, 2);

    expect(signal).toEqual({
      active: false,
      cadence: 0,
      emphasis: 1,
      level: 1,
      peak: 1,
    });
    releasePresenterEnergySignal(signal);
    expect(signal).toEqual({
      active: false,
      cadence: 0,
      emphasis: 0,
      level: 0,
      peak: 0,
    });
  });

  it('separates an accented onset from steady vocal energy', () => {
    const signal = createPresenterEnergySignal();
    const prosody = createPresenterProsodyState();
    const steady = { peak: 0.19, rms: 0.055 };

    for (let frame = 0; frame < 40; frame += 1) {
      updatePresenterEnergySignal(signal, steady, 1 / 60, prosody);
    }
    const steadyEmphasis = signal.emphasis;
    updatePresenterEnergySignal(signal, { peak: 0.48, rms: 0.12 }, 1 / 60, prosody);

    expect(signal.level).toBeGreaterThan(0);
    expect(signal.emphasis).toBeGreaterThan(steadyEmphasis + 0.2);
    expect(signal.emphasis).toBeLessThanOrEqual(1);
  });

  it('learns cadence from consistently spaced vocal onsets and releases it in silence', () => {
    const signal = createPresenterEnergySignal();
    const prosody = createPresenterProsodyState();
    const silence = { peak: 0.002, rms: 0.001 };
    const accent = { peak: 0.46, rms: 0.11 };

    for (let beat = 0; beat < 5; beat += 1) {
      updatePresenterEnergySignal(signal, accent, 1 / 60, prosody);
      for (let frame = 0; frame < 29; frame += 1) {
        updatePresenterEnergySignal(signal, silence, 1 / 60, prosody);
      }
    }
    const learnedCadence = signal.cadence;

    for (let frame = 0; frame < 180; frame += 1) {
      updatePresenterEnergySignal(signal, silence, 1 / 60, prosody);
    }

    expect(learnedCadence).toBeGreaterThan(0.18);
    expect(signal.cadence).toBeLessThan(learnedCadence * 0.2);
  });
});
