import { useState } from 'react';
import { getSpeechRecognition, type SpeechRecognitionLike } from '../domain/speechRecognition';
import {
  acceptPresenterSignal,
  type PresenterReceipt,
} from '../native/presenterBridge';
import { LaunchStage } from './LaunchStage';
import { StageControls } from './StageControls';
import { findStageIntent, type StageIntentMatch } from './stageIntent';
import {
  applyStageEvent,
  createInitialStageState,
  setStageQuality,
  type StageEventId,
  type StageQuality,
} from './stageScore';

export function VisualEngineProof() {
  const [stageState, setStageState] = useState(createInitialStageState);
  const [transcript, setTranscript] = useState('');
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);
  const [lastIntent, setLastIntent] = useState<StageIntentMatch | null>(null);
  const [lastNativeReceipt, setLastNativeReceipt] = useState<PresenterReceipt | null>(null);
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognitionLike | null>(null);
  const canUseMic = typeof window !== 'undefined' && getSpeechRecognition() !== null;

  function handleEvent(eventId: StageEventId) {
    setStageState((current) => applyStageEvent(current, eventId));
  }

  function handleQuality(quality: StageQuality) {
    setStageState((current) => setStageQuality(current, quality));
  }

  function submitTranscript(value = transcript) {
    const trimmed = value.trim();
    if (!trimmed) return;

    const intent = findStageIntent(trimmed, stageState.activeEvent, stageState.previousEvent);
    const occurredAtMs = Date.now();
    void acceptPresenterSignal({
      signalId: createSignalId(),
      showId: 'omnivyx-launch-proof',
      kind: intent ? 'intentCandidate' : 'transcriptFinal',
      transcript: trimmed,
      occurredAtMs,
    })
      .then((receipt) => {
        if (receipt) setLastNativeReceipt(receipt);
      })
      .catch(() => undefined);

    setLastIntent(intent);
    setTranscriptHistory((current) => [trimmed, ...current].slice(0, 4));
    setTranscript('');

    if (intent) {
      setStageState((current) => applyStageEvent(current, intent.eventId));
    }
  }

  function toggleListening() {
    if (listening) {
      recognition?.stop();
      setListening(false);
      return;
    }

    const Recognition = getSpeechRecognition();
    if (!Recognition) return;

    const nextRecognition = new Recognition();
    nextRecognition.continuous = true;
    nextRecognition.interimResults = false;
    nextRecognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1];
      const spoken = latest?.[0]?.transcript?.trim();
      if (spoken) submitTranscript(spoken);
    };
    nextRecognition.onend = () => setListening(false);

    try {
      nextRecognition.start();
      setRecognition(nextRecognition);
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  return (
    <section className="visual-engine-proof">
      <div className="visual-engine-layout">
        <LaunchStage state={stageState} />
        <StageControls
          canUseMic={canUseMic}
          lastIntent={lastIntent}
          lastNativeReceipt={lastNativeReceipt}
          listening={listening}
          state={stageState}
          transcript={transcript}
          transcriptHistory={transcriptHistory}
          onEvent={handleEvent}
          onQuality={handleQuality}
          onSubmitTranscript={submitTranscript}
          onToggleListening={toggleListening}
          onTranscriptChange={setTranscript}
        />
      </div>
    </section>
  );
}

function createSignalId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `signal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
