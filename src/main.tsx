import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { AuthProvider } from './context/AuthContext';

// Register PWA Service Worker if supported
try {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('New PWA content available, updating...');
      },
      onOfflineReady() {
        console.log('App ready to work offline');
      },
    });
  }
} catch (e) {
  // Service workers may be disabled in some sandboxed iframes
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);


