import { v4 as uuidv4 } from 'uuid';
import {
  FromWebviewProtocol,
  WebviewSingleMessage,
  SuccessWebviewSingleMessage,
  ErrorWebviewSingleMessage
} from 'core/src/protocol/webview';

/**
 * IdeMessenger class for communication between WebView and VS Code Extension
 */
export class IdeMessenger {
  private handlers: Map<string, (message: WebviewSingleMessage) => void> = new Map();
  private vscode: any;

  constructor() {
    // Get VS Code API
    this.vscode = this.acquireVsCodeApi();

    // Set up message listener
    window.addEventListener('message', this.handleMessage);

    console.log('IdeMessenger initialized');
  }

  /**
   * Get VS Code API
   */
  private acquireVsCodeApi() {
    // @ts-ignore
    return typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
  }

  /**
   * Handle incoming messages from VS Code
   */
  private handleMessage = (event: MessageEvent) => {
    const message = event.data as WebviewSingleMessage;

    if (!message || !message.type || !message.messageId) {
      console.error('Invalid message received:', event.data);
      return;
    }

    console.log('Received message:', message);

    // Find handler for this message ID
    const handler = this.handlers.get(message.messageId);
    if (handler) {
      handler(message);
      // Remove the handler after it's called
      this.handlers.delete(message.messageId);
    } else {
      console.warn('No handler found for message:', message);
    }
  };

  /**
   * Send a request to VS Code and wait for a response
   */
  public async request<T extends keyof FromWebviewProtocol>(
    messageType: T,
    data: FromWebviewProtocol[T][0],
  ): Promise<FromWebviewProtocol[T][1]> {
    return new Promise((resolve, reject) => {
      if (!this.vscode) {
        reject(new Error('VS Code API not available'));
        return;
      }

      const messageId = uuidv4();

      // Register handler for the response
      this.handlers.set(messageId, (message: WebviewSingleMessage) => {
        if (message.status === 'success') {
          resolve((message as SuccessWebviewSingleMessage).content);
        } else {
          const errorMessage = (message as ErrorWebviewSingleMessage).content;
          reject(new Error(errorMessage.message));
        }
      });

      // Send the message to VS Code
      this.vscode.postMessage({
        type: messageType,
        messageId,
        content: data,
      });
    });
  }

  /**
   * Dispose the messenger
   */
  public dispose() {
    window.removeEventListener('message', this.handleMessage);
    this.handlers.clear();
  }
}
