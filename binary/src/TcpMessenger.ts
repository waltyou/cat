import * as net from 'net';
import { IMessenger, Message } from 'core/src/protocol/messenger';
import { IProtocol } from 'core/src/protocol';
import { v4 as uuidv4 } from 'uuid';

/**
 * TCP Messenger for debugging - acts as a TCP server
 */
export class TcpMessenger<ToProtocol extends IProtocol, FromProtocol extends IProtocol>
  implements IMessenger<ToProtocol, FromProtocol> {

  // TCP server
  private server: net.Server | null = null;

  // Connected clients
  private clients: net.Socket[] = [];

  // Message buffers for incomplete messages (one per client)
  private messageBuffers = new Map<net.Socket, string>();

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

  // Whether to act as a server or client
  private isServer: boolean;

  constructor(private host = 'localhost', private port = 9876) {
    // Check if we should act as a server
    this.isServer = process.env.CAT_CORE_SERVER === 'true';

    if (this.isServer) {
      this.startServer();
    } else {
      // In client mode, we would connect to a server
      // But this is not implemented as we're only using server mode
      console.error('TcpMessenger client mode is not implemented');
    }
  }

  /**
   * Start the TCP server
   */
  private startServer() {
    this.server = net.createServer((socket) => {
      console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);

      // Add client to list
      this.clients.push(socket);

      // Initialize message buffer for this client
      this.messageBuffers.set(socket, '');

      // Handle data from client
      socket.on('data', (data: Buffer) => {
        try {
          // Add to buffer and process complete messages
          const buffer = this.messageBuffers.get(socket) || '';
          this.messageBuffers.set(socket, buffer + data.toString());
          this.processBuffer(socket);
        } catch (error) {
          console.error('Error processing TCP data:', error);
        }
      });

      // Handle client disconnection
      socket.on('close', () => {
        console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);

        // Remove client from list
        const index = this.clients.indexOf(socket);
        if (index !== -1) {
          this.clients.splice(index, 1);
        }

        // Remove message buffer
        this.messageBuffers.delete(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error: ${error.message}`);

        // Close the socket
        socket.destroy();

        // Remove client from list
        const index = this.clients.indexOf(socket);
        if (index !== -1) {
          this.clients.splice(index, 1);
        }

        // Remove message buffer
        this.messageBuffers.delete(socket);
      });
    });

    // Handle server errors
    this.server.on('error', (error) => {
      console.error(`TCP server error: ${error.message}`);
    });

    // Start listening
    this.server.listen(this.port, this.host, () => {
      console.log(`TCP server listening on ${this.host}:${this.port}`);
    });
  }

  /**
   * Process the message buffer for complete messages
   */
  private processBuffer(socket: net.Socket) {
    // Get the buffer for this client
    const buffer = this.messageBuffers.get(socket) || '';

    // Split by newlines and process complete messages
    const messages = buffer.split('\n');

    // Keep the last (potentially incomplete) message in the buffer
    this.messageBuffers.set(socket, messages.pop() || '');

    // Process complete messages
    for (const messageStr of messages) {
      if (!messageStr.trim()) continue;

      try {
        const message = JSON.parse(messageStr) as Message;
        this.handleMessage(message, socket);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  }

  /**
   * Handle an incoming message
   */
  private async handleMessage(message: Message, socket: net.Socket) {
    const { messageType, messageId, data } = message;

    // Check if this is a response to a request
    if (messageType.startsWith('response:')) {
      // Get the message ID from the response
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

      // Send response back to the client
      this.sendToClient(socket, {
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

      // Send error response to the client
      this.sendToClient(socket, {
        messageType: `error:${messageType}`,
        messageId,
        data: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Send a message to a specific client
   */
  private sendToClient(socket: net.Socket, message: Message) {
    socket.write(JSON.stringify(message) + '\n');
  }

  /**
   * Send a message to all connected clients
   */
  private sendToAll(message: Message) {
    for (const client of this.clients) {
      this.sendToClient(client, message);
    }
  }

  /**
   * Register an error handler
   */
  onError(handler: (message: Message, error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Send a message to all connected clients
   */
  send<T extends keyof FromProtocol>(
    messageType: T,
    data: FromProtocol[T][0],
    messageId?: string
  ): string {
    const id = messageId || uuidv4();

    // Send to all connected clients
    this.sendToAll({
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
   * Request data from clients
   * Note: In server mode, this will broadcast the request to all clients
   * and return the first response received
   */
  request<T extends keyof FromProtocol>(
    messageType: T,
    data: FromProtocol[T][0]
  ): Promise<FromProtocol[T][1]> {
    return new Promise((resolve, reject) => {
      // If no clients are connected, reject immediately
      if (this.clients.length === 0) {
        reject(new Error('No clients connected to handle request'));
        return;
      }

      const messageId = uuidv4();

      // Store the resolver
      this.responseResolvers.set(messageId, { resolve, reject });

      // Send the request to all clients
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

  /**
   * External message handler registration
   * This is required by the IMessenger interface but not used in this implementation
   */
  externalOn<T extends keyof FromProtocol>(
    messageType: T,
    handler: (message: Message) => any
  ): void {
    console.log(`External handler registered for ${String(messageType)}, but not used in TcpMessenger server`);
  }
}
