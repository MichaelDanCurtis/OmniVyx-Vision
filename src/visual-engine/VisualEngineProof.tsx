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
import {
  getSpeechRecognition,
  readSpeechRecognitionUpdate,
  type SpeechRecognitionLike,
} from '../domain/speechRecognition';
import {
  acceptPresenterSignal,
  type PresenterReceipt,
} from '../native/presenterBridge';
import { LaunchStage } from './LaunchStage';
import { StageControls } from './StageControls';
import {
  findStageIntent,
  findStageIntentPreview,
  type StageIntentMatch,
  type StageIntentPreview,
} from './stageIntent';
import {
  applyStageEvent,
  createInitialStageState,
  setStageQuality,
  type StageEventId,
  type StageQuality,
} from './stageScore';
import { omniVyxCinematicShow } from './cinematicScore';
import {
  enterPresentationViewport,
  exitPresentationViewport,
  PRESENTATION_CHROME_IDLE_MS,
  type PresentationViewportMode,
} from './presentationViewport';

export function VisualEngineProof() {
  const [stageState, setStageState] = useState(createInitialStageState);
  const [transcript, setTranscript] = useState('');
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);
  const [lastIntent, setLastIntent] = useState<StageIntentMatch | null>(null);
  const [previewIntent, setPreviewIntent] = useState<StageIntentPreview | null>(null);
  const [lastNativeReceipt, setLastNativeReceipt] = useState<PresenterReceipt | null>(null);
  const [listening, setListening] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [presentationChromeVisible, setPresentationChromeVisible] = useState(false);
  const [presentationViewport, setPresentationViewport] = useState<
    PresentationViewportMode | 'inline'
  >('inline');
  const [presenterPulse, setPresenterPulse] = useState(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioMeterRef = useRef<PresenterAudioMeter | null>(null);
  const listeningRef = useRef(false);
  const listeningGenerationRef = useRef(0);
  const presentationChromeTimerRef = useRef<number | null>(null);
  const presentationGenerationRef = useRef(0);
  const presentationReturnFocusRef = useRef<HTMLElement | null>(null);
  const presentationViewportRef = useRef<PresentationViewportMode>('css');
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
    if (presentationChromeTimerRef.current !== null) {
      window.clearTimeout(presentationChromeTimerRef.current);
      presentationChromeTimerRef.current = null;
    }
    presentationGenerationRef.current += 1;
    void exitPresentationViewport(presentationViewportRef.current);
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
    if (!presenting) {
      setPresentationChromeVisible(false);
      return undefined;
    }

    const hideChrome = () => {
      presentationChromeTimerRef.current = null;
      setPresentationChromeVisible(false);
    };
    const revealChrome = () => {
      setPresentationChromeVisible(true);
      if (presentationChromeTimerRef.current !== null) {
        window.clearTimeout(presentationChromeTimerRef.current);
      }
      presentationChromeTimerRef.current = window.setTimeout(
        hideChrome,
        PRESENTATION_CHROME_IDLE_MS,
      );
    };

    setPresentationChromeVisible(false);
    window.addEventListener('pointermove', revealChrome, { passive: true });
    document.addEventListener('focusin', revealChrome);
    return () => {
      window.removeEventListener('pointermove', revealChrome);
      document.removeEventListener('focusin', revealChrome);
      if (presentationChromeTimerRef.current !== null) {
        window.clearTimeout(presentationChromeTimerRef.current);
        presentationChromeTimerRef.current = null;
      }
    };
  }, [presenting]);

  useEffect(() => {
    if (!presenting) return undefined;
    const handlePresentationKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopPresentation();
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        document.querySelector<HTMLButtonElement>('.stage-presentation-toggle')?.focus();
        return;
      }

      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      pulsePresenter();
      setPreviewIntent(null);
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

  useEffect(() => {
    if (!presenting || presentationViewport !== 'browser') return undefined;
    const handleFullscreenChange = () => {
      if ('fullscreenElement' in document && !document.fullscreenElement) {
        presentationViewportRef.current = 'css';
        setPresentationViewport('css');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [presentationViewport, presenting]);

  function handleEvent(eventId: StageEventId) {
    pulsePresenter();
    setPreviewIntent(null);
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
    setPreviewIntent(null);
    setTranscriptHistory((current) => [trimmed, ...current].slice(0, 4));
    setTranscript('');

    if (intent) {
      setStageState((current) => applyStageEvent(current, intent.eventId));
    }
  }

  function updateIntentPreview(value: string) {
    const currentStage = stageStateRef.current;
    const preview = findStageIntentPreview(
      value,
      currentStage.activeEvent,
      currentStage.previousEvent,
    );
    setPreviewIntent(
      preview && preview.eventId !== currentStage.activeEvent ? preview : null,
    );
  }

  function handleTranscriptChange(value: string) {
    setTranscript(value);
    updateIntentPreview(value);
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
    nextRecognition.interimResults = true;
    nextRecognition.onresult = (event) => {
      const update = readSpeechRecognitionUpdate(event);
      if (update.finalTranscript) {
        submitTranscript(update.finalTranscript);
        return;
      }
      if (update.interimTranscript) {
        handleTranscriptChange(update.interimTranscript);
      } else {
        setPreviewIntent(null);
      }
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
    setPreviewIntent(null);
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

  function startPresentation() {
    const generation = presentationGenerationRef.current + 1;
    presentationGenerationRef.current = generation;
    presentationReturnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    presentationViewportRef.current = 'css';
    setPresentationViewport('css');
    setPresentationChromeVisible(false);
    setPresenting(true);
    void enterPresentationViewport().then((mode) => {
      if (presentationGenerationRef.current !== generation) {
        void exitPresentationViewport(mode);
        return;
      }
      presentationViewportRef.current = mode;
      setPresentationViewport(mode);
    });
  }

  function stopPresentation() {
    presentationGenerationRef.current += 1;
    const mode = presentationViewportRef.current;
    presentationViewportRef.current = 'css';
    setPresentationChromeVisible(false);
    setPresentationViewport('inline');
    setPresenting(false);
    void exitPresentationViewport(mode);
    const returnFocus = presentationReturnFocusRef.current;
    presentationReturnFocusRef.current = null;
    window.setTimeout(() => returnFocus?.focus(), 0);
  }

  function togglePresentation() {
    if (presenting) stopPresentation();
    else startPresentation();
  }

  return (
    <section
      className={presenting ? 'visual-engine-proof presenting' : 'visual-engine-proof'}
      aria-label={presenting ? 'Audience presentation' : undefined}
      aria-modal={presenting || undefined}
      data-presentation-chrome={presentationChromeVisible ? 'visible' : 'hidden'}
      data-presentation-viewport={presentationViewport}
      role={presenting ? 'dialog' : undefined}
    >
      <div className="visual-engine-layout">
        <LaunchStage
          presenterEnergy={presenterEnergy}
          presenterPulse={presenterPulse}
          previewIntent={previewIntent}
          presenting={presenting}
          state={stageState}
          onTogglePresenting={togglePresentation}
        />
        <StageControls
          canUseMic={canUseMic}
          lastIntent={lastIntent}
          lastNativeReceipt={lastNativeReceipt}
          listening={listening}
          previewIntent={previewIntent}
          state={stageState}
          transcript={transcript}
          transcriptHistory={transcriptHistory}
          onEvent={handleEvent}
          onQuality={handleQuality}
          onSubmitTranscript={submitTranscript}
          onToggleListening={toggleListening}
          onTranscriptChange={handleTranscriptChange}
        />
      </div>
    </section>
  );
}

function createSignalId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `signal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
