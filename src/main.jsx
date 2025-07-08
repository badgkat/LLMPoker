import React from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';
import PokerApp from './components/PokerApp.jsx';
import './styles/global.css';

// Initialize app
const container = document.getElementById('root');
const root = createRoot(container);

// Hide loading screen
document.body.classList.add('loaded');

// Render app with error boundary
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <PokerApp />
    </ErrorBoundary>
  </React.StrictMode>
);