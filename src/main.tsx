// ═══════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// RTL support — set dir based on detected language
const htmlEl = document.documentElement;
const lang = localStorage.getItem('i18nextLng') ?? navigator.language.split('-')[0];
if (['ar', 'he', 'fa', 'ur'].includes(lang)) {
  htmlEl.setAttribute('dir', 'rtl');
  htmlEl.setAttribute('lang', lang);
} else {
  htmlEl.setAttribute('dir', 'ltr');
  htmlEl.setAttribute('lang', lang);
}

// Register service worker (PWA)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(console.warn);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
