import { IpcMessenger } from './IpcMessenger';
import { TcpMessenger } from './TcpMessenger';
import { ToCoreProtocol, FromCoreProtocol } from '../../core/src/protocol';

// Check if we should use TCP mode for debugging
const useTcp = process.env.CAT_CORE_DEBUG === 'true';

// Create the appropriate messenger
const messenger = useTcp 
  ? new TcpMessenger<ToCoreProtocol, FromCoreProtocol>()
  : new IpcMessenger<ToCoreProtocol, FromCoreProtocol>();

// Register error handler
messenger.onError((message, error) => {
  console.error(`Error processing message ${message.messageId} of type ${message.messageType}:`, error);
});

// Register handlers for core protocol messages
messenger.on('ping', async (message) => {
  return `pong: ${message.data}`;
});

messenger.on('processMessage', async (message) => {
  // Process the message from IDE
  const { message: userMessage } = message.data;
  
  // Here we would typically call into the core logic
  // For now, just echo back the message
  const response = `Processed: ${userMessage}`;
  
  return { response };
});

messenger.on('getCoreInfo', async () => {
  return {
    version: '0.1.0',
    status: 'ready'
  };
});

// Log startup information
if (useTcp) {
  console.log('CAT Core binary started in TCP debug mode');
} else {
  console.log('CAT Core binary started in standard IPC mode');
}

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  process.exit(0);
});

// Prevent unhandled promise rejections from crashing the process
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
