import type { ShowCommand, ShowMoment } from './showGraph';

export interface CommandMatch {
  type: ShowCommand['type'];
  phrase: string;
  label: string;
  targetMomentId?: string;
}

export interface CueMatch {
  momentId: string;
  phrase: string;
  label: string;
}

export function normalizePhrase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findCommandMatch(input: string, commands: ShowCommand[]): CommandMatch | null {
  const normalized = normalizePhrase(input);
  if (!normalized) return null;

  for (const command of commands) {
    for (const phrase of command.phrases) {
      const normalizedPhrase = normalizePhrase(phrase);
      if (normalized.includes(normalizedPhrase)) {
        return {
          type: command.type,
          phrase: normalizedPhrase,
          label: command.label,
          ...(command.targetMomentId ? { targetMomentId: command.targetMomentId } : {}),
        };
      }
    }
  }

  return null;
}

export function findCueMatch(input: string, moments: ShowMoment[]): CueMatch | null {
  const normalized = normalizePhrase(input);
  if (!normalized) return null;

  for (const moment of moments) {
    for (const phrase of moment.cuePhrases) {
      const normalizedPhrase = normalizePhrase(phrase);
      if (normalized.includes(normalizedPhrase)) {
        return {
          momentId: moment.id,
          phrase: normalizedPhrase,
          label: moment.title,
        };
      }
    }
  }

  return null;
}

