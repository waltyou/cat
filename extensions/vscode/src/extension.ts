﻿import * as vscode from "vscode";
import * as path from "path";
import { Core } from "core/src/core";
import { IDE, IdeInfo, IdeSettings } from "core/src/ide";
import { FromCoreProtocol, ToCoreProtocol } from "core/src/protocol";
import { InProcessMessenger, IMessenger } from "core/src/protocol/messenger";
import { WebviewPanel } from "./webview/WebviewPanel";
import { CatWebviewViewProvider } from "./views/CatWebviewViewProvider";

/**
 * VS Code implementation of the IDE interface
 */
class VSCodeIDE implements IDE {
  constructor(private readonly _context: vscode.ExtensionContext) { }

  async getIdeInfo(): Promise<IdeInfo> {
    return {
      name: "VS Code",
      version: vscode.version,
    };
  }

  async getIdeSettings(): Promise<IdeSettings> {
    // Get settings from VS Code configuration
    const config = vscode.workspace.getConfiguration("cat-vscode-extension");

    // Try to get token from context storage first
    let userToken = this._context.globalState.get<string>("userToken");

    // If not found in storage, try from settings
    if (!userToken) {
      userToken = config.get<string>("userToken");

      // If found in settings, store it in context for future use
      if (userToken) {
        await this._context.globalState.update("userToken", userToken);
      }
    }

    return {
      userToken,
      pauseIndexOnStart: config.get("pauseIndexOnStart", false),
    };
  }

  async readFile(filepath: string): Promise<string> {
    try {
      const uri = vscode.Uri.file(filepath);
      const content = await vscode.workspace.fs.readFile(uri);
      return Buffer.from(content).toString("utf-8");
    } catch (error) {
      console.error(`Error reading file ${filepath}:`, error);
      throw error;
    }
  }

  async writeFile(path: string, contents: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(path);
      const bytes = Buffer.from(contents, "utf-8");
      await vscode.workspace.fs.writeFile(uri, bytes);
    } catch (error) {
      console.error(`Error writing file ${path}:`, error);
      throw error;
    }
  }

  async showToast(type: "info" | "warning" | "error", message: string): Promise<void> {
    switch (type) {
      case "info":
        vscode.window.showInformationMessage(message);
        break;
      case "warning":
        vscode.window.showWarningMessage(message);
        break;
      case "error":
        vscode.window.showErrorMessage(message);
        break;
    }
  }

  async getOpenFiles(): Promise<string[]> {
    return vscode.workspace.textDocuments
      .filter(doc => !doc.isClosed && doc.uri.scheme === "file")
      .map(doc => doc.uri.fsPath);
  }

  async getCurrentFile(): Promise<{ path: string; contents: string } | undefined> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return undefined;
    }

    return {
      path: editor.document.uri.fsPath,
      contents: editor.document.getText(),
    };
  }

  async runCommand(command: string): Promise<void> {
    await vscode.commands.executeCommand(command);
  }
}

// Store the core instance and webview provider globally
let coreInstance: Core | undefined;
let catWebviewProviderInstance: CatWebviewViewProvider | undefined;

/**
 * Create a messenger for communication with the core
 */
function createMessenger(): IMessenger<ToCoreProtocol, FromCoreProtocol> {
  const messenger = new InProcessMessenger<ToCoreProtocol, FromCoreProtocol>();

  // Register handlers for messages from Core to IDE
  messenger.externalOn("sendResponse", ({ data }: { data: { message: string } }) => {
    console.log(`[VS Code] Received response: ${data.message}`);
    vscode.window.showInformationMessage(data.message);

    // Forward the response to the WebView panel if it exists
    if (WebviewPanel.currentPanel) {
      WebviewPanel.currentPanel.sendMessage("updateResponse", { message: data.message });
    }

    // Forward the response to the WebView view if it exists
    if (catWebviewProviderInstance) {
      catWebviewProviderInstance.sendMessage("updateResponse", { message: data.message });
    }

    return;
  });

  messenger.externalOn("log", ({ data }: { data: { level: 'info' | 'warn' | 'error'; message: string } }) => {
    console.log(`[VS Code LOG] [${data.level.toUpperCase()}] ${data.message}`);

    // Forward logs to the WebView panel if it exists
    if (WebviewPanel.currentPanel) {
      WebviewPanel.currentPanel.sendMessage("log", data);
    }

    // Forward logs to the WebView view if it exists
    if (catWebviewProviderInstance) {
      catWebviewProviderInstance.sendMessage("log", data);
    }

    return;
  });

  messenger.externalOn("statusUpdate", ({ data }: { data: { status: string } }) => {
    console.log(`[VS Code] Core status updated: ${data.status}`);

    // Forward status updates to the WebView panel if it exists
    if (WebviewPanel.currentPanel) {
      WebviewPanel.currentPanel.sendMessage("updateStatus", data);
    }

    // Forward status updates to the WebView view if it exists
    if (catWebviewProviderInstance) {
      catWebviewProviderInstance.sendMessage("updateStatus", data);
    }

    return;
  });

  return messenger;
}

/**
 * This method is called when the extension is activated.
 * Extension is activated the first time the command is executed.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Cat VS Code Extension is now active!");

  // Initialize IDE and messenger
  const ide = new VSCodeIDE(context);
  const messenger = createMessenger();

  // Initialize Core
  coreInstance = new Core(messenger, ide);

  // Register a simple command that displays a hello world message
  let helloDisposable = vscode.commands.registerCommand("cat-vscode-extension.helloWorld", () => {
    vscode.window.showInformationMessage("Hello from the Cat VS Code Extension!");
  });

  // Register a command to count files in the workspace
  let countFilesDisposable = vscode.commands.registerCommand("cat-vscode-extension.countFiles", async () => {
    const files = await ide.getOpenFiles();
    vscode.window.showInformationMessage(`Open files count: ${files.length}`);
  });

  // Register a command to ping the core service
  let pingCoreDisposable = vscode.commands.registerCommand("cat-vscode-extension.pingCore", async () => {
    console.log("Executing pingCore command");
    vscode.window.showInformationMessage("Executing pingCore command");

    try {
      if (!coreInstance) {
        vscode.window.showErrorMessage("Core service is not initialized!");
        return;
      }

      const response = coreInstance.invoke("ping", "Hello from VS Code!");
      vscode.window.showInformationMessage(`Core response: ${response}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Error pinging core: ${error}`);
    }
  });

  // Register a command to open the GUI
  let openGuiDisposable = vscode.commands.registerCommand("cat-vscode-extension.openGui", () => {
    if (!coreInstance) {
      vscode.window.showErrorMessage("Core service is not initialized!");
      return;
    }

    // Get the extension path
    const extensionPath = context.extensionPath;

    // Create or show the WebView panel
    WebviewPanel.createOrShow(extensionPath, coreInstance);
  });

  // Register the webview view provider for the Cat GUI
  catWebviewProviderInstance = new CatWebviewViewProvider(context.extensionPath, coreInstance);
  const catViewDisposable = vscode.window.registerWebviewViewProvider(
    CatWebviewViewProvider.viewType,
    catWebviewProviderInstance
  );

  // Add all disposables to the context subscriptions
  context.subscriptions.push(
    helloDisposable,
    countFilesDisposable,
    pingCoreDisposable,
    openGuiDisposable,
    catViewDisposable
  );
}

/**
 * This method is called when the extension is deactivated
 */
export function deactivate() {
  console.log("Cat VS Code Extension is now deactivated!");

  // Clean up WebView panel if it exists
  if (WebviewPanel.currentPanel) {
    WebviewPanel.currentPanel.dispose();
  }

  // Clean up global instances
  catWebviewProviderInstance = undefined;
  coreInstance = undefined;
}
