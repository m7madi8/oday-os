import { contextBridge, ipcRenderer } from 'electron';

const oday = {
  desktop: true,
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.invoke('oday:window:minimize'),
    maximize: () => ipcRenderer.invoke('oday:window:maximize'),
    close: () => ipcRenderer.invoke('oday:window:close'),
    isMaximized: () => ipcRenderer.invoke('oday:window:isMaximized') as Promise<boolean>,
    fullscreen: () => ipcRenderer.invoke('oday:window:fullscreen') as Promise<boolean>,
  },
  store: {
    get: (key: string) => ipcRenderer.invoke('oday:store:get', key) as Promise<string | null>,
    set: (key: string, value: string) => ipcRenderer.invoke('oday:store:set', key, value) as Promise<boolean>,
    delete: (key: string) => ipcRenderer.invoke('oday:store:delete', key) as Promise<boolean>,
  },
  files: {
    open: () =>
      ipcRenderer.invoke('oday:files:open') as Promise<{
        name: string;
        mime: string;
        size: number;
        data: string;
      } | null>,
    save: (payload: { name?: string; data: string; mime?: string }) =>
      ipcRenderer.invoke('oday:files:save', payload) as Promise<boolean>,
  },
  shell: {
    open: (url: string) => ipcRenderer.invoke('oday:shell:open', url) as Promise<boolean>,
  },
  notify: {
    show: (payload: { title?: string; body?: string }) => ipcRenderer.invoke('oday:notify:show', payload) as Promise<boolean>,
  },
  updates: {
    check: () => ipcRenderer.invoke('oday:update:check') as Promise<boolean>,
    syncServer: () => ipcRenderer.invoke('oday:update:sync-server') as Promise<boolean>,
    onStatus: (listener: (payload: { title?: string; body?: string }) => void) => {
      const wrapped = (_event: unknown, payload: { title?: string; body?: string }) => listener(payload);
      ipcRenderer.on('oday:update:status', wrapped);
      return () => ipcRenderer.removeListener('oday:update:status', wrapped);
    },
  },
  print: {
    pdf: (payload: { data: string; name?: string }) => ipcRenderer.invoke('oday:print:pdf', payload) as Promise<boolean>,
    open: (payload: { data: string; name?: string }) => ipcRenderer.invoke('oday:print:open', payload) as Promise<boolean>,
  },
  backup: {
    pickFolder: () => ipcRenderer.invoke('oday:backup:pick-folder') as Promise<{ path: string; label: string } | null>,
    testFolder: (folder: string) => ipcRenderer.invoke('oday:backup:test-folder', folder) as Promise<{ ok: boolean; path: string }>,
    writeFile: (payload: { folder: string; name: string; data: string }) =>
      ipcRenderer.invoke('oday:backup:write-file', payload) as Promise<{ ok: boolean; path: string }>,
  },
};

contextBridge.exposeInMainWorld('oday', oday);

export type OdayBridge = typeof oday;
