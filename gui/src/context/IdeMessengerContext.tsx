import React, { createContext, useEffect, useState } from 'react';
import { IdeMessenger } from './IdeMessenger';

// Create context
export const IdeMessengerContext = createContext<IdeMessenger | null>(null);

interface IdeMessengerProviderProps {
  children: React.ReactNode;
}

export const IdeMessengerProvider: React.FC<IdeMessengerProviderProps> = ({ children }) => {
  const [messenger] = useState<IdeMessenger>(() => new IdeMessenger());
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      messenger.dispose();
    };
  }, [messenger]);
  
  return (
    <IdeMessengerContext.Provider value={messenger}>
      {children}
    </IdeMessengerContext.Provider>
  );
};
