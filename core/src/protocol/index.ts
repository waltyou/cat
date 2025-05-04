/**
 * Basic protocol definitions for the core service
 */

// Base protocol interface
export interface IProtocol {
  [key: string]: [any, any]; // [request data, response data]
}

// Protocol for messages from IDE to Core
export interface ToCoreFomIdeProtocol extends IProtocol {
  // Basic ping message
  ping: [string, string];

  // Process a message from the IDE
  processMessage: [{ message: string }, { response: string }];

  // Get core service info
  getCoreInfo: [undefined, { version: string; status: string }];
}

// Protocol for messages from Core to IDE
export interface ToIdeFromCoreProtocol extends IProtocol {
  // Send a response back to the IDE
  sendResponse: [{ message: string }, void];

  // Log a message to the IDE
  log: [{ level: 'info' | 'warn' | 'error'; message: string }, void];

  // Notify IDE of core status change
  statusUpdate: [{ status: string }, void];
}

// Combined protocols
export type ToCoreProtocol = ToCoreFomIdeProtocol;
export type FromCoreProtocol = ToIdeFromCoreProtocol;

// Export WebView protocols
export * from './webview';
