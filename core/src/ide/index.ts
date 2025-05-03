/**
 * IDE interface for interacting with the IDE
 */

export interface IdeInfo {
  name: string;
  version: string;
}

export interface IdeSettings {
  userToken?: string;
  pauseIndexOnStart?: boolean;
}

/**
 * Interface for IDE functionality
 */
export interface IDE {
  // Get information about the IDE
  getIdeInfo(): Promise<IdeInfo>;
  
  // Get IDE settings
  getIdeSettings(): Promise<IdeSettings>;
  
  // Read a file from the IDE
  readFile(filepath: string): Promise<string>;
  
  // Write a file to the IDE
  writeFile(path: string, contents: string): Promise<void>;
  
  // Show a toast notification in the IDE
  showToast(type: 'info' | 'warning' | 'error', message: string): Promise<void>;
  
  // Get the currently open files in the IDE
  getOpenFiles(): Promise<string[]>;
  
  // Get the currently active file in the IDE
  getCurrentFile(): Promise<{ path: string; contents: string } | undefined>;
  
  // Run a command in the IDE
  runCommand(command: string): Promise<void>;
}
