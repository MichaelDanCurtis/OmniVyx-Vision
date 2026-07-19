export interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}

export interface SpeechRecognitionEventLike {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionUpdate {
  finalTranscript: string;
  interimTranscript: string;
}

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export interface SpeechRecognitionHost {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

export function getSpeechRecognition(
  host: SpeechRecognitionHost | null = getDefaultSpeechRecognitionHost(),
): SpeechRecognitionCtor | null {
  if (!host) return null;
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

export function readSpeechRecognitionUpdate(
  event: SpeechRecognitionEventLike,
): SpeechRecognitionUpdate {
  if (event.results.length === 0) {
    return { finalTranscript: '', interimTranscript: '' };
  }

  const startIndex = Math.min(
    event.results.length - 1,
    Math.max(0, event.resultIndex ?? event.results.length - 1),
  );
  const finalSegments: string[] = [];
  const interimSegments: string[] = [];

  for (let index = startIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const transcript = result?.[0]?.transcript?.trim();
    if (!transcript) continue;
    if (result.isFinal) finalSegments.push(transcript);
    else interimSegments.push(transcript);
  }

  return {
    finalTranscript: finalSegments.join(' ').trim(),
    interimTranscript: interimSegments.join(' ').trim(),
  };
}

function getDefaultSpeechRecognitionHost(): SpeechRecognitionHost | null {
  if (typeof window === 'undefined') return null;
  return window as typeof window & SpeechRecognitionHost;
}
