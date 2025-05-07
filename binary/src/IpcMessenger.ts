import { IMessenger, Message } from 'core/src/protocol/messenger';
import { IProtocol } from 'core/src/protocol';
import { v4 as uuidv4 } from 'uuid';

/**
 * IPC Messenger for communication between binary and IDE using stdin/stdout
 */
export class IpcMessenger<ToProtocol extends IProtocol, FromProtocol extends IProtocol>
  implements IMessenger<ToProtocol, FromProtocol> {

  // Map of message IDs to their response resolvers
  private responseResolvers = new Map<
    string,
    { resolve: (value: any) => void; reject: (reason: any) => void }
  >();

  // Map of message types to their handlers
  private handlers = new Map<
    keyof ToProtocol,
    (message: Message<any>) => Promise<any> | any
  >();

  // Error handlers
  private errorHandlers: ((message: Message, error: Error) => void)[] = [];

  constructor() {
    // Set up stdin/stdout handling
    process.stdin.setEncoding('utf8');

    // Handle incoming messages from stdin
    process.stdin.on('data', (data: Buffer) => {
      try {
        const messages = data.toString().trim().split('\n');

        for (const messageStr of messages) {
          if (!messageStr.trim()) continue;

          const message = JSON.parse(messageStr) as Message;
          this.handleMessage(message);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Handle process exit
    process.on('exit', () => {
      // Reject any pending promises
      for (const [id, { reject }] of this.responseResolvers) {
        reject(new Error('Process exited'));
      }
    });
  }

  /**
   * Handle an incoming message
   */
  private async handleMessage(message: Message) {
    const { messageType, messageId, data } = message;

    // Check if this is a response to a request
    if (messageType.startsWith('response:')) {
      const originalType = messageType.substring(9);
      const resolver = this.responseResolvers.get(messageId);

      if (resolver) {
        resolver.resolve(data);
        this.responseResolvers.delete(messageId);
      }

      return;
    }

    // Otherwise, handle as a regular message
    const handler = this.handlers.get(messageType as keyof ToProtocol);

    if (!handler) {
      console.error(`No handler for message type: ${messageType}`);
      return;
    }

    try {
      const result = await handler(message);

      // Send response back
      this.sendRaw({
        messageType: `response:${messageType}`,
        messageId,
        data: result
      });
    } catch (error) {
      console.error(`Error handling message ${messageId} of type ${messageType}:`, error);

      // Notify error handlers
      for (const errorHandler of this.errorHandlers) {
        errorHandler(
          message,
          error instanceof Error ? error : new Error(String(error))
        );
      }

      // Send error response
      this.sendRaw({
        messageType: `error:${messageType}`,
        messageId,
        data: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Send a raw message to stdout
   */
  private sendRaw(message: Message) {
    process.stdout.write(JSON.stringify(message) + '\n');
  }

  /**
   * Register an error handler
   */
  onError(handler: (message: Message, error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Send a message to the IDE
   */
  send<T extends keyof FromProtocol>(
    messageType: T,
    data: FromProtocol[T][0],
    messageId?: string
  ): string {
    const id = messageId || uuidv4();

    this.sendRaw({
      messageType: messageType as string,
      messageId: id,
      data
    });

    return id;
  }

  /**
   * Register a handler for a message type
   */
  on<T extends keyof ToProtocol>(
    messageType: T,
    handler: (message: Message<ToProtocol[T][0]>) => Promise<ToProtocol[T][1]> | ToProtocol[T][1]
  ): void {
    this.handlers.set(messageType, handler);
  }

  /**
   * Request data from the IDE
   */
  request<T extends keyof FromProtocol>(
    messageType: T,
    data: FromProtocol[T][0]
  ): Promise<FromProtocol[T][1]> {
    return new Promise((resolve, reject) => {
      const messageId = uuidv4();

      // Store the resolver
      this.responseResolvers.set(messageId, { resolve, reject });

      // Send the request
      this.send(messageType, data, messageId);

      // Set a timeout to prevent hanging
      setTimeout(() => {
        if (this.responseResolvers.has(messageId)) {
          this.responseResolvers.delete(messageId);
          reject(new Error(`Request timed out for message type: ${String(messageType)}`));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Invoke a handler directly
   */
  invoke<T extends keyof ToProtocol>(
    messageType: T,
    data: ToProtocol[T][0],
    messageId?: string
  ): ToProtocol[T][1] {
    const id = messageId || uuidv4();
    const handler = this.handlers.get(messageType);

    if (!handler) {
      throw new Error(`No handler for message type: ${String(messageType)}`);
    }

    const message: Message = {
      messageType: messageType as string,
      messageId: id,
      data
    };

    try {
      return handler(message) as ToProtocol[T][1];
    } catch (error) {
      // Notify error handlers
      for (const errorHandler of this.errorHandlers) {
        errorHandler(
          message,
          error instanceof Error ? error : new Error(String(error))
        );
      }

      throw error;
    }
  }
}
