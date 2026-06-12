import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';

interface ControlsProps {
  isHolding: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onRestart: () => void;
  onToggleHold: () => void;
}

export function Controls({
  isHolding,
  onPrevious,
  onNext,
  onRestart,
  onToggleHold,
}: ControlsProps) {
  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>Fallback Controls</h2>
      </div>
      <div className="control-grid">
        <button className="control-button" type="button" onClick={onPrevious}>
          <ChevronLeft size={18} />
          Back
        </button>
        <button className="control-button" type="button" onClick={onToggleHold}>
          {isHolding ? <Play size={18} /> : <Pause size={18} />}
          {isHolding ? 'Resume' : 'Hold'}
        </button>
        <button className="control-button" type="button" onClick={onNext}>
          <ChevronRight size={18} />
          Next
        </button>
        <button className="control-button wide" type="button" onClick={onRestart}>
          <RotateCcw size={18} />
          Restart
        </button>
      </div>
    </section>
  );
}

