import type { ShowMoment } from '../domain/showGraph';

interface TimelineProps {
  moments: ShowMoment[];
  activeMomentId: string;
  onSelect: (momentId: string) => void;
}

export function Timeline({ moments, activeMomentId, onSelect }: TimelineProps) {
  return (
    <nav className="timeline" aria-label="Presentation moments">
      {moments.map((moment) => (
        <button
          className={moment.id === activeMomentId ? 'timeline-step active' : 'timeline-step'}
          key={moment.id}
          type="button"
          onClick={() => onSelect(moment.id)}
        >
          <span>{String(moment.order + 1).padStart(2, '0')}</span>
          <strong>{moment.eyebrow}</strong>
        </button>
      ))}
    </nav>
  );
}

