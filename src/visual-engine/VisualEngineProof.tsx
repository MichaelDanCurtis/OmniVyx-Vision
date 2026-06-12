import { useState } from 'react';
import { LaunchStage } from './LaunchStage';
import { StageControls } from './StageControls';
import {
  applyStageEvent,
  createInitialStageState,
  setStageQuality,
  type StageEventId,
  type StageQuality,
} from './stageScore';

export function VisualEngineProof() {
  const [stageState, setStageState] = useState(createInitialStageState);

  function handleEvent(eventId: StageEventId) {
    setStageState((current) => applyStageEvent(current, eventId));
  }

  function handleQuality(quality: StageQuality) {
    setStageState((current) => setStageQuality(current, quality));
  }

  return (
    <section className="visual-engine-proof">
      <div className="visual-engine-layout">
        <LaunchStage state={stageState} />
        <StageControls state={stageState} onEvent={handleEvent} onQuality={handleQuality} />
      </div>
    </section>
  );
}
