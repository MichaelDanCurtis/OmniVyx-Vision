import { describe, expect, it } from 'vitest';
import {
  launchEvidence,
  normalizeEvidenceValues,
  validateEvidenceSeries,
  type EvidenceSeries,
} from './evidenceScore';

describe('evidenceScore', () => {
  it('normalizes the preloaded series without mutating its authored values', () => {
    const normalized = normalizeEvidenceValues(launchEvidence);

    expect(Array.from(normalized)).toEqual([
      12.4 / 38,
      18.7 / 38,
      27.1 / 38,
      1,
    ].map((value) => Math.fround(value)));
    expect(launchEvidence.points[3].displayValue).toBe('$38.0M');
  });

  it('keeps the launch evidence complete and chronologically ordered', () => {
    expect(() => validateEvidenceSeries(launchEvidence)).not.toThrow();
    expect(launchEvidence.points.map((point) => point.label)).toEqual([
      'FY24',
      'FY25',
      'FY26',
      'FY27',
    ]);
    expect(launchEvidence.points.every((point, index, points) => (
      index === 0 || point.value > points[index - 1].value
    ))).toBe(true);
  });

  it('rejects empty, negative, and all-zero evidence', () => {
    const withPoints = (values: number[]): EvidenceSeries => ({
      ...launchEvidence,
      points: values.map((value, index) => ({
        label: `P${index}`,
        value,
        displayValue: String(value),
      })),
    });

    expect(() => normalizeEvidenceValues(withPoints([]))).toThrow(/at least two/);
    expect(() => normalizeEvidenceValues(withPoints([1, -1]))).toThrow(/non-negative/);
    expect(() => normalizeEvidenceValues(withPoints([0, 0]))).toThrow(/positive/);
    expect(() => validateEvidenceSeries({ ...launchEvidence, metricLabel: '' }))
      .toThrow(/metadata must be complete/);
  });
});
