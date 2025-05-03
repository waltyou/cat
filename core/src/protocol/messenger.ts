import { v4 as uuidv4 } from 'uuid';
import { IProtocol } from './index';

/**
 * Message interface for communication
 */
export interface Message<T = any> {
  messageType: string;
  messageId: string;
  data: T;
}

/**
 * Messenger interface for communication between Core and IDE
 */
export interface IMessenger<ToProtocol extends IProtocol, FromProtocol extends IProtocol> {
  // Register error handler
  onError(handler: (message: Message, error: Error) => void): void;
  
  // Send a message to the other side
  send<T extends keyof FromProtocol>(
    messageType: T,
    data: FromProtocol[T][0],
    messageId?: string,
  ): string;
  
  // Register a handler for a message type
  on<T extends keyof ToProtocol>(
    messageType: T,
    handler: (
      message: Message<ToProtocol[T][0]>,
    ) => Promise<ToProtocol[T][1]> | ToProtocol[T][1],
  ): void;
  
  // Request data from the other side
  request<T extends keyof FromProtocol>(
    messageType: T,
    data: FromProtocol[T][0],
  ): Promise<FromProtocol[T][1]>;
  
  // Invoke a handler directly
  invoke<T extends keyof ToProtocol>(
    messageType: T,
    data: ToProtocol[T][0],
    messageId?: string,
  ): ToProtocol[T][1];
}

/**
 * In-process messenger implementation
 */
export class InProcessMessenger<ToProtocol extends IProtocol, FromProtocol extends IProtocol>
  implements IMessenger<ToProtocol, FromProtocol> {
  
  // Listeners for messages to this messenger
  protected myTypeListeners = new Map<
    keyof ToProtocol,
    (message: Message) => any
  >();
  
  // Listeners for messages from this messenger to the other side
  protected externalTypeListeners = new Map<
    keyof FromProtocol,
    (message: Message) => any
  >();
  
  // Error handlers
  protected _onErrorHandlers: ((message: Message, error: Error) => void)[] = [];
  
  onError(handler: (message: Message, error: Error) => void) {
    this._onErrorHandlers.push(handler);
  }
  
  invoke<T extends keyof ToProtocol>(
    messageType: T,
    data: ToProtocol[T][0],
    messageId?: string,
  ): ToProtocol[T][1] {
    const listener = this.myTypeListeners.get(messageType);
    if (!listener) {
      return undefined as any;
    }
    
    const msg: Message = {
      messageType: messageType as string,
      data,
      messageId: messageId ?? uuidv4(),
    };
    
    try {
      return listener(msg);
    } catch (error) {
      this._onErrorHandlers.forEach((handler) => 
        handler(msg, error instanceof Error ? error : new Error(String(error)))
      );
      throw error;
    }
  }
  
  send<T extends keyof FromProtocol>(
    messageType: T,
    data: any,
    _messageId?: string,
  ): string {
    const messageId = _messageId ?? uuidv4();
    const msg: Message = {
      messageType: messageType as string,
      data,
      messageId,
    };
    
    const listener = this.externalTypeListeners.get(messageType);
    if (listener) {
      try {
        listener(msg);
      } catch (error) {
        this._onErrorHandlers.forEach((handler) => 
          handler(msg, error instanceof Error ? error : new Error(String(error)))
        );
      }
    }
    
    return messageId;
  }
  
  on<T extends keyof ToProtocol>(
    messageType: T,
    handler: (message: Message<ToProtocol[T][0]>) => ToProtocol[T][1],
  ): void {
    this.myTypeListeners.set(messageType, handler);
  }
  
  async request<T extends keyof FromProtocol>(
    messageType: T,
    data: FromProtocol[T][0],
  ): Promise<FromProtocol[T][1]> {
    const messageId = uuidv4();
    const listener = this.externalTypeListeners.get(messageType);
    
    if (!listener) {
      throw new Error(`No handler for message type "${String(messageType)}"`);
    }
    
    const msg: Message = {
      messageType: messageType as string,
      data,
      messageId,
    };
    
    try {
      const response = await listener(msg);
      return response;
    } catch (error) {
      this._onErrorHandlers.forEach((handler) => 
        handler(msg, error instanceof Error ? error : new Error(String(error)))
      );
      throw error;
    }
  }
  
  // Register a handler for external messages
  externalOn<T extends keyof FromProtocol>(
    messageType: T,
    handler: (message: Message) => any,
  ) {
    this.externalTypeListeners.set(messageType, handler);
  }
}
