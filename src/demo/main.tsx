import React from 'react';
import ReactDOM from 'react-dom/client';
import MobileChatDemo from '../components/mobile/MobileChatDemo';
import '../index.css';

// Public, static entry: intentionally has no App, DataProvider or API imports.
const root = document.getElementById('root');
if (!root) throw new Error('Demo root not found');
ReactDOM.createRoot(root).render(<React.StrictMode><MobileChatDemo standalone /></React.StrictMode>);
