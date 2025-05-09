import { v4 as uuidv4 } from 'uuid';
import {
  FromWebviewProtocol,
  WebviewSingleMessage,
  SuccessWebviewSingleMessage,
  ErrorWebviewSingleMessage
} from 'core/src/protocol/webview';

/**
 * Enum for supported IDE types
 */
enum IdeType {
  VSCODE = 'vscode',
  JETBRAINS = 'jetbrains',
  UNKNOWN = 'unknown'
}

/**
 * IdeMessenger class for communication between WebView and IDE Extensions (VS Code and IntelliJ)
 */
export class IdeMessenger {
  private handlers: Map<string, (message: WebviewSingleMessage) => void> = new Map();
  private vscode: any;
  private jetbrains: any;
  private ideType: IdeType;

  constructor() {
    // Detect IDE type based on localStorage setting
    const storedIde = localStorage.getItem('ide');
    if (storedIde && JSON.parse(storedIde) === 'jetbrains') {
      this.ideType = IdeType.JETBRAINS;
      this.jetbrains = this.getJetBrainsApi();
    } else {
      this.ideType = IdeType.VSCODE;
      this.vscode = this.acquireVsCodeApi();
    }

    // Set up message listener
    window.addEventListener('message', this.handleMessage);

    console.log(`IdeMessenger initialized for ${this.ideType}`);
  }

  /**
   * Get VS Code API
   */
  private acquireVsCodeApi() {
    // @ts-ignore
    return typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
  }

  /**
   * Get JetBrains API
   */
  private getJetBrainsApi() {
    // @ts-ignore
    return typeof window.postIntellijMessage !== 'undefined' ? window.postIntellijMessage : null;
  }

  /**
   * Handle incoming messages from IDE
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
   * Send a request to IDE and wait for a response
   */
  public async request<T extends keyof FromWebviewProtocol>(
    messageType: T,
    data: FromWebviewProtocol[T][0],
  ): Promise<FromWebviewProtocol[T][1]> {
    return new Promise((resolve, reject) => {
      // Handle VS Code
      if (this.ideType === IdeType.VSCODE) {
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
      }
      // Handle JetBrains
      else if (this.ideType === IdeType.JETBRAINS) {
        if (!this.jetbrains) {
          reject(new Error('JetBrains API not available'));
          return;
        }

        try {
          // For JetBrains, we use the JavaScript interface directly
          let response;

          // Call the appropriate method based on message type
          switch (messageType) {
            case 'ping':
              response = this.jetbrains.pingCore(JSON.stringify(data));
              break;
            case 'processMessage':
              response = this.jetbrains.processMessage(JSON.stringify(data));
              break;
            case 'getCoreInfo':
              response = this.jetbrains.getCoreInfo();
              break;
            default:
              reject(new Error(`Unsupported message type for JetBrains: ${messageType}`));
              return;
          }

          // For JetBrains, the response is the actual string content, not a number
          // Don't try to parse it as JSON unless it starts with { or [
          if (typeof response === 'string' && (response.trim().startsWith('{') || response.trim().startsWith('['))) {
            try {
              const parsedResponse = JSON.parse(response);
              resolve(parsedResponse);
            } catch (e) {
              // If parsing fails, just return the string
              resolve(response);
            }
          } else {
            // If it's not JSON-parseable, just return the raw response
            resolve(response);
          }
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
      // Handle unknown IDE
      else {
        reject(new Error('Unknown IDE type'));
      }
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
