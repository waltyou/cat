import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Core } from 'core/src/core';
import { FromWebviewProtocol, ToWebviewProtocol, WebviewSingleMessage } from 'core/src/protocol/webview';

/**
 * Manages the WebView panel for the GUI
 */
export class WebviewPanel {
  public static currentPanel: WebviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private readonly _extensionPath: string;

  /**
   * Create or show a WebView panel
   */
  public static createOrShow(extensionPath: string, core: Core) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (WebviewPanel.currentPanel) {
      WebviewPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'catGui',
      'Cat GUI',
      column || vscode.ViewColumn.One,
      {
        // Enable JavaScript in the WebView
        enableScripts: true,
        // Restrict the WebView to only load resources from the extension's directory and project root
        localResourceRoots: [
          vscode.Uri.file(path.join(extensionPath, 'gui', 'dist')),
          vscode.Uri.file(path.resolve(path.dirname(extensionPath), 'gui', 'dist')),
          vscode.Uri.file(path.resolve(extensionPath, '..')), // Project root
          vscode.Uri.file('D:\\git\\cat\\gui\\dist'), // Direct path as fallback
        ],
        // Retain context when hidden
        retainContextWhenHidden: true,
      }
    );

    // Log the allowed resource roots for debugging
    console.log('WebviewPanel localResourceRoots:');
    panel.webview.options.localResourceRoots?.forEach((uri, index) => {
      console.log(`Root ${index + 1}:`, uri.toString());
    });

    WebviewPanel.currentPanel = new WebviewPanel(panel, extensionPath, core);
  }

  /**
   * Private constructor for WebviewPanel
   */
  private constructor(panel: vscode.WebviewPanel, extensionPath: string, private readonly core: Core) {
    this._panel = panel;
    this._extensionPath = extensionPath;

    // Set the WebView's initial HTML content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the WebView
    this._panel.webview.onDidReceiveMessage(
      (message: WebviewSingleMessage) => this._handleMessage(message),
      null,
      this._disposables
    );
  }

  /**
   * Handle messages from the WebView
   */
  private async _handleMessage(message: WebviewSingleMessage) {
    console.log('Received message from WebView:', message);

    if (!message || !message.type || !message.messageId) {
      console.error('Invalid message received:', message);
      return;
    }

    try {
      let response: any;

      // Handle different message types
      switch (message.type as keyof FromWebviewProtocol) {
        case 'ping':
          response = this.core.invoke('ping', message.content as string);
          break;

        case 'processMessage':
          response = this.core.invoke('processMessage', message.content as { message: string });
          break;

        case 'getCoreInfo':
          response = this.core.invoke('getCoreInfo', undefined);
          break;

        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }

      // Send success response back to WebView
      this._panel.webview.postMessage({
        type: message.type,
        messageId: message.messageId,
        status: 'success',
        content: response,
      });
    } catch (error) {
      console.error('Error handling WebView message:', error);

      // Send error response back to WebView
      this._panel.webview.postMessage({
        type: message.type,
        messageId: message.messageId,
        status: 'error',
        content: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      });
    }
  }

  /**
   * Send a message to the WebView
   */
  public sendMessage<T extends keyof ToWebviewProtocol>(
    type: T,
    content: ToWebviewProtocol[T][0]
  ) {
    if (this._panel.webview) {
      this._panel.webview.postMessage({
        type,
        messageId: Date.now().toString(),
        status: 'success',
        content,
      });
    }
  }

  /**
   * Update the WebView content
   */
  private _update() {
    this._panel.title = 'Cat GUI';
    this._panel.webview.html = this._getHtmlForWebview();
  }

  /**
   * Get the HTML content for the WebView
   */
  private _getHtmlForWebview() {
    // Path to the bundled React app
    // Try multiple paths to find the GUI dist directory
    const distPathRelative = path.join(this._extensionPath, 'gui', 'dist');
    const distPathAbsolute = path.resolve(path.dirname(this._extensionPath), 'gui', 'dist');
    const distPathDirect = 'D:\\git\\cat\\gui\\dist'; // Direct path as fallback

    // Check paths in order
    let distPath = distPathRelative;
    if (!fs.existsSync(distPath)) {
      distPath = distPathAbsolute;
    }
    if (!fs.existsSync(distPath)) {
      distPath = distPathDirect;
    }

    // Check if the bundle exists
    const bundlePath = path.join(distPath, 'bundle.js');
    const indexPath = path.join(distPath, 'index.html');

    // Log paths for debugging
    console.log('Extension path:', this._extensionPath);
    console.log('Dist path:', distPath);
    console.log('Bundle path:', bundlePath);
    console.log('Index path:', indexPath);
    console.log('Bundle exists:', fs.existsSync(bundlePath));
    console.log('Index exists:', fs.existsSync(indexPath));

    if (fs.existsSync(bundlePath) && fs.existsSync(indexPath)) {
      // Use the bundled app
      const indexHtml = fs.readFileSync(indexPath, 'utf8');
      const bundleUri = this._panel.webview.asWebviewUri(
        vscode.Uri.file(bundlePath)
      );

      console.log('Bundle URI:', bundleUri.toString());

      // Replace the script src with the correct URI
      // Handle both script tag formats
      let modifiedHtml = indexHtml;

      // Replace module script src attribute for index.tsx
      modifiedHtml = modifiedHtml.replace(
        /src="\/src\/index\.tsx"/g,
        `src="${bundleUri}"`
      );

      // Replace simple src attribute for bundle.js
      modifiedHtml = modifiedHtml.replace(
        /src="bundle\.js"/g,
        `src="${bundleUri}"`
      );

      // Replace defer src attribute if present
      modifiedHtml = modifiedHtml.replace(
        /defer="defer" src="bundle\.js"/g,
        `defer="defer" src="${bundleUri}"`
      );

      console.log('Modified HTML:', modifiedHtml);

      return modifiedHtml;
    } else {
      // Fallback to a simple HTML page
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cat GUI</title>
          <style>
            body {
              font-family: var(--vscode-font-family);
              color: var(--vscode-foreground);
              background-color: var(--vscode-editor-background);
              padding: 20px;
              text-align: center;
            }
            .error {
              color: var(--vscode-errorForeground);
              margin: 20px 0;
              padding: 10px;
              border: 1px solid var(--vscode-errorForeground);
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <h1>Cat GUI</h1>
          <div class="error">
            <p>The GUI bundle was not found.</p>
            <p>Please build the GUI by running:</p>
            <code>cd gui && npm install && npm run build</code>
          </div>
        </body>
        </html>
      `;
    }
  }

  /**
   * Dispose the WebView panel
   */
  public dispose() {
    WebviewPanel.currentPanel = undefined;

    // Clean up resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
