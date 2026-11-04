export interface PresenterEnergyMeasurement {
  peak: number;
  rms: number;
}

export interface PresenterEnergySignal {
  active: boolean;
  cadence: number;
  emphasis: number;
  level: number;
  peak: number;
}

export interface PresenterProsodyState {
  baseline: number;
  cadenceConfidence: number;
  cadenceIntervalSeconds: number;
  onsetArmed: boolean;
  onsetCooldownSeconds: number;
  previousTarget: number;
  secondsSinceOnset: number;
}

export interface PresenterAudioMeter {
  stop: () => void;
}

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export function createPresenterEnergySignal(): PresenterEnergySignal {
  return {
    active: false,
    cadence: 0,
    emphasis: 0,
    level: 0,
    peak: 0,
  };
}

export function createPresenterProsodyState(): PresenterProsodyState {
  return {
    baseline: 0,
    cadenceConfidence: 0,
    cadenceIntervalSeconds: 0.62,
    onsetArmed: true,
    onsetCooldownSeconds: 0,
    previousTarget: 0,
    secondsSinceOnset: 2,
  };
}

export function resetPresenterEnergySignal(signal: PresenterEnergySignal): void {
  signal.active = false;
  signal.cadence = 0;
  signal.emphasis = 0;
  signal.level = 0;
  signal.peak = 0;
}

export function kickPresenterEnergySignal(
  signal: PresenterEnergySignal,
  level = 0.86,
): void {
  if (!Number.isFinite(level)) return;
  const normalized = clamp01(level);
  signal.emphasis = Math.max(signal.emphasis, normalized);
  signal.level = Math.max(signal.level, normalized);
  signal.peak = Math.max(signal.peak, normalized);
}

export function releasePresenterEnergySignal(signal: PresenterEnergySignal): void {
  signal.cadence = 0;
  signal.emphasis = 0;
  signal.level = 0;
  signal.peak = 0;
}

export function measurePresenterEnergy(
  samples: Float32Array,
  target: PresenterEnergyMeasurement = { peak: 0, rms: 0 },
): PresenterEnergyMeasurement {
  if (samples.length === 0) {
    target.peak = 0;
    target.rms = 0;
    return target;
  }

  let sumSquares = 0;
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const magnitude = Math.abs(samples[index]);
    sumSquares += magnitude * magnitude;
    if (magnitude > peak) peak = magnitude;
  }
  target.peak = peak;
  target.rms = Math.sqrt(sumSquares / samples.length);
  return target;
}

export function updatePresenterEnergySignal(
  signal: PresenterEnergySignal,
  measurement: PresenterEnergyMeasurement,
  deltaSeconds: number,
  prosody: PresenterProsodyState,
): void {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) return;
  const normalizedRms = clamp01((measurement.rms - 0.008) / 0.12);
  const normalizedPeak = clamp01((measurement.peak - 0.02) / 0.48);
  const targetLevel = clamp01(normalizedRms * 0.82 + normalizedPeak * 0.18);
  const lambda = targetLevel > signal.level ? 18 : 5.2;
  const alpha = 1 - Math.exp(-lambda * deltaSeconds);

  signal.active = true;
  signal.level += (targetLevel - signal.level) * alpha;
  signal.peak = Math.max(normalizedPeak, signal.peak * Math.exp(-7.5 * deltaSeconds));

  // Detect new vocal attacks against a slow baseline, then learn their spacing.
  const baselineLambda = targetLevel > prosody.baseline ? 1.35 : 0.72;
  prosody.baseline += (targetLevel - prosody.baseline)
    * (1 - Math.exp(-baselineLambda * deltaSeconds));
  prosody.onsetCooldownSeconds = Math.max(
    0,
    prosody.onsetCooldownSeconds - deltaSeconds,
  );
  prosody.secondsSinceOnset += deltaSeconds;

  const safeDelta = Math.max(1 / 240, deltaSeconds);
  const riseRate = Math.max(0, (targetLevel - prosody.previousTarget) / safeDelta);
  const prominence = clamp01((targetLevel - prosody.baseline - 0.035) / 0.32);
  const crest = clamp01((normalizedPeak - targetLevel - 0.06) / 0.36);
  const onsetStrength = clamp01(
    prominence * 0.68
      + clamp01(riseRate / 4.2) * 0.24
      + crest * 0.18,
  );
  const voiced = targetLevel > 0.075 || normalizedPeak > 0.12;
  if (targetLevel < 0.055 || targetLevel < prosody.baseline + 0.025) {
    prosody.onsetArmed = true;
  }
  const onset = voiced
    && prosody.onsetCooldownSeconds === 0
    && (prosody.onsetArmed || riseRate > 0.55)
    && onsetStrength >= 0.2;

  if (onset) {
    const interval = prosody.secondsSinceOnset;
    if (interval >= 0.22 && interval <= 1.65) {
      const intervalError = Math.abs(interval - prosody.cadenceIntervalSeconds)
        / Math.max(0.28, prosody.cadenceIntervalSeconds);
      const regularity = clamp01(1 - intervalError);
      prosody.cadenceConfidence += (
        regularity - prosody.cadenceConfidence
      ) * 0.48;
      prosody.cadenceIntervalSeconds += (
        interval - prosody.cadenceIntervalSeconds
      ) * 0.28;
    } else {
      prosody.cadenceConfidence = Math.max(0.12, prosody.cadenceConfidence * 0.72);
    }
    signal.emphasis = Math.max(signal.emphasis, 0.34 + onsetStrength * 0.66);
    prosody.onsetArmed = false;
    prosody.onsetCooldownSeconds = 0.14;
    prosody.secondsSinceOnset = 0;
  } else {
    signal.emphasis *= Math.exp(-6.2 * deltaSeconds);
  }

  if (prosody.secondsSinceOnset > Math.max(
    1.6,
    prosody.cadenceIntervalSeconds * 2.4,
  )) {
    prosody.cadenceConfidence *= Math.exp(-1.35 * deltaSeconds);
  }
  const cadenceAlive = prosody.secondsSinceOnset <= Math.max(
    0.9,
    prosody.cadenceIntervalSeconds * 1.8,
  );
  const cadenceTarget = cadenceAlive ? prosody.cadenceConfidence : 0;
  signal.cadence += (cadenceTarget - signal.cadence) * (
    1 - Math.exp(-(cadenceTarget > signal.cadence ? 5.2 : 1.8) * deltaSeconds)
  );
  prosody.previousTarget = targetLevel;

  if (signal.level < 0.0001) signal.level = 0;
  if (signal.peak < 0.0001) signal.peak = 0;
  if (signal.emphasis < 0.0001) signal.emphasis = 0;
  if (signal.cadence < 0.0001) signal.cadence = 0;
}

export async function startPresenterAudioMeter(
  signal: PresenterEnergySignal,
): Promise<PresenterAudioMeter | null> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return null;
  const AudioContextCtor = window.AudioContext
    ?? (window as WebkitAudioWindow).webkitAudioContext;
  if (!AudioContextCtor) return null;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      autoGainControl: false,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    },
    video: false,
  });

  let context: AudioContext | null = null;
  try {
    context = new AudioContextCtor({ latencyHint: 'interactive' });
    if (context.state === 'suspended') await context.resume();
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    if (context) void context.close().catch(() => undefined);
    throw error;
  }

  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);

  const samples = new Float32Array(analyser.fftSize);
  const measurement: PresenterEnergyMeasurement = { peak: 0, rms: 0 };
  const prosody = createPresenterProsodyState();
  let animationFrame = 0;
  let stopped = false;
  let previousTime = performance.now();
  signal.active = true;

  const sample = (now: number) => {
    if (stopped) return;
    analyser.getFloatTimeDomainData(samples);
    measurePresenterEnergy(samples, measurement);
    updatePresenterEnergySignal(
      signal,
      measurement,
      Math.min(0.1, Math.max(0, (now - previousTime) / 1_000)),
      prosody,
    );
    previousTime = now;
    animationFrame = window.requestAnimationFrame(sample);
  };
  animationFrame = window.requestAnimationFrame(sample);

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      window.cancelAnimationFrame(animationFrame);
      source.disconnect();
      analyser.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      resetPresenterEnergySignal(signal);
      void context.close().catch(() => undefined);
    },
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
