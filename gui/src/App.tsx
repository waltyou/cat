import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Button from './components/Button';
import { RootState } from './redux';
import { useIdeMessengerRequest } from './hooks/useIdeMessengerRequest';
import './App.css';

const App: React.FC = () => {
  const status = useSelector((state: RootState) => state.app.status);
  const response = useSelector((state: RootState) => state.app.response);
  const [ideType, setIdeType] = useState<string>('IDE');

  // Detect IDE type from localStorage
  useEffect(() => {
    const storedIde = localStorage.getItem('ide');
    if (storedIde) {
      const parsedIde = JSON.parse(storedIde);
      setIdeType(parsedIde === 'jetbrains' ? 'JetBrains' : 'VS Code');
    } else {
      setIdeType('VS Code');
    }
  }, []);

  // Use the messenger hook to ping the core service
  const { result, isLoading, error, sendRequest } = useIdeMessengerRequest('ping', null);

  const handlePingClick = () => {
    sendRequest('Hello from GUI!');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Cat {ideType} Extension</h1>
        <div className="status-indicator">
          Status: <span className={`status-${status.toLowerCase()}`}>{status}</span>
        </div>
      </header>

      <main className="app-content">
        <section className="action-section">
          <h2>Actions</h2>
          <Button
            onClick={handlePingClick}
            disabled={isLoading}
            loading={isLoading}
          >
            Ping Core Service
          </Button>
        </section>

        {result && (
          <section className="response-section">
            <h2>Response</h2>
            <div className="response-content">
              {result}
            </div>
          </section>
        )}

        {error && (
          <section className="error-section">
            <h2>Error</h2>
            <div className="error-content">
              {error.message}
            </div>
          </section>
        )}

        {response && (
          <section className="message-section">
            <h2>Last Message</h2>
            <div className="message-content">
              {response}
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>Cat {ideType} Extension GUI</p>
      </footer>
    </div>
  );
};

export default App;
