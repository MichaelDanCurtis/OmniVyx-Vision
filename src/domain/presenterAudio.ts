export interface PresenterEnergyMeasurement {
  peak: number;
  rms: number;
}

export interface PresenterEnergySignal {
  active: boolean;
  level: number;
  peak: number;
}

export interface PresenterAudioMeter {
  stop: () => void;
}

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export function createPresenterEnergySignal(): PresenterEnergySignal {
  return { active: false, level: 0, peak: 0 };
}

export function resetPresenterEnergySignal(signal: PresenterEnergySignal): void {
  signal.active = false;
  signal.level = 0;
  signal.peak = 0;
}

export function kickPresenterEnergySignal(
  signal: PresenterEnergySignal,
  level = 0.86,
): void {
  if (!Number.isFinite(level)) return;
  const normalized = clamp01(level);
  signal.level = Math.max(signal.level, normalized);
  signal.peak = Math.max(signal.peak, normalized);
}

export function releasePresenterEnergySignal(signal: PresenterEnergySignal): void {
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
  if (signal.level < 0.0001) signal.level = 0;
  if (signal.peak < 0.0001) signal.peak = 0;
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
