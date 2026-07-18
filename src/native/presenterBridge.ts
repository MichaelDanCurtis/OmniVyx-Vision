import { invoke, isTauri } from '@tauri-apps/api/core';

export interface NativeSubsystem {
  id: string;
  status: 'ready' | 'planned' | 'unavailable';
  provider: string;
  detail: string;
}

export interface PresenterCapabilities {
  kernelVersion: string;
  appVersion: string;
  platform: string;
  architecture: string;
  nativeShell: boolean;
  subsystems: NativeSubsystem[];
}

export type PresenterSignalKind =
  | 'transcriptFinal'
  | 'intentCandidate'
  | 'manualCue'
  | 'hold'
  | 'resume';

export interface PresenterSignal {
  signalId: string;
  showId: string;
  kind: PresenterSignalKind;
  transcript?: string;
  confidence?: number;
  occurredAtMs: number;
}

export interface PresenterReceipt {
  accepted: boolean;
  sequence: number;
  signalId: string;
  showId: string;
  kind: PresenterSignalKind;
  stageChannel: string;
  occurredAtMs: number;
  hasTranscript: boolean;
  confidence?: number;
}

export async function getPresenterCapabilities(): Promise<PresenterCapabilities> {
  if (!isTauri()) return getBrowserPresenterCapabilities();
  return invoke<PresenterCapabilities>('get_presenter_capabilities');
}

export async function acceptPresenterSignal(
  signal: PresenterSignal,
): Promise<PresenterReceipt | null> {
  if (!isTauri()) return null;
  return invoke<PresenterReceipt>('accept_presenter_signal', { signal });
}

export function getBrowserPresenterCapabilities(): PresenterCapabilities {
  return {
    kernelVersion: 'web-fallback/0.1',
    appVersion: '0.1.0',
    platform: 'browser',
    architecture: 'web',
    nativeShell: false,
    subsystems: [
      {
        id: 'visual-stage',
        status: 'ready',
        provider: 'React Three Fiber',
        detail: 'WebGL stage running without the native presenter kernel.',
      },
      {
        id: 'speech-recognition',
        status: 'unavailable',
        provider: 'Browser capability',
        detail: 'The web build uses browser speech support when available.',
      },
      {
        id: 'semantic-engine',
        status: 'planned',
        provider: 'Remote or lightweight local model',
        detail: 'Premium local semantics are reserved for the native presenter.',
      },
    ],
  };
}
