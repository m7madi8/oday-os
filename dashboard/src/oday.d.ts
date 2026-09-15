export {};

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
        check: () => Promise<boolean>;
        syncServer: () => Promise<boolean>;
        onStatus: (listener: (payload: { title?: string; body?: string }) => void) => () => void;
      };
      print: {
        pdf: (payload: { data: string; name?: string }) => Promise<boolean>;
        open: (payload: { data: string; name?: string }) => Promise<boolean>;
      };
    };
  }
}
