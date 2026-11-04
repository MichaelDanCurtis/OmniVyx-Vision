export interface KineticHeadlineWord {
  emphasized: boolean;
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

export const typographySignatures = [
  'listening_monument',
  'product_lockup',
  'vector_split',
  'organic_rise',
  'evidence_precision',
  'quiet_statement',
  'finale_convergence',
] as const;

export type TypographySignature = (typeof typographySignatures)[number];

export function buildKineticHeadline(
  headlineLines: readonly string[],
  emphasisWords: readonly string[] = [],
): readonly KineticHeadlineLine[] {
  let globalIndex = 0;
  const emphasis = new Set(emphasisWords.map(normalizeKineticWord).filter(Boolean));

  return headlineLines.map((text, lineIndex) => ({
    index: lineIndex,
    text,
    words: text.trim().split(/\s+/).map((word, wordIndex) => ({
      emphasized: emphasis.has(normalizeKineticWord(word)),
      globalIndex: globalIndex++,
      index: wordIndex,
      text: word,
    })),
  }));
}

export function normalizeKineticWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
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
  emphasis = 0,
  cadence = 0,
): KineticSpeechStyle {
  const boundedLevel = clamp01(level);
  const boundedPeak = clamp01(peak);
  const boundedEmphasis = clamp01(emphasis);
  const boundedCadence = clamp01(cadence);

  target.brightness = (
    1 + boundedLevel * 0.14 + boundedEmphasis * 0.08 + boundedCadence * 0.02
  ).toFixed(3);
  target.glint = clamp(
    0.08
      + boundedLevel * 0.36
      + boundedPeak * 0.12
      + boundedEmphasis * 0.18
      + boundedCadence * 0.05,
    0.08,
    0.62,
  ).toFixed(3);
  target.glintPosition = `${Math.round(
    34 + boundedPeak * 24 + boundedEmphasis * 12 + boundedCadence * 4,
  )}%`;
  target.lift = `${(
    -boundedLevel * 0.014 - boundedEmphasis * 0.008 - boundedCadence * 0.002
  ).toFixed(4)}em`;
  target.scale = (
    1 + boundedPeak * 0.003 + boundedEmphasis * 0.006 + boundedCadence * 0.001
  ).toFixed(4);
  return target;
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
