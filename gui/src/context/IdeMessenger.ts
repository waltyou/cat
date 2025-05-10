import { v4 as uuidv4 } from 'uuid';
import {
  FromWebviewProtocol,
  ToWebviewProtocol,
  WebviewSingleMessage,
  SuccessWebviewSingleMessage,
  ErrorWebviewSingleMessage
} from 'core/src/protocol/webview';

// Declare JetBrains specific window interface
declare global {
  interface Window {
    postIntellijMessage?: (messageType: string, data: string, messageId: string) => any;
  }
}

/**
 * Enum for supported IDE types
 */
enum IdeType {
  VSCODE = 'vscode',
  JETBRAINS = 'jetbrains',
  UNKNOWN = 'unknown'
}

/**
 * Interface for IDE Messenger
 */
export interface IIdeMessenger {
  post<T extends keyof FromWebviewProtocol>(
    messageType: T,
    data: FromWebviewProtocol[T][0],
    messageId?: string,
    attempt?: number,
  ): void;

  respond<T extends keyof ToWebviewProtocol>(
    messageType: T,
    data: ToWebviewProtocol[T][1],
    messageId: string,
  ): void;

  request<T extends keyof FromWebviewProtocol>(
    messageType: T,
    data: FromWebviewProtocol[T][0],
  ): Promise<FromWebviewProtocol[T][1]>;

  streamRequest<T extends keyof FromWebviewProtocol>(
    messageType: T,
    data: FromWebviewProtocol[T][0],
    cancelToken?: AbortSignal,
  ): AsyncGenerator<any[], any | undefined>;

  dispose(): void;
}

/**
 * IdeMessenger class for communication between WebView and IDE Extensions (VS Code and IntelliJ)
 */
export class IdeMessenger implements IIdeMessenger {
  private handlers: Map<string, (message: WebviewSingleMessage) => void> = new Map();
  private vscode: any;
  private ideType: IdeType;

  constructor() {
    // Detect IDE type based on localStorage setting
    const storedIde = localStorage.getItem('ide');
    if (storedIde && JSON.parse(storedIde) === 'jetbrains') {
      this.ideType = IdeType.JETBRAINS;
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
   * Handle incoming messages from IDE
   */
  private handleMessage = (event: MessageEvent) => {
    const message = event.data;

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
   * Post a message to the IDE
   */
  private _postToIde(
    messageType: string,
    data: any,
    messageId: string = uuidv4(),
  ) {
    if (this.ideType === IdeType.VSCODE) {
      if (!this.vscode) {
        console.error('VS Code API not available');
        throw new Error('VS Code API not available');
      }

      const msg = {
        type: messageType,
        messageId,
        content: data,
      };

      this.vscode.postMessage(msg);
    } else if (this.ideType === IdeType.JETBRAINS) {
      if (window.postIntellijMessage === undefined) {
        console.error('postIntellijMessage is undefined');
        throw new Error('postIntellijMessage is undefined');
      }

      window.postIntellijMessage(messageType, JSON.stringify(data), messageId);
    } else {
      throw new Error('Unknown IDE type');
    }
  }

  /**
   * Post a message to the IDE with retry logic
   */
  public post<T extends keyof FromWebviewProtocol>(
    messageType: T,
    data: FromWebviewProtocol[T][0],
    messageId?: string,
    attempt: number = 0,
  ) {
    try {
      this._postToIde(messageType as string, data, messageId);
    } catch (error) {
      if (attempt < 5) {
        console.log(`Attempt ${attempt} failed. Retrying...`);
        setTimeout(
          () => this.post(messageType, data, messageId, attempt + 1),
          Math.pow(2, attempt) * 1000,
        );
      } else {
        console.error(
          "Max attempts reached. Message could not be sent.",
          error,
        );
      }
    }
  }

  /**
   * Respond to a message from the IDE
   */
  public respond<T extends keyof ToWebviewProtocol>(
    messageType: T,
    data: ToWebviewProtocol[T][1],
    messageId: string,
  ) {
    this._postToIde(messageType as string, data, messageId);
  }

  /**
   * Send a request to IDE and wait for a response
   */
  public async request<T extends keyof FromWebviewProtocol>(
    messageType: T,
    data: FromWebviewProtocol[T][0],
  ): Promise<FromWebviewProtocol[T][1]> {
    const messageId = uuidv4();

    return new Promise((resolve) => {
      const handler = (event: any) => {
        if (event.data.messageId === messageId) {
          window.removeEventListener("message", handler);
          resolve(event.data.data as WebviewSingleMessage<T>);
        }
      };
      window.addEventListener("message", handler);

      this.post(messageType, data, messageId);
    });
  }

  /**
   * Stream request to IDE with support for cancellation
   */
  public async *streamRequest<T extends keyof FromWebviewProtocol>(
    messageType: T,
    data: FromWebviewProtocol[T][0],
    cancelToken?: AbortSignal,
  ): AsyncGenerator<any[], any | undefined> {
    const messageId = uuidv4();

    this.post(messageType, data, messageId);

    const buffer: any[] = [];
    let index = 0;
    let done = false;
    let returnVal: any | undefined = undefined;
    let error: string | null = null;

    // This handler receives individual WebviewMessengerResults
    // And pushes them to buffer
    const handler = (event: any) => {
      if (event.data.messageId === messageId) {
        const responseData = event.data.data;
        if ("error" in responseData) {
          error = responseData.error;
          return;
        }
        if (responseData.done) {
          window.removeEventListener("message", handler);
          done = true;
          returnVal = responseData.content;
        } else {
          buffer.push(responseData.content);
        }
      }
    };
    window.addEventListener("message", handler);

    const handleAbort = () => {
      this.post("abort", undefined, messageId);
    };
    cancelToken?.addEventListener("abort", handleAbort);

    try {
      while (!done) {
        if (error) {
          throw error;
        }
        if (buffer.length > index) {
          const chunks = buffer.slice(index);
          index = buffer.length;
          yield chunks;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      if (buffer.length > index) {
        const chunks = buffer.slice(index);
        yield chunks;
      }

      return returnVal;
    } catch (e) {
      throw e;
    } finally {
      cancelToken?.removeEventListener("abort", handleAbort);
    }
  }

  /**
   * Dispose the messenger
   */
  public dispose() {
    window.removeEventListener('message', this.handleMessage);
    this.handlers.clear();
  }
}


