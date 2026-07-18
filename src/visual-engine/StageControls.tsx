import { Gauge, Mic, MicOff, Pause, Play, Send, Sparkles } from 'lucide-react';
import type { PresenterReceipt } from '../native/presenterBridge';
import type { StageIntentMatch } from './stageIntent';
import {
  getStageEventMeta,
  stageEvents,
  type StageEventId,
  type StageQuality,
  type StageState,
} from './stageScore';

interface StageControlsProps {
  canUseMic: boolean;
  lastIntent: StageIntentMatch | null;
  lastNativeReceipt: PresenterReceipt | null;
  listening: boolean;
  state: StageState;
  transcript: string;
  transcriptHistory: string[];
  onEvent: (eventId: StageEventId) => void;
  onQuality: (quality: StageQuality) => void;
  onSubmitTranscript: () => void;
  onToggleListening: () => void;
  onTranscriptChange: (value: string) => void;
}

export function StageControls({
  canUseMic,
  lastIntent,
  lastNativeReceipt,
  listening,
  state,
  transcript,
  transcriptHistory,
  onEvent,
  onQuality,
  onSubmitTranscript,
  onToggleListening,
  onTranscriptChange,
}: StageControlsProps) {
  return (
    <aside className="visual-engine-controls">
      <section className="panel-section">
        <div className="section-heading">
          <h2>Stage Score</h2>
          <Sparkles size={17} />
        </div>
        <div className="stage-event-grid">
          {stageEvents.map((event) => (
            <button
              className={event.id === state.activeEvent ? 'stage-event-button active' : 'stage-event-button'}
              key={event.id}
              type="button"
              onClick={() => onEvent(event.id)}
            >
              <span>{event.label}</span>
              <small>{event.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading">
          <h2>Engine State</h2>
          {state.activeEvent === 'hold' ? <Pause size={17} /> : <Play size={17} />}
        </div>
        <dl className="engine-state-list">
          <div>
            <dt>Active event</dt>
            <dd>{getStageEventMeta(state.activeEvent).label}</dd>
          </div>
          <div>
            <dt>Video speed</dt>
            <dd>{state.videoPlaybackRate.toFixed(2)}x</dd>
          </div>
          <div>
            <dt>Dynamic slot</dt>
            <dd>{state.dynamicChartVisible ? 'chart visible' : 'standing by'}</dd>
          </div>
          <div>
            <dt>Last intent</dt>
            <dd>{lastIntent ? `${lastIntent.label} / ${formatIntentSource(lastIntent.source)}` : 'none'}</dd>
          </div>
          <div>
            <dt>Native intake</dt>
            <dd>{lastNativeReceipt ? `accepted #${lastNativeReceipt.sequence}` : 'standing by'}</dd>
          </div>
        </dl>
      </section>

      <section className="panel-section stage-cue-panel">
        <div className="section-heading">
          <h2>Live Cue</h2>
          <button
            className={listening ? 'icon-button listening' : 'icon-button'}
            type="button"
            onClick={onToggleListening}
            disabled={!canUseMic}
            title={canUseMic ? 'Toggle microphone listening' : 'Speech recognition is not available in this browser'}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>
        <form
          className="stage-cue-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitTranscript();
          }}
        >
          <textarea
            value={transcript}
            onChange={(event) => onTranscriptChange(event.target.value)}
            placeholder='Try: "introduce you to Omnilux" or "show the year over year projections"'
            rows={3}
          />
          <button className="primary-button" type="submit">
            <Send size={16} />
            Score cue
          </button>
        </form>
        <div className="stage-intent-note">
          <span>{lastIntent ? lastIntent.phrase : 'waiting for cue'}</span>
          <strong>{lastIntent ? lastIntent.label : 'No stage intent detected'}</strong>
        </div>
        {transcriptHistory.length > 0 ? (
          <ol className="stage-history-list">
            {transcriptHistory.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ol>
        ) : null}
      </section>

      <section className="panel-section">
        <div className="section-heading">
          <h2>Quality Gate</h2>
          <Gauge size={17} />
        </div>
        <div className="quality-toggle" role="group" aria-label="Stage quality">
          <button
            className={state.quality === 'high' ? 'active' : ''}
            type="button"
            onClick={() => onQuality('high')}
          >
            High
          </button>
          <button
            className={state.quality === 'low' ? 'active' : ''}
            type="button"
            onClick={() => onQuality('low')}
          >
            Low
          </button>
        </div>
        <p className="quality-note">
          Low disables post-processing and reduces renderer load while keeping the score controllable.
        </p>
      </section>
    </aside>
  );
}

function formatIntentSource(source: StageIntentMatch['source']): string {
  return source.replace('_', ' ');
}
