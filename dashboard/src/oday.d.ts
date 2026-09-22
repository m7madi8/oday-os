export {};

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

declare global {
  interface Window {
    oday?: {
      desktop: true;
      platform: string;
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<boolean>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
        fullscreen: () => Promise<boolean>;
      };
      store: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
      };
      files: {
        open: () => Promise<{ name: string; mime: string; size: number; data: string } | null>;
        save: (payload: { name?: string; data: string; mime?: string }) => Promise<boolean>;
      };
      shell: {
        open: (url: string) => Promise<boolean>;
      };
      notify: {
        show: (payload: { title?: string; body?: string }) => Promise<boolean>;
      };
      updates?: {
        check: () => Promise<UpdateStatePayload>;
        getState: () => Promise<UpdateStatePayload>;
        install: () => Promise<boolean>;
        dismiss: () => Promise<boolean>;
        syncServer: () => Promise<UpdateStatePayload>;
        onState: (listener: (payload: UpdateStatePayload) => void) => () => void;
      };
      print: {
        pdf: (payload: { data: string; name?: string }) => Promise<boolean>;
        open: (payload: { data: string; name?: string }) => Promise<boolean>;
      };
    };
  }
}
