import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Core } from 'core/src/core';
import { FromWebviewProtocol, WebviewSingleMessage } from 'core/src/protocol/webview';

/**
 * Provider for the Cat GUI webview view in the sidebar
 */
export class CatWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'cat-view';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionPath: string,
    private readonly _core: Core | undefined
  ) { }

  /**
   * Called when a view is first created to set up the webview
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // Set options for the webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this._extensionPath, 'gui', 'dist')),
        vscode.Uri.file(path.resolve(path.dirname(this._extensionPath), 'gui', 'dist')),
        vscode.Uri.file(path.resolve(this._extensionPath, '..')), // Project root
        vscode.Uri.file('D:\\git\\cat\\gui\\dist'), // Direct path as fallback
      ]
    };

    // Log the allowed resource roots for debugging
    console.log('CatWebviewViewProvider localResourceRoots:');
    webviewView.webview.options.localResourceRoots?.forEach((uri, index) => {
      console.log(`Root ${index + 1}:`, uri.toString());
    });

    // Set the HTML content
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      (message: WebviewSingleMessage) => this._handleMessage(message)
    );
  }

  /**
   * Send a message to the webview
   */
  public sendMessage<T extends string>(type: T, content: any) {
    if (this._view) {
      this._view.webview.postMessage({
        type,
        messageId: Date.now().toString(),
        status: 'success',
        content,
      });
    }
  }

  /**
   * Handle messages from the webview
   */
  private async _handleMessage(message: WebviewSingleMessage) {
    console.log('Received message from WebView:', message);

    if (!message || !message.type || !message.messageId) {
      console.error('Invalid message received:', message);
      return;
    }

    if (!this._core) {
      console.error('Core service is not initialized!');
      return;
    }

    try {
      let response: any;

      // Handle different message types
      switch (message.type as keyof FromWebviewProtocol) {
        case 'ping':
          response = this._core.invoke('ping', message.content as string);
          break;

        case 'processMessage':
          response = this._core.invoke('processMessage', message.content as { message: string });
          break;

        case 'getCoreInfo':
          response = this._core.invoke('getCoreInfo', undefined);
          break;

        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }

      // Send success response back to WebView
      if (this._view) {
        this._view.webview.postMessage({
          type: message.type,
          messageId: message.messageId,
          status: 'success',
          content: response,
        });
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);

      // Send error response back to WebView
      if (this._view) {
        this._view.webview.postMessage({
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
  }

  /**
   * Get the HTML content for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
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
    const cssPath = path.join(distPath, 'main.css');

    // Log paths for debugging
    console.log('Final paths:');
    console.log('- Extension path:', this._extensionPath);
    console.log('- Dist path:', distPath);
    console.log('- Bundle path:', bundlePath, 'exists:', fs.existsSync(bundlePath));
    console.log('- Index path:', indexPath, 'exists:', fs.existsSync(indexPath));
    console.log('- CSS path:', cssPath, 'exists:', fs.existsSync(cssPath));

    if (fs.existsSync(bundlePath) && fs.existsSync(indexPath)) {
      // Create webview URIs for resources
      const bundleUri = webview.asWebviewUri(
        vscode.Uri.file(bundlePath)
      );

      // Also create URI for CSS if it exists
      let cssUri = null;
      if (fs.existsSync(cssPath)) {
        cssUri = webview.asWebviewUri(
          vscode.Uri.file(cssPath)
        );
      }

      // Create a completely new HTML document instead of modifying the existing one
      // This ensures we have full control over the content and avoid issues with resource loading
      const newHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cat GUI</title>
  <script type="module" src="${bundleUri}"></script>
  ${cssUri ? `<link rel="stylesheet" href="${cssUri}">` : ''}
  <style>
    body {
      padding: 0;
      height: 100vh;
      overflow: hidden;
    }
    #root {
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

      console.log('Resource URIs:');
      console.log('- Bundle URI:', bundleUri.toString());
      if (cssUri) {
        console.log('- CSS URI:', cssUri.toString());
      }

      // Log the new HTML content
      console.log('New HTML content:');
      console.log(newHtml);

      return newHtml;
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
              padding: 10px;
              text-align: center;
              height: 100vh;
              overflow: auto;
            }
            .error {
              color: var(--vscode-errorForeground);
              margin: 10px 0;
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
}
