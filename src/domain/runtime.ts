import { findCommandMatch, findCueMatch, type CommandMatch, type CueMatch } from './cueEngine';
import type { ShowGraph } from './showGraph';

export interface RuntimeState {
  activeMomentId: string;
  isHolding: boolean;
  transcriptHistory: string[];
  lastCue: CueMatch | null;
  lastCommand: CommandMatch | null;
}

export type RuntimeAction =
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'restart' }
  | { type: 'toggleHold' }
  | { type: 'jump'; momentId: string }
  | { type: 'heard'; transcript: string };

export function createInitialRuntime(show: ShowGraph): RuntimeState {
  return {
    activeMomentId: show.moments[0]?.id ?? '',
    isHolding: false,
    transcriptHistory: [],
    lastCue: null,
    lastCommand: null,
  };
}

export function runtimeReducer(
  state: RuntimeState,
  action: RuntimeAction,
  show: ShowGraph,
): RuntimeState {
  switch (action.type) {
    case 'next':
      return moveBy(state, show, 1);
    case 'previous':
      return moveBy(state, show, -1);
    case 'restart':
      return {
        ...state,
        activeMomentId: show.moments[0]?.id ?? state.activeMomentId,
        isHolding: false,
        lastCue: null,
        lastCommand: { type: 'restart', phrase: 'manual restart', label: 'Restart show' },
      };
    case 'toggleHold':
      return {
        ...state,
        isHolding: !state.isHolding,
        lastCommand: { type: 'hold', phrase: 'manual hold', label: state.isHolding ? 'Resume' : 'Hold here' },
      };
    case 'jump':
      return jumpTo(state, show, action.momentId, null, {
        type: 'jump',
        phrase: 'manual jump',
        label: 'Manual jump',
        targetMomentId: action.momentId,
      });
    case 'heard':
      return applyTranscript(state, show, action.transcript);
    default:
      return state;
  }
}

function applyTranscript(state: RuntimeState, show: ShowGraph, transcript: string): RuntimeState {
  const history = [transcript, ...state.transcriptHistory].slice(0, 8);
  const command = findCommandMatch(transcript, show.commands);

  if (command) {
    if (command.type === 'next') {
      return { ...moveBy(state, show, 1), transcriptHistory: history, lastCommand: command, lastCue: null };
    }
    if (command.type === 'previous') {
      return { ...moveBy(state, show, -1), transcriptHistory: history, lastCommand: command, lastCue: null };
    }
    if (command.type === 'hold') {
      return { ...state, isHolding: true, transcriptHistory: history, lastCommand: command, lastCue: null };
    }
    if (command.type === 'restart') {
      return {
        ...state,
        activeMomentId: show.moments[0]?.id ?? state.activeMomentId,
        isHolding: false,
        transcriptHistory: history,
        lastCommand: command,
        lastCue: null,
      };
    }
    if (command.type === 'jump' && command.targetMomentId) {
      return { ...jumpTo(state, show, command.targetMomentId, null, command), transcriptHistory: history };
    }
  }

  const cue = findCueMatch(transcript, show.moments);
  if (cue) {
    return { ...jumpTo(state, show, cue.momentId, cue, null), transcriptHistory: history };
  }

  return {
    ...state,
    transcriptHistory: history,
    lastCue: null,
    lastCommand: null,
  };
}

function moveBy(state: RuntimeState, show: ShowGraph, delta: number): RuntimeState {
  const currentIndex = show.moments.findIndex((moment) => moment.id === state.activeMomentId);
  const nextIndex = clamp(currentIndex + delta, 0, Math.max(0, show.moments.length - 1));
  return {
    ...state,
    activeMomentId: show.moments[nextIndex]?.id ?? state.activeMomentId,
    isHolding: false,
    lastCue: null,
  };
}

function jumpTo(
  state: RuntimeState,
  show: ShowGraph,
  momentId: string,
  cue: CueMatch | null,
  command: CommandMatch | null,
): RuntimeState {
  const target = show.moments.find((moment) => moment.id === momentId);
  if (!target) return state;
  return {
    ...state,
    activeMomentId: target.id,
    isHolding: false,
    lastCue: cue,
    lastCommand: command,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

