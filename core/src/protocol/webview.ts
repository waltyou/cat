import { IProtocol } from './index';

/**
 * Protocol for messages from WebView to IDE
 */
export interface FromWebviewProtocol extends IProtocol {
  // Request core info
  getCoreInfo: [undefined, { version: string; status: string }];
  
  // Send a message to be processed
  processMessage: [{ message: string }, { response: string }];
  
  // Ping the core service
  ping: [string, string];
}

/**
 * Protocol for messages from IDE to WebView
 */
export interface ToWebviewProtocol extends IProtocol {
  // Update the WebView with a response
  updateResponse: [{ message: string }, void];
  
  // Update the WebView with core status
  updateStatus: [{ status: string }, void];
  
  // Log a message to the WebView
  log: [{ level: 'info' | 'warn' | 'error'; message: string }, void];
}

// Message structure for WebView communication
export interface WebviewMessage<T = any> {
  type: string;
  messageId: string;
  content: T;
}

// Success message structure
export interface SuccessWebviewSingleMessage<T = any> extends WebviewMessage {
  status: 'success';
  content: T;
}

// Error message structure
export interface ErrorWebviewSingleMessage extends WebviewMessage {
  status: 'error';
  content: {
    message: string;
    stack?: string;
  };
}

// Combined message type
export type WebviewSingleMessage<T = any> = 
  | SuccessWebviewSingleMessage<T>
  | ErrorWebviewSingleMessage;
