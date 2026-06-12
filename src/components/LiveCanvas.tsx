import type { RuntimeState } from '../domain/runtime';
import type { ShowGraph, ShowMoment } from '../domain/showGraph';

interface LiveCanvasProps {
  show: ShowGraph;
  moment: ShowMoment;
  runtime: RuntimeState;
}

export function LiveCanvas({ show, moment, runtime }: LiveCanvasProps) {
  const isOcean = moment.tone === 'ocean';

  return (
    <section className="live-canvas" data-tone={moment.tone}>
      <div className="canvas-grid" />
      <div className="ambient-ring ring-one" />
      <div className="ambient-ring ring-two" />
      {isOcean ? (
        <div className="ocean-scene" aria-hidden="true">
          <div className="ocean-sky" />
          <div className="ocean-horizon" />
          <div className="ocean-water" />
          <div className="silk silk-one" />
          <div className="silk silk-two" />
          <div className="silk silk-three" />
          <div className="mist mist-front" />
          <div className="mist mist-rear" />
        </div>
      ) : null}

      <div className="canvas-copy">
        <p className="eyebrow">{moment.eyebrow}</p>
        <h2>{moment.title}</h2>
        <p>{moment.subtitle}</p>
      </div>

      <div className="visual-system">
        <div className="presenter-figure" />
        <div className="voice-arc" />
        <div className="artifact-map">
          {moment.visualKeywords.map((keyword, index) => (
            <span
              className="artifact-node"
              key={keyword}
              style={{ '--node-index': index } as React.CSSProperties}
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>

      <div className="canvas-status">
        <span>{runtime.isHolding ? 'holding on cue' : 'active moment'}</span>
        <strong>{show.moments.findIndex((item) => item.id === moment.id) + 1}/{show.moments.length}</strong>
      </div>

      <div className="detection-panel">
        <span>Heard / intent</span>
        <p>
          {runtime.lastCommand
            ? `${runtime.lastCommand.label}: "${runtime.lastCommand.phrase}"`
            : runtime.lastCue
              ? `Cue matched: "${runtime.lastCue.phrase}"`
              : moment.speakerLine}
        </p>
      </div>
    </section>
  );
}
