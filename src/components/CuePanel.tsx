import type { ShowGraph } from '../domain/showGraph';

interface CuePanelProps {
  show: ShowGraph;
  onJump: (momentId: string) => void;
}

export function CuePanel({ show, onJump }: CuePanelProps) {
  return (
    <section className="panel-section cue-panel">
      <div className="section-heading">
        <h2>Cue Map</h2>
      </div>
      <div className="cue-list">
        {show.moments.map((moment) => (
          <button
            className="cue-item"
            key={moment.id}
            type="button"
            onClick={() => onJump(moment.id)}
          >
            <span>{moment.eyebrow}</span>
            <strong>{moment.cuePhrases[0]}</strong>
          </button>
        ))}
      </div>
      <div className="command-strip">
        {show.commands.slice(0, 5).map((command) => (
          <span key={`${command.type}-${command.label}`}>{command.phrases[0]}</span>
        ))}
      </div>
    </section>
  );
}

