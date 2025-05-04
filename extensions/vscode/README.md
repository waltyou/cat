# Cat VS Code Extension

A simple VS Code extension for the Cat project.

## Features

- Simple "Hello World" command
- Count Files in Workspace - Counts all files in your workspace
- Ping Core Service - Sends a ping message to the core service and displays the response
- Open GUI - Opens the GUI interface in a webview panel
- Status Bar Clock - Displays the current time in the status bar (click to show a greeting)

## Commands

The extension provides the following commands:

| Command | Description |
|---------|-------------|
| `Cat: Hello World` | Displays a simple hello world message |
| `Cat: Count Files in Workspace` | Counts all files in your workspace |
| `Cat: Ping Core Service` | Pings the core service and displays the response |
| `Cat: Open GUI` | Opens the GUI interface in a webview panel |

## Requirements

- VS Code 1.70.0 or higher

## Extension Settings

This extension doesn't contribute any settings yet.

## Known Issues

None at the moment.

## Release Notes

### 0.1.0

Initial release with basic "Hello World" functionality.

## Development

### Building the Extension

1. Clone the repository
2. Run `npm install` in the `extensions/vscode` folder
3. Run `npm run esbuild` to bundle the TypeScript code
4. Press F5 to open a new window with your extension loaded

### Packaging the Extension

To package the extension for distribution:

```bash
npm install -g @vscode/vsce
vsce package
```

This will create a `.vsix` file that can be installed in VS Code.

### Project Structure

The extension is part of a larger project with the following structure:

```
cat/
├── core/               # Core service
│   ├── src/            # Source code
│   └── README.md       # Core service documentation
├── extensions/         # IDE integrations
│   ├── vscode/         # VS Code extension
│   └── jetbrains/      # JetBrains plugin (planned)
├── gui/                # React user interface
│   ├── src/            # Source code
│   └── public/         # Static assets
├── docs/               # Documentation
└── README.md           # Project documentation
```
