export interface EvidencePoint {
  label: string;
  value: number;
  displayValue: string;
}

export interface EvidenceSeries {
  id: string;
  kicker: string;
  title: string;
  metric: string;
  metricLabel: string;
  range: string;
  points: readonly EvidencePoint[];
}

export const launchEvidence = {
  id: 'recurring-revenue-projection',
  kicker: 'Prepared evidence',
  title: 'Projected recurring revenue',
  metric: '+38%',
  metricLabel: 'year-over-year growth',
  range: 'FY24-FY27',
  points: [
    { label: 'FY24', value: 12.4, displayValue: '$12.4M' },
    { label: 'FY25', value: 18.7, displayValue: '$18.7M' },
    { label: 'FY26', value: 27.1, displayValue: '$27.1M' },
    { label: 'FY27', value: 38, displayValue: '$38.0M' },
  ],
} as const satisfies EvidenceSeries;

export function normalizeEvidenceValues(series: EvidenceSeries): Float32Array {
  if (series.points.length < 2) {
    throw new Error('Cinematic evidence requires at least two points.');
  }

  let maximum = 0;
  for (const point of series.points) {
    if (!Number.isFinite(point.value) || point.value < 0) {
      throw new Error('Evidence values must be finite and non-negative.');
    }
    maximum = Math.max(maximum, point.value);
  }
  if (maximum <= 0) {
    throw new Error('Cinematic evidence requires at least one positive value.');
  }

  const normalized = new Float32Array(series.points.length);
  for (let index = 0; index < series.points.length; index += 1) {
    normalized[index] = series.points[index].value / maximum;
  }
  return normalized;
}

export function validateEvidenceSeries(series: EvidenceSeries): void {
  if (
    !series.id
    || !series.kicker
    || !series.title
    || !series.metric
    || !series.metricLabel
    || !series.range
    || series.points.some((point) => !point.label || !point.displayValue)
  ) {
    throw new Error('Cinematic evidence metadata must be complete.');
  }
  normalizeEvidenceValues(series);
}
