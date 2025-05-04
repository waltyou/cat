import { spawn } from 'child_process';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Helper function to create a binary process
function createBinaryProcess() {
  const binaryPath = path.resolve(__dirname, '../dist/index.js');
  const process = spawn('node', [binaryPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  return process;
}

// Helper function to send a message to the binary
function sendMessage(process: any, messageType: string, data: any) {
  const messageId = uuidv4();
  const message = {
    messageType,
    messageId,
    data
  };
  
  process.stdin.write(JSON.stringify(message) + '\n');
  return messageId;
}

// Helper function to wait for a response from the binary
function waitForResponse(process: any, messageId: string, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for response to message ${messageId}`));
    }, timeout);
    
    const dataHandler = (data: Buffer) => {
      buffer += data.toString();
      
      // Process complete messages
      const messages = buffer.split('\n');
      buffer = messages.pop() || '';
      
      for (const messageStr of messages) {
        if (!messageStr.trim()) continue;
        
        try {
          const message = JSON.parse(messageStr);
          
          if (message.messageId === messageId) {
            clearTimeout(timeoutId);
            process.stdout.removeListener('data', dataHandler);
            resolve(message);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
    };
    
    process.stdout.on('data', dataHandler);
  });
}

describe('Binary Tests', () => {
  let binaryProcess: any;
  
  beforeEach(() => {
    binaryProcess = createBinaryProcess();
  });
  
  afterEach(() => {
    if (binaryProcess) {
      binaryProcess.kill();
    }
  });
  
  test('should respond to ping message', async () => {
    const messageId = sendMessage(binaryProcess, 'ping', 'test');
    const response = await waitForResponse(binaryProcess, messageId);
    
    expect(response.messageType).toBe('response:ping');
    expect(response.messageId).toBe(messageId);
    expect(response.data).toBe('pong: test');
  });
  
  test('should process a message', async () => {
    const messageId = sendMessage(binaryProcess, 'processMessage', { message: 'Hello, world!' });
    const response = await waitForResponse(binaryProcess, messageId);
    
    expect(response.messageType).toBe('response:processMessage');
    expect(response.messageId).toBe(messageId);
    expect(response.data).toHaveProperty('response');
    expect(response.data.response).toBe('Processed: Hello, world!');
  });
  
  test('should return core info', async () => {
    const messageId = sendMessage(binaryProcess, 'getCoreInfo', undefined);
    const response = await waitForResponse(binaryProcess, messageId);
    
    expect(response.messageType).toBe('response:getCoreInfo');
    expect(response.messageId).toBe(messageId);
    expect(response.data).toHaveProperty('version');
    expect(response.data).toHaveProperty('status');
  });
});
