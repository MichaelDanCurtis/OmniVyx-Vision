export interface CuePacingProfile {
  idleRate: number;
  minimumRate: number;
  maximumRate: number;
  energyGain: number;
  peakGain: number;
}

function requireFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number.`);
  }
}

export function resolveCuePace(
  profile: CuePacingProfile,
  presenterEnergy = 0,
  presenterPeak = 0,
): number {
  Object.entries(profile).forEach(([key, value]) => requireFiniteNonNegative(value, key));
  requireFiniteNonNegative(presenterEnergy, 'Presenter energy');
  requireFiniteNonNegative(presenterPeak, 'Presenter peak');
  if (profile.minimumRate <= 0 || profile.maximumRate < profile.minimumRate) {
    throw new Error('Cue pace range must be positive and increasing.');
  }
  if (profile.idleRate < profile.minimumRate || profile.idleRate > profile.maximumRate) {
    throw new Error('Cue idle pace must be inside the authored range.');
  }

  const energy = Math.min(1, presenterEnergy);
  const peak = Math.min(1, presenterPeak);
  const pace = profile.idleRate + energy * profile.energyGain + peak * profile.peakGain;
  const clamped = Math.min(profile.maximumRate, Math.max(profile.minimumRate, pace));
  return Math.round(clamped * 1_000) / 1_000;
}

export function scaleCueDuration(durationMs: number, pace: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('Cue duration must be a positive finite number.');
  }
  if (!Number.isFinite(pace) || pace <= 0) {
    throw new Error('Cue pace must be a positive finite number.');
  }
  return durationMs / pace;
}
