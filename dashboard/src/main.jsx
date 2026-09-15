import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AppProviders } from './lib/auth/AuthProvider.jsx';
import './index.css';

const isElectron =
  Boolean(window.oday) || /Electron/i.test(navigator.userAgent || '');
if (isElectron) {
  document.documentElement.dataset.desktop = 'true';
  document.documentElement.dataset.platform =
    window.oday?.platform || (/Windows/i.test(navigator.userAgent || '') ? 'win32' : '');
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
