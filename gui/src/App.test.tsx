// Import vi from vitest for mocking
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './redux';
import App from './App';
import { IdeMessengerProvider } from './context/IdeMessengerContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

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
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
  });

  it('renders with VS Code title by default', () => {
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

  it('renders with JetBrains title when localStorage is set', () => {
    // Set localStorage to JetBrains
    localStorageMock.setItem('ide', '"jetbrains"');

    render(
      <Provider store={store}>
        <IdeMessengerProvider>
          <App />
        </IdeMessengerProvider>
      </Provider>
    );

    // Check if the component renders with the expected title
    expect(screen.getByText(/Cat JetBrains Extension/i)).toBeDefined();
  });
});
