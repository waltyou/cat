import { IDE } from './ide';
import { FromCoreProtocol, ToCoreProtocol } from './protocol';
import { IMessenger } from './protocol/messenger';

/**
 * Core service class
 * Handles processing messages from the IDE and sending responses back
 */
export class Core {
  private version = '0.1.0';
  private status = 'ready';

  /**
   * Create a new Core instance
   * @param messenger Messenger for communication with the IDE
   * @param ide IDE interface
   */
  constructor(
    private readonly messenger: IMessenger<ToCoreProtocol, FromCoreProtocol>,
    private readonly ide: IDE,
  ) {
    this.initializeListeners();

    // Log startup
    console.log('Core service started');
    this.messenger.send('log', {
      level: 'info',
      message: 'Core service started'
    });

    // Update status
    this.messenger.send('statusUpdate', { status: this.status });
  }

  /**
   * Initialize message listeners
   */
  private initializeListeners(): void {
    // Handle ping messages
    this.messenger.on('ping', ({ data }) => {
      console.log(`Received ping: ${data}`);
      return `pong: ${data}`;
    });

    // Handle process message
    this.messenger.on('processMessage', async ({ data }) => {
      console.log(`Processing message: ${data.message}`);

      // Simple echo response for now
      const response = `Processed: ${data.message}`;

      // Send response back to IDE
      this.messenger.send('sendResponse', { message: response });

      return { response };
    });

    // Handle get core info
    this.messenger.on('getCoreInfo', () => {
      return {
        version: this.version,
        status: this.status,
      };
    });

    // Handle IDE registration
    this.messenger.on('registerIde', ({ data }) => {
      console.log('IDE registered:', data.ideInfo);
      console.log('IDE settings:', data.ideSettings);

      // Log the registration
      this.messenger.send('log', {
        level: 'info',
        message: `IDE registered: ${data.ideInfo.name} ${data.ideInfo.version}`
      });

      // No response needed for this message type
      return;
    });
  }

  /**
   * Invoke a message handler directly
   */
  invoke<T extends keyof ToCoreProtocol>(
    messageType: T,
    data: ToCoreProtocol[T][0],
  ): ToCoreProtocol[T][1] {
    return this.messenger.invoke(messageType, data);
  }
}
