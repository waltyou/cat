// Import vi from vitest for mocking
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './redux';
import App from './App';
import { IdeMessengerProvider } from './context/IdeMessengerContext';

// Mock the useIdeMessengerRequest hook
vi.mock('./hooks/useIdeMessengerRequest', () => ({
  useIdeMessengerRequest: () => ({
    result: null,
    isLoading: false,
    error: null,
    sendRequest: vi.fn(),
  }),
}));

describe('App component', () => {
  it('renders without crashing', () => {
    render(
      <Provider store={store}>
        <IdeMessengerProvider>
          <App />
        </IdeMessengerProvider>
      </Provider>
    );

    // Check if the component renders with the expected title
    expect(screen.getByText(/Cat VS Code Extension/i)).toBeDefined();
  });
});
