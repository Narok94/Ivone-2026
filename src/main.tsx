import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DataProvider } from './contexto/DataContext';
import './index.css';
import MobileChatDemo from './components/mobile/MobileChatDemo';
import { demoRequested } from './demo/chat';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {demoRequested(window.location.pathname, window.location.search, window.matchMedia('(max-width: 767px)').matches) ? <MobileChatDemo /> : <DataProvider>
      <App />
    </DataProvider>}
  </React.StrictMode>
);
