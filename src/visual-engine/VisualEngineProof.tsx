import { useEffect, useRef, useState } from 'react';
import {
  createPresenterEnergySignal,
  kickPresenterEnergySignal,
  releasePresenterEnergySignal,
  resetPresenterEnergySignal,
  startPresenterAudioMeter,
  type PresenterAudioMeter,
  type PresenterEnergySignal,
} from '../domain/presenterAudio';
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
import { omniVyxCinematicShow } from './cinematicScore';

export function VisualEngineProof() {
  const [stageState, setStageState] = useState(createInitialStageState);
  const [transcript, setTranscript] = useState('');
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);
  const [lastIntent, setLastIntent] = useState<StageIntentMatch | null>(null);
  const [lastNativeReceipt, setLastNativeReceipt] = useState<PresenterReceipt | null>(null);
  const [listening, setListening] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [presenterPulse, setPresenterPulse] = useState(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioMeterRef = useRef<PresenterAudioMeter | null>(null);
  const listeningRef = useRef(false);
  const listeningGenerationRef = useRef(0);
  const presenterKickTimerRef = useRef<number | null>(null);
  const stageStateRef = useRef(stageState);
  const presenterEnergyRef = useRef<PresenterEnergySignal | null>(null);
  if (!presenterEnergyRef.current) {
    presenterEnergyRef.current = createPresenterEnergySignal();
  }
  const presenterEnergy = presenterEnergyRef.current;
  stageStateRef.current = stageState;
  const canUseMic = typeof window !== 'undefined' && getSpeechRecognition() !== null;

  useEffect(() => () => {
    listeningGenerationRef.current += 1;
    if (presenterKickTimerRef.current !== null) {
      window.clearTimeout(presenterKickTimerRef.current);
      presenterKickTimerRef.current = null;
    }
    listeningRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.stop();
    }
    audioMeterRef.current?.stop();
    audioMeterRef.current = null;
    resetPresenterEnergySignal(presenterEnergy);
  }, []);

  useEffect(() => {
    if (!presenting) return undefined;
    const handlePresentationKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPresenting(false);
        return;
      }

      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      pulsePresenter();
      setStageState((current) => {
        const order = omniVyxCinematicShow.cueOrder;
        const currentIndex = order.indexOf(current.activeEvent);
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = Math.min(order.length - 1, Math.max(0, currentIndex + direction));
        return applyStageEvent(current, order[nextIndex]);
      });
    };
    window.addEventListener('keydown', handlePresentationKey);
    return () => window.removeEventListener('keydown', handlePresentationKey);
  }, [presenting]);

  function handleEvent(eventId: StageEventId) {
    pulsePresenter();
    setStageState((current) => applyStageEvent(current, eventId));
  }

  function handleQuality(quality: StageQuality) {
    setStageState((current) => setStageQuality(current, quality));
  }

  function submitTranscript(value = transcript) {
    const trimmed = value.trim();
    if (!trimmed) return;

    const currentStage = stageStateRef.current;
    const intent = findStageIntent(trimmed, currentStage.activeEvent, currentStage.previousEvent);
    const occurredAtMs = Date.now();
    pulsePresenter();
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
    if (listeningRef.current) {
      stopPresenterInputs();
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
    nextRecognition.onend = () => {
      if (recognitionRef.current === nextRecognition) stopPresenterInputs(false);
    };

    try {
      nextRecognition.start();
      const generation = listeningGenerationRef.current + 1;
      listeningGenerationRef.current = generation;
      recognitionRef.current = nextRecognition;
      listeningRef.current = true;
      setListening(true);
      void startPresenterAudioMeter(presenterEnergy)
        .then((meter) => {
          if (!meter) return;
          if (
            listeningGenerationRef.current !== generation
            || !listeningRef.current
          ) {
            meter.stop();
            return;
          }
          audioMeterRef.current?.stop();
          audioMeterRef.current = meter;
        })
        .catch(() => undefined);
    } catch {
      recognitionRef.current = null;
      listeningRef.current = false;
      setListening(false);
    }
  }

  function stopPresenterInputs(stopRecognition = true) {
    listeningGenerationRef.current += 1;
    listeningRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (stopRecognition && recognition) {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.stop();
    }
    audioMeterRef.current?.stop();
    audioMeterRef.current = null;
    resetPresenterEnergySignal(presenterEnergy);
    setListening(false);
  }

  function pulsePresenter() {
    setPresenterPulse((current) => current + 1);
    if (presenterEnergy.active) return;
    kickPresenterEnergySignal(presenterEnergy);
    if (presenterKickTimerRef.current !== null) {
      window.clearTimeout(presenterKickTimerRef.current);
    }
    presenterKickTimerRef.current = window.setTimeout(() => {
      presenterKickTimerRef.current = null;
      if (!presenterEnergy.active) releasePresenterEnergySignal(presenterEnergy);
    }, 220);
  }

  return (
    <section className={presenting ? 'visual-engine-proof presenting' : 'visual-engine-proof'}>
      <div className="visual-engine-layout">
        <LaunchStage
          presenterEnergy={presenterEnergy}
          presenterPulse={presenterPulse}
          presenting={presenting}
          state={stageState}
          onTogglePresenting={() => setPresenting((current) => !current)}
        />
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
