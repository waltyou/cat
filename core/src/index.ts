import { Core } from './core';
import { IDE, IdeInfo, IdeSettings } from './ide';
import { FromCoreProtocol, ToCoreProtocol } from './protocol';
import { InProcessMessenger, IMessenger } from './protocol/messenger';

// Export all the necessary modules
export { Core } from './core';
export { IDE, IdeInfo, IdeSettings } from './ide';
export { FromCoreProtocol, ToCoreProtocol } from './protocol';
export { InProcessMessenger, IMessenger } from './protocol/messenger';

/**
 * Simple IDE implementation for testing
 */
class TestIDE implements IDE {
  async getIdeInfo() {
    return {
      name: 'Test IDE',
      version: '1.0.0',
    };
  }

  async getIdeSettings() {
    return {
      userToken: 'test-token',
      pauseIndexOnStart: false,
    };
  }

  async readFile(filepath: string) {
    console.log(`Reading file: ${filepath}`);
    return `Content of ${filepath}`;
  }

  async writeFile(path: string, contents: string) {
    console.log(`Writing file: ${path}`);
    console.log(`Contents: ${contents}`);
  }

  async showToast(type: 'info' | 'warning' | 'error', message: string) {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  async getOpenFiles() {
    return ['file1.ts', 'file2.ts'];
  }

  async getCurrentFile() {
    return {
      path: 'current.ts',
      contents: 'export const x = 1;',
    };
  }

  async runCommand(command: string) {
    console.log(`Running command: ${command}`);
  }
}

/**
 * Create a messenger for testing
 */
function createTestMessenger(): IMessenger<ToCoreProtocol, FromCoreProtocol> {
  const messenger = new InProcessMessenger<ToCoreProtocol, FromCoreProtocol>();

  // Register handlers for messages from Core to IDE
  messenger.externalOn('sendResponse', ({ data }) => {
    console.log(`[IDE] Received response: ${data.message}`);
  });

  messenger.externalOn('log', ({ data }) => {
    console.log(`[IDE LOG] [${data.level.toUpperCase()}] ${data.message}`);
  });

  messenger.externalOn('statusUpdate', ({ data }) => {
    console.log(`[IDE] Core status updated: ${data.status}`);
  });

  return messenger;
}

/**
 * Main function to start the core service
 */
function main() {
  console.log('Starting core service...');

  // Create test IDE and messenger
  const ide = new TestIDE();
  const messenger = createTestMessenger();

  // Create core service
  const core = new Core(messenger, ide);

  // Test ping
  const pongResponse = core.invoke('ping', 'Hello, Core!');
  console.log(`Ping response: ${pongResponse}`);

  // Test process message
  const processResponse = core.invoke('processMessage', { message: 'Test message from IDE' });
  console.log(`Process message response: ${processResponse.response}`);

  // Test get core info
  const coreInfo = core.invoke('getCoreInfo', undefined);
  console.log(`Core info: version=${coreInfo.version}, status=${coreInfo.status}`);
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}
