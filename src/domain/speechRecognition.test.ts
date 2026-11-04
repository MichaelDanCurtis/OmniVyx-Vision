import { describe, expect, it } from 'vitest';
import {
  getSpeechRecognition,
  readSpeechRecognitionUpdate,
  type SpeechRecognitionCtor,
  type SpeechRecognitionResultLike,
} from './speechRecognition';

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

  it('reads only changed continuous-recognition results', () => {
    const results = [
      speechResult('An older accepted phrase', true),
      speechResult('introduce you to Omni', false),
    ];

    expect(readSpeechRecognitionUpdate({ resultIndex: 1, results })).toEqual({
      finalTranscript: '',
      interimTranscript: 'introduce you to Omni',
    });
  });

  it('separates final and interim segments from the same recognition update', () => {
    const results = [
      speechResult('show us the numbers', true),
      speechResult('and then', false),
    ];

    expect(readSpeechRecognitionUpdate({ resultIndex: 0, results })).toEqual({
      finalTranscript: 'show us the numbers',
      interimTranscript: 'and then',
    });
  });

  it('handles empty recognition updates', () => {
    expect(readSpeechRecognitionUpdate({ results: [] })).toEqual({
      finalTranscript: '',
      interimTranscript: '',
    });
  });
});

function speechResult(
  transcript: string,
  isFinal: boolean,
): SpeechRecognitionResultLike {
  return { 0: { transcript }, isFinal };
}
