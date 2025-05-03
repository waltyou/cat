import * as vscode from "vscode";

/**
 * This method is called when the extension is activated.
 * Extension is activated the first time the command is executed.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Cat VS Code Extension is now active!");

  // Register a simple command that displays a hello world message
  let helloDisposable = vscode.commands.registerCommand("cat-vscode-extension.helloWorld", () => {
    vscode.window.showInformationMessage("Hello from the Cat VS Code Extension!");
  });

  // Register a command to count files in the workspace
  let countFilesDisposable = vscode.commands.registerCommand("cat-vscode-extension.countFiles", async () => {
    vscode.window.showInformationMessage("This is a placeholder for the count files command.");
  });

  // Register a command to ping the core service
  let pingCoreDisposable = vscode.commands.registerCommand("cat-vscode-extension.pingCore", async () => {
    vscode.window.showInformationMessage("This is a placeholder for the ping core command.");
  });

  context.subscriptions.push(helloDisposable, countFilesDisposable, pingCoreDisposable);
}

/**
 * This method is called when the extension is deactivated
 */
export function deactivate() {
  console.log("Cat VS Code Extension is now deactivated!");
}
