/**
 * Tests for the Core service
 * 
 * Note: This is a simple test file and would normally use a testing framework like Jest.
 * For simplicity, we're just using basic assertions.
 */

import { Core } from './core';
import { IDE, IdeInfo, IdeSettings } from './ide';
import { FromCoreProtocol, ToCoreProtocol } from './protocol';
import { InProcessMessenger } from './protocol/messenger';

// Mock IDE implementation for testing
class MockIDE implements IDE {
  async getIdeInfo(): Promise<IdeInfo> {
    return { name: 'Mock IDE', version: '1.0.0' };
  }
  
  async getIdeSettings(): Promise<IdeSettings> {
    return { userToken: 'mock-token' };
  }
  
  async readFile(filepath: string): Promise<string> {
    return `Mock content of ${filepath}`;
  }
  
  async writeFile(path: string, contents: string): Promise<void> {
    // Do nothing
  }
  
  async showToast(type: 'info' | 'warning' | 'error', message: string): Promise<void> {
    // Do nothing
  }
  
  async getOpenFiles(): Promise<string[]> {
    return ['mock1.ts', 'mock2.ts'];
  }
  
  async getCurrentFile(): Promise<{ path: string; contents: string } | undefined> {
    return { path: 'mock.ts', contents: 'mock content' };
  }
  
  async runCommand(command: string): Promise<void> {
    // Do nothing
  }
}

// Test function
async function runTests() {
  console.log('Running Core service tests...');
  
  // Create messenger and track messages
  const sentMessages: { type: string; data: any }[] = [];
  const messenger = new InProcessMessenger<ToCoreProtocol, FromCoreProtocol>();
  
  // Mock external handlers
  messenger.externalOn('sendResponse', ({ data }) => {
    sentMessages.push({ type: 'sendResponse', data });
  });
  
  messenger.externalOn('log', ({ data }) => {
    sentMessages.push({ type: 'log', data });
  });
  
  messenger.externalOn('statusUpdate', ({ data }) => {
    sentMessages.push({ type: 'statusUpdate', data });
  });
  
  // Create core with mock IDE
  const ide = new MockIDE();
  const core = new Core(messenger, ide);
  
  // Test 1: Ping should return pong
  const pingResult = core.invoke('ping', 'test');
  console.assert(pingResult === 'pong: test', `Ping test failed: ${pingResult}`);
  console.log('✅ Ping test passed');
  
  // Test 2: Process message should return response and send message
  const processResult = await core.invoke('processMessage', { message: 'test message' });
  console.assert(
    processResult.response === 'Processed: test message',
    `Process message test failed: ${processResult.response}`
  );
  
  // Check that sendResponse was called
  const sendResponseMessage = sentMessages.find(m => m.type === 'sendResponse');
  console.assert(
    sendResponseMessage && sendResponseMessage.data.message === 'Processed: test message',
    'sendResponse was not called correctly'
  );
  console.log('✅ Process message test passed');
  
  // Test 3: Get core info should return version and status
  const coreInfo = core.invoke('getCoreInfo', undefined);
  console.assert(
    coreInfo.version === '0.1.0' && coreInfo.status === 'ready',
    `Get core info test failed: ${JSON.stringify(coreInfo)}`
  );
  console.log('✅ Get core info test passed');
  
  // Check that status update was sent
  const statusUpdateMessage = sentMessages.find(m => m.type === 'statusUpdate');
  console.assert(
    statusUpdateMessage && statusUpdateMessage.data.status === 'ready',
    'statusUpdate was not called correctly'
  );
  console.log('✅ Status update test passed');
  
  console.log('All tests passed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}
