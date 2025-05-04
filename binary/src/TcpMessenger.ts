import * as net from 'net';
import { IMessenger, Message } from '../../core/src/protocol/messenger';
import { IProtocol } from '../../core/src/protocol';
import { v4 as uuidv4 } from 'uuid';

/**
 * TCP Messenger for debugging - connects to a TCP server
 */
export class TcpMessenger<ToProtocol extends IProtocol, FromProtocol extends IProtocol>
  implements IMessenger<ToProtocol, FromProtocol> {
  
  // TCP client socket
  private socket: net.Socket | null = null;
  
  // Connection status
  private connected = false;
  
  // Message buffer for incomplete messages
  private messageBuffer = '';
  
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
  
  // Queue of messages to send once connected
  private messageQueue: Message[] = [];
  
  constructor(private host = 'localhost', private port = 9876) {
    this.connect();
  }
  
  /**
   * Connect to the TCP server
   */
  private connect() {
    this.socket = new net.Socket();
    
    // Set up connection
    this.socket.connect(this.port, this.host, () => {
      console.log(`Connected to TCP server at ${this.host}:${this.port}`);
      this.connected = true;
      
      // Send any queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          this.sendRaw(message);
        }
      }
    });
    
    // Handle data
    this.socket.on('data', (data: Buffer) => {
      try {
        // Add to buffer and process complete messages
        this.messageBuffer += data.toString();
        this.processBuffer();
      } catch (error) {
        console.error('Error processing TCP data:', error);
      }
    });
    
    // Handle connection close
    this.socket.on('close', () => {
      console.log('TCP connection closed');
      this.connected = false;
      
      // Try to reconnect after a delay
      setTimeout(() => this.connect(), 5000);
    });
    
    // Handle errors
    this.socket.on('error', (error) => {
      console.error('TCP socket error:', error);
      
      // Don't try to reconnect on ECONNREFUSED, as the server is likely not running
      if ((error as any).code !== 'ECONNREFUSED') {
        this.socket?.destroy();
        this.connected = false;
        
        // Try to reconnect after a delay
        setTimeout(() => this.connect(), 5000);
      }
    });
  }
  
  /**
   * Process the message buffer for complete messages
   */
  private processBuffer() {
    // Split by newlines and process complete messages
    const messages = this.messageBuffer.split('\n');
    
    // Keep the last (potentially incomplete) message in the buffer
    this.messageBuffer = messages.pop() || '';
    
    // Process complete messages
    for (const messageStr of messages) {
      if (!messageStr.trim()) continue;
      
      try {
        const message = JSON.parse(messageStr) as Message;
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
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
   * Send a raw message to the TCP server
   */
  private sendRaw(message: Message) {
    if (this.connected && this.socket) {
      this.socket.write(JSON.stringify(message) + '\n');
    } else {
      // Queue the message to send once connected
      this.messageQueue.push(message);
    }
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
