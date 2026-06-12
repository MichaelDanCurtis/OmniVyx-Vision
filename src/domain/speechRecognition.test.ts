import { describe, expect, it } from 'vitest';
import { getSpeechRecognition, type SpeechRecognitionCtor } from './speechRecognition';

const NativeRecognition = function NativeRecognition() {} as unknown as SpeechRecognitionCtor;
const WebkitRecognition = function WebkitRecognition() {} as unknown as SpeechRecognitionCtor;

describe('speechRecognition', () => {
  it('prefers the standard SpeechRecognition constructor', () => {
    expect(
      getSpeechRecognition({
        SpeechRecognition: NativeRecognition,
        webkitSpeechRecognition: WebkitRecognition,
      }),
    ).toBe(NativeRecognition);
  });

  it('falls back to the webkit-prefixed constructor', () => {
    expect(getSpeechRecognition({ webkitSpeechRecognition: WebkitRecognition })).toBe(
      WebkitRecognition,
    );
  });

  it('returns null when speech recognition is unavailable', () => {
    expect(getSpeechRecognition({})).toBeNull();
    expect(getSpeechRecognition(null)).toBeNull();
  });
});
