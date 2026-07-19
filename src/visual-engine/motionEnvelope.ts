export interface CueMotionSample {
  progress: number;
  arrival: number;
  impact: number;
  overshoot: number;
}

export interface CueHandoffSample {
  continuity: number;
  impactScale: number;
}

export type MotionPhaseWindow = readonly [start: number, end: number];

export function sampleCueMotion(
  elapsedMs: number,
  durationMs: number,
  target: CueMotionSample = { progress: 0, arrival: 0, impact: 1, overshoot: 0 },
): CueMotionSample {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new Error('Cue elapsed time must be a non-negative finite number.');
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('Cue duration must be a positive finite number.');
  }

  const progress = Math.min(1, elapsedMs / durationMs);
  target.progress = progress;
  target.arrival = 1 - Math.pow(1 - progress, 4);
  target.impact = Math.exp(-progress * 6) * (1 - progress);
  target.overshoot = Math.sin(progress * Math.PI) * Math.exp(-progress * 2.4);
  return target;
}

export function decayImpulse(value: number, deltaSeconds: number, lambda = 5): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Impulse must be a non-negative finite number.');
  }
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
    throw new Error('Delta time must be a non-negative finite number.');
  }
  if (!Number.isFinite(lambda) || lambda <= 0) {
    throw new Error('Impulse damping must be a positive finite number.');
  }

  const next = value * Math.exp(-lambda * deltaSeconds);
  return next < 0.0001 ? 0 : next;
}

export function sampleCueHandoff(
  previousProgress: number,
  previousElapsedMs: number,
  carriedContinuity = 0,
): CueHandoffSample {
  if (!Number.isFinite(previousProgress) || previousProgress < 0 || previousProgress > 1) {
    throw new Error('Previous cue progress must be a finite value between zero and one.');
  }
  if (!Number.isFinite(previousElapsedMs) || previousElapsedMs < 0) {
    throw new Error('Previous cue elapsed time must be a non-negative finite number.');
  }
  if (!Number.isFinite(carriedContinuity) || carriedContinuity < 0 || carriedContinuity > 1) {
    throw new Error('Carried cue continuity must be a finite value between zero and one.');
  }

  const interrupted = previousElapsedMs > 0 && previousProgress < 1;
  const continuity = interrupted
    ? Math.min(0.9, Math.max(carriedContinuity, 1 - previousProgress))
    : 0;

  return {
    continuity,
    impactScale: 1 - continuity * 0.42,
  };
}

export function samplePhaseWindow(
  progress: number,
  [start, end]: MotionPhaseWindow,
): number {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new Error('Phase progress must be a finite value between zero and one.');
  }
  if (
    !Number.isFinite(start)
    || !Number.isFinite(end)
    || start < 0
    || end > 1
    || start >= end
  ) {
    throw new Error('Phase window must be an increasing interval between zero and one.');
  }

  const normalized = Math.min(1, Math.max(0, (progress - start) / (end - start)));
  return normalized * normalized * (3 - 2 * normalized);
}
