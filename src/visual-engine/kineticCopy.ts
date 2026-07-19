export interface KineticHeadlineWord {
  globalIndex: number;
  index: number;
  text: string;
}

export interface KineticHeadlineLine {
  index: number;
  text: string;
  words: readonly KineticHeadlineWord[];
}

export interface KineticSpeechStyle {
  brightness: string;
  glint: string;
  glintPosition: string;
  lift: string;
  scale: string;
}

export function buildKineticHeadline(
  headlineLines: readonly string[],
): readonly KineticHeadlineLine[] {
  let globalIndex = 0;

  return headlineLines.map((text, lineIndex) => ({
    index: lineIndex,
    text,
    words: text.trim().split(/\s+/).map((word, wordIndex) => ({
      globalIndex: globalIndex++,
      index: wordIndex,
      text: word,
    })),
  }));
}

export function resolveKineticSpeechStyle(level: number, peak: number): KineticSpeechStyle {
  return writeKineticSpeechStyle(level, peak, {
    brightness: '',
    glint: '',
    glintPosition: '',
    lift: '',
    scale: '',
  });
}

export function writeKineticSpeechStyle(
  level: number,
  peak: number,
  target: KineticSpeechStyle,
): KineticSpeechStyle {
  const boundedLevel = clamp01(level);
  const boundedPeak = clamp01(peak);

  target.brightness = (1 + boundedLevel * 0.18).toFixed(3);
  target.glint = clamp(
    0.08 + boundedLevel * 0.44 + boundedPeak * 0.16,
    0.08,
    0.58,
  ).toFixed(3);
  target.glintPosition = `${Math.round(34 + boundedPeak * 32)}%`;
  target.lift = `${(-boundedLevel * 0.018).toFixed(4)}em`;
  target.scale = (1 + boundedPeak * 0.006).toFixed(4);
  return target;
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
