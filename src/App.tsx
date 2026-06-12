import { useMemo, useReducer, useState } from 'react';
import { Mic, MicOff, RotateCcw, Send } from 'lucide-react';
import { Controls } from './components/Controls';
import { CuePanel } from './components/CuePanel';
import { LiveCanvas } from './components/LiveCanvas';
import { Timeline } from './components/Timeline';
import { createInitialRuntime, runtimeReducer } from './domain/runtime';
import { getMoment, omniVyxShow } from './domain/showGraph';
import { VisualEngineProof } from './visual-engine/VisualEngineProof';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function App() {
  const [surface, setSurface] = useState<'visual-engine' | 'presenter'>('visual-engine');

  return (
    <main className="app-shell" data-surface={surface}>
      <header className="topbar">
        <div>
          <p className="eyebrow">OmniVyx</p>
          <h1>{surface === 'visual-engine' ? 'Visual Engine' : omniVyxShow.title}</h1>
        </div>
        <nav className="surface-switcher" aria-label="OmniVyx surfaces">
          <button
            className={surface === 'visual-engine' ? 'active' : ''}
            type="button"
            onClick={() => setSurface('visual-engine')}
          >
            Visual Engine
          </button>
          <button
            className={surface === 'presenter' ? 'active' : ''}
            type="button"
            onClick={() => setSurface('presenter')}
          >
            Presenter MVP
          </button>
        </nav>
      </header>

      {surface === 'visual-engine' ? <VisualEngineProof /> : <PresenterMvp />}
    </main>
  );
}

function PresenterMvp() {
  const show = omniVyxShow;
  const [runtime, dispatch] = useReducer(
    (state: ReturnType<typeof createInitialRuntime>, action: Parameters<typeof runtimeReducer>[1]) =>
      runtimeReducer(state, action, show),
    show,
    createInitialRuntime,
  );
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognitionLike | null>(null);
  const activeMoment = useMemo(
    () => getMoment(show, runtime.activeMomentId),
    [runtime.activeMomentId, show],
  );
  const canUseMic = typeof window !== 'undefined' && getSpeechRecognition() !== null;

  function submitTranscript(value = transcript) {
    const trimmed = value.trim();
    if (!trimmed) return;
    dispatch({ type: 'heard', transcript: trimmed });
    setTranscript('');
  }

  function toggleMic() {
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
    nextRecognition.start();
    setRecognition(nextRecognition);
    setListening(true);
  }

  return (
    <>
      <section className="presenter-status-row">
        <div className="topbar-status">
          <span className={listening ? 'status-dot listening' : 'status-dot'} />
          <span>{listening ? 'listening' : runtime.isHolding ? 'holding' : 'ready'}</span>
        </div>
      </section>

      <section className="presenter-layout">
        <LiveCanvas show={show} moment={activeMoment} runtime={runtime} />

        <aside className="operator-panel">
          <Controls
            isHolding={runtime.isHolding}
            onPrevious={() => dispatch({ type: 'previous' })}
            onNext={() => dispatch({ type: 'next' })}
            onRestart={() => dispatch({ type: 'restart' })}
            onToggleHold={() => dispatch({ type: 'toggleHold' })}
          />

          <section className="panel-section transcript-section">
            <div className="section-heading">
              <h2>Voice / Cue Input</h2>
              <button
                className="icon-button"
                type="button"
                onClick={toggleMic}
                disabled={!canUseMic}
                title={canUseMic ? 'Toggle microphone listening' : 'Speech recognition is not available in this browser'}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </div>
            <form
              className="transcript-form"
              onSubmit={(event) => {
                event.preventDefault();
                submitTranscript();
              }}
            >
              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder='Try: "It is a living visual stage" or "Hey Codex, next"'
                rows={4}
              />
              <button className="primary-button" type="submit">
                <Send size={16} />
                Send cue
              </button>
            </form>
            <button
              className="ghost-button full"
              type="button"
              onClick={() => {
                setTranscript('');
                dispatch({ type: 'restart' });
              }}
            >
              <RotateCcw size={16} />
              Reset run
            </button>
          </section>

          <CuePanel show={show} onJump={(momentId) => dispatch({ type: 'jump', momentId })} />
        </aside>
      </section>

      <Timeline
        moments={show.moments}
        activeMomentId={runtime.activeMomentId}
        onSelect={(momentId) => dispatch({ type: 'jump', momentId })}
      />
    </>
  );
}
