import { IpcMessenger } from './IpcMessenger';
import { TcpMessenger } from './TcpMessenger';
import { Core } from 'core/src/core';
import { IDE, IdeInfo, IdeSettings } from 'core/src/ide';
import { ToCoreProtocol, FromCoreProtocol } from 'core/src/protocol';

// Note: This file requires Node.js types
// Run: npm install --save-dev @types/node
// And add "node" to the types field in tsconfig.json

/**
 * Simple IDE implementation for the binary
 */
class BinaryIDE implements IDE {
  async getIdeInfo(): Promise<IdeInfo> {
    return {
      name: 'CAT Binary',
      version: '0.1.0',
    };
  }

  async getIdeSettings(): Promise<IdeSettings> {
    return {
      userToken: process.env.CAT_USER_TOKEN as string | undefined,
      pauseIndexOnStart: false,
    };
  }

  async readFile(filepath: string): Promise<string> {
    console.log(`[BinaryIDE] Reading file: ${filepath}`);
    // In a real implementation, this would read from the file system
    return `Content of ${filepath}`;
  }

  async writeFile(path: string, _contents: string): Promise<void> {
    console.log(`[BinaryIDE] Writing file: ${path}`);
    // In a real implementation, this would write to the file system
  }

  async showToast(type: 'info' | 'warning' | 'error', message: string): Promise<void> {
    console.log(`[BinaryIDE] [${type.toUpperCase()}] ${message}`);
  }

  async getOpenFiles(): Promise<string[]> {
    return [];
  }

  async getCurrentFile(): Promise<{ path: string; contents: string } | undefined> {
    return undefined;
  }

  async runCommand(command: string): Promise<void> {
    console.log(`[BinaryIDE] Running command: ${command}`);
  }
}

// Check if we should use TCP mode for debugging
const useTcp = process.env.CAT_CORE_DEBUG === 'true';
const isTcpServer = process.env.CAT_CORE_SERVER === 'true';
const tcpPort = process.env.CAT_CORE_PORT ? parseInt(process.env.CAT_CORE_PORT, 10) : 9876;

// Create the appropriate messenger
let messenger;
if (useTcp) {
  // Use TCP messenger (it will act as a server if CAT_CORE_SERVER is true)
  messenger = new TcpMessenger<ToCoreProtocol, FromCoreProtocol>(
    '127.0.0.1',
    tcpPort
  );
} else {
  // Use IPC
  messenger = new IpcMessenger<ToCoreProtocol, FromCoreProtocol>();
}

// Register error handler
messenger.onError((message: any, error: Error) => {
  console.error(`Error processing message ${message.messageId} of type ${message.messageType}:`, error);
});

// Create IDE implementation
const ide = new BinaryIDE();

// Initialize Core instance to handle messages
// We don't need to use the core variable directly as it will register handlers via the messenger
new Core(messenger, ide);

// Log startup information
if (useTcp) {
  if (isTcpServer) {
    console.log(`CAT Core binary started as TCP server on port ${tcpPort}`);
  } else {
    console.log('CAT Core binary started in TCP mode (client mode not implemented)');
  }
} else {
  console.log('CAT Core binary started in standard IPC mode');
}

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  process.exit(0);
});

// Prevent unhandled promise rejections from crashing the process
process.on('unhandledRejection', (reason: unknown, promise: unknown) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

