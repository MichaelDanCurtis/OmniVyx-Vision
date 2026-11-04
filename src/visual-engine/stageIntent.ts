import { normalizePhrase } from '../domain/cueEngine';
import { getStageEventMeta, type StageEventId } from './stageScore';

export type StageIntentSource =
  | 'stage_phrase'
  | 'next_command'
  | 'previous_command'
  | 'hold_command';

export interface StageIntentMatch {
  eventId: StageEventId;
  label: string;
  phrase: string;
  source: StageIntentSource;
}

export interface StageIntentPreview extends StageIntentMatch {
  complete: boolean;
  confidence: number;
}

const stageOrder: StageEventId[] = [
  'open_brand',
  'reveal_product',
  'explain_value',
  'grow_system',
  'summon_dynamic_chart',
  'resolve',
];

const holdPhrases = ['hold here', 'pause here', 'take a moment', 'stay here'];
const nextPhrases = ['next slide', 'next scene', 'move on', 'keep going', 'go next'];
const previousPhrases = ['go back', 'previous slide', 'previous scene', 'back up'];

const stagePhraseMap: Array<{ eventId: StageEventId; phrases: string[] }> = [
  {
    eventId: 'open_brand',
    phrases: ['company name', 'start the show', 'open brand', 'introduce the company'],
  },
  {
    eventId: 'reveal_product',
    phrases: ['introduce you to omnilux', 'new product', 'product announcement', 'reveal product'],
  },
  {
    eventId: 'explain_value',
    phrases: ['simplify your day', 'what omnilux does', 'what it does', 'how it helps'],
  },
  {
    eventId: 'grow_system',
    phrases: ['tree grows', 'system grows', 'living system', 'growth behind'],
  },
  {
    eventId: 'summon_dynamic_chart',
    phrases: ['year over year projections', 'show us the numbers', 'expected sales', 'show the chart'],
  },
  {
    eventId: 'resolve',
    phrases: ['bottom line', 'wrap up', 'bring it home', 'final tableau'],
  },
];

export function findStageIntent(
  transcript: string,
  activeEvent: StageEventId,
  previousEvent: StageEventId | null = null,
): StageIntentMatch | null {
  const normalized = normalizePhrase(transcript);
  if (!normalized) return null;
  const relativeEvent = activeEvent === 'hold' && previousEvent ? previousEvent : activeEvent;

  const holdPhrase = findPhrase(normalized, holdPhrases);
  if (holdPhrase) return createMatch('hold', holdPhrase, 'hold_command');

  const nextPhrase = findPhrase(normalized, nextPhrases);
  if (nextPhrase) return createMatch(getRelativeStageEvent(relativeEvent, 1), nextPhrase, 'next_command');

  const previousPhrase = findPhrase(normalized, previousPhrases);
  if (previousPhrase) {
    return createMatch(getRelativeStageEvent(relativeEvent, -1), previousPhrase, 'previous_command');
  }

  for (const entry of stagePhraseMap) {
    const phrase = findPhrase(normalized, entry.phrases);
    if (phrase) return createMatch(entry.eventId, phrase, 'stage_phrase');
  }

  return null;
}

export function findStageIntentPreview(
  transcript: string,
  activeEvent: StageEventId,
  previousEvent: StageEventId | null = null,
): StageIntentPreview | null {
  const exact = findStageIntent(transcript, activeEvent, previousEvent);
  if (exact) return { ...exact, complete: true, confidence: 1 };

  const normalized = normalizePhrase(transcript);
  if (!normalized) return null;
  const relativeEvent = activeEvent === 'hold' && previousEvent ? previousEvent : activeEvent;
  let best: StageIntentPreview | null = null;

  const consider = (
    eventId: StageEventId,
    phrases: string[],
    source: StageIntentSource,
  ) => {
    for (const phrase of phrases) {
      const normalizedPhrase = normalizePhrase(phrase);
      const confidence = scorePartialPhrase(normalized, normalizedPhrase);
      if (confidence <= (best?.confidence ?? 0)) continue;
      best = {
        ...createMatch(eventId, normalizedPhrase, source),
        complete: false,
        confidence,
      };
    }
  };

  consider('hold', holdPhrases, 'hold_command');
  consider(getRelativeStageEvent(relativeEvent, 1), nextPhrases, 'next_command');
  consider(getRelativeStageEvent(relativeEvent, -1), previousPhrases, 'previous_command');
  for (const entry of stagePhraseMap) {
    consider(entry.eventId, entry.phrases, 'stage_phrase');
  }

  return best;
}

function findPhrase(normalizedTranscript: string, phrases: string[]): string | null {
  for (const phrase of phrases) {
    const normalizedPhrase = normalizePhrase(phrase);
    if (normalizedTranscript.includes(normalizedPhrase)) return normalizedPhrase;
  }
  return null;
}

function scorePartialPhrase(normalizedTranscript: string, normalizedPhrase: string): number {
  const transcriptTokens = normalizedTranscript.split(' ');
  const phraseTokens = normalizedPhrase.split(' ');
  const maximumOverlap = Math.min(transcriptTokens.length, phraseTokens.length);

  for (let overlap = maximumOverlap; overlap >= 1; overlap -= 1) {
    const transcriptStart = transcriptTokens.length - overlap;
    let matches = true;
    for (let index = 0; index < overlap; index += 1) {
      const transcriptToken = transcriptTokens[transcriptStart + index];
      const phraseToken = phraseTokens[index];
      const isLastToken = index === overlap - 1;
      if (transcriptToken === phraseToken) continue;
      if (isLastToken && phraseToken.startsWith(transcriptToken)) continue;
      matches = false;
      break;
    }
    if (!matches) continue;

    const matchedCharacters = transcriptTokens
      .slice(transcriptStart)
      .reduce((total, token) => total + token.length, 0);
    if (overlap < 2 && matchedCharacters < 6) continue;

    const phraseCharacters = phraseTokens.reduce((total, token) => total + token.length, 0);
    const coverage = matchedCharacters / phraseCharacters;
    const specificity = Math.min(1, matchedCharacters / 14);
    return Math.min(
      0.94,
      0.42 + coverage * 0.38 + specificity * 0.14 + Math.min(overlap, 3) * 0.02,
    );
  }

  return 0;
}

function getRelativeStageEvent(activeEvent: StageEventId, offset: -1 | 1): StageEventId {
  const activeIndex = Math.max(0, stageOrder.indexOf(activeEvent));
  const nextIndex = Math.min(stageOrder.length - 1, Math.max(0, activeIndex + offset));
  return stageOrder[nextIndex];
}

function createMatch(
  eventId: StageEventId,
  phrase: string,
  source: StageIntentSource,
): StageIntentMatch {
  return {
    eventId,
    phrase,
    source,
    label: getStageEventMeta(eventId).label,
  };
}
