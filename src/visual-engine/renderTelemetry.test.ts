import { describe, expect, it } from 'vitest';
import {
  createFrameTimeHistogram,
  readFrameTimePercentile,
  recordFrameDuration,
  resetFrameTimeHistogram,
} from './renderTelemetry';

describe('renderTelemetry', () => {
  it('reports percentile frame time from a fixed allocation-free histogram', () => {
    const histogram = createFrameTimeHistogram();
    for (let index = 0; index < 95; index += 1) recordFrameDuration(histogram, 0.0166);
    for (let index = 0; index < 5; index += 1) recordFrameDuration(histogram, 0.034);

    expect(readFrameTimePercentile(histogram, 0.5)).toBe(17);
    expect(readFrameTimePercentile(histogram, 0.95)).toBe(17);
    expect(readFrameTimePercentile(histogram, 0.99)).toBe(34);
  });

  it('caps pathological frames and resets the existing storage', () => {
    const histogram = createFrameTimeHistogram();
    recordFrameDuration(histogram, 0.4);
    expect(readFrameTimePercentile(histogram, 0.95)).toBe(80);

    resetFrameTimeHistogram(histogram);
    expect(readFrameTimePercentile(histogram, 0.95)).toBe(0);
    expect(() => readFrameTimePercentile(histogram, 0)).toThrow(/greater than zero/);
  });
});
