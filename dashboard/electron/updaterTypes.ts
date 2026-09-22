export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error';

export type UpdateStatePayload = {
  phase: UpdatePhase;
  currentVersion: string;
  version?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  message?: string;
  error?: string;
};

export const INITIAL_UPDATE_STATE: UpdateStatePayload = {
  phase: 'idle',
  currentVersion: '0.0.0',
};
