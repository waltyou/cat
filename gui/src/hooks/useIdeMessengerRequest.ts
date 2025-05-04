import { useState, useContext, useCallback } from 'react';
import { IdeMessengerContext } from '../context/IdeMessengerContext';
import { FromWebviewProtocol } from 'core/src/protocol/webview';

/**
 * Hook for making requests to the IDE messenger
 */
export function useIdeMessengerRequest<T extends keyof FromWebviewProtocol>(
  messageType: T,
  data: FromWebviewProtocol[T][0] | null,
) {
  const ideMessenger = useContext(IdeMessengerContext);
  const [result, setResult] = useState<
    FromWebviewProtocol[T][1] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendRequest = useCallback(
    async (newData?: FromWebviewProtocol[T][0]) => {
      if (!ideMessenger) {
        setError(new Error('IDE Messenger not available'));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use provided data or the data from the hook parameters
        const requestData = newData !== undefined ? newData : data;
        
        if (requestData === null) {
          throw new Error('No data provided for request');
        }
        
        const response = await ideMessenger.request(messageType, requestData);
        setResult(response);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [ideMessenger, messageType, data]
  );

  return {
    result,
    isLoading,
    error,
    sendRequest,
  };
}
