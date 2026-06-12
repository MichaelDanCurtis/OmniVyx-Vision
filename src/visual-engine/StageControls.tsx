import { Gauge, Pause, Play, Sparkles } from 'lucide-react';
import {
  getStageEventMeta,
  stageEvents,
  type StageEventId,
  type StageQuality,
  type StageState,
} from './stageScore';

interface StageControlsProps {
  state: StageState;
  onEvent: (eventId: StageEventId) => void;
  onQuality: (quality: StageQuality) => void;
}

export function StageControls({ state, onEvent, onQuality }: StageControlsProps) {
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
        </dl>
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
