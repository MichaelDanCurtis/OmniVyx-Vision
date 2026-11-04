export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
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

function getDefaultSpeechRecognitionHost(): SpeechRecognitionHost | null {
  if (typeof window === 'undefined') return null;
  return window as typeof window & SpeechRecognitionHost;
}
