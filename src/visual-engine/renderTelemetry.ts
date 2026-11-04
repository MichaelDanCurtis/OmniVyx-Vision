export const FRAME_TIME_BIN_LIMIT_MS = 80;

export function createFrameTimeHistogram(): Uint16Array {
  return new Uint16Array(FRAME_TIME_BIN_LIMIT_MS + 1);
}

export function recordFrameDuration(
  histogram: Uint16Array,
  deltaSeconds: number,
): void {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) return;
  const bin = Math.min(
    FRAME_TIME_BIN_LIMIT_MS,
    Math.max(0, Math.round(deltaSeconds * 1_000)),
  );
  histogram[bin] += 1;
}

export function readFrameTimePercentile(
  histogram: Uint16Array,
  percentile: number,
): number {
  if (!Number.isFinite(percentile) || percentile <= 0 || percentile > 1) {
    throw new Error('Frame-time percentile must be greater than zero and at most one.');
  }

  let sampleCount = 0;
  for (let index = 0; index < histogram.length; index += 1) {
    sampleCount += histogram[index];
  }
  if (sampleCount === 0) return 0;

  const target = Math.ceil(sampleCount * percentile);
  let cumulative = 0;
  for (let index = 0; index < histogram.length; index += 1) {
    cumulative += histogram[index];
    if (cumulative >= target) return index;
  }
  return histogram.length - 1;
}

export function resetFrameTimeHistogram(histogram: Uint16Array): void {
  histogram.fill(0);
}
