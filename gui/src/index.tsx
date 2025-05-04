import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './redux';
import { IdeMessengerProvider } from './context/IdeMessengerContext';

// Create root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

// Render the application
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <IdeMessengerProvider>
        <App />
      </IdeMessengerProvider>
    </Provider>
  </React.StrictMode>
);
